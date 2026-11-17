import React from "react";

interface SectionHeaderProps {
  eyebrow: string;
  titleLeading: string;
  titleAccent?: string;
  description?: string;
  align?: "split" | "center";
  className?: string;
}

export function SectionHeader({
  eyebrow,
  titleLeading,
  titleAccent,
  description,
  align = "split",
  className = "",
}: SectionHeaderProps) {
  if (align === "center") {
    return (
      <div className={`mx-auto max-w-2xl text-center ${className}`}>
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-[#1D4ED8]">
          {eyebrow}
        </p>
        <h2 className="mt-3 text-[30px] sm:text-[40px] font-semibold leading-[1.1] tracking-[-0.03em] text-[#0B1220]">
          {titleLeading}
          {titleAccent && (
            <>
              <br className="hidden sm:inline" />{" "}
              <span className="text-[#1D4ED8]">{titleAccent}</span>
            </>
          )}
        </h2>
        {description && (
          <p className="mx-auto mt-4 max-w-xl text-[15.5px] leading-[1.65] text-slate-600">
            {description}
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between ${className}`}
    >
      <div className="max-w-2xl">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-[#1D4ED8]">
          {eyebrow}
        </p>
        <h2 className="mt-2.5 text-[30px] sm:text-[38px] lg:text-[40px] font-semibold leading-[1.1] tracking-[-0.03em] text-[#0B1220]">
          {titleLeading}
          {titleAccent && (
            <>
              {" "}
              <span className="text-[#1D4ED8]">{titleAccent}</span>
            </>
          )}
        </h2>
      </div>
      {description && (
        <p className="max-w-md text-[14.5px] sm:text-[15px] leading-[1.6] text-slate-600 lg:pb-0.5">
          {description}
        </p>
      )}
    </div>
  );
}
