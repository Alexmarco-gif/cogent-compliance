import React, { Suspense } from "react";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";

export const metadata = {
  title: "Step 1: Scope Configuration | Cogent Marketing Shield",
  description: "Configure Your Institutional Regulatory Scope",
};

export default function OnboardingStep1Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F5F6FA] flex items-center justify-center text-sm font-medium text-neutral-500">
          Loading Step 1...
        </div>
      }
    >
      <OnboardingFlow initialStep={1} />
    </Suspense>
  );
}
