import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, FileCheck2 } from "lucide-react";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { ExecutiveCtaBanner } from "@/components/marketing/ExecutiveCtaBanner";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { SOLUTION_VERTICAL_PAGES } from "@/data/marketing-scenarios";
import { getPublicSiteUrl } from "@/lib/site-url";

const siteUrl = getPublicSiteUrl();

export function generateStaticParams() {
  return SOLUTION_VERTICAL_PAGES.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = SOLUTION_VERTICAL_PAGES.find((p) => p.slug === slug);
  if (!page) {
    return { title: "Solution Not Found" };
  }

  return {
    title: page.seoTitle,
    description: page.seoDescription,
    keywords: page.targetKeywords,
    alternates: {
      canonical: `/solutions/${page.slug}`,
    },
    openGraph: {
      title: page.seoTitle,
      description: page.seoDescription,
      url: `/solutions/${page.slug}`,
    },
  };
}

export default async function SolutionVerticalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = SOLUTION_VERTICAL_PAGES.find((p) => p.slug === slug);
  if (!page) {
    notFound();
  }

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${siteUrl}/` },
          { "@type": "ListItem", position: 2, name: "Solutions", item: `${siteUrl}/solutions` },
          {
            "@type": "ListItem",
            position: 3,
            name: page.seoTitle,
            item: `${siteUrl}/solutions/${page.slug}`,
          },
        ],
      },
      {
        "@type": "SoftwareApplication",
        name: "Cogent",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: `${siteUrl}/solutions/${page.slug}`,
        description: page.seoDescription,
      },
      {
        "@type": "FAQPage",
        mainEntity: page.faqs.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: f.answer,
          },
        })),
      },
    ],
  };

  return (
    <div className="min-h-screen bg-white text-[#0B1220] flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <div className="relative cogent-editorial-canvas border-b border-slate-200">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 cogent-hairline-grid"
        />
        <MarketingHeader />

        <section className="relative z-10 py-14 sm:py-20">
          <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
            <Link
              href="/solutions"
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-600 hover:text-[#1D4ED8] transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>All Compliance Solutions</span>
            </Link>

            <div className="mt-6 max-w-3xl">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[#1D4ED8]">
                {page.eyebrow}
              </p>
              <h1 className="mt-3 text-[34px] sm:text-[48px] font-semibold leading-[1.08] tracking-[-0.03em] text-[#0B1220]">
                {page.h1Leading}{" "}
                <span className="text-[#1D4ED8]">{page.h1Accent}</span>
              </h1>
              <p className="mt-5 text-[16px] sm:text-[18px] leading-[1.6] text-slate-600">
                {page.heroSummary}
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-2">
                {page.regulators.map((reg) => (
                  <span
                    key={reg}
                    className="rounded border border-slate-200 bg-white px-2.5 py-1 font-mono text-[11px] font-semibold text-[#0B1220]"
                  >
                    {reg}
                  </span>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/sign-up"
                  className="inline-flex h-11 items-center gap-2 rounded-md bg-[#1D4ED8] px-6 text-[13.5px] font-semibold text-white hover:bg-[#1E40AF] transition-colors"
                >
                  <span>Start 7-Day Free Trial</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/resources/faq"
                  className="inline-flex h-11 items-center rounded-md border border-slate-200 bg-white px-5 text-[13.5px] font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Read Common Questions
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>

      <main className="flex-1">
        {/* Active 2026 Regulatory Mandates & Deadlines */}
        <section className="border-b border-slate-200 bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
            <div className="max-w-2xl">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[#1D4ED8]">
                ACTIVE 2025–2026 OBLIGATIONS
              </p>
              <h2 className="mt-2.5 text-[28px] sm:text-[36px] font-semibold leading-[1.15] tracking-[-0.025em] text-[#0B1220]">
                Key circulars and deadlines covered
              </h2>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
              {page.urgentMandates2026.map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl border border-slate-200 bg-[#FAFBFD] p-6 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded bg-[#0B1220] px-2 py-0.5 font-mono text-[10px] font-semibold uppercase text-white">
                        {item.regulator}
                      </span>
                      <span className="font-mono text-[10.5px] font-medium text-[#1D4ED8]">
                        {item.deadlineOrStatus}
                      </span>
                    </div>
                    <h3 className="mt-4 text-[17px] font-semibold leading-snug text-[#0B1220]">
                      {item.title}
                    </h3>
                    <p className="mt-2.5 text-[13.5px] leading-relaxed text-slate-600">
                      {item.summary}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Workflows & Checklist */}
        <section className="border-b border-slate-200 bg-[#FAFBFD] py-16 sm:py-20">
          <div className="mx-auto max-w-[1200px] px-5 sm:px-8 grid grid-cols-1 gap-12 lg:grid-cols-12">
            <div className="lg:col-span-7 space-y-6">
              <div>
                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[#1D4ED8]">
                  COMPRESSED WORKFLOWS
                </p>
                <h2 className="mt-2.5 text-[28px] sm:text-[34px] font-semibold leading-[1.15] tracking-[-0.025em] text-[#0B1220]">
                  From multi-day legal bottlenecks to minutes
                </h2>
              </div>

              <div className="space-y-4">
                {page.workflows.map((wf) => (
                  <div
                    key={wf.title}
                    className="rounded-xl border border-slate-200 bg-white p-6"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-[17px] font-semibold text-[#0B1220]">
                        {wf.title}
                      </h3>
                      <div className="flex items-center gap-2 font-mono text-[11px]">
                        <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 border border-rose-200 rounded px-2 py-0.5">
                          <Clock className="h-3 w-3" />
                          {wf.beforeTime}
                        </span>
                        <span className="text-slate-400">&rarr;</span>
                        <span className="text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-2 py-0.5 font-semibold">
                          {wf.cogentTime}
                        </span>
                      </div>
                    </div>
                    <p className="mt-2.5 text-[14px] leading-relaxed text-slate-600">
                      {wf.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xs">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
                  <FileCheck2 className="h-5 w-5 text-[#1D4ED8]" />
                  <h2 className="text-[18px] font-semibold text-[#0B1220]">
                    Compliance Readiness Checklist
                  </h2>
                </div>

                <ul className="mt-5 space-y-3.5">
                  {page.checklistItems.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2.5 text-[13.5px] leading-relaxed text-slate-700"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-7 border-t border-slate-100 pt-5">
                  <Link
                    href="/sign-up"
                    className="inline-flex w-full h-10 items-center justify-center gap-2 rounded-md bg-[#0B1220] px-4 text-[13px] font-semibold text-white hover:bg-slate-800 transition-colors"
                  >
                    <span>Run this checklist on your policies</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Vertical FAQs */}
        <section className="bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
            <h2 className="text-[26px] sm:text-[32px] font-semibold tracking-[-0.025em] text-[#0B1220]">
              Frequently asked questions
            </h2>
            <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
              {page.faqs.map((faq) => (
                <div
                  key={faq.question}
                  className="rounded-xl border border-slate-200 bg-[#FAFBFD] p-6"
                >
                  <h3 className="text-[16px] font-semibold text-[#0B1220]">
                    {faq.question}
                  </h3>
                  <p className="mt-2.5 text-[14px] leading-relaxed text-slate-600">
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <ExecutiveCtaBanner />
      </main>

      <MarketingFooter />
    </div>
  );
}
