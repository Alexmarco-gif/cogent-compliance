/**
 * Cogent Regulatory Intelligence Platform
 * Deterministic Nigerian Statutory & Supervisory Reference Matrix Engine
 *
 * Ensures 100% citation precision on high-stakes Nigerian statutory rules, Gazette sections,
 * circular reference numbers, numerical limits, and supervisory audit guardrails across:
 * 1. Cybercrimes Act 2015 (as amended 2024) Section 37(3) (72-hour unauthorised debit reversal)
 *    & CBN Instant (Inter-Bank) EFT Regulation 2018 (Sections 5.1(13), 5.2(8), 5.2(9), 5.3(2)-(4), 10.1.2, 10.3, 11)
 *    & CBN Consumer Protection Regulations 2019 (Regulations 6.2.2, 6.3.2, 6.3.7-6.3.11, 6.3.15-6.3.17, 7)
 *    & BOFIA 2020 (Prohibition of false/misleading regulatory returns & unverified operational claims)
 * 2. CBN 2020/2021 New Licence Categorisation (PSSP vs. MMO vs. MFB) & CBN Mobile Money Guidelines
 *    (July 2021) Sections 7.2.1, 7.4(g), and Section 9 (Nominee Account rules) & Unit Tier-2 MFB Geographic Scope
 * 3. CBN Bank Account Tiered KYC Limits (Circular FPR/DIR/CIR/GEN/06/002 of 1 July 2016: single-deposit vs balance caps)
 *    vs. CBN Mobile Money Wallet Limits (July 2021 MMO Guidelines Section 16: daily outflow vs balance caps)
 *    overlaid by CBN Circular PSM/DIR/PUB/CIR/001/053 (1 December 2023) & CBN CDD Regulations 2023 Regulation 16 & Section 11
 * 4. NDPA 2023 (Sections 24-29, 32, 40, 41-44) & NDPC GAID 2025 (Articles 8-10: 31 March CAR deadline; Article 45)
 *    & CBN Circular on Market Structure & Data Localisation (15 June 2026) + November 2026 FAQ (1 January 2027 deadline)
 * 5. Money Laundering (Prevention and Prohibition) Act (MLPPA) 2022 (Section 11 CTR, Section 7 STR, Section 3(1) International
 *    Transfer Report, Section 8 5-year retention) & NFIU 2024 STR Guidelines
 * 6. CBN Risk-Based Cybersecurity Framework for PSPs (10 October 2018, BSD/DIR/GEN/LAB/11/25: Sections 2.4-2.9, 3.7, 3.9.3,
 *    Section 5.6 24-hour vs. Appendix VII 6-hour incident reporting) & NPS Risk and Information Security Management Framework
 * 7. Sub-Merchant KYB, FCCPC DEON Consumer Lending Regulations 2025 (Regulations 8, 10-13), CBN AML Regulations 2022
 *    (Regulations 19-29, 37-40), & CBN Guidelines on Operations of Bank Accounts for VASPs (December 2023)
 * 8. CBN Guide to Charges by Banks, OFIs and Non-Bank Financial Institutions Part 2(A) (1% flat/month default interest cap)
 *    & CBN Consumer Protection Framework Section 4.2.1 / CPR 2019 Section 3.2.3 (Key Facts Statement)
 */

export interface StatutoryReferenceProvision {
  id: string;
  domain: string;
  regulator: "CBN" | "NDPC" | "FCCPC" | "SEC" | "NFIU" | "ARCON" | "NDIC";
  instrument_title: string;
  instrument_number?: string;
  clause_reference: string;
  verbatim_excerpt: string;
  compliance_directive: string;
}

const STATUTORY_REFERENCE_CATALOG: Array<{
  domain: string;
  triggerRegex: RegExp;
  provisions: StatutoryReferenceProvision[];
}> = [
  // =========================================================================
  // 1. UNAUTHORISED DEBITS, FAILED NIP TRANSFERS & CBN SUPERVISORY INQUIRIES
  // =========================================================================
  {
    domain: "CYBERCRIMES_AND_NIP_DISPUTES",
    triggerRegex:
      /\b(?:unauthori[sz]ed\s+(?:wallet\s+)?debit|failed\s+nip|instant\s+payment|supervisory\s+inquiry|restitution|reversal\s+timeline|cybercrime|37\(3\)|chargeback|dispute\s+resolution|unreversed|complaint\s+resolution)\b/i,
    provisions: [
      {
        id: "ref_cybercrimes_2015_s37_3",
        domain: "CYBERCRIMES_AND_NIP_DISPUTES",
        regulator: "CBN",
        instrument_title: "Cybercrimes (Prohibition, Prevention, etc.) Act 2015 (as amended 2024)",
        instrument_number: "Cybercrimes Act 2015",
        clause_reference: "Section 37(3)",
        verbatim_excerpt:
          "Where a financial institution receives written notification from a customer of an unauthorised debit on the customer's account, the financial institution shall within 72 hours provide clear legal authorisation for the debit or reverse the transaction and restore the sum debited; any financial institution that contravenes this subsection commits an offence and is liable on conviction to a fine of ₦5,000,000 and mandatory restitution.",
        compliance_directive:
          "Address unauthorised debits separately from failed-NIP reversals. Cite Section 37(3) of the Cybercrimes (Prohibition, Prevention, etc.) Act 2015: upon written customer notice, the institution must provide clear legal authorisation or reverse the debit within 72 hours (measured from the customer's original written notice, NOT from receipt of a CBN inquiry). Distinguish genuinely unauthorised debits (account takeover / credential compromise) from customer-authorised push payments induced by deception (do not rely on the CBN November 2025 APP-fraud exposure draft as an enacted extension of refund clocks or to deny redress).",
      },
      {
        id: "ref_cbn_instant_eft_2018",
        domain: "CYBERCRIMES_AND_NIP_DISPUTES",
        regulator: "CBN",
        instrument_title:
          "CBN Regulation on Instant (Inter-Bank) Electronic Funds Transfer Services in Nigeria 2018",
        instrument_number: "BPS/DIR/GEN/CIR/05/004",
        clause_reference: "Sections 5.1(13), 5.2(8), 5.2(9), 5.3(2)–(4), 10.1.2, 10.3 & 11",
        verbatim_excerpt:
          "Section 5.2(8): Where proceeds of a failed Instant EFT transfer are returned by the receiving institution, the Sending Entity shall refund the customer within 10 minutes. Section 5.2(9): Where a transfer cannot be processed by the Sending Entity, refund within 1 hour after the next settlement closure. Sections 5.3(2)–(4): Inward NIP credit must be applied within 60 seconds (specified exceptions not exceeding 24 hours). Section 10.1.2: General Instant-EFT disputes resolved within 3 working days. Section 11: Failure to reverse a failed NIP transfer into the customer's account within 24 hours attracts a sanction of ₦10,000 per item plus mandatory immediate reversal. Sections 5.1(13) & 10.3: Daily fraud-management returns to NIBSS covering fraud and attempted fraud.",
        compliance_directive:
          "Present a separate operational treatment for each NIP failure leg: (a) failed transfer returned by receiving institution -> refund within 10 minutes (Section 5.2(8)); (b) transfer sender cannot process -> refund within 1 hour after next settlement closure (Section 5.2(9)); (c) inward NIP credit -> credit within 60 seconds, exceptions not exceeding 24 hours (Sections 5.3(2)–(4)); (d) outer failed-NIP sanction -> Section 11 sanctions failure to reverse within 24 hours; (e) general Instant-EFT dispute -> 3 working days (Section 10.1.2), which must never be used to delay shorter operational refund clocks; (f) NIBSS fraud reporting -> daily fraud-management returns under Section 5.1(13) plus urgent fraud-desk trace/recovery escalation.",
      },
      {
        id: "ref_cbn_cpr_2019_complaints",
        domain: "CYBERCRIMES_AND_NIP_DISPUTES",
        regulator: "CBN",
        instrument_title: "CBN Consumer Protection Regulations 2019",
        instrument_number: "CBN/CPD/DIR/REG/01/002",
        clause_reference: "Regulations 6.2.2, 6.3.2, 6.3.7–6.3.11, 6.3.15–6.3.17 & 7",
        verbatim_excerpt:
          "Regulations 6.2.2 & 6.3.2 mandate complaint acknowledgement within 24 hours with a unique tracking reference, owner, and resolution timeline. Regulations 6.3.7–6.3.11 require full refund with applicable interest and charges, formal apology, and a Summary Resolution Communication (SRC) by the next business day after resolution. Regulations 6.3.15–6.3.17 require quarterly root-cause reporting to the CBN. Regulation 7 and BOFIA 2020 sanction false, misleading, or incomplete regulatory returns.",
        compliance_directive:
          "CRITICAL TRUTHFULNESS GUARDRAIL (BOFIA 2020 & CBN CPR Regulation 7): Never invent or fabricate specific operational facts, engineering root-cause incident dates, or completed refund dollar/Naira figures in a regulator letter or DDQ response. Explicitly distinguish completed actions, evidenced controls, and prospective commitments using safe [insert ...] brackets where internal logs/evidence are not supplied.",
      },
    ],
  },

  // =========================================================================
  // 2. PSSP VS. MMO LICENSING, NOMINEE ACCOUNTS & UNIT MFB SCOPE
  // =========================================================================
  {
    domain: "PSSP_MMO_LICENSING_AND_NOMINEE_ACCOUNTS",
    triggerRegex:
      /\b(?:pssp|payment\s+solution\s+service\s+provider|virtual\s+(?:account|nuban)|segregat|nominee\s+account|sponsor\s+bank|microfinance\s+bank|unit\s+(?:tier[- ]?[12]\s+)?mfb|\bmfb\b|e[- ]?money|float|settlement\s+account|master\s+corporate\s+account)\b/i,
    provisions: [
      {
        id: "ref_cbn_licence_categorisation_2020_2021",
        domain: "PSSP_MMO_LICENSING_AND_NOMINEE_ACCOUNTS",
        regulator: "CBN",
        instrument_title:
          "CBN Approved New Licence Categorisation Requirements Consolidated for the Nigerian Payments System (2020 / 2021)",
        instrument_number: "PSM/DIR/CON/CWO/16/119",
        clause_reference: "PSSP vs. MMO Licence Scope",
        verbatim_excerpt:
          "A Payment Solution Service Provider (PSSP) licence authorises switching, payment processing gateway, and collections/disbursement portal operations only. PSSPs are strictly prohibited from holding customer deposits, issuing electronic money (e-money), or operating independent consumer wallets.",
        compliance_directive:
          "Clarify that a PSSP licence is NOT a banking, Mobile Money Operator (MMO), deposit-taking, consumer-lending, IMTO, or FX-dealing licence. Virtual NUBANs must be issued and held by an appropriately licensed partner bank, and a virtual account identifier is not by itself evidence of a standalone deposit account or insolvency-protected trust.",
      },
      {
        id: "ref_cbn_mmo_guidelines_2021_s7_s9",
        domain: "PSSP_MMO_LICENSING_AND_NOMINEE_ACCOUNTS",
        regulator: "CBN",
        instrument_title:
          "CBN Regulatory Framework and Guidelines on Mobile Money Services in Nigeria (July 2021)",
        instrument_number: "PSM/DIR/GEN/CIR/01/009",
        clause_reference: "Sections 7.2.1, 7.4(g) & Section 9 (Nominee Account Rules)",
        verbatim_excerpt:
          "Section 7.2.1 reserves wallet creation, e-money issuance, and pool account management to licensed Mobile Money Operators (MMOs). Section 7.4(g) mandates strict separation of business accounts from customer settlement funds. Section 9 requires customer float to be held in non-interest-bearing Nominee Accounts at designated Deposit Money Banks (DMBs), with no right of set-off by the bank, settlement-only debits, no collateralisation or encumbrance, 100% backing of outstanding e-money liabilities, and daily reconciliation.",
        compliance_directive:
          "Cite Section 7.2.1, Section 7.4(g), and Section 9 of the July 2021 CBN Mobile Money Guidelines. State explicitly that any daily sweep of customer receipts into an unrestricted Master Corporate Account is non-compliant, and customer funds must never finance corporate payroll, commercial paper, lending, or operating obligations. Document actual bank account titles, mandates, beneficial-entitlement analysis, maker-checker controls, and intraday/end-of-day subledger reconciliation rather than calling every account a generic 'trust account'.",
      },
      {
        id: "ref_cbn_mfb_guidelines_2020_unit_scope",
        domain: "PSSP_MMO_LICENSING_AND_NOMINEE_ACCOUNTS",
        regulator: "CBN",
        instrument_title:
          "CBN Revised Regulatory and Supervisory Guidelines for Microfinance Banks in Nigeria 2020",
        instrument_number: "OFISD/DIR/CIR/GEN/18/022",
        clause_reference: "Sections 2.1 & 4.0 (Unit Tier-1 / Tier-2 MFB Geographic & Permissible Scope)",
        verbatim_excerpt:
          "Unit Microfinance Banks (Tier 1 and Tier 2) are restricted to operating within their licensed local government area / locality and are prohibited from nationwide branching, foreign exchange dealings, and direct clearing activities outside approved correspondent bank structures.",
        compliance_directive:
          "When responding to a Sponsor Bank DDQ from a Unit MFB (e.g., a Unit Tier-2 MFB), explicitly request confirmation from the Sponsor Bank that the partnership arrangement, nationwide digital customer geography, virtual account issuance, and product functions fall within the bank's subsisting Unit Tier-2 MFB permissions and any applicable CBN approvals—noting that a nationwide app does not itself expand a Unit MFB's licensed operating scope.",
      },
    ],
  },

  // =========================================================================
  // 3. TIERED KYC: BANK ACCOUNTS (2016) VS. MMO WALLETS (2021) + DEC 2023 BVN/NIN
  // =========================================================================
  {
    domain: "TIERED_KYC_BANK_VS_MMO_LIMITS",
    triggerRegex:
      /\b(?:tier[- ]?[123]|tiered\s+kyc|t-kyc|onboarding\s+control|cumulative\s+balance|daily\s+transaction\s+limit|single[- ]deposit\s+limit|bvn|nin\b|cdd\s+regulation)/i,
    provisions: [
      {
        id: "ref_cbn_bvn_nin_2023_circular",
        domain: "TIERED_KYC_BANK_VS_MMO_LIMITS",
        regulator: "CBN",
        instrument_title:
          "CBN Circular on Tier-1 Wallets and Accounts, Guidance Note & Profiling of Customers' Accounts and Wallets (1 December 2023) & CBN CDD Regulations 2023",
        instrument_number: "PSM/DIR/PUB/CIR/001/053",
        clause_reference: "Circular PSM/DIR/PUB/CIR/001/053 & CDD Regulations 2023 Regulation 16 & Section 11",
        verbatim_excerpt:
          "Effective 1 December 2023, all new and existing Tier 1 individual accounts and wallets require a validated BVN and/or NIN. Tiers 2 and 3 individual accounts and wallets require BOTH BVN and NIN, validated electronically against NIBSS/NIMC databases with discrepancy resolution prior to activation. Corporate and legal arrangements require full CDD under CBN Customer Due Diligence Regulations 2023.",
        compliance_directive:
          "Enforce zero 30-day BVN/NIN deferral, zero VIP verification waiver, and zero Tier-2/3 activation on BVN or NIN alone. Tier 1 requires validated BVN and/or NIN; Tiers 2 and 3 require BOTH BVN and NIN validated via NIBSS/NIMC processes before activation, with server-side limit enforcement and no support-agent override.",
      },
      {
        id: "ref_cbn_tkyc_2016_vs_mmo_2021_limits",
        domain: "TIERED_KYC_BANK_VS_MMO_LIMITS",
        regulator: "CBN",
        instrument_title:
          "CBN Circular on Review of Restrictions and Limits on Levels I and II of Tiered KYC Accounts (1 July 2016) vs. CBN Mobile Money Guidelines (July 2021) Section 16",
        instrument_number: "FPR/DIR/CIR/GEN/06/002 & PSM/DIR/GEN/CIR/01/009",
        clause_reference: "2016 Bank Account T-KYC Schedule vs. 2021 MMO Guidelines Section 16",
        verbatim_excerpt:
          "Under CBN Circular FPR/DIR/CIR/GEN/06/002 of 1 July 2016 (Bank Deposit Accounts): Tier 1 has a single deposit limit of ₦50,000 and cumulative balance limit of ₦300,000; Tier 2 has a single deposit limit of ₦100,000 and cumulative balance limit of ₦500,000; Tier 3 has no tier-imposed balance cap (subject to bank/channel risk limits, not 'unlimited transfers'). Under the July 2021 Mobile Money Guidelines Section 16 (MMO Wallets): Tier 1 has a daily cumulative transaction (outflow) limit of ₦50,000 and cumulative balance limit of ₦300,000; Tier 2 has a daily cumulative transaction limit of ₦200,000 and cumulative balance limit of ₦500,000; Tier 3 has a daily cumulative transaction limit of ₦5,000,000 and no tier-imposed cumulative balance cap.",
        compliance_directive:
          "NEVER lump Bank Deposit Account limits and MMO Wallet limits into a single generic table, and NEVER misdescribe the 2016 Bank Account single-deposit caps (₦50,000 for Tier 1; ₦100,000 for Tier 2) as daily transaction outflow limits. Always present a two-part Limit Matrix distinguishing Bank-Account Tiers 1–3 (1 July 2016 Circular FPR/DIR/CIR/GEN/06/002) from MMO Wallet Tiers 1–3 (July 2021 MMO Guidelines Section 16).",
      },
    ],
  },

  // =========================================================================
  // 4. NDPA 2023, NDPC GAID 2025 (31 MARCH CAR) & CBN 2026 DATA LOCALISATION
  // =========================================================================
  {
    domain: "NDPA_GAID_AND_DATA_LOCALISATION",
    triggerRegex:
      /\b(?:ndpa|ndpc|dpo\b|data\s+protection|compliance\s+audit\s+(?:return|report)|\bcar\b|dpco|cross[- ]?border\s+(?:data\s+)?transfer|data\s+locali[sz]ation|gaid|(?:offshore|cloud)\s+hosting|data\s+residency|aws|gcp|azure)\b/i,
    provisions: [
      {
        id: "ref_ndpa_2023_and_gaid_2025",
        domain: "NDPA_GAID_AND_DATA_LOCALISATION",
        regulator: "NDPC",
        instrument_title:
          "Nigeria Data Protection Act (NDPA) 2023 & NDPC General Application and Implementation Directive (GAID) 2025",
        instrument_number: "NDPA 2023 & NDPC/GAID/2025 (20 March 2025)",
        clause_reference:
          "NDPA 2023 Sections 24–29, 32, 40, 41–44 & NDPC GAID 2025 Articles 8–10 & 45",
        verbatim_excerpt:
          "NDPA Sections 24–28 govern lawful processing, explicit unbundled consent, and DPIAs; Section 29 mandates written processor contracts; Section 32 governs DPO designation; Section 40 requires NDPC notification within 72 hours of awareness of a reportable personal data breach; Sections 41–43 and GAID Article 45 govern cross-border data transfers; Section 44 and GAID Articles 8–10 govern registration of Data Controllers/Processors of Major Importance (DCPMIs) and annual Compliance Audit Returns (CAR). Under GAID 2025 Article 10, the statutory annual CAR filing deadline is 31 March for entities established before 12 June 2023, and within an initial 15-month period for entities established after 12 June 2023 followed by annual filing by 31 March.",
        compliance_directive:
          "CRITICAL DEADLINE ACCURACY: Under NDPC GAID 2025 Article 10, the annual Compliance Audit Return (CAR) filing deadline is 31 March (or initial 15-month period for post-12 June 2023 entities, then 31 March annually)—NOT the old repealed NDPR 2019 date of 15 March. Never certify that a DPO is appointed, registered, or that a CAR has been filed unless actual evidence (appointment letter, NDPC registration receipt, audit report, CAR acknowledgement) is provided; otherwise state that those records have not been supplied and list the required evidence pack.",
      },
      {
        id: "ref_cbn_2026_data_localisation",
        domain: "NDPA_GAID_AND_DATA_LOCALISATION",
        regulator: "CBN",
        instrument_title:
          "CBN Circular on Introduction of Market Structure Requirements, Data Localisation, Ultimate Beneficial Ownership Disclosure, and Systemic Oversight Measures in the Nigeria Payments System (15 June 2026) & Updated FAQ (4 November 2026)",
        instrument_number: "PSM/DIR/PUB/CIR/001/2026",
        clause_reference: "Data Localisation Mandate (Compliance by 1 January 2027)",
        verbatim_excerpt:
          "All licensed Payment Service Providers and financial institutions operating in the Nigerian payments ecosystem must localise primary payment transaction processing and core customer payment databases within Nigeria, with full compliance mandatory by 1 January 2027.",
        compliance_directive:
          "Address CBN payment-data localisation separately from NDPA cross-border transfer rules. Cite the CBN 15 June 2026 Market Structure & Data Localisation Circular and 4 November 2026 FAQ (compliance deadline: 1 January 2027), and note that an offshore-only (non-Nigerian) cloud hosting architecture is not a demonstrated compliant arrangement without a Nigerian hosting/localisation migration plan and independent validation.",
      },
    ],
  },

  // =========================================================================
  // 5. NFIU & AML/CFT/CPF STATUTORY THRESHOLDS & TIMELINES (MLPPA 2022)
  // =========================================================================
  {
    domain: "NFIU_MLPPA_REPORTING",
    triggerRegex:
      /\b(?:nfiu|mlppa|money\s+laundering|aml|cft|cpf|\bctr\b|\bstr\b|\bsar\b|currency\s+transaction\s+report|suspicious\s+transaction\s+report|goaml|statutory\s+threshold)\b/i,
    provisions: [
      {
        id: "ref_nfiu_mlppa_2022_s3_s7_s8_s11",
        domain: "NFIU_MLPPA_REPORTING",
        regulator: "NFIU",
        instrument_title:
          "Money Laundering (Prevention and Prohibition) Act (MLPPA) 2022, CBN AML/CFT/CPF Regulations 2022 & NFIU 2024 STR Guidelines",
        instrument_number: "MLPPA 2022",
        clause_reference: "MLPPA 2022 Sections 3(1), 7, 8 & 11; CBN AML Regulations 2022",
        verbatim_excerpt:
          "Section 11 (CTR / Statutory Threshold Report): Any single transaction, lodgement, or transfer in excess of ₦5,000,000 for an individual or ₦10,000,000 for a body corporate must be reported to the NFIU within 7 days. Section 7 & NFIU 2024 STR Guidelines: Where a transaction (completed or attempted, regardless of monetary value) involves reasonable grounds for suspicion, the financial institution must file an STR with the NFIU immediately and within 24 hours. Section 3(1): Any transfer to or from a foreign country exceeding USD 10,000 or its equivalent must be reported within 1 day (24 hours). Section 8: Mandatory retention of customer identification and transaction records for at least 5 years.",
        compliance_directive:
          "Include all three NFIU statutory reporting tracks in a clear table: (1) CTR / Statutory Threshold Report (MLPPA Section 11: >₦5M individual / >₦10M corporate within 7 days — explicitly note that Section 11 covers transactions, lodgements, and electronic transfers, so it must NOT be configured for physical cash alone); (2) STR / SAR (MLPPA Section 7 & NFIU 2024 STR Guidance: reasonable grounds for suspicion, NO minimum monetary threshold, covers attempted/incomplete transactions, immediate reporting within 24 hours via goAML, strictly no month-end batching and no VIP exemptions); (3) International Funds Transfer Report (MLPPA Section 3(1): >USD 10,000 or equivalent to/from a foreign country within 1 day).",
      },
    ],
  },

  // =========================================================================
  // 6. CBN CYBERSECURITY FRAMEWORK, VAPT & 6-HOUR VS. 24-HOUR REPORTING
  // =========================================================================
  {
    domain: "CBN_CYBERSECURITY_AND_VAPT",
    triggerRegex:
      /\b(?:cybersecurity|vapt|penetration\s+test|vulnerability\s+assessment|incident\s+reporting|ciso\b|ngcert|bsd\/dir\/gen\/lab\/11\/25|self[- ]assessment)\b/i,
    provisions: [
      {
        id: "ref_cbn_psp_cyber_framework_2018",
        domain: "CBN_CYBERSECURITY_AND_VAPT",
        regulator: "CBN",
        instrument_title:
          "CBN Risk-Based Cybersecurity Framework and Guidelines for Payment Service Providers (PSPs) (10 October 2018) & Nigerian Payments System Risk and Information Security Management Framework",
        instrument_number: "BSD/DIR/GEN/LAB/11/25",
        clause_reference: "Sections 2.4–2.9, 3.7, 3.9.3, Section 5.6 & Appendix VII",
        verbatim_excerpt:
          "CBN Circular BSD/DIR/GEN/LAB/11/25 of 10 October 2018 (PSP Cybersecurity Framework): Sections 2.4–2.9 prescribe Board oversight and appointment of an independent CISO; Section 3.7 requires consistent vulnerability and risk assessments; Section 3.9.3 requires annual cybersecurity self-assessment submission to the CBN by 31 March; operative Section 5.6 requires cyber-incident reporting no later than 24 hours after detection, whereas Appendix VII (Incident Reporting Template) refers to reporting within 6 hours. The Nigerian Payments System Risk and Information Security Management Framework mandates an annual information-security assessment including penetration and vulnerability testing.",
        compliance_directive:
          "Distinguish the PSP Cybersecurity Framework (CBN Circular BSD/DIR/GEN/LAB/11/25 of 10 October 2018) applicable to a PSP from the separate OFI Cybersecurity Framework applicable to an MFB sponsor bank, and do not treat the 2024 DMB/PSB exposure draft as an enacted replacement for PSPs. Highlight the drafting inconsistency in the 2018 PSP Framework between operative Section 5.6 (report no later than 24 hours after detection) and Appendix VII (incident template referring to 6 hours)—recommend adopting a 6-hour initial notification target internally followed by updates within the outer 24-hour window. Distinguish the statutory annual VAPT/self-assessment baseline (by 31 March under Section 3.9.3) from stronger internal commitments (such as quarterly vulnerability scans and annual/post-change pen-tests), and do not certify VAPT or CISO/self-assessment completion if reports/receipts were not supplied.",
      },
    ],
  },

  // =========================================================================
  // 7. SUB-MERCHANT KYB, DIGITAL LENDERS (DEON 2025) & CRYPTO/VASPs (DEC 2023)
  // =========================================================================
  {
    domain: "SUB_MERCHANT_KYB_DEON_VASP",
    triggerRegex:
      /\b(?:sub[- ]?merchant|agent\s+onboarding|unregistered\s+digital\s+lender|crypto|vasp\b|virtual\s+asset|payment\s+gateway\s+api|kyb\b|mcc\s+stacking|transaction\s+laundering|deon)\b/i,
    provisions: [
      {
        id: "ref_submerchant_aml_deon_vasp",
        domain: "SUB_MERCHANT_KYB_DEON_VASP",
        regulator: "CBN",
        instrument_title:
          "CBN AML/CFT/CPF Regulations 2022, FCCPC DEON Consumer Lending Regulations 2025 & CBN Guidelines on Operations of Bank Accounts for Virtual Asset Service Providers (VASPs) (December 2023)",
        instrument_number: "CBN AML Regs 2022 / FCCPC DEON 2025 / CBN VASP Guidelines Dec 2023",
        clause_reference:
          "CBN AML Regulations 19–29 & 37–40; FCCPC DEON Regulations 8 & 10–13; CBN VASP Guidelines 2023",
        verbatim_excerpt:
          "CBN AML Regulations 2022 Regulations 19–29 mandate verification of corporate identity, directors, beneficial owners (UBOs), source of funds, and risk classification; Regulations 37–40 govern ongoing monitoring and STR reporting. FCCPC Digital, Electronic, Online, or Non-Traditional (DEON) Consumer Lending Regulations 2025 Regulations 8 and 10–13 require scrutiny of lending permissions and partnerships before onboarding digital lenders. The CBN December 2023 VASP Account Guidelines permit regulated banking arrangements for SEC-licensed VASPs subject to strict conditions, but prohibit using ordinary retail-merchant gateway accounts as a substitute for regulatory authorisation.",
        compliance_directive:
          "State that production API activation requires verified CAC records, directors/controllers, UBOs, settlement-account name match, and activity-specific regulatory permissions (never self-declared descriptions alone). Cite CBN AML Regulations 19–29 and 37–40, FCCPC DEON Consumer Lending Regulations 2025 Regulations 8 and 10–13 (requiring digital lenders to show underlying lending authority + FCCPC registration/approval or a documented legal exemption), and the CBN December 2023 VASP Guidelines (clarifying that prohibiting crypto/FX merchants unless Legal, Compliance, and the Sponsor Bank approve a documented permitted-use model is a prudent risk policy, not a misstatement that all virtual-asset activity is universally illegal in Nigeria).",
      },
    ],
  },

  // =========================================================================
  // 8. CBN GUIDE TO CHARGES PART 2(A) & DETERMINISTIC KFS / APR RULES
  // =========================================================================
  {
    domain: "CBN_GUIDE_TO_CHARGES_AND_KFS",
    triggerRegex:
      /\b(?:guide\s+to\s+charges|part\s+2\s*\(?a\)?|default\s+interest|late\s+(?:payment\s+)?penalty|rollover\s+fee|drip\s+pricing|key\s+facts\s+statement|\bkfs\b|effective\s+apr)\b/i,
    provisions: [
      {
        id: "ref_cbn_guide_to_charges_part_2a",
        domain: "CBN_GUIDE_TO_CHARGES_AND_KFS",
        regulator: "CBN",
        instrument_title:
          "CBN Guide to Charges by Banks, Other Financial and Non-Bank Financial Institutions (2020 / April 2026)",
        instrument_number: "FPR/DIR/GEN/CIR/07/042",
        clause_reference: "Part 2(A) (Lending Rates, Management Fees & Default Interest Cap)",
        verbatim_excerpt:
          "Part 2(A) caps default/late payment interest on credit facilities at 1% flat per month on the unpaid principal amount in default only, without daily compounding, and regulates upfront management/processing charges.",
        compliance_directive:
          "Cite CBN Guide to Charges Part 2(A) when evaluating credit facility fees, upfront management charges, and default/late-payment interest (strictly capped at 1% flat per month on unpaid principal only—never daily compounding).",
      },
    ],
  },
];

export class StatutoryReferenceMatrixService {
  /**
   * Scans the user's prompt and any extracted asset text to deterministically return
   * all applicable high-precision Nigerian statutory provisions and compliance directives.
   */
  public extractApplicableProvisions(text: string): StatutoryReferenceProvision[] {
    if (!text || !text.trim()) return [];
    const matched: StatutoryReferenceProvision[] = [];
    const seenIds = new Set<string>();

    for (const entry of STATUTORY_REFERENCE_CATALOG) {
      if (entry.triggerRegex.test(text)) {
        for (const prov of entry.provisions) {
          if (!seenIds.has(prov.id)) {
            seenIds.add(prov.id);
            matched.push(prov);
          }
        }
      }
    }

    return matched;
  }
}

export const statutoryReferenceMatrix = new StatutoryReferenceMatrixService();
