"use client";

import React, { useState } from "react";
import { ChevronDown, ShieldCheck, CheckCircle2 } from "lucide-react";
import { WALKTHROUGH_STEPS, type WalkthroughStep } from "@/data/marketing-scenarios";
import { SectionHeader } from "./SectionHeader";

function WalkthroughPreviewCard({ step }: { step: WalkthroughStep }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-950 p-2 sm:p-3 marketing-frame-shadow">
      <div className="rounded-xl border border-zinc-800 bg-white overflow-hidden">
        {/* Top Inspector Bar */}
        <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#2A4BFF]">
              {step.previewBadge}
            </span>
          </div>
          <span className="font-mono text-[11px] text-zinc-400">
            STEP {step.stepNumber} / 04
          </span>
        </div>

        {/* Main Dossier / Studio Sheet */}
        <div className="p-5 sm:p-6 space-y-5">
          <div>
            <h4 className="text-[17px] font-semibold tracking-tight text-zinc-950">
              {step.previewTitle}
            </h4>
            <p className="mt-1 text-[13px] text-zinc-500">{step.subtitle}</p>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {step.metrics.map((metric) => {
              const valueClass =
                metric.tone === "critical"
                  ? "text-rose-700"
                  : metric.tone === "verified"
                  ? "text-emerald-700"
                  : "text-zinc-950";
              return (
                <div
                  key={metric.label}
                  className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5"
                >
                  <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-400">
                    {metric.label}
                  </p>
                  <p className={`mt-1 text-[12.5px] font-semibold ${valueClass}`}>
                    {metric.value}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10.5px] uppercase tracking-[0.07em] text-zinc-500">
                {step.snippetLabel}
              </span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="mt-2 font-mono text-[12.5px] leading-relaxed text-zinc-800">
              {step.snippetBody}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-3.5 text-[11.5px] text-zinc-500">
            <span className="inline-flex items-center gap-1.5 font-medium text-zinc-700">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
              Backed by deterministic audit trail &amp; RBAC gate
            </span>
            <span className="font-mono text-[10.5px] text-zinc-400">
              CBN · FCCPC · ARCON
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function StudioWalkthrough() {
  const [activeId, setActiveId] = useState<string>(WALKTHROUGH_STEPS[0]!.id);
  const activeStep =
    WALKTHROUGH_STEPS.find((step) => step.id === activeId) ?? WALKTHROUGH_STEPS[0]!;

  return (
    <section className="bg-white py-20 lg:py-28">
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        <SectionHeader
          eyebrow="Compliance Workbench Flow"
          title={
            <>
              From raw marketing draft to{" "}
              <span className="font-serif italic font-normal text-zinc-700">
                sealed regulatory dossier
              </span>
            </>
          }
          description="Follow how Marketing, Legal Counsel, and Chief Compliance Officers move every flyer, landing page, and store listing through verifiable pre-flight sign-off."
        />

        <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
          {/* Left 5-Col Interactive Step Accordion */}
          <div className="lg:col-span-5 space-y-2.5">
            {WALKTHROUGH_STEPS.map((step) => {
              const isOpen = step.id === activeStep.id;
              return (
                <div
                  key={step.id}
                  className={`rounded-xl border transition-colors ${
                    isOpen
                      ? "border-zinc-900 bg-zinc-50/70"
                      : "border-zinc-200 bg-white hover:border-zinc-300"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setActiveId(step.id)}
                    aria-expanded={isOpen}
                    className="flex w-full items-start justify-between gap-4 p-4 sm:p-5 text-left cursor-pointer"
                  >
                    <div className="flex items-start gap-3.5">
                      <span
                        className={`mt-0.5 font-mono text-[12px] font-semibold ${
                          isOpen ? "text-[#2A4BFF]" : "text-zinc-400"
                        }`}
                      >
                        {step.stepNumber}
                      </span>
                      <div>
                        <h3 className="text-[15.5px] font-semibold text-zinc-950 leading-snug">
                          {step.title}
                        </h3>
                        <p className="mt-1 text-[13px] text-zinc-500">
                          {step.subtitle}
                        </p>
                      </div>
                    </div>
                    <ChevronDown
                      className={`mt-1 h-4 w-4 shrink-0 text-zinc-400 transition-transform duration-150 ${
                        isOpen ? "rotate-180 text-zinc-900" : ""
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-5 sm:px-5 pl-11 sm:pl-12">
                      <p className="text-[13.5px] leading-relaxed text-zinc-600">
                        {step.detail}
                      </p>
                      {/* Inline mobile/tablet preview frame */}
                      <div className="mt-4 lg:hidden">
                        <WalkthroughPreviewCard step={step} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right 7-Col Desktop Sticky Preview Frame */}
          <div className="hidden lg:block lg:col-span-7 lg:sticky lg:top-24">
            <WalkthroughPreviewCard step={activeStep} />
          </div>
        </div>
      </div>
    </section>
  );
}
