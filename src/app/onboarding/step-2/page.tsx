import React, { Suspense } from "react";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";

export const metadata = {
  title: "Step 2: Products | Cogent Marketing Shield",
  description: "Add a flagship product schedule",
};

export default function OnboardingStep2Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center text-sm font-medium text-zinc-500">
          Loading...
        </div>
      }
    >
      <OnboardingFlow initialStep={2} />
    </Suspense>
  );
}
