import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Clock,
  ExternalLink,
  FileDown,
  MapPin,
  User2,
} from "lucide-react";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { ExecutiveCtaBanner } from "@/components/marketing/ExecutiveCtaBanner";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import {
  RESOURCE_CATEGORY_META,
  isResourceCategory,
} from "@/contracts/resources.contracts";
import { resourcesService } from "@/modules/resources/resources.service";
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
  const description = post.seoDescription || post.excerpt || RESOURCE_CATEGORY_META[category].description;

  return {
    title,
    description,
    keywords: post.tags,
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
  const siteUrl = getPublicSiteUrl();
  const displayDate = formatFullDate(post.publishedAt || post.createdAt);
  const eventDate = formatEventDateTime(post.eventStartsAt);

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
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
    ],
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
              {post.tags.map((tag) => (
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
            {post.category === "events" && (eventDate || post.eventLocation || post.eventRegistrationUrl) && (
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

            {/* Body Content */}
            <MarkdownArticleBody markdown={post.bodyMarkdown} />
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
