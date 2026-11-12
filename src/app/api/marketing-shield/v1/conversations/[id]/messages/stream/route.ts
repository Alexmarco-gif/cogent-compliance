/**
 * Cogent Marketing Shield - Conversation Message SSE Streaming Route
 * Document Reference: Document 04 (Section 3.5), Document 08 (Phase 6)
 */

import { NextRequest, NextResponse } from "next/server";
import { resolveTenantContext } from "@/modules/auth-tenancy/tenant.resolver";
import { requirePermission } from "@/modules/auth-tenancy/rbac.guard";
import { sendMessageStreamSchema } from "@/contracts/conversation.contracts";
import { copilotOrchestrator } from "@/modules/conversations/copilot.orchestrator";
import { logger } from "@/lib/logger";

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
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const sseEvent of copilotOrchestrator.streamChat({
            tenantId: tenant.tenantId,
            userId: tenant.userId,
            conversationId,
            userPrompt: validated.content,
            attachmentAssetIds: validated.attachment_asset_ids,
            campaignUrls: validated.campaign_urls,
            activeCampaignId: validated.active_campaign_id,
          })) {
            const frame = `event: ${sseEvent.type}\ndata: ${JSON.stringify(sseEvent)}\n\n`;
            controller.enqueue(encoder.encode(frame));
          }
          controller.close();
        } catch (streamErr) {
          const errMsg = (streamErr as Error).message || "Streaming failed";
          logger.error("Error in SSE controller loop", { error: errMsg, requestId });
          const errorFrame = `event: message.failed\ndata: ${JSON.stringify({
            type: "message.failed",
            data: { error_code: "SSE_STREAM_ERROR", message: errMsg },
          })}\n\n`;
          controller.enqueue(encoder.encode(errorFrame));
          controller.close();
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
