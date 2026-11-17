"use client";

import React, { useState, useEffect, useRef } from "react";
import { ShieldCheck, Compass, Layers, Lock } from "lucide-react";
import { CO_FOUNDERS, type CoFounderProfile } from "@/data/marketing-scenarios";

const LOOP_INTERVAL_MS = 5500;

function renderMandateIcon(icon: CoFounderProfile["mandates"][number]["icon"]) {
  switch (icon) {
    case "shield":
      return <ShieldCheck className="h-4 w-4 text-[#1D4ED8]" strokeWidth={1.8} />;
    case "compass":
      return <Compass className="h-4 w-4 text-[#1D4ED8]" strokeWidth={1.8} />;
    case "layers":
      return <Layers className="h-4 w-4 text-[#1D4ED8]" strokeWidth={1.8} />;
    case "lock":
      return <Lock className="h-4 w-4 text-[#1D4ED8]" strokeWidth={1.8} />;
  }
}

function PortraitStage({ profile }: { profile: CoFounderProfile }) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div className="relative mx-auto flex h-[410px] sm:h-[470px] lg:h-[520px] w-full max-w-[360px] sm:max-w-[420px] lg:max-w-[450px] items-end justify-center transition-all duration-700 ease-out">
      {/* Soft architectural arch glow behind cutout */}
      <div
        className="pointer-events-none absolute inset-x-2 bottom-0 top-6 rounded-t-full bg-white/10 blur-2xl"
        aria-hidden="true"
      />

      {!imgFailed ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          key={profile.imagePath}
          src={profile.imagePath}
          alt={`${profile.name} — ${profile.roleBadge}`}
          onError={() => setImgFailed(true)}
          className="relative z-10 max-h-[405px] sm:max-h-[465px] lg:max-h-[515px] w-auto object-contain object-bottom filter drop-shadow-[0_20px_35px_rgba(11,18,32,0.55)] transition-all duration-700 ease-out animate-cogent-enter"
        />
      ) : (
        <div className="relative z-10 flex h-[360px] sm:h-[420px] w-[260px] flex-col items-center justify-center rounded-t-[130px] border border-white/30 bg-[#0F2A75] px-6 text-center animate-cogent-enter">
          <div className="flex h-24 w-24 items-center justify-center rounded-full border border-white/35 bg-white/10 font-serif text-[34px] italic text-white">
            {profile.initials}
          </div>
          <p className="mt-5 text-[15px] font-semibold text-white">
            {profile.name}
          </p>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-blue-100">
            {profile.roleBadge}
          </p>
          <p className="mt-2 text-[12px] text-blue-200/80">
            Stem Systems
          </p>
        </div>
      )}
    </div>
  );
}

export function FounderSpotlight() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const profile = CO_FOUNDERS[activeIndex] ?? CO_FOUNDERS[0]!;

  // Continuous auto-looping animation alternating between Alex & Gift
  useEffect(() => {
    if (isPaused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % CO_FOUNDERS.length);
    }, LOOP_INTERVAL_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused]);

  const handleSelect = (idx: number) => {
    setActiveIndex(idx);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  return (
    <div
      className="mx-auto max-w-[1100px]"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Preload founder portraits to eliminate transition pop */}
      <div className="sr-only" aria-hidden="true">
        {CO_FOUNDERS.map((c) => (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img key={c.id} src={c.imagePath} alt="" />
        ))}
      </div>

      {/* Architectural Co-Founder Selector & Loop Status */}
      <div className="relative z-20 mx-auto mb-5 flex w-fit flex-col items-center gap-2">
        <div
          className="flex flex-wrap items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white p-1.5 shadow-2xs"
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
                onClick={() => handleSelect(idx)}
                className={`flex h-9 items-center gap-2 rounded-md px-3.5 text-[13px] font-semibold transition-colors cursor-pointer ${
                  active
                    ? "bg-[#0B1220] text-white"
                    : "bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-[#0B1220]"
                }`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded text-[10px] font-mono font-bold ${
                    active ? "bg-[#1D4ED8] text-white" : "bg-white text-slate-700 border border-slate-200"
                  }`}
                >
                  {item.initials}
                </span>
                <span>{item.name}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 text-slate-500">
          <span className="font-mono text-[11px] font-medium">
            Leader 0{activeIndex + 1} / 0{CO_FOUNDERS.length}
          </span>
          <span className="text-slate-300">·</span>
          <span className="flex items-center gap-1.5 font-mono text-[10.5px] font-medium text-[#1D4ED8]">
            <span className="relative flex h-2 w-2">
              {!isPaused && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              )}
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#1D4ED8]"></span>
            </span>
            <span>{isPaused ? "Paused on hover" : "Continuous loop"}</span>
          </span>
        </div>
      </div>

      {/* Signature Cobalt Spotlight Stage */}
      <div className="relative overflow-hidden rounded-xl border border-blue-800/50 cogent-cobalt-stage px-6 pt-10 pb-0 text-white sm:px-10 sm:pt-12 transition-all duration-500">
        <div key={`header-${profile.id}`} className="mx-auto max-w-2xl text-center animate-cogent-enter">
          <h2 className="text-[30px] sm:text-[38px] font-semibold leading-[1.08] tracking-[-0.025em] text-white">
            {profile.name}
          </h2>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-end">
          {/* Left Role Metadata & Executive Bio */}
          <div
            key={`left-${profile.id}`}
            className="lg:col-span-4 pb-6 lg:pb-10 space-y-4 animate-cogent-enter"
          >
            <div className="flex flex-wrap items-center gap-2.5 text-[12px]">
              <span className="inline-block rounded bg-white px-2.5 py-0.5 font-mono text-[10.5px] font-bold uppercase tracking-wider text-[#1D4ED8]">
                {profile.roleBadge}
              </span>
              <span className="font-medium text-blue-100">{profile.discipline}</span>
            </div>

            <div className="border-t border-white/15 pt-4">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-blue-200">
                Biography
              </p>
              <p className="mt-2 text-[13.5px] leading-relaxed text-blue-50">
                {profile.bio}
              </p>
            </div>
          </div>

          {/* Center Studio Portrait Stage - Dominant & Heroic */}
          <div className="lg:col-span-4 order-first lg:order-none flex items-end justify-center">
            <PortraitStage key={`portrait-${profile.id}`} profile={profile} />
          </div>

          {/* Right Leadership Pillars */}
          <div
            key={`right-${profile.id}`}
            className="lg:col-span-4 pb-8 lg:pb-10 space-y-3 animate-cogent-enter"
          >
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-blue-200 border-b border-white/15 pb-2">
              Operating Focus
            </p>
            {profile.mandates.map((mandate) => (
              <div
                key={mandate.title}
                className="flex items-start gap-3 rounded-lg border border-white/20 bg-white/10 p-4 transition-colors"
              >
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white shadow-2xs">
                  {renderMandateIcon(mandate.icon)}
                </div>
                <div>
                  <h3 className="text-[13.5px] font-semibold text-white">
                    {mandate.title}
                  </h3>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-blue-100">
                    {mandate.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Executive Quote Strip */}
      <div key={`quote-${profile.id}`} className="mx-auto mt-12 max-w-2xl text-center px-4 animate-cogent-enter">
        <div className="flex items-start justify-center gap-3">
          <span
            className="font-serif text-[40px] leading-none text-[#1D4ED8] select-none"
            aria-hidden="true"
          >
            &ldquo;
          </span>
          <blockquote className="text-[18px] sm:text-[21px] font-semibold leading-[1.35] tracking-tight text-[#0B1220]">
            {profile.quote}
          </blockquote>
          <span
            className="font-serif text-[40px] leading-none text-[#1D4ED8] select-none self-end"
            aria-hidden="true"
          >
            &rdquo;
          </span>
        </div>

        <div className="mt-5 inline-flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#0B1220] font-mono text-[11px] font-bold text-white">
            {profile.initials}
          </div>
          <div className="text-left">
            <p className="text-[13px] font-semibold text-[#0B1220]">
              {profile.name}
            </p>
            <p className="font-mono text-[10.5px] font-semibold uppercase tracking-wider text-[#1D4ED8]">
              {profile.roleBadge} · Stem Systems
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
