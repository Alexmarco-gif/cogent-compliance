"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth, useOrganization, useUser } from "@clerk/nextjs";
import { WorkspaceOrgPanel } from "@/components/auth/WorkspaceOrgPanel";
import { extractApiError } from "@/lib/api-client";
import { CogentLogo } from "@/components/brand/CogentLogo";
import {
  REGULATORY_SCOPES,
  REGULATORY_SCOPE_METADATA,
  RegulatoryScopeKey,
} from "@/contracts/billing.contracts";
import { CANONICAL_ROLE_CATALOG } from "@/modules/auth-tenancy/roles";
import type { CanonicalRole } from "@/modules/auth-tenancy/types";
import {
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Building,
  FileCheck,
  Check,
  Play,
  Camera,
  Trash2,
  User as UserIcon,
  ShieldCheck,
} from "lucide-react";

interface OnboardingFlowProps {
  initialStep?: number;
}

export function OnboardingFlow({ initialStep = 1 }: OnboardingFlowProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const stepParam = searchParams.get("step");
  const { isLoaded: clerkLoaded, isSignedIn, orgId } = useAuth();
  const { organization } = useOrganization();
  const { user } = useUser();

  const [currentStep, setCurrentStep] = useState<number>(
    stepParam ? parseInt(stepParam, 10) : initialStep
  );
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);

  // Step 1 State: Profile, Role, Org & Scope
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [profileInitialized, setProfileInitialized] = useState(false);
  const [updatingAvatar, setUpdatingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [creatorRole, setCreatorRole] = useState<CanonicalRole>("CHIEF_COMPLIANCE_OFFICER");
  const [orgName, setOrgName] = useState<string>("");
  const [selectedScopes, setSelectedScopes] = useState<RegulatoryScopeKey[]>([
    "DIGITAL_LENDING",
    "PAYMENTS_SWITCHING",
  ]);
  const [savingScope, setSavingScope] = useState(false);

  // Step 2 State: Product Schedule
  const [productName, setProductName] = useState<string>("Quick Cash Loan");
  const [monthlyRate, setMonthlyRate] = useState<number>(4.5);
  const [mandatoryFee, setMandatoryFee] = useState<number>(1.5);
  const [feeDescription, setFeeDescription] = useState<string>("1.5% one-off disbursement fee");
  const [savingProduct, setSavingProduct] = useState(false);

  // Step 3 State: Sample Review
  const [rawCopy, setRawCopy] = useState<string>(
    "Get an instant ₦500,000 loan in 3 minutes! Zero collateral, 0% hidden charges, guaranteed approval for all Nigerians."
  );
  const [auditRunning, setAuditRunning] = useState(false);
  const [auditCompleted, setAuditCompleted] = useState(false);
  const [rewriteApplied, setRewriteApplied] = useState(false);
  const [completionModalOpen, setCompletionModalOpen] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [subscriptionPlan, setSubscriptionPlan] = useState<{
    slug: string;
    name: string;
    isTrial: boolean;
    status: string;
  } | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);
  const [stepErrorStatus, setStepErrorStatus] = useState<number | null>(null);

  useEffect(() => {
    if (organization?.name && !orgName) {
      setOrgName(organization.name);
    }
  }, [organization?.name, orgName]);

  useEffect(() => {
    if (user && !profileInitialized) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      setProfileInitialized(true);
    }
  }, [user, profileInitialized]);

  useEffect(() => {
    if (stepParam) {
      const parsed = parseInt(stepParam, 10);
      if (parsed >= 1 && parsed <= 3) {
        setCurrentStep(parsed);
      }
    }
  }, [stepParam]);

  useEffect(() => {
    if (!clerkLoaded) return;
    if (!isSignedIn) {
      router.replace("/sign-in?redirect_url=/onboarding");
      return;
    }
    if (!orgId) return;

    let cancelled = false;
    fetch("/api/marketing-shield/v1/onboarding/status")
      .then((res) => (res.ok ? res.json() : null))
      .then((status) => {
        if (cancelled || !status) return;
        if (Array.isArray(status.activeScopes) && status.activeScopes.length > 0) {
          setSelectedScopes(status.activeScopes as RegulatoryScopeKey[]);
        }
        if (status.organizationName && !orgName) {
          setOrgName(status.organizationName);
        }
        if (status.subscriptionPlan) {
          setSubscriptionPlan(status.subscriptionPlan);
        }
        if (
          status.currentRole &&
          status.currentRole !== "WORKSPACE_ADMIN"
        ) {
          setCreatorRole(status.currentRole as CanonicalRole);
        }
        if (status.onboardingCompleted) {
          setAlreadyCompleted(true);
          if (!stepParam) {
            router.replace("/chat");
          }
        } else if (!stepParam && typeof status.stepCompleted === "number") {
          const nextStep = Math.min(3, Math.max(1, status.stepCompleted + 1));
          setCurrentStep(nextStep);
        }
      })
      .catch(() => {
        // Non-blocking status hydration
      });

    return () => {
      cancelled = true;
    };
  }, [clerkLoaded, isSignedIn, orgId, stepParam, router, orgName]);

  const toggleScope = (scope: RegulatoryScopeKey) => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  const handleAvatarSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    setUpdatingAvatar(true);
    setStepError(null);
    try {
      await user.setProfileImage({ file });
    } catch (err) {
      setStepError(
        err instanceof Error ? err.message : "Failed to upload profile image."
      );
    } finally {
      setUpdatingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user) return;
    setUpdatingAvatar(true);
    setStepError(null);
    try {
      await user.setProfileImage({ file: null });
    } catch (err) {
      setStepError(
        err instanceof Error ? err.message : "Failed to remove profile image."
      );
    } finally {
      setUpdatingAvatar(false);
    }
  };

  const handleScopeSubmit = async () => {
    if (selectedScopes.length === 0) return;
    if (!firstName.trim()) {
      setStepError("Please enter your first name so your team and audit log can identify you.");
      return;
    }
    setSavingScope(true);
    setStepError(null);
    setStepErrorStatus(null);
    try {
      if (user) {
        const nextFirst = firstName.trim();
        const nextLast = lastName.trim();
        if (nextFirst !== (user.firstName || "") || nextLast !== (user.lastName || "")) {
          await user.update({
            firstName: nextFirst,
            lastName: nextLast,
          });
        }
      }

      const res = await fetch("/api/marketing-shield/v1/onboarding/scope", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scopes: selectedScopes,
          organization_name: orgName.trim() || organization?.name || "Workspace",
          creator_role: creatorRole,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const parsed = extractApiError(res.status, json, "Failed to save regulatory scopes");
        setStepErrorStatus(parsed.status);
        setStepError(parsed.message);
        return;
      }
      setCurrentStep(2);
      router.push("/onboarding?step=2");
    } catch (err) {
      console.error("Failed to save scopes", err);
      setStepError("Network error saving workspace setup.");
    } finally {
      setSavingScope(false);
    }
  };

  const handleProductSubmit = async (skip = false) => {
    setSavingProduct(true);
    setStepError(null);
    setStepErrorStatus(null);
    try {
      const res = await fetch("/api/marketing-shield/v1/onboarding/product-truth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_name: skip ? "Sample Credit Facility" : productName,
          monthly_interest_rate_percent: skip ? 5.0 : monthlyRate,
          mandatory_fees_percent: skip ? 1.0 : mandatoryFee,
          fee_description: skip ? "1.0% processing fee" : feeDescription,
          skip,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const parsed = extractApiError(res.status, json, "Failed to save product schedule");
        setStepErrorStatus(parsed.status);
        setStepError(parsed.message);
        return;
      }
      setCurrentStep(3);
      router.push("/onboarding?step=3");
    } catch (err) {
      console.error("Failed to save product schedule", err);
      setStepError("Network error saving product schedule.");
    } finally {
      setSavingProduct(false);
    }
  };

  const handleRunAudit = () => {
    setAuditRunning(true);
    setTimeout(() => {
      setAuditRunning(false);
      setAuditCompleted(true);
    }, 900);
  };

  const handleAcceptRewrite = async () => {
    setStepError(null);
    setStepErrorStatus(null);
    try {
      const res = await fetch("/api/marketing-shield/v1/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const parsed = extractApiError(res.status, json, "Failed to finalize onboarding");
        setStepErrorStatus(parsed.status);
        setStepError(parsed.message);
        return;
      }
      if (json.subscriptionPlan) {
        setSubscriptionPlan(json.subscriptionPlan);
      }
      setRewriteApplied(true);
      setRawCopy(
        "Loans up to ₦500,000 subject to credit assessment and eligibility. 4.5% monthly interest with a 1.5% one-off disbursement fee. Regulated in Nigeria."
      );
      setCompletionModalOpen(true);
    } catch (err) {
      console.error("Failed to complete onboarding", err);
      setStepError("Network error completing setup.");
    }
  };

  const handleFinishOnboarding = () => {
    setCompleting(true);
    router.push("/chat?onboarding=true");
  };

  if (!clerkLoaded || !isSignedIn) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center text-[13px] font-medium text-zinc-500">
        Verifying session...
      </div>
    );
  }

  const userDisplayName =
    [firstName, lastName].filter(Boolean).join(" ").trim() ||
    user?.fullName ||
    "Account";
  const userInitials =
    userDisplayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() || "")
      .join("") || "U";

  if (!orgId) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] text-zinc-950 flex flex-col items-center py-10 px-4">
        <div className="w-full max-w-4xl flex items-center justify-between mb-8">
          <CogentLogo variant="dark" subtitle="Marketing Shield" />
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full border border-zinc-200 bg-white">
            {user?.hasImage && user.imageUrl ? (
              <img
                src={user.imageUrl}
                alt={userDisplayName}
                className="h-6 w-6 rounded-full object-cover"
              />
            ) : (
              <div className="h-6 w-6 rounded-full bg-zinc-900 text-white text-[10px] font-semibold flex items-center justify-center">
                {userInitials}
              </div>
            )}
            <span className="text-xs font-medium text-zinc-900">{userDisplayName}</span>
          </div>
        </div>

        <div className="w-full max-w-2xl bg-white rounded-xl border border-zinc-200 p-8 text-center space-y-6">
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-zinc-100 text-zinc-700 border border-zinc-200 mb-3">
              <Building className="h-3.5 w-3.5" /> Workspace Setup
            </span>
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-950">
              Create or Select Your Organization
            </h2>
            <p className="text-sm text-zinc-500 mt-1.5">
              Rate schedules, playbooks, and audit logs are isolated by organization. Select an existing workspace or create a new one below to continue.
            </p>
          </div>

          <WorkspaceOrgPanel
            afterCreateUrl="/onboarding"
            afterSelectUrl="/chat"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-zinc-950 flex flex-col items-center py-10 px-4">
      {/* Top Header */}
      <div className="w-full max-w-4xl flex flex-wrap items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <CogentLogo variant="dark" subtitle="Marketing Shield" />
        </div>

        <div className="flex items-center gap-3">
          {alreadyCompleted && (
            <Link
              href="/chat"
              className="px-3 py-1.5 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-medium text-zinc-700 transition-colors"
            >
              Return to Workspace →
            </Link>
          )}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full border border-zinc-200 bg-white">
            {user?.hasImage && user.imageUrl ? (
              <img
                src={user.imageUrl}
                alt={userDisplayName}
                className="h-6 w-6 rounded-full object-cover"
              />
            ) : (
              <div className="h-6 w-6 rounded-full bg-zinc-900 text-white text-[10px] font-semibold flex items-center justify-center">
                {userInitials}
              </div>
            )}
            <span className="text-xs font-medium text-zinc-900">{userDisplayName}</span>
          </div>
        </div>

        {/* Progressive Stepper */}
        <div className="flex items-center gap-2 text-xs font-medium">
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-colors ${
              currentStep === 1
                ? "bg-zinc-900 text-white border-zinc-900"
                : currentStep > 1
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-white text-zinc-400 border-zinc-200"
            }`}
          >
            {currentStep > 1 ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <span>1</span>
            )}
            <span>Profile &amp; Scope</span>
          </div>

          <div className="h-px w-4 bg-zinc-300" />

          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-colors ${
              currentStep === 2
                ? "bg-zinc-900 text-white border-zinc-900"
                : currentStep > 2
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-white text-zinc-400 border-zinc-200"
            }`}
          >
            {currentStep > 2 ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <span>2</span>
            )}
            <span>Products</span>
          </div>

          <div className="h-px w-4 bg-zinc-300" />

          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-colors ${
              currentStep === 3
                ? "bg-zinc-900 text-white border-zinc-900"
                : "bg-white text-zinc-400 border-zinc-200"
            }`}
          >
            <span>3</span>
            <span>Sample Review</span>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-4xl bg-white rounded-xl border border-zinc-200 p-8">
        {stepError && (
          <div className="mb-6 p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{stepError}</span>
            </div>
            {stepErrorStatus === 401 && (
              <Link
                href="/sign-in"
                className="px-3 py-1 rounded-md bg-zinc-900 text-white font-medium hover:bg-zinc-800 shrink-0"
              >
                Sign in
              </Link>
            )}
          </div>
        )}

        {/* STEP 1: Profile, Role & Regulatory Scope */}
        {currentStep === 1 && (
          <div className="space-y-7">
            <div>
              <span className="inline-block text-[11px] font-mono uppercase tracking-wider text-zinc-500 mb-1.5">
                Step 1 of 3
              </span>
              <h2 className="text-2xl font-semibold tracking-tight text-zinc-950">
                Set Up Your Profile, Role &amp; Scope
              </h2>
              <p className="text-sm text-zinc-500 mt-1">
                Tell us your name, choose your workspace role, and select the financial domains your organization operates in.
              </p>
            </div>

            {/* Personal Profile + Avatar */}
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-5 space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-900 uppercase tracking-wider">
                <UserIcon className="h-3.5 w-3.5 text-zinc-500" />
                <span>Your Profile</span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
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
                    alt={userDisplayName}
                    className="h-14 w-14 rounded-full object-cover border border-zinc-200 shrink-0"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-full bg-zinc-900 text-white text-base font-semibold flex items-center justify-center shrink-0">
                    {userInitials}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={updatingAvatar}
                    onClick={() => avatarInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-300 bg-white hover:bg-zinc-50 text-xs font-medium text-zinc-800 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Camera className="h-3.5 w-3.5 text-zinc-500" />
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
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-rose-200 bg-white hover:bg-rose-50 text-xs font-medium text-rose-700 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Remove</span>
                    </button>
                  )}
                  <span className="text-[11px] text-zinc-500 w-full">
                    Optional profile avatar shown in your workspace sidebar and team directory.
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-zinc-700">
                    First Name <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-zinc-300 bg-white text-sm focus:outline-none focus:border-zinc-900"
                    placeholder="e.g. Adaobi"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-zinc-700">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-zinc-300 bg-white text-sm focus:outline-none focus:border-zinc-900"
                    placeholder="e.g. Okafor"
                  />
                </div>
              </div>
            </div>

            {/* Functional Role Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-700">
                  <ShieldCheck className="h-3.5 w-3.5 text-zinc-500" />
                  <span>Your Functional Role in This Workspace</span>
                </label>
                <span className="text-[11px] text-zinc-500">
                  Determines campaign, product, approval &amp; team permissions
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {CANONICAL_ROLE_CATALOG.map((meta) => {
                  const isSelected = creatorRole === meta.role;
                  return (
                    <button
                      key={meta.role}
                      type="button"
                      onClick={() => setCreatorRole(meta.role)}
                      className={`text-left p-3.5 rounded-xl border transition-colors cursor-pointer ${
                        isSelected
                          ? "border-zinc-950 bg-zinc-50"
                          : "border-zinc-200 hover:border-zinc-300 bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-semibold text-[13px] text-zinc-950 truncate">
                            {meta.label}
                          </span>
                          {meta.recommendedForCreator && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                              Recommended
                            </span>
                          )}
                        </div>
                        <div
                          className={`h-4 w-4 rounded-full flex items-center justify-center border shrink-0 ${
                            isSelected
                              ? "bg-zinc-900 border-zinc-900 text-white"
                              : "border-zinc-300 bg-white"
                          }`}
                        >
                          {isSelected && <Check className="h-2.5 w-2.5" />}
                        </div>
                      </div>
                      <p className="text-[11.5px] text-zinc-500 mt-1 leading-relaxed">
                        {meta.description}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {meta.canCreateCampaigns && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-700">
                            Campaigns
                          </span>
                        )}
                        {meta.canManageProducts && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-700">
                            Rate Cards
                          </span>
                        )}
                        {meta.canApproveCampaigns && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">
                            Final Sign-Off
                          </span>
                        )}
                        {meta.canManageTeamAndSettings && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-700">
                            Team &amp; Settings
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-zinc-700">
                Organization Name
              </label>
              <div className="relative">
                <Building className="absolute left-3.5 top-3 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-md border border-zinc-300 text-sm focus:outline-none focus:border-zinc-900"
                  placeholder="e.g. Acme Microfinance Bank"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-zinc-700">
                Active Business Domains
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {REGULATORY_SCOPES.map((scope) => {
                  const meta = REGULATORY_SCOPE_METADATA[scope];
                  const isSelected = selectedScopes.includes(scope);
                  return (
                    <div
                      key={scope}
                      onClick={() => toggleScope(scope)}
                      className={`cursor-pointer p-4 rounded-xl border transition-colors select-none ${
                        isSelected
                          ? "border-zinc-950 bg-zinc-50"
                          : "border-zinc-200 hover:border-zinc-300 bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-semibold text-sm text-zinc-950">{meta.label}</div>
                        <div
                          className={`h-4 w-4 rounded flex items-center justify-center border transition-colors shrink-0 ${
                            isSelected
                              ? "bg-zinc-900 border-zinc-900 text-white"
                              : "border-zinc-300 bg-white"
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3" />}
                        </div>
                      </div>
                      <div className="text-xs font-medium text-zinc-700 mt-1">
                        {meta.regulator}
                      </div>
                      <p className="text-xs text-zinc-500 mt-1 line-clamp-2">
                        {meta.description}
                      </p>
                      <div className="text-[11px] text-zinc-400 mt-2 font-mono">
                        {meta.mandates}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-zinc-100">
              <span className="text-xs text-zinc-500">
                {selectedScopes.length} {selectedScopes.length === 1 ? "scope" : "scopes"} selected
              </span>
              <button
                type="button"
                onClick={handleScopeSubmit}
                disabled={savingScope || selectedScopes.length === 0}
                className="px-5 py-2.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-sm flex items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {savingScope ? "Saving..." : "Continue"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Add Flagship Product */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <span className="inline-block text-[11px] font-mono uppercase tracking-wider text-zinc-500 mb-1.5">
                Step 2 of 3
              </span>
              <h2 className="text-2xl font-semibold tracking-tight text-zinc-950">
                Add a Flagship Product Schedule
              </h2>
              <p className="text-sm text-zinc-500 mt-1">
                Enter your product&apos;s approved interest rate and fees so reviews verify advertised numbers against real terms.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 space-y-1.5">
                <label className="block text-xs font-medium text-zinc-700">
                  Product Name
                </label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-md border border-zinc-300 text-sm focus:outline-none focus:border-zinc-900"
                  placeholder="e.g. Quick Cash Loan"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-700">
                  Monthly Interest Rate (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={monthlyRate}
                    onChange={(e) => setMonthlyRate(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 rounded-md border border-zinc-300 text-sm focus:outline-none focus:border-zinc-900"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs font-medium text-zinc-400">
                    % / month
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 font-mono">
                  Equivalent APR: {(monthlyRate * 12).toFixed(1)}% p.a.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-700">
                  Processing / Admin Fee (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={mandatoryFee}
                    onChange={(e) => setMandatoryFee(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 rounded-md border border-zinc-300 text-sm focus:outline-none focus:border-zinc-900"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs font-medium text-zinc-400">
                    % one-off
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500">
                  Must be disclosed under FCCPC DEON Reg. 18.
                </p>
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <label className="block text-xs font-medium text-zinc-700">
                  Fee Terms Summary
                </label>
                <input
                  type="text"
                  value={feeDescription}
                  onChange={(e) => setFeeDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-md border border-zinc-300 text-sm focus:outline-none focus:border-zinc-900"
                  placeholder="e.g. 1.5% one-off disbursement fee, 0.5% late fee"
                />
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-900 flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleProductSubmit(true)}
                  disabled={savingProduct}
                  className="px-4 py-2 rounded-md border border-zinc-300 hover:bg-zinc-50 text-zinc-700 font-medium text-sm transition-colors cursor-pointer"
                >
                  Skip
                </button>
                <button
                  type="button"
                  onClick={() => handleProductSubmit(false)}
                  disabled={savingProduct || !productName}
                  className="px-5 py-2 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-sm flex items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {savingProduct ? "Saving..." : "Save & Continue"}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Sample Review */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <span className="inline-block text-[11px] font-mono uppercase tracking-wider text-zinc-500 mb-1.5">
                Step 3 of 3
              </span>
              <h2 className="text-2xl font-semibold tracking-tight text-zinc-950">
                Sample Campaign Review
              </h2>
              <p className="text-sm text-zinc-500 mt-1">
                Test how Cogent flags non-compliant claims in sample promotional copy and suggests an approved alternative.
              </p>
            </div>

            {/* Campaign Canvas Area */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-medium text-zinc-600">
                <span>Sample Copy</span>
                <span className="text-zinc-400 font-mono">Instagram / Meta Ad</span>
              </div>

              <div
                className={`relative p-5 rounded-lg border text-sm leading-relaxed transition-colors ${
                  rewriteApplied
                    ? "bg-emerald-50/50 border-emerald-200 text-emerald-950"
                    : "bg-zinc-50 border-zinc-200 text-zinc-900"
                }`}
              >
                {!rewriteApplied && auditCompleted ? (
                  <div>
                    Get an instant ₦500,000 loan in 3 minutes! Zero collateral,{" "}
                    <span className="bg-rose-100 text-rose-800 font-semibold px-1.5 py-0.5 rounded border border-rose-200 underline decoration-rose-500">
                      0% hidden charges
                    </span>
                    ,{" "}
                    <span className="bg-amber-100 text-amber-800 font-semibold px-1.5 py-0.5 rounded border border-amber-200 underline decoration-amber-500">
                      guaranteed approval
                    </span>{" "}
                    for all Nigerians.
                  </div>
                ) : (
                  <div>{rawCopy}</div>
                )}
              </div>
            </div>

            {/* Audit Trigger */}
            {!auditCompleted && (
              <div className="flex justify-center py-3">
                <button
                  type="button"
                  onClick={handleRunAudit}
                  disabled={auditRunning}
                  className="px-6 py-2.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-sm flex items-center gap-2 transition-colors cursor-pointer"
                >
                  {auditRunning ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Checking Copy...
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5" />
                      Run Sample Check
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Findings Breakdown */}
            {auditCompleted && !rewriteApplied && (
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" /> 2 Findings Flagged
                  </span>
                  <span className="text-xs text-zinc-500 font-mono">
                    Risk: CRITICAL
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-4 rounded-lg border border-rose-200 bg-rose-50/40 text-xs space-y-1.5">
                    <div className="font-semibold text-rose-900 flex items-center justify-between">
                      <span>FCCPC DEON Reg. 18</span>
                      <span className="text-[10px] bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded font-mono">
                        CRITICAL
                      </span>
                    </div>
                    <p className="text-zinc-800">
                      <strong>Phrase:</strong> &quot;0% hidden charges&quot;
                    </p>
                    <p className="text-zinc-600 leading-relaxed">
                      Conflicts with your 1.5% disbursement fee and fails full fee disclosure rules.
                    </p>
                  </div>

                  <div className="p-4 rounded-lg border border-amber-200 bg-amber-50/40 text-xs space-y-1.5">
                    <div className="font-semibold text-amber-900 flex items-center justify-between">
                      <span>ARCON Code §4.2</span>
                      <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-mono">
                        HIGH
                      </span>
                    </div>
                    <p className="text-zinc-800">
                      <strong>Phrase:</strong> &quot;guaranteed approval&quot;
                    </p>
                    <p className="text-zinc-600 leading-relaxed">
                      Credit approval cannot be advertised as guaranteed without credit eligibility checks.
                    </p>
                  </div>
                </div>

                {/* Compliant Rewrite Callout */}
                <div className="p-4 rounded-lg border border-zinc-200 bg-zinc-50 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="space-y-1 text-center md:text-left">
                    <div className="font-semibold text-sm text-zinc-950">
                      Compliant Rewrite Ready
                    </div>
                    <p className="text-xs text-zinc-600">
                      Replaces unverified certainty with clear eligibility wording and your actual fee schedule.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAcceptRewrite}
                    className="whitespace-nowrap px-5 py-2.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-xs flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Apply Compliant Rewrite
                  </button>
                </div>
              </div>
            )}

            {/* Compliant State Display */}
            {rewriteApplied && (
              <div className="p-4 rounded-lg border border-emerald-200 bg-emerald-50 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                    <Check className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-emerald-950">
                      Copy Updated
                    </h4>
                    <p className="text-xs text-emerald-800">
                      No open issues remaining against FCCPC, CBN, or ARCON baselines.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCompletionModalOpen(true)}
                  className="px-4 py-2 rounded-md bg-zinc-900 text-white font-medium text-xs hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
                >
                  Continue to Workspace
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Completion Modal */}
      {completionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 text-center shadow-2xl border border-zinc-200">
            <div className="h-12 w-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 mx-auto flex items-center justify-center mb-4">
              <FileCheck className="h-6 w-6" />
            </div>

            <h3 className="text-lg font-semibold text-zinc-950">Workspace Ready</h3>
            <p className="text-sm text-zinc-600 mt-1.5">
              {subscriptionPlan && !subscriptionPlan.isTrial
                ? `Your ${subscriptionPlan.name} workspace is active with full regulatory intelligence and team access.`
                : "Your 7-day evaluation includes 3 campaign reviews and access to Nigerian regulatory sources."}
            </p>

            <div className="my-5 p-4 rounded-lg bg-zinc-50 border border-zinc-200 text-left text-xs space-y-2">
              <div className="flex justify-between gap-2">
                <span className="text-zinc-500">Plan</span>
                <span className="font-semibold text-zinc-950">
                  {subscriptionPlan && !subscriptionPlan.isTrial
                    ? `${subscriptionPlan.name} (Active)`
                    : "Evaluation ($0 / 7 Days)"}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-zinc-500">Scopes</span>
                <span className="font-medium text-zinc-800 text-right">
                  {selectedScopes.join(", ")}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-zinc-500">Product</span>
                <span className="font-medium text-zinc-800">
                  {productName} ({monthlyRate}%/mo)
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={handleFinishOnboarding}
                disabled={completing}
                className="w-full py-2.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {completing ? "Opening Workspace..." : "Open Workspace"}
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => router.push("/pricing")}
                className="w-full py-2 rounded-md border border-zinc-200 hover:bg-zinc-50 text-zinc-700 font-medium text-xs transition-colors cursor-pointer"
              >
                Compare Plans
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
