/**
 * Cogent Marketing Shield - Conversation Archive Route
 * Document Reference: Document 04 (Section 3.4), Document 08 (Phase 6)
 */

import { AppApiError, createApiHandler } from "@/lib/api-handler";
import { canAccessConversation, conversationService } from "@/modules/conversations/conversation.service";

/**
 * POST /api/marketing-shield/v1/conversations/[id]/archive
 * Sets status to ARCHIVED without deleting records.
 */
export const POST = createApiHandler(
  {
    requiredPermission: "conversation.create",
  },
  async (_req, { tenant, params }) => {
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
        "You do not have permission to archive another user's private compliance thread.",
        403,
      );
    }

    return conversationService.archiveConversation(tenant.tenantId, conversationId);
  }
);
