"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useOrganization } from "@clerk/nextjs";
import { WorkspaceOrgPanel } from "@/components/auth/WorkspaceOrgPanel";
import {
  Building2,
  MapPin,
  Camera,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Save,
  Check,
  ArrowRightLeft,
  Sliders,
  X,
} from "lucide-react";
import {
  REGULATORY_SCOPES,
  REGULATORY_SCOPE_METADATA,
  RegulatoryScopeKey,
} from "@/contracts/billing.contracts";
import type { WorkspaceSettingsData } from "./types";

interface OrganizationTabProps {
  workspace: WorkspaceSettingsData | null;
  onUpdated: (updated: WorkspaceSettingsData) => void;
}

const TIMEZONE_OPTIONS = [
  "Africa/Lagos",
  "Africa/Accra",
  "Africa/Nairobi",
  "Africa/Johannesburg",
  "Europe/London",
  "UTC",
];

function fileToBoundedDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (result.length > 260_000) {
        reject(new Error("Logo file is too large (max ~180KB image). Please choose a smaller PNG/JPG."));
        return;
      }
      resolve(result);
    };
    reader.onerror = () => reject(new Error("Failed to read logo file."));
    reader.readAsDataURL(file);
  });
}

export function OrganizationTab({ workspace, onUpdated }: OrganizationTabProps) {
  const { organization } = useOrganization();
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [orgName, setOrgName] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [regulatorLicenseId, setRegulatorLicenseId] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [timezone, setTimezone] = useState("Africa/Lagos");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const [country, setCountry] = useState("Nigeria");
  const [stateRegion, setStateRegion] = useState("");
  const [city, setCity] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [officeSuite, setOfficeSuite] = useState("");
  const [postalCode, setPostalCode] = useState("");

  const [activeScopes, setActiveScopes] = useState<RegulatoryScopeKey[]>(["DIGITAL_LENDING"]);

  const [saving, setSaving] = useState(false);
  const [updatingLogo, setUpdatingLogo] = useState(false);
  const [orgSwitcherOpen, setOrgSwitcherOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(
    null,
  );

  useEffect(() => {
    if (!workspace) return;
    setOrgName(workspace.organizationName || "");
    const p = workspace.organizationProfile;
    setRegistrationNumber(p.registration_number || "");
    setRegulatorLicenseId(p.regulator_license_id || "");
    setPhone(p.phone || "");
    setEmail(p.email || "");
    setWebsite(p.website || "");
    setTimezone(p.timezone || "Africa/Lagos");
    setLogoUrl(p.logo_url ?? p.clerkLogoUrl ?? null);

    setCountry(p.address?.country || "Nigeria");
    setStateRegion(p.address?.state_region || "");
    setCity(p.address?.city || "");
    setStreetAddress(p.address?.street_address || "");
    setOfficeSuite(p.address?.office_suite || "");
    setPostalCode(p.address?.postal_code || "");

    const validScopes = workspace.activeRegulatoryScopes.filter((s): s is RegulatoryScopeKey =>
      (REGULATORY_SCOPES as readonly string[]).includes(s),
    );
    setActiveScopes(validScopes.length > 0 ? validScopes : ["DIGITAL_LENDING"]);
  }, [workspace]);

  const canManage = workspace?.canManageWorkspace ?? false;

  const toggleScope = (scope: RegulatoryScopeKey) => {
    if (!canManage) return;
    setActiveScopes((prev) => {
      if (prev.includes(scope)) {
        return prev.length > 1 ? prev.filter((s) => s !== scope) : prev;
      }
      return [...prev, scope];
    });
  };

  const handleLogoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !canManage) return;

    setUpdatingLogo(true);
    setFeedback(null);
    try {
      const dataUrl = await fileToBoundedDataUrl(file);
      if (organization) {
        try {
          await organization.setLogo({ file });
        } catch {
          // Proceed with Supabase settings storage even if Clerk rejects
        }
      }

      const res = await fetch("/api/marketing-shield/v1/settings/workspace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organization_profile: { logo_url: dataUrl },
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to save organization logo.");
      }
      setLogoUrl(dataUrl);
      onUpdated(json.data);
      setFeedback({ type: "success", text: "Organization logo updated." });
    } catch (err) {
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to update organization logo.",
      });
    } finally {
      setUpdatingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!canManage) return;
    setUpdatingLogo(true);
    setFeedback(null);
    try {
      if (organization) {
        try {
          await organization.setLogo({ file: null });
        } catch {
          // Continue clearing workspace profile URL
        }
      }

      const res = await fetch("/api/marketing-shield/v1/settings/workspace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organization_profile: { logo_url: null },
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to remove organization logo.");
      }
      setLogoUrl(null);
      onUpdated(json.data);
      setFeedback({ type: "success", text: "Organization logo removed." });
    } catch (err) {
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to remove logo.",
      });
    } finally {
      setUpdatingLogo(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    if (!orgName.trim() || orgName.trim().length < 2) {
      setFeedback({ type: "error", text: "Organization name must be at least 2 characters." });
      return;
    }

    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/marketing-shield/v1/settings/workspace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organization_name: orgName.trim(),
          active_regulatory_scopes: activeScopes,
          organization_profile: {
            registration_number: registrationNumber.trim(),
            regulator_license_id: regulatorLicenseId.trim(),
            phone: phone.trim(),
            email: email.trim(),
            website: website.trim(),
            timezone,
            address: {
              country: country.trim() || "Nigeria",
              state_region: stateRegion.trim(),
              city: city.trim(),
              street_address: streetAddress.trim(),
              office_suite: officeSuite.trim(),
              postal_code: postalCode.trim(),
            },
          },
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        setFeedback({
          type: "error",
          text: json.error?.message || "Failed to save organization settings.",
        });
        return;
      }
      onUpdated(json.data);
      setFeedback({
        type: "success",
        text: "Organization details, business address, and regulatory scopes saved.",
      });
    } catch {
      setFeedback({ type: "error", text: "Network error saving organization settings." });
    } finally {
      setSaving(false);
    }
  };

  const orgInitial = (orgName || "O")[0]?.toUpperCase() || "O";

  return (
    <div className="space-y-6">
      {!canManage && (
        <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
          <span>
            Organization configuration is read-only for your role. Contact your <strong>Chief Compliance Officer</strong> or <strong>Workspace Admin</strong> to modify these details.
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

      {/* Quick Workspace Context Bar (Switch Org + Re-run Onboarding Wizard) */}
      <div className="bg-white rounded-xl border border-zinc-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
            Active Workspace
          </div>
          <div className="text-sm font-semibold text-zinc-950 mt-0.5">
            {workspace?.organizationName || organization?.name || "Current Organization"}
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Switch between institutions, create a new workspace, or re-run the guided setup wizard.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setOrgSwitcherOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-medium text-zinc-800 transition-colors cursor-pointer"
          >
            <ArrowRightLeft className="h-3.5 w-3.5 text-zinc-500" />
            <span>Switch / Create Org</span>
          </button>
          <Link
            href="/onboarding?step=1"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-medium text-zinc-800 transition-colors"
          >
            <Sliders className="h-3.5 w-3.5 text-zinc-500" />
            <span>Setup Wizard</span>
          </Link>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Card 1: Organization Details */}
        <div className="bg-white rounded-xl border border-zinc-200 p-6 space-y-5">
          <div className="flex items-center gap-2 border-b border-zinc-100 pb-4">
            <Building2 className="h-4 w-4 text-zinc-700" />
            <div>
              <h3 className="text-sm font-semibold text-zinc-950">Organization Details</h3>
              <p className="text-xs text-zinc-500">
                Institutional identity, license references, and official contact metadata.
              </p>
            </div>
          </div>

          {/* Organization Logo */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoSelected}
              className="hidden"
            />
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={orgName}
                className="h-14 w-14 rounded-lg object-cover border border-zinc-200 bg-white shrink-0"
              />
            ) : (
              <div className="h-14 w-14 rounded-lg bg-zinc-900 text-white text-lg font-semibold flex items-center justify-center shrink-0">
                {orgInitial}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={!canManage || updatingLogo}
                onClick={() => logoInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-300 bg-white hover:bg-zinc-50 text-xs font-medium text-zinc-800 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Camera className="h-3.5 w-3.5 text-zinc-500" />
                <span>{updatingLogo ? "Saving..." : logoUrl ? "Change Logo" : "Upload Logo"}</span>
              </button>
              {logoUrl && canManage && (
                <button
                  type="button"
                  disabled={updatingLogo}
                  onClick={handleRemoveLogo}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-rose-200 bg-white hover:bg-rose-50 text-xs font-medium text-rose-700 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Remove Logo</span>
                </button>
              )}
              <span className="text-[11px] text-zinc-500 w-full">
                Appears on compliance PDF dossiers and executive sign-off certificates.
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="block text-xs font-medium text-zinc-700">
                Organization Name <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                value={orgName}
                disabled={!canManage}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-md border border-zinc-300 text-sm focus:outline-none focus:border-zinc-900 disabled:bg-zinc-50"
                placeholder="e.g. Zenith Digital Microfinance Bank"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-zinc-700">
                CAC / Registration Number
              </label>
              <input
                type="text"
                value={registrationNumber}
                disabled={!canManage}
                onChange={(e) => setRegistrationNumber(e.target.value)}
                className="w-full px-3.5 py-2 rounded-md border border-zinc-300 text-sm focus:outline-none focus:border-zinc-900 disabled:bg-zinc-50"
                placeholder="e.g. RC-1049281"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-zinc-700">
                Regulator License ID (CBN / FCCPC / SEC)
              </label>
              <input
                type="text"
                value={regulatorLicenseId}
                disabled={!canManage}
                onChange={(e) => setRegulatorLicenseId(e.target.value)}
                className="w-full px-3.5 py-2 rounded-md border border-zinc-300 text-sm focus:outline-none focus:border-zinc-900 disabled:bg-zinc-50"
                placeholder="e.g. FCCPC/MFB/2025/041"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-zinc-700">
                Official Contact Phone
              </label>
              <input
                type="text"
                value={phone}
                disabled={!canManage}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2 rounded-md border border-zinc-300 text-sm focus:outline-none focus:border-zinc-900 disabled:bg-zinc-50"
                placeholder="+234 800 000 0000"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-zinc-700">
                Official Compliance Email
              </label>
              <input
                type="email"
                value={email}
                disabled={!canManage}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2 rounded-md border border-zinc-300 text-sm focus:outline-none focus:border-zinc-900 disabled:bg-zinc-50"
                placeholder="compliance@institution.com"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-zinc-700">Website</label>
              <input
                type="text"
                value={website}
                disabled={!canManage}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full px-3.5 py-2 rounded-md border border-zinc-300 text-sm focus:outline-none focus:border-zinc-900 disabled:bg-zinc-50"
                placeholder="https://institution.com"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-zinc-700">Timezone</label>
              <select
                value={timezone}
                disabled={!canManage}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-3.5 py-2 rounded-md border border-zinc-300 bg-white text-sm focus:outline-none focus:border-zinc-900 disabled:bg-zinc-50"
              >
                {TIMEZONE_OPTIONS.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Card 2: Business Address */}
        <div className="bg-white rounded-xl border border-zinc-200 p-6 space-y-5">
          <div className="flex items-center gap-2 border-b border-zinc-100 pb-4">
            <MapPin className="h-4 w-4 text-zinc-700" />
            <div>
              <h3 className="text-sm font-semibold text-zinc-950">Business Address</h3>
              <p className="text-xs text-zinc-500">
                Registered head office location for statutory disclosures.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-zinc-700">Country</label>
              <input
                type="text"
                value={country}
                disabled={!canManage}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full px-3.5 py-2 rounded-md border border-zinc-300 text-sm focus:outline-none focus:border-zinc-900 disabled:bg-zinc-50"
                placeholder="Nigeria"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-zinc-700">State / Region</label>
              <input
                type="text"
                value={stateRegion}
                disabled={!canManage}
                onChange={(e) => setStateRegion(e.target.value)}
                className="w-full px-3.5 py-2 rounded-md border border-zinc-300 text-sm focus:outline-none focus:border-zinc-900 disabled:bg-zinc-50"
                placeholder="e.g. Lagos State"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-zinc-700">City</label>
              <input
                type="text"
                value={city}
                disabled={!canManage}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3.5 py-2 rounded-md border border-zinc-300 text-sm focus:outline-none focus:border-zinc-900 disabled:bg-zinc-50"
                placeholder="e.g. Victoria Island"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-zinc-700">Postal Code</label>
              <input
                type="text"
                value={postalCode}
                disabled={!canManage}
                onChange={(e) => setPostalCode(e.target.value)}
                className="w-full px-3.5 py-2 rounded-md border border-zinc-300 text-sm focus:outline-none focus:border-zinc-900 disabled:bg-zinc-50"
                placeholder="e.g. 101241"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-zinc-700">Street Address</label>
              <input
                type="text"
                value={streetAddress}
                disabled={!canManage}
                onChange={(e) => setStreetAddress(e.target.value)}
                className="w-full px-3.5 py-2 rounded-md border border-zinc-300 text-sm focus:outline-none focus:border-zinc-900 disabled:bg-zinc-50"
                placeholder="e.g. 12 Adeola Odeku Street"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-zinc-700">
                Office / Suite / Floor
              </label>
              <input
                type="text"
                value={officeSuite}
                disabled={!canManage}
                onChange={(e) => setOfficeSuite(e.target.value)}
                className="w-full px-3.5 py-2 rounded-md border border-zinc-300 text-sm focus:outline-none focus:border-zinc-900 disabled:bg-zinc-50"
                placeholder="e.g. 4th Floor, Wing B"
              />
            </div>
          </div>
        </div>

        {/* Card 3: Active Regulatory Scopes */}
        <div className="bg-white rounded-xl border border-zinc-200 p-6 space-y-4">
          <div className="border-b border-zinc-100 pb-4">
            <h3 className="text-sm font-semibold text-zinc-950">Active Regulatory Scopes</h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Controls which Nigerian regulatory corpora and audit rule packs apply to your campaigns.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {REGULATORY_SCOPES.map((scope) => {
              const meta = REGULATORY_SCOPE_METADATA[scope];
              const isSelected = activeScopes.includes(scope);
              return (
                <button
                  key={scope}
                  type="button"
                  disabled={!canManage}
                  onClick={() => toggleScope(scope)}
                  className={`text-left p-3.5 rounded-xl border transition-colors ${
                    canManage ? "cursor-pointer" : "cursor-default"
                  } ${
                    isSelected
                      ? "border-zinc-950 bg-zinc-50"
                      : "border-zinc-200 hover:border-zinc-300 bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-xs font-semibold text-zinc-950">{meta.label}</div>
                    <div
                      className={`h-4 w-4 rounded flex items-center justify-center border shrink-0 ${
                        isSelected
                          ? "bg-zinc-900 border-zinc-900 text-white"
                          : "border-zinc-300 bg-white"
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                    </div>
                  </div>
                  <div className="text-[11px] font-medium text-zinc-700 mt-0.5">
                    {meta.regulator}
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-1 line-clamp-2">
                    {meta.mandates}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {canManage && (
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{saving ? "Saving..." : "Save Organization Settings"}</span>
            </button>
          </div>
        )}
      </form>

      {/* Switch / Create Organization Modal */}
      {orgSwitcherOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-zinc-200 shadow-2xl p-6 max-w-lg w-full space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h4 className="text-sm font-semibold text-zinc-950">
                  Switch or Create Organization
                </h4>
                <p className="text-xs text-zinc-500">
                  Select another workspace or provision a new institutional account.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOrgSwitcherOpen(false)}
                className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 cursor-pointer"
                aria-label="Close organization switcher"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="py-1">
              <WorkspaceOrgPanel
                afterCreateUrl="/onboarding"
                afterSelectUrl="/settings?tab=organization"
                onOrgActivated={() => {
                  setOrgSwitcherOpen(false);
                  window.location.href = "/settings?tab=organization";
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
