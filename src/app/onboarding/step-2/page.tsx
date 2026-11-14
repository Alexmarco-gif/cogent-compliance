import React, { Suspense } from "react";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";

export const metadata = {
  title: "Step 2: Seed Product Truth | Cogent Marketing Shield",
  description: "Seed Your Flagship Rate and Fee Parameters",
};

export default function OnboardingStep2Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F5F6FA] flex items-center justify-center text-sm font-medium text-neutral-500">
          Loading Step 2...
        </div>
      }
    >
      <OnboardingFlow initialStep={2} />
    </Suspense>
  );
}
