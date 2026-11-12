/**
 * Cogent Marketing Shield - Conversation Archive Route
 * Document Reference: Document 04 (Section 3.4), Document 08 (Phase 6)
 */

import { createApiHandler } from "@/lib/api-handler";
import { conversationService } from "@/modules/conversations/conversation.service";

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
      throw new Error("Conversation ID is required");
    }

    return conversationService.archiveConversation(tenant.tenantId, conversationId);
  }
);
