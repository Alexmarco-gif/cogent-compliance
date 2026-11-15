"use client";

import React, { Suspense, useState } from "react";
import { WorkspaceSidebar } from "./WorkspaceSidebar";
import { WorkspaceHeader } from "./WorkspaceHeader";

export interface WorkspaceShellProps {
  section?: string;
  title: string;
  rightActions?: React.ReactNode;
  children: React.ReactNode;
}

export function WorkspaceShell({
  section = "Marketing Shield",
  title,
  rightActions,
  children,
}: WorkspaceShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-white text-zinc-950 overflow-hidden">
      <Suspense
        fallback={
          <aside className="hidden lg:block w-[240px] shrink-0 bg-zinc-50 border-r border-zinc-200 h-screen" />
        }
      >
        <WorkspaceSidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(true)}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />
      </Suspense>

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-zinc-50/40">
        <WorkspaceHeader
          section={section}
          title={title}
          sidebarCollapsed={sidebarCollapsed}
          onExpandSidebar={() => setSidebarCollapsed(false)}
          onOpenMobileSidebar={() => setMobileOpen(true)}
          rightActions={rightActions}
        />

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
