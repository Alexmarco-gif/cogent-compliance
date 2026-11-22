import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  Clock,
  FileDown,
  FileText,
  Film,
  MapPin,
  Newspaper,
  Play,
} from "lucide-react";
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

function formatDisplayDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function ResourceCard({
  post,
  featured = false,
}: {
  post: ResourcePost;
  featured?: boolean;
}) {
  const Icon = CATEGORY_ICONS[post.category];
  const meta = RESOURCE_CATEGORY_META[post.category];
  const href = `/resources/${post.category}/${post.slug}`;
  const displayDate =
    post.category === "events" && post.eventStartsAt
      ? formatDisplayDate(post.eventStartsAt)
      : formatDisplayDate(post.publishedAt || post.createdAt);

  return (
    <Link
      href={href}
      className={`group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition-all hover:border-slate-300 hover:shadow-md ${
        featured ? "lg:grid lg:grid-cols-12" : ""
      }`}
    >
      {/* Visual Header */}
      <div
        className={`relative overflow-hidden bg-slate-100 border-b border-slate-100 ${
          featured ? "lg:col-span-6 lg:border-b-0 lg:border-r min-h-[240px]" : "aspect-[16/9]"
        }`}
      >
        {post.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.coverImageUrl}
            alt={post.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full flex-col justify-between bg-gradient-to-br from-slate-50 via-white to-blue-50/60 p-5">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 font-mono text-[10.5px] font-semibold uppercase tracking-wider text-[#1D4ED8]">
                <Icon className="h-3.5 w-3.5" />
                {meta.shortLabel}
              </span>
              {post.category === "videos" && (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1D4ED8] text-white">
                  <Play className="h-3.5 w-3.5 ml-0.5" />
                </span>
              )}
            </div>
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-slate-400">
              {meta.tagline}
            </p>
          </div>
        )}

        {post.category === "videos" && post.coverImageUrl && (
          <div className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-[#0B1220]/85 text-white shadow">
            <Play className="h-4 w-4 ml-0.5" />
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className={`flex flex-1 flex-col p-5 sm:p-6 ${featured ? "lg:col-span-6 lg:p-8" : ""}`}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-0.5 font-mono text-[10.5px] font-semibold uppercase tracking-wider text-[#1D4ED8]">
            <Icon className="h-3 w-3" />
            {meta.label}
          </span>
          {post.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[10.5px] text-slate-600"
            >
              {tag}
            </span>
          ))}
        </div>

        <h3
          className={`mt-3 font-semibold tracking-tight text-[#0B1220] group-hover:text-[#1D4ED8] transition-colors ${
            featured ? "text-[22px] sm:text-[26px] leading-[1.2]" : "text-[17px] leading-[1.3]"
          }`}
        >
          {post.title}
        </h3>

        {post.excerpt && (
          <p className="mt-2.5 line-clamp-3 text-[13.5px] leading-relaxed text-slate-600">
            {post.excerpt}
          </p>
        )}

        <div className="mt-auto pt-5 flex items-center justify-between border-t border-slate-100 text-[12px] text-slate-500">
          <div className="flex flex-wrap items-center gap-3">
            {displayDate && <span>{displayDate}</span>}
            {post.category === "insights" && post.readingTimeMinutes && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {post.readingTimeMinutes} min read
              </span>
            )}
            {post.category === "videos" && post.videoDuration && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {post.videoDuration}
              </span>
            )}
            {post.category === "reports" && (
              <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                <FileDown className="h-3.5 w-3.5 text-[#1D4ED8]" />
                {post.reportFileLabel || "Report"}
              </span>
            )}
            {post.category === "events" && post.eventLocation && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {post.eventLocation}
              </span>
            )}
          </div>

          <span className="inline-flex items-center gap-1 font-semibold text-[#1D4ED8]">
            <span>
              {post.category === "videos"
                ? "Watch"
                : post.category === "reports"
                  ? "View"
                  : post.category === "events"
                    ? "Details"
                    : "Read"}
            </span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
