/**
 * Cogent Marketing Shield - Conversations Collection Route
 * Document Reference: Document 04 (Section 3.1, 3.2), Document 08 (Phase 6)
 */

import { createApiHandler } from "@/lib/api-handler";
import { conversationService } from "@/modules/conversations/conversation.service";
import {
  createConversationSchema,
  listConversationsQuerySchema,
} from "@/contracts/conversation.contracts";

/**
 * GET /api/marketing-shield/v1/conversations
 * Lists tenant-scoped conversations ordered by last_message_at DESC.
 */
export const GET = createApiHandler(
  {
    requiredPermission: "conversation.read",
    querySchema: listConversationsQuerySchema,
  },
  async (_req, { tenant, query }) => {
    return conversationService.listConversations(tenant.tenantId, {
      status: query.status,
      limit: query.limit,
      cursor: query.cursor,
    });
  }
);

/**
 * POST /api/marketing-shield/v1/conversations
 * Creates a new conversation.
 */
export const POST = createApiHandler(
  {
    requiredPermission: "conversation.create",
    bodySchema: createConversationSchema,
  },
  async (_req, { tenant, body }) => {
    return conversationService.createConversation(tenant.tenantId, tenant.userId, {
      title: body.title,
      context_type: body.context_type,
      active_campaign_id: body.active_campaign_id,
    });
  }
);
