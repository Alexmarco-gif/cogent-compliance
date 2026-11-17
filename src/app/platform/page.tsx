import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  ClipboardCheck,
  FileText,
  Globe,
  Scale,
  ShieldCheck,
} from "lucide-react";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { ThreeStepPlan } from "@/components/marketing/ThreeStepPlan";
import { ExecutiveCtaBanner } from "@/components/marketing/ExecutiveCtaBanner";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { RevealOnScroll } from "@/components/marketing/RevealOnScroll";

export const metadata: Metadata = {
  title: "Platform | Regulatory Intelligence & Compliance Workflows",
  description:
    "How Cogent turns scattered Nigerian and African regulations into structuring memos, updated AML policies, formal audit replies, live portal alerts, and cleared campaigns.",
  alternates: {
    canonical: "/platform",
  },
  openGraph: {
    title: "Platform | Cogent",
    description:
      "Product structuring research, AML policy updating, sponsor-bank audit replies, live NG & Africa search, and campaign clearance.",
    url: "/platform",
  },
};

const WORKFLOW_PILLARS = [
  {
    id: "structuring",
    code: "01 · PRODUCT & FEATURE STRUCTURING",
    icon: FileText,
    title: "Draft complete statutory memos before engineering builds",
    description:
      "Ask plain-English questions about launching a USD virtual card, BNPL checkout, wallet tier, or savings sweep. Cogent cross-references CBN, NDPC, FCCPC, and SEC requirements and compiles a structured brief with exact statutory citations.",
    deliverableName: "Statutory Structuring Memo",
    bullets: [
      "Surfaces licensing perimeter rules, partner-bank requirements, and FX limits",
      "Identifies mandatory consumer disclosures and cooling-off wording",
      "Maps NDPA 2023 cross-border transfer safeguards before processor integration",
    ],
  },
  {
    id: "policy-updates",
    code: "02 · INTERNAL POLICY & AML UPDATING",
    icon: Scale,
    title: "Compare new circulars directly against your 80-page manuals",
    description:
      "When the CBN or NFIU releases updated AML baseline standards or agent banking directives, upload your current policy manual and let Cogent isolate outdated paragraphs and write tracked replacement clauses.",
    deliverableName: "Redlined Policy Clause Schedule",
    bullets: [
      "Pinpoints exact section numbers in your existing AML, KYC, or Ops manuals",
      "Drafts ready-to-insert replacement paragraphs aligned to your house legal style",
      "Keeps Board Risk Committee and internal compliance updates measured in minutes",
    ],
  },
  {
    id: "audit-responses",
    code: "03 · REGULATOR & SPONSOR-BANK REPLIES",
    icon: ClipboardCheck,
    title: "Answer 40-question due-diligence audits without the scramble",
    description:
      "Drop in a sponsor-bank compliance questionnaire, NIBSS onboarding checklist, or supervisory examination letter. Cogent synthesizes your internal SOPs with verified Nigerian statutory citations into a formal response sheet.",
    deliverableName: "Formal Supervisory Response Pack",
    bullets: [
      "Links every response to both your internal SOP section and statutory authority",
      "Covers dispute SLAs, NDIC pass-through wording, and WORM retention controls",
      "Exports cleanly to PDF or DOCX for GC and CCO final sign-off",
    ],
  },
  {
    id: "dual-search",
    code: "04 · NG & AFRICA LIVE REGULATORY SEARCH",
    icon: Globe,
    title: "Parallel search across Nigeria's Vault, .gov.ng & African Central Banks",
    description:
      "Government search bars often bury critical PDFs. Cogent queries 141+ codified Nigerian instruments alongside real-time discovery across CBN, SEC, NDPC, CBK (Kenya), BoG (Ghana), SARB, and leading African financial law briefings.",
    deliverableName: "Cross-Jurisdictional Licensing Matrix",
    bullets: [
      "Tracks newly published Nigerian circular codes (e.g., BSD/DIR/GEN/LAB/...)",
      "Builds side-by-side capital, trust-account, and governance tables for expansion",
      "Separates curated statutory instruments privately from live web discovery",
    ],
  },
  {
    id: "launch-clearance",
    code: "05 · MARKETING & WEBPAGE CLEARANCE",
    icon: ShieldCheck,
    title: "Pre-vet flyers, Google Play listings, and watch live pricing pages",
    description:
      "Every rate promise, loan banner, and fee schedule stays matched against your approved product sheets—with clean copy rewrites, role-locked CCO approval, and daily monitoring on live campaign URLs.",
    deliverableName: "Cleared Campaign Sign-Off Dossier",
    bullets: [
      "Catches '0% hidden fees', prohibited return promises, and Play 60-day tenor traps",
      "Keeps Product and Growth able to draft while CCO holds exclusive publication lock",
      "Alerts Compliance immediately if a live fee webpage drifts from approved copy",
    ],
  },
];

export default function PlatformPage() {
  return (
    <div className="min-h-screen bg-white text-[#0B1220] flex flex-col">
      <div className="relative cogent-editorial-canvas border-b border-slate-200">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 cogent-hairline-grid"
        />
        <MarketingHeader />

        <section className="relative z-10 py-14 sm:py-20 lg:py-24">
          <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
            <div className="max-w-3xl">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[#1D4ED8]">
                PLATFORM CAPABILITIES
              </p>
              <h1 className="mt-4 text-[36px] sm:text-[50px] font-semibold leading-[1.06] tracking-[-0.03em] text-[#0B1220]">
                Built so product, legal, and compliance{" "}
                <span className="text-[#1D4ED8]">move at the same speed.</span>
              </h1>
              <p className="mt-5 text-[16px] sm:text-[18px] leading-[1.6] text-slate-600">
                From early product structuring and internal AML manual updates to sponsor-bank audits and cleared launches, Cogent handles the entire compliance work-product lifecycle inside one split-screen workspace.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/sign-up"
                  className="inline-flex h-11 items-center gap-2 rounded-md bg-[#1D4ED8] px-6 text-[13.5px] font-semibold text-white hover:bg-[#1E40AF] transition-colors"
                >
                  <span>Create Free Account</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/solutions"
                  className="inline-flex h-11 items-center rounded-md border border-slate-200 bg-white px-5 text-[13.5px] font-medium text-slate-700 hover:bg-slate-50 transition-colors"
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
          <div className="mx-auto max-w-[1200px] px-5 sm:px-8 space-y-6">
            {WORKFLOW_PILLARS.map((pillar, idx) => {
              const Icon = pillar.icon;
              return (
                <RevealOnScroll key={pillar.id} delayMs={idx * 50}>
                  <div
                    id={pillar.id}
                    className="scroll-mt-24 rounded-xl border border-slate-200 bg-white overflow-hidden grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200"
                  >
                    <div className="lg:col-span-6 p-6 sm:p-8 lg:p-10 space-y-4">
                      <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.09em] text-[#1D4ED8]">
                        {pillar.code}
                      </p>
                      <h2 className="text-[24px] sm:text-[28px] font-semibold leading-[1.15] tracking-tight text-[#0B1220]">
                        {pillar.title}
                      </h2>
                      <p className="text-[14.5px] leading-relaxed text-slate-600">
                        {pillar.description}
                      </p>
                    </div>

                    <div className="lg:col-span-6 bg-[#FAFBFD] p-6 sm:p-8 lg:p-10 flex flex-col justify-between space-y-5">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                        <span className="font-mono text-[11px] font-semibold text-[#0B1220]">
                          {pillar.deliverableName}
                        </span>
                        <Icon className="h-4 w-4 text-[#1D4ED8]" strokeWidth={1.8} />
                      </div>

                      <ul className="space-y-3">
                        {pillar.bullets.map((bullet) => (
                          <li
                            key={bullet}
                            className="flex items-start gap-2.5 text-[13.5px] leading-relaxed text-slate-700"
                          >
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
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
