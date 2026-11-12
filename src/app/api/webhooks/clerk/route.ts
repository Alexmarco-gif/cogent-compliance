/**
 * Cogent Marketing Shield - Clerk Svix Webhook Receiver
 * Document Reference: Document 07 (Section 4) & Document 08 (Phase 3)
 * Endpoint: POST /api/webhooks/clerk
 */

import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { dispatchClerkWebhookEvent } from "@/modules/auth-tenancy/clerk.sync";
import { logger } from "@/lib/logger";

interface SvixHeaders {
  "svix-id": string;
  "svix-timestamp": string;
  "svix-signature": string;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const webhookLogger = logger.withContext({
    endpoint: "/api/webhooks/clerk",
    method: "POST",
  });

  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    webhookLogger.warn("Clerk webhook rejected: Missing Svix signature headers");
    return NextResponse.json(
      {
        error: {
          code: "SVIX_HEADERS_MISSING",
          message: "Missing required Svix verification headers (svix-id, svix-timestamp, svix-signature)",
        },
      },
      { status: 400 },
    );
  }

  const webhookSecret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
  if (!webhookSecret) {
    webhookLogger.error("Clerk webhook rejected: CLERK_WEBHOOK_SIGNING_SECRET is not configured");
    return NextResponse.json(
      {
        error: {
          code: "CONFIG_ERROR",
          message: "Server webhook signing secret is not configured",
        },
      },
      { status: 500 },
    );
  }

  let body: string;
  try {
    body = await req.text();
  } catch (err) {
    webhookLogger.error("Failed to read webhook request body", { error: err });
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Failed to read request body" } },
      { status: 400 },
    );
  }

  // Cryptographically verify Svix signature
  const wh = new Webhook(webhookSecret);

  try {
    wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    } as SvixHeaders);
  } catch (err) {
    webhookLogger.warn("Clerk webhook rejected: Invalid Svix cryptographic signature", {
      error: err instanceof Error ? err.message : String(err),
      svixId,
    });
    return NextResponse.json(
      {
        error: {
          code: "INVALID_SIGNATURE",
          message: "Svix signature verification failed",
        },
      },
      { status: 400 },
    );
  }

  let event: { type: string; data: Record<string, unknown> };
  try {
    event = JSON.parse(body) as { type: string; data: Record<string, unknown> };
  } catch (err) {
    webhookLogger.error("Failed to parse verified webhook JSON body", { error: err });
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Invalid JSON in verified webhook payload" } },
      { status: 400 },
    );
  }

  // Dispatch event to sync handler
  try {
    const result = await dispatchClerkWebhookEvent(event.type, event.data);
    webhookLogger.info("Clerk webhook processed successfully", {
      eventType: event.type,
      handled: result.handled,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          eventType: event.type,
          handled: result.handled,
        },
      },
      { status: 200 },
    );
  } catch (err) {
    webhookLogger.error("Error processing Clerk webhook event", {
      eventType: event.type,
      error: err instanceof Error ? err.message : String(err),
    });

    return NextResponse.json(
      {
        error: {
          code: "PROCESSING_FAILED",
          message: err instanceof Error ? err.message : "Internal error processing webhook event",
        },
      },
      { status: 500 },
    );
  }
}
