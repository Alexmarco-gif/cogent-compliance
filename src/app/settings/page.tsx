import React, { Suspense } from "react";
import type { Metadata } from "next";
import { SettingsShellView } from "@/components/settings/SettingsShellView";
import { ChatWorkspaceSkeleton } from "@/components/shell/WorkspaceSkeletons";

export const metadata: Metadata = {
  title: "Settings | Cogent Marketing Shield",
};

export default function SettingsPage() {
  return (
    <Suspense fallback={<ChatWorkspaceSkeleton />}>
      <SettingsShellView defaultTab="organization" />
    </Suspense>
  );
}
