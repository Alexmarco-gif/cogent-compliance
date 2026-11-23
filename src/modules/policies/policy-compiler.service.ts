/**
 * Cogent Compliance OS — Deterministic Policy Compiler, Structured Extractor,
 * Board Pack Assembler & Publication Delta Brief Generator
 *
 * Bridges AI-authored Policy Gap Redlines & Net-New Policy Drafts into live,
 * structured operational objects:
 *  1. Structured JSON Payload (`StructuredPolicyRedlinePayload`)
 *  2. Clean Compiled vNext Policy Markdown (no manual copy-paste from redline tables)
 *  3. Live Operational Controls (Policy Rule vs. Procedure vs. Enforcing Control)
 *  4. Live Statutory Operational Clocks (Section 3)
 *  5. Live P0–P3 Implementation Tasks (Section 5)
 *  6. Regulatory Obligation Mappings
 *  7. Auto-Assembled Board / Committee Approval Pack
 *  8. Department-Targeted "What Changed" Publication Delta Brief
 */

import crypto from "crypto";
import {
  structuredPolicyRedlinePayloadSchema,
  type CompliancePolicyRecord,
  type PolicyApprovalStepRecord,
  type PolicyApprovalTier,
  type PolicyClauseCommentRecord,
  type PolicyDomain,
  type PolicyQaValidationReport,
  type PolicyReviewAssignmentRecord,
  type PolicyVersionRecord,
  type StructuredGovernanceClause,
  type StructuredObligationMapping,
  type StructuredOperationalClock,
  type StructuredPolicyRedlinePayload,
  type StructuredRedlineClause,
  type StructuredRemediationItem,
} from "@/contracts/policy.contracts";

interface MarkdownTable {
  heading: string;
  headers: string[];
  rows: string[][];
}

export interface CompiledOperationalBundle {
  obligation_mappings: StructuredObligationMapping[];
  controls: Array<{
    control_code: string;
    clause_reference: string;
    policy_rule_summary: string;
    procedure_steps: string;
    control_statement: string;
    control_type: "PREVENTIVE" | "DETECTIVE" | "CORRECTIVE";
    automation_level: "AUTOMATED" | "SEMI_AUTOMATED" | "MANUAL";
    owner_department: string;
    test_frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "ANNUAL";
    statutory_basis: string;
  }>;
  operational_clocks: StructuredOperationalClock[];
  implementation_tasks: Array<{
    priority: "P0" | "P1" | "P2" | "P3";
    title: string;
    description: string;
    accountable_owner: string;
    owner_department: string;
    target_deadline: string;
    source_type: "REMEDIATION_SCHEDULE" | "GOVERNANCE_CLAUSE";
  }>;
}

export interface CompileCleanPolicyOptions {
  policyRefNo: string;
  policyTitle: string;
  versionNumber: number;
  ownerName: string;
  ownerDepartment: string;
  approvalTier: PolicyApprovalTier;
  effectiveDate?: string | null;
  nextReviewDate?: string | null;
  approvingAuthority?: string | null;
  institutionName?: string;
  acceptedClauseRefs?: string[];
  clauseOverrides?: Array<{
    clause_reference: string;
    compliant_replacement_text: string;
    accepted?: boolean;
  }>;
  includeGovernanceClauses?: boolean;
  includeOperationalClocksAppendix?: boolean;
}

export class PolicyCompilerService {
  /**
   * Computes deterministic SHA-256 content hash for immutable policy integrity.
   */
  public computeSha256(content: string): string {
    return crypto.createHash("sha256").update(content, "utf8").digest("hex");
  }

  /**
   * Parses SLA strings (e.g., "24 hours", "72h", "7 days", "48 business hours") into approximate hours.
   */
  public parseSlaToHours(slaText: string): number | null {
    const clean = slaText.toLowerCase();
    const hourMatch = clean.match(/\b(\d+)\s*(?:h|hr|hrs|hour|hours)\b/);
    if (hourMatch) {
      return Number(hourMatch[1]);
    }
    const dayMatch = clean.match(/\b(\d+)\s*(?:working\s+|business\s+|calendar\s+)?(?:d|day|days)\b/);
    if (dayMatch) {
      return Number(dayMatch[1]) * 24;
    }
    if (/\bimmediate(?:ly)?\b|\breal[- ]?time\b/.test(clean)) {
      return 1;
    }
    return null;
  }

  /**
   * Infers domain & recommended approval tier from policy title/content using Nigerian statutory rules
   * (e.g., CBN mandates Board approval for AML/CFT/CPF & Enterprise Risk policies).
   */
  public inferDomainAndApprovalTier(text: string): {
    domain: PolicyDomain;
    recommendedApprovalTier: PolicyApprovalTier;
  } {
    const lower = text.toLowerCase();
    if (/\b(?:aml|cft|cpf|mlppa|nfiu|suspicious\s+transaction|money\s+laundering)\b/.test(lower)) {
      return { domain: "AML_CFT_CPF", recommendedApprovalTier: "TIER_3_BOARD" };
    }
    if (/\b(?:kyc|cdd|edd|know\s+your\s+customer|customer\s+due\s+diligence|bvn|nin\s+verification)\b/.test(lower)) {
      return { domain: "KYC_CDD", recommendedApprovalTier: "TIER_3_BOARD" };
    }
    if (/\b(?:ndpa|ndpc|gaid|data\s+protection|privacy\s+policy|personal\s+data|dpo)\b/.test(lower)) {
      return { domain: "DATA_PROTECTION", recommendedApprovalTier: "TIER_3_BOARD" };
    }
    if (/\b(?:digital\s+lending|deon|debt\s+collection|loan\s+recovery|consumer\s+credit)\b/.test(lower)) {
      return { domain: "DIGITAL_LENDING", recommendedApprovalTier: "TIER_2_COMMITTEE" };
    }
    if (/\b(?:instant\s+eft|dispense\s+error|payments?\s+data\s+locali|nip\b|pssp|settlement)\b/.test(lower)) {
      return { domain: "PAYMENTS_EFT", recommendedApprovalTier: "TIER_2_COMMITTEE" };
    }
    if (/\b(?:fraud|cyber|infosec|information\s+security|incident\s+response)\b/.test(lower)) {
      return { domain: "FRAUD_CYBER", recommendedApprovalTier: "TIER_3_BOARD" };
    }
    if (/\b(?:consumer\s+protection|complaint\s+management|cbn\s+cpr)\b/.test(lower)) {
      return { domain: "CONSUMER_PROTECTION", recommendedApprovalTier: "TIER_2_COMMITTEE" };
    }
    if (/\b(?:enterprise\s+risk|erm\b|risk\s+management)\b/.test(lower)) {
      return { domain: "ENTERPRISE_RISK", recommendedApprovalTier: "TIER_3_BOARD" };
    }
    if (/\b(?:marketing|arcon|advertising|financial\s+promotion)\b/.test(lower)) {
      return { domain: "MARKETING_COMMS", recommendedApprovalTier: "TIER_1_CCO" };
    }
    return { domain: "GOVERNANCE_OTHER", recommendedApprovalTier: "TIER_2_COMMITTEE" };
  }

  /**
   * Infers the accountable department from a role/owner label.
   */
  public inferOwnerDepartment(ownerText: string): string {
    const lower = ownerText.toLowerCase();
    if (/\b(?:cto|eng|tech|devops|platform|it\b|system)\b/.test(lower)) return "Technology";
    if (/\b(?:ciso|infosec|security|dpo|privacy)\b/.test(lower)) return "Information Security";
    if (/\b(?:legal|counsel|company\s+secretary)\b/.test(lower)) return "Legal";
    if (/\b(?:risk|cro)\b/.test(lower)) return "Risk Management";
    if (/\b(?:ops|operations|onboarding|support|collections|customer\s+service)\b/.test(lower)) {
      return "Operations";
    }
    if (/\b(?:product|marketing|growth)\b/.test(lower)) return "Business / Product";
    if (/\b(?:board|md|ceo|committee)\b/.test(lower)) return "Executive Management";
    if (/\b(?:audit)\b/.test(lower)) return "Internal Audit";
    return "Compliance";
  }

  /**
   * Infers Nigerian regulator code from an authority string.
   */
  public inferRegulatorCode(authorityText: string): string {
    const upper = authorityText.toUpperCase();
    if (/\bCBN\b|CENTRAL\s+BANK/.test(upper)) return "CBN";
    if (/\bNFIU\b|MLPPA|MONEY\s+LAUNDERING/.test(upper)) return "NFIU";
    if (/\bNDPC\b|\bNDPA\b|\bGAID\b/.test(upper)) return "NDPC";
    if (/\bFCCPC\b|\bDEON\b|\bFCCPA\b/.test(upper)) return "FCCPC";
    if (/\bARCON\b/.test(upper)) return "ARCON";
    if (/\bSEC\b|\bISA\b/.test(upper)) return "SEC";
    if (/\bNDIC\b/.test(upper)) return "NDIC";
    return "CBN";
  }

  /**
   * Extracts all Markdown tables alongside their nearest preceding heading.
   */
  private extractMarkdownTables(markdown: string): MarkdownTable[] {
    const lines = markdown.split(/\r?\n/);
    const tables: MarkdownTable[] = [];
    let currentHeading = "General";

    let i = 0;
    while (i < lines.length) {
      const line = lines[i]?.trim() || "";
      const headingMatch = line.match(/^#{1,6}\s+(.+)$/);
      if (headingMatch) {
        currentHeading = headingMatch[1]!.replace(/\*\*/g, "").trim();
        i++;
        continue;
      }

      if (line.startsWith("|") && line.endsWith("|") && i + 1 < lines.length) {
        const nextLine = lines[i + 1]?.trim() || "";
        if (/^\|[\s:|-]+\|$/.test(nextLine)) {
          const headers = line
            .slice(1, -1)
            .split("|")
            .map((h) => h.replace(/\*\*/g, "").trim());
          const rows: string[][] = [];
          i += 2;
          while (i < lines.length) {
            const rowLine = lines[i]?.trim() || "";
            if (!rowLine.startsWith("|") || !rowLine.endsWith("|")) break;
            const cells = rowLine
              .slice(1, -1)
              .split("|")
              .map((c) => c.trim());
            if (cells.length > 0 && !cells.every((c) => /^[-:\s]*$/.test(c))) {
              rows.push(cells);
            }
            i++;
          }
          tables.push({ heading: currentHeading, headers, rows });
          continue;
        }
      }
      i++;
    }

    return tables;
  }

  /**
   * Parses Cogent's 6-part Policy Gap Redline or Net-New Policy Draft Markdown (and any embedded
   * structured JSON payload) into a canonical, validated `StructuredPolicyRedlinePayload`.
   */
  public parseRedlineMarkdownToStructuredPayload(
    markdown: string,
    workflowSource: "POLICY_GAP_REDLINE" | "POLICY_DRAFT_NEW" | "MANUAL" = "POLICY_GAP_REDLINE",
    existingStructured?: Record<string, unknown> | null,
  ): StructuredPolicyRedlinePayload {
    // 1. If a valid structured payload was already supplied (e.g., from LLM tool call), validate & enrich it
    if (existingStructured && Object.keys(existingStructured).length > 0) {
      const parsed = structuredPolicyRedlinePayloadSchema.safeParse(existingStructured);
      if (parsed.success && (parsed.data.clauses.length > 0 || parsed.data.operational_clocks.length > 0)) {
        return parsed.data;
      }
    }

    // 2. Check for an embedded fenced JSON block if present
    const embeddedJsonMatch = markdown.match(/```json:policy_structured_payload\s*([\s\S]*?)```/i);
    if (embeddedJsonMatch?.[1]) {
      try {
        const rawObj = JSON.parse(embeddedJsonMatch[1]);
        const parsed = structuredPolicyRedlinePayloadSchema.safeParse(rawObj);
        if (parsed.success) {
          return parsed.data;
        }
      } catch {
        // Fall through to deterministic Markdown parser
      }
    }

    const titleMatch = markdown.match(/^#{1,3}\s+(.+)$/m);
    const policyTitle = (titleMatch?.[1] || "Compliance Policy Deliverable")
      .replace(/\*\*/g, "")
      .trim();

    // Parse decision header
    const decisionLineMatch = markdown.match(
      /(?:decision|verdict)\s*[:—-]\s*(.+)/i,
    );
    const decisionHeadline = (decisionLineMatch?.[1] || "").replace(/[`*]/g, "").trim();
    let decision: "REJECT" | "CONDITIONAL_APPROVAL" | "APPROVE" = "CONDITIONAL_APPROVAL";
    if (/\breject|withdraw|non[- ]?compliant\b/i.test(decisionHeadline)) {
      decision = "REJECT";
    } else if (/\bapprove\b/i.test(decisionHeadline) && !/conditional/i.test(decisionHeadline)) {
      decision = "APPROVE";
    }

    const { domain, recommendedApprovalTier } = this.inferDomainAndApprovalTier(
      `${policyTitle}\n${markdown.slice(0, 4000)}`,
    );

    const tables = this.extractMarkdownTables(markdown);
    const clauses: StructuredRedlineClause[] = [];
    const operationalClocks: StructuredOperationalClock[] = [];
    const remediationSchedule: StructuredRemediationItem[] = [];
    const obligationMap = new Map<string, StructuredObligationMapping>();

    for (const table of tables) {
      const lowerHeaders = table.headers.map((h) => h.toLowerCase());

      // A. 5-Column Redline Matrix Table
      const isRedlineTable =
        lowerHeaders.some((h) => /clause\s*ref|section|clause/i.test(h)) &&
        lowerHeaders.some(
          (h) => !/non[- ]?compliant/i.test(h) && /replacement|compliant\s+text|proposed/i.test(h),
        );

      if (isRedlineTable) {
        const refIdx = lowerHeaders.findIndex((h) => /clause\s*ref|clause|section/i.test(h));
        const currIdx = lowerHeaders.findIndex((h) => /current|existing|non[- ]?compliant/i.test(h));
        const breachIdx = lowerHeaders.findIndex((h) => /breach|gap|issue|violation/i.test(h));
        const replIdx = lowerHeaders.findIndex(
          (h) => !/non[- ]?compliant/i.test(h) && /replacement|compliant\s+text|proposed/i.test(h),
        );
        const authIdx = lowerHeaders.findIndex((h) => /floor|authority|statut|basis|regulator/i.test(h));

        for (const row of table.rows) {
          const clauseRef = (row[refIdx >= 0 ? refIdx : 0] || "").replace(/\*\*/g, "").trim();
          const currentText = (currIdx >= 0 ? row[currIdx] : "") || "";
          const breachText = (breachIdx >= 0 ? row[breachIdx] : "") || "";
          const replacementText = (row[replIdx >= 0 ? replIdx : 3] || "").trim();
          const authorityText = ((authIdx >= 0 ? row[authIdx] : row[4]) || "").trim();

          if (!clauseRef || !replacementText) continue;

          const severity: StructuredRedlineClause["severity"] =
            /\b(critical|prohibited|criminal|strict\s+liability|illegal|zero[- ]threshold|72[- ]?hour|5[- ]?year|bvn|nin)\b/i.test(
              `${breachText} ${authorityText}`,
            )
              ? "CRITICAL"
              : /\b(high|mandatory|statutory|must|required)\b/i.test(`${breachText} ${authorityText}`)
                ? "HIGH"
                : "MEDIUM";

          const ownerDept = this.inferOwnerDepartment(`${table.heading} ${replacementText}`);
          clauses.push({
            clause_reference: clauseRef,
            section_heading: table.heading,
            current_text: currentText,
            statutory_breach: breachText,
            compliant_replacement_text: replacementText,
            statutory_floor: authorityText,
            governing_authority: authorityText,
            severity,
            procedure_summary: this.deriveProcedureFromClause(replacementText, ownerDept),
            control_statement: this.deriveControlFromClause(replacementText, clauseRef),
            control_type: /\b(monitor|audit|review|reconcil|log|report|alert|test)\b/i.test(replacementText)
              ? "DETECTIVE"
              : "PREVENTIVE",
            automation_level: /\b(system|automated|api|block|prevent|electronic|portal|workflow)\b/i.test(
              replacementText,
            )
              ? "AUTOMATED"
              : "SEMI_AUTOMATED",
            owner_department: ownerDept,
            accepted: true,
          });

          if (authorityText.length >= 3) {
            const regulator = this.inferRegulatorCode(authorityText);
            const key = `${regulator}::${authorityText.slice(0, 80).toLowerCase()}`;
            if (!obligationMap.has(key)) {
              obligationMap.set(key, {
                regulator,
                instrument_title: authorityText.slice(0, 140),
                clause_reference: clauseRef,
                obligation_summary: (breachText || replacementText).slice(0, 260),
                mapped_policy_clause: clauseRef,
                coverage_status: "COVERED",
              });
            }
          }
        }
        continue;
      }

      // B. Section 3 — Statutory Timing & Operational Clock Register Table
      const isClockTable =
        lowerHeaders.some((h) => /event|trigger/i.test(h)) &&
        lowerHeaders.some((h) => /timing|sla|clock|window|deadline/i.test(h));

      if (isClockTable) {
        const evtIdx = lowerHeaders.findIndex((h) => /event|trigger/i.test(h));
        const slaIdx = lowerHeaders.findIndex((h) => /timing|sla|clock|window|deadline/i.test(h));
        const authIdx = lowerHeaders.findIndex((h) => /basis|authority|statut|law|regulation/i.test(h));

        for (const row of table.rows) {
          const eventTrigger = (row[evtIdx >= 0 ? evtIdx : 0] || "").replace(/\*\*/g, "").trim();
          const bindingSla = (row[slaIdx >= 0 ? slaIdx : 1] || "").replace(/\*\*/g, "").trim();
          const authority = (row[authIdx >= 0 ? authIdx : 2] || "Applicable Nigerian Regulation")
            .replace(/\*\*/g, "")
            .trim();

          if (!eventTrigger || !bindingSla) continue;

          operationalClocks.push({
            event_trigger: eventTrigger,
            binding_sla: bindingSla,
            sla_hours: this.parseSlaToHours(bindingSla),
            governing_authority: authority,
            owner_department: this.inferOwnerDepartment(eventTrigger),
            escalation_path: "Escalate to Chief Compliance Officer upon 75% SLA elapsed.",
          });

          const regulator = this.inferRegulatorCode(authority);
          const key = `${regulator}::clock::${eventTrigger.slice(0, 60).toLowerCase()}`;
          if (!obligationMap.has(key)) {
            obligationMap.set(key, {
              regulator,
              instrument_title: authority.slice(0, 140),
              clause_reference: "Operational Clock",
              obligation_summary: `${eventTrigger}: ${bindingSla}`,
              mapped_policy_clause: "Section 3 — Operational Clock Register",
              coverage_status: "COVERED",
            });
          }
        }
        continue;
      }

      // C. Section 5 — Prioritized Remediation & Implementation Schedule Table
      const isRemediationTable =
        lowerHeaders.some((h) => /priority/i.test(h)) &&
        lowerHeaders.some((h) => /remediation|action|task|deliverable/i.test(h));

      if (isRemediationTable) {
        const prioIdx = lowerHeaders.findIndex((h) => /priority/i.test(h));
        const actIdx = lowerHeaders.findIndex((h) => /remediation|action|task|deliverable/i.test(h));
        const ownIdx = lowerHeaders.findIndex((h) => /owner|accountable|responsible/i.test(h));
        const dueIdx = lowerHeaders.findIndex((h) => /deadline|target|timeline|due/i.test(h));

        for (const row of table.rows) {
          const rawPrio = (row[prioIdx >= 0 ? prioIdx : 0] || "P1").toUpperCase();
          const priority: "P0" | "P1" | "P2" | "P3" = rawPrio.includes("P0")
            ? "P0"
            : rawPrio.includes("P2")
              ? "P2"
              : rawPrio.includes("P3")
                ? "P3"
                : "P1";
          const action = (row[actIdx >= 0 ? actIdx : 1] || "").replace(/\*\*/g, "").trim();
          const owner = (row[ownIdx >= 0 ? ownIdx : 2] || "Chief Compliance Officer")
            .replace(/\*\*/g, "")
            .trim();
          const deadline = (row[dueIdx >= 0 ? dueIdx : 3] || "14 Days").replace(/\*\*/g, "").trim();

          if (!action) continue;

          remediationSchedule.push({
            priority,
            action,
            accountable_owner: owner,
            owner_department: this.inferOwnerDepartment(`${owner} ${action}`),
            target_deadline: deadline,
          });
        }
      }
    }

    // D. Extract Section 4 — Additional Governance Clauses
    const governanceClauses = this.extractGovernanceClauses(markdown);

    // E. Extract Section 6 — Board Resolution Text
    const boardResolutionText = this.extractSectionBody(
      markdown,
      /section\s+6|board\s+(?:approval|adoption|withdrawal|resolution)/i,
    );

    // F. Extract Section 1 — Licensing & Drafting Basis
    const licensingScopeSummary = this.extractSectionBody(
      markdown,
      /section\s+1|application\s+(?:&|and)\s+drafting\s+basis|licensing\s+scope/i,
    ).slice(0, 1200);

    return structuredPolicyRedlinePayloadSchema.parse({
      schema_version: "2.0",
      workflow_source: workflowSource,
      decision,
      decision_headline: decisionHeadline || `${decision} — ${policyTitle}`,
      policy_title: policyTitle,
      policy_domain: domain,
      recommended_approval_tier: recommendedApprovalTier,
      licensing_scope_summary: licensingScopeSummary,
      clauses,
      operational_clocks: operationalClocks,
      governance_clauses: governanceClauses,
      remediation_schedule: remediationSchedule,
      obligation_mappings: Array.from(obligationMap.values()),
      board_resolution_text: boardResolutionText,
    });
  }

  /**
   * Compiles accepted redlines, overrides, governance clauses, and official institutional
   * metadata into a clean, publication-ready Policy vNext Markdown document.
   */
  public compileCleanPolicyDocument(
    payload: StructuredPolicyRedlinePayload,
    options: CompileCleanPolicyOptions,
  ): {
    cleanMarkdown: string;
    acceptedCount: number;
    rejectedCount: number;
    updatedPayload: StructuredPolicyRedlinePayload;
  } {
    const overrideMap = new Map(
      (options.clauseOverrides || []).map((o) => [o.clause_reference.trim(), o]),
    );
    const acceptedSet = options.acceptedClauseRefs
      ? new Set(options.acceptedClauseRefs.map((r) => r.trim()))
      : null;

    let acceptedCount = 0;
    let rejectedCount = 0;

    const updatedClauses = payload.clauses.map((clause) => {
      const override = overrideMap.get(clause.clause_reference.trim());
      const accepted =
        override?.accepted !== undefined
          ? override.accepted
          : acceptedSet
            ? acceptedSet.has(clause.clause_reference.trim())
            : clause.accepted !== false;

      if (accepted) {
        acceptedCount++;
      } else {
        rejectedCount++;
      }

      return {
        ...clause,
        compliant_replacement_text:
          override?.compliant_replacement_text || clause.compliant_replacement_text,
        accepted,
      };
    });

    const updatedPayload: StructuredPolicyRedlinePayload = {
      ...payload,
      clauses: updatedClauses,
    };

    const grouped = new Map<string, StructuredRedlineClause[]>();
    for (const clause of updatedClauses) {
      const section = clause.section_heading || "Core Policy Requirements";
      const list = grouped.get(section) || [];
      list.push(clause);
      grouped.set(section, list);
    }

    const lines: string[] = [
      `# ${options.policyTitle}`,
      "",
      "## Document Control & Institutional Governance Metadata",
      "",
      "| Governance Field | Official Value |",
      "| --- | --- |",
      `| **Institution** | ${options.institutionName || "Regulated Financial Institution"} |`,
      `| **Policy Reference Number** | \`${options.policyRefNo}\` |`,
      `| **Version** | \`v${options.versionNumber}.0\` |`,
      `| **Policy Owner** | ${options.ownerName} (${options.ownerDepartment}) |`,
      `| **Delegated Approval Authority** | ${options.approvingAuthority || options.approvalTier} |`,
      `| **Effective Date** | ${options.effectiveDate || "Pending Formal Approval"} |`,
      `| **Next Scheduled Review Date** | ${options.nextReviewDate || "12 Months from Effective Date"} |`,
      "",
    ];

    if (payload.licensing_scope_summary) {
      lines.push("## 1. Purpose, Scope & Regulatory Basis", "", payload.licensing_scope_summary, "");
    } else {
      lines.push(
        "## 1. Purpose, Scope & Regulatory Basis",
        "",
        `This policy establishes binding institutional rules, operational procedures, and enforcing controls for **${options.policyTitle}** across all employees, third-party agents, systems, and customer channels within the institution's licensed regulatory perimeter.`,
        "",
      );
    }

    lines.push(
      "## 2. Three Lines of Defense Accountability",
      "",
      "- **First Line (Business, Product, Operations, Technology & InfoSec):** Responsible for implementing policy procedures, operating preventive/detective controls, and maintaining operational evidence.",
      "- **Second Line (Compliance, Legal & Risk Management):** Responsible for regulatory interpretation, statutory QA validation, control monitoring, and exception governance.",
      "- **Third Line (Internal Audit):** Provides independent assurance on control design and operating effectiveness (advisory-only during drafting to preserve independence).",
      "",
    );

    lines.push("## 3. Binding Policy Requirements, Procedures & Controls", "");

    if (grouped.size === 0) {
      lines.push(
        "_Compiled from structured institutional draft; no clause-level redline deltas were queued._",
        "",
      );
    } else {
      for (const [sectionHeading, sectionClauses] of grouped.entries()) {
        lines.push(`### ${sectionHeading}`, "");
        for (const clause of sectionClauses) {
          const textToUse = clause.accepted
            ? clause.compliant_replacement_text
            : clause.current_text || clause.compliant_replacement_text;
          const badge = clause.accepted ? "" : " *(Retained Prior Text — Pending Exception Review)*";
          lines.push(`#### Clause ${clause.clause_reference}${badge}`, "");
          lines.push(`**Policy Requirement:** ${textToUse}`, "");
          if (clause.procedure_summary) {
            lines.push(`- **Operational Procedure:** ${clause.procedure_summary}`);
          }
          if (clause.control_statement) {
            lines.push(
              `- **Enforcing Control (${clause.control_type} / ${clause.automation_level} — Owner: ${clause.owner_department}):** ${clause.control_statement}`,
            );
          }
          if (clause.governing_authority) {
            lines.push(`- **Regulatory Basis:** ${clause.governing_authority}`);
          }
          lines.push("");
        }
      }
    }

    if (options.includeGovernanceClauses !== false && payload.governance_clauses.length > 0) {
      lines.push("## 4. Mandatory Governance, Exceptions, Escalation & Record Retention", "");
      for (const gc of payload.governance_clauses) {
        lines.push(`### ${gc.clause_reference} — ${gc.section_heading}`, "", gc.clause_text, "");
      }
    } else {
      lines.push(
        "## 4. Exceptions, Escalation, Record Retention & Review Cycle",
        "",
        "- **Exceptions & Waivers:** Any deviation from this policy requires a documented, time-bound exception request approved by Risk Management and the Chief Compliance Officer. Unapproved deviations constitute a reportable control failure.",
        "- **Escalation:** Suspected statutory violations or control failures must be escalated immediately to the Chief Compliance Officer and reported through governance channels.",
        "- **Record Retention:** All compliance, KYC/AML, transaction, and governance records must be retained in tamper-evident storage for a minimum of **five (5) years** following transaction completion or termination of the customer relationship, in accordance with MLPPA 2022 Section 8 and CBN AML/CFT/CPF Regulations.",
        "- **Periodic Review:** This policy shall be reviewed at least annually and immediately upon any material regulatory circular, audit finding, or new product launch.",
        "",
      );
    }

    if (
      options.includeOperationalClocksAppendix !== false &&
      payload.operational_clocks.length > 0
    ) {
      lines.push(
        "## Appendix A — Mandatory Statutory Timing & Operational Clock Schedule",
        "",
        "| Operational Event / Trigger | Binding Statutory SLA | Accountable Department | Governing Authority |",
        "| --- | --- | --- | --- |",
      );
      for (const clock of payload.operational_clocks) {
        lines.push(
          `| ${clock.event_trigger} | ${clock.binding_sla} | ${clock.owner_department} | ${clock.governing_authority} |`,
        );
      }
      lines.push("");
    }

    return {
      cleanMarkdown: lines.join("\n").trim() + "\n",
      acceptedCount,
      rejectedCount,
      updatedPayload,
    };
  }

  /**
   * Compiles structured payload Sections 2, 3 & 5 into live relational records:
   *  - `policy_obligation_mappings`
   *  - `policy_controls`
   *  - `policy_operational_clocks`
   *  - `policy_implementation_tasks`
   */
  public extractOperationalObjects(
    payload: StructuredPolicyRedlinePayload,
    policyRefNo: string,
  ): CompiledOperationalBundle {
    const cleanPrefix = policyRefNo.replace(/[^A-Z0-9-]/gi, "").toUpperCase();

    const controls = payload.clauses
      .filter((c) => c.accepted !== false)
      .map((clause, index) => ({
        control_code: `CTL-${cleanPrefix}-${String(index + 1).padStart(2, "0")}`,
        clause_reference: clause.clause_reference,
        policy_rule_summary: clause.compliant_replacement_text.slice(0, 600),
        procedure_steps:
          clause.procedure_summary ||
          this.deriveProcedureFromClause(clause.compliant_replacement_text, clause.owner_department),
        control_statement:
          clause.control_statement ||
          this.deriveControlFromClause(clause.compliant_replacement_text, clause.clause_reference),
        control_type: clause.control_type || "PREVENTIVE",
        automation_level: clause.automation_level || "SEMI_AUTOMATED",
        owner_department: clause.owner_department || "Operations",
        test_frequency:
          clause.severity === "CRITICAL"
            ? ("MONTHLY" as const)
            : clause.severity === "HIGH"
              ? ("QUARTERLY" as const)
              : ("ANNUAL" as const),
        statutory_basis: clause.governing_authority || clause.statutory_floor || "Institutional Policy",
      }));

    const implementationTasks = payload.remediation_schedule.map((item) => ({
      priority: item.priority,
      title: item.action.slice(0, 200),
      description: `Compiled from Policy Remediation Schedule (${policyRefNo}). Target deadline: ${item.target_deadline}.`,
      accountable_owner: item.accountable_owner,
      owner_department: item.owner_department || this.inferOwnerDepartment(item.accountable_owner),
      target_deadline: item.target_deadline,
      source_type: "REMEDIATION_SCHEDULE" as const,
    }));

    return {
      obligation_mappings: payload.obligation_mappings,
      controls,
      operational_clocks: payload.operational_clocks,
      implementation_tasks: implementationTasks,
    };
  }

  /**
   * Auto-assembles an executive-ready Board / Management Committee Approval Pack.
   */
  public assembleBoardPack(params: {
    policy: CompliancePolicyRecord;
    version: PolicyVersionRecord;
    payload: StructuredPolicyRedlinePayload;
    reviews: PolicyReviewAssignmentRecord[];
    comments: PolicyClauseCommentRecord[];
    qaReport: PolicyQaValidationReport | null;
    approvalSteps: PolicyApprovalStepRecord[];
  }): string {
    const { policy, version, payload, reviews, comments, qaReport, approvalSteps } = params;
    const resolvedBlockers = comments.filter((c) => c.is_feasibility_blocker);

    const lines: string[] = [
      `# Formal Governance Approval Pack — ${policy.title}`,
      "",
      `**Policy Reference:** \`${policy.policy_ref_no}\` | **Version:** \`v${version.version_number}.0\` | **Approval Tier:** \`${policy.approval_tier}\``,
      `**Policy Owner:** ${policy.owner_name || policy.owner_user_id} (${policy.owner_department}) | **Review Cycle:** Every ${policy.review_cycle_months} months`,
      `**Document Integrity Hash (SHA-256):** \`${version.source_hash_sha256}\``,
      "",
      "---",
      "",
      "## 1. Executive Submission Summary",
      "",
      `- **Initiation Type:** ${version.change_type} (Trigger: ${version.trigger_source}${version.trigger_reference ? ` — Ref: ${version.trigger_reference}` : ""})`,
      `- **Compliance Decision Basis:** ${payload.decision_headline || "Statutory alignment and control operationalization"}`,
      `- **Substantive Clauses Compiled:** ${payload.clauses.filter((c) => c.accepted !== false).length} accepted compliant clauses`,
      `- **Binding Operational Clocks Mapped:** ${payload.operational_clocks.length}`,
      `- **Implementation Actions Queued (P0–P3):** ${payload.remediation_schedule.length}`,
      "",
      "## 2. Post-Draft Statutory Floor QA Certification",
      "",
      qaReport
        ? `- **QA Gate Result:** **${qaReport.passed ? "PASSED" : "FAILED"}** (${qaReport.total_checks} deterministic statutory checks executed at ${qaReport.checked_at})\n- **Summary:** ${qaReport.summary}`
        : "- **QA Gate Result:** Pending validation.",
      "",
      "## 3. Cross-Functional Stakeholder Review Sign-Off Log (Three Lines of Defense)",
      "",
    ];

    if (reviews.length === 0) {
      lines.push("_No cross-functional review assignments recorded for this version._", "");
    } else {
      lines.push(
        "| Department | Role | Defense Line | Advisory Only | Review Status | Notes |",
        "| --- | --- | --- | --- | --- | --- |",
      );
      for (const r of reviews) {
        lines.push(
          `| ${r.reviewer_department} | ${r.reviewer_role} | ${r.defense_line} | ${r.is_advisory_only ? "Yes (Independent Assurance)" : "No"} | ${r.status} | ${(r.summary_notes || "—").replace(/\|/g, "/")} |`,
        );
      }
      lines.push("");
    }

    if (resolvedBlockers.length > 0) {
      lines.push(
        "## 4. Feasibility Blockers & Operational Resolution Log",
        "",
        "| Clause | Department | Blocker Summary | Resolution Status | Resolution Notes |",
        "| --- | --- | --- | --- | --- |",
      );
      for (const b of resolvedBlockers) {
        lines.push(
          `| ${b.clause_reference} | ${b.author_department} | ${b.comment_text.slice(0, 140).replace(/\|/g, "/")} | ${b.status} | ${(b.resolution_notes || "Pending").replace(/\|/g, "/")} |`,
        );
      }
      lines.push("");
    }

    lines.push(
      "## 5. Delegated Approval Sequence",
      "",
      "| Step | Approving Authority | Required Role | Status |",
      "| --- | --- | --- | --- |",
    );
    for (const s of approvalSteps) {
      lines.push(`| ${s.step_order} | ${s.approver_label} | ${s.approver_role} | ${s.status} |`);
    }
    lines.push("");

    lines.push(
      "## 6. Formal Resolution Wording for Adoption",
      "",
      payload.board_resolution_text ||
        `RESOLVED THAT the **${policy.title}** (Reference \`${policy.policy_ref_no}\`, Version \`v${version.version_number}.0\`) be and is hereby APPROVED and ADOPTED with effect from the effective date recorded in the Policy Register, superseding all prior inconsistent versions, and that Executive Management and the Chief Compliance Officer are directed to oversee publication, employee attestation, and implementation of all P0–P3 operational controls within the prescribed statutory deadlines.`,
      "",
    );

    return lines.join("\n").trim() + "\n";
  }

  /**
   * Generates a department-targeted "What Changed" Publication Delta Brief upon publication.
   */
  public generateDeltaBrief(params: {
    policy: CompliancePolicyRecord;
    version: PolicyVersionRecord;
    previousVersion?: PolicyVersionRecord | null;
    payload: StructuredPolicyRedlinePayload;
  }): string {
    const { policy, version, previousVersion, payload } = params;
    const affectedDepts = Array.from(
      new Set([
        policy.owner_department,
        ...payload.clauses.map((c) => c.owner_department),
        ...payload.remediation_schedule.map((r) => r.owner_department),
      ].filter(Boolean)),
    );

    const lines: string[] = [
      `# Policy Publication Delta Brief — ${policy.title} (\`${policy.policy_ref_no}\` v${version.version_number}.0)`,
      "",
      `**Effective Date:** ${policy.effective_date || new Date().toISOString().slice(0, 10)} | **Supersedes:** ${previousVersion ? `v${previousVersion.version_number}.0` : "Initial Institutional Baseline"} | **Approving Authority:** ${policy.approving_authority || policy.approval_tier}`,
      `**Affected Departments:** ${affectedDepts.join(", ")}`,
      "",
      "## Executive Summary of What Changed",
      "",
      version.change_summary ||
        payload.decision_headline ||
        `Updated institutional policy rules, operational controls, and statutory SLAs for ${policy.title}.`,
      "",
    ];

    if (payload.clauses.length > 0) {
      lines.push(
        "## Key Policy & Control Changes by Clause",
        "",
        "| Clause | Impacted Department | New Binding Requirement | Governing Statutory Basis |",
        "| --- | --- | --- | --- |",
      );
      for (const c of payload.clauses.filter((cl) => cl.accepted !== false).slice(0, 20)) {
        lines.push(
          `| ${c.clause_reference} | ${c.owner_department} | ${c.compliant_replacement_text.slice(0, 160).replace(/\|/g, "/")} | ${(c.governing_authority || "—").replace(/\|/g, "/")} |`,
        );
      }
      lines.push("");
    }

    if (payload.operational_clocks.length > 0) {
      lines.push("## Mandatory Statutory Clocks Staff Must Observe", "");
      for (const clock of payload.operational_clocks) {
        lines.push(
          `- **${clock.event_trigger}:** \`${clock.binding_sla}\` (${clock.owner_department} — ${clock.governing_authority})`,
        );
      }
      lines.push("");
    }

    if (payload.remediation_schedule.length > 0) {
      lines.push("## Immediate Departmental Operationalization Actions", "");
      for (const task of payload.remediation_schedule.slice(0, 12)) {
        lines.push(
          `- **[${task.priority}] ${task.owner_department} (${task.accountable_owner}):** ${task.action} — Target: *${task.target_deadline}*`,
        );
      }
      lines.push("");
    }

    lines.push(
      "## Mandatory Employee Action",
      "",
      "All designated personnel must review this Delta Brief and the full published policy, and record their formal attestation in Cogent Policy Workflow before the attestation deadline.",
    );

    return lines.join("\n").trim() + "\n";
  }

  private deriveProcedureFromClause(replacementText: string, ownerDept: string): string {
    return `${ownerDept} personnel shall execute documented SOP steps verifying compliance with: "${replacementText.slice(0, 180)}${replacementText.length > 180 ? "..." : ""}" prior to transaction or customer workflow completion.`;
  }

  private deriveControlFromClause(replacementText: string, clauseRef: string): string {
    return `Enforcing control for Clause ${clauseRef}: verify and log objective evidence that "${replacementText.slice(0, 150)}${replacementText.length > 150 ? "..." : ""}" is satisfied before progression, with unapproved exceptions escalated to Compliance.`;
  }

  private extractSectionBody(markdown: string, headingPattern: RegExp): string {
    const lines = markdown.split(/\r?\n/);
    let capturing = false;
    let captureLevel = 2;
    const buffer: string[] = [];

    for (const line of lines) {
      const m = line.match(/^(#{1,4})\s+(.+)$/);
      if (m) {
        const level = m[1]!.length;
        const heading = m[2]!.trim();
        if (!capturing && headingPattern.test(heading)) {
          capturing = true;
          captureLevel = level;
          continue;
        }
        if (capturing && level <= captureLevel) {
          break;
        }
      }
      if (capturing) {
        buffer.push(line);
      }
    }

    return buffer.join("\n").trim();
  }

  private extractGovernanceClauses(markdown: string): StructuredGovernanceClause[] {
    const body = this.extractSectionBody(
      markdown,
      /section\s+4|additional\s+governance\s+clauses|governance\s+clauses\s+required/i,
    );
    if (!body) return [];

    const clauses: StructuredGovernanceClause[] = [];
    const subSections = body.split(/\n(?=###+\s+|\*\*\d+\.|\-\s+\*\*)/);

    subSections.forEach((chunk, idx) => {
      const cleaned = chunk.trim();
      if (cleaned.length < 25) return;
      const headingLine = cleaned.split("\n")[0] || `Governance Clause ${idx + 1}`;
      const heading = headingLine
        .replace(/^#{1,6}\s+/, "")
        .replace(/^[-*]\s+/, "")
        .replace(/\*\*/g, "")
        .trim()
        .slice(0, 120);
      const text = cleaned
        .split("\n")
        .slice(1)
        .join("\n")
        .trim() || cleaned;

      clauses.push({
        section_heading: heading || `Governance Requirement ${idx + 1}`,
        clause_reference: `GOV-${idx + 1}`,
        clause_text: text,
        domain: this.inferOwnerDepartment(heading),
      });
    });

    return clauses;
  }
}

export const policyCompilerService = new PolicyCompilerService();
