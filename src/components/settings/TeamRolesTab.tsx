"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  UserPlus,
  Plus,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Send,
  Clock,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { CANONICAL_ROLE_CATALOG, getRoleMetadata } from "@/modules/auth-tenancy/roles";
import type { CanonicalRole } from "@/modules/auth-tenancy/types";

interface TeamMemberItem {
  id: string;
  userId: string;
  clerkMembershipId: string | null;
  role: CanonicalRole;
  roleLabel: string;
  roleShortLabel: string;
  status: "ACTIVE" | "INVITED" | "SUSPENDED";
  firstName: string | null;
  lastName: string | null;
  fullName: string;
  email: string;
  imageUrl: string | null;
  joinedAt: string;
  isCurrentUser: boolean;
}

interface PendingInviteItem {
  id: string;
  emailAddress: string;
  role: CanonicalRole;
  roleLabel: string;
  status: string;
  createdAt: string;
}

interface InviteRow {
  key: string;
  email: string;
  role: CanonicalRole;
}

export function TeamRolesTab() {
  const [members, setMembers] = useState<TeamMemberItem[]>([]);
  const [invitations, setInvitations] = useState<PendingInviteItem[]>([]);
  const [canManageTeam, setCanManageTeam] = useState(false);
  const [loading, setLoading] = useState(true);

  const [inviteRows, setInviteRows] = useState<InviteRow[]>([
    { key: "row-1", email: "", role: "MARKETING_GROWTH" },
  ]);
  const [sendingInvites, setSendingInvites] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "role">("name");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(
    null,
  );

  const loadTeam = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/marketing-shield/v1/team/members");
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success && json.data) {
        setMembers(json.data.members || []);
        setInvitations(json.data.invitations || []);
        setCanManageTeam(Boolean(json.data.canManageTeam));
      } else {
        setFeedback({
          type: "error",
          text: json.error?.message || "Failed to load team directory.",
        });
      }
    } catch {
      setFeedback({ type: "error", text: "Network error loading team directory." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTeam();
  }, [loadTeam]);

  const addInviteRow = () => {
    setInviteRows((prev) => [
      ...prev,
      { key: `row-${Date.now()}-${prev.length}`, email: "", role: "MARKETING_GROWTH" },
    ]);
  };

  const removeInviteRow = (key: string) => {
    setInviteRows((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== key) : prev));
  };

  const updateInviteRow = (key: string, patch: Partial<InviteRow>) => {
    setInviteRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  const handleSendInvites = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageTeam) return;

    const validEntries = inviteRows
      .map((r) => ({ email: r.email.trim(), role: r.role }))
      .filter((r) => r.email.length > 0);

    if (validEntries.length === 0) {
      setFeedback({ type: "error", text: "Enter at least one work email address to invite." });
      return;
    }

    setSendingInvites(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/marketing-shield/v1/team/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitations: validEntries }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        setFeedback({
          type: "error",
          text: json.error?.message || "Failed to send invitations.",
        });
        return;
      }

      const invitedList: Array<{ email: string; role: CanonicalRole }> = json.data?.invited || [];
      const skippedList: Array<{ email: string; reason: string }> = json.data?.skipped || [];
      const failedList: Array<{ email: string; role: CanonicalRole; message: string }> =
        json.data?.failed || [];

      if (failedList.length > 0) {
        setInviteRows(
          failedList.map((f, idx) => ({
            key: `retry-${Date.now()}-${idx}`,
            email: f.email,
            role: f.role,
          })),
        );
        const parts: string[] = [];
        if (invitedList.length > 0) {
          parts.push(`Sent ${invitedList.length} invitation(s).`);
        }
        if (skippedList.length > 0) {
          parts.push(`Skipped ${skippedList.length} existing member/invite(s).`);
        }
        parts.push(
          `Failed (${failedList.length}): ${failedList
            .map((f) => `${f.email} — ${f.message}`)
            .join("; ")}`,
        );
        setFeedback({ type: "error", text: parts.join(" ") });
      } else {
        setInviteRows([{ key: `row-${Date.now()}`, email: "", role: "MARKETING_GROWTH" }]);
        const parts: string[] = [];
        if (invitedList.length > 0) {
          parts.push(
            `Sent ${invitedList.length} ${invitedList.length === 1 ? "invitation" : "invitations"} with functional role permissions bound.`,
          );
        }
        if (skippedList.length > 0) {
          parts.push(
            `Updated/skipped ${skippedList.length}: ${skippedList
              .map((s) => `${s.email} (${s.reason})`)
              .join("; ")}`,
          );
        }
        setFeedback({
          type: "success",
          text: parts.join(" ") || "Team invitations processed.",
        });
      }
      await loadTeam();
    } catch {
      setFeedback({ type: "error", text: "Network error dispatching invitations." });
    } finally {
      setSendingInvites(false);
    }
  };

  const handleRevokeInvite = async (inv: PendingInviteItem) => {
    if (!canManageTeam) return;
    setRevokingId(inv.id);
    setFeedback(null);
    try {
      const params = new URLSearchParams({
        invitationId: inv.id,
        email: inv.emailAddress,
      });
      const res = await fetch(`/api/marketing-shield/v1/team/invitations?${params.toString()}`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        setFeedback({
          type: "error",
          text: json.error?.message || "Failed to revoke invitation.",
        });
        return;
      }
      setFeedback({ type: "success", text: `Revoked invitation for ${inv.emailAddress}.` });
      await loadTeam();
    } catch {
      setFeedback({ type: "error", text: "Network error revoking invitation." });
    } finally {
      setRevokingId(null);
    }
  };

  const handleUpdateRole = async (member: TeamMemberItem, newRole: CanonicalRole) => {
    if (!canManageTeam || member.role === newRole) return;
    setUpdatingMemberId(member.id);
    setFeedback(null);
    try {
      const res = await fetch(`/api/marketing-shield/v1/team/members/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        setFeedback({
          type: "error",
          text: json.error?.message || "Failed to update member role.",
        });
        return;
      }
      const roleMeta = getRoleMetadata(newRole);
      setFeedback({
        type: "success",
        text: `${member.fullName} is now ${roleMeta.label}. Permissions updated immediately.`,
      });
      await loadTeam();
    } catch {
      setFeedback({ type: "error", text: "Network error updating member role." });
    } finally {
      setUpdatingMemberId(null);
    }
  };

  const handleToggleStatus = async (member: TeamMemberItem) => {
    if (!canManageTeam) return;
    const nextStatus = member.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED";
    setUpdatingMemberId(member.id);
    setFeedback(null);
    try {
      const res = await fetch(`/api/marketing-shield/v1/team/members/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        setFeedback({
          type: "error",
          text: json.error?.message || "Failed to update member status.",
        });
        return;
      }
      setFeedback({
        type: "success",
        text: `${member.fullName} marked as ${nextStatus}.`,
      });
      await loadTeam();
    } catch {
      setFeedback({ type: "error", text: "Network error updating member status." });
    } finally {
      setUpdatingMemberId(null);
    }
  };

  const handleRemoveMember = async (member: TeamMemberItem) => {
    if (!canManageTeam) return;
    setUpdatingMemberId(member.id);
    setFeedback(null);
    try {
      const res = await fetch(`/api/marketing-shield/v1/team/members/${member.id}`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        setFeedback({
          type: "error",
          text: json.error?.message || "Failed to remove team member.",
        });
        return;
      }
      setFeedback({
        type: "success",
        text: `Removed ${member.fullName} from active workspace access.`,
      });
      await loadTeam();
    } catch {
      setFeedback({ type: "error", text: "Network error removing team member." });
    } finally {
      setUpdatingMemberId(null);
    }
  };

  const filteredMembers = members
    .filter((m) => {
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      return (
        m.fullName.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.roleLabel.toLowerCase().includes(q)
      );
    })
    .sort((a, b) =>
      sortBy === "role"
        ? a.roleLabel.localeCompare(b.roleLabel)
        : a.fullName.localeCompare(b.fullName),
    );

  return (
    <div className="space-y-6">
      {!canManageTeam && (
        <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
          <span>
            You can view your workspace roster below, but inviting or changing member roles requires <strong>Chief Compliance Officer</strong> or <strong>Workspace Admin</strong> permissions.
          </span>
        </div>
      )}

      {feedback && (
        <div
          className={`p-3.5 rounded-lg border text-xs flex items-center gap-2.5 ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Invite Team Members Card */}
      {canManageTeam && (
        <form
          onSubmit={handleSendInvites}
          className="bg-white rounded-xl border border-zinc-200 p-6 space-y-4"
        >
          <div className="flex items-start justify-between gap-4 border-b border-zinc-100 pb-4">
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-zinc-700" />
              <div>
                <h3 className="text-sm font-semibold text-zinc-950">Add Team Members</h3>
                <p className="text-xs text-zinc-500">
                  Invite colleagues by email and assign their functional compliance role.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            {inviteRows.map((row, idx) => (
              <div
                key={row.key}
                className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center"
              >
                <div className="sm:col-span-6">
                  <label className="sr-only">Work Email</label>
                  <input
                    type="email"
                    value={row.email}
                    onChange={(e) => updateInviteRow(row.key, { email: e.target.value })}
                    placeholder={
                      idx === 0 ? "e.g. legal@company.com" : "colleague@company.com"
                    }
                    className="w-full px-3.5 py-2 rounded-md border border-zinc-300 text-sm focus:outline-none focus:border-zinc-900"
                  />
                </div>
                <div className="sm:col-span-5">
                  <label className="sr-only">Functional Role</label>
                  <select
                    value={row.role}
                    onChange={(e) =>
                      updateInviteRow(row.key, { role: e.target.value as CanonicalRole })
                    }
                    className="w-full px-3 py-2 rounded-md border border-zinc-300 bg-white text-sm focus:outline-none focus:border-zinc-900"
                  >
                    {CANONICAL_ROLE_CATALOG.map((meta) => (
                      <option key={meta.role} value={meta.role}>
                        {meta.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-1 flex justify-end">
                  <button
                    type="button"
                    disabled={inviteRows.length === 1}
                    onClick={() => removeInviteRow(row.key)}
                    className="p-2 rounded-md text-zinc-400 hover:text-rose-700 hover:bg-rose-50 disabled:opacity-30 cursor-pointer"
                    title="Remove row"
                    aria-label="Remove invite row"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={addInviteRow}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-medium text-zinc-700 transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Another Member</span>
            </button>

            <button
              type="submit"
              disabled={sendingInvites}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{sendingInvites ? "Sending..." : "Send Invitations"}</span>
            </button>
          </div>
        </form>
      )}

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div className="bg-white rounded-xl border border-zinc-200 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600" />
              <h3 className="text-sm font-semibold text-zinc-950">
                Pending Invitations ({invitations.length})
              </h3>
            </div>
          </div>

          <div className="divide-y divide-zinc-100">
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="font-medium text-zinc-900">{inv.emailAddress}</div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">
                    Assigned role: <span className="font-medium text-zinc-700">{inv.roleLabel}</span> • Sent{" "}
                    {new Date(inv.createdAt).toLocaleDateString()}
                  </div>
                </div>
                {canManageTeam && (
                  <button
                    type="button"
                    disabled={revokingId === inv.id}
                    onClick={() => handleRevokeInvite(inv)}
                    className="self-start sm:self-auto px-3 py-1.5 rounded-md border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 font-medium cursor-pointer disabled:opacity-50"
                  >
                    {revokingId === inv.id ? "Revoking..." : "Revoke"}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current Team Directory */}
      <div className="bg-white rounded-xl border border-zinc-200 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
          <div>
            <h3 className="text-sm font-semibold text-zinc-950">
              Current Team ({members.length})
            </h3>
            <p className="text-xs text-zinc-500">
              Changes to a team member&apos;s role apply immediately across campaigns, rate cards, and sign-offs.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="h-3.5 w-3.5 text-zinc-400 absolute left-2.5 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search members..."
                className="pl-8 pr-3 py-1.5 rounded-md border border-zinc-200 text-xs focus:outline-none focus:border-zinc-900"
              />
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "name" | "role")}
              className="px-2.5 py-1.5 rounded-md border border-zinc-200 bg-white text-xs text-zinc-700 focus:outline-none focus:border-zinc-900"
            >
              <option value="name">Sort: Name</option>
              <option value="role">Sort: Role</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="py-8 flex items-center justify-center gap-2 text-xs text-zinc-500">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            <span>Loading workspace members...</span>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-500">
            No team members match your search.
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {filteredMembers.map((member) => {
              const initials =
                member.fullName
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((p) => p[0]?.toUpperCase() || "")
                  .join("") || "U";
              const isBusy = updatingMemberId === member.id;

              return (
                <div
                  key={member.id}
                  className="py-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {member.imageUrl ? (
                      <img
                        src={member.imageUrl}
                        alt={member.fullName}
                        className="h-9 w-9 rounded-full object-cover border border-zinc-200 shrink-0"
                      />
                    ) : (
                      <div className="h-9 w-9 rounded-full bg-zinc-900 text-white text-xs font-semibold flex items-center justify-center shrink-0">
                        {initials}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium text-zinc-950 truncate">
                          {member.fullName}
                        </span>
                        {member.isCurrentUser && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-700 border border-zinc-200">
                            You
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border uppercase ${
                            member.status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}
                        >
                          {member.status}
                        </span>
                      </div>
                      <div className="text-[11.5px] text-zinc-500 truncate">
                        {member.email || member.userId}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {canManageTeam ? (
                      <select
                        value={member.role}
                        disabled={isBusy}
                        onChange={(e) =>
                          handleUpdateRole(member, e.target.value as CanonicalRole)
                        }
                        aria-label={`Role for ${member.fullName}`}
                        className="px-2.5 py-1.5 rounded-md border border-zinc-300 bg-white text-xs font-medium text-zinc-900 focus:outline-none focus:border-zinc-900 disabled:opacity-50"
                      >
                        {CANONICAL_ROLE_CATALOG.map((meta) => (
                          <option key={meta.role} value={meta.role}>
                            {meta.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="px-2.5 py-1 rounded-md bg-zinc-100 border border-zinc-200 text-xs font-medium text-zinc-800">
                        {member.roleLabel}
                      </span>
                    )}

                    {canManageTeam && !member.isCurrentUser && (
                      <>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleToggleStatus(member)}
                          className="px-2.5 py-1.5 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-medium text-zinc-700 cursor-pointer disabled:opacity-50"
                        >
                          {member.status === "SUSPENDED" ? "Reactivate" : "Suspend"}
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleRemoveMember(member)}
                          className="p-1.5 rounded-md border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 cursor-pointer disabled:opacity-50"
                          title="Remove member"
                          aria-label={`Remove ${member.fullName}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Role Permissions Matrix Reference */}
      <div className="bg-white rounded-xl border border-zinc-200 p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
          <ShieldCheck className="h-4 w-4 text-zinc-700" />
          <div>
            <h3 className="text-sm font-semibold text-zinc-950">
              Role Capabilities Reference
            </h3>
            <p className="text-xs text-zinc-500">
              Every role below maps directly to server-enforced API permissions.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-200 text-zinc-500">
                <th className="py-2 pr-4 font-medium">Role &amp; Line of Defence</th>
                <th className="py-2 px-2 font-medium text-center">Campaigns</th>
                <th className="py-2 px-2 font-medium text-center">Rate Cards</th>
                <th className="py-2 px-2 font-medium text-center">Launch Gate</th>
                <th className="py-2 px-2 font-medium text-center">Campaign Sign-Off</th>
                <th className="py-2 px-2 font-medium text-center">Publish Rules</th>
                <th className="py-2 pl-2 font-medium text-center">Team &amp; Settings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {CANONICAL_ROLE_CATALOG.map((meta) => (
                <tr key={meta.role}>
                  <td className="py-2.5 pr-4">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-semibold text-zinc-950">{meta.label}</span>
                      <span className="font-mono text-[9.5px] font-semibold px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-700 border border-zinc-200">
                        {meta.defenceLineLabel}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">{meta.description}</div>
                  </td>
                  {[
                    meta.canCreateCampaigns,
                    meta.canManageProducts,
                    meta.canApproveFeatureGates,
                    meta.canApproveCampaigns,
                    meta.canPublishKnowledge,
                    meta.canManageTeamAndSettings,
                  ].map((allowed, idx) => (
                    <td key={idx} className="py-2.5 px-2 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                          allowed
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-zinc-100 text-zinc-400 border border-zinc-200"
                        }`}
                      >
                        {allowed ? "YES" : "NO"}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
