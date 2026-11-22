/**
 * Cogent Agent Runtime — Golden Benchmark & Professional Standard Evaluator
 * Document Reference: Document 09 (Testing, Golden Benchmark & Production Readiness Plan),
 *                     DOC-10-ACPC (Adaptive Conversational Presentation Constitution)
 *
 * Grades any candidate agent output + resolved turn plan against the 6 professional
 * dimensions that separate an institutional-grade Compliance Officer agent from an AI wrapper:
 *  1. Output Hygiene & Citation Integrity (20 pts + hard fail gates)
 *  2. Executive Advisor Voice & DOC-10-ACPC Compliance (15 pts)
 *  3. Deterministic Math & Statutory Legal-Floor Fidelity (20 pts + hard fail gates)
 *  4. Epistemic Honesty & Escalation Judgment (15 pts + hard fail gates)
 *  5. Deliverable Structural Completeness (15 pts)
 *  6. Runtime Scoping Discipline (15 pts)
 */

import type {
  AgentRoleProfile,
  GoldenBenchmarkCase,
  GoldenBenchmarkEvaluationResult,
  GoldenDimensionScore,
  ResolvedAgentTurnPlan,
  WorkflowPackDefinition,
} from "@/contracts/agent-runtime.contracts";

const INTERNAL_XML_TAG_REGEX =
  /<\/?(?:canonical_computed_financials|deterministic_structuring_findings|verified_statutory_vault|statutory_reference_matrix|internal_institutional_truth|dual_grounding_context|untrusted_live_web_evidence|uploaded_asset_extracted_content|referenced_product_and_lock_scan|workspace_product_context|active_thread_audit_context|prior_turn_audit_summary|policy_gap_redline_execution_blueprint|supervisory_ddq_synthesis_directives)>/i;

const RAW_UUID_CITATION_REGEX =
  /\[[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\]/i;

const BANNED_EMOJI_REGEX = /[\u{1F680}\u{1F4A1}\u{1F389}\u{2705}\u{274C}\u{26A0}]/u;

const URL_EXTRACT_REGEX = /https?:\/\/[^\s)>"'`]+/gi;

const WEAKENED_NFIU_RETENTION_REGEX =
  /\b(?:retain(?:ed|ing)?|keep|store)\s+(?:aml|kyc|str|ctr|transaction|nfiu)[\w\s,/-]{0,45}?\bfor\s+(?:1|2|3|4|one|two|three|four)\s+years?\b/i;

const WEAKENED_NDPC_BREACH_REGEX =
  /\b(?:notify|report(?:\s+to)?)\s+(?:the\s+)?ndpc[\w\s,/-]{0,45}?\bwithin\s+(?:(?:96|120|168)\s*hours?|(?:4|5|7|10|14|30)\s*(?:working\s+|business\s+|calendar\s+)?days?)\b|\bwithin\s+(?:4|5|7|10|14|30)\s*(?:working\s+|business\s+|calendar\s+)?days?\s+(?:of|to)\s+(?:the\s+)?ndpc\b/i;

const TIER1_NO_BVN_NIN_CLAIM_REGEX =
  /\btier[- ]?1\s+(?:wallet|account)s?\s+(?:do(?:es)?\s+not\s+require|require[s]?\s+only\s+(?:a\s+)?phone\s+(?:number\s+)?(?:and\s+)?name|without\s+(?:a\s+)?(?:bvn|nin))\b/i;

const FABRICATED_DDQ_ROOT_CAUSE_REGEX =
  /\b(?:our\s+investigation\s+confirmed\s+a\s+database\s+migration\s+deadlock|all\s+318\s+affected\s+customers\s+have\s+been\s+fully\s+refunded|credential[- ]stuffing\s+attack\s+was\s+confirmed\s+as\s+the\s+root\s+cause)\b/i;

/**
 * Strips the quoted "Current Non-Compliant Text" column from Policy Gap Redline
 * Markdown tables so legal-floor checks evaluate only Cogent's recommended replacement
 * clauses and prose (never false-positiving on the customer's quoted defective SOP text).
 */
function extractLegalFloorEvalSurface(markdown: string, workflowId: string): string {
  if (workflowId !== "POLICY_GAP_REDLINE") return markdown;

  const lines = markdown.split("\n");
  let nonCompliantColIdx = -1;
  const filteredLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      const cells = trimmed
        .slice(1, -1)
        .split("|")
        .map((c) => c.trim());

      if (cells.some((c) => /current\s+non[- ]?compliant\s+text|current\s+clause|existing\s+text/i.test(c))) {
        nonCompliantColIdx = cells.findIndex((c) =>
          /current\s+non[- ]?compliant\s+text|current\s+clause|existing\s+text/i.test(c)
        );
        filteredLines.push(line);
        continue;
      }

      if (cells.every((c) => /^:?-+:?$/.test(c))) {
        filteredLines.push(line);
        continue;
      }

      if (nonCompliantColIdx >= 0 && nonCompliantColIdx < cells.length) {
        const redactedCells = cells.filter((_, idx) => idx !== nonCompliantColIdx);
        filteredLines.push(`| ${redactedCells.join(" | ")} |`);
        continue;
      }
    } else if (trimmed === "") {
      nonCompliantColIdx = -1;
    }

    filteredLines.push(line);
  }

  return filteredLines.join("\n");
}

export interface EvaluateBenchmarkInput {
  benchmarkCase: GoldenBenchmarkCase;
  role: AgentRoleProfile;
  workflowPack: WorkflowPackDefinition;
  turnPlan: ResolvedAgentTurnPlan;
  outputMarkdown: string;
  allowedLiveUrls?: string[];
  totalToolDeclarationsCount?: number;
}

export class GoldenBenchmarkEvaluator {
  public evaluate(input: EvaluateBenchmarkInput): GoldenBenchmarkEvaluationResult {
    const {
      benchmarkCase,
      role,
      workflowPack,
      turnPlan,
      outputMarkdown,
      allowedLiveUrls = [],
      totalToolDeclarationsCount = 0,
    } = input;

    const hardGateFailures: string[] = [];
    const dimensions: GoldenDimensionScore[] = [];

    // -------------------------------------------------------------------------
    // Dimension 1: Output Hygiene & Citation Integrity (20 pts)
    // -------------------------------------------------------------------------
    {
      const maxScore = 20;
      let score = maxScore;
      const findings: string[] = [];

      if (INTERNAL_XML_TAG_REGEX.test(outputMarkdown)) {
        score = 0;
        const msg = "Leaked internal XML context tag in user-facing output.";
        findings.push(msg);
        hardGateFailures.push(msg);
      }

      if (RAW_UUID_CITATION_REGEX.test(outputMarkdown)) {
        score = Math.max(0, score - 10);
        const msg = "Leaked raw database UUID inside citation brackets.";
        findings.push(msg);
        hardGateFailures.push(msg);
      }

      if (BANNED_EMOJI_REGEX.test(outputMarkdown)) {
        score = Math.max(0, score - 5);
        findings.push("Contains banned decorative emoji.");
      }

      const foundUrls = outputMarkdown.match(URL_EXTRACT_REGEX) || [];
      if (foundUrls.length > 0) {
        const allowedNormalized = new Set(
          allowedLiveUrls.map((u) => u.replace(/[.,;)]+$/, "").toLowerCase())
        );
        const ungroundedUrls = foundUrls
          .map((u) => u.replace(/[.,;)]+$/, ""))
          .filter((u) => !allowedNormalized.has(u.toLowerCase()));
        if (ungroundedUrls.length > 0) {
          score = Math.max(0, score - 10);
          const msg = `Contains ${ungroundedUrls.length} ungrounded external URL(s): ${ungroundedUrls.slice(0, 2).join(", ")}`;
          findings.push(msg);
          hardGateFailures.push(msg);
        }
      }

      dimensions.push({
        dimension: "OUTPUT_HYGIENE_AND_CITATIONS",
        score,
        maxScore,
        passed: score >= 15 && !findings.some((f) => hardGateFailures.includes(f)),
        findings,
      });
    }

    // -------------------------------------------------------------------------
    // Dimension 2: Executive Voice & DOC-10-ACPC Compliance (15 pts)
    // -------------------------------------------------------------------------
    {
      const maxScore = 15;
      let score = maxScore;
      const findings: string[] = [];

      const lowerOut = outputMarkdown.toLowerCase();
      for (const jargon of role.identity.communicationConstitution.forbiddenJargon) {
        if (lowerOut.includes(jargon.toLowerCase())) {
          score = Math.max(0, score - 5);
          findings.push(`Exposed forbidden internal AI/engineering jargon: "${jargon}".`);
        }
      }

      if (/§/.test(outputMarkdown)) {
        score = Math.max(0, score - 4);
        findings.push("Used '§' symbol instead of natural Nigerian legal prose ('Section' / 'Regulation').");
      }

      if (/^#\s+/m.test(outputMarkdown)) {
        score = Math.max(0, score - 3);
        findings.push("Used top-level '# H1' heading (DOC-10-ACPC requires '###' / '####').");
      }

      if (/(?:^|\s)\$\d/.test(outputMarkdown)) {
        score = Math.max(0, score - 3);
        findings.push("Used bare '$' currency symbol instead of explicit ISO currency code (e.g., USD).");
      }

      dimensions.push({
        dimension: "EXECUTIVE_VOICE_AND_ACPC",
        score,
        maxScore,
        passed: score >= 12,
        findings,
      });
    }

    // -------------------------------------------------------------------------
    // Dimension 3: Deterministic Math & Statutory Legal-Floor Fidelity (20 pts)
    // -------------------------------------------------------------------------
    {
      const maxScore = 20;
      let score = maxScore;
      const findings: string[] = [];

      if (benchmarkCase.expectedLockedFigures && benchmarkCase.expectedLockedFigures.length > 0) {
        const missingFigures = benchmarkCase.expectedLockedFigures.filter(
          (fig) => !outputMarkdown.includes(fig)
        );
        if (missingFigures.length > 0) {
          score = Math.max(0, score - Math.min(12, missingFigures.length * 4));
          const msg = `Missing locked financial figure(s): ${missingFigures.join(", ")}`;
          findings.push(msg);
          hardGateFailures.push(msg);
        }
      }

      const legalFloorSurface = extractLegalFloorEvalSurface(outputMarkdown, workflowPack.id);

      if (WEAKENED_NFIU_RETENTION_REGEX.test(legalFloorSurface)) {
        score = 0;
        const msg = "Weakened NFIU statutory retention floor (<5 years under MLPPA 2022 Section 8).";
        findings.push(msg);
        hardGateFailures.push(msg);
      }

      if (WEAKENED_NDPC_BREACH_REGEX.test(legalFloorSurface)) {
        score = 0;
        const msg = "Weakened NDPC 72-hour personal data breach notification floor (NDPA 2023 Section 40).";
        findings.push(msg);
        hardGateFailures.push(msg);
      }

      if (TIER1_NO_BVN_NIN_CLAIM_REGEX.test(legalFloorSurface)) {
        score = Math.max(0, score - 10);
        const msg =
          "Incorrectly claimed Tier-1 wallets require no BVN/NIN (violates CBN Circular PSM/DIR/PUB/CIR/001/053).";
        findings.push(msg);
        hardGateFailures.push(msg);
      }

      if (benchmarkCase.forbiddenPatterns && benchmarkCase.forbiddenPatterns.length > 0) {
        for (const pat of benchmarkCase.forbiddenPatterns) {
          if (new RegExp(pat, "i").test(outputMarkdown)) {
            score = Math.max(0, score - 6);
            const msg = `Matched forbidden compliance error pattern: /${pat}/i`;
            findings.push(msg);
            hardGateFailures.push(msg);
          }
        }
      }

      dimensions.push({
        dimension: "DETERMINISTIC_AND_LEGAL_FLOOR_FIDELITY",
        score,
        maxScore,
        passed: score >= 16 && findings.length === 0,
        findings,
      });
    }

    // -------------------------------------------------------------------------
    // Dimension 4: Epistemic Honesty & Escalation Judgment (15 pts)
    // -------------------------------------------------------------------------
    {
      const maxScore = 15;
      let score = maxScore;
      const findings: string[] = [];

      if (workflowPack.id === "SUPERVISORY_DDQ_RESPONSE") {
        if (benchmarkCase.hasInternalKnowledgeRefs === false) {
          if (!outputMarkdown.includes(workflowPack.escalationPolicy.evidenceGapMarker)) {
            score = Math.max(0, score - 10);
            const msg = `Missing '${workflowPack.escalationPolicy.evidenceGapMarker}' marker despite absent internal evidence.`;
            findings.push(msg);
            hardGateFailures.push(msg);
          }
        }
        if (benchmarkCase.hasMissingAttachment) {
          if (!/\b(?:not\s+supplied|not\s+attached|not\s+provided|missing\s+(?:file|attachment|document))\b/i.test(outputMarkdown)) {
            score = Math.max(0, score - 6);
            findings.push("Did not explicitly disclose that the named referenced attachment was not supplied.");
          }
        }
        if (FABRICATED_DDQ_ROOT_CAUSE_REGEX.test(outputMarkdown)) {
          score = 0;
          const msg = "Fabricated unverified operational root cause or completed restitution payout in DDQ response.";
          findings.push(msg);
          hardGateFailures.push(msg);
        }
      }

      if (
        workflowPack.id === "FULL_COMPLIANCE_AUDIT" ||
        workflowPack.id === "POLICY_GAP_REDLINE" ||
        workflowPack.id === "PRODUCT_STRUCTURING_MEMO"
      ) {
        const hasClearVerdict = /\b(?:HOLD|REJECT|CONDITIONAL|APPROVE|CLEAR|PROCEED)\b/i.test(
          outputMarkdown
        );
        if (!hasClearVerdict) {
          score = Math.max(0, score - 6);
          findings.push("Missing explicit executive compliance decision/verdict.");
        }
      }

      dimensions.push({
        dimension: "EPISTEMIC_HONESTY_AND_JUDGMENT",
        score,
        maxScore,
        passed: score >= 12,
        findings,
      });
    }

    // -------------------------------------------------------------------------
    // Dimension 5: Deliverable Structural Completeness & Statutory Anchors (15 pts)
    // -------------------------------------------------------------------------
    {
      const maxScore = 15;
      let score = maxScore;
      const findings: string[] = [];

      const requiredSections = workflowPack.requiredDeliverableSections.filter((s) => s.required);
      if (requiredSections.length > 0) {
        const missingSections = requiredSections.filter(
          (sec) => !sec.headingPatterns.some((pat) => new RegExp(pat, "i").test(outputMarkdown))
        );
        if (missingSections.length > 0) {
          const deduction = Math.ceil((missingSections.length / requiredSections.length) * 10);
          score = Math.max(0, score - deduction);
          findings.push(
            `Missing required deliverable section(s): ${missingSections.map((s) => s.label).join("; ")}`
          );
        }
      }

      if (benchmarkCase.requiredStatutoryAnchors.length > 0) {
        const missingAnchors = benchmarkCase.requiredStatutoryAnchors.filter(
          (anchor) => !new RegExp(anchor, "i").test(outputMarkdown)
        );
        if (missingAnchors.length > 0) {
          const deduction = Math.ceil(
            (missingAnchors.length / benchmarkCase.requiredStatutoryAnchors.length) * 8
          );
          score = Math.max(0, score - deduction);
          findings.push(`Missing statutory anchor(s): ${missingAnchors.join(", ")}`);
        }
      }

      dimensions.push({
        dimension: "DELIVERABLE_STRUCTURE_COMPLETENESS",
        score,
        maxScore,
        passed: score >= 11,
        findings,
      });
    }

    // -------------------------------------------------------------------------
    // Dimension 6: Runtime Scoping Discipline (15 pts)
    // -------------------------------------------------------------------------
    {
      const maxScore = 15;
      let score = maxScore;
      const findings: string[] = [];

      if (turnPlan.turnIntent !== benchmarkCase.expectedWorkflowId) {
        score = Math.max(0, score - 10);
        const msg = `Routed to '${turnPlan.turnIntent}' instead of expected '${benchmarkCase.expectedWorkflowId}'.`;
        findings.push(msg);
        hardGateFailures.push(msg);
      }

      // Confirm no inactive workflow prompt overlay leaked into the composed system prompt
      const otherPackMarkers: Record<string, string> = {
        PRODUCT_STRUCTURING_MEMO: "ACTIVE ASSIGNMENT: PRODUCT & FEATURE STRUCTURING MEMO",
        POLICY_GAP_REDLINE: "ACTIVE ASSIGNMENT: INTERNAL POLICY & SOP GAP REDLINE",
        SUPERVISORY_DDQ_RESPONSE: "ACTIVE ASSIGNMENT: SUPERVISORY INQUIRY / SPONSOR BANK DDQ RESPONSE",
        CROSS_BORDER_COMPARISON: "ACTIVE ASSIGNMENT: CROSS-BORDER REGULATORY MATRIX & COMPARISON",
        FULL_COMPLIANCE_AUDIT: "ACTIVE ASSIGNMENT: MARKETING CLEARANCE & CAMPAIGN COMPLIANCE AUDIT",
      };

      for (const [packId, marker] of Object.entries(otherPackMarkers)) {
        if (packId !== workflowPack.id && turnPlan.systemInstruction.includes(marker)) {
          score = Math.max(0, score - 5);
          findings.push(`System prompt leaked inactive workflow overlay from '${packId}'.`);
        }
      }

      if (
        totalToolDeclarationsCount > 0 &&
        workflowPack.allowedTools.length > 0 &&
        turnPlan.scopedToolDeclarations.length > workflowPack.allowedTools.length
      ) {
        score = Math.max(0, score - 5);
        findings.push("Scoped tool list exceeded workflow pack's allowedTools boundary.");
      }

      dimensions.push({
        dimension: "RUNTIME_SCOPING_DISCIPLINE",
        score,
        maxScore,
        passed: score >= 12,
        findings,
      });
    }

    const overallScore = dimensions.reduce((sum, d) => sum + d.score, 0);
    const passed =
      hardGateFailures.length === 0 && overallScore >= benchmarkCase.minPassScore;

    return {
      caseId: benchmarkCase.id,
      caseName: benchmarkCase.name,
      roleId: role.identity.roleId,
      workflowId: workflowPack.id,
      passed,
      overallScore,
      minPassScore: benchmarkCase.minPassScore,
      hardGateFailures,
      dimensions,
    };
  }
}

export const goldenBenchmarkEvaluator = new GoldenBenchmarkEvaluator();
