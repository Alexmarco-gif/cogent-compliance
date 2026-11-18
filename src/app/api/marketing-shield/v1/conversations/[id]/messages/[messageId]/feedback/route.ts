/**
 * Cogent Compliance Platform
 * Message Feedback Endpoint (Thumbs Up / Down Persistence)
 */

import { z } from "zod";
import { AppApiError, createApiHandler } from "@/lib/api-handler";
import {
  canAccessConversation,
  conversationService,
} from "@/modules/conversations/conversation.service";

const feedbackBodySchema = z.object({
  rating: z.enum(["up", "down"]).nullable(),
});

export const PATCH = createApiHandler(
  {
    requiredPermission: "conversation.read",
    bodySchema: feedbackBodySchema,
  },
  async (_req, { tenant, body, params }) => {
    const conversationId = Array.isArray(params.id) ? params.id[0] : params.id;
    const messageId = Array.isArray(params.messageId) ? params.messageId[0] : params.messageId;

    if (!conversationId || !messageId) {
      throw new AppApiError(
        "VALIDATION_FAILED",
        "Conversation ID and message ID are required",
        400
      );
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
        "You do not have access to update feedback in another user's private thread.",
        403
      );
    }

    const updated = await conversationService.setMessageFeedback({
      tenantId: tenant.tenantId,
      conversationId,
      messageId,
      userId: tenant.userId,
      rating: body.rating,
    });

    return {
      message_id: updated.id,
      feedback: (updated.metadata?.feedback as "up" | "down" | undefined) ?? null,
    };
  }
);
