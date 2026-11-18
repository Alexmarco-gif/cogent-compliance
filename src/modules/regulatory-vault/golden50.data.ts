/**
 * Cogent Marketing Shield - Golden 50 Statutory Corpus Definitions
 * Document Reference: Document 05 (Section 3.1) & Document 08 (Phase 5)
 */

export interface SeedRegulatoryBody {
  name: string;
  acronym: "CBN" | "FCCPC" | "ARCON" | "NDPC" | "SEC";
  description: string;
  official_domain: string;
}

export interface SeedRegulatoryInstrument {
  regulatorAcronym: "CBN" | "FCCPC" | "ARCON" | "NDPC" | "SEC";
  title: string;
  instrument_type: "ACT" | "REGULATION" | "GUIDELINE" | "CIRCULAR" | "CODE" | "DIRECTIVE" | "NOTICE";
  instrument_number: string;
  description: string;
  publication_date: string;
  effective_date: string;
  source_url: string;
  document_hash: string;
  clauses?: SeedRegulatoryClause[];
}

export interface SeedRegulatoryClause {
  clause_reference: string;
  clause_text: string;
  page_number: number;
  obligations?: SeedRegulatoryObligation[];
}

export interface SeedRegulatoryObligation {
  obligation_text: string;
  obligation_type: "PRESCRIPTIVE" | "PROHIBITIVE" | "DISCLOSURE" | "PROCEDURAL" | "RESTRICTION";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  applicability_description: string;
  institution_type?: string;
  product_type?: string;
  channel?: string;
}

export interface SeedProhibitedTerm {
  term: string;
  normalized_term: string;
  category: string;
  reason: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  source_type: "STATUTORY";
  matching_mode: "EXACT" | "PHRASE" | "REGEX";
}

export const REGULATORY_BODIES: SeedRegulatoryBody[] = [
  {
    name: "Central Bank of Nigeria",
    acronym: "CBN",
    description: "Apex monetary authority and prudential regulator for commercial banks, MFBs, PSBs, MMOs, and payment systems in Nigeria.",
    official_domain: "cbn.gov.ng",
  },
  {
    name: "Federal Competition and Consumer Protection Commission",
    acronym: "FCCPC",
    description: "National statutory authority for competition and consumer rights enforcement, false advertising prohibition, and digital lender registration.",
    official_domain: "fccpc.gov.ng",
  },
  {
    name: "Advertising Regulatory Council of Nigeria",
    acronym: "ARCON",
    description: "Statutory council governing all advertising, marketing communications, and promotional exposure in Nigeria including ASP pre-vetting.",
    official_domain: "arcon.gov.ng",
  },
  {
    name: "Nigeria Data Protection Commission",
    acronym: "NDPC",
    description: "National privacy authority enforcing the Nigeria Data Protection Act (NDPA) 2023, direct marketing consent, and tracking regulations.",
    official_domain: "ndpc.gov.ng",
  },
  {
    name: "Securities and Exchange Commission",
    acronym: "SEC",
    description: "Apex regulatory body for Nigerian capital markets, investments, collective investment schemes, robo-advisors, and digital asset VASPs.",
    official_domain: "sec.gov.ng",
  },
];

export const GOLDEN_50_INSTRUMENTS: SeedRegulatoryInstrument[] = [
  // ==========================================
  // CBN (14 Instruments)
  // ==========================================
  {
    regulatorAcronym: "CBN",
    title: "Consumer Protection Framework (CPF) & Consumer Protection Regulations 2019",
    instrument_type: "REGULATION",
    instrument_number: "CBN/CPD/DIR/REG/01/001",
    description: "Establishes fair treatment, full transparency, mandatory APR and KFS Annexure A disclosure, prior CPD advertising notification (Reg. 4.2.9), 2-day draft contract review (Reg. 4.3.5), 3-working-day cooling-off right (Reg. 4.3.6), 3-day default grace period (Reg. 4.6(b)), and prohibition of compulsory unquoted insurance (Regs. 4.5.1(g), 5.2.6).",
    publication_date: "2019-12-20",
    effective_date: "2020-01-01",
    source_url: "https://cbn.gov.ng/documents/consumerprotectionframework.html",
    document_hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    clauses: [
      {
        clause_reference: "Part 4, Regulations 4.2.1–4.2.9 & 4.3.4–4.3.6 (Annexure A KFS)",
        clause_text: "All advertisements for financial products and credit facilities shall disclose all fees, charges, penalties, and the true Annual Percentage Rate (APR) in a clear and conspicuous manner (min font size 10, Reg. 4.2.5(a)–(e)), shall not name the CBN beyond stating regulatory status (Reg. 4.2.4), and shall be notified prior to publication to the Director, Consumer Protection Department (Reg. 4.2.9). Pre-contractual Key Facts Statements (KFS, Reg. 4.3.4 & Annexure A) must precede a minimum 2-working-day contract review period (Reg. 4.3.5) and a 3-working-day post-execution cooling-off cancellation right (Reg. 4.3.6).",
        page_number: 14,
        obligations: [
          {
            obligation_text: "Promotional marketing must clearly disclose APR, total cost of credit, and all administrative fees without hiding charges in asterisks, notify CBN CPD under Reg. 4.2.9, and provide a compliant Annexure A KFS.",
            obligation_type: "DISCLOSURE",
            severity: "CRITICAL",
            applicability_description: "Applies to all loan, credit, and consumer lending advertisements across all media.",
            institution_type: "ALL",
            product_type: "DIGITAL_LENDING",
          },
        ],
      },
      {
        clause_reference: "Regulations 3.2.2, 4.5.1(g), 4.6(b)–(c), 5.1.9 & 5.2.6",
        clause_text: "Financial institutions shall strictly comply with the CBN Guide to Charges (Reg. 3.2.2), shall not bundle compulsory credit-life insurance without borrower provider choice and written quote (Regs. 4.5.1(g), 5.1.9, 5.2.6), and shall grant a mandatory 3-day grace period and first-day default notice before applying any permitted default charge solely to the unpaid overdue amount (Reg. 4.6(b)–(c)).",
        page_number: 18,
        obligations: [
          {
            obligation_text: "Prohibits compulsory unquoted upfront insurance deductions and requires a 3-day grace period before non-compounding default charges.",
            obligation_type: "PROHIBITIVE",
            severity: "CRITICAL",
            applicability_description: "Applies to all consumer credit facilities, microfinance loans, and digital lending products.",
            institution_type: "ALL",
            product_type: "DIGITAL_LENDING",
          },
        ],
      },
      {
        clause_reference: "Regulations 6.2.2, 6.3.2, 6.3.7–6.3.17 & 7",
        clause_text:
          "Regulations 6.2.2 & 6.3.2 require complaint acknowledgement within 24 hours with a unique tracking reference, owner, and timeline. Regulations 6.3.7–6.3.11 mandate full refund with applicable interest, formal apology, and Summary Resolution Communication (SRC) by the next business day after resolution. Regulations 6.3.15–6.3.17 require quarterly root-cause reporting to the CBN. Regulation 7 and BOFIA 2020 strictly prohibit false, misleading, or unverified regulatory returns.",
        page_number: 28,
      },
    ],
  },
  {
    regulatorAcronym: "CBN",
    title: "Guidelines on Operations of Electronic Payment Channels & Instant EFT Regulation",
    instrument_type: "GUIDELINE",
    instrument_number: "BPS/DIR/GEN/CIR/01/014",
    description: "Operational standards for electronic payment systems, NIP Instant EFT reversal clocks, and unauthorised debit rules.",
    publication_date: "2020-05-11",
    effective_date: "2020-06-01",
    source_url: "https://cbn.gov.ng/documents/electronicpaymentchannels.html",
    document_hash: "a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0",
    clauses: [
      {
        clause_reference: "Section 3.1.4",
        clause_text: "Electronic payment channel providers must display explicit customer fraud advisories and transaction dispute mechanisms on all consumer-facing electronic interfaces and marketing materials.",
        page_number: 8,
        obligations: [
          {
            obligation_text: "Promotional materials for electronic payment apps must include customer fraud advisories and helpline contact.",
            obligation_type: "DISCLOSURE",
            severity: "HIGH",
            applicability_description: "Applies to e-payment, wallet, and card promotion campaigns.",
            product_type: "PAYMENTS",
          },
        ],
      },
      {
        clause_reference: "Instant EFT Regulation 2018 Sections 5.1(13), 5.2(8), 5.2(9), 5.3(2)–(4), 10.1.2 & 11; Cybercrimes Act Section 37(3)",
        clause_text:
          "Instant EFT Regulation 2018 Section 5.2(8) mandates refund within 10 minutes where failed transfer proceeds are returned by the receiving institution; Section 5.2(9) mandates refund within 1 hour after the next settlement closure where the sender cannot process; Sections 5.3(2)–(4) require inward NIP credit within 60 seconds (exceptions not exceeding 24 hours); Section 10.1.2 sets a 3-working-day general dispute window; Section 11 sanctions failure to reverse a failed NIP transfer within 24 hours (₦10,000 penalty per item); Section 5.1(13) requires daily fraud returns to NIBSS. Separately, Cybercrimes (Prohibition, Prevention, etc.) Act 2015 Section 37(3) requires a financial institution, upon written customer notification of an unauthorised debit, to provide clear legal authorisation or reverse the debit within 72 hours (carrying a ₦5,000,000 fine on conviction).",
        page_number: 15,
      },
    ],
  },
  {
    regulatorAcronym: "CBN",
    title: "Regulatory Framework for Mobile Money Services in Nigeria",
    instrument_type: "REGULATION",
    instrument_number: "BPS/DIR/GEN/CIR/02/003",
    description: "Prudential and marketing rules for mobile money operators, Section 9 Nominee Accounts, and Section 16 MMO wallet limits.",
    publication_date: "2021-07-09",
    effective_date: "2021-08-01",
    source_url: "https://cbn.gov.ng/documents/mobilemoneyservices.html",
    document_hash: "b2c3d4e5f6a7890123456789abcdef0123456789abcdef0123456789abcdef01",
    clauses: [
      {
        clause_reference: "BOFIA 2020 Sections 2, 58 & 59 / CBN Licence Categorisation 2021 (PSSP vs. MMO)",
        clause_text: "Under BOFIA 2020 Sections 2 and 58 and the CBN New Licence Categorisation Requirements (2021) alongside the CBN Guidelines for Payments Service Holding Companies (PSHC) 2021 Section 3.1.2, a Payment Solution Service Provider (PSSP — ₦100,000,000 minimum capital) is strictly restricted to payment processing, switching, and gateway services and is prohibited from holding customer funds, issuing stored-value consumer wallets, sweeping virtual NUBAN inflows into a Master Corporate Account, or originating loans. Issuing consumer e-money wallets requires a Mobile Money Operator (MMO) license (₦2,000,000,000 minimum capital).",
        page_number: 4,
        obligations: [
          {
            obligation_text: "PSSP licensees are prohibited from holding customer deposits, operating stored-value P2P consumer wallets, or sweeping virtual account funds into corporate accounts.",
            obligation_type: "PROHIBITIVE",
            severity: "CRITICAL",
            applicability_description: "Applies to all Payment Solution Service Providers (PSSPs) and payment gateways in Nigeria.",
            institution_type: "PSSP",
            product_type: "PAYMENTS",
          },
        ],
      },
      {
        clause_reference: "Sections 7.2.1, 7.4(g), Section 9 (Nominee Accounts) & Section 16 (MMO Wallet Limits)",
        clause_text:
          "Section 7.2.1 reserves wallet creation, e-money issuance, and pool management exclusively to licensed MMOs (not PSSPs). Section 7.4(g) mandates separate corporate business accounts from customer funds. Section 9 requires customer float to be held in non-interest-bearing Nominee Accounts at designated DMBs with no right of set-off, settlement-only debits, no collateralisation, 100% backing of outstanding e-money liabilities, and daily reconciliation. Section 16 sets MMO Wallet limits: Tier 1 (₦50,000 daily outflow / ₦300,000 cumulative balance), Tier 2 (₦200,000 daily outflow / ₦500,000 cumulative balance), and Tier 3 (₦5,000,000 daily outflow / no tier-imposed balance cap).",
        page_number: 19,
      },
    ],
  },
  {
    regulatorAcronym: "CBN",
    title: "Guidelines for Licensing and Regulation of Payment Service Banks (PSBs)",
    instrument_type: "GUIDELINE",
    instrument_number: "FPR/DIR/GEN/CIR/07/018",
    description: "Regulatory parameters for PSBs including permissible promotional activities and restrictions on lending.",
    publication_date: "2020-08-27",
    effective_date: "2020-09-01",
    source_url: "https://cbn.gov.ng/documents/psbguidelines.html",
    document_hash: "c3d4e5f6a7b890123456789abcdef0123456789abcdef0123456789abcdef012",
  },
  {
    regulatorAcronym: "CBN",
    title: "Revised Regulatory and Supervisory Guidelines for Microfinance Banks in Nigeria",
    instrument_type: "GUIDELINE",
    instrument_number: "OFISD/DIR/CIR/GEN/18/022",
    description: "Capital requirements, Unit/State MFB geographical boundaries, credit underwriting rules, and NDIC MFB deposit insurance coverage (₦2,000,000 per depositor following the 2024 upward revision).",
    publication_date: "2020-04-29",
    effective_date: "2020-05-01",
    source_url: "https://cbn.gov.ng/documents/mfbguidelines.html",
    document_hash: "d4e5f6a7b8c90123456789abcdef0123456789abcdef0123456789abcdef0123",
    clauses: [
      {
        clause_reference: "Sections 2.1, 4.1 & 5.3 (Geographic Scope & NDIC Coverage)",
        clause_text: "A Unit Microfinance Bank is restricted to operating within its licensed local government area/state and shall not solicit universal nationwide retail credit ('for all Nigerians') or nationwide operations without a National MFB license (and a nationwide digital app does not expand a Unit MFB's licensed geographic scope). No MFB shall represent that deposits or loans carry unconditional sovereign guarantees; NDIC deposit insurance covers eligible MFB deposits up to ₦2,000,000 per depositor (and does not cover loans or borrower credit-life insurance fees).",
        page_number: 22,
        obligations: [
          {
            obligation_text: "Unit/State MFBs must qualify geographic eligibility to their licensed territory and must not misapply NDIC deposit insurance to credit products.",
            obligation_type: "PROHIBITIVE",
            severity: "CRITICAL",
            applicability_description: "Applies to microfinance banks and fintechs partnering with Unit/State MFBs promoting deposit or credit products.",
            institution_type: "MFB",
            product_type: "SAVINGS_DEPOSIT",
          },
        ],
      },
      {
        clause_reference: "Section 2.1 & Section 5.1 (Unit MFB Geographic Restriction)",
        clause_text: "A Unit Microfinance Bank (Tier 1 or Tier 2 Unit MFB) is authorized to operate strictly within a single Local Government Area (LGA) and is prohibited from opening branches, soliciting retail deposits, or powering nationwide digital banking operations outside its licensed geographical boundary. Nationwide operations across all 36 states require a National Microfinance Bank license (₦5,000,000,000 minimum capital) or Commercial Bank license.",
        page_number: 5,
        obligations: [
          {
            obligation_text: "Unit MFBs (Tier 1 and Tier 2) and State MFBs cannot power nationwide retail deposit-taking or lending apps outside their licensed LGA/State.",
            obligation_type: "RESTRICTION",
            severity: "CRITICAL",
            applicability_description: "Applies to Unit and State Microfinance Banks and fintech BaaS partnerships.",
            institution_type: "MFB",
            product_type: "SAVINGS_DEPOSIT",
          },
        ],
      },
    ],
  },
  {
    regulatorAcronym: "CBN",
    title: "Guide to Charges by Banks, Other Financial and Non-Bank Financial Institutions (2020)",
    instrument_type: "GUIDELINE",
    instrument_number: "FPR/DIR/GEN/CIR/07/042",
    description: "Binding tariff ceilings on bank and MFB fees, including Part 2(A) Section 2.6 (1% max MFB processing/appraisal/management fee cap), Part 2(A) Section 2.5 & Footnote 3 (1% flat per month MFB penal rate cap after 3-day grace period), and Section 2.2 fee transparency.",
    publication_date: "2019-12-22",
    effective_date: "2020-01-01",
    source_url: "https://cbn.gov.ng/documents/guidetobankcharges.html",
    document_hash: "e5f6a7b8c9d0123456789abcdef0123456789abcdef0123456789abcdef01234",
    clauses: [
      {
        clause_reference: "Part 2(A), Sections 2.5 (Footnote 3, p. 30) & 2.6 (pp. 31–32)",
        clause_text: "For Microfinance Banks (Part 2(A)): (1) Processing, appraisal, and management fees on credit facilities are capped at a maximum of 1% of the principal amount disbursed, charged once per facility (Section 2.6, pp. 31–32); (2) Penal rate on overdue loans is capped at a maximum of 1% flat per month on the unpaid overdue amount after a mandatory 3-day grace period (Section 2.5 & Footnote 3, p. 30). Disclosing an unlawful 4% processing fee or 2% daily default fee in fine print or a KFS does not cure the statutory breach.",
        page_number: 30,
        obligations: [
          {
            obligation_text: "MFB processing/appraisal/management fees cannot exceed 1% of principal disbursed once per facility, and MFB default penalties cannot exceed 1% flat per month on unpaid balance after a 3-day grace period.",
            obligation_type: "PROHIBITIVE",
            severity: "CRITICAL",
            applicability_description: "Applies to all Microfinance Bank credit facilities and co-marketed fintech-MFB loan campaigns.",
            institution_type: "MFB",
            product_type: "DIGITAL_LENDING",
          },
        ],
      },
      {
        clause_reference: "Section 2.2 (Published Tariff Transparency)",
        clause_text: "Any tariff, fee, or service charge published in promotional literature that departs from or conceals mandatory standard rates constitutes an unfair trade practice subject to sanction.",
        page_number: 6,
      },
    ],
  },
  {
    regulatorAcronym: "CBN",
    title: "Circular on Fair Debt Collection Practices and Digital Lending Standards",
    instrument_type: "CIRCULAR",
    instrument_number: "CPD/DIR/GEN/CIR/01/008",
    description: "Strict prohibition on abusive recovery, contact scraping, defamatory messages, and harassing marketing calls.",
    publication_date: "2022-08-15",
    effective_date: "2022-09-01",
    source_url: "https://cbn.gov.ng/documents/fairdebtcollection.html",
    document_hash: "f6a7b8c9d0e123456789abcdef0123456789abcdef0123456789abcdef012345",
    clauses: [
      {
        clause_reference: "Paragraph 3",
        clause_text: "Digital lenders and financial institutions are strictly prohibited from utilizing threatening, profane, harassing, or defamatory language in any customer communication, advertisement, or debt recovery correspondence.",
        page_number: 2,
        obligations: [
          {
            obligation_text: "Complete prohibition of threatening, defamatory, or harassing language in debt or promotional messaging.",
            obligation_type: "PROHIBITIVE",
            severity: "CRITICAL",
            applicability_description: "Applies to digital lenders and microfinance credit institutions.",
            product_type: "DIGITAL_LENDING",
          },
        ],
      },
    ],
  },
  {
    regulatorAcronym: "CBN",
    title: "Directives on Mandatory Licensing Disclosures & NDIC Deposit Insurance Representations",
    instrument_type: "DIRECTIVE",
    instrument_number: "FPR/DIR/GEN/CIR/06/015",
    description: "Requires financial institutions to display licensed corporate name and NDIC coverage limits accurately.",
    publication_date: "2021-03-12",
    effective_date: "2021-04-01",
    source_url: "https://cbn.gov.ng/documents/licensingdisclosures.html",
    document_hash: "a7b8c9d0e1f23456789abcdef0123456789abcdef0123456789abcdef0123456",
    clauses: [
      {
        clause_reference: "BOFIA 2020 Section 59 & NDIC Act 2023 Section 21 (2024 Revised Coverage Limits)",
        clause_text: "Under BOFIA 2020 Section 59, no person or fintech holding a PSSP license shall use the word 'Bank' or 'Digital Bank' in its promotional description. Under the NDIC Act 2023 and May 2024 Revised NDIC Coverage Limits, deposit insurance covers up to ₦2,000,000 per depositor for Microfinance Banks (MFBs) and ₦5,000,000 per depositor for Deposit Money Banks (DMBs) and PSBs, attaching strictly to deposits domiciled in the licensed bank's ledger and never to funds swept into a corporate account or commercial paper pool.",
        page_number: 3,
        obligations: [
          {
            obligation_text: "Non-bank fintechs/PSSPs must not claim to be a 'Licensed Digital Bank' or make unqualified NDIC insurance representations; MFB deposit insurance is capped at ₦2,000,000 per depositor.",
            obligation_type: "DISCLOSURE",
            severity: "CRITICAL",
            applicability_description: "Applies to all fintechs, PSSPs, MFBs, and banking partnerships in Nigeria.",
          },
        ],
      },
    ],
  },
  {
    regulatorAcronym: "CBN",
    title: "AML/CFT/CPF Customer Onboarding, Tiered KYC & NFIU Reporting Rules",
    instrument_type: "REGULATION",
    instrument_number: "FPR/DIR/GEN/CIR/07/033",
    description: "Tiered KYC bank vs MMO limits (2016/2023), CDD Regulations 2023, and MLPPA 2022 NFIU CTR/STR reporting rules.",
    publication_date: "2022-01-14",
    effective_date: "2022-02-01",
    source_url: "https://cbn.gov.ng/documents/amlcftregulations.html",
    document_hash: "b8c9d0e1f2a3456789abcdef0123456789abcdef0123456789abcdef01234567",
    clauses: [
      {
        clause_reference: "CBN Circular PSM/DIR/PUB/CIR/001/053 (1 Dec 2023) & CBN CDD Regulations 2023 Reg. 16",
        clause_text: "Pursuant to CBN Circular PSM/DIR/PUB/CIR/001/053 dated 1 December 2023, all Tier-1 accounts and wallets for individuals must have a validated Bank Verification Number (BVN) and/or National Identification Number (NIN) verified electronically with facial biometrics at onboarding; zero-BVN/NIN account opening or 30-day deferral is strictly prohibited. Statutory Three-Tiered KYC limits are: Tier 1 (BVN or NIN: ₦50,000 single/daily transaction limit and ₦300,000 cumulative balance limit); Tier 2 (BVN and NIN: ₦100,000 single deposit, ₦200,000 daily transaction limit, and ₦500,000 cumulative balance limit); Tier 3 (BVN and NIN + verified address + Enhanced CDD: ₦5,000,000 daily transaction limit and mandatory NFIU Currency Transaction Report [CTR] filing at ₦5,000,000 for individuals under MLPPA 2022 Sections 2–7 & 12).",
        page_number: 4,
        obligations: [
          {
            obligation_text: "Mandatory BVN or NIN validation at onboarding for Tier 1 (₦50k/day, ₦300k balance) and both BVN and NIN for Tier 2/3; deferring BVN/NIN or offering unlimited unmonitored wallet balances is prohibited.",
            obligation_type: "PRESCRIPTIVE",
            severity: "CRITICAL",
            applicability_description: "Applies to all customer onboarding, digital wallets, and virtual NUBAN issuance in Nigeria.",
          },
        ],
      },
      {
        clause_reference: "Circular PSM/DIR/PUB/CIR/001/053 (1 Dec 2023), Circular FPR/DIR/CIR/GEN/06/002 (1 July 2016), CDD Regs 2023 Reg 16 & MLPPA 2022 Sections 3(1), 7, 8 & 11",
        clause_text:
          "Under CBN Circular PSM/DIR/PUB/CIR/001/053 (1 Dec 2023) and CDD Regulations 2023 Regulation 16, Tier 1 requires validated BVN and/or NIN, while Tiers 2 and 3 require BOTH BVN and NIN. Under the 1 July 2016 Bank Account Circular (FPR/DIR/CIR/GEN/06/002), Tier 1 has a ₦50,000 single-deposit limit and ₦300,000 cumulative balance cap, and Tier 2 has a ₦100,000 single-deposit limit and ₦500,000 cumulative balance cap (distinct from July 2021 MMO Wallet daily outflow limits of ₦50,000 / ₦200,000 / ₦5,000,000 under Section 16). Under MLPPA 2022: Section 11 mandates CTR filing within 7 days for transactions/lodgements/transfers exceeding ₦5M (individual) or ₦10M (corporate); Section 7 & NFIU 2024 STR Guidance mandate immediate STR filing within 24 hours upon reasonable suspicion (no monetary threshold, includes attempted transactions); Section 3(1) mandates reporting international transfers exceeding USD 10,000 within 1 day; Section 8 mandates 5-year record retention.",
        page_number: 11,
      },
    ],
  },
  {
    regulatorAcronym: "CBN",
    title: "Risk-Based Cybersecurity Framework for PSPs & OFIs (BSD/DIR/GEN/LAB/11/25)",
    instrument_type: "DIRECTIVE",
    instrument_number: "BSD/DIR/GEN/CIR/11/010",
    description: "PSP Cybersecurity governance (Sections 2.4–2.9), VAPT (Section 3.7), 31 March self-assessment (Section 3.9.3), and 24h vs 6h incident reporting (Section 5.6 & Appendix VII).",
    publication_date: "2022-11-01",
    effective_date: "2023-01-01",
    source_url: "https://cbn.gov.ng/documents/cybersecurityframework.html",
    document_hash: "c9d0e1f2a3b456789abcdef0123456789abcdef0123456789abcdef012345678",
    clauses: [
      {
        clause_reference: "Circular BSD/DIR/GEN/LAB/11/25 (10 Oct 2018) Sections 2.4–2.9, 3.7, 3.9.3, Section 5.6 & Appendix VII",
        clause_text:
          "Sections 2.4–2.9 require Board oversight and an independent CISO; Section 3.7 and the NPS Risk and Information Security Management Framework mandate regular vulnerability and penetration testing (annual statutory baseline); Section 3.9.3 mandates annual cybersecurity self-assessment submission by 31 March; operative Section 5.6 requires cyber-incident reporting to CBN no later than 24 hours after detection, while Appendix VII refers to an initial 6-hour notification window.",
        page_number: 18,
      },
    ],
  },
  {
    regulatorAcronym: "CBN",
    title: "Regulatory Framework for Open Banking in Nigeria",
    instrument_type: "REGULATION",
    instrument_number: "PSM/DIR/GEN/CIR/01/022",
    description: "Standards for API data sharing, banking consent management, and customer disclosure in fintech collaborations.",
    publication_date: "2021-02-17",
    effective_date: "2021-03-01",
    source_url: "https://cbn.gov.ng/documents/openbankingframework.html",
    document_hash: "d0e1f2a3b4c56789abcdef0123456789abcdef0123456789abcdef0123456789",
  },
  {
    regulatorAcronym: "CBN",
    title: "Operational Guidelines for Open Banking & Customer Consent Presentation",
    instrument_type: "GUIDELINE",
    instrument_number: "PSM/DIR/PUB/CIR/02/001",
    description: "Mandatory format for consent request screens and co-promoted open banking services.",
    publication_date: "2023-03-07",
    effective_date: "2023-04-01",
    source_url: "https://cbn.gov.ng/documents/openbankingguidelines.html",
    document_hash: "e1f2a3b4c5d6789abcdef0123456789abcdef0123456789abcdef0123456789a",
  },
  {
    regulatorAcronym: "CBN",
    title: "Guidelines on Point of Sale (POS) Card Accepting Services & Terminal Marketing",
    instrument_type: "GUIDELINE",
    instrument_number: "BPS/DIR/GEN/CIR/02/007",
    description: "Standards on merchant POS acquisition, surcharge transparency, and receipt branding.",
    publication_date: "2021-09-14",
    effective_date: "2021-10-01",
    source_url: "https://cbn.gov.ng/documents/posguidelines.html",
    document_hash: "f2a3b4c5d6e789abcdef0123456789abcdef0123456789abcdef0123456789ab",
    clauses: [
      {
        clause_reference: "CBN Circular PSS/DIR/PUB/CIR/001/004 (15 June 2026) & Section 4.4 (Payment Data Localisation)",
        clause_text: "All domestic payment transaction data, switching records, and customer KYC files generated by licensed Payment Service Providers and financial institutions in Nigeria must be stored and processed in-country within sovereign data centers physically located in Nigeria (compliance deadline 1 January 2027). Exclusive hosting on foreign cloud regions (such as AWS US-East Virginia or AWS Africa Cape Town) without primary in-country Nigerian residency is prohibited.",
        page_number: 11,
        obligations: [
          {
            obligation_text: "Mandatory primary in-country Nigerian data residency for all domestic payment transaction and KYC records.",
            obligation_type: "PRESCRIPTIVE",
            severity: "CRITICAL",
            applicability_description: "Applies to all CBN-licensed PSSPs, MMOs, MFBs, and payment processors.",
            product_type: "PAYMENTS",
          },
        ],
      },
    ],
  },
  {
    regulatorAcronym: "CBN",
    title: "Circular on Foreign Exchange Promotional Misrepresentation & Unapproved FX Schemes",
    instrument_type: "CIRCULAR",
    instrument_number: "TED/FEM/FPC/GEN/01/004",
    description: "Prohibition on advertising unapproved FX trading platforms, illegal remittances, and false naira conversion rates.",
    publication_date: "2023-02-28",
    effective_date: "2023-03-01",
    source_url: "https://cbn.gov.ng/documents/fxcircular.html",
    document_hash: "a3b4c5d6e7f8901abcdef0123456789abcdef0123456789abcdef0123456789b",
    clauses: [
      {
        clause_reference: "Foreign Exchange Act 1995 Sections 1, 5 & 6 / CBN Revised IMTO Guidelines 2024 Section 4.1",
        clause_text: "Under the Foreign Exchange (Monitoring and Miscellaneous Provisions) Act 1995 Sections 1, 5, and 6, only CBN-licensed Authorized Dealers (Commercial and Merchant Banks) may buy, sell, or convert foreign currency in Nigeria, strictly at official Nigerian Autonomous Foreign Exchange Market (NAFEM / EFEMS) rates. Under the CBN Revised IMTO Guidelines (January 2024), fintechs, PSSPs, and IMTOs are prohibited from conducting NGN-to-USD conversions, quoting parallel/peer exchange rates, or holding onshore retail USD wallet balances via offshore APIs.",
        page_number: 2,
        obligations: [
          {
            obligation_text: "Strict prohibition on in-app NGN-to-USD conversion at parallel/peer rates and offshore API USD wallet custody by non-Authorized Dealers.",
            obligation_type: "PROHIBITIVE",
            severity: "CRITICAL",
            applicability_description: "Applies to all Nigerian fintechs, PSSPs, MMOs, and remittance operators.",
          },
        ],
      },
    ],
  },

  // ==========================================
  // FCCPC (11 Instruments)
  // ==========================================
  {
    regulatorAcronym: "FCCPC",
    title: "Federal Competition and Consumer Protection Act (FCCPA) 2018",
    instrument_type: "ACT",
    instrument_number: "Act No. 1 of 2019",
    description: "Primary consumer protection statute prohibiting misleading advertising, false trade representations, and unfair contract terms.",
    publication_date: "2019-01-30",
    effective_date: "2019-02-01",
    source_url: "https://fccpc.gov.ng/laws/fccpa-2018/",
    document_hash: "b4c5d6e7f8a9012abcdef0123456789abcdef0123456789abcdef0123456789c",
    clauses: [
      {
        clause_reference: "Section 123(1)",
        clause_text: "No producer, importer, distributor, retailer or service provider shall make any false, misleading or deceptive representation concerning any material fact regarding goods or services, including the price, suitability, or terms of credit.",
        page_number: 45,
        obligations: [
          {
            obligation_text: "Service providers must not publish false, misleading, or deceptive representations regarding pricing or financial terms.",
            obligation_type: "PROHIBITIVE",
            severity: "CRITICAL",
            applicability_description: "Applies to all marketing communications and commercial representations across Nigeria.",
          },
        ],
      },
      {
        clause_reference: "Section 127",
        clause_text: "A supplier shall not advertise goods or services as being available at a specified price in a manner that may result in consumers being misled as to the actual availability or final total cost of such goods or services.",
        page_number: 48,
        obligations: [
          {
            obligation_text: "Bait advertising and hiding real product availability or total fees is strictly prohibited.",
            obligation_type: "PROHIBITIVE",
            severity: "HIGH",
            applicability_description: "Applies to promotional discounts, zero-rate claims, and limited-time offers.",
          },
        ],
      },
    ],
  },
  {
    regulatorAcronym: "FCCPC",
    title: "Digital, Electronic, Online, or Non-Traditional Consumer Lending Regulations (DEON Regulations 2025)",
    instrument_type: "REGULATION",
    instrument_number: "FCCPC/REG/DEON/2025/01",
    description: "Enacted 2025 FCCPC digital lending regulations governing lending partnerships (Regs. 8, 10–12), pre-disbursement pricing transparency (Reg. 17(1)), responsible marketing & lender-of-record disclosure (Reg. 19(a)–(c)), and administrative penalties up to ₦100,000,000 or 1% of turnover (Reg. 22).",
    publication_date: "2025-01-15",
    effective_date: "2025-02-01",
    source_url: "https://fccpc.gov.ng/regulations/digital-lending/",
    document_hash: "c5d6e7f8a9b0123abcdef0123456789abcdef0123456789abcdef0123456789d",
    clauses: [
      {
        clause_reference: "Regulations 8, 10–12, 17(1), 19(a)–(c) & 22",
        clause_text: "Every digital lending arrangement or fintech-MFB lending partnership requires prior FCCPC approval and filing of partnership agreements (Regs. 8, 10–12). Lenders must display all interest rates, fees, default charges, and calculation methods in plain, prominent language before application (Reg. 17(1)), must not use deceptive or unapproved marketing or omit the licensed lender's corporate identity (Reg. 19(a)–(c)), and face administrative sanctions up to ₦100,000,000 or 1% of turnover plus director disqualification for breaches (Reg. 22).",
        page_number: 5,
        obligations: [
          {
            obligation_text: "Digital lending campaigns must name the licensed lender of record, hold prior FCCPC lending-partnership approval (Regs. 8, 10–12), and prominently disclose all fees and APR pre-application (Reg. 17(1)).",
            obligation_type: "DISCLOSURE",
            severity: "CRITICAL",
            applicability_description: "Applies to all digital lending advertising, influencer promotions, and intake pages.",
            product_type: "DIGITAL_LENDING",
          },
        ],
      },
    ],
  },
  {
    regulatorAcronym: "FCCPC",
    title: "Sales Promotion Registration Rules & Draft Sales Promotion (Amended) Regulations 2026",
    instrument_type: "REGULATION",
    instrument_number: "FCCPC/REG/SP/2024/02",
    description: "Mandatory prior FCCPC registration of sales promotions and raffle draws (rules submitted at least 21 days prior to launch), clear disclosure of prize structure (single grand prize vs. prize pool), draw dates, qualifying criteria, 2-year record retention, and joint influencer liability (noting that the 2026 Amended Sales Promotion Regulations remain an exposure draft).",
    publication_date: "2024-03-15",
    effective_date: "2024-04-01",
    source_url: "https://fccpc.gov.ng/regulations/sales-promotions/",
    document_hash: "d6e7f8a9b0c1234abcdef0123456789abcdef0123456789abcdef0123456789e",
    clauses: [
      {
        clause_reference: "Sales Promotion Registration Rules (21-Day Prior Filing) & Regulations 32–33",
        clause_text: "Any promoter running a prize draw, sweepstake, or cash raffle shall submit complete promotion rules and prize substantiation to the FCCPC at least 21 days before the promotion starts, obtain applicable National/State Lotteries and Gaming Authority permits, clearly state whether an advertised cash figure is a single grand prize or a shared prize pool along with draw dates and exclusions, and retain complete award records for at least 2 years. Brand ambassadors and influencers are jointly liable for unsubstantiated promotional claims.",
        page_number: 12,
        obligations: [
          {
            obligation_text: "Register sales promotions/raffles with FCCPC at least 21 days before launch, obtain gaming permits, and disclose exact prize-pool vs. single-prize mechanics and draw rules.",
            obligation_type: "PRESCRIPTIVE",
            severity: "CRITICAL",
            applicability_description: "Applies to all sales promotions, prize draws, and marketing campaigns in Nigeria.",
          },
        ],
      },
      {
        clause_reference: "Regulation 33",
        clause_text: "Brand ambassadors, social media influencers, and advertising agencies who endorse or publish promotional representations without reasonable substantiation shall be jointly and severally liable with the primary advertiser for any false or deceptive marketing claims.",
        page_number: 13,
        obligations: [
          {
            obligation_text: "Influencers and agencies carry joint and several liability for unsubstantiated advertising claims.",
            obligation_type: "RESTRICTION",
            severity: "HIGH",
            applicability_description: "Applies to influencer marketing and third-party ambassador contracts.",
            channel: "INFLUENCER",
          },
        ],
      },
    ],
  },
  {
    regulatorAcronym: "FCCPC",
    title: "Guidelines on Deceptive Pricing, Drip Pricing, and Zero-Fee Claims",
    instrument_type: "GUIDELINE",
    instrument_number: "FCCPC/GD/DP/2023/04",
    description: "Prohibits hiding compulsory fees until checkout ('drip pricing') and unsubstantiated '0% interest' marketing claims.",
    publication_date: "2023-06-20",
    effective_date: "2023-07-01",
    source_url: "https://fccpc.gov.ng/guidelines/pricing/",
    document_hash: "e7f8a9b0c1d2345abcdef0123456789abcdef0123456789abcdef0123456789f",
    clauses: [
      {
        clause_reference: "Section 3.2",
        clause_text: "Marketing a financial product as 'zero fee', 'free', or '0% interest' where the consumer is subjected to mandatory transaction processing, administration, or maintenance charges constitutes deceptive pricing.",
        page_number: 7,
        obligations: [
          {
            obligation_text: "Prohibition on 'free' or '0% fee' claims when mandatory administration or processing charges apply.",
            obligation_type: "PROHIBITIVE",
            severity: "CRITICAL",
            applicability_description: "Applies to zero-interest or fee-free marketing claims.",
          },
        ],
      },
    ],
  },
  {
    regulatorAcronym: "FCCPC",
    title: "Investigative Guidelines on Unfair Contract Terms in Financial Advertisements",
    instrument_type: "GUIDELINE",
    instrument_number: "FCCPC/GD/UCT/2022/03",
    description: "Enforcement standards against unilateral fee variation clauses and unconscionable marketing disclaimers.",
    publication_date: "2022-10-10",
    effective_date: "2022-11-01",
    source_url: "https://fccpc.gov.ng/guidelines/unfair-terms/",
    document_hash: "f8a9b0c1d2e3456abcdef0123456789abcdef0123456789abcdef01234567890",
  },
  {
    regulatorAcronym: "FCCPC",
    title: "Consumer Protection Regulations on Automatic Renewals & Subscription Traps",
    instrument_type: "REGULATION",
    instrument_number: "FCCPC/REG/AR/2023/01",
    description: "Mandatory cancellation notice and prohibition of deceptive auto-debit renewals in digital services.",
    publication_date: "2023-04-18",
    effective_date: "2023-05-01",
    source_url: "https://fccpc.gov.ng/regulations/subscriptions/",
    document_hash: "a9b0c1d2e3f4567abcdef0123456789abcdef0123456789abcdef01234567891",
  },
  {
    regulatorAcronym: "FCCPC",
    title: "Enforcement Framework on Defamatory and Harassing Debt Collection Communications",
    instrument_type: "DIRECTIVE",
    instrument_number: "FCCPC/ENF/DC/2023/02",
    description: "Penalties for contacting third-party contacts or sending shaming messages to borrower contacts.",
    publication_date: "2023-01-25",
    effective_date: "2023-02-01",
    source_url: "https://fccpc.gov.ng/directives/debt-recovery/",
    document_hash: "b0c1d2e3f4a5678abcdef0123456789abcdef0123456789abcdef01234567892",
    clauses: [
      {
        clause_reference: "FCCPC DEON Consumer Lending Regulations 2025 Regulations 15, 17, 18, 21 & 27",
        clause_text: "Under the FCCPC Digital, Electronic, Online, or Non-Traditional Consumer Lending Regulations 2025 (DEON Regulations), digital lenders must register with the FCCPC, display a transparent Key Facts Statement (KFS) and true Annual Percentage Rate (APR) prior to loan disbursement (Regulations 15 & 17), and are strictly prohibited from requesting Android/iOS permissions to access borrower contacts, call logs, or SMS messages (Regulation 21) or contacting third parties in the borrower's phonebook for debt recovery (Regulation 18). Breaches attract administrative penalties up to ₦100,000,000 or 1% of annual turnover and director disqualification under Regulation 27.",
        page_number: 8,
        obligations: [
          {
            obligation_text: "Strict prohibition on scraping phone contacts, call logs, or SMS and messaging third-party contacts on overdue loans; mandatory KFS and APR disclosure.",
            obligation_type: "PROHIBITIVE",
            severity: "CRITICAL",
            applicability_description: "Applies to all digital lending apps and nano-loan products in Nigeria.",
            product_type: "DIGITAL_LENDING",
          },
        ],
      },
    ],
  },
  {
    regulatorAcronym: "FCCPC",
    title: "Directives on Influencer Advertising & Endorsement Disclosure Transparency",
    instrument_type: "DIRECTIVE",
    instrument_number: "FCCPC/DIR/INF/2023/05",
    description: "Requires clear '#Ad' and '#Sponsored' disclosures on influencer promotional endorsements.",
    publication_date: "2023-08-30",
    effective_date: "2023-09-15",
    source_url: "https://fccpc.gov.ng/directives/influencers/",
    document_hash: "c1d2e3f4a5b6789abcdef0123456789abcdef0123456789abcdef01234567893",
  },
  {
    regulatorAcronym: "FCCPC",
    title: "Regulations on Bait Advertising and Availability of Promoted Financial Rewards",
    instrument_type: "REGULATION",
    instrument_number: "FCCPC/REG/BA/2022/04",
    description: "Rules requiring clear terms and reasonable availability of cashbacks, referral bonuses, and promotional rates.",
    publication_date: "2022-12-05",
    effective_date: "2023-01-01",
    source_url: "https://fccpc.gov.ng/regulations/bait-advertising/",
    document_hash: "d2e3f4a5b6c7890abcdef0123456789abcdef0123456789abcdef01234567894",
  },
  {
    regulatorAcronym: "FCCPC",
    title: "Mandatory Registration Framework for Commercial Promoters and Digital Marketers",
    instrument_type: "GUIDELINE",
    instrument_number: "FCCPC/GD/PROM/2024/01",
    description: "Compliance certification requirements for commercial agencies running digital sweepstakes.",
    publication_date: "2024-01-10",
    effective_date: "2024-02-01",
    source_url: "https://fccpc.gov.ng/guidelines/promoters/",
    document_hash: "e3f4a5b6c7d8901abcdef0123456789abcdef0123456789abcdef01234567895",
  },
  {
    regulatorAcronym: "FCCPC",
    title: "Guidelines on Vulnerable Consumer Protection in Credit Marketing",
    instrument_type: "GUIDELINE",
    instrument_number: "FCCPC/GD/VUL/2023/06",
    description: "Safeguards against predatory targeting of low-income students, elderly, or financially distressed borrowers.",
    publication_date: "2023-11-20",
    effective_date: "2023-12-01",
    source_url: "https://fccpc.gov.ng/guidelines/vulnerable-consumers/",
    document_hash: "f4a5b6c7d8e9012abcdef0123456789abcdef0123456789abcdef01234567896",
  },

  // ==========================================
  // ARCON (10 Instruments)
  // ==========================================
  {
    regulatorAcronym: "ARCON",
    title: "Advertising Regulatory Council of Nigeria (ARCON) Act 2022",
    instrument_type: "ACT",
    instrument_number: "Act No. 23 of 2022",
    description: "Principal advertising legislation mandating ASP pre-vetting prior to public exposure and establishing advertising offenses.",
    publication_date: "2022-07-28",
    effective_date: "2022-08-01",
    source_url: "https://arcon.gov.ng/acts/arcon-act-2022/",
    document_hash: "a5b6c7d8e9f0123abcdef0123456789abcdef0123456789abcdef01234567897",
    clauses: [
      {
        clause_reference: "Sections 2, 8, 9, 54 & 57 (Mandatory ASP Pre-Vetting & Advertising Offences)",
        clause_text: "Under ARCON Act 2022 Sections 2, 8, 9, 54, and 57, no person or organization shall expose, broadcast, or publish any advertisement or marketing communication directed at the Nigerian market (including TikTok, social media, and digital influencer campaigns) without prior submission to and Certificate of Approval from the Advertising Standards Panel (ASP). Exposing an unvetted advertisement attracts a statutory penalty of at least ₦500,000 per exposure and prosecution before the Advertising Offences Tribunal.",
        page_number: 7,
        obligations: [
          {
            obligation_text: "All advertising content, including social media and TikTok campaigns, must obtain an ASP Certificate of Approval prior to public exposure.",
            obligation_type: "PRESCRIPTIVE",
            severity: "CRITICAL",
            applicability_description: "Applies to all public promotional advertising and digital media in Nigeria.",
          },
        ],
      },
    ],
  },
  {
    regulatorAcronym: "ARCON",
    title: "Nigerian Code of Advertising Practice, Sales Promotion and Other Rights/Restrictions (5th Edition)",
    instrument_type: "CODE",
    instrument_number: "ARCON/CODE/5TH/2022",
    description: "Code of advertising conduct requiring decency, truthfulness, social responsibility, and substantiation in financial services.",
    publication_date: "2022-09-01",
    effective_date: "2022-10-01",
    source_url: "https://arcon.gov.ng/codes/advertising-code-5th-edition/",
    document_hash: "b6c7d8e9f0a1234abcdef0123456789abcdef0123456789abcdef01234567898",
    clauses: [
      {
        clause_reference: "Article 39",
        clause_text: "Advertisements for financial services must state clearly the nature of the commitment being undertaken, the licensed legal identity of the advertiser, and shall not take advantage of consumers' lack of financial experience.",
        page_number: 31,
        obligations: [
          {
            obligation_text: "Financial ads must display licensed corporate identity and clear terms of financial commitment.",
            obligation_type: "DISCLOSURE",
            severity: "HIGH",
            applicability_description: "Applies to all banking, lending, and investment advertising.",
          },
        ],
      },
    ],
  },
  {
    regulatorAcronym: "ARCON",
    title: "ARCON ASP Pre-Vetting Guidelines for Financial Services, Loans and Promotional Draws",
    instrument_type: "GUIDELINE",
    instrument_number: "ASP/GD/FS/2023/01",
    description: "Detailed submission procedures for fast-track and regular ASP vetting of financial promotions.",
    publication_date: "2023-02-14",
    effective_date: "2023-03-01",
    source_url: "https://arcon.gov.ng/guidelines/asp-financial-services/",
    document_hash: "c7d8e9f0a1b2345abcdef0123456789abcdef0123456789abcdef01234567899",
  },
  {
    regulatorAcronym: "ARCON",
    title: "Directives on Digital Media, Social Media Skit Makers and Influencer Pre-Clearance",
    instrument_type: "DIRECTIVE",
    instrument_number: "ARCON/DIR/DM/2022/02",
    description: "Extension of statutory ASP pre-vetting mandate to social media skits, sponsored videos, and digital influencers.",
    publication_date: "2022-12-12",
    effective_date: "2023-01-01",
    source_url: "https://arcon.gov.ng/directives/digital-media-influencers/",
    document_hash: "d8e9f0a1b2c3456abcdef0123456789abcdef0123456789abcdef0123456789a",
  },
  {
    regulatorAcronym: "ARCON",
    title: "Guidelines on Comparative Financial Advertising and Competitor Derogation",
    instrument_type: "GUIDELINE",
    instrument_number: "ARCON/GD/CA/2023/03",
    description: "Strict substantiation rules when comparing financial rates or disparaging competitor institutions.",
    publication_date: "2023-05-18",
    effective_date: "2023-06-01",
    source_url: "https://arcon.gov.ng/guidelines/comparative-advertising/",
    document_hash: "e9f0a1b2c3d4567abcdef0123456789abcdef0123456789abcdef0123456789b",
  },
  {
    regulatorAcronym: "ARCON",
    title: "Regulations on Use of Foreign Models, Voices, and Production in Advertising",
    instrument_type: "REGULATION",
    instrument_number: "ARCON/REG/FM/2022/01",
    description: "Ban on foreign voiceovers and foreign models in advertisements targeted at Nigerian consumers.",
    publication_date: "2022-08-22",
    effective_date: "2022-10-01",
    source_url: "https://arcon.gov.ng/regulations/local-content/",
    document_hash: "f0a1b2c3d4e5678abcdef0123456789abcdef0123456789abcdef0123456789c",
  },
  {
    regulatorAcronym: "ARCON",
    title: "Code on Child Protection and Safeguards in Financial Promotion",
    instrument_type: "CODE",
    instrument_number: "ARCON/CODE/CP/2023/04",
    description: "Restrictions on advertising credit, betting, or high-risk financial schemes to minors.",
    publication_date: "2023-07-11",
    effective_date: "2023-08-01",
    source_url: "https://arcon.gov.ng/codes/child-protection/",
    document_hash: "a1b2c3d4e5f6789abcdef0123456789abcdef0123456789abcdef0123456789d",
  },
  {
    regulatorAcronym: "ARCON",
    title: "Guidelines on Prize Competitions, Lotteries, and Promoted Financial Draws",
    instrument_type: "GUIDELINE",
    instrument_number: "ARCON/GD/PC/2023/05",
    description: "NLRC joint clearance and transparency rules in promotional lotteries and savings reward draws.",
    publication_date: "2023-09-25",
    effective_date: "2023-10-01",
    source_url: "https://arcon.gov.ng/guidelines/prize-competitions/",
    document_hash: "b2c3d4e5f6a7890abcdef0123456789abcdef0123456789abcdef0123456789e",
    clauses: [
      {
        clause_reference: "NLRC Act 2005 Section 7 & ARCON Prize Draw Guidelines Section 4",
        clause_text: "Any deposit-linked raffle, promotional lottery, sweepstake, or prize competition conditioned on customer deposits or transactions must obtain prior regulatory permits from the National Lottery Regulatory Commission (NLRC) and applicable state lottery authorities (such as LSLGA in Lagos), register promotional terms with the FCCPC, and present the lottery permit alongside CBN partner bank no-objection prior to ARCON ASP pre-vetting.",
        page_number: 4,
        obligations: [
          {
            obligation_text: "Deposit-linked promotional raffles and sweepstakes require NLRC/LSLGA lottery permits, FCCPC notification, and ARCON ASP pre-vetting prior to launch.",
            obligation_type: "PRESCRIPTIVE",
            severity: "HIGH",
            applicability_description: "Applies to all promotional raffles, sweepstakes, and deposit reward draws in Nigeria.",
          },
        ],
      },
    ],
  },
  {
    regulatorAcronym: "ARCON",
    title: "Practice Directives on Native Advertising and Sponsored Financial Editorial Content",
    instrument_type: "DIRECTIVE",
    instrument_number: "ARCON/DIR/NA/2024/01",
    description: "Clear demarcation of sponsored blog posts, thought leadership, and native financial articles.",
    publication_date: "2024-02-05",
    effective_date: "2024-03-01",
    source_url: "https://arcon.gov.ng/directives/native-advertising/",
    document_hash: "c3d4e5f6a7b8901abcdef0123456789abcdef0123456789abcdef0123456789f",
  },
  {
    regulatorAcronym: "ARCON",
    title: "Directives on Environmental, Social, and Governance (ESG) & Greenwashing Claims",
    instrument_type: "DIRECTIVE",
    instrument_number: "ARCON/DIR/ESG/2024/02",
    description: "Substantiation requirements for green bonds, ESG investments, and ethical banking claims.",
    publication_date: "2024-04-12",
    effective_date: "2024-05-01",
    source_url: "https://arcon.gov.ng/directives/greenwashing/",
    document_hash: "d4e5f6a7b8c9012abcdef0123456789abcdef0123456789abcdef01234567890",
  },

  // ==========================================
  // NDPC (7 Instruments)
  // ==========================================
  {
    regulatorAcronym: "NDPC",
    title: "Nigeria Data Protection Act (NDPA) 2023",
    instrument_type: "ACT",
    instrument_number: "Act No. 34 of 2023",
    description: "Comprehensive statutory data privacy law protecting Nigerian data subjects, consent rules, and direct marketing rights.",
    publication_date: "2023-06-12",
    effective_date: "2023-07-01",
    source_url: "https://ndpc.gov.ng/laws/ndpa-2023/",
    document_hash: "e5f6a7b8c9d0123abcdef0123456789abcdef0123456789abcdef01234567891",
    clauses: [
      {
        clause_reference: "Sections 24–27, 41–43 & 48 (Data Minimization, Cross-Border Transfers & Penalties)",
        clause_text: "Under NDPA 2023 Sections 24–27, personal data processing must be lawful, proportionate, and limited to the minimum necessary (prohibiting invasive phone contact-list, call-log, and SMS scraping). Under Part VIII (Sections 41–43) of the NDPA 2023 and NDPC GAID 2025 Article 45 & Schedule 5, a data controller shall not transfer personal data of Nigerian citizens outside Nigeria (e.g., to AWS US-East Virginia) unless the recipient jurisdiction provides an adequate level of protection or the controller executes NDPC-approved Standard Contractual Clauses accompanied by a Transfer Impact Assessment (TIA) and Data Protection Impact Assessment (DPIA) under Section 28. Violations attract fines up to ₦10,000,000 or 2% of annual gross revenue under Section 48.",
        page_number: 19,
        obligations: [
          {
            obligation_text: "Cross-border transfers of Nigerian personal data require adequacy or NDPC-approved transfer instruments + TIA/DPIA under NDPA 2023 Sections 41–43; contact/SMS scraping violates Sections 24–27.",
            obligation_type: "PRESCRIPTIVE",
            severity: "CRITICAL",
            applicability_description: "Applies to all financial institutions and fintechs processing or hosting Nigerian personal data.",
          },
        ],
      },
      {
        clause_reference: "Section 34(1)",
        clause_text: "A data subject shall have the right to object at any time to the processing of personal data concerning him or her for direct marketing, which includes profiling to the extent that it is related to such direct marketing.",
        page_number: 19,
        obligations: [
          {
            obligation_text: "Data subjects have an absolute right to object to direct marketing and profiling at any time without fees.",
            obligation_type: "PRESCRIPTIVE",
            severity: "CRITICAL",
            applicability_description: "Applies to direct marketing via SMS, email, WhatsApp, or phone calls.",
            channel: "SMS",
          },
        ],
      },
      {
        clause_reference: "Sections 24–29, 32, 40 & 41–44",
        clause_text:
          "Sections 24–28 govern lawful processing, explicit freely-given consent, burden of proof on the data controller, and Data Privacy Impact Assessments (DPIAs); Section 29 mandates written processor contracts; Section 32 governs DPO designation; Section 40 requires reporting personal data breaches to the NDPC within 72 hours of awareness; Sections 41–43 regulate cross-border data transfers; Section 44 requires registration of Data Controllers and Processors of Major Importance (DCPMIs).",
        page_number: 22,
      },
    ],
  },
  {
    regulatorAcronym: "NDPC",
    title: "NDPC General Application and Implementation Directive (GAID) 2025",
    instrument_type: "DIRECTIVE",
    instrument_number: "NDPC/DIR/GAID/2025/01",
    description: "Implementation directive detailing DCPMI classification, 31 March annual CAR deadline (Article 10), cross-border transfers (Article 45), lawful consent, and penalty schedules.",
    publication_date: "2025-03-20",
    effective_date: "2025-03-20",
    source_url: "https://ndpc.gov.ng/directives/gaid-2025/",
    document_hash: "f6a7b8c9d0e1234abcdef0123456789abcdef0123456789abcdef01234567892",
    clauses: [
      {
        clause_reference: "Articles 8–10 (31 March Annual CAR Deadline), Section 14.2 & Article 45",
        clause_text: "Articles 8–10 govern DCPMI classification, registration, and annual Compliance Audit Return (CAR) filing via an NDPC-licensed DPCO: Article 10 sets the annual CAR deadline at 31 March for entities established before 12 June 2023 (and within 15 months of establishment for entities established after 12 June 2023, followed by annual filing by 31 March), replacing the repealed NDPR 15 March date. Article 45 governs cross-border transfer mechanisms. Section 14.2 requires every direct marketing communication sent via electronic mail, SMS, or instant messaging to contain an easily accessible, functioning, and cost-free opt-out or unsubscribe mechanism.",
        page_number: 15,
        obligations: [
          {
            obligation_text: "Mandatory free and functional opt-out/unsubscribe mechanism in every marketing communication, and annual CAR filing by 31 March under Article 10.",
            obligation_type: "DISCLOSURE",
            severity: "CRITICAL",
            applicability_description: "Applies to all electronic direct marketing and DCPMI data controllers/processors.",
          },
        ],
      },
    ],
  },
  {
    regulatorAcronym: "NDPC",
    title: "Guidance Notice on Direct Marketing via SMS, Telemarketing, Email, and WhatsApp",
    instrument_type: "NOTICE",
    instrument_number: "NDPC/GN/DM/2023/01",
    description: "Rules requiring explicit opt-in consent before unsolicited marketing communications.",
    publication_date: "2023-09-10",
    effective_date: "2023-10-01",
    source_url: "https://ndpc.gov.ng/notices/direct-marketing-guidance/",
    document_hash: "a7b8c9d0e1f2345abcdef0123456789abcdef0123456789abcdef01234567893",
  },
  {
    regulatorAcronym: "NDPC",
    title: "Guidelines on Cookie Consent, Tracking Pixels, and Promotional Landing Pages",
    instrument_type: "GUIDELINE",
    instrument_number: "NDPC/GD/CK/2023/02",
    description: "Requires explicit cookie banners and prior consent before deploying retargeting advertising pixels.",
    publication_date: "2023-11-05",
    effective_date: "2023-12-01",
    source_url: "https://ndpc.gov.ng/guidelines/cookies/",
    document_hash: "b8c9d0e1f2a3456abcdef0123456789abcdef0123456789abcdef01234567894",
  },
  {
    regulatorAcronym: "NDPC",
    title: "Rules on Third-Party Data Sharing in Co-Branded Marketing Campaigns",
    instrument_type: "REGULATION",
    instrument_number: "NDPC/REG/TP/2024/01",
    description: "Governs lead sharing and joint marketing agreements between financial institutions and tech partners.",
    publication_date: "2024-01-22",
    effective_date: "2024-02-01",
    source_url: "https://ndpc.gov.ng/regulations/third-party-sharing/",
    document_hash: "c9d0e1f2a3b4567abcdef0123456789abcdef0123456789abcdef01234567895",
  },
  {
    regulatorAcronym: "NDPC",
    title: "Directives on Cross-Border Data Transfers in Cloud Marketing Systems",
    instrument_type: "DIRECTIVE",
    instrument_number: "NDPC/DIR/CBDT/2023/03",
    description: "Requirements for storing customer marketing lists and CRM data on overseas cloud services.",
    publication_date: "2023-12-18",
    effective_date: "2024-01-01",
    source_url: "https://ndpc.gov.ng/directives/cross-border/",
    document_hash: "d0e1f2a3b4c5678abcdef0123456789abcdef0123456789abcdef01234567896",
  },
  {
    regulatorAcronym: "NDPC",
    title: "Guidance on Automated Decision-Making and Profiling in Credit Advertising",
    instrument_type: "GUIDELINE",
    instrument_number: "NDPC/GD/ADM/2024/02",
    description: "Transparency obligations when algorithmic scoring determines which consumers see credit offers.",
    publication_date: "2024-03-28",
    effective_date: "2024-04-15",
    source_url: "https://ndpc.gov.ng/guidelines/automated-profiling/",
    document_hash: "e1f2a3b4c5d6789abcdef0123456789abcdef0123456789abcdef01234567897",
  },

  // ==========================================
  // SEC (8 Instruments)
  // ==========================================
  {
    regulatorAcronym: "SEC",
    title: "Investments and Securities Act (ISA) 2007",
    instrument_type: "ACT",
    instrument_number: "Act No. 29 of 2007",
    description: "Primary securities market law governing public invitations to invest, prospectus disclosures, and false statements.",
    publication_date: "2007-06-25",
    effective_date: "2007-07-01",
    source_url: "https://sec.gov.ng/laws/isa-2007/",
    document_hash: "f2a3b4c5d6e7890abcdef0123456789abcdef0123456789abcdef01234567898",
    clauses: [
      {
        clause_reference: "Section 67(1)",
        clause_text: "No person shall make any statement, promise or forecast which he knows to be misleading, false or deceptive, or dishonestly conceal any material facts, to induce or attempt to induce another person to enter into an investment agreement.",
        page_number: 38,
        obligations: [
          {
            obligation_text: "Strict ban on misleading or deceptive forecasts and promises to induce public investments.",
            obligation_type: "PROHIBITIVE",
            severity: "CRITICAL",
            applicability_description: "Applies to all investment invitations and promotional campaigns.",
            product_type: "INVESTMENT",
          },
        ],
      },
    ],
  },
  {
    regulatorAcronym: "SEC",
    title: "SEC Consolidated Rules and Regulations on Unsolicited Investment Invitations",
    instrument_type: "REGULATION",
    instrument_number: "SEC/REG/CON/2013",
    description: "Prohibits cold calling and unsolicited digital promotions inviting the retail public to purchase unregistered securities.",
    publication_date: "2013-05-15",
    effective_date: "2013-06-01",
    source_url: "https://sec.gov.ng/rules/consolidated-rules/",
    document_hash: "a3b4c5d6e7f8901abcdef0123456789abcdef0123456789abcdef01234567899",
  },
  {
    regulatorAcronym: "SEC",
    title: "SEC Rules on Issuance, Offering Platforms and Custody of Digital Assets / VASPs",
    instrument_type: "REGULATION",
    instrument_number: "SEC/REG/DA/2022/01",
    description: "Mandatory risk warnings and licensing disclaimers for cryptocurrency, tokenized assets, and virtual asset service providers.",
    publication_date: "2022-05-14",
    effective_date: "2022-06-01",
    source_url: "https://sec.gov.ng/regulations/digital-assets/",
    document_hash: "b4c5d6e7f8a9012abcdef0123456789abcdef0123456789abcdef0123456789a",
    clauses: [
      {
        clause_reference: "Rule 23.4",
        clause_text: "Every advertisement, promotion, or public notice for digital asset platforms must display the following prominent warning in bold text: 'Digital assets involve significant risk of total capital loss and are not covered by government deposit insurance.'",
        page_number: 16,
        obligations: [
          {
            obligation_text: "Mandatory bold risk disclaimer warning that digital assets involve total capital loss risk.",
            obligation_type: "DISCLOSURE",
            severity: "CRITICAL",
            applicability_description: "Applies to all crypto and digital asset marketing materials.",
            product_type: "CRYPTO_VASP",
          },
        ],
      },
    ],
  },
  {
    regulatorAcronym: "SEC",
    title: "SEC Rules on Robo-Advisory Services and Algorithmic Investment Promotion",
    instrument_type: "REGULATION",
    instrument_number: "SEC/REG/RA/2021/02",
    description: "Advertising transparency rules for automated wealth-management and robo-advisory fintech platforms.",
    publication_date: "2021-08-30",
    effective_date: "2021-09-15",
    source_url: "https://sec.gov.ng/rules/robo-advisory/",
    document_hash: "c5d6e7f8a9b0123abcdef0123456789abcdef0123456789abcdef0123456789b",
  },
  {
    regulatorAcronym: "SEC",
    title: "SEC Rules on Collective Investment Schemes (CIS) & Historical Performance Warnings",
    instrument_type: "REGULATION",
    instrument_number: "SEC/REG/CIS/2019/04",
    description: "Requires the mandatory warning: 'Past performance is not a reliable indicator of future results' on all mutual fund materials.",
    publication_date: "2019-11-20",
    effective_date: "2020-01-01",
    source_url: "https://sec.gov.ng/rules/cis/",
    document_hash: "d6e7f8a9b0c1234abcdef0123456789abcdef0123456789abcdef0123456789c",
    clauses: [
      {
        clause_reference: "ISA 2025 Sections 153–160 & SEC CIS Rules (Commercial Paper Pooling & Fund Management)",
        clause_text: "Pooling retail user wallet funds to invest in commercial papers, treasury bills, or money market instruments and pay returns to users constitutes operating a Collective Investment Scheme (CIS) and Fund/Portfolio Management under the Investments and Securities Act (ISA) 2025 and SEC Consolidated Rules. Such activity is illegal unless the scheme is registered with the SEC as an authorized Money Market Fund managed by an SEC-licensed Fund/Portfolio Manager with an independent SEC-registered Custodian and Trustee.",
        page_number: 4,
        obligations: [
          {
            obligation_text: "Fintechs and PSSPs cannot pool customer deposits into commercial papers or money market instruments without an SEC Fund/Portfolio Manager license and registered Collective Investment Scheme.",
            obligation_type: "PROHIBITIVE",
            severity: "CRITICAL",
            applicability_description: "Applies to all savings vaults, treasury pools, and commercial paper yield products in Nigeria.",
            product_type: "INVESTMENT",
          },
        ],
      },
      {
        clause_reference: "Rule 214(2)",
        clause_text: "Whenever the past performance of a collective investment scheme or mutual fund is cited in any advertisement, it shall be accompanied by the conspicuous statement: 'Past performance is not a reliable indicator of future returns, and the value of investments may fluctuate.'",
        page_number: 9,
        obligations: [
          {
            obligation_text: "Mandatory disclaimer accompanying any cited historical investment performance.",
            obligation_type: "DISCLOSURE",
            severity: "HIGH",
            applicability_description: "Applies to mutual fund, stock, and wealth asset marketing.",
            product_type: "INVESTMENT",
          },
        ],
      },
    ],
  },
  {
    regulatorAcronym: "SEC",
    title: "SEC Directives on Prohibition of Guaranteed Returns in Variable Yield Investments",
    instrument_type: "DIRECTIVE",
    instrument_number: "SEC/DIR/GR/2021/01",
    description: "Prohibits advertising 'guaranteed returns', 'risk-free profit', or capital protection on variable yield instruments.",
    publication_date: "2021-04-19",
    effective_date: "2021-05-01",
    source_url: "https://sec.gov.ng/directives/guaranteed-returns/",
    document_hash: "e7f8a9b0c1d2345abcdef0123456789abcdef0123456789abcdef0123456789d",
    clauses: [
      {
        clause_reference: "Paragraph 2",
        clause_text: "Capital market operators and promoters are strictly prohibited from advertising guaranteed percentage returns or risk-free profits on any equity, mutual fund, or variable yield investment scheme.",
        page_number: 1,
        obligations: [
          {
            obligation_text: "Absolute prohibition on advertising 'guaranteed returns' on variable yield investments.",
            obligation_type: "PROHIBITIVE",
            severity: "CRITICAL",
            applicability_description: "Applies to investment and wealth management campaigns.",
            product_type: "INVESTMENT",
          },
        ],
      },
    ],
  },
  {
    regulatorAcronym: "SEC",
    title: "SEC Guidelines on Financial Influencer (Finfluencer) Disclosures and Unlicensed Advisory",
    instrument_type: "GUIDELINE",
    instrument_number: "SEC/GD/FINF/2023/03",
    description: "Prohibits unlicensed financial influencers from providing specific stock recommendations or sponsored investment pitches.",
    publication_date: "2023-10-15",
    effective_date: "2023-11-01",
    source_url: "https://sec.gov.ng/guidelines/finfluencers/",
    document_hash: "f8a9b0c1d2e3456abcdef0123456789abcdef0123456789abcdef0123456789e",
  },
  {
    regulatorAcronym: "SEC",
    title: "SEC Directives on Crowdfunding Intermediaries and Retail Investor Risk Notices",
    instrument_type: "DIRECTIVE",
    instrument_number: "SEC/DIR/CF/2022/02",
    description: "Investment ceiling warnings and retail investor risk notices in equity and debt crowdfunding campaigns.",
    publication_date: "2022-06-30",
    effective_date: "2022-07-15",
    source_url: "https://sec.gov.ng/directives/crowdfunding/",
    document_hash: "a9b0c1d2e3f4567abcdef0123456789abcdef0123456789abcdef0123456789f",
  },
];

export const STATUTORY_PROHIBITED_TERMS: SeedProhibitedTerm[] = [
  {
    term: "100% risk-free",
    normalized_term: "100 risk free",
    category: "UNSUBSTANTIATED_SECURITY",
    reason: "Statutory prohibition: No financial investment or credit product may be advertised as entirely without risk (SEC Rule 214, CBN CPF Part 4).",
    severity: "CRITICAL",
    source_type: "STATUTORY",
    matching_mode: "PHRASE",
  },
  {
    term: "guaranteed returns",
    normalized_term: "guaranteed returns",
    category: "GUARANTEED_INVESTMENT_YIELD",
    reason: "Statutory prohibition: Promoters may not promise guaranteed returns on variable capital market instruments (SEC Directive on Guaranteed Returns).",
    severity: "CRITICAL",
    source_type: "STATUTORY",
    matching_mode: "PHRASE",
  },
  {
    term: "no credit check ever",
    normalized_term: "no credit check ever",
    category: "DECEPTIVE_LENDING",
    reason: "Statutory prohibition: Licensed lenders are required to consult Credit Reference Bureaus and may not represent that creditworthiness is ignored.",
    severity: "HIGH",
    source_type: "STATUTORY",
    matching_mode: "PHRASE",
  },
  {
    term: "free money",
    normalized_term: "free money",
    category: "DECEPTIVE_PROMOTION",
    reason: "Statutory prohibition: Misleading representation regarding financial advances or loan products (FCCPA Section 123).",
    severity: "HIGH",
    source_type: "STATUTORY",
    matching_mode: "PHRASE",
  },
  {
    term: "instant loan no repayment",
    normalized_term: "instant loan no repayment",
    category: "FRAUDULENT_REPRESENTATION",
    reason: "Statutory prohibition: Deceptive trade practice suggesting loans require no repayment obligations.",
    severity: "CRITICAL",
    source_type: "STATUTORY",
    matching_mode: "PHRASE",
  },
  {
    term: "cbn approved returns",
    normalized_term: "cbn approved returns",
    category: "REGULATOR_IMPERSONATION",
    reason: "Statutory prohibition: Unlawful representation claiming Central Bank endorsement of specific investment yields or returns.",
    severity: "CRITICAL",
    source_type: "STATUTORY",
    matching_mode: "PHRASE",
  },
  {
    term: "zero interest forever",
    normalized_term: "zero interest forever",
    category: "DECEPTIVE_PRICING",
    reason: "Statutory prohibition: Deceptive pricing claim under FCCPC Deceptive Pricing Guidelines.",
    severity: "HIGH",
    source_type: "STATUTORY",
    matching_mode: "PHRASE",
  },
  {
    term: "unlimited loan approval",
    normalized_term: "unlimited loan approval",
    category: "BAIT_ADVERTISING",
    reason: "Statutory prohibition: Bait advertising violating FCCPA Section 127 and CBN CPF responsible lending principles.",
    severity: "HIGH",
    source_type: "STATUTORY",
    matching_mode: "PHRASE",
  },
  {
    term: "zero risk",
    normalized_term: "zero risk",
    category: "MISLEADING_RISK_CLAIM",
    reason: "Statutory prohibition: Absolute risk dismissal violating SEC and CBN consumer disclosure guidelines.",
    severity: "CRITICAL",
    source_type: "STATUTORY",
    matching_mode: "PHRASE",
  },
  {
    term: "ndic covers all losses",
    normalized_term: "ndic covers all losses",
    category: "DECEPTIVE_INSURANCE_REPRESENTATION",
    reason: "Statutory prohibition: Misrepresents statutory NDIC deposit insurance coverage limits as unlimited loss indemnification.",
    severity: "CRITICAL",
    source_type: "STATUTORY",
    matching_mode: "PHRASE",
  },
];
