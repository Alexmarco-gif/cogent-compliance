"use client";

import React, { useState } from "react";
import { X, Sparkles, ShieldCheck, Loader2 } from "lucide-react";
import type {
  ChangeClassification,
  FinancialActivityType,
  MaterialityTier,
  TargetMarket,
} from "@/contracts/feature-governance.contracts";

export interface CreateFeatureFormPayload {
  feature_name: string;
  summary: string;
  business_objective: string;
  financial_activity_type: FinancialActivityType;
  change_classification: ChangeClassification;
  materiality_tier: MaterialityTier;
  target_market: TargetMarket;
  revenue_model: string;
  third_party_dependencies: string[];
  auto_generate_controls: boolean;
}

interface NewFeatureModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateFeatureFormPayload) => Promise<void>;
}

const PRESETS: Array<{ label: string; data: Omit<CreateFeatureFormPayload, "auto_generate_controls"> }> = [
  {
    label: "Automated Recurring Payments",
    data: {
      feature_name: "Automated Recurring Payments (Standing Orders)",
      summary:
        "Allows individual and SME wallet/account holders to authorize automated recurring debits to pay bills, vendors, or other Nigerian bank accounts on scheduled dates with instant cancellation and pre-debit alerts.",
      business_objective:
        "Increase customer retention and predictable payment volume via automated standing-order transfers.",
      financial_activity_type: "RECURRING_DEBIT",
      change_classification: "NEW_FEATURE",
      materiality_tier: "HIGH",
      target_market: "INDIVIDUALS_AND_BUSINESSES",
      revenue_model: "₦50 flat processing fee per executed recurring transfer; ₦0 setup/cancellation fee.",
      third_party_dependencies: ["NIBSS NIP", "Sponsor Settlement Bank", "SMS/Email Notification Provider"],
    },
  },
  {
    label: "USD Virtual Card + BNPL",
    data: {
      feature_name: "USD Virtual Debit Card with 3-Installment BNPL",
      summary:
        "Customers fund a USD virtual debit card from Naira wallets for international online commerce and split eligible purchases into 3 monthly BNPL installments.",
      business_objective:
        "Capture cross-border digital commerce spend and expand consumer credit yield.",
      financial_activity_type: "CARD_ISSUANCE",
      change_classification: "NEW_PRODUCT",
      materiality_tier: "CRITICAL",
      target_market: "INDIVIDUALS",
      revenue_model: "FX spread + 1.5% card funding fee + 4% monthly BNPL interest.",
      third_party_dependencies: ["CBN-Licensed Card Issuing Bank", "Card Scheme (Mastercard/Visa)", "Credit Bureau"],
    },
  },
  {
    label: "Interbank Transfer Limit Increase",
    data: {
      feature_name: "Tier-2 & Tier-3 Interbank Transfer Limit Expansion",
      summary:
        "Material modification increasing single-transaction and daily cumulative NIP transfer ceilings for Tier-2 and Tier-3 verified business and retail accounts.",
      business_objective:
        "Support higher-value SME disbursements without manual ops overrides.",
      financial_activity_type: "PAYMENTS_TRANSFER",
      change_classification: "MATERIAL_MODIFICATION",
      materiality_tier: "HIGH",
      target_market: "BUSINESSES",
      revenue_model: "Standard CBN Guide to Charges NIP tiered transfer fee.",
      third_party_dependencies: ["NIBSS NIP", "Automated AML/CFT Transaction Monitoring Engine"],
    },
  },
];

export function NewFeatureModal({ open, onClose, onSubmit }: NewFeatureModalProps) {
  const [featureName, setFeatureName] = useState("");
  const [summary, setSummary] = useState("");
  const [businessObjective, setBusinessObjective] = useState("");
  const [activityType, setActivityType] = useState<FinancialActivityType>("RECURRING_DEBIT");
  const [changeClass, setChangeClass] = useState<ChangeClassification>("NEW_FEATURE");
  const [materiality, setMateriality] = useState<MaterialityTier>("HIGH");
  const [targetMarket, setTargetMarket] = useState<TargetMarket>("INDIVIDUALS_AND_BUSINESSES");
  const [revenueModel, setRevenueModel] = useState("");
  const [dependenciesText, setDependenciesText] = useState("NIBSS NIP, Sponsor Bank");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const applyPreset = (preset: (typeof PRESETS)[number]) => {
    setFeatureName(preset.data.feature_name);
    setSummary(preset.data.summary);
    setBusinessObjective(preset.data.business_objective);
    setActivityType(preset.data.financial_activity_type);
    setChangeClass(preset.data.change_classification);
    setMateriality(preset.data.materiality_tier);
    setTargetMarket(preset.data.target_market);
    setRevenueModel(preset.data.revenue_model);
    setDependenciesText(preset.data.third_party_dependencies.join(", "));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (featureName.trim().length < 3 || summary.trim().length < 10) {
      setError("Provide a feature name (3+ chars) and operational summary (10+ chars).");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        feature_name: featureName.trim(),
        summary: summary.trim(),
        business_objective: businessObjective.trim() || summary.trim().slice(0, 300),
        financial_activity_type: activityType,
        change_classification: changeClass,
        materiality_tier: materiality,
        target_market: targetMarket,
        revenue_model: revenueModel.trim(),
        third_party_dependencies: dependenciesText
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        auto_generate_controls: true,
      });
      onClose();
    } catch (err) {
      setError((err as Error).message || "Unable to create feature proposal.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 backdrop-blur-[1px] p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white border border-zinc-200 shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-zinc-200 bg-white">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[#1D4ED8]" />
              <h2 className="text-sm font-semibold text-zinc-950">
                New Product / Feature Proposal (Stage 1 Intake)
              </h2>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Auto-generates Multi-Domain RIA, Risk &amp; Control Matrix, Compliance-to-Build specs, and 10-Point Launch Gate.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Quick Nigerian Fintech Presets */}
          <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-600">
              <Sparkles className="h-3.5 w-3.5 text-[#1D4ED8]" />
              <span>Load Nigerian Fintech Reference Proposal:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="px-2.5 py-1 rounded-md bg-white border border-zinc-200 hover:border-[#1D4ED8] hover:text-[#1D4ED8] text-[11.5px] font-medium text-zinc-700 transition-colors cursor-pointer"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-700">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-800">Feature / Product Name *</label>
            <input
              type="text"
              value={featureName}
              onChange={(e) => setFeatureName(e.target.value)}
              placeholder="e.g., Automated Recurring Payments"
              className="w-full h-9 px-3 rounded-lg border border-zinc-300 text-xs text-zinc-900 focus:border-[#1D4ED8] outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-800">Financial Activity</label>
              <select
                value={activityType}
                onChange={(e) => setActivityType(e.target.value as FinancialActivityType)}
                className="w-full h-9 px-2.5 rounded-lg border border-zinc-300 text-xs text-zinc-900 bg-white outline-none"
              >
                <option value="RECURRING_DEBIT">Recurring Debit / Standing Order</option>
                <option value="PAYMENTS_TRANSFER">Payments &amp; Interbank Transfers</option>
                <option value="DIGITAL_LENDING_BNPL">Digital Lending / BNPL</option>
                <option value="CARD_ISSUANCE">Card Issuance (Virtual / Physical)</option>
                <option value="FX_CROSS_BORDER">FX &amp; Cross-Border Remittance</option>
                <option value="WALLET_DEPOSIT_SAVINGS">Wallets, Deposits &amp; Savings</option>
                <option value="INVESTMENT_WEALTHTECH">Investment / WealthTech</option>
                <option value="AGENCY_BANKING">Agency Banking / POS</option>
                <option value="OPEN_BANKING_API">Open Banking API</option>
                <option value="OTHER_FINANCIAL_SERVICE">Other Financial Service</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-800">Change Classification</label>
              <select
                value={changeClass}
                onChange={(e) => setChangeClass(e.target.value as ChangeClassification)}
                className="w-full h-9 px-2.5 rounded-lg border border-zinc-300 text-xs text-zinc-900 bg-white outline-none"
              >
                <option value="NEW_PRODUCT">New Product</option>
                <option value="NEW_FEATURE">New Feature</option>
                <option value="MATERIAL_MODIFICATION">Material Modification</option>
                <option value="MINOR_CHANGE">Minor Change</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-800">Materiality Tier</label>
              <select
                value={materiality}
                onChange={(e) => setMateriality(e.target.value as MaterialityTier)}
                className="w-full h-9 px-2.5 rounded-lg border border-zinc-300 text-xs text-zinc-900 bg-white outline-none"
              >
                <option value="CRITICAL">CRITICAL (Full 3LoD Gate)</option>
                <option value="HIGH">HIGH (Mandatory Controls)</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-800">Operational &amp; Customer Scope *</label>
            <textarea
              rows={3}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Describe what financial activity this enables, how funds move, and who uses it..."
              className="w-full p-3 rounded-lg border border-zinc-300 text-xs text-zinc-900 focus:border-[#1D4ED8] outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-800">Business Objective</label>
              <input
                type="text"
                value={businessObjective}
                onChange={(e) => setBusinessObjective(e.target.value)}
                placeholder="Why are we introducing this feature?"
                className="w-full h-9 px-3 rounded-lg border border-zinc-300 text-xs text-zinc-900 outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-800">Target Market</label>
              <select
                value={targetMarket}
                onChange={(e) => setTargetMarket(e.target.value as TargetMarket)}
                className="w-full h-9 px-2.5 rounded-lg border border-zinc-300 text-xs text-zinc-900 bg-white outline-none"
              >
                <option value="INDIVIDUALS_AND_BUSINESSES">Individuals &amp; Businesses</option>
                <option value="INDIVIDUALS">Individuals (Retail)</option>
                <option value="BUSINESSES">Businesses (SME / Corporate)</option>
                <option value="AGENTS_MERCHANTS">Agents &amp; Merchants</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-800">Revenue / Fee Model</label>
              <input
                type="text"
                value={revenueModel}
                onChange={(e) => setRevenueModel(e.target.value)}
                placeholder="Fees, interest, FX spread, commissions..."
                className="w-full h-9 px-3 rounded-lg border border-zinc-300 text-xs text-zinc-900 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-800">
                Third-Party Dependencies (comma-separated)
              </label>
              <input
                type="text"
                value={dependenciesText}
                onChange={(e) => setDependenciesText(e.target.value)}
                placeholder="NIBSS, Sponsor Bank, Card Scheme..."
                className="w-full h-9 px-3 rounded-lg border border-zinc-300 text-xs text-zinc-900 outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg border border-zinc-200 text-xs font-medium text-zinc-700 hover:bg-zinc-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0B1220] hover:bg-zinc-800 text-white text-xs font-medium disabled:opacity-60 cursor-pointer"
            >
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>Create &amp; Generate Controls</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
