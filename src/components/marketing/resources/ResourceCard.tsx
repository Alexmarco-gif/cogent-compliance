import React from "react";
import Link from "next/link";
import { Calendar, Clock, FileDown, FileText, Film, MapPin, Newspaper, Play } from "lucide-react";
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

export function ResourceCard({ post }: { post: ResourcePost }) {
  const Icon = CATEGORY_ICONS[post.category];
  const meta = RESOURCE_CATEGORY_META[post.category];
  const href = `/resources/${post.category}/${post.slug}`;
  const displayDate =
    post.category === "events" && post.eventStartsAt
      ? formatDisplayDate(post.eventStartsAt)
      : formatDisplayDate(post.publishedAt || post.createdAt);

  return (
    <Link href={href} className="group flex flex-col">
      {/* Crisp 16:10 Image Thumbnail */}
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-lg border border-slate-200/90 bg-slate-100">
        {post.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.coverImageUrl}
            alt={post.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full flex-col justify-between bg-gradient-to-br from-[#F8FAFC] via-white to-[#EEF4FF] p-4">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded border border-slate-200 bg-white px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#1D4ED8]">
                <Icon className="h-3 w-3" />
                {CATEGORY_SINGULAR[post.category]}
              </span>
              {post.category === "videos" && (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1D4ED8] text-white shadow-sm">
                  <Play className="h-3.5 w-3.5 ml-0.5" />
                </span>
              )}
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-slate-400">
                {meta.tagline}
              </p>
            </div>
          </div>
        )}

        {post.category === "videos" && post.coverImageUrl && (
          <div className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-[#0B1220]/85 text-white shadow-md">
            <Play className="h-4 w-4 ml-0.5" />
          </div>
        )}
      </div>

      {/* Category & Date Row */}
      <div className="mt-3.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] text-slate-500">
        <span className="font-medium text-[#1D4ED8]">{CATEGORY_SINGULAR[post.category]}</span>
        {displayDate && (
          <>
            <span aria-hidden="true" className="text-slate-300">
              &middot;
            </span>
            <span>{displayDate}</span>
          </>
        )}
        {post.category === "videos" && post.videoDuration && (
          <>
            <span aria-hidden="true" className="text-slate-300">
              &middot;
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {post.videoDuration}
            </span>
          </>
        )}
        {post.category === "reports" && post.reportFileLabel && (
          <>
            <span aria-hidden="true" className="text-slate-300">
              &middot;
            </span>
            <span className="inline-flex items-center gap-1">
              <FileDown className="h-3 w-3" />
              {post.reportFileLabel}
            </span>
          </>
        )}
        {post.category === "events" && post.eventLocation && (
          <>
            <span aria-hidden="true" className="text-slate-300">
              &middot;
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {post.eventLocation}
            </span>
          </>
        )}
      </div>

      {/* Headline */}
      <h3 className="mt-1.5 text-[16.5px] font-semibold leading-[1.35] tracking-[-0.01em] text-[#0B1220] group-hover:text-[#1D4ED8] transition-colors line-clamp-2">
        {post.title}
      </h3>

      {/* Author Row */}
      <div className="mt-3 flex items-center gap-2 text-[12.5px] text-slate-600">
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 border border-slate-200 font-mono text-[9.5px] font-semibold text-slate-700">
          {getInitials(post.authorName)}
        </span>
        <span className="truncate font-medium text-slate-700">{post.authorName}</span>
      </div>
    </Link>
  );
}
