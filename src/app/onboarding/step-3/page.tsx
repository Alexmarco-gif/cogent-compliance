import React, { Suspense } from "react";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";

export const metadata = {
  title: "Step 3: Sandbox Audit | Cogent Marketing Shield",
  description: "Experience the Interactive 30-Second Compliance Audit",
};

export default function OnboardingStep3Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F5F6FA] flex items-center justify-center text-sm font-medium text-neutral-500">
          Loading Step 3 Sandbox...
        </div>
      }
    >
      <OnboardingFlow initialStep={3} />
    </Suspense>
  );
}
