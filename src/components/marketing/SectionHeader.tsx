import React from "react";

interface SectionHeaderProps {
  badge: string;
  titleLeading: string;
  titleAccent?: string;
  description?: string;
  align?: "split" | "center";
  className?: string;
}

export function SectionHeader({
  badge,
  titleLeading,
  titleAccent,
  description,
  align = "split",
  className = "",
}: SectionHeaderProps) {
  if (align === "center") {
    return (
      <div className={`mx-auto max-w-2xl text-center ${className}`}>
        <span className="inline-flex items-center rounded-full bg-[#1D63ED] px-3.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.09em] text-white shadow-sm shadow-blue-600/20">
          {badge}
        </span>
        <h2 className="mt-4 text-[32px] sm:text-[42px] lg:text-[46px] font-semibold leading-[1.08] tracking-[-0.03em] text-slate-950">
          {titleLeading}
          {titleAccent && (
            <>
              <br className="hidden sm:inline" />{" "}
              <span className="text-[#1D63ED]">{titleAccent}</span>
            </>
          )}
        </h2>
        {description && (
          <p className="mx-auto mt-4 max-w-xl text-[15.5px] sm:text-[16.5px] leading-[1.6] text-slate-600">
            {description}
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between ${className}`}
    >
      <div className="max-w-2xl">
        <span className="inline-flex items-center rounded-full bg-[#1D63ED] px-3.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.09em] text-white shadow-sm shadow-blue-600/20">
          {badge}
        </span>
        <h2 className="mt-4 text-[32px] sm:text-[42px] lg:text-[44px] font-semibold leading-[1.08] tracking-[-0.03em] text-slate-950">
          {titleLeading}
          {titleAccent && (
            <>
              <br />
              <span className="text-[#1D63ED]">{titleAccent}</span>
            </>
          )}
        </h2>
      </div>
      {description && (
        <p className="max-w-sm text-[14.5px] sm:text-[15.5px] leading-[1.6] text-slate-600 lg:pb-1">
          {description}
        </p>
      )}
    </div>
  );
}
