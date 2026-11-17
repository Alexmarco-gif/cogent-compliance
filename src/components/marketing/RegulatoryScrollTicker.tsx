import React from "react";

const REGULATORY_ENTITIES = [
  { name: "Central Bank of Nigeria", acronym: "CBN", style: "font-serif font-bold text-[19px] sm:text-[21px] tracking-tight" },
  { name: "Nigeria Data Protection Commission", acronym: "NDPC", style: "font-sans font-extrabold text-[17px] sm:text-[19px] tracking-wider" },
  { name: "Federal Competition & Consumer Protection", acronym: "FCCPC", style: "font-mono font-bold text-[16px] sm:text-[18px] tracking-wide" },
  { name: "Securities & Exchange Commission", acronym: "SEC Nigeria", style: "font-serif italic font-semibold text-[18px] sm:text-[20px]" },
  { name: "Nigerian Financial Intelligence Unit", acronym: "NFIU", style: "font-sans font-black text-[17px] sm:text-[19px] tracking-widest" },
  { name: "Nigeria Deposit Insurance Corporation", acronym: "NDIC", style: "font-mono font-bold text-[16px] sm:text-[18px]" },
  { name: "Advertising Regulatory Council of Nigeria", acronym: "ARCON", style: "font-sans font-bold text-[17px] sm:text-[19px] tracking-tight" },
  { name: "Bank of Ghana", acronym: "Bank of Ghana", style: "font-serif font-semibold text-[17px] sm:text-[19px]" },
  { name: "Central Bank of Kenya", acronym: "CBK Kenya", style: "font-sans font-semibold text-[16px] sm:text-[18px]" },
  { name: "South African Reserve Bank", acronym: "SARB", style: "font-mono font-medium text-[15px] sm:text-[17px] tracking-wider" },
];

export function RegulatoryScrollTicker() {
  return (
    <div className="w-full border-y border-white/10 bg-black py-4 sm:py-5 text-white overflow-hidden">
      <div className="mx-auto flex max-w-[1400px] items-center px-5 sm:px-8">
        {/* Left Label matching scrool.JPG */}
        <div className="flex items-center gap-2 pr-6 sm:pr-10 shrink-0 border-r border-white/10">
          <span className="h-2 w-2 rounded-full bg-[#1D4ED8]" />
          <span className="font-mono text-[11px] sm:text-[12px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Regulatory Scope:
          </span>
        </div>

        {/* Continuous Smooth Marquee Ticker */}
        <div className="relative flex-1 overflow-hidden">
          {/* Subtle edge fades */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-black to-transparent z-10" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-black to-transparent z-10" />

          <div className="animate-cogent-marquee flex items-center gap-10 sm:gap-14">
            {[...REGULATORY_ENTITIES, ...REGULATORY_ENTITIES].map((item, idx) => (
              <div
                key={`${item.acronym}-${idx}`}
                className="flex items-center gap-3 shrink-0 text-slate-300 hover:text-white transition-colors"
                title={item.name}
              >
                <span className={`${item.style} text-white/90`}>
                  {item.acronym}
                </span>
                <span className="hidden md:inline font-mono text-[10px] uppercase tracking-wider text-slate-500">
                  {item.name.split(" ")[0]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
