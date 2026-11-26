/**
 * Cogent Compliance OS — Cross-Border Expansion Workflow Service (Stages 1–8)
 *
 * Orchestrates the complete Cross-Border Compliance Operating Lifecycle:
 *   - Stage 1: Market Entry Assessment & Regulatory Obligations Register
 *   - Stage 2: Regulatory Licensing, Fit-and-Proper & Partner Authorization
 *   - Stage 3: Group → Local Policy Framework Localisation (connected to Policy Workflow OS)
 *   - Stage 4: Country-Specific & Enterprise Risk Assessment & Risk Appetite
 *   - Stage 5: Cross-Functional Operational Workstreams & Control Specifications
 *   - Stage 6: Pre-Launch Compliance Validation & Deterministic 6-Question CCO Go-Live Gate
 *   - Stage 7: Live Operations, Regulatory Reporting Calendar & Incident Register
 *   - Stage 8: Multi-Country Regulatory Change Management
 */

import crypto from "crypto";
import { createAdminSupabaseClient } from "@/lib/supabase";
import { AppApiError } from "@/lib/api-handler";
import { auditService } from "@/modules/audit/audit.service";
import { policyWorkflowService } from "@/modules/policies/policy-workflow.service";
import {
  assertExpansionGoLiveAuthority,
  requirePermission,
} from "@/modules/auth-tenancy/rbac.guard";
import type { TenantContext } from "@/modules/auth-tenancy/types";
import type { PolicyDomain } from "@/contracts/policy.contracts";
import {
  createExpansionSchema,
  createObligationSchema,
  createRiskSchema,
  createValidationTestSchema,
  createWorkstreamSchema,
  expansionOperationsSchema,
  goLiveGateActionSchema,
  listExpansionsQuerySchema,
  localisationActionSchema,
  updateExpansionSchema,
  updateObligationSchema,
  updateRiskSchema,
  updateValidationTestSchema,
  updateWorkstreamSchema,
  type CcoReadinessQuestionResult,
  type CreateExpansionInput,
  type CreateObligationInput,
  type CreateRiskInput,
  type CreateValidationTestInput,
  type CreateWorkstreamInput,
  type ExpansionArtefactRecord,
  type ExpansionCountryRoleRecord,
  type ExpansionDashboardSummary,
  type ExpansionDetailBundle,
  type ExpansionGoLiveGateRecord,
  type ExpansionIncidentRecord,
  type ExpansionObligationRecord,
  type ExpansionOperationsInput,
  type ExpansionPolicyLocalisationRecord,
  type ExpansionProgramRecord,
  type ExpansionReadinessReport,
  type ExpansionRegulatoryChangeRecord,
  type ExpansionReportingItemRecord,
  type ExpansionRiskRecord,
  type ExpansionValidationTestRecord,
  type ExpansionWorkstreamRecord,
  type GoLiveGateActionInput,
  type LocalisationActionInput,
  type LocalisationComplianceArea,
  type UpdateExpansionInput,
  type UpdateObligationInput,
  type UpdateRiskInput,
  type UpdateValidationTestInput,
  type UpdateWorkstreamInput,
} from "@/contracts/expansion.contracts";
import {
  buildJurisdictionBlueprint,
  computeRiskRating,
  CORE_13_ARTEFACT_DEFINITIONS,
} from "./expansion-blueprints";

const LOCALISATION_AREA_TO_POLICY_DOMAIN: Record<LocalisationComplianceArea, PolicyDomain> = {
  KYC: "KYC_CDD",
  AML_CFT: "AML_CFT_CPF",
  SANCTIONS: "AML_CFT_CPF",
  TRANSACTION_MONITORING: "AML_CFT_CPF",
  DATA_PROTECTION: "DATA_PROTECTION",
  CONSUMER_PROTECTION: "CONSUMER_PROTECTION",
  RECORDKEEPING: "GOVERNANCE_OTHER",
  REGULATORY_REPORTING: "GOVERNANCE_OTHER",
};

function addDaysToIsoDate(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export class ExpansionWorkflowService {
  /**
   *Deterministic 6-Question CCO Go-Live Readiness Evaluator (Section 6 of Cross-Border Lifecycle):
   *  1. Are we legally permitted to operate?
   *  2. Have we obtained the necessary approvals?
   *  3. Have we implemented the required compliance controls?
   *  4. Are our employees and partners prepared?
   *  5. Can we demonstrate that the controls work?
   *  6. Can we continuously monitor and report our compliance status?
   */
  public evaluateReadiness(params: {
    program: ExpansionProgramRecord;
    obligations: ExpansionObligationRecord[];
    localisations: ExpansionPolicyLocalisationRecord[];
    risks: ExpansionRiskRecord[];
    workstreams: ExpansionWorkstreamRecord[];
    validationTests: ExpansionValidationTestRecord[];
    reportingCalendar: ExpansionReportingItemRecord[];
    countryRoles: ExpansionCountryRoleRecord[];
    artefacts: ExpansionArtefactRecord[];
  }): ExpansionReadinessReport {
    const {
      program,
      obligations,
      localisations,
      risks,
      workstreams,
      validationTests,
      reportingCalendar,
      countryRoles,
      artefacts,
    } = params;

    // Q1: Are we legally permitted to operate?
    const q1Blockers: string[] = [];
    if (program.operating_model === "UNDECIDED") {
      q1Blockers.push("Operating model (Direct Licence vs. Partner vs. Passporting) has not been decided.");
    }
    const mandatoryObligations = obligations.filter((o) => o.is_mandatory_for_go_live);
    const unassessedOrCriticalObligations = mandatoryObligations.filter(
      (o) => o.gap_status === "UNASSESSED" || o.gap_status === "CRITICAL_GAP",
    );
    if (mandatoryObligations.length === 0) {
      q1Blockers.push("No mandatory regulatory obligations have been mapped in the Regulatory Obligations Register.");
    } else if (unassessedOrCriticalObligations.length > 0) {
      q1Blockers.push(
        `${unassessedOrCriticalObligations.length} mandatory regulatory obligation(s) remain UNASSESSED or in CRITICAL_GAP.`,
      );
    }

    const q1Status: CcoReadinessQuestionResult["status"] =
      q1Blockers.length === 0
        ? mandatoryObligations.some((o) => o.gap_status === "PARTIAL_GAP")
          ? "WARNING"
          : "PASS"
        : "BLOCKED";

    // Q2: Have we obtained the necessary approvals?
    const q2Blockers: string[] = [];
    const licensingObligations = obligations.filter(
      (o) =>
        (o.stage_category === "LICENSING" ||
          o.stage_category === "PARTNER_APPROVAL" ||
          o.stage_category === "CAPITAL_ESCROW") &&
        o.is_mandatory_for_go_live,
    );
    const unapprovedLicensing = licensingObligations.filter(
      (o) =>
        o.licensing_status !== "APPROVED" &&
        o.licensing_status !== "CONDITIONAL_APPROVAL" &&
        o.licensing_status !== "NOT_REQUIRED" &&
        o.gap_status !== "COMPLIANT",
    );
    if (unapprovedLicensing.length > 0) {
      q2Blockers.push(
        `${unapprovedLicensing.length} licensing/partner authorisation requirement(s) are not yet APPROVED or COMPLIANT (remember: submitting an application does not authorise operations).`,
      );
    }
    const q2Status: CcoReadinessQuestionResult["status"] =
      q2Blockers.length === 0 ? "PASS" : "BLOCKED";

    // Q3: Have we implemented the required compliance controls & localised policies?
    const q3Blockers: string[] = [];
    const readyLocalisations = localisations.filter(
      (l) => l.localisation_status === "APPROVED" || l.localisation_status === "PUBLISHED",
    );
    if (localisations.length > 0 && readyLocalisations.length < localisations.length) {
      q3Blockers.push(
        `${localisations.length - readyLocalisations.length} of ${localisations.length} policy localisation pillar(s) are not yet Approved/Published.`,
      );
    }
    const p0ControlWorkstreams = workstreams.filter((w) => w.priority === "P0");
    const incompleteP0Workstreams = p0ControlWorkstreams.filter(
      (w) => w.status !== "VERIFIED" && w.status !== "EVIDENCE_SUBMITTED",
    );
    if (incompleteP0Workstreams.length > 0) {
      q3Blockers.push(
        `${incompleteP0Workstreams.length} P0 critical operational workstream(s) lack verified completion evidence.`,
      );
    }
    const unmitigatedCriticalRisks = risks.filter(
      (r) => r.residual_rating === "CRITICAL" && r.status === "OPEN",
    );
    if (unmitigatedCriticalRisks.length > 0) {
      q3Blockers.push(
        `${unmitigatedCriticalRisks.length} CRITICAL residual country risk(s) remain OPEN without mitigation.`,
      );
    }
    const q3Status: CcoReadinessQuestionResult["status"] =
      q3Blockers.length === 0 ? "PASS" : "BLOCKED";

    // Q4: Are our employees and partners prepared?
    const q4Blockers: string[] = [];
    const hasCountryCcoOrMlro = countryRoles.some(
      (r) =>
        (r.governance_role === "COUNTRY_COMPLIANCE_OFFICER" ||
          r.governance_role === "COUNTRY_MLRO") &&
        r.assignee_name.trim().length > 0,
    );
    if (!hasCountryCcoOrMlro) {
      q4Blockers.push(
        `No Country Compliance Officer or Country MLRO has been appointed for ${program.target_country_name}.`,
      );
    }
    const staffAndPartnerWorkstreams = workstreams.filter(
      (w) =>
        w.responsible_team === "HR_TRAINING" || w.responsible_team === "PROCUREMENT_PARTNERS",
    );
    const incompletePrep = staffAndPartnerWorkstreams.filter(
      (w) => w.status !== "VERIFIED" && w.status !== "EVIDENCE_SUBMITTED",
    );
    if (incompletePrep.length > 0) {
      q4Blockers.push(
        `${incompletePrep.length} partner due diligence or staff training readiness workstream(s) are incomplete.`,
      );
    }
    const q4Status: CcoReadinessQuestionResult["status"] =
      q4Blockers.length === 0 ? "PASS" : "BLOCKED";

    // Q5: Can we demonstrate that the controls work? (Stage 6 Pre-Launch Validation)
    const q5Blockers: string[] = [];
    const criticalTests = validationTests.filter((t) => t.is_critical_gate);
    const passedCriticalTests = criticalTests.filter(
      (t) => t.status === "PASSED" || t.status === "WAIVED",
    );
    const failedTests = validationTests.filter((t) => t.status === "FAILED");
    if (criticalTests.length === 0) {
      q5Blockers.push("No pre-launch compliance validation tests have been defined.");
    } else if (passedCriticalTests.length < criticalTests.length) {
      q5Blockers.push(
        `${criticalTests.length - passedCriticalTests.length} of ${criticalTests.length} critical pre-launch validation test(s) have not PASSED.`,
      );
    }
    if (failedTests.length > 0) {
      q5Blockers.push(`${failedTests.length} validation test(s) are currently in FAILED status.`);
    }
    const q5Status: CcoReadinessQuestionResult["status"] =
      q5Blockers.length === 0 ? "PASS" : "BLOCKED";

    // Q6: Can we continuously monitor and report our compliance status?
    const q6Blockers: string[] = [];
    if (reportingCalendar.length === 0) {
      q6Blockers.push(
        `No statutory returns or FIU reporting schedules are configured in the ${program.target_country_name} Regulatory Reporting Calendar.`,
      );
    }
    const overdueReports = reportingCalendar.filter((r) => r.status === "OVERDUE");
    if (overdueReports.length > 0) {
      q6Blockers.push(`${overdueReports.length} regulatory report(s) are marked OVERDUE.`);
    }
    const q6Status: CcoReadinessQuestionResult["status"] =
      q6Blockers.length === 0 ? "PASS" : "BLOCKED";

    const questions: CcoReadinessQuestionResult[] = [
      {
        key: "LEGALLY_PERMITTED",
        number: 1,
        question: "Are we legally permitted to operate?",
        status: q1Status,
        summary:
          q1Status === "PASS"
            ? `Operating model (${program.operating_model}) and ${mandatoryObligations.length} mandatory statutory obligations assessed.`
            : q1Blockers[0] || "Market entry permissibility assessment incomplete.",
        blockers: q1Blockers,
        evidence_count: mandatoryObligations.filter((o) => o.gap_status === "COMPLIANT").length,
      },
      {
        key: "APPROVALS_OBTAINED",
        number: 2,
        question: "Have we obtained the necessary approvals?",
        status: q2Status,
        summary:
          q2Status === "PASS"
            ? "Required regulatory licences, capital/escrow requirements, or partner authorisations are approved."
            : q2Blockers[0] || "Regulatory or partner approvals pending.",
        blockers: q2Blockers,
        evidence_count: licensingObligations.filter(
          (o) =>
            o.licensing_status === "APPROVED" ||
            o.licensing_status === "CONDITIONAL_APPROVAL" ||
            o.gap_status === "COMPLIANT",
        ).length,
      },
      {
        key: "CONTROLS_IMPLEMENTED",
        number: 3,
        question: "Have we implemented the required compliance controls?",
        status: q3Status,
        summary:
          q3Status === "PASS"
            ? `${readyLocalisations.length}/${localisations.length} local policies approved and P0 control workstreams verified.`
            : q3Blockers[0] || "Policy localisation or control workstreams incomplete.",
        blockers: q3Blockers,
        evidence_count:
          readyLocalisations.length +
          p0ControlWorkstreams.filter(
            (w) => w.status === "VERIFIED" || w.status === "EVIDENCE_SUBMITTED",
          ).length,
      },
      {
        key: "STAFF_PARTNERS_PREPARED",
        number: 4,
        question: "Are our employees and partners prepared?",
        status: q4Status,
        summary:
          q4Status === "PASS"
            ? "Country Compliance Officer / MLRO appointed, partner due diligence verified, and staff training complete."
            : q4Blockers[0] || "Staff or partner readiness incomplete.",
        blockers: q4Blockers,
        evidence_count:
          countryRoles.length +
          staffAndPartnerWorkstreams.filter(
            (w) => w.status === "VERIFIED" || w.status === "EVIDENCE_SUBMITTED",
          ).length,
      },
      {
        key: "CONTROLS_PROVEN_EFFECTIVE",
        number: 5,
        question: "Can we demonstrate that the controls work?",
        status: q5Status,
        summary:
          q5Status === "PASS"
            ? `All ${criticalTests.length} critical pre-launch validation tests passed with documented evidence.`
            : q5Blockers[0] || "Pre-launch control testing incomplete.",
        blockers: q5Blockers,
        evidence_count: passedCriticalTests.length,
      },
      {
        key: "MONITORING_REPORTING_ACTIVE",
        number: 6,
        question: "Can we continuously monitor and report our compliance status?",
        status: q6Status,
        summary:
          q6Status === "PASS"
            ? `${reportingCalendar.length} regulatory reporting schedules and ongoing monitoring rhythms active.`
            : q6Blockers[0] || "Reporting calendar setup incomplete.",
        blockers: q6Blockers,
        evidence_count: reportingCalendar.length,
      },
    ];

    const passedQuestionsCount = questions.filter((q) => q.status === "PASS").length;
    const warningQuestionsCount = questions.filter((q) => q.status === "WARNING").length;
    const hardBlockerCount = questions.reduce((acc, q) => acc + q.blockers.length, 0);

    // Granular readiness score calculation (0–100)
    const oblRatio =
      mandatoryObligations.length > 0
        ? mandatoryObligations.filter((o) => o.gap_status === "COMPLIANT").length /
          mandatoryObligations.length
        : 0;
    const locRatio =
      localisations.length > 0 ? readyLocalisations.length / localisations.length : 0;
    const wsRatio =
      workstreams.length > 0
        ? workstreams.filter(
            (w) => w.status === "VERIFIED" || w.status === "EVIDENCE_SUBMITTED",
          ).length / workstreams.length
        : 0;
    const testRatio =
      criticalTests.length > 0 ? passedCriticalTests.length / criticalTests.length : 0;
    const roleRatio = hasCountryCcoOrMlro ? 1 : 0;
    const repRatio = reportingCalendar.length > 0 && overdueReports.length === 0 ? 1 : 0;

    const weightedScore = Math.round(
      oblRatio * 20 +
        locRatio * 20 +
        wsRatio * 20 +
        testRatio * 25 +
        roleRatio * 7.5 +
        repRatio * 7.5,
    );

    const artefactsReadyCount = artefacts.filter(
      (a) => a.status === "APPROVED" || a.status === "LIVE",
    ).length;

    return {
      overall_score: Math.min(100, Math.max(0, weightedScore)),
      go_live_eligible: passedQuestionsCount + warningQuestionsCount === 6 && hardBlockerCount === 0,
      hard_blocker_count: hardBlockerCount,
      warning_count: warningQuestionsCount,
      questions,
      artefacts_ready_count: artefactsReadyCount,
      artefacts_total_count: artefacts.length || 13,
      evaluated_at: new Date().toISOString(),
    };
  }

  /**
   * Lists all Cross-Border Expansion Programs for the tenant with executive KPIs.
   */
  public async getDashboardAndPrograms(
    tenant: TenantContext,
    rawQuery?: Partial<import("zod").input<typeof listExpansionsQuerySchema>>,
  ): Promise<ExpansionDashboardSummary> {
    requirePermission(tenant, "expansion.read");
    const query = listExpansionsQuerySchema.parse(rawQuery || {});
    const supabase = createAdminSupabaseClient();

    const { data: programsData, error } = await supabase
      .from("expansion_programs")
      .select("*")
      .eq("tenant_id", tenant.tenantId)
      .order("updated_at", { ascending: false });

    if (error) {
      throw new AppApiError(
        "INTERNAL_SERVER_ERROR",
        `Failed to load Cross-Border Expansion programs: ${error.message}`,
        500,
      );
    }

    const allPrograms = (programsData || []) as ExpansionProgramRecord[];

    // Load aggregate child counts for dashboard cards
    const [oblRes, locRes, testRes, chgRes, repRes] = await Promise.all([
      supabase
        .from("expansion_obligations")
        .select("expansion_id, gap_status")
        .eq("tenant_id", tenant.tenantId),
      supabase
        .from("expansion_policy_localisations")
        .select("expansion_id, localisation_status")
        .eq("tenant_id", tenant.tenantId),
      supabase
        .from("expansion_validation_tests")
        .select("expansion_id, status")
        .eq("tenant_id", tenant.tenantId),
      supabase
        .from("expansion_regulatory_changes")
        .select("expansion_id, status")
        .eq("tenant_id", tenant.tenantId),
      supabase
        .from("expansion_reporting_calendar")
        .select("expansion_id, status, next_due_date")
        .eq("tenant_id", tenant.tenantId),
    ]);

    const obligations = (oblRes.data || []) as Array<{ expansion_id: string; gap_status: string }>;
    const localisations = (locRes.data || []) as Array<{
      expansion_id: string;
      localisation_status: string;
    }>;
    const tests = (testRes.data || []) as Array<{ expansion_id: string; status: string }>;
    const changes = (chgRes.data || []) as Array<{ expansion_id: string; status: string }>;
    const reports = (repRes.data || []) as Array<{
      expansion_id: string;
      status: string;
      next_due_date: string | null;
    }>;

    const todayIso = new Date().toISOString().slice(0, 10);

    const enriched = allPrograms.map((prog) => {
      const pObl = obligations.filter((o) => o.expansion_id === prog.id);
      const pLoc = localisations.filter((l) => l.expansion_id === prog.id);
      const pTests = tests.filter((t) => t.expansion_id === prog.id);
      const pChanges = changes.filter(
        (c) => c.expansion_id === prog.id && c.status !== "CLOSED" && c.status !== "EVIDENCE_VERIFIED",
      );

      return {
        ...prog,
        obligations_count: pObl.length,
        critical_gaps_count: pObl.filter((o) => o.gap_status === "CRITICAL_GAP").length,
        localised_policies_count: pLoc.filter(
          (l) => l.localisation_status === "APPROVED" || l.localisation_status === "PUBLISHED",
        ).length,
        total_localisations_count: pLoc.length,
        passed_tests_count: pTests.filter((t) => t.status === "PASSED" || t.status === "WAIVED")
          .length,
        total_tests_count: pTests.length,
        open_changes_count: pChanges.length,
      };
    });

    const filtered = enriched.filter((p) => {
      if (query.status && p.status !== query.status) return false;
      if (query.stage && p.current_stage !== query.stage) return false;
      if (
        query.jurisdiction &&
        p.target_jurisdiction.toUpperCase() !== query.jurisdiction.toUpperCase()
      ) {
        return false;
      }
      if (query.q) {
        const needle = query.q.toLowerCase();
        const hay = `${p.program_ref_no} ${p.title} ${p.target_country_name} ${p.target_jurisdiction}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });

    const overdueFilingsCount = reports.filter(
      (r) =>
        r.status === "OVERDUE" ||
        (r.next_due_date && r.next_due_date < todayIso && r.status !== "SUBMITTED" && r.status !== "EXEMPT"),
    ).length;

    return {
      kpis: {
        total_programs: allPrograms.length,
        active_expansions: allPrograms.filter(
          (p) => p.status === "ACTIVE" || p.status === "GO_LIVE_PENDING",
        ).length,
        live_markets: allPrograms.filter((p) => p.status === "LIVE").length,
        go_live_ready: allPrograms.filter((p) => p.readiness_score >= 85).length,
        critical_blockers: obligations.filter((o) => o.gap_status === "CRITICAL_GAP").length,
        open_regulatory_changes: changes.filter(
          (c) => c.status !== "CLOSED" && c.status !== "EVIDENCE_VERIFIED",
        ).length,
        overdue_filings: overdueFilingsCount,
      },
      programs: filtered,
    };
  }

  /**
   * Initiates a new Cross-Border Expansion Program across Stages 1–8 and optionally seeds
   * the full jurisdiction blueprint (Obligations, 8 Localisation Pillars, Risk Register,
   * 10 Cross-Functional Workstreams, 7 Validation Tests, Reporting Calendar, and 13 Artefacts).
   */
  public async createExpansionProgram(
    tenant: TenantContext,
    rawInput: import("zod").input<typeof createExpansionSchema>,
  ): Promise<ExpansionDetailBundle> {
    requirePermission(tenant, "expansion.create");
    const input: CreateExpansionInput = createExpansionSchema.parse(rawInput);
    const supabase = createAdminSupabaseClient();

    // Idempotency guard: if this Studio Work Product was already promoted to Cross-Border Expansion,
    // return the existing expansion program bundle instead of duplicating it.
    if (input.source_work_product_id) {
      try {
        const { data: existingProgram } = await supabase
          .from("expansion_programs")
          .select("id")
          .eq("tenant_id", tenant.tenantId)
          .eq("source_work_product_id", input.source_work_product_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingProgram?.id) {
          return this.getExpansionDetail(tenant, String(existingProgram.id));
        }
      } catch {
        // Non-blocking fallback when mocked query builders omit chained order/limit
      }
    }

    const blueprint = buildJurisdictionBlueprint(
      input.target_jurisdiction,
      input.home_jurisdiction,
      input.product_scope,
    );

    const { count } = await supabase
      .from("expansion_programs")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant.tenantId);

    const seq = String((count || 0) + 1).padStart(3, "0");
    const programRefNo = `EXP-${input.home_jurisdiction.toUpperCase()}-${blueprint.jurisdictionCode}-${seq}`;
    const resolvedTitle =
      input.title?.trim() ||
      `${input.home_jurisdiction.toUpperCase()} → ${blueprint.countryName} (${blueprint.jurisdictionCode}) Market Expansion`;

    const { data: programData, error: progErr } = await supabase
      .from("expansion_programs")
      .insert({
        tenant_id: tenant.tenantId,
        program_ref_no: programRefNo,
        title: resolvedTitle,
        home_jurisdiction: input.home_jurisdiction.toUpperCase(),
        target_jurisdiction: blueprint.jurisdictionCode,
        target_country_name: blueprint.countryName,
        primary_regulators: blueprint.primaryRegulators,
        product_scope: input.product_scope,
        operating_model: input.operating_model,
        operating_model_rationale: input.operating_model_rationale || null,
        current_stage: "MARKET_ENTRY_ASSESSMENT",
        status: "ACTIVE",
        risk_appetite_statement:
          input.risk_appetite_statement || blueprint.recommendedRiskAppetite,
        prohibited_activities: blueprint.defaultProhibitedActivities,
        target_launch_date: input.target_launch_date || null,
        source_work_product_id: input.source_work_product_id || null,
        readiness_score: 0,
        executive_summary: `Cross-border compliance programme managing entry from ${input.home_jurisdiction.toUpperCase()} into ${blueprint.countryName} under ${blueprint.primaryRegulators.join(", ")}.`,
        created_by: tenant.userId,
      })
      .select("*")
      .single();

    if (progErr || !programData) {
      throw new AppApiError(
        "INTERNAL_SERVER_ERROR",
        `Failed to create expansion program: ${progErr?.message || "Unknown error"}`,
        500,
      );
    }

    const program = programData as ExpansionProgramRecord;

    if (input.auto_populate_blueprint) {
      // 1. Seed Stage 1 & 2 Obligations
      if (blueprint.obligations.length > 0) {
        await supabase.from("expansion_obligations").insert(
          blueprint.obligations.map((o) => ({
            tenant_id: tenant.tenantId,
            expansion_id: program.id,
            stage_category: o.stage_category,
            regulator: o.regulator,
            statute_reference: o.statute_reference,
            obligation_title: o.obligation_title,
            obligation_summary: o.obligation_summary,
            gap_status: "PARTIAL_GAP",
            licensing_status:
              o.stage_category === "LICENSING" ||
              o.stage_category === "PARTNER_APPROVAL" ||
              o.stage_category === "CAPITAL_ESCROW"
                ? "IN_PREPARATION"
                : "NOT_REQUIRED",
            is_mandatory_for_go_live: o.is_mandatory_for_go_live,
            owner_department: o.owner_department,
            source_url: o.source_url || null,
            due_date: addDaysToIsoDate(30),
          })),
        );
      }

      // 2. Seed Stage 3 Policy Localisation Matrix (and auto-link matching Group Policies if present)
      const { data: existingGroupPolicies } = await supabase
        .from("compliance_policies")
        .select("id, domain, title")
        .eq("tenant_id", tenant.tenantId)
        .order("updated_at", { ascending: false });

      const groupPolicies = (existingGroupPolicies || []) as Array<{
        id: string;
        domain: PolicyDomain;
        title: string;
      }>;

      if (blueprint.localisations.length > 0) {
        await supabase.from("expansion_policy_localisations").insert(
          blueprint.localisations.map((loc) => {
            const targetDomain = LOCALISATION_AREA_TO_POLICY_DOMAIN[loc.compliance_area];
            const matchedGroupPolicy = groupPolicies.find((p) => p.domain === targetDomain);
            return {
              tenant_id: tenant.tenantId,
              expansion_id: program.id,
              compliance_area: loc.compliance_area,
              area_title: loc.area_title,
              local_requirements_summary: loc.local_requirements_summary,
              gap_summary: loc.gap_summary,
              group_policy_id: matchedGroupPolicy?.id || null,
              localisation_status: "GAP_IDENTIFIED",
              due_date: addDaysToIsoDate(45),
            };
          }),
        );
      }

      // 3. Seed Stage 4 Country Risk Register
      if (blueprint.risks.length > 0) {
        await supabase.from("expansion_risks").insert(
          blueprint.risks.map((r) => ({
            tenant_id: tenant.tenantId,
            expansion_id: program.id,
            risk_category: r.risk_category,
            risk_title: r.risk_title,
            risk_description: r.risk_description,
            inherent_likelihood: r.inherent_likelihood,
            inherent_impact: r.inherent_impact,
            inherent_rating: computeRiskRating(r.inherent_likelihood, r.inherent_impact),
            appetite_decision: r.appetite_decision,
            mitigation_plan: r.mitigation_plan,
            residual_likelihood: r.residual_likelihood,
            residual_impact: r.residual_impact,
            residual_rating: computeRiskRating(r.residual_likelihood, r.residual_impact),
            status: "MITIGATING",
          })),
        );
      }

      // 4. Seed Stage 5 Cross-Functional Workstreams
      if (blueprint.workstreams.length > 0) {
        await supabase.from("expansion_workstreams").insert(
          blueprint.workstreams.map((w, idx) => ({
            tenant_id: tenant.tenantId,
            expansion_id: program.id,
            workstream_code: w.workstream_code,
            title: w.title,
            description: w.description,
            stage: w.stage,
            responsible_team: w.responsible_team,
            priority: w.priority,
            status: idx === 0 ? "IN_PROGRESS" : "NOT_STARTED",
            control_specification: w.control_specification,
            expected_evidence: w.expected_evidence,
            due_date: addDaysToIsoDate(14 + idx * 7),
          })),
        );
      }

      // 5. Seed Stage 6 Pre-Launch Validation Tests
      if (blueprint.validationTests.length > 0) {
        await supabase.from("expansion_validation_tests").insert(
          blueprint.validationTests.map((t) => ({
            tenant_id: tenant.tenantId,
            expansion_id: program.id,
            test_category: t.test_category,
            test_name: t.test_name,
            test_objective: t.test_objective,
            is_critical_gate: t.is_critical_gate,
            status: "PENDING",
          })),
        );
      }

      // 6. Seed Stage 7 Regulatory Reporting Calendar
      if (blueprint.reportingCalendar.length > 0) {
        await supabase.from("expansion_reporting_calendar").insert(
          blueprint.reportingCalendar.map((rep) => ({
            tenant_id: tenant.tenantId,
            expansion_id: program.id,
            regulator: rep.regulator,
            report_name: rep.report_name,
            frequency: rep.frequency,
            submission_channel: rep.submission_channel,
            statutory_reference: rep.statutory_reference,
            next_due_date: addDaysToIsoDate(rep.days_until_first_due),
            status: "SCHEDULED",
          })),
        );
      }

      // 7. Seed Core 13 Compliance Artefacts
      await supabase.from("expansion_artefacts").insert(
        CORE_13_ARTEFACT_DEFINITIONS.map((art) => ({
          tenant_id: tenant.tenantId,
          expansion_id: program.id,
          artefact_type: art.artefact_type,
          title: `${blueprint.countryName} ${art.title}`,
          purpose: art.purpose,
          status:
            art.artefact_type === "REGULATORY_OBLIGATIONS_REGISTER" ||
            art.artefact_type === "REGULATORY_GAP_ASSESSMENT" ||
            art.artefact_type === "COUNTRY_RISK_ASSESSMENT" ||
            art.artefact_type === "COMPLIANCE_RISK_REGISTER" ||
            art.artefact_type === "REGULATORY_REPORTING_CALENDAR" ||
            art.artefact_type === "MARKET_ENTRY_COMPLIANCE_ASSESSMENT"
              ? "DRAFT"
              : "MISSING",
          linked_work_product_id:
            art.artefact_type === "MARKET_ENTRY_COMPLIANCE_ASSESSMENT"
              ? input.source_work_product_id || null
              : null,
          updated_by: tenant.userId,
        })),
      );
    }

    await auditService.appendEvent({
      tenantId: tenant.tenantId,
      actorId: tenant.userId,
      actorType: "USER",
      action: "EXPANSION_PROGRAM_CREATED",
      entityType: "EXPANSION_PROGRAM",
      entityId: program.id,
      eventData: {
        programRefNo,
        homeJurisdiction: program.home_jurisdiction,
        targetJurisdiction: program.target_jurisdiction,
        targetCountryName: program.target_country_name,
        productScope: program.product_scope,
        operatingModel: program.operating_model,
      },
    });

    return this.getExpansionDetail(tenant, program.id);
  }

  /**
   * Loads the full 8-Stage Cross-Border Expansion Detail Bundle and recomputes the live
   * 6-Question CCO Go-Live Readiness Report.
   */
  public async getExpansionDetail(
    tenant: TenantContext,
    expansionId: string,
  ): Promise<ExpansionDetailBundle> {
    requirePermission(tenant, "expansion.read");
    const supabase = createAdminSupabaseClient();

    const { data: progData, error: progErr } = await supabase
      .from("expansion_programs")
      .select("*")
      .eq("tenant_id", tenant.tenantId)
      .eq("id", expansionId)
      .maybeSingle();

    if (progErr || !progData) {
      throw new AppApiError(
        "NOT_FOUND",
        `Cross-border expansion program ${expansionId} not found`,
        404,
      );
    }

    const program = progData as ExpansionProgramRecord;

    const [
      rolesRes,
      oblRes,
      locRes,
      risksRes,
      wsRes,
      testsRes,
      gatesRes,
      repRes,
      incRes,
      chgRes,
      artRes,
    ] = await Promise.all([
      supabase
        .from("expansion_country_roles")
        .select("*")
        .eq("tenant_id", tenant.tenantId)
        .eq("expansion_id", expansionId)
        .order("created_at", { ascending: true }),
      supabase
        .from("expansion_obligations")
        .select("*")
        .eq("tenant_id", tenant.tenantId)
        .eq("expansion_id", expansionId)
        .order("created_at", { ascending: true }),
      supabase
        .from("expansion_policy_localisations")
        .select("*")
        .eq("tenant_id", tenant.tenantId)
        .eq("expansion_id", expansionId)
        .order("created_at", { ascending: true }),
      supabase
        .from("expansion_risks")
        .select("*")
        .eq("tenant_id", tenant.tenantId)
        .eq("expansion_id", expansionId)
        .order("created_at", { ascending: true }),
      supabase
        .from("expansion_workstreams")
        .select("*")
        .eq("tenant_id", tenant.tenantId)
        .eq("expansion_id", expansionId)
        .order("workstream_code", { ascending: true }),
      supabase
        .from("expansion_validation_tests")
        .select("*")
        .eq("tenant_id", tenant.tenantId)
        .eq("expansion_id", expansionId)
        .order("created_at", { ascending: true }),
      supabase
        .from("expansion_go_live_gates")
        .select("*")
        .eq("tenant_id", tenant.tenantId)
        .eq("expansion_id", expansionId)
        .order("created_at", { ascending: false }),
      supabase
        .from("expansion_reporting_calendar")
        .select("*")
        .eq("tenant_id", tenant.tenantId)
        .eq("expansion_id", expansionId)
        .order("next_due_date", { ascending: true }),
      supabase
        .from("expansion_incidents")
        .select("*")
        .eq("tenant_id", tenant.tenantId)
        .eq("expansion_id", expansionId)
        .order("detected_at", { ascending: false }),
      supabase
        .from("expansion_regulatory_changes")
        .select("*")
        .eq("tenant_id", tenant.tenantId)
        .eq("expansion_id", expansionId)
        .order("created_at", { ascending: false }),
      supabase
        .from("expansion_artefacts")
        .select("*")
        .eq("tenant_id", tenant.tenantId)
        .eq("expansion_id", expansionId)
        .order("created_at", { ascending: true }),
    ]);

    const countryRoles = (rolesRes.data || []) as ExpansionCountryRoleRecord[];
    const obligations = (oblRes.data || []) as ExpansionObligationRecord[];
    const policyLocalisations = (locRes.data || []) as ExpansionPolicyLocalisationRecord[];
    const risks = (risksRes.data || []) as ExpansionRiskRecord[];
    const workstreams = (wsRes.data || []) as ExpansionWorkstreamRecord[];
    const validationTests = (testsRes.data || []) as ExpansionValidationTestRecord[];
    const goLiveGates = (gatesRes.data || []) as ExpansionGoLiveGateRecord[];
    const reportingCalendar = (repRes.data || []) as ExpansionReportingItemRecord[];
    const incidents = (incRes.data || []) as ExpansionIncidentRecord[];
    const regulatoryChanges = (chgRes.data || []) as ExpansionRegulatoryChangeRecord[];
    const artefacts = (artRes.data || []) as ExpansionArtefactRecord[];

    const readiness = this.evaluateReadiness({
      program,
      obligations,
      localisations: policyLocalisations,
      risks,
      workstreams,
      validationTests,
      reportingCalendar,
      countryRoles,
      artefacts,
    });

    // Persist updated readiness_score if it changed
    if (program.readiness_score !== readiness.overall_score) {
      await supabase
        .from("expansion_programs")
        .update({
          readiness_score: readiness.overall_score,
          updated_at: new Date().toISOString(),
        })
        .eq("tenant_id", tenant.tenantId)
        .eq("id", expansionId);
      program.readiness_score = readiness.overall_score;
    }

    return {
      program,
      readiness,
      country_roles: countryRoles,
      obligations,
      policy_localisations: policyLocalisations,
      risks,
      workstreams,
      validation_tests: validationTests,
      go_live_gates: goLiveGates,
      reporting_calendar: reportingCalendar,
      incidents,
      regulatory_changes: regulatoryChanges,
      artefacts,
    };
  }

  /**
   * Updates top-level program metadata, current lifecycle stage, operating model, or risk appetite.
   */
  public async updateExpansionProgram(
    tenant: TenantContext,
    expansionId: string,
    rawInput: import("zod").input<typeof updateExpansionSchema>,
  ): Promise<ExpansionDetailBundle> {
    requirePermission(tenant, "expansion.manage");
    const input: UpdateExpansionInput = updateExpansionSchema.parse(rawInput);
    const supabase = createAdminSupabaseClient();

    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (input.title !== undefined) patch.title = input.title;
    if (input.product_scope !== undefined) patch.product_scope = input.product_scope;
    if (input.operating_model !== undefined) patch.operating_model = input.operating_model;
    if (input.operating_model_rationale !== undefined)
      patch.operating_model_rationale = input.operating_model_rationale;
    if (input.current_stage !== undefined) patch.current_stage = input.current_stage;
    if (input.status !== undefined) patch.status = input.status;
    if (input.risk_appetite_statement !== undefined)
      patch.risk_appetite_statement = input.risk_appetite_statement;
    if (input.prohibited_activities !== undefined)
      patch.prohibited_activities = input.prohibited_activities;
    if (input.target_launch_date !== undefined)
      patch.target_launch_date = input.target_launch_date;
    if (input.executive_summary !== undefined) patch.executive_summary = input.executive_summary;

    const { error } = await supabase
      .from("expansion_programs")
      .update(patch)
      .eq("tenant_id", tenant.tenantId)
      .eq("id", expansionId);

    if (error) {
      throw new AppApiError(
        "INTERNAL_SERVER_ERROR",
        `Failed to update expansion program: ${error.message}`,
        500,
      );
    }

    await auditService.appendEvent({
      tenantId: tenant.tenantId,
      actorId: tenant.userId,
      actorType: "USER",
      action: "EXPANSION_PROGRAM_UPDATED",
      entityType: "EXPANSION_PROGRAM",
      entityId: expansionId,
      eventData: patch,
    });

    return this.getExpansionDetail(tenant, expansionId);
  }

  /**
   * Stage 1 & 2: Adds or updates an entry in the Regulatory Obligations & Licensing Register.
   */
  public async addObligation(
    tenant: TenantContext,
    expansionId: string,
    rawInput: import("zod").input<typeof createObligationSchema>,
  ): Promise<ExpansionDetailBundle> {
    requirePermission(tenant, "expansion.manage");
    const input: CreateObligationInput = createObligationSchema.parse(rawInput);
    const supabase = createAdminSupabaseClient();

    const { error } = await supabase.from("expansion_obligations").insert({
      tenant_id: tenant.tenantId,
      expansion_id: expansionId,
      stage_category: input.stage_category,
      regulator: input.regulator,
      statute_reference: input.statute_reference,
      obligation_title: input.obligation_title,
      obligation_summary: input.obligation_summary,
      gap_status: input.gap_status,
      licensing_status: input.licensing_status,
      is_mandatory_for_go_live: input.is_mandatory_for_go_live,
      owner_department: input.owner_department,
      owner_name: input.owner_name || null,
      due_date: input.due_date || null,
      evidence_ref: input.evidence_ref || null,
      source_url: input.source_url || null,
      notes: input.notes || null,
    });

    if (error) {
      throw new AppApiError(
        "INTERNAL_SERVER_ERROR",
        `Failed to add regulatory obligation: ${error.message}`,
        500,
      );
    }

    return this.getExpansionDetail(tenant, expansionId);
  }

  public async updateObligation(
    tenant: TenantContext,
    expansionId: string,
    rawInput: import("zod").input<typeof updateObligationSchema>,
  ): Promise<ExpansionDetailBundle> {
    requirePermission(tenant, "expansion.manage");
    const input: UpdateObligationInput = updateObligationSchema.parse(rawInput);
    const supabase = createAdminSupabaseClient();

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.gap_status !== undefined) patch.gap_status = input.gap_status;
    if (input.licensing_status !== undefined) patch.licensing_status = input.licensing_status;
    if (input.is_mandatory_for_go_live !== undefined)
      patch.is_mandatory_for_go_live = input.is_mandatory_for_go_live;
    if (input.owner_department !== undefined) patch.owner_department = input.owner_department;
    if (input.owner_name !== undefined) patch.owner_name = input.owner_name;
    if (input.due_date !== undefined) patch.due_date = input.due_date;
    if (input.evidence_ref !== undefined) patch.evidence_ref = input.evidence_ref;
    if (input.notes !== undefined) patch.notes = input.notes;

    const { error } = await supabase
      .from("expansion_obligations")
      .update(patch)
      .eq("tenant_id", tenant.tenantId)
      .eq("expansion_id", expansionId)
      .eq("id", input.obligation_id);

    if (error) {
      throw new AppApiError(
        "INTERNAL_SERVER_ERROR",
        `Failed to update regulatory obligation: ${error.message}`,
        500,
      );
    }

    return this.getExpansionDetail(tenant, expansionId);
  }

  /**
   * Stage 3: Updates a Policy Localisation row OR spawns a real Country-Localised Policy
   * directly inside Cogent's Policy Workflow OS (`compliance_policies` + `policy_versions`).
   */
  public async handleLocalisationAction(
    tenant: TenantContext,
    expansionId: string,
    rawInput: import("zod").input<typeof localisationActionSchema>,
  ): Promise<ExpansionDetailBundle> {
    requirePermission(tenant, "expansion.manage");
    const input: LocalisationActionInput = localisationActionSchema.parse(rawInput);
    const supabase = createAdminSupabaseClient();

    if (input.action === "UPDATE_LOCALISATION") {
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (input.localisation_status !== undefined)
        patch.localisation_status = input.localisation_status;
      if (input.gap_summary !== undefined) patch.gap_summary = input.gap_summary;
      if (input.group_policy_id !== undefined) patch.group_policy_id = input.group_policy_id;
      if (input.local_policy_id !== undefined) patch.local_policy_id = input.local_policy_id;
      if (input.owner_name !== undefined) patch.owner_name = input.owner_name;
      if (input.due_date !== undefined) patch.due_date = input.due_date;

      const { error } = await supabase
        .from("expansion_policy_localisations")
        .update(patch)
        .eq("tenant_id", tenant.tenantId)
        .eq("expansion_id", expansionId)
        .eq("id", input.localisation_id);

      if (error) {
        throw new AppApiError(
          "INTERNAL_SERVER_ERROR",
          `Failed to update policy localisation: ${error.message}`,
          500,
        );
      }

      return this.getExpansionDetail(tenant, expansionId);
    }

    // SPAWN_LOCAL_POLICY: Creates a localised country policy inside Policy Workflow OS
    const detail = await this.getExpansionDetail(tenant, expansionId);
    const loc = detail.policy_localisations.find((l) => l.id === input.localisation_id);
    if (!loc) {
      throw new AppApiError("NOT_FOUND", "Policy localisation pillar not found", 404);
    }

    const domain = LOCALISATION_AREA_TO_POLICY_DOMAIN[loc.compliance_area];
    const localPolicyTitle = `${detail.program.target_country_name} (${detail.program.target_jurisdiction}) Localised ${loc.area_title} Policy`;

    const relevantObligations = detail.obligations.slice(0, 6);
    const localisedMarkdown = `# ${localPolicyTitle}

**Jurisdiction:** ${detail.program.target_country_name} (${detail.program.target_jurisdiction})  
**Parent Group Framework:** ${detail.program.home_jurisdiction} Group Compliance Standard  
**Primary Regulators:** ${detail.program.primary_regulators.join(", ")}  
**Expansion Programme:** ${detail.program.program_ref_no}

---

## 1. Purpose & Local Statutory Scope
This Local Country Policy adapts the institution's Group Compliance Framework to the statutory and supervisory requirements of **${detail.program.target_country_name}** under **${detail.program.primary_regulators.join(", ")}**.

## 2. Country-Specific Regulatory Requirements (${loc.compliance_area})
${loc.local_requirements_summary}

## 3. Identified Group-to-Local Gap Remediation
${loc.gap_summary || "All home-market provisions have been adapted to local statutory thresholds and reporting authorities."}

## 4. Mandatory Operating Procedures & Controls
${relevantObligations
  .map(
    (o, i) =>
      `${i + 1}. **${o.obligation_title}** (*${o.statute_reference}* — ${o.regulator}): ${o.obligation_summary}`,
  )
  .join("\n")}

## 5. Governance, Escalation & Recordkeeping
- **First Line of Defense (Operations & Product):** Execute day-to-day verification, disclosures, and exception handling.
- **Second Line of Defense (Country Compliance Officer & MLRO):** Oversee local regulatory reporting, suspicious activity escalations, and regulator engagement.
- **Third Line of Defense (Internal Audit):** Conduct independent periodic assurance testing.
`;

    const createdPolicyBundle = await policyWorkflowService.createPolicy(tenant, {
      title: localPolicyTitle,
      domain,
      description: `Localised ${detail.program.target_country_name} policy for ${loc.area_title} spawned from Cross-Border Expansion Program ${detail.program.program_ref_no}.`,
      owner_department: "Compliance",
      approval_tier: input.approval_tier,
      review_cycle_months: 12,
      change_type: "NEW_POLICY",
      trigger_source: "REGULATORY_CHANGE",
      trigger_reference: `${detail.program.program_ref_no} (${detail.program.target_jurisdiction})`,
      change_summary: `Initial country localisation from ${detail.program.home_jurisdiction} Group Policy to ${detail.program.target_country_name}.`,
      markdown_content: localisedMarkdown,
    });

    // Tag the created policy with jurisdiction_code, policy_scope = 'LOCAL_COUNTRY', and parent_group_policy_id
    await supabase
      .from("compliance_policies")
      .update({
        jurisdiction_code: detail.program.target_jurisdiction,
        policy_scope: "LOCAL_COUNTRY",
        parent_group_policy_id: loc.group_policy_id || null,
        expansion_program_id: expansionId,
      })
      .eq("tenant_id", tenant.tenantId)
      .eq("id", createdPolicyBundle.policy.id);

    // Link the spawned policy back to the localisation row and matching core artefact
    await supabase
      .from("expansion_policy_localisations")
      .update({
        local_policy_id: createdPolicyBundle.policy.id,
        localisation_status: "DRAFTING",
        updated_at: new Date().toISOString(),
      })
      .eq("tenant_id", tenant.tenantId)
      .eq("id", loc.id);

    const matchingArtefactType =
      loc.compliance_area === "AML_CFT"
        ? "AML_CFT_POLICY"
        : loc.compliance_area === "KYC"
          ? "KYC_CDD_PROCEDURES"
          : loc.compliance_area === "SANCTIONS"
            ? "SANCTIONS_SCREENING_POLICY"
            : null;

    if (matchingArtefactType) {
      await supabase
        .from("expansion_artefacts")
        .update({
          status: "DRAFT",
          linked_policy_id: createdPolicyBundle.policy.id,
          evidence_ref: createdPolicyBundle.policy.policy_ref_no,
          updated_by: tenant.userId,
          updated_at: new Date().toISOString(),
        })
        .eq("tenant_id", tenant.tenantId)
        .eq("expansion_id", expansionId)
        .eq("artefact_type", matchingArtefactType);
    }

    return this.getExpansionDetail(tenant, expansionId);
  }

  /**
   * Stage 4: Adds or updates an entry in the Country Compliance Risk Register.
   */
  public async addRisk(
    tenant: TenantContext,
    expansionId: string,
    rawInput: import("zod").input<typeof createRiskSchema>,
  ): Promise<ExpansionDetailBundle> {
    requirePermission(tenant, "expansion.manage");
    const input: CreateRiskInput = createRiskSchema.parse(rawInput);
    const supabase = createAdminSupabaseClient();

    const inherentRating = computeRiskRating(input.inherent_likelihood, input.inherent_impact);
    const residualRating = computeRiskRating(input.residual_likelihood, input.residual_impact);

    const { error } = await supabase.from("expansion_risks").insert({
      tenant_id: tenant.tenantId,
      expansion_id: expansionId,
      risk_category: input.risk_category,
      risk_title: input.risk_title,
      risk_description: input.risk_description,
      inherent_likelihood: input.inherent_likelihood,
      inherent_impact: input.inherent_impact,
      inherent_rating: inherentRating,
      appetite_decision: input.appetite_decision,
      mitigation_plan: input.mitigation_plan,
      residual_likelihood: input.residual_likelihood,
      residual_impact: input.residual_impact,
      residual_rating: residualRating,
      status: input.appetite_decision === "PROHIBIT" ? "PROHIBITED_BLOCKED" : "MITIGATING",
      owner_name: input.owner_name || null,
    });

    if (error) {
      throw new AppApiError(
        "INTERNAL_SERVER_ERROR",
        `Failed to add country risk: ${error.message}`,
        500,
      );
    }

    return this.getExpansionDetail(tenant, expansionId);
  }

  public async updateRisk(
    tenant: TenantContext,
    expansionId: string,
    rawInput: import("zod").input<typeof updateRiskSchema>,
  ): Promise<ExpansionDetailBundle> {
    requirePermission(tenant, "expansion.manage");
    const input: UpdateRiskInput = updateRiskSchema.parse(rawInput);
    const supabase = createAdminSupabaseClient();

    const { data: existing } = await supabase
      .from("expansion_risks")
      .select("*")
      .eq("tenant_id", tenant.tenantId)
      .eq("expansion_id", expansionId)
      .eq("id", input.risk_id)
      .maybeSingle();

    if (!existing) {
      throw new AppApiError("NOT_FOUND", "Risk entry not found", 404);
    }

    const cur = existing as ExpansionRiskRecord;
    const inhL = input.inherent_likelihood ?? cur.inherent_likelihood;
    const inhI = input.inherent_impact ?? cur.inherent_impact;
    const resL = input.residual_likelihood ?? cur.residual_likelihood;
    const resI = input.residual_impact ?? cur.residual_impact;

    const patch: Record<string, unknown> = {
      inherent_likelihood: inhL,
      inherent_impact: inhI,
      inherent_rating: computeRiskRating(inhL, inhI),
      residual_likelihood: resL,
      residual_impact: resI,
      residual_rating: computeRiskRating(resL, resI),
      updated_at: new Date().toISOString(),
    };
    if (input.appetite_decision !== undefined) patch.appetite_decision = input.appetite_decision;
    if (input.mitigation_plan !== undefined) patch.mitigation_plan = input.mitigation_plan;
    if (input.status !== undefined) {
      patch.status = input.status;
      if (input.status === "ACCEPTED") {
        patch.accepted_by = tenant.userId;
        patch.accepted_at = new Date().toISOString();
      }
    }
    if (input.owner_name !== undefined) patch.owner_name = input.owner_name;

    const { error } = await supabase
      .from("expansion_risks")
      .update(patch)
      .eq("tenant_id", tenant.tenantId)
      .eq("expansion_id", expansionId)
      .eq("id", input.risk_id);

    if (error) {
      throw new AppApiError(
        "INTERNAL_SERVER_ERROR",
        `Failed to update country risk: ${error.message}`,
        500,
      );
    }

    return this.getExpansionDetail(tenant, expansionId);
  }

  /**
   * Stage 5: Adds or updates a Cross-Functional Operational Workstream.
   */
  public async addWorkstream(
    tenant: TenantContext,
    expansionId: string,
    rawInput: import("zod").input<typeof createWorkstreamSchema>,
  ): Promise<ExpansionDetailBundle> {
    requirePermission(tenant, "expansion.manage");
    const input: CreateWorkstreamInput = createWorkstreamSchema.parse(rawInput);
    const supabase = createAdminSupabaseClient();

    const { count } = await supabase
      .from("expansion_workstreams")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant.tenantId)
      .eq("expansion_id", expansionId);

    const code = `WS-${String((count || 0) + 1).padStart(2, "0")}`;

    const { error } = await supabase.from("expansion_workstreams").insert({
      tenant_id: tenant.tenantId,
      expansion_id: expansionId,
      workstream_code: code,
      title: input.title,
      description: input.description,
      stage: input.stage,
      responsible_team: input.responsible_team,
      priority: input.priority,
      status: "NOT_STARTED",
      control_specification: input.control_specification || null,
      expected_evidence: input.expected_evidence,
      owner_name: input.owner_name || null,
      due_date: input.due_date || null,
    });

    if (error) {
      throw new AppApiError(
        "INTERNAL_SERVER_ERROR",
        `Failed to create workstream: ${error.message}`,
        500,
      );
    }

    return this.getExpansionDetail(tenant, expansionId);
  }

  public async updateWorkstream(
    tenant: TenantContext,
    expansionId: string,
    rawInput: import("zod").input<typeof updateWorkstreamSchema>,
  ): Promise<ExpansionDetailBundle> {
    requirePermission(tenant, "expansion.manage");
    const input: UpdateWorkstreamInput = updateWorkstreamSchema.parse(rawInput);
    const supabase = createAdminSupabaseClient();

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.status !== undefined) {
      patch.status = input.status;
      if (input.status === "VERIFIED") {
        patch.verified_by = tenant.userId;
        patch.verified_at = new Date().toISOString();
      }
    }
    if (input.priority !== undefined) patch.priority = input.priority;
    if (input.control_specification !== undefined)
      patch.control_specification = input.control_specification;
    if (input.completion_evidence_ref !== undefined)
      patch.completion_evidence_ref = input.completion_evidence_ref;
    if (input.owner_name !== undefined) patch.owner_name = input.owner_name;
    if (input.due_date !== undefined) patch.due_date = input.due_date;

    const { error } = await supabase
      .from("expansion_workstreams")
      .update(patch)
      .eq("tenant_id", tenant.tenantId)
      .eq("expansion_id", expansionId)
      .eq("id", input.workstream_id);

    if (error) {
      throw new AppApiError(
        "INTERNAL_SERVER_ERROR",
        `Failed to update workstream: ${error.message}`,
        500,
      );
    }

    return this.getExpansionDetail(tenant, expansionId);
  }

  /**
   * Stage 6: Pre-Launch Compliance Validation Testing & Evidence Logging.
   */
  public async addValidationTest(
    tenant: TenantContext,
    expansionId: string,
    rawInput: import("zod").input<typeof createValidationTestSchema>,
  ): Promise<ExpansionDetailBundle> {
    requirePermission(tenant, "expansion.validate");
    const input: CreateValidationTestInput = createValidationTestSchema.parse(rawInput);
    const supabase = createAdminSupabaseClient();

    const { error } = await supabase.from("expansion_validation_tests").insert({
      tenant_id: tenant.tenantId,
      expansion_id: expansionId,
      test_category: input.test_category,
      test_name: input.test_name,
      test_objective: input.test_objective,
      is_critical_gate: input.is_critical_gate,
      status: "PENDING",
    });

    if (error) {
      throw new AppApiError(
        "INTERNAL_SERVER_ERROR",
        `Failed to add validation test: ${error.message}`,
        500,
      );
    }

    return this.getExpansionDetail(tenant, expansionId);
  }

  public async updateValidationTest(
    tenant: TenantContext,
    expansionId: string,
    rawInput: import("zod").input<typeof updateValidationTestSchema>,
  ): Promise<ExpansionDetailBundle> {
    requirePermission(tenant, "expansion.validate");
    const input: UpdateValidationTestInput = updateValidationTestSchema.parse(rawInput);
    const supabase = createAdminSupabaseClient();

    const nowIso = new Date().toISOString();
    const patch: Record<string, unknown> = {
      status: input.status,
      tested_by: tenant.userId,
      tested_at: nowIso,
      updated_at: nowIso,
    };
    if (input.evidence_ref !== undefined) patch.evidence_ref = input.evidence_ref;
    if (input.actual_result !== undefined) patch.actual_result = input.actual_result;
    if (input.remediation_log !== undefined) patch.remediation_log = input.remediation_log;
    if (input.verify || input.status === "PASSED") {
      patch.verified_by = tenant.userId;
      patch.verified_at = nowIso;
    }

    const { error } = await supabase
      .from("expansion_validation_tests")
      .update(patch)
      .eq("tenant_id", tenant.tenantId)
      .eq("expansion_id", expansionId)
      .eq("id", input.test_id);

    if (error) {
      throw new AppApiError(
        "INTERNAL_SERVER_ERROR",
        `Failed to update validation test: ${error.message}`,
        500,
      );
    }

    return this.getExpansionDetail(tenant, expansionId);
  }

  /**
   * Compiles the Board & Regulator-Ready Market Entry & Go-Live Readiness Dossier (Markdown).
   */
  public compileReadinessDossierMarkdown(detail: ExpansionDetailBundle): string {
    const { program, readiness, obligations, policy_localisations, risks, workstreams, validation_tests, reporting_calendar, country_roles, artefacts } = detail;

    return `# CROSS-BORDER COMPLIANCE READINESS & GO-LIVE DOSSIER
**Programme Reference:** ${program.program_ref_no}  
**Corridor:** ${program.home_jurisdiction} → ${program.target_country_name} (${program.target_jurisdiction})  
**Primary Regulators:** ${program.primary_regulators.join(", ")}  
**Operating Model:** ${program.operating_model}  
**Readiness Score:** ${readiness.overall_score}/100 (${readiness.go_live_eligible ? "GO-LIVE ELIGIBLE" : `${readiness.hard_blocker_count} BLOCKER(S) REMAINING`})  
**Generated At:** ${readiness.evaluated_at}

---

## 1. CCO Six-Question Go-Live Gate Verification
| # | CCO Go-Live Readiness Question | Status | Evidence & Blocker Summary |
|---|---|---|---|
${readiness.questions
  .map(
    (q) =>
      `| ${q.number} | **${q.question}** | **${q.status}** | ${q.summary} |`,
  )
  .join("\n")}

---

## 2. Country Governance & Appointed Officers (${country_roles.length})
${
  country_roles.length === 0
    ? "*No country-scoped officers appointed yet.*"
    : country_roles
        .map(
          (r) =>
            `- **${r.governance_role}**: ${r.assignee_name} (${r.entity_or_partner || "Internal"}) — Fit & Proper: \`${r.fit_and_proper_status}\``,
        )
        .join("\n")
}

---

## 3. Stage 1 & 2: Regulatory Obligations & Licensing Status (${obligations.length})
| Regulator | Statute / Circular | Obligation | Gap Status | Licensing Status |
|---|---|---|---|---|
${obligations
  .map(
    (o) =>
      `| ${o.regulator} | ${o.statute_reference} | ${o.obligation_title} | \`${o.gap_status}\` | \`${o.licensing_status}\` |`,
  )
  .join("\n")}

---

## 4. Stage 3: Group → Local Policy Framework Localisation (${policy_localisations.length}/8)
| Compliance Area | Localisation Status | Linked Local Policy |
|---|---|---|
${policy_localisations
  .map(
    (l) =>
      `| **${l.area_title}** (${l.compliance_area}) | \`${l.localisation_status}\` | ${l.local_policy_id ? `Linked (${l.local_policy_id.slice(0, 8)})` : "Pending"} |`,
  )
  .join("\n")}

---

## 5. Stage 4: Country Risk Appetite & Risk Register (${risks.length})
**Approved Risk Appetite:** ${program.risk_appetite_statement || "Standard institutional risk appetite"}

| Category | Risk Title | Inherent | Appetite Decision | Residual | Status |
|---|---|---|---|---|---|
${risks
  .map(
    (r) =>
      `| ${r.risk_category} | ${r.risk_title} | \`${r.inherent_rating}\` | \`${r.appetite_decision}\` | \`${r.residual_rating}\` | \`${r.status}\` |`,
  )
  .join("\n")}

---

## 6. Stage 5 & 6: Operational Workstreams (${workstreams.length}) & Pre-Launch Validation Tests (${validation_tests.length})
### Pre-Launch Control Test Evidence
| Test Category | Test Name | Status | Evidence Ref |
|---|---|---|---|
${validation_tests
  .map(
    (t) =>
      `| ${t.test_category} | ${t.test_name} | \`${t.status}\` | ${t.evidence_ref || "—"} |`,
  )
  .join("\n")}

---

## 7. Stage 7 & 8: Regulatory Reporting Calendar (${reporting_calendar.length}) & Core 13 Compliance Artefacts (${readiness.artefacts_ready_count}/${artefacts.length} Ready)
${reporting_calendar
  .map(
    (rep) =>
      `- **${rep.report_name}** (${rep.regulator} · \`${rep.frequency}\`): Channel: ${rep.submission_channel} · Next Due: ${rep.next_due_date || "TBD"}`,
  )
  .join("\n")}
`;
  }

  /**
   * Stage 6: Formal CCO / Management Committee / Board Go-Live Readiness Gate Decision.
   * Enforces Three Lines independence (Internal Audit blocked) and deterministic blocker checks.
   */
  public async handleGoLiveGateAction(
    tenant: TenantContext,
    expansionId: string,
    rawInput: import("zod").input<typeof goLiveGateActionSchema>,
  ): Promise<ExpansionDetailBundle & { generated_dossier_markdown?: string }> {
    const input: GoLiveGateActionInput = goLiveGateActionSchema.parse(rawInput);
    const detail = await this.getExpansionDetail(tenant, expansionId);
    const dossierMarkdown = this.compileReadinessDossierMarkdown(detail);

    if (input.action === "GENERATE_DOSSIER") {
      requirePermission(tenant, "expansion.read");
      return {
        ...detail,
        generated_dossier_markdown: dossierMarkdown,
      };
    }

    // SUBMIT_DECISION requires formal Go-Live approval authority (CCO / Committee / Board)
    const approverRole = assertExpansionGoLiveAuthority(tenant);
    const supabase = createAdminSupabaseClient();

    if (
      input.decision === "APPROVED_FOR_LAUNCH" &&
      !detail.readiness.go_live_eligible &&
      !input.force_conditional_override
    ) {
      throw new AppApiError(
        "EXPANSION_GO_LIVE_BLOCKED",
        `Go-Live Gate Blocked: ${detail.readiness.hard_blocker_count} compliance readiness blocker(s) remain unresolved across the 6 CCO Go-Live questions. Resolve open critical tests, licensing approvals, and P0 workstreams, or issue a CONDITIONAL_LAUNCH / BLOCKED_REMEDIATION_REQUIRED decision.`,
        422,
      );
    }

    const nowIso = new Date().toISOString();
    const approvalHash = crypto
      .createHash("sha256")
      .update(
        JSON.stringify({
          tenantId: tenant.tenantId,
          expansionId,
          decision: input.decision,
          approverUserId: tenant.userId,
          approverRole,
          readinessScore: detail.readiness.overall_score,
          questions: detail.readiness.questions,
          timestamp: nowIso,
        }),
      )
      .digest("hex");

    const { error: gateErr } = await supabase.from("expansion_go_live_gates").insert({
      tenant_id: tenant.tenantId,
      expansion_id: expansionId,
      decision: input.decision,
      approver_role: approverRole,
      approver_user_id: tenant.userId,
      approver_name: tenant.orgName ? `${approverRole} (${tenant.orgName})` : approverRole,
      readiness_score: detail.readiness.overall_score,
      cco_questions_snapshot: detail.readiness.questions,
      conditions_or_notes: input.conditions_or_notes || null,
      readiness_dossier_markdown: dossierMarkdown,
      approval_hash_sha256: approvalHash,
    });

    if (gateErr) {
      throw new AppApiError(
        "INTERNAL_SERVER_ERROR",
        `Failed to record Go-Live Gate decision: ${gateErr.message}`,
        500,
      );
    }

    if (
      input.decision === "APPROVED_FOR_LAUNCH" ||
      input.decision === "CONDITIONAL_LAUNCH"
    ) {
      await supabase
        .from("expansion_programs")
        .update({
          status: "LIVE",
          current_stage: "LIVE_OPERATIONS",
          go_live_approved_at: nowIso,
          go_live_approved_by: tenant.userId,
          go_live_approval_hash: approvalHash,
          updated_at: nowIso,
        })
        .eq("tenant_id", tenant.tenantId)
        .eq("id", expansionId);

      await supabase
        .from("expansion_artefacts")
        .update({
          status: "APPROVED",
          evidence_ref: `Go-Live Gate Hash ${approvalHash.slice(0, 12)}`,
          updated_by: tenant.userId,
          updated_at: nowIso,
        })
        .eq("tenant_id", tenant.tenantId)
        .eq("expansion_id", expansionId)
        .in("artefact_type", [
          "MARKET_ENTRY_COMPLIANCE_ASSESSMENT",
          "COMPLIANCE_TESTING_REPORT",
        ]);
    }

    await auditService.appendEvent({
      tenantId: tenant.tenantId,
      actorId: tenant.userId,
      actorType: "USER",
      action: `EXPANSION_GO_LIVE_${input.decision}`,
      entityType: "EXPANSION_PROGRAM",
      entityId: expansionId,
      eventData: {
        decision: input.decision,
        approverRole,
        readinessScore: detail.readiness.overall_score,
        approvalHash,
        conditionsOrNotes: input.conditions_or_notes || null,
      },
    });

    const refreshed = await this.getExpansionDetail(tenant, expansionId);
    return {
      ...refreshed,
      generated_dossier_markdown: dossierMarkdown,
    };
  }

  /**
   * Stage 7, Stage 8 & Governance Operations:
   * Manages Country Governance Roles, Regulatory Reporting Calendar, Compliance Incidents,
   * Multi-Country Regulatory Changes, and Core 13 Artefact statuses.
   */
  public async handleOperationsAction(
    tenant: TenantContext,
    expansionId: string,
    rawInput: import("zod").input<typeof expansionOperationsSchema>,
  ): Promise<ExpansionDetailBundle> {
    requirePermission(tenant, "expansion.manage");
    const input: ExpansionOperationsInput = expansionOperationsSchema.parse(rawInput);
    const supabase = createAdminSupabaseClient();
    const nowIso = new Date().toISOString();

    const { data: prog } = await supabase
      .from("expansion_programs")
      .select("target_jurisdiction")
      .eq("tenant_id", tenant.tenantId)
      .eq("id", expansionId)
      .maybeSingle();

    const targetJurisdiction =
      (prog as { target_jurisdiction?: string } | null)?.target_jurisdiction || "GLOBAL";

    if (input.entity === "COUNTRY_ROLE") {
      if (input.mode === "CREATE") {
        if (!input.governance_role || !input.assignee_name) {
          throw new AppApiError(
            "VALIDATION_FAILED",
            "governance_role and assignee_name are required to assign a country role.",
            400,
          );
        }
        const { error } = await supabase.from("expansion_country_roles").insert({
          tenant_id: tenant.tenantId,
          expansion_id: expansionId,
          jurisdiction_code: targetJurisdiction,
          governance_role: input.governance_role,
          assignee_name: input.assignee_name,
          assignee_email: input.assignee_email || null,
          entity_or_partner: input.entity_or_partner || null,
          fit_and_proper_status: input.fit_and_proper_status || "PENDING",
          appointed_at: nowIso,
          notes: input.notes || null,
        });
        if (error) {
          throw new AppApiError("INTERNAL_SERVER_ERROR", error.message, 500);
        }
      } else if (input.role_id) {
        const patch: Record<string, unknown> = { updated_at: nowIso };
        if (input.assignee_name !== undefined) patch.assignee_name = input.assignee_name;
        if (input.assignee_email !== undefined) patch.assignee_email = input.assignee_email;
        if (input.entity_or_partner !== undefined)
          patch.entity_or_partner = input.entity_or_partner;
        if (input.fit_and_proper_status !== undefined)
          patch.fit_and_proper_status = input.fit_and_proper_status;
        if (input.notes !== undefined) patch.notes = input.notes;

        await supabase
          .from("expansion_country_roles")
          .update(patch)
          .eq("tenant_id", tenant.tenantId)
          .eq("expansion_id", expansionId)
          .eq("id", input.role_id);
      }
    } else if (input.entity === "REPORTING_ITEM") {
      if (input.mode === "CREATE") {
        if (
          !input.regulator ||
          !input.report_name ||
          !input.frequency ||
          !input.submission_channel
        ) {
          throw new AppApiError(
            "VALIDATION_FAILED",
            "regulator, report_name, frequency, and submission_channel are required.",
            400,
          );
        }
        const { error } = await supabase.from("expansion_reporting_calendar").insert({
          tenant_id: tenant.tenantId,
          expansion_id: expansionId,
          regulator: input.regulator,
          report_name: input.report_name,
          frequency: input.frequency,
          submission_channel: input.submission_channel,
          statutory_reference: input.statutory_reference || null,
          owner_name: input.owner_name || null,
          next_due_date: input.next_due_date || null,
          status: input.status || "SCHEDULED",
          notes: input.notes || null,
        });
        if (error) {
          throw new AppApiError("INTERNAL_SERVER_ERROR", error.message, 500);
        }
      } else if (input.item_id) {
        const patch: Record<string, unknown> = { updated_at: nowIso };
        if (input.status !== undefined) {
          patch.status = input.status;
          if (input.status === "SUBMITTED") {
            patch.last_submitted_at = nowIso;
          }
        }
        if (input.next_due_date !== undefined) patch.next_due_date = input.next_due_date;
        if (input.last_submission_ref !== undefined)
          patch.last_submission_ref = input.last_submission_ref;
        if (input.owner_name !== undefined) patch.owner_name = input.owner_name;
        if (input.notes !== undefined) patch.notes = input.notes;

        await supabase
          .from("expansion_reporting_calendar")
          .update(patch)
          .eq("tenant_id", tenant.tenantId)
          .eq("expansion_id", expansionId)
          .eq("id", input.item_id);
      }
    } else if (input.entity === "INCIDENT") {
      if (input.mode === "CREATE") {
        if (!input.title || !input.description) {
          throw new AppApiError(
            "VALIDATION_FAILED",
            "title and description are required to log a compliance incident.",
            400,
          );
        }
        const { count } = await supabase
          .from("expansion_incidents")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenant.tenantId)
          .eq("expansion_id", expansionId);
        const refNo = `INC-${targetJurisdiction}-${String((count || 0) + 1).padStart(3, "0")}`;

        const { error } = await supabase.from("expansion_incidents").insert({
          tenant_id: tenant.tenantId,
          expansion_id: expansionId,
          incident_ref_no: refNo,
          title: input.title,
          description: input.description,
          severity: input.severity || "MEDIUM",
          category: input.category || "COMPLIANCE_BREACH",
          regulator_notification_required: input.regulator_notification_required ?? false,
          status: "OPEN",
          owner_name: input.owner_name || null,
          root_cause: input.root_cause || null,
          remediation_summary: input.remediation_summary || null,
        });
        if (error) {
          throw new AppApiError("INTERNAL_SERVER_ERROR", error.message, 500);
        }
      } else if (input.incident_id) {
        const patch: Record<string, unknown> = { updated_at: nowIso };
        if (input.status !== undefined) {
          patch.status = input.status;
          if (input.status === "REGULATOR_NOTIFIED") {
            patch.regulator_notified_at = nowIso;
          }
          if (input.status === "CLOSED") {
            patch.closed_at = nowIso;
          }
        }
        if (input.severity !== undefined) patch.severity = input.severity;
        if (input.owner_name !== undefined) patch.owner_name = input.owner_name;
        if (input.root_cause !== undefined) patch.root_cause = input.root_cause;
        if (input.remediation_summary !== undefined)
          patch.remediation_summary = input.remediation_summary;

        await supabase
          .from("expansion_incidents")
          .update(patch)
          .eq("tenant_id", tenant.tenantId)
          .eq("expansion_id", expansionId)
          .eq("id", input.incident_id);
      }
    } else if (input.entity === "REGULATORY_CHANGE") {
      if (input.mode === "CREATE") {
        if (!input.regulator || !input.circular_title || !input.impact_summary) {
          throw new AppApiError(
            "VALIDATION_FAILED",
            "regulator, circular_title, and impact_summary are required.",
            400,
          );
        }
        const { error } = await supabase.from("expansion_regulatory_changes").insert({
          tenant_id: tenant.tenantId,
          expansion_id: expansionId,
          jurisdiction_code: targetJurisdiction,
          regulator: input.regulator,
          circular_title: input.circular_title,
          source_url: input.source_url || null,
          detected_source: "MANUAL",
          impact_severity: input.impact_severity || "HIGH",
          impact_summary: input.impact_summary,
          impacted_areas: input.impacted_areas || [],
          assigned_owner: input.assigned_owner || null,
          implementation_deadline: input.implementation_deadline || null,
          status: input.status || "DETECTED",
          evidence_ref: input.evidence_ref || null,
        });
        if (error) {
          throw new AppApiError("INTERNAL_SERVER_ERROR", error.message, 500);
        }
      } else if (input.change_id) {
        const patch: Record<string, unknown> = { updated_at: nowIso };
        if (input.status !== undefined) patch.status = input.status;
        if (input.assigned_owner !== undefined) patch.assigned_owner = input.assigned_owner;
        if (input.implementation_deadline !== undefined)
          patch.implementation_deadline = input.implementation_deadline;
        if (input.evidence_ref !== undefined) patch.evidence_ref = input.evidence_ref;

        await supabase
          .from("expansion_regulatory_changes")
          .update(patch)
          .eq("tenant_id", tenant.tenantId)
          .eq("expansion_id", expansionId)
          .eq("id", input.change_id);
      }
    } else if (input.entity === "ARTEFACT") {
      await supabase
        .from("expansion_artefacts")
        .update({
          status: input.status,
          evidence_ref: input.evidence_ref !== undefined ? input.evidence_ref : undefined,
          updated_by: tenant.userId,
          updated_at: nowIso,
        })
        .eq("tenant_id", tenant.tenantId)
        .eq("expansion_id", expansionId)
        .eq("id", input.artefact_id);
    }

    return this.getExpansionDetail(tenant, expansionId);
  }
}

export const expansionWorkflowService = new ExpansionWorkflowService();
