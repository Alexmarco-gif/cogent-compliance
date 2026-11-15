"use client";

import React from "react";
import { PanelLeftOpen, Menu } from "lucide-react";

export interface WorkspaceHeaderProps {
  section?: string;
  title: string;
  sidebarCollapsed?: boolean;
  onExpandSidebar?: () => void;
  onOpenMobileSidebar?: () => void;
  rightActions?: React.ReactNode;
}

export function WorkspaceHeader({
  section = "Marketing Shield",
  title,
  sidebarCollapsed = false,
  onExpandSidebar,
  onOpenMobileSidebar,
  rightActions,
}: WorkspaceHeaderProps) {
  return (
    <header className="h-[52px] border-b border-zinc-200 bg-white px-4 sm:px-6 flex items-center justify-between gap-4 shrink-0">
      <div className="flex items-center gap-2.5 min-w-0">
        {onOpenMobileSidebar && (
          <button
            type="button"
            onClick={onOpenMobileSidebar}
            className="md:hidden p-1.5 rounded-md text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
            aria-label="Open navigation menu"
          >
            <Menu className="h-4 w-4" />
          </button>
        )}

        {sidebarCollapsed && onExpandSidebar && (
          <button
            type="button"
            onClick={onExpandSidebar}
            className="hidden md:inline-flex p-1.5 rounded-md text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
            title="Expand sidebar"
            aria-label="Expand sidebar"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        )}

        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-[13px] min-w-0 truncate"
        >
          <span className="text-zinc-400 shrink-0">{section}</span>
          <span className="text-zinc-300 shrink-0">/</span>
          <span className="text-zinc-950 font-medium truncate">{title}</span>
        </nav>
      </div>

      {rightActions && (
        <div className="flex items-center gap-2 shrink-0">{rightActions}</div>
      )}
    </header>
  );
}
