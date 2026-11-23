import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { ExecutiveCtaBanner } from "@/components/marketing/ExecutiveCtaBanner";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import {
  RESOURCE_CATEGORIES,
  RESOURCE_CATEGORY_META,
} from "@/contracts/resources.contracts";
import { resourcesService } from "@/modules/resources/resources.service";
import { ResourceCategoryHero } from "@/components/marketing/resources/ResourceCategoryHero";
import { ResourceSpotlightSection } from "@/components/marketing/resources/ResourceSpotlightSection";
import { ResourceCard } from "@/components/marketing/resources/ResourceCard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Resources Hub | Insights, Videos, Reports & Events",
  description:
    "Cogent's editorial hub for Nigerian and African financial regulations—covering insights & news, video briefings, downloadable compliance reports, and live events.",
  alternates: {
    canonical: "/resources",
  },
  openGraph: {
    title: "Resources Hub | Cogent by Stem Systems",
    description:
      "Insights & news, video briefings, downloadable compliance reports, and regulatory events for fintechs and banks.",
    url: "/resources",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function ResourcesPage() {
  const posts = await resourcesService.listPublishedResources({ limit: 48 });
  const heroPost = posts.find((p) => p.featured) || posts[0] || null;
  const nonHeroPosts = heroPost ? posts.filter((p) => p.id !== heroPost.id) : [];
  const sidePosts = nonHeroPosts.slice(0, 4);
  // If more than 5 posts exist, render #6+ in the main Latest grid; if 1-5 posts exist, still show all posts in the 3-column grid so the grid is always populated.
  const latestGridPosts = nonHeroPosts.length > 4 ? nonHeroPosts.slice(4) : posts;

  const postsByCategory = RESOURCE_CATEGORIES.map((category) => ({
    category,
    meta: RESOURCE_CATEGORY_META[category],
    items: posts.filter((p) => p.category === category).slice(0, 3),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="min-h-screen bg-white text-[#0B1220] flex flex-col">
      <div className="relative cogent-editorial-canvas border-b border-slate-200">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 cogent-hairline-grid"
        />
        <MarketingHeader />

        <ResourceCategoryHero
          activeCategory="all"
          eyebrow="COGENT RESOURCES & RESEARCH HUB"
          titleLeading="News, Insights"
          titleAccent="& Regulatory Briefings."
          description="Read the latest compliance breakdowns, video briefings, downloadable reports, and regulatory events for Nigerian and African fintechs and banks."
        />
      </div>

      <main className="flex-1">
        <section className="py-12 sm:py-16">
          <div className="mx-auto max-w-[1200px] px-5 sm:px-8 space-y-16">
            {heroPost ? (
              <>
                {/* Top Asymmetric Spotlight: Newest Post Left + Next 4 Stacked Right */}
                <ResourceSpotlightSection heroPost={heroPost} sidePosts={sidePosts} />

                {/* 3-Column Latest Grid */}
                {latestGridPosts.length > 0 && (
                  <div className="border-t border-slate-200 pt-12">
                    <div className="mb-8 flex items-center justify-between">
                      <h2 className="text-[24px] sm:text-[28px] font-semibold tracking-[-0.02em] text-[#0B1220]">
                        Latest articles &amp; releases
                      </h2>
                    </div>
                    <div className="grid grid-cols-1 gap-x-7 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
                      {latestGridPosts.map((post) => (
                        <ResourceCard key={post.id} post={post} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Dedicated 3-Column Section Rows (Insights & News, Videos, Reports, Events) */}
                {postsByCategory.length > 1 && (
                  <div className="space-y-14 border-t border-slate-200 pt-12">
                    {postsByCategory.map((group) => (
                      <div key={group.category}>
                        <div className="mb-7 flex items-end justify-between gap-4">
                          <div>
                            <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#1D4ED8]">
                              {group.meta.tagline}
                            </p>
                            <h2 className="mt-1 text-[22px] sm:text-[24px] font-semibold tracking-[-0.02em] text-[#0B1220]">
                              {group.meta.label}
                            </h2>
                          </div>
                          <Link
                            href={`/resources/${group.category}`}
                            className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#1D4ED8] hover:underline shrink-0"
                          >
                            <span>View all {group.meta.shortLabel}</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                        <div className="grid grid-cols-1 gap-x-7 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
                          {group.items.map((post) => (
                            <ResourceCard key={post.id} post={post} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-12 text-center">
                <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#1D4ED8]">
                  RESOURCES HUB
                </p>
                <h2 className="mt-2 text-[22px] font-semibold text-[#0B1220]">
                  First articles, videos &amp; reports publishing soon
                </h2>
                <p className="mx-auto mt-2 max-w-lg text-[14px] text-slate-600">
                  We are preparing practical CBN, SEC, NDPC, and FCCPC guides, downloadable checklists, and video briefings.
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <Link
                    href="/resources/faq"
                    className="inline-flex items-center gap-1.5 rounded-md bg-[#0B1220] px-4 py-2 text-[13px] font-medium text-white hover:bg-slate-800"
                  >
                    <span>Explore Compliance FAQ</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                  <Link
                    href="/solutions"
                    className="rounded-md border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
                  >
                    View Solutions
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>

        <ExecutiveCtaBanner />
      </main>

      <MarketingFooter />
    </div>
  );
}
