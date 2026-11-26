"use client";

import React, { useEffect, useState, useRef, useCallback, Suspense } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth, OrganizationSwitcher } from "@clerk/nextjs";
import { WorkspaceSidebar } from "@/components/shell/WorkspaceSidebar";
import { WorkspaceHeader } from "@/components/shell/WorkspaceHeader";
import { useWorkspace } from "@/components/shell/WorkspaceProvider";
import {
  ChatWorkspaceSkeleton,
  ThreadMessagesSkeleton,
} from "@/components/shell/WorkspaceSkeletons";
import {
  AdaptiveMessageRenderer,
  type EntitlementBlockedBanner,
  type MessageAttachmentChip,
  type SearchTrackPill,
  type WorkProductBannerRef,
} from "@/components/chat/AdaptiveMessageRenderer";
import {
  ChatComposer,
  type KnowledgeDocOption,
  type PendingAttachment,
  type ProductOption,
} from "@/components/chat/ChatComposer";
import { type SearchTraceItem } from "@/components/chat/ThinkingTraceHeader";
import { TypewriterHeadline } from "@/components/chat/TypewriterHeadline";
import type { Finding } from "@/components/campaign/FindingCard";
import type { LockResult } from "@/components/campaign/Tab1LocksOverview";
import type { ExtractionData } from "@/components/campaign/Tab2AssetBoundingBoxes";
import type { ConversationRecord, MessageRecord } from "@/modules/conversations/conversation.service";
import { deriveConversationTopicTitle } from "@/modules/conversations/topic-title";
import type {
  CitationItem,
  ComplianceArtifactType,
  ExecutionPlanStep,
  FollowUpSuggestion,
  SSEEvent,
  StructuredComplianceReport,
} from "@/contracts/conversation.contracts";
import type { SearchJurisdiction, SearchQuotaSnapshot } from "@/contracts/search.contracts";
import type { WorkflowType } from "@/contracts/work-product.contracts";
import { extractApiError, extractSseDataFromBlock, unwrapApiList } from "@/lib/api-client";
import { formatCleanAiError } from "@/lib/ai/error-formatter";
import { PanelRight, AlertTriangle, LogIn, X, Plus, Sparkles } from "lucide-react";

const EvidenceDrawer = dynamic(
  () => import("@/components/chat/EvidenceDrawer").then((m) => m.EvidenceDrawer),
  { ssr: false },
);
const SourcesDrawer = dynamic(
  () => import("@/components/chat/SourcesDrawer").then((m) => m.SourcesDrawer),
  { ssr: false },
);
const ArtifactCanvasDrawer = dynamic(
  () => import("@/components/chat/ArtifactCanvasDrawer").then((m) => m.ArtifactCanvasDrawer),
  { ssr: false },
);
const ContextualCampaignInspector = dynamic(
  () =>
    import("@/components/campaign/ContextualCampaignInspector").then(
      (m) => m.ContextualCampaignInspector,
    ),
  { ssr: false },
);

interface DisplayMessage {
  id: string;
  clientKey?: string;
  role: "USER" | "ASSISTANT" | "SYSTEM" | "TOOL";
  content: string;
  citations?: CitationItem[];
  followUps?: FollowUpSuggestion[];
  feedback?: "up" | "down" | null;
  planSteps?: ExecutionPlanStep[];
  structuredReport?: StructuredComplianceReport;
  attachments?: MessageAttachmentChip[];
  searchTracks?: SearchTrackPill[];
  searchTraces?: SearchTraceItem[];
  thinkingStartedAt?: number;
  thinkingDurationMs?: number;
  entitlementBlocked?: EntitlementBlockedBanner;
  workProductRef?: WorkProductBannerRef;
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
    const rawReason = typeof meta.error === "string" ? meta.error : "The reply could not be completed.";
    const reason = formatCleanAiError(rawReason);
    return m.content
      ? `${m.content}\n\n*Compliance review interrupted: ${reason}*`
      : `*Compliance review interrupted: ${reason} Please resend your message.*`;
  }
  if (status === "STREAMING" && !m.content) {
    return "*This reply is still being generated or was interrupted. Refresh in a moment, or resend your message.*";
  }
  return m.content;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isMarketingAttachmentUpload(params: {
  text: string;
  workflowHint?: WorkflowType;
  attachments: Array<PendingAttachment | MessageAttachmentChip>;
}): boolean {
  if (params.workflowHint === "CAMPAIGN_COMPLIANCE_KIT") return true;
  if (params.workflowHint) return false;

  const filenames = params.attachments.map((a) => a.filename || "");
  const mimeTypes = params.attachments.map((a) => a.mimeType || "");
  const extracted = params.attachments
    .map((a) => ("extractedText" in a && a.extractedText ? a.extractedText : ""))
    .join("\n");

  const hasPromptMarketingCue =
    /\b(?:flyer|banner|poster|billboard|ad\s+copy|promo(?:tional)?\s+(?:copy|material|asset|campaign)|campaign\s+(?:asset|copy|creative|flyer|banner|clearance)|marketing\s+(?:asset|copy|creative|flyer|campaign)|social\s+(?:media\s+)?(?:ad|post|caption)|instagram\s+(?:ad|post|caption)|tiktok\s+(?:ad|script)|influencer\s+(?:script|skit)|sms\s+(?:blast|promo|ad)|play\s*store|app\s*store|landing\s*page|arcon\s+asp)\b/i.test(
      params.text,
    );
  if (hasPromptMarketingCue) return true;

  const hasPromoExtractedClaim =
    /\b(?:0%\s*interest|zero\s+interest|instant\s+(?:loan|cash|credit)|no\s+collateral|guaranteed\s+returns?|100%\s*risk[- ]?free|apply\s+now|loan\s+in\s+\d+\s*(?:min|minute))\b/i.test(
      extracted,
    );
  if (hasPromoExtractedClaim) return true;

  const hasImageAttachment =
    mimeTypes.some((m) => m.toLowerCase().startsWith("image/")) ||
    filenames.some((f) => /\.(?:jpg|jpeg|png|webp)$/i.test(f));
  const explicitNonMarketingCue =
    /\b(?:circular|gazette|contract|agreement|sla|nda|dpa|letter|invoice|receipt|certificate|license|licence|board\s+minutes|audit\s+report|risk\s+register)\b/i.test(
      `${params.text} ${filenames.join(" ")}`,
    );

  return hasImageAttachment && !explicitNonMarketingCue;
}

function ChatWorkspaceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedConvId = searchParams.get("conversationId");
  const requestedWorkProductId = searchParams.get("workProductId");
  const requestedPrefillQuery = searchParams.get("query");
  const requestedWorkflow = searchParams.get("workflow") as WorkflowType | null;
  const requestedLiveSearch = searchParams.get("liveSearch") === "1";
  const isExplicitNewAudit = searchParams.get("new") === "1";

  const { isLoaded: clerkLoaded, isSignedIn, orgId, userId } = useAuth();
  const workspace = useWorkspace();
  const [localOnboardingReady, setLocalOnboardingReady] = useState(false);
  const onboardingReady = workspace?.onboardingCompleted === true || localOnboardingReady;
  const [localConversations, setLocalConversations] = useState<ConversationRecord[]>([]);
  const conversations = workspace ? workspace.conversations : localConversations;
  const setConversations = workspace ? workspace.setConversations : setLocalConversations;
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [localLoadingConversations, setLocalLoadingConversations] = useState(true);
  const loadingConversations = workspace
    ? !workspace.bootstrapped && workspace.bootstrapping
    : localLoadingConversations;
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [inspectClauseId, setInspectClauseId] = useState<string | null>(null);
  const [sourcesDrawerCitations, setSourcesDrawerCitations] = useState<CitationItem[] | null>(null);
  const [authIssue, setAuthIssue] = useState<"UNAUTHENTICATED" | "NO_ORG" | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);

  // Referenced Product Schedule & Policy Knowledge State
  const [localProducts, setLocalProducts] = useState<ProductOption[]>([]);
  const products = workspace ? workspace.products : localProducts;
  const setProducts = workspace ? workspace.setProducts : setLocalProducts;
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [localKnowledgeDocs, setLocalKnowledgeDocs] = useState<KnowledgeDocOption[]>([]);
  const knowledgeDocs = workspace ? workspace.knowledgeDocs : localKnowledgeDocs;
  const setKnowledgeDocs = workspace ? workspace.setKnowledgeDocs : setLocalKnowledgeDocs;
  const [selectedKnowledgeDocId, setSelectedKnowledgeDocId] = useState<string | null>(null);

  // Paid Dual-Engine Live Search & Workflow Orchestration State
  const [localLiveSearchQuota, setLocalLiveSearchQuota] = useState<SearchQuotaSnapshot | null>(null);
  const liveSearchQuota = workspace ? workspace.searchQuota : localLiveSearchQuota;
  const setLiveSearchQuota = workspace ? workspace.setSearchQuota : setLocalLiveSearchQuota;
  const [enableLiveWebSearch, setEnableLiveWebSearch] = useState(false);
  const [searchJurisdictions, setSearchJurisdictions] = useState<SearchJurisdiction[]>(["NG"]);
  const [workflowHint, setWorkflowHint] = useState<WorkflowType | null>(null);
  const [prefillText, setPrefillText] = useState<string | null>(null);

  // Layout State
  const [localSidebarCollapsed, setLocalSidebarCollapsed] = useState(false);
  const sidebarCollapsed = workspace ? workspace.sidebarCollapsed : localSidebarCollapsed;
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Campaign & Studio State
  const [activeCampaign, setActiveCampaign] = useState<ActiveCampaignState | null>(null);
  const [activeAssessment, setActiveAssessment] = useState<ActiveAssessmentState | null>(null);
  const [campaignFindings, setCampaignFindings] = useState<Finding[]>([]);
  const [campaignAsset, setCampaignAsset] = useState<ActiveAssetState | null>(null);
  const [assetExtraction, setAssetExtraction] = useState<ExtractionData | null>(null);
  const [showInspector, setShowInspector] = useState(false);

  // External Slide-Over Artifact Canvas & Work Product Studio State
  const [canvasReport, setCanvasReport] = useState<StructuredComplianceReport | null>(null);
  const [activeWorkProductId, setActiveWorkProductId] = useState<string | null>(null);
  const [canvasActiveTab, setCanvasActiveTab] =
    useState<ComplianceArtifactType>("compliant_ad_rewrite");
  const [showArtifactCanvas, setShowArtifactCanvas] = useState(false);
  const [creatingDocMessageId, setCreatingDocMessageId] = useState<string | null>(null);

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
    if (workspace) return;
    try {
      if (window.localStorage.getItem("cogent:sidebar-collapsed") === "true") {
        setLocalSidebarCollapsed(true);
      }
    } catch {
      // Ignore storage access failures
    }
  }, [workspace]);

  const handleToggleSidebar = useCallback(() => {
    if (workspace) {
      workspace.toggleSidebarCollapsed();
      return;
    }
    setLocalSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem("cogent:sidebar-collapsed", String(next));
      } catch {
        // Ignore storage access failures
      }
      return next;
    });
  }, [workspace]);

  useEffect(() => {
    const nextScope = userId && orgId ? `${userId}::${orgId}` : null;
    if (activeScopeKeyRef.current && activeScopeKeyRef.current !== nextScope) {
      activeConvIdRef.current = null;
      explicitNewRef.current = false;
      setActiveConvId(null);
      setMessages([]);
      setSelectedProductId(null);
      setActiveCampaign(null);
      setActiveAssessment(null);
      setCampaignFindings([]);
      setCampaignAsset(null);
      setAssetExtraction(null);
      setShowInspector(false);
      setCanvasReport(null);
      setActiveWorkProductId(null);
      setShowArtifactCanvas(false);
      setSelectedKnowledgeDocId(null);
      setEnableLiveWebSearch(false);
      setWorkflowHint(null);
      setInspectClauseId(null);
      setSourcesDrawerCitations(null);
      setChatError(null);
      setAuthIssue(null);
      if (!workspace) {
        setConversations([]);
        setProducts([]);
        setKnowledgeDocs([]);
        setLiveSearchQuota(null);
      }
    }
    activeScopeKeyRef.current = nextScope;
  }, [userId, orgId, workspace, setConversations, setProducts, setKnowledgeDocs, setLiveSearchQuota]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const applyApiFailure = useCallback((status: number, body: unknown, fallback: string) => {
    const parsed = extractApiError(status, body, fallback);
    const cleanMsg = formatCleanAiError(parsed.message);
    if (status === 401 || parsed.code === "UNAUTHENTICATED") {
      setAuthIssue("UNAUTHENTICATED");
      setChatError("Your session is signed out. Sign in to start or resume a compliance review.");
    } else if (status === 403 && parsed.code === "TENANT_CONTEXT_INVALID") {
      setAuthIssue("NO_ORG");
      setChatError(cleanMsg);
    } else {
      setAuthIssue(null);
      setChatError(cleanMsg);
    }
    return { ...parsed, message: cleanMsg };
  }, []);

  const loadConversations = useCallback(async () => {
    if (workspace) {
      await workspace.ensureBootstrapped();
      const targetFromUrl = requestedConvIdRef.current;
      if (explicitNewRef.current) {
        setActiveConvId(null);
      } else if (targetFromUrl) {
        setActiveConvId(targetFromUrl);
      }
      return;
    }
    setLocalLoadingConversations(true);
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
      setLocalLoadingConversations(false);
    }
  }, [workspace, applyApiFailure, setConversations]);

  // Single-request bootstrap & onboarding check (0ms instant when cached in WorkspaceProvider)
  useEffect(() => {
    if (!clerkLoaded) return;

    if (!isSignedIn) {
      setLocalOnboardingReady(false);
      router.replace("/sign-in?redirect_url=/chat");
      return;
    }

    if (!orgId) {
      setLocalOnboardingReady(false);
      router.replace("/onboarding");
      return;
    }

    if (workspace) {
      if (workspace.onboardingCompleted === false) {
        router.replace("/onboarding");
        return;
      }
      void workspace.ensureBootstrapped();
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
        setLocalOnboardingReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setLocalOnboardingReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [clerkLoaded, isSignedIn, orgId, workspace, workspace?.onboardingCompleted, router]);

  const hasAutoEnabledLiveWebRef = useRef(false);
  useEffect(() => {
    if (!liveSearchQuota || hasAutoEnabledLiveWebRef.current) return;
    // Paid plans auto-enable live web search; trial users stay opt-in so they deliberately spend their 3 searches
    if (
      liveSearchQuota.plan_slug !== "evaluation" &&
      liveSearchQuota.live_web_allowed &&
      (liveSearchQuota.remaining ?? 1) !== 0
    ) {
      hasAutoEnabledLiveWebRef.current = true;
      setEnableLiveWebSearch(true);
    }
  }, [liveSearchQuota]);

  const refreshLiveSearchQuota = useCallback(async () => {
    if (workspace) {
      await workspace.refreshSearchQuota();
      return;
    }
    try {
      const res = await fetch("/api/marketing-shield/v1/search/quota", { cache: "no-store" });
      const json = await res.json().catch(() => null);
      const snap = (json?.data?.quota || json?.data) as SearchQuotaSnapshot | undefined;
      if (res.ok && json?.success && snap && typeof snap.live_web_allowed === "boolean") {
        setLiveSearchQuota(snap);
      }
    } catch {
      // Non-blocking: quota indicator degrades silently
    }
  }, [workspace, setLiveSearchQuota]);

  useEffect(() => {
    if (!clerkLoaded || !isSignedIn || !orgId || !onboardingReady) return;
    if (workspace) {
      // WorkspaceProvider already fetched conversations, quota, products & knowledgeDocs in 1 parallel request
      return;
    }
    loadConversations();
    void refreshLiveSearchQuota();

    fetch("/api/marketing-shield/v1/products?status=ACTIVE")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!json) return;
        const items = unwrapApiList<ProductOption>(json);
        setProducts(items);
      })
      .catch(() => {
        // Non-blocking
      });

    fetch("/api/marketing-shield/v1/knowledge-base/documents?status=ACTIVE")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!json) return;
        const items = unwrapApiList<KnowledgeDocOption>(json);
        setKnowledgeDocs(items);
      })
      .catch(() => {
        // Non-blocking
      });
  }, [
    clerkLoaded,
    isSignedIn,
    orgId,
    onboardingReady,
    workspace,
    loadConversations,
    refreshLiveSearchQuota,
    setProducts,
    setKnowledgeDocs,
  ]);

  useEffect(() => {
    if (!onboardingReady) return;

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
      setActiveWorkProductId(null);
      setShowArtifactCanvas(false);
      setWorkflowHint(null);
      setSelectedKnowledgeDocId(null);
      router.replace("/chat", { scroll: false });
      return;
    }

    let shouldCleanUrl = false;
    if (requestedConvId) {
      explicitNewRef.current = false;
      activeConvIdRef.current = requestedConvId;
      setActiveConvId(requestedConvId);
      shouldCleanUrl = true;
    }
    if (requestedWorkProductId) {
      setActiveWorkProductId(requestedWorkProductId);
      setCanvasActiveTab("statutory_structuring_memo");
      setShowArtifactCanvas(true);
      setShowInspector(false);
      shouldCleanUrl = true;
    }
    if (requestedPrefillQuery) {
      setPrefillText(requestedPrefillQuery);
      shouldCleanUrl = true;
    }
    if (requestedWorkflow) {
      setWorkflowHint(requestedWorkflow);
      shouldCleanUrl = true;
    }
    if (requestedLiveSearch) {
      setEnableLiveWebSearch(true);
      shouldCleanUrl = true;
    }

    if (shouldCleanUrl) {
      router.replace("/chat", { scroll: false });
    }
  }, [
    onboardingReady,
    isExplicitNewAudit,
    requestedConvId,
    requestedWorkProductId,
    requestedPrefillQuery,
    requestedWorkflow,
    requestedLiveSearch,
    router,
  ]);

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
        const loaded: DisplayMessage[] = (json.data.messages || []).map((m: MessageRecord) => {
          const wpMeta = m.metadata?.work_product as WorkProductBannerRef | undefined;
          const fallbackWpId = m.metadata?.work_product_id as string | undefined;
          const reportMeta =
            (m.metadata?.structured_report as StructuredComplianceReport) || undefined;
          const workProductRef: WorkProductBannerRef | undefined =
            wpMeta?.work_product_id
              ? wpMeta
              : fallbackWpId
                ? {
                    work_product_id: fallbackWpId,
                    artifact_type: "statutory_structuring_memo",
                    workflow_type: "PRODUCT_STRUCTURING_MEMO",
                    title: "Compliance Deliverable",
                    version_number: 1,
                  }
                : undefined;

          const rawAtts = Array.isArray(m.metadata?.attachments)
            ? (m.metadata.attachments as Array<{
                asset_id?: string;
                filename?: string;
                mime_type?: string | null;
                file_size_bytes?: number | null;
              }>)
            : [];
          const rawAssetIds = Array.isArray(m.metadata?.attachment_asset_ids)
            ? (m.metadata.attachment_asset_ids as unknown[]).filter(
                (id): id is string => typeof id === "string"
              )
            : [];
          const hydratedAttachments: MessageAttachmentChip[] =
            rawAtts.length > 0
              ? rawAtts.map((a) => ({
                  assetId: a.asset_id,
                  filename: a.filename || "Uploaded Attachment",
                  mimeType: a.mime_type ?? null,
                  fileSizeBytes: a.file_size_bytes ?? null,
                }))
              : rawAssetIds.map((id) => ({
                  assetId: id,
                  filename: "Uploaded Attachment",
                }));

          return {
            id: m.id,
            role: m.role,
            content: describeStoredMessageContent(m),
            citations: (m.metadata?.citations as CitationItem[]) || [],
            followUps: (m.metadata?.follow_ups as FollowUpSuggestion[]) || [],
            feedback: (m.metadata?.feedback as "up" | "down" | undefined) ?? null,
            attachments: hydratedAttachments.length > 0 ? hydratedAttachments : undefined,
            structuredReport: reportMeta,
            workProductRef,
            isStreaming: false,
          };
        });
        setMessages(loaded);
        const lastWithReport = [...loaded]
          .reverse()
          .find((m) => Boolean(m.structuredReport))?.structuredReport;
        setCanvasReport(lastWithReport || null);

        const lastWithWorkProduct = [...loaded]
          .reverse()
          .find((m) => Boolean(m.workProductRef?.work_product_id || m.structuredReport?.work_product_id));
        const restoredWpId =
          lastWithWorkProduct?.workProductRef?.work_product_id ||
          lastWithWorkProduct?.structuredReport?.work_product_id ||
          null;
        setActiveWorkProductId(restoredWpId);
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
    setActiveWorkProductId(null);
    setShowArtifactCanvas(false);
    setSourcesDrawerCitations(null);
    setWorkflowHint(null);
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
    setActiveWorkProductId(null);
    setShowArtifactCanvas(false);
    setSourcesDrawerCitations(null);
    setWorkflowHint(null);
    setSelectedKnowledgeDocId(null);
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

  const handleDeleteConversation = async (id: string) => {
    try {
      const res = await fetch(`/api/marketing-shield/v1/conversations/${id}`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        applyApiFailure(res.status, json, "Failed to delete thread.");
        return;
      }
      const remaining = conversations.filter((c) => c.id !== id);
      setConversations(remaining);
      if (activeConvId === id) {
        handleNewConversation();
      }
    } catch (err) {
      console.error("Failed to delete conversation", err);
      setChatError("Network error while deleting thread.");
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
      attachments?: Array<PendingAttachment | MessageAttachmentChip>;
      enableLiveWebSearch?: boolean;
      searchJurisdictions?: SearchJurisdiction[];
      referencedKnowledgeDocId?: string;
      workflowHint?: WorkflowType;
      replaceFromMessageId?: string;
    },
  ): Promise<boolean> => {
    setChatError(null);
    let currentConvId = activeConvId ?? activeConvIdRef.current;
    const selectedProduct = products.find((p) => p.id === selectedProductId);
    const attachedAssets = msgOptions?.attachments || [];
    const attachmentAssetIds = msgOptions?.attachmentAssetIds || [];
    const useLiveWebSearch = msgOptions?.enableLiveWebSearch ?? enableLiveWebSearch;
    const effectiveJurisdictions =
      msgOptions?.searchJurisdictions && msgOptions.searchJurisdictions.length > 0
        ? msgOptions.searchJurisdictions
        : searchJurisdictions;
    const effectiveKnowledgeDocId =
      msgOptions?.referencedKnowledgeDocId ?? selectedKnowledgeDocId ?? undefined;
    const effectiveWorkflowHint = msgOptions?.workflowHint ?? workflowHint ?? undefined;

    const tempUserMsgId = `user_${Date.now()}`;
    const userMsg: DisplayMessage = {
      id: tempUserMsgId,
      clientKey: tempUserMsgId,
      role: "USER",
      content: text,
      attachments: attachedAssets.map((a) => ({
        assetId: a.assetId,
        filename: a.filename,
        mimeType: a.mimeType ?? null,
        fileSizeBytes: a.fileSizeBytes ?? null,
        previewUrl: a.previewUrl,
      })),
      isStreaming: false,
    };

    const streamStartTime = Date.now();
    const tempAssistantMsgId = `assistant_${streamStartTime}`;
    const assistantMsg: DisplayMessage = {
      id: tempAssistantMsgId,
      clientKey: tempAssistantMsgId,
      role: "ASSISTANT",
      content: "",
      citations: [],
      planSteps: [],
      searchTracks: [],
      searchTraces: [],
      thinkingStartedAt: streamStartTime,
      isStreaming: true,
    };

    let currentUserMsgId = tempUserMsgId;
    let currentAssistantMsgId = tempAssistantMsgId;

    // Show user message and analyzing wave IMMEDIATELY (0ms perceived latency)
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsStreaming(true);

    const isMarketingAttachment =
      attachmentAssetIds.length > 0 &&
      isMarketingAttachmentUpload({
        text,
        workflowHint: effectiveWorkflowHint,
        attachments: attachedAssets,
      });

    if (!currentConvId) {
      const topicTitle = deriveConversationTopicTitle(text, {
        productName: selectedProduct?.product_name,
        attachmentName: attachedAssets[0]?.filename,
      });
      const resolvedContextType =
        effectiveWorkflowHint === "POLICY_GAP_REDLINE" ||
        effectiveWorkflowHint === "POLICY_DRAFT_NEW"
          ? "POLICY_REDLINE"
          : effectiveWorkflowHint === "SUPERVISORY_DDQ_RESPONSE"
            ? "DDQ_RESPONSE"
            : effectiveWorkflowHint === "CROSS_BORDER_COMPARISON"
              ? "CROSS_BORDER"
              : effectiveWorkflowHint === "PRODUCT_STRUCTURING_MEMO" ||
                  effectiveWorkflowHint === "GENERAL_COMPLIANCE_DOCUMENT"
                ? "WORKFLOW_RESEARCH"
                : selectedProduct || isMarketingAttachment
                  ? "CAMPAIGN"
                  : "GENERAL";
      try {
        const createRes = await fetch("/api/marketing-shield/v1/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: topicTitle,
            context_type: resolvedContextType,
          }),
        });
        const createJson = await createRes.json().catch(() => ({}));
        if (!createRes.ok || !createJson.success || !createJson.data) {
          applyApiFailure(createRes.status, createJson, "Unable to create compliance audit.");
          setMessages((prev) =>
            prev.filter((m) => m.id !== tempUserMsgId && m.id !== tempAssistantMsgId),
          );
          setIsStreaming(false);
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
        setMessages((prev) =>
          prev.filter((m) => m.id !== tempUserMsgId && m.id !== tempAssistantMsgId),
        );
        setIsStreaming(false);
        return false;
      }
    }

    if (!currentConvId) {
      setChatError("Unable to initialize audit session. Please try again.");
      setMessages((prev) =>
        prev.filter((m) => m.id !== tempUserMsgId && m.id !== tempAssistantMsgId),
      );
      setIsStreaming(false);
      return false;
    }

    if (isMarketingAttachment && !activeCampaign) {
      const firstFilename = attachedAssets[0]?.filename || "Campaign Asset";
      const baseTitle = firstFilename.replace(/\.[^/.]+$/, "").trim();
      const campaignName = baseTitle.length >= 3 ? baseTitle : `${baseTitle || "Campaign"} Asset`;
      const combinedExtracted = attachedAssets
        .map((a) => ("extractedText" in a ? a.extractedText?.trim() : undefined))
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
            referenced_knowledge_doc_id: effectiveKnowledgeDocId,
            active_campaign_id: activeCampaign?.id || undefined,
            campaign_urls: extractedUrls.length > 0 ? extractedUrls : undefined,
            enable_live_web_search: useLiveWebSearch,
            search_jurisdictions: effectiveJurisdictions,
            workflow_hint: effectiveWorkflowHint,
            replace_from_message_id: msgOptions?.replaceFromMessageId || undefined,
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

          if (event.type === "message.started") {
            const prevUserId = currentUserMsgId;
            const prevAsstId = currentAssistantMsgId;
            const nextUserId = event.data.user_message_id || prevUserId;
            const nextAsstId = event.data.assistant_message_id || prevAsstId;
            currentUserMsgId = nextUserId;
            currentAssistantMsgId = nextAsstId;
            const serverAtts = event.data.user_attachments;

            setMessages((prev) =>
              prev.map((m) => {
                if (m.id === prevUserId) {
                  const mergedAttachments =
                    serverAtts && serverAtts.length > 0
                      ? serverAtts.map((sa, idx) => {
                          const existing =
                            m.attachments?.find((ea) => ea.assetId === sa.asset_id) ||
                            m.attachments?.[idx];
                          return {
                            assetId: sa.asset_id,
                            filename: sa.filename,
                            mimeType: sa.mime_type ?? existing?.mimeType ?? null,
                            fileSizeBytes: sa.file_size_bytes ?? existing?.fileSizeBytes ?? null,
                            previewUrl: existing?.previewUrl,
                          };
                        })
                      : m.attachments;
                  return {
                    ...m,
                    id: nextUserId,
                    ...(mergedAttachments ? { attachments: mergedAttachments } : {}),
                  };
                }
                if (m.id === prevAsstId) {
                  return { ...m, id: nextAsstId };
                }
                return m;
              }),
            );
          } else if (event.type === "assistant.delta") {
            const delta = event.data.text_delta;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === currentAssistantMsgId ? { ...m, content: m.content + delta } : m,
              ),
            );
          } else if (event.type === "plan.created") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === currentAssistantMsgId ? { ...m, planSteps: event.data.steps } : m,
              ),
            );
          } else if (event.type === "plan.step_updated") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === currentAssistantMsgId
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
          } else if (event.type === "search.track_started") {
            setMessages((prev) =>
              prev.map((m) => {
                if (m.id !== currentAssistantMsgId) return m;
                const existing = m.searchTracks || [];
                const nextTrack: SearchTrackPill = {
                  track: event.data.track,
                  label: event.data.label,
                  status: "RUNNING",
                };
                const idx = existing.findIndex((t) => t.track === event.data.track);
                const updated =
                  idx >= 0
                    ? existing.map((t, i) => (i === idx ? nextTrack : t))
                    : [...existing, nextTrack];
                return { ...m, searchTracks: updated };
              }),
            );
          } else if (event.type === "search.track_completed") {
            setMessages((prev) =>
              prev.map((m) => {
                if (m.id !== currentAssistantMsgId) return m;
                const existing = m.searchTracks || [];
                const idx = existing.findIndex((t) => t.track === event.data.track);
                const updatedTrack: SearchTrackPill = {
                  track: event.data.track,
                  label:
                    idx >= 0
                      ? existing[idx]!.label
                      : event.data.track.replace(/_/g, " "),
                  status: event.data.status,
                  resultCount: event.data.result_count,
                  cacheHit: event.data.cache_hit,
                };
                const updated =
                  idx >= 0
                    ? existing.map((t, i) => (i === idx ? updatedTrack : t))
                    : [...existing, updatedTrack];
                return { ...m, searchTracks: updated };
              }),
            );
          } else if (event.type === "entitlement.blocked") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === currentAssistantMsgId
                  ? {
                      ...m,
                      entitlementBlocked: {
                        feature: event.data.feature,
                        reason: event.data.reason,
                        upgrade_plan: event.data.upgrade_plan,
                      },
                    }
                  : m,
              ),
            );
          } else if (
            event.type === "work_product.created" ||
            event.type === "work_product.updated"
          ) {
            const wpData = event.data;
            setActiveWorkProductId(wpData.work_product_id);
            setCanvasActiveTab(wpData.artifact_type as ComplianceArtifactType);
            setShowArtifactCanvas(true);
            setShowInspector(false);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === currentAssistantMsgId
                  ? {
                      ...m,
                      workProductRef: {
                        work_product_id: wpData.work_product_id,
                        artifact_type: wpData.artifact_type,
                        workflow_type: wpData.workflow_type,
                        title: wpData.title,
                        version_number: wpData.version_number,
                      },
                    }
                  : m,
              ),
            );
          } else if (event.type === "tool.started") {
            const traceId = `tool:${event.data.tool_call_id || event.data.tool_name}`;
            const traceLabel = (event.data.display_label || event.data.tool_name).replace(/\.{3}$/, "");
            setMessages((prev) =>
              prev.map((m) => {
                if (m.id !== currentAssistantMsgId) return m;
                const existing = m.searchTraces || [];
                const idx = existing.findIndex((t) => t.id === traceId);
                const nextTrace: SearchTraceItem = {
                  id: traceId,
                  label: traceLabel,
                  status: "RUNNING",
                };
                return {
                  ...m,
                  searchTraces:
                    idx >= 0
                      ? existing.map((t, i) => (i === idx ? nextTrace : t))
                      : [...existing, nextTrace],
                };
              }),
            );
          } else if (event.type === "tool.completed") {
            const traceId = `tool:${event.data.tool_call_id || event.data.tool_name}`;
            setMessages((prev) =>
              prev.map((m) => {
                if (m.id !== currentAssistantMsgId) return m;
                const existing = m.searchTraces || [];
                const idx = existing.findIndex((t) => t.id === traceId);
                const fallbackLabel =
                  idx >= 0 ? existing[idx]!.label : event.data.summary || event.data.tool_name;
                const nextStatus = event.data.status === "FAILED" ? "FAILED" : "COMPLETED";
                const updated: SearchTraceItem = {
                  id: traceId,
                  label: fallbackLabel,
                  status: nextStatus,
                  detail: event.data.summary && event.data.summary !== fallbackLabel ? undefined : undefined,
                };
                return {
                  ...m,
                  searchTraces:
                    idx >= 0
                      ? existing.map((t, i) => (i === idx ? updated : t))
                      : [...existing, updated],
                };
              }),
            );
          } else if (event.type === "campaign.created") {
            loadCampaignData(event.data.campaign_id);
          } else if (event.type === "assessment.completed") {
            setCanvasReport(event.data.structured_report);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === currentAssistantMsgId
                  ? { ...m, structuredReport: event.data.structured_report }
                  : m,
              ),
            );
          } else if (event.type === "message.completed") {
            receivedTerminalEvent = true;
            const totalDurationMs = Date.now() - streamStartTime;
            if (event.data.structured_report) {
              setCanvasReport(event.data.structured_report);
            }
            setMessages((prev) =>
              prev.map((m) =>
                m.id === currentAssistantMsgId
                  ? {
                      ...m,
                      id: event.data.assistant_message_id || m.id,
                      citations: event.data.citations || m.citations,
                      followUps: event.data.follow_ups || m.followUps,
                      structuredReport:
                        event.data.structured_report || m.structuredReport,
                      searchTraces: (m.searchTraces || []).map((t) =>
                        t.status === "RUNNING" ? { ...t, status: "COMPLETED" } : t,
                      ),
                      thinkingDurationMs: totalDurationMs,
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
            const totalDurationMs = Date.now() - streamStartTime;
            const failMsg = formatCleanAiError(
              event.data.message || "Compliance review failed.",
            );
            setChatError(failMsg);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === currentAssistantMsgId
                  ? {
                      ...m,
                      content: m.content
                        ? `${m.content}\n\n*Compliance review interrupted: ${failMsg}*`
                        : `*Compliance review interrupted: ${failMsg}*`,
                      searchTraces: (m.searchTraces || []).map((t) =>
                        t.status === "RUNNING" ? { ...t, status: "FAILED" } : t,
                      ),
                      thinkingDurationMs: totalDurationMs,
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

      const finalDurationMs = Date.now() - streamStartTime;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === currentAssistantMsgId && m.isStreaming
            ? {
                ...m,
                thinkingDurationMs: m.thinkingDurationMs ?? finalDurationMs,
                isStreaming: false,
              }
            : m,
        ),
      );
      return true;
    } catch (err) {
      console.error("Streaming error", err);
      const totalDurationMs = Date.now() - streamStartTime;
      const errMsg = streamAbort.signal.aborted
        ? "No response from the server for over a minute. Please resend your message."
        : formatCleanAiError(err);
      setChatError(errMsg);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === currentAssistantMsgId
            ? {
                ...m,
                content: m.content
                  ? `${m.content}\n\n*Review interrupted: ${errMsg}*`
                  : `*Review interrupted: ${errMsg}*`,
                searchTraces: (m.searchTraces || []).map((t) =>
                  t.status === "RUNNING" ? { ...t, status: "FAILED" } : t,
                ),
                thinkingDurationMs: m.thinkingDurationMs ?? totalDurationMs,
                isStreaming: false,
              }
            : m,
        ),
      );
      return true;
    } finally {
      if (watchdog) clearTimeout(watchdog);
      setIsStreaming(false);
      if (useLiveWebSearch) {
        void refreshLiveSearchQuota();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("cogent:search-quota-updated"));
        }
      }
    }
  };

  const activeConversation = conversations.find((c) => c.id === activeConvId);
  const isZeroState = !loadingMessages && messages.length === 0;
  const lastAssistantMsgId = [...messages]
    .reverse()
    .find((m) => m.role === "ASSISTANT")?.id;
  const latestReportInThread =
    canvasReport ||
    [...messages].reverse().find((m) => Boolean(m.structuredReport))?.structuredReport ||
    null;

  const handleMessageFeedback = async (
    messageId: string,
    rating: "up" | "down" | null
  ) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, feedback: rating } : m))
    );
    const convId = activeConvId ?? activeConvIdRef.current;
    if (!convId || messageId.startsWith("assistant_")) return;
    try {
      await fetch(
        `/api/marketing-shield/v1/conversations/${convId}/messages/${messageId}/feedback`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rating }),
        }
      );
    } catch (err) {
      console.warn("Failed to persist message feedback", err);
    }
  };

  const handleEditMessage = async (
    messageId: string,
    newContent: string
  ): Promise<boolean> => {
    if (isStreaming) return false;
    const trimmed = newContent.trim();
    if (!trimmed) return false;

    const targetIdx = messages.findIndex((m) => m.id === messageId);
    if (targetIdx < 0) return false;

    const targetMsg = messages[targetIdx]!;
    const origAttachments = targetMsg.attachments || [];
    const origAssetIds = origAttachments
      .map((a) => a.assetId)
      .filter((id): id is string => Boolean(id));

    setMessages((prev) => prev.slice(0, targetIdx));

    return handleSendMessage(trimmed, {
      replaceFromMessageId: messageId.startsWith("user_") ? undefined : messageId,
      attachments: origAttachments.length > 0 ? origAttachments : undefined,
      attachmentAssetIds: origAssetIds.length > 0 ? origAssetIds : undefined,
    });
  };

  const handleSelectFollowUp = async (suggestion: FollowUpSuggestion) => {
    if (isStreaming) return;
    await handleSendMessage(suggestion.prompt, {
      ...(suggestion.workflow_hint ? { workflowHint: suggestion.workflow_hint } : {}),
    });
  };

  const handleOpenArtifactCanvas = (
    artifactType: ComplianceArtifactType,
    report: StructuredComplianceReport
  ) => {
    setCanvasReport(report);
    setCanvasActiveTab(artifactType);
    setShowArtifactCanvas(true);
    setShowInspector(false);
  };

  const handleOpenWorkProduct = (workProductId: string, artifactType?: string) => {
    setActiveWorkProductId(workProductId);
    setCanvasActiveTab(
      (artifactType as ComplianceArtifactType) || "compliance_document",
    );
    setShowArtifactCanvas(true);
    setShowInspector(false);
  };

  const handleCreateDocumentFromMessage = async (msg: DisplayMessage) => {
    if (creatingDocMessageId || !msg.content || msg.content.trim().length < 20) return;
    setCreatingDocMessageId(msg.id);
    setChatError(null);
    try {
      const headingMatch = msg.content.match(/^#{1,4}\s+(.+)$/m)?.[1];
      const rawTitle = (
        headingMatch?.replace(/\*+/g, "").trim() ||
        activeConversation?.title ||
        "Compliance Brief"
      ).slice(0, 180);
      const safeTitle = rawTitle.length >= 3 ? rawTitle : "Compliance Document";

      const mappedCitations = (msg.citations || []).map((c) => ({
        source_class: c.source_class,
        badge_label:
          c.badge_label ||
          (c.source_class === "VERIFIED_OFFICIAL_SOURCE"
            ? "Verified Statutory Vault"
            : c.source_class === "INTERNAL_PLAYBOOK"
              ? "Internal Playbook Rule"
              : "Live Web Intelligence"),
        ...(c.regulator ? { regulator: c.regulator } : {}),
        instrument_title: c.instrument_title || c.page_title || c.rule_title || "Compliance Source",
        ...(c.clause_reference ? { clause_reference: c.clause_reference } : {}),
        ...(c.regulatory_clause_id ? { regulatory_clause_id: c.regulatory_clause_id } : {}),
        ...(c.knowledge_rule_id ? { knowledge_rule_id: c.knowledge_rule_id } : {}),
        ...(c.live_web_retrieval_id ? { live_web_retrieval_id: c.live_web_retrieval_id } : {}),
        ...(c.retrieved_url && /^https?:\/\//i.test(c.retrieved_url)
          ? { retrieved_url: c.retrieved_url }
          : {}),
        ...(c.trust_tier ? { trust_tier: c.trust_tier } : {}),
      }));

      const currentConvId = activeConvId ?? activeConvIdRef.current;
      const res = await fetch("/api/marketing-shield/v1/work-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(currentConvId && UUID_PATTERN.test(currentConvId)
            ? { conversation_id: currentConvId }
            : {}),
          ...(UUID_PATTERN.test(msg.id) ? { message_id: msg.id } : {}),
          workflow_type: "GENERAL_COMPLIANCE_DOCUMENT",
          artifact_type: "compliance_document",
          title: safeTitle,
          jurisdiction_scope:
            searchJurisdictions && searchJurisdictions.length > 0 ? searchJurisdictions : ["NG"],
          markdown_content: msg.content,
          citations: mappedCitations,
          status: "DRAFT",
          change_summary: "Created document from Compliance Copilot response",
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success || !json.data?.work_product) {
        applyApiFailure(res.status, json, "Failed to create compliance document.");
        return;
      }

      const wp = json.data.work_product as {
        id: string;
        artifact_type: string;
        workflow_type: string;
        title: string;
        version_number: number;
      };
      const bannerRef: WorkProductBannerRef = {
        work_product_id: wp.id,
        artifact_type: wp.artifact_type,
        workflow_type: wp.workflow_type,
        title: wp.title,
        version_number: wp.version_number,
      };

      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, workProductRef: bannerRef } : m)),
      );
      setActiveWorkProductId(wp.id);
      setCanvasActiveTab((wp.artifact_type as ComplianceArtifactType) || "compliance_document");
      setShowArtifactCanvas(true);
      setShowInspector(false);
    } catch (err) {
      console.error("Failed to create document from chat message", err);
      setChatError("Unable to create document right now. Please try again.");
    } finally {
      setCreatingDocMessageId(null);
    }
  };

  if (!clerkLoaded || !isSignedIn || !orgId || !onboardingReady) {
    return <ChatWorkspaceSkeleton />;
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
        onDeleteConversation={handleDeleteConversation}
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
              {(latestReportInThread || activeWorkProductId) && (
                <button
                  type="button"
                  onClick={() => {
                    if (!showArtifactCanvas) {
                      if (latestReportInThread) {
                        setCanvasReport(latestReportInThread);
                      }
                      if (activeWorkProductId && !latestReportInThread) {
                        setCanvasActiveTab("statutory_structuring_memo");
                      }
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
                  <span>{activeWorkProductId && !latestReportInThread ? "Work Product Studio" : "Artifact Canvas"}</span>
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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-[12.5px] font-medium transition-colors cursor-pointer shadow-xs"
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
                <div className="flex items-center gap-2">
                  <Link
                    href="/onboarding"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-[12px] transition-colors"
                  >
                    <span>Create Organization</span>
                  </Link>
                  <OrganizationSwitcher
                    hidePersonal
                    afterSelectOrganizationUrl="/chat"
                    afterCreateOrganizationUrl="/chat"
                  />
                </div>
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
            <div className="w-full max-w-3xl">
              <TypewriterHeadline className="mb-6" />
            </div>
            <div className="w-full max-w-2xl">
              <ChatComposer
                onSendMessage={handleSendMessage}
                conversationId={activeConvId || undefined}
                disabled={isStreaming}
                isZeroState={true}
                products={products}
                selectedProductId={selectedProductId}
                onSelectProduct={setSelectedProductId}
                knowledgeDocs={knowledgeDocs}
                selectedKnowledgeDocId={selectedKnowledgeDocId}
                onSelectKnowledgeDoc={setSelectedKnowledgeDocId}
                liveSearchQuota={liveSearchQuota}
                enableLiveWebSearch={enableLiveWebSearch}
                onToggleLiveWebSearch={setEnableLiveWebSearch}
                searchJurisdictions={searchJurisdictions}
                onSelectJurisdictions={setSearchJurisdictions}
                workflowHint={workflowHint}
                onSelectWorkflowHint={setWorkflowHint}
                prefillText={prefillText}
                onPrefillConsumed={() => setPrefillText(null)}
              />
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
              {loadingMessages && <ThreadMessagesSkeleton />}

              {messages.map((msg) => (
                <AdaptiveMessageRenderer
                  key={msg.clientKey || msg.id}
                  messageId={msg.id}
                  role={msg.role}
                  content={msg.content}
                  citations={msg.citations}
                  followUps={msg.followUps}
                  feedback={msg.feedback}
                  isLatestAssistantMessage={
                    msg.role === "ASSISTANT" && msg.id === lastAssistantMsgId
                  }
                  canEdit={msg.role === "USER" && !isStreaming}
                  planSteps={msg.planSteps}
                  structuredReport={msg.structuredReport}
                  attachments={msg.attachments}
                  searchTracks={msg.searchTracks}
                  searchTraces={msg.searchTraces}
                  thinkingStartedAt={msg.thinkingStartedAt}
                  thinkingDurationMs={msg.thinkingDurationMs}
                  entitlementBlocked={msg.entitlementBlocked}
                  workProductRef={msg.workProductRef}
                  isStreaming={msg.isStreaming}
                  onInspectEvidence={(clauseId) => setInspectClauseId(clauseId)}
                  onOpenSources={(cits) => setSourcesDrawerCitations(cits)}
                  onSelectFollowUp={(suggestion) => {
                    void handleSelectFollowUp(suggestion);
                  }}
                  onFeedback={(rating) => {
                    void handleMessageFeedback(msg.id, rating);
                  }}
                  onEditMessage={handleEditMessage}
                  onOpenArtifactCanvas={handleOpenArtifactCanvas}
                  onOpenWorkProduct={handleOpenWorkProduct}
                  onCreateDocument={
                    msg.role === "ASSISTANT" && !msg.workProductRef
                      ? () => handleCreateDocumentFromMessage(msg)
                      : undefined
                  }
                  isCreatingDocument={creatingDocMessageId === msg.id}
                  onApplyCompliantRewrite={handleApplyCompliantRewrite}
                  onApproveAndSealDossier={handleApproveAndSealDossier}
                />
              ))}

              <div ref={messagesEndRef} />
            </div>

            <footer className="px-4 sm:px-6 pb-4 pt-2 bg-white shrink-0">
              <ChatComposer
                onSendMessage={handleSendMessage}
                conversationId={activeConvId || undefined}
                disabled={isStreaming}
                isZeroState={false}
                products={products}
                selectedProductId={selectedProductId}
                onSelectProduct={setSelectedProductId}
                knowledgeDocs={knowledgeDocs}
                selectedKnowledgeDocId={selectedKnowledgeDocId}
                onSelectKnowledgeDoc={setSelectedKnowledgeDocId}
                liveSearchQuota={liveSearchQuota}
                enableLiveWebSearch={enableLiveWebSearch}
                onToggleLiveWebSearch={setEnableLiveWebSearch}
                searchJurisdictions={searchJurisdictions}
                onSelectJurisdictions={setSearchJurisdictions}
                workflowHint={workflowHint}
                onSelectWorkflowHint={setWorkflowHint}
                prefillText={prefillText}
                onPrefillConsumed={() => setPrefillText(null)}
                wideRail={false}
              />
            </footer>
          </>
        )}
      </div>

      {/* 3. External Slide-Over Right-Hand Artifact Canvas Drawer (Lazy Loaded) */}
      {(showArtifactCanvas && Boolean(latestReportInThread || activeWorkProductId)) && (
        <ArtifactCanvasDrawer
          isOpen={true}
          activeTab={canvasActiveTab}
          onSelectTab={setCanvasActiveTab}
          onClose={() => setShowArtifactCanvas(false)}
          report={latestReportInThread}
          workProductId={activeWorkProductId}
          onInspectEvidence={(clauseId) => setInspectClauseId(clauseId)}
          onApplyCompliantRewrite={handleApplyCompliantRewrite}
          onApproveAndSealDossier={handleApproveAndSealDossier}
        />
      )}

      {/* 4. Split-Screen Campaign Studio (Lazy Loaded) */}
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

      {/* 5. Slide-Over Sources Drawer (Lazy Loaded) */}
      {Boolean(sourcesDrawerCitations) && (
        <SourcesDrawer
          citations={sourcesDrawerCitations || []}
          isOpen={true}
          onClose={() => setSourcesDrawerCitations(null)}
          onInspectEvidence={(clauseId) => {
            setSourcesDrawerCitations(null);
            setInspectClauseId(clauseId);
          }}
        />
      )}

      {/* 6. Slide-Over Statutory Provision Drawer (Lazy Loaded) */}
      {Boolean(inspectClauseId) && (
        <EvidenceDrawer
          clauseId={inspectClauseId}
          isOpen={true}
          onClose={() => setInspectClauseId(null)}
        />
      )}
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<ChatWorkspaceSkeleton />}>
      <ChatWorkspaceContent />
    </Suspense>
  );
}
