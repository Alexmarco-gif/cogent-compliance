import React from "react";
import { ExternalLink, Play } from "lucide-react";
import { normalizeVideoSource } from "@/contracts/resources.contracts";

export function ResourceEmbedPlayer({
  url,
  title,
  posterUrl,
}: {
  url: string;
  title: string;
  posterUrl?: string | null;
}) {
  const source = normalizeVideoSource(url);
  if (!source.originalUrl) return null;

  if (source.kind === "iframe") {
    return (
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-950 shadow-sm aspect-video">
        <iframe
          src={source.embedUrl}
          title={title}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  if (source.kind === "video") {
    return (
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-950 shadow-sm aspect-video">
        <video
          src={source.embedUrl}
          poster={posterUrl || undefined}
          controls
          playsInline
          className="h-full w-full object-contain"
        />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="flex items-start gap-3.5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#1D4ED8] text-white">
          <Play className="h-5 w-5" />
        </div>
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-slate-500">
            {source.providerLabel}
          </p>
          <p className="mt-0.5 text-[15px] font-semibold text-[#0B1220]">{title}</p>
          <p className="mt-0.5 text-[13px] text-slate-600">
            Watch the full briefing on {source.providerLabel}.
          </p>
        </div>
      </div>
      <a
        href={source.originalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#0B1220] px-4 py-2.5 text-[13px] font-medium text-white hover:bg-slate-800 shrink-0"
      >
        <span>Watch Video</span>
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}
