/**
 * Authoritative Nigerian Statutory & Regulatory Reference Matrix
 *
 * Provides subsection-exact statutory provisions, mandatory operational clocks,
 * institutional scope boundaries (e.g. PSSP vs. Licensed Lender / MFB), and
 * verified official regulator reference records for deterministic grounding in
 * Stage 3 Policy & SOP Statutory Gap Redlines and Compliance Audits.
 */

export interface AuthoritativeStatutoryProvision {
  id: string;
  authority: "NDPC" | "FCCPC" | "CBN" | "NFIU" | "SEC" | "FIRS" | "CAC";
  jurisdiction: "NG";
  documentTitle: string;
  sectionCode: string;
  citationLabel: string;
  effectiveDate: string;
  officialUrl: string;
  domain: string;
  category:
    | "CONSENT_AND_PERMISSIONS"
    | "DEBT_COLLECTION_AND_PENALTIES"
    | "DATA_RETENTION_LOCALISATION_AND_BREACH"
    | "COMPLAINTS_AND_EFT_REDRESS"
    | "AML_CFT_KYC_AND_NFIU"
    | "LICENSING_SCOPE_AND_GOVERNANCE";
  keywords: string[];
  statutoryFloorSummary: string;
  verbatimRuleExtract: string;
}

export interface SubClauseGapTemplate {
  subClauseId: string;
  category: AuthoritativeStatutoryProvision["category"];
  sectionTitle: string;
  topicTitle: string;
  matchPatterns: RegExp[];
  statutoryBreaches: string[];
  compliantReplacementClause: string;
  governingAuthorities: string[];
}

export interface MandatoryOperationalClockEntry {
  event: string;
  category: AuthoritativeStatutoryProvision["category"];
  applicableStatutoryTiming: string;
  governingLegalBasis: string;
}

export const NIGERIAN_STATUTORY_PROVISIONS: AuthoritativeStatutoryProvision[] = [
  // ============================================================================
  // 1. CONSENT, LAWFUL BASIS, MOBILE PERMISSIONS & PRIVACY GOVERNANCE (NDPA 2023, GAID 2025, DEON 2025, CBN CPR 2019)
  // ============================================================================
  {
    id: "ng-stat-ndpa-2023-s24",
    authority: "NDPC",
    jurisdiction: "NG",
    documentTitle: "Nigeria Data Protection Act (NDPA) 2023",
    sectionCode: "Section 24(1)(a)–(f)",
    citationLabel: "NDPA 2023 Section 24(1)(a)–(f)",
    effectiveDate: "2023-06-12",
    officialUrl: "https://ndpc.gov.ng/Files/Nigeria_Data_Protection_Act_2023.pdf",
    domain: "ndpc.gov.ng",
    category: "CONSENT_AND_PERMISSIONS",
    keywords: [
      "purpose limitation",
      "data minimisation",
      "retention limit",
      "fairness",
      "lawfulness",
      "transparency",
      "contacts",
      "sms",
      "call logs",
      "photo gallery",
      "gps",
      "indefinite retention",
    ],
    statutoryFloorSummary:
      "Mandates fairness, lawfulness, transparency, purpose limitation, data minimisation (adequate, relevant, and limited to what is strictly necessary), storage limitation (not kept longer than necessary), and security.",
    verbatimRuleExtract:
      "NDPA 2023 Section 24(1)(a)–(f): A data controller or data processor shall ensure that personal data is (a) processed in a fair, lawful and transparent manner; (b) collected for specified, explicit, and legitimate purposes and not further processed in a way incompatible with those purposes; (c) adequate, relevant, and limited to the minimum necessary for the purposes for which the personal data was collected; (d) retained for not longer than is necessary to achieve the lawful bases for which the personal data was collected; (e) accurate, complete, not misleading; and (f) processed in a manner that ensures appropriate security.",
  },
  {
    id: "ng-stat-ndpa-2023-s25-26",
    authority: "NDPC",
    jurisdiction: "NG",
    documentTitle: "Nigeria Data Protection Act (NDPA) 2023",
    sectionCode: "Sections 25(1)(a)–(b) & 26(1)–(7)",
    citationLabel: "NDPA 2023 Sections 25(1)(a) & 26(1)–(7)",
    effectiveDate: "2023-06-12",
    officialUrl: "https://ndpc.gov.ng/Files/Nigeria_Data_Protection_Act_2023.pdf",
    domain: "ndpc.gov.ng",
    category: "CONSENT_AND_PERMISSIONS",
    keywords: [
      "consent",
      "bundled consent",
      "conditional consent",
      "freely given",
      "specific",
      "informed",
      "unambiguous",
      "affirmative action",
      "sign-up",
      "terms and privacy policy",
      "section 26(2)",
    ],
    statutoryFloorSummary:
      "Governs lawful basis (Section 25) and conditions for valid consent (Section 26). Section 26(2) explicitly renders bundled or conditional consent unlawful when performance of a contract/service is made conditional on consent to processing personal data not necessary for that service.",
    verbatimRuleExtract:
      "NDPA 2023 Section 25(1)(a): Processing is lawful where the data subject has given and not withdrawn consent for the specific purpose. Section 26(1): A data controller shall bear the burden of proof for establishing a data subject's consent. Section 26(2): In determining whether consent was freely given, account shall be taken of whether the performance of a contract, including the provision of a service, is conditional on consent to the processing of personal data that is not necessary for the performance of that contract. Section 26(3)–(7): Silence or pre-ticked boxes do not constitute consent; request for consent must be in clear and plain language, separate from other matters, and inform the data subject of the right to withdraw consent prior to granting it.",
  },
  {
    id: "ng-stat-ndpa-2023-s35",
    authority: "NDPC",
    jurisdiction: "NG",
    documentTitle: "Nigeria Data Protection Act (NDPA) 2023",
    sectionCode: "Sections 26(4)–(5) & 35",
    citationLabel: "NDPA 2023 Sections 26(4)–(5) & 35",
    effectiveDate: "2023-06-12",
    officialUrl: "https://ndpc.gov.ng/Files/Nigeria_Data_Protection_Act_2023.pdf",
    domain: "ndpc.gov.ng",
    category: "CONSENT_AND_PERMISSIONS",
    keywords: [
      "withdraw consent",
      "withdrawal of consent",
      "perpetual",
      "irrevocable",
      "opt-out",
      "revoke",
    ],
    statutoryFloorSummary:
      "Prohibits perpetual or irrevocable consent and 'no opt-out' clauses. Data subjects have an unwaivable statutory right under Section 35 (and Section 26(4)–(5)) to withdraw consent at any time, and withdrawal must be as easy as giving consent.",
    verbatimRuleExtract:
      "NDPA 2023 Section 35(1)–(2): A data subject shall have the right to withdraw consent to the processing of his or her personal data at any time. The data controller shall ensure that it is as easy for the data subject to withdraw as to give consent. Withdrawal of consent shall not affect the lawfulness of processing based on consent before its withdrawal.",
  },
  {
    id: "ng-stat-ndpa-2023-s27-28",
    authority: "NDPC",
    jurisdiction: "NG",
    documentTitle: "Nigeria Data Protection Act (NDPA) 2023",
    sectionCode: "Sections 27(1)(a)–(g) & 28",
    citationLabel: "NDPA 2023 Sections 27 & 28",
    effectiveDate: "2023-06-12",
    officialUrl: "https://ndpc.gov.ng/Files/Nigeria_Data_Protection_Act_2023.pdf",
    domain: "ndpc.gov.ng",
    category: "CONSENT_AND_PERMISSIONS",
    keywords: [
      "privacy notice",
      "transparency",
      "dpia",
      "data protection impact assessment",
      "gps",
      "location",
      "sms",
      "high risk",
      "retention period",
    ],
    statutoryFloorSummary:
      "Section 27 mandates pre-collection disclosure of lawful basis, recipients, cross-border transfers, retention period, and complaint rights. Section 28 requires a Data Protection Impact Assessment (DPIA) prior to any high-risk processing such as geolocation or telemetry.",
    verbatimRuleExtract:
      "NDPA 2023 Section 27(1): Before a data controller collects personal data directly from a data subject, the data controller shall inform the data subject of the identity of the controller, specific lawful bases and purposes, third-party recipients, retention period, and right to lodge a complaint with the Commission. Section 28(1): Where processing of personal data may likely result in a high risk to the rights and freedoms of a data subject by virtue of its nature, scope, context, and purposes, a data controller shall, prior to the processing, carry out a Data Protection Impact Assessment (DPIA).",
  },
  {
    id: "ng-stat-ndpc-gaid-2025-consent",
    authority: "NDPC",
    jurisdiction: "NG",
    documentTitle:
      "NDPC General Application and Implementation Directive (GAID) 2025",
    sectionCode: "Articles 7–13, 16–18, 21–23, 27–28, 39–40",
    citationLabel: "NDPC GAID 2025 Articles 7–13, 16–18, 21–23, 27–28 & 39–40",
    effectiveDate: "2025-09-19",
    officialUrl: "https://ndpc.gov.ng/regulations-and-directives/",
    domain: "ndpc.gov.ng",
    category: "CONSENT_AND_PERMISSIONS",
    keywords: [
      "gaid",
      "general application and implementation directive",
      "article 17",
      "snag",
      "standard notice to address grievance",
      "cookies",
      "mobile permissions",
      "dpia",
      "lawful basis",
    ],
    statutoryFloorSummary:
      "NDPC GAID 2025 (issued 20 March 2025, commenced 19 September 2025) enforces strict lawful-basis separation (Articles 15–18), prohibits bundled consent and mandates 1-click consent withdrawal (Article 17), requires DPIAs for intrusive device permissions (Article 28), and establishes the Standard Notice to Address Grievance (SNAG) under Articles 39–40.",
    verbatimRuleExtract:
      "NDPC GAID 2025 (commenced 19 September 2025): Articles 7–13 (governance, DPO designation, compliance schedules & Semi-Annual Data Protection Report); Articles 16–18 (affirmative granular consent, prohibition of dark patterns/bundled sign-up T&Cs, and Article 17 mandate that withdrawal of consent must be accessible via the same interface with no penalty); Articles 21–23 (strict data minimisation and retention schedules); Article 28 (mandatory DPIA for high-risk profiling, biometric, or location tracking); Articles 39–40 (internal data privacy complaint remediation and Standard Notice to Address Grievance [SNAG]).",
  },
  {
    id: "ng-stat-fccpc-deon-2025-permissions",
    authority: "FCCPC",
    jurisdiction: "NG",
    documentTitle:
      "FCCPC Digital, Electronic, Online, or Non-Traditional Consumer Lending Regulations 2025 (DEON)",
    sectionCode:
      "Regulations 18(b)(vi), 19(a), 21(a)–(b) & Application Forms Declaration",
    citationLabel: "FCCPC DEON Regulations 2025 Regs. 18(b)(vi), 19(a), 21(a)–(b)",
    effectiveDate: "2025-07-21",
    officialUrl: "https://fccpc.gov.ng/regulations-and-guidelines/",
    domain: "fccpc.gov.ng",
    category: "CONSENT_AND_PERMISSIONS",
    keywords: [
      "deon",
      "contact list",
      "contacts",
      "call logs",
      "sms inbox",
      "photo gallery",
      "camera roll",
      "usage statement",
      "24 hours",
      "waive statutory protection",
    ],
    statutoryFloorSummary:
      "DEON 2025 (effective 21 July 2025) strictly prohibits digital lenders and consumer credit apps from accessing borrower contact lists, call logs, SMS messages, or photo galleries, bars clauses that waive statutory consumer protections (Reg. 18(b)(vi)), and mandates delivery of a personal data usage statement within 24 hours of a consumer's request (Reg. 21(b)).",
    verbatimRuleExtract:
      "FCCPC DEON Consumer Lending Regulations 2025 (commenced 21 July 2025): Regulation 18(b)(vi) prohibits any contractual term requiring a consumer to waive statutory rights or regulatory protections. Regulation 19(a) & Regulation 21(a) read with the DEON Application Forms Declaration strictly prohibit a digital lender or partner platform from requesting or harvesting access to a consumer's phonebook/contact list, call logs, SMS inbox, or photo gallery. Regulation 21(b) mandates that upon request by a consumer, the operator shall provide a comprehensive statement of how the consumer's personal data has been used and shared within twenty-four (24) hours.",
  },

  // ============================================================================
  // 2. DEBT COLLECTION ESCALATION, PENALTY INTEREST CAPS & THIRD-PARTY HARASSMENT
  // ============================================================================
  {
    id: "ng-stat-cbn-guide-to-charges-2020-s2-5",
    authority: "CBN",
    jurisdiction: "NG",
    documentTitle:
      "CBN Guide to Charges by Banks, Other Financial and Non-Bank Financial Institutions (Effective January 1, 2020)",
    sectionCode: "Part 2(A), Section 2.5 & Footnote 3",
    citationLabel:
      "CBN Guide to Charges (2020) Part 2(A), Section 2.5 & Footnote 3",
    effectiveDate: "2020-01-01",
    officialUrl:
      "https://www.cbn.gov.ng/Out/2019/CCD/Guide%20to%20Charges%20by%20Banks%20Other%20Financial%20and%20Non-Bank%20Financial%20Institutions%20eff%20Jan%201%202020.pdf",
    domain: "cbn.gov.ng",
    category: "DEBT_COLLECTION_AND_PENALTIES",
    keywords: [
      "1.5% daily",
      "penalty interest",
      "penal rate",
      "penal charge",
      "default charge",
      "1% flat per month",
      "3-day grace period",
      "grace period",
      "guide to charges",
      "section 2.5",
      "footnote 3",
      "day 1-2 overdue",
    ],
    statutoryFloorSummary:
      "Caps default/penal charges for Microfinance Banks (MFBs) and regulated lenders at 1% flat per month on the unpaid amount (in addition to the agreed contract interest rate) and prohibits charging any penal fee until after a mandatory minimum 3-day grace period following the due date.",
    verbatimRuleExtract:
      "CBN Guide to Charges by Banks, Other Financial and Non-Bank Financial Institutions (effective Jan 1, 2020), Part 2(A) (Microfinance Banks), Section 2.5 & Footnote 3: Default charge / penal rate on overdue credit facilities shall not exceed 1% flat per month on the unpaid overdue amount in addition to charging the current rate of interest on the outstanding debt. Footnote 3 / CBN CPR Reg. 4.6(b): A minimum grace period of three (3) days from the due date must be granted to the borrower before any default/penal charge may be applied. A 1.5% daily penalty (~45% monthly / 547.5% per annum) applied on Day 1–2 is unlawful on both rate and timing.",
  },
  {
    id: "ng-stat-cbn-cpr-2019-collections-penalties",
    authority: "CBN",
    jurisdiction: "NG",
    documentTitle: "CBN Consumer Protection Regulations (CPR) 2019",
    sectionCode:
      "Regulations 3.2.1, 4.6(b)–(c), 5.2.4–5.2.5, 5.4.1–5.4.5, 5.5.6 & 5.5.7(a),(c)",
    citationLabel:
      "CBN CPR 2019 Regs. 3.2.1, 4.6(b)–(c), 5.2.4–5.2.5, 5.4.1–5.4.5, 5.5.6 & 5.5.7(a),(c)",
    effectiveDate: "2019-12-20",
    officialUrl:
      "https://www.cbn.gov.ng/Out/2019/CCD/Consumer%20Protection%20Regulations.pdf",
    domain: "cbn.gov.ng",
    category: "DEBT_COLLECTION_AND_PENALTIES",
    keywords: [
      "contact shaming",
      "employer hr",
      "phonebook contacts",
      "defaulters wall",
      "social media",
      "harassment",
      "9:00 pm",
      "8:00 am",
      "contact hours",
      "grace period",
      "first day of default",
      "restructuring",
      "collection agents",
    ],
    statutoryFloorSummary:
      "Mandates first-day default notification and a minimum 3-day grace period before penal charges (Reg. 4.6(b)–(c)); requires fair treatment (Reg. 3.2.1) and loan restructuring discussions (Regs. 5.2.4–5.2.5); holds institutions strictly liable for third-party recovery agents (Reg. 5.5.6); bans contacting friends, employers, relatives, or neighbours unless they are formal guarantors (Reg. 5.5.7(a)); and prohibits debt recovery contact between 9:00 p.m. and 8:00 a.m. (Reg. 5.5.7(c)).",
    verbatimRuleExtract:
      "CBN Consumer Protection Regulations 2019: Reg. 3.2.1 requires institutions to treat consumers equitably, honestly, and fairly at all stages, including debt collection. Reg. 4.6(b)–(c) mandates notifying the customer on the first day of default of the applicable default charge, observing a minimum 3-day grace period before applying default charges, and disclosing default charges separately from principal and contract interest. Regs. 5.2.4–5.2.5 require engaging customers experiencing financial difficulty to consider restructuring options. Regs. 5.4.1–5.4.5 protect customer data confidentiality and grant the right to withdraw consent (Reg. 5.4.2). Reg. 5.5.6 holds the financial institution strictly liable for actions of external debt collection agents. Reg. 5.5.7(a) strictly prohibits contacting friends, employer, relatives, or neighbours of a debtor for debt recovery unless such person is a party to the loan or a formal guarantor. Reg. 5.5.7(c) prohibits debt recovery visits or calls between 9:00 p.m. and 8:00 a.m.",
  },
  {
    id: "ng-stat-fccpc-deon-2025-collections",
    authority: "FCCPC",
    jurisdiction: "NG",
    documentTitle:
      "FCCPC Digital, Electronic, Online, or Non-Traditional Consumer Lending Regulations 2025 (DEON)",
    sectionCode: "Regulations 17(a)–(c), 19(a), 21(a), 23 & 25(1)(c)",
    citationLabel:
      "FCCPC DEON Regulations 2025 Regs. 17(a)–(c), 19(a), 21(a), 23 & 25(1)(c)",
    effectiveDate: "2025-07-21",
    officialUrl: "https://fccpc.gov.ng/regulations-and-guidelines/",
    domain: "fccpc.gov.ng",
    category: "DEBT_COLLECTION_AND_PENALTIES",
    keywords: [
      "defaulters wall",
      "contact shaming",
      "defamation",
      "harassment",
      "exploitative interest",
      "credit bureau",
      "bvn publish",
      "photo publish",
      "third parties",
    ],
    statutoryFloorSummary:
      "Prohibits opaque or exploitative interest/penalty rates (Regs. 17 & 23), strictly outlaws debt recovery harassment, defamation, public shaming, or contacting persons on a borrower's contact list or employer HR (Regs. 19(a) & 21(a)), and restricts credit default reporting solely to CBN-licensed Credit Bureaus under lawful notice procedures (Reg. 25(1)(c)).",
    verbatimRuleExtract:
      "FCCPC DEON Regulations 2025: Regulations 17(a)–(c) and 23 require full upfront disclosure of interest and default fees and prohibit exploitative or usurious charges. Regulation 19(a) and Regulation 21(a) prohibit harassment, coercion, cyberbullying, defamatory messages, contacting third parties (including phonebook contacts, colleagues, or employer HR), and publishing borrower personal data, photographs, or BVN on social media ('Defaulters Wall'). Regulation 25(1)(c) permits reporting non-performing loans exclusively to licensed Credit Bureaus in accordance with statutory notice requirements.",
  },

  // ============================================================================
  // 3. DATA RETENTION, PAYMENTS DATA LOCALISATION & 72-HOUR BREACH NOTIFICATION
  // ============================================================================
  {
    id: "ng-stat-ndpa-2023-s40-43-breach-transfer",
    authority: "NDPC",
    jurisdiction: "NG",
    documentTitle: "Nigeria Data Protection Act (NDPA) 2023",
    sectionCode: "Sections 29, 39, 40(1)–(7) & 41–43",
    citationLabel: "NDPA 2023 Sections 29, 39, 40(1)–(7) & 41–43",
    effectiveDate: "2023-06-12",
    officialUrl: "https://ndpc.gov.ng/Files/Nigeria_Data_Protection_Act_2023.pdf",
    domain: "ndpc.gov.ng",
    category: "DATA_RETENTION_LOCALISATION_AND_BREACH",
    keywords: [
      "72 hours",
      "data breach",
      "30 days",
      "media coverage",
      "aws us-east",
      "virginia",
      "cross-border transfer",
      "section 40",
      "section 41",
      "section 43",
      "processor",
      "high risk",
    ],
    statutoryFloorSummary:
      "Section 40(1) requires a data processor to notify the controller immediately on becoming aware of a breach; Section 40(2) mandates that a data controller notify the NDPC within 72 hours of becoming aware of a breach likely to result in a risk to individuals (regardless of media coverage); Section 40(3) requires immediate plain-language notice to data subjects where high risk exists. Sections 41–43 prohibit cross-border transfers (e.g. to AWS US-East Virginia) unless adequacy or approved transfer instruments and transfer impact assessments are in place.",
    verbatimRuleExtract:
      "NDPA 2023 Section 40(1): Where a personal data breach has occurred with respect to personal data being processed by a data processor, the data processor shall, on becoming aware of the breach, immediately notify the data controller or data processor that engaged it. Section 40(2): Where a personal data breach is likely to result in a risk to the rights and freedoms of individuals, the data controller shall, within 72 hours of becoming aware of the breach, notify the Commission (NDPC). Section 40(3): Where the breach is likely to result in a high risk to the rights and freedoms of a data subject, the data controller shall immediately communicate the personal data breach to the data subject in plain and clear language. Section 40(4)–(7): Information may be provided in phases where not all details are available within 72 hours. Sections 41–43: Personal data shall not be transferred from Nigeria to another country unless the recipient is subject to an adequate level of protection or an approved cross-border transfer mechanism under NDPC supervision.",
  },
  {
    id: "ng-stat-ndpc-gaid-2025-breach-transfer",
    authority: "NDPC",
    jurisdiction: "NG",
    documentTitle:
      "NDPC General Application and Implementation Directive (GAID) 2025",
    sectionCode: "Articles 23, 31, 33, 34, 45 & Schedule 5",
    citationLabel: "NDPC GAID 2025 Articles 23, 31, 33, 34, 45 & Schedule 5",
    effectiveDate: "2025-09-19",
    officialUrl: "https://ndpc.gov.ng/regulations-and-directives/",
    domain: "ndpc.gov.ng",
    category: "DATA_RETENTION_LOCALISATION_AND_BREACH",
    keywords: [
      "gaid",
      "schedule 5",
      "article 33",
      "article 45",
      "breach register",
      "72 hours",
      "cross-border",
      "retention schedule",
      "aws",
    ],
    statutoryFloorSummary:
      "GAID 2025 Article 23 prohibits indefinite retention and requires a documented retention and erasure schedule; Article 33 codifies the 72-hour NDPC breach filing contents and mandatory internal breach register; Article 34 mandates written data processing agreements for cloud hosts; Article 45 & Schedule 5 regulate cross-border transfer safeguards.",
    verbatimRuleExtract:
      "NDPC GAID 2025: Article 23 requires every data controller/processor to maintain a documented Data Retention and Disposal Schedule specifying statutory retention periods and automated purge/archival controls upon expiration. Article 33 mandates maintaining a permanent Personal Data Breach Register, immediate processor-to-controller escalation, and 72-hour notification to the NDPC regardless of whether the breach is reported in the press. Article 34 mandates binding processor agreements under NDPA Section 29. Article 45 & Schedule 5 govern cross-border transfer instruments and adequacy assessments.",
  },
  {
    id: "ng-stat-cbn-2026-payments-data-localisation",
    authority: "CBN",
    jurisdiction: "NG",
    documentTitle:
      "CBN Circular on Mandatory Localisation of Payment Transaction Data (15 June 2026) & Implementation FAQ (4 November 2026)",
    sectionCode: "CBN Payments System Data Localisation Directive (2026)",
    citationLabel:
      "CBN Payments Data Localisation Circular (15 June 2026) & FAQ (4 Nov 2026)",
    effectiveDate: "2026-06-15",
    officialUrl: "https://www.cbn.gov.ng/Documents/circulars.html",
    domain: "cbn.gov.ng",
    category: "DATA_RETENTION_LOCALISATION_AND_BREACH",
    keywords: [
      "data localisation",
      "localization",
      "aws us-east",
      "virginia",
      "1 january 2027",
      "2026",
      "domestic infrastructure",
      "payment transaction data",
    ],
    statutoryFloorSummary:
      "Mandates that regulated payment service providers and financial institutions store and process core Nigerian payment transaction data and customer KYC records on in-country Nigerian infrastructure, with full migration compliance required by 1 January 2027 (and prior CBN approval + domestic active mirror for any permitted cross-border processing).",
    verbatimRuleExtract:
      "CBN Circular on Mandatory Localisation of Payment Transaction Data (15 June 2026) and CBN Implementation FAQ (4 November 2026): All CBN-licensed banks, Microfinance Banks, and Payment Service Providers (including PSSPs) must ensure that domestic payment transaction processing and primary storage of Nigerian customer payment and KYC records reside within Nigeria by the mandatory compliance deadline of 1 January 2027. Exclusive offshore hosting on AWS US-East (Virginia) violates Nigerian payments data sovereignty requirements.",
  },
  {
    id: "ng-stat-mlppa-2022-s8-retention",
    authority: "NFIU",
    jurisdiction: "NG",
    documentTitle:
      "Money Laundering (Prevention and Prohibition) Act (MLPPA) 2022 & CBN AML/CFT/CPF Regulations 2022",
    sectionCode:
      "MLPPA 2022 Section 8(1)–(3); CBN AML/CFT/CPF Regulations 2022 Regs. 35–36; FCCPC DEON 2025 Reg. 25(2)",
    citationLabel:
      "MLPPA 2022 Section 8; CBN AML Regs. 2022 Regs. 35–36; DEON 2025 Reg. 25(2)",
    effectiveDate: "2022-05-12",
    officialUrl: "https://www.nfiu.gov.ng/Home/DownloadFile?fileId=MLPPA_2022",
    domain: "nfiu.gov.ng",
    category: "DATA_RETENTION_LOCALISATION_AND_BREACH",
    keywords: [
      "5 years",
      "five years",
      "indefinitely",
      "account closure",
      "retention",
      "section 8",
      "reg 35",
      "reg 36",
    ],
    statutoryFloorSummary:
      "Mandates preserving customer identification (BVN, NIN, KYC) and transaction records for at least five (5) years following the completion of the transaction or termination/closure of the account/business relationship (unless longer retention is specifically required by a regulator or court order), while NDPA Section 24(1)(d) prohibits indefinite retention of non-statutory data.",
    verbatimRuleExtract:
      "MLPPA 2022 Section 8(1)–(2) & CBN AML/CFT/CPF Regulations 2022 Regulations 35–36: A financial institution shall preserve all customer identification records (including BVN, NIN, and CDD documentation) and domestic or international transaction records for a period of at least five (5) years after the closure of the account, severance of the business relationship, or completion of the transaction, and make them promptly available to the CBN, NFIU, or competent authorities upon demand. FCCPC DEON 2025 Reg. 25(2) similarly requires 5-year preservation of regulatory lending records. Under NDPA 2023 Section 24(1)(d), once the 5-year statutory floor expires (absent an active regulatory investigation or litigation hold), personal data must be securely deleted or anonymised rather than retained indefinitely.",
  },

  // ============================================================================
  // 4. CUSTOMER COMPLAINT CHANNELS, ACKNOWLEDGEMENT & FAILED TRANSFER / FRAUD REDRESS SLAs
  // ============================================================================
  {
    id: "ng-stat-cbn-cpr-2019-complaints",
    authority: "CBN",
    jurisdiction: "NG",
    documentTitle: "CBN Consumer Protection Regulations (CPR) 2019",
    sectionCode:
      "Section 6.2 & Regulations 3.2.6, 6.2.2, 6.2.4, 6.3.1–6.3.2, 6.3.4–6.3.11, 6.3.13–6.3.18 & 6.4 (Annexure D)",
    citationLabel:
      "CBN CPR 2019 Regs. 6.2.2, 6.2.4, 6.3.1–6.3.18 & 6.4 (vs. Reg. 3.2.6)",
    effectiveDate: "2019-12-20",
    officialUrl:
      "https://www.cbn.gov.ng/Out/2019/CCD/Consumer%20Protection%20Regulations.pdf",
    domain: "cbn.gov.ng",
    category: "COMPLAINTS_AND_EFT_REDRESS",
    keywords: [
      "email only",
      "5 business days to acknowledge",
      "30 business days",
      "24 hours",
      "acknowledgement",
      "tracking number",
      "emergency channel",
      "fraud",
      "unauthorized debit",
      "summary resolution communication",
      "src",
      "reg 6.2.2",
      "reg 6.3.2",
      "reg 3.2.6",
    ],
    statutoryFloorSummary:
      "Prohibits 'email-only' complaint channels and 5-business-day acknowledgement windows. Section 6.2 & Reg. 6.2.4 require multiple free accessible channels plus a dedicated 24/7 emergency channel for fraud and unauthorized debits. Regs. 6.2.2 & 6.3.2 mandate complaint acknowledgement within 24 hours with a unique tracking ID (note: the 5-working-day timeline in Reg. 3.2.6 applies only to general enquiries/requests, NOT complaints). Regs. 6.3.7–6.3.11 require refunds with applicable interest, written apology, and a Summary Resolution Communication (SRC) by the next business day.",
    verbatimRuleExtract:
      "CBN Consumer Protection Regulations 2019: Section 6.2 & Reg. 6.2.4 mandate establishing multiple accessible, free-of-charge complaint channels (toll-free telephone, in-app, web portal, email, physical/postal) and a dedicated 24/7 emergency reporting channel for fraud, lost/stolen instruments, and unauthorized electronic debits. Regs. 6.2.2 & 6.3.2 mandate acknowledging every complaint within twenty-four (24) hours of receipt and issuing a unique tracking reference number (the 5-working-day timeline in Reg. 3.2.6 governs general enquiries, not dispute complaints). Reg. 6.3.6 & Annexure D prescribe binding category resolution timelines. Regs. 6.3.7–6.3.11 & 6.3.13–6.4 require issuing a Summary Resolution Communication (SRC) by the next business day after resolution, paying refunds with applicable interest plus a formal written apology where the customer suffered financial loss, and notifying the customer of their right to escalate unresolved complaints to the CBN Consumer Protection Department (CPD) or FCCPC.",
  },
  {
    id: "ng-stat-fccpc-deon-2025-complaints",
    authority: "FCCPC",
    jurisdiction: "NG",
    documentTitle:
      "FCCPC Digital, Electronic, Online, or Non-Traditional Consumer Lending Regulations 2025 (DEON)",
    sectionCode: "Regulations 19(c), 22(a)–(d) & 26",
    citationLabel: "FCCPC DEON Regulations 2025 Regs. 19(c), 22(a)–(d) & 26",
    effectiveDate: "2025-07-21",
    officialUrl: "https://fccpc.gov.ng/regulations-and-guidelines/",
    domain: "fccpc.gov.ng",
    category: "COMPLAINTS_AND_EFT_REDRESS",
    keywords: [
      "deon",
      "24 hours",
      "48 hours",
      "lending complaint",
      "reg 22(d)",
      "fccpc redress",
    ],
    statutoryFloorSummary:
      "Mandates multi-channel consumer complaint intake (Regs. 19(c), 22(a)–(c)) and requires digital lending complaints to be resolved within 24 hours, or where an extension is communicated to the consumer, within no more than 48 hours (Reg. 22(d)), with a statutory right of escalation to the FCCPC (Reg. 26).",
    verbatimRuleExtract:
      "FCCPC DEON Consumer Lending Regulations 2025: Regulations 19(c) and 22(a)–(c) mandate conspicuous, accessible multi-channel customer support and dispute handling mechanisms. Regulation 22(d) mandates that consumer lending complaints shall be resolved within twenty-four (24) hours of receipt, or where additional investigation is required and communicated to the consumer, within an extended window not exceeding forty-eight (48) hours. Regulation 26 preserves the consumer's right to escalate unresolved grievances directly to the FCCPC.",
  },
  {
    id: "ng-stat-cbn-instant-eft-2018-and-2020-chargeback",
    authority: "CBN",
    jurisdiction: "NG",
    documentTitle:
      "CBN Regulation on Instant (Inter-Bank) Electronic Funds Transfer Services in Nigeria (2018) & CBN Circular on Timelines for Dispense Errors and Refund Complaints (29 May 2020)",
    sectionCode:
      "Instant EFT Regulation 2018 Sections 5.2(8), 5.2(9), 5.3(2)–(4), 10.1.2 & 11; CBN Circular of 29 May 2020 Items 1–3",
    citationLabel:
      "CBN Instant EFT Regulation 2018 ss. 5.2(8)–(9), 5.3(2)–(4), 10.1.2 & CBN Circular (29 May 2020) Items 1–3",
    effectiveDate: "2020-06-08",
    officialUrl:
      "https://www.cbn.gov.ng/Out/2020/CCD/Revised%20Timelines%20for%20Dispense%20Errors.pdf",
    domain: "cbn.gov.ng",
    category: "COMPLAINTS_AND_EFT_REDRESS",
    keywords: [
      "failed transfer",
      "failed electronic transfer",
      "instant eft",
      "10 minutes",
      "1 hour",
      "60 seconds",
      "24 hours",
      "48 hours",
      "3 working days",
      "dispense error",
      "pos",
      "web",
      "atm",
      "chargeback",
    ],
    statutoryFloorSummary:
      "Prescribes exact operational reversal clocks for electronic transfers and card/channel failures: under Instant EFT Regulation 2018, returned outbound EFTs must be refunded to the sender within 10 minutes (s. 5.2(8)) or within 1 hour post-settlement where details are unavailable (s. 5.2(9)), inward credits must apply within 60 seconds or max 24 hours on system exception (s. 5.3(2)–(4)), and general instant-EFT disputes must resolve within 3 working days (s. 10.1.2); under the CBN Circular of 29 May 2020 (effective 8 June 2020), failed on-us ATM transactions require instant reversal (or max 24 hours manual), and not-on-us ATM, POS, and Web failures must be resolved within 48 hours.",
    verbatimRuleExtract:
      "CBN Regulation on Instant (Inter-Bank) Electronic Funds Transfer Services 2018: Section 5.2(8) mandates refunding a sender within ten (10) minutes where a Sending Entity receives a returned Instant EFT. Section 5.2(9) mandates refunding the sender within one (1) hour after settlement closure where account details are unavailable. Section 5.3(2)–(4) requires a Receiving Entity to apply inward value to the beneficiary's account within sixty (60) seconds, or where impracticable due to system exceptions, within twenty-four (24) hours. Section 10.1.2 & Section 11 mandate resolving general Instant EFT disputes within three (3) working days. CBN Circular BSD/DIR/GEN/LAB/13/026 of 29 May 2020 (effective 8 June 2020), Items 1–3: Failed On-Us ATM transactions require instant auto-reversal or manual resolution within 24 hours; Failed Not-On-Us ATM transactions require resolution within 48 hours; Failed POS and Web transactions require resolution within 48 hours. A 30-business-day resolution policy violates every CBN electronic payment SLA.",
  },

  // ============================================================================
  // 5. AML/CFT/CPF, BVN/NIN KYC MANDATES, NFIU goAML STR/CTR/FTR & INSTITUTIONAL SCOPE
  // ============================================================================
  {
    id: "ng-stat-cbn-aml-2022-psp-scope-and-cdd",
    authority: "CBN",
    jurisdiction: "NG",
    documentTitle:
      "CBN (Anti-Money Laundering, Combating the Financing of Terrorism and Countering Proliferation Financing of Weapons of Mass Destruction in Financial Institutions) Regulations 2022",
    sectionCode:
      "Application Scope & Regulations 6, 9–15, 19–26, 28–29, 35–40",
    citationLabel:
      "CBN AML/CFT/CPF Regulations 2022 Regs. 6, 9–15, 19–26, 28–29 & 35–40",
    effectiveDate: "2022-06-24",
    officialUrl:
      "https://www.cbn.gov.ng/Out/2022/FPRD/CBN%20AML%20CFT%20CPF%20Regulations%202022.pdf",
    domain: "cbn.gov.ng",
    category: "AML_CFT_KYC_AND_NFIU",
    keywords: [
      "pssp",
      "payment service provider",
      "partner mfb",
      "vip referral",
      "waive bvn",
      "waive nin",
      "edd",
      "enhanced due diligence",
      "pep",
      "mlro",
      "tipping off",
      "board approval",
    ],
    statutoryFloorSummary:
      "Directly binds Payment Service Providers (including PSSPs) as independent reporting institutions—a PSSP cannot outsource or defer its statutory AML/CFT/CPF compliance to a partner MFB. Prohibits KYC waivers for VIPs; high-value or politically exposed VIP referrals require Enhanced Due Diligence (EDD) and senior management approval (Regs. 28–29), backed by Board-approved policies, an independent MLRO, ongoing training, and independent audit (Regs. 9–15).",
    verbatimRuleExtract:
      "CBN AML/CFT/CPF Regulations 2022: Directly apply to all CBN-regulated financial institutions, explicitly including Payment Service Providers (PSPs/PSSPs) and Microfinance Banks. Regulations 9–15 require a Board-approved AML/CFT/CPF compliance programme, designation of a Chief Compliance Officer / MLRO at management level, ongoing employee training, and an independent audit function. Regulations 19–26 mandate full Customer Due Diligence (CDD) prior to account opening or transaction execution and prohibit anonymous, fictitious, or unverified accounts. Regulations 28–29 require Enhanced Due Diligence (EDD), source-of-wealth/source-of-funds verification, and senior management approval for Politically Exposed Persons (PEPs) and high-value/high-risk ('VIP') customers—turning VIP status into an EDD trigger, never a KYC waiver. Regulation 6 mandates real-time screening against Targeted Financial Sanctions (TFS) lists. Regulations 37–40 govern ongoing monitoring, STR filing, and strict prohibition of tipping-off.",
  },
  {
    id: "ng-stat-cbn-2023-bvn-nin-kyc-circular",
    authority: "CBN",
    jurisdiction: "NG",
    documentTitle:
      "CBN Circular on Tier-1, Tier-2 and Tier-3 Account KYC Requirements — Mandatory BVN and NIN Linkage (PSM/DIR/PUB/CIR/001/053)",
    sectionCode: "CBN Circular PSM/DIR/PUB/CIR/001/053 (1 December 2023)",
    citationLabel:
      "CBN Circular PSM/DIR/PUB/CIR/001/053 (1 Dec 2023) Mandatory BVN/NIN Verification",
    effectiveDate: "2023-12-01",
    officialUrl:
      "https://www.cbn.gov.ng/Out/2023/FPRD/Circular%20on%20Tier%201%20Accounts%20and%20Wallets.pdf",
    domain: "cbn.gov.ng",
    category: "AML_CFT_KYC_AND_NFIU",
    keywords: [
      "bvn",
      "nin",
      "waive bvn",
      "waive nin",
      "vip referral",
      "5,000,000",
      "tier 1",
      "tier 2",
      "tier 3",
      "psm/dir/pub/cir/001/053",
      "1 december 2023",
    ],
    statutoryFloorSummary:
      "Strictly prohibits opening or operating any wallet or account without electronically validated BVN and/or NIN (Tier 1 requires BVN or NIN; Tiers 2 and 3—required for ₦5,000,000 exposure—mandate BOTH validated BVN and NIN), with zero agent discretion or VIP waivers.",
    verbatimRuleExtract:
      "CBN Circular PSM/DIR/PUB/CIR/001/053 of 1 December 2023 (Review of Know Your Customer Requirements for Account Opening): Zero accounts or wallets may be opened or operated without electronic identity verification against NIBSS (BVN) and NIMC (NIN) databases. Tier 1 accounts/wallets require a validated BVN or NIN; Tier 2 and Tier 3 accounts (the only tiers permitted to hold or transact up to ₦5,000,000, as Tier 1 is capped at ₦50,000 daily / ₦300,000 cumulative balance and Tier 2 at ₦100,000 daily / ₦500,000 cumulative balance) mandatory require BOTH a validated BVN and NIN. No agent, officer, or executive may waive BVN/NIN verification for any customer or VIP referral.",
  },
  {
    id: "ng-stat-mlppa-2022-s3-s4-s7-s11-nfiu",
    authority: "NFIU",
    jurisdiction: "NG",
    documentTitle:
      "Money Laundering (Prevention and Prohibition) Act (MLPPA) 2022 & NFIU 2024 STR Guidelines",
    sectionCode:
      "MLPPA 2022 Sections 3(1), 4, 7(1)–(3) & 11; NFIU 2024 STR Guidelines",
    citationLabel:
      "MLPPA 2022 Sections 3(1), 4, 7(1)–(3) & 11; NFIU 2024 STR Guidelines",
    effectiveDate: "2022-05-12",
    officialUrl: "https://www.nfiu.gov.ng/Home/DownloadFile?fileId=MLPPA_2022",
    domain: "nfiu.gov.ng",
    category: "AML_CFT_KYC_AND_NFIU",
    keywords: [
      "10,000,000",
      "5,000,000",
      "quarterly",
      "month-end",
      "nfiu",
      "goaml",
      "str",
      "suspicious transaction report",
      "ctr",
      "currency transaction report",
      "ftr",
      "24 hours",
      "7 days",
      "zero threshold",
      "section 7",
      "section 11",
      "section 3(1)",
    ],
    statutoryFloorSummary:
      "Separates Suspicious Transaction Reports (STRs) from statutory threshold reports: under MLPPA 2022 Section 7(1)–(2) & NFIU 2024 STR Guidelines, STRs have ZERO monetary threshold (apply to any amount, completed or attempted) and must be filed with the NFIU via goAML immediately / within 24 hours of forming suspicion; under Section 11, Currency/Threshold Transaction Reports (CTRs) for >₦5,000,000 (individual) or >₦10,000,000 (body corporate) must be filed within 7 days; under Section 3(1), international funds transfers exceeding USD 10,000 (or equivalent) must be reported within 1 day.",
    verbatimRuleExtract:
      "Money Laundering (Prevention and Prohibition) Act (MLPPA) 2022: Section 4 mandates customer identity verification before establishing a business relationship. Section 7(1)–(2) mandates that where a transaction (whether completed or attempted, and regardless of monetary amount—zero monetary threshold) involves frequency, complexity, or circumstances giving rise to suspicion of money laundering, terrorist financing, or predicate offences, the institution must immediately—and within 24 hours—draw up a written report and file a Suspicious Transaction Report (STR) electronically with the NFIU via the goAML portal. Section 7(3) & NFIU 2024 STR Guidelines strictly prohibit tipping off the customer or third parties. Section 11 mandates filing a Currency Transaction Report (CTR) with the NFIU within 7 days for any single transaction or lodgement exceeding ₦5,000,000 for an individual or ₦10,000,000 for a body corporate. Section 3(1) mandates reporting any international transfer of funds or securities exceeding USD 10,000 (or its equivalent) to the NFIU, CBN, and SEC within 1 day (24 hours). Quarterly reviews and month-end batching of ₦10,000,000 suspicious transactions violate Section 7, Section 11, and Section 3(1).",
  },

  // ============================================================================
  // 6. INSTITUTIONAL LICENSING BOUNDARIES (PSSP vs. LICENSED LENDER / MFB)
  // ============================================================================
  {
    id: "ng-stat-fccpc-deon-2025-licensing-pssp-vs-lender",
    authority: "FCCPC",
    jurisdiction: "NG",
    documentTitle:
      "FCCPC Digital, Electronic, Online, or Non-Traditional Consumer Lending Regulations 2025 (DEON) & CBN Payment Service Provider Licensing Framework",
    sectionCode: "FCCPC DEON Regulations 2025 Regulations 8 & 10–13",
    citationLabel: "FCCPC DEON Regulations 2025 Regs. 8 & 10–13",
    effectiveDate: "2025-07-21",
    officialUrl: "https://fccpc.gov.ng/regulations-and-guidelines/",
    domain: "fccpc.gov.ng",
    category: "LICENSING_SCOPE_AND_GOVERNANCE",
    keywords: [
      "pssp",
      "payment solution service provider",
      "licensed lender",
      "lender of record",
      "mfb",
      "microfinance bank",
      "partnership",
      "reg 8",
      "reg 10",
      "reg 13",
    ],
    statutoryFloorSummary:
      "A CBN Payment Solution Service Provider (PSSP) licence authorizes payment gateway, switching, and collection processing—it does NOT authorize balance-sheet consumer lending. Under DEON 2025 Regulations 8 & 10–13, any digital credit product offered via a PSSP app must identify the CBN-licensed Microfinance Bank/Finance Company (or State-licensed money lender) as the Lender of Record, receive FCCPC DEON approval for the lending partnership agreement, and allocate statutory compliance duties without relieving the PSSP of its direct NDPA, FCCPC, and CBN AML/CFT/CPF obligations.",
    verbatimRuleExtract:
      "FCCPC DEON Consumer Lending Regulations 2025 Regulations 8 and 10–13: Every operator participating in digital or electronic consumer lending must hold the requisite underlying credit licence or operate under an FCCPC-approved partnership agreement with a licensed Lender of Record (such as a CBN-licensed Microfinance Bank or Finance Company). A CBN Payment Solution Service Provider (PSSP) licence is a payments infrastructure licence, not a credit-granting licence; if a PSSP originates loans without a licensed lender of record and FCCPC DEON registration, the credit activity is ultra vires. Conversely, even where a partner MFB is the lender of record, the PSSP remains directly bound as a Data Controller/Processor under NDPA 2023, a consumer-facing service provider under FCCPC DEON 2025, and a directly regulated Financial Institution / Payment Service Provider under the CBN AML/CFT/CPF Regulations 2022.",
  },
];

/**
 * Mandatory Operational Clock & Statutory SLA Register for Nigerian FinTech / Digital Lending / Payments SOPs
 */
export const NIGERIAN_MANDATORY_OPERATIONAL_CLOCKS: MandatoryOperationalClockEntry[] = [
  {
    event: "Customer Complaint Acknowledgement & Tracking ID Issuance",
    category: "COMPLAINTS_AND_EFT_REDRESS",
    applicableStatutoryTiming:
      "Within 24 hours of receipt with a unique tracking reference (note: the 5-working-day timeline in CBN CPR Reg. 3.2.6 applies only to general enquiries/requests, NOT complaints)",
    governingLegalBasis: "CBN Consumer Protection Regulations (CPR) 2019 Regs. 6.2.2 & 6.3.2",
  },
  {
    event: "Digital Consumer Lending Complaint Resolution",
    category: "COMPLAINTS_AND_EFT_REDRESS",
    applicableStatutoryTiming:
      "Within 24 hours of receipt, or up to a maximum of 48 hours where an extension is formally communicated to the consumer",
    governingLegalBasis: "FCCPC DEON Consumer Lending Regulations 2025 Reg. 22(d)",
  },
  {
    event: "Consumer Personal Data Usage Statement Request",
    category: "CONSENT_AND_PERMISSIONS",
    applicableStatutoryTiming:
      "Within 24 hours of the consumer's request",
    governingLegalBasis: "FCCPC DEON Consumer Lending Regulations 2025 Reg. 21(b)",
  },
  {
    event: "Summary Resolution Communication (SRC) Post-Complaint Closure",
    category: "COMPLAINTS_AND_EFT_REDRESS",
    applicableStatutoryTiming:
      "By the next business day after resolving a customer complaint",
    governingLegalBasis: "CBN Consumer Protection Regulations (CPR) 2019 Reg. 6.3.8",
  },
  {
    event: "Instant EFT — Returned Outbound Transfer Refund to Sender",
    category: "COMPLAINTS_AND_EFT_REDRESS",
    applicableStatutoryTiming:
      "Within 10 minutes of receipt of returned EFT by Sending Entity (or within 1 hour after settlement closure where account details are unavailable)",
    governingLegalBasis:
      "CBN Regulation on Instant (Inter-Bank) Electronic Funds Transfer Services 2018 Sections 5.2(8) & 5.2(9)",
  },
  {
    event: "Instant EFT — Inward Beneficiary Account Credit",
    category: "COMPLAINTS_AND_EFT_REDRESS",
    applicableStatutoryTiming:
      "Within 60 seconds in normal operations, or within 24 hours maximum where impracticable due to system exceptions",
    governingLegalBasis:
      "CBN Regulation on Instant (Inter-Bank) Electronic Funds Transfer Services 2018 Section 5.3(2)–(4)",
  },
  {
    event: "Instant EFT — General Customer Dispute Turnaround",
    category: "COMPLAINTS_AND_EFT_REDRESS",
    applicableStatutoryTiming:
      "Within 3 working days from complaint receipt",
    governingLegalBasis:
      "CBN Regulation on Instant (Inter-Bank) Electronic Funds Transfer Services 2018 Sections 10.1.2 & 11",
  },
  {
    event: "Failed ATM / POS / Web Card & Channel Dispense Reversals",
    category: "COMPLAINTS_AND_EFT_REDRESS",
    applicableStatutoryTiming:
      "On-Us ATM: Instant reversal (maximum 24 hours if manual intervention required); Not-On-Us ATM, POS & Web transactions: Maximum 48 hours",
    governingLegalBasis:
      "CBN Circular on Revised Timelines for Dispense Errors & Refund Complaints (29 May 2020, eff. 8 June 2020) Items 1–3",
  },
  {
    event: "Loan Default Notice & Mandatory Grace Period Before Penal Charge",
    category: "DEBT_COLLECTION_AND_PENALTIES",
    applicableStatutoryTiming:
      "Default notice on Day 1 of default; mandatory minimum 3-day grace period before any penal rate (capped at 1% flat/month on unpaid overdue amount for MFB credit) may accrue",
    governingLegalBasis:
      "CBN CPR 2019 Reg. 4.6(b)–(c); CBN Guide to Charges (2020) Part 2(A), Section 2.5 & Footnote 3",
  },
  {
    event: "Permitted Debt Recovery Contact Hours",
    category: "DEBT_COLLECTION_AND_PENALTIES",
    applicableStatutoryTiming:
      "Strictly between 8:00 a.m. and 9:00 p.m. (contact with borrower only; zero contact between 9:00 p.m. and 8:00 a.m.)",
    governingLegalBasis: "CBN Consumer Protection Regulations (CPR) 2019 Reg. 5.5.7(c)",
  },
  {
    event: "Personal Data Breach Notification (Processor, NDPC & Data Subject)",
    category: "DATA_RETENTION_LOCALISATION_AND_BREACH",
    applicableStatutoryTiming:
      "Processor to Controller: Immediately upon awareness; Controller to NDPC: Within 72 hours of awareness (phased reporting allowed if full details pending); Controller to Data Subject: Immediately in plain language if high risk",
    governingLegalBasis:
      "Nigeria Data Protection Act (NDPA) 2023 Section 40(1)–(4); NDPC GAID 2025 Article 33",
  },
  {
    event: "Suspicious Transaction Report (STR) Filing via NFIU goAML",
    category: "AML_CFT_KYC_AND_NFIU",
    applicableStatutoryTiming:
      "Immediately and within 24 hours of forming reasonable suspicion (zero monetary threshold; covers both completed and attempted transactions)",
    governingLegalBasis:
      "MLPPA 2022 Section 7(1)–(2); CBN AML/CFT/CPF Regulations 2022 Reg. 39; NFIU 2024 STR Guidelines",
  },
  {
    event: "Currency Transaction Report (CTR) — Domestic Statutory Threshold",
    category: "AML_CFT_KYC_AND_NFIU",
    applicableStatutoryTiming:
      "Within 7 days of transaction for any single transaction or lodgement exceeding ₦5,000,000 (individual) or ₦10,000,000 (body corporate)",
    governingLegalBasis: "Money Laundering (Prevention and Prohibition) Act (MLPPA) 2022 Section 11",
  },
  {
    event: "Foreign / International Funds Transfer Report (FTR)",
    category: "AML_CFT_KYC_AND_NFIU",
    applicableStatutoryTiming:
      "Within 1 day (24 hours) to NFIU, CBN, and SEC for any transfer to or from a foreign country exceeding USD 10,000 (or equivalent)",
    governingLegalBasis: "Money Laundering (Prevention and Prohibition) Act (MLPPA) 2022 Section 3(1)",
  },
  {
    event: "KYC, BVN/NIN & Transaction Record Retention Post-Closure",
    category: "DATA_RETENTION_LOCALISATION_AND_BREACH",
    applicableStatutoryTiming:
      "Minimum 5 years post-account closure or transaction completion, followed by secure deletion/anonymisation unless under legal hold",
    governingLegalBasis:
      "MLPPA 2022 Section 8; CBN AML Regs. 2022 Regs. 35–36; FCCPC DEON 2025 Reg. 25(2); NDPA 2023 Section 24(1)(d)",
  },
  {
    event: "Nigerian Payments Transaction Data Localisation Compliance Deadline",
    category: "DATA_RETENTION_LOCALISATION_AND_BREACH",
    applicableStatutoryTiming:
      "Full in-country Nigerian hosting and processing compliance by 1 January 2027",
    governingLegalBasis:
      "CBN Payments Data Localisation Circular (15 June 2026) & Implementation FAQ (4 November 2026)",
  },
];

/**
 * Granular Sub-Clause Gap Decomposition Matrix for Nigerian FinTech & Financial SOP Redlines
 * Dynamically matched by domain keywords present in the analyzed SOP/policy.
 */
export const NIGERIAN_SOP_SUBCLAUSE_TEMPLATES: SubClauseGapTemplate[] = [
  // PRIVACY, CONSENT & DEVICE PERMISSIONS
  {
    subClauseId: "1.1",
    category: "CONSENT_AND_PERMISSIONS",
    sectionTitle: "Consent & Permissions",
    topicTitle: "Bundled Sign-Up Terms & Conditional Consent",
    matchPatterns: [/bundled/i, /terms\s*(&|and)\s*privacy/i, /conditional\s*consent/i, /sign[- ]?up.*consent/i, /ndpa/i, /gaid/i],
    statutoryBreaches: [
      "NDPA 2023 Sections 25(1)(a) & 26(1)–(3), specifically Section 26(2): Prohibits making service provision or contract performance conditional on bundled consent to personal data processing not strictly necessary for that contract.",
      "NDPC GAID 2025 (commenced 19 Sept 2025) Articles 16–18: Prohibits bundling privacy consent into standard Terms & Conditions and mandates separate, purpose-specific affirmative consent prompts.",
      "FCCPC DEON Regulations 2025 Reg. 18(b)(vi): Prohibits standard-form clauses that coerce consumers into waiving statutory data and consumer protections.",
    ],
    compliantReplacementClause:
      "Separation of Terms and Lawful Basis: Contract acceptance (Terms of Service) shall be strictly decoupled from data processing consent. Core account onboarding and payment/credit execution shall rely on contractual necessity and statutory compliance under NDPA 2023 Section 25(1)(b), while any optional or non-essential processing shall require separate, unbundled, granular opt-in consent under NDPA 2023 Section 26(2)–(3) and NDPC GAID 2025 Articles 16–18.",
    governingAuthorities: [
      "NDPA 2023 Sections 24(1)(a), 25(1)(a)–(b), 26(1)–(3) & 27(1)",
      "NDPC GAID 2025 Articles 15–18",
      "FCCPC DEON Regulations 2025 Reg. 18(b)(vi)",
    ],
  },
  {
    subClauseId: "1.2",
    category: "CONSENT_AND_PERMISSIONS",
    sectionTitle: "Consent & Permissions",
    topicTitle: "Perpetual/Irrevocable Consent & Right to Opt-Out / Withdraw",
    matchPatterns: [/perpetual/i, /irrevocable/i, /opt[- ]?out/i, /withdraw.*consent/i, /revoke/i],
    statutoryBreaches: [
      "NDPA 2023 Section 35(1)–(2) & Section 26(4)–(5): Expressly guarantees the data subject's right to withdraw consent at any time and mandates that withdrawal must be as easy as giving consent.",
      "NDPC GAID 2025 Article 17: Mandates a direct, frictionless in-app withdrawal mechanism and renders 'perpetual' or 'irrevocable' consent void ab initio.",
      "CBN Consumer Protection Regulations (CPR) 2019 Reg. 5.4.2: Requires financial institutions to allow customers to withdraw consent to data sharing or marketing at any time.",
    ],
    compliantReplacementClause:
      "Right of Withdrawal & In-App Opt-Out: No consent obtained by the Company shall be perpetual or irrevocable. Users may withdraw consent or revoke optional permissions at any time via a one-click in-app Privacy & Permissions Centre as easily as consent was granted, without retrospective penalty or service degradation for core functions, in accordance with NDPA 2023 Sections 26(4)–(5) & 35, NDPC GAID 2025 Article 17, and CBN CPR 2019 Reg. 5.4.2.",
    governingAuthorities: [
      "NDPA 2023 Sections 26(4)–(5) & 35(1)–(2)",
      "NDPC GAID 2025 Article 17",
      "CBN CPR 2019 Reg. 5.4.2",
    ],
  },
  {
    subClauseId: "1.3",
    category: "CONSENT_AND_PERMISSIONS",
    sectionTitle: "Consent & Permissions",
    topicTitle: "Prohibited Device Permissions (Contacts, Call Logs & Photo Gallery)",
    matchPatterns: [/contacts/i, /phonebook/i, /call\s*logs/i, /photo\s*gallery/i, /harvest/i, /scrape/i],
    statutoryBreaches: [
      "FCCPC DEON Consumer Lending Regulations 2025 Regs. 19(a), 21(a) & DEON Application Forms Declaration: Strictly prohibits digital lenders and consumer credit platforms from requesting, scraping, or accessing a consumer's phonebook contacts, call logs, or photo gallery.",
      "NDPA 2023 Section 24(1)(b)–(c) & NDPC GAID 2025 Articles 21–22: Violates purpose limitation and data minimisation (contacts and call logs also unlawfully capture third-party personal data without lawful basis).",
    ],
    compliantReplacementClause:
      "Prohibited Mobile Device Permissions: The mobile application is strictly prohibited from requesting, accessing, or harvesting device phonebook contacts, call logs, or photo gallery/media libraries. Camera access shall be invoked solely on a one-time, foreground basis during customer-initiated KYC document or liveness capture, in strict compliance with FCCPC DEON Regulations 2025 Reg. 21(a) and NDPA 2023 Section 24(1)(b)–(c).",
    governingAuthorities: [
      "FCCPC DEON Regulations 2025 Regs. 19(a), 21(a) & Application Forms Declaration",
      "NDPA 2023 Section 24(1)(b)–(c)",
      "NDPC GAID 2025 Articles 21–22",
    ],
  },
  {
    subClauseId: "1.4",
    category: "CONSENT_AND_PERMISSIONS",
    sectionTitle: "Consent & Permissions",
    topicTitle: "SMS Scraping, Continuous GPS Tracking & Mandatory DPIA / 24h Usage Statement",
    matchPatterns: [/sms\s*inbox/i, /sms\s*logs/i, /\bgps\b/i, /location/i, /dpia/i, /telemetry/i],
    statutoryBreaches: [
      "NDPA 2023 Section 24(1)(c) & Section 28(1); NDPC GAID 2025 Article 28: Bulk SMS inbox scraping and continuous background GPS tracking violate data minimisation and constitute high-risk processing that is unlawful without a prior approved Data Protection Impact Assessment (DPIA) and strict necessity.",
      "FCCPC DEON Regulations 2025 Reg. 21(b): Requires the platform to furnish a complete personal data usage statement to any consumer within 24 hours of request.",
    ],
    compliantReplacementClause:
      "Telemetry, DPIA & 24-Hour Data Usage Statement: Bulk SMS inbox reading and continuous background GPS tracking are prohibited. Where coarse foreground location is required for fraud prevention or regulatory geofencing, it shall be subject to a prior approved Data Protection Impact Assessment (DPIA) under NDPA 2023 Section 28 and NDPC GAID 2025 Article 28. Upon customer request, the DPO shall deliver a complete Personal Data Usage Statement within 24 hours pursuant to FCCPC DEON Regulations 2025 Reg. 21(b).",
    governingAuthorities: [
      "NDPA 2023 Sections 24(1)(c), 27 & 28(1)",
      "NDPC GAID 2025 Articles 27–28",
      "FCCPC DEON Regulations 2025 Reg. 21(b)",
    ],
  },

  // DEBT COLLECTION & PENALTY PRICING
  {
    subClauseId: "2.1",
    category: "DEBT_COLLECTION_AND_PENALTIES",
    sectionTitle: "Debt Collection & Penal Charges",
    topicTitle: "Default/Penal Interest Caps & Mandatory 3-Day Grace Period",
    matchPatterns: [/penalty\s*interest/i, /penal\s*(rate|interest|charge)/i, /default\s*(interest|fee|charge)/i, /daily\s*penalty/i, /grace\s*period/i, /overdue/i],
    statutoryBreaches: [
      "CBN Guide to Charges (eff. Jan 1, 2020) Part 2(A), Section 2.5 & Footnote 3: Caps default/penal charges for Microfinance Bank credit at 1% flat per month on the unpaid overdue amount (in addition to current contract interest) and prohibits any default charge during the mandatory minimum 3-day grace period.",
      "CBN Consumer Protection Regulations (CPR) 2019 Reg. 4.6(b)–(c): Mandates notifying the borrower on the first day of default, observing a minimum 3-day grace period before applying any penal charge, and itemising default charges separately.",
      "FCCPC DEON Regulations 2025 Regs. 17(a)–(c) & 23: Prohibits exploitative, usurious, or undisclosed penalty pricing.",
    ],
    compliantReplacementClause:
      "Default Notice, Mandatory 3-Day Grace Period & Statutory Penal Cap: On Day 1 of default, the system shall issue an automated default notice to the borrower only, stating the overdue amount and applicable terms pursuant to CBN CPR 2019 Reg. 4.6(b). No default or penal charge shall accrue during the mandatory minimum three (3) day grace period (Days 1–3). From Day 4 onward, any default charge imposed by the licensed Lender of Record (partner MFB) shall not exceed 1% flat per month on the unpaid overdue amount in accordance with CBN Guide to Charges (2020) Part 2(A), Section 2.5 & Footnote 3 and FCCPC DEON Regulations 2025 Regs. 17 & 23, and shall be itemised separately under CBN CPR 2019 Reg. 4.6(c).",
    governingAuthorities: [
      "CBN Guide to Charges (2020) Part 2(A), Section 2.5 & Footnote 3",
      "CBN CPR 2019 Reg. 4.6(b)–(c)",
      "FCCPC DEON Regulations 2025 Regs. 17(a)–(c) & 23",
    ],
  },
  {
    subClauseId: "2.2",
    category: "DEBT_COLLECTION_AND_PENALTIES",
    sectionTitle: "Debt Collection & Penal Charges",
    topicTitle: "Permitted Borrower Contact Window (8:00 a.m.–9:00 p.m.) & Financial Hardship Restructuring",
    matchPatterns: [/debt\s*collection/i, /collections\s*agent/i, /recovery\s*agent/i, /repayment\s*reminder/i, /overdue/i],
    statutoryBreaches: [
      "CBN CPR 2019 Regs. 3.2.1, 5.2.4–5.2.5, 5.5.6 & 5.5.7(c): Prohibits recovery contact outside 8:00 a.m. to 9:00 p.m. (Reg. 5.5.7(c)), requires fair and respectful engagement including restructuring discussions for borrowers in financial difficulty (Regs. 3.2.1, 5.2.4–5.2.5), and holds the institution strictly liable for third-party recovery agents (Reg. 5.5.6).",
    ],
    compliantReplacementClause:
      "Borrower-Only Recovery Contact Window & Hardship Restructuring: All repayment reminders and recovery communications shall be directed exclusively to the borrower (or a formally contracted guarantor) between 8:00 a.m. and 9:00 p.m. Nigerian time (CBN CPR 2019 Reg. 5.5.7(c)). Where a borrower demonstrates genuine financial difficulty, collections personnel shall offer documented loan restructuring or workout assessment under CBN CPR 2019 Regs. 5.2.4–5.2.5. The Company and Lender of Record remain strictly liable for all internal and outsourced collection agents under CBN CPR 2019 Reg. 5.5.6.",
    governingAuthorities: [
      "CBN CPR 2019 Regs. 3.2.1, 5.2.4–5.2.5, 5.5.6 & 5.5.7(c)",
      "FCCPC DEON Regulations 2025 Reg. 19(a)",
    ],
  },
  {
    subClauseId: "2.3",
    category: "DEBT_COLLECTION_AND_PENALTIES",
    sectionTitle: "Debt Collection & Penal Charges",
    topicTitle: "Prohibition on Third-Party Contact Shaming & Employer HR Harassment",
    matchPatterns: [/phonebook/i, /contacts/i, /employer/i, /third[- ]?part/i, /family/i, /colleague/i, /whatsapp/i],
    statutoryBreaches: [
      "CBN Consumer Protection Regulations (CPR) 2019 Reg. 5.5.7(a) & Regs. 5.4.1–5.4.5: Explicitly prohibits contacting a borrower's friends, employer, relatives, or neighbours in connection with debt recovery unless such person is a formal guarantor or co-obligor, and bars unauthorized disclosure of customer debt status.",
      "FCCPC DEON Regulations 2025 Regs. 19(a) & 21(a): Strictly bans third-party contact shaming, workplace harassment, and use of scraped phonebook contacts.",
      "NDPA 2023 Sections 24(1)(a)–(c), 25 & 39: Unlawful disclosure of the borrower's confidential financial data and unlawful processing of third-party contact data without consent.",
    ],
    compliantReplacementClause:
      "Strict Prohibition on Third-Party & Employer Contact: Collections personnel, automated dialers, and external recovery agencies are strictly prohibited from contacting a borrower's phonebook contacts, family members, colleagues, neighbours, or employer HR department, unless a specific individual has executed a valid, verified Guarantor Agreement for the facility, in compliance with CBN CPR 2019 Reg. 5.5.7(a), FCCPC DEON Regulations 2025 Regs. 19(a) & 21(a), and NDPA 2023 Sections 24, 25 & 39.",
    governingAuthorities: [
      "CBN CPR 2019 Regs. 5.4.1–5.4.5 & 5.5.7(a)",
      "FCCPC DEON Regulations 2025 Regs. 19(a) & 21(a)",
      "NDPA 2023 Sections 24(1)(a)–(c), 25 & 39",
    ],
  },
  {
    subClauseId: "2.4",
    category: "DEBT_COLLECTION_AND_PENALTIES",
    sectionTitle: "Debt Collection & Penal Charges",
    topicTitle: "Ban on Public Defamation / Social Media Shaming & Lawful Credit Bureau Escalation",
    matchPatterns: [/defaulters?\s*wall/i, /social\s*media/i, /publish.*debt/i, /shaming/i, /defam/i],
    statutoryBreaches: [
      "NDPA 2023 Sections 24(1)(a),(f), 25 & 39: Public disclosure of BVN, photograph, full name, and debt status on social media is an egregious data breach and unlawful processing of sensitive financial identity records.",
      "FCCPC DEON Regulations 2025 Regs. 19(a) & 25(1)(c): Prohibits public shaming and defamation, and restricts default reporting strictly to licensed Credit Bureaus.",
      "CBN CPR 2019 Regs. 3.2.1 & 5.4.1–5.4.5: Violates banking confidentiality and dignified treatment of consumers.",
    ],
    compliantReplacementClause:
      "Abolition of Public Shaming & Lawful Credit Bureau / Legal Recovery: Publishing or threatening to publish any customer's name, photograph, BVN, NIN, or debt status on social media (such as any public 'defaulters wall') or any public forum is strictly prohibited and constitutes a dismissible offence. Unresolved defaults exceeding statutory notice periods shall be escalated solely through lawful demand notices, reporting to CBN-licensed Credit Bureaus after requisite notice under FCCPC DEON Regulations 2025 Reg. 25(1)(c), or civil recovery proceedings.",
    governingAuthorities: [
      "NDPA 2023 Sections 24(1)(a),(f), 25 & 39",
      "FCCPC DEON Regulations 2025 Regs. 19(a) & 25(1)(c)",
      "CBN CPR 2019 Regs. 3.2.1 & 5.4.1–5.4.5",
    ],
  },

  // DATA RETENTION, LOCALISATION & BREACH PROTOCOL
  {
    subClauseId: "3.1",
    category: "DATA_RETENTION_LOCALISATION_AND_BREACH",
    sectionTitle: "Data Retention & Breach Protocol",
    topicTitle: "Indefinite Retention & Mandatory 5-Year Post-Closure Statutory Floor + Unlawful Data Purge",
    matchPatterns: [/retention/i, /indefinit/i, /account\s*closure/i, /archive/i, /purge/i],
    statutoryBreaches: [
      "MLPPA 2022 Section 8(1)–(2); CBN AML/CFT/CPF Regulations 2022 Regs. 35–36; FCCPC DEON 2025 Reg. 25(2): Prescribes a mandatory minimum 5-year retention period post-account closure or transaction completion for lawful KYC (BVN/NIN) and transaction records.",
      "NDPA 2023 Section 24(1)(d) & NDPC GAID 2025 Article 23: Prohibits indefinite retention beyond the statutory purpose. Furthermore, unlawfully collected contact/SMS/media logs have zero lawful basis and must be purged immediately rather than retained for 5 years.",
    ],
    compliantReplacementClause:
      "Tiered Statutory Retention & Mandatory Purge Schedule: Lawfully collected KYC records (BVN, NIN), account statements, and transaction logs shall be retained for five (5) years following account closure or transaction completion pursuant to MLPPA 2022 Section 8, CBN AML/CFT/CPF Regulations 2022 Regs. 35–36, and FCCPC DEON 2025 Reg. 25(2), after which they shall be securely deleted or anonymised under NDPA 2023 Section 24(1)(d) and NDPC GAID 2025 Article 23 unless subject to a statutory litigation/regulatory hold. Any unlawfully harvested device contact logs, call logs, SMS logs, or photo gallery files shall be purged immediately and permanently.",
    governingAuthorities: [
      "MLPPA 2022 Section 8(1)–(2)",
      "CBN AML/CFT/CPF Regulations 2022 Regs. 35–36",
      "FCCPC DEON Regulations 2025 Reg. 25(2)",
      "NDPA 2023 Section 24(1)(d) & NDPC GAID 2025 Article 23",
    ],
  },
  {
    subClauseId: "3.2",
    category: "DATA_RETENTION_LOCALISATION_AND_BREACH",
    sectionTitle: "Data Retention & Breach Protocol",
    topicTitle: "Offshore Cloud Hosting, Cross-Border Safeguards & CBN Data Localisation",
    matchPatterns: [/aws/i, /us[- ]?east/i, /virginia/i, /offshore/i, /cross[- ]?border/i, /locali[sz]ation/i, /servers/i, /cloud/i],
    statutoryBreaches: [
      "NDPA 2023 Sections 29 & 41–43; NDPC GAID 2025 Articles 34, 45 & Schedule 5: Prohibits transferring personal data to foreign jurisdictions without an adequacy basis or NDPC-compliant cross-border transfer instrument, transfer risk assessment, and binding data processor contract.",
      "CBN Payments Data Localisation Circular (15 June 2026) & Implementation FAQ (4 November 2026): Mandates domestic in-country hosting and processing of Nigerian payment transaction and KYC records by the 1 January 2027 deadline.",
    ],
    compliantReplacementClause:
      "Nigerian Payments Data Localisation & Cross-Border Safeguards: All primary payment transaction data, BVN/NIN KYC records, and core customer databases shall be hosted on accredited in-country Nigerian cloud/data-centre infrastructure in compliance with the CBN Payments Data Localisation Circular (15 June 2026) and CBN FAQ (4 November 2026) ahead of the 1 January 2027 deadline. Any permitted secondary cross-border processing must be covered by a binding Data Processing Agreement under NDPA 2023 Section 29 & GAID 2025 Article 34 and an approved cross-border transfer instrument under NDPA 2023 Sections 41–43 and GAID 2025 Article 45 & Schedule 5.",
    governingAuthorities: [
      "NDPA 2023 Sections 29 & 41–43",
      "NDPC GAID 2025 Articles 34, 45 & Schedule 5",
      "CBN Payments Data Localisation Circular (15 June 2026) & FAQ (4 Nov 2026)",
    ],
  },
  {
    subClauseId: "3.3",
    category: "DATA_RETENTION_LOCALISATION_AND_BREACH",
    sectionTitle: "Data Retention & Breach Protocol",
    topicTitle: "Mandatory 72-Hour NDPC Breach Notification & Unconditional Reporting",
    matchPatterns: [/data\s*breach/i, /breach/i, /ndpc/i, /media\s*coverage/i, /incident/i],
    statutoryBreaches: [
      "NDPA 2023 Section 40(1)–(7) & NDPC GAID 2025 Article 33: Strictly prohibits conditioning regulatory breach notification on media coverage or delaying notice beyond 72 hours. Processors must notify the controller immediately (Section 40(1)), and the controller must notify the NDPC within 72 hours of becoming aware of any breach likely to result in a risk to individuals (Section 40(2)), with phased reporting allowed under Section 40(4) where full forensic details are pending.",
    ],
    compliantReplacementClause:
      "Mandatory 72-Hour NDPC Breach Notification & Immediate Processor Escalation: Any internal unit or third-party processor detecting a personal data breach must notify the DPO and CISO immediately upon awareness (NDPA 2023 Section 40(1)). Where a breach is likely to result in a risk to the rights and freedoms of individuals, the Company shall notify the NDPC within seventy-two (72) hours of awareness—strictly irrespective of external publicity or media coverage—using phased disclosures under NDPA 2023 Section 40(2) & (4) and logging the incident in the permanent Breach Register under NDPC GAID 2025 Article 33.",
    governingAuthorities: [
      "NDPA 2023 Section 40(1), (2), (4)–(7)",
      "NDPC GAID 2025 Article 33",
    ],
  },
  {
    subClauseId: "3.4",
    category: "DATA_RETENTION_LOCALISATION_AND_BREACH",
    sectionTitle: "Data Retention & Breach Protocol",
    topicTitle: "Immediate High-Risk Data Subject Breach Notification",
    matchPatterns: [/data\s*breach/i, /breach/i, /incident/i, /security/i],
    statutoryBreaches: [
      "NDPA 2023 Section 40(3) & NDPC GAID 2025 Article 33: Fails to mandate direct notification to affected customers. Where a breach is likely to result in a high risk to data subjects (such as compromise of BVN, NIN, or bank statements), the controller must notify affected data subjects immediately in plain and clear language.",
    ],
    compliantReplacementClause:
      "Immediate High-Risk Data Subject Notification: Where a personal data breach involves financial identifiers (BVN, NIN, bank statements, credentials) or otherwise poses a high risk to the rights and freedoms of customers, the Company shall immediately communicate the breach directly to affected data subjects in clear, plain language, detailing protective remediation steps and DPO contact coordinates in accordance with NDPA 2023 Section 40(3) and NDPC GAID 2025 Article 33.",
    governingAuthorities: [
      "NDPA 2023 Section 40(3)",
      "NDPC GAID 2025 Article 33",
    ],
  },

  // CUSTOMER COMPLAINTS, REDRESS & PAYMENT REVERSAL CLOCKS
  {
    subClauseId: "4.1",
    category: "COMPLAINTS_AND_EFT_REDRESS",
    sectionTitle: "Customer Complaint & Fraud Redress",
    topicTitle: "Multi-Channel Dispute Intake & 24/7 Emergency Fraud Hotline",
    matchPatterns: [/email\s*only/i, /complaint/i, /dispute/i, /hotline/i, /redress/i],
    statutoryBreaches: [
      "CBN Consumer Protection Regulations (CPR) 2019 Section 6.2 & Reg. 6.2.4: Prohibits restricting customers to email-only dispute submission; mandates multiple accessible, free-of-charge complaint channels and a dedicated 24/7 emergency channel for reporting fraud, unauthorized debits, and compromised credentials.",
      "FCCPC DEON Regulations 2025 Regs. 19(c) & 22(a)–(c): Requires accessible multi-channel consumer support for lending and platform users.",
    ],
    compliantReplacementClause:
      "Multi-Channel Dispute Intake & 24/7 Emergency Fraud Hotline: Customers may submit complaints free of charge across multiple accessible channels—including in-app dispute ticketing, a toll-free telephone helpline, web portal, email, and physical/postal intake—and shall have access to a dedicated 24/7 emergency channel for reporting unauthorized debits and suspected fraud, in compliance with CBN CPR 2019 Section 6.2 & Reg. 6.2.4 and FCCPC DEON Regulations 2025 Regs. 19(c) & 22(a)–(c).",
    governingAuthorities: [
      "CBN CPR 2019 Section 6.2 & Reg. 6.2.4",
      "FCCPC DEON Regulations 2025 Regs. 19(c) & 22(a)–(c)",
    ],
  },
  {
    subClauseId: "4.2",
    category: "COMPLAINTS_AND_EFT_REDRESS",
    sectionTitle: "Customer Complaint & Fraud Redress",
    topicTitle: "Mandatory 24-Hour Complaint Acknowledgement & Unique Tracking ID",
    matchPatterns: [/acknowledg/i, /tracking/i, /complaint/i, /dispute/i],
    statutoryBreaches: [
      "CBN CPR 2019 Regs. 6.2.2 & 6.3.2: Mandates acknowledging every customer complaint within 24 hours of receipt accompanied by a unique tracking reference number. (The 5-working-day timeline in CBN CPR Reg. 3.2.6 applies only to general informational enquiries/requests, NOT complaints or transaction disputes).",
    ],
    compliantReplacementClause:
      "Mandatory 24-Hour Complaint Acknowledgement & Tracking ID: Every customer complaint or transaction dispute shall be formally acknowledged within twenty-four (24) hours of receipt with an automated unique tracking reference number and expected resolution timeline pursuant to CBN CPR 2019 Regs. 6.2.2 & 6.3.2 (reserving the 5-working-day window in Reg. 3.2.6 strictly for non-dispute general enquiries).",
    governingAuthorities: [
      "CBN CPR 2019 Regs. 6.2.2 & 6.3.2 (distinguished from Reg. 3.2.6)",
    ],
  },
  {
    subClauseId: "4.3",
    category: "COMPLAINTS_AND_EFT_REDRESS",
    sectionTitle: "Customer Complaint & Fraud Redress",
    topicTitle: "Statutory Payment Reversal & Lending Complaint Resolution Clocks",
    matchPatterns: [/failed\s*transfer/i, /unauthorized\s*debit/i, /chargeback/i, /dispense\s*error/i, /instant\s*eft/i, /business\s*days.*resolve/i, /complaint.*resolve/i],
    statutoryBreaches: [
      "CBN Regulation on Instant (Inter-Bank) Electronic Funds Transfer Services 2018 Sections 5.2(8), 5.2(9), 5.3(2)–(4), 10.1.2 & 11: Mandates sender refund within 10 minutes on returned Instant EFTs (s. 5.2(8)), 1 hour post-settlement where details are unavailable (s. 5.2(9)), inward beneficiary credit within 60 seconds or max 24 hours on system exception (s. 5.3(2)–(4)), and general Instant EFT dispute closure within 3 working days (s. 10.1.2).",
      "CBN Circular on Revised Timelines for Dispense Errors & Refund Complaints (29 May 2020, eff. 8 June 2020) Items 1–3: Mandates instant / max 24-hour reversal for failed On-Us ATM transactions and maximum 48-hour resolution for failed Not-On-Us ATM, POS, and Web transactions.",
      "FCCPC DEON Regulations 2025 Reg. 22(d): Mandates resolving digital lending complaints within 24 hours (or up to a maximum of 48 hours where an extension is communicated).",
    ],
    compliantReplacementClause:
      "Binding Statutory Resolution & Reversal Clocks: Delayed multi-week turnaround for payment reversals or lending disputes is strictly prohibited. The Company shall enforce statutory SLAs: (a) Instant EFT returned transfers refunded within 10 minutes (or 1 hour post-settlement), inward credits applied within 60 seconds (max 24 hours on exception), and general Instant EFT disputes resolved within 3 working days under CBN Instant EFT Regulation 2018 ss. 5.2(8)–(9), 5.3(2)–(4) & 10.1.2; (b) Failed On-Us ATM reversals completed instantly (max 24 hours manual) and Not-On-Us ATM, POS, and Web failed transactions resolved within 48 hours under the CBN Circular of 29 May 2020 (Items 1–3); and (c) Digital lending complaints resolved within 24 hours (or up to 48 hours maximum upon communicated extension) under FCCPC DEON Regulations 2025 Reg. 22(d).",
    governingAuthorities: [
      "CBN Instant EFT Regulation 2018 ss. 5.2(8)–(9), 5.3(2)–(4), 10.1.2 & 11",
      "CBN Circular of 29 May 2020 (eff. 8 June 2020) Items 1–3",
      "FCCPC DEON Regulations 2025 Reg. 22(d)",
    ],
  },
  {
    subClauseId: "4.4",
    category: "COMPLAINTS_AND_EFT_REDRESS",
    sectionTitle: "Customer Complaint & Fraud Redress",
    topicTitle: "Post-Resolution Remedies, Next-Day SRC & Regulatory Escalation Rights",
    matchPatterns: [/complaint/i, /dispute/i, /unauthorized\s*debit/i, /redress/i, /fraud/i],
    statutoryBreaches: [
      "CBN CPR 2019 Regs. 6.3.7–6.3.11 & 6.3.13–6.4: Omits mandatory customer remedies—including refund of wrongful debits with applicable interest and a formal written apology, issuance of a Summary Resolution Communication (SRC) by the next business day, and explicit notice of escalation rights to the CBN CPD, FCCPC (DEON Reg. 26), and NDPC (NDPA s. 46 / GAID Articles 39–40).",
    ],
    compliantReplacementClause:
      "Post-Resolution Remedies, Next-Day SRC & Regulatory Escalation: Upon resolving any unauthorized debit or overcharge, the Company shall refund the full principal together with applicable interest and a formal written apology, and shall issue a Summary Resolution Communication (SRC) by the next business day informing the customer of their right to escalate unresolved disputes to the CBN Consumer Protection Department (CBN CPR 2019 Regs. 6.3.7–6.3.11, 6.3.13–6.4), the FCCPC (DEON 2025 Reg. 26), or the NDPC via a Standard Notice to Address Grievance (NDPA 2023 s. 46; GAID 2025 Articles 39–40).",
    governingAuthorities: [
      "CBN CPR 2019 Regs. 6.3.7–6.3.11 & 6.3.13–6.4",
      "FCCPC DEON Regulations 2025 Reg. 26",
      "NDPA 2023 Section 46 & NDPC GAID 2025 Articles 39–40",
    ],
  },

  // AML/CFT/CPF, BVN/NIN KYC & NFIU REPORTING
  {
    subClauseId: "5.1",
    category: "AML_CFT_KYC_AND_NFIU",
    sectionTitle: "AML/CFT & Suspicious Transactions",
    topicTitle: "Mandatory Electronic BVN & NIN Verification (Zero KYC Waivers)",
    matchPatterns: [/bvn/i, /\bnin\b/i, /kyc/i, /waive/i, /cdd/i, /tier\s*[123]/i, /onboarding/i],
    statutoryBreaches: [
      "CBN Circular PSM/DIR/PUB/CIR/001/053 (1 December 2023): Prohibits opening or operating any wallet/account without electronically validated BVN/NIN (Tier 1 requires BVN or NIN; Tiers 2 and 3 require BOTH validated BVN and NIN). Zero waivers are permitted.",
      "MLPPA 2022 Section 4 & CBN AML/CFT/CPF Regulations 2022 Regs. 19–26: Mandates full CDD prior to onboarding or transacting and strictly prohibits unverified or anonymous accounts.",
    ],
    compliantReplacementClause:
      "Mandatory Electronic BVN & NIN Verification (Zero Waivers): No account, wallet, or credit facility shall be opened or transacted without prior electronic verification of the customer's BVN and NIN against NIBSS and NIMC databases in strict compliance with CBN Circular PSM/DIR/PUB/CIR/001/053 (1 December 2023), MLPPA 2022 Section 4, and CBN AML/CFT/CPF Regulations 2022 Regs. 19–26. Tier 1 accounts require validated BVN or NIN, while Tier 2 and Tier 3 accounts require BOTH validated BVN and NIN. Agents and officers have zero authority to waive BVN or NIN verification under any circumstance.",
    governingAuthorities: [
      "CBN Circular PSM/DIR/PUB/CIR/001/053 (1 Dec 2023)",
      "MLPPA 2022 Section 4",
      "CBN AML/CFT/CPF Regulations 2022 Regs. 19–26",
    ],
  },
  {
    subClauseId: "5.2",
    category: "AML_CFT_KYC_AND_NFIU",
    sectionTitle: "AML/CFT & Suspicious Transactions",
    topicTitle: "Enhanced Due Diligence (EDD) & Sanctions Screening for High-Value Clients / VIPs / PEPs",
    matchPatterns: [/vip/i, /referral/i, /\bpep\b/i, /politically\s*exposed/i, /edd/i, /enhanced\s*due\s*diligence/i, /sanctions/i],
    statutoryBreaches: [
      "CBN AML/CFT/CPF Regulations 2022 Regs. 28–29 & Reg. 6: High-value VIP referrals and Politically Exposed Persons (PEPs) require Enhanced Due Diligence (EDD), senior management approval, source-of-wealth/source-of-funds verification, and Targeted Financial Sanctions (TFS) screening—never simplified or waived KYC.",
    ],
    compliantReplacementClause:
      "Enhanced Due Diligence (EDD) for High-Value Clients & PEPs: High-value accounts, VIP referrals, and Politically Exposed Persons (PEPs) shall automatically trigger Enhanced Due Diligence (EDD)—requiring verified source of wealth and source of funds, Targeted Financial Sanctions (TFS) screening under CBN AML/CFT/CPF Regulations 2022 Reg. 6, written senior management approval, and heightened ongoing transaction monitoring pursuant to CBN AML/CFT/CPF Regulations 2022 Regs. 28–29.",
    governingAuthorities: [
      "CBN AML/CFT/CPF Regulations 2022 Regs. 6 & 28–29",
      "MLPPA 2022 Section 4",
    ],
  },
  {
    subClauseId: "5.3",
    category: "AML_CFT_KYC_AND_NFIU",
    sectionTitle: "AML/CFT & Suspicious Transactions",
    topicTitle: "Zero-Threshold Suspicious Transaction Reporting (24-Hour NFIU goAML Mandate)",
    matchPatterns: [/suspicious/i, /\bstr\b/i, /nfiu/i, /goaml/i, /quarterly/i, /month[- ]?end/i, /aml/i],
    statutoryBreaches: [
      "MLPPA 2022 Section 7(1)–(2); CBN AML/CFT/CPF Regulations 2022 Regs. 37–40; NFIU 2024 STR Guidelines: Imposing an internal monetary floor or delaying STR reviews to periodic/month-end/quarterly batches is a severe statutory violation. STRs have ZERO monetary threshold (apply to any amount, whether completed or attempted) and must be filed electronically with the NFIU via goAML immediately and within 24 hours of forming suspicion.",
    ],
    compliantReplacementClause:
      "Zero-Threshold Suspicious Transaction Reporting (24-Hour NFIU goAML Mandate): Suspicious Transaction Reports (STRs) are subject to zero monetary threshold and cover both completed and attempted transactions of any value. Automated monitoring alerts shall be examined promptly by the MLRO/compliance team, and upon establishing reasonable grounds for suspicion, an STR shall be filed electronically with the NFIU via the goAML portal immediately and within twenty-four (24) hours in compliance with MLPPA 2022 Section 7(1)–(2), CBN AML/CFT/CPF Regulations 2022 Regs. 37–40, and the NFIU 2024 STR Guidelines.",
    governingAuthorities: [
      "MLPPA 2022 Section 7(1)–(2)",
      "CBN AML/CFT/CPF Regulations 2022 Regs. 37–40",
      "NFIU 2024 STR Guidelines",
    ],
  },
  {
    subClauseId: "5.4",
    category: "AML_CFT_KYC_AND_NFIU",
    sectionTitle: "AML/CFT & Suspicious Transactions",
    topicTitle: "Statutory Threshold Reporting (7-Day CTRs & 1-Day International FTRs)",
    matchPatterns: [/\bctr\b/i, /\bftr\b/i, /nfiu/i, /mlppa/i, /5,000,000/i, /10,000,000/i, /threshold/i, /aml/i],
    statutoryBreaches: [
      "MLPPA 2022 Section 11 & Section 3(1): Distinguishes suspicion-based STRs from statutory threshold reports. Under Section 11, domestic transactions exceeding ₦5,000,000 (individual) or ₦10,000,000 (body corporate) require a Currency Transaction Report (CTR) to the NFIU within 7 days. Under Section 3(1), international funds transfers exceeding USD 10,000 (or equivalent) require a Foreign Transfer Report (FTR) to NFIU, CBN, and SEC within 1 day.",
    ],
    compliantReplacementClause:
      "Statutory Threshold Reporting (7-Day CTR & 1-Day FTR): Independently of STR filings, the Compliance Unit shall file: (a) Currency Transaction Reports (CTRs) with the NFIU within seven (7) days for any single transaction or lodgement exceeding ₦5,000,000 for an individual or ₦10,000,000 for a body corporate pursuant to MLPPA 2022 Section 11; and (b) Foreign Funds Transfer Reports (FTRs) with the NFIU, CBN, and SEC within one (1) day for any cross-border transfer exceeding USD 10,000 (or equivalent) pursuant to MLPPA 2022 Section 3(1).",
    governingAuthorities: [
      "MLPPA 2022 Section 11 (7-day CTR: >₦5M individual / >₦10M corporate)",
      "MLPPA 2022 Section 3(1) (1-day FTR: >USD 10,000)",
    ],
  },
  {
    subClauseId: "5.5",
    category: "AML_CFT_KYC_AND_NFIU",
    sectionTitle: "AML/CFT & Suspicious Transactions",
    topicTitle: "Direct PSP/Institution AML Accountability, Non-Tipping-Off & MLRO Governance",
    matchPatterns: [/aml/i, /cft/i, /mlro/i, /tipping[- ]?off/i, /nfiu/i, /mlppa/i],
    statutoryBreaches: [
      "MLPPA 2022 Section 7(3); CBN AML/CFT/CPF Regulations 2022 Regs. 9–15 & 39; NFIU 2024 STR Guidelines: Enforces the strict statutory prohibition against tipping off customers or third parties regarding an STR investigation, and mandates direct institutional AML governance (Board-approved programme, independent MLRO, ongoing staff training, and independent AML audit).",
    ],
    compliantReplacementClause:
      "Direct Institutional AML Accountability, Non-Tipping-Off & MLRO Governance: As a directly regulated institution under the CBN AML/CFT/CPF Regulations 2022, the Company shall maintain its own Board-approved AML/CFT/CPF framework, designate an independent management-level MLRO/Chief Compliance Officer, conduct annual staff training and independent audits (Regs. 9–15), and enforce strict confidentiality and non-tipping-off prohibitions under MLPPA 2022 Section 7(3) and the NFIU 2024 STR Guidelines.",
    governingAuthorities: [
      "MLPPA 2022 Section 7(3)",
      "CBN AML/CFT/CPF Regulations 2022 Regs. 9–15 & 39",
      "NFIU 2024 STR Guidelines",
    ],
  },
];

/**
 * Multi-Facet Search Query Decomposer
 *
 * Scans the ENTIRE prompt (no 180-character or 320-character early truncation)
 * and extracts targeted statutory + live-web search queries covering only the
 * substantive regulatory domains detected in the prompt.
 */
export function decomposePromptIntoSearchFacets(
  rawPrompt: string,
  jurisdiction = "NG"
): {
  primaryVaultQuery: string;
  primaryWebQuery: string;
  facetQueries: Array<{
    facetId: string;
    authority?: string;
    vaultQuery: string;
    webQuery: string;
  }>;
} {
  const cleanPrompt = rawPrompt
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\b[\w-]+\.(?:pdf|docx|doc|txt|md)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  const lower = cleanPrompt.toLowerCase();
  const isNigerianContext =
    jurisdiction.toUpperCase() === "NG" ||
    /\b(cbn|ndpa|ndpc|fccpc|deon|nfiu|mlppa|gaid|bvn|nin|ngn|nigeria|nigerian)\b/i.test(
      cleanPrompt
    );

  const facetQueries: Array<{
    facetId: string;
    authority?: string;
    vaultQuery: string;
    webQuery: string;
  }> = [];

  if (isNigerianContext) {
    // Facet 1: Consent, Bundled T&Cs, Mobile Permissions (NDPA 2023 + GAID 2025 + FCCPC DEON 2025)
    if (
      /\b(consent|bundled|irrevocable|perpetual|opt[- ]?out|contacts|sms|call logs|photo gallery|gps|ndpa|gaid|privacy)\b/i.test(
        lower
      )
    ) {
      facetQueries.push({
        facetId: "ng-consent-permissions",
        authority: "NDPC",
        vaultQuery:
          "NDPA 2023 Sections 24 25 26 27 28 35 bundled conditional consent withdrawal NDPC GAID 2025 Articles 16 17 18 28 FCCPC DEON 2025 Reg 21 contacts call logs photo gallery",
        webQuery:
          "Nigeria Data Protection Act 2023 Section 25 26 35 NDPC GAID 2025 Articles 16 17 18 bundled consent withdrawal",
      });
    }

    // Facet 2: Debt Collection Harassment, Penalty Interest Caps & Grace Period (CBN Guide to Charges + CBN CPR 2019 + FCCPC DEON 2025)
    if (
      /\b(debt|collection|collections|overdue|penalty|penal|default charge|phonebook|employer|defaulters wall|social media|deon|guide to charges|lending)\b/i.test(
        lower
      )
    ) {
      facetQueries.push({
        facetId: "ng-collections-penalties",
        authority: "CBN",
        vaultQuery:
          "CBN Guide to Charges 2020 Part 2A Section 2.5 Footnote 3 MFB 1% flat per month penal rate 3-day grace period CBN CPR 2019 Reg 4.6 5.5.7 FCCPC DEON 2025 Reg 19 21 23 25",
        webQuery:
          "CBN Guide to Charges Section 2.5 microfinance 1% flat per month penal rate 3 day grace period Consumer Protection Regulations 4.6 5.5.7",
      });
      facetQueries.push({
        facetId: "ng-fccpc-deon-lending",
        authority: "FCCPC",
        vaultQuery:
          "FCCPC Digital Electronic Online Non-Traditional Consumer Lending Regulations 2025 DEON Reg 8 10 13 17 18 19 21 22 23 25 26 contact shaming",
        webQuery:
          "FCCPC Digital Electronic Online Non-Traditional Consumer Lending Regulations 2025 DEON contact list harassment",
      });
    }

    // Facet 3: Data Retention, Cloud Localisation & 72-Hour Breach Notification (NDPA s.40 + MLPPA s.8 + CBN Localisation 2026)
    if (
      /\b(retention|indefinitely|aws|offshore|cross[- ]?border|breach|72 hours|30 days|localisation|localization|account closure|data protection)\b/i.test(
        lower
      )
    ) {
      facetQueries.push({
        facetId: "ng-retention-breach-localisation",
        authority: "NDPC",
        vaultQuery:
          "NDPA 2023 Section 40 72 hours personal data breach notification Section 41 42 43 cross-border transfer GAID 2025 Article 33 45 Schedule 5 MLPPA 2022 Section 8 5 years retention CBN 2026 data localisation",
        webQuery:
          "NDPA 2023 Section 40 72 hours data breach notification cross-border transfer Section 41 43 CBN data localisation",
      });
    }

    // Facet 4: Customer Complaints, 24h Acknowledgement & Failed Transfer / Dispense Error SLAs
    if (
      /\b(complaint|dispute|email only|acknowledge|failed transfer|unauthorized debit|chargeback|dispense error|redress|cpr)\b/i.test(
        lower
      )
    ) {
      facetQueries.push({
        facetId: "ng-complaints-eft-redress",
        authority: "CBN",
        vaultQuery:
          "CBN Instant EFT Regulation 2018 ss 5.2 5.3 10.1.2 10 minutes 48 hours dispense error circular May 2020 CBN CPR 2019 Reg 6.2.2 6.3.2 24h acknowledgement Reg 3.2.6 DEON Reg 22(d)",
        webQuery:
          "CBN CPR 2019 6.2.2 6.3.2 24h complaint Instant EFT 2018 dispense error 48h",
      });
    }

    // Facet 5: AML/CFT/CPF, BVN/NIN KYC Mandatory Circular & NFIU goAML STR/CTR/FTR
    if (
      /\b(aml|cft|cpf|bvn|nin|kyc|cdd|edd|pep|waive|vip|suspicious|str|ctr|ftr|nfiu|goaml|mlppa|sanctions)\b/i.test(
        lower
      )
    ) {
      facetQueries.push({
        facetId: "ng-aml-kyc-nfiu",
        authority: "NFIU",
        vaultQuery:
          "MLPPA 2022 Section 3(1) 4 7 8 11 NFIU goAML 24h STR 7d CTR CBN Circular PSM/DIR/PUB/CIR/001/053 Dec 2023 mandatory BVN NIN Tier 1 2 3 CBN AML/CFT/CPF Regs 2022",
        webQuery:
          "CBN mandatory BVN NIN Dec 2023 MLPPA 2022 s7 s11 NFIU goAML STR 24h",
      });
    }
  }

  // Fallback if prompt is a single-topic or unrelated policy query
  if (facetQueries.length === 0) {
    const concise = cleanPrompt
      .replace(
        /^(please\s+|can you\s+|could you\s+|perform\s+a\s+|provide\s+a\s+|analyze\s+|audit\s+|review\s+)/i,
        ""
      )
      .slice(0, 240)
      .trim();

    return {
      primaryVaultQuery: concise || cleanPrompt.slice(0, 240),
      primaryWebQuery: concise.slice(0, 160) || cleanPrompt.slice(0, 160),
      facetQueries: [
        {
          facetId: "primary-topic",
          vaultQuery: concise || cleanPrompt.slice(0, 240),
          webQuery: concise.slice(0, 160) || cleanPrompt.slice(0, 160),
        },
      ],
    };
  }

  const perFacetVaultBudget = Math.max(120, Math.floor(1100 / facetQueries.length));
  const perFacetWebBudget = Math.max(55, Math.floor(380 / facetQueries.length));

  const primaryVaultQuery = facetQueries
    .map((f) => f.vaultQuery.slice(0, perFacetVaultBudget).trim())
    .join(" | ")
    .slice(0, 1150);
  const primaryWebQuery = facetQueries
    .map((f) => f.webQuery.slice(0, perFacetWebBudget).trim())
    .join(" ")
    .slice(0, 400);

  return {
    primaryVaultQuery,
    primaryWebQuery,
    facetQueries,
  };
}

/**
 * Matches relevant authoritative Nigerian statutory provisions strictly by domain keywords & authority signals.
 */
export function matchAuthoritativeNigerianProvisions(
  text: string,
  limit = 25
): AuthoritativeStatutoryProvision[] {
  const lower = text.toLowerCase();

  const scored = NIGERIAN_STATUTORY_PROVISIONS.map((prov) => {
    let score = 0;
    for (const kw of prov.keywords) {
      if (lower.includes(kw.toLowerCase())) {
        score += 3;
      }
    }
    if (lower.includes(prov.authority.toLowerCase())) {
      score += 2;
    }
    if (lower.includes(prov.documentTitle.toLowerCase())) {
      score += 3;
    }
    return { prov, score };
  })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return NIGERIAN_STATUTORY_PROVISIONS.slice(0, Math.min(limit, 5));
  }

  return scored.slice(0, limit).map((item) => item.prov);
}

/**
 * Returns only the sub-clause redline templates whose substantive domain patterns match the analyzed policy.
 */
export function matchSubClauseGapTemplates(text: string): SubClauseGapTemplate[] {
  return NIGERIAN_SOP_SUBCLAUSE_TEMPLATES.filter((tpl) =>
    tpl.matchPatterns.some((re) => re.test(text))
  );
}

/**
 * Returns only the mandatory statutory clocks relevant to the domains detected in the analyzed policy.
 */
export function matchApplicableOperationalClocks(
  text: string,
  matchedTemplates?: SubClauseGapTemplate[],
  matchedProvisions?: AuthoritativeStatutoryProvision[]
): MandatoryOperationalClockEntry[] {
  const templates = matchedTemplates ?? matchSubClauseGapTemplates(text);
  const provisions = matchedProvisions ?? matchAuthoritativeNigerianProvisions(text, 25);

  const activeCategories = new Set<AuthoritativeStatutoryProvision["category"]>([
    ...templates.map((t) => t.category),
    ...provisions.map((p) => p.category),
  ]);

  if (activeCategories.size === 0) {
    return [];
  }

  return NIGERIAN_MANDATORY_OPERATIONAL_CLOCKS.filter((clock) =>
    activeCategories.has(clock.category)
  );
}
