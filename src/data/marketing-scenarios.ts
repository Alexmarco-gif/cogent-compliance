/**
 * Canonical Positioning & SEO Content Data for Cogent (Stem Systems)
 * Core Identity: Fintech & Banking Regulatory Compliance Management Software for Nigeria & Africa
 * Compressing 3–10 day compliance research, policy updates, audit replies & launches into minutes.
 */

export interface StudioWorkflowCase {
  id: "structuring" | "policy" | "inquiry" | "crossborder" | "marketing";
  tabLabel: string;
  roleLabel: string;
  timeSavedBadge: string;
  liveWebEnabled: boolean;
  userPrompt: string;
  sourcesUsed: Array<{
    tag: string;
    label: string;
    domain: string;
  }>;
  synthesisBullets: string[];
  artifactType: string;
  artifactTitle: string;
  artifactSections: Array<{
    heading: string;
    body: string;
    highlight?: "redline" | "addition" | "matrix";
  }>;
  matrixRows?: Array<{
    metric: string;
    nigeria: string;
    kenya: string;
  }>;
}

export const STUDIO_WORKFLOW_CASES: StudioWorkflowCase[] = [
  {
    id: "structuring",
    tabLabel: "Product Structuring",
    roleLabel: "Product + General Counsel",
    timeSavedBadge: "4 days → 3 minutes",
    liveWebEnabled: true,
    userPrompt:
      "We want to launch a USD virtual card and BNPL checkout in Nigeria. What CBN, NDPC, and FCCPC rules apply, what payment data localization rules hold, and what customer disclosures are mandatory?",
    sourcesUsed: [
      { tag: "[1]", label: "CBN Card Issuance, FX & Data Localization Circulars", domain: "Nigerian Law Library" },
      { tag: "[2]", label: "NDPA 2023 §41 & GAID 2025 Cross-Border Transfer Rules", domain: "Nigerian Law Library" },
      { tag: "[3]", label: "FCCPC DEON Consumer Lending & Disclosure Framework", domain: "Live .gov.ng Monitor" },
    ],
    synthesisBullets: [
      "USD virtual card funding via Naira cards remains governed by CBN FX settlement guidelines; partner sponsorship with a CBN-licensed bank or authorized card issuer is required.",
      "BNPL credit exposure triggers FCCPC DEON digital lending disclosure duties: upfront repayment schedule, late-fee cap disclosure, and zero contact-scraping.",
      "Payment transaction logs created in Nigeria are subject to CBN local data storage rules (January 1, 2027 deadline), while cross-border card routing requires NDPA 2023 §41 consent.",
    ],
    artifactType: "PRODUCT COMPLIANCE BRIEF",
    artifactTitle: "Pre-Launch Compliance Checklist: USD Virtual Card & BNPL",
    artifactSections: [
      {
        heading: "1. Licensing & Partner Bank Perimeter",
        body: "Route USD settlement through a CBN-licensed acquiring bank (BOFIA 2020 §2). State explicitly in card terms that FX conversion executes at prevailing authorized market rates.",
      },
      {
        heading: "2. BNPL Credit & Late-Fee Disclosures",
        body: "Display total Naira repayable, APR/fee breakdown, and cooling-off notice prior to PIN confirmation (FCCPC DEON Regs / CBN Consumer Protection §3.2).",
        highlight: "addition",
      },
      {
        heading: "3. CBN Data Localization & Cross-Border Consent",
        body: "Maintain primary payment transaction records inside Nigeria ahead of the January 1, 2027 CBN deadline and log explicit checkout consent for card tokenization under NDPA 2023 §41–43.",
      },
    ],
  },
  {
    id: "policy",
    tabLabel: "AML & Policy Updates",
    roleLabel: "CCO / MLRO + Risk",
    timeSavedBadge: "1 week → 4 minutes",
    liveWebEnabled: true,
    userPrompt:
      "Compare the 2026 CBN Baseline Standards for Automated AML/CFT/CPF & Agent Banking Circular against our uploaded AML Policy v2.4 and draft exact replacement clauses.",
    sourcesUsed: [
      { tag: "[1]", label: "Internal AML/CFT Policy v2.4 (§4.1 – §6.3)", domain: "Company Policy Library" },
      { tag: "[2]", label: "CBN Baseline Standards for Automated AML Circular", domain: "Live cbn.gov.ng Monitor" },
      { tag: "[3]", label: "NFIU goAML 24-Hour STR & Sanctions Rules", domain: "Nigerian Law Library" },
    ],
    synthesisBullets: [
      "Section 4.2 of your uploaded AML policy still lists a 72-hour internal escalation SLA before NFIU STR filing, breaching the 24-hour reporting rule and CBN automated AML standards.",
      "Section 5.8 omits mandatory geo-fencing, Nigeria Sanctions List screening, and daily cumulative BVN/NIN thresholds required for POS agent onboarding.",
      "Ready-to-insert replacement clauses are drafted on the right in your institution's house legal style.",
    ],
    artifactType: "AML POLICY UPDATE SCHEDULE",
    artifactTitle: "AML/CFT Policy v2.5 — Compliant Clause Replacements",
    artifactSections: [
      {
        heading: "Outdated Language (§4.2 Tier-3 Escalation)",
        body: "Alerts triggered by velocity rules shall be queued for manual analyst review within 72 business hours prior to MLRO triage.",
        highlight: "redline",
      },
      {
        heading: "Compliant Replacement Clause (§4.2 Revised)",
        body: "High-risk velocity and structuring alerts generated by automated AML monitoring shall undergo immediate hold triage, with MLRO STR disposition filed to NFIU goAML within 24 hours per CBN AML/CFT Baseline Standards and MLPPA 2022 §7.",
        highlight: "addition",
      },
      {
        heading: "Agent Banking Geo-Fencing Addendum (§5.8 New)",
        body: "All active agent terminals shall bind device coordinates to approved onboarding locations, screen against the Nigeria Sanctions List, and enforce daily cumulative BVN/NIN velocity caps.",
      },
    ],
  },
  {
    id: "inquiry",
    tabLabel: "CBN & Bank Audits",
    roleLabel: "CCO + Legal Counsel",
    timeSavedBadge: "5 days → 4 minutes",
    liveWebEnabled: false,
    userPrompt:
      "Draft formal answers to Questions 1–12 of our Sponsor Bank Due-Diligence Questionnaire covering 48-hour CBN refund SLAs, NDIC pass-through wording, and BOFIA 2020 record retention.",
    sourcesUsed: [
      { tag: "[1]", label: "Uploaded Dispute & Chargeback SOP v1.9", domain: "Company Policy Library" },
      { tag: "[2]", label: "CBN Consumer Protection 48h/72h Dispute Guidelines", domain: "Nigerian Law Library" },
      { tag: "[3]", label: "BOFIA 2020 & NDPA 2023 Retention Schedule", domain: "Nigerian Law Library" },
    ],
    synthesisBullets: [
      "Cross-referenced your internal SOP v1.9 with CBN Consumer Protection Guidelines (48-hour ATM/POS refund and 72-hour NIP dispense-error SLAs).",
      "Prepared formal audit answers citing exact policy section numbers and statutory authority for sponsor-bank or CBN examination submission.",
    ],
    artifactType: "SPONSOR BANK AUDIT RESPONSE",
    artifactTitle: "Sponsor Bank Due-Diligence Reply — Questions 1–3",
    artifactSections: [
      {
        heading: "Q1. Failed Transfer & 48-Hour Refund SLA",
        body: "Confirmed. Instant reversal holds apply to failed NIP debits; failed ATM/POS dispense exceptions resolve within 48 to 72 hours max in strict alignment with CBN Consumer Protection Guidelines (Ref: Internal SOP §3.4).",
        highlight: "addition",
      },
      {
        heading: "Q2. Customer Deposit & NDIC Insurance Disclosure",
        body: "Partner sub-accounts disclose clearly that underlying deposits sit with our CBN-licensed banking partner insured by NDIC up to ₦5,000,000 statutory limits (BOFIA 2020 §2).",
      },
      {
        heading: "Q3. Transaction & KYC Record Retention",
        body: "CDD records and transaction logs remain stored in immutable Nigerian-hosted archives for a minimum of 5–7 years post-account closure per CBN AML/CFT Regulations and BOFIA 2020.",
      },
    ],
  },
  {
    id: "crossborder",
    tabLabel: "Cross-Border Licensing",
    roleLabel: "CEO + Expansion Legal",
    timeSavedBadge: "3 weeks → 60 seconds",
    liveWebEnabled: true,
    userPrompt:
      "Compare Nigerian CBN PSSP, PTSP, and MMO licensing requirements against Kenya CBK Payment Service Provider and Bank of Ghana PSP regulations.",
    sourcesUsed: [
      { tag: "[1]", label: "CBN PSSP, PTSP & MMO Licensing Framework", domain: "Nigerian Law Library" },
      { tag: "[2]", label: "Central Bank of Kenya PSP Regulations", domain: "Live cbk.go.ke Monitor" },
      { tag: "[3]", label: "Bank of Ghana Payment Systems & Services Act", domain: "Live bog.gov.gh Monitor" },
    ],
    synthesisBullets: [
      "Nigeria CBN PSSP permits payment gateway and checkout processing without holding customer deposits; MMO or MFB licensing is required to hold wallets.",
      "Kenya CBK authorization under the National Payment System Regulations requires local entity incorporation, ring-fenced trust accounts, and audited cybersecurity attestation.",
    ],
    artifactType: "CROSS-BORDER EXPANSION OS (STAGES 1–8)",
    artifactTitle: "Nigeria (CBN) → Ghana (BoG) & Kenya (CBK) 8-Stage Expansion Control Plane",
    artifactSections: [
      {
        heading: "8-Stage Cross-Border Compliance Operating Lifecycle",
        body: "Do not mirror Nigerian PSSP scripts directly in Kenya or Ghana; Cogent generates the Stage 1–2 Licensing & Obligations Register, Stage 3 Group-to-Local Policy Localisation, Stage 4 Country Risk Register, Stage 5–6 Pre-Launch Validation Tests, 6-Question CCO Go-Live Gate, and Stage 7–8 Reporting Calendar.",
      },
    ],
    matrixRows: [
      {
        metric: "Primary Regulator",
        nigeria: "Central Bank of Nigeria (CBN)",
        kenya: "Central Bank of Kenya (CBK)",
      },
      {
        metric: "Core Statute",
        nigeria: "BOFIA 2020 & CBN Payment Guidelines",
        kenya: "National Payment System Act & NPS Regs",
      },
      {
        metric: "Customer Funds Rule",
        nigeria: "Direct settlement via CBN-licensed bank/MMO",
        kenya: "Ring-fenced Trust Account with independent trustee",
      },
      {
        metric: "Local Governance",
        nigeria: "CAC entity + local MD/CCO sign-off",
        kenya: "Kenyan subsidiary + Fit & Proper CBK clearance",
      },
    ],
  },
  {
    id: "marketing",
    tabLabel: "Ad & App Clearance",
    roleLabel: "Growth + Compliance",
    timeSavedBadge: "3 days → 2 minutes",
    liveWebEnabled: false,
    userPrompt:
      "Check our QuickCash loan flyer and Google Play store listing against our 4.5%/mo + 1.5% fee rate card, ARCON advertising vetting guidelines, and FCCPC DEON rules before launch.",
    sourcesUsed: [
      { tag: "[1]", label: "QuickCash Product Schedule (4.5%/mo · 1.5% fee)", domain: "Company Policy Library" },
      { tag: "[2]", label: "FCCPC DEON Regs & Google Play 60-Day Loan Policy", domain: "Nigerian Law Library" },
      { tag: "[3]", label: "ARCON Advertising Vetting & CBN Disclosures", domain: "Nigerian Law Library" },
    ],
    synthesisBullets: [
      "Flagged '0% hidden charges' (contradicts 1.5% setup fee) and '14–30 day repayment' (violates Google Play 60-day minimum loan tenor policy and FCCPC DEON rules).",
      "Generated compliant replacement copy stating net Naira cost, 65-day+ repayment range, ARCON-ready qualifiers, and CBN/FCCPC license notice.",
    ],
    artifactType: "CLEARED CAMPAIGN & APP COPY",
    artifactTitle: "QuickCash Flyer + Google Play Store Pre-Launch Sign-Off",
    artifactSections: [
      {
        heading: "Blocked Claim",
        body: "Get instant ₦50,000 loan! Repay in 14–30 days with 0% hidden charges and guaranteed approval.",
        highlight: "redline",
      },
      {
        heading: "Cleared Replacement Copy",
        body: "Apply for up to ₦50,000 subject to credit appraisal. Repayment tenor: 65–180 days at 4.5%/mo plus 1.5% one-off fee. Representative example: ₦50,000 over 90 days; Total repayable ₦57,500. Zero contact-list access. Licensed by the CBN & FCCPC registered.",
        highlight: "addition",
      },
    ],
  },
];

export interface WorkflowCompressionRow {
  number: string;
  workflow: string;
  audience: string;
  todayPain: string;
  cogentSpeed: string;
  outputProduced: string;
}

export const DAILY_WORKFLOW_LEDGER: WorkflowCompressionRow[] = [
  {
    number: "01",
    workflow: "New Product & Feature Compliance Checks",
    audience: "Product + General Counsel",
    todayPain:
      "Legal spends 4 days hunting through old CBN FX circulars, NDPA 2023 privacy rules, and emailing outside counsel before Product can build a USD virtual card or BNPL checkout.",
    cogentSpeed: "Under 3 minutes",
    outputProduced:
      "Complete Product Compliance Brief citing exact CBN, NDPC, and FCCPC rules, transaction limits, data localization steps, and mandatory customer disclosures.",
  },
  {
    number: "02",
    workflow: "AML/CFT Policy & SOP Updates",
    audience: "CCO / MLRO + Risk",
    todayPain:
      "When CBN or NFIU drops a new circular—like the 2026 Automated AML Baseline Standards—the CCO spends a full week reading an 80-page AML manual to spot outdated clauses.",
    cogentSpeed: "Under 5 minutes",
    outputProduced:
      "Exact paragraph-by-paragraph gap check against your uploaded AML policy plus ready-to-insert compliant replacement clauses.",
  },
  {
    number: "03",
    workflow: "CBN Queries & Sponsor Bank Due Diligence",
    audience: "CCO + Executive Leadership",
    todayPain:
      "A 40-question NIBSS, Providus/Wema sponsor-bank due diligence checklist, or CBN examination query stalls operations for 5 days while teams assemble citations.",
    cogentSpeed: "Under 5 minutes",
    outputProduced:
      "Structured, citation-backed audit replies grounded in your internal SOPs, BOFIA 2020, and CBN 48h/72h consumer protection timelines.",
  },
  {
    number: "04",
    workflow: "8-Stage Cross-Border Expansion & Market Operations",
    audience: "CCO + Expansion Counsel + Engineering",
    todayPain:
      "Expanding from Nigeria into Ghana (BoG Act 987) or Kenya (CBK NPS) takes weeks of disconnected legal research, policy localisation, risk registers, and pre-launch control testing.",
    cogentSpeed: "Under 2 minutes to blueprint · End-to-End OS",
    outputProduced:
      "Side-by-side Cross-Border Matrix promoted directly into an 8-Stage Expansion Control Plane: Obligations Register, Group-to-Local Policy Localisation, Country Risk Register, 6-Question CCO Go-Live Gate, and Reporting Calendar.",
  },
  {
    number: "05",
    workflow: "ARCON Ad Vetting & Loan App Clearance",
    audience: "Growth + Legal Sign-Off",
    todayPain:
      "Unchecked loan flyers, fee promises, or pricing pages trigger FCCPC DEON penalties, ARCON ad sanctions, or sudden Google Play app takedowns.",
    cogentSpeed: "Under 2 minutes",
    outputProduced:
      "Line-by-line pre-launch review matched to your real rate cards, clean copy rewrites, CCO sign-off log, and ongoing webpage monitoring.",
  },
];

export interface SearchEngineTrack {
  code: string;
  title: string;
  tierNote: string;
  purpose: string;
  examples: string[];
}

export const DUAL_SEARCH_TRACKS: SearchEngineTrack[] = [
  {
    code: "01 · NIGERIAN BANKING & FINTECH LAWS",
    title: "141+ Nigerian Financial Statutes & Guidelines — Searchable by Section",
    tierNote: "Included in all workspaces",
    purpose:
      "Instant section-by-section lookup across active Nigerian banking, lending, payment, and data protection laws—filtering out repealed rules unless historical comparison is needed.",
    examples: [
      "BOFIA 2020, CBN Consumer Protection (48h/72h SLA), MFB & PSSP/MMO Guidelines",
      "FCCPC DEON Digital Lending Regs, ARCON Code, NDPA 2023 & GAID 2025, NFIU Rules",
      "Your company's uploaded AML/CFT manuals, SOPs & product rate cards",
    ],
  },
  {
    code: "02 · AUTOMATED .GOV.NG CIRCULAR TRACKING",
    title: "Live CBN, SEC, NDPC & NFIU Circular Monitoring",
    tierNote: "Growth & Scale plans",
    purpose:
      "Automatically tracks buried PDF circular codes (like BSD/DIR/GEN/LAB/...) and overnight regulatory deadlines—including CBN data localization and automated AML mandates.",
    examples: [
      "Direct monitoring across cbn.gov.ng, sec.gov.ng, ndpc.gov.ng, fccpc.gov.ng & nfiu.gov.ng",
      "Immediate alerts on CBN circulars 2026, enforcement notices & compliance deadlines",
      "Replaces broken government search bars with direct PDF citations",
    ],
  },
  {
    code: "03 · CROSS-BORDER AFRICA & LEGAL GUIDES",
    title: "Kenya (CBK), Ghana (BoG) & Top Law Firm Briefings",
    tierNote: "Growth & Scale plans",
    purpose:
      "Pulls verified licensing rules and practical interpretation from African central banks and leading Nigerian financial law firms directly into your compliance memo.",
    examples: [
      "Central Bank of Kenya (cbk.go.ke), Bank of Ghana (bog.gov.gh) & SARB",
      "Practical legal briefings from Banwo & Ighodalo, Aluko & Oyebode, Templars & Udo Udoma",
      "Side-by-side expansion checklists in one clear document",
    ],
  },
];

export interface PlanStep {
  step: string;
  title: string;
  description: string;
  outcome: string;
}

export const PLAN_STEPS: PlanStep[] = [
  {
    step: "01",
    title: "Upload your AML policies, SOPs & rate cards privately",
    description:
      "Add your internal AML/CFT manual, operating SOPs, and product rate sheets once into an organization-isolated workspace.",
    outcome: "Ready in 5 minutes · Zero shared data",
  },
  {
    step: "02",
    title: "Ask any regulatory question or upload any draft",
    description:
      "Check CBN circulars, FCCPC digital lending rules, NDPA 2023 requirements, or Kenya/Ghana licensing rules against your own policies in one place.",
    outcome: "Under 5 minutes with clickable citations",
  },
  {
    step: "03",
    title: "Export audit-ready memos, policy redlines & cleared ads",
    description:
      "Edit side-by-side and download finished compliance memos, updated AML clauses, sponsor-bank audit replies, or cleared campaign copy.",
    outcome: "Export cleanly for Board, Bank, or CBN",
  },
];

export interface RegulatorMetric {
  acronym: "CBN" | "NDPC" | "FCCPC" | "SEC" | "NFIU" | "NDIC" | "ARCON";
  name: string;
  focus: string;
}

export const REGULATOR_METRICS: RegulatorMetric[] = [
  {
    acronym: "CBN",
    name: "Central Bank of Nigeria",
    focus: "PSSP/MMO/MFB licensing, data localization, automated AML baseline & 48h refund SLAs",
  },
  {
    acronym: "NDPC",
    name: "Nigeria Data Protection Commission",
    focus: "NDPA 2023 & GAID 2025 compliance, annual audits & cross-border transfers",
  },
  {
    acronym: "FCCPC",
    name: "Federal Competition & Consumer Protection Commission",
    focus: "DEON digital lending registration, APR disclosures & debt collection rules",
  },
  {
    acronym: "SEC",
    name: "Securities & Exchange Commission",
    focus: "ISA 2025, VASP/ARIP licensing, yield rules & investment disclosures",
  },
  {
    acronym: "NFIU",
    name: "Nigerian Financial Intelligence Unit",
    focus: "goAML 24-hour STR filings, ₦5M/₦10M CTR thresholds & sanctions screening",
  },
  {
    acronym: "NDIC",
    name: "Nigeria Deposit Insurance Corporation",
    focus: "Deposit insurance caps & pass-through wording",
  },
  {
    acronym: "ARCON",
    name: "Advertising Regulatory Council of Nigeria",
    focus: "Pre-publication ad vetting & fintech campaign qualifiers",
  },
];

export interface LicenseVertical {
  id: "lenders" | "banking" | "payments" | "wealthtech";
  slug: string;
  label: string;
  licenseTiers: string;
  regulators: Array<"CBN" | "FCCPC" | "ARCON" | "NDPC" | "SEC" | "NFIU">;
  headline: string;
  description: string;
  workflowsAccelerated: string[];
  sampleCase: {
    label: string;
    taskDescription: string;
    statute: string;
    deliverable: string;
  };
}

export const LICENSE_VERTICALS: LicenseVertical[] = [
  {
    id: "lenders",
    slug: "digital-lending-fccpc-compliance",
    label: "Digital Lenders & Credit",
    licenseTiers: "FCCPC DEON Registered Lenders · BNPL · Credit Fintechs",
    regulators: ["FCCPC", "CBN", "NDPC", "ARCON"],
    headline: "Stay compliant with FCCPC DEON lending rules, BNPL disclosures & Play Store checks",
    description:
      "Go from a week of legal back-and-forth to minutes. Prepare FCCPC digital lending registration packs, structure BNPL checkout disclosures, verify 60-day+ Google Play requirements, and pre-vet loan ads against ARCON rules.",
    workflowsAccelerated: [
      "Complete BNPL & digital lending compliance checklists before engineering builds",
      "Update collection SOPs & privacy notices for FCCPC DEON Regs and NDPA GAID 2025",
      "Catch risky loan flyer claims, short-tenor promises & hidden fee wording before launch",
    ],
    sampleCase: {
      label: "BNPL & FCCPC DEON Readiness Pack",
      taskDescription: "Assess BNPL fee disclosure, FCCPC registration duties & Play Store 60-day loan floor",
      statute: "FCCPC DEON Regs 2025 · CBN CPF · NDPA §24",
      deliverable: "Outputs complete customer KFS disclosure schedule + compliant app store & flyer copy.",
    },
  },
  {
    id: "banking",
    slug: "aml-compliance-banks-fintechs-nigeria",
    label: "MFBs & Commercial Banks",
    licenseTiers: "Commercial Banks · National, State & Unit MFBs",
    regulators: ["CBN", "NFIU", "ARCON", "FCCPC"],
    headline: "Meet CBN Automated AML Baseline Standards, BOFIA 2020 & examination deadlines",
    description:
      "When CBN issues new AML, sanctions, or agent banking circulars, compare them directly against your 80-page internal manual, draft updated clauses in minutes, and assemble CBN examination replies fast.",
    workflowsAccelerated: [
      "Update AML/CFT policies for CBN Automated AML Baseline Standards & NFIU 24h STR rules",
      "Compile citation-backed replies to CBN examination & NIBSS queries in minutes",
      "Verify branch flyers & deposit promos for exact NDIC ₦5M caps and BOFIA 2020 license bounds",
    ],
    sampleCase: {
      label: "AML/CFT Policy Update v2.5",
      taskDescription: "Fix outdated 72h STR escalation SLAs & add agent terminal geo-fencing rules",
      statute: "CBN AML Baseline 2026 · BOFIA 2020 · MLPPA 2022",
      deliverable: "Generates tracked clause replacements ready for Board Risk Committee sign-off.",
    },
  },
  {
    id: "payments",
    slug: "payment-licensing-cross-border-africa",
    label: "PSBs, MMOs & PSSPs",
    licenseTiers: "Payment Service Banks · Mobile Money · PSSP & PTSP Gateways",
    regulators: ["CBN", "NDPC", "FCCPC", "NFIU"],
    headline: "Pass sponsor-bank due diligence, meet CBN data localization & expand across Africa",
    description:
      "Answer 40-question sponsor-bank questionnaires from your SOPs, prepare for the January 1, 2027 CBN payment data localization deadline, check USD virtual card rules, and compare CBN vs. CBK Kenya & BoG Ghana licensing.",
    workflowsAccelerated: [
      "Complete sponsor-bank & NIBSS due-diligence checklists grounded in your uploaded SOPs",
      "Track CBN payment data localization, UBO disclosure & 48h/72h dispense-error SLAs",
      "Compare CBN PSSP/PTSP/MMO requirements against Kenya (CBK) & Ghana (BoG) rules",
    ],
    sampleCase: {
      label: "Kenya Expansion & Sponsor Bank Pack",
      taskDescription: "Compare CBN PSSP rules vs. CBK PSP trust requirements + answer 12 due-diligence items",
      statute: "CBN Payment & Data Localisation Circulars · CBK NPS Act · NDPA §41",
      deliverable: "Delivers side-by-side licensing matrix plus formal due-diligence response sheet.",
    },
  },
  {
    id: "wealthtech",
    slug: "sec-vasp-wealthtech-compliance",
    label: "WealthTech & SEC Operators",
    licenseTiers: "Capital Market Operators · Investment Apps · VASPs (ARIP)",
    regulators: ["SEC", "CBN", "ARCON", "NDPC"],
    headline: "Track SEC ISA 2025, VASP licensing rules & investment marketing disclosures",
    description:
      "Monitor SEC Nigeria VASP/ARIP circulars and Investments and Securities Act (ISA 2025) updates without manual portal hunting, draft product memos in minutes, and catch prohibited return guarantees across creator scripts.",
    workflowsAccelerated: [
      "Track 2026 SEC ISA 2025, ARIP VASP & CBN virtual-asset circulars automatically",
      "Draft treasury & investment product disclosure memos aligned with SEC Rule 214",
      "Review influencer scripts, newsletters & landing pages for ARCON and SEC ad compliance",
    ],
    sampleCase: {
      label: "VASP & Fixed-Income Compliance Brief",
      taskDescription: "Verify disclosure obligations for USD treasury note promotion & ISA 2025 bounds",
      statute: "SEC ISA 2025 · SEC Rule 214 · ARCON Code",
      deliverable: "Produces clean structuring brief and approved capital-at-risk disclosure copy.",
    },
  },
];

export interface SolutionVerticalDetail {
  slug: string;
  verticalId: LicenseVertical["id"];
  seoTitle: string;
  seoDescription: string;
  targetKeywords: string[];
  eyebrow: string;
  h1Leading: string;
  h1Accent: string;
  heroSummary: string;
  regulators: string[];
  urgentMandates2026: Array<{
    title: string;
    regulator: string;
    deadlineOrStatus: string;
    summary: string;
  }>;
  workflows: Array<{
    title: string;
    beforeTime: string;
    cogentTime: string;
    description: string;
  }>;
  checklistItems: string[];
  faqs: Array<{
    question: string;
    answer: string;
  }>;
}

export const SOLUTION_VERTICAL_PAGES: SolutionVerticalDetail[] = [
  {
    slug: "digital-lending-fccpc-compliance",
    verticalId: "lenders",
    seoTitle: "Digital Lending & FCCPC Compliance Software Nigeria | BNPL & Loan Apps",
    seoDescription:
      "Automate FCCPC DEON digital lending compliance, BNPL regulatory requirements, NDPA 2023 checklists, Google Play 60-day loan rules, and ARCON ad vetting in Nigeria.",
    targetKeywords: [
      "FCCPC digital lending registration",
      "FCCPC DEON regulations 2025",
      "FCCPC approved loan apps requirements",
      "BNPL regulatory requirements Nigeria",
      "ARCON advertising vetting guidelines fintech",
      "fintech compliance software Nigeria",
    ],
    eyebrow: "DIGITAL LENDERS · BNPL · CREDIT FINTECHS",
    h1Leading: "FCCPC DEON & BNPL compliance software",
    h1Accent: "built for Nigerian digital lenders.",
    heroSummary:
      "Prepare FCCPC digital lending registration packs, verify BNPL disclosure requirements, enforce Google Play 60-day loan rules, and pre-vet loan flyers against ARCON guidelines in minutes.",
    regulators: ["FCCPC", "CBN", "NDPC", "ARCON"],
    urgentMandates2026: [
      {
        title: "FCCPC DEON Consumer Lending Regulations 2025",
        regulator: "FCCPC",
        deadlineOrStatus: "Active Enforcement (Resumed July 2026)",
        summary:
          "Mandatory registration, vendor/service provider disclosure forms, transparent APR/fee breakdowns, and strict bans on contact-scraping or defamatory recovery.",
      },
      {
        title: "NDPA 2023 & GAID 2025 Consent & Audit Filing",
        regulator: "NDPC",
        deadlineOrStatus: "GAID Effective Sept 2025 · Annual Audits",
        summary:
          "Replaces legacy NDPR rules for credit scoring data, DPO registration, privacy notices, and cross-border cloud storage consent.",
      },
      {
        title: "ARCON Financial Ad Vetting & Google Play Loan Policy",
        regulator: "ARCON / Google Play",
        deadlineOrStatus: "Ongoing Pre-Publication Gate",
        summary:
          "Requires ASP pre-clearance on public financial ads and prohibits promoting personal loans under a 60-day minimum repayment floor.",
      },
    ],
    workflows: [
      {
        title: "BNPL & Credit Product Structuring Brief",
        beforeTime: "4–5 days with outside counsel",
        cogentTime: "Under 3 minutes",
        description:
          "Check how CBN Consumer Protection rules, FCCPC DEON regulations, and NDPA 2023 apply to your BNPL checkout, interest caps, and late-fee schedule before engineers ship code.",
      },
      {
        title: "FCCPC & Collection SOP Gap Updates",
        beforeTime: "1 week of manual policy review",
        cogentTime: "Under 5 minutes",
        description:
          "Upload your credit and recovery SOPs to pinpoint clauses that violate DEON debt-collection rules and generate compliant replacement wording.",
      },
      {
        title: "Loan Ad, Flyer & App Store Pre-Launch Check",
        beforeTime: "3 days of back-and-forth",
        cogentTime: "Under 2 minutes",
        description:
          "Compare campaign copy and Google Play store screenshots against your real product rate card, ARCON rules, and representative APR math.",
      },
    ],
    checklistItems: [
      "Complete FCCPC DEON registration & vendor disclosure schedule",
      "Display total Naira repayable, setup fees, and cooling-off notice pre-PIN",
      "Verify 65-day+ repayment tenor across flyers, web pages, and Play Store listings",
      "Remove phonebook, SMS, and photo-gallery scraping permissions from mobile SDKs",
      "Publish NDPA 2023 & GAID 2025 compliant Privacy Notice and DPO contact details",
    ],
    faqs: [
      {
        question: "How does Cogent help with FCCPC DEON digital lending compliance?",
        answer:
          "Cogent maps your uploaded lending policies, app store copy, and fee schedules directly against the FCCPC DEON Consumer Lending Regulations 2025 and Guidelines, flagging missing disclosures and drafting compliant replacement wording in minutes.",
      },
      {
        question: "Does Cogent check BNPL and loan ads before Google Play or ARCON review?",
        answer:
          "Yes. You can upload loan flyers, SMS promos, and Play Store screenshots alongside your real product rate card to catch hidden-fee claims, short-tenor violations (under 60 days), and missing CBN/FCCPC license statements before publishing.",
      },
    ],
  },
  {
    slug: "aml-compliance-banks-fintechs-nigeria",
    verticalId: "banking",
    seoTitle: "AML Compliance Software Nigeria | CBN Baseline Standards & BOFIA 2020",
    seoDescription:
      "Regulatory compliance management software for Nigerian banks, MFBs, and fintechs. Update AML/CFT policies for CBN Automated AML Baseline Standards, NFIU goAML 24h STR rules, and BOFIA 2020.",
    targetKeywords: [
      "AML compliance software Nigeria",
      "CBN baseline standards for automated AML",
      "AML CFT policy template Nigeria CBN",
      "BOFIA 2020 compliance checklist",
      "how to respond to CBN regulatory query",
      "regulatory compliance management software Nigeria",
    ],
    eyebrow: "COMMERCIAL BANKS · MFBs · MLROs & CCOs",
    h1Leading: "AML policy & regulatory compliance software",
    h1Accent: "for Nigerian banks and MFBs.",
    heroSummary:
      "Compare new CBN and NFIU circulars directly against your 80-page AML/CFT manual, draft compliant replacement clauses in minutes, and assemble citation-backed replies to CBN examination queries.",
    regulators: ["CBN", "NFIU", "NDIC", "FCCPC"],
    urgentMandates2026: [
      {
        title: "CBN Baseline Standards for Automated AML/CFT/CPF Solutions",
        regulator: "CBN",
        deadlineOrStatus: "Issued March 10, 2026",
        summary:
          "Sets mandatory expectations for automated transaction monitoring, sanctions screening, alert triage SLAs, and board-approved AML governance.",
      },
      {
        title: "CBN Nigeria Sanctions Committee Implementation Circular",
        regulator: "CBN / NFIU",
        deadlineOrStatus: "Issued June 24, 2026",
        summary:
          "Directs financial institutions to implement Nigeria Sanctions Committee designations immediately without manual delay.",
      },
      {
        title: "NFIU goAML 24-Hour STR & ₦5M/₦10M CTR Reporting",
        regulator: "NFIU (MLPPA 2022)",
        deadlineOrStatus: "Ongoing Statutory Duty",
        summary:
          "Suspicious transactions require NFIU filing within 24 hours (§7), while single transactions above ₦5M (individual) or ₦10M (corporate) trigger 7-day CTRs (§11).",
      },
    ],
    workflows: [
      {
        title: "80-Page AML/CFT Manual Gap Comparison",
        beforeTime: "5–7 days of line-by-line reading",
        cogentTime: "Under 5 minutes",
        description:
          "Upload your internal AML/CFT manual and compare it directly against 2026 CBN AML Baseline Standards, agent geo-fencing rules, and NFIU 24-hour STR duties.",
      },
      {
        title: "CBN Examination & NIBSS Query Responses",
        beforeTime: "4–5 days compiling citations",
        cogentTime: "Under 5 minutes",
        description:
          "Generate formal, section-cited supervisory replies backed by your own internal SOPs, BOFIA 2020, and CBN Consumer Protection timelines.",
      },
      {
        title: "Branch & Deposit Promo Sign-Off",
        beforeTime: "2–3 days of legal review",
        cogentTime: "Under 2 minutes",
        description:
          "Verify deposit campaigns and branch flyers include accurate NDIC ₦5M insurance disclosures, BOFIA 2020 license tiers, and ARCON qualifiers.",
      },
    ],
    checklistItems: [
      "Update internal AML/CFT manual to reflect 24-hour NFIU STR escalation (replacing 72-hour SLAs)",
      "Document automated sanctions screening against Nigeria Sanctions List & PEP tiers",
      "Enforce agent terminal geo-fencing and daily BVN/NIN cumulative velocity caps",
      "Verify BOFIA 2020 record retention (5–7 years) across core banking and audit logs",
      "Standardize 48-hour ATM/POS and 72-hour NIP dispense-error refund SOPs",
    ],
    faqs: [
      {
        question: "How is Cogent different from AML transaction monitoring or KYC vendors?",
        answer:
          "KYC and transaction monitoring tools screen customer IDs and payment feeds. Cogent handles the regulatory compliance management layer around them: tracking new CBN/NFIU circulars, redlining your 80-page AML/CFT manual, answering CBN examination queries, and keeping board-ready audit trails.",
      },
      {
        question: "Can Cogent update our existing AML policy instead of giving a generic template?",
        answer:
          "Yes. Upload your institution's actual AML/CFT policy (PDF or DOCX). Cogent identifies outdated sections—such as legacy STR timelines or missing agent controls—and writes exact replacement clauses in your house style.",
      },
    ],
  },
  {
    slug: "payment-licensing-cross-border-africa",
    verticalId: "payments",
    seoTitle: "Fintech Licensing & Payment Compliance Software Nigeria | CBN PSSP, CBK & BoG",
    seoDescription:
      "Navigate CBN PSSP, PTSP, and MMO licensing requirements, the Jan 1, 2027 CBN data localization deadline, USD virtual card rules, sponsor-bank audits, and Nigeria-Kenya-Ghana expansion.",
    targetKeywords: [
      "fintech licensing requirements Nigeria CBN",
      "CBN data localization deadline",
      "CBN payment transaction data storage Nigeria",
      "how to launch a USD virtual card in Nigeria CBN rules",
      "sponsor bank due diligence checklist fintech",
      "cross-border fintech expansion Nigeria to Kenya Ghana",
    ],
    eyebrow: "PSPs · MMOs · PSBs · CROSS-BORDER FINTECHS",
    h1Leading: "Payment compliance & licensing clarity",
    h1Accent: "from Nigeria to Kenya and Ghana.",
    heroSummary:
      "Prepare for the January 1, 2027 CBN data localization mandate, answer 40-question sponsor-bank due-diligence packs in minutes, structure USD virtual cards, and compare CBN, CBK, and Bank of Ghana rules.",
    regulators: ["CBN", "NDPC", "NFIU", "CBK", "BoG"],
    urgentMandates2026: [
      {
        title: "CBN Payment Transaction Data Localisation Mandate",
        regulator: "CBN",
        deadlineOrStatus: "Circular June 15, 2026 · Deadline Jan 1, 2027",
        summary:
          "Requires banks, MMOs, and payment service providers to process, store, and manage Nigerian payment transaction data locally by January 1, 2027.",
      },
      {
        title: "CBN Market Structure & UBO Disclosure Circular",
        regulator: "CBN",
        deadlineOrStatus: "Issued 2026",
        summary:
          "Introduces updated ultimate beneficial ownership (UBO) disclosures and systemic oversight duties across the Nigerian payments ecosystem.",
      },
      {
        title: "CBN Consumer Protection 48-Hour / 72-Hour Dispute SLAs",
        regulator: "CBN",
        deadlineOrStatus: "Active Examination Priority",
        summary:
          "Enforces strict refund timelines for failed electronic transfers, ATM/POS dispense errors, and partner-bank escalation workflows.",
      },
    ],
    workflows: [
      {
        title: "Sponsor Bank & NIBSS Due-Diligence Questionnaire",
        beforeTime: "5 days across legal & ops",
        cogentTime: "Under 4 minutes",
        description:
          "Upload your internal dispute, security, and KYC SOPs to draft complete, citation-backed responses to 40-question partner bank audits.",
      },
      {
        title: "USD Virtual Card & Cross-Border Product Briefs",
        beforeTime: "4 days of scattered circular research",
        cogentTime: "Under 3 minutes",
        description:
          "Map CBN FX settlement rules, acquiring bank sponsorship, CBN local storage requirements, and NDPA §41 cross-border tokenization consent before launch.",
      },
      {
        title: "Nigeria (CBN) vs. Kenya (CBK) & Ghana (BoG) Matrix",
        beforeTime: "3 weeks & $15k+ legal fees",
        cogentTime: "Under 2 minutes",
        description:
          "Compare PSSP/MMO capital thresholds, trust-account trusteeship, and local governance requirements across Nigeria, Kenya, Ghana, and South Africa.",
      },
    ],
    checklistItems: [
      "Audit where Nigerian payment logs, receipts & ledger tables are hosted before Jan 1, 2027",
      "Document NDPA 2023 §41–43 safeguards for any cross-border card processor routing",
      "Verify PSSP vs. PTSP vs. MMO vs. MFB license scope before co-branding wallets",
      "Map partner bank settlement, NDIC disclosure, and 48h/72h failed-transfer SLAs",
      "Build country-specific CBK (Kenya) and BoG (Ghana) trust-account checklists before expansion",
    ],
    faqs: [
      {
        question: "Does Cogent track the CBN data localization deadline and circulars automatically?",
        answer:
          "Yes. Cogent monitors cbn.gov.ng, ndpc.gov.ng, and sec.gov.ng for new payment circulars—including the June 15, 2026 data localization and UBO disclosure directives—and maps requirements directly to your internal SOPs.",
      },
      {
        question: "Which African jurisdictions are covered for cross-border licensing comparisons?",
        answer:
          "Cogent compares Nigerian CBN licensing regimes (PSSP, PTSP, MMO, PSB, MFB) directly against Central Bank of Kenya (CBK), Bank of Ghana (BoG), and South African Reserve Bank (SARB/FSCA) rules.",
      },
    ],
  },
  {
    slug: "sec-vasp-wealthtech-compliance",
    verticalId: "wealthtech",
    seoTitle: "SEC Nigeria VASP & WealthTech Compliance Software | ISA 2025 & ARIP",
    seoDescription:
      "Track SEC Nigeria ISA 2025 rules, VASP/ARIP licensing updates, CBN virtual asset circulars, NDPA 2023 privacy rules, and ARCON investment ad vetting in one compliance platform.",
    targetKeywords: [
      "automated regulatory tracking Nigeria",
      "RegTech companies in Nigeria",
      "CBN circulars 2026",
      "NDPA 2023 compliance checklist fintech",
      "ARCON advertising vetting guidelines fintech",
    ],
    eyebrow: "WEALTHTECH · CAPITAL MARKETS · VASPs",
    h1Leading: "SEC ISA 2025 & VASP compliance tracking",
    h1Accent: "for Nigerian WealthTech and digital asset teams.",
    heroSummary:
      "Monitor SEC Nigeria VASP/ARIP updates, Investments and Securities Act (ISA 2025) rules, and CBN circulars in real time—while clearing treasury promos, creator scripts, and product disclosures fast.",
    regulators: ["SEC", "CBN", "NDPC", "ARCON"],
    urgentMandates2026: [
      {
        title: "Investments and Securities Act 2025 (ISA 2025) & VASP Rules",
        regulator: "SEC Nigeria",
        deadlineOrStatus: "Enacted 2025 · Active 2026 ARIP Clearances",
        summary:
          "Places digital and virtual asset platforms under explicit SEC oversight with strict registration, custody, director residency, and disclosure mandates.",
      },
      {
        title: "SEC Rule 214 & ARCON Investment Promotion Standards",
        regulator: "SEC / ARCON",
        deadlineOrStatus: "Ongoing Enforcement",
        summary:
          "Prohibits misleading 'guaranteed ROI' claims on fixed-income, dollar savings, and digital asset promotions without clear risk disclaimers.",
      },
      {
        title: "NDPC NDPA 2023 & GAID 2025 Data Governance",
        regulator: "NDPC",
        deadlineOrStatus: "Active Audit Cycle",
        summary:
          "Governs KYC/onboarding data processing, lawful bases, cross-border cloud transfers, and DPO accountability.",
      },
    ],
    workflows: [
      {
        title: "Live SEC & CBN Digital Asset Circular Tracking",
        beforeTime: "Manual daily portal checks",
        cogentTime: "Automatic monitoring",
        description:
          "Catch new SEC Nigeria ARIP announcements, proposed virtual-asset rule updates, and CBN settlement circulars as soon as they publish.",
      },
      {
        title: "Investment & Treasury Product Disclosure Memos",
        beforeTime: "3–5 days of legal drafting",
        cogentTime: "Under 3 minutes",
        description:
          "Draft board structuring briefs covering ISA 2025 boundaries, custody disclosures, and cross-border FX risk wording.",
      },
      {
        title: "Influencer Script & Newsletter Ad Clearance",
        beforeTime: "2–3 days per campaign",
        cogentTime: "Under 2 minutes",
        description:
          "Scan creator scripts, social posts, and landing pages to catch prohibited return guarantees before publication.",
      },
    ],
    checklistItems: [
      "Verify SEC ARIP / VASP registration boundaries and local director governance rules",
      "Strip 'guaranteed return' or 'risk-free' phrasing from creator scripts and emails",
      "Include SEC Rule 214 capital-at-risk and underlying custodian disclosures",
      "Maintain NDPA 2023 & GAID 2025 audit trail for retail investor KYC records",
      "Monitor live landing pages automatically for unapproved yield or fee edits",
    ],
    faqs: [
      {
        question: "Does Cogent track SEC Nigeria VASP and ISA 2025 circulars?",
        answer:
          "Yes. Cogent indexes the Investments and Securities Act 2025 and SEC rules alongside live monitoring of sec.gov.ng and cbn.gov.ng so WealthTech and VASP teams never miss new onboarding or disclosure rules.",
      },
      {
        question: "Can Growth and Marketing teams check influencer scripts before Compliance signs off?",
        answer:
          "Yes. Growth teams can pre-check scripts, newsletters, and landing pages against your approved product schedules, while final sign-off stays locked to General Counsel or the Chief Compliance Officer.",
      },
    ],
  },
];

export interface ComplianceFaqItem {
  id: string;
  category: "Workflows" | "Research" | "Drafting" | "Security";
  question: string;
  answer: string;
}

export const COMPLIANCE_FAQS: ComplianceFaqItem[] = [
  {
    id: "beyond-marketing",
    category: "Workflows",
    question: "Is Cogent only for ad review, or is it full fintech compliance management software?",
    answer:
      "Campaign clearance is just one module inside Cogent. Compliance officers, MLROs, legal counsel, and product managers use Cogent daily to track CBN, SEC, NDPC, and FCCPC circulars, draft product structuring briefs, update 80-page AML/CFT policies, answer 40-question sponsor-bank audits, and compare Nigeria, Kenya, and Ghana licensing rules.",
  },
  {
    id: "live-ng-africa-search",
    category: "Research",
    question: "How does Cogent track newly published CBN, SEC, NDPC, and FCCPC circulars?",
    answer:
      "Standard search engines miss deeply nested PDF circulars on government websites. On Growth and Scale plans, Cogent searches 141+ Nigerian financial statutes alongside live monitoring across cbn.gov.ng, sec.gov.ng, ndpc.gov.ng, fccpc.gov.ng, and nfiu.gov.ng—plus Kenya (CBK), Ghana (BoG), and leading Nigerian law firm briefings.",
  },
  {
    id: "work-product-studio",
    category: "Drafting",
    question: "What documents does Cogent produce—chat answers or exportable compliance files?",
    answer:
      "Every task opens in a side-by-side workspace: verified citations on the left, and an editable Compliance Brief, AML Policy Redline, Sponsor-Bank Audit Reply, or Cross-Border Licensing Matrix on the right—ready to export to PDF or DOCX for your Board, sponsor bank, or regulator.",
  },
  {
    id: "free-vs-paid-search",
    category: "Research",
    question: "What is included in the 7-day free trial vs. Growth and Scale plans?",
    answer:
      "Your free 7-day trial includes full access to our 141+ Nigerian financial laws and lets your team test policy updates, structuring briefs, and ad checks. Upgrading in Workspace Settings unlocks live CBN/SEC/NDPC circular monitoring, cross-border Africa tracking, and continuous webpage monitors—billed in NGN or USD via Paystack.",
  },
  {
    id: "role-governance",
    category: "Security",
    question: "Can Product or Growth teams override Compliance or approve their own work?",
    answer:
      "No. Cogent enforces strict maker-checker permissions: Product and Marketing teams can research requirements and prepare drafts, while final policy approval and campaign sign-off remain locked strictly to Legal Counsel and the Chief Compliance Officer.",
  },
  {
    id: "data-isolation",
    category: "Security",
    question: "Are our uploaded AML policies, sponsor-bank audits, and product plans kept private?",
    answer:
      "Yes. Your institution's uploaded AML/CFT manuals, rate schedules, audit replies, and unreleased product plans remain isolated inside your own workspace and are never shared with other companies or used for public model training.",
  },
];

export interface CoFounderProfile {
  id: string;
  initials: string;
  shortLabel: string;
  name: string;
  roleBadge: string;
  discipline: string;
  bio: string;
  quote: string;
  imagePath: string;
  mandates: Array<{
    title: string;
    description: string;
    icon: "shield" | "compass" | "layers" | "lock";
  }>;
}

export const CO_FOUNDERS: CoFounderProfile[] = [
  {
    id: "odion-alex",
    initials: "OA",
    shortLabel: "Odion O. Alex · CEO",
    name: "Odion O. Alex",
    roleBadge: "CO-FOUNDER & CEO",
    discipline: "Product & Engineering · Stem Systems",
    bio: "Odion O. Alex is the Co-founder and CEO of Stem Systems. Having spent years building software across African fintech, he saw how product teams repeatedly hit the same wall: losing weeks waiting on CBN circular research, manual AML policy updates, and sponsor-bank approvals. He built Cogent to take the friction out of compliance—giving founders, CCOs, and engineers fast, cited regulatory clarity so they can ship without the week-long wait.",
    quote:
      "Building a fintech in Nigeria is already hard enough. You shouldn't have to spend five days guessing whether a new CBN circular breaks your launch. We built Cogent so your team moves with speed, certainty, and zero compliance surprises.",
    imagePath: "/images/odion-alex.png",
    mandates: [
      {
        title: "Built for Builders & Operators",
        description:
          "Compliance software should remove bottlenecks, not create extra paperwork. When product or legal teams have a regulatory question, Cogent delivers clear, cited answers in minutes.",
        icon: "layers",
      },
      {
        title: "Citations You Can Defend",
        description:
          "In financial services, guessing is costly. Every requirement and policy clause Cogent produces is grounded in verified Nigerian and African law so your team can stand behind it in any audit.",
        icon: "shield",
      },
    ],
  },
  {
    id: "gift-nduka",
    initials: "GN",
    shortLabel: "Gift Chinedu Nduka · CSO",
    name: "Gift Chinedu Nduka",
    roleBadge: "CO-FOUNDER & CSO",
    discipline: "Strategy & Partnerships · Stem Systems",
    bio: "Gift Chinedu Nduka is the Co-founder and Chief Strategy Officer (CSO) at Stem Systems. She works closely with commercial banks, microfinance banks, digital lenders, and payment fintechs to turn regulatory compliance into a growth advantage—helping executive teams pass sponsor-bank due diligence faster, avoid costly FCCPC or CBN penalties, and expand across Africa with confidence.",
    quote:
      "In African financial services, trust isn't a marketing claim—it is your license to operate. When your compliance is rock-solid from day one, banks partner with you faster, regulators respect your work, and your business scales on solid ground.",
    imagePath: "/images/gift-nduka.png",
    mandates: [
      {
        title: "Turn Compliance into Trust",
        description:
          "Lasting financial brands aren't built on regulatory shortcuts. We help institutions make clean compliance their strongest advantage when closing sponsor-bank and enterprise partnerships.",
        icon: "compass",
      },
      {
        title: "Clarity Across African Borders",
        description:
          "Rules shift quickly from Lagos to Nairobi and Accra. We give leadership teams the visibility to track central bank directives early and scale across borders without unexpected roadblocks.",
        icon: "lock",
      },
    ],
  },
];
