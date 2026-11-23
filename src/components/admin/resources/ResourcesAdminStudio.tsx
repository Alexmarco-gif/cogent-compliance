"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Database,
  ExternalLink,
  FileText,
  Film,
  HardDrive,
  Loader2,
  Newspaper,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import {
  RESOURCE_CATEGORIES,
  RESOURCE_CATEGORY_META,
  type ResourceCategory,
  type ResourcePost,
  type ResourceStatus,
  normalizeVideoSource,
  slugifyTitle,
} from "@/contracts/resources.contracts";
import { ResourceRichEditor } from "./ResourceRichEditor";
import { CogentLogo } from "@/components/brand/CogentLogo";

interface ResourcesAdminStudioProps {
  initialNeonConfigured: boolean;
  initialNeonConfigError?: string | null;
  initialR2Configured: boolean;
}

interface EditorFormState {
  id: string | null;
  title: string;
  slug: string;
  slugManuallyEdited: boolean;
  category: ResourceCategory;
  status: ResourceStatus;
  excerpt: string;
  bodyMarkdown: string;
  coverImageUrl: string;
  authorName: string;
  authorRole: string;
  tagsText: string;
  featured: boolean;
  videoEmbedUrl: string;
  videoDuration: string;
  reportFileUrl: string;
  reportFileLabel: string;
  eventStartsAt: string;
  eventLocation: string;
  eventRegistrationUrl: string;
  seoTitle: string;
  seoDescription: string;
  publishedAt: string;
}

const SUGGESTED_TAGS = ["CBN", "SEC", "NDPC", "FCCPC", "NFIU", "AML", "Payments", "Digital Lending"];

function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function createEmptyForm(category: ResourceCategory = "insights"): EditorFormState {
  return {
    id: null,
    title: "",
    slug: "",
    slugManuallyEdited: false,
    category,
    status: "draft",
    excerpt: "",
    bodyMarkdown: "",
    coverImageUrl: "",
    authorName: "Cogent Editorial",
    authorRole: "Regulatory Research",
    tagsText: "",
    featured: false,
    videoEmbedUrl: "",
    videoDuration: "",
    reportFileUrl: "",
    reportFileLabel: "",
    eventStartsAt: "",
    eventLocation: "Virtual Webinar",
    eventRegistrationUrl: "",
    seoTitle: "",
    seoDescription: "",
    publishedAt: "",
  };
}

function formFromPost(post: ResourcePost): EditorFormState {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    slugManuallyEdited: true,
    category: post.category,
    status: post.status,
    excerpt: post.excerpt,
    bodyMarkdown: post.bodyMarkdown,
    coverImageUrl: post.coverImageUrl || "",
    authorName: post.authorName,
    authorRole: post.authorRole || "",
    tagsText: post.tags.join(", "),
    featured: post.featured,
    videoEmbedUrl: post.videoEmbedUrl || "",
    videoDuration: post.videoDuration || "",
    reportFileUrl: post.reportFileUrl || "",
    reportFileLabel: post.reportFileLabel || "",
    eventStartsAt: toDatetimeLocalValue(post.eventStartsAt),
    eventLocation: post.eventLocation || "",
    eventRegistrationUrl: post.eventRegistrationUrl || "",
    seoTitle: post.seoTitle || "",
    seoDescription: post.seoDescription || "",
    publishedAt: toDatetimeLocalValue(post.publishedAt),
  };
}

const CATEGORY_ICONS: Record<ResourceCategory, React.ElementType> = {
  insights: Newspaper,
  videos: Film,
  reports: FileText,
  events: Calendar,
};

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
  const [filterCategory, setFilterCategory] = useState<ResourceCategory | "all">("all");
  const [filterStatus, setFilterStatus] = useState<ResourceStatus | "all">("all");
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

  const openNewPost = (category: ResourceCategory = "insights") => {
    setForm(createEmptyForm(category));
    setSaveBanner(null);
    setMode("editor");
  };

  const openEditPost = (post: ResourcePost) => {
    setForm(formFromPost(post));
    setSaveBanner(null);
    setMode("editor");
  };

  const handleSave = async (targetStatus?: ResourceStatus) => {
    const finalStatus = targetStatus ?? form.status;
    if (!form.title.trim()) {
      setSaveBanner({ type: "err", text: "Please enter a title before saving." });
      return;
    }

    setSaving(true);
    setSaveBanner(null);

    const tags = form.tagsText
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const payload = {
      title: form.title.trim(),
      slug: (form.slug.trim() || slugifyTitle(form.title)).toLowerCase(),
      category: form.category,
      status: finalStatus,
      excerpt: form.excerpt.trim(),
      bodyMarkdown: form.bodyMarkdown,
      coverImageUrl: form.coverImageUrl.trim() || null,
      authorName: form.authorName.trim() || "Cogent Editorial",
      authorRole: form.authorRole.trim() || null,
      tags,
      featured: form.featured,
      videoEmbedUrl: form.videoEmbedUrl.trim() || null,
      videoDuration: form.videoDuration.trim() || null,
      reportFileUrl: form.reportFileUrl.trim() || null,
      reportFileLabel: form.reportFileLabel.trim() || null,
      eventStartsAt: form.eventStartsAt ? new Date(form.eventStartsAt).toISOString() : null,
      eventLocation: form.eventLocation.trim() || null,
      eventRegistrationUrl: form.eventRegistrationUrl.trim() || null,
      seoTitle: form.seoTitle.trim() || null,
      seoDescription: form.seoDescription.trim() || null,
      publishedAt: form.publishedAt ? new Date(form.publishedAt).toISOString() : null,
    };

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
        throw new Error(data.error || "Failed to save post");
      }

      const savedPost = data.post as ResourcePost;
      setForm(formFromPost(savedPost));
      setSaveBanner({
        type: "ok",
        text:
          savedPost.status === "published"
            ? "Published live to Cogent Resources."
            : "Saved as draft.",
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
        body: JSON.stringify({ status: nextStatus }),
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

  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      if (filterCategory !== "all" && p.category !== filterCategory) return false;
      if (filterStatus !== "all" && p.status !== filterStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const hay = `${p.title} ${p.excerpt} ${p.slug} ${p.tags.join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [posts, filterCategory, filterStatus, searchQuery]);

  const videoPreview = useMemo(
    () => (form.videoEmbedUrl.trim() ? normalizeVideoSource(form.videoEmbedUrl) : null),
    [form.videoEmbedUrl],
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

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0B1220]">
      {/* Studio Top Bar */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-[1360px] items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-4">
            <Link href="/" className="shrink-0">
              <CogentLogo variant="blue" size="sm" subtitle="Resources Studio" />
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
                onClick={() => openNewPost("insights")}
                disabled={!neonConfigured}
                className="inline-flex items-center gap-1.5 rounded-md bg-[#1D4ED8] px-3.5 py-1.5 text-[12.5px] font-medium text-white hover:bg-[#1E40AF] disabled:opacity-50 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>New Post</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setMode("list")}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[12.5px] font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>All Posts</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1360px] px-5 py-8 sm:px-8">
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
              in your Neon SQL Editor, and optionally configure{" "}
              <code className="font-mono text-[12px]">RESOURCES_R2_*</code> for direct image/PDF uploads.
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
            {/* Quick Create Bar */}
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
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-slate-200 bg-white p-4">
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
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as ResourceStatus | "all")}
                  className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[12.5px] text-slate-700 focus:border-[#1D4ED8] focus:outline-none"
                >
                  <option value="all">All Statuses</option>
                  <option value="published">Published</option>
                  <option value="draft">Drafts</option>
                </select>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search title or slug..."
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
                  <p className="text-[15px] font-medium text-[#0B1220]">No posts yet</p>
                  <p className="mt-1 text-[13px] text-slate-500">
                    Create an article, video briefing, PDF report, or event using the buttons above.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredPosts.map((post) => {
                    const Icon = CATEGORY_ICONS[post.category];
                    return (
                      <div
                        key={post.id}
                        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-5 py-4 hover:bg-slate-50/70 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 font-mono text-[10.5px] font-medium text-slate-700">
                              <Icon className="h-3 w-3 text-[#1D4ED8]" />
                              {RESOURCE_CATEGORY_META[post.category].label}
                            </span>
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
                                post.status === "published"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-amber-50 text-amber-800 border border-amber-200"
                              }`}
                            >
                              {post.status === "published" ? "Published" : "Draft"}
                            </span>
                            {post.featured && (
                              <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-50 px-2 py-0.5 text-[10.5px] font-medium text-[#1D4ED8]">
                                <Sparkles className="h-2.5 w-2.5" />
                                Featured
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => openEditPost(post)}
                            className="mt-1.5 block text-left text-[15px] font-semibold text-[#0B1220] hover:text-[#1D4ED8] cursor-pointer"
                          >
                            {post.title}
                          </button>
                          <p className="mt-0.5 font-mono text-[11.5px] text-slate-500 truncate">
                            /resources/{post.category}/{post.slug}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleQuickToggleStatus(post)}
                            className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[12px] font-medium text-slate-700 hover:bg-slate-100 cursor-pointer"
                          >
                            {post.status === "published" ? "Unpublish" : "Publish"}
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditPost(post)}
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
          /* WordPress-Style 2-Column Post Composer */
          <div className="space-y-4">
            {saveBanner && (
              <div
                className={`flex items-center justify-between rounded-xl border px-4 py-3 text-[13px] ${
                  saveBanner.type === "ok"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-red-200 bg-red-50 text-red-800"
                }`}
              >
                <div className="flex items-center gap-2">
                  {saveBanner.type === "ok" && <CheckCircle2 className="h-4 w-4" />}
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

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Main Editor Column */}
              <div className="lg:col-span-8 space-y-5">
                <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
                  <div>
                    <label className="block text-[12px] font-semibold uppercase tracking-wider text-slate-500">
                      Title
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
                      placeholder="e.g., CBN 2026 Automated AML Baseline Standards: What Fintechs Must Update"
                      className="mt-1.5 w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-[18px] font-semibold text-[#0B1220] focus:border-[#1D4ED8] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11.5px] font-medium text-slate-500">
                      Permalink Slug
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
                        placeholder="cbn-2026-aml-standards"
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
                      placeholder="1–2 sentence summary shown on resource cards and search snippets..."
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13.5px] focus:border-[#1D4ED8] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Rich Text Content */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[12px] font-semibold uppercase tracking-wider text-slate-500">
                      Post Content / Notes
                    </label>
                    <span className="text-[11.5px] text-slate-400">
                      Supports headings, tables, links &amp; inline images
                    </span>
                  </div>
                  <ResourceRichEditor
                    documentKey={form.id || "new-post"}
                    markdown={form.bodyMarkdown}
                    onChange={(nextMd) => setForm((prev) => ({ ...prev, bodyMarkdown: nextMd }))}
                    r2Configured={r2Configured}
                    onUploadImage={uploadToResourcesR2}
                  />
                </div>
              </div>

              {/* Right Sidebar Settings */}
              <div className="lg:col-span-4 space-y-5">
                {/* Publish Box */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[13.5px] font-semibold text-[#0B1220]">Publishing</h3>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                        form.status === "published"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-800"
                      }`}
                    >
                      {form.status === "published" ? "Published" : "Draft"}
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
                      onClick={() => handleSave("published")}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#1D4ED8] px-3 py-2 text-[13px] font-medium text-white hover:bg-[#1E40AF] disabled:opacity-50 cursor-pointer"
                    >
                      {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      <span>{form.status === "published" ? "Update" : "Publish"}</span>
                    </button>
                  </div>
                </div>

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
                          setForm((prev) => ({ ...prev, eventRegistrationUrl: e.target.value }))
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

                {/* SEO Settings */}
                <details className="rounded-xl border border-slate-200 bg-white p-5">
                  <summary className="cursor-pointer text-[13.5px] font-semibold text-[#0B1220]">
                    SEO Metadata (Optional)
                  </summary>
                  <div className="mt-3 space-y-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600">
                        Custom SEO Title
                      </label>
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
                      <label className="block text-[11px] font-medium text-slate-600">
                        Meta Description
                      </label>
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
          </div>
        )}
      </main>
    </div>
  );
}
