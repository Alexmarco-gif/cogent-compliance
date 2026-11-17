import React from "react";
import Link from "next/link";
import { CogentLogo } from "@/components/brand/CogentLogo";

export function MarketingFooter() {
  return (
    <footer className="border-t border-white/10 bg-black text-white">
      <div className="mx-auto max-w-[1200px] px-5 py-16 sm:px-8 lg:py-24">
        {/* Top Centered Statement matching footer.JPG */}
        <div className="mx-auto max-w-3xl text-center mb-16 sm:mb-20">
          <h2 className="text-[34px] sm:text-[48px] font-semibold leading-[1.08] tracking-[-0.035em] text-white">
            Transforming compliance <br />
            <span className="text-slate-400">with AI</span>
          </h2>
        </div>

        {/* 4-Column Grid matching footer.JPG */}
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8 pb-14 border-b border-white/10">
          {/* Column 1: Certifications & Brand Info */}
          <div className="lg:col-span-4 space-y-6">
            {/* 3 Circular Badges from footer.JPG */}
            <div className="flex items-center gap-2.5">
              <div className="flex h-12 w-12 flex-col items-center justify-center rounded-full border border-dashed border-white/40 text-center font-mono text-[8px] uppercase tracking-tighter text-slate-300 leading-tight">
                <span>CBN</span>
                <span className="text-[7.5px] text-blue-400">141+</span>
              </div>
              <div className="flex h-12 w-12 flex-col items-center justify-center rounded-full border border-dashed border-white/40 text-center font-mono text-[8px] uppercase tracking-tighter text-slate-300 leading-tight">
                <span>NDPA</span>
                <span className="text-[7.5px] text-blue-400">2023</span>
              </div>
              <div className="flex h-12 w-12 flex-col items-center justify-center rounded-full border border-dashed border-white/40 text-center font-mono text-[8px] uppercase tracking-tighter text-slate-300 leading-tight">
                <span>AES</span>
                <span className="text-[7.5px] text-blue-400">256-BIT</span>
              </div>
            </div>

            {/* Wordmark */}
            <div>
              <Link href="/" className="inline-block focus:outline-none">
                <CogentLogo
                  variant="blue"
                  size="md"
                  wordmarkColor="white"
                  subtitle="by Stem Systems"
                />
              </Link>
              <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-slate-400">
                The AI compliance layer for financial institutions in Nigeria and Africa.
              </p>
            </div>
          </div>

          {/* Column 2: Company */}
          <div className="lg:col-span-3 lg:pl-6 space-y-3.5">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-white">
              Company
            </p>
            <ul className="space-y-2.5 text-[13.5px] text-slate-400">
              <li>
                <Link href="/company" className="hover:text-white transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/solutions" className="hover:text-white transition-colors">
                  Solutions
                </Link>
              </li>
              <li>
                <Link href="/resources" className="hover:text-white transition-colors">
                  Resources &amp; Hub
                </Link>
              </li>
              <li>
                <Link href="/resources#articles" className="hover:text-white transition-colors">
                  Blogs &amp; Circulars
                </Link>
              </li>
              <li>
                <Link href="/resources/faq" className="hover:text-white transition-colors">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/company" className="hover:text-white transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Legal */}
          <div className="lg:col-span-3 space-y-3.5">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-white">
              Legal
            </p>
            <ul className="space-y-2.5 text-[13.5px] text-slate-400">
              <li>
                <Link href="/legal" className="hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/legal" className="hover:text-white transition-colors">
                  Terms of Use
                </Link>
              </li>
              <li>
                <Link href="/legal" className="hover:text-white transition-colors">
                  Cookie Policy
                </Link>
              </li>
              <li>
                <Link href="/legal" className="hover:text-white transition-colors">
                  DPA (Data Processing)
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Locations */}
          <div className="lg:col-span-2 space-y-3.5">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-white">
              Locations
            </p>
            <ul className="space-y-2 text-[13px] text-slate-400">
              <li className="font-medium text-slate-300">Lagos, Nigeria</li>
              <li className="font-medium text-slate-300">Abuja, Nigeria</li>
              <li className="font-medium text-slate-300">Nairobi, Kenya</li>
              <li className="pt-2 font-mono text-[11px] text-blue-400">
                Pan-African Scope
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Social Links */}
        <div className="mt-8 flex flex-col gap-4 text-[12px] text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; Copyright {new Date().getFullYear()} | Stem Systems Inc · Cogent
          </p>

          <div className="flex items-center gap-4 text-slate-400">
            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noreferrer"
              aria-label="LinkedIn"
              className="hover:text-white transition-colors"
            >
              <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
              </svg>
            </a>
            <a
              href="https://x.com"
              target="_blank"
              rel="noreferrer"
              aria-label="X (Twitter)"
              className="hover:text-white transition-colors"
            >
              <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
