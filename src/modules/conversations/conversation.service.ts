/**
 * Cogent Marketing Shield - Conversation Service
 * Document Reference: Document 03 (Section 2), Document 04 (Section 3), Document 07
 */

import { createAdminSupabaseClient } from "@/lib/supabase";
import { logger } from "@/lib/logger";

export type ConversationContextType =
  | "GENERAL"
  | "REGULATORY"
  | "CAMPAIGN"
  | "WORKFLOW_RESEARCH"
  | "POLICY_REDLINE"
  | "DDQ_RESPONSE"
  | "CROSS_BORDER";

export interface ConversationRecord {
  id: string;
  tenant_id: string;
  created_by: string;
  title: string;
  status: "ACTIVE" | "ARCHIVED" | "CLOSED";
  context_type: ConversationContextType;
  active_campaign_id: string | null;
  last_message_at: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface MessageRecord {
  id: string;
  tenant_id: string;
  conversation_id: string;
  role: "USER" | "ASSISTANT" | "SYSTEM" | "TOOL";
  content: string;
  content_type: "TEXT" | "STRUCTURED" | "MIXED";
  status: "PENDING" | "STREAMING" | "COMPLETED" | "FAILED";
  sequence_number: number;
  parent_message_id: string | null;
  model_run_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export const SHARED_INCIDENT_CREATORS = [
  "system_drift_sentinel",
  "system_ripple_sentinel",
] as const;

export function isSharedIncidentConversation(
  conv: Pick<ConversationRecord, "created_by" | "title" | "metadata">,
): boolean {
  return (
    conv.created_by === "system_drift_sentinel" ||
    conv.created_by === "system_ripple_sentinel" ||
    Boolean(conv.metadata?.zero_prompt_source) ||
    conv.title.startsWith("[Drift Sentinel Alert]") ||
    conv.title.startsWith("[Regulatory Ripple Alert]")
  );
}

export function canAccessConversation(
  conv: Pick<ConversationRecord, "created_by" | "title" | "metadata">,
  allowedCreatorIds: string[],
): boolean {
  if (isSharedIncidentConversation(conv)) {
    return true;
  }
  const normalized = new Set(allowedCreatorIds.filter(Boolean));
  return normalized.has(conv.created_by);
}

export class ConversationService {
  /**
   * Creates a new conversation scoped strictly by tenant.
   */
  public async createConversation(
    tenantId: string,
    createdBy: string,
    data: {
      title?: string;
      context_type?: ConversationContextType;
      active_campaign_id?: string | null;
    }
  ): Promise<ConversationRecord> {
    const supabase = createAdminSupabaseClient();
    const title = data.title || "New Compliance Consultation";
    const contextType = data.context_type || "GENERAL";
    const activeCampaignId = data.active_campaign_id || null;

    const { data: conv, error } = await supabase
      .from("marketing_conversations")
      .insert({
        tenant_id: tenantId,
        created_by: createdBy,
        title,
        status: "ACTIVE",
        context_type: contextType,
        active_campaign_id: activeCampaignId,
      })
      .select("*")
      .single();

    if (error || !conv) {
      logger.error("Failed to create marketing conversation", {
        tenantId,
        error: error?.message,
      });
      throw new Error(`Failed to create conversation: ${error?.message || "Unknown error"}`);
    }

    return conv as ConversationRecord;
  }

  /**
   * Lists conversations for a tenant ordered by last_message_at DESC.
   * When allowedCreatorIds is passed, isolates private threads to the creator while keeping shared sentinel incident threads visible.
   */
  public async listConversations(
    tenantId: string,
    options?: {
      status?: "ACTIVE" | "ARCHIVED" | "CLOSED";
      limit?: number;
      cursor?: string;
      allowedCreatorIds?: string[];
    }
  ): Promise<{ conversations: ConversationRecord[]; nextCursor?: string }> {
    const supabase = createAdminSupabaseClient();
    const limit = options?.limit || 20;
    const status = options?.status || "ACTIVE";

    let query = supabase
      .from("marketing_conversations")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("status", status)
      .order("last_message_at", { ascending: false })
      .limit(limit + 1);

    if (options?.allowedCreatorIds && options.allowedCreatorIds.length > 0) {
      const creatorAllowList = Array.from(
        new Set([...options.allowedCreatorIds.filter(Boolean), ...SHARED_INCIDENT_CREATORS]),
      );
      query = query.in("created_by", creatorAllowList);
    }

    if (options?.cursor) {
      query = query.lt("last_message_at", options.cursor);
    }

    const { data, error } = await query;
    if (error) {
      logger.error("Failed to list marketing conversations", { tenantId, error: error.message });
      throw new Error(`Failed to list conversations: ${error.message}`);
    }

    const hasMore = (data?.length || 0) > limit;
    const conversations = (hasMore ? data!.slice(0, limit) : data || []) as ConversationRecord[];
    const nextCursor =
      hasMore && conversations.length > 0
        ? conversations[conversations.length - 1]?.last_message_at
        : undefined;

    return { conversations, nextCursor };
  }

  /**
   * Retrieves a single conversation by ID with tenant verification.
   */
  public async getConversation(
    tenantId: string,
    conversationId: string
  ): Promise<ConversationRecord | null> {
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("marketing_conversations")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("id", conversationId)
      .maybeSingle();

    if (error) {
      logger.error("Failed to get conversation", { tenantId, conversationId, error: error.message });
      throw new Error(`Failed to get conversation: ${error.message}`);
    }

    return (data as ConversationRecord) || null;
  }

  /**
   * Updates conversation title.
   */
  public async updateConversation(
    tenantId: string,
    conversationId: string,
    data: { title: string }
  ): Promise<ConversationRecord> {
    const supabase = createAdminSupabaseClient();
    const { data: updated, error } = await supabase
      .from("marketing_conversations")
      .update({
        title: data.title,
        updated_at: new Date().toISOString(),
      })
      .eq("tenant_id", tenantId)
      .eq("id", conversationId)
      .select("*")
      .single();

    if (error || !updated) {
      logger.error("Failed to update conversation title", {
        tenantId,
        conversationId,
        error: error?.message,
      });
      throw new Error(`Failed to update conversation: ${error?.message || "Not found"}`);
    }

    return updated as ConversationRecord;
  }

  /**
   * Archives a conversation without ever deleting history or linked audit records.
   */
  public async archiveConversation(
    tenantId: string,
    conversationId: string
  ): Promise<ConversationRecord> {
    const supabase = createAdminSupabaseClient();
    const { data: archived, error } = await supabase
      .from("marketing_conversations")
      .update({
        status: "ARCHIVED",
        updated_at: new Date().toISOString(),
      })
      .eq("tenant_id", tenantId)
      .eq("id", conversationId)
      .select("*")
      .single();

    if (error || !archived) {
      logger.error("Failed to archive conversation", {
        tenantId,
        conversationId,
        error: error?.message,
      });
      throw new Error(`Failed to archive conversation: ${error?.message || "Not found"}`);
    }

    return archived as ConversationRecord;
  }

  /**
   * Lists chronological messages for a conversation.
   */
  public async listMessages(
    tenantId: string,
    conversationId: string,
    options?: { limit?: number; cursor?: string; latest?: boolean }
  ): Promise<{ messages: MessageRecord[]; nextCursor?: string }> {
    const supabase = createAdminSupabaseClient();
    const limit = options?.limit || 50;

    // "latest" mode returns the most recent `limit` messages (still in chronological order).
    // Without it, long threads only ever returned the OLDEST messages, so the newest
    // user prompt / assistant reply was missing from both the UI and the LLM history.
    if (options?.latest && !options?.cursor) {
      const { data, error } = await supabase
        .from("marketing_messages")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("conversation_id", conversationId)
        .order("sequence_number", { ascending: false })
        .limit(limit);
      if (error) {
        logger.error("Failed to list latest messages", {
          tenantId,
          conversationId,
          error: error.message,
        });
        throw new Error(`Failed to list messages: ${error.message}`);
      }
      return { messages: ((data || []) as MessageRecord[]).reverse() };
    }

    let query = supabase
      .from("marketing_messages")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("conversation_id", conversationId)
      .order("sequence_number", { ascending: true })
      .limit(limit + 1);

    if (options?.cursor) {
      query = query.gt("sequence_number", parseInt(options.cursor, 10));
    }

    const { data, error } = await query;
    if (error) {
      logger.error("Failed to list messages", { tenantId, conversationId, error: error.message });
      throw new Error(`Failed to list messages: ${error.message}`);
    }

    const hasMore = (data?.length || 0) > limit;
    const messages = (hasMore ? data!.slice(0, limit) : data || []) as MessageRecord[];
    const nextCursor =
      hasMore && messages.length > 0
        ? String(messages[messages.length - 1]?.sequence_number)
        : undefined;

    return { messages, nextCursor };
  }

  /**
   * Computes the next sequence number and inserts a new message.
   */
  public async createMessage(params: {
    tenantId: string;
    conversationId: string;
    role: "USER" | "ASSISTANT" | "SYSTEM" | "TOOL";
    content: string;
    contentType?: "TEXT" | "STRUCTURED" | "MIXED";
    status?: "PENDING" | "STREAMING" | "COMPLETED" | "FAILED";
    modelRunId?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<MessageRecord> {
    const supabase = createAdminSupabaseClient();

    let msg: unknown = null;
    let lastError: { code?: string; message?: string } | null = null;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      // Determine the highest existing sequence number
      const { data: latestMsg } = await supabase
        .from("marketing_messages")
        .select("sequence_number")
        .eq("tenant_id", params.tenantId)
        .eq("conversation_id", params.conversationId)
        .order("sequence_number", { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextSeq = (latestMsg?.sequence_number || 0) + 1;

      const { data: inserted, error } = await supabase
        .from("marketing_messages")
        .insert({
          tenant_id: params.tenantId,
          conversation_id: params.conversationId,
          role: params.role,
          content: params.content,
          content_type: params.contentType || "TEXT",
          status: params.status || "COMPLETED",
          sequence_number: nextSeq,
          model_run_id: params.modelRunId || null,
          metadata: params.metadata || {},
        })
        .select("*")
        .single();

      if (!error && inserted) {
        msg = inserted;
        lastError = null;
        break;
      }

      lastError = error;
      if (attempt === 0 && (error?.code === "23505" || /duplicate key/i.test(error?.message || ""))) {
        continue;
      }
      break;
    }

    if (lastError || !msg) {
      logger.error("Failed to insert marketing message", {
        tenantId: params.tenantId,
        conversationId: params.conversationId,
        error: lastError?.message,
      });
      throw new Error(`Failed to insert message: ${lastError?.message || "Unknown error"}`);
    }

    // Touch last_message_at on the conversation
    await supabase
      .from("marketing_conversations")
      .update({
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("tenant_id", params.tenantId)
      .eq("id", params.conversationId);

    return msg as MessageRecord;
  }

  /**
   * Updates an existing message (e.g. streaming to completed, appending content).
   */
  public async updateMessage(params: {
    tenantId: string;
    messageId: string;
    content?: string;
    status?: "PENDING" | "STREAMING" | "COMPLETED" | "FAILED";
    metadata?: Record<string, unknown>;
  }): Promise<MessageRecord> {
    const supabase = createAdminSupabaseClient();
    const updatePayload: Record<string, unknown> = {};

    if (typeof params.content === "string") updatePayload.content = params.content;
    if (params.status) updatePayload.status = params.status;
    if (params.metadata) updatePayload.metadata = params.metadata;

    const { data: updated, error } = await supabase
      .from("marketing_messages")
      .update(updatePayload)
      .eq("tenant_id", params.tenantId)
      .eq("id", params.messageId)
      .select("*")
      .single();

    if (error || !updated) {
      logger.error("Failed to update message", {
        tenantId: params.tenantId,
        messageId: params.messageId,
        error: error?.message,
      });
      throw new Error(`Failed to update message: ${error?.message || "Not found"}`);
    }

    return updated as MessageRecord;
  }

  /**
   * Persists helpful/not-helpful feedback onto an assistant message's metadata.
   */
  public async setMessageFeedback(params: {
    tenantId: string;
    conversationId: string;
    messageId: string;
    userId: string;
    rating: "up" | "down" | null;
  }): Promise<MessageRecord> {
    const supabase = createAdminSupabaseClient();
    const { data: existing, error: fetchError } = await supabase
      .from("marketing_messages")
      .select("*")
      .eq("tenant_id", params.tenantId)
      .eq("conversation_id", params.conversationId)
      .eq("id", params.messageId)
      .maybeSingle();

    if (fetchError || !existing) {
      logger.warn("Message not found for feedback update", {
        tenantId: params.tenantId,
        conversationId: params.conversationId,
        messageId: params.messageId,
        error: fetchError?.message,
      });
      throw new Error("Message not found");
    }

    const currentMeta = ((existing as MessageRecord).metadata || {}) as Record<string, unknown>;
    const nextMeta: Record<string, unknown> = { ...currentMeta };

    if (params.rating === null) {
      delete nextMeta.feedback;
      delete nextMeta.feedback_by;
      delete nextMeta.feedback_at;
    } else {
      nextMeta.feedback = params.rating;
      nextMeta.feedback_by = params.userId;
      nextMeta.feedback_at = new Date().toISOString();
    }

    return this.updateMessage({
      tenantId: params.tenantId,
      messageId: params.messageId,
      metadata: nextMeta,
    });
  }
}

export const conversationService = new ConversationService();
