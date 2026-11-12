/**
 * Cogent Marketing Shield - Single Conversation Resource Route
 * Document Reference: Document 04 (Section 3.3, 3.4), Document 08 (Phase 6)
 */

import { createApiHandler } from "@/lib/api-handler";
import { conversationService } from "@/modules/conversations/conversation.service";
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
      throw new Error("Conversation ID is required");
    }

    const conversation = await conversationService.getConversation(
      tenant.tenantId,
      conversationId
    );
    if (!conversation) {
      throw new Error("Conversation not found");
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
      throw new Error("Conversation ID is required");
    }

    return conversationService.updateConversation(tenant.tenantId, conversationId, {
      title: body.title,
    });
  }
);
