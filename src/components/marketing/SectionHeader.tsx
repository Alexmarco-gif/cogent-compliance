import React from "react";

interface SectionHeaderProps {
  eyebrow: string;
  title: React.ReactNode;
  description?: string;
  align?: "left" | "center";
  theme?: "light" | "dark";
  className?: string;
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  align = "left",
  theme = "light",
  className = "",
}: SectionHeaderProps) {
  const isCenter = align === "center";
  const isDark = theme === "dark";

  return (
    <div
      className={`${isCenter ? "mx-auto text-center max-w-2xl" : "max-w-2xl"} ${className}`}
    >
      <p
        className={`font-mono text-[11px] font-medium uppercase tracking-[0.1em] ${
          isDark ? "text-zinc-400" : "text-zinc-500"
        }`}
      >
        {eyebrow}
      </p>
      <h2
        className={`mt-3 text-[28px] sm:text-[36px] lg:text-[42px] font-semibold leading-[1.12] tracking-[-0.025em] ${
          isDark ? "text-white" : "text-zinc-950"
        }`}
      >
        {title}
      </h2>
      {description && (
        <p
          className={`mt-4 text-[15px] sm:text-[16.5px] leading-[1.6] ${
            isDark ? "text-zinc-400" : "text-zinc-600"
          }`}
        >
          {description}
        </p>
      )}
    </div>
  );
}
