"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  Database,
  ExternalLink,
  FileText,
  Globe,
  Loader2,
  Lock,
  PlusCircle,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { WorkspaceShell } from "@/components/shell/WorkspaceShell";
import { useWorkspace } from "@/components/shell/WorkspaceProvider";
import {
  ChatWorkspaceSkeleton,
  CogentPulseIndicator,
} from "@/components/shell/WorkspaceSkeletons";
import { EvidenceDrawer } from "@/components/chat/EvidenceDrawer";
import { extractApiError } from "@/lib/api-client";
import type {
  CommandCenterHit,
  LiveSearchEvidenceItem,
  SearchJurisdiction,
  SearchQuotaSnapshot,
  VaultSearchClauseHit,
} from "@/contracts/search.contracts";
import type { UnifiedSearchResponse } from "@/modules/live-web-intelligence/unified-search.service";

const JURISDICTIONS: Array<{ code: SearchJurisdiction; label: string; crossBorder: boolean }> = [
  { code: "NG", label: "Nigeria (NG)", crossBorder: false },
  { code: "KE", label: "Kenya (KE)", crossBorder: true },
  { code: "GH", label: "Ghana (GH)", crossBorder: true },
  { code: "ZA", label: "South Africa (ZA)", crossBorder: true },
  { code: "RW", label: "Rwanda (RW)", crossBorder: true },
  { code: "EG", label: "Egypt (EG)", crossBorder: true },
  { code: "AFRICA_REGIONAL", label: "Pan-Africa", crossBorder: true },
];

const SEARCH_INTENTS: Array<{
  value: "REGULATORY_CIRCULAR" | "LEGAL_ANALYSIS" | "NEWS_ENFORCEMENT" | "CROSS_BORDER";
  label: string;
}> = [
  { value: "REGULATORY_CIRCULAR", label: "Regulatory Circulars (.gov)" },
  { value: "LEGAL_ANALYSIS", label: "Law Firm Commentary" },
  { value: "NEWS_ENFORCEMENT", label: "Enforcement & Press" },
  { value: "CROSS_BORDER", label: "Cross-Border Matrix" },
];

const REGULATOR_OPTIONS = ["CBN", "SEC", "NDPC", "FCCPC", "NFIU", "ARCON", "CBK", "BOG", "SARB", "BNR", "CBE"];

function inferRegulatorAcronym(item: LiveSearchEvidenceItem): string {
  const hay = `${item.domain} ${item.page_title} ${item.snippet_content}`.toUpperCase();
  if (hay.includes("CBN") || item.domain.includes("cbn.gov.ng")) return "CBN";
  if (hay.includes("SEC") || item.domain.includes("sec.gov.ng")) return "SEC";
  if (hay.includes("NDPC") || item.domain.includes("ndpc.gov.ng")) return "NDPC";
  if (hay.includes("FCCPC") || item.domain.includes("fccpc.gov.ng")) return "FCCPC";
  if (hay.includes("NFIU") || item.domain.includes("nfiu.gov.ng")) return "NFIU";
  if (hay.includes("ARCON")) return "ARCON";
  if (item.jurisdiction_code === "KE" || item.domain.includes("centralbank.go.ke")) return "CBK";
  if (item.jurisdiction_code === "GH" || item.domain.includes("bog.gov.gh")) return "BOG";
  if (item.jurisdiction_code === "ZA" || item.domain.includes("resbank.co.za")) return "SARB";
  if (item.jurisdiction_code === "RW" || item.domain.includes("bnr.rw")) return "BNR";
  if (item.jurisdiction_code === "EG" || item.domain.includes("cbe.org.eg")) return "CBE";
  return "CBN";
}

function SearchWorkbenchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const { isLoaded: clerkLoaded, isSignedIn, orgId } = useAuth();
  const workspace = useWorkspace();
  const [localOnboardingReady, setLocalOnboardingReady] = useState(false);
  const onboardingReady = workspace?.onboardingCompleted === true || localOnboardingReady;

  const [query, setQuery] = useState(initialQuery);
  const [enableLiveWeb, setEnableLiveWeb] = useState(false);
  const [selectedJurisdictions, setSelectedJurisdictions] = useState<SearchJurisdiction[]>(["NG"]);
  const [searchIntent, setSearchIntent] = useState<
    "REGULATORY_CIRCULAR" | "LEGAL_ANALYSIS" | "NEWS_ENFORCEMENT" | "CROSS_BORDER"
  >("REGULATORY_CIRCULAR");
  const [dateFrom, setDateFrom] = useState("");
  const [localQuota, setLocalQuota] = useState<SearchQuotaSnapshot | null>(null);
  const quota = workspace ? workspace.searchQuota : localQuota;
  const setQuota = workspace ? workspace.setSearchQuota : setLocalQuota;

  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [result, setResult] = useState<UnifiedSearchResponse | null>(null);
  const [inspectClauseId, setInspectClauseId] = useState<string | null>(null);

  // Per-item Vault promotion drawer/popover state
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [promoteDraft, setPromoteDraft] = useState<{
    regulator_acronym: string;
    instrument_title: string;
    jurisdiction_code: string;
  } | null>(null);
  const [promoteSubmittingId, setPromoteSubmittingId] = useState<string | null>(null);
  const [promotedMap, setPromotedMap] = useState<
    Record<string, { instrument_id: string; ripple_alerts_count: number; already_promoted?: boolean }>
  >({});
  const [promoteError, setPromoteError] = useState<string | null>(null);

  const loadQuota = useCallback(async () => {
    if (workspace) {
      await workspace.refreshSearchQuota();
      return;
    }
    try {
      const res = await fetch("/api/marketing-shield/v1/search/quota", { cache: "no-store" });
      const json = await res.json().catch(() => null);
      const snap = (json?.data?.quota || json?.data) as SearchQuotaSnapshot | undefined;
      if (res.ok && json?.success && snap && typeof snap.live_web_allowed === "boolean") {
        setQuota(snap);
      }
    } catch {
      // Non-blocking
    }
  }, [workspace, setQuota]);

  const didAutoEnableRef = React.useRef(false);
  useEffect(() => {
    if (!quota || didAutoEnableRef.current) return;
    // Paid plans auto-enable live web search; trial users stay opt-in to deliberately spend their 3 searches
    if (quota.plan_slug !== "evaluation" && quota.live_web_allowed && quota.remaining !== 0) {
      didAutoEnableRef.current = true;
      setEnableLiveWeb(true);
    }
  }, [quota]);

  useEffect(() => {
    if (!clerkLoaded) return;
    if (!isSignedIn) {
      router.replace("/sign-in?redirect_url=/search");
      return;
    }
    if (!orgId) {
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
          router.replace("/sign-in?redirect_url=/search");
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
        if (!cancelled) setLocalOnboardingReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [clerkLoaded, isSignedIn, orgId, workspace, workspace?.onboardingCompleted, router]);

  useEffect(() => {
    if (!onboardingReady || workspace) return;
    void loadQuota();
  }, [onboardingReady, workspace, loadQuota]);

  const executeSearch = useCallback(
    async (overrideQuery?: string) => {
      const trimmed = (overrideQuery ?? query).trim();
      if (trimmed.length < 2) {
        setSearchError("Enter at least 2 characters to search.");
        return;
      }
      setSearchError(null);
      setSearching(true);
      try {
        const res = await fetch("/api/marketing-shield/v1/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: trimmed,
            mode: enableLiveWeb ? "HYBRID_LIVE_WEB" : "VAULT_ONLY",
            enable_live_web: enableLiveWeb,
            jurisdictions: selectedJurisdictions,
            search_intent: searchIntent,
            include_news: true,
            ...(dateFrom ? { date_from: dateFrom } : {}),
            limit: 12,
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.success || !json.data) {
          const parsed = extractApiError(res.status, json, "Unable to execute search.");
          setSearchError(parsed.message);
          return;
        }
        const payload = json.data as UnifiedSearchResponse;
        setResult(payload);
        if (payload.quota) {
          setQuota(payload.quota);
          if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("cogent:search-quota-updated"));
          }
        }
      } catch {
        setSearchError("Network error while executing regulatory search.");
      } finally {
        setSearching(false);
      }
    },
    [query, enableLiveWeb, selectedJurisdictions, searchIntent, dateFrom],
  );

  useEffect(() => {
    if (onboardingReady && initialQuery.trim().length >= 2 && !result) {
      void executeSearch(initialQuery);
    }
    // Run only once upon initial onboarding hydration when ?q= is present
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboardingReady]);

  const toggleJurisdiction = (code: SearchJurisdiction, isCrossBorder: boolean) => {
    if (isCrossBorder && quota && !quota.cross_border_allowed) {
      // Allow selection only if user wants to preview, or keep blocked cleanly on backend
    }
    setSelectedJurisdictions((prev) => {
      const exists = prev.includes(code);
      if (exists) {
        if (prev.length === 1) return prev;
        return prev.filter((c) => c !== code);
      }
      if (quota && !quota.cross_border_allowed && isCrossBorder) {
        return [...prev, code];
      }
      return [...prev, code];
    });
  };

  const openPromoteForm = (item: LiveSearchEvidenceItem) => {
    setPromoteError(null);
    setPromotingId(item.live_web_retrieval_id);
    setPromoteDraft({
      regulator_acronym: inferRegulatorAcronym(item),
      instrument_title: item.page_title.slice(0, 280),
      jurisdiction_code: item.jurisdiction_code || "NG",
    });
  };

  const handleConfirmPromote = async (item: LiveSearchEvidenceItem) => {
    if (!promoteDraft) return;
    setPromoteError(null);
    setPromoteSubmittingId(item.live_web_retrieval_id);
    try {
      const res = await fetch("/api/marketing-shield/v1/live-web/promote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          live_web_retrieval_id: item.live_web_retrieval_id,
          regulator_acronym: promoteDraft.regulator_acronym,
          instrument_title: promoteDraft.instrument_title,
          jurisdiction_code: promoteDraft.jurisdiction_code || "NG",
          trigger_ripple_scan: true,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success || !json.data) {
        const parsed = extractApiError(res.status, json, "Failed to promote source to Vault.");
        setPromoteError(parsed.message);
        return;
      }
      setPromotedMap((prev) => ({
        ...prev,
        [item.live_web_retrieval_id]: {
          instrument_id: String(json.data.instrument_id),
          ripple_alerts_count: Number(json.data.ripple_alerts_count || 0),
          already_promoted: Boolean(json.data.already_promoted),
        },
      }));
      setPromotingId(null);
      setPromoteDraft(null);
    } catch {
      setPromoteError("Network error while promoting live regulatory update.");
    } finally {
      setPromoteSubmittingId(null);
    }
  };

  const buildChatHandoffHref = () => {
    const params = new URLSearchParams();
    if (query.trim()) {
      params.set("query", query.trim());
    }
    params.set(
      "workflow",
      selectedJurisdictions.some((j) => j !== "NG")
        ? "CROSS_BORDER_COMPARISON"
        : "PRODUCT_STRUCTURING_MEMO",
    );
    if (enableLiveWeb && quota?.live_web_allowed) {
      params.set("liveSearch", "1");
    }
    return `/chat?${params.toString()}`;
  };

  if (!clerkLoaded || !isSignedIn || !orgId || !onboardingReady) {
    return <ChatWorkspaceSkeleton />;
  }

  const vaultClauses: VaultSearchClauseHit[] = result?.vault_clauses || [];
  const workspaceHits: CommandCenterHit[] = result?.workspace_hits || [];
  const liveResults: LiveSearchEvidenceItem[] = result?.live_web_results || [];

  return (
    <WorkspaceShell
      section="Regulatory Intelligence"
      title="Africa Regulatory Search"
      rightActions={
        <div className="flex items-center gap-2">
          {quota && (
            <div className="hidden sm:inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-[11.5px] font-mono text-zinc-700">
              <Globe className="h-3.5 w-3.5 text-zinc-500" />
              <span>
                {quota.standard_fallback_available
                  ? "Live Search: Standard"
                  : !quota.live_web_allowed
                    ? "Live Search: Trial Locked"
                    : quota.monthly_limit === -1
                      ? `Live Search: ${quota.used_this_month} (Unlimited)`
                      : `Quota: ${quota.used_this_month}/${quota.monthly_limit}`}
              </span>
            </div>
          )}
          <Link
            href={buildChatHandoffHref()}
            className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 px-3 py-1.5 text-[12px] font-medium text-white transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Synthesize into Memo</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      }
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Search Control Card */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void executeSearch();
          }}
          className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-5 shadow-xs space-y-4"
        >
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="h-4 w-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search CBN circulars (e.g. BSD/DIR/GEN/LAB...), SEC virtual asset rules, CBK/BoG/SARB guidelines, or enforcement alerts..."
                className="w-full rounded-lg border border-zinc-300 bg-white pl-10 pr-4 py-2.5 text-[13.5px] text-zinc-950 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900"
              />
            </div>

            <button
              type="submit"
              disabled={searching}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] px-5 py-2.5 text-[13px] font-medium text-white transition-colors cursor-pointer disabled:opacity-60 shrink-0"
            >
              {searching ? (
                <CogentPulseIndicator size="xs" tone="light" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              <span>{searching ? "Searching..." : "Run Regulatory Search"}</span>
            </button>
          </div>

          {/* Controls Row: Live Toggle, Jurisdictions, Intent, Date From */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-zinc-100">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setEnableLiveWeb((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[12px] font-medium transition-colors cursor-pointer ${
                  enableLiveWeb
                    ? "bg-zinc-900 text-white border-zinc-900"
                    : "bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100"
                }`}
              >
                {!quota?.live_web_allowed ? (
                  <Lock className="h-3.5 w-3.5" />
                ) : (
                  <Globe className="h-3.5 w-3.5" />
                )}
                <span>Live Nigeria &amp; Pan-Africa Web Search</span>
              </button>

              <div className="flex flex-wrap items-center gap-1">
                {JURISDICTIONS.map((jur) => {
                  const active = selectedJurisdictions.includes(jur.code);
                  const locked = Boolean(jur.crossBorder && quota && !quota.cross_border_allowed);
                  return (
                    <button
                      key={jur.code}
                      type="button"
                      onClick={() => toggleJurisdiction(jur.code, jur.crossBorder)}
                      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-mono transition-colors cursor-pointer ${
                        active
                          ? "bg-zinc-900 text-white border-zinc-900"
                          : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"
                      }`}
                      title={
                        locked
                          ? `${jur.label} requires Scale plan for cross-border web search`
                          : jur.label
                      }
                    >
                      {locked && <Lock className="h-2.5 w-2.5 opacity-70" />}
                      <span>{jur.code === "AFRICA_REGIONAL" ? "AFRICA" : jur.code}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={searchIntent}
                onChange={(e) =>
                  setSearchIntent(
                    e.target.value as
                      | "REGULATORY_CIRCULAR"
                      | "LEGAL_ANALYSIS"
                      | "NEWS_ENFORCEMENT"
                      | "CROSS_BORDER",
                  )
                }
                aria-label="Search Intent"
                className="rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-[12px] text-zinc-800 focus:outline-none focus:border-zinc-900"
              >
                {SEARCH_INTENTS.map((intent) => (
                  <option key={intent.value} value={intent.value}>
                    {intent.label}
                  </option>
                ))}
              </select>

              <div className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2 py-1 text-[12px] text-zinc-600">
                <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  aria-label="Date from"
                  className="bg-transparent text-[12px] text-zinc-800 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {searchError && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12.5px] text-rose-800">
              {searchError}
            </div>
          )}
        </form>

        {/* Empty Initial State */}
        {!result && !searching && (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center space-y-3">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-700">
              <Database className="h-5 w-5" />
            </div>
            <h2 className="font-serif text-[20px] text-zinc-950">
              Unified Vault + Live African Open-Web &amp; Regulator Search
            </h2>
            <p className="max-w-xl mx-auto text-[13px] text-zinc-500">
              Queries verified statutory provisions and your workspace playbooks alongside real-time regulatory circulars, law-firm commentary, and financial enforcement news across Nigeria and Africa.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              {[
                "CBN Automated AML/CFT Baseline Standards 2025",
                "NDPC 72-hour personal data breach notification",
                "Compare CBN PSSP vs CBK Kenya PSP capital rules",
              ].map((sample) => (
                <button
                  key={sample}
                  type="button"
                  onClick={() => {
                    setQuery(sample);
                    void executeSearch(sample);
                  }}
                  className="rounded-full border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 px-3 py-1.5 text-[12px] text-zinc-700 transition-colors cursor-pointer"
                >
                  {sample}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Dual Split Results Grid */}
        {result && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-zinc-500 font-mono">
              <span>
                Query: &ldquo;{result.query}&rdquo; • {result.latency_ms}ms
              </span>
              <span>
                Vault: {vaultClauses.length} clauses • Workspace: {workspaceHits.length} hits • Live Web:{" "}
                {result.live_web_status}
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
              {/* LEFT COLUMN: Verified Statutory Vault & Workspace */}
              <section className="space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-700" />
                    <h2 className="text-[13.5px] font-semibold text-zinc-950">
                      Verified Statutory Vault &amp; Workspace
                    </h2>
                  </div>
                  <Link
                    href={buildChatHandoffHref()}
                    className="inline-flex items-center gap-1 text-[12px] font-medium text-zinc-800 hover:underline"
                  >
                    <span>Synthesize into Memo</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                {vaultClauses.length === 0 && workspaceHits.length === 0 ? (
                  <div className="rounded-xl border border-zinc-200 bg-white p-5 text-[12.5px] text-zinc-500">
                    No direct Vault or Workspace matches found for this query. Try enabling Live Web Search or broadening keywords.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {vaultClauses.map((clause) => (
                      <button
                        key={clause.clause_id}
                        type="button"
                        onClick={() => setInspectClauseId(clause.clause_id)}
                        className="w-full text-left rounded-xl border border-zinc-200 bg-white hover:border-zinc-400 p-4 space-y-2 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-50 border border-emerald-200 px-2 py-0.5 font-mono text-[10.5px] font-semibold text-emerald-800">
                            {clause.regulator} • {clause.clause_reference}
                          </span>
                          <span className="font-mono text-[10.5px] text-zinc-400">
                            Score {(clause.similarity_score * 100).toFixed(0)}%
                          </span>
                        </div>
                        <h3 className="text-[13px] font-semibold text-zinc-950">
                          {clause.instrument_title}
                        </h3>
                        <p className="text-[12.5px] text-zinc-600 line-clamp-3 leading-relaxed">
                          {clause.verbatim_excerpt}
                        </p>
                      </button>
                    ))}

                    {workspaceHits.map((hit) => (
                      <Link
                        key={`${hit.entity_type}_${hit.entity_id}`}
                        href={hit.route_href}
                        className="block rounded-xl border border-zinc-200 bg-zinc-50/50 hover:bg-zinc-50 hover:border-zinc-400 p-3.5 space-y-1 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
                            {hit.entity_type === "WORK_PRODUCT" ? (
                              <FileText className="h-3 w-3" />
                            ) : (
                              <BookOpen className="h-3 w-3" />
                            )}
                            <span>{hit.entity_type.replace(/_/g, " ")}</span>
                          </span>
                          <span className="font-mono text-[10.5px] text-zinc-400">
                            {hit.subtitle}
                          </span>
                        </div>
                        <p className="text-[13px] font-semibold text-zinc-950">{hit.title}</p>
                        {hit.snippet && (
                          <p className="text-[12px] text-zinc-600 line-clamp-2">{hit.snippet}</p>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </section>

              {/* RIGHT COLUMN: Live Nigeria & Pan-Africa Web Intelligence */}
              <section className="space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-zinc-900" />
                    <h2 className="text-[13.5px] font-semibold text-zinc-950">
                      Live Nigeria &amp; Pan-Africa Web Intelligence
                    </h2>
                  </div>
                  <span className="font-mono text-[10.5px] uppercase tracking-wider text-zinc-500">
                    Real-Time Web
                  </span>
                </div>

                {result.live_web_status === "ENTITLEMENT_BLOCKED" ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-5 space-y-3">
                    <div className="flex items-start gap-2.5">
                      <Lock className="h-4 w-4 text-amber-800 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <h3 className="text-[13.5px] font-semibold text-amber-950">
                          Upgrade to Unlock Live Regulatory Search
                        </h3>
                        <p className="text-[12.5px] text-amber-900 leading-relaxed">
                          {result.upgrade_required_reason ||
                            "Real-time Nigerian & Pan-African Live Web Search is available on Growth ($149/mo) and Scale ($449/mo) plans."}
                        </p>
                      </div>
                    </div>
                    <Link
                      href={`/settings/billing?upgrade=${
                        selectedJurisdictions.some((j) => j !== "NG") ? "scale" : "growth"
                      }`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 px-3.5 py-2 text-[12px] font-medium text-white transition-colors"
                    >
                      <span>View Plans &amp; Upgrade</span>
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                ) : result.live_web_status === "SKIPPED" ? (
                  <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-2">
                    <p className="text-[12.5px] text-zinc-600">
                      Live Web Search was off for this query. Enable the{" "}
                      <span className="font-medium text-zinc-900">
                        Live Nigeria &amp; Pan-Africa Web Search
                      </span>{" "}
                      toggle above and re-run to pull real-time CBN/SEC/CBK/BoG/SARB updates.
                    </p>
                  </div>
                ) : liveResults.length === 0 ? (
                  <div className="rounded-xl border border-zinc-200 bg-white p-5 text-[12.5px] text-zinc-500">
                    No matching live web sources returned for this query. Try adjusting jurisdictions or keywords.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {result.upgrade_required_reason && (
                      <div className="rounded-lg border border-blue-200 bg-blue-50/60 px-3.5 py-2.5 text-[12px] text-[#1E3A8A] flex items-center justify-between gap-3">
                        <span>{result.upgrade_required_reason}</span>
                        <Link
                          href="/settings/billing?upgrade=growth"
                          className="font-semibold underline shrink-0"
                        >
                          Upgrade
                        </Link>
                      </div>
                    )}
                    {promoteError && (
                      <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-800">
                        {promoteError}
                      </div>
                    )}

                    {liveResults.map((item) => {
                      const isOfficial = item.trust_tier === "OFFICIAL_REGULATOR_WEB";
                      const promotedInfo = promotedMap[item.live_web_retrieval_id];
                      const isFormOpen = promotingId === item.live_web_retrieval_id;

                      return (
                        <div
                          key={item.live_web_retrieval_id}
                          className="rounded-xl border border-zinc-200 bg-white p-4 space-y-2.5"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span
                                className={`inline-flex items-center rounded border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ${
                                  isOfficial
                                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                    : "bg-zinc-100 text-zinc-700 border-zinc-200"
                                }`}
                              >
                                {isOfficial
                                  ? "Official Regulator Source"
                                  : item.trust_tier === "VERIFIED_AFRICAN_LEGAL_MEDIA"
                                    ? "Verified Legal & Financial Press"
                                    : "General Live Web"}
                              </span>
                              <span className="rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-mono text-[10px] text-zinc-600">
                                {item.jurisdiction_code}
                              </span>
                              {item.is_pdf && (
                                <span className="rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-zinc-700">
                                  PDF
                                </span>
                              )}
                            </div>

                            <span className="font-mono text-[10.5px] text-zinc-400">
                              {item.domain}
                            </span>
                          </div>

                          <h3 className="text-[13.5px] font-semibold text-zinc-950 leading-snug">
                            {item.page_title}
                          </h3>

                          <p className="text-[12.5px] text-zinc-600 leading-relaxed line-clamp-3">
                            {item.highlights?.[0] || item.snippet_content}
                          </p>

                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                            <a
                              href={item.retrieved_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[12px] font-medium text-zinc-700 hover:text-zinc-950 hover:underline"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              <span>Open Source URL</span>
                            </a>

                            {promotedInfo ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[11.5px] font-medium text-emerald-800">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>
                                  {promotedInfo.already_promoted
                                    ? "Already in Vault"
                                    : `Promoted • ${promotedInfo.ripple_alerts_count} Ripple Alert(s)`}
                                </span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  isFormOpen ? setPromotingId(null) : openPromoteForm(item)
                                }
                                className="inline-flex items-center gap-1 rounded-md border border-zinc-300 bg-white hover:bg-zinc-50 px-2.5 py-1 text-[11.5px] font-medium text-zinc-900 transition-colors cursor-pointer"
                              >
                                <PlusCircle className="h-3.5 w-3.5" />
                                <span>Promote to Vault</span>
                              </button>
                            )}
                          </div>

                          {isFormOpen && promoteDraft && (
                            <div className="mt-2 rounded-lg border border-zinc-200 bg-zinc-50/80 p-3 space-y-2.5">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <div>
                                  <label className="block font-mono text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
                                    Regulator
                                  </label>
                                  <select
                                    value={promoteDraft.regulator_acronym}
                                    onChange={(e) =>
                                      setPromoteDraft((d) =>
                                        d ? { ...d, regulator_acronym: e.target.value } : d,
                                      )
                                    }
                                    className="w-full rounded border border-zinc-300 bg-white px-2 py-1.5 text-[12px] text-zinc-900"
                                  >
                                    {REGULATOR_OPTIONS.map((reg) => (
                                      <option key={reg} value={reg}>
                                        {reg}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="block font-mono text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
                                    Jurisdiction
                                  </label>
                                  <input
                                    type="text"
                                    value={promoteDraft.jurisdiction_code}
                                    onChange={(e) =>
                                      setPromoteDraft((d) =>
                                        d ? { ...d, jurisdiction_code: e.target.value } : d,
                                      )
                                    }
                                    className="w-full rounded border border-zinc-300 bg-white px-2 py-1.5 text-[12px] text-zinc-900"
                                  />
                                </div>
                                <div className="sm:col-span-3">
                                  <label className="block font-mono text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
                                    Official Instrument Title
                                  </label>
                                  <input
                                    type="text"
                                    value={promoteDraft.instrument_title}
                                    onChange={(e) =>
                                      setPromoteDraft((d) =>
                                        d ? { ...d, instrument_title: e.target.value } : d,
                                      )
                                    }
                                    className="w-full rounded border border-zinc-300 bg-white px-2 py-1.5 text-[12px] text-zinc-900"
                                  />
                                </div>
                              </div>

                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setPromotingId(null)}
                                  className="rounded px-2.5 py-1 text-[11.5px] text-zinc-600 hover:bg-zinc-200/70 cursor-pointer"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  disabled={promoteSubmittingId === item.live_web_retrieval_id}
                                  onClick={() => handleConfirmPromote(item)}
                                  className="inline-flex items-center gap-1 rounded bg-zinc-900 hover:bg-zinc-800 px-3 py-1 text-[11.5px] font-medium text-white cursor-pointer disabled:opacity-60"
                                >
                                  {promoteSubmittingId === item.live_web_retrieval_id && (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  )}
                                  <span>Promote &amp; Trigger Ripple Scan</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          </div>
        )}
      </div>

      <EvidenceDrawer
        clauseId={inspectClauseId}
        isOpen={Boolean(inspectClauseId)}
        onClose={() => setInspectClauseId(null)}
      />
    </WorkspaceShell>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<ChatWorkspaceSkeleton />}>
      <SearchWorkbenchContent />
    </Suspense>
  );
}
