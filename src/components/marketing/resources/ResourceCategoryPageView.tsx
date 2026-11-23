import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { ExecutiveCtaBanner } from "@/components/marketing/ExecutiveCtaBanner";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import {
  RESOURCE_CATEGORY_META,
  type ResourceCategory,
} from "@/contracts/resources.contracts";
import { resourcesService } from "@/modules/resources/resources.service";
import { ResourceCategoryHero } from "./ResourceCategoryHero";
import { ResourceSpotlightSection } from "./ResourceSpotlightSection";
import { ResourceCard } from "./ResourceCard";

const SECTION_GRID_TITLE: Record<ResourceCategory, string> = {
  insights: "Latest articles",
  videos: "Latest videos",
  reports: "Latest reports",
  events: "Latest events",
};

export async function ResourceCategoryPageView({
  category,
  selectedTag,
}: {
  category: ResourceCategory;
  selectedTag?: string;
}) {
  const meta = RESOURCE_CATEGORY_META[category];
  const allPosts = await resourcesService.listPublishedResources({
    category,
    limit: 60,
  });

  const allTags = Array.from(new Set(allPosts.flatMap((p) => p.tags))).slice(0, 10);
  const posts = selectedTag
    ? allPosts.filter((p) => p.tags.some((t) => t.toLowerCase() === selectedTag.toLowerCase()))
    : allPosts;

  const isEvents = category === "events";
  const now = Date.now();
  const upcomingEvents = isEvents
    ? posts.filter((p) => !p.eventStartsAt || Date.parse(p.eventStartsAt) >= now)
    : [];
  const pastEvents = isEvents
    ? posts.filter((p) => p.eventStartsAt && Date.parse(p.eventStartsAt) < now)
    : [];

  const heroPost = posts.find((p) => p.featured) || posts[0] || null;
  const nonHeroPosts = heroPost ? posts.filter((p) => p.id !== heroPost.id) : [];
  const sidePosts = nonHeroPosts.slice(0, 4);
  const gridPosts = nonHeroPosts.length > 4 ? nonHeroPosts.slice(4) : posts;

  return (
    <div className="min-h-screen bg-white text-[#0B1220] flex flex-col">
      <div className="relative cogent-editorial-canvas border-b border-slate-200">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 cogent-hairline-grid"
        />
        <MarketingHeader />

        <ResourceCategoryHero
          activeCategory={category}
          eyebrow={`COGENT RESOURCES · ${meta.tagline.toUpperCase()}`}
          titleLeading={meta.label}
          titleAccent="for compliance teams."
          description={meta.description}
        />
      </div>

      <main className="flex-1">
        <section className="py-12 sm:py-16">
          <div className="mx-auto max-w-[1200px] px-5 sm:px-8 space-y-14">
            {/* Optional Tag Filter */}
            {allTags.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[11px] uppercase tracking-wider text-slate-400 mr-1">
                  Topics:
                </span>
                <Link
                  href={`/resources/${category}`}
                  className={`rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${
                    !selectedTag
                      ? "bg-[#1D4ED8] text-white"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  All
                </Link>
                {allTags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/resources/${category}?tag=${encodeURIComponent(tag)}`}
                    className={`rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${
                      selectedTag?.toLowerCase() === tag.toLowerCase()
                        ? "bg-[#1D4ED8] text-white"
                        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            )}

            {posts.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-12 text-center">
                <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#1D4ED8]">
                  {meta.label}
                </p>
                <h2 className="mt-2 text-[22px] font-semibold text-[#0B1220]">
                  New {meta.label.toLowerCase()} are being prepared
                </h2>
                <p className="mx-auto mt-2 max-w-md text-[14px] text-slate-600">
                  Explore our other regulatory resources or read answers to common compliance questions.
                </p>
                <div className="mt-6 flex items-center justify-center gap-3">
                  <Link
                    href="/resources"
                    className="inline-flex items-center gap-1.5 rounded-md bg-[#0B1220] px-4 py-2 text-[13px] font-medium text-white hover:bg-slate-800"
                  >
                    <span>Browse All Resources</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                  <Link
                    href="/resources/faq"
                    className="rounded-md border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
                  >
                    View FAQ
                  </Link>
                </div>
              </div>
            ) : isEvents ? (
              <div className="space-y-14">
                {heroPost && (
                  <ResourceSpotlightSection heroPost={heroPost} sidePosts={sidePosts} />
                )}

                {upcomingEvents.length > 0 && (
                  <div className="border-t border-slate-200 pt-10">
                    <h2 className="mb-7 text-[24px] font-semibold tracking-[-0.02em] text-[#0B1220]">
                      Upcoming Events &amp; Webinars
                    </h2>
                    <div className="grid grid-cols-1 gap-x-7 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
                      {upcomingEvents.map((post) => (
                        <ResourceCard key={post.id} post={post} />
                      ))}
                    </div>
                  </div>
                )}

                {pastEvents.length > 0 && (
                  <div className="border-t border-slate-200 pt-10">
                    <h2 className="mb-7 text-[24px] font-semibold tracking-[-0.02em] text-[#0B1220]">
                      Past Events &amp; Session Recaps
                    </h2>
                    <div className="grid grid-cols-1 gap-x-7 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
                      {pastEvents.map((post) => (
                        <ResourceCard key={post.id} post={post} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                {heroPost && (
                  <ResourceSpotlightSection heroPost={heroPost} sidePosts={sidePosts} />
                )}

                {gridPosts.length > 0 && (
                  <div className="border-t border-slate-200 pt-12">
                    <h2 className="mb-8 text-[24px] sm:text-[28px] font-semibold tracking-[-0.02em] text-[#0B1220]">
                      {SECTION_GRID_TITLE[category]}
                    </h2>
                    <div className="grid grid-cols-1 gap-x-7 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
                      {gridPosts.map((post) => (
                        <ResourceCard key={post.id} post={post} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        <ExecutiveCtaBanner />
      </main>

      <MarketingFooter />
    </div>
  );
}
