/**
 * Cogent Marketing Shield - Clerk Svix Webhook & Event Dispatcher Unit Tests
 * Document Reference: Document 07 (Section 4) & Document 08 (Phase 3)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { Webhook } from "svix";
import { POST } from "@/app/api/webhooks/clerk/route";
import { dispatchClerkWebhookEvent } from "@/modules/auth-tenancy/clerk.sync";

// Mock Supabase admin client for deterministic unit testing
vi.mock("@/lib/supabase", () => {
  const mockSingle = vi.fn().mockResolvedValue({
    data: { id: "00000000-0000-0000-0000-000000000001" },
    error: null,
  });

  const mockSelect = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      single: mockSingle,
      eq: vi.fn().mockReturnValue({
        single: mockSingle,
      }),
    }),
    single: mockSingle,
  });

  const mockUpsert = vi.fn().mockReturnValue({
    select: mockSelect,
  });

  const mockUpdate = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ error: null }),
  });

  const mockFrom = vi.fn().mockReturnValue({
    upsert: mockUpsert,
    update: mockUpdate,
    select: mockSelect,
  });

  return {
    createAdminSupabaseClient: vi.fn().mockReturnValue({
      from: mockFrom,
    }),
  };
});

describe("Clerk Svix Webhook Route (/api/webhooks/clerk)", () => {
  const testSecret = "whsec_55555555555555555555555555555555";

  beforeEach(() => {
    process.env.CLERK_WEBHOOK_SIGNING_SECRET = testSecret;
  });

  it("should return HTTP 400 when Svix headers are missing", async () => {
    const req = new NextRequest("http://localhost:3000/api/webhooks/clerk", {
      method: "POST",
      body: JSON.stringify({ type: "organization.created" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error.code).toBe("SVIX_HEADERS_MISSING");
  });

  it("should return HTTP 400 when Svix signature is forged or invalid", async () => {
    const body = JSON.stringify({ type: "organization.created", data: { id: "org_123" } });
    const req = new NextRequest("http://localhost:3000/api/webhooks/clerk", {
      method: "POST",
      headers: {
        "svix-id": "msg_fake_123",
        "svix-timestamp": Math.floor(Date.now() / 1000).toString(),
        "svix-signature": "v1,invalid_forged_signature_hash=",
        "content-type": "application/json",
      },
      body,
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error.code).toBe("INVALID_SIGNATURE");
  });

  it("should return HTTP 200 and process payload when valid Svix signature is provided", async () => {
    const wh = new Webhook(testSecret);
    const date = new Date();
    const timestamp = Math.floor(date.getTime() / 1000).toString();
    const msgId = "msg_valid_test_001";

    const payload = JSON.stringify({
      type: "organization.created",
      data: {
        id: "org_zenith_bank_test",
        name: "Zenith Bank PLC",
        slug: "zenith-bank-plc",
      },
    });

    const signature = wh.sign(msgId, date, payload);

    const req = new NextRequest("http://localhost:3000/api/webhooks/clerk", {
      method: "POST",
      headers: {
        "svix-id": msgId,
        "svix-timestamp": timestamp,
        "svix-signature": signature,
        "content-type": "application/json",
      },
      body: payload,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.eventType).toBe("organization.created");
    expect(json.data.handled).toBe(true);
  });
});

describe("Clerk Webhook Event Dispatcher (dispatchClerkWebhookEvent)", () => {
  it("should handle organization.created event", async () => {
    const result = await dispatchClerkWebhookEvent("organization.created", {
      id: "org_test_first_bank",
      name: "First Bank of Nigeria",
      slug: "first-bank-ng",
    });

    expect(result.handled).toBe(true);
    expect(result.eventType).toBe("organization.created");
  });

  it("should handle organization.updated event", async () => {
    const result = await dispatchClerkWebhookEvent("organization.updated", {
      id: "org_test_first_bank",
      name: "First Bank of Nigeria PLC",
      slug: "first-bank-ng-plc",
    });

    expect(result.handled).toBe(true);
    expect(result.eventType).toBe("organization.updated");
  });

  it("should handle organization.deleted event", async () => {
    const result = await dispatchClerkWebhookEvent("organization.deleted", {
      id: "org_test_first_bank",
    });

    expect(result.handled).toBe(true);
    expect(result.eventType).toBe("organization.deleted");
  });

  it("should handle organizationMembership.created event", async () => {
    const result = await dispatchClerkWebhookEvent("organizationMembership.created", {
      id: "orgmem_test_001",
      role: "org:chief_compliance_officer",
      organization: {
        id: "org_test_first_bank",
        name: "First Bank of Nigeria",
      },
      public_user_data: {
        user_id: "user_cco_001",
      },
    });

    expect(result.handled).toBe(true);
    expect(result.eventType).toBe("organizationMembership.created");
  });

  it("should handle organizationMembership.updated event", async () => {
    const result = await dispatchClerkWebhookEvent("organizationMembership.updated", {
      id: "orgmem_test_001",
      role: "org:legal_counsel",
      organization: {
        id: "org_test_first_bank",
      },
      public_user_data: {
        user_id: "user_cco_001",
      },
    });

    expect(result.handled).toBe(true);
    expect(result.eventType).toBe("organizationMembership.updated");
  });

  it("should handle organizationMembership.deleted event", async () => {
    const result = await dispatchClerkWebhookEvent("organizationMembership.deleted", {
      id: "orgmem_test_001",
      organization: {
        id: "org_test_first_bank",
      },
      public_user_data: {
        user_id: "user_cco_001",
      },
    });

    expect(result.handled).toBe(true);
    expect(result.eventType).toBe("organizationMembership.deleted");
  });

  it("should gracefully acknowledge unhandled event types", async () => {
    const result = await dispatchClerkWebhookEvent("session.created", {
      id: "sess_123",
    });

    expect(result.handled).toBe(false);
    expect(result.eventType).toBe("session.created");
  });
});
