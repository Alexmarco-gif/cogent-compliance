/**
 * Cogent Marketing Shield - Conversation Message SSE Streaming Route
 * Document Reference: Document 04 (Section 3.5), Document 08 (Phase 6)
 */

import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { resolveTenantContext } from "@/modules/auth-tenancy/tenant.resolver";
import { requirePermission } from "@/modules/auth-tenancy/rbac.guard";
import { AuthTenancyError } from "@/modules/auth-tenancy/types";
import { sendMessageStreamSchema } from "@/contracts/conversation.contracts";
import { canAccessConversation, conversationService } from "@/modules/conversations/conversation.service";
import { copilotOrchestrator } from "@/modules/conversations/copilot.orchestrator";
import { entitlementsService } from "@/modules/billing/entitlements.service";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
// Vercel hard-kills the function at maxDuration. A multi-round Gemini + tool turn can easily
// exceed 60s, which previously truncated the SSE stream silently (user saw no reply at all).
// 300s is the Hobby/Pro ceiling with Fluid Compute.
export const maxDuration = 300;

/** Soft deadline: finish the turn gracefully before the platform kills the function. */
const STREAM_SOFT_DEADLINE_MS = 280_000;
/** SSE comment heartbeat so proxies/CDNs/browsers never treat the connection as idle. */
const HEARTBEAT_INTERVAL_MS = 10_000;

export async function POST(
  req: NextRequest,
  routeProps: { params: Promise<{ id: string }> }
) {
  const requestId = req.headers.get("x-request-id") || crypto.randomUUID();
  const resolvedParams = await routeProps.params;
  const conversationId = resolvedParams.id;

  try {
    // 1. Resolve and verify tenant context & RBAC
    const tenant = await resolveTenantContext(req);
    requirePermission(tenant, "conversation.create");

    // 1a. Verify conversation exists and caller owns it (or it is a shared sentinel incident thread)
    const conversation = await conversationService.getConversation(
      tenant.tenantId,
      conversationId
    );
    if (!conversation) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Conversation not found.",
            request_id: requestId,
          },
        },
        { status: 404 },
      );
    }
    if (!canAccessConversation(conversation, [tenant.userId, tenant.clerkUserId])) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You do not have access to stream into another user's private thread.",
            request_id: requestId,
          },
        },
        { status: 403 },
      );
    }

    // 1b. Enforce 7-day evaluation trial expiration
    const subInfo = await entitlementsService.getTenantSubscriptionInfo(tenant.tenantId);
    if (subInfo.isTrial && subInfo.isTrialExpired) {
      return NextResponse.json(
        {
          error:
            "Your 7-day Evaluation Pilot has expired. Upgrade to Growth or Scale in Settings -> Billing to continue.",
          code: "TRIAL_EXPIRED",
        },
        { status: 402 },
      );
    }

    // 2. Parse request body
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_FAILED",
            message: "Malformed JSON request body",
            request_id: requestId,
          },
        },
        { status: 400 },
      );
    }
    const validated = sendMessageStreamSchema.parse(rawBody);

    logger.info("Starting Copilot SSE stream", {
      requestId,
      tenantId: tenant.tenantId,
      conversationId,
    });

    // 3. Create a ReadableStream for Server-Sent Events
    const encoder = new TextEncoder();
    let isStreamClosed = false;
    let heartbeat: ReturnType<typeof setInterval> | null = null;
    const stream = new ReadableStream({
      cancel() {
        isStreamClosed = true;
        if (heartbeat) clearInterval(heartbeat);
      },
      async start(controller) {
        const safeEnqueue = (chunk: Uint8Array) => {
          if (isStreamClosed) return;
          try {
            controller.enqueue(chunk);
          } catch {
            isStreamClosed = true;
          }
        };
        const sendEvent = (type: string, data: unknown) => {
          safeEnqueue(encoder.encode(`event: ${type}\ndata: ${JSON.stringify({ type, data })}\n\n`));
        };
        const closeStream = () => {
          if (heartbeat) clearInterval(heartbeat);
          if (!isStreamClosed) {
            isStreamClosed = true;
            try {
              controller.close();
            } catch {
              // Controller already closed by client disconnect
            }
          }
        };

        // Flush an initial comment immediately so the client knows the connection is live,
        // then keep pinging so idle-timeout proxies never cut the stream during long tool/LLM work.
        safeEnqueue(encoder.encode(`: connected\n\n`));
        heartbeat = setInterval(() => {
          safeEnqueue(encoder.encode(`: ping ${Date.now()}\n\n`));
        }, HEARTBEAT_INTERVAL_MS);

        let assistantMessageId: string | null = null;
        let terminalEventSent = false;
        let partialText = "";
        const generator = copilotOrchestrator.streamChat({
          tenantId: tenant.tenantId,
          userId: tenant.userId,
          conversationId,
          userPrompt: validated.content,
          attachmentAssetIds: validated.attachment_asset_ids,
          campaignUrls: validated.campaign_urls,
          activeCampaignId: validated.active_campaign_id,
          referencedProductId: validated.referenced_product_id,
          referencedKnowledgeDocId: validated.referenced_knowledge_doc_id,
          enableLiveWebSearch: validated.enable_live_web_search,
          searchJurisdictions: validated.search_jurisdictions,
          workflowHint: validated.workflow_hint,
          replaceFromMessageId: validated.replace_from_message_id,
        });

        const deadlineAt = Date.now() + STREAM_SOFT_DEADLINE_MS;
        const DEADLINE = Symbol("deadline");

        try {
          // Keep draining even if the client disconnects so the orchestrator can still persist
          // the final answer to the DB (the user will see it when they reopen the thread).
          while (true) {
            const remaining = deadlineAt - Date.now();
            let deadlineTimer: ReturnType<typeof setTimeout> | undefined;
            const next = await Promise.race([
              generator.next(),
              new Promise<typeof DEADLINE>((resolve) => {
                deadlineTimer = setTimeout(() => resolve(DEADLINE), Math.max(0, remaining));
              }),
            ]);
            if (deadlineTimer) clearTimeout(deadlineTimer);

            if (next === DEADLINE) {
              throw new Error(
                "The compliance analyst took too long to respond. Please retry, or narrow the question."
              );
            }
            if (next.done) break;

            const sseEvent = next.value;
            if (sseEvent.type === "message.started") {
              assistantMessageId = sseEvent.data.assistant_message_id;
            } else if (sseEvent.type === "assistant.delta") {
              partialText += sseEvent.data.text_delta;
            } else if (sseEvent.type === "message.completed" || sseEvent.type === "message.failed") {
              terminalEventSent = true;
            }
            sendEvent(sseEvent.type, sseEvent.data);
          }

          if (!terminalEventSent) {
            // Generator ended without a terminal event — never leave the client hanging.
            throw new Error("The response ended unexpectedly. Please retry.");
          }
        } catch (streamErr) {
          const errMsg = (streamErr as Error).message || "Streaming failed";
          logger.error("Error in SSE controller loop", {
            error: errMsg,
            requestId,
            conversationId,
          });
          sendEvent("message.failed", { error_code: "SSE_STREAM_ERROR", message: errMsg });
          // Stop the orchestrator (fire-and-forget; it may be awaiting a slow upstream call).
          void generator.return(undefined).catch(() => {});
          if (assistantMessageId) {
            await conversationService
              .updateMessage({
                tenantId: tenant.tenantId,
                messageId: assistantMessageId,
                content: partialText,
                status: "FAILED",
                metadata: { error: errMsg },
              })
              .catch(() => {});
          }
        } finally {
          closeStream();
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Request-ID": requestId,
      },
    });
  } catch (err) {
    if (err instanceof AuthTenancyError) {
      logger.warn("AuthTenancy rejection on SSE stream", {
        code: err.code,
        statusCode: err.statusCode,
        requestId,
      });
      return NextResponse.json(
        {
          success: false,
          error: {
            code: err.code,
            message: err.message,
            request_id: requestId,
          },
        },
        { status: err.statusCode }
      );
    }

    if (err instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_FAILED",
            message: err.errors.map((e) => e.message).join("; ") || "Invalid request payload",
            request_id: requestId,
          },
        },
        { status: 400 }
      );
    }

    const errorMsg = (err as Error).message || "Internal server error";
    logger.error("Failed to initialize SSE stream", { error: errorMsg, requestId });

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "STREAM_INITIALIZATION_FAILED",
          message: errorMsg,
          request_id: requestId,
        },
      },
      { status: 400 }
    );
  }
}
