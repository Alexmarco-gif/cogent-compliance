import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface ExecutiveCtaBannerProps {
  title?: string;
  description?: string;
}

export function ExecutiveCtaBanner({
  title = "Clear your next campaign with verifiable Nigerian statutory proof.",
  description = "Start a 7-day evaluation pilot with 3 live campaign audits, 10 lock-verified rewrites, and watermarked evidence dossier previews—no credit card required.",
}: ExecutiveCtaBannerProps) {
  return (
    <section className="bg-zinc-950 py-20 text-white">
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        <div className="flex flex-col gap-8 rounded-2xl border border-zinc-800 bg-[#111114] p-7 sm:p-10 lg:flex-row lg:items-center lg:justify-between lg:p-12">
          <div className="max-w-2xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-zinc-400">
              7-DAY INSTITUTIONAL EVALUATION
            </p>
            <h2 className="mt-3 text-[28px] sm:text-[34px] font-semibold leading-[1.14] tracking-[-0.02em] text-white">
              {title}
            </h2>
            <p className="mt-3.5 text-[15px] leading-relaxed text-zinc-400">
              {description}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center shrink-0">
            <Link
              href="/sign-up"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-white px-5 text-[13.5px] font-semibold text-zinc-950 hover:bg-zinc-100 transition-colors"
            >
              <span>Start 7-Day Evaluation</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex h-11 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 px-5 text-[13.5px] font-medium text-zinc-200 hover:border-zinc-500 hover:text-white transition-colors"
            >
              View Plans &amp; Naira Billing
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
