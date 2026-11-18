"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import {
  User as UserIcon,
  Building2,
  Users,
  ShieldCheck,
  CreditCard,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";
import { WorkspaceShell } from "@/components/shell/WorkspaceShell";
import { WorkspaceOrgPanel } from "@/components/auth/WorkspaceOrgPanel";
import { ProfileTab } from "./ProfileTab";
import { OrganizationTab } from "./OrganizationTab";
import { TeamRolesTab } from "./TeamRolesTab";
import { CompliancePolicyTab } from "./CompliancePolicyTab";
import { BillingPlanTab } from "./BillingPlanTab";
import type { AuthMeData, WorkspaceSettingsData } from "./types";

export type SettingsTabId = "profile" | "organization" | "team" | "compliance" | "billing";

const SETTINGS_TABS: Array<{
  id: SettingsTabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: "organization", label: "Organization", icon: Building2 },
  { id: "team", label: "Team & Roles", icon: Users },
  { id: "profile", label: "Profile", icon: UserIcon },
  { id: "compliance", label: "Compliance Policy", icon: ShieldCheck },
  { id: "billing", label: "Billing & Plan", icon: CreditCard },
];

interface SettingsShellViewProps {
  defaultTab?: SettingsTabId;
}

export function SettingsShellView({ defaultTab = "organization" }: SettingsShellViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoaded, isSignedIn, orgId } = useAuth();

  const tabParam = searchParams.get("tab") as SettingsTabId | null;
  const activeTab: SettingsTabId =
    tabParam && SETTINGS_TABS.some((t) => t.id === tabParam) ? tabParam : defaultTab;

  const [authMe, setAuthMe] = useState<AuthMeData | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceSettingsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.replace("/sign-in?redirect_url=/settings");
      return;
    }
    if (!orgId) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    Promise.all([
      fetch("/api/marketing-shield/v1/auth/me").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/marketing-shield/v1/settings/workspace").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([meJson, wsJson]) => {
        if (!active) return;
        if (meJson?.success && meJson.data) {
          setAuthMe(meJson.data);
        }
        if (wsJson?.success && wsJson.data) {
          setWorkspace(wsJson.data);
        }
      })
      .catch(() => {
        // Handled per-tab cleanly
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isLoaded, isSignedIn, orgId, router]);

  const handleSelectTab = (tabId: SettingsTabId) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tabId);
    router.push(`/settings?${params.toString()}`);
  };

  const activeTabLabel =
    SETTINGS_TABS.find((t) => t.id === activeTab)?.label || "Settings";

  return (
    <WorkspaceShell
      section="Settings"
      title={activeTabLabel}
      rightActions={
        <Link
          href="/chat?new=1"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 text-[12.5px] font-medium text-zinc-800 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to New Audit</span>
        </Link>
      }
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight text-zinc-950">
              Settings
            </h1>
            <p className="text-sm text-zinc-500">
              Manage your organization details, team roles, personal profile, compliance policies, and billing plan.
            </p>
          </div>
          {authMe?.roleMetadata && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-zinc-200 text-xs self-start sm:self-auto">
              <span className="text-zinc-500">Role:</span>
              <span className="font-semibold text-zinc-950">
                {authMe.roleMetadata.label}
              </span>
            </div>
          )}
        </div>

        {/* Tab Bar */}
        <div className="border-b border-zinc-200 flex items-center gap-1 overflow-x-auto">
          {SETTINGS_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleSelectTab(tab.id)}
                className={`inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "border-zinc-950 text-zinc-950"
                    : "border-transparent text-zinc-500 hover:text-zinc-900"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {isLoaded && isSignedIn && !orgId ? (
          <div className="bg-white rounded-xl border border-zinc-200 p-6 sm:p-8 space-y-5">
            <div>
              <h2 className="text-base font-semibold text-zinc-950">
                Create or Select Your Organization
              </h2>
              <p className="text-xs text-zinc-500 mt-1">
                You are signed in, but no workspace organization is active yet. Create a new organization below or select an existing one to access workspace settings.
              </p>
            </div>
            <WorkspaceOrgPanel
              afterCreateUrl="/onboarding"
              afterSelectUrl="/settings?tab=organization"
            />
          </div>
        ) : loading && !workspace && activeTab !== "billing" ? (
          <div className="bg-white rounded-xl border border-zinc-200 p-10 flex items-center justify-center gap-2 text-xs text-zinc-500">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Loading workspace settings...</span>
          </div>
        ) : (
          <>
            {activeTab === "organization" && (
              <OrganizationTab workspace={workspace} onUpdated={setWorkspace} />
            )}
            {activeTab === "team" && <TeamRolesTab />}
            {activeTab === "profile" && <ProfileTab authMe={authMe} />}
            {activeTab === "compliance" && (
              <CompliancePolicyTab workspace={workspace} onUpdated={setWorkspace} />
            )}
            {activeTab === "billing" && <BillingPlanTab />}
          </>
        )}
      </div>
    </WorkspaceShell>
  );
}
