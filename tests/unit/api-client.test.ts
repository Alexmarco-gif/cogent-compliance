import { describe, it, expect } from "vitest";
import { extractApiError, unwrapApiList, extractSseDataFromBlock } from "@/lib/api-client";

describe("Client API Envelope Helpers (api-client.ts)", () => {
  it("unwraps createApiHandler list envelopes `{ success: true, data: [...] }`", () => {
    const envelope = {
      success: true,
      data: [{ id: "prod_1", product_name: "QuickCash" }],
      meta: { request_id: "req_1", timestamp: "2026-11-15T00:00:00Z" },
    };

    const result = unwrapApiList<{ id: string; product_name: string }>(envelope);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("prod_1");
  });

  it("unwraps nested collection envelopes `{ success: true, data: { campaigns: [...] } }`", () => {
    const envelope = {
      success: true,
      data: {
        campaigns: [{ id: "camp_1", campaign_name: "Holiday Promo" }],
        totalCount: 1,
      },
    };

    const result = unwrapApiList<{ id: string; campaign_name: string }>(envelope, "campaigns");
    expect(result).toHaveLength(1);
    expect(result[0]?.campaign_name).toBe("Holiday Promo");
  });

  it("returns empty array cleanly when data envelope is missing or invalid", () => {
    expect(unwrapApiList(null)).toEqual([]);
    expect(unwrapApiList({ success: false })).toEqual([]);
    expect(unwrapApiList({ data: { unexpected: "obj" } }, "campaigns")).toEqual([]);
  });

  it("extracts createApiHandler error codes and messages", () => {
    const parsed = extractApiError(
      401,
      {
        success: false,
        error: {
          code: "UNAUTHENTICATED",
          message: "Authentication required. No active Clerk user session found.",
        },
      },
      "Fallback error",
    );

    expect(parsed.status).toBe(401);
    expect(parsed.code).toBe("UNAUTHENTICATED");
    expect(parsed.message).toBe("Authentication required. No active Clerk user session found.");
  });

  it("extracts lightweight JSON `{ error }` payloads with appropriate default codes", () => {
    const parsed = extractApiError(403, { error: "No active organization selected" }, "Fallback");
    expect(parsed.status).toBe(403);
    expect(parsed.code).toBe("TENANT_CONTEXT_INVALID");
    expect(parsed.message).toBe("No active organization selected");
  });

  it("extracts data payload from standard event+data SSE frame blocks", () => {
    const frame = 'event: assistant.delta\ndata: {"type":"assistant.delta","data":{"text_delta":"Hello"}}';
    const payload = extractSseDataFromBlock(frame);
    expect(payload).toBe('{"type":"assistant.delta","data":{"text_delta":"Hello"}}');
    expect(JSON.parse(payload!).data.text_delta).toBe("Hello");
  });

  it("returns null for SSE comment or empty blocks", () => {
    expect(extractSseDataFromBlock(": keepalive")).toBeNull();
    expect(extractSseDataFromBlock("event: ping")).toBeNull();
    expect(extractSseDataFromBlock("   ")).toBeNull();
  });
});
