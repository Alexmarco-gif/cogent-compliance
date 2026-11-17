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
export const maxDuration = 60;

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
    const rawBody = await req.json();
    const validated = sendMessageStreamSchema.parse(rawBody);

    logger.info("Starting Copilot SSE stream", {
      requestId,
      tenantId: tenant.tenantId,
      conversationId,
    });

    // 3. Create a ReadableStream for Server-Sent Events
    const encoder = new TextEncoder();
    let isStreamClosed = false;
    const stream = new ReadableStream({
      cancel() {
        isStreamClosed = true;
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

        try {
          for await (const sseEvent of copilotOrchestrator.streamChat({
            tenantId: tenant.tenantId,
            userId: tenant.userId,
            conversationId,
            userPrompt: validated.content,
            attachmentAssetIds: validated.attachment_asset_ids,
            campaignUrls: validated.campaign_urls,
            activeCampaignId: validated.active_campaign_id,
            referencedProductId: validated.referenced_product_id,
          })) {
            if (isStreamClosed) break;
            const frame = `event: ${sseEvent.type}\ndata: ${JSON.stringify(sseEvent)}\n\n`;
            safeEnqueue(encoder.encode(frame));
          }
          if (!isStreamClosed) {
            isStreamClosed = true;
            controller.close();
          }
        } catch (streamErr) {
          const errMsg = (streamErr as Error).message || "Streaming failed";
          logger.error("Error in SSE controller loop", { error: errMsg, requestId });
          if (!isStreamClosed) {
            const errorFrame = `event: message.failed\ndata: ${JSON.stringify({
              type: "message.failed",
              data: { error_code: "SSE_STREAM_ERROR", message: errMsg },
            })}\n\n`;
            safeEnqueue(encoder.encode(errorFrame));
            isStreamClosed = true;
            try {
              controller.close();
            } catch {
              // Controller already closed by client disconnect
            }
          }
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
