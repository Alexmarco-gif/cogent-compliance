"use client";

import React from "react";
import Link from "next/link";
import { UserRound, Lock } from "lucide-react";
import { CogentLogo, CogentMark } from "@/components/brand/CogentLogo";

interface AuthSplitLayoutProps {
  mode: "sign-in" | "sign-up";
  children: React.ReactNode;
}

export const clerkAuthAppearance = {
  elements: {
    rootBox: "w-full",
    cardBox: "w-full shadow-none border-0 bg-transparent",
    card: "w-full shadow-none border-0 bg-transparent p-0 gap-4",
    headerTitle: "text-[24px] font-semibold tracking-tight text-zinc-950 text-center",
    headerSubtitle: "text-[13px] text-zinc-500 text-center",
    socialButtonsBlockButton:
      "w-full h-10 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-800 text-[13px] font-medium shadow-none transition-colors",
    socialButtonsBlockButtonText: "text-[13px] font-medium text-zinc-800",
    dividerLine: "bg-zinc-200",
    dividerText: "text-[11px] uppercase tracking-wider text-zinc-400",
    formFieldLabel: "text-[12px] font-medium text-zinc-700",
    formFieldInput:
      "h-10 rounded-lg border border-zinc-200 bg-white px-3 text-[13px] text-zinc-950 placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-0 shadow-none",
    formButtonPrimary:
      "h-10 w-full rounded-lg bg-zinc-950 hover:bg-zinc-800 text-white text-[13px] font-medium shadow-none transition-colors",
    footerAction: "hidden",
    footer: "hidden",
    identityPreviewText: "text-[13px] text-zinc-700",
    formResendCodeLink: "text-zinc-900 font-medium",
  },
};

export function AuthSplitLayout({ mode, children }: AuthSplitLayoutProps) {
  const isSignUp = mode === "sign-up";

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex flex-col lg:grid lg:grid-cols-2">
      {/* Left Column: Clean Form Canvas */}
      <div className="flex flex-col justify-between px-6 py-6 sm:px-10 lg:px-12 min-h-screen">
        {/* Top Navigation Row */}
        <header className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center">
            <CogentLogo variant="blue" size="md" subtitle="Enterprise" />
          </Link>

          <div className="flex items-center gap-2.5 text-[12.5px]">
            <span className="hidden sm:inline text-zinc-500">
              {isSignUp ? "Already have an account?" : "Need an account?"}
            </span>
            <Link
              href={isSignUp ? "/sign-in" : "/sign-up"}
              className="inline-flex items-center justify-center rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-[12.5px] font-medium text-zinc-800 hover:bg-zinc-50 transition-colors"
            >
              {isSignUp ? "Sign in" : "Create account"}
            </Link>
          </div>
        </header>

        {/* Centered Auth Form */}
        <main className="mx-auto w-full max-w-[360px] py-10">
          <div className="mb-5 flex justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 shadow-2xs">
              {isSignUp ? (
                <UserRound className="h-4 w-4" strokeWidth={1.7} />
              ) : (
                <Lock className="h-4 w-4" strokeWidth={1.7} />
              )}
            </div>
          </div>

          {children}
        </main>

        {/* Bottom Copyright Row */}
        <footer className="flex items-center justify-between text-[12px] text-zinc-400">
          <span>&copy; 2026 Cogent</span>
          <span>EN</span>
        </footer>
      </div>

      {/* Right Column: Atmospheric Visual Showcase Panel */}
      <div className="hidden lg:block p-3 h-screen sticky top-0">
        <div
          className="relative h-full w-full overflow-hidden rounded-[22px] border border-blue-200/60 flex flex-col justify-between p-10"
          style={{
            background:
              "linear-gradient(160deg, #FAFBFF 0%, #EEF2FF 28%, #8BA4FC 68%, #4F6EF7 100%)",
          }}
        >
          {/* Subtle Architectural Isometric Tile Pattern */}
          <svg
            className="pointer-events-none absolute -right-12 -top-8 h-[420px] w-[420px] opacity-35"
            viewBox="0 0 400 400"
            fill="none"
            aria-hidden="true"
          >
            <g stroke="#CBD5E1" strokeWidth="1">
              <rect x="60" y="60" width="72" height="72" rx="14" transform="rotate(-28 96 96)" />
              <rect x="148" y="34" width="72" height="72" rx="14" transform="rotate(-28 184 70)" />
              <rect x="236" y="8" width="72" height="72" rx="14" transform="rotate(-28 272 44)" />
              <rect x="96" y="148" width="72" height="72" rx="14" transform="rotate(-28 132 184)" />
              <rect x="184" y="122" width="72" height="72" rx="14" transform="rotate(-28 220 158)" />
              <rect x="272" y="96" width="72" height="72" rx="14" transform="rotate(-28 308 132)" />
              <rect x="220" y="210" width="72" height="72" rx="14" transform="rotate(-28 256 246)" />
            </g>
          </svg>

          {/* Floating Cogent Mark Tile */}
          <div
            className="pointer-events-none absolute right-20 top-24 flex h-20 w-20 -rotate-[28deg] items-center justify-center rounded-2xl bg-[#2A4BFF] text-white shadow-xl shadow-blue-600/30 ring-4 ring-white/40"
            aria-hidden="true"
          >
            <CogentMark className="h-9 w-9 rotate-[28deg]" />
          </div>

          {/* Top-Left Editorial Headline */}
          <div className="relative z-10 max-w-md pt-2">
            <h2 className="text-[32px] font-semibold leading-[1.15] tracking-tight text-zinc-950">
              Review, verify &amp; clear financial promotions
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed text-zinc-600">
              Keep marketing copy, approved rate cards, and regulatory evidence aligned in one workspace.
            </p>
          </div>

          {/* Bottom Stacked Translucent Review Rows */}
          <div className="relative z-10 space-y-2.5 max-w-lg mx-auto w-full">
            <div className="flex items-center justify-between rounded-xl border border-white/35 bg-white/20 px-4 py-3.5 backdrop-blur-md text-white">
              <div className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 rounded-full bg-white/80 ring-4 ring-white/20" />
                <span className="text-[13px] font-medium leading-snug">
                  Checking CBN disclosure &amp; fee schedule
                </span>
              </div>
              <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-white/90 shrink-0 ml-3">
                In progress
                <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-white/25 bg-white/14 px-4 py-3 backdrop-blur-md text-white/85">
              <div className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 rounded-full bg-white/60 ring-4 ring-white/15" />
                <span className="text-[13px] font-medium">
                  Product rate card matched
                </span>
              </div>
              <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-white/85 shrink-0 ml-3">
                Verified
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-md text-white/70">
              <div className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 rounded-full bg-white/50 ring-4 ring-white/10" />
                <span className="text-[13px] font-medium">
                  Audit dossier archived
                </span>
              </div>
              <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-white/75 shrink-0 ml-3">
                Verified
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300/80" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
