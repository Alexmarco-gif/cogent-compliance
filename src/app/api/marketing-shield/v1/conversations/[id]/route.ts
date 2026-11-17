/**
 * Cogent Marketing Shield - Single Conversation Resource Route
 * Document Reference: Document 04 (Section 3.3, 3.4), Document 08 (Phase 6)
 */

import { AppApiError, createApiHandler } from "@/lib/api-handler";
import { canAccessConversation, conversationService } from "@/modules/conversations/conversation.service";
import { updateConversationSchema } from "@/contracts/conversation.contracts";

/**
 * GET /api/marketing-shield/v1/conversations/[id]
 */
export const GET = createApiHandler(
  {
    requiredPermission: "conversation.read",
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
        "You do not have access to this private compliance thread.",
        403,
      );
    }

    return conversation;
  }
);

/**
 * PATCH /api/marketing-shield/v1/conversations/[id]
 * Renames conversation title.
 */
export const PATCH = createApiHandler(
  {
    requiredPermission: "conversation.create",
    bodySchema: updateConversationSchema,
  },
  async (_req, { tenant, body, params }) => {
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
        "You do not have permission to rename another user's private compliance thread.",
        403,
      );
    }

    return conversationService.updateConversation(tenant.tenantId, conversationId, {
      title: body.title,
    });
  }
);
