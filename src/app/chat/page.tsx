"use client";

import React, { useEffect, useState, useRef, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth, OrganizationSwitcher } from "@clerk/nextjs";
import { WorkspaceSidebar } from "@/components/shell/WorkspaceSidebar";
import { WorkspaceHeader } from "@/components/shell/WorkspaceHeader";
import {
  AdaptiveMessageRenderer,
  type MessageAttachmentChip,
} from "@/components/chat/AdaptiveMessageRenderer";
import {
  ChatComposer,
  type PendingAttachment,
  type ProductOption,
} from "@/components/chat/ChatComposer";
import { ToolActivityPill, type ToolActivityProps } from "@/components/chat/ToolActivityPill";
import { EvidenceDrawer } from "@/components/chat/EvidenceDrawer";
import { ArtifactCanvasDrawer } from "@/components/chat/ArtifactCanvasDrawer";
import { ContextualCampaignInspector } from "@/components/campaign/ContextualCampaignInspector";
import type { Finding } from "@/components/campaign/FindingCard";
import type { LockResult } from "@/components/campaign/Tab1LocksOverview";
import type { ExtractionData } from "@/components/campaign/Tab2AssetBoundingBoxes";
import type { ConversationRecord, MessageRecord } from "@/modules/conversations/conversation.service";
import { deriveConversationTopicTitle } from "@/modules/conversations/topic-title";
import type {
  CitationItem,
  ComplianceArtifactType,
  ExecutionPlanStep,
  SSEEvent,
  StructuredComplianceReport,
} from "@/contracts/conversation.contracts";
import { extractApiError, extractSseDataFromBlock, unwrapApiList } from "@/lib/api-client";
import { PanelRight, AlertTriangle, LogIn, X, Plus, Sparkles } from "lucide-react";

interface DisplayMessage {
  id: string;
  role: "USER" | "ASSISTANT" | "SYSTEM" | "TOOL";
  content: string;
  citations?: CitationItem[];
  planSteps?: ExecutionPlanStep[];
  structuredReport?: StructuredComplianceReport;
  attachments?: MessageAttachmentChip[];
  isStreaming?: boolean;
}

interface ActiveCampaignState {
  id: string;
  campaign_name: string;
  channel: string;
  status: string;
  risk_level: string;
  current_revision_id?: string;
  approved_revision_id?: string | null;
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

/** Max silence on the SSE stream before the client gives up (server heartbeats every 10s). */
const STREAM_IDLE_TIMEOUT_MS = 60_000;

/**
 * Stored assistant rows can be FAILED or left STREAMING (e.g. the function was killed mid-turn).
 * Render a visible notice instead of an empty bubble so the user knows to resend.
 */
function describeStoredMessageContent(m: MessageRecord): string {
  if (m.role !== "ASSISTANT") return m.content;
  const status = m.status;
  const meta = (m.metadata || {}) as Record<string, unknown>;
  if (status === "FAILED") {
    const reason = typeof meta.error === "string" ? meta.error : "The reply could not be completed.";
    return m.content
      ? `${m.content}\n\n*Compliance review interrupted: ${reason}*`
      : `*Compliance review interrupted: ${reason} Please resend your message.*`;
  }
  if (status === "STREAMING" && !m.content) {
    return "*This reply is still being generated or was interrupted. Refresh in a moment, or resend your message.*";
  }
  return m.content;
}

function ChatWorkspaceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedConvId = searchParams.get("conversationId");
  const isExplicitNewAudit = searchParams.get("new") === "1";

  const { isLoaded: clerkLoaded, isSignedIn, orgId, userId } = useAuth();
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

  // Referenced Product Schedule State
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  // Layout State
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Campaign & Studio State
  const [activeCampaign, setActiveCampaign] = useState<ActiveCampaignState | null>(null);
  const [activeAssessment, setActiveAssessment] = useState<ActiveAssessmentState | null>(null);
  const [campaignFindings, setCampaignFindings] = useState<Finding[]>([]);
  const [campaignAsset, setCampaignAsset] = useState<ActiveAssetState | null>(null);
  const [assetExtraction, setAssetExtraction] = useState<ExtractionData | null>(null);
  const [showInspector, setShowInspector] = useState(false);

  // External Slide-Over Artifact Canvas Drawer State
  const [canvasReport, setCanvasReport] = useState<StructuredComplianceReport | null>(null);
  const [canvasActiveTab, setCanvasActiveTab] =
    useState<ComplianceArtifactType>("compliant_ad_rewrite");
  const [showArtifactCanvas, setShowArtifactCanvas] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeConvIdRef = useRef<string | null>(null);
  activeConvIdRef.current = activeConvId;
  const conversationsRef = useRef<ConversationRecord[]>([]);
  conversationsRef.current = conversations;
  const skipNextLoadForConvRef = useRef<string | null>(null);
  const explicitNewRef = useRef<boolean>(isExplicitNewAudit);
  const requestedConvIdRef = useRef<string | null>(requestedConvId);
  requestedConvIdRef.current = requestedConvId;
  const activeScopeKeyRef = useRef<string | null>(null);

  useEffect(() => {
    try {
      if (window.localStorage.getItem("cogent:sidebar-collapsed") === "true") {
        setSidebarCollapsed(true);
      }
    } catch {
      // Ignore storage access failures
    }
  }, []);

  const handleToggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem("cogent:sidebar-collapsed", String(next));
      } catch {
        // Ignore storage access failures
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const nextScope = userId && orgId ? `${userId}::${orgId}` : null;
    if (activeScopeKeyRef.current && activeScopeKeyRef.current !== nextScope) {
      activeConvIdRef.current = null;
      explicitNewRef.current = false;
      setActiveConvId(null);
      setConversations([]);
      setMessages([]);
      setProducts([]);
      setSelectedProductId(null);
      setActiveCampaign(null);
      setActiveAssessment(null);
      setCampaignFindings([]);
      setCampaignAsset(null);
      setAssetExtraction(null);
      setShowInspector(false);
      setCanvasReport(null);
      setShowArtifactCanvas(false);
      setInspectClauseId(null);
      setChatError(null);
      setAuthIssue(null);
    }
    activeScopeKeyRef.current = nextScope;
  }, [userId, orgId]);

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
      setChatError("Your session is signed out. Sign in to start or resume a compliance review.");
    } else if (status === 403 && parsed.code === "TENANT_CONTEXT_INVALID") {
      setAuthIssue("NO_ORG");
      setChatError(parsed.message);
    } else {
      setAuthIssue(null);
      setChatError(parsed.message);
    }
    return parsed;
  }, []);

  const loadConversations = useCallback(async () => {
    setLoadingConversations(true);
    try {
      const res = await fetch("/api/marketing-shield/v1/conversations?status=ACTIVE");
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        applyApiFailure(res.status, json, "Failed to load compliance threads.");
        return;
      }
      setAuthIssue(null);
      setChatError(null);
      const list: ConversationRecord[] = json.data?.conversations || [];
      setConversations(list);

      if (explicitNewRef.current) {
        setActiveConvId(null);
        return;
      }

      const targetFromUrl = requestedConvIdRef.current;
      if (targetFromUrl) {
        if (list.some((c) => c.id === targetFromUrl)) {
          setActiveConvId(targetFromUrl);
        } else {
          setActiveConvId(null);
        }
      }
    } catch (err) {
      console.error("Failed to load conversations", err);
      setChatError("Unable to reach the workspace server. Check your connection and retry.");
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

    fetch("/api/marketing-shield/v1/products?status=ACTIVE")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!json) return;
        const items = unwrapApiList<ProductOption>(json);
        setProducts(items);
      })
      .catch(() => {
        // Non-blocking: product list stays empty on network failure
      });
  }, [clerkLoaded, isSignedIn, orgId, onboardingReady, loadConversations]);

  useEffect(() => {
    if (isExplicitNewAudit) {
      explicitNewRef.current = true;
      activeConvIdRef.current = null;
      setActiveConvId(null);
      setMessages([]);
      setActiveCampaign(null);
      setActiveAssessment(null);
      setCampaignFindings([]);
      setCampaignAsset(null);
      setAssetExtraction(null);
      setShowInspector(false);
      setCanvasReport(null);
      setShowArtifactCanvas(false);
      router.replace("/chat", { scroll: false });
    } else if (requestedConvId) {
      explicitNewRef.current = false;
      activeConvIdRef.current = requestedConvId;
      setActiveConvId(requestedConvId);
      router.replace("/chat", { scroll: false });
    }
  }, [isExplicitNewAudit, requestedConvId, router]);

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

          const extRes = await fetch(`/api/marketing-shield/v1/assets/${firstAsset.id}/extraction`);
          const extJson = await extRes.json();
          if (extJson.success && extJson.data) {
            setAssetExtraction(extJson.data);
          }
        }

        if (camp.latest_assessment) {
          setActiveAssessment(camp.latest_assessment);
        }

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
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!isMounted) return;
        if (!res.ok || !json.success || !json.data) {
          applyApiFailure(res.status, json, "Unable to open this compliance thread.");
          if (res.status === 403 || res.status === 404) {
            activeConvIdRef.current = null;
            setActiveConvId(null);
            setMessages([]);
          }
          return;
        }
        const loaded: DisplayMessage[] = (json.data.messages || []).map((m: MessageRecord) => ({
          id: m.id,
          role: m.role,
          content: describeStoredMessageContent(m),
          citations: (m.metadata?.citations as CitationItem[]) || [],
          structuredReport:
            (m.metadata?.structured_report as StructuredComplianceReport) || undefined,
          isStreaming: false,
        }));
        setMessages(loaded);
        const lastWithReport = [...loaded]
          .reverse()
          .find((m) => Boolean(m.structuredReport))?.structuredReport;
        setCanvasReport(lastWithReport || null);
      })
      .catch((err) => console.error("Failed to load messages", err))
      .finally(() => {
        if (isMounted) setLoadingMessages(false);
      });

    const conv = conversationsRef.current.find((c) => c.id === activeConvId);
    if (conv?.active_campaign_id) {
      loadCampaignData(conv.active_campaign_id);
    } else {
      setActiveCampaign(null);
      setShowInspector(false);
    }

    return () => {
      isMounted = false;
    };
  }, [activeConvId, loadCampaignData, applyApiFailure]);

  const handleSelectConversation = (id: string) => {
    explicitNewRef.current = false;
    activeConvIdRef.current = id;
    setActiveConvId(id);
    setShowArtifactCanvas(false);
    setChatError(null);
  };

  const handleNewConversation = () => {
    explicitNewRef.current = true;
    activeConvIdRef.current = null;
    setActiveConvId(null);
    setMessages([]);
    setActiveCampaign(null);
    setActiveAssessment(null);
    setCampaignFindings([]);
    setCampaignAsset(null);
    setAssetExtraction(null);
    setShowInspector(false);
    setCanvasReport(null);
    setShowArtifactCanvas(false);
    setChatError(null);
    setAuthIssue(null);
    if (requestedConvId || isExplicitNewAudit) {
      router.replace("/chat", { scroll: false });
    }
  };

  const handleRename = async (id: string, newTitle: string) => {
    try {
      const res = await fetch(`/api/marketing-shield/v1/conversations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        applyApiFailure(res.status, json, "Failed to rename thread.");
        return;
      }
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title: newTitle } : c)),
      );
    } catch (err) {
      console.error("Failed to rename conversation", err);
      setChatError("Network error while renaming thread.");
    }
  };

  const handleArchive = async (id: string) => {
    try {
      const res = await fetch(`/api/marketing-shield/v1/conversations/${id}/archive`, {
        method: "POST",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        applyApiFailure(res.status, json, "Failed to archive thread.");
        return;
      }
      const remaining = conversations.filter((c) => c.id !== id);
      setConversations(remaining);
      if (activeConvId === id) {
        handleNewConversation();
      }
    } catch (err) {
      console.error("Failed to archive conversation", err);
      setChatError("Network error while archiving thread.");
    }
  };

  const ensureActiveCampaignWithCopy = async (rewrittenCopy: string): Promise<{
    campaignId: string;
    revisionId: string;
  } | null> => {
    const currentConvId = activeConvId ?? activeConvIdRef.current;
    if (activeCampaign?.id && activeCampaign.current_revision_id) {
      const revRes = await fetch(
        `/api/marketing-shield/v1/campaigns/${activeCampaign.id}/revisions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            parent_revision_id: activeCampaign.current_revision_id,
            content_text: rewrittenCopy,
            revision_source: "AI_REWRITE_ACCEPTED",
            change_summary: "Applied Layer-6 verified rewrite from Autonomous Compliance Analyst",
            auto_reassess: true,
          }),
        },
      );
      const revJson = await revRes.json().catch(() => ({}));
      if (!revRes.ok || !revJson.success || !revJson.data) {
        applyApiFailure(revRes.status, revJson, "Failed to create compliant campaign revision.");
        return null;
      }
      await loadCampaignData(activeCampaign.id);
      const newRevisionId =
        revJson.data.revision?.id || revJson.data.id || activeCampaign.current_revision_id;
      return { campaignId: activeCampaign.id, revisionId: newRevisionId };
    }

    const selectedProduct = products.find((p) => p.id === selectedProductId);
    const campName = selectedProduct
      ? `${selectedProduct.product_name} Compliant Campaign`
      : "Autonomous Compliance Audit Campaign";
    const campRes = await fetch("/api/marketing-shield/v1/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversation_id: currentConvId || undefined,
        campaign_name: campName,
        channel: "SOCIAL_MEDIA",
        product_id: selectedProductId || undefined,
        initial_content_text: rewrittenCopy,
      }),
    });
    const campJson = await campRes.json().catch(() => ({}));
    if (!campRes.ok || !campJson.success || !campJson.data) {
      applyApiFailure(campRes.status, campJson, "Failed to create campaign for compliant rewrite.");
      return null;
    }
    const createdCamp = campJson.data;
    await loadCampaignData(createdCamp.id);
    return {
      campaignId: createdCamp.id,
      revisionId: createdCamp.current_revision_id,
    };
  };

  const handleApplyCompliantRewrite = async (rewrittenCopy: string): Promise<boolean> => {
    try {
      const target = await ensureActiveCampaignWithCopy(rewrittenCopy);
      return Boolean(target);
    } catch (err) {
      console.error("Failed to apply compliant rewrite", err);
      setChatError("Network error while applying compliant rewrite.");
      return false;
    }
  };

  const handleApproveAndSealDossier = async (rewrittenCopy: string): Promise<boolean> => {
    try {
      const target = await ensureActiveCampaignWithCopy(rewrittenCopy);
      if (!target) return false;

      const appRes = await fetch(
        `/api/marketing-shield/v1/campaigns/${target.campaignId}/approvals`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            revision_id: target.revisionId,
            decision: "APPROVED",
            decision_reason:
              "Approved and sealed via Autonomous Compliance Analyst Workbench after Lock 1-3 & KFS verification.",
          }),
        },
      );
      const appJson = await appRes.json().catch(() => ({}));
      if (!appRes.ok || !appJson.success) {
        applyApiFailure(appRes.status, appJson, "Failed to record CCO campaign approval.");
        return false;
      }

      const dosRes = await fetch(
        `/api/marketing-shield/v1/campaigns/${target.campaignId}/dossiers`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            revision_id: target.revisionId,
          }),
        },
      );
      const dosJson = await dosRes.json().catch(() => ({}));
      if (dosRes.ok && dosJson.success && dosJson.data?.download_url) {
        window.open(dosJson.data.download_url, "_blank", "noopener,noreferrer");
      }

      await loadCampaignData(target.campaignId);
      return true;
    } catch (err) {
      console.error("Failed to approve and seal dossier", err);
      setChatError("Network error while sealing 2-year FCCPC audit dossier.");
      return false;
    }
  };

  const handleSendMessage = async (
    text: string,
    msgOptions?: {
      attachmentAssetIds?: string[];
      attachments?: PendingAttachment[];
    },
  ): Promise<boolean> => {
    setChatError(null);
    let currentConvId = activeConvId ?? activeConvIdRef.current;
    const selectedProduct = products.find((p) => p.id === selectedProductId);
    const attachedAssets = msgOptions?.attachments || [];
    const attachmentAssetIds = msgOptions?.attachmentAssetIds || [];

    if (!currentConvId) {
      const topicTitle = deriveConversationTopicTitle(text, {
        productName: selectedProduct?.product_name,
        attachmentName: attachedAssets[0]?.filename,
      });
      try {
        const createRes = await fetch("/api/marketing-shield/v1/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: topicTitle,
            context_type: selectedProduct || attachmentAssetIds.length > 0 ? "CAMPAIGN" : "GENERAL",
          }),
        });
        const createJson = await createRes.json().catch(() => ({}));
        if (!createRes.ok || !createJson.success || !createJson.data) {
          applyApiFailure(createRes.status, createJson, "Unable to create compliance audit.");
          return false;
        }
        currentConvId = createJson.data.id;
        explicitNewRef.current = false;
        activeConvIdRef.current = currentConvId;
        skipNextLoadForConvRef.current = currentConvId;
        setAuthIssue(null);
        setActiveConvId(currentConvId);
        setConversations((prev) => [createJson.data, ...prev]);
      } catch (err) {
        console.error("Failed to create initial conversation", err);
        setChatError("Unable to reach the workspace server. Check your connection and try again.");
        return false;
      }
    }

    if (!currentConvId) {
      setChatError("Unable to initialize audit session. Please try again.");
      return false;
    }

    if (attachmentAssetIds.length > 0 && !activeCampaign) {
      const firstFilename = attachedAssets[0]?.filename || "Campaign Asset";
      const baseTitle = firstFilename.replace(/\.[^/.]+$/, "").trim();
      const campaignName = baseTitle.length >= 3 ? baseTitle : `${baseTitle || "Campaign"} Asset`;
      const combinedExtracted = attachedAssets
        .map((a) => a.extractedText?.trim())
        .filter(Boolean)
        .join("\n\n");

      void fetch("/api/marketing-shield/v1/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: currentConvId,
          campaign_name: campaignName,
          channel: "SOCIAL_MEDIA",
          product_id: selectedProductId || undefined,
          asset_ids: attachmentAssetIds,
          initial_content_text:
            combinedExtracted || `Campaign asset ${firstFilename} uploaded for compliance review.`,
        }),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((campJson) => {
          if (campJson?.success && campJson.data?.id) {
            void loadCampaignData(campJson.data.id);
          }
        })
        .catch(() => {});
    }

    const tempUserMsgId = `user_${Date.now()}`;
    const userMsg: DisplayMessage = {
      id: tempUserMsgId,
      role: "USER",
      content: text,
      attachments: attachedAssets.map((a) => ({
        assetId: a.assetId,
        filename: a.filename,
      })),
      isStreaming: false,
    };

    const tempAssistantMsgId = `assistant_${Date.now()}`;
    const assistantMsg: DisplayMessage = {
      id: tempAssistantMsgId,
      role: "ASSISTANT",
      content: "",
      citations: [],
      planSteps: [],
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsStreaming(true);
    setActiveTool(null);

    const extractedUrls = Array.from(
      new Set(text.match(/https?:\/\/[^\s<>"{}|\\^`[\]]+/gi) || []),
    ).slice(0, 3);

    // Client-side watchdog: the server sends a heartbeat every ~10s, so prolonged silence means
    // the connection was dropped (e.g. serverless timeout or network loss). Abort instead of
    // leaving the user staring at an empty reply forever.
    const streamAbort = new AbortController();
    let watchdog: ReturnType<typeof setTimeout> | undefined;
    const armWatchdog = () => {
      if (watchdog) clearTimeout(watchdog);
      watchdog = setTimeout(() => streamAbort.abort(), STREAM_IDLE_TIMEOUT_MS);
    };
    let receivedTerminalEvent = false;

    try {
      armWatchdog();
      const response = await fetch(
        `/api/marketing-shield/v1/conversations/${currentConvId}/messages/stream`,
        {
          method: "POST",
          signal: streamAbort.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: text,
            attachment_asset_ids:
              attachmentAssetIds.length > 0 ? attachmentAssetIds : undefined,
            referenced_product_id: selectedProductId || undefined,
            active_campaign_id: activeCampaign?.id || undefined,
            campaign_urls: extractedUrls.length > 0 ? extractedUrls : undefined,
          }),
        },
      );

      if (!response.ok || !response.body) {
        const errBody = await response.json().catch(() => ({}));
        const parsed = applyApiFailure(
          response.status,
          errBody,
          `HTTP ${response.status}: Failed to connect to streaming endpoint`,
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
                m.id === tempAssistantMsgId ? { ...m, content: m.content + delta } : m,
              ),
            );
          } else if (event.type === "plan.created") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === tempAssistantMsgId ? { ...m, planSteps: event.data.steps } : m,
              ),
            );
          } else if (event.type === "plan.step_updated") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === tempAssistantMsgId
                  ? {
                      ...m,
                      planSteps: (m.planSteps || []).map((s) =>
                        s.step_id === event.data.step_id
                          ? {
                              ...s,
                              status: event.data.status,
                              summary: event.data.summary || s.summary,
                            }
                          : s,
                      ),
                    }
                  : m,
              ),
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
          } else if (event.type === "campaign.created") {
            loadCampaignData(event.data.campaign_id);
          } else if (event.type === "assessment.completed") {
            setCanvasReport(event.data.structured_report);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === tempAssistantMsgId
                  ? { ...m, structuredReport: event.data.structured_report }
                  : m,
              ),
            );
          } else if (event.type === "message.completed") {
            receivedTerminalEvent = true;
            if (event.data.structured_report) {
              setCanvasReport(event.data.structured_report);
            }
            setMessages((prev) =>
              prev.map((m) =>
                m.id === tempAssistantMsgId
                  ? {
                      ...m,
                      id: event.data.assistant_message_id || m.id,
                      citations: event.data.citations || m.citations,
                      structuredReport:
                        event.data.structured_report || m.structuredReport,
                      isStreaming: false,
                    }
                  : m,
              ),
            );
            const updatedTitle = event.data.conversation_title;
            if (updatedTitle && currentConvId) {
              setConversations((prev) =>
                prev.map((c) => (c.id === currentConvId ? { ...c, title: updatedTitle } : c)),
              );
            }
          } else if (event.type === "message.failed") {
            receivedTerminalEvent = true;
            const failMsg = event.data.message || "Compliance review failed.";
            setChatError(failMsg);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === tempAssistantMsgId
                  ? {
                      ...m,
                      content: m.content
                        ? `${m.content}\n\n*Compliance review interrupted: ${failMsg}*`
                        : `*Compliance review interrupted: ${failMsg}*`,
                      isStreaming: false,
                    }
                  : m,
              ),
            );
          }
        } catch (parseErr) {
          console.warn("Failed to parse SSE block", parseErr);
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        armWatchdog();

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

      if (!receivedTerminalEvent) {
        // Stream closed without completed/failed — previously this left a silent blank reply.
        throw new Error(
          "The connection to the compliance analyst closed before a reply was finished. Please resend your message.",
        );
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempAssistantMsgId && m.isStreaming ? { ...m, isStreaming: false } : m,
        ),
      );
      return true;
    } catch (err) {
      console.error("Streaming error", err);
      const errMsg = streamAbort.signal.aborted
        ? "No response from the server for over a minute. Please resend your message."
        : err instanceof Error
          ? err.message
          : "Connection interrupted.";
      setChatError(errMsg);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempAssistantMsgId
            ? {
                ...m,
                content: m.content + `\n\n*Review interrupted: ${errMsg}*`,
                isStreaming: false,
              }
            : m,
        ),
      );
      return true;
    } finally {
      if (watchdog) clearTimeout(watchdog);
      setIsStreaming(false);
      setActiveTool(null);
    }
  };

  const activeConversation = conversations.find((c) => c.id === activeConvId);
  const isZeroState = !loadingMessages && messages.length === 0;
  const latestReportInThread =
    canvasReport ||
    [...messages].reverse().find((m) => Boolean(m.structuredReport))?.structuredReport ||
    null;

  const handleOpenArtifactCanvas = (
    artifactType: ComplianceArtifactType,
    report: StructuredComplianceReport
  ) => {
    setCanvasReport(report);
    setCanvasActiveTab(artifactType);
    setShowArtifactCanvas(true);
    setShowInspector(false);
  };

  if (!clerkLoaded || !isSignedIn || !orgId || !onboardingReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-[13px] text-zinc-500">
        Verifying session and workspace setup...
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white text-zinc-950 overflow-hidden">
      {/* 1. Monochrome Navigation Sidebar */}
      <WorkspaceSidebar
        conversations={conversations}
        activeConversationId={activeConvId}
        onSelectConversation={handleSelectConversation}
        onNewAudit={handleNewConversation}
        onRenameConversation={handleRename}
        onArchiveConversation={handleArchive}
        loadingConversations={loadingConversations}
        collapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* 2. Main Single-Column Editorial Conversational Canvas */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0 bg-white">
        <WorkspaceHeader
          section="Marketing Shield"
          title={activeConversation?.title || "Compliance Copilot"}
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
          rightActions={
            <>
              {latestReportInThread && (
                <button
                  type="button"
                  onClick={() => {
                    if (!showArtifactCanvas && latestReportInThread) {
                      setCanvasReport(latestReportInThread);
                      setShowArtifactCanvas(true);
                      setShowInspector(false);
                    } else {
                      setShowArtifactCanvas(false);
                    }
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12.5px] font-medium border transition-colors cursor-pointer ${
                    showArtifactCanvas
                      ? "bg-zinc-900 text-white border-zinc-900"
                      : "bg-white text-zinc-800 border-zinc-200 hover:bg-zinc-50"
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Artifact Canvas</span>
                </button>
              )}

              {activeCampaign && (
                <button
                  type="button"
                  onClick={() => {
                    const next = !showInspector;
                    setShowInspector(next);
                    if (next) setShowArtifactCanvas(false);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12.5px] font-medium border transition-colors cursor-pointer ${
                    showInspector
                      ? "bg-zinc-100 text-zinc-950 border-zinc-300"
                      : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50"
                  }`}
                >
                  <PanelRight className="h-3.5 w-3.5" />
                  <span>Studio</span>
                  {campaignFindings.length > 0 && (
                    <span className="ml-0.5 rounded-full bg-rose-100 text-rose-700 px-1.5 py-0.5 font-mono text-[10.5px] font-semibold">
                      {campaignFindings.length}
                    </span>
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={handleNewConversation}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white text-[12.5px] font-medium transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Chat</span>
              </button>
            </>
          }
        />

        {/* Auth / API Error Banner */}
        {(authIssue || chatError) && (
          <div className="mx-6 mt-4 rounded-lg border border-amber-200 bg-amber-50/70 px-4 py-3 text-[12.5px] text-amber-950 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">
                  {authIssue === "UNAUTHENTICATED"
                    ? "Sign in required"
                    : authIssue === "NO_ORG"
                      ? "Organization required"
                      : "Notice"}
                </p>
                <p className="text-amber-800 mt-0.5">{chatError}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {authIssue === "UNAUTHENTICATED" && (
                <Link
                  href="/sign-in"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-[12px] transition-colors"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  <span>Sign in</span>
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
                className="p-1 rounded text-amber-700 hover:bg-amber-100 transition-colors cursor-pointer"
                aria-label="Dismiss notice"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Zero-State Centered Canvas OR Active Single-Column Scrollable Stream */}
        {isZeroState ? (
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 flex flex-col items-center justify-center py-12">
            <div className="w-full max-w-2xl">
              <h1 className="font-serif text-[32px] sm:text-[38px] leading-[1.15] tracking-tight text-zinc-950 text-center mb-2">
                Ask a compliance question or clear a campaign.
              </h1>
              <p className="text-center text-[13.5px] text-zinc-500 mb-6">
                Chat freely about CBN, FCCPC, ARCON, NDPC &amp; SEC rules, brainstorm product terms, or attach a flyer/URL for full pre-flight clearance.
              </p>

              <ChatComposer
                onSendMessage={handleSendMessage}
                conversationId={activeConvId || undefined}
                disabled={isStreaming}
                isZeroState={true}
                products={products}
                selectedProductId={selectedProductId}
                onSelectProduct={setSelectedProductId}
              />
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
              {loadingMessages && (
                <div className="py-20 text-center text-[12.5px] text-zinc-400">
                  Loading thread...
                </div>
              )}

              {messages.map((msg) => (
                <AdaptiveMessageRenderer
                  key={msg.id}
                  role={msg.role}
                  content={msg.content}
                  citations={msg.citations}
                  planSteps={msg.planSteps}
                  structuredReport={msg.structuredReport}
                  attachments={msg.attachments}
                  isStreaming={msg.isStreaming}
                  onInspectEvidence={(clauseId) => setInspectClauseId(clauseId)}
                  onOpenArtifactCanvas={handleOpenArtifactCanvas}
                  onApplyCompliantRewrite={handleApplyCompliantRewrite}
                  onApproveAndSealDossier={handleApproveAndSealDossier}
                />
              ))}

              {activeTool && (
                <div className="my-2">
                  <ToolActivityPill
                    toolName={activeTool.toolName}
                    displayLabel={activeTool.displayLabel}
                    status={activeTool.status}
                    summary={activeTool.summary}
                    wideRail={false}
                  />
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <footer className="px-4 sm:px-6 py-3.5 bg-white border-t border-zinc-200 shrink-0">
              <ChatComposer
                onSendMessage={handleSendMessage}
                conversationId={activeConvId || undefined}
                disabled={isStreaming}
                isZeroState={false}
                products={products}
                selectedProductId={selectedProductId}
                onSelectProduct={setSelectedProductId}
                wideRail={false}
              />
            </footer>
          </>
        )}
      </div>

      {/* 3. External Slide-Over Right-Hand Artifact Canvas Drawer (Claude / ChatGPT Canvas Architecture) */}
      <ArtifactCanvasDrawer
        isOpen={showArtifactCanvas && Boolean(latestReportInThread)}
        activeTab={canvasActiveTab}
        onSelectTab={setCanvasActiveTab}
        onClose={() => setShowArtifactCanvas(false)}
        report={latestReportInThread}
        onInspectEvidence={(clauseId) => setInspectClauseId(clauseId)}
        onApplyCompliantRewrite={handleApplyCompliantRewrite}
        onApproveAndSealDossier={handleApproveAndSealDossier}
      />

      {/* 4. Split-Screen Campaign Studio */}
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

      {/* 5. Slide-Over Statutory Source Drawer */}
      <EvidenceDrawer
        clauseId={inspectClauseId}
        isOpen={Boolean(inspectClauseId)}
        onClose={() => setInspectClauseId(null)}
      />
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-white text-[13px] text-zinc-400">
          Loading workspace...
        </div>
      }
    >
      <ChatWorkspaceContent />
    </Suspense>
  );
}
