import React, { Suspense } from "react";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";

export const metadata = {
  title: "Step 3: Sample Review | Cogent Marketing Shield",
  description: "Test sample campaign review",
};

export default function OnboardingStep3Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center text-sm font-medium text-zinc-500">
          Loading...
        </div>
      }
    >
      <OnboardingFlow initialStep={3} />
    </Suspense>
  );
}
