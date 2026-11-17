import React from "react";
import Link from "next/link";
import { CogentLogo } from "@/components/brand/CogentLogo";

export function MarketingFooter() {
  return (
    <footer className="border-t border-slate-200/80 bg-[#F8FAFF] text-slate-600">
      <div className="mx-auto max-w-[1160px] px-5 py-14 sm:px-8 lg:py-16">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
          {/* Brand Column */}
          <div className="md:col-span-4 space-y-4">
            <Link href="/" className="inline-block">
              <CogentLogo variant="blue" size="md" subtitle="by Stem Systems" />
            </Link>
            <p className="max-w-xs text-[13.5px] leading-relaxed text-slate-600">
              Helping Nigerian banks, lenders, and fintech teams launch every campaign clear of compliance surprises.
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {["CBN", "FCCPC", "ARCON", "NDPC", "SEC"].map((reg) => (
                <span
                  key={reg}
                  className="rounded-lg border border-blue-100 bg-white px-2.5 py-0.5 text-[11px] font-semibold text-slate-700"
                >
                  {reg}
                </span>
              ))}
            </div>
          </div>

          {/* Link Columns (Clean active pages only) */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:col-span-8">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-slate-950">
                Platform
              </p>
              <ul className="mt-3.5 space-y-2.5 text-[13.5px]">
                <li>
                  <Link href="/platform#pre-check" className="hover:text-[#1D63ED] transition-colors">
                    Flyer &amp; Ad Pre-Checks
                  </Link>
                </li>
                <li>
                  <Link href="/platform#rate-match" className="hover:text-[#1D63ED] transition-colors">
                    Rate &amp; Fee Verification
                  </Link>
                </li>
                <li>
                  <Link href="/platform#page-watcher" className="hover:text-[#1D63ED] transition-colors">
                    Live Page Monitoring
                  </Link>
                </li>
                <li>
                  <Link href="/platform#signoff" className="hover:text-[#1D63ED] transition-colors">
                    Team &amp; CCO Sign-Off
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-slate-950">
                Solutions
              </p>
              <ul className="mt-3.5 space-y-2.5 text-[13.5px]">
                <li>
                  <Link href="/solutions#digital-lenders" className="hover:text-[#1D63ED] transition-colors">
                    Digital Lenders
                  </Link>
                </li>
                <li>
                  <Link href="/solutions#banking" className="hover:text-[#1D63ED] transition-colors">
                    MFBs &amp; Commercial Banks
                  </Link>
                </li>
                <li>
                  <Link href="/solutions#payments" className="hover:text-[#1D63ED] transition-colors">
                    PSBs &amp; Mobile Money
                  </Link>
                </li>
                <li>
                  <Link href="/solutions#wealthtech" className="hover:text-[#1D63ED] transition-colors">
                    WealthTech &amp; SEC
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-slate-950">
                Company
              </p>
              <ul className="mt-3.5 space-y-2.5 text-[13.5px]">
                <li>
                  <Link href="/company" className="hover:text-[#1D63ED] transition-colors">
                    About &amp; Co-Founders
                  </Link>
                </li>
                <li>
                  <Link href="/resources/faq" className="hover:text-[#1D63ED] transition-colors">
                    Common Questions (FAQ)
                  </Link>
                </li>
                <li>
                  <Link href="/sign-up" className="hover:text-[#1D63ED] transition-colors">
                    Create Free Account
                  </Link>
                </li>
                <li>
                  <Link href="/sign-in" className="hover:text-[#1D63ED] transition-colors">
                    Workspace Login
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-slate-200/80 pt-6 text-[12px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; {new Date().getFullYear()} Stem Systems · Cogent. Decision-support software for Nigerian regulated financial teams.
          </p>
          <p className="text-[11.5px] text-slate-400">
            Built for Lagos &amp; Abuja regulated institutions
          </p>
        </div>
      </div>
    </footer>
  );
}
