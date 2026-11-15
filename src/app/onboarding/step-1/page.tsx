import React, { Suspense } from "react";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";

export const metadata = {
  title: "Step 1: Scope | Cogent Marketing Shield",
  description: "Select your regulatory scope",
};

export default function OnboardingStep1Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center text-sm font-medium text-zinc-500">
          Loading...
        </div>
      }
    >
      <OnboardingFlow initialStep={1} />
    </Suspense>
  );
}
