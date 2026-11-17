/**
 * StoryBrand (SB7) Marketing Content & Interactive Product Board Scenarios
 * Clear, human-spoken copy built to pass the 5-Second Grunt Test for Nigerian financial teams.
 */

export type BoardLane = "submitted" | "review" | "cleared";

export interface BoardCampaignCard {
  id: string;
  code: string;
  title: string;
  lane: BoardLane;
  channel: "Loan Flyer" | "Landing Page" | "App Listing" | "Social Ad";
  regulatorTag: string;
  updatedAt: string;
  ownerInitials: string;
  ownerRole: string;
  statusLabel: string;
  checksDone: number;
  checksTotal: number;
  originalCopy: string;
  flaggedIssue: string;
  plainFix: string;
  cleanRewrite: string;
  ruleCited: string;
}

export const HERO_BOARD_CARDS: BoardCampaignCard[] = [
  {
    id: "card-quickcash",
    code: "CMP-246",
    title: "QuickCash Salary Advance Flyer",
    lane: "submitted",
    channel: "Loan Flyer",
    regulatorTag: "FCCPC · ARCON",
    updatedAt: "Today",
    ownerInitials: "AO",
    ownerRole: "Growth Lead",
    statusLabel: "2 Issues Found",
    checksDone: 3,
    checksTotal: 5,
    originalCopy:
      "Get an instant ₦50,000 loan in 3 minutes! 5% monthly interest, 0% hidden charges, guaranteed approval.",
    flaggedIssue:
      "The promo promises '0% hidden charges' even though the product carries a 1.5% setup fee, and uses 'guaranteed approval' without a credit check caveat.",
    plainFix:
      "State the true rate and 1.5% fee clearly, remove the guarantee claim, and add your license and approval footer.",
    cleanRewrite:
      "Apply for up to ₦50,000 QuickCash credit, subject to KYC and credit assessment. Monthly rate: 4.5% plus a 1.5% one-off fee (Total repayable over 30 days: ₦52,250). Licensed by the CBN. Terms apply.",
    ruleCited: "FCCPA §115 · CBN Consumer Protection · ARCON Code",
  },
  {
    id: "card-playstore",
    code: "CMP-254",
    title: "Google Play Credit Store Listing",
    lane: "submitted",
    channel: "App Listing",
    regulatorTag: "Play Policy · NDPA",
    updatedAt: "Today",
    ownerInitials: "MK",
    ownerRole: "Product Marketing",
    statusLabel: "Action Needed",
    checksDone: 2,
    checksTotal: 5,
    originalCopy:
      "Repay in 14 to 30 days with fast approval. App reads contacts for instant scoring and reminders.",
    flaggedIssue:
      "Google Play blocks personal loan apps under 60 days, and FCCPC/NDPA rules ban scraping customer contact lists.",
    plainFix:
      "Update advertised loan tenor to 65–180 days, show one clear Naira example, and remove contact-list permission claims.",
    cleanRewrite:
      "Flexible credit lines from 65 to 180 days. Example: ₦100,000 over 90 days costs ₦11,835 in total interest and fees. Zero contact-list access. FCCPC-registered. Terms apply.",
    ruleCited: "Google Play Loan Policy · FCCPC DEON · NDPA §24",
  },
  {
    id: "card-flexipage",
    code: "CMP-187",
    title: "Personal Loan Pricing Webpage",
    lane: "review",
    channel: "Landing Page",
    regulatorTag: "CBN · Live Monitor",
    updatedAt: "2h ago",
    ownerInitials: "CE",
    ownerRole: "Legal Counsel",
    statusLabel: "Under Legal Review",
    checksDone: 4,
    checksTotal: 5,
    originalCopy:
      "Borrow up to ₦2,000,000 in minutes. Representative rate table and complaints email removed in latest page update.",
    flaggedIssue:
      "Yesterday's website update accidentally hid the Key Facts link and 24-hour complaints email required before sign-up.",
    plainFix:
      "Restore the representative rate summary and customer support contact before publishing the page update.",
    cleanRewrite:
      "Borrow up to ₦2,000,000 subject to credit assessment. 90–180 day tenors. See Key Facts before applying. Support: help@institution.ng. Licensed by the CBN.",
    ruleCited: "CBN Pre-Contract Transparency · FCCPC Reg. 32",
  },
  {
    id: "card-deposit",
    code: "CMP-168",
    title: "Fixed Deposit Social Campaign",
    lane: "review",
    channel: "Social Ad",
    regulatorTag: "NDIC · CBN MFB",
    updatedAt: "Yesterday",
    ownerInitials: "TN",
    ownerRole: "Brand Lead",
    statusLabel: "Waiting CCO Sign-Off",
    checksDone: 4,
    checksTotal: 5,
    originalCopy:
      "Open a fixed deposit account across all 36 states today — NDIC insures 100% of every deposit at 18% guaranteed returns!",
    flaggedIssue:
      "NDIC insurance covers deposits up to statutory limits (₦2M for MFBs / ₦5M for banks), not 100% unlimited coverage.",
    plainFix:
      "Specify the exact NDIC coverage limit for your license type and frame returns as indicative rates.",
    cleanRewrite:
      "Grow your savings with Fixed Deposit, insured by the NDIC up to statutory limits (₦2,000,000 for MFBs / ₦5,000,000 for banks). Indicative rates apply. Licensed by the CBN.",
    ruleCited: "NDIC Deposit Caps · BOFIA 2020 · ARCON Pre-Vetting",
  },
  {
    id: "card-sme",
    code: "CMP-134",
    title: "SME Working Capital Banner",
    lane: "cleared",
    channel: "Loan Flyer",
    regulatorTag: "Signed & Archived",
    updatedAt: "Approved",
    ownerInitials: "GO",
    ownerRole: "Chief Compliance Officer",
    statusLabel: "Ready to Publish",
    checksDone: 5,
    checksTotal: 5,
    originalCopy:
      "Scale your business inventory with ₦500k–₦5M working capital over 6–12 months. Indicative rates from 3.5%/mo plus 1% fee. Subject to appraisal. Licensed by the CBN.",
    flaggedIssue:
      "All rate figures, fee disclosures, license wording, and T&Cs match your approved company rate card.",
    plainFix: "No fixes needed — signed by CCO and saved for regulatory inspection.",
    cleanRewrite:
      "Scale your business inventory with ₦500k–₦5M working capital over 6–12 months. Indicative rates from 3.5%/mo plus 1% fee. Subject to credit appraisal. Licensed by the CBN. Terms apply.",
    ruleCited: "All Checks Passed · CCO Approved",
  },
  {
    id: "card-yield",
    code: "CMP-145",
    title: "Treasury Cash Account Launch",
    lane: "cleared",
    channel: "Landing Page",
    regulatorTag: "SEC · NDPC",
    updatedAt: "Approved",
    ownerInitials: "GO",
    ownerRole: "Chief Compliance Officer",
    statusLabel: "Monitored 24/7",
    checksDone: 5,
    checksTotal: 5,
    originalCopy:
      "Put idle treasury funds to work in SEC-regulated money market notes. Returns fluctuate with market rates; capital is not guaranteed.",
    flaggedIssue:
      "Variable yield warnings, opt-in privacy notice, and operator license line are all present and accurate.",
    plainFix: "Live URL watcher checks this page daily so nothing changes silently.",
    cleanRewrite:
      "Put idle treasury funds to work in SEC-regulated money market notes. Variable yields; past returns do not guarantee future results. Regulated by the SEC Nigeria.",
    ruleCited: "All Checks Passed · Live Page Monitored",
  },
];

export interface BoardHotspot {
  number: number;
  title: string;
  description: string;
  targetCardId?: string;
}

export const BOARD_HOTSPOTS: BoardHotspot[] = [
  {
    number: 1,
    title: "One calm workspace",
    description: "Every product line, rate card, and live page monitor sits a click away.",
  },
  {
    number: 2,
    title: "Filter by channel fast",
    description: "Jump straight to flyers, app store pages, or website updates without digging.",
  },
  {
    number: 3,
    title: "Clear status lanes",
    description: "See every draft move cleanly from Submitted to Under Review to Cleared.",
  },
  {
    number: 4,
    title: "Instant rule flags",
    description: "Plain-English tags tell growth and legal teams why a line needs attention.",
    targetCardId: "card-quickcash",
  },
  {
    number: 5,
    title: "Checklists & owners",
    description: "Track who reviewed what, how many checks passed, and who holds sign-off.",
    targetCardId: "card-deposit",
  },
  {
    number: 6,
    title: "One-click campaign check",
    description: "Upload a flyer, paste copy, or drop a URL to get feedback in seconds.",
    targetCardId: "card-playstore",
  },
];

export interface StoryStakeItem {
  level: string;
  title: string;
  detail: string;
}

export const STORY_STAKES: StoryStakeItem[] = [
  {
    level: "THE DAILY TRAP",
    title: "One missed line can pull an entire campaign",
    detail:
      "Unvetted ads, hidden fee phrasing, or missing license wording across CBN, FCCPC, ARCON, NDPC, and Google Play expose teams to sudden takedowns and seven-figure fines.",
  },
  {
    level: "THE TEAM FRICTION",
    title: "Marketing stalls while Compliance worries",
    detail:
      "Growth teams wait days in email threads for legal feedback, while Compliance Officers lie awake wondering what slipped live without review.",
  },
  {
    level: "WHAT WE BELIEVE",
    title: "Great financial brands shouldn't fear launching",
    detail:
      "You deserve to move fast on campaigns while knowing every rate, disclosure, and live webpage has already been double-checked before customers see it.",
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
    title: "Save your real rates & rules once",
    description:
      "Enter your approved loan rates, fees, deposit caps, and brand guidelines in one shared place—so ads never contradict what you actually charge.",
    outcome: "Takes 5 minutes during setup",
  },
  {
    step: "02",
    title: "Drop in a flyer, copy, or link",
    description:
      "Before you publish, Cogent checks every word and number against Nigerian regulators and writes clear, compliant fixes your marketing team can use right away.",
    outcome: "Feedback in seconds, not days",
  },
  {
    step: "03",
    title: "Sign off and launch with proof",
    description:
      "Legal or Compliance approves in one click. Every version, timestamp, and approved text is saved cleanly—and live pages are watched automatically after launch.",
    outcome: "Audit-ready for every inspection",
  },
];

export interface RegulatorMetric {
  acronym: "CBN" | "FCCPC" | "ARCON" | "NDPC" | "SEC";
  name: string;
  focus: string;
}

export const REGULATOR_METRICS: RegulatorMetric[] = [
  {
    acronym: "CBN",
    name: "Central Bank of Nigeria",
    focus: "Rate transparency, license boundaries, MFB & PSB advertising standards",
  },
  {
    acronym: "FCCPC",
    name: "Federal Competition & Consumer Protection Commission",
    focus: "Honest pricing rules, digital lending safeguards & customer disclosures",
  },
  {
    acronym: "ARCON",
    name: "Advertising Regulatory Council of Nigeria",
    focus: "Pre-publication ad vetting rules, clear caveats & promotional standards",
  },
  {
    acronym: "NDPC",
    name: "Nigeria Data Protection Commission",
    focus: "Direct marketing consent, opt-out wording & app permission limits",
  },
  {
    acronym: "SEC",
    name: "Securities & Exchange Commission",
    focus: "Investment risk disclosures, yield wording & capital market guidelines",
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
    cleanFix: string;
  };
}

export const LICENSE_VERTICALS: LicenseVertical[] = [
  {
    id: "lenders",
    label: "Digital Lenders",
    licenseTiers: "FCCPC Registered Lenders & Credit Apps",
    regulators: ["FCCPC", "CBN", "NDPC", "ARCON"],
    headline: "Stop losing apps to Play Store rejections and lending delistings",
    description:
      "Check loan flyers, Instagram promos, and app store descriptions for true repayment costs, minimum 60-day tenors, and respectful collection wording before anything goes live.",
    blindSpotsCaught: [
      "Spots short 14–30 day loan ads before Google Play pulls your app listing",
      "Calculates real total cost whenever setup or management fees reduce cash received",
      "Flags '0% hidden charges' or contact-list permission phrasing automatically",
    ],
    sampleCase: {
      label: "Promo Banner Draft",
      riskFlag: "Says '0% hidden fees' while product charges 1.5% upfront fee",
      statute: "FCCPC Pricing Rules · Google Play Policy",
      cleanFix: "Shows exact fee, real monthly cost, and 65-day+ repayment window clearly.",
    },
  },
  {
    id: "banking",
    label: "MFBs & Banks",
    licenseTiers: "Commercial Banks · National, State & Unit MFBs",
    regulators: ["CBN", "ARCON", "FCCPC"],
    headline: "Clear branch flyers and national campaigns twice as fast",
    description:
      "Keep marketing teams inside your exact license perimeter—checking NDIC coverage limits, readable fine print, and clear legal sign-off on every campaign.",
    blindSpotsCaught: [
      "Verifies correct NDIC insurance wording (₦2M for MFBs vs. ₦5M for banks)",
      "Prevents State or Unit MFB ads from promising nationwide coverage",
      "Catches tiny unreadable fine print and missing ad approval IDs on flyers",
    ],
    sampleCase: {
      label: "Fixed Deposit Social Ad",
      riskFlag: "Claims '100% NDIC protection' without mentioning statutory limits",
      statute: "NDIC Coverage Rules · BOFIA · ARCON",
      cleanFix: "States statutory deposit limit and indicative rate note cleanly.",
    },
  },
  {
    id: "payments",
    label: "PSBs & Payments",
    licenseTiers: "Payment Service Banks · MMOs · PSSPs",
    regulators: ["CBN", "NDPC", "FCCPC"],
    headline: "Promote partner products without crossing license lines",
    description:
      "Ensure wallet, transfer, and co-branded credit ads clearly name licensed underwriting partners and watch live pricing pages every day for unintended edits.",
    blindSpotsCaught: [
      "Reminds teams to name the CBN-licensed bank partner on credit promos",
      "Protects payment platforms from deposit-taking wording outside their license",
      "Alerts compliance automatically if a live webpage changes after sign-off",
    ],
    sampleCase: {
      label: "In-App Credit Banner",
      riskFlag: "Advertises direct loans from wallet without naming underwriting bank",
      statute: "CBN Payment & Lending Boundaries",
      cleanFix: "Credits the licensed bank partner clearly in one plain sentence.",
    },
  },
  {
    id: "wealthtech",
    label: "WealthTech & SEC",
    licenseTiers: "SEC Capital Market Operators · Investment Apps",
    regulators: ["SEC", "ARCON", "NDPC"],
    headline: "Market yield products responsibly without triggering SEC warnings",
    description:
      "Catch prohibited 'guaranteed return' language early across emails, influencer scripts, and landing pages while keeping risk notes visible and clear.",
    blindSpotsCaught: [
      "Flags '100% risk-free' and 'guaranteed ROI' wording instantly",
      "Ensures variable-return ads carry clear capital-at-risk reminders",
      "Checks creator scripts and newsletters before they reach customers",
    ],
    sampleCase: {
      label: "Dollar Yield Newsletter",
      riskFlag: "Promises 'guaranteed 24% annual return — zero capital risk'",
      statute: "SEC Marketing Rules · ARCON",
      cleanFix: "Frames yield as historical/indicative with standard investment risk wording.",
    },
  },
];

export interface ComplianceFaqItem {
  id: string;
  category: "Workflow" | "Accuracy" | "Security" | "Billing";
  question: string;
  answer: string;
}

export const COMPLIANCE_FAQS: ComplianceFaqItem[] = [
  {
    id: "what-cogent-checks",
    category: "Workflow",
    question: "What types of marketing can we check with Cogent?",
    answer:
      "You can check promotional flyers (PNG, JPG, PDF), social captions, ad headlines, Google Play and App Store descriptions, email newsletters, and live webpage links before or after they go live.",
  },
  {
    id: "how-rewrites-work",
    category: "Workflow",
    question: "Does Cogent rewrite flagged ads so marketing can fix them fast?",
    answer:
      "Yes. Instead of only flagging problems, Cogent drafts clear, ready-to-use compliant alternatives that keep your marketing hook sharp while meeting regulatory requirements.",
  },
  {
    id: "accuracy-guarantees",
    category: "Accuracy",
    question: "How does Cogent avoid made-up legal advice?",
    answer:
      "Every check ties back to verified Nigerian regulations (CBN, FCCPC, ARCON, NDPC, and SEC) alongside the real product rates and fees you save in your workspace. We never guess or invent interest math.",
  },
  {
    id: "who-approves",
    category: "Security",
    question: "Can Marketing approve their own campaigns?",
    answer:
      "No. Cogent separates roles cleanly: Marketing and Growth teams submit drafts and review fixes, while final publication sign-off is locked strictly to your Legal Counsel or Chief Compliance Officer.",
  },
  {
    id: "live-url-monitoring",
    category: "Workflow",
    question: "What happens if someone edits our pricing page after approval?",
    answer:
      "Live page monitors compare your published webpages against the approved version automatically and alert your team right away if an important disclaimer, fee, or link goes missing.",
  },
  {
    id: "pricing-billing-inside",
    category: "Billing",
    question: "How does onboarding and workspace billing work in Nigeria?",
    answer:
      "Every organization starts with a 7-day evaluation account—no card needed. When your team is ready for unlimited reviews, team seats, and live page monitoring, you can upgrade right inside Workspace Settings with smooth Naira settlement via Paystack.",
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
    icon: "shield" | "compass" | "sparkles" | "lock";
  }>;
}

export const CO_FOUNDERS: CoFounderProfile[] = [
  {
    id: "odion-alex",
    initials: "OA",
    shortLabel: "Odion O. Alex · CEO",
    name: "Odion O. Alex",
    roleBadge: "CO-FOUNDER & CEO",
    discipline: "Product & Execution · Stem Systems",
    bio: "Odion O. Alex leads product architecture and execution at Stem Systems—focused on turning complex Nigerian financial regulations into fast, everyday tools that both growth teams and Chief Compliance Officers genuinely trust.",
    quote:
      "Financial teams shouldn't have to choose between moving fast on campaigns and staying safe with regulators. Cogent exists to give them both.",
    imagePath: "/images/odion-alex.jpg",
    mandates: [
      {
        title: "Calm Usability First",
        description:
          "Software only protects an institution when teams actually use it before every launch—never as an afterthought.",
        icon: "sparkles",
      },
      {
        title: "Built for Real Proof",
        description:
          "Every check, rate verification, and sign-off leaves behind clear, inspectable evidence leaders can stand behind.",
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
    discipline: "Strategy & Positioning · Stem Systems",
    bio: "Gift Chinedu Nduka is the Co-founder and Chief Strategy Officer (CSO) at Stem Systems, a decision intelligence platform built to help fintech companies navigate market shifts with clarity and confidence. Sitting at the intersection of market intelligence, brand positioning, and execution, she translates complex market signals into actionable growth strategies. Drawing on her background as a brand strategist and designer, Gift ensures that Stem Systems builds lasting market credibility, challenges costly assumptions early, and scales through evidence-backed decision.",
    quote:
      "When your message is clear and your product is credible, trust stops being a bottleneck—it becomes your fastest growth engine.",
    imagePath: "/images/gift-nduka.jpg",
    mandates: [
      {
        title: "Market Intelligence & Clarity",
        description:
          "Translates shifting Nigerian fintech and regulatory market signals into decisive product and go-to-market positioning.",
        icon: "compass",
      },
      {
        title: "Evidence-Backed Credibility",
        description:
          "Challenges costly assumptions early so financial brands scale on durable trust rather than guesswork.",
        icon: "lock",
      },
    ],
  },
];
