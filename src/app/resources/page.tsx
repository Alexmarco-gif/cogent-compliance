import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  FileDown,
  BarChart3,
  Video,
  Clock,
  Sparkles,
  HelpCircle,
  ShieldCheck,
} from "lucide-react";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { ExecutiveCtaBanner } from "@/components/marketing/ExecutiveCtaBanner";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

export const metadata: Metadata = {
  title: "Resources & Research Hub | Cogent",
  description:
    "Where we share deep-dive breakdowns of Nigerian and African financial regulations, statutory compliance guides, downloadable PDF briefs, market data, and video walkthroughs.",
  alternates: {
    canonical: "/resources",
  },
  openGraph: {
    title: "Resources & Research Hub | Cogent by Stem Systems",
    description:
      "Statutory articles, downloadable compliance briefs, market data, and video walkthroughs for Nigerian and African financial institutions.",
    url: "/resources",
  },
};

interface ResourceCategory {
  id: string;
  code: string;
  title: string;
  icon: React.ElementType;
  description: string;
  badgeText: string;
  topics: Array<{
    title: string;
    format: string;
    tag: string;
  }>;
}

const RESOURCE_CATEGORIES: ResourceCategory[] = [
  {
    id: "articles",
    code: "01 · REGULATORY ARTICLES & BLOGS",
    title: "In-depth statutory breakdowns & circular analyses",
    icon: BookOpen,
    description:
      "Operational breakdowns of newly released CBN circulars, NDPC cross-border data transfer rules, FCCPC digital credit enforcement, and pan-African central bank updates.",
    badgeText: "Coming Soon · Publishing Shortly",
    topics: [
      {
        title: "The 2025 CBN Automated AML Baseline Directive: What Nigerian Fintechs Must Update Immediately",
        format: "Article",
        tag: "CBN · AML Policy",
      },
      {
        title: "Structuring Pan-African Card Issuance: Reconciling CBN FX Rules with NDPA §41 Data Transfers",
        format: "Article",
        tag: "NDPC · Cross-Border",
      },
      {
        title: "Digital Lending Compliance: Navigating FCCPC Pre-Contract Disclosures and Zero Contact-Scraping Rules",
        format: "Article",
        tag: "FCCPC · Credit",
      },
    ],
  },
  {
    id: "briefs",
    code: "02 · DOWNLOADABLE PDF MEMOS & TEMPLATES",
    title: "Executive structuring briefs & redline schedules",
    icon: FileDown,
    description:
      "Standardized structuring memos, policy redline templates, and supervisory query checklists formatted for Board Risk Committees, executive teams, and sponsor-bank submissions.",
    badgeText: "Coming Soon · In Editorial Review",
    topics: [
      {
        title: "Sample USD Virtual Card & BNPL Pre-Launch Statutory Structuring Brief",
        format: "PDF Memo",
        tag: "Structuring Template",
      },
      {
        title: "40-Question Sponsor Bank Due-Diligence Response Pack & Citation Map",
        format: "PDF / DOCX",
        tag: "Audit Response",
      },
      {
        title: "Nigerian Fintech AML & KYC Policy Clause Redline Checklist",
        format: "PDF Checklist",
        tag: "Policy Update",
      },
    ],
  },
  {
    id: "data",
    code: "03 · MARKET DATA & INDUSTRY BENCHMARKS",
    title: "Empirical regulatory data & license comparisons",
    icon: BarChart3,
    description:
      "Empirical benchmarking of Nigerian and African regulatory actions, licensing timelines, examination frequency, and fintech compliance operational metrics.",
    badgeText: "Coming Soon · Research In Progress",
    topics: [
      {
        title: "State of Nigerian Supervisory Enforcement: 2024–2025 Central Bank & FCCPC Actions",
        format: "Data Report",
        tag: "Market Benchmark",
      },
      {
        title: "Fintech License Perimeters Compared: Nigeria (CBN) vs Kenya (CBK) vs Ghana (BoG)",
        format: "Matrix Report",
        tag: "Pan-African Data",
      },
      {
        title: "Digital Lending APR & Recovery Enforcement Ledger: Industry Compliance Trends",
        format: "Dataset",
        tag: "Consumer Protection",
      },
    ],
  },
  {
    id: "videos",
    code: "04 · VIDEO WALKTHROUGHS & TEARDOWNS",
    title: "Step-by-step compliance studio demonstrations",
    icon: Video,
    description:
      "Clear visual walkthroughs of complex regulatory workflows—demonstrating how compliance officers compress 5-day research and drafting into minutes.",
    badgeText: "Coming Soon · Studio Production",
    topics: [
      {
        title: "How to Redline an 80-Page AML Manual Against a New CBN Circular in 4 Minutes",
        format: "12 min Video",
        tag: "Workflow Demo",
      },
      {
        title: "Answering a 40-Question Partner Bank Questionnaire with Clickable Statutory Citations",
        format: "15 min Video",
        tag: "Audit Walkthrough",
      },
      {
        title: "Pre-Vetting a Digital Loan Campaign Before Google Play Review & ARCON Clearance",
        format: "10 min Video",
        tag: "Clearance Demo",
      },
    ],
  },
];

export default function ResourcesPage() {
  return (
    <div className="min-h-screen bg-white text-[#0B1220] flex flex-col">
      {/* Crisp Editorial Architectural Canvas */}
      <div className="relative cogent-editorial-canvas border-b border-slate-200">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 cogent-hairline-grid"
        />

        <MarketingHeader />

        <section className="relative z-10 pt-12 pb-20 sm:pt-16 lg:pb-24">
          <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#1D4ED8]">
                RESOURCES · RESEARCH · INTELLIGENCE
              </p>

              <h1 className="mt-4 text-[38px] sm:text-[50px] lg:text-[58px] font-semibold leading-[1.06] tracking-[-0.035em] text-[#0B1220]">
                Knowledge, data, and regulatory{" "}
                <span className="text-[#1D4ED8]">intelligence.</span>
              </h1>

              <p className="mt-5 text-[16.5px] sm:text-[18px] leading-[1.6] text-slate-600">
                Where we share deep-dive breakdowns of Nigerian and African regulations, statutory compliance guides, downloadable PDF briefs, market data, and video walkthroughs.
              </p>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <a
                  href="#articles"
                  className="rounded-md border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Articles &amp; Blogs
                </a>
                <a
                  href="#briefs"
                  className="rounded-md border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Downloadable Briefs
                </a>
                <a
                  href="#data"
                  className="rounded-md border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Market Data
                </a>
                <a
                  href="#videos"
                  className="rounded-md border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Video Teardowns
                </a>
                <Link
                  href="/resources/faq"
                  className="rounded-md bg-[#1D4ED8] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#1E40AF] transition-colors"
                >
                  Browse FAQs &rarr;
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>

      <main className="flex-1">
        {/* 4 Architectural Resource Pillars */}
        <section className="bg-white py-16 sm:py-20 lg:py-24">
          <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
              {RESOURCE_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                return (
                  <div
                    key={cat.id}
                    id={cat.id}
                    className="relative flex flex-col justify-between rounded-xl border border-slate-200 bg-[#FAFBFD] p-7 sm:p-8 hover:border-slate-300 transition-colors"
                  >
                    <div>
                      {/* Top bar with Code & Coming Soon Badge */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-4">
                        <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#1D4ED8]">
                          {cat.code}
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 font-mono text-[10.5px] font-semibold text-amber-800">
                          <Clock className="h-3 w-3" />
                          <span>{cat.badgeText}</span>
                        </span>
                      </div>

                      {/* Header */}
                      <div className="mt-5 flex items-start gap-3.5">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-[#1D4ED8] shadow-2xs">
                          <Icon className="h-5 w-5" strokeWidth={1.8} />
                        </div>
                        <div>
                          <h2 className="text-[20px] font-semibold text-[#0B1220]">
                            {cat.title}
                          </h2>
                          <p className="mt-1.5 text-[13.5px] leading-relaxed text-slate-600">
                            {cat.description}
                          </p>
                        </div>
                      </div>

                      {/* Sample Upcoming Material List */}
                      <div className="mt-6 space-y-2.5">
                        <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                          Preview Topics &amp; Formats
                        </p>
                        {cat.topics.map((t) => (
                          <div
                            key={t.title}
                            className="flex items-start justify-between gap-3 rounded-lg border border-slate-200/80 bg-white p-3 shadow-2xs"
                          >
                            <div className="space-y-1">
                              <p className="text-[13px] font-medium leading-snug text-[#0B1220]">
                                {t.title}
                              </p>
                              <span className="inline-block font-mono text-[10.5px] text-slate-500">
                                {t.tag}
                              </span>
                            </div>
                            <span className="shrink-0 rounded bg-slate-100 px-2 py-0.5 font-mono text-[10.5px] font-semibold text-slate-700">
                              {t.format}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Bottom Status Ribbon */}
                    <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-4 text-[12px] text-slate-500">
                      <span>Curated by Stem Systems Research</span>
                      <span className="font-mono text-[11px] font-medium text-[#1D4ED8]">
                        Releasing soon
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Access to Common Questions */}
            <div className="mt-14 rounded-xl border border-blue-100 bg-blue-50/60 p-6 sm:p-8">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#1D4ED8] text-white">
                    <HelpCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-[17px] font-semibold text-[#0B1220]">
                      Looking for immediate answers?
                    </h3>
                    <p className="mt-1 text-[13.5px] leading-relaxed text-slate-600">
                      Explore detailed answers on regulatory search, AML policy updates, sponsor-bank audits, role governance, and organizational data isolation.
                    </p>
                  </div>
                </div>
                <Link
                  href="/resources/faq"
                  className="inline-flex items-center justify-center gap-1.5 rounded-md bg-[#0B1220] px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-slate-800 transition-colors shrink-0"
                >
                  <span>Explore FAQ</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <ExecutiveCtaBanner />
      </main>

      <MarketingFooter />
    </div>
  );
}
