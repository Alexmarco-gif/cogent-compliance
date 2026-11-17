"use client";

import React, { useState } from "react";
import { ShieldCheck, Scale, Lock, FileCheck2, Landmark, Cpu } from "lucide-react";

interface LeadershipProfile {
  id: string;
  initials: string;
  shortLabel: string;
  name: string;
  roleBadge: string;
  discipline: string;
  bio: string;
  quote: string;
  quoteAttribution: string;
  imagePath?: string;
  mandates: Array<{
    title: string;
    description: string;
    icon: "shield" | "scale" | "lock" | "file" | "landmark" | "cpu";
  }>;
}

const LEADERSHIP_PROFILES: LeadershipProfile[] = [
  {
    id: "founder",
    initials: "SC",
    shortLabel: "Founder & CEO",
    name: "Founder & Chief Executive",
    roleBadge: "FOUNDER · CEO",
    discipline: "Supervisory RegTech",
    bio: "Leading Stem-Cogent to give Nigerian banks, digital lenders, and fintechs deterministic pre-publication clarity—replacing slow legal queues and unverified AI guesswork with codified statutory certainty.",
    quote:
      "At Stem-Cogent, we believe financial compliance should accelerate institutional trust—not force growth teams and compliance officers to guess against shifting Nigerian law.",
    quoteAttribution: "Founder & Chief Executive · Stem-Cogent",
    imagePath: "/images/founder.jpg",
    mandates: [
      {
        title: "Statutory Grounding",
        description:
          "Every campaign review ties back verbatim to verified CBN, FCCPC, ARCON, NDPC, and SEC provisions with SHA-256 provenance.",
        icon: "scale",
      },
      {
        title: "Zero-Hallucination Math",
        description:
          "Effective APR, compounded IRR, and license-boundary locks run strictly in deterministic engines—never delegated to an LLM.",
        icon: "shield",
      },
    ],
  },
  {
    id: "regulatory",
    initials: "RI",
    shortLabel: "Regulatory Lead",
    name: "Regulatory Intelligence Practice",
    roleBadge: "STATUTORY VAULT",
    discipline: "CBN · FCCPC · ARCON · SEC",
    bio: "Maintains Cogent's Golden 50 statutory corpus and 141 indexed Nigerian legal PDFs, tracking circular updates across .gov.ng portals so superseded rules never pollute live reviews.",
    quote:
      "Superseded circulars create silent liability. Our statutory retrieval pipeline guarantees legal teams see current law alongside verbatim clause citations.",
    quoteAttribution: "Regulatory Intelligence Practice · Stem-Cogent",
    mandates: [
      {
        title: "Golden 50 Corpus Governance",
        description:
          "Curates Hybrid RRF statutory indexes and 10 Nigerian financial license classification matrices across lending, banking, and payments.",
        icon: "landmark",
      },
      {
        title: "Live .gov.ng Ripple Alerts",
        description:
          "Continuously surfaces breaking CBN, SEC, and FCCPC regulatory notices directly inside your institution's drift workspace.",
        icon: "file",
      },
    ],
  },
  {
    id: "architecture",
    initials: "SA",
    shortLabel: "Security & Systems",
    name: "Engineering & Trust Architecture",
    roleBadge: "SYSTEMS & RBAC",
    discipline: "PostgreSQL RLS · SHA-256",
    bio: "Architects Cogent's multi-tenant isolation model—combining PostgreSQL Row-Level Security, encrypted private object storage, SSRF-hardened URL sentinels, and dual-control CCO locks.",
    quote:
      "Compliance software must meet the same cryptographic and tenancy bar as the regulated institutions it serves.",
    quoteAttribution: "Engineering & Trust Architecture · Stem-Cogent",
    mandates: [
      {
        title: "Strict Tenant Isolation",
        description:
          "Every rate card, internal playbook, and PDF dossier stays strictly isolated per tenant_id with zero third-party model training.",
        icon: "lock",
      },
      {
        title: "Dual-Control Accountability",
        description:
          "Enforces hard separation between Marketing submissions and Legal Counsel / CCO approval (`approval.decide`) with hash-chained audit logs.",
        icon: "cpu",
      },
    ],
  },
];

function renderMandateIcon(icon: LeadershipProfile["mandates"][number]["icon"]) {
  switch (icon) {
    case "scale":
      return <Scale className="h-4 w-4 text-[#2A4BFF]" strokeWidth={1.8} />;
    case "shield":
      return <ShieldCheck className="h-4 w-4 text-[#2A4BFF]" strokeWidth={1.8} />;
    case "landmark":
      return <Landmark className="h-4 w-4 text-[#2A4BFF]" strokeWidth={1.8} />;
    case "file":
      return <FileCheck2 className="h-4 w-4 text-[#2A4BFF]" strokeWidth={1.8} />;
    case "lock":
      return <Lock className="h-4 w-4 text-[#2A4BFF]" strokeWidth={1.8} />;
    case "cpu":
      return <Cpu className="h-4 w-4 text-[#2A4BFF]" strokeWidth={1.8} />;
  }
}

function PortraitStage({
  profile,
}: {
  profile: LeadershipProfile;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = Boolean(profile.imagePath && !imgFailed);

  return (
    <div className="relative mx-auto flex h-[300px] sm:h-[340px] w-full max-w-[280px] items-end justify-center">
      {/* Subtle architectural halo */}
      <div
        className="pointer-events-none absolute inset-x-4 bottom-0 top-6 rounded-t-[140px] border border-white/20 bg-gradient-to-b from-white/15 via-white/8 to-transparent"
        aria-hidden="true"
      />

      {showImage ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={profile.imagePath}
          alt={profile.name}
          onError={() => setImgFailed(true)}
          className="relative z-10 h-[285px] sm:h-[325px] w-[240px] rounded-t-[120px] object-cover object-top shadow-2xl"
        />
      ) : (
        <div className="relative z-10 flex h-[280px] sm:h-[315px] w-[236px] flex-col items-center justify-center rounded-t-[118px] border border-white/25 bg-[#10268A]/70 px-6 text-center backdrop-blur-sm">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border border-white/30 bg-white/15 font-serif text-[32px] italic text-white">
            {profile.initials}
          </div>
          <p className="mt-4 font-mono text-[10.5px] uppercase tracking-[0.12em] text-blue-100/90">
            {profile.shortLabel}
          </p>
          <p className="mt-1 text-[13px] text-blue-100/75">
            Stem-Cogent · Lagos &amp; Abuja Scope
          </p>
        </div>
      )}
    </div>
  );
}

export function FounderSpotlight() {
  const [activeIndex, setActiveIndex] = useState(0);
  const profile = LEADERSHIP_PROFILES[activeIndex] ?? LEADERSHIP_PROFILES[0]!;

  return (
    <div className="mx-auto max-w-[1060px]">
      {/* Top Team Pill Selector (ref/w4.png composition) */}
      <div className="relative z-20 mx-auto -mb-6 flex w-fit flex-col items-center">
        <div
          className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-2.5 py-2 shadow-lg shadow-zinc-950/10"
          role="tablist"
          aria-label="Stem-Cogent Leadership Profiles"
        >
          {LEADERSHIP_PROFILES.map((item, idx) => {
            const active = idx === activeIndex;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                aria-label={item.shortLabel}
                onClick={() => setActiveIndex(idx)}
                className={`flex h-10 items-center gap-2 rounded-full px-3 text-[12.5px] font-medium transition-all cursor-pointer ${
                  active
                    ? "bg-zinc-950 text-white shadow-sm"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-950"
                }`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full font-mono text-[10.5px] font-semibold ${
                    active ? "bg-[#2A4BFF] text-white" : "bg-white text-zinc-700"
                  }`}
                >
                  {item.initials}
                </span>
                <span className="hidden sm:inline">{item.shortLabel}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-2 rounded-full border border-zinc-200 bg-white px-3 py-0.5 font-mono text-[11px] font-medium text-zinc-700 shadow-sm">
          {activeIndex + 1} / {LEADERSHIP_PROFILES.length}
        </div>
      </div>

      {/* Signature Cobalt Spotlight Card (ref/w4.png architectural centerpiece) */}
      <div
        className="relative overflow-hidden rounded-[28px] border border-[#1E40AF] px-6 pt-12 pb-0 text-white shadow-2xl shadow-blue-950/20 sm:px-10 sm:pt-14"
        style={{
          background:
            "linear-gradient(155deg, #2A4BFF 0%, #1D4ED8 55%, #172554 100%)",
        }}
      >
        {/* Top Centered Name */}
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-[30px] sm:text-[40px] font-semibold leading-[1.08] tracking-[-0.025em] text-white">
            {profile.name}
          </h2>
        </div>

        {/* 3-Column Asymmetric Spotlight Stage */}
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-end">
          {/* Left Bio & Role Metadata */}
          <div className="lg:col-span-4 pb-6 lg:pb-10 space-y-4">
            <div className="grid grid-cols-[74px_1fr] items-center gap-y-2.5 text-[13px]">
              <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-blue-200/80">
                Role
              </span>
              <div>
                <span className="inline-block rounded-full bg-white px-2.5 py-0.5 font-mono text-[11px] font-semibold text-zinc-950">
                  {profile.roleBadge}
                </span>
              </div>

              <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-blue-200/80">
                Focus
              </span>
              <span className="font-medium text-white">{profile.discipline}</span>
            </div>

            <div className="border-t border-white/15 pt-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-blue-200/80">
                Mandate Bio
              </p>
              <p className="mt-2 text-[13.5px] leading-relaxed text-blue-50/90">
                {profile.bio}
              </p>
            </div>

            {/* Subtle Signature Line */}
            <div className="pt-1 opacity-75" aria-hidden="true">
              <svg width="96" height="28" viewBox="0 0 96 28" fill="none">
                <path
                  d="M4 22C16 8 23 5 26 16C28 24 38 7 49 12C59 16 64 21 90 13"
                  stroke="white"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>

          {/* Center Studio Portrait Stage */}
          <div className="lg:col-span-4 order-first lg:order-none">
            <PortraitStage profile={profile} />
          </div>

          {/* Right Superpowers / Operating Principles */}
          <div className="lg:col-span-4 pb-8 lg:pb-10 space-y-3.5">
            <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-blue-200/80 border-b border-white/15 pb-2">
              Core Principles
            </p>
            {profile.mandates.map((mandate) => (
              <div
                key={mandate.title}
                className="flex items-start gap-3.5 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm"
              >
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white">
                  {renderMandateIcon(mandate.icon)}
                </div>
                <div>
                  <h3 className="text-[14px] font-semibold text-white">
                    {mandate.title}
                  </h3>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-blue-100/85">
                    {mandate.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Executive Quote Band (ref/w4.png bottom statement) */}
      <div className="mx-auto mt-14 max-w-2xl text-center px-4">
        <div className="flex items-start justify-center gap-3">
          <span
            className="font-serif text-[44px] leading-none text-[#2A4BFF] select-none"
            aria-hidden="true"
          >
            &ldquo;
          </span>
          <blockquote className="text-[19px] sm:text-[23px] font-semibold leading-[1.35] tracking-tight text-zinc-950">
            {profile.quote}
          </blockquote>
          <span
            className="font-serif text-[44px] leading-none text-[#2A4BFF] select-none self-end"
            aria-hidden="true"
          >
            &rdquo;
          </span>
        </div>

        <div className="mt-5 inline-flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-950 font-mono text-[11px] font-semibold text-white">
            {profile.initials}
          </div>
          <div className="text-left">
            <p className="text-[12.5px] font-semibold text-zinc-950">
              {profile.name}
            </p>
            <p className="font-mono text-[10.5px] uppercase tracking-wider text-[#2A4BFF]">
              {profile.roleBadge}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
