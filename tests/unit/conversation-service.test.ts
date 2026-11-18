/**
 * Cogent Marketing Shield - Conversation Service Unit Tests
 * Document Reference: Document 04 (Section 3), Document 08 (Phase 6)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ConversationService } from "@/modules/conversations/conversation.service";

// Mock Supabase Admin Client
const mockSupabase = {
  from: vi.fn(),
};

vi.mock("@/lib/supabase", () => ({
  createAdminSupabaseClient: () => mockSupabase,
}));

describe("ConversationService (Unit)", () => {
  let service: ConversationService;
  const testTenantId = "00000000-0000-0000-0000-000000000001";
  const testUserId = "user_test_compliance_officer";

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ConversationService();
  });

  it("should create a new conversation scoped by tenant", async () => {
    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: "conv_123",
            tenant_id: testTenantId,
            created_by: testUserId,
            title: "FCCPC DEON Regulations Query",
            status: "ACTIVE",
            context_type: "REGULATORY",
            active_campaign_id: null,
            last_message_at: "2026-11-12T12:00:00Z",
            created_at: "2026-11-12T12:00:00Z",
            updated_at: "2026-11-12T12:00:00Z",
          },
          error: null,
        }),
      }),
    });

    mockSupabase.from.mockReturnValue({ insert: mockInsert });

    const result = await service.createConversation(testTenantId, testUserId, {
      title: "FCCPC DEON Regulations Query",
      context_type: "REGULATORY",
    });

    expect(result.id).toBe("conv_123");
    expect(result.tenant_id).toBe(testTenantId);
    expect(result.title).toBe("FCCPC DEON Regulations Query");
    expect(mockInsert).toHaveBeenCalledWith({
      tenant_id: testTenantId,
      created_by: testUserId,
      title: "FCCPC DEON Regulations Query",
      status: "ACTIVE",
      context_type: "REGULATORY",
      active_campaign_id: null,
    });
  });

  it("should list active conversations ordered by last_message_at DESC", async () => {
    const mockQuery = {
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [
          {
            id: "conv_1",
            tenant_id: testTenantId,
            title: "Conv 1",
            status: "ACTIVE",
            last_message_at: "2026-11-12T12:00:00Z",
          },
        ],
        error: null,
      }),
    };

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue(mockQuery),
    });

    const result = await service.listConversations(testTenantId, { limit: 10 });
    expect(result.conversations).toHaveLength(1);
    expect(result.conversations[0]?.id).toBe("conv_1");
  });

  it("should archive a conversation without deleting it", async () => {
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: "conv_1",
                tenant_id: testTenantId,
                status: "ARCHIVED",
              },
              error: null,
            }),
          }),
        }),
      }),
    });

    mockSupabase.from.mockReturnValue({ update: mockUpdate });

    const result = await service.archiveConversation(testTenantId, "conv_1");
    expect(result.status).toBe("ARCHIVED");
  });

  it("should create a message with incremented sequence number", async () => {
    // 1. Mock query for existing sequence number
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { sequence_number: 3 },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      }),
    });

    // 2. Mock insert for new message
    mockSupabase.from.mockReturnValueOnce({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: "msg_4",
              tenant_id: testTenantId,
              conversation_id: "conv_1",
              role: "USER",
              content: "What are the rules?",
              sequence_number: 4,
              status: "COMPLETED",
            },
            error: null,
          }),
        }),
      }),
    });

    // 3. Mock touch on conversation
    mockSupabase.from.mockReturnValueOnce({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    });

    const msg = await service.createMessage({
      tenantId: testTenantId,
      conversationId: "conv_1",
      role: "USER",
      content: "What are the rules?",
    });

    expect(msg.sequence_number).toBe(4);
    expect(msg.content).toBe("What are the rules?");
  });

  it("retries createMessage once when hitting a PostgreSQL 23505 duplicate sequence_number collision", async () => {
    // Attempt 1: sequence 2 collides with 23505
    mockSupabase.from
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: { sequence_number: 2 }, error: null }),
                }),
              }),
            }),
          }),
        }),
      })
      .mockReturnValueOnce({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: "23505", message: "duplicate key value violates unique constraint" },
            }),
          }),
        }),
      })
      // Attempt 2: sequence 3 succeeds
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: { sequence_number: 3 }, error: null }),
                }),
              }),
            }),
          }),
        }),
      })
      .mockReturnValueOnce({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: "msg_retry_4",
                tenant_id: testTenantId,
                conversation_id: "conv_1",
                role: "USER",
                content: "Concurrent prompt",
                sequence_number: 4,
                status: "COMPLETED",
              },
              error: null,
            }),
          }),
        }),
      })
      // Touch conversation
      .mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }),
      });

    const msg = await service.createMessage({
      tenantId: testTenantId,
      conversationId: "conv_1",
      role: "USER",
      content: "Concurrent prompt",
    });

    expect(msg.id).toBe("msg_retry_4");
    expect(msg.sequence_number).toBe(4);
  });

  it("filters listConversations by allowedCreatorIds plus shared sentinel creators when provided", async () => {
    const inMock = vi.fn().mockReturnThis();
    const mockQuery = {
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      in: inMock,
      then: undefined as unknown,
    };
    // Make limit return query and await resolve at the end
    mockQuery.limit = vi.fn().mockReturnValue(mockQuery);
    inMock.mockResolvedValue({
      data: [{ id: "conv_own", tenant_id: testTenantId, created_by: testUserId }],
      error: null,
    });

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue(mockQuery),
    });

    const result = await service.listConversations(testTenantId, {
      limit: 10,
      allowedCreatorIds: ["mem_1", testUserId],
    });

    expect(inMock).toHaveBeenCalledWith("created_by", [
      "mem_1",
      testUserId,
      "system_drift_sentinel",
      "system_ripple_sentinel",
    ]);
    expect(result.conversations).toHaveLength(1);
  });

  it("isolates private conversations to creator while allowing shared sentinel incident threads across org", async () => {
    const { canAccessConversation } = await import("@/modules/conversations/conversation.service");

    expect(
      canAccessConversation(
        { created_by: "user_a", title: "Private audit", metadata: {} },
        ["mem_a", "user_a"],
      ),
    ).toBe(true);

    expect(
      canAccessConversation(
        { created_by: "user_a", title: "Private audit", metadata: {} },
        ["mem_b", "user_b"],
      ),
    ).toBe(false);

    expect(
      canAccessConversation(
        { created_by: "system_drift_sentinel", title: "Drift Incident", metadata: {} },
        ["mem_b", "user_b"],
      ),
    ).toBe(true);

    expect(
      canAccessConversation(
        { created_by: "user_a", title: "[Drift Sentinel Alert] Rate drift", metadata: {} },
        ["mem_b", "user_b"],
      ),
    ).toBe(true);

    expect(
      canAccessConversation(
        {
          created_by: "user_a",
          title: "Ripple Alert",
          metadata: { zero_prompt_source: "REGULATORY_RIPPLE_SENTINEL" },
        },
        ["mem_b", "user_b"],
      ),
    ).toBe(true);
  });

  it("fetches a single message scoped by tenant and conversation via getMessage", async () => {
    const maybeSingleMock = vi.fn().mockResolvedValue({
      data: {
        id: "msg_target",
        tenant_id: testTenantId,
        conversation_id: "conv_1",
        role: "USER",
        content: "Original prompt",
        sequence_number: 3,
      },
      error: null,
    });
    const eqIdMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
    const eqConvMock = vi.fn().mockReturnValue({ eq: eqIdMock });
    const eqTenantMock = vi.fn().mockReturnValue({ eq: eqConvMock });

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({ eq: eqTenantMock }),
    });

    const msg = await service.getMessage(testTenantId, "conv_1", "msg_target");
    expect(msg?.id).toBe("msg_target");
    expect(msg?.sequence_number).toBe(3);
    expect(eqTenantMock).toHaveBeenCalledWith("tenant_id", testTenantId);
    expect(eqConvMock).toHaveBeenCalledWith("conversation_id", "conv_1");
    expect(eqIdMock).toHaveBeenCalledWith("id", "msg_target");
  });

  it("truncates messages from a sequence number onwards when editing and resending", async () => {
    const selectMock = vi.fn().mockResolvedValue({
      data: [{ id: "msg_3" }, { id: "msg_4" }],
      error: null,
    });
    const gteMock = vi.fn().mockReturnValue({ select: selectMock });
    const eqConvMock = vi.fn().mockReturnValue({ gte: gteMock });
    const eqTenantMock = vi.fn().mockReturnValue({ eq: eqConvMock });

    mockSupabase.from.mockReturnValue({
      delete: vi.fn().mockReturnValue({ eq: eqTenantMock }),
    });

    const deletedCount = await service.truncateMessagesFrom({
      tenantId: testTenantId,
      conversationId: "conv_1",
      fromSequenceNumber: 3,
    });

    expect(deletedCount).toBe(2);
    expect(eqTenantMock).toHaveBeenCalledWith("tenant_id", testTenantId);
    expect(eqConvMock).toHaveBeenCalledWith("conversation_id", "conv_1");
    expect(gteMock).toHaveBeenCalledWith("sequence_number", 3);
  });

  it("hydrates attachment metadata from campaign_assets when only attachment_asset_ids are present", async () => {
    const inMock = vi.fn().mockResolvedValue({
      data: [
        {
          id: "asset_1",
          original_filename: "campaign-flyer.png",
          mime_type: "image/png",
          file_size_bytes: 245760,
        },
      ],
      error: null,
    });
    const eqTenantMock = vi.fn().mockReturnValue({ in: inMock });
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({ eq: eqTenantMock }),
    });

    const hydrated = await service.hydrateMessageAttachments(testTenantId, [
      {
        id: "msg_legacy",
        tenant_id: testTenantId,
        conversation_id: "conv_1",
        role: "USER",
        content: "Audit this flyer",
        content_type: "TEXT",
        status: "COMPLETED",
        sequence_number: 1,
        parent_message_id: null,
        model_run_id: null,
        created_at: "2026-11-12T12:00:00Z",
        metadata: {
          attachment_asset_ids: ["asset_1"],
        },
      },
      {
        id: "msg_already_hydrated",
        tenant_id: testTenantId,
        conversation_id: "conv_1",
        role: "USER",
        content: "Check policy PDF",
        content_type: "TEXT",
        status: "COMPLETED",
        sequence_number: 2,
        parent_message_id: null,
        model_run_id: null,
        created_at: "2026-11-12T12:05:00Z",
        metadata: {
          attachment_asset_ids: ["asset_2"],
          attachments: [
            {
              asset_id: "asset_2",
              filename: "policy.pdf",
              mime_type: "application/pdf",
              file_size_bytes: 102400,
            },
          ],
        },
      },
    ]);

    expect(inMock).toHaveBeenCalledWith("id", ["asset_1"]);
    expect(hydrated[0]?.metadata?.attachments).toEqual([
      {
        asset_id: "asset_1",
        filename: "campaign-flyer.png",
        mime_type: "image/png",
        file_size_bytes: 245760,
      },
    ]);
    expect(hydrated[1]?.metadata?.attachments).toEqual([
      {
        asset_id: "asset_2",
        filename: "policy.pdf",
        mime_type: "application/pdf",
        file_size_bytes: 102400,
      },
    ]);
  });

  it("validates optional replace_from_message_id UUID on sendMessageStreamSchema", async () => {
    const { sendMessageStreamSchema } = await import("@/contracts/conversation.contracts");

    const valid = sendMessageStreamSchema.safeParse({
      content: "Updated compliance prompt",
      replace_from_message_id: "11111111-1111-4111-8111-111111111111",
    });
    expect(valid.success).toBe(true);

    const invalid = sendMessageStreamSchema.safeParse({
      content: "Updated compliance prompt",
      replace_from_message_id: "not-a-uuid",
    });
    expect(invalid.success).toBe(false);
  });
});

