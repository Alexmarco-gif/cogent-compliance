import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Clock,
  ExternalLink,
  FileDown,
  HelpCircle,
  Info,
  MapPin,
  Scale,
  ShieldCheck,
  User2,
} from "lucide-react";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { ExecutiveCtaBanner } from "@/components/marketing/ExecutiveCtaBanner";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import {
  CONTENT_PILLAR_META,
  RESOURCE_CATEGORY_META,
  isResourceCategory,
  isSafeResourceUrl,
} from "@/contracts/resources.contracts";
import { resourcesService } from "@/modules/resources/resources.service";
import { extractMarkdownHeadings } from "@/modules/resources/resources-playbook.helpers";
import { getPublicSiteUrl } from "@/lib/site-url";
import { MarkdownArticleBody } from "@/components/marketing/resources/MarkdownArticleBody";
import { ResourceEmbedPlayer } from "@/components/marketing/resources/ResourceEmbedPlayer";
import { ResourceCard } from "@/components/marketing/resources/ResourceCard";

export const dynamic = "force-dynamic";

function formatFullDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatEventDateTime(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}): Promise<Metadata> {
  const { category, slug } = await params;
  if (!isResourceCategory(category)) {
    return { title: "Resource Not Found" };
  }

  const post = await resourcesService.getPublishedResourceBySlug(category, slug);
  if (!post) {
    return { title: "Resource Not Found" };
  }

  const title = post.seoTitle || post.title;
  const description =
    post.seoDescription || post.excerpt || RESOURCE_CATEGORY_META[category].description;
  const keywords = Array.from(
    new Set(
      [
        post.primaryKeyword,
        ...post.secondaryKeywords,
        ...post.regulators,
        ...post.tags,
      ].filter((v): v is string => Boolean(v && v.trim())),
    ),
  );

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: `/resources/${category}/${post.slug}`,
    },
    openGraph: {
      type: "article",
      title,
      description,
      url: `/resources/${category}/${post.slug}`,
      images: post.coverImageUrl ? [{ url: post.coverImageUrl, alt: post.title }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: post.coverImageUrl ? [post.coverImageUrl] : undefined,
    },
  };
}

export default async function ResourceDetailPage({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category, slug } = await params;
  if (!isResourceCategory(category)) {
    notFound();
  }

  const post = await resourcesService.getPublishedResourceBySlug(category, slug);
  if (!post) {
    notFound();
  }

  const related = await resourcesService.listRelatedPublishedResources(post, 3);
  const meta = RESOURCE_CATEGORY_META[category];
  const pillarMeta = post.contentPillar ? CONTENT_PILLAR_META[post.contentPillar] : null;
  const siteUrl = getPublicSiteUrl();
  const displayDate = formatFullDate(post.publishedAt || post.createdAt);
  const updatedDate = formatFullDate(post.lastStatutoryAuditAt || post.updatedAt);
  const effectiveDateLabel = formatFullDate(post.effectiveDate);
  const eventDate = formatEventDateTime(post.eventStartsAt);

  const tocHeadings = extractMarkdownHeadings(post.bodyMarkdown).filter((h) => h.level === 2);
  const hasRegulatorySnapshot = Boolean(
    post.circularCode ||
      post.regulators.length > 0 ||
      effectiveDateLabel ||
      post.authoritativeSources.length > 0,
  );
  const validFaqs = post.faqItems.filter(
    (item) => item.question.trim().length > 0 && item.answer.trim().length > 0,
  );

  const schemaGraph: Record<string, unknown>[] = [
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${siteUrl}/` },
        { "@type": "ListItem", position: 2, name: "Resources", item: `${siteUrl}/resources` },
        {
          "@type": "ListItem",
          position: 3,
          name: meta.label,
          item: `${siteUrl}/resources/${category}`,
        },
        {
          "@type": "ListItem",
          position: 4,
          name: post.title,
          item: `${siteUrl}/resources/${category}/${post.slug}`,
        },
      ],
    },
    {
      "@type": category === "events" ? "Event" : "Article",
      headline: post.title,
      name: post.title,
      description: post.seoDescription || post.excerpt,
      datePublished: post.publishedAt || post.createdAt,
      dateModified: post.updatedAt,
      author: {
        "@type": "Person",
        name: post.authorName,
      },
      publisher: {
        "@type": "Organization",
        name: "Cogent by Stem Systems",
        url: siteUrl,
      },
      ...(post.coverImageUrl ? { image: post.coverImageUrl } : {}),
      ...(category === "events" && post.eventStartsAt ? { startDate: post.eventStartsAt } : {}),
    },
  ];

  if (validFaqs.length > 0) {
    schemaGraph.push({
      "@type": "FAQPage",
      mainEntity: validFaqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    });
  }

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": schemaGraph,
  };

  return (
    <div className="min-h-screen bg-white text-[#0B1220] flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <div className="relative cogent-editorial-canvas border-b border-slate-200">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 cogent-hairline-grid"
        />
        <MarketingHeader />

        <section className="relative z-10 py-10 sm:py-14">
          <div className="mx-auto max-w-[900px] px-5 sm:px-8">
            <Link
              href={`/resources/${category}`}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-600 hover:text-[#1D4ED8]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to {meta.label}</span>
            </Link>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="rounded bg-blue-50 px-2.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-[#1D4ED8]">
                {meta.label}
              </span>
              {pillarMeta && (
                <span className="rounded border border-slate-200 bg-slate-50 px-2.5 py-0.5 font-mono text-[11px] font-medium text-slate-700">
                  {pillarMeta.shortLabel}
                </span>
              )}
              {post.regulators.map((reg) => (
                <span
                  key={`reg-${reg}`}
                  className="rounded border border-blue-200 bg-white px-2.5 py-0.5 font-mono text-[11px] font-semibold text-[#1D4ED8]"
                >
                  {reg}
                </span>
              ))}
              {post.tags
                .filter((tag) => !post.regulators.includes(tag))
                .map((tag) => (
                  <span
                    key={tag}
                    className="rounded border border-slate-200 bg-white px-2.5 py-0.5 font-mono text-[11px] text-slate-600"
                  >
                    {tag}
                  </span>
                ))}
            </div>

            <h1 className="mt-4 text-[30px] sm:text-[42px] font-semibold leading-[1.1] tracking-[-0.03em] text-[#0B1220]">
              {post.title}
            </h1>

            {post.excerpt && (
              <p className="mt-4 text-[17px] leading-[1.6] text-slate-600">{post.excerpt}</p>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-slate-200/80 pt-4 text-[13px] text-slate-600">
              <span className="inline-flex items-center gap-1.5 font-medium text-[#0B1220]">
                <User2 className="h-4 w-4 text-slate-400" />
                {post.authorName}
                {post.authorRole && (
                  <span className="font-normal text-slate-500">· {post.authorRole}</span>
                )}
              </span>
              {displayDate && (
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  {displayDate}
                </span>
              )}
              {post.qaChecklist?.statutoryAccuracyVerified && updatedDate && (
                <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  Statutory Verified · {updatedDate}
                </span>
              )}
              {post.category === "insights" && post.readingTimeMinutes && (
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-slate-400" />
                  {post.readingTimeMinutes} min read
                </span>
              )}
              {post.category === "videos" && post.videoDuration && (
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-slate-400" />
                  {post.videoDuration}
                </span>
              )}
            </div>
          </div>
        </section>
      </div>

      <main className="flex-1">
        <article className="py-12 sm:py-14">
          <div className="mx-auto max-w-[900px] px-5 sm:px-8 space-y-8">
            {/* Phase 6 Regulatory Refresh Callout Banner */}
            {post.updateCalloutNote && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-5 py-4 flex items-start gap-3">
                <Info className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
                <div className="text-[14px] leading-relaxed text-amber-950">
                  <p className="font-mono text-[10.5px] font-semibold uppercase tracking-wider text-amber-800">
                    REGULATORY UPDATE
                  </p>
                  <p className="mt-1">{post.updateCalloutNote}</p>
                </div>
              </div>
            )}

            {/* Executive Regulatory Snapshot Card */}
            {hasRegulatorySnapshot && (
              <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-5 sm:p-6">
                <div className="flex items-center gap-2">
                  <Scale className="h-4 w-4 text-[#1D4ED8]" />
                  <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[#1D4ED8]">
                    REGULATORY SNAPSHOT &amp; PRIMARY SOURCES
                  </h2>
                </div>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {post.circularCode && (
                    <div className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5">
                      <p className="text-[11px] font-medium text-slate-500">Circular / Statute Ref</p>
                      <p className="mt-0.5 font-mono text-[13px] font-semibold text-[#0B1220] break-all">
                        {post.circularCode}
                      </p>
                    </div>
                  )}
                  {post.regulators.length > 0 && (
                    <div className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5">
                      <p className="text-[11px] font-medium text-slate-500">Regulator Scope</p>
                      <p className="mt-0.5 text-[13.5px] font-semibold text-[#0B1220]">
                        {post.regulators.join(" · ")}
                      </p>
                    </div>
                  )}
                  {effectiveDateLabel && (
                    <div className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5">
                      <p className="text-[11px] font-medium text-slate-500">
                        Effective / Deadline Date
                      </p>
                      <p className="mt-0.5 text-[13.5px] font-semibold text-[#0B1220]">
                        {effectiveDateLabel}
                      </p>
                    </div>
                  )}
                </div>

                {post.authoritativeSources.length > 0 && (
                  <div className="mt-4 border-t border-slate-200/80 pt-3.5">
                    <p className="text-[11.5px] font-semibold uppercase tracking-wider text-slate-500">
                      Authoritative Statutory Sources
                    </p>
                    <ul className="mt-2 space-y-1.5">
                      {post.authoritativeSources.map((source, idx) => {
                        const safeUrl =
                          source.url && isSafeResourceUrl(source.url) ? source.url : null;
                        return (
                          <li
                            key={`${source.title}-${idx}`}
                            className="flex flex-wrap items-center gap-x-2 text-[13.5px] text-slate-700"
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-[#1D4ED8] shrink-0" />
                            {safeUrl ? (
                              <a
                                href={safeUrl}
                                target={safeUrl.startsWith("http") ? "_blank" : undefined}
                                rel={
                                  safeUrl.startsWith("http") ? "noopener noreferrer" : undefined
                                }
                                className="inline-flex items-center gap-1 font-medium text-[#1D4ED8] hover:underline"
                              >
                                <span>{source.title}</span>
                                {safeUrl.startsWith("http") && (
                                  <ExternalLink className="h-3 w-3 shrink-0" />
                                )}
                              </a>
                            ) : (
                              <span className="font-medium text-[#0B1220]">{source.title}</span>
                            )}
                            {source.code && (
                              <span className="font-mono text-[11.5px] text-slate-500">
                                ({source.code})
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </section>
            )}

            {/* Embedded Video Player (Videos or Event Replay) */}
            {post.videoEmbedUrl && (
              <ResourceEmbedPlayer
                url={post.videoEmbedUrl}
                title={post.title}
                posterUrl={post.coverImageUrl}
              />
            )}

            {/* Cover Image (when not replaced by video player or for articles/reports/events) */}
            {post.coverImageUrl && !post.videoEmbedUrl && (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={post.coverImageUrl}
                  alt={post.title}
                  className="max-h-[480px] w-full object-cover"
                />
              </div>
            )}

            {/* Report Download Card */}
            {post.category === "reports" && post.reportFileUrl && (
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#1D4ED8]">
                    {post.reportFileLabel || "Downloadable Material"}
                  </p>
                  <p className="mt-1 text-[16px] font-semibold text-[#0B1220]">
                    Access the full report &amp; checklist
                  </p>
                </div>
                <a
                  href={post.reportFileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1D4ED8] px-5 py-2.5 text-[13.5px] font-semibold text-white hover:bg-[#1E40AF] shrink-0"
                >
                  <FileDown className="h-4 w-4" />
                  <span>Download / Open Report</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            )}

            {/* Event Details & Registration Card */}
            {post.category === "events" &&
              (eventDate || post.eventLocation || post.eventRegistrationUrl) && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="space-y-1.5">
                    <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#1D4ED8]">
                      EVENT DETAILS
                    </p>
                    {eventDate && (
                      <p className="flex items-center gap-2 text-[14.5px] font-semibold text-[#0B1220]">
                        <Calendar className="h-4 w-4 text-[#1D4ED8]" />
                        <span>{eventDate}</span>
                      </p>
                    )}
                    {post.eventLocation && (
                      <p className="flex items-center gap-2 text-[13.5px] text-slate-600">
                        <MapPin className="h-4 w-4 text-slate-400" />
                        <span>{post.eventLocation}</span>
                      </p>
                    )}
                  </div>
                  {post.eventRegistrationUrl && (
                    <a
                      href={post.eventRegistrationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0B1220] px-5 py-2.5 text-[13.5px] font-semibold text-white hover:bg-slate-800 shrink-0"
                    >
                      <span>Register / Join Event</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              )}

            {/* Auto Table of Contents for Long-Form Guides */}
            {tocHeadings.length >= 3 && (
              <nav
                aria-label="Table of contents"
                className="rounded-xl border border-slate-200 bg-white p-5"
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-[#1D4ED8]" />
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    ON THIS PAGE
                  </p>
                </div>
                <ol className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-[13.5px]">
                  {tocHeadings.map((h, idx) => (
                    <li key={h.id}>
                      <a
                        href={`#${h.id}`}
                        className="inline-flex items-baseline gap-2 text-slate-700 hover:text-[#1D4ED8]"
                      >
                        <span className="font-mono text-[11px] text-slate-400">
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <span>{h.text}</span>
                      </a>
                    </li>
                  ))}
                  {validFaqs.length > 0 && (
                    <li>
                      <a
                        href="#frequently-asked-questions"
                        className="inline-flex items-baseline gap-2 text-slate-700 hover:text-[#1D4ED8]"
                      >
                        <span className="font-mono text-[11px] text-slate-400">
                          {String(tocHeadings.length + 1).padStart(2, "0")}
                        </span>
                        <span>Frequently Asked Questions</span>
                      </a>
                    </li>
                  )}
                </ol>
              </nav>
            )}

            {/* Body Content + Contextual Mid-Article CTA */}
            <MarkdownArticleBody
              markdown={post.bodyMarkdown}
              midArticleCta={post.midArticleCta}
            />

            {/* Structured FAQ Section (Backed by FAQPage JSON-LD) */}
            {validFaqs.length > 0 && (
              <section
                id="frequently-asked-questions"
                className="scroll-mt-24 border-t border-slate-200 pt-10"
              >
                <div className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-[#1D4ED8]" />
                  <h2 className="text-[22px] sm:text-[24px] font-semibold tracking-[-0.02em] text-[#0B1220]">
                    Frequently Asked Questions
                  </h2>
                </div>
                <div className="mt-5 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
                  {validFaqs.map((faq, idx) => (
                    <details
                      key={`${faq.question}-${idx}`}
                      open={idx === 0}
                      className="group p-5"
                    >
                      <summary className="cursor-pointer list-none flex items-start justify-between gap-4 text-[15.5px] font-semibold text-[#0B1220]">
                        <span>{faq.question}</span>
                        <span className="font-mono text-[14px] text-slate-400 group-open:rotate-45 transition-transform shrink-0">
                          +
                        </span>
                      </summary>
                      <p className="mt-3 text-[14.5px] leading-[1.7] text-slate-600">
                        {faq.answer}
                      </p>
                    </details>
                  ))}
                </div>
              </section>
            )}

            {/* Standard Regulatory Legal Disclaimer */}
            {post.showLegalDisclaimer && (
              <aside className="rounded-lg border border-slate-200 bg-slate-50/70 px-5 py-4 text-[12.5px] leading-relaxed text-slate-500">
                <strong className="font-semibold text-slate-700">Regulatory Notice:</strong> This
                guide provides regulatory intelligence for informational purposes and does not
                constitute formal legal advice. Always verify institution-specific license
                conditions with your Chief Compliance Officer or qualified legal counsel.
              </aside>
            )}
          </div>
        </article>

        {/* Related Resources */}
        {related.length > 0 && (
          <section className="border-t border-slate-200 bg-slate-50/60 py-14">
            <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-[22px] font-semibold tracking-tight text-[#0B1220]">
                  More from Cogent Resources
                </h2>
                <Link
                  href="/resources"
                  className="text-[13px] font-semibold text-[#1D4ED8] hover:underline"
                >
                  View all &rarr;
                </Link>
              </div>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {related.map((item) => (
                  <ResourceCard key={item.id} post={item} />
                ))}
              </div>
            </div>
          </section>
        )}

        <ExecutiveCtaBanner />
      </main>

      <MarketingFooter />
    </div>
  );
}
