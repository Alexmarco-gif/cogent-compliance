import React, { Suspense } from "react";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";

export const metadata = {
  title: "Workspace Setup | Cogent Marketing Shield",
  description: "Configure regulatory scope and product schedules",
};

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center text-sm font-medium text-zinc-500">
          Loading setup...
        </div>
      }
    >
      <OnboardingFlow />
    </Suspense>
  );
}
