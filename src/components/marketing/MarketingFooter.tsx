import React from "react";
import Link from "next/link";
import { CogentLogo } from "@/components/brand/CogentLogo";

export function MarketingFooter() {
  return (
    <footer className="border-t border-zinc-200 bg-zinc-50 text-zinc-600">
      <div className="mx-auto max-w-[1200px] px-5 py-14 sm:px-8 lg:py-16">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
          {/* Brand Column */}
          <div className="md:col-span-4 space-y-4">
            <Link href="/" className="inline-block">
              <CogentLogo variant="blue" size="md" subtitle="Marketing Shield" />
            </Link>
            <p className="max-w-xs text-[13.5px] leading-relaxed text-zinc-600">
              Supervisory compliance and regulatory intelligence operating system for Nigerian financial institutions.
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {["CBN", "FCCPC", "ARCON", "NDPC", "SEC"].map((reg) => (
                <span
                  key={reg}
                  className="rounded border border-zinc-200 bg-white px-2 py-0.5 font-mono text-[10.5px] font-medium text-zinc-700"
                >
                  {reg}
                </span>
              ))}
            </div>
          </div>

          {/* Link Columns */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 md:col-span-8">
            <div>
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-950">
                Platform
              </p>
              <ul className="mt-3.5 space-y-2.5 text-[13px]">
                <li>
                  <Link href="/platform#grounding" className="hover:text-zinc-950 transition-colors">
                    Three-Source Grounding
                  </Link>
                </li>
                <li>
                  <Link href="/platform#deterministic-locks" className="hover:text-zinc-950 transition-colors">
                    Deterministic Locks &amp; APR
                  </Link>
                </li>
                <li>
                  <Link href="/platform#forensics" className="hover:text-zinc-950 transition-colors">
                    Flyer OCR Forensics
                  </Link>
                </li>
                <li>
                  <Link href="/platform#governance" className="hover:text-zinc-950 transition-colors">
                    2-Year Dossiers &amp; Drift
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-950">
                Solutions
              </p>
              <ul className="mt-3.5 space-y-2.5 text-[13px]">
                <li>
                  <Link href="/solutions#digital-lenders" className="hover:text-zinc-950 transition-colors">
                    Digital Lenders
                  </Link>
                </li>
                <li>
                  <Link href="/solutions#banking" className="hover:text-zinc-950 transition-colors">
                    MFBs &amp; Commercial Banks
                  </Link>
                </li>
                <li>
                  <Link href="/solutions#payments" className="hover:text-zinc-950 transition-colors">
                    PSBs &amp; Mobile Money
                  </Link>
                </li>
                <li>
                  <Link href="/solutions#wealthtech" className="hover:text-zinc-950 transition-colors">
                    WealthTech &amp; VASPs
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-950">
                Resources
              </p>
              <ul className="mt-3.5 space-y-2.5 text-[13px]">
                <li>
                  <Link href="/regulatory-vault" className="hover:text-zinc-950 transition-colors">
                    Golden 50 Statutory Vault
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="hover:text-zinc-950 transition-colors">
                    Pricing &amp; Naira Billing
                  </Link>
                </li>
                <li>
                  <Link href="/company" className="hover:text-zinc-950 transition-colors">
                    Company &amp; Leadership
                  </Link>
                </li>
                <li>
                  <Link href="/resources/faq" className="hover:text-zinc-950 transition-colors">
                    Compliance FAQ
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-950">
                Workspace
              </p>
              <ul className="mt-3.5 space-y-2.5 text-[13px]">
                <li>
                  <Link href="/sign-up" className="hover:text-zinc-950 transition-colors">
                    Start 7-Day Evaluation
                  </Link>
                </li>
                <li>
                  <Link href="/sign-in" className="hover:text-zinc-950 transition-colors">
                    Sign in
                  </Link>
                </li>
                <li>
                  <Link href="/chat" className="hover:text-zinc-950 transition-colors">
                    Compliance Console
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-zinc-200 pt-6 text-[12px] text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; {new Date().getFullYear()} Cogent Marketing Shield. Decision-support &amp; compliance workflow platform; internal legal/CCO sign-off required prior to publication.
          </p>
          <p className="font-mono text-[11px] text-zinc-400">
            Nigeria · CBN / FCCPC / ARCON / NDPC / SEC
          </p>
        </div>
      </div>
    </footer>
  );
}
