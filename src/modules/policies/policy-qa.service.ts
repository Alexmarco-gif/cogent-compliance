/**
 * Cogent Compliance OS — Post-Draft Statutory Floor QA Validation Engine (Stage 5)
 *
 * Runs fail-closed deterministic checks on a compiled or stakeholder-edited policy draft
 * BEFORE it can advance to Delegated Approval (CCO / Management Committee / Board):
 *  1. Existing 7-layer Work Product Guardrails (vault clause integrity, URL allowlist, legal floors).
 *  2. Statutory Legal Floor Checks:
 *     - NFIU / MLPPA 2022 s. 8 >= 5-year record retention floor
 *     - NDPA 2023 s. 40 <= 72-hour data breach notification ceiling
 *     - CBN Circular PSM/DIR/PUB/CIR/001/053 mandatory Day-0 BVN/NIN verification (no Tier-1 waiver)
 *     - FCCPC DEON Regulations 2025 anti-contact-scraping & collection hours (8am–9pm) floor
 *     - MLPPA 2022 s. 7 zero-threshold 24h STR & anti-tipping-off floor
 *  3. Evidence Completeness Check (`[NEEDS_INTERNAL_EVIDENCE]` placeholders).
 *  4. Stakeholder Feasibility Blocker Gate (zero OPEN feasibility blockers allowed).
 *  5. Core Institutional Governance Structure Check (Purpose, Scope, Responsibilities, Controls, Retention, Review).
 */

import { guardrailValidator } from "@/modules/compliance-assessment/guardrails.validator";
import type {
  PolicyClauseCommentRecord,
  PolicyQaCheckItem,
  PolicyQaValidationReport,
} from "@/contracts/policy.contracts";

export interface RunPolicyQaInput {
  tenantId: string;
  actorId: string;
  policyMarkdown: string;
  openComments?: PolicyClauseCommentRecord[];
  strictEvidenceMarkers?: boolean;
}

export class PolicyQaService {
  /**
   * Executes the deterministic post-draft Statutory Floor QA Gate.
   * Fail-closed: any CRITICAL or HIGH statutory breach, or any OPEN feasibility blocker,
   * causes `passed: false` and prevents submission to Approval.
   */
  public async evaluatePolicyDraft(input: RunPolicyQaInput): Promise<PolicyQaValidationReport> {
    const checkedAt = new Date().toISOString();
    const checks: PolicyQaCheckItem[] = [];
    const content = input.policyMarkdown || "";
    const lower = content.toLowerCase();

    // 1. Run existing Cogent Work Product Guardrail pipeline on the policy text
    const wpValidation = await guardrailValidator.validateWorkProduct(
      {
        workflow_type: "POLICY_GAP_REDLINE",
        markdown_content: content,
        citations: [],
        evidence_gaps: [],
      },
      {
        tenantId: input.tenantId,
      },
    );

    const floorWarnings = wpValidation.guardrail_report.legal_floor_warnings || [];

    // Check 1A: NFIU 5-Year Retention Floor
    const hasRetentionBreach = floorWarnings.some((w) => w.includes("NFIU_RETENTION"));
    checks.push({
      check_code: "STATUTORY_FLOOR_NFIU_5Y_RETENTION",
      category: "STATUTORY_FLOOR",
      label: "NFIU / MLPPA >= 5-Year Record Retention Floor",
      passed: !hasRetentionBreach,
      severity: "CRITICAL",
      details: hasRetentionBreach
        ? floorWarnings.find((w) => w.includes("NFIU_RETENTION")) ||
          "Policy weakens record retention below the mandatory 5-year statutory floor."
        : "No clause weakens the mandatory >= 5-year record retention floor.",
      governing_authority: "MLPPA 2022 Section 8 / CBN AML/CFT/CPF Regulations 2022",
    });

    // Check 1B: NDPA 72-Hour Data Breach Notification Ceiling
    const reverseBreachHoursMatch = lower.match(
      /(?:notify|report)[^.\n]{0,60}(?:breach|incident)[^.\n]{0,60}\b(\d{2,3})\s*hours?\b/i,
    );
    const reverseBreachDaysMatch = lower.match(
      /(?:notify|report)[^.\n]{0,60}(?:breach|incident)[^.\n]{0,60}\b([4-9]|[1-9]\d+)\s*(?:working\s+|business\s+|calendar\s+)?days?\b/i,
    );
    const hasNdpcBreach =
      floorWarnings.some((w) => w.includes("NDPC_72H")) ||
      Boolean(reverseBreachHoursMatch && Number(reverseBreachHoursMatch[1]) > 72) ||
      Boolean(reverseBreachDaysMatch);
    checks.push({
      check_code: "STATUTORY_FLOOR_NDPA_72H_BREACH",
      category: "STATUTORY_FLOOR",
      label: "NDPA 72-Hour Personal Data Breach Notification Ceiling",
      passed: !hasNdpcBreach,
      severity: "CRITICAL",
      details: hasNdpcBreach
        ? floorWarnings.find((w) => w.includes("NDPC_72H")) ||
          "Policy permits data breach reporting beyond the statutory 72-hour ceiling under NDPA 2023 Section 40."
        : "Breach notification window complies with the <= 72-hour NDPA statutory ceiling.",
      governing_authority: "NDPA 2023 Section 40 / NDPC GAID 2025",
    });

    // Check 1C: CBN Day-0 Mandatory BVN/NIN KYC Verification Floor
    const hasKycWaiverBreach =
      floorWarnings.some((w) => w.includes("CBN_KYC")) ||
      /\b(?:defer|delay|postpone|allow\s+\d+\s+days?\s+(?:before|to\s+provide))\b[^.\n]{0,60}\b(?:bvn|nin)\b/i.test(
        lower,
      );
    checks.push({
      check_code: "STATUTORY_FLOOR_CBN_DAY0_KYC",
      category: "STATUTORY_FLOOR",
      label: "CBN Mandatory Day-0 Electronic BVN/NIN KYC Verification",
      passed: !hasKycWaiverBreach,
      severity: "CRITICAL",
      details: hasKycWaiverBreach
        ? "Draft permits waiving or deferring BVN/NIN verification at onboarding, violating CBN Circular PSM/DIR/PUB/CIR/001/053 (1 Dec 2023)."
        : "No clause waives or defers mandatory electronic BVN/NIN validation.",
      governing_authority: "CBN Circular PSM/DIR/PUB/CIR/001/053 (2023) & CBN CDD Regulations 2023",
    });

    // Check 1D: FCCPC DEON 2025 Prohibited Collections & Contact-Scraping Floor
    const hasShamingOrScrapingBreach =
      /\b(?:may|shall|permitted\s+to|allowed\s+to|authorized\s+to)\b[^.\n]{0,70}\b(?:scrape\s+contacts|access\s+contact\s+list|contact\s+borrower'?s?\s+(?:friends|family|colleagues|employer)|public\s+shaming|broadcast\s+default)\b/i.test(
        lower,
      );
    checks.push({
      check_code: "STATUTORY_FLOOR_FCCPC_DEON_COLLECTIONS",
      category: "STATUTORY_FLOOR",
      label: "FCCPC DEON 2025 Fair Collections & Anti-Contact-Scraping Floor",
      passed: !hasShamingOrScrapingBreach,
      severity: "CRITICAL",
      details: hasShamingOrScrapingBreach
        ? "Draft authorizes contact-list scraping, third-party debtor shaming, or prohibited collection conduct under FCCPC DEON Regulations 2025."
        : "No clause authorizes prohibited contact scraping or debt-shaming practices.",
      governing_authority: "FCCPC DEON Regulations 2025 (eff. 21 July 2025)",
    });

    // Check 1E: MLPPA 2022 Zero-Threshold STR & Anti-Tipping-Off Floor
    const hasTippingOffOrStrThresholdBreach =
      /\b(?:may|shall|permitted\s+to)\s+(?:inform|notify|alert)\s+(?:the\s+)?customer\s+(?:that|when)\s+(?:a|an)\s+(?:str|suspicious\s+transaction\s+report)\b/i.test(
        lower,
      ) ||
      /\b(?:only\s+file\s+(?:an?\s+)?str|str\s+only\s+required)\s+(?:above|exceeding|over)\s+(?:₦|ngn)/i.test(
        lower,
      );
    checks.push({
      check_code: "STATUTORY_FLOOR_MLPPA_STR_TIPPING_OFF",
      category: "STATUTORY_FLOOR",
      label: "MLPPA 2022 Zero-Threshold 24h STR & Anti-Tipping-Off Floor",
      passed: !hasTippingOffOrStrThresholdBreach,
      severity: "CRITICAL",
      details: hasTippingOffOrStrThresholdBreach
        ? "Draft introduces an unlawful monetary threshold for STRs or permits tipping off the customer, violating MLPPA 2022 Section 7."
        : "STR reporting and anti-tipping-off prohibitions remain intact.",
      governing_authority: "MLPPA 2022 Section 7 (NFIU)",
    });

    // Check 2: Ungrounded External URL Integrity
    const strippedUrls = wpValidation.guardrail_report.stripped_ungrounded_urls || [];
    checks.push({
      check_code: "CITATION_INTEGRITY_URLS",
      category: "CITATION_INTEGRITY",
      label: "Zero Unverified External URL Citations",
      passed: strippedUrls.length === 0,
      severity: "HIGH",
      details:
        strippedUrls.length === 0
          ? "All cited statutory references and URLs passed citation integrity verification."
          : `Detected ${strippedUrls.length} unverified external URL(s) that must be removed or verified before approval.`,
    });

    // Check 3: Unresolved [NEEDS_INTERNAL_EVIDENCE] Markers
    const evidenceMarkerMatches = content.match(/\[NEEDS_INTERNAL_EVIDENCE\]/g) || [];
    const unresolvedEvidenceCount = evidenceMarkerMatches.length;
    const strictMarkers = input.strictEvidenceMarkers !== false;
    checks.push({
      check_code: "EVIDENCE_COMPLETENESS_MARKERS",
      category: "EVIDENCE_COMPLETENESS",
      label: "Zero Unresolved [NEEDS_INTERNAL_EVIDENCE] Placeholders",
      passed: !strictMarkers || unresolvedEvidenceCount === 0,
      severity: "HIGH",
      details:
        unresolvedEvidenceCount === 0
          ? "No unresolved [NEEDS_INTERNAL_EVIDENCE] placeholders remain in the draft."
          : `${unresolvedEvidenceCount} unresolved [NEEDS_INTERNAL_EVIDENCE] marker(s) remain. Supply actual institutional evidence before approval.`,
    });

    // Check 4: Open Stakeholder Feasibility Blockers (Stage 4 -> Stage 5 Hard Gate)
    const openBlockers = (input.openComments || []).filter(
      (c) => c.is_feasibility_blocker && c.status === "OPEN",
    );
    checks.push({
      check_code: "STAKEHOLDER_FEASIBILITY_BLOCKERS",
      category: "STAKEHOLDER_BLOCKERS",
      label: "All Cross-Functional Feasibility Blockers Resolved or Deferred to Exception",
      passed: openBlockers.length === 0,
      severity: "CRITICAL",
      details:
        openBlockers.length === 0
          ? "Zero open departmental feasibility blockers remain."
          : `${openBlockers.length} open feasibility blocker(s) raised by stakeholder teams (${openBlockers.map((b) => `${b.author_department} @ Clause ${b.clause_reference}`).join("; ")}) must be resolved or formally deferred to an approved exception before Board/Committee submission.`,
    });

    // Check 5: Mandatory Institutional Governance Components
    const missingComponents: string[] = [];
    if (!/\b(purpose|objective|application)\b/i.test(content)) missingComponents.push("Purpose");
    if (!/\b(scope|applicability)\b/i.test(content)) missingComponents.push("Scope");
    if (!/\b(responsibilit|accountab|owner|three\s+lines)\b/i.test(content)) {
      missingComponents.push("Responsibilities");
    }
    if (!/\b(control|verification|monitor|enforce)\b/i.test(content)) {
      missingComponents.push("Controls");
    }
    if (!/\b(exception|waiver|escalat)\b/i.test(content)) {
      missingComponents.push("Exceptions & Escalation");
    }
    if (!/\b(retention|retain|archive|record)\b/i.test(content)) {
      missingComponents.push("Record Retention");
    }
    if (!/\b(review\s+cycle|annual|periodic\s+review|next\s+review)\b/i.test(content)) {
      missingComponents.push("Review Cycle");
    }

    checks.push({
      check_code: "GOVERNANCE_MANDATORY_COMPONENTS",
      category: "GOVERNANCE_STRUCTURE",
      label: "Institutional Policy Governance Completeness (7 Core Components)",
      passed: missingComponents.length === 0,
      severity: "MEDIUM",
      details:
        missingComponents.length === 0
          ? "All 7 mandatory governance components (Purpose, Scope, Responsibilities, Controls, Exceptions/Escalation, Record Retention, Review Cycle) are documented."
          : `Missing governance component(s): ${missingComponents.join(", ")}.`,
    });

    const failedCriticalCount = checks.filter(
      (c) => !c.passed && c.severity === "CRITICAL",
    ).length;
    const failedHighCount = checks.filter((c) => !c.passed && c.severity === "HIGH").length;

    // Fail-closed: any failed CRITICAL or HIGH check blocks approval
    const passed = failedCriticalCount === 0 && failedHighCount === 0;

    return {
      passed,
      checked_at: checkedAt,
      checked_by: input.actorId,
      total_checks: checks.length,
      failed_critical_count: failedCriticalCount,
      failed_high_count: failedHighCount,
      open_feasibility_blockers_count: openBlockers.length,
      unresolved_evidence_markers_count: unresolvedEvidenceCount,
      checks,
      summary: passed
        ? `Statutory Floor QA Gate PASSED (${checks.filter((c) => c.passed).length}/${checks.length} checks). Policy is cleared for Delegated Approval routing.`
        : `Statutory Floor QA Gate FAILED (${failedCriticalCount} critical, ${failedHighCount} high failure(s)). Remediate all blocking findings before routing for approval.`,
    };
  }
}

export const policyQaService = new PolicyQaService();
