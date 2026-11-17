"use client";

import React, { useState } from "react";
import { ShieldCheck, Compass, Sparkles, Lock } from "lucide-react";
import { CO_FOUNDERS, type CoFounderProfile } from "@/data/marketing-scenarios";

function renderMandateIcon(icon: CoFounderProfile["mandates"][number]["icon"]) {
  switch (icon) {
    case "shield":
      return <ShieldCheck className="h-4 w-4 text-[#1D63ED]" strokeWidth={1.8} />;
    case "compass":
      return <Compass className="h-4 w-4 text-[#1D63ED]" strokeWidth={1.8} />;
    case "sparkles":
      return <Sparkles className="h-4 w-4 text-[#1D63ED]" strokeWidth={1.8} />;
    case "lock":
      return <Lock className="h-4 w-4 text-[#1D63ED]" strokeWidth={1.8} />;
  }
}

function PortraitStage({ profile }: { profile: CoFounderProfile }) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div className="relative mx-auto flex h-[310px] sm:h-[345px] w-full max-w-[270px] items-end justify-center">
      {/* Subtle architectural arch halo */}
      <div
        className="pointer-events-none absolute inset-x-3 bottom-0 top-5 rounded-t-[140px] border border-white/25 bg-gradient-to-b from-white/20 via-white/8 to-transparent"
        aria-hidden="true"
      />

      {!imgFailed ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={profile.imagePath}
          alt={`${profile.name} — ${profile.roleBadge}`}
          onError={() => setImgFailed(true)}
          className="relative z-10 h-[290px] sm:h-[328px] w-[235px] rounded-t-[120px] object-cover object-top shadow-2xl"
        />
      ) : (
        <div className="relative z-10 flex h-[285px] sm:h-[318px] w-[230px] flex-col items-center justify-center rounded-t-[115px] border border-white/30 bg-[#10268A]/65 px-5 text-center backdrop-blur-md">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border border-white/35 bg-white/15 font-serif text-[32px] italic text-white shadow-inner">
            {profile.initials}
          </div>
          <p className="mt-4 text-[13.5px] font-semibold text-white">
            {profile.name}
          </p>
          <p className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.12em] text-blue-100/85">
            {profile.roleBadge}
          </p>
          <p className="mt-2 text-[11.5px] text-blue-100/70">
            Stem Systems
          </p>
        </div>
      )}
    </div>
  );
}

export function FounderSpotlight() {
  const [activeIndex, setActiveIndex] = useState(0);
  const profile = CO_FOUNDERS[activeIndex] ?? CO_FOUNDERS[0]!;

  return (
    <div className="mx-auto max-w-[1060px]">
      {/* Top Co-Founder Pill Switcher matching ref/w4.png */}
      <div className="relative z-20 mx-auto -mb-6 flex w-fit flex-col items-center">
        <div
          className="flex flex-wrap items-center justify-center gap-2 rounded-full border border-slate-200/90 bg-white px-2.5 py-2 shadow-lg shadow-blue-950/10"
          role="tablist"
          aria-label="Stem Systems Co-Founders"
        >
          {CO_FOUNDERS.map((item, idx) => {
            const active = idx === activeIndex;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                aria-label={item.name}
                onClick={() => setActiveIndex(idx)}
                className={`flex h-10 items-center gap-2 rounded-full px-3.5 text-[13px] font-semibold transition-all cursor-pointer ${
                  active
                    ? "bg-[#1D63ED] text-white shadow-sm shadow-blue-600/25"
                    : "bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-[#1D63ED]"
                }`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-[10.5px] font-bold ${
                    active ? "bg-white text-[#1D63ED]" : "bg-white text-slate-700"
                  }`}
                >
                  {item.initials}
                </span>
                <span>{item.name}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-2 rounded-full border border-slate-200 bg-white px-3 py-0.5 font-mono text-[11px] font-semibold text-slate-700 shadow-xs">
          {activeIndex + 1} / {CO_FOUNDERS.length}
        </div>
      </div>

      {/* Signature Cobalt Spotlight Stage matching ref/w4.png */}
      <div className="relative overflow-hidden rounded-[28px] border border-blue-700/60 cogent-cobalt-stage px-6 pt-12 pb-0 text-white shadow-2xl shadow-blue-950/20 sm:px-10 sm:pt-14">
        {/* Centered Leader Name */}
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-[30px] sm:text-[40px] font-semibold leading-[1.08] tracking-[-0.025em] text-white">
            {profile.name}
          </h2>
        </div>

        {/* 3-Column Asymmetric Spotlight Stage */}
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-end">
          {/* Left Role Metadata & Executive Bio */}
          <div className="lg:col-span-5 pb-6 lg:pb-10 space-y-4">
            <div className="flex flex-wrap items-center gap-2.5 text-[12.5px]">
              <span className="inline-block rounded-full bg-white px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[#1D63ED]">
                {profile.roleBadge}
              </span>
              <span className="font-medium text-blue-100">{profile.discipline}</span>
            </div>

            <div className="border-t border-white/15 pt-4">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-blue-200/85">
                Biography
              </p>
              <p className="mt-2 text-[13.5px] leading-relaxed text-blue-50/95">
                {profile.bio}
              </p>
            </div>
          </div>

          {/* Center Studio Portrait Stage */}
          <div className="lg:col-span-3 order-first lg:order-none">
            <PortraitStage key={profile.id} profile={profile} />
          </div>

          {/* Right Leadership Pillars */}
          <div className="lg:col-span-4 pb-8 lg:pb-10 space-y-3.5">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-blue-200/85 border-b border-white/15 pb-2">
              Operating Focus
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
                  <p className="mt-1 text-[12.5px] leading-relaxed text-blue-100/90">
                    {mandate.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Executive Quote Strip matching ref/w4.png */}
      <div className="mx-auto mt-12 max-w-2xl text-center px-4">
        <div className="flex items-start justify-center gap-3">
          <span
            className="font-serif text-[44px] leading-none text-[#1D63ED] select-none"
            aria-hidden="true"
          >
            &ldquo;
          </span>
          <blockquote className="text-[18px] sm:text-[22px] font-semibold leading-[1.35] tracking-tight text-slate-950">
            {profile.quote}
          </blockquote>
          <span
            className="font-serif text-[44px] leading-none text-[#1D63ED] select-none self-end"
            aria-hidden="true"
          >
            &rdquo;
          </span>
        </div>

        <div className="mt-5 inline-flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1D63ED] text-[11px] font-bold text-white">
            {profile.initials}
          </div>
          <div className="text-left">
            <p className="text-[13px] font-semibold text-slate-950">
              {profile.name}
            </p>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#1D63ED]">
              {profile.roleBadge} · Stem Systems
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
