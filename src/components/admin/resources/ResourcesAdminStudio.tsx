"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Database,
  ExternalLink,
  FileEdit,
  FileText,
  Film,
  HardDrive,
  HelpCircle,
  Loader2,
  Megaphone,
  Newspaper,
  Pencil,
  Plus,
  Search,
  Share2,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import {
  CONTENT_PILLARS,
  CONTENT_PILLAR_META,
  RESOURCE_CATEGORIES,
  RESOURCE_CATEGORY_META,
  WORKFLOW_STAGES,
  WORKFLOW_STAGE_META,
  type ContentPillar,
  type ResourceCategory,
  type ResourcePost,
  type ResourceStatus,
  type WorkflowStage,
  normalizeVideoSource,
  slugifyTitle,
} from "@/contracts/resources.contracts";
import {
  CTA_PRESETS,
  PLAYBOOK_TEMPLATES,
  calculatePriorityScore,
  computePillarMix,
  evaluateResourceSeoAndQa,
  isPostRefreshDue,
} from "@/modules/resources/resources-playbook.helpers";
import { ResourceRichEditor } from "./ResourceRichEditor";
import { ResourceBriefPanel } from "./ResourceBriefPanel";
import { ResourceQaChecklistPanel } from "./ResourceQaChecklistPanel";
import { ResourceAtomizationPanel } from "./ResourceAtomizationPanel";
import {
  buildPayloadFromForm,
  createEmptyForm,
  formFromPost,
  type EditorFormState,
} from "./editor-types";
import { CogentLogo } from "@/components/brand/CogentLogo";

interface ResourcesAdminStudioProps {
  initialNeonConfigured: boolean;
  initialNeonConfigError?: string | null;
  initialR2Configured: boolean;
}

const SUGGESTED_TAGS = [
  "CBN",
  "SEC",
  "NDPC",
  "FCCPC",
  "NFIU",
  "ARCON",
  "AML",
  "Payments",
  "Digital Lending",
];

const CATEGORY_ICONS: Record<ResourceCategory, React.ElementType> = {
  insights: Newspaper,
  videos: Film,
  reports: FileText,
  events: Calendar,
};

type EditorTab = "brief" | "write" | "distribute";
type StageFilter = "all" | WorkflowStage | "refresh_due";

export function ResourcesAdminStudio({
  initialNeonConfigured,
  initialNeonConfigError = null,
  initialR2Configured,
}: ResourcesAdminStudioProps) {
  const [neonConfigured, setNeonConfigured] = useState(initialNeonConfigured);
  const [neonConfigError, setNeonConfigError] = useState<string | null>(initialNeonConfigError);
  const [r2Configured, setR2Configured] = useState(initialR2Configured);
  const [posts, setPosts] = useState<ResourcePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [mode, setMode] = useState<"list" | "editor">("list");
  const [editorTab, setEditorTab] = useState<EditorTab>("write");
  const [templateRevision, setTemplateRevision] = useState(0);

  const [filterCategory, setFilterCategory] = useState<ResourceCategory | "all">("all");
  const [filterStage, setFilterStage] = useState<StageFilter>("all");
  const [filterPillar, setFilterPillar] = useState<ContentPillar | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [form, setForm] = useState<EditorFormState>(() => createEmptyForm());
  const [saving, setSaving] = useState(false);
  const [saveBanner, setSaveBanner] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingReport, setUploadingReport] = useState(false);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const reportInputRef = useRef<HTMLInputElement>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/marketing-shield/v1/admin/resources", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load resources");
      }
      setNeonConfigured(Boolean(data.neonConfigured));
      setNeonConfigError(typeof data.neonConfigError === "string" ? data.neonConfigError : null);
      setR2Configured(Boolean(data.r2Configured));
      setPosts(Array.isArray(data.posts) ? data.posts : []);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load resources");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const uploadToResourcesR2 = async (file: File): Promise<string> => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/marketing-shield/v1/admin/resources/upload", {
      method: "POST",
      body: fd,
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Upload failed");
    }
    return data.publicUrl as string;
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    setSaveBanner(null);
    try {
      const url = await uploadToResourcesR2(file);
      setForm((prev) => ({ ...prev, coverImageUrl: url }));
    } catch (err) {
      setSaveBanner({
        type: "err",
        text: err instanceof Error ? err.message : "Cover upload failed.",
      });
    } finally {
      setUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  };

  const handleReportUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingReport(true);
    setSaveBanner(null);
    try {
      const url = await uploadToResourcesR2(file);
      const mb = Math.max(0.1, file.size / (1024 * 1024)).toFixed(1);
      setForm((prev) => ({
        ...prev,
        reportFileUrl: url,
        reportFileLabel: prev.reportFileLabel || `PDF · ${mb} MB`,
      }));
    } catch (err) {
      setSaveBanner({
        type: "err",
        text: err instanceof Error ? err.message : "PDF upload failed.",
      });
    } finally {
      setUploadingReport(false);
      if (reportInputRef.current) reportInputRef.current.value = "";
    }
  };

  const applyPillarTemplate = (pillar: ContentPillar, confirmOverwrite = true) => {
    const tpl = PLAYBOOK_TEMPLATES[pillar];
    if (
      confirmOverwrite &&
      form.bodyMarkdown.trim().length > 40 &&
      !window.confirm(
        `Replace the current article draft with the "${tpl.name}" template?`,
      )
    ) {
      return;
    }

    setForm((prev) => ({
      ...prev,
      contentPillar: pillar,
      targetPersona: prev.targetPersona || tpl.defaultPersona,
      workflowTrack: prev.workflowTrack || tpl.defaultTrack,
      targetWordCount: prev.targetWordCount || String(tpl.defaultTargetWordCount),
      regulators: prev.regulators.length > 0 ? prev.regulators : tpl.defaultRegulators,
      bodyMarkdown: tpl.bodyMarkdown,
      midArticleCtaEnabled: true,
      midArticleCtaEyebrow: tpl.defaultCta.eyebrow || "COGENT COMPLIANCE OS",
      midArticleCtaHeadline: tpl.defaultCta.headline,
      midArticleCtaDescription: tpl.defaultCta.description,
      midArticleCtaButtonLabel: tpl.defaultCta.buttonLabel,
      midArticleCtaButtonUrl: tpl.defaultCta.buttonUrl,
      faqItems: prev.faqItems.length > 0 ? prev.faqItems : tpl.starterFaqs,
      showLegalDisclaimer: true,
    }));
    setTemplateRevision((r) => r + 1);
    setEditorTab("write");
    setSaveBanner({
      type: "ok",
      text: `Loaded "${tpl.name}" with canonical /resources links, starter FAQs, and contextual CTA.`,
    });
  };

  const openNewPost = (category: ResourceCategory = "insights", presetPillar?: ContentPillar) => {
    const base = createEmptyForm(category);
    if (presetPillar) {
      const tpl = PLAYBOOK_TEMPLATES[presetPillar];
      base.contentPillar = presetPillar;
      base.targetPersona = tpl.defaultPersona;
      base.workflowTrack = tpl.defaultTrack;
      base.targetWordCount = String(tpl.defaultTargetWordCount);
      base.regulators = [...tpl.defaultRegulators];
      base.bodyMarkdown = tpl.bodyMarkdown;
      base.midArticleCtaEnabled = true;
      base.midArticleCtaEyebrow = tpl.defaultCta.eyebrow || "COGENT COMPLIANCE OS";
      base.midArticleCtaHeadline = tpl.defaultCta.headline;
      base.midArticleCtaDescription = tpl.defaultCta.description;
      base.midArticleCtaButtonLabel = tpl.defaultCta.buttonLabel;
      base.midArticleCtaButtonUrl = tpl.defaultCta.buttonUrl;
      base.faqItems = [...tpl.starterFaqs];
      base.workflowStage = "brief";
    }
    setForm(base);
    setTemplateRevision((r) => r + 1);
    setSaveBanner(null);
    setEditorTab(presetPillar ? "brief" : "write");
    setMode("editor");
  };

  const openEditPost = (post: ResourcePost, tab: EditorTab = "write") => {
    setForm(formFromPost(post));
    setTemplateRevision((r) => r + 1);
    setSaveBanner(null);
    setEditorTab(tab);
    setMode("editor");
  };

  const handleSave = async (targetStatus?: ResourceStatus, overrideStage?: WorkflowStage) => {
    const finalStatus = targetStatus ?? form.status;
    if (!form.title.trim()) {
      setSaveBanner({ type: "err", text: "Please enter a title before saving." });
      setEditorTab("write");
      return;
    }

    setSaving(true);
    setSaveBanner(null);

    const payload = buildPayloadFromForm(form, finalStatus, overrideStage);

    try {
      const isEdit = Boolean(form.id);
      const endpoint = isEdit
        ? `/api/marketing-shield/v1/admin/resources/${form.id}`
        : "/api/marketing-shield/v1/admin/resources";
      const res = await fetch(endpoint, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        const issueMsg =
          data.issues && typeof data.issues === "object"
            ? Object.entries(data.issues)
                .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`)
                .join(" · ")
            : "";
        throw new Error(issueMsg ? `${data.error}: ${issueMsg}` : data.error || "Failed to save post");
      }

      const savedPost = data.post as ResourcePost;
      setForm(formFromPost(savedPost));
      setSaveBanner({
        type: "ok",
        text:
          savedPost.status === "published"
            ? "Published live to Cogent Resources (with SEO metadata, FAQPage JSON-LD & 30-day refresh scheduled)."
            : `Saved (${WORKFLOW_STAGE_META[savedPost.workflowStage].label}).`,
      });
      await fetchPosts();
    } catch (err) {
      setSaveBanner({
        type: "err",
        text: err instanceof Error ? err.message : "Failed to save post.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleQuickToggleStatus = async (post: ResourcePost) => {
    const nextStatus: ResourceStatus = post.status === "published" ? "draft" : "published";
    try {
      const res = await fetch(`/api/marketing-shield/v1/admin/resources/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus,
          workflowStage: nextStatus === "published" ? "published" : "draft",
        }),
      });
      if (res.ok) {
        await fetchPosts();
      }
    } catch {
      // Ignore transient error
    }
  };

  const handleDelete = async (post: ResourcePost) => {
    if (!window.confirm(`Delete "${post.title}" permanently?`)) return;
    try {
      const res = await fetch(`/api/marketing-shield/v1/admin/resources/${post.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        if (form.id === post.id) {
          setMode("list");
          setForm(createEmptyForm());
        }
        await fetchPosts();
      }
    } catch {
      // Ignore
    }
  };

  const pillarMix = useMemo(() => computePillarMix(posts), [posts]);

  const refreshDueCount = useMemo(
    () => posts.filter((p) => isPostRefreshDue(p).due).length,
    [posts],
  );

  const smeReviewCount = useMemo(
    () => posts.filter((p) => p.status !== "published" && p.workflowStage === "sme_review").length,
    [posts],
  );

  const publishedCount = useMemo(
    () => posts.filter((p) => p.status === "published").length,
    [posts],
  );

  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      if (filterCategory !== "all" && p.category !== filterCategory) return false;
      if (filterPillar !== "all" && p.contentPillar !== filterPillar) return false;
      if (filterStage === "refresh_due") {
        if (!isPostRefreshDue(p).due) return false;
      } else if (filterStage !== "all" && p.workflowStage !== filterStage) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const hay =
          `${p.title} ${p.excerpt} ${p.slug} ${p.primaryKeyword || ""} ${p.circularCode || ""} ${p.tags.join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [posts, filterCategory, filterPillar, filterStage, searchQuery]);

  const videoPreview = useMemo(
    () => (form.videoEmbedUrl.trim() ? normalizeVideoSource(form.videoEmbedUrl) : null),
    [form.videoEmbedUrl],
  );

  const liveQaReport = useMemo(
    () =>
      evaluateResourceSeoAndQa({
        title: form.title,
        slug: form.slug || slugifyTitle(form.title || "draft"),
        excerpt: form.excerpt,
        bodyMarkdown: form.bodyMarkdown,
        primaryKeyword: form.primaryKeyword || null,
        seoTitle: form.seoTitle || null,
        seoDescription: form.seoDescription || null,
        targetWordCount: Number.parseInt(form.targetWordCount, 10) || null,
        faqItems: form.faqItems,
        midArticleCta:
          form.midArticleCtaEnabled && form.midArticleCtaHeadline.trim()
            ? {
                eyebrow: form.midArticleCtaEyebrow || null,
                headline: form.midArticleCtaHeadline,
                description: form.midArticleCtaDescription,
                buttonLabel: form.midArticleCtaButtonLabel || "Start Free 7-Day Workspace",
                buttonUrl: form.midArticleCtaButtonUrl || "/sign-up",
              }
            : null,
        showLegalDisclaimer: form.showLegalDisclaimer,
        qaChecklist: {
          statutoryAccuracyVerified: form.qaStatutoryAccuracyVerified,
          repealedRuleChecked: form.qaRepealedRuleChecked,
          reviewerName: form.qaReviewerName || null,
          reviewedAt: form.qaReviewedAt || null,
        },
        authoritativeSources: form.authoritativeSources,
      }),
    [form],
  );

  const addSuggestedTag = (tag: string) => {
    const existing = form.tagsText
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    if (existing.some((t) => t.toLowerCase() === tag.toLowerCase())) return;
    setForm((prev) => ({
      ...prev,
      tagsText: [...existing, tag].join(", "),
    }));
  };

  const addFaqItem = () => {
    setForm((prev) => ({
      ...prev,
      faqItems: [...prev.faqItems, { question: "", answer: "" }],
    }));
  };

  const updateFaqItem = (idx: number, field: "question" | "answer", value: string) => {
    setForm((prev) => ({
      ...prev,
      faqItems: prev.faqItems.map((item, i) => (i === idx ? { ...item, [field]: value } : item)),
    }));
  };

  const removeFaqItem = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      faqItems: prev.faqItems.filter((_, i) => i !== idx),
    }));
  };

  const insertCtaMarker = () => {
    setForm((prev) => ({
      ...prev,
      midArticleCtaEnabled: true,
      bodyMarkdown: `${prev.bodyMarkdown.trimEnd()}\n\n{{CTA}}\n`,
    }));
    setTemplateRevision((r) => r + 1);
  };

  const effectiveSeoTitleLen = (form.seoTitle.trim() || form.title.trim()).length;
  const effectiveSeoDescLen = (form.seoDescription.trim() || form.excerpt.trim()).length;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0B1220]">
      {/* Studio Top Bar */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-[1380px] items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-4">
            <Link href="/" className="shrink-0">
              <CogentLogo variant="blue" size="sm" subtitle="Content Ops Studio" />
            </Link>
            <div className="hidden md:flex items-center gap-2 border-l border-slate-200 pl-4 text-[11.5px]">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-medium ${
                  neonConfigured
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-amber-50 text-amber-800 border border-amber-200"
                }`}
              >
                <Database className="h-3 w-3" />
                {neonConfigured ? "Neon DB Ready" : "Neon Setup Needed"}
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-medium ${
                  r2Configured
                    ? "bg-blue-50 text-[#1D4ED8] border border-blue-200"
                    : "bg-slate-100 text-slate-600 border border-slate-200"
                }`}
              >
                <HardDrive className="h-3 w-3" />
                {r2Configured ? "Resources R2 Ready" : "R2 Optional (Links Active)"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/resources"
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[12.5px] font-medium text-slate-700 hover:bg-slate-50"
            >
              <span>Public Resources</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
            {mode === "list" ? (
              <button
                type="button"
                onClick={() => openNewPost("insights", "pillar_1_circular")}
                disabled={!neonConfigured}
                className="inline-flex items-center gap-1.5 rounded-md bg-[#1D4ED8] px-3.5 py-1.5 text-[12.5px] font-medium text-white hover:bg-[#1E40AF] disabled:opacity-50 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>New Playbook Post</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSave()}
                  className="inline-flex items-center gap-1.5 rounded-md bg-[#0B1220] px-3 py-1.5 text-[12.5px] font-medium text-white hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
                >
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Save</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode("list")}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[12.5px] font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>All Posts</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1380px] px-5 py-8 sm:px-8">
        {/* Neon Invalid Connection String Banner */}
        {neonConfigError && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-5 text-[13.5px] text-red-900">
            <p className="font-semibold">Neon Connection String Error</p>
            <p className="mt-1 leading-relaxed">{neonConfigError}</p>
          </div>
        )}

        {/* Neon Setup Checklist if not yet configured */}
        {!neonConfigured && !neonConfigError && (
          <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50/70 p-6">
            <h2 className="text-[16px] font-semibold text-[#0B1220]">
              Connect Neon Postgres to Start Publishing
            </h2>
            <p className="mt-1.5 text-[13.5px] text-slate-700 leading-relaxed">
              This studio stores zero data in Supabase. Add{" "}
              <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[12px] border border-amber-200">
                NEON_RESOURCES_DATABASE_URL
              </code>{" "}
              to <code className="font-mono text-[12px]">.env.local</code> / Vercel, run{" "}
              <code className="font-mono text-[12px]">neon/migrations/001_resources_cms.sql</code>{" "}
              (and{" "}
              <code className="font-mono text-[12px]">002_resources_playbook_ops.sql</code>) in
              your Neon SQL Editor, and optionally configure{" "}
              <code className="font-mono text-[12px]">RESOURCES_R2_*</code> for direct image/PDF
              uploads.
            </p>
          </div>
        )}

        {loadError && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-800">
            {loadError}
          </div>
        )}

        {mode === "list" ? (
          <div className="space-y-6">
            {/* Phase 6 Scorecard: Pillar Mix (40/30/20/10) + Freshness Radar */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#1D4ED8]">
                    MASTER CONTENT OPERATIONS SCORECARD
                  </p>
                  <h2 className="mt-0.5 text-[17px] font-semibold text-[#0B1220]">
                    Pillar Mix (40 / 30 / 20 / 10) &amp; 30-Day Freshness Radar
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[12px]">
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-medium text-emerald-700">
                    {publishedCount} Live
                  </span>
                  <span className="rounded-full border border-purple-200 bg-purple-50 px-3 py-1 font-medium text-purple-700">
                    {smeReviewCount} In SME Review
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setFilterStage((prev) => (prev === "refresh_due" ? "all" : "refresh_due"))
                    }
                    className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 font-semibold transition-colors cursor-pointer ${
                      refreshDueCount > 0
                        ? "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                        : "border-slate-200 bg-slate-50 text-slate-600"
                    }`}
                  >
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>{refreshDueCount} Refresh Due</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {pillarMix.entries.map((entry) => (
                  <div
                    key={entry.pillar}
                    className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10.5px] font-semibold uppercase text-[#1D4ED8]">
                        {entry.code} · Target {entry.targetPercent}%
                      </span>
                      <button
                        type="button"
                        disabled={!neonConfigured}
                        onClick={() => openNewPost("insights", entry.pillar)}
                        className="rounded border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:border-[#1D4ED8] hover:text-[#1D4ED8] disabled:opacity-50 cursor-pointer"
                      >
                        + Draft
                      </button>
                    </div>
                    <p className="text-[13px] font-semibold text-[#0B1220]">{entry.shortLabel}</p>
                    <div className="flex items-center justify-between font-mono text-[11px] text-slate-500">
                      <span>{entry.count} live</span>
                      <span>Actual {entry.actualPercent}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full bg-[#1D4ED8]"
                        style={{ width: `${Math.min(100, entry.actualPercent)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Create Bar by Resource Section */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {RESOURCE_CATEGORIES.map((cat) => {
                const Icon = CATEGORY_ICONS[cat];
                const meta = RESOURCE_CATEGORY_META[cat];
                const count = posts.filter((p) => p.category === cat).length;
                return (
                  <button
                    key={cat}
                    type="button"
                    disabled={!neonConfigured}
                    onClick={() => openNewPost(cat)}
                    className="group flex items-start justify-between rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-[#1D4ED8]/50 hover:shadow-sm transition-all disabled:opacity-60 cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-[#1D4ED8]" />
                        <span className="text-[13.5px] font-semibold text-[#0B1220]">
                          New {meta.shortLabel}
                        </span>
                      </div>
                      <p className="mt-1 font-mono text-[11px] text-slate-500">
                        {count} {count === 1 ? "item" : "items"}
                      </p>
                    </div>
                    <Plus className="h-4 w-4 text-slate-400 group-hover:text-[#1D4ED8]" />
                  </button>
                );
              })}
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center gap-1.5">
                {(["all", ...RESOURCE_CATEGORIES] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setFilterCategory(cat)}
                    className={`rounded-md px-3 py-1.5 text-[12.5px] font-medium transition-colors cursor-pointer ${
                      filterCategory === cat
                        ? "bg-[#0B1220] text-white"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {cat === "all" ? "All Sections" : RESOURCE_CATEGORY_META[cat].label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={filterStage}
                  onChange={(e) => setFilterStage(e.target.value as StageFilter)}
                  className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[12.5px] text-slate-700 focus:border-[#1D4ED8] focus:outline-none"
                >
                  <option value="all">All Stages</option>
                  {WORKFLOW_STAGES.map((stage) => (
                    <option key={stage} value={stage}>
                      {WORKFLOW_STAGE_META[stage].label}
                    </option>
                  ))}
                  <option value="refresh_due">Refresh Due ({refreshDueCount})</option>
                </select>

                <select
                  value={filterPillar}
                  onChange={(e) => setFilterPillar(e.target.value as ContentPillar | "all")}
                  className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[12.5px] text-slate-700 focus:border-[#1D4ED8] focus:outline-none"
                >
                  <option value="all">All Pillars</option>
                  {CONTENT_PILLARS.map((p) => (
                    <option key={p} value={p}>
                      {CONTENT_PILLAR_META[p].code}: {CONTENT_PILLAR_META[p].shortLabel}
                    </option>
                  ))}
                </select>

                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search title, slug, circular..."
                    className="rounded-md border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-[12.5px] focus:border-[#1D4ED8] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Posts Table */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading posts from Neon...</span>
                </div>
              ) : filteredPosts.length === 0 ? (
                <div className="py-16 text-center px-6">
                  <p className="text-[15px] font-medium text-[#0B1220]">No matching posts</p>
                  <p className="mt-1 text-[13px] text-slate-500">
                    Start a Playbook Pillar draft above or adjust your filters.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredPosts.map((post) => {
                    const Icon = CATEGORY_ICONS[post.category];
                    const stageMeta =
                      WORKFLOW_STAGE_META[post.workflowStage] || WORKFLOW_STAGE_META.draft;
                    const pillarMeta = post.contentPillar
                      ? CONTENT_PILLAR_META[post.contentPillar]
                      : null;
                    const priority = calculatePriorityScore(
                      post.priorityUrgency,
                      post.priorityCommercial,
                      post.priorityWinnability,
                    );
                    const refreshStatus = isPostRefreshDue(post);
                    const qa = evaluateResourceSeoAndQa(post);
                    const distCount = post.atomizationKit?.completedChannels?.length || 0;

                    return (
                      <div
                        key={post.id}
                        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-5 py-4 hover:bg-slate-50/70 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 font-mono text-[10.5px] font-medium text-slate-700">
                              <Icon className="h-3 w-3 text-[#1D4ED8]" />
                              {RESOURCE_CATEGORY_META[post.category].shortLabel}
                            </span>
                            <span
                              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10.5px] font-semibold ${stageMeta.badgeClass}`}
                            >
                              {stageMeta.shortLabel}
                            </span>
                            {pillarMeta && (
                              <span className="rounded border border-blue-200 bg-blue-50/70 px-2 py-0.5 font-mono text-[10.5px] font-medium text-[#1D4ED8]">
                                {pillarMeta.code}
                              </span>
                            )}
                            {priority.hasAllFactors && (
                              <span
                                className={`rounded px-1.5 py-0.5 font-mono text-[10.5px] font-semibold ${
                                  priority.greenlit
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {priority.total}/15
                              </span>
                            )}
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10.5px] text-slate-600">
                              QA {qa.passedCount}/12
                            </span>
                            {distCount > 0 && (
                              <span className="rounded bg-indigo-50 px-1.5 py-0.5 font-mono text-[10.5px] text-indigo-700">
                                1→7: {distCount}/7
                              </span>
                            )}
                            {post.featured && (
                              <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-50 px-2 py-0.5 text-[10.5px] font-medium text-[#1D4ED8]">
                                <Sparkles className="h-2.5 w-2.5" />
                                Featured
                              </span>
                            )}
                            {refreshStatus.due && (
                              <span
                                title={refreshStatus.reason || "Refresh due"}
                                className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10.5px] font-semibold text-amber-800"
                              >
                                <AlertTriangle className="h-2.5 w-2.5" />
                                Refresh Due
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => openEditPost(post, "write")}
                            className="mt-1.5 block text-left text-[15px] font-semibold text-[#0B1220] hover:text-[#1D4ED8] cursor-pointer"
                          >
                            {post.title}
                          </button>
                          <p className="mt-0.5 font-mono text-[11.5px] text-slate-500 truncate">
                            /resources/{post.category}/{post.slug}
                            {post.circularCode ? ` · ${post.circularCode}` : ""}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => openEditPost(post, "distribute")}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[12px] font-medium text-slate-700 hover:bg-slate-100 cursor-pointer"
                            title="Open 1-to-7 Distribution Hub"
                          >
                            <Share2 className="h-3 w-3 text-[#1D4ED8]" />
                            <span>1→7</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickToggleStatus(post)}
                            className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[12px] font-medium text-slate-700 hover:bg-slate-100 cursor-pointer"
                          >
                            {post.status === "published" ? "Unpublish" : "Publish"}
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditPost(post, "write")}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[12px] font-medium text-slate-700 hover:bg-slate-100 cursor-pointer"
                          >
                            <Pencil className="h-3 w-3" />
                            <span>Edit</span>
                          </button>
                          {post.status === "published" && (
                            <Link
                              href={`/resources/${post.category}/${post.slug}`}
                              target="_blank"
                              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[12px] font-medium text-[#1D4ED8] hover:bg-blue-50"
                            >
                              <ExternalLink className="h-3 w-3" />
                              <span>View</span>
                            </Link>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDelete(post)}
                            className="inline-flex items-center rounded-md border border-slate-200 bg-white p-1.5 text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600 cursor-pointer"
                            title="Delete post"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* 3-Tab Playbook Operations Composer */
          <div className="space-y-5">
            {saveBanner && (
              <div
                className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-3 text-[13px] ${
                  saveBanner.type === "ok"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-red-200 bg-red-50 text-red-800"
                }`}
              >
                <div className="flex items-center gap-2">
                  {saveBanner.type === "ok" && <CheckCircle2 className="h-4 w-4 shrink-0" />}
                  <span>{saveBanner.text}</span>
                </div>
                {saveBanner.type === "ok" && form.status === "published" && form.slug && (
                  <Link
                    href={`/resources/${form.category}/${form.slug}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 font-semibold underline"
                  >
                    <span>Open Live Page</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            )}

            {/* Composer Workspace Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-2">
              <div className="flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  onClick={() => setEditorTab("brief")}
                  className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-semibold transition-colors cursor-pointer ${
                    editorTab === "brief"
                      ? "bg-[#0B1220] text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <ClipboardList className="h-4 w-4" />
                  <span>1. Brief &amp; Strategy</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditorTab("write")}
                  className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-semibold transition-colors cursor-pointer ${
                    editorTab === "write"
                      ? "bg-[#0B1220] text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <FileEdit className="h-4 w-4" />
                  <span>2. Write &amp; Maker-Checker QA</span>
                  <span
                    className={`rounded-full px-1.5 py-0.5 font-mono text-[10.5px] ${
                      editorTab === "write"
                        ? "bg-white/20 text-white"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {liveQaReport.passedCount}/12
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditorTab("distribute")}
                  className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-semibold transition-colors cursor-pointer ${
                    editorTab === "distribute"
                      ? "bg-[#0B1220] text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Share2 className="h-4 w-4" />
                  <span>3. Distribute (1-to-7)</span>
                  <span
                    className={`rounded-full px-1.5 py-0.5 font-mono text-[10.5px] ${
                      editorTab === "distribute"
                        ? "bg-white/20 text-white"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {form.atomCompletedChannels.length}/7
                  </span>
                </button>
              </div>

              <div className="flex items-center gap-2 px-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSave("draft", "sme_review")}
                  className="rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-[12px] font-semibold text-purple-700 hover:bg-purple-100 disabled:opacity-50 cursor-pointer"
                >
                  Send to SME Review
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSave("published", "published")}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#1D4ED8] px-3.5 py-1.5 text-[12px] font-semibold text-white hover:bg-[#1E40AF] disabled:opacity-50 cursor-pointer"
                >
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>{form.status === "published" ? "Update Live" : "Publish Live"}</span>
                </button>
              </div>
            </div>

            {editorTab === "brief" && (
              <ResourceBriefPanel
                form={form}
                setForm={setForm}
                onApplyPillarTemplate={(pillar) => applyPillarTemplate(pillar, true)}
              />
            )}

            {editorTab === "distribute" && (
              <ResourceAtomizationPanel form={form} setForm={setForm} />
            )}

            {editorTab === "write" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Main Editor Column */}
                <div className="lg:col-span-8 space-y-5">
                  <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
                    <div>
                      <label className="block text-[12px] font-semibold uppercase tracking-wider text-slate-500">
                        Title (H1)
                      </label>
                      <input
                        type="text"
                        value={form.title}
                        onChange={(e) => {
                          const title = e.target.value;
                          setForm((prev) => ({
                            ...prev,
                            title,
                            slug: prev.slugManuallyEdited ? prev.slug : slugifyTitle(title),
                          }));
                        }}
                        placeholder="e.g., CBN Data Localization Mandate (2027 Deadline): Fintech Compliance Checklist"
                        className="mt-1.5 w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-[18px] font-semibold text-[#0B1220] focus:border-[#1D4ED8] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11.5px] font-medium text-slate-500">
                        Canonical Permalink Slug (System Source of Truth)
                      </label>
                      <div className="mt-1 flex items-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-[12.5px]">
                        <span className="font-mono text-slate-400 mr-1">
                          /resources/{form.category}/
                        </span>
                        <input
                          type="text"
                          value={form.slug}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
                              slugManuallyEdited: true,
                            }))
                          }
                          placeholder="cbn-data-localization-checklist"
                          className="flex-1 bg-transparent font-mono text-[#0B1220] focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11.5px] font-medium text-slate-500">
                        Short Summary / Excerpt
                      </label>
                      <textarea
                        rows={2}
                        value={form.excerpt}
                        onChange={(e) => setForm((prev) => ({ ...prev, excerpt: e.target.value }))}
                        placeholder="1–2 sentence BLUF summary shown on resource cards and search snippets..."
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13.5px] focus:border-[#1D4ED8] focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* 1-Click Playbook Template Bar */}
                  <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3.5 flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[10.5px] font-semibold uppercase tracking-wider text-[#1D4ED8] mr-1">
                      Playbook Templates:
                    </span>
                    {CONTENT_PILLARS.map((pillar) => (
                      <button
                        key={pillar}
                        type="button"
                        onClick={() => applyPillarTemplate(pillar, true)}
                        className="rounded-md border border-blue-200 bg-white px-2.5 py-1 text-[11.5px] font-medium text-slate-700 hover:border-[#1D4ED8] hover:text-[#1D4ED8] cursor-pointer"
                      >
                        {CONTENT_PILLAR_META[pillar].code}: {CONTENT_PILLAR_META[pillar].shortLabel}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={insertCtaMarker}
                      className="ml-auto rounded-md border border-slate-300 bg-white px-2.5 py-1 font-mono text-[11px] font-semibold text-[#0B1220] hover:bg-slate-50 cursor-pointer"
                      title="Inserts {{CTA}} so your Mid-Article CTA renders at that exact spot"
                    >
                      + Insert {"{{CTA}}"}
                    </button>
                  </div>

                  {/* Rich Text Content */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <label className="text-[12px] font-semibold uppercase tracking-wider text-slate-500">
                        Post Content / Notes (BLUF + Proof + Action)
                      </label>
                      <span className="font-mono text-[11.5px] text-slate-500">
                        {liveQaReport.wordCount} words
                        {form.targetWordCount ? ` / ${form.targetWordCount} target` : ""}
                      </span>
                    </div>
                    <ResourceRichEditor
                      documentKey={`${form.id || "new-post"}-${templateRevision}`}
                      markdown={form.bodyMarkdown}
                      onChange={(nextMd) => setForm((prev) => ({ ...prev, bodyMarkdown: nextMd }))}
                      r2Configured={r2Configured}
                      onUploadImage={uploadToResourcesR2}
                    />
                  </div>

                  {/* Mid-Article Contextual CTA Builder */}
                  <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Megaphone className="h-4 w-4 text-[#1D4ED8]" />
                        <h3 className="text-[14px] font-semibold text-[#0B1220]">
                          Contextual Mid-Article Conversion CTA
                        </h3>
                      </div>
                      <label className="inline-flex items-center gap-2 text-[12.5px] font-medium text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.midArticleCtaEnabled}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              midArticleCtaEnabled: e.target.checked,
                            }))
                          }
                          className="h-4 w-4 rounded border-slate-300 text-[#1D4ED8]"
                        />
                        <span>Enable Mid-Article CTA</span>
                      </label>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {CTA_PRESETS.map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              midArticleCtaEnabled: true,
                              midArticleCtaEyebrow: preset.cta.eyebrow || "",
                              midArticleCtaHeadline: preset.cta.headline,
                              midArticleCtaDescription: preset.cta.description,
                              midArticleCtaButtonLabel: preset.cta.buttonLabel,
                              midArticleCtaButtonUrl: preset.cta.buttonUrl,
                            }))
                          }
                          className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11.5px] font-medium text-slate-700 hover:border-[#1D4ED8] hover:text-[#1D4ED8] cursor-pointer"
                        >
                          Preset: {preset.label}
                        </button>
                      ))}
                    </div>

                    {form.midArticleCtaEnabled && (
                      <div className="space-y-3 border-t border-slate-100 pt-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11.5px] font-medium text-slate-600">
                              Eyebrow Label
                            </label>
                            <input
                              type="text"
                              value={form.midArticleCtaEyebrow}
                              onChange={(e) =>
                                setForm((prev) => ({
                                  ...prev,
                                  midArticleCtaEyebrow: e.target.value,
                                }))
                              }
                              placeholder="COGENT WORKFLOW 02"
                              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5 font-mono text-[12px] focus:border-[#1D4ED8] focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[11.5px] font-medium text-slate-600">
                              CTA Destination Path / URL
                            </label>
                            <input
                              type="text"
                              value={form.midArticleCtaButtonUrl}
                              onChange={(e) =>
                                setForm((prev) => ({
                                  ...prev,
                                  midArticleCtaButtonUrl: e.target.value,
                                }))
                              }
                              placeholder="/sign-up or /solutions/..."
                              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5 font-mono text-[12px] focus:border-[#1D4ED8] focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="sm:col-span-2">
                            <label className="block text-[11.5px] font-medium text-slate-600">
                              Headline
                            </label>
                            <input
                              type="text"
                              value={form.midArticleCtaHeadline}
                              onChange={(e) =>
                                setForm((prev) => ({
                                  ...prev,
                                  midArticleCtaHeadline: e.target.value,
                                }))
                              }
                              placeholder="Redline your AML/CFT policy in under 5 minutes"
                              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-[13px] focus:border-[#1D4ED8] focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[11.5px] font-medium text-slate-600">
                              Button Label
                            </label>
                            <input
                              type="text"
                              value={form.midArticleCtaButtonLabel}
                              onChange={(e) =>
                                setForm((prev) => ({
                                  ...prev,
                                  midArticleCtaButtonLabel: e.target.value,
                                }))
                              }
                              placeholder="Start Free 7-Day Workspace"
                              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-[13px] focus:border-[#1D4ED8] focus:outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11.5px] font-medium text-slate-600">
                            Supporting Copy
                          </label>
                          <textarea
                            rows={2}
                            value={form.midArticleCtaDescription}
                            onChange={(e) =>
                              setForm((prev) => ({
                                ...prev,
                                midArticleCtaDescription: e.target.value,
                              }))
                            }
                            placeholder="Explain how Cogent automates this exact step inside an isolated 7-day workspace..."
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-[13px] focus:border-[#1D4ED8] focus:outline-none"
                          />
                        </div>
                        <p className="text-[11.5px] text-slate-400">
                          Renders automatically after your 2nd H2 heading, or at the exact position
                          of <code className="font-mono">{"{{CTA}}"}</code> in the body.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Structured FAQ Builder (Auto FAQPage JSON-LD) */}
                  <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <HelpCircle className="h-4 w-4 text-[#1D4ED8]" />
                          <h3 className="text-[14px] font-semibold text-[#0B1220]">
                            Structured FAQs (Auto-Emits FAQPage JSON-LD Schema)
                          </h3>
                        </div>
                        <p className="mt-0.5 text-[12px] text-slate-500">
                          Add 2–4 &ldquo;People Also Ask&rdquo; questions with concise 40–60 word
                          answers citing exact Nigerian/African regulations.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={addFaqItem}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-700 hover:bg-slate-50 cursor-pointer shrink-0"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add FAQ
                      </button>
                    </div>

                    {form.faqItems.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 py-5 text-center text-[12.5px] text-slate-400">
                        No FAQs yet. Click &ldquo;Add FAQ&rdquo; or load a Playbook Template above.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {form.faqItems.map((faq, idx) => (
                          <div
                            key={idx}
                            className="rounded-lg border border-slate-200 bg-slate-50/60 p-3.5 space-y-2"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[11px] font-semibold text-[#1D4ED8]">
                                Q{idx + 1}
                              </span>
                              <input
                                type="text"
                                value={faq.question}
                                onChange={(e) => updateFaqItem(idx, "question", e.target.value)}
                                placeholder="e.g., How long does FCCPC digital lender approval take in Nigeria?"
                                className="flex-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[13px] font-medium focus:border-[#1D4ED8] focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => removeFaqItem(idx)}
                                className="rounded p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                                title="Remove FAQ"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <textarea
                              rows={2}
                              value={faq.answer}
                              onChange={(e) => updateFaqItem(idx, "answer", e.target.value)}
                              placeholder="Direct 40–60 word statutory answer..."
                              className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[12.5px] focus:border-[#1D4ED8] focus:outline-none"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Sidebar Settings & 12-Point QA */}
                <div className="lg:col-span-4 space-y-5">
                  {/* Publish Box */}
                  <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[13.5px] font-semibold text-[#0B1220]">Publishing</h3>
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                          WORKFLOW_STAGE_META[form.workflowStage].badgeClass
                        }`}
                      >
                        {WORKFLOW_STAGE_META[form.workflowStage].shortLabel}
                      </span>
                    </div>

                    <div>
                      <label className="block text-[11.5px] font-medium text-slate-600">
                        Resource Section
                      </label>
                      <select
                        value={form.category}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            category: e.target.value as ResourceCategory,
                          }))
                        }
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] font-medium focus:border-[#1D4ED8] focus:outline-none"
                      >
                        {RESOURCE_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {RESOURCE_CATEGORY_META[cat].label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11.5px] font-medium text-slate-600">
                        Publish Date (Optional)
                      </label>
                      <input
                        type="datetime-local"
                        value={form.publishedAt}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, publishedAt: e.target.value }))
                        }
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-[12.5px] focus:border-[#1D4ED8] focus:outline-none"
                      />
                    </div>

                    <label className="flex items-center gap-2 text-[13px] text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.featured}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, featured: e.target.checked }))
                        }
                        className="h-4 w-4 rounded border-slate-300 text-[#1D4ED8]"
                      />
                      <span>Pin as Featured on Resources Hub</span>
                    </label>

                    <label className="flex items-center gap-2 text-[13px] text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.showLegalDisclaimer}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, showLegalDisclaimer: e.target.checked }))
                        }
                        className="h-4 w-4 rounded border-slate-300 text-[#1D4ED8]"
                      />
                      <span>Include Standard Legal Disclaimer</span>
                    </label>

                    {!liveQaReport.readyToPublish && (
                      <p className="rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 text-[11.5px] text-amber-900">
                        Maker-Checker Advisory: {liveQaReport.passedCount}/12 QA gates passed
                        {!form.qaStatutoryAccuracyVerified
                          ? " (statutory accuracy check not yet ticked)."
                          : "."}
                      </p>
                    )}

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => handleSave("draft")}
                        className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-[13px] font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                      >
                        Save Draft
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => handleSave("published", "published")}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#1D4ED8] px-3 py-2 text-[13px] font-medium text-white hover:bg-[#1E40AF] disabled:opacity-50 cursor-pointer"
                      >
                        {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        <span>{form.status === "published" ? "Update" : "Publish"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Live 12-Point Maker-Checker QA Panel */}
                  <ResourceQaChecklistPanel
                    form={form}
                    setForm={setForm}
                    qaReport={liveQaReport}
                  />

                  {/* Category-Specific Fields */}
                  {form.category === "videos" && (
                    <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
                      <h3 className="text-[13.5px] font-semibold text-[#0B1220]">
                        Video Embed / Link
                      </h3>
                      <div>
                        <label className="block text-[11.5px] font-medium text-slate-600">
                          YouTube, Vimeo, Loom, Drive, or pCloud Link
                        </label>
                        <input
                          type="url"
                          value={form.videoEmbedUrl}
                          onChange={(e) =>
                            setForm((prev) => ({ ...prev, videoEmbedUrl: e.target.value }))
                          }
                          placeholder="https://www.youtube.com/watch?v=..."
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[12.5px] focus:border-[#1D4ED8] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11.5px] font-medium text-slate-600">
                          Duration Label
                        </label>
                        <input
                          type="text"
                          value={form.videoDuration}
                          onChange={(e) =>
                            setForm((prev) => ({ ...prev, videoDuration: e.target.value }))
                          }
                          placeholder="e.g., 5 min 20s"
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[12.5px] focus:border-[#1D4ED8] focus:outline-none"
                        />
                      </div>
                      {videoPreview && videoPreview.kind === "iframe" && (
                        <div className="overflow-hidden rounded-lg border border-slate-200 aspect-video bg-slate-950">
                          <iframe
                            src={videoPreview.embedUrl}
                            title="Video preview"
                            className="h-full w-full"
                            allowFullScreen
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {form.category === "reports" && (
                    <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
                      <h3 className="text-[13.5px] font-semibold text-[#0B1220]">
                        Report / Download Material
                      </h3>
                      <div>
                        <label className="block text-[11.5px] font-medium text-slate-600">
                          Google Drive, pCloud, or Resources R2 PDF URL
                        </label>
                        <input
                          type="url"
                          value={form.reportFileUrl}
                          onChange={(e) =>
                            setForm((prev) => ({ ...prev, reportFileUrl: e.target.value }))
                          }
                          placeholder="https://drive.google.com/... or https://u.pcloud.link/..."
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[12.5px] focus:border-[#1D4ED8] focus:outline-none"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          ref={reportInputRef}
                          type="file"
                          accept="application/pdf"
                          onChange={handleReportUpload}
                          className="hidden"
                        />
                        <button
                          type="button"
                          disabled={!r2Configured || uploadingReport}
                          onClick={() => reportInputRef.current?.click()}
                          className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                        >
                          {uploadingReport ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Upload className="h-3.5 w-3.5" />
                          )}
                          <span>{uploadingReport ? "Uploading PDF..." : "Or Upload PDF to R2"}</span>
                        </button>
                      </div>
                      <div>
                        <label className="block text-[11.5px] font-medium text-slate-600">
                          Format / Length Badge
                        </label>
                        <input
                          type="text"
                          value={form.reportFileLabel}
                          onChange={(e) =>
                            setForm((prev) => ({ ...prev, reportFileLabel: e.target.value }))
                          }
                          placeholder="e.g., PDF · 16 pages"
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[12.5px] focus:border-[#1D4ED8] focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {form.category === "events" && (
                    <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
                      <h3 className="text-[13.5px] font-semibold text-[#0B1220]">
                        Event Details &amp; Registration
                      </h3>
                      <div>
                        <label className="block text-[11.5px] font-medium text-slate-600">
                          Event Date &amp; Time
                        </label>
                        <input
                          type="datetime-local"
                          value={form.eventStartsAt}
                          onChange={(e) =>
                            setForm((prev) => ({ ...prev, eventStartsAt: e.target.value }))
                          }
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-[12.5px] focus:border-[#1D4ED8] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11.5px] font-medium text-slate-600">
                          Location / Format
                        </label>
                        <input
                          type="text"
                          value={form.eventLocation}
                          onChange={(e) =>
                            setForm((prev) => ({ ...prev, eventLocation: e.target.value }))
                          }
                          placeholder="e.g., Virtual Webinar · Zoom / Lagos"
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[12.5px] focus:border-[#1D4ED8] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11.5px] font-medium text-slate-600">
                          Registration / Event Link
                        </label>
                        <input
                          type="url"
                          value={form.eventRegistrationUrl}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              eventRegistrationUrl: e.target.value,
                            }))
                          }
                          placeholder="https://lu.ma/... or https://zoom.us/..."
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[12.5px] focus:border-[#1D4ED8] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11.5px] font-medium text-slate-600">
                          Optional Replay Video URL (for past events)
                        </label>
                        <input
                          type="url"
                          value={form.videoEmbedUrl}
                          onChange={(e) =>
                            setForm((prev) => ({ ...prev, videoEmbedUrl: e.target.value }))
                          }
                          placeholder="https://www.youtube.com/watch?v=..."
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[12.5px] focus:border-[#1D4ED8] focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {/* Cover Image */}
                  <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
                    <h3 className="text-[13.5px] font-semibold text-[#0B1220]">Cover Image</h3>
                    <input
                      type="url"
                      value={form.coverImageUrl}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, coverImageUrl: e.target.value }))
                      }
                      placeholder="Paste image URL or upload below..."
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[12.5px] focus:border-[#1D4ED8] focus:outline-none"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        ref={coverInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleCoverUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        disabled={!r2Configured || uploadingCover}
                        onClick={() => coverInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                      >
                        {uploadingCover ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Upload className="h-3.5 w-3.5" />
                        )}
                        <span>{uploadingCover ? "Uploading..." : "Upload Cover to R2"}</span>
                      </button>
                    </div>
                    {form.coverImageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={form.coverImageUrl}
                        alt="Cover preview"
                        className="mt-2 h-36 w-full rounded-lg border border-slate-200 object-cover"
                      />
                    )}
                  </div>

                  {/* Author & Tags */}
                  <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
                    <h3 className="text-[13.5px] font-semibold text-[#0B1220]">
                      Author &amp; Tags
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600">
                          Author Name
                        </label>
                        <input
                          type="text"
                          value={form.authorName}
                          onChange={(e) =>
                            setForm((prev) => ({ ...prev, authorName: e.target.value }))
                          }
                          className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-[12.5px] focus:border-[#1D4ED8] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600">
                          Role / Team
                        </label>
                        <input
                          type="text"
                          value={form.authorRole}
                          onChange={(e) =>
                            setForm((prev) => ({ ...prev, authorRole: e.target.value }))
                          }
                          className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-[12.5px] focus:border-[#1D4ED8] focus:outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600">
                        Tags (comma-separated)
                      </label>
                      <input
                        type="text"
                        value={form.tagsText}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, tagsText: e.target.value }))
                        }
                        placeholder="CBN, AML, Payments"
                        className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-[12.5px] focus:border-[#1D4ED8] focus:outline-none"
                      />
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {SUGGESTED_TAGS.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => addSuggestedTag(tag)}
                            className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[10.5px] text-slate-600 hover:border-[#1D4ED8] hover:text-[#1D4ED8] cursor-pointer"
                          >
                            + {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* SEO Settings with Live Playbook Character Counters */}
                  <details open className="rounded-xl border border-slate-200 bg-white p-5">
                    <summary className="cursor-pointer text-[13.5px] font-semibold text-[#0B1220]">
                      SEO Metadata &amp; SERP Preview
                    </summary>
                    <div className="mt-3 space-y-3">
                      <div>
                        <div className="flex items-center justify-between">
                          <label className="block text-[11px] font-medium text-slate-600">
                            SEO Title Tag (target 55–60 chars)
                          </label>
                          <span
                            className={`font-mono text-[10.5px] ${
                              effectiveSeoTitleLen >= 35 && effectiveSeoTitleLen <= 65
                                ? "text-emerald-700"
                                : "text-amber-700"
                            }`}
                          >
                            {effectiveSeoTitleLen} chars
                          </span>
                        </div>
                        <input
                          type="text"
                          value={form.seoTitle}
                          onChange={(e) =>
                            setForm((prev) => ({ ...prev, seoTitle: e.target.value }))
                          }
                          placeholder="Defaults to post title"
                          className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-[12.5px] focus:border-[#1D4ED8] focus:outline-none"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between">
                          <label className="block text-[11px] font-medium text-slate-600">
                            Meta Description (target 145–155 chars)
                          </label>
                          <span
                            className={`font-mono text-[10.5px] ${
                              effectiveSeoDescLen >= 120 && effectiveSeoDescLen <= 165
                                ? "text-emerald-700"
                                : "text-amber-700"
                            }`}
                          >
                            {effectiveSeoDescLen} chars
                          </span>
                        </div>
                        <textarea
                          rows={2}
                          value={form.seoDescription}
                          onChange={(e) =>
                            setForm((prev) => ({ ...prev, seoDescription: e.target.value }))
                          }
                          placeholder="Defaults to excerpt"
                          className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-[12.5px] focus:border-[#1D4ED8] focus:outline-none"
                        />
                      </div>
                    </div>
                  </details>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
