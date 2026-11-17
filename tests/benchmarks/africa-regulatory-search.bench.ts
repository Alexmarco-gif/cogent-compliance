/**
 * Cogent Regulatory Intelligence Platform
 * Phase 6 — 40-Query Nigeria & Pan-Africa Regulatory Search Benchmark
 *
 * Covers 4 slices (10 queries each = 40 total):
 *  1. Exact Nigerian Circular IDs & Regulator Reference Codes (10)
 *  2. Multi-Agency Product Structuring, Policy Redline & DDQ Workflows (10)
 *  3. Pan-African Cross-Border Expansion (KE, GH, ZA, RW, EG) (10)
 *  4. Breaking Enforcement & Financial Press Alerts (10)
 *
 * Plus quantitative gates:
 *  - Domain suffix security against spoofing (0% spoofed official classifications)
 *  - 0.0% fabricated external URL rate via WorkProduct / GuardrailValidator
 *  - Shared cache deduplication (second identical query = cacheHit true, 0 external API calls)
 *  - p95 dual-engine aggregation latency well within interactive budget
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { SerpApiClient } from "@/modules/live-web-intelligence/serpapi.client";
import { ExaClient } from "@/modules/live-web-intelligence/exa.client";
import { WebSearchRouter } from "@/modules/live-web-intelligence/web-search.router";
import {
  classifyDomainTrustTier,
  matchesDomainSuffix,
} from "@/modules/live-web-intelligence/africa-regulators";
import { guardrailValidator } from "@/modules/compliance-assessment/guardrails.validator";
import type { SearchJurisdiction } from "@/contracts/search.contracts";

interface AfricaBenchmarkQuery {
  id: string;
  slice:
    | "EXACT_NIGERIAN_CIRCULARS"
    | "MULTI_AGENCY_WORKFLOWS"
    | "PAN_AFRICAN_CROSS_BORDER"
    | "ENFORCEMENT_AND_PRESS";
  query: string;
  jurisdictions: SearchJurisdiction[];
  searchIntent: "REGULATORY_CIRCULAR" | "LEGAL_ANALYSIS" | "NEWS_ENFORCEMENT" | "CROSS_BORDER";
  expectedOfficialUrl: string;
  expectedOfficialTitle: string;
  expectedCommentaryUrl: string;
  expectedCommentaryTitle: string;
  expectedMinTrustTier: "OFFICIAL_REGULATOR_WEB" | "VERIFIED_AFRICAN_LEGAL_MEDIA";
}

const BENCHMARK_40_QUERIES: AfricaBenchmarkQuery[] = [
  // SLICE 1: Exact Nigerian Circular IDs (10)
  {
    id: "CIR-01",
    slice: "EXACT_NIGERIAN_CIRCULARS",
    query: "BSD/DIR/GEN/LAB/14/001 CBN deposit money bank regulatory directive",
    jurisdictions: ["NG"],
    searchIntent: "REGULATORY_CIRCULAR",
    expectedOfficialUrl: "https://www.cbn.gov.ng/Out/2021/BSD/BSD_DIR_GEN_LAB_14_001.pdf",
    expectedOfficialTitle: "CBN Circular BSD/DIR/GEN/LAB/14/001 Regulatory Directive",
    expectedCommentaryUrl: "https://www.banwo-ighodalo.com/grey-matter/cbn-bsd-circular",
    expectedCommentaryTitle: "Banwo & Ighodalo Briefing on CBN BSD/DIR/GEN/LAB/14/001",
    expectedMinTrustTier: "OFFICIAL_REGULATOR_WEB",
  },
  {
    id: "CIR-02",
    slice: "EXACT_NIGERIAN_CIRCULARS",
    query: "FPR/DIR/PUB/CIR/001/059 CBN consumer protection disclosure guideline",
    jurisdictions: ["NG"],
    searchIntent: "REGULATORY_CIRCULAR",
    expectedOfficialUrl: "https://www.cbn.gov.ng/Out/2023/FPRD/FPR_DIR_PUB_CIR_001_059.pdf",
    expectedOfficialTitle: "CBN FPR/DIR/PUB/CIR/001/059 Consumer Protection Circular",
    expectedCommentaryUrl: "https://www.templars-law.com/insights/cbn-consumer-protection",
    expectedCommentaryTitle: "Templars Thought Leadership: CBN Consumer Protection Disclosure",
    expectedMinTrustTier: "OFFICIAL_REGULATOR_WEB",
  },
  {
    id: "CIR-03",
    slice: "EXACT_NIGERIAN_CIRCULARS",
    query: "PSM/DIR/PUB/CIR/001/039 payment service bank PSP licensing requirements",
    jurisdictions: ["NG"],
    searchIntent: "REGULATORY_CIRCULAR",
    expectedOfficialUrl: "https://www.cbn.gov.ng/Out/2024/PSMD/PSM_DIR_PUB_CIR_001_039.pdf",
    expectedOfficialTitle: "CBN PSM/DIR/PUB/CIR/001/039 Payment System Directive",
    expectedCommentaryUrl: "https://www.aluko-oyebode.com/insights/cbn-psp-licensing",
    expectedCommentaryTitle: "Aluko & Oyebode: Nigeria Payment System Licensing Update",
    expectedMinTrustTier: "OFFICIAL_REGULATOR_WEB",
  },
  {
    id: "CIR-04",
    slice: "EXACT_NIGERIAN_CIRCULARS",
    query: "CBN/BSD/DIR/CON/LAB/015/021 virtual asset service providers bank accounts",
    jurisdictions: ["NG"],
    searchIntent: "REGULATORY_CIRCULAR",
    expectedOfficialUrl: "https://www.cbn.gov.ng/Out/2023/BSD/CBN_BSD_DIR_CON_LAB_015_021.pdf",
    expectedOfficialTitle: "CBN Guidelines on Operations of Bank Accounts for Virtual Assets Providers",
    expectedCommentaryUrl: "https://www.olaniwunajayi.net/insights/cbn-vasp-guidelines",
    expectedCommentaryTitle: "Olaniwun Ajayi Analysis: VASP Account Guidelines",
    expectedMinTrustTier: "OFFICIAL_REGULATOR_WEB",
  },
  {
    id: "CIR-05",
    slice: "EXACT_NIGERIAN_CIRCULARS",
    query: "SEC/NGR/VA/2025/02 Accelerated Regulatory Incubation Program ARIP VASP",
    jurisdictions: ["NG"],
    searchIntent: "REGULATORY_CIRCULAR",
    expectedOfficialUrl: "https://sec.gov.ng/arip-framework-vasp-2025.pdf",
    expectedOfficialTitle: "SEC Nigeria Framework on Accelerated Regulatory Incubation Program",
    expectedCommentaryUrl: "https://www.uubo.org/publications/sec-arip-digital-assets",
    expectedCommentaryTitle: "Udo Udoma & Belo-Osagie: SEC ARIP Registration Guide",
    expectedMinTrustTier: "OFFICIAL_REGULATOR_WEB",
  },
  {
    id: "CIR-06",
    slice: "EXACT_NIGERIAN_CIRCULARS",
    query: "NDPC/GAID/2025/01 Nigeria Data Protection Act General Application and Implementation Directive",
    jurisdictions: ["NG"],
    searchIntent: "REGULATORY_CIRCULAR",
    expectedOfficialUrl: "https://ndpc.gov.ng/files/NDPC_GAID_2025_01.pdf",
    expectedOfficialTitle: "NDPC General Application and Implementation Directive (GAID) 2025",
    expectedCommentaryUrl: "https://www.pavestoneslegal.com/ndpc-gaid-compliance-checklist",
    expectedCommentaryTitle: "Pavestones Legal: NDPC GAID Fintech Checklist",
    expectedMinTrustTier: "OFFICIAL_REGULATOR_WEB",
  },
  {
    id: "CIR-07",
    slice: "EXACT_NIGERIAN_CIRCULARS",
    query: "FCCPC/DLF/2025/04 Digital Electronic Online or Non-Traditional Consumer Lending Regulations",
    jurisdictions: ["NG"],
    searchIntent: "REGULATORY_CIRCULAR",
    expectedOfficialUrl: "https://fccpc.gov.ng/regulations/digital-lending-2025.pdf",
    expectedOfficialTitle: "FCCPC Digital Electronic Online Consumer Lending Regulations 2025",
    expectedCommentaryUrl: "https://www.aelex.com/fccpc-digital-lending-framework",
    expectedCommentaryTitle: "AELEX Review: FCCPC Digital Lending Approval Framework",
    expectedMinTrustTier: "OFFICIAL_REGULATOR_WEB",
  },
  {
    id: "CIR-08",
    slice: "EXACT_NIGERIAN_CIRCULARS",
    query: "NFIU/AML/CIR/2024/09 suspicious transaction reporting 5-year record keeping",
    jurisdictions: ["NG"],
    searchIntent: "REGULATORY_CIRCULAR",
    expectedOfficialUrl: "https://www.nfiu.gov.ng/circulars/NFIU_AML_CIR_2024_09.pdf",
    expectedOfficialTitle: "NFIU Circular on Suspicious Transaction Reporting & Record Preservation",
    expectedCommentaryUrl: "https://www.detailcommercialsolicitors.com/nfiu-aml-obligations",
    expectedCommentaryTitle: "Detail Commercial Solicitors: NFIU AML Record Retention",
    expectedMinTrustTier: "OFFICIAL_REGULATOR_WEB",
  },
  {
    id: "CIR-09",
    slice: "EXACT_NIGERIAN_CIRCULARS",
    query: "ARCON/ASP/2024/11 mandatory pre-exposure vetting digital financial service ads",
    jurisdictions: ["NG"],
    searchIntent: "REGULATORY_CIRCULAR",
    expectedOfficialUrl: "https://arcon.gov.ng/directives/ASP_2024_11_pre_vetting.pdf",
    expectedOfficialTitle: "ARCON Advertising Standards Panel Pre-Exposure Vetting Directive",
    expectedCommentaryUrl: "https://www.jacksonettiandedu.com/arcon-fintech-ad-vetting",
    expectedCommentaryTitle: "Jackson Etti & Edu: ARCON Pre-Vetting for Fintech Campaigns",
    expectedMinTrustTier: "OFFICIAL_REGULATOR_WEB",
  },
  {
    id: "CIR-10",
    slice: "EXACT_NIGERIAN_CIRCULARS",
    query: "CBN/FPR/OTH/014/003 Automated AML CFT Baseline Standards for financial institutions",
    jurisdictions: ["NG"],
    searchIntent: "REGULATORY_CIRCULAR",
    expectedOfficialUrl: "https://www.cbn.gov.ng/Out/2025/FPRD/CBN_AML_Baseline_Standards.pdf",
    expectedOfficialTitle: "CBN Automated AML/CFT/CPF Baseline Standards Circular",
    expectedCommentaryUrl: "https://nairametrics.com/cbn-automated-aml-baseline-standards",
    expectedCommentaryTitle: "Nairametrics: CBN Automated AML/CFT Baseline Rollout",
    expectedMinTrustTier: "OFFICIAL_REGULATOR_WEB",
  },

  // SLICE 2: Multi-Agency Product & Policy Compliance (10)
  {
    id: "PRD-01",
    slice: "MULTI_AGENCY_WORKFLOWS",
    query: "USD virtual dollar card product CBN FX circular NDPC cross-border data transfer",
    jurisdictions: ["NG"],
    searchIntent: "LEGAL_ANALYSIS",
    expectedOfficialUrl: "https://www.cbn.gov.ng/Out/2025/TED/FX_Virtual_Card_Settlement.pdf",
    expectedOfficialTitle: "CBN FX Rules on Virtual Card Issuance & Cross-Border Settlement",
    expectedCommentaryUrl: "https://www.banwo-ighodalo.com/virtual-card-fintech-nigeria",
    expectedCommentaryTitle: "Structuring Virtual Dollar Cards Under CBN & NDPC Rules",
    expectedMinTrustTier: "OFFICIAL_REGULATOR_WEB",
  },
  {
    id: "PRD-02",
    slice: "MULTI_AGENCY_WORKFLOWS",
    query: "Buy Now Pay Later BNPL checkout financing FCCPC APR KFS disclosure rules",
    jurisdictions: ["NG"],
    searchIntent: "REGULATORY_CIRCULAR",
    expectedOfficialUrl: "https://www.cbn.gov.ng/Out/2023/FPRD/Key_Facts_Statement_Credit.pdf",
    expectedOfficialTitle: "CBN Consumer Protection Regulations — Key Facts Statement Mandate",
    expectedCommentaryUrl: "https://www.templars-law.com/bnpl-consumer-credit-nigeria",
    expectedCommentaryTitle: "Templars: Regulatory Guide for BNPL Product Structuring",
    expectedMinTrustTier: "OFFICIAL_REGULATOR_WEB",
  },
  {
    id: "PRD-03",
    slice: "MULTI_AGENCY_WORKFLOWS",
    query: "Internal AML policy gap redline Money Laundering Prohibition Act 5-year retention",
    jurisdictions: ["NG"],
    searchIntent: "REGULATORY_CIRCULAR",
    expectedOfficialUrl: "https://www.nfiu.gov.ng/laws/Money_Laundering_Act_2022.pdf",
    expectedOfficialTitle: "Money Laundering (Prevention and Prohibition) Act — Record Retention",
    expectedCommentaryUrl: "https://www.aluko-oyebode.com/aml-cft-policy-updates-nigeria",
    expectedCommentaryTitle: "Aluko & Oyebode: Aligning Fintech AML Policies with MLPA",
    expectedMinTrustTier: "OFFICIAL_REGULATOR_WEB",
  },
  {
    id: "PRD-04",
    slice: "MULTI_AGENCY_WORKFLOWS",
    query: "NDPC personal data breach 72 hours mandatory notification regulatory DDQ",
    jurisdictions: ["NG"],
    searchIntent: "REGULATORY_CIRCULAR",
    expectedOfficialUrl: "https://ndpc.gov.ng/legislation/NDPA_2023_Section_40_Breach.pdf",
    expectedOfficialTitle: "Nigeria Data Protection Act 2023 §40 — 72-Hour Breach Notification",
    expectedCommentaryUrl: "https://www.olaniwunajayi.net/ndpa-72-hour-breach-reporting",
    expectedCommentaryTitle: "Olaniwun Ajayi: Incident Response Under NDPA 2023",
    expectedMinTrustTier: "OFFICIAL_REGULATOR_WEB",
  },
  {
    id: "PRD-05",
    slice: "MULTI_AGENCY_WORKFLOWS",
    query: "CBN revised agent banking guidelines transaction limits exclusivity geo-fencing",
    jurisdictions: ["NG"],
    searchIntent: "REGULATORY_CIRCULAR",
    expectedOfficialUrl: "https://www.cbn.gov.ng/Out/2025/PSMD/Agent_Banking_Guidelines.pdf",
    expectedOfficialTitle: "CBN Guidelines on Agent Banking Operations in Nigeria",
    expectedCommentaryUrl: "https://businessday.ng/banking/agent-banking-limits-cbn",
    expectedCommentaryTitle: "BusinessDay: Key Shifts in CBN Agent Banking Rules",
    expectedMinTrustTier: "OFFICIAL_REGULATOR_WEB",
  },
  {
    id: "PRD-06",
    slice: "MULTI_AGENCY_WORKFLOWS",
    query: "Tier 1 Tier 2 Tier 3 KYC wallet transaction balance limits CBN BVN NIN circular",
    jurisdictions: ["NG"],
    searchIntent: "REGULATORY_CIRCULAR",
    expectedOfficialUrl: "https://www.cbn.gov.ng/Out/2023/FPRD/Tier1_BVN_NIN_KYC_Limits.pdf",
    expectedOfficialTitle: "CBN Circular on Placement of Post-No-Debit on Tier 1 Without BVN/NIN",
    expectedCommentaryUrl: "https://www.uubo.org/cbn-kyc-bvn-nin-enforcement",
    expectedCommentaryTitle: "UUBO: Mandatory BVN/NIN Linking Across Wallet Tiers",
    expectedMinTrustTier: "OFFICIAL_REGULATOR_WEB",
  },
  {
    id: "PRD-07",
    slice: "MULTI_AGENCY_WORKFLOWS",
    query: "Open banking in Nigeria CBN operational guidelines consent management API",
    jurisdictions: ["NG"],
    searchIntent: "REGULATORY_CIRCULAR",
    expectedOfficialUrl: "https://www.cbn.gov.ng/Out/2023/PSMD/Open_Banking_Operational_Guidelines.pdf",
    expectedOfficialTitle: "CBN Operational Guidelines for Open Banking in Nigeria",
    expectedCommentaryUrl: "https://www.detailcommercialsolicitors.com/open-banking-api-consent",
    expectedCommentaryTitle: "Detail Commercial Solicitors: Open Banking Consent Rules",
    expectedMinTrustTier: "OFFICIAL_REGULATOR_WEB",
  },
  {
    id: "PRD-08",
    slice: "MULTI_AGENCY_WORKFLOWS",
    query: "Microfinance bank capital adequacy single obligor limit deposit insurance NDIC",
    jurisdictions: ["NG"],
    searchIntent: "REGULATORY_CIRCULAR",
    expectedOfficialUrl: "https://ndic.gov.ng/coverage/NDIC_Deposit_Insurance_Limits_2024.pdf",
    expectedOfficialTitle: "NDIC Maximum Deposit Insurance Coverage for MFBs & MMOs",
    expectedCommentaryUrl: "https://www.pavestoneslegal.com/mfb-regulatory-compliance-nigeria",
    expectedCommentaryTitle: "Pavestones: Microfinance Bank Compliance Matrix",
    expectedMinTrustTier: "OFFICIAL_REGULATOR_WEB",
  },
  {
    id: "PRD-09",
    slice: "MULTI_AGENCY_WORKFLOWS",
    query: "Fintech robo-advisory wealth management SEC Nigeria Digital Sub-Broker license",
    jurisdictions: ["NG"],
    searchIntent: "LEGAL_ANALYSIS",
    expectedOfficialUrl: "https://sec.gov.ng/rules/SEC_Digital_Sub_Broker_Rules.pdf",
    expectedOfficialTitle: "SEC Nigeria Rules on Robo-Advisory and Digital Sub-Brokers",
    expectedCommentaryUrl: "https://www.banwo-ighodalo.com/sec-digital-sub-broker-fintech",
    expectedCommentaryTitle: "Banwo & Ighodalo: WealthTech Licensing in Nigeria",
    expectedMinTrustTier: "OFFICIAL_REGULATOR_WEB",
  },
  {
    id: "PRD-10",
    slice: "MULTI_AGENCY_WORKFLOWS",
    query: "Sponsor bank NIBSS partner due diligence questionnaire PSSP settlement escrow",
    jurisdictions: ["NG"],
    searchIntent: "LEGAL_ANALYSIS",
    expectedOfficialUrl: "https://nibss-plc.com.ng/compliance/PSSP_Settlement_Requirements.pdf",
    expectedOfficialTitle: "NIBSS Settlement & Partner Bank Operational Readiness Standards",
    expectedCommentaryUrl: "https://techcabal.com/nibss-pssp-sponsor-bank-ddq-nigeria",
    expectedCommentaryTitle: "TechCabal: Clearing Sponsor Bank Compliance DDQs",
    expectedMinTrustTier: "OFFICIAL_REGULATOR_WEB",
  },

  // SLICE 3: Pan-African Cross-Border Expansion (10)
  {
    id: "AFR-01",
    slice: "PAN_AFRICAN_CROSS_BORDER",
    query: "Compare Nigeria CBN PSSP vs Kenya CBK Payment Service Provider capital and trust account",
    jurisdictions: ["NG", "KE"],
    searchIntent: "CROSS_BORDER",
    expectedOfficialUrl: "https://www.centralbank.go.ke/nps/Payment_Service_Providers_Regulations.pdf",
    expectedOfficialTitle: "Central Bank of Kenya National Payment System Regulations — PSP Licensing",
    expectedCommentaryUrl: "https://www.bowmanslaw.com/insights/kenya-cbk-psp-licensing",
    expectedCommentaryTitle: "Bowmans: East Africa Payment Service Provider Licensing Guide",
    expectedMinTrustTier: "OFFICIAL_REGULATOR_WEB",
  },
  {
    id: "AFR-02",
    slice: "PAN_AFRICAN_CROSS_BORDER",
    query: "Kenya CBK Digital Credit Providers Regulations licensing ODPC data privacy",
    jurisdictions: ["KE"],
    searchIntent: "CROSS_BORDER",
    expectedOfficialUrl: "https://www.centralbank.go.ke/dcp/Digital_Credit_Providers_Regulations.pdf",
    expectedOfficialTitle: "CBK Digital Credit Providers Regulations & Licensing Matrix",
    expectedCommentaryUrl: "https://www.aln.africa/insights/kenya-digital-credit-providers",
    expectedCommentaryTitle: "ALN Kenya: Digital Credit Licensing & ODPC Alignment",
    expectedMinTrustTier: "OFFICIAL_REGULATOR_WEB",
  },
  {
    id: "AFR-03",
    slice: "PAN_AFRICAN_CROSS_BORDER",
    query: "Ghana Bank of Ghana Enhanced Payment Service Provider Dedicated Electronic Money Issuer",
    jurisdictions: ["NG", "GH"],
    searchIntent: "CROSS_BORDER",
    expectedOfficialUrl: "https://www.bog.gov.gh/wp-content/uploads/Payment_Systems_Services_Act.pdf",
    expectedOfficialTitle: "Bank of Ghana Payment Systems and Services Act — Enhanced PSP Tiers",
    expectedCommentaryUrl: "https://www.templars-law.com/ghana-nigeria-psp-expansion",
    expectedCommentaryTitle: "Templars: Ghana BoG vs Nigeria CBN Payment Licensing",
    expectedMinTrustTier: "OFFICIAL_REGULATOR_WEB",
  },
  {
    id: "AFR-04",
    slice: "PAN_AFRICAN_CROSS_BORDER",
    query: "Ghana Data Protection Commission cross-border transfer registration fintech requirements",
    jurisdictions: ["GH"],
    searchIntent: "CROSS_BORDER",
    expectedOfficialUrl: "https://dataprotection.org.gh/guidelines/fintech_registration.pdf",
    expectedOfficialTitle: "Data Protection Commission Ghana — Controller Registration Guide",
    expectedCommentaryUrl: "https://www.ensafrica.com/ghana-data-protection-fintech",
    expectedCommentaryTitle: "ENSafrica: Ghana Data Protection Act Obligations",
    expectedMinTrustTier: "OFFICIAL_REGULATOR_WEB",
  },
  {
    id: "AFR-05",
    slice: "PAN_AFRICAN_CROSS_BORDER",
    query: "South Africa SARB NPSD Third-Party Payment Provider TPPP vs Nigeria PSSP rules",
    jurisdictions: ["NG", "ZA"],
    searchIntent: "CROSS_BORDER",
    expectedOfficialUrl: "https://www.resbank.co.za/en/home/what-we-do/payments-and-settlements/TPPP_Directive.pdf",
    expectedOfficialTitle: "SARB Directive for Third-Party Payment Providers in National Payment System",
    expectedCommentaryUrl: "https://www.webberwentzel.com/sarb-payment-intermediary-rules",
    expectedCommentaryTitle: "Webber Wentzel: South Africa Payment Clearing & TPPP Rules",
    expectedMinTrustTier: "OFFICIAL_REGULATOR_WEB",
  },
  {
    id: "AFR-06",
    slice: "PAN_AFRICAN_CROSS_BORDER",
    query: "South Africa FSCA Crypto Asset Service Provider CASP FAIS licensing POPIA compliance",
    jurisdictions: ["ZA"],
    searchIntent: "CROSS_BORDER",
    expectedOfficialUrl: "https://www.fsca.co.za/Notices/CASP_FAIS_Licensing_Guide.pdf",
    expectedOfficialTitle: "FSCA South Africa Crypto Asset Service Provider (CASP) Licensing Requirements",
    expectedCommentaryUrl: "https://www.cliffedekkerhofmeyr.com/fsca-casp-licensing-south-africa",
    expectedCommentaryTitle: "Cliffe Dekker Hofmeyr: FSCA CASP & FIC Act Compliance",
    expectedMinTrustTier: "OFFICIAL_REGULATOR_WEB",
  },
  {
    id: "AFR-07",
    slice: "PAN_AFRICAN_CROSS_BORDER",
    query: "Rwanda National Bank of Rwanda BNR Payment Service Provider Tier 1 2 3 capital",
    jurisdictions: ["RW"],
    searchIntent: "CROSS_BORDER",
    expectedOfficialUrl: "https://www.bnr.rw/laws-and-regulations/payment-system/PSP_Regulation.pdf",
    expectedOfficialTitle: "National Bank of Rwanda Regulation Governing Payment Service Providers",
    expectedCommentaryUrl: "https://www.bowmanslaw.com/rwanda-fintech-psp-licensing",
    expectedCommentaryTitle: "Bowmans: Expanding Fintech Payment Operations into Rwanda",
    expectedMinTrustTier: "OFFICIAL_REGULATOR_WEB",
  },
  {
    id: "AFR-08",
    slice: "PAN_AFRICAN_CROSS_BORDER",
    query: "Egypt Central Bank of Egypt CBE FinTech Law sandbox mobile wallet rules",
    jurisdictions: ["EG"],
    searchIntent: "CROSS_BORDER",
    expectedOfficialUrl: "https://www.cbe.org.eg/en/laws-regulations/fintech-sandbox-rules.pdf",
    expectedOfficialTitle: "Central Bank of Egypt FinTech Regulatory Sandbox & E-Payment Rules",
    expectedCommentaryUrl: "https://enterprise.news/egypt-cbe-fintech-licensing-overview",
    expectedCommentaryTitle: "EnterpriseAM: Egypt CBE FinTech & Wallet Licensing",
    expectedMinTrustTier: "OFFICIAL_REGULATOR_WEB",
  },
  {
    id: "AFR-09",
    slice: "PAN_AFRICAN_CROSS_BORDER",
    query: "Pan-African PAPSS cross-border instant settlement AfCFTA currency clearing",
    jurisdictions: ["AFRICA_REGIONAL", "NG", "GH", "KE"],
    searchIntent: "CROSS_BORDER",
    expectedOfficialUrl: "https://www.cbn.gov.ng/Out/2025/TED/PAPSS_Cross_Border_Settlement.pdf",
    expectedOfficialTitle: "CBN Operational Circular on Pan-African Payment & Settlement System (PAPSS)",
    expectedCommentaryUrl: "https://www.africanlegalbrief.com/papss-cross-border-fintech",
    expectedCommentaryTitle: "African Legal Brief: PAPSS Settlement Rules Across West & East Africa",
    expectedMinTrustTier: "OFFICIAL_REGULATOR_WEB",
  },
  {
    id: "AFR-10",
    slice: "PAN_AFRICAN_CROSS_BORDER",
    query: "South Africa FIC Act travel rule crypto transfers vs Nigeria NFIU AML obligations",
    jurisdictions: ["NG", "ZA"],
    searchIntent: "CROSS_BORDER",
    expectedOfficialUrl: "https://www.fic.gov.za/Documents/Directive_9_Crypto_Travel_Rule.pdf",
    expectedOfficialTitle: "Financial Intelligence Centre Directive 9 — Crypto Asset Travel Rule",
    expectedCommentaryUrl: "https://www.ensafrica.com/fic-directive-9-travel-rule",
    expectedCommentaryTitle: "ENSafrica: Cross-Border Travel Rule Comparison (ZA vs NG)",
    expectedMinTrustTier: "OFFICIAL_REGULATOR_WEB",
  },

  // SLICE 4: Recent Enforcement & Financial Press Alerts (10)
  {
    id: "ENF-01",
    slice: "ENFORCEMENT_AND_PRESS",
    query: "CBN sanctions deposit money banks BDC FX documentation violations",
    jurisdictions: ["NG"],
    searchIntent: "NEWS_ENFORCEMENT",
    expectedOfficialUrl: "https://www.cbn.gov.ng/Out/2026/Press/FX_Compliance_Enforcement.pdf",
    expectedOfficialTitle: "CBN Press Release on Foreign Exchange Market Compliance Enforcement",
    expectedCommentaryUrl: "https://nairametrics.com/cbn-fx-sanctions-enforcement-alert",
    expectedCommentaryTitle: "Nairametrics: CBN Imposes Regulatory Sanctions Over FX Documentation",
    expectedMinTrustTier: "OFFICIAL_REGULATOR_WEB",
  },
  {
    id: "ENF-02",
    slice: "ENFORCEMENT_AND_PRESS",
    query: "FCCPC delists unlicensed digital loan apps predatory debt recovery",
    jurisdictions: ["NG"],
    searchIntent: "NEWS_ENFORCEMENT",
    expectedOfficialUrl: "https://fccpc.gov.ng/enforcement/delisted-loan-apps-notice.pdf",
    expectedOfficialTitle: "FCCPC Enforcement Notice on Unapproved Digital Money Lenders",
    expectedCommentaryUrl: "https://techcabal.com/fccpc-delists-digital-loan-apps",
    expectedCommentaryTitle: "TechCabal: FCCPC Delists Non-Compliant Loan Apps from Play Store",
    expectedMinTrustTier: "OFFICIAL_REGULATOR_WEB",
  },
  {
    id: "ENF-03",
    slice: "ENFORCEMENT_AND_PRESS",
    query: "SEC Nigeria public advisory warning against unregistered crypto investment platforms",
    jurisdictions: ["NG"],
    searchIntent: "NEWS_ENFORCEMENT",
    expectedOfficialUrl: "https://sec.gov.ng/warnings/unregistered-vasp-advisory-2026.pdf",
    expectedOfficialTitle: "SEC Nigeria Circular Warning Public Against Unlicensed Investment Apps",
    expectedCommentaryUrl: "https://businessday.ng/markets/sec-unregistered-crypto-warning",
    expectedCommentaryTitle: "BusinessDay: SEC Issues Enforcement Alert on Unlicensed Platforms",
    expectedMinTrustTier: "OFFICIAL_REGULATOR_WEB",
  },
  {
    id: "ENF-04",
    slice: "ENFORCEMENT_AND_PRESS",
    query: "NDPC issues fine penalty for unauthorized customer BVN financial data exposure",
    jurisdictions: ["NG"],
    searchIntent: "NEWS_ENFORCEMENT",
    expectedOfficialUrl: "https://ndpc.gov.ng/enforcement/data-breach-penalty-notice.pdf",
    expectedOfficialTitle: "NDPC Enforcement Order on Unlawful Financial Data Processing",
    expectedCommentaryUrl: "https://www.thecable.ng/ndpc-fines-fintech-data-breach",
    expectedCommentaryTitle: "TheCable: NDPC Sanctions Financial Institution Over Data Breach",
    expectedMinTrustTier: "OFFICIAL_REGULATOR_WEB",
  },
  {
    id: "ENF-05",
    slice: "ENFORCEMENT_AND_PRESS",
    query: "ARCON Advertising Offences Tribunal fines fintech unvetted influencer promo",
    jurisdictions: ["NG"],
    searchIntent: "NEWS_ENFORCEMENT",
    expectedOfficialUrl: "https://arcon.gov.ng/enforcement/aspiring-fintech-vetting-order.pdf",
    expectedOfficialTitle: "ARCON Notice on Mandatory ASP Approval Before Influencer Promotions",
    expectedCommentaryUrl: "https://nairametrics.com/arcon-fines-unvetted-fintech-ads",
    expectedCommentaryTitle: "Nairametrics: ARCON Cracks Down on Unvetted Social Media Financial Ads",
    expectedMinTrustTier: "OFFICIAL_REGULATOR_WEB",
  },
  {
    id: "ENF-06",
    slice: "ENFORCEMENT_AND_PRESS",
    query: "CBN onboarding freeze onboarding restriction fintech KYC BVN tier-1 compliance",
    jurisdictions: ["NG"],
    searchIntent: "NEWS_ENFORCEMENT",
    expectedOfficialUrl: "https://www.cbn.gov.ng/Out/2025/PSMD/KYC_Remediation_Notice.pdf",
    expectedOfficialTitle: "CBN Directive on Fintech Customer Onboarding & KYC Verification Controls",
    expectedCommentaryUrl: "https://techcabal.com/cbn-fintech-kyc-onboarding-remediation",
    expectedCommentaryTitle: "TechCabal: How Fintechs Passed CBN KYC Remediation Audits",
    expectedMinTrustTier: "OFFICIAL_REGULATOR_WEB",
  },
  {
    id: "ENF-07",
    slice: "ENFORCEMENT_AND_PRESS",
    query: "Kenya CBK revokes license non-compliant digital credit provider enforcement notice",
    jurisdictions: ["KE"],
    searchIntent: "NEWS_ENFORCEMENT",
    expectedOfficialUrl: "https://www.centralbank.go.ke/press/dcp-enforcement-update.pdf",
    expectedOfficialTitle: "CBK Public Notice on Licensed & Restricted Digital Credit Providers",
    expectedCommentaryUrl: "https://www.businessdailyafrica.com/cbk-digital-lenders-compliance",
    expectedCommentaryTitle: "Business Daily Africa: CBK Tightens Digital Lender Enforcement",
    expectedMinTrustTier: "OFFICIAL_REGULATOR_WEB",
  },
  {
    id: "ENF-08",
    slice: "ENFORCEMENT_AND_PRESS",
    query: "Ghana Bank of Ghana sanction notice foreign exchange remittance unlicensed MTO",
    jurisdictions: ["GH"],
    searchIntent: "NEWS_ENFORCEMENT",
    expectedOfficialUrl: "https://www.bog.gov.gh/news/unlicensed-remittance-mto-notice.pdf",
    expectedOfficialTitle: "Bank of Ghana Notice Against Unlicensed Money Transfer Operators",
    expectedCommentaryUrl: "https://citinewsroom.com/bog-fintech-remittance-enforcement",
    expectedCommentaryTitle: "CitiNewsroom: BoG Halts Unlicensed Remittance Corridors",
    expectedMinTrustTier: "OFFICIAL_REGULATOR_WEB",
  },
  {
    id: "ENF-09",
    slice: "ENFORCEMENT_AND_PRESS",
    query: "South Africa SARB Prudential Authority administrative sanction AML FICA bank",
    jurisdictions: ["ZA"],
    searchIntent: "NEWS_ENFORCEMENT",
    expectedOfficialUrl: "https://www.resbank.co.za/en/home/publications/PA_FICA_Sanction.pdf",
    expectedOfficialTitle: "SARB Prudential Authority Administrative Sanctions Under FIC Act",
    expectedCommentaryUrl: "https://www.moneyweb.co.za/sarb-fica-aml-sanctions",
    expectedCommentaryTitle: "Moneyweb: SARB Sanctions Over Customer Due Diligence Failures",
    expectedMinTrustTier: "OFFICIAL_REGULATOR_WEB",
  },
  {
    id: "ENF-10",
    slice: "ENFORCEMENT_AND_PRESS",
    query: "NFIU fines reporting entity delayed suspicious transaction report STR filing",
    jurisdictions: ["NG"],
    searchIntent: "NEWS_ENFORCEMENT",
    expectedOfficialUrl: "https://www.nfiu.gov.ng/enforcement/STR_Filing_Sanction_Notice.pdf",
    expectedOfficialTitle: "NFIU Administrative Penalty Schedule for Late STR/CTR Filings",
    expectedCommentaryUrl: "https://www.premiumtimesng.com/nfiu-aml-sanctions-banks",
    expectedCommentaryTitle: "Premium Times: NFIU Issues Penalties Over Delayed AML Filings",
    expectedMinTrustTier: "OFFICIAL_REGULATOR_WEB",
  },
];

// Mock Supabase persistence for isolated deterministic router benchmark
vi.mock("@/lib/supabase", () => {
  const cacheMap = new Map<string, Record<string, unknown>>();
  const persistedRetrievals: Array<{ retrieved_url: string; tenant_id: string }> = [];
  return {
    createAdminSupabaseClient: vi.fn(() => ({
      from: (table: string) => {
        if (table === "live_web_search_cache") {
          return {
            select: () => ({
              eq: (_col: string, key: string) => ({
                gt: () => ({
                  maybeSingle: async () => ({
                    data: cacheMap.get(key) ?? null,
                    error: null,
                  }),
                }),
              }),
            }),
            upsert: async (row: Record<string, unknown>) => {
              cacheMap.set(String(row.cache_key), row);
              return { error: null };
            },
            update: () => ({
              eq: async () => ({ error: null }),
            }),
          };
        }
        if (table === "live_web_retrievals") {
          return {
            insert: (rows: Array<Record<string, unknown>>) => ({
              select: async () => {
                for (const r of rows) {
                  persistedRetrievals.unshift({
                    retrieved_url: String(r.retrieved_url),
                    tenant_id: String(r.tenant_id),
                  });
                }
                return {
                  data: rows.map((r, i) => ({
                    id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
                    retrieved_url: r.retrieved_url,
                    retrieved_at: new Date().toISOString(),
                  })),
                  error: null,
                };
              },
            }),
            select: () => ({
              eq: (_col: string, tId: string) => ({
                order: () => ({
                  limit: async (lim: number) => ({
                    data: persistedRetrievals
                      .filter((r) => r.tenant_id === tId)
                      .slice(0, lim),
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {
          select: () => ({
            eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
            in: async () => ({ data: [], error: null }),
          }),
          upsert: async () => ({ error: null }),
          insert: async () => ({ error: null }),
        };
      },
      rpc: async () => ({ data: null, error: null }),
    })),
  };
});

describe("Phase 6: 40-Query Nigeria & Pan-Africa Regulatory Search Benchmark", () => {
  const tenantId = "11111111-1111-1111-1111-111111111111";
  let externalFetchCalls = 0;
  let router: WebSearchRouter;

  beforeEach(() => {
    externalFetchCalls = 0;
    process.env.SERPAPI_API_KEY = "bench-serp-key";
    process.env.EXA_API_KEY = "bench-exa-key";
    process.env.ENABLE_DUAL_LIVE_WEB_SEARCH = "true";

    const matchScenarioByQuery = (q: string): AfricaBenchmarkQuery => {
      const normalized = q.toLowerCase();
      return (
        BENCHMARK_40_QUERIES.find((item) =>
          normalized.includes(item.query.slice(0, 28).toLowerCase()),
        ) || BENCHMARK_40_QUERIES[0]!
      );
    };

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL, init?: RequestInit) => {
        externalFetchCalls++;
        const urlStr = String(url);

        if (urlStr.includes("serpapi.com")) {
          const parsedUrl = new URL(urlStr);
          const q = parsedUrl.searchParams.get("q") || "";
          const engine = parsedUrl.searchParams.get("engine") || "google";
          const scenario = matchScenarioByQuery(q);

          if (engine === "google_news") {
            return new Response(
              JSON.stringify({
                news_results: [
                  {
                    title: scenario.expectedCommentaryTitle,
                    link: scenario.expectedCommentaryUrl,
                    snippet: `Press & compliance intelligence: ${scenario.query}`,
                    source: { name: "Regional Financial Press" },
                    date: "2 days ago",
                  },
                ],
              }),
              { status: 200, headers: { "Content-Type": "application/json" } },
            );
          }

          return new Response(
            JSON.stringify({
              organic_results: [
                {
                  position: 1,
                  title: scenario.expectedOfficialTitle,
                  link: scenario.expectedOfficialUrl,
                  snippet: `Official regulator circular excerpt for ${scenario.query}.`,
                  displayed_link: scenario.expectedOfficialUrl,
                },
                {
                  position: 2,
                  title: "Spoofed Phishing Mirror Site",
                  link: "https://cbn.gov.ng.spoofed-phish.example/fake.pdf",
                  snippet: "Untrusted domain attempt.",
                },
              ],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }

        // Exa AI endpoint
        const body = JSON.parse(String(init?.body || "{}")) as { query?: string };
        const scenario = matchScenarioByQuery(body.query || "");
        return new Response(
          JSON.stringify({
            results: [
              {
                id: `exa_${scenario.id}`,
                url: scenario.expectedCommentaryUrl,
                title: scenario.expectedCommentaryTitle,
                text: `Deep legal memorandum analyzing ${scenario.query} and operational requirements.`,
                highlights: [`Key statutory threshold for ${scenario.id}`],
                score: 0.91,
                publishedDate: "2026-09-15T00:00:00.000Z",
              },
              {
                id: `exa_off_${scenario.id}`,
                url: scenario.expectedOfficialUrl,
                title: scenario.expectedOfficialTitle,
                text: `Official regulatory text for ${scenario.query}.`,
                highlights: [`Mandatory statutory provision (${scenario.id})`],
                score: 0.95,
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }),
    );

    const serpClient = new SerpApiClient();
    const exaClient = new ExaClient();

    router = new WebSearchRouter({
      customSerpApiClient: serpClient,
      customExaClient: exaClient,
    });
  });

  it("BENCH-AFRICA-01: Passes all 40 benchmark queries across 4 slices with trust-tier ranking, 0% fabricated URLs, and sub-3500ms p95 latency", async () => {
    expect(BENCHMARK_40_QUERIES).toHaveLength(40);

    const latencies: number[] = [];
    let officialFirstHits = 0;
    let totalFabricatedUrls = 0;

    for (const scenario of BENCHMARK_40_QUERIES) {
      const start = performance.now();
      const bundle = await router.searchAfricaLiveWeb(
        {
          query: scenario.query,
          jurisdictions: scenario.jurisdictions,
          searchIntent: scenario.searchIntent,
          includeNews: true,
          limit: 8,
        },
        tenantId,
      );
      latencies.push(performance.now() - start);

      expect(bundle.results.length).toBeGreaterThanOrEqual(2);

      // Official regulator source must rank ahead of commentary/spoofed domains
      const top = bundle.results[0]!;
      expect(top.retrieved_url).toBe(scenario.expectedOfficialUrl);
      expect(top.trust_tier).toBe(scenario.expectedMinTrustTier);
      if (top.trust_tier === "OFFICIAL_REGULATOR_WEB") {
        officialFirstHits++;
      }

      // Spoofed domain MUST NOT be classified as OFFICIAL_REGULATOR_WEB
      const spoofItem = bundle.results.find((r) => r.domain.includes("spoofed-phish"));
      if (spoofItem) {
        expect(spoofItem.trust_tier).toBe("GENERAL_LIVE_WEB");
      }

      // Verify zero fabricated external URLs via guardrailValidator
      const draftMarkdown =
        `### ${scenario.id}\n` +
        `Official reference: [Regulator PDF](${top.retrieved_url}).\n` +
        `Unverified attack link: https://fabricated-ai-hallucination.ng/fake.pdf`;

      const guardrail = await guardrailValidator.validateWorkProduct(
        {
          workflow_type: "PRODUCT_STRUCTURING_MEMO",
          markdown_content: draftMarkdown,
          citations: [],
        },
        { tenantId },
      );

      expect(guardrail.sanitized_markdown).toContain(top.retrieved_url);
      expect(guardrail.sanitized_markdown).not.toContain("fabricated-ai-hallucination.ng");
      expect(guardrail.guardrail_report.stripped_ungrounded_urls).toContain(
        "https://fabricated-ai-hallucination.ng/fake.pdf",
      );

      if (guardrail.sanitized_markdown.includes("fabricated-ai-hallucination.ng")) {
        totalFabricatedUrls++;
      }
    }

    latencies.sort((a, b) => a - b);
    const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;

    expect(officialFirstHits).toBe(40); // 100% Top-1 Official Regulator Authority Ranking
    expect(totalFabricatedUrls).toBe(0); // 0.0% fabricated external URL leakage
    expect(p95).toBeLessThan(3500);
  });

  it("BENCH-AFRICA-02: Enforces strict domain suffix matching (prevents lookalike subdomain & prefix spoofing)", () => {
    expect(matchesDomainSuffix("cbn.gov.ng", "cbn.gov.ng")).toBe(true);
    expect(matchesDomainSuffix("www.cbn.gov.ng", "cbn.gov.ng")).toBe(true);
    expect(matchesDomainSuffix("portal.cbn.gov.ng", "cbn.gov.ng")).toBe(true);

    // Attack vectors that MUST fail suffix matching
    expect(matchesDomainSuffix("cbn.gov.ng.evil.com", "cbn.gov.ng")).toBe(false);
    expect(matchesDomainSuffix("mycbn.gov.ng", "cbn.gov.ng")).toBe(false);
    expect(matchesDomainSuffix("fake-centralbank.go.ke", "centralbank.go.ke")).toBe(false);

    const clsSpoof = classifyDomainTrustTier("https://cbn.gov.ng.phish.com/doc.pdf", "NG");
    expect(clsSpoof.trustTier).toBe("GENERAL_LIVE_WEB");
  });

  it("BENCH-AFRICA-03: Shared cache deduplication prevents duplicate upstream SerpAPI & Exa calls", async () => {
    const scenario = BENCHMARK_40_QUERIES[0]!;
    const cacheProbeQuery = `CACHE-PROBE ${scenario.query}`;
    const first = await router.searchAfricaLiveWeb(
      {
        query: cacheProbeQuery,
        jurisdictions: scenario.jurisdictions,
        searchIntent: scenario.searchIntent,
        includeNews: true,
      },
      tenantId,
    );
    expect(first.cacheHit).toBe(false);
    const callsAfterFirst = externalFetchCalls;
    expect(callsAfterFirst).toBeGreaterThanOrEqual(2);

    const second = await router.searchAfricaLiveWeb(
      {
        query: `  ${cacheProbeQuery.toUpperCase()}  `, // whitespace + case normalization
        jurisdictions: scenario.jurisdictions,
        searchIntent: scenario.searchIntent,
        includeNews: true,
      },
      tenantId,
    );
    expect(second.cacheHit).toBe(true);
    expect(externalFetchCalls).toBe(callsAfterFirst); // 0 additional upstream API calls
    expect(second.results[0]!.retrieved_url).toBe(first.results[0]!.retrieved_url);
  });
});
