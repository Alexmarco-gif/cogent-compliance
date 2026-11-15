import React from "react";

export interface CogentLogoProps {
  variant?: "dark" | "light" | "blue" | "mark";
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
  subtitle?: string;
  className?: string;
}

/**
 * Bespoke Cogent geometric brand mark.
 * Interlocking precision architectural corners forming a verified ledger square.
 */
export function CogentMark({
  className = "h-4 w-4",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M15.5 4.5H7C5.61929 4.5 4.5 5.61929 4.5 7V17C4.5 18.3807 5.61929 19.5 7 19.5H15.5"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
      <path
        d="M19.5 8.5V15.5C19.5 16.0523 19.0523 16.5 18.5 16.5H10.5C9.94772 16.5 9.5 16.0523 9.5 15.5V8.5C9.5 7.94772 9.94772 7.5 10.5 7.5H18.5C19.0523 7.5 19.5 7.94772 19.5 8.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M12.75 12L14.25 13.5L17 10.5"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CogentLogo({
  variant = "dark",
  size = "md",
  showWordmark = true,
  subtitle,
  className = "",
}: CogentLogoProps) {
  const boxSize =
    size === "lg"
      ? "h-10 w-10 rounded-xl"
      : size === "sm"
        ? "h-6 w-6 rounded-md"
        : "h-7 w-7 rounded-lg";

  const markSize =
    size === "lg" ? "h-5 w-5" : size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  const boxStyle =
    variant === "blue"
      ? "bg-[#2A4BFF] text-white shadow-sm"
      : variant === "light"
        ? "bg-white text-zinc-950 border border-zinc-200"
        : "bg-zinc-900 text-white";

  if (variant === "mark") {
    return <CogentMark className={`${markSize} ${className}`} />;
  }

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <div
        className={`flex shrink-0 items-center justify-center ${boxSize} ${boxStyle}`}
      >
        <CogentMark className={markSize} />
      </div>
      {showWordmark && (
        <div className="leading-none">
          <span className="block text-[15px] font-semibold tracking-tight text-zinc-950">
            Cogent
          </span>
          {subtitle && (
            <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-400">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
