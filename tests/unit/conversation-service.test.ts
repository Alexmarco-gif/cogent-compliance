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
});
