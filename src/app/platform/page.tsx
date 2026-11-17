import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Calculator,
  CheckCircle2,
  Database,
  FileCheck2,
  Globe,
  Lock,
  ScanEye,
  ShieldCheck,
} from "lucide-react";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { SectionHeader } from "@/components/marketing/SectionHeader";
import { ExecutiveCtaBanner } from "@/components/marketing/ExecutiveCtaBanner";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

export const metadata: Metadata = {
  title: "Platform Architecture",
  description:
    "How Cogent combines Three-Source Statutory Grounding, deterministic Lock 1–3 verification, Flyer OCR forensics, and SHA-256 evidence dossiers.",
  alternates: {
    canonical: "/platform",
  },
  openGraph: {
    title: "Platform Architecture | Cogent",
    description:
      "Deterministic Lock 1–3 compliance engines, net-disbursed APR verification, flyer OCR forensics, and 2-year SHA-256 audit dossiers.",
    url: "/platform",
  },
};

const THREE_SOURCES = [
  {
    code: "CLASS A · STATUTORY VAULT",
    title: "Golden 50 Corpus (141 PDFs)",
    scope: "Global verified regulatory truth",
    points: [
      "Hybrid RRF retrieval across full-text search and 768-dimension semantic embeddings",
      "Verbatim clauses across CBN, FCCPC, ARCON, NDPC, and SEC with document SHA-256 hashes",
      "Superseded instruments automatically filtered out unless historical comparison is requested",
    ],
  },
  {
    code: "CLASS C · INSTITUTIONAL TRUTH",
    title: "Tenant Rate Cards & Playbooks",
    scope: "PostgreSQL RLS-isolated per institution",
    points: [
      "Structured interest rates (APR, monthly, flat, daily), processing fees, and tenor floors",
      "Organization-specific mandatory disclosures and internal prohibited marketing terms",
      "Zero cross-tenant sharing and zero third-party model training on institutional schedules",
    ],
  },
  {
    code: "CLASS D · LIVE WEB INTELLIGENCE",
    title: "Official .gov.ng Radar & App Store Sync",
    scope: "Explicitly separated external evidence",
    points: [
      "Targets cbn.gov.ng, fccpc.gov.ng, arcon.gov.ng, ndpc.gov.ng, and sec.gov.ng circulars",
      "Powers Ripple Alerts when new regulatory circulars affect active campaigns",
      "SSRF-hardened live webpage fetcher for URL audits and recurring 6–24h drift monitoring",
    ],
  },
];

const MECHANICAL_LOCKS = [
  {
    number: "LOCK 01",
    title: "Prohibited Terms & Guarantee Screener",
    summary:
      "Scans copy using normalized phrase matching and regex boundaries against Nigerian statutory bans and your institution's internal prohibited-phrase register.",
    examples: [
      "'100% risk-free', 'guaranteed returns', 'zero risk'",
      "'0% hidden charges' when product schedule carries fees",
      "'No credit check ever' & 'instant loan no repayment'",
    ],
    statute: "FCCPA §115 / §123 · SEC Rule 102 · CBN CPF §4.2",
  },
  {
    number: "LOCK 02",
    title: "Numerical Rate Card & Effective APR Engine",
    summary:
      "Cross-references advertised percentages and tenors directly against your verified `campaign_products` schedule and computes net-disbursed IRR in pure TypeScript.",
    examples: [
      "Detects drip pricing where upfront fees artificially lower advertised monthly rates",
      "Verifies minimum/maximum repayment tenor bounds (including Google Play 60-day floor)",
      "Outputs structured CBN Annex 1 Key Facts Statement (KFS) figures",
    ],
    statute: "CBN CPF §3.2 · FCCPC DEON Reg. 18",
  },
  {
    number: "LOCK 03",
    title: "Mandatory Qualifiers & License Disclosures",
    summary:
      "Verifies required legal qualifiers calibrated to your exact license tier and campaign channel—preventing buried asterisks or omitted regulatory identifiers.",
    examples: [
      "CBN license identity & NDIC deposit limits (₦5M DMB / ₦2M MFB)",
      "ARCON ASP pre-vetting reference presence and 'Terms and Conditions apply'",
      "Visible 24-hour customer complaints & dispute-resolution contact channel",
    ],
    statute: "CBN CPR · ARCON Code §4.2 · NDIC Act",
  },
];

const GUARDRAIL_LAYERS = [
  {
    layer: "Layer 01",
    name: "License Scope & Intent Gate",
    detail: "Resolves tenant's active Nigerian license tier and regulatory scopes prior to tool execution.",
  },
  {
    layer: "Layer 02",
    name: "Deterministic Lock 1–3 Pre-Check",
    detail: "Executes prohibited phrase, product rate-card, and disclosure checks outside the LLM.",
  },
  {
    layer: "Layer 03",
    name: "Verbatim Clause Citation Binding",
    detail: "Links every statutory claim to stored `clause_id` and SHA-256 document provenance.",
  },
  {
    layer: "Layer 04",
    name: "Numerical Math Isolation",
    detail: "Delegates APR, compounded IRR, and fee calculations exclusively to TypeScript financial engines.",
  },
  {
    layer: "Layer 05",
    name: "Dual-Scope Source Separation",
    detail: "Prevents live web results or user drafts from overriding Class A statutes or Class C product truth.",
  },
  {
    layer: "Layer 06",
    name: "Rewrite Self-Correction Loop",
    detail: "Re-runs every AI-drafted compliant rewrite through Locks 1–3 before presenting it to users.",
  },
  {
    layer: "Layer 07",
    name: "Human Dual-Control RBAC Gate",
    detail: "Restricts `approval.decide` strictly to Legal Counsel / CCO roles; Marketing cannot self-approve.",
  },
];

export default function PlatformPage() {
  return (
    <div className="min-h-screen bg-white text-zinc-950 flex flex-col">
      <MarketingHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="marketing-cobalt-wash border-b border-zinc-200 py-16 sm:py-24">
          <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
            <div className="max-w-3xl">
              <p className="font-mono text-[11px] font-medium uppercase tracking-[0.11em] text-zinc-500">
                Platform Architecture
              </p>
              <h1 className="mt-3 text-[34px] sm:text-[48px] font-semibold leading-[1.08] tracking-[-0.03em] text-zinc-950">
                Deterministic compliance locks{" "}
                <span className="font-serif italic font-normal text-zinc-800">
                  backed by verifiable law.
                </span>
              </h1>
              <p className="mt-5 text-[16px] sm:text-[17.5px] leading-[1.6] text-zinc-600">
                Generic AI systems treat regulatory review as open-ended text generation. Cogent pairs structured Nigerian statutory retrieval with deterministic TypeScript enforcement engines and dual-control approval governance.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/sign-up"
                  className="inline-flex h-11 items-center gap-2 rounded-lg bg-zinc-950 px-5 text-[13.5px] font-medium text-white hover:bg-zinc-800 transition-colors"
                >
                  <span>Start 7-Day Evaluation</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/regulatory-vault"
                  className="inline-flex h-11 items-center rounded-lg border border-zinc-300 bg-white px-5 text-[13.5px] font-medium text-zinc-800 hover:bg-zinc-50 transition-colors"
                >
                  Inspect Golden 50 Vault
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Section A: Three-Source Intelligence */}
        <section id="grounding" className="bg-white py-20 lg:py-24 scroll-mt-16">
          <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
            <SectionHeader
              eyebrow="Three-Source Grounding Stack"
              title="Strict provenance across every legal, product, and live source"
              description="Every compliance finding identifies whether its basis comes from codified Nigerian law, your internal product truth, or live regulatory publications."
            />

            <div className="mt-12 grid grid-cols-1 gap-5 lg:grid-cols-3">
              {THREE_SOURCES.map((source, idx) => {
                const Icon = idx === 0 ? Database : idx === 1 ? Lock : Globe;
                return (
                  <div
                    key={source.code}
                    className="flex flex-col justify-between rounded-2xl border border-zinc-200 bg-zinc-50/60 p-6 sm:p-7"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-[#2A4BFF] font-semibold">
                          {source.code}
                        </span>
                        <Icon className="h-4 w-4 text-zinc-500" strokeWidth={1.7} />
                      </div>
                      <h3 className="mt-3 text-[20px] font-semibold text-zinc-950">
                        {source.title}
                      </h3>
                      <p className="mt-1 font-mono text-[11.5px] text-zinc-500">
                        {source.scope}
                      </p>
                      <ul className="mt-5 space-y-2.5">
                        {source.points.map((pt) => (
                          <li key={pt} className="flex items-start gap-2 text-[13.5px] leading-relaxed text-zinc-700">
                            <CheckCircle2 className="mt-1 h-3.5 w-3.5 shrink-0 text-emerald-700" />
                            <span>{pt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Section B: 3 Deterministic Mechanical Locks */}
        <section
          id="deterministic-locks"
          className="border-y border-zinc-200 bg-zinc-50 py-20 lg:py-24 scroll-mt-16"
        >
          <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
            <SectionHeader
              eyebrow="Deterministic Mechanical Locks"
              title="Three non-negotiable gates before & after reasoning"
              description="Executed directly in TypeScript and PostgreSQL so prohibited phrases, rate mismatches, and missing statutory disclosures are caught deterministically—including inside AI-generated rewrites."
            />

            <div className="mt-12 space-y-5">
              {MECHANICAL_LOCKS.map((lock) => (
                <div
                  key={lock.number}
                  className="grid grid-cols-1 gap-6 rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8 lg:grid-cols-12"
                >
                  <div className="lg:col-span-5">
                    <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.09em] text-[#2A4BFF]">
                      {lock.number}
                    </span>
                    <h3 className="mt-2 text-[21px] font-semibold text-zinc-950">
                      {lock.title}
                    </h3>
                    <p className="mt-2.5 text-[14px] leading-relaxed text-zinc-600">
                      {lock.summary}
                    </p>
                    <p className="mt-4 font-mono text-[11px] text-zinc-500">
                      Basis: {lock.statute}
                    </p>
                  </div>

                  <div className="lg:col-span-7 rounded-xl border border-zinc-200 bg-zinc-50 p-5">
                    <p className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-zinc-500">
                      What This Lock Enforces
                    </p>
                    <ul className="mt-3.5 space-y-2.5">
                      {lock.examples.map((ex) => (
                        <li
                          key={ex}
                          className="flex items-start gap-2.5 text-[13.5px] text-zinc-800"
                        >
                          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-zinc-700" />
                          <span>{ex}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section C: Forensics & Channel Engines */}
        <section id="forensics" className="bg-white py-20 lg:py-24 scroll-mt-16">
          <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
            <SectionHeader
              eyebrow="Multimodal & Channel Auditors"
              title="Engineered for Nigerian flyers, landing pages, and mobile stores"
              description="Financial promotions break rules visually and structurally—through tiny footer disclaimers, upfront processing fees, or Play Store listing violations."
            />

            <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
              <div className="rounded-2xl border border-zinc-200 bg-white p-6">
                <ScanEye className="h-5 w-5 text-zinc-800" strokeWidth={1.7} />
                <h3 className="mt-4 text-[18px] font-semibold text-zinc-950">
                  Flyer OCR &amp; Fine-Print Ratio
                </h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-zinc-600">
                  Gemini Vision extracts text coordinates (`ymin`, `xmin`, `ymax`, `xmax`) from PNG, JPEG, WEBP, and PDF flyers—flagging disclaimer ratios below 12% of headline height and missing ARCON ASP IDs.
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-6">
                <Calculator className="h-5 w-5 text-zinc-800" strokeWidth={1.7} />
                <h3 className="mt-4 text-[18px] font-semibold text-zinc-950">
                  AprCalculatorService &amp; KFS
                </h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-zinc-600">
                  Computes net cash disbursed after processing/management/insurance fees, effective annualized APR, compounded IRR, and renders CBN Annex 1 Key Facts Statement tables.
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-6">
                <FileCheck2 className="h-5 w-5 text-zinc-800" strokeWidth={1.7} />
                <h3 className="mt-4 text-[18px] font-semibold text-zinc-950">
                  App Store &amp; Play Policy Audit
                </h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-zinc-600">
                  Screens Google Play &amp; iOS lending descriptions for &lt;60-day repayment tenors, missing representative loan examples, and contact-list scraping under FCCPC DEON &amp; NDPA 2023.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section D: 7-Layer Guardrails & Dual-Control Governance */}
        <section
          id="governance"
          className="border-t border-zinc-200 bg-zinc-950 py-20 text-white lg:py-24 scroll-mt-16"
        >
          <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
            <SectionHeader
              eyebrow="7-Layer Guardrail & RBAC Stack"
              title="Strict dual-control governance from draft to 7-year archive"
              description="Marketing creates and revises. Legal Counsel or your Chief Compliance Officer holds exclusive `approval.decide` authority—backed by hash-chained audit logs and 6–24h live URL drift monitoring."
              theme="dark"
            />

            <div className="mt-12 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
              {GUARDRAIL_LAYERS.map((item) => (
                <div
                  key={item.layer}
                  className="rounded-xl border border-zinc-800 bg-[#111114] p-5"
                >
                  <p className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-[#6B82FF]">
                    {item.layer}
                  </p>
                  <h3 className="mt-2 text-[15px] font-semibold text-white">
                    {item.name}
                  </h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-zinc-400">
                    {item.detail}
                  </p>
                </div>
              ))}

              <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-5 flex flex-col justify-between">
                <div>
                  <p className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-emerald-400">
                    Evidence Output
                  </p>
                  <h3 className="mt-2 text-[15px] font-semibold text-white">
                    SHA-256 Statutory Dossier
                  </h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-zinc-300">
                    Immutable PDF report archived for 2 years (FCCPC Reg. 32) or 7 years (BOFIA Enterprise).
                  </p>
                </div>
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
