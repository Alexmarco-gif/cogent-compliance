"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Copy,
  Check,
  Pencil,
  Eye,
  Printer,
  Sparkles,
  FileCheck2,
  Table2,
  Stamp,
  Calculator,
  Loader2,
  Scale,
  Maximize2,
  Minimize2,
} from "lucide-react";
import type {
  BlindSpotFindingItem,
  ComplianceArtifactType,
  StructuredComplianceReport,
} from "@/contracts/conversation.contracts";
import { WorkProductCanvas } from "@/components/work-products/WorkProductCanvas";

export interface ArtifactCanvasDrawerProps {
  isOpen: boolean;
  activeTab: ComplianceArtifactType;
  onSelectTab: (tab: ComplianceArtifactType) => void;
  onClose: () => void;
  report: StructuredComplianceReport | null;
  workProductId?: string | null;
  onInspectEvidence?: (clauseId: string) => void;
  onApplyCompliantRewrite?: (rewrittenCopy: string) => Promise<boolean | void> | boolean | void;
  onApproveAndSealDossier?: (rewrittenCopy: string) => Promise<boolean | void> | boolean | void;
}

const HIGHLIGHT_REGEX_SOURCE =
  "(subject to (?:KYC and )?credit (?:assessment|appraisal)(?: and eligibility verification)?|Effective APR:\\s*[\\d.]+%\\s*p\\.a\\.|Net Disbursed:\\s*₦[\\d,]+(?:\\.\\d{2})?|Total Repayable:\\s*₦[\\d,]+(?:\\.\\d{2})?|Licensed by the Central Bank of Nigeria(?:\\s*\\(CBN\\))?|Terms and Conditions apply\\.?|\\[ARCON\\/ASP[^\\]]+\\])";

function renderHighlightedCompliantRewrite(copy: string): React.ReactNode {
  const cleanCopy = copy
    .replace(/```[a-z]*\n?/gi, "")
    .replace(/```/g, "")
    .trim();

  const splitRegex = new RegExp(HIGHLIGHT_REGEX_SOURCE, "gi");
  const testRegex = new RegExp(`^${HIGHLIGHT_REGEX_SOURCE}$`, "i");

  const lines = cleanCopy.split("\n");
  return (
    <div className="space-y-2.5 text-[13.5px] text-zinc-900 leading-relaxed font-sans break-words">
      {lines.map((line, lIdx) => {
        if (!line.trim()) return <div key={lIdx} className="h-1" />;
        const parts = line.split(splitRegex);
        return (
          <p key={lIdx} className="leading-relaxed">
            {parts.map((part, pIdx) => {
              if (!part) return null;
              if (testRegex.test(part)) {
                return (
                  <span
                    key={pIdx}
                    className="inline rounded bg-emerald-50 border border-emerald-200/90 px-1.5 py-0.5 text-emerald-900 font-medium"
                    title="Inserted by Cogent Deterministic Compliance Engine"
                  >
                    {part}
                  </span>
                );
              }
              return <React.Fragment key={pIdx}>{part}</React.Fragment>;
            })}
          </p>
        );
      })}
    </div>
  );
}

function parseArconMemoFields(rawMemo: string): Array<{ label: string; value: string }> {
  const lines = rawMemo
    .split("\n")
    .map((l) => l.replace(/^[-*#]+\s*/, "").replace(/\*\*/g, "").trim())
    .filter(Boolean);

  const fields: Array<{ label: string; value: string }> = [];
  for (const line of lines) {
    if (/^ARCON ADVERTISING STANDARDS PANEL/i.test(line)) continue;
    const colonIdx = line.indexOf(":");
    if (colonIdx > 0 && colonIdx < 48) {
      const label = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 1).trim();
      if (label && value) {
        fields.push({ label, value });
      }
    } else {
      fields.push({ label: "Attestation Note", value: line });
    }
  }
  return fields;
}

function formatFindingHeadline(
  finding: BlindSpotFindingItem,
  aprAudit?: StructuredComplianceReport["pre_flight_gate"]["apr_audit"]
): string {
  const code = finding.finding_code.toUpperCase();
  if (code.includes("APR_DRIP_PRICING") || code.includes("APR_MISMATCH")) {
    if (aprAudit) {
      return `Drip Pricing & APR Mismatch — ${aprAudit.effective_nominal_apr}% vs ${aprAudit.advertised_implied_apr}% p.a.`;
    }
    return "Drip Pricing & Effective APR Mismatch";
  }
  if (code.includes("SHORT_TENOR") || code.includes("PLAY_STORE")) {
    return `Google Play Store <60-Day Loan Tenor Ban${aprAudit ? ` (${aprAudit.tenor_days}d Tenor)` : ""}`;
  }
  if (code.includes("ARCON") || code.includes("ASP")) {
    return "Missing Mandatory ARCON ASP Pre-Vetting Certificate ID";
  }
  if (code.includes("FONT") || code.includes("MICROSCOPIC") || code.includes("VISUAL")) {
    return "Illegible Fine-Print Disclaimer Ratio (<12% Headline Height)";
  }
  if (code.includes("DECEPTIVE_FREE") || code.includes("ZERO_INTEREST") || code.includes("RATE_MISMATCH")) {
    return `Rate Card Truth Mismatch${finding.exact_quote ? ` ("${finding.exact_quote.slice(0, 32)}")` : ""}`;
  }
  if (code.includes("UNQUALIFIED") || code.includes("GUARANTEE") || code.includes("PROHIBITED")) {
    return `Prohibited Absolute Claim${finding.exact_quote ? ` ("${finding.exact_quote.slice(0, 32)}")` : ""}`;
  }
  if (code.includes("LICENSE")) {
    return "Missing Mandatory CBN Regulatory License Disclosure";
  }
  if (code.includes("TERMS") || code.includes("DISCLOSURE")) {
    return "Missing Mandatory Terms & Conditions / APR Qualifier";
  }
  if (code.includes("CONTACT_LIST") || code.includes("PRIVACY") || code.includes("NDPA")) {
    return "Unlawful Contact-List Scraping / NDPA Consent Violation";
  }

  return code
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function exportKfsToPrintWindow(
  kfsTable: NonNullable<StructuredComplianceReport["artifacts"]["kfs_table"]>
) {
  if (typeof window === "undefined") return;
  const printWin = window.open("", "_blank", "width=920,height=740");
  if (!printWin) {
    window.print();
    return;
  }

  const rowsHtml = kfsTable.rows
    .map(
      (r) => `
      <tr>
        <td>${escapeHtml(r.field)}</td>
        <td>${escapeHtml(r.value)}</td>
        <td style="font-family:monospace;font-size:11px;color:#52525b">${escapeHtml(r.statutoryBasis)}</td>
      </tr>`
    )
    .join("");

  printWin.document.write(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>CBN Key Facts Statement — ${escapeHtml(kfsTable.product_name)}</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 32px; color: #09090b; }
      h1 { font-size: 18px; margin: 4px 0 4px; }
      p.eyebrow { font-family: monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #52525b; margin: 0; }
      table { width: 100%; border-collapse: collapse; margin-top: 18px; font-size: 12.5px; }
      th, td { border: 1px solid #e4e4e7; padding: 8px 10px; text-align: left; vertical-align: top; }
      th { background: #f4f4f5; font-weight: 600; }
      @media print { body { padding: 12px; } }
    </style>
  </head>
  <body>
    <p class="eyebrow">Central Bank of Nigeria • Consumer Protection Framework (Annex 1)</p>
    <h1>Mandatory Key Facts Statement — ${escapeHtml(kfsTable.product_name)}</h1>
    <table>
      <thead>
        <tr>
          <th>KFS Disclosure Item</th>
          <th>Verified Schedule Value</th>
          <th>Statutory Authority</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
    <script>window.onload = function() { window.print(); };</script>
  </body>
</html>`);
  printWin.document.close();
}

function exportArconMemoToPrintWindow(
  productName: string,
  fields: Array<{ label: string; value: string }>
) {
  if (typeof window === "undefined") return;
  const printWin = window.open("", "_blank", "width=920,height=740");
  if (!printWin) {
    window.print();
    return;
  }

  const rowsHtml = fields
    .map(
      (f) => `
      <div style="margin-bottom:12px;padding:10px 12px;border:1px solid #e4e4e7;border-radius:6px;">
        <div style="font-family:monospace;font-size:10.5px;text-transform:uppercase;color:#52525b;margin-bottom:4px;">${escapeHtml(f.label)}</div>
        <div style="font-size:13px;line-height:1.5;color:#09090b;">${escapeHtml(f.value)}</div>
      </div>`
    )
    .join("");

  printWin.document.write(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>ARCON ASP Pre-Vetting Substantiation Memo — ${escapeHtml(productName)}</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 32px; color: #09090b; }
      h1 { font-size: 18px; margin: 4px 0 16px; }
      p.eyebrow { font-family: monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #52525b; margin: 0; }
      @media print { body { padding: 12px; } }
    </style>
  </head>
  <body>
    <p class="eyebrow">Advertising Regulatory Council of Nigeria (ARCON) • Act 2022 §54</p>
    <h1>Advertising Standards Panel (ASP) Pre-Vetting Substantiation Dossier — ${escapeHtml(productName)}</h1>
    ${rowsHtml}
    <script>window.onload = function() { window.print(); };</script>
  </body>
</html>`);
  printWin.document.close();
}

const WORKFLOW_ARTIFACT_TABS = new Set<ComplianceArtifactType>([
  "statutory_structuring_memo",
  "policy_gap_redline",
  "policy_draft_document",
  "supervisory_ddq_response",
  "cross_border_matrix",
]);

export function ArtifactCanvasDrawer({
  isOpen,
  activeTab,
  onSelectTab,
  onClose,
  report,
  workProductId,
  onInspectEvidence,
  onApplyCompliantRewrite,
  onApproveAndSealDossier,
}: ArtifactCanvasDrawerProps) {
  const [isEditingRewrite, setIsEditingRewrite] = useState(false);
  const [editableRewrite, setEditableRewrite] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [applyingRewrite, setApplyingRewrite] = useState(false);
  const [rewriteApplied, setRewriteApplied] = useState(false);
  const [sealingDossier, setSealingDossier] = useState(false);
  const [dossierSealed, setDossierSealed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const rawRewrittenCopy = report?.artifacts.compliant_rewrite?.rewritten_copy || "";

  useEffect(() => {
    setEditableRewrite(rawRewrittenCopy);
    setIsEditingRewrite(false);
    setRewriteApplied(false);
    setDossierSealed(false);
  }, [rawRewrittenCopy]);

  const effectiveWorkProductId = workProductId || report?.work_product_id || null;
  const showWorkProductStudio =
    Boolean(effectiveWorkProductId) &&
    (!report || WORKFLOW_ARTIFACT_TABS.has(activeTab));

  if (!isOpen || (!report && !effectiveWorkProductId)) return null;

  const drawerAsideClass = isExpanded
    ? "fixed inset-0 z-50 w-full h-screen bg-white flex flex-col shadow-2xl"
    : "fixed inset-0 z-50 lg:static lg:z-auto lg:w-[50%] xl:w-[50%] shrink-0 h-screen bg-white border-l border-zinc-200 flex flex-col shadow-xl lg:shadow-none";

  if (showWorkProductStudio && effectiveWorkProductId) {
    return (
      <aside
        aria-label="Compliance Artifact Canvas Drawer"
        className={drawerAsideClass}
      >
        <div className="px-4 py-3 border-b border-zinc-200 bg-zinc-50/70 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-900 text-white">
              Work Product Studio
            </span>
            {report && (
              <button
                type="button"
                onClick={() => onSelectTab("compliant_ad_rewrite")}
                className="text-[11.5px] font-medium px-2 py-0.5 rounded border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 cursor-pointer"
              >
                View Campaign Audit Tabs
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              className="hidden lg:inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-600 hover:text-zinc-950 text-[11.5px] font-medium transition-colors cursor-pointer"
              aria-label={isExpanded ? "Exit fullscreen studio" : "Expand studio to fullscreen"}
              title={isExpanded ? "Split-screen view" : "Expand to fullscreen"}
            >
              {isExpanded ? (
                <>
                  <Minimize2 className="h-3.5 w-3.5" />
                  <span>Split View</span>
                </>
              ) : (
                <>
                  <Maximize2 className="h-3.5 w-3.5" />
                  <span>Expand</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsExpanded(false);
                onClose();
              }}
              className="p-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-600 hover:text-zinc-950 transition-colors cursor-pointer shrink-0"
              aria-label="Close Artifact Canvas Drawer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <WorkProductCanvas
          workProductId={effectiveWorkProductId}
          onInspectEvidence={onInspectEvidence}
        />
      </aside>
    );
  }

  if (!report) return null;

  const { pre_flight_gate, blind_spot_findings, artifacts, computed_financials } = report;
  const apr = pre_flight_gate.apr_audit;
  const fin = computed_financials;
  const productName =
    report.campaign_context?.product_name ||
    fin?.product_name ||
    apr?.product_name ||
    artifacts.kfs_table?.product_name ||
    "Promoted Financial Product";

  const effectiveApr = fin?.effective_apr_percent ?? apr?.effective_nominal_apr;
  const impliedApr = fin?.advertised_implied_apr_percent ?? apr?.advertised_implied_apr;
  const netCash = fin?.net_disbursed_cash_ngn ?? apr?.net_disbursed_ngn;
  const upfrontFees = fin?.total_upfront_fees_ngn ?? apr?.upfront_fees_ngn;
  const totalRepayable = fin?.total_repayable_ngn ?? apr?.total_repayment_ngn;
  const principalNgn = fin?.principal_ngn ?? apr?.principal_ngn;
  const tenorDays = fin?.tenor_days ?? apr?.tenor_days;

  const arconFields = artifacts.arcon_asp_memo
    ? parseArconMemoFields(artifacts.arcon_asp_memo)
    : [];

  const copyText = (key: string, text: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleApplyRewrite = async (copyToApply: string) => {
    if (!onApplyCompliantRewrite || applyingRewrite) return;
    setApplyingRewrite(true);
    try {
      const ok = await onApplyCompliantRewrite(copyToApply);
      if (ok !== false) {
        setRewriteApplied(true);
      }
    } finally {
      setApplyingRewrite(false);
    }
  };

  const handleSealDossier = async () => {
    if (!onApproveAndSealDossier || sealingDossier) return;
    setSealingDossier(true);
    try {
      const targetCopy =
        editableRewrite.trim() ||
        artifacts.compliant_rewrite?.rewritten_copy ||
        "Verified compliant campaign copy.";
      const ok = await onApproveAndSealDossier(targetCopy);
      if (ok !== false) {
        setDossierSealed(true);
      }
    } finally {
      setSealingDossier(false);
    }
  };

  const tabMeta: Partial<
    Record<
      ComplianceArtifactType,
      { label: string; shortLabel: string; icon: React.ReactNode; available: boolean }
    >
  > = {
    compliant_ad_rewrite: {
      label: "Compliant Ad Copy & Redline Diff",
      shortLabel: "Compliant Rewrite",
      icon: <Sparkles className="h-3.5 w-3.5 shrink-0" />,
      available: Boolean(artifacts.compliant_rewrite),
    },
    cbn_kfs_statement: {
      label: `Mandatory CBN Key Facts Statement (${productName})`,
      shortLabel: "CBN KFS Table",
      icon: <Table2 className="h-3.5 w-3.5 shrink-0" />,
      available: Boolean(artifacts.kfs_table),
    },
    arcon_vetting_memo: {
      label: "ARCON ASP Pre-Vetting Substantiation Memo",
      shortLabel: "ARCON ASP Memo",
      icon: <Stamp className="h-3.5 w-3.5 shrink-0" />,
      available: Boolean(artifacts.arcon_asp_memo),
    },
    audit_dossier_summary: {
      label: "Deterministic Lock & Blind-Spot Audit Matrix",
      shortLabel: `Findings (${blind_spot_findings.length})`,
      icon: <Scale className="h-3.5 w-3.5 shrink-0" />,
      available: true,
    },
  };

  const resolvedTab: ComplianceArtifactType = tabMeta[activeTab]?.available
    ? activeTab
    : artifacts.compliant_rewrite
      ? "compliant_ad_rewrite"
      : artifacts.kfs_table
        ? "cbn_kfs_statement"
        : "audit_dossier_summary";

  return (
    <aside
      aria-label="Compliance Artifact Canvas Drawer"
      className={drawerAsideClass}
    >
      {/* 1. Top Studio Header */}
      <div className="px-4 py-3 border-b border-zinc-200 bg-zinc-50/70 flex items-center justify-between gap-3 shrink-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-900 text-white">
              Artifact Canvas
            </span>
            {effectiveApr !== undefined && (
              <span className="font-mono text-[10.5px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 truncate">
                Locked APR: {effectiveApr}% p.a.
              </span>
            )}
          </div>
          <h2 className="text-[13.5px] font-semibold text-zinc-950 truncate mt-1">
            {tabMeta[resolvedTab]?.label || "Compliance Deliverable"}
          </h2>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="hidden lg:inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-600 hover:text-zinc-950 text-[11.5px] font-medium transition-colors cursor-pointer"
            aria-label={isExpanded ? "Exit fullscreen canvas" : "Expand canvas to fullscreen"}
          >
            {isExpanded ? (
              <>
                <Minimize2 className="h-3.5 w-3.5" />
                <span>Split View</span>
              </>
            ) : (
              <>
                <Maximize2 className="h-3.5 w-3.5" />
                <span>Expand</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsExpanded(false);
              onClose();
            }}
            className="p-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-600 hover:text-zinc-950 transition-colors cursor-pointer shrink-0"
            aria-label="Close Artifact Canvas Drawer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 2. Deliverable Switcher Bar */}
      <div className="px-3 py-2 border-b border-zinc-200 bg-white flex items-center gap-1.5 overflow-x-auto shrink-0">
        {effectiveWorkProductId && (
          <button
            type="button"
            onClick={() => onSelectTab("statutory_structuring_memo")}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11.5px] font-medium bg-zinc-100/80 text-zinc-700 hover:text-zinc-950 hover:bg-zinc-200/70 transition-colors cursor-pointer shrink-0"
          >
            <FileCheck2 className="h-3.5 w-3.5 shrink-0" />
            <span>Work Product Studio</span>
          </button>
        )}
        {(Object.keys(tabMeta) as ComplianceArtifactType[]).map((tabKey) => {
          const item = tabMeta[tabKey];
          if (!item || !item.available) return null;
          const isSelected = resolvedTab === tabKey;
          return (
            <button
              key={tabKey}
              type="button"
              onClick={() => onSelectTab(tabKey)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11.5px] font-medium transition-colors cursor-pointer shrink-0 ${
                isSelected
                  ? "bg-zinc-900 text-white shadow-sm"
                  : "bg-zinc-100/80 text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200/70"
              }`}
            >
              {item.icon}
              <span>{item.shortLabel}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Canonical Computed Financials Strip (Single Source of Truth across all tabs) */}
      {effectiveApr !== undefined && principalNgn !== undefined && (
        <div className="px-4 py-2.5 border-b border-zinc-200 bg-zinc-50/50 shrink-0">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-zinc-800">
              <Calculator className="h-3.5 w-3.5 text-zinc-500" />
              <span>Canonical CBN Financial Schedule ({productName})</span>
            </span>
            {impliedApr !== undefined && effectiveApr > impliedApr && (
              <span className="font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                Implied {impliedApr}% → True {effectiveApr}% APR
              </span>
            )}
          </div>
          <div className="grid grid-cols-4 gap-2 text-[11.5px]">
            <div className="rounded-md bg-white border border-zinc-200/80 px-2.5 py-1.5">
              <p className="text-[10px] text-zinc-500">Principal / Tenor</p>
              <p className="font-mono font-semibold text-zinc-900">
                ₦{principalNgn.toLocaleString("en-NG")} ({tenorDays}d)
              </p>
            </div>
            <div className="rounded-md bg-white border border-zinc-200/80 px-2.5 py-1.5">
              <p className="text-[10px] text-zinc-500">Upfront Fees</p>
              <p className="font-mono font-semibold text-zinc-900">
                ₦{(upfrontFees ?? 0).toLocaleString("en-NG")}
              </p>
            </div>
            <div className="rounded-md bg-white border border-zinc-200/80 px-2.5 py-1.5">
              <p className="text-[10px] text-zinc-500">Net Cash Disbursed</p>
              <p className="font-mono font-semibold text-zinc-900">
                ₦{(netCash ?? 0).toLocaleString("en-NG")}
              </p>
            </div>
            <div className="rounded-md bg-white border border-zinc-200/80 px-2.5 py-1.5">
              <p className="text-[10px] text-zinc-500">Total Repayable</p>
              <p className="font-mono font-semibold text-zinc-900">
                ₦{(totalRepayable ?? 0).toLocaleString("en-NG")}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 4. Scrollable Studio Canvas Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* TAB 1: COMPLIANT AD REWRITE & REDLINE DIFF */}
        {resolvedTab === "compliant_ad_rewrite" && artifacts.compliant_rewrite && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10.5px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  LOCKS 1–3 VERIFIED
                </span>
                <span className="text-[11.5px] text-zinc-500">
                  Emerald highlights mark inserted statutory disclosures
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsEditingRewrite(!isEditingRewrite)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 text-[11.5px] font-medium text-zinc-700 cursor-pointer"
                >
                  {isEditingRewrite ? (
                    <>
                      <Eye className="h-3 w-3" />
                      <span>Preview Diff</span>
                    </>
                  ) : (
                    <>
                      <Pencil className="h-3 w-3" />
                      <span>Edit Copy</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => copyText("rewrite_main", editableRewrite)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 text-[11.5px] font-medium text-zinc-700 cursor-pointer"
                >
                  {copiedKey === "rewrite_main" ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-600" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {isEditingRewrite ? (
              <textarea
                value={editableRewrite}
                onChange={(e) => setEditableRewrite(e.target.value)}
                rows={7}
                className="w-full rounded-xl border border-zinc-300 bg-white p-3.5 text-[13.5px] text-zinc-900 leading-relaxed font-sans focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
            ) : (
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/40 p-4">
                {renderHighlightedCompliantRewrite(editableRewrite)}
              </div>
            )}

            {/* 160-Character SMS Variant */}
            {artifacts.compliant_rewrite.sms_160_char && (
              <div className="rounded-xl border border-zinc-200 bg-white p-3.5 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[10.5px] font-semibold uppercase tracking-wider text-zinc-500">
                    160-Character DND-Safe SMS Variant (
                    {artifacts.compliant_rewrite.sms_160_char.length}/160 chars)
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      copyText("sms_copy", artifacts.compliant_rewrite!.sms_160_char!)
                    }
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-700 hover:text-zinc-950 cursor-pointer"
                  >
                    {copiedKey === "sms_copy" ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-600" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copy SMS</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="font-mono text-[12px] text-zinc-800 leading-relaxed break-words">
                  {artifacts.compliant_rewrite.sms_160_char}
                </p>
              </div>
            )}

            {/* Web Landing Page KFS + NDPA 2023 Unbundled Opt-In Snippet */}
            {artifacts.compliant_rewrite.web_landing_html && (
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-3.5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[10.5px] font-semibold uppercase tracking-wider text-zinc-500">
                    Web Landing Page KFS & NDPA 2023 Opt-In HTML Snippet
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      copyText("web_html", artifacts.compliant_rewrite!.web_landing_html!)
                    }
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-700 hover:text-zinc-950 cursor-pointer"
                  >
                    {copiedKey === "web_html" ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-600" />
                        <span>Copied HTML</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copy HTML</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-3 rounded-lg bg-white border border-zinc-200 overflow-x-auto font-mono text-[11.5px] text-zinc-700 whitespace-pre-wrap break-words">
                  {artifacts.compliant_rewrite.web_landing_html}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CBN KEY FACTS STATEMENT (KFS) TABLE */}
        {resolvedTab === "cbn_kfs_statement" && artifacts.kfs_table && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[12.5px] font-semibold text-zinc-950">
                  CBN Consumer Protection Framework — Mandatory Key Facts Statement
                </p>
                <p className="text-[11px] text-zinc-500">
                  Product: {artifacts.kfs_table.product_name} • Locked to canonical APR engine
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    copyText("kfs_md", artifacts.kfs_table!.markdown_table)
                  }
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 text-[11.5px] font-medium text-zinc-700 cursor-pointer"
                >
                  {copiedKey === "kfs_md" ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-600" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>Copy Markdown</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => exportKfsToPrintWindow(artifacts.kfs_table!)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 text-[11.5px] font-medium text-zinc-700 cursor-pointer"
                >
                  <Printer className="h-3 w-3" />
                  <span>Export PDF</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-zinc-200">
              <table className="w-full text-left text-[12.5px] border-collapse">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-semibold">
                    <th className="px-3.5 py-2.5">KFS Disclosure Item</th>
                    <th className="px-3.5 py-2.5">Verified Schedule Value</th>
                    <th className="px-3.5 py-2.5">Statutory Basis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 bg-white">
                  {artifacts.kfs_table.rows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-zinc-50/60">
                      <td className="px-3.5 py-2.5 font-medium text-zinc-900 align-top">
                        {row.field}
                      </td>
                      <td className="px-3.5 py-2.5 text-zinc-700 align-top break-words">
                        {row.value}
                      </td>
                      <td className="px-3.5 py-2.5 font-mono text-[11px] text-zinc-500 align-top whitespace-nowrap">
                        {row.statutoryBasis}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: ARCON ASP PRE-VETTING SUBSTANTIATION MEMO */}
        {resolvedTab === "arcon_vetting_memo" && artifacts.arcon_asp_memo && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-zinc-200">
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-zinc-700 shrink-0" />
                <div>
                  <p className="font-mono text-[10.5px] font-bold uppercase tracking-wider text-zinc-900">
                    ARCON Advertising Standards Panel (ASP)
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    Statutory Pre-Vetting Substantiation Dossier • ARCON Act 2022 §54
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => copyText("asp_memo", artifacts.arcon_asp_memo!)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 text-[11.5px] font-medium text-zinc-700 cursor-pointer"
                >
                  {copiedKey === "asp_memo" ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-600" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>Copy Memo</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    exportArconMemoToPrintWindow(productName, arconFields)
                  }
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 text-[11.5px] font-medium text-zinc-700 cursor-pointer"
                >
                  <Printer className="h-3 w-3" />
                  <span>Export PDF</span>
                </button>
              </div>
            </div>

            <div className="space-y-2.5">
              {arconFields.map((field, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-zinc-200 bg-zinc-50/40 p-3.5 text-[12.5px]"
                >
                  <p className="font-mono text-[10.5px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                    {field.label}
                  </p>
                  <p className="text-zinc-900 leading-relaxed break-words">
                    {field.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: DETERMINISTIC LOCK & BLIND-SPOT AUDIT MATRIX */}
        {resolvedTab === "audit_dossier_summary" && (
          <div className="space-y-4">
            {/* 3 Mechanical Locks Grid */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-3">
                <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                  Lock 1: Prohibited Claims
                </p>
                <p
                  className={`font-mono text-[13px] font-bold mt-1 ${
                    pre_flight_gate.lock_summary.lock1_prohibited_terms === "PASS"
                      ? "text-emerald-700"
                      : "text-rose-600"
                  }`}
                >
                  {pre_flight_gate.lock_summary.lock1_prohibited_terms}
                </p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-3">
                <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                  Lock 2: Rate Card Match
                </p>
                <p
                  className={`font-mono text-[13px] font-bold mt-1 ${
                    pre_flight_gate.lock_summary.lock2_product_rate_match === "PASS"
                      ? "text-emerald-700"
                      : "text-rose-600"
                  }`}
                >
                  {pre_flight_gate.lock_summary.lock2_product_rate_match}
                </p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-3">
                <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                  Lock 3: Disclosures
                </p>
                <p
                  className={`font-mono text-[13px] font-bold mt-1 ${
                    pre_flight_gate.lock_summary.lock3_mandatory_disclosures === "PASS"
                      ? "text-emerald-700"
                      : "text-rose-600"
                  }`}
                >
                  {pre_flight_gate.lock_summary.lock3_mandatory_disclosures}
                </p>
              </div>
            </div>

            {/* Full Untruncated Blind-Spot Finding Cards */}
            <div className="space-y-3">
              {blind_spot_findings.map((finding, idx) => (
                <div
                  key={`${finding.finding_code}_${idx}`}
                  className="rounded-xl border border-zinc-200 bg-white p-4 space-y-3 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded ${
                          finding.severity === "CRITICAL"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : finding.severity === "HIGH"
                              ? "bg-amber-50 text-amber-800 border border-amber-200"
                              : "bg-zinc-100 text-zinc-700 border border-zinc-200"
                        }`}
                      >
                        {finding.severity}
                      </span>
                      <h3 className="text-[13.5px] font-semibold text-zinc-950">
                        {formatFindingHeadline(finding, apr)}
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        finding.regulatory_clause_id &&
                        onInspectEvidence?.(finding.regulatory_clause_id)
                      }
                      className="font-mono text-[11px] px-2 py-0.5 rounded border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 cursor-pointer"
                    >
                      [{finding.violated_statute}]
                    </button>
                  </div>

                  <div className="space-y-2 text-[12.5px]">
                    <div className="rounded-lg bg-zinc-50/80 border border-zinc-200/80 p-3">
                      <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                        The Blind Spot (What You Missed)
                      </p>
                      <p className="text-zinc-800 leading-relaxed">
                        {finding.what_you_missed}
                      </p>
                    </div>

                    <div className="rounded-lg bg-rose-50/40 border border-rose-200/80 p-3">
                      <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-rose-700 mb-1">
                        Regulatory Consequence (What It Costs You)
                      </p>
                      <p className="text-zinc-800 leading-relaxed">
                        {finding.what_it_costs_you}
                      </p>
                    </div>

                    <div className="rounded-lg bg-emerald-50/40 border border-emerald-200/90 p-3">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-emerald-800">
                          Exact Fix (One-Click Resolution)
                        </p>
                        <button
                          type="button"
                          onClick={() => copyText(`fix_drawer_${idx}`, finding.one_click_fix)}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800 hover:underline cursor-pointer"
                        >
                          {copiedKey === `fix_drawer_${idx}` ? (
                            <>
                              <Check className="h-3 w-3" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              <span>Copy Fix</span>
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-zinc-900 font-medium leading-relaxed">
                        {finding.one_click_fix}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 5. Persistent HITL Sign-Off & Campaign Action Footer */}
      {(onApplyCompliantRewrite || onApproveAndSealDossier) && (
        <div className="px-4 py-3 border-t border-zinc-200 bg-zinc-50/80 flex flex-wrap items-center justify-between gap-2 shrink-0">
          {onApplyCompliantRewrite && artifacts.compliant_rewrite && (
            <button
              type="button"
              disabled={applyingRewrite}
              onClick={() => handleApplyRewrite(editableRewrite)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-900 text-[12px] font-medium transition-colors cursor-pointer disabled:opacity-60"
            >
              {applyingRewrite ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : rewriteApplied ? (
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 text-zinc-700" />
              )}
              <span>
                {rewriteApplied
                  ? "Applied to Campaign Revision"
                  : "Apply Compliant Rewrite"}
              </span>
            </button>
          )}

          {onApproveAndSealDossier && (
            <button
              type="button"
              disabled={sealingDossier}
              onClick={handleSealDossier}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-[12px] font-medium transition-colors cursor-pointer disabled:opacity-60 ml-auto"
            >
              {sealingDossier ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : dossierSealed ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <FileCheck2 className="h-3.5 w-3.5" />
              )}
              <span>
                {dossierSealed
                  ? "2-Year FCCPC Dossier Sealed"
                  : "Approve & Log to Audit Dossier"}
              </span>
            </button>
          )}
        </div>
      )}
    </aside>
  );
}
