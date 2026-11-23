/**
 * Cogent Compliance OS — Cross-Border Jurisdiction Blueprints & Statutory Seed Library
 *
 * Provides curated, primary-source-grounded regulatory blueprints for anchor corridors
 * (Ghana BoG Act 987 / Act 843 / AML Act 1044, Kenya CBK NPS Act / DPA 2019 / POCAMLA,
 * South Africa SARB / FSCA / FIC / POPIA, UK FCA / PSR / UK GDPR, and open-world fallback)
 * so initiating a new Cross-Border Expansion Program immediately populates:
 *   - Stage 1 & 2: Regulatory Obligations & Licensing Matrix
 *   - Stage 3:     8 Policy Localisation Pillars (KYC, AML/CFT, Sanctions, TM, Data, Consumer, Recordkeeping, Reporting)
 *   - Stage 4:     Country Risk Register (Inherent vs. Residual Risk & Appetite Decisions)
 *   - Stage 5:     10 Cross-Functional Operational Workstreams (Legal, Reg Affairs, AML, Risk, Procurement, Eng, HR, Ops)
 *   - Stage 6:     7 Pre-Launch Compliance Validation Tests
 *   - Stage 7:     Country Regulatory Reporting Calendar & 7-Frequency Monitoring Cadence
 *   - Governance:  13 Core Compliance Artefacts & Country Governance Role slots
 */

import { resolveJurisdictionDescriptor } from "@/modules/live-web-intelligence/africa-regulators";
import type {
  CoreArtefactType,
  ExpansionProductScope,
  ExpansionRiskCategory,
  ExpansionStage,
  LocalisationComplianceArea,
  ObligationStageCategory,
  ReportingFrequency,
  RiskAppetiteDecision,
  RiskRating,
  ValidationTestCategory,
  WorkstreamPriority,
  WorkstreamTeam,
} from "@/contracts/expansion.contracts";

export interface BlueprintObligationSeed {
  stage_category: ObligationStageCategory;
  regulator: string;
  statute_reference: string;
  obligation_title: string;
  obligation_summary: string;
  is_mandatory_for_go_live: boolean;
  owner_department: string;
  source_url?: string;
}

export interface BlueprintLocalisationSeed {
  compliance_area: LocalisationComplianceArea;
  area_title: string;
  local_requirements_summary: string;
  gap_summary: string;
}

export interface BlueprintRiskSeed {
  risk_category: ExpansionRiskCategory;
  risk_title: string;
  risk_description: string;
  inherent_likelihood: number;
  inherent_impact: number;
  appetite_decision: RiskAppetiteDecision;
  mitigation_plan: string;
  residual_likelihood: number;
  residual_impact: number;
}

export interface BlueprintWorkstreamSeed {
  workstream_code: string;
  title: string;
  description: string;
  stage: ExpansionStage;
  responsible_team: WorkstreamTeam;
  priority: WorkstreamPriority;
  control_specification: string;
  expected_evidence: string;
}

export interface BlueprintValidationTestSeed {
  test_category: ValidationTestCategory;
  test_name: string;
  test_objective: string;
  is_critical_gate: boolean;
}

export interface BlueprintReportingItemSeed {
  regulator: string;
  report_name: string;
  frequency: ReportingFrequency;
  submission_channel: string;
  statutory_reference: string;
  days_until_first_due: number;
}

export interface JurisdictionExpansionBlueprint {
  jurisdictionCode: string;
  countryName: string;
  primaryRegulators: string[];
  recommendedRiskAppetite: string;
  defaultProhibitedActivities: string[];
  obligations: BlueprintObligationSeed[];
  localisations: BlueprintLocalisationSeed[];
  risks: BlueprintRiskSeed[];
  workstreams: BlueprintWorkstreamSeed[];
  validationTests: BlueprintValidationTestSeed[];
  reportingCalendar: BlueprintReportingItemSeed[];
}

export const CORE_13_ARTEFACT_DEFINITIONS: ReadonlyArray<{
  artefact_type: CoreArtefactType;
  title: string;
  purpose: string;
}> = [
  {
    artefact_type: "MARKET_ENTRY_COMPLIANCE_ASSESSMENT",
    title: "Market Entry Compliance Assessment",
    purpose: "Establishes whether the institution is legally permitted and ready to enter the target market",
  },
  {
    artefact_type: "REGULATORY_OBLIGATIONS_REGISTER",
    title: "Regulatory Obligations Register",
    purpose: "Tracks applicable laws, acts, circulars, licensing conditions, and statutory requirements",
  },
  {
    artefact_type: "REGULATORY_GAP_ASSESSMENT",
    title: "Regulatory Gap Assessment",
    purpose: "Identifies differences between the home-market Group framework and local country requirements",
  },
  {
    artefact_type: "COUNTRY_RISK_ASSESSMENT",
    title: "Country Risk Assessment",
    purpose: "Evaluates ML/TF, sanctions, FX, partner, data protection, and regulatory risks of entering the jurisdiction",
  },
  {
    artefact_type: "AML_CFT_POLICY",
    title: "Localised AML/CFT Policy",
    purpose: "Defines country-specific financial crime prevention, CDD/EDD, and FIU reporting obligations",
  },
  {
    artefact_type: "KYC_CDD_PROCEDURES",
    title: "Country KYC/CDD Operating Procedures",
    purpose: "Defines acceptable local identity documents, biometric/verification standards, and UBO thresholds",
  },
  {
    artefact_type: "SANCTIONS_SCREENING_POLICY",
    title: "Sanctions & Watchlist Screening Policy",
    purpose: "Defines applicable local + international sanctions lists, real-time screening points, and escalation SLAs",
  },
  {
    artefact_type: "COMPLIANCE_RISK_REGISTER",
    title: "Compliance Risk Register",
    purpose: "Tracks inherent vs. residual compliance risks, risk appetite decisions, and mitigation owners",
  },
  {
    artefact_type: "REGULATORY_REPORTING_CALENDAR",
    title: "Regulatory Reporting Calendar",
    purpose: "Tracks statutory reporting obligations, frequencies, submission channels, and filing deadlines",
  },
  {
    artefact_type: "COMPLIANCE_MONITORING_PLAN",
    title: "Compliance Monitoring Plan",
    purpose: "Defines recurring real-time, daily, weekly, monthly, quarterly, and annual compliance checks",
  },
  {
    artefact_type: "COMPLIANCE_TESTING_REPORT",
    title: "Pre-Launch Compliance Testing Report",
    purpose: "Documents pre-launch test evidence across KYC, sanctions, TM alerts, escalation, and reporting",
  },
  {
    artefact_type: "REGULATORY_CHANGE_LOG",
    title: "Regulatory Change Log",
    purpose: "Tracks post-launch regulatory circulars, impact assessments, assigned owners, and implementation evidence",
  },
  {
    artefact_type: "COMPLIANCE_INCIDENT_REGISTER",
    title: "Compliance Incident & Breach Register",
    purpose: "Records compliance breaches, suspicious escalations, regulator notifications, and root-cause remediation",
  },
];

export function computeRiskRating(likelihood: number, impact: number): RiskRating {
  const score = likelihood * impact;
  if (score >= 16) return "CRITICAL";
  if (score >= 10) return "HIGH";
  if (score >= 5) return "MEDIUM";
  return "LOW";
}

function buildStandardWorkstreams(countryName: string, primaryRegulator: string): BlueprintWorkstreamSeed[] {
  return [
    {
      workstream_code: "WS-01",
      title: "Market Regulatory Research & Permissibility",
      description: `Establish regulated financial activities, foreign ownership restrictions, and supervisory perimeter under ${primaryRegulator} in ${countryName}.`,
      stage: "MARKET_ENTRY_ASSESSMENT",
      responsible_team: "REGULATORY_AFFAIRS",
      priority: "P0",
      control_specification: "Document statutory permissibility matrix covering direct licensing vs. licensed local partner model.",
      expected_evidence: "Market-Entry Regulatory Assessment Memo",
    },
    {
      workstream_code: "WS-02",
      title: "Licensing & Partnership Structure Approval",
      description: `Prepare licence application dossier or execute regulated sponsorship agreement with an authorised ${countryName} financial institution.`,
      stage: "LICENSING_AUTHORISATION",
      responsible_team: "LEGAL",
      priority: "P0",
      control_specification: "Verify minimum paid-up capital, corporate UBO filings, and formal regulator no-objection / licence letter.",
      expected_evidence: "Licensing Requirements Matrix & Regulator Approval / Partner Contract",
    },
    {
      workstream_code: "WS-03",
      title: "Local AML/CFT & KYC Programme Localisation",
      description: `Adapt Group AML/CFT, KYC/CDD, and Sanctions policies to ${countryName} statutory identity, STR clock, and retention rules.`,
      stage: "FRAMEWORK_LOCALISATION",
      responsible_team: "AML_COMPLIANCE",
      priority: "P0",
      control_specification: "Localise Group policy suite into country-specific policies with clause-level statutory mapping.",
      expected_evidence: "Approved Local AML/CFT & KYC Policy Suite",
    },
    {
      workstream_code: "WS-04",
      title: "Country AML/CFT & Market-Entry Risk Assessment",
      description: `Evaluate ML/TF, sanctions, fraud, FX, partner, and data-transfer risks for ${countryName} corridor operations.`,
      stage: "RISK_ASSESSMENT",
      responsible_team: "RISK",
      priority: "P0",
      control_specification: "Define country risk rating, customer risk tiers, transaction velocity caps, and prohibited counterparties.",
      expected_evidence: "Approved Country Risk Assessment & Risk Register",
    },
    {
      workstream_code: "WS-05",
      title: "Local Partner & Settlement Bank Due Diligence",
      description: `Conduct regulatory, AML, operational resilience, and safeguarding due diligence on local banking/PSP partners in ${countryName}.`,
      stage: "LICENSING_AUTHORISATION",
      responsible_team: "PROCUREMENT_PARTNERS",
      priority: "P1",
      control_specification: "Verify partner licence standing with central bank, ring-fenced trust/settlement accounts, and SLA commitments.",
      expected_evidence: "Completed Partner Due Diligence Report & Risk Sign-Off",
    },
    {
      workstream_code: "WS-06",
      title: "Technology Controls: KYC, Sanctions, TM & Recordkeeping",
      description: `Configure local ID verification, pre-transaction sanctions screening, country TM rules, and immutable audit storage for ${countryName}.`,
      stage: "CONTROL_IMPLEMENTATION",
      responsible_team: "ENGINEERING",
      priority: "P0",
      control_specification: "Enforce synchronous pre-settlement watchlist screening, local currency structuring rules, and statutory retention locks.",
      expected_evidence: "Engineering Control Architecture Spec & UAT Sign-Off",
    },
    {
      workstream_code: "WS-07",
      title: "Regulatory Reporting & FIU goAML Channel Setup",
      description: `Register reporting officers on local FIU and ${primaryRegulator} supervisory portals and configure automated return schedules.`,
      stage: "CONTROL_IMPLEMENTATION",
      responsible_team: "REGULATORY_AFFAIRS",
      priority: "P1",
      control_specification: "Map every statutory return deadline, submission format, and maker-checker review workflow.",
      expected_evidence: "Configured Regulatory Reporting Calendar & Portal Registration Proof",
    },
    {
      workstream_code: "WS-08",
      title: "Staff Readiness, MLRO Appointment & Compliance Training",
      description: `Appoint qualified Country Compliance Officer / MLRO and complete role-specific training on ${countryName} regulatory obligations.`,
      stage: "PRE_LAUNCH_VALIDATION",
      responsible_team: "HR_TRAINING",
      priority: "P1",
      control_specification: "100% completion of localized AML/CFT, data privacy, and consumer protection training by operations and support staff.",
      expected_evidence: "MLRO Fit-and-Proper Filing & Staff Training Attestation Log",
    },
    {
      workstream_code: "WS-09",
      title: "Pre-Launch Control Testing & Go-Live Readiness Sign-Off",
      description: `Execute end-to-end validation tests across KYC, sanctions, TM alerts, escalation, reporting, and resilience before serving ${countryName} customers.`,
      stage: "PRE_LAUNCH_VALIDATION",
      responsible_team: "MANAGEMENT_COMPLIANCE",
      priority: "P0",
      control_specification: "Zero open critical test failures; formal CCO / Board Go-Live Readiness Gate approval sealed with SHA-256 hash.",
      expected_evidence: "Signed Compliance Readiness Dossier & Go-Live Approval Certificate",
    },
    {
      workstream_code: "WS-10",
      title: "Post-Launch Transaction Monitoring & Regulatory Change Watch",
      description: `Operate real-time/daily/monthly compliance monitoring rhythms and track new ${primaryRegulator} circulars affecting ${countryName}.`,
      stage: "LIVE_OPERATIONS",
      responsible_team: "OPERATIONS",
      priority: "P1",
      control_specification: "Continuous transaction screening, periodic compliance testing, and Ripple Sentinel regulatory change tracking.",
      expected_evidence: "Monthly Compliance Operations Report & Active Regulatory Change Log",
    },
  ];
}

function buildStandardValidationTests(countryName: string, fiuName: string): BlueprintValidationTestSeed[] {
  return [
    {
      test_category: "KYC_VERIFICATION",
      test_name: `${countryName} Identity & Biometric Verification Rejection Test`,
      test_objective: `Can the onboarding system accurately validate acceptable ${countryName} government IDs and deterministically reject expired, forged, or mismatched identities?`,
      is_critical_gate: true,
    },
    {
      test_category: "SANCTIONS_SCREENING",
      test_name: "Pre-Transaction Sanctions & PEP Watchlist Hit Test",
      test_objective: "Does synchronous pre-transaction screening block sanctioned senders, beneficiaries, and UBOs before funds move?",
      is_critical_gate: true,
    },
    {
      test_category: "TRANSACTION_MONITORING",
      test_name: "Cross-Border Structuring & Velocity Alert Scenario Test",
      test_objective: "Do suspicious cross-border transaction patterns (smurfing below reporting thresholds, rapid corridor velocity, profile mismatch) trigger automated alerts?",
      is_critical_gate: true,
    },
    {
      test_category: "ALERT_ESCALATION",
      test_name: "Compliance Case Investigation & MLRO Escalation Workflow Test",
      test_objective: "Can Compliance Operations hold a flagged transaction, document investigation notes, and escalate to the Country MLRO within statutory SLA?",
      is_critical_gate: true,
    },
    {
      test_category: "REGULATORY_REPORTING",
      test_name: `${fiuName} STR / CTR & Central Bank Return Payload Test`,
      test_objective: `Can the institution generate and submit a valid statutory report payload to ${fiuName} and the supervisory portal without schema errors?`,
      is_critical_gate: true,
    },
    {
      test_category: "DATA_PROTECTION",
      test_name: "Cross-Border Customer Data Transfer & Access Control Test",
      test_objective: `Are ${countryName} customer records encrypted, role-restricted, and transferred across borders strictly in compliance with local data protection safeguards?`,
      is_critical_gate: true,
    },
    {
      test_category: "OPERATIONAL_RESILIENCE",
      test_name: "Screening / Partner Outage Fail-Closed Resilience Test",
      test_objective: "If the screening engine or partner settlement rail experiences an outage, does the payment pipeline fail closed rather than processing unscreened transactions?",
      is_critical_gate: true,
    },
  ];
}

export function buildJurisdictionBlueprint(
  targetCodeOrName: string,
  homeCode: string = "NG",
  _productScope: ExpansionProductScope = "PAYMENTS",
): JurisdictionExpansionBlueprint {
  const desc = resolveJurisdictionDescriptor(targetCodeOrName);
  const code = desc.code.toUpperCase();

  if (code === "GH") {
    return {
      jurisdictionCode: "GH",
      countryName: "Ghana",
      primaryRegulators: [
        "Bank of Ghana (BoG)",
        "Financial Intelligence Centre (FIC Ghana)",
        "Data Protection Commission (DPC Ghana)",
      ],
      recommendedRiskAppetite:
        "Zero tolerance for unlicensed payment clearing or unscreened cross-border NGN↔GHS remittances. All Ghana customer wallets and settlement flows must route through a BoG-authorised Dedicated Electronic Money Issuer (DEMI) or Enhanced PSP under Act 987, with real-time OFAC/UN/Ghana FIC sanctions screening and strict Ghana Card (NIA) KYC verification.",
      defaultProhibitedActivities: [
        "Processing GHS collections or payouts without BoG Act 987 PSP/DEMI authorisation or approved bank partnership",
        "Onboarding Ghanaian customers without National Identification Authority (Ghana Card) verification",
        "Direct NGN-to-GHS parallel market FX netting outside authorised BoG/CBN settlement rails or PAPSS",
        "Processing transactions involving sanctioned jurisdictions, shell banks, or unverified high-risk PEP beneficiaries",
      ],
      obligations: [
        {
          stage_category: "LICENSING",
          regulator: "Bank of Ghana (BoG)",
          statute_reference: "Payment Systems and Services Act, 2019 (Act 987) §§ 7–13",
          obligation_title: "PSP / Electronic Money Issuer Licensing or Approved Bank Partnership",
          obligation_summary:
            "Determine and obtain appropriate BoG licence tier (Dedicated EMI, Enhanced PSP, Medium PSP, or Standard PSP) or operate under a formally filed BoG-approved partnership with a licensed Ghanaian bank.",
          is_mandatory_for_go_live: true,
          owner_department: "Regulatory Affairs",
          source_url: "https://www.bog.gov.gh/fintech-innovation/licence-categories/",
        },
        {
          stage_category: "CAPITAL_ESCROW",
          regulator: "Bank of Ghana (BoG)",
          statute_reference: "BoG Notice No. BG/GOV/SEC/2020/07 — Fintech Licence Requirements",
          obligation_title: "Minimum Paid-Up Capital & Ghanaian Equity Structure",
          obligation_summary:
            "Maintain statutory paid-up capital for the selected PSP tier (e.g., GHS 20M for DEMI, GHS 2M for Enhanced PSP) and comply with minimum 30% Ghanaian equity participation where required by licence class.",
          is_mandatory_for_go_live: true,
          owner_department: "Legal & Finance",
          source_url: "https://www.bog.gov.gh/fintech-innovation/licence-requirements/",
        },
        {
          stage_category: "GOVERNANCE_FIT_PROPER",
          regulator: "Bank of Ghana (BoG)",
          statute_reference: "Payment Systems and Services Act, 2019 (Act 987) §§ 14–18",
          obligation_title: "Board Governance, Resident Directors & Key Management Fit-and-Proper Clearance",
          obligation_summary:
            "Appoint qualified board directors (including required resident Ghanaian directors), a local Chief Compliance Officer / MLRO, and obtain BoG fit-and-proper approval prior to live operations.",
          is_mandatory_for_go_live: true,
          owner_department: "Legal & Compliance",
        },
        {
          stage_category: "AML_CFT",
          regulator: "Financial Intelligence Centre (FIC Ghana) & BoG",
          statute_reference: "Anti-Money Laundering Act, 2020 (Act 1044) & BoG AML/CFT&P Guidelines 2022",
          obligation_title: "Ghana Card KYC Mandate & 24-Hour FIC goAML STR Reporting",
          obligation_summary:
            "Enforce National Identification Card (Ghana Card) as primary identity document for financial transactions in Ghana and file Suspicious Transaction Reports (STRs) to FIC Ghana via goAML within 24 hours.",
          is_mandatory_for_go_live: true,
          owner_department: "AML Compliance",
        },
        {
          stage_category: "DATA_PROTECTION",
          regulator: "Data Protection Commission (DPC Ghana)",
          statute_reference: "Data Protection Act, 2012 (Act 843) §§ 27, 46–47",
          obligation_title: "DPC Data Controller Registration & Cross-Border Transfer Safeguards",
          obligation_summary:
            "Register as a Data Controller with DPC Ghana, appoint a certified Data Protection Supervisor, and document explicit consent and adequacy safeguards before transferring Ghanaian customer data to Nigeria or cloud regions.",
          is_mandatory_for_go_live: true,
          owner_department: "Legal & InfoSec",
        },
        {
          stage_category: "FX_CURRENCY",
          regulator: "Bank of Ghana (BoG)",
          statute_reference: "Foreign Exchange Act, 2006 (Act 723) & BoG Inward Remittance Guidelines",
          obligation_title: "Authorised FX Settlement & Float Safeguarding Account Rules",
          obligation_summary:
            "Settle cross-border remittances strictly through authorised dealer banks or PAPSS; ring-fence 100% of e-money float in dedicated custodial accounts at licensed Ghanaian banks.",
          is_mandatory_for_go_live: true,
          owner_department: "Finance & Treasury",
        },
        {
          stage_category: "CONSUMER_PROTECTION",
          regulator: "Bank of Ghana (BoG)",
          statute_reference: "Act 987 §§ 44–49 & BoG Consumer Recourse Mechanism Guidelines",
          obligation_title: "Upfront Fee/FX Disclosure & Statutory Complaint Resolution Clock",
          obligation_summary:
            "Disclose total transfer fees and NGN/GHS exchange rates prior to payment authorization, provide instant digital receipts, and resolve customer complaints within BoG statutory timelines.",
          is_mandatory_for_go_live: true,
          owner_department: "Compliance Operations",
        },
      ],
      localisations: [
        {
          compliance_area: "KYC",
          area_title: "Customer Identification & Verification (KYC/CDD)",
          local_requirements_summary:
            "BoG directive mandates the National Identification Authority (NIA) Ghana Card as the primary ID for individuals in Ghana; corporate onboarding requires Registrar-General's Department (ORC) certificates and 10%+ UBO verification.",
          gap_summary: `Home (${homeCode}) BVN/NIN verification workflows cannot be used for Ghanaian residents; must integrate NIA Ghana Card biometric/API verification.`,
        },
        {
          compliance_area: "AML_CFT",
          area_title: "AML/CFT/CPF Programme & FIU Escalation",
          local_requirements_summary:
            "Must align with Ghana Anti-Money Laundering Act, 2020 (Act 1044), BoG AML/CFT&P Guidelines 2022, and FIC Ghana goAML filing rules (24-hour STR window and GHS 50,000 CTR threshold).",
          gap_summary: "Group AML policy references Nigerian MLPPA 2022 and NFIU; requires Ghana Act 1044 statutory replacement and FIC Ghana reporting workflows.",
        },
        {
          compliance_area: "SANCTIONS",
          area_title: "Sanctions & Proliferation Financing Screening",
          local_requirements_summary:
            "Screen customers, beneficiaries, and payment counterparties against UN Consolidated List, Ghana FIC Domestic Sanctions List, OFAC, EU, and HMT lists prior to transaction release.",
          gap_summary: "Must add Ghana FIC domestic designations and West Africa regional TF typologies to real-time screening rules.",
        },
        {
          compliance_area: "TRANSACTION_MONITORING",
          area_title: "Transaction Monitoring & Corridor Risk Scenarios",
          local_requirements_summary:
            "Configure GHS-denominated structuring rules (smurfing below GHS 50,000 CTR threshold), rapid NGN→GHS corridor velocity rules, and mobile money cash-out anomaly detection.",
          gap_summary: "Existing Naira-only thresholds must be recalibrated to GHS tiers and mobile-money wallet velocity caps.",
        },
        {
          compliance_area: "DATA_PROTECTION",
          area_title: "Data Privacy & International Data Transfers",
          local_requirements_summary:
            "Comply with Ghana Data Protection Act, 2012 (Act 843), maintain DPC Ghana registration, and execute cross-border data transfer agreements between Ghana and Nigeria entities.",
          gap_summary: "Group NDPA 2023 privacy notice must be localised for Ghana Act 843 rights and DPC Ghana supervisory contact details.",
        },
        {
          compliance_area: "CONSUMER_PROTECTION",
          area_title: "Consumer Protection, Fee Disclosures & Recourse",
          local_requirements_summary:
            "Comply with Act 987 Part VIII consumer protection rules: upfront FX spread & fee disclosure, cooling/cancellation rules, and 5-day internal complaint resolution SLA with BoG escalation notice.",
          gap_summary: "Requires GHS fee disclosure schedule and BoG Consumer Reporting Officer contact disclosures in app and receipts.",
        },
        {
          compliance_area: "RECORDKEEPING",
          area_title: "Statutory Record Retention & Audit Trail",
          local_requirements_summary:
            "Retain all KYC, CDD, transaction, screening, and STR investigation records for a minimum of 6 years post-transaction or relationship termination under Act 987 and Act 1044.",
          gap_summary: "Align cloud archive retention locks to satisfy both BoG/Act 1044 (6+ years) and BoG local inspection accessibility.",
        },
        {
          compliance_area: "REGULATORY_REPORTING",
          area_title: "Supervisory & FIU Regulatory Reporting",
          local_requirements_summary:
            "Submit monthly PSP prudential/transaction returns to BoG FinTech & Innovation Office, 24-hour STRs and weekly CTRs to FIC Ghana goAML, and annual DPC renewal filings.",
          gap_summary: "Establish dedicated Ghana regulatory calendar and maker-checker sign-off for BoG ORASS / FinTech Office returns.",
        },
      ],
      risks: [
        {
          risk_category: "MONEY_LAUNDERING",
          risk_title: "Cross-Border NGN↔GHS Smurfing & Mobile Money Layering",
          risk_description:
            "Illicit actors structuring cross-border transfers below GHS 50,000 CTR thresholds and cashing out rapidly across multiple Ghanaian mobile money wallets.",
          inherent_likelihood: 4,
          inherent_impact: 5,
          appetite_decision: "MITIGATE",
          mitigation_plan:
            "Enforce Ghana Card 1:1 wallet binding, daily/monthly corridor velocity caps per tier, and automated structuring detection rules aggregating linked sender/beneficiary pairs.",
          residual_likelihood: 2,
          residual_impact: 3,
        },
        {
          risk_category: "REGULATORY_LICENSING",
          risk_title: "Operating Outside BoG Act 987 Approved Scope",
          risk_description:
            "Commencing customer onboarding or holding GHS float prior to formal BoG licence approval or approved partner bank sponsorship sign-off.",
          inherent_likelihood: 3,
          inherent_impact: 5,
          appetite_decision: "PROHIBIT",
          mitigation_plan:
            "Hard technical feature-flag lock on Ghana production traffic until formal BoG written authorisation / partner approval is uploaded and verified at Stage 6 Go-Live Gate.",
          residual_likelihood: 1,
          residual_impact: 2,
        },
        {
          risk_category: "CURRENCY_FX",
          risk_title: "Unauthorised FX Netting or Parallel Rate Arbitrage",
          risk_description:
            "Violating Ghana Foreign Exchange Act 723 or CBN IMTO rules through informal cross-border currency netting outside licensed dealer banks.",
          inherent_likelihood: 4,
          inherent_impact: 4,
          appetite_decision: "MITIGATE",
          mitigation_plan:
            "Execute all cross-border settlement exclusively via BoG-authorised dealer partner banks or PAPSS with daily treasury reconciliation.",
          residual_likelihood: 2,
          residual_impact: 2,
        },
        {
          risk_category: "DATA_PROTECTION",
          risk_title: "Unlawful Cross-Border Transfer of Ghanaian Customer PII",
          risk_description:
            "Replicating Ghana Card biometrics and transaction logs to foreign cloud servers without DPC Ghana Act 843 registration and transfer safeguards.",
          inherent_likelihood: 3,
          inherent_impact: 4,
          appetite_decision: "MITIGATE",
          mitigation_plan:
            "Complete DPC Ghana Data Controller registration, execute inter-affiliate Data Processing & Transfer Agreements, and enforce field-level encryption.",
          residual_likelihood: 1,
          residual_impact: 2,
        },
        {
          risk_category: "THIRD_PARTY_PARTNER",
          risk_title: "Local Ghanaian Settlement Partner Compliance or Liquidity Failure",
          risk_description:
            "Local partner bank or EMI failing to ring-fence customer float or experiencing BoG supervisory sanctions.",
          inherent_likelihood: 3,
          inherent_impact: 4,
          appetite_decision: "MITIGATE",
          mitigation_plan:
            "Complete Stage 2 partner due diligence, require segregated trust account attestation, and maintain secondary settlement bank redundancy.",
          residual_likelihood: 2,
          residual_impact: 2,
        },
      ],
      workstreams: buildStandardWorkstreams("Ghana", "Bank of Ghana (BoG)"),
      validationTests: buildStandardValidationTests("Ghana", "FIC Ghana (goAML)"),
      reportingCalendar: [
        {
          regulator: "Financial Intelligence Centre (FIC Ghana)",
          report_name: "Suspicious Transaction Report (STR)",
          frequency: "AS_REQUIRED",
          submission_channel: "FIC Ghana goAML Portal (within 24 hours of suspicion)",
          statutory_reference: "Anti-Money Laundering Act, 2020 (Act 1044) § 37",
          days_until_first_due: 7,
        },
        {
          regulator: "Financial Intelligence Centre (FIC Ghana)",
          report_name: "Cash / Electronic Currency Transaction Report (CTR ≥ GHS 50,000)",
          frequency: "WEEKLY",
          submission_channel: "FIC Ghana goAML Portal",
          statutory_reference: "Act 1044 & BoG AML/CFT&P Guidelines 2022",
          days_until_first_due: 7,
        },
        {
          regulator: "Bank of Ghana (BoG) — FinTech & Innovation Office",
          report_name: "Monthly PSP Transaction Volume, Float Safeguarding & Fraud Return",
          frequency: "MONTHLY",
          submission_channel: "BoG ORASS / FinTech Supervisory Return Portal",
          statutory_reference: "Payment Systems and Services Act, 2019 (Act 987) § 34",
          days_until_first_due: 30,
        },
        {
          regulator: "Bank of Ghana (BoG)",
          report_name: "Quarterly Consumer Complaints & Cybersecurity Incident Return",
          frequency: "QUARTERLY",
          submission_channel: "BoG Supervisory Portal",
          statutory_reference: "BoG Cyber & Information Security Directive / Act 987",
          days_until_first_due: 90,
        },
        {
          regulator: "Bank of Ghana (BoG) & FIC Ghana",
          report_name: "Annual Audited Financial Statements & Independent AML Audit Report",
          frequency: "ANNUALLY",
          submission_channel: "BoG FinTech & Innovation Office + FIC Ghana",
          statutory_reference: "Act 987 § 33 & Act 1044",
          days_until_first_due: 365,
        },
      ],
    };
  }

  if (code === "KE") {
    return {
      jurisdictionCode: "KE",
      countryName: "Kenya",
      primaryRegulators: [
        "Central Bank of Kenya (CBK)",
        "Financial Reporting Centre (FRC Kenya)",
        "Office of the Data Protection Commissioner (ODPC Kenya)",
      ],
      recommendedRiskAppetite:
        "Operate strictly under CBK National Payment System (NPS) PSP authorization or a CBK-approved commercial bank / PSP partnership. Customer funds must be 100% ring-fenced in a CBK-approved Trust Account managed by independent trustees, with ODPC Data Controller registration and FRC goAML integration active prior to launch.",
      defaultProhibitedActivities: [
        "Holding customer e-money float outside a CBK-approved ring-fenced Trust Account",
        "Commencing payment or digital credit services in Kenya without CBK NPS PSP / DCP authorisation",
        "Transferring sensitive Kenyan personal data outside Kenya without ODPC data-localization / adequacy compliance under DPA 2019 § 48",
      ],
      obligations: [
        {
          stage_category: "LICENSING",
          regulator: "Central Bank of Kenya (CBK)",
          statute_reference: "National Payment System Act, 2011 & NPS Regulations, 2014 Reg. 4–9",
          obligation_title: "CBK Payment Service Provider (PSP) Authorisation or Bank Sponsorship",
          obligation_summary:
            "Incorporate a local Kenyan subsidiary and obtain CBK PSP authorisation (or Digital Credit Provider licence under CBK DCP Regulations 2022 if lending), or partner with a CBK-licensed institution with formal CBK no-objection.",
          is_mandatory_for_go_live: true,
          owner_department: "Regulatory Affairs",
          source_url: "https://www.centralbank.go.ke/national-payment-system/",
        },
        {
          stage_category: "CAPITAL_ESCROW",
          regulator: "Central Bank of Kenya (CBK)",
          statute_reference: "NPS Regulations, 2014 Reg. 12 & Third Schedule",
          obligation_title: "Ring-Fenced Customer Trust Account & Independent Trustees",
          obligation_summary:
            "Establish a ring-fenced Trust Account at a CBK-licensed commercial bank governed by an approved Trust Deed and independent trustees so customer funds are protected from corporate insolvency.",
          is_mandatory_for_go_live: true,
          owner_department: "Legal & Finance",
        },
        {
          stage_category: "GOVERNANCE_FIT_PROPER",
          regulator: "Central Bank of Kenya (CBK)",
          statute_reference: "NPS Regulations, 2014 Reg. 7 & First Schedule",
          obligation_title: "Director, Senior Officer & Significant Shareholder Fit-and-Proper Vetting",
          obligation_summary:
            "Submit personal declaration questionnaires, tax compliance certificates, CRB reports, and police clearances for all directors, senior officers, and 10%+ shareholders to CBK.",
          is_mandatory_for_go_live: true,
          owner_department: "Legal & Compliance",
        },
        {
          stage_category: "AML_CFT",
          regulator: "Financial Reporting Centre (FRC Kenya) & CBK",
          statute_reference: "Proceeds of Crime and Anti-Money Laundering Act (POCAMLA) & Regulations 2023",
          obligation_title: "FRC Kenya Registration, MLRO Appointment & USD 15,000 CTR / STR Filing",
          obligation_summary:
            "Register as a Reporting Institution with FRC Kenya, appoint a dedicated Kenyan MLRO, report cash/threshold transactions ≥ USD 15,000 (or KES equivalent), and file STRs via FRC goAML.",
          is_mandatory_for_go_live: true,
          owner_department: "AML Compliance",
        },
        {
          stage_category: "DATA_PROTECTION",
          regulator: "Office of the Data Protection Commissioner (ODPC Kenya)",
          statute_reference: "Kenya Data Protection Act, 2019 §§ 18, 48–50 & General Regulations 2021",
          obligation_title: "ODPC Data Controller Registration & Cross-Border Data Transfer Safeguards",
          obligation_summary:
            "Obtain ODPC Data Controller registration certificate, conduct a Data Protection Impact Assessment (DPIA), and satisfy DPA 2019 § 48 transfer safeguards before syncing Kenyan customer data across borders.",
          is_mandatory_for_go_live: true,
          owner_department: "Legal & InfoSec",
        },
        {
          stage_category: "CONSUMER_PROTECTION",
          regulator: "Central Bank of Kenya (CBK)",
          statute_reference: "NPS Regulations, 2014 Reg. 34–38 & Competition Authority of Kenya (CAK) Guidelines",
          obligation_title: "Transparent Tariff Disclosure & 30-Day Customer Complaint Resolution",
          obligation_summary:
            "Display KES transaction tariffs and FX conversion rates clearly prior to confirmation and maintain a documented customer complaint resolution mechanism.",
          is_mandatory_for_go_live: true,
          owner_department: "Compliance Operations",
        },
      ],
      localisations: [
        {
          compliance_area: "KYC",
          area_title: "Kenyan Identity Verification (IPRS / Maisha Namba / KRA PIN)",
          local_requirements_summary:
            "Verify Kenyan National ID or Alien Card against Integrated Population Registration System (IPRS) plus KRA PIN validation; verify BRS CR12 records and 10%+ UBOs for corporate clients.",
          gap_summary: `Replace home (${homeCode}) BVN/NIN checks with Kenyan IPRS National ID and KRA PIN verification.`,
        },
        {
          compliance_area: "AML_CFT",
          area_title: "POCAMLA AML/CFT Programme & FRC Kenya Reporting",
          local_requirements_summary:
            "Align with Kenya POCAMLA (as amended 2023), CBK AML/CFT Guidelines, and FRC Kenya goAML reporting (STRs and USD 15,000 threshold reports).",
          gap_summary: "Localise Group AML policy to cite POCAMLA and FRC Kenya escalation procedures.",
        },
        {
          compliance_area: "SANCTIONS",
          area_title: "Sanctions & Counter-Financing of Terrorism (Prevention of Terrorism Act)",
          local_requirements_summary:
            "Screen against Kenya National Counter Terrorism Centre (NCTC) / FRC domestic designations, UN, OFAC, EU, and UK lists.",
          gap_summary: "Add Kenyan Prevention of Terrorism Act (POTA) domestic freezing obligations and East Africa TF risk indicators.",
        },
        {
          compliance_area: "TRANSACTION_MONITORING",
          area_title: "Transaction Monitoring & M-Pesa / Mobile Money Corridor Rules",
          local_requirements_summary:
            "Monitor KES wallet velocity, USD 15,000 threshold structuring, and cross-border NGN↔KES remittance anomalies.",
          gap_summary: "Configure KES currency thresholds and mobile-money payout velocity rules.",
        },
        {
          compliance_area: "DATA_PROTECTION",
          area_title: "Kenya Data Protection Act 2019 & ODPC Compliance",
          local_requirements_summary:
            "Comply with Kenya DPA 2019 §§ 25–50, maintain ODPC registration, complete mandatory DPIA, and enforce local hosting or adequacy safeguards.",
          gap_summary: "Localise privacy notices and cross-border transfer clauses to Kenya DPA 2019 and ODPC regulations.",
        },
        {
          compliance_area: "CONSUMER_PROTECTION",
          area_title: "CBK & CAK Consumer Protection & Tariff Transparency",
          local_requirements_summary:
            "Provide pre-transaction KES fee/FX disclosures, prohibit hidden charges, and publish toll-free customer complaint channels per NPS Reg. 35.",
          gap_summary: "Adapt customer disclosures and dispute SLAs to CBK NPS Regulations.",
        },
        {
          compliance_area: "RECORDKEEPING",
          area_title: "7-Year Statutory Record Retention (POCAMLA)",
          local_requirements_summary:
            "Retain all customer identification, transaction, and investigation records for at least 7 years after transaction completion or account closure under POCAMLA § 46.",
          gap_summary: "Extend minimum retention policy from 5 years to 7 years for all Kenyan records.",
        },
        {
          compliance_area: "REGULATORY_REPORTING",
          area_title: "CBK Monthly NPS Returns & FRC Kenya Filings",
          local_requirements_summary:
            "Submit monthly Trust Account reconciliation and transaction returns to CBK by the 10th of the following month, plus FRC Kenya goAML filings.",
          gap_summary: "Configure CBK NPS monthly return templates and Trust Account balance verification.",
        },
      ],
      risks: [
        {
          risk_category: "MONEY_LAUNDERING",
          risk_title: "Cross-Border Remittance Structuring & Mobile Money Layering in Kenya",
          risk_description:
            "Exploitation of high-velocity mobile money rails to split illicit cross-border transfers below USD 15,000 POCAMLA reporting thresholds.",
          inherent_likelihood: 4,
          inherent_impact: 5,
          appetite_decision: "MITIGATE",
          mitigation_plan:
            "Enforce IPRS National ID verification, rolling 24h/30d KES velocity caps, and automated structuring alerts routed to the Kenya MLRO.",
          residual_likelihood: 2,
          residual_impact: 3,
        },
        {
          risk_category: "REGULATORY_LICENSING",
          risk_title: "Commmingling of Customer Float Outside CBK Trust Account",
          risk_description:
            "Holding customer settlement balances in an operating bank account rather than a CBK-approved ring-fenced Trust Account.",
          inherent_likelihood: 3,
          inherent_impact: 5,
          appetite_decision: "PROHIBIT",
          mitigation_plan:
            "Execute CBK-approved Trust Deed and automated daily 1:1 trust account reconciliation before enabling customer wallets.",
          residual_likelihood: 1,
          residual_impact: 2,
        },
        {
          risk_category: "DATA_PROTECTION",
          risk_title: "ODPC Enforcement for Unregistered Cross-Border Data Processing",
          risk_description:
            "Administrative fines of up to KES 5 Million or 1% of annual turnover from ODPC for processing or exporting Kenyan PII without registration and DPIA.",
          inherent_likelihood: 3,
          inherent_impact: 4,
          appetite_decision: "MITIGATE",
          mitigation_plan:
            "Obtain ODPC Data Controller certificate and approve formal DPIA prior to Stage 6 Go-Live Gate.",
          residual_likelihood: 1,
          residual_impact: 2,
        },
      ],
      workstreams: buildStandardWorkstreams("Kenya", "Central Bank of Kenya (CBK)"),
      validationTests: buildStandardValidationTests("Kenya", "FRC Kenya (goAML)"),
      reportingCalendar: [
        {
          regulator: "Financial Reporting Centre (FRC Kenya)",
          report_name: "Suspicious Transaction Report (STR)",
          frequency: "AS_REQUIRED",
          submission_channel: "FRC Kenya goAML Portal",
          statutory_reference: "POCAMLA § 44",
          days_until_first_due: 7,
        },
        {
          regulator: "Financial Reporting Centre (FRC Kenya)",
          report_name: "Cash / Threshold Transaction Report (≥ USD 15,000 equivalent)",
          frequency: "WEEKLY",
          submission_channel: "FRC Kenya goAML Portal",
          statutory_reference: "POCAMLA § 44(5)",
          days_until_first_due: 7,
        },
        {
          regulator: "Central Bank of Kenya (CBK)",
          report_name: "Monthly NPS PSP Transaction & Trust Account Reconciliation Return",
          frequency: "MONTHLY",
          submission_channel: "CBK NPS Supervisory Portal (by 10th of following month)",
          statutory_reference: "NPS Regulations, 2014 Reg. 14 & 26",
          days_until_first_due: 30,
        },
        {
          regulator: "Central Bank of Kenya (CBK)",
          report_name: "Annual Audited Financial Statements & Cybersecurity Attestation",
          frequency: "ANNUALLY",
          submission_channel: "CBK Banking & Payment Services Supervision",
          statutory_reference: "NPS Regulations, 2014 & CBK Cybersecurity Guidance Note",
          days_until_first_due: 365,
        },
      ],
    };
  }

  // Open-World / Dynamic Country Blueprint (ZA, GB, US, RW, EG, SN, etc.)
  const primaryReg = desc.regulatorKeywords?.[0] || `${desc.name} Central Bank / Financial Regulator`;
  const regulators =
    desc.regulatorKeywords && desc.regulatorKeywords.length > 0
      ? desc.regulatorKeywords.slice(0, 3)
      : [`${desc.name} Central Bank`, `${desc.name} Financial Intelligence Unit`, `${desc.name} Data Protection Authority`];

  return {
    jurisdictionCode: code,
    countryName: desc.name,
    primaryRegulators: [...regulators],
    recommendedRiskAppetite: `Operate in ${desc.name} strictly within verified licensing or regulated local partner permissions supervised by ${primaryReg}. Enforce local identity verification, synchronous pre-transaction sanctions screening, and documented cross-border data transfer safeguards before customer launch.`,
    defaultProhibitedActivities: [
      `Providing regulated financial services in ${desc.name} prior to formal licensing or approved partner sponsorship`,
      `Processing transactions involving sanctioned entities or high-risk jurisdictions outside institutional risk appetite`,
      `Transferring ${desc.name} customer personal data across borders without statutory privacy safeguards`,
    ],
    obligations: [
      {
        stage_category: "LICENSING",
        regulator: primaryReg,
        statute_reference: `${desc.name} Payment Services & Financial Institutions Licensing Framework`,
        obligation_title: `${desc.name} Regulatory Authorisation or Licensed Partner Structure`,
        obligation_summary: `Determine whether direct local entity licensing, licensed partner sponsorship, or cross-border passporting is required under ${primaryReg} rules before serving ${desc.name} customers.`,
        is_mandatory_for_go_live: true,
        owner_department: "Regulatory Affairs",
      },
      {
        stage_category: "GOVERNANCE_FIT_PROPER",
        regulator: primaryReg,
        statute_reference: `${desc.name} Corporate Governance & Fit-and-Proper Standards`,
        obligation_title: "Local Governance, Resident Officer & MLRO Appointments",
        obligation_summary: `Satisfy board residency, local compliance officer / MLRO appointment, and fit-and-proper vetting requirements for ${desc.name}.`,
        is_mandatory_for_go_live: true,
        owner_department: "Legal & Compliance",
      },
      {
        stage_category: "AML_CFT",
        regulator: `${desc.name} FIU & ${primaryReg}`,
        statute_reference: `${desc.name} Anti-Money Laundering & Counter-Terrorist Financing Act`,
        obligation_title: "Local KYC/CDD Verification & FIU Suspicious Transaction Reporting",
        obligation_summary: `Localise customer identification standards, beneficial ownership verification, and statutory STR/CTR filing procedures for ${desc.name}.`,
        is_mandatory_for_go_live: true,
        owner_department: "AML Compliance",
      },
      {
        stage_category: "DATA_PROTECTION",
        regulator: `${desc.name} Data Protection Authority`,
        statute_reference: `${desc.name} Data Protection & Privacy Legislation`,
        obligation_title: "Data Controller Registration & Cross-Border Transfer Safeguards",
        obligation_summary: `Comply with local privacy registration, consent, and cross-border data transfer requirements between ${desc.name} and ${homeCode}.`,
        is_mandatory_for_go_live: true,
        owner_department: "Legal & InfoSec",
      },
      {
        stage_category: "CONSUMER_PROTECTION",
        regulator: primaryReg,
        statute_reference: `${desc.name} Financial Consumer Protection Rules`,
        obligation_title: "Fee/FX Transparency, Disclosures & Dispute Resolution SLAs",
        obligation_summary: `Enforce upfront fee and exchange-rate disclosures and statutory complaint resolution timelines in ${desc.name}.`,
        is_mandatory_for_go_live: true,
        owner_department: "Compliance Operations",
      },
    ],
    localisations: [
      {
        compliance_area: "KYC",
        area_title: "Customer Identification & Verification Standards",
        local_requirements_summary: `Define acceptable government-issued IDs, biometric checks, address verification, and corporate UBO rules in ${desc.name}.`,
        gap_summary: `Localise ${homeCode} KYC onboarding flows to ${desc.name} national identity and registry standards.`,
      },
      {
        compliance_area: "AML_CFT",
        area_title: "AML/CFT Laws, Risk Assessment & FIU Reporting",
        local_requirements_summary: `Align with ${desc.name} AML/CFT legislation, PEP screening rules, and local FIU reporting deadlines.`,
        gap_summary: `Adapt Group AML policy to cite ${desc.name} statutory provisions and local MLRO escalation timelines.`,
      },
      {
        compliance_area: "SANCTIONS",
        area_title: "Applicable Sanctions Regimes & Watchlist Screening",
        local_requirements_summary: `Screen customers and beneficiaries against UN, OFAC, EU, UK, and ${desc.name} domestic sanctions lists.`,
        gap_summary: `Add ${desc.name} domestic watchlist designations to real-time screening engine.`,
      },
      {
        compliance_area: "TRANSACTION_MONITORING",
        area_title: "Local Risk Indicators & Suspicious Transaction Scenarios",
        local_requirements_summary: `Configure ${desc.name} local currency thresholds, structuring rules, and cross-border corridor velocity alerts.`,
        gap_summary: `Calibrate monitoring rules for ${desc.name} local currency and payment corridor typologies.`,
      },
      {
        compliance_area: "DATA_PROTECTION",
        area_title: "Local Privacy Laws & International Data Transfers",
        local_requirements_summary: `Satisfy ${desc.name} data protection registration, privacy notices, and cross-border transfer mechanisms.`,
        gap_summary: `Update Group data privacy policy with ${desc.name}-specific data subject rights and transfer clauses.`,
      },
      {
        compliance_area: "CONSUMER_PROTECTION",
        area_title: "Disclosures, Complaints & Customer Treatment",
        local_requirements_summary: `Enforce ${desc.name} mandatory product disclosures, pricing transparency, and complaint handling SLAs.`,
        gap_summary: `Localise customer terms, receipts, and dispute escalation notices for ${desc.name}.`,
      },
      {
        compliance_area: "RECORDKEEPING",
        area_title: "Local Retention Periods & Audit Accessibility",
        local_requirements_summary: `Maintain KYC, transaction, screening, and reporting evidence for the statutory retention period in ${desc.name}.`,
        gap_summary: `Verify archive retention duration and regulator inspection access for ${desc.name}.`,
      },
      {
        compliance_area: "REGULATORY_REPORTING",
        area_title: "Required Supervisory Reports, Deadlines & Channels",
        local_requirements_summary: `Map all periodic returns to ${primaryReg} and the ${desc.name} Financial Intelligence Unit.`,
        gap_summary: `Configure ${desc.name} regulatory reporting calendar and submission workflows.`,
      },
    ],
    risks: [
      {
        risk_category: "MONEY_LAUNDERING",
        risk_title: `Cross-Border Illicit Fund Movement Across ${homeCode}↔${code} Corridor`,
        risk_description: `Criminals attempting to layer or structure cross-border funds between ${homeCode} and ${desc.name}.`,
        inherent_likelihood: 4,
        inherent_impact: 5,
        appetite_decision: "MITIGATE",
        mitigation_plan: `Implement tiered KYC limits, pre-transaction watchlist screening, and corridor velocity monitoring rules for ${desc.name}.`,
        residual_likelihood: 2,
        residual_impact: 3,
      },
      {
        risk_category: "REGULATORY_LICENSING",
        risk_title: `Operating in ${desc.name} Without Required Authorisation`,
        risk_description: `Launching financial services in ${desc.name} before obtaining ${primaryReg} licensing or approved partner coverage.`,
        inherent_likelihood: 3,
        inherent_impact: 5,
        appetite_decision: "PROHIBIT",
        mitigation_plan: `Gate market launch behind Stage 6 CCO Go-Live Readiness sign-off with verified regulatory permission evidence.`,
        residual_likelihood: 1,
        residual_impact: 2,
      },
      {
        risk_category: "DATA_PROTECTION",
        risk_title: `Unlawful Cross-Border Customer Data Transfer from ${desc.name}`,
        risk_description: `Transferring ${desc.name} customer PII across borders without required registration or legal safeguards.`,
        inherent_likelihood: 3,
        inherent_impact: 4,
        appetite_decision: "MITIGATE",
        mitigation_plan: `Execute inter-affiliate data transfer agreements and enforce encryption and access controls.`,
        residual_likelihood: 1,
        residual_impact: 2,
      },
    ],
    workstreams: buildStandardWorkstreams(desc.name, primaryReg),
    validationTests: buildStandardValidationTests(desc.name, `${desc.name} FIU`),
    reportingCalendar: [
      {
        regulator: `${desc.name} Financial Intelligence Unit`,
        report_name: "Suspicious Transaction Report (STR)",
        frequency: "AS_REQUIRED",
        submission_channel: `${desc.name} FIU Electronic Portal`,
        statutory_reference: `${desc.name} AML/CFT Act`,
        days_until_first_due: 7,
      },
      {
        regulator: primaryReg,
        report_name: "Monthly Prudential & Payment Operations Return",
        frequency: "MONTHLY",
        submission_channel: `${primaryReg} Supervisory Portal`,
        statutory_reference: `${desc.name} Payment Services Regulations`,
        days_until_first_due: 30,
      },
      {
        regulator: primaryReg,
        report_name: "Annual Audited Financial & Compliance Assurance Report",
        frequency: "ANNUALLY",
        submission_channel: `${primaryReg} Supervision Department`,
        statutory_reference: `${desc.name} Financial Institutions Act`,
        days_until_first_due: 365,
      },
    ],
  };
}
