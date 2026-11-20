"use client";

import React from "react";

/**
 * Sleek 3-bar harmonic pulse indicator — replaces generic boring spinning icons.
 */
export function CogentPulseIndicator({
  size = "sm",
  tone = "brand",
}: {
  size?: "xs" | "sm" | "md";
  tone?: "brand" | "light" | "neutral";
}) {
  const heightClass = size === "xs" ? "h-3" : size === "md" ? "h-4" : "h-3.5";
  const barWidth = size === "xs" ? "w-[2px]" : "w-[2.5px]";
  const colorClass =
    tone === "light"
      ? "bg-white"
      : tone === "neutral"
        ? "bg-zinc-600"
        : "bg-[#1D4ED8]";

  return (
    <span
      aria-hidden="true"
      className={`inline-flex items-center gap-[2.5px] ${heightClass} shrink-0`}
    >
      <span
        className={`${barWidth} h-full rounded-full ${colorClass} cogent-wave-bar`}
        style={{ animationDelay: "0ms" }}
      />
      <span
        className={`${barWidth} h-full rounded-full ${colorClass} cogent-wave-bar`}
        style={{ animationDelay: "140ms" }}
      />
      <span
        className={`${barWidth} h-full rounded-full ${colorClass} cogent-wave-bar`}
        style={{ animationDelay: "280ms" }}
      />
    </span>
  );
}

/**
 * Content-shaped shimmer skeleton for the main Chat Workspace (never a blank white screen).
 */
export function ChatWorkspaceSkeleton() {
  return (
    <div className="flex h-screen bg-white text-zinc-950 overflow-hidden">
      {/* Sidebar skeleton */}
      <aside className="hidden md:flex w-[240px] shrink-0 bg-zinc-50 border-r border-zinc-200 flex-col justify-between p-3.5">
        <div className="space-y-4">
          <div className="h-6 w-24 rounded-md cogent-skeleton" />
          <div className="h-8 w-full rounded-md cogent-skeleton" />
          <div className="space-y-2 pt-2">
            <div className="h-3 w-16 rounded cogent-skeleton" />
            <div className="h-7 w-full rounded-md cogent-skeleton" />
            <div className="h-7 w-full rounded-md cogent-skeleton" />
            <div className="h-7 w-5/6 rounded-md cogent-skeleton" />
            <div className="h-7 w-4/5 rounded-md cogent-skeleton" />
          </div>
          <div className="space-y-2 pt-3">
            <div className="h-3 w-20 rounded cogent-skeleton" />
            <div className="h-6 w-11/12 rounded-md cogent-skeleton" />
            <div className="h-6 w-3/4 rounded-md cogent-skeleton" />
            <div className="h-6 w-5/6 rounded-md cogent-skeleton" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-14 w-full rounded-lg cogent-skeleton" />
          <div className="h-9 w-full rounded-lg cogent-skeleton" />
        </div>
      </aside>

      {/* Main chat canvas skeleton */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        <div className="h-[52px] border-b border-zinc-200 px-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-6 w-6 rounded-md cogent-skeleton" />
            <div className="h-4 w-36 rounded cogent-skeleton" />
          </div>
          <div className="h-8 w-24 rounded-md cogent-skeleton" />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="w-full max-w-2xl space-y-6">
            <div className="h-9 w-2/3 mx-auto rounded-lg cogent-skeleton" />
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-4 shadow-xs">
              <div className="h-14 w-full rounded-lg cogent-skeleton" />
              <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-28 rounded-lg cogent-skeleton" />
                  <div className="h-7 w-20 rounded-lg cogent-skeleton" />
                </div>
                <div className="h-8 w-24 rounded-lg cogent-skeleton" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="h-20 rounded-xl border border-zinc-100 cogent-skeleton" />
              <div className="h-20 rounded-xl border border-zinc-100 cogent-skeleton" />
              <div className="h-20 rounded-xl border border-zinc-100 cogent-skeleton" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Shimmer skeleton for thread messages when switching between past conversations.
 */
export function ThreadMessagesSkeleton() {
  return (
    <div className="max-w-3xl mx-auto space-y-6 py-4">
      <div className="flex justify-end">
        <div className="h-12 w-2/3 max-w-md rounded-2xl cogent-skeleton" />
      </div>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-5 w-20 rounded-md cogent-skeleton" />
          <div className="h-4 w-12 rounded cogent-skeleton" />
        </div>
        <div className="h-4 w-full rounded cogent-skeleton" />
        <div className="h-4 w-11/12 rounded cogent-skeleton" />
        <div className="h-4 w-4/5 rounded cogent-skeleton" />
        <div className="h-24 w-full rounded-xl cogent-skeleton mt-2" />
      </div>
    </div>
  );
}

/**
 * Shimmer skeleton for Settings cards.
 */
export function SettingsPanelSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-6 space-y-5">
      <div className="space-y-2">
        <div className="h-5 w-44 rounded cogent-skeleton" />
        <div className="h-3.5 w-80 max-w-full rounded cogent-skeleton" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
        <div className="space-y-2">
          <div className="h-3.5 w-24 rounded cogent-skeleton" />
          <div className="h-9 w-full rounded-md cogent-skeleton" />
        </div>
        <div className="space-y-2">
          <div className="h-3.5 w-28 rounded cogent-skeleton" />
          <div className="h-9 w-full rounded-md cogent-skeleton" />
        </div>
      </div>
      <div className="h-20 w-full rounded-lg cogent-skeleton" />
    </div>
  );
}

/**
 * Shimmer skeleton for Knowledge Base lists (Products, Playbooks, Compliance Rules).
 */
export function KnowledgeListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3 py-1">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg border border-zinc-100 p-4 flex items-center justify-between gap-4"
        >
          <div className="space-y-2 flex-1 min-w-0">
            <div className="h-4 w-48 max-w-[60%] rounded cogent-skeleton" />
            <div className="h-3 w-72 max-w-[85%] rounded cogent-skeleton" />
          </div>
          <div className="h-7 w-20 rounded-md cogent-skeleton shrink-0" />
        </div>
      ))}
    </div>
  );
}

/**
 * Shimmer skeleton for Drift Monitors grid.
 */
export function DriftMonitorsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border border-zinc-200 bg-white p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-4 w-44 rounded cogent-skeleton" />
            <div className="h-5 w-16 rounded-full cogent-skeleton" />
          </div>
          <div className="h-3.5 w-full rounded cogent-skeleton" />
          <div className="h-3.5 w-2/3 rounded cogent-skeleton" />
          <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
            <div className="h-3 w-24 rounded cogent-skeleton" />
            <div className="h-7 w-20 rounded-md cogent-skeleton" />
          </div>
        </div>
      ))}
    </div>
  );
}
