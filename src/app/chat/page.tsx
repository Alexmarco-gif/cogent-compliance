"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { ConversationSidebar } from "@/components/chat/ConversationSidebar";
import { AdaptiveMessageRenderer } from "@/components/chat/AdaptiveMessageRenderer";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { ToolActivityPill, type ToolActivityProps } from "@/components/chat/ToolActivityPill";
import { EvidenceDrawer } from "@/components/chat/EvidenceDrawer";
import type { ConversationRecord, MessageRecord } from "@/modules/conversations/conversation.service";
import type { CitationItem, SSEEvent } from "@/contracts/conversation.contracts";
import { ShieldCheck, Sparkles } from "lucide-react";

interface DisplayMessage {
  id: string;
  role: "USER" | "ASSISTANT" | "SYSTEM" | "TOOL";
  content: string;
  citations?: CitationItem[];
  isStreaming?: boolean;
}

export default function ChatPage() {
  const [conversations, setConversations] = useState<ConversationRecord[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeTool, setActiveTool] = useState<ToolActivityProps | null>(null);
  const [inspectClauseId, setInspectClauseId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeTool]);

  // Load conversations on initial mount
  const loadConversations = useCallback(async () => {
    setLoadingConversations(true);
    try {
      const res = await fetch("/api/marketing-shield/v1/conversations?status=ACTIVE");
      const json = await res.json();
      if (json.success && json.data) {
        setConversations(json.data.conversations || []);
        if (json.data.conversations?.length > 0 && !activeConvId) {
          setActiveConvId(json.data.conversations[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load conversations", err);
    } finally {
      setLoadingConversations(false);
    }
  }, [activeConvId]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Load messages whenever activeConvId changes
  useEffect(() => {
    if (!activeConvId) {
      setMessages([]);
      return;
    }

    let isMounted = true;
    setLoadingMessages(true);

    fetch(`/api/marketing-shield/v1/conversations/${activeConvId}/messages`)
      .then((res) => res.json())
      .then((json) => {
        if (isMounted && json.success && json.data) {
          const loaded: DisplayMessage[] = (json.data.messages || []).map((m: MessageRecord) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            citations: (m.metadata?.citations as CitationItem[]) || [],
            isStreaming: false,
          }));
          setMessages(loaded);
        }
      })
      .catch((err) => console.error("Failed to load messages", err))
      .finally(() => {
        if (isMounted) setLoadingMessages(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeConvId]);

  // Handle New Conversation creation
  const handleNewConversation = async () => {
    try {
      const res = await fetch("/api/marketing-shield/v1/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New Compliance Consultation" }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setConversations((prev) => [json.data, ...prev]);
        setActiveConvId(json.data.id);
        setMessages([]);
      }
    } catch (err) {
      console.error("Failed to create conversation", err);
    }
  };

  // Handle Rename Conversation
  const handleRename = async (id: string, newTitle: string) => {
    try {
      const res = await fetch(`/api/marketing-shield/v1/conversations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });
      const json = await res.json();
      if (json.success) {
        setConversations((prev) =>
          prev.map((c) => (c.id === id ? { ...c, title: newTitle } : c))
        );
      }
    } catch (err) {
      console.error("Failed to rename conversation", err);
    }
  };

  // Handle Archive Conversation
  const handleArchive = async (id: string) => {
    try {
      const res = await fetch(`/api/marketing-shield/v1/conversations/${id}/archive`, {
        method: "POST",
      });
      const json = await res.json();
      if (json.success) {
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (activeConvId === id) {
          const remaining = conversations.filter((c) => c.id !== id);
          setActiveConvId(remaining[0]?.id || null);
        }
      }
    } catch (err) {
      console.error("Failed to archive conversation", err);
    }
  };

  // Send Message & Stream Assistant SSE Response
  const handleSendMessage = async (text: string) => {
    let currentConvId = activeConvId;

    // If no active conversation exists, create one first
    if (!currentConvId) {
      try {
        const createRes = await fetch("/api/marketing-shield/v1/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: text.slice(0, 40) + "..." }),
        });
        const createJson = await createRes.json();
        if (createJson.success && createJson.data) {
          currentConvId = createJson.data.id;
          setConversations((prev) => [createJson.data, ...prev]);
          setActiveConvId(currentConvId);
        } else {
          return;
        }
      } catch (err) {
        console.error("Failed to create conversation for message", err);
        return;
      }
    }

    // Append User Message to UI immediately
    const tempUserMsgId = `temp_user_${Date.now()}`;
    const tempAsstMsgId = `temp_asst_${Date.now()}`;

    setMessages((prev) => [
      ...prev,
      { id: tempUserMsgId, role: "USER", content: text },
      { id: tempAsstMsgId, role: "ASSISTANT", content: "", isStreaming: true, citations: [] },
    ]);

    setIsStreaming(true);
    setActiveTool(null);

    try {
      const response = await fetch(
        `/api/marketing-shield/v1/conversations/${currentConvId}/messages/stream`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
            "Idempotency-Key": crypto.randomUUID(),
          },
          body: JSON.stringify({ content: text }),
        }
      );

      if (!response.ok || !response.body) {
        throw new Error(`SSE stream failed with status ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const block of lines) {
          if (!block.trim()) continue;

          const dataLine = block.split("\n").find((l) => l.startsWith("data: "));
          if (!dataLine) continue;

          try {
            const event: SSEEvent = JSON.parse(dataLine.replace(/^data:\s*/, ""));

            if (event.type === "tool.started") {
              setActiveTool({
                toolName: event.data.tool_name,
                displayLabel: event.data.display_label,
                status: "RUNNING",
              });
            } else if (event.type === "tool.completed") {
              setActiveTool((prev) =>
                prev ? { ...prev, status: "COMPLETED", summary: event.data.summary } : null
              );
            } else if (event.type === "assistant.delta") {
              setActiveTool(null);
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === tempAsstMsgId
                    ? { ...m, content: m.content + event.data.text_delta }
                    : m
                )
              );
            } else if (event.type === "message.completed") {
              setIsStreaming(false);
              setActiveTool(null);
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === tempAsstMsgId
                    ? {
                        ...m,
                        id: event.data.assistant_message_id || m.id,
                        isStreaming: false,
                        citations: event.data.citations,
                      }
                    : m
                )
              );
            } else if (event.type === "message.failed") {
              setIsStreaming(false);
              setActiveTool(null);
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === tempAsstMsgId
                    ? {
                        ...m,
                        content: m.content + `\n\n[System Alert: ${event.data.message}]`,
                        isStreaming: false,
                      }
                    : m
                )
              );
            }
          } catch (pErr) {
            console.warn("Failed to parse SSE line", pErr);
          }
        }
      }
    } catch (streamErr) {
      console.error("Streaming error", streamErr);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempAsstMsgId
            ? {
                ...m,
                content:
                  m.content ||
                  "An error occurred while streaming the regulatory response. Please verify network connectivity.",
                isStreaming: false,
              }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
      setActiveTool(null);
    }
  };

  const activeConversation = conversations.find((c) => c.id === activeConvId);

  return (
    <div className="flex h-screen bg-canvas overflow-hidden">
      {/* 1. Deep Slate Sidebar */}
      <ConversationSidebar
        conversations={conversations}
        activeId={activeConvId}
        onSelect={(id) => setActiveConvId(id)}
        onNew={handleNewConversation}
        onRename={handleRename}
        onArchive={handleArchive}
        loading={loadingConversations}
      />

      {/* 2. Main Conversational Canvas */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Navbar */}
        <header className="h-14 border-b border-slate-200 bg-surface px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3 truncate">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-50 border border-blue-200 text-blue-700">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <div className="truncate">
              <h2 className="text-xs font-semibold text-slate-900 truncate">
                {activeConversation?.title || "Conversational Compliance Copilot"}
              </h2>
              <p className="text-[10px] text-slate-400">
                Grounding: Golden 50 Vault (CBN, FCCPC, ARCON, NDPC, SEC)
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Statutory Vault Live</span>
            </span>
          </div>
        </header>

        {/* Message Scroll Area */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
          {loadingMessages && (
            <div className="py-20 text-center text-xs text-slate-400">
              Loading consultation history...
            </div>
          )}

          {!loadingMessages && messages.length === 0 && (
            <div className="py-16 text-center max-w-lg mx-auto space-y-3">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 border border-blue-200">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Sovereign Regulatory Copilot
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Consult Nigerian banking, consumer protection, advertising vetting, and data privacy
                rules. Every statutory answer is grounded in official regulatory instruments with
                verbatim citations.
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <AdaptiveMessageRenderer
              key={msg.id}
              role={msg.role}
              content={msg.content}
              citations={msg.citations}
              isStreaming={msg.isStreaming}
              onInspectEvidence={(clauseId) => setInspectClauseId(clauseId)}
            />
          ))}

          {/* Real-time Tool Activity Indicator */}
          {activeTool && (
            <div className="my-2">
              <ToolActivityPill
                toolName={activeTool.toolName}
                displayLabel={activeTool.displayLabel}
                status={activeTool.status}
                summary={activeTool.summary}
              />
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Composer */}
        <footer className="p-4 bg-surface border-t border-slate-200/80">
          <ChatComposer
            onSendMessage={handleSendMessage}
            disabled={isStreaming}
            showStarterPrompts={messages.length === 0}
          />
        </footer>
      </main>

      {/* 3. Slide-over Evidence Drawer */}
      <EvidenceDrawer
        clauseId={inspectClauseId}
        isOpen={Boolean(inspectClauseId)}
        onClose={() => setInspectClauseId(null)}
      />
    </div>
  );
}
