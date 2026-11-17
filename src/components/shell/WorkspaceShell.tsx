"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
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

  useEffect(() => {
    try {
      if (window.localStorage.getItem("cogent:sidebar-collapsed") === "true") {
        setSidebarCollapsed(true);
      }
    } catch {
      // Ignore storage access failures
    }
  }, []);

  const handleToggleCollapse = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem("cogent:sidebar-collapsed", String(next));
      } catch {
        // Ignore storage access failures
      }
      return next;
    });
  }, []);

  return (
    <div className="flex h-screen bg-white text-zinc-950 overflow-hidden">
      <Suspense
        fallback={
          <aside className="hidden lg:block w-[240px] shrink-0 bg-zinc-50 border-r border-zinc-200 h-screen" />
        }
      >
        <WorkspaceSidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={handleToggleCollapse}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />
      </Suspense>

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-zinc-50/40">
        <WorkspaceHeader
          section={section}
          title={title}
          onOpenMobileSidebar={() => setMobileOpen(true)}
          rightActions={rightActions}
        />

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
