/**
 * Cogent Marketing Shield - Conversation Service
 * Document Reference: Document 03 (Section 2), Document 04 (Section 3), Document 07
 */

import { createAdminSupabaseClient } from "@/lib/supabase";
import { logger } from "@/lib/logger";

export interface ConversationRecord {
  id: string;
  tenant_id: string;
  created_by: string;
  title: string;
  status: "ACTIVE" | "ARCHIVED" | "CLOSED";
  context_type: "GENERAL" | "REGULATORY" | "CAMPAIGN";
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

export class ConversationService {
  /**
   * Creates a new conversation scoped strictly by tenant.
   */
  public async createConversation(
    tenantId: string,
    createdBy: string,
    data: {
      title?: string;
      context_type?: "GENERAL" | "REGULATORY" | "CAMPAIGN";
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
   */
  public async listConversations(
    tenantId: string,
    options?: {
      status?: "ACTIVE" | "ARCHIVED" | "CLOSED";
      limit?: number;
      cursor?: string;
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
    options?: { limit?: number; cursor?: string }
  ): Promise<{ messages: MessageRecord[]; nextCursor?: string }> {
    const supabase = createAdminSupabaseClient();
    const limit = options?.limit || 50;

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

    const { data: msg, error } = await supabase
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

    if (error || !msg) {
      logger.error("Failed to insert marketing message", {
        tenantId: params.tenantId,
        conversationId: params.conversationId,
        error: error?.message,
      });
      throw new Error(`Failed to insert message: ${error?.message || "Unknown error"}`);
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
}

export const conversationService = new ConversationService();
