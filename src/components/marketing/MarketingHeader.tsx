"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import {
  ChevronDown,
  Menu,
  X,
  ArrowRight,
  FileText,
  Scale,
  ClipboardCheck,
  Globe,
  ShieldCheck,
  Smartphone,
  Landmark,
  Wallet,
  LineChart,
} from "lucide-react";
import { CogentLogo } from "@/components/brand/CogentLogo";

type MenuKey = "platform" | "solutions" | null;

const PLATFORM_LINKS = [
  {
    href: "/platform#structuring",
    title: "Product & Regulatory Research",
    description: "CBN, NDPC & FCCPC structuring memos in minutes.",
    icon: FileText,
  },
  {
    href: "/platform#policy-updates",
    title: "AML & SOP Policy Drafting",
    description: "Compare new circulars directly against your internal manuals.",
    icon: Scale,
  },
  {
    href: "/platform#audit-responses",
    title: "Regulator & Sponsor-Bank Replies",
    description: "Answer 40-question audit queries with verified citations.",
    icon: ClipboardCheck,
  },
  {
    href: "/platform#dual-search",
    title: "NG & Africa Live Web Search",
    description: "Real-time .gov.ng PDF circulars & pan-African central banks.",
    icon: Globe,
  },
  {
    href: "/platform#launch-clearance",
    title: "Marketing & Webpage Clearance",
    description: "Check loan flyers, rate cards & live pages pre-launch.",
    icon: ShieldCheck,
  },
];

const SOLUTIONS_LINKS = [
  {
    href: "/solutions#digital-lenders",
    title: "Digital Lenders & Credit",
    tag: "FCCPC · CBN · Play Policy",
    description: "BNPL structuring, credit SOP updates & promo clearance.",
    icon: Smartphone,
  },
  {
    href: "/solutions#banking",
    title: "MFBs & Commercial Banks",
    tag: "CBN · NFIU · BOFIA",
    description: "Manual updates, CBN exam replies & branch approvals.",
    icon: Landmark,
  },
  {
    href: "/solutions#payments",
    title: "PSBs, MMOs & PSSPs",
    tag: "CBN · CBK · BoG",
    description: "Sponsor-bank audits & cross-border expansion matrices.",
    icon: Wallet,
  },
  {
    href: "/solutions#wealthtech",
    title: "WealthTech & SEC",
    tag: "SEC ISA · VASPs",
    description: "Track live SEC circulars & safeguard product disclosures.",
    icon: LineChart,
  },
];

export function MarketingHeader() {
  const pathname = usePathname();
  const { isLoaded, isSignedIn } = useAuth();
  const [openMenu, setOpenMenu] = useState<MenuKey>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpenMenu(null);
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenMenu(null);
        setMobileOpen(false);
      }
    };
    const onMouseDown = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onMouseDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onMouseDown);
    };
  }, []);

  const cancelClose = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  const scheduleClose = () => {
    cancelClose();
    closeTimeoutRef.current = setTimeout(() => {
      setOpenMenu(null);
    }, 130);
  };

  const handleTriggerHover = (key: MenuKey) => {
    cancelClose();
    setOpenMenu(key);
  };

  return (
    <header
      ref={headerRef}
      className={`sticky top-0 z-50 w-full transition-colors duration-200 ${
        scrolled || openMenu || mobileOpen
          ? "border-b border-slate-200 bg-white/95 backdrop-blur-md"
          : "border-b border-slate-200/75 bg-white/90 backdrop-blur-md"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-5 sm:px-8">
        {/* Brand Wordmark */}
        <Link href="/" className="shrink-0 focus:outline-none">
          <CogentLogo variant="blue" size="md" subtitle="by Stem Systems" />
        </Link>

        {/* Clean Institutional Navigation */}
        <nav className="hidden lg:flex items-center gap-1" aria-label="Main navigation">
          {/* Platform Dropdown */}
          <div
            className="relative"
            onMouseEnter={() => handleTriggerHover("platform")}
            onMouseLeave={scheduleClose}
          >
            <button
              type="button"
              onClick={() => setOpenMenu((prev) => (prev === "platform" ? null : "platform"))}
              aria-expanded={openMenu === "platform"}
              className={`inline-flex items-center gap-1 rounded-md px-3.5 py-2 text-[13.5px] font-medium transition-colors cursor-pointer ${
                pathname.startsWith("/platform") || openMenu === "platform"
                  ? "bg-slate-100 text-[#0B1220]"
                  : "text-slate-600 hover:bg-slate-50 hover:text-[#0B1220]"
              }`}
            >
              <span>Platform</span>
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform duration-150 ${
                  openMenu === "platform" ? "rotate-180" : ""
                }`}
              />
            </button>

            {openMenu === "platform" && (
              <div
                className="absolute left-0 top-full pt-2 w-[540px]"
                onMouseEnter={cancelClose}
                onMouseLeave={scheduleClose}
              >
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xl shadow-slate-950/8">
                  <div className="grid grid-cols-1 gap-1">
                    {PLATFORM_LINKS.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="group flex items-start gap-3 rounded-lg p-2.5 hover:bg-slate-50 transition-colors"
                        >
                          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 group-hover:border-[#1D4ED8]/30 group-hover:text-[#1D4ED8]">
                            <Icon className="h-4 w-4" strokeWidth={1.7} />
                          </div>
                          <div>
                            <p className="text-[13px] font-semibold text-[#0B1220]">
                              {item.title}
                            </p>
                            <p className="mt-0.5 text-[12px] leading-snug text-slate-500">
                              {item.description}
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                  <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2.5 px-2">
                    <span className="text-[11.5px] text-slate-500">
                      5-day compliance work compressed to minutes
                    </span>
                    <Link
                      href="/platform"
                      className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#1D4ED8] hover:underline"
                    >
                      <span>Explore Platform</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Solutions Dropdown */}
          <div
            className="relative"
            onMouseEnter={() => handleTriggerHover("solutions")}
            onMouseLeave={scheduleClose}
          >
            <button
              type="button"
              onClick={() => setOpenMenu((prev) => (prev === "solutions" ? null : "solutions"))}
              aria-expanded={openMenu === "solutions"}
              className={`inline-flex items-center gap-1 rounded-md px-3.5 py-2 text-[13.5px] font-medium transition-colors cursor-pointer ${
                pathname.startsWith("/solutions") || openMenu === "solutions"
                  ? "bg-slate-100 text-[#0B1220]"
                  : "text-slate-600 hover:bg-slate-50 hover:text-[#0B1220]"
              }`}
            >
              <span>Solutions</span>
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform duration-150 ${
                  openMenu === "solutions" ? "rotate-180" : ""
                }`}
              />
            </button>

            {openMenu === "solutions" && (
              <div
                className="absolute left-0 top-full pt-2 w-[560px]"
                onMouseEnter={cancelClose}
                onMouseLeave={scheduleClose}
              >
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xl shadow-slate-950/8">
                  <div className="grid grid-cols-2 gap-2">
                    {SOLUTIONS_LINKS.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="group rounded-lg border border-slate-100 bg-slate-50/60 p-3 hover:border-slate-300 hover:bg-white transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <Icon
                              className="h-4 w-4 text-slate-600 group-hover:text-[#1D4ED8]"
                              strokeWidth={1.7}
                            />
                            <span className="font-mono text-[10px] text-slate-400">
                              {item.tag}
                            </span>
                          </div>
                          <p className="mt-2 text-[13px] font-semibold text-[#0B1220]">
                            {item.title}
                          </p>
                          <p className="mt-0.5 text-[11.5px] leading-snug text-slate-500">
                            {item.description}
                          </p>
                        </Link>
                      );
                    })}
                  </div>
                  <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2.5 px-1.5">
                    <span className="text-[11.5px] text-slate-500">
                      Calibrated for Nigerian &amp; African financial licenses
                    </span>
                    <Link
                      href="/solutions"
                      className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#1D4ED8] hover:underline"
                    >
                      <span>View Solutions</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Link
            href="/company"
            className={`rounded-md px-3.5 py-2 text-[13.5px] font-medium transition-colors ${
              pathname.startsWith("/company")
                ? "bg-slate-100 text-[#0B1220]"
                : "text-slate-600 hover:bg-slate-50 hover:text-[#0B1220]"
            }`}
          >
            Company
          </Link>

          <Link
            href="/resources/faq"
            className={`rounded-md px-3.5 py-2 text-[13.5px] font-medium transition-colors ${
              pathname.startsWith("/resources")
                ? "bg-slate-100 text-[#0B1220]"
                : "text-slate-600 hover:bg-slate-50 hover:text-[#0B1220]"
            }`}
          >
            FAQ
          </Link>
        </nav>

        {/* Right Actions */}
        <div className="hidden lg:flex items-center gap-2.5">
          {isLoaded && isSignedIn ? (
            <Link
              href="/chat"
              className="inline-flex items-center gap-1.5 rounded-md bg-[#0B1220] px-4 py-2 text-[13px] font-medium text-white hover:bg-slate-800 transition-colors"
            >
              <span>Open Workspace</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <>
              <Link
                href="/sign-in"
                className="rounded-md px-3.5 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="inline-flex items-center gap-1.5 rounded-md bg-[#1D4ED8] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#1E40AF] transition-colors"
              >
                <span>Create Account</span>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Toggle */}
        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-800 lg:hidden cursor-pointer"
        >
          {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="border-t border-slate-200 bg-white px-5 py-5 lg:hidden max-h-[calc(100vh-4rem)] overflow-y-auto">
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="font-mono text-[10.5px] uppercase tracking-wider text-slate-400">
                Platform
              </p>
              {PLATFORM_LINKS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block rounded-md px-2.5 py-2 text-[14px] font-medium text-slate-800 hover:bg-slate-50"
                >
                  {item.title}
                </Link>
              ))}
            </div>

            <div className="border-t border-slate-100 pt-3 space-y-1">
              <p className="font-mono text-[10.5px] uppercase tracking-wider text-slate-400">
                Solutions
              </p>
              {SOLUTIONS_LINKS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center justify-between rounded-md px-2.5 py-2 text-[14px] font-medium text-slate-800 hover:bg-slate-50"
                >
                  <span>{item.title}</span>
                  <span className="font-mono text-[10.5px] text-slate-400">{item.tag}</span>
                </Link>
              ))}
            </div>

            <div className="border-t border-slate-100 pt-3 space-y-1">
              <Link
                href="/company"
                className="block rounded-md px-2.5 py-2 text-[14px] font-medium text-slate-800 hover:bg-slate-50"
              >
                Company &amp; Founders
              </Link>
              <Link
                href="/resources/faq"
                className="block rounded-md px-2.5 py-2 text-[14px] font-medium text-slate-800 hover:bg-slate-50"
              >
                FAQ
              </Link>
            </div>

            <div className="border-t border-slate-200 pt-4 flex flex-col gap-2">
              {isLoaded && isSignedIn ? (
                <Link
                  href="/chat"
                  className="flex h-10 w-full items-center justify-center gap-1.5 rounded-md bg-[#0B1220] text-[14px] font-medium text-white"
                >
                  <span>Open Workspace</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : (
                <>
                  <Link
                    href="/sign-up"
                    className="flex h-10 w-full items-center justify-center rounded-md bg-[#1D4ED8] text-[14px] font-medium text-white"
                  >
                    Create Account
                  </Link>
                  <Link
                    href="/sign-in"
                    className="flex h-10 w-full items-center justify-center rounded-md border border-slate-200 text-[14px] font-medium text-slate-700"
                  >
                    Sign in
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
