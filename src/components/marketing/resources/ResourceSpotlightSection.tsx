import React from "react";
import Link from "next/link";
import { Calendar, FileText, Film, Newspaper, Play } from "lucide-react";
import {
  RESOURCE_CATEGORY_META,
  type ResourceCategory,
  type ResourcePost,
} from "@/contracts/resources.contracts";

const CATEGORY_ICONS: Record<ResourceCategory, React.ElementType> = {
  insights: Newspaper,
  videos: Film,
  reports: FileText,
  events: Calendar,
};

const CATEGORY_SINGULAR: Record<ResourceCategory, string> = {
  insights: "Insight",
  videos: "Video",
  reports: "Report",
  events: "Event",
};

function formatDisplayDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0];
  if (!first) return "C";
  if (parts.length === 1) return first.slice(0, 2).toUpperCase();
  const last = parts[parts.length - 1] ?? first;
  return `${first[0] ?? "C"}${last[0] ?? ""}`.toUpperCase();
}

/**
 * Asymmetric Editorial Spotlight:
 * - Left (7 cols): Newest / Featured post with large 16:10 image, category, date, headline, and author
 * - Right (5 cols): Vertical stack of up to 4 recent posts with small horizontal thumbnails
 */
export function ResourceSpotlightSection({
  heroPost,
  sidePosts,
}: {
  heroPost: ResourcePost;
  sidePosts: ResourcePost[];
}) {
  const HeroIcon = CATEGORY_ICONS[heroPost.category];
  const heroDate =
    heroPost.category === "events" && heroPost.eventStartsAt
      ? formatDisplayDate(heroPost.eventStartsAt)
      : formatDisplayDate(heroPost.publishedAt || heroPost.createdAt);

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10 items-start">
      {/* Left: Newest / Featured Spotlight */}
      <Link
        href={`/resources/${heroPost.category}/${heroPost.slug}`}
        className={`group block ${sidePosts.length > 0 ? "lg:col-span-7" : "lg:col-span-12"}`}
      >
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
          {heroPost.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={heroPost.coverImageUrl}
              alt={heroPost.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="flex h-full w-full flex-col justify-between bg-gradient-to-br from-[#F8FAFC] via-white to-[#EEF4FF] p-7">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-[#1D4ED8]">
                  <HeroIcon className="h-3.5 w-3.5" />
                  {CATEGORY_SINGULAR[heroPost.category]}
                </span>
                {heroPost.category === "videos" && (
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#1D4ED8] text-white shadow">
                    <Play className="h-5 w-5 ml-0.5" />
                  </span>
                )}
              </div>
              <p className="font-mono text-[11.5px] uppercase tracking-[0.14em] text-slate-400">
                {RESOURCE_CATEGORY_META[heroPost.category].tagline}
              </p>
            </div>
          )}

          {heroPost.category === "videos" && heroPost.coverImageUrl && (
            <div className="absolute bottom-4 right-4 flex h-11 w-11 items-center justify-center rounded-full bg-[#0B1220]/85 text-white shadow-lg">
              <Play className="h-5 w-5 ml-0.5" />
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12.5px] text-slate-500">
          <span className="font-semibold text-[#1D4ED8]">
            {CATEGORY_SINGULAR[heroPost.category]}
          </span>
          {heroDate && (
            <>
              <span aria-hidden="true" className="text-slate-300">
                &middot;
              </span>
              <span>{heroDate}</span>
            </>
          )}
        </div>

        <h2 className="mt-2 text-[24px] sm:text-[30px] font-semibold leading-[1.18] tracking-[-0.025em] text-[#0B1220] group-hover:text-[#1D4ED8] transition-colors">
          {heroPost.title}
        </h2>

        {heroPost.excerpt && (
          <p className="mt-2.5 line-clamp-2 text-[14.5px] leading-relaxed text-slate-600 max-w-2xl">
            {heroPost.excerpt}
          </p>
        )}

        <div className="mt-4 flex items-center gap-2.5 text-[13px] text-slate-600">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 border border-slate-200 font-mono text-[10px] font-semibold text-slate-700">
            {getInitials(heroPost.authorName)}
          </span>
          <span className="font-medium text-slate-800">{heroPost.authorName}</span>
        </div>
      </Link>

      {/* Right: Stacked Compact Recent Posts */}
      {sidePosts.length > 0 && (
        <div className="lg:col-span-5 divide-y divide-slate-100 border-t border-b border-slate-100 lg:border-t-0 lg:border-b-0">
          {sidePosts.slice(0, 4).map((post) => {
            const Icon = CATEGORY_ICONS[post.category];
            const dateStr =
              post.category === "events" && post.eventStartsAt
                ? formatDisplayDate(post.eventStartsAt)
                : formatDisplayDate(post.publishedAt || post.createdAt);

            return (
              <Link
                key={post.id}
                href={`/resources/${post.category}/${post.slug}`}
                className="group flex items-start gap-4 py-4 first:pt-0 last:pb-0"
              >
                <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-100">
                  {post.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.coverImageUrl}
                      alt={post.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50/70">
                      <Icon className="h-5 w-5 text-[#1D4ED8]" strokeWidth={1.7} />
                    </div>
                  )}
                  {post.category === "videos" && post.coverImageUrl && (
                    <div className="absolute bottom-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#0B1220]/85 text-white">
                      <Play className="h-2.5 w-2.5 ml-0.5" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <span className="font-medium text-[#1D4ED8]">
                      {CATEGORY_SINGULAR[post.category]}
                    </span>
                    {dateStr && (
                      <>
                        <span aria-hidden="true" className="text-slate-300">
                          &middot;
                        </span>
                        <span className="truncate">{dateStr}</span>
                      </>
                    )}
                  </div>
                  <h3 className="mt-1 text-[14px] font-semibold leading-[1.35] text-[#0B1220] group-hover:text-[#1D4ED8] transition-colors line-clamp-2">
                    {post.title}
                  </h3>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
