/**
 * Canonical marketing scenarios, regulator metrics, license verticals, and comparison data.
 * Strictly grounded in Cogent's implemented compliance engines and Nigerian statutory corpus.
 */

export interface HeroScenario {
  id: "flyer" | "drift" | "appstore";
  tabLabel: string;
  channelBadge: string;
  campaignTitle: string;
  productMatched: string;
  submittedTitle: string;
  submittedCopy: string;
  flaggedPhrase: string;
  initialVerdict: "BLOCK" | "CONDITIONAL";
  riskScore: number;
  resolvedRiskScore: number;
  locks: {
    lock1: { label: string; initial: "FAIL" | "PASS" };
    lock2: { label: string; initial: "FAIL" | "PASS" };
    lock3: { label: string; initial: "FAIL" | "PASS" };
  };
  aprSummary?: {
    advertised: string;
    effective: string;
    netDisbursed: string;
    totalRepayable: string;
  };
  blindSpot: string;
  consequence: string;
  statutes: string[];
  compliantRewrite: string;
  rewriteHighlights: string[];
}

export const HERO_SCENARIOS: HeroScenario[] = [
  {
    id: "flyer",
    tabLabel: "Loan Flyer Audit",
    channelBadge: "INSTAGRAM FLYER · OCR + APR ENGINE",
    campaignTitle: "QuickCash Salary Advance Promo",
    productMatched: "QuickCash Loan (4.5%/mo · 1.5% fee · 30d)",
    submittedTitle: "Submitted Flyer Copy",
    submittedCopy:
      "Get an instant ₦50,000 loan in 3 minutes! 5% monthly interest, 0% hidden charges, guaranteed approval for all Nigerians.",
    flaggedPhrase: "0% hidden charges, guaranteed approval",
    initialVerdict: "BLOCK",
    riskScore: 89,
    resolvedRiskScore: 4,
    locks: {
      lock1: { label: "Lock 1 · Prohibited Terms", initial: "FAIL" },
      lock2: { label: "Lock 2 · Product Rate Match", initial: "FAIL" },
      lock3: { label: "Lock 3 · Mandatory Disclosures", initial: "FAIL" },
    },
    aprSummary: {
      advertised: "60.0% implied p.a.",
      effective: "79.8% Effective APR",
      netDisbursed: "₦49,250",
      totalRepayable: "₦52,250",
    },
    blindSpot:
      "Upfront 1.5% processing fee reduces net cash to ₦49,250 while 'guaranteed approval' & '0% hidden charges' breach Lock 1. Missing ARCON ASP ID and CBN license footer.",
    consequence:
      "FCCPA §115 deceptive pricing fine (up to ₦100M or 1% turnover) + ARCON ASP pre-vetting sanction (₦1M–₦3M per unvetted ad).",
    statutes: ["FCCPA §115", "CBN CPF §3.2", "ARCON Code §4.2"],
    compliantRewrite:
      "Apply for up to ₦50,000 QuickCash credit, subject to KYC and credit assessment. Monthly rate: 4.5% plus 1.5% one-off fee (Net Disbursed: ₦49,250; Total Repayable over 30 days: ₦52,250; Effective APR: 79.8% p.a.). Licensed by the Central Bank of Nigeria (CBN). [ARCON/ASP/2026/0419] Terms and Conditions apply.",
    rewriteHighlights: [
      "subject to KYC and credit assessment",
      "Effective APR: 79.8% p.a.",
      "Licensed by the Central Bank of Nigeria (CBN)",
      "[ARCON/ASP/2026/0419]",
      "Terms and Conditions apply.",
    ],
  },
  {
    id: "drift",
    tabLabel: "Live URL Drift",
    channelBadge: "24H URL SENTINEL · PRICING PAGE DIFF",
    campaignTitle: "Personal Credit Landing Page",
    productMatched: "FlexiCredit 90-Day Facility",
    submittedTitle: "Detected Live Page Mutation",
    submittedCopy:
      "Borrow up to ₦2,000,000 in minutes. Representative APR and Key Facts Statement link removed during latest marketing deployment.",
    flaggedPhrase: "Key Facts Statement link removed",
    initialVerdict: "BLOCK",
    riskScore: 82,
    resolvedRiskScore: 6,
    locks: {
      lock1: { label: "Lock 1 · Prohibited Terms", initial: "PASS" },
      lock2: { label: "Lock 2 · Product Rate Match", initial: "PASS" },
      lock3: { label: "Lock 3 · Mandatory Disclosures", initial: "FAIL" },
    },
    blindSpot:
      "Live pricing page mutated vs. Approved Revision #4: Key Facts Statement (KFS) disclosure link and 24-hour complaint resolution email were dropped.",
    consequence:
      "Breaches CBN Consumer Protection Regulations pre-contract transparency mandate and invalidates FCCPC Reg. 32 baseline parity.",
    statutes: ["CBN CPR §2.1", "FCCPC DEON Reg. 18"],
    compliantRewrite:
      "Borrow up to ₦2,000,000 subject to credit appraisal. View full Key Facts Statement (Effective APR 54.0% p.a., 90–180 day tenor). 24h Complaints: compliance@institution.ng. Licensed by the CBN. Terms and Conditions apply.",
    rewriteHighlights: [
      "subject to credit appraisal",
      "Key Facts Statement",
      "24h Complaints: compliance@institution.ng",
      "Licensed by the CBN.",
      "Terms and Conditions apply.",
    ],
  },
  {
    id: "appstore",
    tabLabel: "App Store Policy",
    channelBadge: "GOOGLE PLAY + FCCPC DEON AUDIT",
    campaignTitle: "Mobile Lending Store Listing",
    productMatched: "NanoLoan Micro-Credit",
    submittedTitle: "Submitted Play Store Description",
    submittedCopy:
      "Repay in 14 to 30 days with fast approval. App requires contact list permission for instant credit scoring and recovery reminders.",
    flaggedPhrase: "requires contact list permission",
    initialVerdict: "BLOCK",
    riskScore: 94,
    resolvedRiskScore: 5,
    locks: {
      lock1: { label: "Lock 1 · Prohibited Terms", initial: "FAIL" },
      lock2: { label: "Lock 2 · Tenor Policy (<60d)", initial: "FAIL" },
      lock3: { label: "Lock 3 · NDPA & Representative Ex.", initial: "FAIL" },
    },
    blindSpot:
      "14–30 day tenor violates Google Play Personal Loan Policy (60-day minimum) while contact-list scraping violates FCCPC DEON Regulations and NDPA 2023.",
    consequence:
      "Immediate Google Play Store app removal, FCCPC delisting from approved digital lender registry, and NIBSS/payment gateway disconnection.",
    statutes: ["FCCPC DEON Reg. 2025", "NDPA 2023 §24", "Play Policy"],
    compliantRewrite:
      "Flexible credit lines with repayment tenors from 65 to 180 days (Maximum Effective APR: 48.0% p.a.). Representative example: ₦100,000 over 90 days; Total Repayable ₦111,835. Zero contact-list access. Licensed & FCCPC-registered. Terms and Conditions apply.",
    rewriteHighlights: [
      "65 to 180 days",
      "Representative example:",
      "Zero contact-list access.",
      "Terms and Conditions apply.",
    ],
  },
];

export interface RegulatorMetric {
  acronym: "CBN" | "FCCPC" | "ARCON" | "NDPC" | "SEC";
  name: string;
  sourceCount: number;
  domain: string;
  focus: string;
}

export const REGULATOR_METRICS: RegulatorMetric[] = [
  {
    acronym: "CBN",
    name: "Central Bank of Nigeria",
    sourceCount: 94,
    domain: "cbn.gov.ng",
    focus: "Consumer Protection Framework, Key Facts Statements, MFB/PSB/MMO & Digital Credit rules",
  },
  {
    acronym: "FCCPC",
    name: "Federal Competition & Consumer Protection Commission",
    sourceCount: 17,
    domain: "fccpc.gov.ng",
    focus: "DEON Digital Lending Regs, FCCPA §115 drip-pricing prohibitions & 2-year Reg. 32 retention",
  },
  {
    acronym: "SEC",
    name: "Securities & Exchange Commission",
    sourceCount: 15,
    domain: "sec.gov.ng",
    focus: "ISA 2025 capital markets, VASP/digital assets, robo-advisory & yield claim restrictions",
  },
  {
    acronym: "ARCON",
    name: "Advertising Regulatory Council of Nigeria",
    sourceCount: 11,
    domain: "arcon.gov.ng",
    focus: "ASP pre-vetting clearances, Nigerian Code of Advertising Practice & influencer directives",
  },
  {
    acronym: "NDPC",
    name: "Nigeria Data Protection Commission",
    sourceCount: 4,
    domain: "ndpc.gov.ng",
    focus: "NDPA 2023 & GAID direct marketing opt-in consent, privacy notices & anti-scraping rules",
  },
];

export interface LicenseVertical {
  id: "lenders" | "banking" | "payments" | "wealthtech";
  label: string;
  licenseTiers: string;
  regulators: Array<"CBN" | "FCCPC" | "ARCON" | "NDPC" | "SEC">;
  headline: string;
  description: string;
  blindSpotsCaught: string[];
  sampleCase: {
    label: string;
    riskFlag: string;
    statute: string;
    resolution: string;
  };
}

export const LICENSE_VERTICALS: LicenseVertical[] = [
  {
    id: "lenders",
    label: "Digital Lenders",
    licenseTiers: "FCCPC Digital Lenders · Consumer Credit Platforms",
    regulators: ["FCCPC", "CBN", "ARCON", "NDPC"],
    headline: "Eliminate drip-pricing traps and Play Store delistings before launch.",
    description:
      "Cogent cross-checks every flyer, SMS blast, and Google Play listing against your exact interest rate, upfront fees, tenor floor, and recovery disclosures.",
    blindSpotsCaught: [
      "Flags loans under 60 days that trigger Google Play Personal Loan removal",
      "Computes true net-disbursed APR & compounded IRR when upfront fees apply",
      "Blocks contact-list scraping, shaming recovery copy, and '0% hidden fee' claims",
    ],
    sampleCase: {
      label: "Drip-Pricing Detection",
      riskFlag: "5% advertised monthly rate masks 182.4% effective APR with ₦2,500 upfront fee on 15-day loan.",
      statute: "FCCPA §115 · FCCPC DEON Reg. 18",
      resolution: "Auto-generates CBN Key Facts Statement & 65-day compliant channel copy.",
    },
  },
  {
    id: "banking",
    label: "MFBs & Commercial Banks",
    licenseTiers: "Tier-1/2 Commercial Banks · National, State & Unit MFBs",
    regulators: ["CBN", "ARCON", "FCCPC", "NDPC"],
    headline: "Unify high-volume branch, influencer, and product marketing clearance.",
    description:
      "Enforce dual-control separation of duties across Marketing, Compliance Analysts, Legal Counsel, and your CCO—producing 2-year and 7-year BOFIA-aligned audit dossiers.",
    blindSpotsCaught: [
      "Enforces NDIC deposit insurance qualifiers (₦5M DMB / ₦2M MFB caps) on savings ads",
      "Checks flyer disclaimer-to-headline font height ratio (<12% buried fine print)",
      "Requires explicit ARCON ASP pre-vetting certificate IDs before sign-off",
    ],
    sampleCase: {
      label: "Visual Forensics & NDIC Check",
      riskFlag: "Deposit flyer omits 'NDIC Insured up to ₦2,000,000' and buries T&Cs at 6% headline ratio.",
      statute: "CBN CPF §3.2.3 · ARCON Code §4.2",
      resolution: "Flags exact bounding-box coordinates and locks approval until revised.",
    },
  },
  {
    id: "payments",
    label: "PSBs & Mobile Money",
    licenseTiers: "Payment Service Banks · MMOs · PSSPs & Switching Gateways",
    regulators: ["CBN", "NDPC", "ARCON", "FCCPC"],
    headline: "Enforce strict CBN license-scope boundaries across merchant & consumer ads.",
    description:
      "Prevent cross-license marketing violations automatically. Cogent verifies that promoted credit, FX, or wallet yields stay strictly within your CBN license permissions.",
    blindSpotsCaught: [
      "Blocks PSBs and MMOs from advertising unbacked direct credit under BOFIA §2",
      "Flags pre-ticked NDPA GAID marketing consent boxes on onboarding landing pages",
      "Monitors live fee & T&C pages every 6–24 hours for unauthorized web-team drift",
    ],
    sampleCase: {
      label: "License-Scope Boundary Lock",
      riskFlag: "PSB campaign copy advertises 'Direct Instant Credit Facility' outside CBN PSB permissible activities.",
      statute: "BOFIA 2020 §2 · CBN PSB Guidelines",
      resolution: "Redirects copy to permissible partner-bank co-branded credit disclosure.",
    },
  },
  {
    id: "wealthtech",
    label: "WealthTech & VASPs",
    licenseTiers: "SEC Capital Market Operators · Robo-Advisors · Digital Asset Platforms",
    regulators: ["SEC", "NDPC", "ARCON", "CBN"],
    headline: "Stop prohibited yield guarantees and unapproved asset promotions.",
    description:
      "Screen investment returns, fixed-income ads, and digital asset promotions against SEC ISA rules and historical past-performance disclosure mandates.",
    blindSpotsCaught: [
      "Immediately blocks '100% risk-free', 'guaranteed returns', and 'zero loss' phrasing",
      "Requires clear capital-at-risk and past-performance non-guarantee disclaimers",
      "Cross-references breaking SEC & CBN VASP circulars via .gov.ng Ripple Alerts",
    ],
    sampleCase: {
      label: "Prohibited Yield Claim",
      riskFlag: "Email campaign promises 'Guaranteed 24% annual return with zero capital risk'.",
      statute: "SEC ISA 2025 · Rule 102",
      resolution: "Rewrites to projected historical yield with mandatory capital-risk disclosure.",
    },
  },
];

export interface WalkthroughStep {
  id: string;
  stepNumber: string;
  title: string;
  subtitle: string;
  detail: string;
  previewBadge: string;
  previewTitle: string;
  metrics: Array<{ label: string; value: string; tone?: "neutral" | "critical" | "verified" }>;
  snippetLabel: string;
  snippetBody: string;
}

export const WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    id: "hydrate",
    stepNumber: "01",
    title: "Zero-click product truth hydration",
    subtitle: "Matches ad claims to your internal rate card automatically",
    detail:
      "Drop a flyer, paste social copy, or submit a URL. Cogent detects the promoted product, loads your approved interest rates and fees, and runs deterministic Lock 1–3 checks before reasoning begins.",
    previewBadge: "LOCK 2 · RATE CARD MATCH",
    previewTitle: "QuickCash Loan Schedule vs. Submitted Flyer",
    metrics: [
      { label: "Matched Product", value: "QuickCash Facility", tone: "neutral" },
      { label: "Flyer Claims", value: "0% hidden fees", tone: "critical" },
      { label: "Approved Schedule", value: "4.5%/mo + 1.5% upfront fee", tone: "verified" },
    ],
    snippetLabel: "Deterministic Discrepancy Output",
    snippetBody:
      "Effective net-disbursed APR computed at 79.8% p.a. (₦49,250 net disbursed on ₦50,000 gross). Omitting the 1.5% processing fee breaches FCCPA §115.",
  },
  {
    id: "forensics",
    stepNumber: "02",
    title: "Visual flyer OCR & Play Store forensics",
    subtitle: "Inspects fine-print pixel ratios and ARCON ASP IDs",
    detail:
      "Gemini Vision extracts every text bounding box from PNG, JPEG, WEBP, and PDF flyers. Cogent measures headline-to-disclaimer height ratios, verifies ARCON ASP certificate numbers, and audits Google Play loan policies.",
    previewBadge: "VISUAL FORENSICS · BOUNDING BOX",
    previewTitle: "Flyer Geometry & Pre-Vetting Audit",
    metrics: [
      { label: "Disclaimer Ratio", value: "0.07 (Below 0.12 min)", tone: "critical" },
      { label: "ARCON ASP ID", value: "Missing on asset", tone: "critical" },
      { label: "NDIC Qualifier", value: "Present (MFB ₦2M)", tone: "verified" },
    ],
    snippetLabel: "Detected Fine-Print Segment [box: 880, 120, 965, 880]",
    snippetBody:
      "Footer disclaimer renders at 7% of primary headline height—flagged as illegible fine print under ARCON Code & CBN CPF clarity standards.",
  },
  {
    id: "remediate",
    stepNumber: "03",
    title: "Self-corrected rewrites & CBN Key Facts Statement",
    subtitle: "Layer-6 validation prevents AI from breaking your rates",
    detail:
      "Proposed rewrites are automatically re-run through Deterministic Locks 1–3 before you ever see them. Generate compliant 160-character SMS copy, social copy, ARCON ASP memos, and Annex 1 KFS tables in one click.",
    previewBadge: "LAYER 6 · LOCK-VERIFIED REWRITE",
    previewTitle: "Validated Revision #2 + CBN KFS Table",
    metrics: [
      { label: "Lock 1–3 Re-Check", value: "3 / 3 PASSED", tone: "verified" },
      { label: "Net Disbursed", value: "₦49,250.00", tone: "neutral" },
      { label: "Total Cost of Credit", value: "₦3,000.00", tone: "neutral" },
    ],
    snippetLabel: "Ready-to-Publish Compliant Revision",
    snippetBody:
      "Apply for up to ₦50,000 QuickCash credit, subject to KYC & credit assessment. Effective APR: 79.8% p.a. Licensed by the CBN. [ARCON/ASP/2026/0419] Terms and Conditions apply.",
  },
  {
    id: "seal",
    stepNumber: "04",
    title: "Dual-control CCO sign-off & 2-year SHA-256 dossier",
    subtitle: "Immutable evidence chain + continuous URL drift sentinel",
    detail:
      "Marketing cannot self-approve. Legal Counsel or the Chief Compliance Officer executes formal sign-off tied to an immutable revision ID, exporting a tamper-evident PDF dossier for FCCPC Reg. 32 and ARCON ASP filing.",
    previewBadge: "FCCPC REG. 32 · SHA-256 SEALED",
    previewTitle: "Statutory Compliance Dossier #COG-2026-084",
    metrics: [
      { label: "Approver Role", value: "Chief Compliance Officer", tone: "verified" },
      { label: "Audit Hash", value: "8f4c...e91a (Chained)", tone: "neutral" },
      { label: "URL Sentinel", value: "Active (6h monitor)", tone: "verified" },
    ],
    snippetLabel: "Cryptographic Preservation Record",
    snippetBody:
      "Dossier archived in private object storage with verbatim statutory citations, OCR snapshots, and hash-chained approval event for 2-year / 7-year regulatory inspection.",
  },
];

export interface ComparisonRow {
  criterion: string;
  manualCounsel: { status: "warn" | "no" | "yes"; text: string };
  genericAi: { status: "warn" | "no" | "yes"; text: string };
  cogent: { status: "yes"; text: string };
}

export const COMPARISON_ROWS: ComparisonRow[] = [
  {
    criterion: "Verified Nigerian Statutory Citations (CBN, FCCPC, ARCON, NDPC, SEC)",
    manualCounsel: { status: "yes", text: "Manual lookup across circulars" },
    genericAi: { status: "no", text: "Hallucinates sections & outdated rules" },
    cogent: { status: "yes", text: "141 official PDFs + verbatim SHA-256 clauses" },
  },
  {
    criterion: "Internal Product Rate Card & Drip-Pricing APR Math",
    manualCounsel: { status: "warn", text: "Manual spreadsheet checks" },
    genericAi: { status: "no", text: "No product truth; estimates math poorly" },
    cogent: { status: "yes", text: "Deterministic IRR/APR & Lock 2 rate matching" },
  },
  {
    criterion: "Flyer OCR Fine-Print & ARCON ASP Pre-Vetting Checks",
    manualCounsel: { status: "warn", text: "Visual inspection by email" },
    genericAi: { status: "no", text: "No bounding-box ratio or ASP checks" },
    cogent: { status: "yes", text: "Pixel height ratio + ARCON ASP & NDIC audit" },
  },
  {
    criterion: "Turnaround Time per Campaign Review",
    manualCounsel: { status: "no", text: "5–10 business days" },
    genericAi: { status: "yes", text: "Seconds (unverified text)" },
    cogent: { status: "yes", text: "Under 30 seconds (Lock-verified)" },
  },
  {
    criterion: "Dual-Control RBAC & Anti-Self-Approval Sign-Off",
    manualCounsel: { status: "warn", text: "Scattered email/PDF threads" },
    genericAi: { status: "no", text: "Single-user chat window" },
    cogent: { status: "yes", text: "5-role RBAC + immutable campaign revisions" },
  },
  {
    criterion: "FCCPC Reg. 32 (2-Yr) & BOFIA (7-Yr) PDF Audit Dossiers",
    manualCounsel: { status: "warn", text: "Compiled manually for inspections" },
    genericAi: { status: "no", text: "None" },
    cogent: { status: "yes", text: "One-click SHA-256 hash-chained PDF bundle" },
  },
  {
    criterion: "Post-Publication Live URL & App Store Drift Monitoring",
    manualCounsel: { status: "no", text: "Not monitored after approval" },
    genericAi: { status: "no", text: "None" },
    cogent: { status: "yes", text: "Continuous Sentinel + instant CCO incident alerts" },
  },
];

export const COMPLIANCE_FAQS = [
  {
    category: "Statutory Grounding",
    question: "How does Cogent prevent hallucinated Nigerian legal citations?",
    answer:
      "Every statutory reference is retrieved via Hybrid RRF search from Cogent's verified Golden 50 Nigerian Statutory Vault (141 source PDFs across CBN, FCCPC, ARCON, NDPC, and SEC) and enforced by a 7-layer backend guardrail pipeline. Superseded instruments are filtered out unless explicitly requested, and every citation opens the exact verbatim clause text and SHA-256 document hash.",
  },
  {
    category: "Statutory Grounding",
    question: "Does Cogent grant autonomous legal or ARCON regulatory approval?",
    answer:
      "No. Cogent is an institutional decision-support, deterministic verification, and workflow-enforcement operating system. It flags breaches, computes true APR, validates rewrites, and compiles ARCON ASP / FCCPC audit dossiers, while formal internal clearance requires human sign-off by your Legal Counsel or Chief Compliance Officer.",
  },
  {
    category: "Deterministic Engines",
    question: "How does Cogent catch 'drip pricing' and Google Play Store loan policy violations?",
    answer:
      "Cogent's deterministic TypeScript APR/IRR engine computes net cash disbursed after upfront processing, management, or insurance deductions and calculates true annualized APR and compounded IRR—never delegating financial math to an LLM. Our App Store Auditor also flags loan tenors under 60 days, missing representative examples, and prohibited contact-list scraping cues.",
  },
  {
    category: "Governance & Security",
    question: "Can Marketing approve their own campaigns in Cogent?",
    answer:
      "No. Cogent enforces a strict 5-role, 22-permission RBAC matrix backed by PostgreSQL Row Level Security (RLS). Marketing/Growth users can create campaigns, accept validated rewrites, and submit revisions for review, but only authorized Legal Counsel or Chief Compliance Officer roles hold the `approval.decide` permission.",
  },
  {
    category: "Governance & Security",
    question: "Is our internal playbook or product rate card shared across tenants or used to train models?",
    answer:
      "Never. Every playbook, product schedule, campaign asset, and audit log is strictly isolated by `tenant_id` with composite foreign keys and RLS policies at the PostgreSQL layer, paired with private per-tenant Cloudflare R2 storage keys.",
  },
  {
    category: "Pricing & Paystack Billing",
    question: "Why are plans displayed in USD while settled via Paystack in Naira?",
    answer:
      "Plans are benchmarked in USD ($149 / $449 / $1,499 monthly, with 20% off annual billing) and converted dynamically at checkout using the live platform FX rate (e.g. ₦1,550/$1) so Nigerian institutions can pay seamlessly via local Naira cards, bank transfers, or Paystack multi-currency cards.",
  },
];
