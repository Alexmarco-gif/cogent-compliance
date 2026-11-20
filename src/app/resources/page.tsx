import React from "react";
import type { Metadata } from "next";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

export const metadata: Metadata = {
  title: "Resources | Coming Soon",
  description: "Cogent regulatory guides and compliance checklists are coming soon.",
  alternates: {
    canonical: "/resources",
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function ResourcesPage() {
  return (
    <div className="min-h-screen bg-white text-[#0B1220] flex flex-col">
      <MarketingHeader />

      <main className="flex-1 flex items-center justify-center px-5 py-28 sm:py-36">
        <div className="text-center">
          <h1 className="text-[32px] sm:text-[44px] font-semibold tracking-[-0.03em] text-[#0B1220]">
            Coming soon
          </h1>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
