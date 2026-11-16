/**
 * Cogent Marketing Shield - Clerk Svix Webhook & Event Dispatcher Unit Tests
 * Document Reference: Document 07 (Section 4) & Document 08 (Phase 3)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { Webhook } from "svix";
import { POST } from "@/app/api/webhooks/clerk/route";
import {
  dispatchClerkWebhookEvent,
  syncClerkOrganizationCreated,
} from "@/modules/auth-tenancy/clerk.sync";
import { createAdminSupabaseClient } from "@/lib/supabase";

// Mock Supabase admin client for deterministic unit testing
vi.mock("@/lib/supabase", () => {
  const mockSingle = vi.fn().mockResolvedValue({
    data: { id: "00000000-0000-0000-0000-000000000001" },
    error: null,
  });

  const mockMaybeSingle = vi.fn().mockResolvedValue({
    data: null,
    error: null,
  });

  const mockSelect = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      single: mockSingle,
      maybeSingle: mockMaybeSingle,
      eq: vi.fn().mockReturnValue({
        single: mockSingle,
        maybeSingle: mockMaybeSingle,
      }),
    }),
    single: mockSingle,
    maybeSingle: mockMaybeSingle,
  });

  const mockInsert = vi.fn().mockReturnValue({
    select: mockSelect,
  });

  const mockUpsert = vi.fn().mockReturnValue({
    select: mockSelect,
  });

  const mockUpdate = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ error: null }),
  });

  const mockFrom = vi.fn().mockReturnValue({
    insert: mockInsert,
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

  it("should retry with a disambiguated slug when slug uniqueness collides during organization sync", async () => {
    const insertedSlugs: string[] = [];
    const mockClient = createAdminSupabaseClient();

    vi.mocked(mockClient.from).mockImplementationOnce(() => ({
      select: () => ({
        eq: () => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    }) as any);

    // First insert attempt fails with 23505 on tenants_slug_key
    vi.mocked(mockClient.from).mockImplementationOnce(() => ({
      insert: (payload: { slug: string }) => {
        insertedSlugs.push(payload.slug);
        return {
          select: () => ({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: {
                code: "23505",
                message: 'duplicate key value violates unique constraint "tenants_slug_key"',
              },
            }),
          }),
        };
      },
    }) as any);

    // Race check returns null (was a slug collision, not clerk_org_id)
    vi.mocked(mockClient.from).mockImplementationOnce(() => ({
      select: () => ({
        eq: () => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    }) as any);

    // Second insert attempt with disambiguated slug succeeds
    vi.mocked(mockClient.from).mockImplementationOnce(() => ({
      insert: (payload: { slug: string }) => {
        insertedSlugs.push(payload.slug);
        return {
          select: () => ({
            single: vi.fn().mockResolvedValue({
              data: { id: "tenant_laku_123" },
              error: null,
            }),
          }),
        };
      },
    }) as any);

    const result = await syncClerkOrganizationCreated({
      id: "org_3MVkRIaqDowznKtPsDnPpFSioLU",
      name: "Laku",
      slug: "laku",
    });

    expect(result.tenantId).toBe("tenant_laku_123");
    expect(insertedSlugs[0]).toBe("laku");
    expect(insertedSlugs[1]).toBe("laku-ppfsiolu");
  });

  it("should return existing tenant ID without overwriting settings if already provisioned", async () => {
    const mockClient = createAdminSupabaseClient();
    const insertSpy = vi.fn();

    vi.mocked(mockClient.from).mockImplementationOnce(() => ({
      select: () => ({
        eq: () => ({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: "tenant_existing_999" },
            error: null,
          }),
        }),
      }),
      insert: insertSpy,
    }) as any);

    const result = await syncClerkOrganizationCreated({
      id: "org_3MVkRIaqDowznKtPsDnPpFSioLU",
      name: "Laku",
      slug: "laku",
    });

    expect(result.tenantId).toBe("tenant_existing_999");
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it("should prefer public_metadata.canonicalRole over generic Clerk org:member role on membership creation", async () => {
    const mockClient = createAdminSupabaseClient();
    let upsertedRole: string | null = null;

    vi.mocked(mockClient.from).mockImplementationOnce(() => ({
      select: () => ({
        eq: () => ({
          single: vi.fn().mockResolvedValue({
            data: { id: "tenant_meta_1", settings: {} },
            error: null,
          }),
        }),
      }),
    }) as any);

    vi.mocked(mockClient.from).mockImplementationOnce(() => ({
      upsert: (payload: { role: string }) => {
        upsertedRole = payload.role;
        return {
          select: () => ({
            single: vi.fn().mockResolvedValue({ data: { id: "mem_meta_1" }, error: null }),
          }),
        };
      },
    }) as any);

    await dispatchClerkWebhookEvent("organizationMembership.created", {
      id: "orgmem_legal_01",
      role: "org:member",
      public_metadata: { canonicalRole: "LEGAL_COUNSEL" },
      organization: { id: "org_meta_1", name: "Meta Bank" },
      public_user_data: { user_id: "user_legal_99", identifier: "legal@metabank.ng" },
    });

    expect(upsertedRole).toBe("LEGAL_COUNSEL");
  });

  it("should preserve specialized Supabase canonical role when Clerk updates generic org:admin without metadata", async () => {
    const mockClient = createAdminSupabaseClient();
    let updatedRole: string | null = null;

    vi.mocked(mockClient.from).mockImplementationOnce(() => ({
      select: () => ({
        eq: () => ({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { role: "CHIEF_COMPLIANCE_OFFICER" },
            error: null,
          }),
        }),
      }),
    }) as any);

    vi.mocked(mockClient.from).mockImplementationOnce(() => ({
      update: (payload: { role: string }) => {
        updatedRole = payload.role;
        return {
          eq: vi.fn().mockResolvedValue({ error: null }),
        };
      },
    }) as any);

    await dispatchClerkWebhookEvent("organizationMembership.updated", {
      id: "orgmem_cco_01",
      role: "org:admin",
      organization: { id: "org_meta_1" },
      public_user_data: { user_id: "user_cco_99" },
    });

    expect(updatedRole).toBe("CHIEF_COMPLIANCE_OFFICER");
  });
});
