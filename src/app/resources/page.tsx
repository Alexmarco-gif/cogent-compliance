import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Calendar, FileText, Film, Newspaper } from "lucide-react";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { ExecutiveCtaBanner } from "@/components/marketing/ExecutiveCtaBanner";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import {
  RESOURCE_CATEGORIES,
  RESOURCE_CATEGORY_META,
  type ResourceCategory,
} from "@/contracts/resources.contracts";
import { resourcesService } from "@/modules/resources/resources.service";
import { ResourceCategoryHero } from "@/components/marketing/resources/ResourceCategoryHero";
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

const CATEGORY_ICONS: Record<ResourceCategory, React.ElementType> = {
  insights: Newspaper,
  videos: Film,
  reports: FileText,
  events: Calendar,
};

export default async function ResourcesPage() {
  const posts = await resourcesService.listPublishedResources({ limit: 48 });
  const featuredPost = posts.find((p) => p.featured) || posts[0] || null;
  const remainingPosts = featuredPost ? posts.filter((p) => p.id !== featuredPost.id) : [];

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
          titleLeading="Regulatory clarity,"
          titleAccent="published for operators."
          description="Insights & news, video briefings, downloadable reports, and events built for Nigerian and African fintech founders, Chief Compliance Officers, and General Counsel."
        />
      </div>

      <main className="flex-1">
        {/* 4 Category Quick Cards */}
        <section className="border-b border-slate-100 bg-slate-50/50 py-10">
          <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {RESOURCE_CATEGORIES.map((cat) => {
                const Icon = CATEGORY_ICONS[cat];
                const meta = RESOURCE_CATEGORY_META[cat];
                const count = posts.filter((p) => p.category === cat).length;
                return (
                  <Link
                    key={cat}
                    href={`/resources/${cat}`}
                    className="group rounded-xl border border-slate-200 bg-white p-5 hover:border-[#1D4ED8]/50 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <Icon className="h-4.5 w-4.5 text-[#1D4ED8]" strokeWidth={1.8} />
                      <span className="font-mono text-[10.5px] text-slate-400">
                        {count} {count === 1 ? "item" : "items"}
                      </span>
                    </div>
                    <h2 className="mt-3 text-[15.5px] font-semibold text-[#0B1220] group-hover:text-[#1D4ED8]">
                      {meta.label}
                    </h2>
                    <p className="mt-1 text-[12.5px] leading-snug text-slate-600">
                      {meta.description}
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* Featured + Latest Feed */}
        <section className="py-14 sm:py-16">
          <div className="mx-auto max-w-[1200px] px-5 sm:px-8 space-y-12">
            {featuredPost ? (
              <>
                <div>
                  <p className="mb-4 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[#1D4ED8]">
                    FEATURED RESOURCE
                  </p>
                  <ResourceCard post={featuredPost} featured />
                </div>

                {remainingPosts.length > 0 && (
                  <div>
                    <div className="mb-6 flex items-center justify-between">
                      <h2 className="text-[22px] font-semibold tracking-tight text-[#0B1220]">
                        Latest Publications
                      </h2>
                    </div>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {remainingPosts.map((post) => (
                        <ResourceCard key={post.id} post={post} />
                      ))}
                    </div>
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
