"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ShieldAlert } from "lucide-react";
import { LICENSE_VERTICALS, type LicenseVertical } from "@/data/marketing-scenarios";
import { SectionHeader } from "./SectionHeader";

export function LicenseVerticalSwitcher() {
  const [selectedId, setSelectedId] = useState<LicenseVertical["id"]>("lenders");
  const vertical =
    LICENSE_VERTICALS.find((v) => v.id === selectedId) ?? LICENSE_VERTICALS[0]!;

  return (
    <section className="bg-white py-20 lg:py-28">
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeader
            eyebrow="License-Aware Intelligence"
            title={
              <>
                Tailored to your{" "}
                <span className="font-serif italic font-normal text-zinc-700">
                  exact regulatory license
                </span>
              </>
            }
            description="Cogent enforces different statutory obligations for a Digital Lender than a Payment Service Bank or SEC Capital Market Operator."
          />

          <Link
            href="/solutions"
            className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-zinc-950 hover:text-[#2A4BFF] transition-colors shrink-0"
          >
            <span>Explore all 10 license tiers</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Interactive Segmented Vertical Selector */}
        <div
          className="mt-10 flex items-center gap-2 overflow-x-auto no-scrollbar border-b border-zinc-200 pb-3"
          role="tablist"
          aria-label="Nigerian financial institution verticals"
        >
          {LICENSE_VERTICALS.map((item) => {
            const active = item.id === selectedId;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSelectedId(item.id)}
                className={`shrink-0 rounded-lg px-4 py-2 text-[13.5px] font-medium transition-colors cursor-pointer ${
                  active
                    ? "bg-zinc-950 text-white"
                    : "border border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-white hover:text-zinc-950"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Active Vertical Panel */}
        <div
          role="tabpanel"
          className="mt-6 grid grid-cols-1 gap-6 rounded-2xl border border-zinc-200 bg-zinc-50/70 p-6 sm:p-8 lg:grid-cols-12 lg:gap-8"
        >
          {/* Left Narrative & Capabilities */}
          <div className="lg:col-span-7 flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[11px] uppercase tracking-[0.07em] text-zinc-500">
                  {vertical.licenseTiers}
                </span>
              </div>

              <h3 className="mt-3 text-[24px] sm:text-[28px] font-semibold leading-[1.2] tracking-tight text-zinc-950">
                {vertical.headline}
              </h3>

              <p className="mt-3 text-[15px] leading-relaxed text-zinc-600">
                {vertical.description}
              </p>

              <ul className="mt-6 space-y-3">
                {vertical.blindSpotsCaught.map((point) => (
                  <li key={point} className="flex items-start gap-2.5 text-[14px] text-zinc-800">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-2 pt-5 border-t border-zinc-200">
              <span className="font-mono text-[10.5px] uppercase tracking-wider text-zinc-400 mr-1">
                Active Regulators:
              </span>
              {vertical.regulators.map((reg) => (
                <span
                  key={reg}
                  className="rounded-md border border-zinc-200 bg-white px-2.5 py-1 font-mono text-[11px] font-semibold text-zinc-900"
                >
                  {reg}
                </span>
              ))}
            </div>
          </div>

          {/* Right Live Case Card */}
          <div className="lg:col-span-5 flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-5 sm:p-6">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-[#2A4BFF] font-semibold">
                  {vertical.sampleCase.label}
                </span>
                <ShieldAlert className="h-4 w-4 text-rose-600" />
              </div>

              <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50/50 p-4">
                <p className="font-mono text-[10px] uppercase tracking-wider text-rose-700">
                  Flagged Blind Spot
                </p>
                <p className="mt-1.5 text-[13.5px] font-medium leading-relaxed text-rose-950">
                  {vertical.sampleCase.riskFlag}
                </p>
                <p className="mt-2.5 font-mono text-[11px] text-rose-700">
                  [{vertical.sampleCase.statute}]
                </p>
              </div>

              <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
                <p className="font-mono text-[10px] uppercase tracking-wider text-emerald-700">
                  Cogent Deterministic Resolution
                </p>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-emerald-950">
                  {vertical.sampleCase.resolution}
                </p>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-zinc-100 flex items-center justify-between">
              <Link
                href={`/solutions#${
                  vertical.id === "lenders"
                    ? "digital-lenders"
                    : vertical.id === "banking"
                      ? "banking"
                      : vertical.id === "payments"
                        ? "payments"
                        : "wealthtech"
                }`}
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-zinc-950 hover:text-[#2A4BFF] transition-colors"
              >
                <span>See {vertical.label} specification</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
