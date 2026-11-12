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
    title: "Consumer Protection Framework (CPF) & Consumer Protection Regulations",
    instrument_type: "REGULATION",
    instrument_number: "CBN/CPD/DIR/REG/01/001",
    description: "Establishes fair treatment, full transparency, mandatory APR disclosure, and advertising conduct for all licensed financial institutions.",
    publication_date: "2019-12-20",
    effective_date: "2020-01-01",
    source_url: "https://cbn.gov.ng/documents/consumerprotectionframework.html",
    document_hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    clauses: [
      {
        clause_reference: "Part 4, Section 4.2.1",
        clause_text: "All advertisements for financial products and credit facilities shall disclose all fees, charges, penalties, and the true Annual Percentage Rate (APR) in a clear and conspicuous manner, and shall not contain false, exaggerated, or misleading representations regarding rates or terms.",
        page_number: 14,
        obligations: [
          {
            obligation_text: "Promotional marketing must clearly disclose APR, total cost of credit, and all administrative fees without hiding charges in asterisks.",
            obligation_type: "DISCLOSURE",
            severity: "CRITICAL",
            applicability_description: "Applies to all loan, credit, and consumer lending advertisements across all media.",
            institution_type: "ALL",
            product_type: "DIGITAL_LENDING",
          },
        ],
      },
    ],
  },
  {
    regulatorAcronym: "CBN",
    title: "Guidelines on Operations of Electronic Payment Channels in Nigeria",
    instrument_type: "GUIDELINE",
    instrument_number: "BPS/DIR/GEN/CIR/01/014",
    description: "Operational standards for electronic payment systems, ATM, POS, and mobile banking channels.",
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
    ],
  },
  {
    regulatorAcronym: "CBN",
    title: "Regulatory Framework for Mobile Money Services in Nigeria",
    instrument_type: "REGULATION",
    instrument_number: "BPS/DIR/GEN/CIR/02/003",
    description: "Prudential and marketing rules for mobile money operators and agent banking networks.",
    publication_date: "2021-07-09",
    effective_date: "2021-08-01",
    source_url: "https://cbn.gov.ng/documents/mobilemoneyservices.html",
    document_hash: "b2c3d4e5f6a7890123456789abcdef0123456789abcdef0123456789abcdef01",
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
    description: "Capital requirements, geographical boundaries, and consumer credit transparency for Tier 1 and Tier 2 MFBs.",
    publication_date: "2020-04-29",
    effective_date: "2020-05-01",
    source_url: "https://cbn.gov.ng/documents/mfbguidelines.html",
    document_hash: "d4e5f6a7b8c90123456789abcdef0123456789abcdef0123456789abcdef0123",
    clauses: [
      {
        clause_reference: "Section 5.3",
        clause_text: "No Microfinance Bank shall represent in its advertisements that deposits or loans carry full unconditional sovereign federal government guarantees beyond statutory NDIC insurable limits.",
        page_number: 22,
        obligations: [
          {
            obligation_text: "MFBs cannot advertise government guarantee on deposits or investment products beyond NDIC coverage.",
            obligation_type: "PROHIBITIVE",
            severity: "CRITICAL",
            applicability_description: "Applies to microfinance banks promoting deposit products.",
            institution_type: "MFB",
            product_type: "SAVINGS_DEPOSIT",
          },
        ],
      },
    ],
  },
  {
    regulatorAcronym: "CBN",
    title: "Guide to Charges by Banks, Other Financial and Non-Bank Financial Institutions",
    instrument_type: "GUIDELINE",
    instrument_number: "FPR/DIR/GEN/CIR/07/042",
    description: "Ceilings on bank fees, electronic transfer charges, card maintenance tariffs, and mandatory fee transparency.",
    publication_date: "2019-12-22",
    effective_date: "2020-01-01",
    source_url: "https://cbn.gov.ng/documents/guidetobankcharges.html",
    document_hash: "e5f6a7b8c9d0123456789abcdef0123456789abcdef0123456789abcdef01234",
    clauses: [
      {
        clause_reference: "Section 2.2",
        clause_text: "Any tariff, fee, or service charge published in promotional literature that departs from or conceals mandatory standard rates shall constitute an unfair trade practice subject to sanction.",
        page_number: 6,
        obligations: [
          {
            obligation_text: "Advertised fees must strictly conform to CBN published tariff ceilings.",
            obligation_type: "PROHIBITIVE",
            severity: "HIGH",
            applicability_description: "Applies to all banking fees, transfer charges, and card tariffs.",
          },
        ],
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
  },
  {
    regulatorAcronym: "CBN",
    title: "AML/CFT/CPF Customer Onboarding Communication Rules",
    instrument_type: "REGULATION",
    instrument_number: "FPR/DIR/GEN/CIR/07/033",
    description: "KYC tier communication rules and anti-money laundering disclosure requirements in onboarding promos.",
    publication_date: "2022-01-14",
    effective_date: "2022-02-01",
    source_url: "https://cbn.gov.ng/documents/amlcftregulations.html",
    document_hash: "b8c9d0e1f2a3456789abcdef0123456789abcdef0123456789abcdef01234567",
  },
  {
    regulatorAcronym: "CBN",
    title: "Risk-Based Cybersecurity Framework & Fraud Warning Directives",
    instrument_type: "DIRECTIVE",
    instrument_number: "BSD/DIR/GEN/CIR/11/010",
    description: "Mandatory customer cybersecurity warnings against sharing PINs, OTPs, and login credentials in promotional apps.",
    publication_date: "2022-11-01",
    effective_date: "2023-01-01",
    source_url: "https://cbn.gov.ng/documents/cybersecurityframework.html",
    document_hash: "c9d0e1f2a3b456789abcdef0123456789abcdef0123456789abcdef012345678",
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
    title: "Limited Interim Regulatory/Registration Framework and Guidelines for Digital Lending",
    instrument_type: "GUIDELINE",
    instrument_number: "FCCPC/DIR/DL/2022/01",
    description: "Mandatory FCCPC registration, interest rate disclosure, and prohibition of contact-list access for digital lenders.",
    publication_date: "2022-08-18",
    effective_date: "2022-09-01",
    source_url: "https://fccpc.gov.ng/regulations/digital-lending/",
    document_hash: "c5d6e7f8a9b0123abcdef0123456789abcdef0123456789abcdef0123456789d",
    clauses: [
      {
        clause_reference: "Section 4.1",
        clause_text: "Every digital lending platform must display its valid FCCPC approval or conditional registration status prominently on all promotional landing pages and app store listings.",
        page_number: 5,
        obligations: [
          {
            obligation_text: "Promotional pages and mobile app listings must state FCCPC registration approval status.",
            obligation_type: "DISCLOSURE",
            severity: "CRITICAL",
            applicability_description: "Applies to all digital lending advertising and intake pages.",
            product_type: "DIGITAL_LENDING",
          },
        ],
      },
    ],
  },
  {
    regulatorAcronym: "FCCPC",
    title: "Sales Promotion (Amended) Regulations",
    instrument_type: "REGULATION",
    instrument_number: "FCCPC/REG/SP/2024/02",
    description: "Regulation 32 2-year mandatory marketing record retention, Regulation 33 joint influencer liability, and promotional draw rules.",
    publication_date: "2024-03-15",
    effective_date: "2024-04-01",
    source_url: "https://fccpc.gov.ng/regulations/sales-promotions/",
    document_hash: "d6e7f8a9b0c1234abcdef0123456789abcdef0123456789abcdef0123456789e",
    clauses: [
      {
        clause_reference: "Regulation 32(1)",
        clause_text: "Any commercial enterprise or promoter running a promotional marketing campaign shall maintain and preserve a complete archive of all promotional materials, advertisements, terms, and actual award records for a minimum duration of two (2) years from campaign conclusion.",
        page_number: 12,
        obligations: [
          {
            obligation_text: "Promoters must preserve complete historical records and copies of all published promotional campaigns for at least 2 years.",
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
        clause_reference: "Section 10(1)",
        clause_text: "No advertisement shall be exposed, broadcast, or published on any medium in Nigeria without prior submission to and approval by the Advertising Standards Panel (ASP).",
        page_number: 7,
        obligations: [
          {
            obligation_text: "All advertising content must obtain ASP certificate of approval prior to exposure on any broadcast, print, or digital media.",
            obligation_type: "PRESCRIPTIVE",
            severity: "CRITICAL",
            applicability_description: "Applies to all public promotional advertising in Nigeria.",
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
    ],
  },
  {
    regulatorAcronym: "NDPC",
    title: "NDPC General Application and Implementation Directive (GAID) 2024",
    instrument_type: "DIRECTIVE",
    instrument_number: "NDPC/DIR/GAID/2024/01",
    description: "Implementation directive detailing lawful consent, cookie policies, and penalty schedules up to ₦10M or 2% turnover.",
    publication_date: "2024-02-14",
    effective_date: "2024-03-01",
    source_url: "https://ndpc.gov.ng/directives/gaid-2024/",
    document_hash: "f6a7b8c9d0e1234abcdef0123456789abcdef0123456789abcdef01234567892",
    clauses: [
      {
        clause_reference: "Section 14.2",
        clause_text: "Every direct marketing communication sent via electronic mail, short message service (SMS), or instant messaging application must contain an easily accessible, functioning, and cost-free opt-out or unsubscribe mechanism.",
        page_number: 15,
        obligations: [
          {
            obligation_text: "Mandatory free and functional opt-out/unsubscribe mechanism in every marketing communication.",
            obligation_type: "DISCLOSURE",
            severity: "CRITICAL",
            applicability_description: "Applies to all electronic direct marketing.",
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
