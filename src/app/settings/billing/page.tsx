import React, { Suspense } from "react";
import type { Metadata } from "next";
import { SettingsShellView } from "@/components/settings/SettingsShellView";
import { ChatWorkspaceSkeleton } from "@/components/shell/WorkspaceSkeletons";

export const metadata: Metadata = {
  title: "Billing & Plan | Cogent Marketing Shield",
};

export default function BillingSettingsPage() {
  return (
    <Suspense fallback={<ChatWorkspaceSkeleton />}>
      <SettingsShellView defaultTab="billing" />
    </Suspense>
  );
}
