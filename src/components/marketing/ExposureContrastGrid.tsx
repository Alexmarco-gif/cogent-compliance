import React from "react";
import { AlertTriangle, Clock, FileWarning, Scale } from "lucide-react";
import { SectionHeader } from "./SectionHeader";

const EXPOSURE_CARDS = [
  {
    icon: AlertTriangle,
    tag: "AI HALLUCINATION RISK",
    title: "Consumer chatbots fabricate Nigerian legal citations",
    body: "Generic LLMs invent CBN circular numbers, rely on stale pre-2025 lending rules, and have zero knowledge of your internal product fee schedule.",
    stat: "Zero verifiable SHA-256 provenance",
  },
  {
    icon: FileWarning,
    tag: "DRIP PRICING & DELISTING",
    title: "Hidden upfront fees turn 5% ads into 180%+ APR traps",
    body: "Marketing flyers routinely omit processing charges or promote <60-day tenors—triggering FCCPA §115 fines up to ₦100M and instant Google Play takedowns.",
    stat: "Up to ₦100M or 1% turnover",
  },
  {
    icon: Clock,
    tag: "LAUNCH VELOCITY DRAG",
    title: "Manual legal queues stall campaigns for 5–10 business days",
    body: "External counsel retainers and email-based compliance reviews trap growth teams in vague rejections without actionable, rate-safe rewrites.",
    stat: "₦1.5M–₦5.0M / mo external retainers",
  },
  {
    icon: Scale,
    tag: "INSPECTION VULNERABILITY",
    title: "Scattered Slack approvals fail FCCPC 2-year audits",
    body: "FCCPC Reg. 32 requires preserved promotional records and clear accountability. Unvetted live landing page edits quietly break approved baselines.",
    stat: "₦1M–₦3M per unvetted ARCON ad",
  },
];

export function ExposureContrastGrid() {
  return (
    <section className="bg-zinc-950 py-20 text-white lg:py-28">
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        <SectionHeader
          eyebrow="The Compliance Gap"
          title={
            <>
              Compliance infrastructure should clear growth—
              <span className="font-serif italic font-normal text-zinc-300">
                not guess the law.
              </span>
            </>
          }
          description="Nigerian financial teams are caught between slow manual retainers and generic AI wrappers that increase statutory liability."
          align="center"
          theme="dark"
        />

        <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-2 lg:gap-5">
          {EXPOSURE_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="flex flex-col justify-between rounded-2xl border border-zinc-800 bg-[#111114] p-6 sm:p-7"
              >
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-[10.5px] uppercase tracking-[0.09em] text-zinc-400">
                      {card.tag}
                    </span>
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300">
                      <Icon className="h-4 w-4" strokeWidth={1.7} />
                    </div>
                  </div>
                  <h3 className="mt-4 text-[18px] font-semibold leading-snug tracking-tight text-white">
                    {card.title}
                  </h3>
                  <p className="mt-2.5 text-[14px] leading-relaxed text-zinc-400">
                    {card.body}
                  </p>
                </div>

                <div className="mt-6 border-t border-zinc-800/80 pt-3.5">
                  <span className="font-mono text-[11.5px] text-rose-400">
                    {card.stat}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
