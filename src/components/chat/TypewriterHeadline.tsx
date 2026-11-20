"use client";

import React, { useEffect, useState } from "react";

interface TypewriterPhrase {
  lead: string;
  highlight: string;
  tail: string;
}

const STATIC_PREFIX = "Ask Cogent ";
const TYPEWRITER_PHRASES: readonly TypewriterPhrase[] = [
  { lead: "a ", highlight: "Compliance Question", tail: "." },
  { lead: "to ", highlight: "Clear your Campaign", tail: "." },
  { lead: "for ", highlight: "Product and Feature Structuring", tail: "." },
  { lead: "to draft ", highlight: "Internal Policy and AML Updating", tail: "." },
  { lead: "about ", highlight: "Cross-Border Expansion", tail: "." },
  { lead: "about ", highlight: "Supervisory DDQ", tail: "." },
];

const TYPE_SPEED_MS = 46;
const DELETE_SPEED_MS = 26;
const HOLD_FULL_MS = 2100;
const HOLD_EMPTY_MS = 240;

function getFullText(phrase: TypewriterPhrase): string {
  return `${phrase.lead}${phrase.highlight}${phrase.tail}`;
}

export function TypewriterHeadline({ className = "" }: { className?: string }) {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [typedLength, setTypedLength] = useState<number>(() =>
    getFullText(TYPEWRITER_PHRASES[0]!).length
  );
  const [phase, setPhase] = useState<"holding" | "deleting" | "typing">("holding");
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
    const currentPhrase = TYPEWRITER_PHRASES[phraseIndex] ?? TYPEWRITER_PHRASES[0]!;
    const fullLength = getFullText(currentPhrase).length;

    if (reducedMotion) {
      setTypedLength(fullLength);
      const timer = setInterval(() => {
        setPhraseIndex((prev) => {
          const next = (prev + 1) % TYPEWRITER_PHRASES.length;
          const nextPhrase = TYPEWRITER_PHRASES[next] ?? TYPEWRITER_PHRASES[0]!;
          setTypedLength(getFullText(nextPhrase).length);
          return next;
        });
      }, 3400);
      return () => clearInterval(timer);
    }

    let timeoutId: ReturnType<typeof setTimeout>;

    if (phase === "holding") {
      timeoutId = setTimeout(() => setPhase("deleting"), HOLD_FULL_MS);
    } else if (phase === "deleting") {
      if (typedLength > 0) {
        timeoutId = setTimeout(() => {
          setTypedLength((prev) => Math.max(0, prev - 1));
        }, DELETE_SPEED_MS);
      } else {
        timeoutId = setTimeout(() => {
          setPhraseIndex((prev) => (prev + 1) % TYPEWRITER_PHRASES.length);
          setPhase("typing");
        }, HOLD_EMPTY_MS);
      }
    } else if (typedLength < fullLength) {
      timeoutId = setTimeout(() => {
        setTypedLength((prev) => Math.min(fullLength, prev + 1));
      }, TYPE_SPEED_MS);
    } else {
      timeoutId = setTimeout(() => setPhase("holding"), 0);
    }

    return () => clearTimeout(timeoutId);
  }, [phraseIndex, typedLength, phase, reducedMotion]);

  const activePhrase = TYPEWRITER_PHRASES[phraseIndex] ?? TYPEWRITER_PHRASES[0]!;
  const visibleText = getFullText(activePhrase).slice(0, typedLength);
  const leadEnd = activePhrase.lead.length;
  const highlightEnd = leadEnd + activePhrase.highlight.length;

  const leadPart = visibleText.slice(0, leadEnd);
  const highlightPart = visibleText.slice(leadEnd, highlightEnd);
  const tailPart = visibleText.slice(highlightEnd);

  return (
    <h1
      aria-label="Ask Cogent a Compliance Question, to Clear your Campaign, for Product and Feature Structuring, to draft Internal Policy and AML Updating, about Cross-Border Expansion, or about Supervisory DDQ."
      className={`font-serif text-[28px] sm:text-[34px] leading-[1.22] tracking-tight text-zinc-950 text-center min-h-[2.5em] flex flex-wrap items-center justify-center ${className}`}
    >
      <span>
        <span>{STATIC_PREFIX}</span>
        <span>{leadPart}</span>
        {highlightPart && <span className="text-[#1D4ED8]">{highlightPart}</span>}
        <span>{tailPart}</span>
        <span
          aria-hidden="true"
          className="inline-block w-[2px] h-[0.9em] bg-[#1D4ED8] align-[-0.08em] ml-0.5 animate-cogent-caret"
        />
      </span>
    </h1>
  );
}
