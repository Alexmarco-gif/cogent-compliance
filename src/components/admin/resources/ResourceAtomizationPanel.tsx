"use client";

import React, { useState } from "react";
import {
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  Share2,
  Sparkles,
  Wand2,
} from "lucide-react";
import {
  type AtomizationChannelId,
  slugifyTitle,
} from "@/contracts/resources.contracts";
import { buildDeterministicAtomizationKit } from "@/modules/resources/resources-playbook.helpers";
import { toDateInputValue, type EditorFormState } from "./editor-types";

interface ResourceAtomizationPanelProps {
  form: EditorFormState;
  setForm: React.Dispatch<React.SetStateAction<EditorFormState>>;
}

const CHANNEL_CARDS: Array<{
  id: AtomizationChannelId;
  title: string;
  timing: string;
  rule: string;
  field?:
    | "atomLinkedinCarousel"
    | "atomFounderLinkedinPost"
    | "atomTwitterThread"
    | "atomNewsletterBrief"
    | "atomSalesBattlecard";
}> = [
  {
    id: "linkedin_company",
    title: "2. LinkedIn (Company) · 6-Slide PDF Carousel",
    timing: "Day 0 (Hour 2) · Link in First Comment",
    rule: "Slide 1: Hook · Slides 2–4: Key Rules · Slide 5: Manual vs. Cogent · Slide 6: CTA",
    field: "atomLinkedinCarousel",
  },
  {
    id: "linkedin_founder",
    title: "3. LinkedIn (Founder / Exec) · Zero-Click Post",
    timing: "Day 1 · 200–250 words",
    rule: "First-person practitioner take on why this rule stalls product/compliance teams.",
    field: "atomFounderLinkedinPost",
  },
  {
    id: "twitter",
    title: "4. X (Twitter) · 5-Tweet Breakdown Thread",
    timing: "Day 1 · 5 numbered tweets",
    rule: "Tweet 1: Circular alert + deadline · Tweets 2–4: Takeaways · Tweet 5: Canonical link.",
    field: "atomTwitterThread",
  },
  {
    id: "newsletter",
    title: "5. Email Newsletter · The Weekly Regulatory Brief",
    timing: "Day 2 · 150-word executive summary",
    rule: "Executive summary + 'What your team needs to do this week' box + workspace CTA.",
    field: "atomNewsletterBrief",
  },
  {
    id: "sales",
    title: "6. Sales Enablement · SDR Outbound Battlecard",
    timing: "Day 2 · Cold/warm CCO & Founder outreach",
    rule: "Concise 3-paragraph email script linking to the live guide & 7-day trial.",
    field: "atomSalesBattlecard",
  },
];

export function ResourceAtomizationPanel({ form, setForm }: ResourceAtomizationPanelProps) {
  const [generating, setGenerating] = useState(false);
  const [statusNote, setStatusNote] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const canonicalSlug = (form.slug.trim() || slugifyTitle(form.title || "guide")).toLowerCase();
  const canonicalUrl = `https://stem-cogent.com/resources/${form.category}/${canonicalSlug}`;

  const copyText = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      // Ignore clipboard failures
    }
  };

  const toggleChannelDone = (channel: AtomizationChannelId) => {
    setForm((prev) => {
      const exists = prev.atomCompletedChannels.includes(channel);
      return {
        ...prev,
        atomCompletedChannels: exists
          ? prev.atomCompletedChannels.filter((c) => c !== channel)
          : [...prev.atomCompletedChannels, channel],
      };
    });
  };

  const applyKitToForm = (kit: ReturnType<typeof buildDeterministicAtomizationKit>) => {
    setForm((prev) => ({
      ...prev,
      atomLinkedinCarousel: kit.linkedinCarousel || prev.atomLinkedinCarousel,
      atomFounderLinkedinPost: kit.founderLinkedinPost || prev.atomFounderLinkedinPost,
      atomTwitterThread: kit.twitterThread || prev.atomTwitterThread,
      atomNewsletterBrief: kit.newsletterBrief || prev.atomNewsletterBrief,
      atomSalesBattlecard: kit.salesBattlecard || prev.atomSalesBattlecard,
      atomCompletedChannels: prev.atomCompletedChannels.includes("website")
        ? prev.atomCompletedChannels
        : ["website", ...prev.atomCompletedChannels],
    }));
  };

  const handleFillTemplates = () => {
    if (!form.title.trim()) {
      setStatusNote("Add a post title first before generating 1-to-7 assets.");
      return;
    }
    const kit = buildDeterministicAtomizationKit(
      {
        title: form.title,
        excerpt: form.excerpt,
        bodyMarkdown: form.bodyMarkdown,
        category: form.category,
        slug: canonicalSlug,
        circularCode: form.circularCode || null,
        regulators: form.regulators,
        targetPersona: form.targetPersona || null,
        primaryKeyword: form.primaryKeyword || null,
      },
      "https://stem-cogent.com",
    );
    applyKitToForm(kit);
    setStatusNote("Filled all 5 channel drafts using Playbook templates. Click Save to persist.");
  };

  const handleGenerateAi = async () => {
    if (!form.title.trim()) {
      setStatusNote("Add a post title first before generating 1-to-7 assets.");
      return;
    }
    setGenerating(true);
    setStatusNote(null);
    try {
      const res = await fetch("/api/marketing-shield/v1/admin/resources/atomize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          excerpt: form.excerpt,
          bodyMarkdown: form.bodyMarkdown,
          category: form.category,
          slug: canonicalSlug,
          circularCode: form.circularCode || null,
          regulators: form.regulators,
          targetPersona: form.targetPersona || null,
          primaryKeyword: form.primaryKeyword || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate atomization kit");
      }
      applyKitToForm(data.kit);
      setStatusNote(
        data.source === "gemini"
          ? "Generated tailored 1-to-7 distribution copy with Gemini. Review, edit, and click Save."
          : "Generated 1-to-7 drafts from Playbook templates (Gemini key unavailable). Review & click Save.",
      );
    } catch (err) {
      setStatusNote(err instanceof Error ? err.message : "Failed to generate drafts.");
    } finally {
      setGenerating(false);
    }
  };

  const completedCount = form.atomCompletedChannels.length;

  return (
    <div className="space-y-5">
      {/* Header Control Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Share2 className="h-4 w-4 text-[#1D4ED8]" />
            <h3 className="text-[15px] font-semibold text-[#0B1220]">
              Phase 5 · The 1-to-7 Content Atomization Engine
            </h3>
            <span className="rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-[#1D4ED8]">
              {completedCount} / 7 Distributed
            </span>
          </div>
          <p className="mt-1 text-[12.5px] text-slate-600">
            Canonical URL (Source of Truth):{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11.5px] text-[#0B1220]">
              {canonicalUrl}
            </code>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => copyText("canonical", canonicalUrl)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12.5px] font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            {copiedKey === "canonical" ? (
              <Check className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            <span>{copiedKey === "canonical" ? "Copied URL" : "Copy URL"}</span>
          </button>

          <button
            type="button"
            onClick={handleFillTemplates}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-[12.5px] font-medium text-slate-800 hover:bg-slate-50 cursor-pointer"
          >
            <Wand2 className="h-3.5 w-3.5" />
            <span>Fill Playbook Templates</span>
          </button>

          <button
            type="button"
            disabled={generating}
            onClick={handleGenerateAi}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1D4ED8] px-3.5 py-2 text-[12.5px] font-semibold text-white hover:bg-[#1E40AF] disabled:opacity-50 cursor-pointer"
          >
            {generating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            <span>{generating ? "Generating..." : "Generate 1-to-7 with AI"}</span>
          </button>
        </div>
      </div>

      {statusNote && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/70 px-4 py-3 text-[13px] text-blue-900">
          {statusNote}
        </div>
      )}

      {/* Channel 1 & Channel 7 Quick Trackers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[13px] font-semibold text-[#0B1220]">
              1. Website Hub · Long-Form SEO Guide
            </p>
            <p className="mt-0.5 text-[12px] text-slate-500">
              Day 0 (Hour 0) · Published live at /resources/{form.category}/{canonicalSlug}
            </p>
          </div>
          <label className="inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-700 shrink-0 cursor-pointer">
            <input
              type="checkbox"
              checked={form.atomCompletedChannels.includes("website")}
              onChange={() => toggleChannelDone("website")}
              className="h-4 w-4 rounded border-slate-300 text-[#1D4ED8]"
            />
            <span>Done</span>
          </label>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2.5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[13px] font-semibold text-[#0B1220]">
                7. Search Indexing · GSC &amp; Internal Link Mesh
              </p>
              <p className="mt-0.5 text-[12px] text-slate-500">
                Day 0 (Hour 1) · Request indexing in Google Search Console &amp; link from 2 older
                posts.
              </p>
            </div>
            <label className="inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-700 shrink-0 cursor-pointer">
              <input
                type="checkbox"
                checked={form.atomCompletedChannels.includes("gsc")}
                onChange={() => toggleChannelDone("gsc")}
                className="h-4 w-4 rounded border-slate-300 text-[#1D4ED8]"
              />
              <span>Done</span>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <a
              href={`https://search.google.com/search-console/inspect?resource_id=${encodeURIComponent(
                "https://stem-cogent.com/",
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11.5px] font-medium text-[#1D4ED8] hover:bg-blue-50"
            >
              <span>Open Search Console</span>
              <ExternalLink className="h-3 w-3" />
            </a>

            <button
              type="button"
              onClick={() =>
                setForm((prev) => ({
                  ...prev,
                  atomGscIndexedAt: toDateInputValue(new Date().toISOString()),
                  atomCompletedChannels: prev.atomCompletedChannels.includes("gsc")
                    ? prev.atomCompletedChannels
                    : [...prev.atomCompletedChannels, "gsc"],
                }))
              }
              className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11.5px] font-medium text-emerald-700 hover:bg-emerald-100 cursor-pointer"
            >
              <CheckCircle2 className="h-3 w-3" />
              <span>
                {form.atomGscIndexedAt
                  ? `GSC Requested (${form.atomGscIndexedAt})`
                  : "Stamp GSC Requested"}
              </span>
            </button>

            <label className="inline-flex items-center gap-1.5 text-[11.5px] text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.atomInternalLinksUpdated}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, atomInternalLinksUpdated: e.target.checked }))
                }
                className="h-3.5 w-3.5 rounded border-slate-300 text-[#1D4ED8]"
              />
              <span>2+ older posts updated with links</span>
            </label>
          </div>
        </div>
      </div>

      {/* Channels 2–6 Editable Copy Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {CHANNEL_CARDS.map((card) => {
          if (!card.field) return null;
          const fieldName = card.field;
          const value = form[fieldName];
          const isDone = form.atomCompletedChannels.includes(card.id);

          return (
            <div
              key={card.id}
              className="rounded-xl border border-slate-200 bg-white p-5 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-[13.5px] font-semibold text-[#0B1220]">{card.title}</h4>
                  <p className="text-[11.5px] text-slate-500 mt-0.5">{card.timing}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{card.rule}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={!value.trim()}
                    onClick={() => copyText(card.id, value)}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11.5px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                  >
                    {copiedKey === card.id ? (
                      <Check className="h-3 w-3 text-emerald-600" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                    <span>{copiedKey === card.id ? "Copied" : "Copy"}</span>
                  </button>
                  <label className="inline-flex items-center gap-1 text-[11.5px] font-medium text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isDone}
                      onChange={() => toggleChannelDone(card.id)}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-[#1D4ED8]"
                    />
                    <span>Done</span>
                  </label>
                </div>
              </div>

              <textarea
                rows={8}
                value={value}
                onChange={(e) => setForm((prev) => ({ ...prev, [fieldName]: e.target.value }))}
                placeholder={`Click "Generate 1-to-7 with AI" or "Fill Playbook Templates" above to populate ${card.title}...`}
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-[12.5px] leading-relaxed text-[#0B1220] focus:border-[#1D4ED8] focus:bg-white focus:outline-none"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
