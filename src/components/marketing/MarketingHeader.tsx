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
  ShieldCheck,
  Calculator,
  ScanEye,
  Activity,
  Landmark,
  Smartphone,
  Wallet,
  LineChart,
} from "lucide-react";
import { CogentLogo } from "@/components/brand/CogentLogo";

type MenuKey = "platform" | "solutions" | null;

const PLATFORM_LINKS = [
  {
    href: "/platform#grounding",
    title: "Three-Source Statutory Grounding",
    description: "Golden 50 vault, tenant playbooks & live .gov.ng search.",
    icon: ShieldCheck,
  },
  {
    href: "/platform#deterministic-locks",
    title: "Deterministic Locks & APR Engine",
    description: "Mechanical checks & true IRR/APR math outside the LLM.",
    icon: Calculator,
  },
  {
    href: "/platform#forensics",
    title: "Flyer OCR & App Store Forensics",
    description: "Fine-print ratios, ARCON ASP IDs & <60-day Play Store checks.",
    icon: ScanEye,
  },
  {
    href: "/platform#governance",
    title: "2-Year Dossiers & URL Drift Sentinels",
    description: "Dual-control CCO sign-off, SHA-256 PDFs & live monitoring.",
    icon: Activity,
  },
];

const SOLUTIONS_LINKS = [
  {
    href: "/solutions#digital-lenders",
    title: "Digital Lenders",
    tag: "FCCPC DEON · Play Store",
    description: "Drip-pricing APR checks & 60-day minimum tenor guardrails.",
    icon: Smartphone,
  },
  {
    href: "/solutions#banking",
    title: "MFBs & Commercial Banks",
    tag: "CBN CPF · BOFIA · ARCON",
    description: "NDIC deposit qualifiers, flyer ratios & CCO approval chains.",
    icon: Landmark,
  },
  {
    href: "/solutions#payments",
    title: "PSBs & Mobile Money",
    tag: "CBN PSB · MMO · NDPA",
    description: "License-boundary locks & live landing-page drift alerts.",
    icon: Wallet,
  },
  {
    href: "/solutions#wealthtech",
    title: "WealthTech & VASPs",
    tag: "SEC ISA · Rule 102",
    description: "Prohibited yield guarantees & risk-disclosure enforcement.",
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
        scrolled || openMenu
          ? "border-b border-zinc-200 bg-white/95 backdrop-blur-md"
          : "border-b border-zinc-200/70 bg-white/85 backdrop-blur-md"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-5 sm:px-8">
        {/* Brand Wordmark */}
        <Link href="/" className="shrink-0 focus:outline-none">
          <CogentLogo variant="blue" size="md" subtitle="Marketing Shield" />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-1" aria-label="Main navigation">
          {/* Platform Mega-Dropdown Trigger */}
          <div
            className="relative"
            onMouseEnter={() => handleTriggerHover("platform")}
            onMouseLeave={scheduleClose}
          >
            <button
              type="button"
              onClick={() => setOpenMenu((prev) => (prev === "platform" ? null : "platform"))}
              aria-expanded={openMenu === "platform"}
              className={`inline-flex items-center gap-1 rounded-lg px-3.5 py-2 text-[13.5px] font-medium transition-colors cursor-pointer ${
                pathname.startsWith("/platform") || openMenu === "platform"
                  ? "bg-zinc-100 text-zinc-950"
                  : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950"
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
                className="absolute left-0 top-full pt-2.5 w-[620px]"
                onMouseEnter={cancelClose}
                onMouseLeave={scheduleClose}
              >
                <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xl shadow-zinc-950/5 grid grid-cols-12 gap-4">
                  <div className="col-span-7 space-y-1">
                    {PLATFORM_LINKS.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="group flex items-start gap-3 rounded-xl p-2.5 hover:bg-zinc-50 transition-colors"
                        >
                          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-700 group-hover:border-zinc-300 group-hover:bg-white group-hover:text-zinc-950">
                            <Icon className="h-4 w-4" strokeWidth={1.7} />
                          </div>
                          <div>
                            <p className="text-[13px] font-semibold text-zinc-950">
                              {item.title}
                            </p>
                            <p className="mt-0.5 text-[12px] leading-snug text-zinc-500">
                              {item.description}
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>

                  {/* Right Live Architecture Card */}
                  <div className="col-span-5 flex flex-col justify-between rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-zinc-500">
                        Pre-Flight Gate
                      </p>
                      <div className="mt-2.5 rounded-lg border border-zinc-200 bg-white p-3 space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span className="text-zinc-600">Lock 1 · Terms</span>
                          <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700 font-semibold">
                            PASS
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span className="text-zinc-600">Lock 2 · Rate Card</span>
                          <span className="rounded bg-rose-50 px-1.5 py-0.5 text-rose-700 font-semibold">
                            FAIL
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span className="text-zinc-600">Lock 3 · Disclosures</span>
                          <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700 font-semibold">
                            PASS
                          </span>
                        </div>
                      </div>
                    </div>

                    <Link
                      href="/platform"
                      className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-zinc-950 hover:text-[#2A4BFF] transition-colors"
                    >
                      <span>Explore Platform Architecture</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Solutions Mega-Dropdown Trigger */}
          <div
            className="relative"
            onMouseEnter={() => handleTriggerHover("solutions")}
            onMouseLeave={scheduleClose}
          >
            <button
              type="button"
              onClick={() => setOpenMenu((prev) => (prev === "solutions" ? null : "solutions"))}
              aria-expanded={openMenu === "solutions"}
              className={`inline-flex items-center gap-1 rounded-lg px-3.5 py-2 text-[13.5px] font-medium transition-colors cursor-pointer ${
                pathname.startsWith("/solutions") || openMenu === "solutions"
                  ? "bg-zinc-100 text-zinc-950"
                  : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950"
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
                className="absolute left-0 top-full pt-2.5 w-[580px]"
                onMouseEnter={cancelClose}
                onMouseLeave={scheduleClose}
              >
                <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xl shadow-zinc-950/5">
                  <div className="grid grid-cols-2 gap-2.5">
                    {SOLUTIONS_LINKS.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="group rounded-xl border border-zinc-100 bg-zinc-50/70 p-3.5 hover:border-zinc-200 hover:bg-white transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <Icon
                              className="h-4 w-4 text-zinc-700 group-hover:text-[#2A4BFF]"
                              strokeWidth={1.7}
                            />
                            <span className="font-mono text-[10px] text-zinc-500">
                              {item.tag}
                            </span>
                          </div>
                          <p className="mt-2.5 text-[13px] font-semibold text-zinc-950">
                            {item.title}
                          </p>
                          <p className="mt-1 text-[12px] leading-snug text-zinc-500">
                            {item.description}
                          </p>
                        </Link>
                      );
                    })}
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-3 px-1">
                    <span className="text-[12px] text-zinc-500">
                      Covers 10 CBN, FCCPC &amp; SEC license classifications
                    </span>
                    <Link
                      href="/solutions"
                      className="inline-flex items-center gap-1 text-[12px] font-semibold text-zinc-950 hover:text-[#2A4BFF]"
                    >
                      <span>View all solutions</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Link
            href="/regulatory-vault"
            className={`rounded-lg px-3.5 py-2 text-[13.5px] font-medium transition-colors ${
              pathname.startsWith("/regulatory-vault")
                ? "bg-zinc-100 text-zinc-950"
                : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950"
            }`}
          >
            Statutory Vault
          </Link>

          <Link
            href="/pricing"
            className={`rounded-lg px-3.5 py-2 text-[13.5px] font-medium transition-colors ${
              pathname.startsWith("/pricing")
                ? "bg-zinc-100 text-zinc-950"
                : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950"
            }`}
          >
            Pricing
          </Link>

          <Link
            href="/company"
            className={`rounded-lg px-3.5 py-2 text-[13.5px] font-medium transition-colors ${
              pathname.startsWith("/company")
                ? "bg-zinc-100 text-zinc-950"
                : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950"
            }`}
          >
            Company
          </Link>

          <Link
            href="/resources/faq"
            className={`rounded-lg px-3.5 py-2 text-[13.5px] font-medium transition-colors ${
              pathname.startsWith("/resources")
                ? "bg-zinc-100 text-zinc-950"
                : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950"
            }`}
          >
            FAQ
          </Link>
        </nav>

        {/* Right Conversion CTAs */}
        <div className="hidden lg:flex items-center gap-2.5">
          {isLoaded && isSignedIn ? (
            <Link
              href="/chat"
              className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-950 px-4 py-2 text-[13px] font-medium text-white hover:bg-zinc-800 transition-colors"
            >
              <span>Open Workspace</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <>
              <Link
                href="/sign-in"
                className="rounded-lg px-3.5 py-2 text-[13px] font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-950 px-4 py-2 text-[13px] font-medium text-white hover:bg-zinc-800 transition-colors"
              >
                <span>Start 7-Day Evaluation</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-800 lg:hidden cursor-pointer"
        >
          {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="border-t border-zinc-200 bg-white px-5 py-5 lg:hidden max-h-[calc(100vh-4rem)] overflow-y-auto">
          <div className="space-y-4">
            <div>
              <p className="font-mono text-[10.5px] uppercase tracking-wider text-zinc-400">
                Platform
              </p>
              <div className="mt-2 space-y-1">
                {PLATFORM_LINKS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block rounded-lg px-3 py-2 text-[14px] font-medium text-zinc-800 hover:bg-zinc-50"
                  >
                    {item.title}
                  </Link>
                ))}
              </div>
            </div>

            <div className="border-t border-zinc-100 pt-4">
              <p className="font-mono text-[10.5px] uppercase tracking-wider text-zinc-400">
                Solutions
              </p>
              <div className="mt-2 grid grid-cols-1 gap-1">
                {SOLUTIONS_LINKS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center justify-between rounded-lg px-3 py-2 text-[14px] font-medium text-zinc-800 hover:bg-zinc-50"
                  >
                    <span>{item.title}</span>
                    <span className="font-mono text-[10.5px] text-zinc-400">{item.tag}</span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="border-t border-zinc-100 pt-4 space-y-1">
              <Link
                href="/regulatory-vault"
                className="block rounded-lg px-3 py-2 text-[14px] font-medium text-zinc-800 hover:bg-zinc-50"
              >
                Statutory Vault
              </Link>
              <Link
                href="/pricing"
                className="block rounded-lg px-3 py-2 text-[14px] font-medium text-zinc-800 hover:bg-zinc-50"
              >
                Pricing
              </Link>
              <Link
                href="/company"
                className="block rounded-lg px-3 py-2 text-[14px] font-medium text-zinc-800 hover:bg-zinc-50"
              >
                Company &amp; Leadership
              </Link>
              <Link
                href="/resources/faq"
                className="block rounded-lg px-3 py-2 text-[14px] font-medium text-zinc-800 hover:bg-zinc-50"
              >
                Compliance FAQ
              </Link>
            </div>

            <div className="border-t border-zinc-200 pt-4 flex flex-col gap-2.5">
              {isLoaded && isSignedIn ? (
                <Link
                  href="/chat"
                  className="flex h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-zinc-950 text-[14px] font-medium text-white"
                >
                  <span>Open Workspace</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : (
                <>
                  <Link
                    href="/sign-up"
                    className="flex h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-zinc-950 text-[14px] font-medium text-white"
                  >
                    <span>Start 7-Day Evaluation</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/sign-in"
                    className="flex h-11 w-full items-center justify-center rounded-lg border border-zinc-200 bg-white text-[14px] font-medium text-zinc-800"
                  >
                    Sign in to Workspace
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
