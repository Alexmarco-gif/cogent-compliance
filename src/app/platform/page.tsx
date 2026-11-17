import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Calculator,
  CheckCircle2,
  FileCheck2,
  Globe,
  ShieldCheck,
} from "lucide-react";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { ThreeStepPlan } from "@/components/marketing/ThreeStepPlan";
import { ExecutiveCtaBanner } from "@/components/marketing/ExecutiveCtaBanner";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { RevealOnScroll } from "@/components/marketing/RevealOnScroll";

export const metadata: Metadata = {
  title: "Platform | How Cogent Protects Every Campaign",
  description:
    "See how Cogent checks loan flyers, matches approved rates, watches live webpages, and organizes team sign-offs before publication.",
  alternates: {
    canonical: "/platform",
  },
  openGraph: {
    title: "Platform | Cogent",
    description:
      "Pre-publication checks, rate matching, live page watchers, and clean team approval trails for Nigerian financial brands.",
    url: "/platform",
  },
};

const PILLARS = [
  {
    id: "pre-check",
    badge: "STEP 01 · PRE-PUBLICATION CHECK",
    icon: FileCheck2,
    title: "Spot risky promises before customers see them",
    description:
      "Drop in campaign flyers, social captions, banners, or app descriptions. Cogent reads images and text carefully—catching banned claims, hidden fees, or tiny unreadable disclaimers before regulators do.",
    bullets: [
      "Flags phrases like 'guaranteed returns' or '0% hidden charges' immediately",
      "Checks that fine-print disclosures are legible relative to main headlines",
      "Writes ready-to-use compliant alternatives that keep your marketing hook sharp",
    ],
  },
  {
    id: "rate-match",
    badge: "STEP 02 · RATE & FEE ACCURACY",
    icon: Calculator,
    title: "Keep every ad true to your approved product sheet",
    description:
      "Save your real interest rates, setup fees, and minimum repayment windows once in your workspace. Every ad check verifies that promoted figures never contradict what customers actually pay.",
    bullets: [
      "Accounts for upfront processing or management fees in total cost checks",
      "Catches short-tenor loan promotions that conflict with Google Play store policies",
      "Keeps your institution's house rules consistent across agencies and product teams",
    ],
  },
  {
    id: "page-watcher",
    badge: "STEP 03 · LIVE PAGE MONITORING",
    icon: Globe,
    title: "Know the moment an approved webpage changes",
    description:
      "Campaign risk does not stop on launch day. Cogent checks your live pricing pages, loan landing pages, and fee schedules automatically and notifies compliance whenever an approved disclosure drops off.",
    bullets: [
      "Monitors live product and promotional links after launch",
      "Highlights exact text edits between the approved version and the live page",
      "Alerts Legal & Compliance early before complaints reach regulators",
    ],
  },
  {
    id: "signoff",
    badge: "STEP 04 · TEAM & CCO SIGN-OFF",
    icon: ShieldCheck,
    title: "Clean separation between drafting and final approval",
    description:
      "Marketing moves fast without waiting on scattered email threads, while Legal Counsel and Chief Compliance Officers hold exclusive final sign-off—backed by clean, downloadable proof.",
    bullets: [
      "Role permissions keep Marketing unable to self-approve campaigns",
      "Saves every revision, note, and approval timestamp in one organized timeline",
      "Produces crisp PDF compliance records ready whenever inspectors ask",
    ],
  },
];

export default function PlatformPage() {
  return (
    <div className="min-h-screen bg-white text-slate-950 flex flex-col">
      <div className="relative overflow-hidden cogent-hero-wash border-b border-slate-200/75">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 cogent-arch-grid"
        />
        <MarketingHeader />

        <section className="relative z-10 py-14 sm:py-20 lg:py-24">
          <div className="mx-auto max-w-[1160px] px-5 sm:px-8">
            <div className="max-w-3xl">
              <span className="inline-flex items-center rounded-full bg-[#1D63ED] px-3.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.09em] text-white">
                PLATFORM OVERVIEW
              </span>
              <h1 className="mt-4 text-[36px] sm:text-[50px] font-semibold leading-[1.06] tracking-[-0.03em] text-slate-950">
                Built so growth and compliance{" "}
                <span className="text-[#1D63ED]">move at the same speed.</span>
              </h1>
              <p className="mt-5 text-[16px] sm:text-[18px] leading-[1.6] text-slate-600">
                Instead of slow manual reviews or generic AI text guesses, Cogent checks every word, number, and webpage against your exact license scope and Nigerian regulatory rules.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/sign-up"
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#1D63ED] px-6 text-[14px] font-semibold text-white shadow-md shadow-blue-600/25 hover:bg-[#1552CC] transition-colors"
                >
                  <span>Create Free Account</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/solutions"
                  className="inline-flex h-11 items-center rounded-xl border border-slate-200 bg-white px-5 text-[14px] font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Explore by License Tier
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>

      <main className="flex-1">
        <section className="bg-white py-20 lg:py-24">
          <div className="mx-auto max-w-[1160px] px-5 sm:px-8 space-y-8">
            {PILLARS.map((pillar, idx) => {
              const Icon = pillar.icon;
              return (
                <RevealOnScroll key={pillar.id} delayMs={idx * 70}>
                  <div
                    id={pillar.id}
                    className="scroll-mt-24 rounded-[26px] cogent-glass-tray p-6 sm:p-8 lg:p-10"
                  >
                    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center">
                      <div className="lg:col-span-6 space-y-4">
                        <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-[10.5px] font-semibold uppercase tracking-[0.09em] text-[#1D63ED] border border-blue-100">
                          {pillar.badge}
                        </span>
                        <h2 className="text-[26px] sm:text-[32px] font-semibold leading-[1.15] tracking-tight text-slate-950">
                          {pillar.title}
                        </h2>
                        <p className="text-[15px] leading-relaxed text-slate-600">
                          {pillar.description}
                        </p>
                      </div>

                      <div className="lg:col-span-6">
                        <div className="rounded-2xl cogent-glass-card p-6 space-y-3.5">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#1D63ED]">
                            <Icon className="h-5 w-5" strokeWidth={1.8} />
                          </div>
                          <ul className="space-y-3">
                            {pillar.bullets.map((bullet) => (
                              <li
                                key={bullet}
                                className="flex items-start gap-2.5 text-[14px] leading-relaxed text-slate-700"
                              >
                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                                <span>{bullet}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </RevealOnScroll>
              );
            })}
          </div>
        </section>

        <ThreeStepPlan />
        <ExecutiveCtaBanner />
      </main>

      <MarketingFooter />
    </div>
  );
}
