import React, { Suspense } from "react";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";

export const metadata = {
  title: "Onboarding | Cogent Marketing Shield",
  description: "60-Second Progressive Onboarding & Regulatory Scope Configuration",
};

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F5F6FA] flex items-center justify-center text-sm font-medium text-neutral-500">
          Loading Onboarding Experience...
        </div>
      }
    >
      <OnboardingFlow />
    </Suspense>
  );
}
