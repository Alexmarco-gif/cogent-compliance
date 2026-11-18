"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useOrganizationList } from "@clerk/nextjs";
import { Building2, Plus, ArrowRight, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";

interface WorkspaceOrgPanelProps {
  afterCreateUrl?: string;
  afterSelectUrl?: string;
  onOrgActivated?: (orgId: string) => void;
}

function formatClerkOrgError(err: unknown): string {
  if (err && typeof err === "object") {
    const maybeErr = err as {
      errors?: Array<{ message?: string; longMessage?: string; code?: string }>;
      message?: string;
    };
    const first = maybeErr.errors?.[0];
    const detail = first?.longMessage || first?.message || maybeErr.message || "";
    const lower = detail.toLowerCase();

    if (
      lower.includes("not enabled") ||
      lower.includes("disabled") ||
      lower.includes("not allowed") ||
      lower.includes("permission") ||
      first?.code === "organizations_not_enabled"
    ) {
      return `${detail || "Organization creation is currently disabled in Clerk."} In Clerk Dashboard (Development mode), go to Configure → Organizations → Settings and turn ON "Enable Organizations" and "Allow users to create organizations".`;
    }

    if (detail) {
      return detail;
    }
  }
  return "Failed to create organization. Please try again.";
}

export function WorkspaceOrgPanel({
  afterCreateUrl = "/onboarding",
  afterSelectUrl = "/chat",
  onOrgActivated,
}: WorkspaceOrgPanelProps) {
  const router = useRouter();
  const { isLoaded, createOrganization, setActive, userMemberships } = useOrganizationList({
    userMemberships: { infinite: true },
  });

  const [orgName, setOrgName] = useState("");
  const [creating, setCreating] = useState(false);
  const [selectingOrgId, setSelectingOrgId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const memberships = userMemberships?.data || [];

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = orgName.trim();
    if (trimmed.length < 2) {
      setError("Please enter an organization name (at least 2 characters).");
      return;
    }
    if (!isLoaded || !createOrganization || !setActive) {
      setError("Authentication session is still loading. Please try again in a moment.");
      return;
    }

    setCreating(true);
    setError(null);
    try {
      const created = await createOrganization({ name: trimmed });
      await setActive({ organization: created.id });
      window.dispatchEvent(new Event("cogent:billing-updated"));
      if (onOrgActivated) {
        onOrgActivated(created.id);
      } else {
        router.push(afterCreateUrl);
      }
      router.refresh();
    } catch (err) {
      setError(formatClerkOrgError(err));
    } finally {
      setCreating(false);
    }
  };

  const handleSelectOrg = async (targetOrgId: string) => {
    if (!isLoaded || !setActive) return;
    setSelectingOrgId(targetOrgId);
    setError(null);
    try {
      await setActive({ organization: targetOrgId });
      window.dispatchEvent(new Event("cogent:billing-updated"));
      if (onOrgActivated) {
        onOrgActivated(targetOrgId);
      } else {
        router.push(afterSelectUrl);
      }
      router.refresh();
    } catch (err) {
      setError(formatClerkOrgError(err));
    } finally {
      setSelectingOrgId(null);
    }
  };

  return (
    <div className="w-full space-y-5 text-left">
      {error && (
        <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <span className="leading-relaxed">{error}</span>
        </div>
      )}

      {/* Native In-App Create Organization Form */}
      <form
        onSubmit={handleCreateOrg}
        className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 space-y-3"
      >
        <div className="flex items-center gap-2">
          <Plus className="h-4 w-4 text-zinc-700" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-900">
            Create New Organization
          </h3>
        </div>
        <p className="text-xs text-zinc-500">
          Create your institution or internal team workspace directly inside Cogent.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            placeholder="e.g. Cogent Internal or Acme Fintech Ltd"
            disabled={creating || !isLoaded}
            className="flex-1 px-3 py-2 rounded-md border border-zinc-300 bg-white text-sm text-zinc-950 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={creating || !isLoaded || orgName.trim().length < 2}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-md bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 shrink-0"
          >
            {creating ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Creating...</span>
              </>
            ) : (
              <>
                <Plus className="h-3.5 w-3.5" />
                <span>Create Organization</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Existing Organizations List */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Your Existing Organizations
          </h3>
          {userMemberships?.isLoading && (
            <span className="inline-flex items-center gap-1 text-[11px] text-zinc-400">
              <Loader2 className="h-3 w-3 animate-spin" /> Loading...
            </span>
          )}
        </div>

        {memberships.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-200 bg-white px-4 py-5 text-center text-xs text-zinc-500">
            You do not belong to any organization yet. Use the form above to create one.
          </div>
        ) : (
          <div className="space-y-2">
            {memberships.map((mem) => {
              const isBusy = selectingOrgId === mem.organization.id;
              return (
                <div
                  key={mem.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 hover:border-zinc-300 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {mem.organization.hasImage && mem.organization.imageUrl ? (
                      <img
                        src={mem.organization.imageUrl}
                        alt={mem.organization.name}
                        className="h-7 w-7 rounded-md object-cover border border-zinc-200 shrink-0"
                      />
                    ) : (
                      <div className="h-7 w-7 rounded-md bg-zinc-100 border border-zinc-200 flex items-center justify-center shrink-0">
                        <Building2 className="h-3.5 w-3.5 text-zinc-600" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-zinc-950 truncate">
                        {mem.organization.name}
                      </div>
                      <div className="text-[11px] text-zinc-500 flex items-center gap-1.5">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        <span>{mem.roleName || mem.role}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleSelectOrg(mem.organization.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-medium text-zinc-800 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    {isBusy ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Switching...</span>
                      </>
                    ) : (
                      <>
                        <span>Select</span>
                        <ArrowRight className="h-3 w-3" />
                      </>
                    )}
                  </button>
                </div>
              );
            })}

            {userMemberships?.hasNextPage && (
              <button
                type="button"
                onClick={() => userMemberships.fetchNext()}
                className="w-full py-2 text-xs font-medium text-zinc-600 hover:text-zinc-950 border border-zinc-200 rounded-md bg-white hover:bg-zinc-50 cursor-pointer"
              >
                Load more organizations
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
