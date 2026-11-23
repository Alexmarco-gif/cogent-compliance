/**
 * Cogent Compliance Platform — Deterministic Full Feature Structuring Pack Engine
 *
 * Translates any proposed fintech product/feature into:
 *  1. Structured Feature Proposal & Materiality Classification
 *  2. Multi-Domain Regulatory Impact Assessment (CBN, NFIU/AML, NDPC, FCCPC, Disputes, Record-Keeping)
 *  3. Risk & Control Matrix (Preventive / Detective / Corrective + Line-of-Defence Owner + Evidence)
 *  4. Compliance-to-Build Translation Chain (Obligation -> Control -> PRD -> Engineering -> SOP -> QA)
 *  5. 10-Point Non-Overridable Launch Readiness Gate Evaluation
 */

import type { CanonicalRole } from "@/modules/auth-tenancy/types";
import type {
  ChangeClassification,
  ComplianceDomain,
  ControlType,
  FeatureControlRecord,
  FinancialActivityType,
  MaterialityTier,
  ProductFeatureRecord,
  ReadinessChecklistItem,
  ReadinessEvaluation,
  RiaMatrixItem,
  TargetMarket,
} from "@/contracts/feature-governance.contracts";

export interface GeneratedControlBlueprint {
  control_code: string;
  compliance_domain: ComplianceDomain;
  regulator: string;
  statutory_citation: string;
  risk_statement: string;
  risk_severity: MaterialityTier;
  control_type: ControlType;
  control_objective: string;
  product_requirement: string;
  engineering_spec: string;
  operational_sop_trigger: string;
  qa_test_case: string;
  owner_line: "FIRST_LINE" | "SECOND_LINE";
  owner_role: CanonicalRole;
  required_evidence_description: string;
  is_mandatory_launch_blocker: boolean;
}

export interface FeatureStructuringBlueprint {
  feature_name: string;
  feature_code: string;
  financial_activity_type: FinancialActivityType;
  change_classification: ChangeClassification;
  materiality_tier: MaterialityTier;
  materiality_rationale: string;
  applicable_regulators: string[];
  regulatory_domains: ComplianceDomain[];
  ria_matrix: RiaMatrixItem[];
  controls: GeneratedControlBlueprint[];
  default_readiness_checklist: ReadinessChecklistItem[];
}

export class FeatureStructuringEngine {
  /**
   * Deterministically classifies a fintech feature description into its financial activity,
   * change classification, materiality tier, applicable regulators, multi-domain RIA,
   * Risk & Control Matrix, and Compliance-to-Build specifications.
   */
  public buildFeatureStructuringBlueprint(input: {
    featureName: string;
    description: string;
    businessObjective?: string;
    explicitActivityType?: FinancialActivityType;
    explicitChangeClassification?: ChangeClassification;
    explicitMaterialityTier?: MaterialityTier;
    targetMarket?: TargetMarket;
    licenseTier?: string | null;
  }): FeatureStructuringBlueprint {
    const corpus = `${input.featureName} ${input.description} ${input.businessObjective || ""}`.toLowerCase();

    const activityType =
      input.explicitActivityType || this.detectFinancialActivityType(corpus);
    const changeClassification =
      input.explicitChangeClassification || this.detectChangeClassification(corpus);
    const { tier: materialityTier, rationale: materialityRationale } =
      input.explicitMaterialityTier
        ? {
            tier: input.explicitMaterialityTier,
            rationale: `Explicit materiality tier set to ${input.explicitMaterialityTier} for ${changeClassification} (${activityType}).`,
          }
        : this.determineMateriality(activityType, changeClassification, corpus);

    const regulators = this.detectApplicableRegulators(activityType, corpus);
    const riaMatrix = this.buildMultiDomainRia(activityType, corpus, regulators);
    const controls = this.buildRiskAndControlMatrix(activityType, corpus);

    const domainSet = new Set<ComplianceDomain>([
      ...riaMatrix.map((r) => r.domain),
      ...controls.map((c) => c.compliance_domain),
    ]);

    const featureCode = this.generateFeatureCode(input.featureName, activityType);

    const defaultChecklist = this.evaluateReadinessChecklist({
      feature: {
        feature_name: input.featureName,
        business_objective: input.businessObjective || input.description.slice(0, 240),
        ria_matrix: riaMatrix,
        lifecycle_stage: "PROPOSAL",
        gate_status: "NOT_READY",
        metadata: {},
      },
      controls: controls.map((c, idx) => ({
        ...c,
        id: `preview_${idx}`,
        tenant_id: "preview",
        feature_id: "preview",
        verification_status: "PENDING",
        evidence_attachments: [],
        verified_by: null,
        verified_role: null,
        verified_at: null,
        verification_notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })),
    }).checklist;

    return {
      feature_name: input.featureName,
      feature_code: featureCode,
      financial_activity_type: activityType,
      change_classification: changeClassification,
      materiality_tier: materialityTier,
      materiality_rationale: materialityRationale,
      applicable_regulators: regulators,
      regulatory_domains: Array.from(domainSet),
      ria_matrix: riaMatrix,
      controls,
      default_readiness_checklist: defaultChecklist,
    };
  }

  /**
   * Computes the live 10-Point Institutional Launch Readiness Tracker and identifies
   * non-overridable mandatory compliance blockers.
   */
  public evaluateReadinessChecklist(params: {
    feature: Pick<
      ProductFeatureRecord,
      "feature_name" | "business_objective" | "ria_matrix" | "lifecycle_stage" | "gate_status" | "metadata"
    >;
    controls: FeatureControlRecord[];
    hasSecondLineSignoff?: boolean;
  }): ReadinessEvaluation {
    const { feature, controls, hasSecondLineSignoff = false } = params;

    const domainControls = (domains: ComplianceDomain[]) =>
      controls.filter((c) => domains.includes(c.compliance_domain));

    const allVerifiedOrWaived = (list: FeatureControlRecord[]) =>
      list.length > 0 &&
      list.every(
        (c) =>
          c.verification_status === "VERIFIED" ||
          c.verification_status === "WAIVED_WITH_CONDITION"
      );

    const hasEvidenceOnAll = (list: FeatureControlRecord[]) =>
      list.length > 0 && list.every((c) => (c.evidence_attachments?.length || 0) > 0);

    const mandatoryControls = controls.filter((c) => c.is_mandatory_launch_blocker);
    const failedMandatory = mandatoryControls.filter(
      (c) =>
        c.verification_status === "FAILED" ||
        c.verification_status === "REASSESSMENT_REQUIRED"
    );
    const unverifiedMandatory = mandatoryControls.filter(
      (c) =>
        c.verification_status !== "VERIFIED" &&
        c.verification_status !== "WAIVED_WITH_CONDITION"
    );

    const amlControls = domainControls(["KYC_CDD", "AML_CFT_CPF", "TRANSACTION_MONITORING", "SANCTIONS"]);
    const consumerControls = domainControls(["CONSUMER_PROTECTION"]);
    const opsControls = domainControls(["DISPUTES_COMPLAINTS", "RECORD_KEEPING"]);
    const secControls = domainControls(["INFOSEC", "DATA_PROTECTION", "FRAUD_PREVENTION"]);

    const hasProposal =
      feature.feature_name.trim().length >= 3 &&
      (feature.business_objective?.trim().length || 0) >= 5;
    const hasRia = Array.isArray(feature.ria_matrix) && feature.ria_matrix.length >= 4;
    const hasRiskMatrix = controls.length >= 4;
    const allMandatoryImplemented =
      mandatoryControls.length > 0 &&
      mandatoryControls.every(
        (c) =>
          c.verification_status === "EVIDENCE_SUBMITTED" ||
          c.verification_status === "VERIFIED" ||
          c.verification_status === "WAIVED_WITH_CONDITION"
      );
    const amlAddressed = allVerifiedOrWaived(amlControls);
    const disclosuresApproved =
      consumerControls.length === 0 ? hasRia : allVerifiedOrWaived(consumerControls);
    const opsSopsDocumented =
      opsControls.length === 0
        ? controls.every((c) => c.operational_sop_trigger.trim().length > 5)
        : opsControls.every(
            (c) =>
              c.operational_sop_trigger.trim().length > 5 &&
              ((c.evidence_attachments?.length || 0) > 0 || c.verification_status === "VERIFIED")
          );
    const securityTestingPassed =
      secControls.length === 0 ? hasEvidenceOnAll(mandatoryControls) : allVerifiedOrWaived(secControls);
    const complianceValidationCompleted =
      mandatoryControls.length > 0 && unverifiedMandatory.length === 0 && failedMandatory.length === 0;
    const managementApprovalObtained =
      hasSecondLineSignoff ||
      feature.gate_status === "APPROVED" ||
      feature.gate_status === "CONDITIONALLY_APPROVED";

    const checklist: ReadinessChecklistItem[] = [
      {
        key: "prd_approved",
        label: "Product requirements & materiality classification approved",
        owner_line: "FIRST_LINE",
        owner_label: "Product Management (1st Line)",
        mandatory: true,
        satisfied: hasProposal,
        detail: hasProposal
          ? "Structured proposal and materiality classification recorded."
          : "Complete business objective and feature scope in Proposal.",
      },
      {
        key: "ria_completed",
        label: "Multi-domain Regulatory Impact Assessment (RIA) completed",
        owner_line: "SECOND_LINE",
        owner_label: "Compliance & Legal (2nd Line)",
        mandatory: true,
        satisfied: hasRia,
        detail: hasRia
          ? `${feature.ria_matrix.length} statutory domains mapped across Nigerian regulators.`
          : "Complete Regulatory Impact Assessment across applicable domains.",
      },
      {
        key: "risk_assessment_completed",
        label: "Risk assessment & Preventive/Detective/Corrective control matrix mapped",
        owner_line: "SECOND_LINE",
        owner_label: "Enterprise Risk (2nd Line)",
        mandatory: true,
        satisfied: hasRiskMatrix,
        detail: hasRiskMatrix
          ? `${controls.length} controls mapped to risks, owners, and required test evidence.`
          : "Map material feature risks to Preventive, Detective, and Corrective controls.",
      },
      {
        key: "controls_implemented",
        label: "Required compliance controls implemented with 1st-line evidence",
        owner_line: "FIRST_LINE",
        owner_label: "Engineering & Product (1st Line)",
        mandatory: true,
        satisfied: allMandatoryImplemented,
        detail: allMandatoryImplemented
          ? "All mandatory launch-blocker controls have implementation evidence submitted."
          : `${mandatoryControls.filter((c) => c.verification_status === "PENDING" || c.verification_status === "IN_PROGRESS").length} mandatory control(s) still awaiting implementation evidence.`,
      },
      {
        key: "aml_cft_addressed",
        label: "AML/CFT/CPF, KYC/BVN-NIN, sanctions & transaction monitoring verified",
        owner_line: "SECOND_LINE",
        owner_label: "AML / MLRO & Fraud (2nd Line)",
        mandatory: true,
        satisfied: amlAddressed,
        detail: amlAddressed
          ? "All KYC, AML/CFT/CPF, sanctions, and automated monitoring controls verified."
          : `${amlControls.filter((c) => c.verification_status !== "VERIFIED" && c.verification_status !== "WAIVED_WITH_CONDITION").length} AML/KYC/Sanctions control(s) pending 2nd-line verification.`,
      },
      {
        key: "disclosures_approved",
        label: "Customer disclosures, KFS/fees & fair-treatment notices approved",
        owner_line: "SECOND_LINE",
        owner_label: "Compliance & Legal (2nd Line)",
        mandatory: true,
        satisfied: disclosuresApproved,
        detail: disclosuresApproved
          ? "Consumer protection disclosures and customer notifications verified."
          : "Verify consumer protection disclosure controls before launch.",
      },
      {
        key: "ops_sops_documented",
        label: "Operational SOPs, dispute resolution & audit-trail reconstruction ready",
        owner_line: "FIRST_LINE",
        owner_label: "Operations & Disputes (1st Line)",
        mandatory: true,
        satisfied: opsSopsDocumented,
        detail: opsSopsDocumented
          ? "Dispute/chargeback SOPs and 5-year transaction reconstruction evidence attached."
          : "Attach operational SOP and dispute workflow evidence for Operations/Record-Keeping controls.",
      },
      {
        key: "security_testing_passed",
        label: "Information security, NDPA privacy & fraud-prevention testing passed",
        owner_line: "SECOND_LINE",
        owner_label: "InfoSec / DPO & Fraud (2nd Line)",
        mandatory: true,
        satisfied: securityTestingPassed,
        detail: securityTestingPassed
          ? "InfoSec, NDPA privacy, and fraud detection controls verified."
          : "Complete 2nd-line verification of InfoSec, Data Protection, and Fraud controls.",
      },
      {
        key: "compliance_validation_completed",
        label: "Compliance validation completed (zero failed or unverified mandatory blockers)",
        owner_line: "SECOND_LINE",
        owner_label: "Compliance Validation (2nd Line)",
        mandatory: true,
        satisfied: complianceValidationCompleted,
        detail: complianceValidationCompleted
          ? "All mandatory launch-blocker controls verified by 2nd Line."
          : `${unverifiedMandatory.length} unverified and ${failedMandatory.length} failed/reassessment mandatory control(s) block unconditional approval.`,
      },
      {
        key: "management_approval_obtained",
        label: "Formal 2nd-Line / Management Launch Gate authorization obtained",
        owner_line: "SECOND_LINE",
        owner_label: "CCO / Legal / Risk Committee (2nd Line)",
        mandatory: true,
        satisfied: managementApprovalObtained,
        detail: managementApprovalObtained
          ? "Formal Launch Gate decision recorded in immutable ledger."
          : "Awaiting binding Launch Gate sign-off from authorized 2nd-Line approver.",
      },
    ];

    const numerator = checklist.filter((item) => item.satisfied).length;
    const denominator = checklist.length;

    // Non-overridable blockers for UNCONDITIONAL approval (first 9 items before the sign-off itself)
    const mandatoryBlockers: string[] = [];
    for (const item of checklist.slice(0, 9)) {
      if (item.mandatory && !item.satisfied) {
        mandatoryBlockers.push(`${item.label}: ${item.detail}`);
      }
    }
    if (failedMandatory.length > 0) {
      for (const ctrl of failedMandatory) {
        mandatoryBlockers.push(
          `Mandatory blocker control ${ctrl.control_code} (${ctrl.compliance_domain}) is in status ${ctrl.verification_status}.`
        );
      }
    }

    return {
      numerator,
      denominator,
      is_ready_for_unconditional_approval: mandatoryBlockers.length === 0,
      mandatory_blockers: Array.from(new Set(mandatoryBlockers)),
      checklist,
    };
  }

  /**
   * Formats the deterministic Feature Governance Pack as XML-delimited context
   * for injection into CopilotOrchestrator during PRODUCT_STRUCTURING_MEMO synthesis.
   */
  public formatPromptContext(blueprint: FeatureStructuringBlueprint): string {
    const riaRows = blueprint.ria_matrix
      .map(
        (r) =>
          `| ${r.domain} | ${r.regulator} | ${r.statutory_basis} | ${r.assessment_question} | ${r.required_outcome} | ${r.pre_launch_condition} |`
      )
      .join("\n");

    const controlRows = blueprint.controls
      .map(
        (c) =>
          `| ${c.control_code} | ${c.compliance_domain} | ${c.risk_statement} (${c.risk_severity}) | ${c.control_type} | ${c.control_objective} | ${c.owner_role} (${c.owner_line}) | ${c.required_evidence_description} |`
      )
      .join("\n");

    const buildRows = blueprint.controls
      .map(
        (c) =>
          `| ${c.statutory_citation} | ${c.control_code}: ${c.control_objective} | ${c.product_requirement} | ${c.engineering_spec} | ${c.operational_sop_trigger} | ${c.qa_test_case} |`
      )
      .join("\n");

    const checklistLines = blueprint.default_readiness_checklist
      .map((item, i) => `${i + 1}. [ ] ${item.label} — Owner: ${item.owner_label} (Mandatory Blocker: ${item.mandatory ? "YES" : "NO"})`)
      .join("\n");

    return `<deterministic_feature_governance_pack>
FEATURE_CODE: ${blueprint.feature_code}
FINANCIAL_ACTIVITY_TYPE: ${blueprint.financial_activity_type}
CHANGE_CLASSIFICATION: ${blueprint.change_classification}
MATERIALITY_TIER: ${blueprint.materiality_tier}
MATERIALITY_RATIONALE: ${blueprint.materiality_rationale}
APPLICABLE_REGULATORS: ${blueprint.applicable_regulators.join(", ")}

MULTI_DOMAIN_RIA_BASELINE:
| Compliance Domain | Regulator | Statutory Basis | Assessment Focus | Required Outcome | Pre-Launch Condition |
|---|---|---|---|---|---|
${riaRows}

RISK_AND_CONTROL_MATRIX_BASELINE:
| Control ID | Domain | Identified Risk | Control Type | Required Control | Accountable Owner (3LoD) | Required Evidence |
|---|---|---|---|---|---|---|
${controlRows}

COMPLIANCE_TO_BUILD_TRANSLATION_BASELINE:
| Regulatory Obligation | Compliance Control | Product Requirement | Engineering Specification | Operational SOP Trigger | QA / Compliance Test Case |
|---|---|---|---|---|---|
${buildRows}

LAUNCH_READINESS_CHECKLIST_10_POINT_GATE:
${checklistLines}
</deterministic_feature_governance_pack>`;
  }

  private detectFinancialActivityType(corpus: string): FinancialActivityType {
    if (/recurring\s+(?:payment|debit|transfer)|standing\s+order|auto[- ]?debit|direct\s+debit/.test(corpus)) {
      return "RECURRING_DEBIT";
    }
    if (/bnpl|buy\s+now\s+pay\s+later|loan|lending|salary\s+advance|credit|overdraft|instant[- ]advance/.test(corpus)) {
      return "DIGITAL_LENDING_BNPL";
    }
    if (/virtual\s+(?:usd\s+)?card|debit\s+card|credit\s+card|card\s+issu|mastercard|visa|verve/.test(corpus)) {
      return "CARD_ISSUANCE";
    }
    if (/fx|foreign\s+exchange|usd|dollar|remittance|imto|cross[- ]?border|international\s+transfer/.test(corpus)) {
      return "FX_CROSS_BORDER";
    }
    if (/investment|commercial\s+paper|yield|treasury|mutual\s+fund|robo|wealth|crypto|vasp|stock/.test(corpus)) {
      return "INVESTMENT_WEALTHTECH";
    }
    if (/agent\s+banking|pos\s+agent|super[- ]?agent|cash[- ]?in|cash[- ]?out/.test(corpus)) {
      return "AGENCY_BANKING";
    }
    if (/open\s+banking|api\s+aggregat|account\s+information\s+service/.test(corpus)) {
      return "OPEN_BANKING_API";
    }
    if (/wallet|savings|deposit|flexvault|fixed\s+deposit|interest[- ]bearing/.test(corpus)) {
      return "WALLET_DEPOSIT_SAVINGS";
    }
    if (/transfer|payout|nip|nibss|send\s+money|payment/.test(corpus)) {
      return "PAYMENTS_TRANSFER";
    }
    return "OTHER_FINANCIAL_SERVICE";
  }

  private detectChangeClassification(corpus: string): ChangeClassification {
    if (/new\s+product|launch(?:ing)?\s+(?:a\s+)?new|greenfield|standalone\s+app/.test(corpus)) {
      return "NEW_PRODUCT";
    }
    if (/increase\s+limit|modify|material\s+change|migrate|new\s+partner|reprice|change\s+fee|expand\s+to/.test(corpus)) {
      return "MATERIAL_MODIFICATION";
    }
    if (/ui\s+tweak|button\s+colou?r|copy\s+typo|cosmetic/.test(corpus)) {
      return "MINOR_CHANGE";
    }
    return "NEW_FEATURE";
  }

  private determineMateriality(
    activityType: FinancialActivityType,
    changeClassification: ChangeClassification,
    corpus: string
  ): { tier: MaterialityTier; rationale: string } {
    if (changeClassification === "MINOR_CHANGE") {
      return {
        tier: "LOW",
        rationale: "Cosmetic or non-functional UI adjustment without new financial activity, fund custody, or limit exposure.",
      };
    }

    if (
      activityType === "DIGITAL_LENDING_BNPL" ||
      activityType === "FX_CROSS_BORDER" ||
      activityType === "INVESTMENT_WEALTHTECH" ||
      activityType === "CARD_ISSUANCE" ||
      /automated\s+debit|cross[- ]?border|international|commercial\s+paper|pooled/.test(corpus)
    ) {
      return {
        tier: "CRITICAL",
        rationale: `High-exposure financial activity (${activityType}) involving credit, cross-border/FX settlement, pooled funds, or automated debit authority—requires full 3LoD governance, AML/CFT/CPF controls, and binding 2nd-Line Launch Gate approval.`,
      };
    }

    if (
      activityType === "RECURRING_DEBIT" ||
      activityType === "PAYMENTS_TRANSFER" ||
      activityType === "WALLET_DEPOSIT_SAVINGS" ||
      activityType === "AGENCY_BANKING" ||
      activityType === "OPEN_BANKING_API"
    ) {
      return {
        tier: "HIGH",
        rationale: `Regulated payment/custody/automated debit activity (${activityType}) introducing AML/CFT, unauthorized debit, fraud, consumer dispute, and NDPA data-protection exposure.`,
      };
    }

    return {
      tier: "MEDIUM",
      rationale: "Standard regulated fintech feature requiring compliance review, control verification, and Launch Gate sign-off.",
    };
  }

  private detectApplicableRegulators(activityType: FinancialActivityType, corpus: string): string[] {
    const regs = new Set<string>(["CBN", "NFIU", "NDPC", "FCCPC"]);
    if (/promo|advert|marketing|campaign|influencer|flyer|social|launch/.test(corpus)) {
      regs.add("ARCON");
    }
    if (activityType === "WALLET_DEPOSIT_SAVINGS" || /deposit|savings|mfb|bank|ndic/.test(corpus)) {
      regs.add("NDIC");
    }
    if (activityType === "INVESTMENT_WEALTHTECH" || /yield|commercial\s+paper|sec|investment|vasp|crypto/.test(corpus)) {
      regs.add("SEC");
    }
    if (/lottery|raffle|draw|spin[- ]and[- ]win|giveaway/.test(corpus)) {
      regs.add("NLRC");
    }
    return Array.from(regs);
  }

  private buildMultiDomainRia(
    activityType: FinancialActivityType,
    corpus: string,
    regulators: string[]
  ): RiaMatrixItem[] {
    const ria: RiaMatrixItem[] = [
      {
        domain: "KYC_CDD",
        regulator: "CBN",
        statutory_basis: "CBN Circular PSM/DIR/PUB/CIR/001/053 (1 Dec 2023) & CBN AML/CFT/CPF Regulations 2022",
        assessment_question: "Are customers electronically identified and verified (BVN/NIN) with tier-appropriate transaction caps before feature activation?",
        required_outcome: "Mandatory electronic BVN/NIN verification at onboarding; strict KYC tier cumulative balance and daily transaction limit enforcement.",
        risk_level: "HIGH",
        pre_launch_condition: "Verify KYC tier gate blocks unverified accounts from activating or transacting on this feature.",
      },
      {
        domain: "AML_CFT_CPF",
        regulator: "CBN / NFIU",
        statutory_basis: "MLPPA 2022 §7, CBN Baseline Standards for Automated AML/CFT/CPF Solutions (10 Mar 2026) & NFIU goAML Rules",
        assessment_question: "Can the feature be abused for layering, structuring, or illicit fund movement, and are automated detection & 24h STR escalation paths configured?",
        required_outcome: "Automated AML rule coverage aligned to CBN March 2026 Baseline Standards with 24-hour MLRO STR triage and NFIU goAML reporting.",
        risk_level: "CRITICAL",
        pre_launch_condition: "MLRO / AML Officer confirms automated monitoring scenarios and STR escalation workflow in staging.",
      },
      {
        domain: "TRANSACTION_MONITORING",
        regulator: "CBN / NFIU",
        statutory_basis: "CBN Baseline Standards for Automated AML/CFT/CPF Solutions (10 Mar 2026) & CBN Electronic Payment Guidelines",
        assessment_question: "Can unusual velocity, structuring, duplicate debits, or anomalous counterparty patterns be detected in real time?",
        required_outcome: "Automated velocity, split-transaction, and recurring anomaly alerts routed to AML/Fraud queue with SLA tracking.",
        risk_level: "HIGH",
        pre_launch_condition: "Demonstrate live alert firing on synthetic high-velocity and structuring test transactions.",
      },
      {
        domain: "SANCTIONS",
        regulator: "NFIU / CBN",
        statutory_basis: "Terrorism (Prevention and Prohibition) Act 2022 & Nigeria Sanctions List / UNSC Screening Directives",
        assessment_question: "Are customers, beneficiaries, and relevant third parties screened against Nigeria Sanctions List, UNSC, and PEP lists prior to settlement?",
        required_outcome: "Real-time onboarding and pre-settlement counterparty screening with automatic transaction hold on true/potential hits.",
        risk_level: "HIGH",
        pre_launch_condition: "Attach sanctions hit-blocking test log covering Nigeria Sanctions List and PEP watchlist triggers.",
      },
      {
        domain: "CONSUMER_PROTECTION",
        regulator: "CBN / FCCPC",
        statutory_basis: "CBN Consumer Protection Regulations 2019 & FCCPA 2018 Part XV (Fair Treatment & Transparent Pricing)",
        assessment_question: "Are customers clearly informed of fees, deduction schedules, cancellation rights, and risks prior to authorization?",
        required_outcome: "Pre-confirmation Key Facts / fee disclosure screen, explicit opt-in consent, and clear pre-debit/post-debit notifications.",
        risk_level: "HIGH",
        pre_launch_condition: "Compliance & Legal sign-off on exact in-app disclosure screens, T&Cs, and notification templates.",
      },
      {
        domain: "DATA_PROTECTION",
        regulator: "NDPC / CBN",
        statutory_basis: "NDPA 2023 §§24–27 & 41–43, NDPC GAID 2025 (72h Breach Notification) & CBN Circular PSS/DIR/PUB/CIR/001/004 (15 Jun 2026 In-Country Payment Data Localization)",
        assessment_question: "Is personal financial data processed with lawful basis, encrypted, stored in-country for primary Nigerian payment records, and DPIA-assessed?",
        required_outcome: "Completed DPIA where high-risk processing applies, explicit non-bundled consent, in-country primary payment ledger hosting, and 72h NDPC breach protocol.",
        risk_level: "HIGH",
        pre_launch_condition: "InfoSec / DPO sign-off on DPIA, data residency architecture, and consent logs.",
      },
      {
        domain: "RECORD_KEEPING",
        regulator: "CBN / NFIU / FCCPC",
        statutory_basis: "MLPPA 2022 (Minimum 5-Year Record Retention), BOFIA 2020 & FCCPC Reg. 32 (2-Year Promotional Records)",
        assessment_question: "Can the institution reconstruct every customer instruction, authentication token, modification, cancellation, and settlement leg for at least 5 years?",
        required_outcome: "Immutable append-only audit trail storing customer ID, mandate/instruction payload, MFA evidence, timestamp, IP/device hash, and ledger entry ID for >= 5 years.",
        risk_level: "HIGH",
        pre_launch_condition: "Verify audit log retrieval query reconstructs full instruction-to-settlement lifecycle within minutes.",
      },
      {
        domain: "DISPUTES_COMPLAINTS",
        regulator: "CBN / FCCPC",
        statutory_basis: "CBN Consumer Protection Regulations (48h/72h Electronic Dispute Resolution SLAs) & FCCPC Consumer Redress Rules",
        assessment_question: "Can customers immediately cancel instructions, challenge unauthorized/duplicate deductions, and receive resolution within CBN SLAs?",
        required_outcome: "Self-service cancellation/freeze, structured dispute intake with ticket ID, 24h–72h refund/chargeback SOP, and escalation path to CBN CPD.",
        risk_level: "HIGH",
        pre_launch_condition: "Operations Lead publishes Dispute & Duplicate-Debit Remediation SOP and tests end-to-end reversal flow.",
      },
    ];

    if (activityType === "DIGITAL_LENDING_BNPL" || /bnpl|loan|credit/.test(corpus)) {
      ria.push({
        domain: "LICENSING_PERIMETER",
        regulator: "FCCPC / CBN",
        statutory_basis: "FCCPC DEON Consumer Lending Regulations 2025, BOFIA 2020 §2 & Google Play Personal Loan Policy",
        assessment_question: "Does the institution hold valid lending authorization, disclose true effective APR/IRR without drip pricing, and prohibit contact-scraping?",
        required_outcome: "Verified lending license or bank sponsor, upfront CBN KFS with true APR/EAR, >= 61-day tenor for Play Store apps, and ethical recovery workflow.",
        risk_level: "CRITICAL",
        pre_launch_condition: "Legal Counsel validates lending license perimeter and KFS APR math prior to launch.",
      });
    }

    if (activityType === "FX_CROSS_BORDER" || activityType === "CARD_ISSUANCE" || regulators.includes("SEC")) {
      ria.push({
        domain: "LICENSING_PERIMETER",
        regulator: regulators.includes("SEC") ? "CBN / SEC" : "CBN",
        statutory_basis: regulators.includes("SEC")
          ? "ISA 2025 / SEC CIS Rules & BOFIA 2020 §§2, 58–59"
          : "Foreign Exchange (Monitoring and Miscellaneous Provisions) Act 1995 & CBN Revised IMTO / Card Guidelines",
        assessment_question: "Is the proposed FX/card/investment activity strictly within the institution's CBN/SEC license scope or backed by a compliant licensed sponsor bank?",
        required_outcome: "Verified license perimeter or signed sponsor-bank / licensed custodian agreement with explicit settlement and regulatory responsibility boundaries.",
        risk_level: "CRITICAL",
        pre_launch_condition: "Legal Counsel & CCO sign off executed partner agreement or regulatory no-objection letter.",
      });
    }

    return ria;
  }

  private buildRiskAndControlMatrix(
    activityType: FinancialActivityType,
    corpus: string
  ): GeneratedControlBlueprint[] {
    const isRecurring = activityType === "RECURRING_DEBIT";
    const isLending = activityType === "DIGITAL_LENDING_BNPL" || /bnpl|loan|credit/.test(corpus);

    const controls: GeneratedControlBlueprint[] = [
      {
        control_code: "CTRL-AUTH-01",
        compliance_domain: "FRAUD_PREVENTION",
        regulator: "CBN",
        statutory_citation: "CBN Guidelines on Electronic Payment Channels & CBN Cybersecurity Framework",
        risk_statement: isRecurring
          ? "Unauthorized recurring debit instructions activated or modified without verified customer mandate."
          : "Unauthorized transaction initiation or account takeover leading to customer financial loss.",
        risk_severity: "CRITICAL",
        control_type: "PREVENTIVE",
        control_objective: isRecurring
          ? "Enforce strong customer authentication (MFA/PIN + OTP/Biometric) and explicit mandate confirmation before activating or editing any recurring debit."
          : "Enforce strong multi-factor customer authentication (PIN + OTP/Biometric) and risk-based step-up verification prior to fund movement.",
        product_requirement: isRecurring
          ? "Customer must review debit amount, beneficiary, frequency, start/end date, and confirm with 2FA before mandate activation."
          : "Customer must review recipient, amount, and fees on a confirmation screen and complete 2FA before execution.",
        engineering_spec:
          "Implement signed mandate/transaction authorization token service; persist immutable authorization record (customer_id, instruction_hash, auth_method, device_fingerprint, ip_address, utc_timestamp) before allowing ledger debit.",
        operational_sop_trigger:
          "Dispute SOP §2.1: Operations retrieves cryptographic authorization proof within 4 hours for any customer claim of unauthorized debit.",
        qa_test_case:
          "Attempt API call to activate instruction/execute debit without valid MFA token or with tampered amount payload; assert HTTP 403 rejection and zero ledger debit; verify positive case writes complete audit log.",
        owner_line: "FIRST_LINE",
        owner_role: "ENGINEERING_LEAD",
        required_evidence_description: "Staging authorization logs + negative API security test report proving unauthenticated instructions cannot execute.",
        is_mandatory_launch_blocker: true,
      },
      {
        control_code: "CTRL-KYC-02",
        compliance_domain: "KYC_CDD",
        regulator: "CBN",
        statutory_citation: "CBN Circular PSM/DIR/PUB/CIR/001/053 (1 Dec 2023) & CBN Tiered KYC Directives",
        risk_statement: "Unverified or low-tier customers bypass BVN/NIN verification or exceed statutory daily/cumulative transaction limits.",
        risk_severity: "CRITICAL",
        control_type: "PREVENTIVE",
        control_objective: "Enforce Day-0 electronic BVN/NIN verification and hard server-side KYC tier velocity & single-transaction limits.",
        product_requirement:
          "Block feature activation for unverified profiles; display real-time remaining daily/cumulative limit and clear tier-upgrade path.",
        engineering_spec:
          "Server-side limit engine evaluates tenant KYC tier matrix (Tier 1/2/3 single-tx cap, daily cap, cumulative balance cap) atomically inside the debit transaction lock before settlement.",
        operational_sop_trigger:
          "KYC Escalation SOP: Tier-upgrade reviews and manual limit exceptions require documented 2nd-line Compliance approval.",
        qa_test_case:
          "Execute transactions exceeding Tier-1 and Tier-2 single and daily cumulative caps; confirm deterministic block with structured limit-exceeded response and audit event.",
        owner_line: "FIRST_LINE",
        owner_role: "ENGINEERING_LEAD",
        required_evidence_description: "Limit configuration table export + automated test logs for Tier-1/2/3 boundary enforcement.",
        is_mandatory_launch_blocker: true,
      },
      {
        control_code: "CTRL-AML-03",
        compliance_domain: "TRANSACTION_MONITORING",
        regulator: "CBN / NFIU",
        statutory_citation: "CBN Baseline Standards for Automated AML/CFT/CPF Solutions (10 Mar 2026) & MLPPA 2022 §7",
        risk_statement: "Feature exploited for money laundering, smurfing/structuring, mule pass-through, or anomalous recurring transfers undetected by AML rules.",
        risk_severity: "CRITICAL",
        control_type: "DETECTIVE",
        control_objective: "Stream all feature events to automated AML/CFT/CPF transaction monitoring with real-time velocity, structuring, and counterparty anomaly rules and 24h NFIU STR triage.",
        product_requirement:
          "Flagged transactions enter automated hold/review queue without tipping off the customer (anti-tipping-off messaging).",
        engineering_spec:
          "Emit normalized ISO/event webhook to automated AML monitoring engine containing sender/beneficiary BVN/account, amount, frequency, device/geo metadata, and rule disposition hook.",
        operational_sop_trigger:
          "AML/MLRO SOP: High-priority alerts triaged immediately; confirmed suspicious transactions filed via NFIU goAML within 24 hours.",
        qa_test_case:
          "Replay synthetic structuring pattern (5 split transfers just below threshold within 1 hour) and verify automated AML alert creation, case queue routing, and audit timestamp.",
        owner_line: "SECOND_LINE",
        owner_role: "AML_FRAUD_OFFICER",
        required_evidence_description: "AML rule configuration snapshot + synthetic structuring alert test evidence signed off by MLRO.",
        is_mandatory_launch_blocker: true,
      },
      {
        control_code: "CTRL-SANC-04",
        compliance_domain: "SANCTIONS",
        regulator: "NFIU / CBN",
        statutory_citation: "Terrorism (Prevention and Prohibition) Act 2022 & Nigeria Sanctions List Regulations",
        risk_statement: "Transactions processed with designated sanctioned persons, entities, or unreviewed high-risk PEPs.",
        risk_severity: "HIGH",
        control_type: "PREVENTIVE",
        control_objective: "Screen customer and counterparty names/identifiers against Nigeria Sanctions List, UNSC, and PEP watchlists prior to activation and settlement.",
        product_requirement:
          "Automatically freeze/block prohibited matches and display neutral compliance review status without tipping off.",
        engineering_spec:
          "Integrate synchronous pre-settlement sanctions screening call with fuzzy-match threshold logging and immutable hit-disposition audit records.",
        operational_sop_trigger:
          "Sanctions Freeze SOP: True matches frozen immediately and escalated to MLRO/NFIU within statutory timelines.",
        qa_test_case:
          "Submit test beneficiary matching a seeded Nigeria Sanctions List test record; verify hard settlement block and immediate MLRO alert creation.",
        owner_line: "SECOND_LINE",
        owner_role: "AML_FRAUD_OFFICER",
        required_evidence_description: "Sanctions screening integration test log demonstrating hard block and alert escalation.",
        is_mandatory_launch_blocker: true,
      },
      {
        control_code: "CTRL-CONS-05",
        compliance_domain: "CONSUMER_PROTECTION",
        regulator: "CBN / FCCPC",
        statutory_citation: "CBN Consumer Protection Regulations 2019 & FCCPA 2018 Part XV",
        risk_statement: "Customers charged undisclosed fees, unaware of upcoming automated deductions, or unable to revoke consent easily.",
        risk_severity: "HIGH",
        control_type: "PREVENTIVE",
        control_objective: isLending
          ? "Display complete CBN Key Facts Statement (true effective APR, total repayable, all fees, cooling-off rights) prior to acceptance."
          : "Display full fee breakdown, deduction schedule, and instant cancellation controls prior to confirmation, plus automated pre/post-transaction alerts.",
        product_requirement:
          "Pre-confirmation disclosure summary + instant self-service pause/cancel toggle + SMS/Email/Push notifications before and after execution.",
        engineering_spec:
          "Version-tag disclosure text displayed to customer; record disclosure_version_id and consent_timestamp alongside instruction; trigger idempotent notification job T-24h (for recurring) and T+0.",
        operational_sop_trigger:
          "Customer Support SOP: Agents honor cancellation/opt-out requests immediately and log confirmation reference.",
        qa_test_case:
          "Verify UI cannot proceed without viewing fee/disclosure screen, consent version is persisted in DB, and cancellation immediately halts subsequent scheduled debits.",
        owner_line: "FIRST_LINE",
        owner_role: "PRODUCT_MANAGER",
        required_evidence_description: "Approved UI disclosure screenshots, notification templates, and cancellation test recording.",
        is_mandatory_launch_blocker: true,
      },
      {
        control_code: "CTRL-PRIV-06",
        compliance_domain: "DATA_PROTECTION",
        regulator: "NDPC / CBN",
        statutory_citation: "NDPA 2023 §§24–27 & 41–43, NDPC GAID 2025 & CBN Data Localization Circular PSS/DIR/PUB/CIR/001/004 (15 Jun 2026)",
        risk_statement: "Unauthorized personal data disclosure, bundled dark-pattern consent, or unlawful offshore hosting of primary Nigerian payment records.",
        risk_severity: "HIGH",
        control_type: "PREVENTIVE",
        control_objective: "Enforce explicit unbundled NDPA consent, encryption in transit/at rest, in-country primary payment data residency, and DPIA sign-off.",
        product_requirement:
          "Granular opt-in consent without pre-ticked boxes; accessible privacy notice detailing third-party processors.",
        engineering_spec:
          "Route primary Nigerian payment transaction ledger and PII to compliant in-country Tier-III/IV infrastructure; enforce TLS 1.3 + AES-256 encryption and RBAC-scoped field masking.",
        operational_sop_trigger:
          "Data Incident SOP: Any confirmed personal data breach triggers NDPC notification within 72 hours per NDPA 2023 / GAID 2025.",
        qa_test_case:
          "Verify DB encryption, data residency deployment region, unbundled consent persistence, and absence of sensitive PII in application debug logs.",
        owner_line: "SECOND_LINE",
        owner_role: "INFOSEC_OFFICER",
        required_evidence_description: "Signed DPIA summary, data-residency architecture verification, and security/pentest sign-off.",
        is_mandatory_launch_blocker: true,
      },
      {
        control_code: "CTRL-DISP-07",
        compliance_domain: "DISPUTES_COMPLAINTS",
        regulator: "CBN / FCCPC",
        statutory_citation: "CBN Consumer Protection Regulations (48h/72h Dispute Resolution) & Operational Risk Guidelines",
        risk_statement: "Duplicate debits, failed settlements, or customer disputes remain unresolved past CBN SLAs causing regulatory sanctions and customer harm.",
        risk_severity: "HIGH",
        control_type: "CORRECTIVE",
        control_objective: "Enforce idempotent debit keys to prevent duplicate deductions and operate a tracked dispute/reversal workflow meeting CBN 48h/72h SLAs.",
        product_requirement:
          "One-tap 'Report an Issue / Dispute Transaction' flow generating a tracked ticket ID and automated SLA status updates.",
        engineering_spec:
          "Require unique idempotency_key per scheduled debit cycle/transfer; implement automated reconciliation job flagging partial/duplicate postings and atomic reversal API.",
        operational_sop_trigger:
          "Duplicate Debit & Dispute Escalation SOP: Operations flags anomaly -> Engineering isolates root cause -> Risk sizes exposure -> Compliance assesses CBN/customer impact -> automated bulk refund + incident record.",
        qa_test_case:
          "Replay identical debit execution request twice concurrently; confirm single ledger posting (idempotency pass); execute end-to-end dispute ticket creation and reversal within SLA.",
        owner_line: "FIRST_LINE",
        owner_role: "OPERATIONS_LEAD",
        required_evidence_description: "Published Dispute & Incident Escalation SOP + idempotency concurrency test evidence.",
        is_mandatory_launch_blocker: true,
      },
      {
        control_code: "CTRL-AUD-08",
        compliance_domain: "RECORD_KEEPING",
        regulator: "CBN / NFIU",
        statutory_citation: "MLPPA 2022 (5-Year Retention) & BOFIA 2020 Audit Trail Obligations",
        risk_statement: "Institution unable to reconstruct customer instructions, limit checks, approvals, or settlements during CBN/NFIU inspection or dispute.",
        risk_severity: "HIGH",
        control_type: "DETECTIVE",
        control_objective: "Maintain tamper-evident, immutable transaction and instruction audit logs retained for at least 5 years.",
        product_requirement:
          "Every customer action (create, authorize, modify, pause, cancel, execute, reverse) is visible in customer history and compliance audit view.",
        engineering_spec:
          "Write append-only ledger & instruction audit events with cryptographic hash chaining and 5-year WORM archival retention policy.",
        operational_sop_trigger:
          "Regulatory Examination SOP: Compliance Analyst exports full instruction-to-settlement dossier within 24 hours of regulator inquiry.",
        qa_test_case:
          "Run full lifecycle (create -> authorize -> execute -> cancel -> dispute) and verify immutable audit export reconstructs all events with intact timestamps and actor IDs.",
        owner_line: "FIRST_LINE",
        owner_role: "ENGINEERING_LEAD",
        required_evidence_description: "Sample reconstructed transaction audit trail export + 5-year retention policy configuration.",
        is_mandatory_launch_blocker: true,
      },
    ];

    if (isLending) {
      controls.push({
        control_code: "CTRL-CRED-09",
        compliance_domain: "LICENSING_PERIMETER",
        regulator: "FCCPC / CBN",
        statutory_citation: "FCCPC DEON Consumer Lending Regulations 2025 & CBN Guide to Charges",
        risk_statement: "Drip pricing, undisclosed upfront fee deductions, sub-60-day Play Store tenor violations, or unauthorized credit activity outside license tier.",
        risk_severity: "CRITICAL",
        control_type: "PREVENTIVE",
        control_objective: "Validate credit license scope, deterministic effective APR/EAR display, ethical collections rules, and repayment tenor bounds prior to disbursement.",
        product_requirement:
          "Display deterministic Key Facts Statement (principal, net disbursed, fees, nominal & effective APR, late penalty cap) and enforce ethical recovery policy.",
        engineering_spec:
          "Bind loan origination pricing strictly to approved `campaign_products` rate card; block disbursement if effective APR disclosure hash is absent or tenor violates policy.",
        operational_sop_trigger:
          "Collections SOP: Strictly prohibit contact-list scraping, third-party shaming messages, or unauthorized auto-debits outside signed mandate.",
        qa_test_case:
          "Originate test loan with processing fee and verify KFS displays exact net disbursement and effective APR matching deterministic calculator.",
        owner_line: "SECOND_LINE",
        owner_role: "LEGAL_COUNSEL",
        required_evidence_description: "Legal Counsel license-perimeter memo + verified KFS APR calculation output.",
        is_mandatory_launch_blocker: true,
      });
    }

    return controls;
  }

  private generateFeatureCode(featureName: string, activityType: FinancialActivityType): string {
    const prefixMap: Record<FinancialActivityType, string> = {
      PAYMENTS_TRANSFER: "PAY",
      RECURRING_DEBIT: "REC",
      DIGITAL_LENDING_BNPL: "CRD",
      WALLET_DEPOSIT_SAVINGS: "WLT",
      FX_CROSS_BORDER: "FXC",
      CARD_ISSUANCE: "CRD",
      INVESTMENT_WEALTHTECH: "INV",
      AGENCY_BANKING: "AGN",
      OPEN_BANKING_API: "OBK",
      OTHER_FINANCIAL_SERVICE: "FTR",
    };
    const slug = featureName
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "")
      .slice(0, 4) || "FEAT";
    const suffix = Math.floor(100 + Math.random() * 900);
    return `NPA-${prefixMap[activityType]}-${slug}-${suffix}`;
  }
}

export const featureStructuringEngine = new FeatureStructuringEngine();
