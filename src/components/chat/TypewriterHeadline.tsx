"use client";

import React, { useEffect, useState } from "react";

const STATIC_PREFIX = "Ask a compliance ";
const TYPEWRITER_PHRASES = [
  "question.",
  "to draft a policy clause.",
  "to clear a campaign.",
  "to launch early.",
] as const;

const TYPE_SPEED_MS = 48;
const DELETE_SPEED_MS = 28;
const HOLD_FULL_MS = 2100;
const HOLD_EMPTY_MS = 240;

export function TypewriterHeadline({ className = "" }: { className?: string }) {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [typedText, setTypedText] = useState<string>(TYPEWRITER_PHRASES[0]);
  const [phase, setPhase] = useState<"holding" | "deleting" | "typing" | "paused_empty">("holding");
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      const timer = setInterval(() => {
        setPhraseIndex((prev) => {
          const next = (prev + 1) % TYPEWRITER_PHRASES.length;
          setTypedText(TYPEWRITER_PHRASES[next] ?? TYPEWRITER_PHRASES[0]);
          return next;
        });
      }, 3400);
      return () => clearInterval(timer);
    }

    const currentPhrase = TYPEWRITER_PHRASES[phraseIndex] ?? TYPEWRITER_PHRASES[0];
    let timeoutId: ReturnType<typeof setTimeout>;

    if (phase === "holding") {
      timeoutId = setTimeout(() => setPhase("deleting"), HOLD_FULL_MS);
    } else if (phase === "deleting") {
      if (typedText.length > 0) {
        timeoutId = setTimeout(() => {
          setTypedText((prev) => prev.slice(0, -1));
        }, DELETE_SPEED_MS);
      } else {
        timeoutId = setTimeout(() => {
          setPhraseIndex((prev) => (prev + 1) % TYPEWRITER_PHRASES.length);
          setPhase("typing");
        }, HOLD_EMPTY_MS);
      }
    } else if (phase === "typing") {
      if (typedText.length < currentPhrase.length) {
        timeoutId = setTimeout(() => {
          setTypedText(currentPhrase.slice(0, typedText.length + 1));
        }, TYPE_SPEED_MS);
      } else {
        timeoutId = setTimeout(() => setPhase("holding"), 0);
      }
    } else {
      timeoutId = setTimeout(() => setPhase("typing"), HOLD_EMPTY_MS);
    }

    return () => clearTimeout(timeoutId);
  }, [phraseIndex, typedText, phase, reducedMotion]);

  return (
    <h1
      aria-label="Ask a compliance question, draft a policy clause, clear a campaign, and launch early."
      className={`font-serif text-[32px] sm:text-[38px] leading-[1.18] tracking-tight text-zinc-950 text-center min-h-[2.4em] sm:min-h-[1.25em] ${className}`}
    >
      <span>{STATIC_PREFIX}</span>
      <span className="inline">
        <span>{typedText}</span>
        <span
          aria-hidden="true"
          className="inline-block w-[2px] h-[0.9em] bg-zinc-900 align-[-0.08em] ml-0.5 animate-cogent-caret"
        />
      </span>
    </h1>
  );
}
