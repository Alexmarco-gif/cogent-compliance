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
  FileCheck2,
  Calculator,
  Activity,
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
    href: "/platform#pre-check",
    title: "Flyer & Ad Copy Checks",
    description: "Catch risky claims and tiny disclaimers before launch.",
    icon: FileCheck2,
  },
  {
    href: "/platform#rate-match",
    title: "Rate & Fee Verification",
    description: "Ensure every ad matches your approved product numbers.",
    icon: Calculator,
  },
  {
    href: "/platform#page-watcher",
    title: "Live Page Monitoring",
    description: "Get alerted immediately if a live webpage changes.",
    icon: Activity,
  },
  {
    href: "/platform#signoff",
    title: "Team & CCO Sign-Off",
    description: "Separate marketing drafts from final compliance approval.",
    icon: ShieldCheck,
  },
];

const SOLUTIONS_LINKS = [
  {
    href: "/solutions#digital-lenders",
    title: "Digital Lenders",
    tag: "FCCPC · Play Store",
    description: "60-day tenor rules, real repayment math & clean copy.",
    icon: Smartphone,
  },
  {
    href: "/solutions#banking",
    title: "MFBs & Commercial Banks",
    tag: "CBN · NDIC · ARCON",
    description: "Deposit coverage wording & quick branch flyer clearance.",
    icon: Landmark,
  },
  {
    href: "/solutions#payments",
    title: "PSBs & Mobile Money",
    tag: "CBN · NDPC",
    description: "Clear partner disclosures & daily webpage monitoring.",
    icon: Wallet,
  },
  {
    href: "/solutions#wealthtech",
    title: "WealthTech & SEC",
    tag: "SEC Nigeria",
    description: "Keep yield promises & risk disclosures accurate.",
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
    const onScroll = () => setScrolled(window.scrollY > 10);
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
    }, 140);
  };

  const handleTriggerHover = (key: MenuKey) => {
    cancelClose();
    setOpenMenu(key);
  };

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-50 w-full px-4 pt-3 sm:px-6 sm:pt-4 pointer-events-none"
    >
      <div
        className={`pointer-events-auto mx-auto flex h-14 max-w-[1060px] items-center justify-between rounded-2xl border px-3.5 sm:px-5 transition-all duration-300 ${
          scrolled || openMenu || mobileOpen
            ? "border-slate-200/90 bg-white/95 backdrop-blur-xl shadow-[0_12px_36px_-10px_rgba(15,23,42,0.12)]"
            : "border-slate-200/75 bg-white/85 backdrop-blur-lg shadow-[0_8px_28px_-12px_rgba(29,99,237,0.14)]"
        }`}
      >
        {/* Brand Wordmark */}
        <Link href="/" className="shrink-0 focus:outline-none">
          <CogentLogo variant="blue" size="md" />
        </Link>

        {/* Centered Navigation Links (Clean routes only; Vault & Pricing removed) */}
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
              className={`inline-flex items-center gap-1 rounded-xl px-3.5 py-2 text-[13.5px] font-medium transition-colors cursor-pointer ${
                pathname.startsWith("/platform") || openMenu === "platform"
                  ? "bg-blue-50/80 text-[#1D63ED]"
                  : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-950"
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
                className="absolute left-0 top-full pt-3 w-[520px]"
                onMouseEnter={cancelClose}
                onMouseLeave={scheduleClose}
              >
                <div className="rounded-2xl border border-slate-200/90 bg-white/98 p-3.5 shadow-[0_24px_48px_-12px_rgba(15,23,42,0.14)] backdrop-blur-xl">
                  <div className="grid grid-cols-1 gap-1.5">
                    {PLATFORM_LINKS.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="group flex items-start gap-3 rounded-xl p-2.5 hover:bg-blue-50/50 transition-colors"
                        >
                          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 group-hover:border-blue-200 group-hover:bg-[#1D63ED] group-hover:text-white transition-colors">
                            <Icon className="h-4 w-4" strokeWidth={1.8} />
                          </div>
                          <div>
                            <p className="text-[13px] font-semibold text-slate-950">
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
                      Built for Growth, Legal &amp; Compliance Teams
                    </span>
                    <Link
                      href="/platform"
                      className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#1D63ED] hover:underline"
                    >
                      <span>See Platform Tour</span>
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
              className={`inline-flex items-center gap-1 rounded-xl px-3.5 py-2 text-[13.5px] font-medium transition-colors cursor-pointer ${
                pathname.startsWith("/solutions") || openMenu === "solutions"
                  ? "bg-blue-50/80 text-[#1D63ED]"
                  : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-950"
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
                className="absolute left-0 top-full pt-3 w-[540px]"
                onMouseEnter={cancelClose}
                onMouseLeave={scheduleClose}
              >
                <div className="rounded-2xl border border-slate-200/90 bg-white/98 p-3.5 shadow-[0_24px_48px_-12px_rgba(15,23,42,0.14)] backdrop-blur-xl">
                  <div className="grid grid-cols-2 gap-2">
                    {SOLUTIONS_LINKS.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="group rounded-xl border border-slate-100 bg-slate-50/60 p-3 hover:border-blue-200 hover:bg-blue-50/40 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <Icon
                              className="h-4 w-4 text-slate-600 group-hover:text-[#1D63ED] transition-colors"
                              strokeWidth={1.8}
                            />
                            <span className="text-[10px] font-medium text-slate-400">
                              {item.tag}
                            </span>
                          </div>
                          <p className="mt-2 text-[13px] font-semibold text-slate-950">
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
                      Tailored to your exact Nigerian financial license
                    </span>
                    <Link
                      href="/solutions"
                      className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#1D63ED] hover:underline"
                    >
                      <span>View All Solutions</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Link
            href="/company"
            className={`rounded-xl px-3.5 py-2 text-[13.5px] font-medium transition-colors ${
              pathname.startsWith("/company")
                ? "bg-blue-50/80 text-[#1D63ED]"
                : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-950"
            }`}
          >
            Company
          </Link>

          <Link
            href="/resources/faq"
            className={`rounded-xl px-3.5 py-2 text-[13.5px] font-medium transition-colors ${
              pathname.startsWith("/resources")
                ? "bg-blue-50/80 text-[#1D63ED]"
                : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-950"
            }`}
          >
            FAQ
          </Link>
        </nav>

        {/* Right Conversion CTAs */}
        <div className="hidden lg:flex items-center gap-2">
          {isLoaded && isSignedIn ? (
            <Link
              href="/chat"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#1D63ED] px-4 py-2 text-[13px] font-semibold text-white shadow-sm shadow-blue-600/25 hover:bg-[#1552CC] transition-colors"
            >
              <span>Open Workspace</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <>
              <Link
                href="/sign-in"
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-[13px] font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-colors"
              >
                Login
              </Link>
              <Link
                href="/sign-up"
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#1D63ED] px-4 py-2 text-[13px] font-semibold text-white shadow-sm shadow-blue-600/25 hover:bg-[#1552CC] transition-colors"
              >
                <span>Create Account</span>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-800 lg:hidden cursor-pointer"
        >
          {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {/* Mobile Floating Drawer */}
      {mobileOpen && (
        <div className="pointer-events-auto mx-auto mt-2 max-w-[1060px] rounded-2xl border border-slate-200 bg-white/98 p-4 shadow-2xl backdrop-blur-xl lg:hidden max-h-[calc(100vh-5.5rem)] overflow-y-auto">
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Platform
              </p>
              {PLATFORM_LINKS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block rounded-xl px-3 py-2 text-[14px] font-medium text-slate-800 hover:bg-blue-50/50"
                >
                  {item.title}
                </Link>
              ))}
            </div>

            <div className="border-t border-slate-100 pt-3 space-y-1">
              <p className="px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Solutions
              </p>
              {SOLUTIONS_LINKS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center justify-between rounded-xl px-3 py-2 text-[14px] font-medium text-slate-800 hover:bg-blue-50/50"
                >
                  <span>{item.title}</span>
                  <span className="text-[11px] text-slate-400">{item.tag}</span>
                </Link>
              ))}
            </div>

            <div className="border-t border-slate-100 pt-3 space-y-1">
              <Link
                href="/company"
                className="block rounded-xl px-3 py-2 text-[14px] font-medium text-slate-800 hover:bg-blue-50/50"
              >
                Company &amp; Founders
              </Link>
              <Link
                href="/resources/faq"
                className="block rounded-xl px-3 py-2 text-[14px] font-medium text-slate-800 hover:bg-blue-50/50"
              >
                FAQ
              </Link>
            </div>

            <div className="border-t border-slate-100 pt-3 flex flex-col gap-2">
              {isLoaded && isSignedIn ? (
                <Link
                  href="/chat"
                  className="flex h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-[#1D63ED] text-[14px] font-semibold text-white"
                >
                  <span>Open Workspace</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : (
                <>
                  <Link
                    href="/sign-up"
                    className="flex h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-[#1D63ED] text-[14px] font-semibold text-white"
                  >
                    <span>Create Account</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/sign-in"
                    className="flex h-11 w-full items-center justify-center rounded-xl border border-slate-200 text-[14px] font-medium text-slate-700"
                  >
                    Login
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
