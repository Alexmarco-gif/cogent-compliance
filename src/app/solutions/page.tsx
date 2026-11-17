import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ShieldAlert } from "lucide-react";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { ExecutiveCtaBanner } from "@/components/marketing/ExecutiveCtaBanner";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

export const metadata: Metadata = {
  title: "Solutions by License Tier",
  description:
    "License-aware compliance workflows for Nigerian Digital Lenders, MFBs, Commercial Banks, PSBs, Mobile Money Operators, and SEC WealthTech platforms.",
  alternates: {
    canonical: "/solutions",
  },
  openGraph: {
    title: "Solutions by License Tier | Cogent",
    description:
      "Pre-flight compliance configured for Digital Lenders, Commercial Banks, MFBs, PSBs, MMOs, and SEC Operators.",
    url: "/solutions",
  },
};

interface SolutionSector {
  id: string;
  anchor: string;
  eyebrow: string;
  title: string;
  licenseTiers: string[];
  regulators: string[];
  summary: string;
  blindSpots: string[];
  exampleBefore: string;
  exampleAfter: string;
  exampleCitation: string;
}

const SECTORS: SolutionSector[] = [
  {
    id: "digital-lenders",
    anchor: "digital-lenders",
    eyebrow: "Sector 01 · Consumer & Mobile Credit",
    title: "Digital Lenders & Credit Apps",
    licenseTiers: ["FCCPC_DIGITAL_LENDER", "FINTECH_GENERAL"],
    regulators: ["FCCPC DEON Regs", "CBN CPF", "Google Play Loan Policy", "NDPA 2023", "ARCON Code"],
    summary:
      "Stop losing distribution to Google Play takedowns and FCCPC delistings. Cogent validates true net-disbursed APR, 60-day minimum tenors, and non-predatory recovery language across every campaign and app store description.",
    blindSpots: [
      "Flags short-term 14–30 day loan promotions that violate Google Play's 60-day minimum repayment floor",
      "Computes true annualized IRR when processing, insurance, or management fees reduce cash disbursed",
      "Blocks prohibited contact-list scraping cues, guarantor shaming copy, and '0% hidden charges' claims",
    ],
    exampleBefore:
      "Get ₦50,000 instant loan! Repay in 14–30 days at 5% monthly interest with 0% hidden charges. App uses contacts for instant scoring.",
    exampleAfter:
      "Apply for up to ₦50,000 subject to KYC & credit assessment. Tenor: 65–180 days. Representative example: ₦50,000 over 90 days; 4.5%/mo + 1.5% one-off fee (Effective APR: 79.8% p.a.). Zero contact-list access. FCCPC-registered. Terms apply.",
    exampleCitation: "FCCPA §115 · FCCPC DEON Reg. 2025 · Play Personal Loan Policy · NDPA §24",
  },
  {
    id: "banking",
    anchor: "banking",
    eyebrow: "Sector 02 · Deposit-Taking Institutions",
    title: "MFBs & Tier-1/2 Commercial Banks",
    licenseTiers: ["DMB_COMMERCIAL_BANK", "MFB_NATIONAL", "MFB_STATE", "MFB_UNIT"],
    regulators: ["CBN CPF & CPR", "BOFIA 2020", "NDIC Act", "ARCON ASP", "FCCPC Reg. 32"],
    summary:
      "Coordinate high-volume product launches, branch flyers, and state/unit MFB geographic boundaries under one dual-control sign-off ledger with 2-year and 7-year retention.",
    blindSpots: [
      "Enforces exact NDIC insurance disclosure tiers (₦5,000,000 for DMBs vs. ₦2,000,000 for MFBs)",
      "Prevents State or Unit MFBs from running national 'across all 36 states' solicitation copy outside license bounds",
      "Audits flyer bounding boxes for buried fine-print disclosures (<12% headline ratio) and ARCON ASP IDs",
    ],
    exampleBefore:
      "Open a fixed deposit account across all 36 states today—NDIC covers 100% of all losses at 18% guaranteed returns!",
    exampleAfter:
      "Open a Fixed Deposit with [Bank/MFB Name], licensed by the CBN within our authorized operating area. Customer deposits are insured by the NDIC up to statutory limits (₦2,000,000 for MFBs / ₦5,000,000 for Commercial Banks). Indicative rates apply. [ARCON/ASP/...]. T&Cs apply.",
    exampleCitation: "BOFIA 2020 §2 · CBN MFB Guidelines · NDIC Deposit Caps · ARCON Code §4.2",
  },
  {
    id: "payments",
    anchor: "payments",
    eyebrow: "Sector 03 · Wallets, Transfers & Acquiring",
    title: "PSBs, Mobile Money Operators & PSSPs",
    licenseTiers: ["PSB_PAYMENT_SERVICE_BANK", "MMO_MOBILE_MONEY", "PSSB_PAYMENT_SOLUTION"],
    regulators: ["CBN PSB Framework", "CBN MMO Guidelines", "BOFIA 2020 §2", "NDPA GAID", "FCCPC"],
    summary:
      "Prevent unintentional cross-license infringements when payment brands promote co-branded partner credit, wallet savings, or direct marketing incentives.",
    blindSpots: [
      "Blocks PSBs, MMOs, and PSSPs from advertising direct balance-sheet lending without naming a CBN-licensed bank/MFB underwriter",
      "Screens PSSPs against unlawful public deposit solicitation language ('Save and earn' without custodial partner disclosure)",
      "Monitors live fee schedules and web T&Cs every 6–24 hours for unauthorized engineering or CMS mutations",
    ],
    exampleBefore:
      "Get instant loans straight from your wallet! Zero collateral, zero partner banks needed—apply directly on our PSB app.",
    exampleAfter:
      "Access credit facilities directly in the app, underwritten and provided exclusively by [Partner Microfinance/Commercial Bank PLC], licensed by the Central Bank of Nigeria. Subject to credit appraisal. Terms and Conditions apply.",
    exampleCitation: "CBN PSB Guidelines · CBN MMO Framework · BOFIA 2020 §2",
  },
  {
    id: "wealthtech",
    anchor: "wealthtech",
    eyebrow: "Sector 04 · Capital Markets & Digital Assets",
    title: "WealthTech, Robo-Advisors & SEC VASPs",
    licenseTiers: ["SEC_CAPITAL_MARKET_OPERATOR"],
    regulators: ["SEC ISA 2025", "SEC Rule 102 / 214", "SEC Finfluencer Guidelines", "ARCON ASP", "NDPC"],
    summary:
      "Eliminate prohibited guaranteed-return phrasing, unapproved digital asset promotions, and unvetted finfluencer scripts before campaigns go live.",
    blindSpots: [
      "Immediately blocks '100% risk-free', 'guaranteed ROI', and 'zero capital loss' claims across ads and emails",
      "Enforces clear capital-at-risk and past-performance non-guarantee disclaimers on variable-yield products",
      "Surfaces breaking SEC VASP & finfluencer regulatory circulars through Class D live web intelligence",
    ],
    exampleBefore:
      "Invest in our curated dollar yield pool for a guaranteed 24% annual return—100% risk-free capital protection!",
    exampleAfter:
      "Target competitive historical returns (up to 24% indicative annualized benchmark) through [SEC-Registered Operator]. Capital is at risk; returns are variable and past performance does not guarantee future results. Regulated by the SEC Nigeria. T&Cs apply.",
    exampleCitation: "SEC Investments & Securities Act 2025 · SEC Rule 214 · SEC Finfluencer Guidelines",
  },
];

export default function SolutionsPage() {
  return (
    <div className="min-h-screen bg-white text-zinc-950 flex flex-col">
      <MarketingHeader />

      <main className="flex-1">
        {/* Header Band */}
        <section className="marketing-cobalt-wash border-b border-zinc-200 py-16 sm:py-24">
          <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
            <div className="max-w-3xl">
              <p className="font-mono text-[11px] font-medium uppercase tracking-[0.11em] text-zinc-500">
                Solutions Across 10 Nigerian License Classifications
              </p>
              <h1 className="mt-3 text-[34px] sm:text-[48px] font-semibold leading-[1.08] tracking-[-0.03em] text-zinc-950">
                Built around your{" "}
                <span className="font-serif italic font-normal text-zinc-800">
                  exact statutory perimeter
                </span>
              </h1>
              <p className="mt-5 text-[16px] sm:text-[17.5px] leading-[1.6] text-zinc-600">
                Different financial licenses carry strictly different marketing boundaries under BOFIA 2020, CBN guidelines, FCCPC DEON rules, and SEC directives. Select your institution sector below.
              </p>

              {/* Anchor Jump Strip */}
              <div className="mt-8 flex flex-wrap gap-2">
                {SECTORS.map((sector) => (
                  <a
                    key={sector.id}
                    href={`#${sector.anchor}`}
                    className="rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-[13px] font-medium text-zinc-800 hover:border-zinc-900 hover:text-zinc-950 transition-colors"
                  >
                    {sector.title}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Sector Deep Dives */}
        <div className="divide-y divide-zinc-200">
          {SECTORS.map((sector, index) => (
            <section
              key={sector.id}
              id={sector.anchor}
              className={`py-20 lg:py-24 scroll-mt-16 ${
                index % 2 === 1 ? "bg-zinc-50" : "bg-white"
              }`}
            >
              <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
                <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-start">
                  {/* Left: Capabilities & License Tiers */}
                  <div className="lg:col-span-6 space-y-6">
                    <div>
                      <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.09em] text-[#2A4BFF]">
                        {sector.eyebrow}
                      </p>
                      <h2 className="mt-2.5 text-[28px] sm:text-[34px] font-semibold leading-[1.15] tracking-tight text-zinc-950">
                        {sector.title}
                      </h2>
                      <p className="mt-3.5 text-[15px] leading-relaxed text-zinc-600">
                        {sector.summary}
                      </p>
                    </div>

                    <div>
                      <p className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-zinc-400">
                        Supported License Classifications
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {sector.licenseTiers.map((tier) => (
                          <span
                            key={tier}
                            className="rounded-md border border-zinc-200 bg-white px-2.5 py-1 font-mono text-[11px] font-medium text-zinc-800"
                          >
                            {tier}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-zinc-400">
                        Top Silent Blind Spots Caught
                      </p>
                      <ul className="mt-3 space-y-2.5">
                        {sector.blindSpots.map((spot) => (
                          <li
                            key={spot}
                            className="flex items-start gap-2.5 text-[14px] leading-relaxed text-zinc-800"
                          >
                            <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-700" />
                            <span>{spot}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-2">
                      <Link
                        href="/sign-up"
                        className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-zinc-950 hover:text-[#2A4BFF] transition-colors"
                      >
                        <span>Configure this license scope in 7-day pilot</span>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>

                  {/* Right: Before / After Rewrite Proof Sheet */}
                  <div className="lg:col-span-6 space-y-4">
                    <div className="rounded-2xl border border-zinc-200 bg-white p-6 marketing-frame-shadow space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-3">
                        <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-zinc-500">
                          LIVE BEFORE / AFTER AUDIT SPECIMEN
                        </span>
                        <span className="font-mono text-[10.5px] text-zinc-400">
                          {sector.regulators.slice(0, 3).join(" · ")}
                        </span>
                      </div>

                      <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4">
                        <div className="flex items-center gap-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-wider text-rose-700">
                          <ShieldAlert className="h-3.5 w-3.5" />
                          <span>Blocked Promotional Draft</span>
                        </div>
                        <p className="mt-2 text-[13.5px] leading-relaxed text-rose-950">
                          &ldquo;{sector.exampleBefore}&rdquo;
                        </p>
                      </div>

                      <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                        <div className="flex items-center gap-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-wider text-emerald-800">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Lock-Verified Compliant Rewrite</span>
                        </div>
                        <p className="mt-2 text-[13.5px] leading-relaxed text-emerald-950">
                          &ldquo;{sector.exampleAfter}&rdquo;
                        </p>
                      </div>

                      <div className="pt-1 flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] text-zinc-500">
                        <span>Citations: {sector.exampleCitation}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          ))}
        </div>

        <ExecutiveCtaBanner />
      </main>

      <MarketingFooter />
    </div>
  );
}
