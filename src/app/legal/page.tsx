import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Lock, FileText, Scale } from "lucide-react";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { RevealOnScroll } from "@/components/marketing/RevealOnScroll";

export const metadata: Metadata = {
  title: "Legal, Privacy & Governance | Stem Systems",
  description:
    "Review Stem Systems Inc's Privacy Policy (NDPA 2023), Terms of Service, Cookie Policy, and Data Processing Agreement for Cogent.",
  alternates: {
    canonical: "/legal",
  },
  openGraph: {
    title: "Legal, Privacy & Governance | Cogent by Stem Systems",
    description:
      "Enterprise governance, NDPA 2023 compliance, tenant data isolation, and service agreements governing the Cogent platform.",
    url: "/legal",
  },
};

export default function LegalPage() {
  return (
    <div className="min-h-screen bg-white text-[#0B1220] flex flex-col">
      <div className="relative cogent-editorial-canvas border-b border-slate-200">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 cogent-hairline-grid"
        />
        <MarketingHeader />

        <section className="relative z-10 pt-12 pb-16 sm:pt-16 sm:pb-20">
          <div className="mx-auto max-w-[1200px] px-5 sm:px-8 text-center">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#1D4ED8]">
              GOVERNANCE · TENANCY · DATA INTEGRITY
            </p>
            <h1 className="mx-auto mt-4 max-w-4xl text-[36px] sm:text-[48px] font-semibold leading-[1.08] tracking-[-0.03em] text-[#0B1220]">
              Legal, Privacy &amp; Data Governance
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-[16px] sm:text-[17.5px] leading-relaxed text-slate-600">
              Clear commitments on institutional data isolation, Nigeria Data Protection Act (NDPA 2023) compliance, zero model training on customer data, and service terms.
            </p>
          </div>
        </section>
      </div>

      <main className="flex-1 py-16 sm:py-20">
        <div className="mx-auto max-w-[1000px] px-5 sm:px-8 space-y-16">
          {/* Section 1: Privacy Policy (NDPA 2023) */}
          <RevealOnScroll>
            <article id="privacy" className="rounded-xl border border-slate-200 bg-white p-6 sm:p-10 shadow-xs">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4 text-[#1D4ED8]">
                <ShieldCheck className="h-5 w-5" />
                <span className="font-mono text-[11px] font-bold uppercase tracking-wider">
                  Document 01 · Privacy Policy
                </span>
              </div>

              <h2 className="mt-5 text-[24px] font-semibold text-[#0B1220]">
                Nigeria Data Protection Act (NDPA 2023) Privacy Policy
              </h2>
              <p className="mt-1 font-mono text-[11.5px] text-slate-400">
                Last updated: January 2026 · Governed by the Nigeria Data Protection Commission (NDPC)
              </p>

              <div className="mt-6 space-y-4 text-[14px] leading-relaxed text-slate-600">
                <p>
                  Stem Systems Inc (&quot;Stem Systems&quot;, &quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) provides the Cogent regulatory intelligence and compliance workflow engine. We are committed to protecting the privacy, confidentiality, and data sovereignty of financial institutions, lenders, banks, and their authorized users under the Nigeria Data Protection Act 2023 (&quot;NDPA 2023&quot;).
                </p>

                <h3 className="text-[16px] font-semibold text-[#0B1220] pt-2">
                  1. Information We Collect
                </h3>
                <p>
                  We collect institutional account credentials (work email, name, institution name), role-based permissions, search audit logs, uploaded internal policies (AML manuals, credit policies, rate sheets), and generated compliance deliverables. We do not collect retail banking consumer PINs, BVNs, or payment card CVVs.
                </p>

                <h3 className="text-[16px] font-semibold text-[#0B1220] pt-2">
                  2. Purpose and Lawful Basis of Processing
                </h3>
                <p>
                  Under NDPA 2023 §24–26, processing of organizational data is conducted on the lawful basis of contractual performance (providing regulatory intelligence, policy clause comparisons, and campaign reviews) and institutional legitimate interest (maintaining audit-ready supervisory defenses).
                </p>

                <h3 className="text-[16px] font-semibold text-[#0B1220] pt-2">
                  3. Zero Model Training &amp; Cryptographic Isolation
                </h3>
                <p>
                  Customer policies, rate cards, marketing briefs, and audit replies uploaded to Cogent are stored in cryptographically isolated tenant perimeters. <strong>Your uploaded internal data is NEVER used to train, fine-tune, or pool public foundation AI models.</strong>
                </p>

                <h3 className="text-[16px] font-semibold text-[#0B1220] pt-2">
                  4. Data Subject Rights &amp; Retention
                </h3>
                <p>
                  In accordance with NDPA 2023 §34–39, institutional administrators may request access, rectification, portability, or complete cryptographic deletion of uploaded documents and workspace audit dossiers upon service termination.
                </p>
              </div>
            </article>
          </RevealOnScroll>

          {/* Section 2: Terms of Service */}
          <RevealOnScroll delayMs={60}>
            <article id="terms" className="rounded-xl border border-slate-200 bg-white p-6 sm:p-10 shadow-xs">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4 text-[#1D4ED8]">
                <Scale className="h-5 w-5" />
                <span className="font-mono text-[11px] font-bold uppercase tracking-wider">
                  Document 02 · Terms of Service
                </span>
              </div>

              <h2 className="mt-5 text-[24px] font-semibold text-[#0B1220]">
                Enterprise Software as a Service Terms
              </h2>
              <p className="mt-1 font-mono text-[11.5px] text-slate-400">
                Effective upon workspace creation
              </p>

              <div className="mt-6 space-y-4 text-[14px] leading-relaxed text-slate-600">
                <p>
                  By creating an account or accessing the Cogent platform, your regulated entity agrees to these Terms of Service. If you are entering into this agreement on behalf of a financial institution, bank, or lender, you represent that you possess the authority to bind such entity.
                </p>

                <h3 className="text-[16px] font-semibold text-[#0B1220] pt-2">
                  1. Scope of Service &amp; Decision Support Notice
                </h3>
                <p>
                  Cogent is an enterprise decision-support and workflow acceleration software designed for Chief Compliance Officers, General Counsel, and regulatory teams. While Cogent synthesizes 141+ codified Nigerian instruments, official gazettes, and pan-African rules with deterministic locks, it does not constitute formal outside legal counsel. Final sign-off remains with your institution&apos;s authorized human officers.
                </p>

                <h3 className="text-[16px] font-semibold text-[#0B1220] pt-2">
                  2. Acceptable Use
                </h3>
                <p>
                  You agree to use Cogent solely for legitimate regulatory compliance, policy drafting, supervisory inquiry responses, and marketing clearance. Prohibited activities include reverse engineering the mechanical deterministic locks engine, scraping the proprietary statutory index, or attempting to breach multi-tenant data boundaries.
                </p>

                <h3 className="text-[16px] font-semibold text-[#0B1220] pt-2">
                  3. Service Levels &amp; Availability
                </h3>
                <p>
                  Enterprise customers benefit from our 99.9% uptime SLA, priority live circular ingestion pipelines, dedicated tenant keys, and direct compliance engineering support.
                </p>
              </div>
            </article>
          </RevealOnScroll>

          {/* Section 3: Cookie Policy */}
          <RevealOnScroll delayMs={80}>
            <article id="cookies" className="rounded-xl border border-slate-200 bg-white p-6 sm:p-10 shadow-xs">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4 text-[#1D4ED8]">
                <FileText className="h-5 w-5" />
                <span className="font-mono text-[11px] font-bold uppercase tracking-wider">
                  Document 03 · Cookie &amp; Session Policy
                </span>
              </div>

              <h2 className="mt-5 text-[24px] font-semibold text-[#0B1220]">
                Strictly Necessary &amp; Security Cookies
              </h2>
              <p className="mt-1 font-mono text-[11.5px] text-slate-400">
                Zero third-party advertising cookies or cross-site behavioral tracking
              </p>

              <div className="mt-6 space-y-4 text-[14px] leading-relaxed text-slate-600">
                <p>
                  Cogent utilizes strictly necessary session, authentication (Clerk), and CSRF protection cookies to ensure secure workspace access. We do not sell tracking data or inject third-party ad networks into your institutional workflow.
                </p>
              </div>
            </article>
          </RevealOnScroll>

          {/* Section 4: Data Processing Agreement (DPA) */}
          <RevealOnScroll delayMs={100}>
            <article id="dpa" className="rounded-xl border border-slate-200 bg-white p-6 sm:p-10 shadow-xs">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4 text-[#1D4ED8]">
                <Lock className="h-5 w-5" />
                <span className="font-mono text-[11px] font-bold uppercase tracking-wider">
                  Document 04 · Data Processing Agreement (DPA)
                </span>
              </div>

              <h2 className="mt-5 text-[24px] font-semibold text-[#0B1220]">
                Institutional Data Processing Agreement
              </h2>
              <p className="mt-1 font-mono text-[11.5px] text-slate-400">
                Enterprise Data Protection &amp; Cross-Border Transfer Compliance (NDPA 2023 §41–43)
              </p>

              <div className="mt-6 space-y-4 text-[14px] leading-relaxed text-slate-600">
                <p>
                  This DPA supplements the Terms of Service for all institutional customers processing operational compliance data on Cogent. Stem Systems acts as the Data Processor, and your institution acts as the Data Controller.
                </p>

                <h3 className="text-[16px] font-semibold text-[#0B1220] pt-2">
                  1. Technical &amp; Organizational Measures (TOMs)
                </h3>
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    <strong>Encryption at Rest &amp; Transit:</strong> AES-256 encryption at rest and TLS 1.3 in transit across all workspace databases and document caches.
                  </li>
                  <li>
                    <strong>WORM Audit Immutability:</strong> Write-Once-Read-Many SHA-256 cryptographic logs verifying every query, retrieved statute, and CCO sign-off.
                  </li>
                  <li>
                    <strong>Role-Based Access Control (RBAC):</strong> Granular permissions separating Product (research/drafting), Risk/CCO (review/approval), and Executive leadership.
                  </li>
                </ul>

                <div className="mt-6 border-t border-slate-100 pt-5 flex items-center justify-between">
                  <span className="text-[13px] text-slate-500">
                    Need an executed copy of this DPA for your institutional procurement board?
                  </span>
                  <Link
                    href="/company"
                    className="font-semibold text-[13px] text-[#1D4ED8] hover:underline"
                  >
                    Contact Stem Systems Legal &rarr;
                  </Link>
                </div>
              </div>
            </article>
          </RevealOnScroll>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
