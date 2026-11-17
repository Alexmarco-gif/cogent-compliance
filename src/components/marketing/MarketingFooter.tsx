import React from "react";
import Link from "next/link";
import { CogentLogo } from "@/components/brand/CogentLogo";

const REGULATOR_ACRONYMS = ["CBN", "NDPC", "FCCPC", "SEC", "NFIU", "NDIC", "ARCON"];

export function MarketingFooter() {
  return (
    <footer className="border-t border-slate-200 bg-[#FAFBFD] text-slate-600">
      <div className="mx-auto max-w-[1200px] px-5 py-14 sm:px-8 lg:py-16">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
          {/* Brand Column */}
          <div className="md:col-span-4 space-y-4">
            <Link href="/" className="inline-block">
              <CogentLogo variant="blue" size="md" subtitle="by Stem Systems" />
            </Link>
            <p className="max-w-xs text-[13.5px] leading-relaxed text-slate-600">
              Regulatory intelligence and compliance workflow engine for Nigerian and African banks, lenders, and fintechs.
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {REGULATOR_ACRONYMS.map((reg) => (
                <span
                  key={reg}
                  className="rounded border border-slate-200 bg-white px-2 py-0.5 font-mono text-[10.5px] font-semibold text-slate-700"
                >
                  {reg}
                </span>
              ))}
            </div>
          </div>

          {/* Link Columns */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:col-span-8">
            <div>
              <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[#0B1220]">
                Resources
              </p>
              <ul className="mt-3.5 space-y-2.5 text-[13.5px]">
                <li>
                  <Link href="/resources" className="hover:text-[#1D4ED8] transition-colors">
                    Resources &amp; Hub
                  </Link>
                </li>
                <li>
                  <Link href="/resources#articles" className="hover:text-[#1D4ED8] transition-colors">
                    Regulatory Articles &amp; Blogs
                  </Link>
                </li>
                <li>
                  <Link href="/resources#briefs" className="hover:text-[#1D4ED8] transition-colors">
                    Statutory PDF Memos
                  </Link>
                </li>
                <li>
                  <Link href="/resources#data" className="hover:text-[#1D4ED8] transition-colors">
                    Market &amp; License Data
                  </Link>
                </li>
                <li>
                  <Link href="/resources#videos" className="hover:text-[#1D4ED8] transition-colors">
                    Video Walkthroughs
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[#0B1220]">
                Solutions
              </p>
              <ul className="mt-3.5 space-y-2.5 text-[13.5px]">
                <li>
                  <Link href="/solutions#digital-lenders" className="hover:text-[#1D4ED8] transition-colors">
                    Digital Lenders &amp; Credit
                  </Link>
                </li>
                <li>
                  <Link href="/solutions#banking" className="hover:text-[#1D4ED8] transition-colors">
                    MFBs &amp; Commercial Banks
                  </Link>
                </li>
                <li>
                  <Link href="/solutions#payments" className="hover:text-[#1D4ED8] transition-colors">
                    PSBs, MMOs &amp; PSSPs
                  </Link>
                </li>
                <li>
                  <Link href="/solutions#wealthtech" className="hover:text-[#1D4ED8] transition-colors">
                    WealthTech &amp; SEC
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[#0B1220]">
                Company
              </p>
              <ul className="mt-3.5 space-y-2.5 text-[13.5px]">
                <li>
                  <Link href="/company" className="hover:text-[#1D4ED8] transition-colors">
                    About &amp; Co-Founders
                  </Link>
                </li>
                <li>
                  <Link href="/resources/faq" className="hover:text-[#1D4ED8] transition-colors">
                    Common Questions (FAQ)
                  </Link>
                </li>
                <li>
                  <Link href="/sign-up" className="hover:text-[#1D4ED8] transition-colors">
                    Create Free Account
                  </Link>
                </li>
                <li>
                  <Link href="/sign-in" className="hover:text-[#1D4ED8] transition-colors">
                    Workspace Login
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-slate-200 pt-6 text-[12px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; {new Date().getFullYear()} Stem Systems · Cogent. Decision-support software for Nigerian and African regulated financial teams.
          </p>
          <p className="font-mono text-[11px] text-slate-400">
            Lagos · Abuja · Pan-African Regulatory Scope
          </p>
        </div>
      </div>
    </footer>
  );
}
