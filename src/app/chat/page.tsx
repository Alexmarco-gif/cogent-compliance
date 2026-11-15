"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, OrganizationSwitcher } from "@clerk/nextjs";
import { ConversationSidebar } from "@/components/chat/ConversationSidebar";
import { AdaptiveMessageRenderer } from "@/components/chat/AdaptiveMessageRenderer";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { ToolActivityPill, type ToolActivityProps } from "@/components/chat/ToolActivityPill";
import { EvidenceDrawer } from "@/components/chat/EvidenceDrawer";
import { ContextualCampaignInspector } from "@/components/campaign/ContextualCampaignInspector";
import type { Finding } from "@/components/campaign/FindingCard";
import type { LockResult } from "@/components/campaign/Tab1LocksOverview";
import type { ExtractionData } from "@/components/campaign/Tab2AssetBoundingBoxes";
import type { ConversationRecord, MessageRecord } from "@/modules/conversations/conversation.service";
import type { CitationItem, SSEEvent } from "@/contracts/conversation.contracts";
import { extractApiError, extractSseDataFromBlock } from "@/lib/api-client";
import { ShieldCheck, Sparkles, PanelRight, AlertTriangle, LogIn, X } from "lucide-react";

interface DisplayMessage {
  id: string;
  role: "USER" | "ASSISTANT" | "SYSTEM" | "TOOL";
  content: string;
  citations?: CitationItem[];
  isStreaming?: boolean;
}

interface ActiveCampaignState {
  id: string;
  campaign_name: string;
  channel: string;
  status: string;
  risk_level: string;
  [key: string]: unknown;
}

interface ActiveAssessmentState {
  id: string;
  overall_risk_level: string;
  summary?: string;
  lockResults?: LockResult;
  created_at?: string;
  [key: string]: unknown;
}

interface ActiveAssetState {
  id: string;
  original_filename: string;
  mime_type: string;
  storage_key?: string;
  [key: string]: unknown;
}

export default function ChatPage() {
  const router = useRouter();
  const { isLoaded: clerkLoaded, isSignedIn, orgId } = useAuth();
  const [onboardingReady, setOnboardingReady] = useState(false);
  const [conversations, setConversations] = useState<ConversationRecord[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeTool, setActiveTool] = useState<ToolActivityProps | null>(null);
  const [inspectClauseId, setInspectClauseId] = useState<string | null>(null);
  const [authIssue, setAuthIssue] = useState<"UNAUTHENTICATED" | "NO_ORG" | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);

  // Phase 7 Campaign & Inspector State
  const [activeCampaign, setActiveCampaign] = useState<ActiveCampaignState | null>(null);
  const [activeAssessment, setActiveAssessment] = useState<ActiveAssessmentState | null>(null);
  const [campaignFindings, setCampaignFindings] = useState<Finding[]>([]);
  const [campaignAsset, setCampaignAsset] = useState<ActiveAssetState | null>(null);
  const [assetExtraction, setAssetExtraction] = useState<ExtractionData | null>(null);
  const [showInspector, setShowInspector] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeConvIdRef = useRef<string | null>(null);
  activeConvIdRef.current = activeConvId;
  const conversationsRef = useRef<ConversationRecord[]>([]);
  conversationsRef.current = conversations;
  const skipNextLoadForConvRef = useRef<string | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeTool]);

  const applyApiFailure = useCallback((status: number, body: unknown, fallback: string) => {
    const parsed = extractApiError(status, body, fallback);
    if (status === 401 || parsed.code === "UNAUTHENTICATED") {
      setAuthIssue("UNAUTHENTICATED");
      setChatError("Your session is signed out. Sign in to start or resume a compliance consultation.");
    } else if (status === 403 && parsed.code === "TENANT_CONTEXT_INVALID") {
      setAuthIssue("NO_ORG");
      setChatError(parsed.message);
    } else {
      setAuthIssue(null);
      setChatError(parsed.message);
    }
    return parsed;
  }, []);

  // Load conversations on mount and whenever active Clerk auth/org changes
  const loadConversations = useCallback(async () => {
    setLoadingConversations(true);
    try {
      const res = await fetch("/api/marketing-shield/v1/conversations?status=ACTIVE");
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        applyApiFailure(res.status, json, "Failed to load compliance consultations.");
        return;
      }
      setAuthIssue(null);
      setChatError(null);
      const list: ConversationRecord[] = json.data?.conversations || [];
      setConversations(list);
      const firstConv = list[0];
      if (firstConv && !activeConvIdRef.current) {
        setActiveConvId(firstConv.id);
      }
    } catch (err) {
      console.error("Failed to load conversations", err);
      setChatError("Unable to reach the compliance gateway. Please check your connection and retry.");
    } finally {
      setLoadingConversations(false);
    }
  }, [applyApiFailure]);

  // Gate /chat behind sign-in, active organization, and completed onboarding
  useEffect(() => {
    if (!clerkLoaded) return;

    if (!isSignedIn) {
      setOnboardingReady(false);
      router.replace("/sign-in?redirect_url=/chat");
      return;
    }

    if (!orgId) {
      setOnboardingReady(false);
      router.replace("/onboarding");
      return;
    }

    let cancelled = false;
    fetch("/api/marketing-shield/v1/onboarding/status")
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 401) {
          router.replace("/sign-in?redirect_url=/chat");
          return;
        }
        if (res.status === 403) {
          router.replace("/onboarding");
          return;
        }
        const status = await res.json().catch(() => null);
        if (cancelled) return;
        if (status && status.onboardingCompleted === false) {
          router.replace("/onboarding");
          return;
        }
        setOnboardingReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setOnboardingReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [clerkLoaded, isSignedIn, orgId, router]);

  useEffect(() => {
    if (!clerkLoaded || !isSignedIn || !orgId || !onboardingReady) return;
    loadConversations();
  }, [clerkLoaded, isSignedIn, orgId, onboardingReady, loadConversations]);

  // Load campaign and assessment details when active campaign exists
  const loadCampaignData = useCallback(async (campaignId: string) => {
    try {
      const campRes = await fetch(`/api/marketing-shield/v1/campaigns/${campaignId}`);
      const campJson = await campRes.json();
      if (campJson.success && campJson.data) {
        const camp = campJson.data;
        setActiveCampaign(camp);

        if (camp.assets?.length > 0) {
          const firstAsset = camp.assets[0];
          setCampaignAsset(firstAsset);

          // Load asset extraction
          const extRes = await fetch(`/api/marketing-shield/v1/assets/${firstAsset.id}/extraction`);
          const extJson = await extRes.json();
          if (extJson.success && extJson.data) {
            setAssetExtraction(extJson.data);
          }
        }

        if (camp.latest_assessment) {
          setActiveAssessment(camp.latest_assessment);
        }

        // Load findings
        const findRes = await fetch(`/api/marketing-shield/v1/campaigns/${campaignId}/findings`);
        const findJson = await findRes.json();
        if (findJson.success && findJson.data) {
          setCampaignFindings(findJson.data || []);
        }

        setShowInspector(true);
      }
    } catch (err) {
      console.error("Failed to load campaign data", err);
    }
  }, []);

  // Load messages whenever activeConvId changes (unless freshly auto-created mid-send)
  useEffect(() => {
    if (!activeConvId) {
      setMessages([]);
      return;
    }

    if (skipNextLoadForConvRef.current === activeConvId) {
      skipNextLoadForConvRef.current = null;
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

    // Check if active conversation has linked campaign
    const conv = conversationsRef.current.find((c) => c.id === activeConvId);
    if (conv?.active_campaign_id) {
      loadCampaignData(conv.active_campaign_id);
    }

    return () => {
      isMounted = false;
    };
  }, [activeConvId, loadCampaignData]);

  // Handle New Conversation creation
  const handleNewConversation = async () => {
    try {
      const res = await fetch("/api/marketing-shield/v1/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New Compliance Consultation" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success || !json.data) {
        applyApiFailure(res.status, json, "Failed to start a new compliance consultation.");
        return;
      }
      setAuthIssue(null);
      setChatError(null);
      setConversations((prev) => [json.data, ...prev]);
      setActiveConvId(json.data.id);
      setMessages([]);
      setActiveCampaign(null);
      setShowInspector(false);
    } catch (err) {
      console.error("Failed to create conversation", err);
      setChatError("Network error while creating a new consultation.");
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
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        applyApiFailure(res.status, json, "Failed to rename consultation.");
        return;
      }
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title: newTitle } : c))
      );
    } catch (err) {
      console.error("Failed to rename conversation", err);
      setChatError("Network error while renaming consultation.");
    }
  };

  // Handle Archive Conversation
  const handleArchive = async (id: string) => {
    try {
      const res = await fetch(`/api/marketing-shield/v1/conversations/${id}/archive`, {
        method: "POST",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        applyApiFailure(res.status, json, "Failed to archive consultation.");
        return;
      }
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConvId === id) {
        const remaining = conversations.filter((c) => c.id !== id);
        setActiveConvId(remaining[0]?.id || null);
      }
    } catch (err) {
      console.error("Failed to archive conversation", err);
      setChatError("Network error while archiving consultation.");
    }
  };

  // Handle Asset Upload completion from ChatComposer
  const handleAssetUploaded = async (assetId: string, filename: string) => {
    let currentConvId = activeConvId;

    if (!currentConvId) {
      const convRes = await fetch("/api/marketing-shield/v1/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: `Audit: ${filename}` }),
      });
      const convJson = await convRes.json().catch(() => ({}));
      if (!convRes.ok || !convJson.success || !convJson.data) {
        applyApiFailure(convRes.status, convJson, "Failed to initialize consultation for uploaded asset.");
        return;
      }
      currentConvId = convJson.data.id;
      setActiveConvId(currentConvId);
      setConversations((prev) => [convJson.data, ...prev]);
    }

    // Auto-create marketing campaign linked to asset
    try {
      const campRes = await fetch("/api/marketing-shield/v1/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: currentConvId,
          campaign_name: filename.replace(/\.[^/.]+$/, ""),
          channel: "SOCIAL_MEDIA",
          initial_content_text: `Campaign asset ${filename} uploaded for compliance audit.`,
        }),
      });

      const campJson = await campRes.json().catch(() => ({}));
      if (!campRes.ok || !campJson.success || !campJson.data) {
        applyApiFailure(campRes.status, campJson, "Failed to initialize campaign for uploaded asset.");
        return;
      }
      const campaign = campJson.data;
      await loadCampaignData(campaign.id);
    } catch (err) {
      console.error("Failed to initialize campaign for uploaded asset", err);
      setChatError("Network error initializing campaign for uploaded asset.");
    }
  };

  // Send Message & Stream Assistant SSE Response
  const handleSendMessage = async (text: string): Promise<boolean> => {
    setChatError(null);
    let currentConvId = activeConvId;

    if (!currentConvId) {
      try {
        const createRes = await fetch("/api/marketing-shield/v1/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: text.slice(0, 48) + "..." }),
        });
        const createJson = await createRes.json().catch(() => ({}));
        if (!createRes.ok || !createJson.success || !createJson.data) {
          applyApiFailure(createRes.status, createJson, "Unable to create compliance consultation.");
          return false;
        }
        currentConvId = createJson.data.id;
        skipNextLoadForConvRef.current = currentConvId;
        setAuthIssue(null);
        setActiveConvId(currentConvId);
        setConversations((prev) => [createJson.data, ...prev]);
      } catch (err) {
        console.error("Failed to create initial conversation", err);
        setChatError("Unable to reach the compliance gateway. Please check your connection and try again.");
        return false;
      }
    }

    if (!currentConvId) {
      setChatError("Unable to initialize consultation session. Please try again.");
      return false;
    }

    // Append user message immediately
    const tempUserMsgId = `user_${Date.now()}`;
    const userMsg: DisplayMessage = {
      id: tempUserMsgId,
      role: "USER",
      content: text,
      isStreaming: false,
    };

    // Prepare assistant streaming message slot
    const tempAssistantMsgId = `assistant_${Date.now()}`;
    const assistantMsg: DisplayMessage = {
      id: tempAssistantMsgId,
      role: "ASSISTANT",
      content: "",
      citations: [],
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsStreaming(true);
    setActiveTool(null);

    try {
      const response = await fetch(
        `/api/marketing-shield/v1/conversations/${currentConvId}/messages/stream`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: text }),
        }
      );

      if (!response.ok || !response.body) {
        const errBody = await response.json().catch(() => ({}));
        const parsed = applyApiFailure(
          response.status,
          errBody,
          `HTTP ${response.status}: Failed to connect to streaming endpoint`
        );
        throw new Error(parsed.message);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const processSseBlock = (block: string) => {
        const jsonStr = extractSseDataFromBlock(block);
        if (!jsonStr) return;

        try {
          const event: SSEEvent = JSON.parse(jsonStr);

          if (event.type === "assistant.delta") {
            const delta = event.data.text_delta;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === tempAssistantMsgId
                  ? { ...m, content: m.content + delta }
                  : m
              )
            );
          } else if (event.type === "tool.started") {
            setActiveTool({
              toolName: event.data.tool_name,
              displayLabel: event.data.display_label,
              status: "RUNNING",
            });
          } else if (event.type === "tool.completed") {
            setActiveTool({
              toolName: event.data.tool_name,
              displayLabel: event.data.tool_name,
              status: event.data.status,
              summary: event.data.summary,
            });
          } else if (event.type === "message.completed") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === tempAssistantMsgId
                  ? {
                      ...m,
                      id: event.data.assistant_message_id || m.id,
                      citations: event.data.citations || m.citations,
                      isStreaming: false,
                    }
                  : m
              )
            );
          } else if (event.type === "message.failed") {
            const failMsg = event.data.message || "Regulatory analysis failed.";
            setChatError(failMsg);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === tempAssistantMsgId
                  ? {
                      ...m,
                      content: m.content
                        ? `${m.content}\n\n*Regulatory analysis failed: ${failMsg}*`
                        : `*Regulatory analysis failed: ${failMsg}*`,
                      isStreaming: false,
                    }
                  : m
              )
            );
          }
        } catch (parseErr) {
          console.warn("Failed to parse SSE block", parseErr);
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split(/\r?\n\r?\n/);
        buffer = blocks.pop() || "";

        for (const block of blocks) {
          processSseBlock(block);
        }
      }

      if (buffer.trim()) {
        processSseBlock(buffer);
      }

      // Ensure message never remains stuck in streaming state if stream ended without terminal event
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempAssistantMsgId && m.isStreaming ? { ...m, isStreaming: false } : m
        )
      );
      return true;
    } catch (err) {
      console.error("Streaming error", err);
      const errMsg = err instanceof Error ? err.message : "Streaming communication interrupted.";
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempAssistantMsgId
            ? {
                ...m,
                content:
                  m.content +
                  `\n\n*Regulatory analysis interrupted: ${errMsg}*`,
                isStreaming: false,
              }
            : m
        )
      );
      return true;
    } finally {
      setIsStreaming(false);
      setActiveTool(null);
    }
  };

  const activeConversation = conversations.find((c) => c.id === activeConvId);

  if (!clerkLoaded || !isSignedIn || !orgId || !onboardingReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas text-xs font-medium text-slate-500">
        Verifying institutional session and onboarding status...
      </div>
    );
  }

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
      <main className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
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

          <div className="flex items-center space-x-3">
            {activeCampaign && (
              <button
                onClick={() => setShowInspector(!showInspector)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[12px] font-semibold border transition-all ${
                  showInspector
                    ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                    : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50"
                }`}
              >
                <PanelRight className="h-3.5 w-3.5" />
                Campaign Inspector
                {campaignFindings.length > 0 && (
                  <span className="ml-1 rounded-full bg-red-100 text-red-800 px-1.5 py-0.2 text-[10px] font-bold">
                    {campaignFindings.length}
                  </span>
                )}
              </button>
            )}

            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Statutory Vault Live</span>
            </span>
          </div>
        </header>

        {/* Actionable Auth / API Error Banner */}
        {(authIssue || chatError) && (
          <div className="mx-6 mt-4 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-xs text-amber-950 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0 shadow-2xs">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">
                  {authIssue === "UNAUTHENTICATED"
                    ? "Authentication Required"
                    : authIssue === "NO_ORG"
                      ? "Institutional Organization Required"
                      : "Consultation Error"}
                </p>
                <p className="text-amber-800 mt-0.5">{chatError}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {authIssue === "UNAUTHENTICATED" && (
                <Link
                  href="/sign-in"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-primary hover:bg-brand-hover text-white font-semibold text-xs transition-colors"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  <span>Sign In →</span>
                </Link>
              )}

              {authIssue === "NO_ORG" && (
                <OrganizationSwitcher
                  hidePersonal
                  afterSelectOrganizationUrl="/chat"
                  afterCreateOrganizationUrl="/chat"
                />
              )}

              <button
                type="button"
                onClick={() => {
                  setChatError(null);
                  setAuthIssue(null);
                }}
                className="p-1 rounded-md text-amber-700 hover:bg-amber-100 transition-colors"
                aria-label="Dismiss error banner"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

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
                Sovereign Regulatory Copilot & Intake
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Consult Nigerian banking, consumer protection, advertising vetting, and data privacy
                rules, or drop a promotional flyer/banner for multimodal OCR and 7-layer guardrail
                compliance assessment.
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

        {/* Bottom Composer with Asset Attachment */}
        <footer className="p-4 bg-surface border-t border-slate-200/80">
          <ChatComposer
            onSendMessage={handleSendMessage}
            onAssetUploaded={handleAssetUploaded}
            conversationId={activeConvId || undefined}
            disabled={isStreaming}
            showStarterPrompts={messages.length === 0}
          />
        </footer>
      </main>

      {/* 3. Contextual Campaign Inspector (Tabs 1-3) */}
      {showInspector && activeCampaign && (
        <ContextualCampaignInspector
          campaign={activeCampaign}
          assessment={activeAssessment}
          findings={campaignFindings}
          asset={campaignAsset}
          extraction={assetExtraction}
          isOpen={showInspector}
          onClose={() => setShowInspector(false)}
          onEvidenceClick={(clauseId) => setInspectClauseId(clauseId)}
          onRefresh={() => loadCampaignData(activeCampaign.id)}
        />
      )}

      {/* 4. Slide-over Evidence Drawer */}
      <EvidenceDrawer
        clauseId={inspectClauseId}
        isOpen={Boolean(inspectClauseId)}
        onClose={() => setInspectClauseId(null)}
      />
    </div>
  );
}
