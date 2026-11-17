"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { RevealOnScroll } from "@/components/marketing/RevealOnScroll";

export function ExecutiveCtaBanner() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "success">("idle");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) return;
    setStatus("success");
  };

  return (
    <section className="border-t border-slate-200 bg-[#FAFBFD] py-20 lg:py-28">
      <div className="mx-auto max-w-[760px] px-5 sm:px-8 text-center">
        <RevealOnScroll>
          <div>
            <h2 className="text-[36px] sm:text-[46px] font-semibold leading-[1.08] tracking-[-0.03em] text-[#0B1220]">
              Subscribe for updates
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[16px] sm:text-[17.5px] leading-relaxed text-slate-600">
              Get insightful regulatory intelligence delivered direct to your inbox. Curated circular teardowns, statutory structuring memos, and market benchmarks—no unnecessary emails.
            </p>

            {status === "success" ? (
              <div className="mx-auto mt-8 max-w-md rounded-xl border border-emerald-200 bg-emerald-50/80 p-5 text-center animate-cogent-enter">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <p className="mt-3 text-[15px] font-semibold text-emerald-900">
                  You are subscribed.
                </p>
                <p className="mt-1 text-[13px] text-emerald-800">
                  We will send our latest Nigerian and African regulatory briefs straight to <span className="font-semibold">{email}</span>.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mx-auto mt-8 max-w-md space-y-3.5">
                <div>
                  <label htmlFor="cta-email" className="sr-only">
                    Email Address
                  </label>
                  <input
                    id="cta-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email Address"
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-[15px] text-[#0B1220] placeholder-slate-400 shadow-2xs focus:border-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20 transition-all"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full rounded-lg bg-[#4F1999] hover:bg-[#3F137A] sm:bg-[#1D4ED8] sm:hover:bg-[#1E40AF] px-6 py-3.5 text-[15px] font-semibold text-white shadow-sm transition-colors cursor-pointer"
                >
                  Subscribe
                </button>

                <p className="pt-2 text-[12px] leading-relaxed text-slate-500">
                  By subscribing, you consent to the use of your data in line with our{" "}
                  <Link href="/legal" className="text-slate-700 underline hover:text-[#0B1220]">
                    Privacy Policy
                  </Link>
                  , and you may access or delete it anytime.
                </p>
              </form>
            )}

            {/* Alternative Direct Workspace Action */}
            <div className="mt-8 pt-6 border-t border-slate-200/60 flex items-center justify-center gap-2 text-[13px] text-slate-500">
              <span>Ready to test Cogent immediately?</span>
              <Link
                href="/sign-up"
                className="inline-flex items-center gap-1 font-semibold text-[#1D4ED8] hover:underline"
              >
                <span>Create Free Workspace</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}
