import React, { Suspense } from "react";
import type { Metadata } from "next";
import { SettingsShellView } from "@/components/settings/SettingsShellView";

export const metadata: Metadata = {
  title: "Settings | Cogent Marketing Shield",
};

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center text-sm font-medium text-zinc-500">
          Loading Settings...
        </div>
      }
    >
      <SettingsShellView defaultTab="organization" />
    </Suspense>
  );
}
