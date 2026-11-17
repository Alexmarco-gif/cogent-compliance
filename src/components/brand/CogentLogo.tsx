import React from "react";

export interface CogentLogoProps {
  variant?: "dark" | "light" | "blue" | "mark";
  size?: "sm" | "md" | "lg";
  showMark?: boolean;
  showWordmark?: boolean;
  wordmarkColor?: "dark" | "blue";
  subtitle?: string;
  className?: string;
}

/**
 * Authentic Cogent brand icon mark.
 * Shipped directly from the canonical Stem Systems identity system.
 */
export function CogentMark({
  className = "h-5 w-5",
}: {
  className?: string;
}) {
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src="/icon.png"
      alt="Cogent"
      className={`shrink-0 object-contain rounded-md ${className}`}
      width={32}
      height={32}
    />
  );
}

export function CogentLogo({
  variant = "blue",
  size = "md",
  showMark = true,
  showWordmark = true,
  wordmarkColor = "dark",
  subtitle,
  className = "",
}: CogentLogoProps) {
  const boxSize =
    size === "lg"
      ? "h-9 w-9 rounded-lg"
      : size === "sm"
        ? "h-6 w-6 rounded-md"
        : "h-7 w-7 rounded-lg";

  const markSize =
    size === "lg" ? "h-9 w-9" : size === "sm" ? "h-6 w-6" : "h-7 w-7";

  const wordmarkTextStyle =
    wordmarkColor === "blue" ? "text-[#1D4ED8]" : "text-[#0B1220]";

  if (variant === "mark") {
    return <CogentMark className={`${markSize} ${className}`} />;
  }

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {showMark && (
        <div
          className={`flex shrink-0 items-center justify-center overflow-hidden ${boxSize}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icon.png"
            alt="Cogent logo mark"
            className="h-full w-full object-contain rounded-lg shadow-2xs"
            width={36}
            height={36}
          />
        </div>
      )}
      {showWordmark && (
        <div className="leading-none">
          <span
            className={`block text-[15.5px] font-semibold tracking-tight ${wordmarkTextStyle}`}
          >
            Cogent
          </span>
          {subtitle && (
            <span className="mt-0.5 block font-mono text-[9.5px] font-medium uppercase tracking-[0.12em] text-slate-400">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
