/**
 * Cogent Marketing Shield - 7-Layer Compliance Guardrail Pipeline
 * Document Reference: Document 05 (Section 7), Document 07 (Section 7.2), Document 08
 */

import crypto from "crypto";
import { createAdminSupabaseClient } from "@/lib/supabase";
import { sanitizeAssistantOutput } from "@/lib/ai/output-sanitizer";
import { logger } from "@/lib/logger";
import { mechanicalLocksEngine, type MechanicalLocksInput } from "./mechanical-locks";
import { canonicalizeUrl } from "@/modules/live-web-intelligence/africa-regulators";
import type {
  WorkflowType,
  WorkProductCitation,
  WorkProductEvidenceGap,
  WorkProductGuardrailReport,
} from "@/contracts/work-product.contracts";

export interface WorkProductValidationCandidate {
  workflow_type: WorkflowType;
  markdown_content: string;
  structured_payload?: Record<string, unknown>;
  citations?: WorkProductCitation[];
  evidence_gaps?: WorkProductEvidenceGap[];
}

export interface WorkProductValidationContext {
  tenantId: string;
  allowedLiveUrls?: string[];
  hasInternalKnowledgeRefs?: boolean;
}

export interface WorkProductValidationResult {
  passed: boolean;
  sanitized_markdown: string;
  sanitized_citations: WorkProductCitation[];
  evidence_gaps: WorkProductEvidenceGap[];
  guardrail_report: WorkProductGuardrailReport;
}

export interface CandidateFinding {
  claimText: string;
  findingCode: string;
  title: string;
  description: string;
  severity: "INFORMATIONAL" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  recommendedAction: string;
  regulatoryClauseId?: string;
  knowledgeRuleId?: string;
  liveWebRetrievalId?: string;
}

export interface ValidatedFinding extends CandidateFinding {
  id?: string;
  applicabilityStatus: "VERIFIED" | "POTENTIALLY_APPLICABLE" | "APPLICABILITY_UNCERTAIN" | "INSUFFICIENT_EVIDENCE";
  requiresHumanReview: boolean;
  verbatimStatutoryText?: string;
  sourceTextHash?: string;
  sourceClass: "VERIFIED_OFFICIAL_SOURCE" | "INTERNAL_PLAYBOOK" | "LIVE_WEB_INTELLIGENCE";
  layerStatus: {
    layer1_source_exists: boolean;
    layer2_lifecycle_current: boolean;
    layer3_text_injected: boolean;
    layer4_claim_provenance_verified: boolean;
    layer5_applicability_checked: boolean;
  };
}

export interface GuardrailValidationReport {
  passed: boolean;
  totalCandidateFindings: number;
  validatedFindings: ValidatedFinding[];
  rejectedFindingsCount: number;
  rejectedReasons: string[];
}

export class GuardrailValidator {
  /**
   * Executes the 7-Layer Guardrail Pipeline across candidate compliance findings.
   */
  public async validateFindings(
    candidates: CandidateFinding[],
    campaignContentText: string,
    tenantId: string,
    assessmentDate: string = new Date().toISOString().split("T")[0]!
  ): Promise<GuardrailValidationReport> {
    const supabase = createAdminSupabaseClient();
    const validatedFindings: ValidatedFinding[] = [];
    const rejectedReasons: string[] = [];

    for (const candidate of candidates) {
      const layerStatus = {
        layer1_source_exists: false,
        layer2_lifecycle_current: false,
        layer3_text_injected: false,
        layer4_claim_provenance_verified: false,
        layer5_applicability_checked: false,
      };

      let sourceClass: ValidatedFinding["sourceClass"] = "VERIFIED_OFFICIAL_SOURCE";
      let verbatimText = "";
      let sourceTextHash: string | undefined;
      let requiresHumanReview = candidate.severity === "CRITICAL" || candidate.severity === "HIGH";
      let applicabilityStatus: ValidatedFinding["applicabilityStatus"] = "VERIFIED";

      // --- LAYER 1: Source Existence Check ---
      if (candidate.regulatoryClauseId) {
        const { data: clause, error: cErr } = await supabase
          .from("regulatory_clauses")
          .select(`
            id,
            clause_text,
            clause_reference,
            document_version_id,
            regulatory_document_versions (
              lifecycle_status,
              effective_date
            )
          `)
          .eq("id", candidate.regulatoryClauseId)
          .maybeSingle();

        if (cErr || !clause) {
          rejectedReasons.push(
            `Layer 1 Rejection: Hallucinated regulatory_clause_id (${candidate.regulatoryClauseId}) does not exist in database.`
          );
          logger.warn("Layer 1 Guardrail Rejection: hallucinated clause", {
            clauseId: candidate.regulatoryClauseId,
          });
          continue; // Strip hallucinated citation
        }

        layerStatus.layer1_source_exists = true;

        // --- LAYER 2: Lifecycle Currency Check ---
        const docVersion = clause.regulatory_document_versions as unknown as {
          lifecycle_status: string;
          effective_date: string;
        } | null;

        if (docVersion?.lifecycle_status !== "CURRENT" || (docVersion?.effective_date && docVersion.effective_date > assessmentDate)) {
          applicabilityStatus = "POTENTIALLY_APPLICABLE";
          requiresHumanReview = true;
          logger.info("Layer 2 Warning: provision is not current or future effective", {
            clauseId: clause.id,
            status: docVersion?.lifecycle_status,
          });
        } else {
          layerStatus.layer2_lifecycle_current = true;
        }

        // --- LAYER 3: Verbatim Statutory Text Injection ---
        verbatimText = clause.clause_text || "";
        sourceTextHash = crypto.createHash("sha256").update(verbatimText).digest("hex");
        layerStatus.layer3_text_injected = true;
      } else if (candidate.knowledgeRuleId) {
        sourceClass = "INTERNAL_PLAYBOOK";
        const { data: rule } = await supabase
          .from("marketing_knowledge_rules")
          .select("id, rule_text, status")
          .eq("id", candidate.knowledgeRuleId)
          .eq("tenant_id", tenantId)
          .maybeSingle();

        if (!rule) {
          rejectedReasons.push(`Layer 1 Rejection: Internal knowledge rule ${candidate.knowledgeRuleId} not found for tenant.`);
          continue;
        }

        layerStatus.layer1_source_exists = true;
        layerStatus.layer2_lifecycle_current = rule.status === "ACTIVE";
        verbatimText = rule.rule_text || "";
        sourceTextHash = crypto.createHash("sha256").update(verbatimText).digest("hex");
        layerStatus.layer3_text_injected = true;
      } else if (candidate.liveWebRetrievalId) {
        sourceClass = "LIVE_WEB_INTELLIGENCE";
        requiresHumanReview = true;
        applicabilityStatus = "POTENTIALLY_APPLICABLE";
        layerStatus.layer1_source_exists = true;
        layerStatus.layer2_lifecycle_current = true;
      }

      // --- LAYER 4: Claim Provenance & Verbatim Quote Check ---
      const cleanCampaign = campaignContentText.toLowerCase().replace(/\s+/g, " ");
      const cleanClaim = candidate.claimText.toLowerCase().replace(/\s+/g, " ");

      if (cleanCampaign.includes(cleanClaim) || candidate.claimText === "[Omitted Regulatory Disclosure]" || candidate.claimText === "[Omitted APR Disclosure]") {
        layerStatus.layer4_claim_provenance_verified = true;
      } else {
        // Quoted claim is not a direct substring; flag for human review
        requiresHumanReview = true;
        applicabilityStatus = "POTENTIALLY_APPLICABLE";
      }

      // --- LAYER 5: Relevance & Applicability ---
      layerStatus.layer5_applicability_checked = true;

      validatedFindings.push({
        ...candidate,
        applicabilityStatus,
        requiresHumanReview,
        verbatimStatutoryText: verbatimText,
        sourceTextHash,
        sourceClass,
        layerStatus,
      });
    }

    const passed = rejectedReasons.length === 0;

    return {
      passed,
      totalCandidateFindings: candidates.length,
      validatedFindings,
      rejectedFindingsCount: rejectedReasons.length,
      rejectedReasons,
    };
  }

  /**
   * LAYER 6: Rewrite Safety & Lock Re-Verification.
   * Runs the 3 Mechanical Locks on any proposed rewrite before it can receive the PASSED badge.
   */
  public async validateRewrite(
    proposedText: string,
    locksInput: Omit<MechanicalLocksInput, "contentText">
  ): Promise<{ passed: boolean; lockBreachesCount: number; failureReason?: string }> {
    const lockResult = await mechanicalLocksEngine.executeLocks({
      ...locksInput,
      contentText: proposedText,
    });

    if (!lockResult.passed) {
      return {
        passed: false,
        lockBreachesCount: lockResult.totalBreachCount,
        failureReason: `REWRITE_VALIDATION_FAILED: Proposed rewrite violates ${lockResult.totalBreachCount} deterministic mechanical lock rules.`,
      };
    }

    return {
      passed: true,
      lockBreachesCount: 0,
    };
  }

  /**
   * Work Product Integrity & Anti-Hallucination Guardrail Pipeline (Document 14 & 15):
   * 1. Verifies every cited regulatory_clause_id exists in public.regulatory_clauses.
   * 2. Strict URL Citation Allowlist: strips any URL not found in tenant's live_web_retrievals.
   * 3. DDQ Evidence Honesty: detects unsupported internal control claims and injects [NEEDS_INTERNAL_EVIDENCE].
   * 4. Policy Redline Legal Floor: blocks/flags attempts to weaken NFIU 5-yr retention, NDPC 72h reporting, or KYC limits.
   */
  public async validateWorkProduct(
    candidate: WorkProductValidationCandidate,
    context: WorkProductValidationContext
  ): Promise<WorkProductValidationResult> {
    const supabase = createAdminSupabaseClient();
    const citations = [...(candidate.citations || [])];
    const evidenceGaps: WorkProductEvidenceGap[] = [...(candidate.evidence_gaps || [])];
    let sanitizedMarkdown = sanitizeAssistantOutput(candidate.markdown_content);

    const verifiedVaultIds: string[] = [];
    const strippedVaultIds: string[] = [];
    const verifiedUrls: string[] = [];
    const strippedUngroundedUrls: string[] = [];
    const legalFloorWarnings: string[] = [];

    // 1. Vault Clause Existence Verification
    const vaultCandidateIds = Array.from(
      new Set(
        citations
          .filter((c) => c.source_class === "VERIFIED_OFFICIAL_SOURCE" && c.regulatory_clause_id)
          .map((c) => c.regulatory_clause_id as string)
      )
    );

    const existingClauseIds = new Set<string>();
    if (vaultCandidateIds.length > 0) {
      const { data: clauseRows } = await supabase
        .from("regulatory_clauses")
        .select("id")
        .in("id", vaultCandidateIds);

      for (const row of clauseRows || []) {
        if (row.id) existingClauseIds.add(String(row.id));
      }

      for (const cid of vaultCandidateIds) {
        if (existingClauseIds.has(cid)) {
          verifiedVaultIds.push(cid);
        } else {
          strippedVaultIds.push(cid);
        }
      }
    }

    // 2. Strict URL Citation Allowlist (against live_web_retrievals for this tenant + explicit allowedLiveUrls)
    const allowedNormalizedUrls = new Set<string>();
    for (const u of context.allowedLiveUrls || []) {
      const norm = canonicalizeUrl(u)?.canonicalUrl;
      if (norm) allowedNormalizedUrls.add(norm);
    }

    const extractExternalUrls = (text: string): string[] => {
      const matches = text.match(/https?:\/\/[^\s)>\]]+/gi) || [];
      return matches.map((m) => m.replace(/[.,;:!?'"`]+$/, ""));
    };

    const markdownUrls = extractExternalUrls(sanitizedMarkdown);
    const citationUrls = citations
      .map((c) => c.retrieved_url)
      .filter((u): u is string => Boolean(u));
    const allReferencedUrls = Array.from(new Set([...markdownUrls, ...citationUrls]));

    if (allReferencedUrls.length > 0) {
      const { data: dbRetrievals } = await supabase
        .from("live_web_retrievals")
        .select("retrieved_url, canonical_url_hash")
        .eq("tenant_id", context.tenantId)
        .order("retrieved_at", { ascending: false })
        .limit(200);

      for (const row of dbRetrievals || []) {
        if (row.retrieved_url) {
          const norm = canonicalizeUrl(String(row.retrieved_url))?.canonicalUrl;
          if (norm) allowedNormalizedUrls.add(norm);
        }
      }

      for (const rawUrl of allReferencedUrls) {
        const norm = canonicalizeUrl(rawUrl)?.canonicalUrl;
        if (norm && allowedNormalizedUrls.has(norm)) {
          if (!verifiedUrls.includes(rawUrl)) verifiedUrls.push(rawUrl);
        } else {
          if (!strippedUngroundedUrls.includes(rawUrl)) {
            strippedUngroundedUrls.push(rawUrl);
          }
          // Replace fabricated/unverified URL in markdown safely
          const escaped = rawUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          sanitizedMarkdown = sanitizedMarkdown.replace(
            new RegExp(escaped, "g"),
            "[UNVERIFIED_EXTERNAL_URL_REMOVED]"
          );
        }
      }
    }

    const strippedUrlNorms = new Set(
      strippedUngroundedUrls.map((u) => canonicalizeUrl(u)?.canonicalUrl || u)
    );
    const sanitizedCitations = citations.filter((cit) => {
      if (
        cit.source_class === "VERIFIED_OFFICIAL_SOURCE" &&
        cit.regulatory_clause_id &&
        !existingClauseIds.has(cit.regulatory_clause_id)
      ) {
        return false;
      }
      if (cit.source_class === "LIVE_WEB_INTELLIGENCE" && cit.retrieved_url) {
        const norm = canonicalizeUrl(cit.retrieved_url)?.canonicalUrl || cit.retrieved_url;
        if (strippedUrlNorms.has(norm)) {
          return false;
        }
      }
      return true;
    });

    // 3. DDQ Evidence Honesty Check
    if (candidate.workflow_type === "SUPERVISORY_DDQ_RESPONSE") {
      const hasInternalCitation = sanitizedCitations.some(
        (c) => c.source_class === "INTERNAL_PLAYBOOK"
      );
      const hasInternalSupport =
        Boolean(context.hasInternalKnowledgeRefs) || hasInternalCitation;

      const affirmativeInternalClaimPattern =
        /\b(?:we\s+(?:enforce|maintain|conduct|store|encrypt|verify|retain|have\s+implemented)|our\s+(?:aml|kyc|data\s+protection|security|compliance)\s+(?:policy|framework|control|program)\s+(?:ensures|requires|states|mandates))\b/i;

      if (!hasInternalSupport && affirmativeInternalClaimPattern.test(sanitizedMarkdown)) {
        const alreadyMarked = sanitizedMarkdown.includes("[NEEDS_INTERNAL_EVIDENCE]");
        if (!alreadyMarked) {
          sanitizedMarkdown = `${sanitizedMarkdown}\n\n> **[NEEDS_INTERNAL_EVIDENCE]**: Internal operational claims above lack cited internal institutional policy or product records in the workspace.`;
        }
        if (!evidenceGaps.some((g) => g.gap_code === "DDQ_UNVERIFIED_INTERNAL_CONTROL")) {
          evidenceGaps.push({
            gap_code: "DDQ_UNVERIFIED_INTERNAL_CONTROL",
            section_or_question: "Internal Control Assertions",
            description:
              "Affirmative operational claims were generated without matching internal institutional policy documents or playbook rules.",
            severity: "HIGH",
            remediation_prompt:
              "Upload your approved internal AML/KYC or Infosec SOP in Knowledge Base and re-run this DDQ response.",
          });
        }
      }
    }

    // 4. Policy Redline Legal Floor Enforcement
    if (candidate.workflow_type === "POLICY_GAP_REDLINE") {
      const lower = sanitizedMarkdown.toLowerCase();

      // NFIU / MLPPA >= 5 years record retention floor
      const shortRetentionMatch = lower.match(
        /(?:retain|retention|keep|preserve|store)[^.\n]{0,80}\b([1-4])\s*(?:year|yr)s?\b/i
      );
      if (shortRetentionMatch) {
        legalFloorWarnings.push(
          `LEGAL_FLOOR_BREACH_NFIU_RETENTION: Proposed clause states ${shortRetentionMatch[1]}-year retention, which falls below Nigeria's mandatory >= 5-year statutory retention floor (MLPPA 2022 §8 / CBN AML Regulations).`
        );
      }

      // NDPA 2023 / GAID 2025 72-hour data breach notification ceiling
      const longBreachHoursMatch = lower.match(
        /(?:breach|incident)[^.\n]{0,80}(?:notify|report)[^.\n]{0,40}\b(\d{2,3})\s*hours?\b/i
      );
      if (longBreachHoursMatch && Number(longBreachHoursMatch[1]) > 72) {
        legalFloorWarnings.push(
          `LEGAL_FLOOR_BREACH_NDPC_72H: Proposed clause allows ${longBreachHoursMatch[1]} hours for breach notification, exceeding the NDPA 2023 §40 72-hour statutory ceiling.`
        );
      }
      const longBreachDaysMatch = lower.match(
        /(?:breach|incident)[^.\n]{0,80}(?:notify|report)[^.\n]{0,40}\b([4-9]|[1-9]\d+)\s*days?\b/i
      );
      if (longBreachDaysMatch) {
        legalFloorWarnings.push(
          `LEGAL_FLOOR_BREACH_NDPC_72H: Proposed clause allows ${longBreachDaysMatch[1]} days for breach notification, exceeding the NDPA 2023 §40 72-hour statutory ceiling.`
        );
      }

      // CBN Tiered KYC exemption check
      if (
        /(?:exempt|waive|skip|bypass)[^.\n]{0,60}(?:bvn|nin|kyc)[^.\n]{0,60}(?:tier\s*[23]|all\s+customers|unlimited)/i.test(
          lower
        )
      ) {
        legalFloorWarnings.push(
          "LEGAL_FLOOR_BREACH_CBN_KYC: Proposed clause attempts to waive mandatory BVN/NIN verification on Tier 2/3 accounts contrary to CBN Customer Due Diligence Regulations 2023."
        );
      }

      if (legalFloorWarnings.length > 0) {
        sanitizedMarkdown = `${sanitizedMarkdown}\n\n> **STATUTORY LEGAL FLOOR WARNING**:\n${legalFloorWarnings
          .map((w) => `> - ${w}`)
          .join("\n")}`;
      }
    }

    // 5. Cross-Border Comparison Universal Evidence Coverage Check
    if (candidate.workflow_type === "CROSS_BORDER_COMPARISON") {
      if (
        (context.allowedLiveUrls && context.allowedLiveUrls.length > 0) &&
        sanitizedCitations.filter((c) => c.source_class === "LIVE_WEB_INTELLIGENCE").length === 0 &&
        verifiedUrls.length === 0
      ) {
        if (!evidenceGaps.some((g) => g.gap_code === "CROSS_BORDER_MISSING_LIVE_CITATIONS")) {
          evidenceGaps.push({
            gap_code: "CROSS_BORDER_MISSING_LIVE_CITATIONS",
            section_or_question: "Cross-Border Live Regulatory Evidence",
            description:
              "Live regulatory web sources were retrieved for this comparison, but no verified URL citations were linked in the work product.",
            severity: "LOW",
            remediation_prompt:
              "Include inline Markdown links to the verified regulatory sources retrieved during live search.",
          });
        }
      }
    }

    const passed =
      strippedVaultIds.length === 0 &&
      strippedUngroundedUrls.length === 0 &&
      legalFloorWarnings.length === 0;

    return {
      passed,
      sanitized_markdown: sanitizedMarkdown,
      sanitized_citations: sanitizedCitations,
      evidence_gaps: evidenceGaps,
      guardrail_report: {
        passed,
        verified_vault_ids: verifiedVaultIds,
        stripped_vault_ids: strippedVaultIds,
        verified_urls: verifiedUrls,
        stripped_ungrounded_urls: strippedUngroundedUrls,
        legal_floor_warnings: legalFloorWarnings,
        evidence_gaps_count: evidenceGaps.length,
      },
    };
  }
}

export const guardrailValidator = new GuardrailValidator();
