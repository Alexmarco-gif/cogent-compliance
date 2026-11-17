import React from "react";
import { SectionHeader } from "./SectionHeader";

const ADOPTION_STEPS = [
  {
    number: "01",
    title: "Select License Tier & Regulators",
    duration: "2 MINUTES",
    description:
      "During onboarding, specify your CBN, FCCPC, ARCON, NDPC, or SEC license classification so every statutory lock adapts to your institution.",
  },
  {
    number: "02",
    title: "Seed Products & Rate Cards",
    duration: "5 MINUTES",
    description:
      "Add your live credit facilities, deposit yields, and processing fees—plus optional internal compliance playbooks and prohibited phrases.",
  },
  {
    number: "03",
    title: "Run Pre-Flight Audits & Rewrites",
    duration: "< 30 SECONDS",
    description:
      "Submit flyers, SMS, social posts, or URLs. Review deterministic Lock 1–3 flags, verify APR disclosures, and accept lock-verified channel rewrites.",
  },
  {
    number: "04",
    title: "Seal SHA-256 Dossier & Watch Drift",
    duration: "CONTINUOUS",
    description:
      "Route to Legal Counsel or your CCO for formal sign-off, export a 2-year/7-year PDF evidence dossier, and monitor live URLs for post-approval edits.",
  },
];

export function AdoptionSteps() {
  return (
    <section className="border-y border-zinc-200 bg-zinc-50 py-20 lg:py-24">
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        <SectionHeader
          eyebrow="Operational Rollout"
          title={
            <>
              Production-ready{" "}
              <span className="font-serif italic font-normal text-zinc-700">
                in under ten minutes
              </span>
            </>
          }
          description="No months-long enterprise integration required. Configure your license profile and start auditing live campaigns on day one."
        />

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ADOPTION_STEPS.map((step) => (
            <div
              key={step.number}
              className="flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-6"
            >
              <div>
                <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                  <span className="font-mono text-[13px] font-semibold text-[#2A4BFF]">
                    {step.number}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-zinc-400">
                    {step.duration}
                  </span>
                </div>
                <h3 className="mt-4 text-[16.5px] font-semibold leading-snug text-zinc-950">
                  {step.title}
                </h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-zinc-600">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
