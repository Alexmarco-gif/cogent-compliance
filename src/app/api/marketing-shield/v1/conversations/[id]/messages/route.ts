/**
 * Cogent Marketing Shield - Conversation Messages Collection Route
 * Document Reference: Document 04 (Section 3.3), Document 08 (Phase 6)
 */

import { AppApiError, createApiHandler } from "@/lib/api-handler";
import { canAccessConversation, conversationService } from "@/modules/conversations/conversation.service";
import { z } from "zod";

const listMessagesQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50).optional(),
  cursor: z.string().optional(),
});

/**
 * GET /api/marketing-shield/v1/conversations/[id]/messages
 * Returns chronological messages for the conversation.
 */
export const GET = createApiHandler(
  {
    requiredPermission: "conversation.read",
    querySchema: listMessagesQuerySchema,
  },
  async (_req, { tenant, query, params }) => {
    const conversationId = Array.isArray(params.id) ? params.id[0] : params.id;
    if (!conversationId) {
      throw new AppApiError("VALIDATION_FAILED", "Conversation ID is required", 400);
    }

    const conversation = await conversationService.getConversation(
      tenant.tenantId,
      conversationId
    );
    if (!conversation) {
      throw new AppApiError("NOT_FOUND", "Conversation not found", 404);
    }

    if (!canAccessConversation(conversation, [tenant.userId, tenant.clerkUserId])) {
      throw new AppApiError(
        "FORBIDDEN",
        "You do not have access to messages in another user's private compliance thread.",
        403,
      );
    }

    return conversationService.listMessages(tenant.tenantId, conversationId, {
      limit: query.limit,
      cursor: query.cursor,
    });
  }
);
