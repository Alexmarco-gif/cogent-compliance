import React from "react";
import { Check, Minus, X } from "lucide-react";
import { COMPARISON_ROWS, type ComparisonRow } from "@/data/marketing-scenarios";
import { SectionHeader } from "./SectionHeader";

function StatusBadge({
  status,
  text,
  highlight = false,
}: {
  status: "yes" | "warn" | "no";
  text: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-start gap-2">
      {status === "yes" && (
        <Check
          className={`mt-0.5 h-4 w-4 shrink-0 ${
            highlight ? "text-emerald-700" : "text-zinc-700"
          }`}
        />
      )}
      {status === "warn" && (
        <Minus className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
      )}
      {status === "no" && (
        <X className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
      )}
      <span
        className={`text-[13px] leading-snug ${
          highlight ? "font-medium text-zinc-950" : "text-zinc-600"
        }`}
      >
        {text}
      </span>
    </div>
  );
}

export function CompetitorComparisonTable() {
  return (
    <section className="bg-white py-20 lg:py-28">
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        <SectionHeader
          eyebrow="Institutional Benchmark"
          title={
            <>
              Why compliance teams move past{" "}
              <span className="font-serif italic font-normal text-zinc-700">
                manual queues &amp; generic AI
              </span>
            </>
          }
          description="External counsel cannot review every social post in real time—and consumer chatbots fail audit scrutiny."
          align="center"
        />

        {/* Desktop Matrix Table */}
        <div className="mt-12 hidden md:block overflow-hidden rounded-2xl border border-zinc-200 bg-white">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50">
                <th className="w-[31%] px-6 py-4 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                  Evaluation Criterion
                </th>
                <th className="w-[22%] px-5 py-4 text-[13px] font-semibold text-zinc-700">
                  External Legal Retainer
                </th>
                <th className="w-[22%] px-5 py-4 text-[13px] font-semibold text-zinc-700">
                  Generic AI Chatbots
                </th>
                <th className="w-[25%] px-6 py-4 bg-zinc-950 text-[13px] font-semibold text-white">
                  Cogent Marketing Shield
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {COMPARISON_ROWS.map((row: ComparisonRow) => (
                <tr key={row.criterion} className="align-top">
                  <td className="px-6 py-4 text-[13.5px] font-semibold text-zinc-950">
                    {row.criterion}
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge
                      status={row.manualCounsel.status}
                      text={row.manualCounsel.text}
                    />
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge
                      status={row.genericAi.status}
                      text={row.genericAi.text}
                    />
                  </td>
                  <td className="px-6 py-4 bg-emerald-50/35">
                    <StatusBadge
                      status={row.cogent.status}
                      text={row.cogent.text}
                      highlight
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card Stack */}
        <div className="mt-10 space-y-4 md:hidden">
          {COMPARISON_ROWS.map((row) => (
            <div
              key={row.criterion}
              className="rounded-xl border border-zinc-200 bg-white p-4 space-y-3"
            >
              <h3 className="text-[14px] font-semibold text-zinc-950">
                {row.criterion}
              </h3>
              <div className="space-y-2 border-t border-zinc-100 pt-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-400 mb-1">
                    Cogent Marketing Shield
                  </p>
                  <StatusBadge
                    status={row.cogent.status}
                    text={row.cogent.text}
                    highlight
                  />
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-400 mb-1">
                    External Legal Retainer
                  </p>
                  <StatusBadge
                    status={row.manualCounsel.status}
                    text={row.manualCounsel.text}
                  />
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-400 mb-1">
                    Generic AI Chatbots
                  </p>
                  <StatusBadge
                    status={row.genericAi.status}
                    text={row.genericAi.text}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
