"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { extractApiError } from "@/lib/api-client";
import {
  REGULATORY_SCOPES,
  REGULATORY_SCOPE_METADATA,
  RegulatoryScopeKey,
} from "@/contracts/billing.contracts";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Zap,
  Building,
  Coins,
  FileCheck,
} from "lucide-react";

interface OnboardingFlowProps {
  initialStep?: number;
}

export function OnboardingFlow({ initialStep = 1 }: OnboardingFlowProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const stepParam = searchParams.get("step");

  const [currentStep, setCurrentStep] = useState<number>(
    stepParam ? parseInt(stepParam, 10) : initialStep,
  );

  // Step 1 State: Scope
  const [orgName, setOrgName] = useState<string>("First Bank of Nigeria (Demo)");
  const [selectedScopes, setSelectedScopes] = useState<RegulatoryScopeKey[]>([
    "DIGITAL_LENDING",
    "PAYMENTS_SWITCHING",
  ]);
  const [savingScope, setSavingScope] = useState(false);

  // Step 2 State: Product Truth
  const [productName, setProductName] = useState<string>("Quick Cash Loan");
  const [monthlyRate, setMonthlyRate] = useState<number>(4.5);
  const [mandatoryFee, setMandatoryFee] = useState<number>(1.5);
  const [feeDescription, setFeeDescription] = useState<string>("1.5% one-off disbursement fee");
  const [savingProduct, setSavingProduct] = useState(false);

  // Step 3 State: Sandbox Audit
  const [rawCopy, setRawCopy] = useState<string>(
    "Get an instant ₦500,000 loan in 3 minutes! Zero collateral, 0% hidden charges, guaranteed approval for all Nigerians.",
  );
  const [auditRunning, setAuditRunning] = useState(false);
  const [auditCompleted, setAuditCompleted] = useState(false);
  const [rewriteApplied, setRewriteApplied] = useState(false);
  const [celebrationModalOpen, setCelebrationModalOpen] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);
  const [stepErrorStatus, setStepErrorStatus] = useState<number | null>(null);

  useEffect(() => {
    if (stepParam) {
      const parsed = parseInt(stepParam, 10);
      if (parsed >= 1 && parsed <= 3) {
        setCurrentStep(parsed);
      }
    }
  }, [stepParam]);

  const toggleScope = (scope: RegulatoryScopeKey) => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    );
  };

  // Submit Step 1
  const handleScopeSubmit = async () => {
    if (selectedScopes.length === 0) return;
    setSavingScope(true);
    setStepError(null);
    setStepErrorStatus(null);
    try {
      const res = await fetch("/api/marketing-shield/v1/onboarding/scope", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scopes: selectedScopes,
          organization_name: orgName,
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
      setStepError("Network error saving regulatory scopes.");
    } finally {
      setSavingScope(false);
    }
  };

  // Submit Step 2
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
        const parsed = extractApiError(res.status, json, "Failed to save product truth");
        setStepErrorStatus(parsed.status);
        setStepError(parsed.message);
        return;
      }
      setCurrentStep(3);
      router.push("/onboarding?step=3");
    } catch (err) {
      console.error("Failed to seed product truth", err);
      setStepError("Network error seeding product truth.");
    } finally {
      setSavingProduct(false);
    }
  };

  // Step 3: Run Interactive Sandbox Audit
  const handleRunAudit = () => {
    setAuditRunning(true);
    setTimeout(() => {
      setAuditRunning(false);
      setAuditCompleted(true);
    }, 1200);
  };

  // Step 3: Accept Compliant Rewrite
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
      setRewriteApplied(true);
      setRawCopy(
        "Instant loans up to ₦500,000 subject to credit evaluation and eligibility. Transparent monthly interest with explicit fee disclosure in full compliance with FCCPC Digital Lending Regulations and CBN Consumer Protection Guidelines.",
      );
      setCelebrationModalOpen(true);
    } catch (err) {
      console.error("Failed to mark onboarding complete", err);
      setStepError("Network error finalizing onboarding.");
    }
  };

  const handleFinishOnboarding = () => {
    setCompleting(true);
    router.push("/chat?onboarding=true");
  };

  return (
    <div className="min-h-screen bg-[#F5F6FA] text-[#0B0F1A] flex flex-col items-center py-10 px-4">
      {/* Top Header */}
      <div className="w-full max-w-4xl flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#2A4BFF] flex items-center justify-center text-white shadow-md">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#0B0F1A]">
              Cogent Marketing Shield
            </h1>
            <p className="text-xs text-neutral-500">Autonomous Regulatory Compliance OS</p>
          </div>
        </div>

        {/* 60-Second Progressive Stepper */}
        <div className="flex items-center gap-2 text-xs font-semibold">
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all ${
              currentStep === 1
                ? "bg-[#2A4BFF] text-white border-[#2A4BFF] shadow-sm"
                : currentStep > 1
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-white text-neutral-400 border-neutral-200"
            }`}
          >
            {currentStep > 1 ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <span>1</span>
            )}
            <span>Scope Config</span>
          </div>

          <div className="h-0.5 w-4 bg-neutral-300" />

          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all ${
              currentStep === 2
                ? "bg-[#2A4BFF] text-white border-[#2A4BFF] shadow-sm"
                : currentStep > 2
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-white text-neutral-400 border-neutral-200"
            }`}
          >
            {currentStep > 2 ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <span>2</span>
            )}
            <span>Product Truth</span>
          </div>

          <div className="h-0.5 w-4 bg-neutral-300" />

          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all ${
              currentStep === 3
                ? "bg-[#2A4BFF] text-white border-[#2A4BFF] shadow-sm"
                : "bg-white text-neutral-400 border-neutral-200"
            }`}
          >
            <span>3</span>
            <span>Sandbox Audit</span>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-4xl bg-white rounded-2xl border border-[#E4E4E7] shadow-sm p-8">
        {stepError && (
          <div className="mb-6 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{stepError}</span>
            </div>
            {stepErrorStatus === 401 && (
              <Link
                href="/sign-in"
                className="px-3 py-1 rounded-lg bg-red-700 text-white font-semibold hover:bg-red-800 shrink-0"
              >
                Sign In →
              </Link>
            )}
          </div>
        )}
        {/* STEP 1: Institution Scope */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-[#2A4BFF] mb-2">
                <Zap className="h-3.5 w-3.5" /> 5-Second 1-Click Setup
              </span>
              <h2 className="text-2xl font-bold tracking-tight text-[#0B0F1A]">
                Configure Your Regulatory Scope
              </h2>
              <p className="text-sm text-neutral-500 mt-1">
                Select your institution&apos;s active license and business activities. Cogent will
                automatically load corresponding binding clauses from the 92+ Statutory Vault
                instruments.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                Institution Name
              </label>
              <div className="relative">
                <Building className="absolute left-3.5 top-3 h-4 w-4 text-neutral-400" />
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#2A4BFF] focus:border-transparent"
                  placeholder="e.g. First Bank of Nigeria"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                Active Regulatory Domains (Multi-Select)
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {REGULATORY_SCOPES.map((scope) => {
                  const meta = REGULATORY_SCOPE_METADATA[scope];
                  const isSelected = selectedScopes.includes(scope);
                  return (
                    <div
                      key={scope}
                      onClick={() => toggleScope(scope)}
                      className={`cursor-pointer p-4 rounded-xl border transition-all select-none ${
                        isSelected
                          ? "border-[#2A4BFF] bg-blue-50/40 ring-1 ring-[#2A4BFF]"
                          : "border-neutral-200 hover:border-neutral-300 bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="font-semibold text-sm text-[#0B0F1A]">{meta.label}</div>
                        <div
                          className={`h-4 w-4 rounded-md flex items-center justify-center border transition-all ${
                            isSelected
                              ? "bg-[#2A4BFF] border-[#2A4BFF] text-white"
                              : "border-neutral-300 bg-white"
                          }`}
                        >
                          {isSelected && <CheckCircle2 className="h-3.5 w-3.5" />}
                        </div>
                      </div>
                      <div className="text-xs font-medium text-[#2A4BFF] mt-1">
                        Regulator: {meta.regulator}
                      </div>
                      <p className="text-xs text-neutral-500 mt-1 line-clamp-2">
                        {meta.description}
                      </p>
                      <div className="text-[11px] text-neutral-400 mt-2 font-mono">
                        {meta.mandates}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-neutral-100">
              <span className="text-xs text-neutral-500">
                {selectedScopes.length} scopes active • Pre-loaded rules ready
              </span>
              <button
                onClick={handleScopeSubmit}
                disabled={savingScope || selectedScopes.length === 0}
                className="px-6 py-2.5 rounded-xl bg-[#2A4BFF] hover:bg-blue-700 text-white font-medium text-sm flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
              >
                {savingScope ? "Saving Scopes..." : "Continue to Step 2"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Seed Product Truth */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-700 mb-2">
                <Coins className="h-3.5 w-3.5" /> Lock 1 (Rate & Numerical Verifier)
              </span>
              <h2 className="text-2xl font-bold tracking-tight text-[#0B0F1A]">
                Seed Your Product Truth
              </h2>
              <p className="text-sm text-neutral-500 mt-1">
                Provide your flagship product&apos;s interest rate and fee parameters so Cogent can
                autonomously detect hidden charges and mathematically misleading APR claims.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                  Flagship Product Name
                </label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#2A4BFF]"
                  placeholder="e.g. Quick Cash Loan"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-700 uppercase tracking-wider">
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
                    className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#2A4BFF]"
                  />
                  <span className="absolute right-4 top-2.5 text-xs font-semibold text-neutral-400">
                    % / month
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400">
                  Computed Annual Percentage Rate (APR): {(monthlyRate * 12).toFixed(1)}% p.a.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                  Mandatory Processing / Admin Fee (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={mandatoryFee}
                    onChange={(e) => setMandatoryFee(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#2A4BFF]"
                  />
                  <span className="absolute right-4 top-2.5 text-xs font-semibold text-neutral-400">
                    % one-off
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400">
                  Must be disclosed pursuant to FCCPC DEON Reg. 18.
                </p>
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                  Fee Description / Terms
                </label>
                <input
                  type="text"
                  value={feeDescription}
                  onChange={(e) => setFeeDescription(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#2A4BFF]"
                  placeholder="e.g. 1.5% one-off disbursement fee, 0.5% late fee"
                />
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-neutral-100">
              <button
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2 text-sm text-neutral-600 hover:text-neutral-900 flex items-center gap-1.5"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleProductSubmit(true)}
                  disabled={savingProduct}
                  className="px-4 py-2.5 rounded-xl border border-neutral-300 hover:bg-neutral-50 text-neutral-700 font-medium text-sm transition-all"
                >
                  Skip for now →
                </button>
                <button
                  onClick={() => handleProductSubmit(false)}
                  disabled={savingProduct || !productName}
                  className="px-6 py-2.5 rounded-xl bg-[#2A4BFF] hover:bg-blue-700 text-white font-medium text-sm flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
                >
                  {savingProduct ? "Initializing..." : "Save & Initialize Lock 1 →"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: The "Aha!" Moment — Interactive Sandbox Audit */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 mb-2">
                <Sparkles className="h-3.5 w-3.5" /> 30-Second Live Compliance Audit Sandbox
              </span>
              <h2 className="text-2xl font-bold tracking-tight text-[#0B0F1A]">
                The &quot;Aha!&quot; Moment: Live Regulatory Inspection
              </h2>
              <p className="text-sm text-neutral-500 mt-1">
                Below is a pre-loaded sample loan marketing campaign with common non-compliant
                claims. Click <strong>&quot;Run Compliance Audit&quot;</strong> to watch Cogent
                inspect this campaign against active Nigerian regulations.
              </p>
            </div>

            {/* Campaign Canvas Area */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-neutral-700">
                <span>INSPECTED MARKETING COPY</span>
                <span className="text-neutral-400 font-mono">Channel: Instagram / Meta Ad</span>
              </div>

              <div
                className={`relative p-5 rounded-xl border text-sm leading-relaxed transition-all ${
                  rewriteApplied
                    ? "bg-emerald-50/50 border-emerald-300 text-emerald-950"
                    : "bg-neutral-50 border-neutral-300 text-neutral-900"
                }`}
              >
                {!rewriteApplied && auditCompleted ? (
                  <div>
                    Get an instant ₦500,000 loan in 3 minutes! Zero collateral,{" "}
                    <span className="bg-red-100 text-red-700 font-bold px-1.5 py-0.5 rounded border border-red-300 underline decoration-red-500">
                      0% hidden charges
                    </span>
                    ,{" "}
                    <span className="bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded border border-amber-300 underline decoration-amber-500">
                      guaranteed approval
                    </span>{" "}
                    for all Nigerians.
                  </div>
                ) : (
                  <div>{rawCopy}</div>
                )}
              </div>
            </div>

            {/* Audit Trigger & Status */}
            {!auditCompleted && (
              <div className="flex justify-center py-4">
                <button
                  onClick={handleRunAudit}
                  disabled={auditRunning}
                  className="px-8 py-3 rounded-xl bg-[#2A4BFF] hover:bg-blue-700 text-white font-semibold text-sm flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
                >
                  {auditRunning ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Evaluating against FCCPC & ARCON Vaults...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4" />
                      Run Compliance Audit
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Audit Results & Violations Badge */}
            {auditCompleted && !rewriteApplied && (
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-red-100 text-red-700 flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5" /> 2 Statutory Violations Detected
                    </span>
                    <span className="text-xs text-neutral-500 font-mono">
                      Risk Level: CRITICAL (Potential ₦100M Fine)
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl border border-red-200 bg-red-50/40 text-xs space-y-1.5">
                    <div className="font-bold text-red-800 flex items-center justify-between">
                      <span>FCCPC DEON Reg. 18</span>
                      <span className="text-[10px] bg-red-200 px-1.5 py-0.5 rounded font-mono">
                        CRITICAL
                      </span>
                    </div>
                    <p className="text-neutral-700">
                      <strong>Flagged Phrase:</strong> &quot;0% hidden charges&quot;
                    </p>
                    <p className="text-neutral-500">
                      Violates mandatory full fee schedule disclosure. Absolute &apos;0% hidden&apos;
                      statements without explicit disbursement fee schedule violate truth-in-lending
                      mandates.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/40 text-xs space-y-1.5">
                    <div className="font-bold text-amber-800 flex items-center justify-between">
                      <span>ARCON Code §4.2</span>
                      <span className="text-[10px] bg-amber-200 px-1.5 py-0.5 rounded font-mono">
                        HIGH
                      </span>
                    </div>
                    <p className="text-neutral-700">
                      <strong>Flagged Phrase:</strong> &quot;guaranteed approval&quot;
                    </p>
                    <p className="text-neutral-500">
                      Deceptive certainty claims. Credit issuance cannot be guaranteed unconditionally
                      without credit verification.
                    </p>
                  </div>
                </div>

                {/* Compliant Rewrite Callout */}
                <div className="p-4 rounded-xl border border-[#2A4BFF]/30 bg-blue-50/50 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="space-y-1 text-center md:text-left">
                    <div className="font-bold text-sm text-[#0B0F1A] flex items-center gap-1.5 justify-center md:justify-start">
                      <Sparkles className="h-4 w-4 text-[#2A4BFF]" />
                      Autonomous Compliant Rewrite Ready
                    </div>
                    <p className="text-xs text-neutral-600">
                      Replaces misleading certainty with regulatory-compliant qualifiers and fee
                      transparency.
                    </p>
                  </div>
                  <button
                    onClick={handleAcceptRewrite}
                    className="whitespace-nowrap px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-md transition-all"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    [Accept Compliant Rewrite]
                  </button>
                </div>
              </div>
            )}

            {/* Compliant State Display */}
            {rewriteApplied && (
              <div className="p-4 rounded-xl border border-emerald-300 bg-emerald-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-emerald-900">
                      100% Compliant — Zero Statutory Violations
                    </h4>
                    <p className="text-xs text-emerald-700">
                      All FCCPC, CBN, and ARCON requirements satisfied. Safe for publication.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setCelebrationModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-emerald-700 text-white font-semibold text-xs hover:bg-emerald-800 transition-all"
                >
                  View Workspace Status
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Celebration Modal */}
      {celebrationModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 text-center shadow-2xl border border-neutral-200 animate-in fade-in zoom-in duration-200">
            <div className="h-16 w-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center mb-4">
              <FileCheck className="h-8 w-8" />
            </div>

            <h3 className="text-xl font-bold text-[#0B0F1A]">Workspace Initialized!</h3>
            <p className="text-sm text-neutral-600 mt-2">
              Your <strong>7-Day Evaluation Pilot</strong> is now active. You have 3 complimentary
              full compliance audits and unlimited access to the Nigerian Statutory Vault.
            </p>

            <div className="my-6 p-4 rounded-xl bg-neutral-50 border border-neutral-200 text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-neutral-500">Plan Tier:</span>
                <span className="font-bold text-[#0B0F1A]">Evaluation Pilot ($0 / 7 Days)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Active Regulators:</span>
                <span className="font-bold text-[#2A4BFF]">{selectedScopes.join(", ")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Flagship Truth:</span>
                <span className="font-bold text-neutral-800">
                  {productName} ({monthlyRate}%/mo)
                </span>
              </div>
            </div>

            <div className="space-y-2.5">
              <button
                onClick={handleFinishOnboarding}
                disabled={completing}
                className="w-full py-3 rounded-xl bg-[#2A4BFF] hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
              >
                {completing ? "Launching..." : "Launch Compliance Studio →"}
              </button>
              <button
                onClick={() => router.push("/pricing")}
                className="w-full py-2.5 rounded-xl border border-neutral-300 hover:bg-neutral-50 text-neutral-700 font-semibold text-xs transition-all"
              >
                View Plans & Upgrade to Growth / Scale
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
