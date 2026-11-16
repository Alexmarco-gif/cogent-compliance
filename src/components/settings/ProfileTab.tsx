"use client";

import React, { useState, useEffect, useRef } from "react";
import { useClerk, useUser } from "@clerk/nextjs";
import {
  Camera,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  KeyRound,
  Save,
} from "lucide-react";
import type { AuthMeData } from "./types";

interface ProfileTabProps {
  authMe: AuthMeData | null;
}

export function ProfileTab({ authMe }: ProfileTabProps) {
  const { user } = useUser();
  const { openUserProfile } = useClerk();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [initialized, setInitialized] = useState(false);

  const [updatingAvatar, setUpdatingAvatar] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (user && !initialized) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      const meta = (user.unsafeMetadata || {}) as Record<string, unknown>;
      setJobTitle(typeof meta.jobTitle === "string" ? meta.jobTitle : "");
      setInitialized(true);
    }
  }, [user, initialized]);

  const displayName =
    [firstName, lastName].filter(Boolean).join(" ").trim() ||
    user?.fullName ||
    "Account";
  const initials =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("") || "U";

  const handleAvatarSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    setUpdatingAvatar(true);
    setFeedback(null);
    try {
      await user.setProfileImage({ file });
      setFeedback({ type: "success", text: "Profile photo updated." });
    } catch (err) {
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to upload profile photo.",
      });
    } finally {
      setUpdatingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user) return;
    setUpdatingAvatar(true);
    setFeedback(null);
    try {
      await user.setProfileImage({ file: null });
      setFeedback({ type: "success", text: "Profile photo removed." });
    } catch (err) {
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to remove profile photo.",
      });
    } finally {
      setUpdatingAvatar(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!firstName.trim()) {
      setFeedback({ type: "error", text: "First name is required." });
      return;
    }

    setSavingProfile(true);
    setFeedback(null);
    try {
      await user.update({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        unsafeMetadata: {
          ...(user.unsafeMetadata || {}),
          jobTitle: jobTitle.trim(),
        },
      });
      setFeedback({
        type: "success",
        text: "Personal details saved across your workspace.",
      });
    } catch (err) {
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to save profile details.",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const email = user?.primaryEmailAddress?.emailAddress || "";
  const roleMeta = authMe?.roleMetadata;

  return (
    <div className="space-y-6">
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

      {/* Profile Photo Card */}
      <div className="bg-white rounded-xl border border-zinc-200 p-6">
        <h3 className="text-sm font-semibold text-zinc-950">Profile Photo</h3>
        <p className="text-xs text-zinc-500 mt-0.5 mb-5">
          Your avatar appears in the workspace sidebar, team roster, and audit comments.
        </p>

        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarSelected}
            className="hidden"
          />
          {user?.hasImage && user.imageUrl ? (
            <img
              src={user.imageUrl}
              alt={displayName}
              className="h-16 w-16 rounded-full object-cover border border-zinc-200 shrink-0"
            />
          ) : (
            <div className="h-16 w-16 rounded-full bg-zinc-900 text-white text-lg font-semibold flex items-center justify-center shrink-0">
              {initials}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled={updatingAvatar}
              onClick={() => avatarInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
            >
              <Camera className="h-3.5 w-3.5" />
              <span>
                {updatingAvatar
                  ? "Updating..."
                  : user?.hasImage
                    ? "Change Photo"
                    : "Upload Photo"}
              </span>
            </button>
            {user?.hasImage && (
              <button
                type="button"
                disabled={updatingAvatar}
                onClick={handleRemoveAvatar}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Remove Photo</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Personal Details Form */}
      <form
        onSubmit={handleSaveProfile}
        className="bg-white rounded-xl border border-zinc-200 p-6 space-y-5"
      >
        <div className="flex items-start justify-between gap-4 border-b border-zinc-100 pb-4">
          <div>
            <h3 className="text-sm font-semibold text-zinc-950">Personal Details</h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Update the display name and title shown across compliance records.
            </p>
          </div>
          <button
            type="button"
            onClick={() => openUserProfile()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-medium text-zinc-700 transition-colors cursor-pointer shrink-0"
          >
            <KeyRound className="h-3.5 w-3.5 text-zinc-500" />
            <span>Security &amp; Password</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-zinc-700">
              First Name <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-md border border-zinc-300 text-sm text-zinc-950 focus:outline-none focus:border-zinc-900"
              placeholder="First name"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-zinc-700">
              Last Name
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-md border border-zinc-300 text-sm text-zinc-950 focus:outline-none focus:border-zinc-900"
              placeholder="Last name"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-zinc-700">
              Job Title / Department
            </label>
            <input
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              className="w-full px-3.5 py-2 rounded-md border border-zinc-300 text-sm text-zinc-950 focus:outline-none focus:border-zinc-900"
              placeholder="e.g. Head of Product Marketing"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-zinc-700">
              Account Email (Read-only)
            </label>
            <input
              type="text"
              value={email || "Signed-in account"}
              disabled
              className="w-full px-3.5 py-2 rounded-md border border-zinc-200 bg-zinc-50 text-sm text-zinc-500 cursor-not-allowed"
            />
          </div>
        </div>

        <div className="pt-2 flex justify-end border-t border-zinc-100">
          <button
            type="submit"
            disabled={savingProfile}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{savingProfile ? "Saving..." : "Save Personal Details"}</span>
          </button>
        </div>
      </form>

      {/* Active Workspace Role & Permissions Card */}
      <div className="bg-white rounded-xl border border-zinc-200 p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-zinc-700" />
            <div>
              <h3 className="text-sm font-semibold text-zinc-950">
                Your Active Workspace Role
              </h3>
              <p className="text-xs text-zinc-500">
                Capabilities enforced server-side for {authMe?.orgName || "this workspace"}.
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-zinc-900 text-white shrink-0">
            {roleMeta?.label || authMe?.role || "Loading..."}
          </span>
        </div>

        {roleMeta && (
          <>
            <p className="text-xs text-zinc-600 leading-relaxed">
              {roleMeta.description}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {[
                { label: "Create & Audit Campaigns", enabled: roleMeta.canCreateCampaigns },
                { label: "Manage Product Rate Cards", enabled: roleMeta.canManageProducts },
                { label: "Final Approval Sign-Off", enabled: roleMeta.canApproveCampaigns },
                { label: "Publish Compliance Playbooks", enabled: roleMeta.canPublishKnowledge },
                { label: "Manage Team & Settings", enabled: roleMeta.canManageTeamAndSettings },
              ].map((cap) => (
                <span
                  key={cap.label}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium border ${
                    cap.enabled
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-zinc-50 text-zinc-400 border-zinc-200 line-through"
                  }`}
                >
                  {cap.label}
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
