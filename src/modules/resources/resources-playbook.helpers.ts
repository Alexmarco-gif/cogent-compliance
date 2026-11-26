/**
 * Cogent Master Content Operations & SEO Playbook Engine (Pure Shared Helpers)
 * Works on both client (live editor QA & templates) and server (API & public renderer).
 * Zero DB / env dependencies.
 */

import {
  CONTENT_PILLARS,
  CONTENT_PILLAR_META,
  type ContentPillar,
  type ResourceAtomizationKit,
  type ResourceAuthoritativeSource,
  type ResourceCategory,
  type ResourceFaqItem,
  type ResourceMidArticleCta,
  type ResourcePost,
  type ResourceQaChecklist,
  type TargetPersona,
  type WorkflowTrack,
} from "@/contracts/resources.contracts";

export interface PriorityScoreResult {
  total: number;
  max: number;
  greenlit: boolean;
  hasAllFactors: boolean;
}

export function calculatePriorityScore(
  urgency?: number | null,
  commercial?: number | null,
  winnability?: number | null,
): PriorityScoreResult {
  const u = typeof urgency === "number" && urgency >= 1 && urgency <= 5 ? urgency : 0;
  const c = typeof commercial === "number" && commercial >= 1 && commercial <= 5 ? commercial : 0;
  const w = typeof winnability === "number" && winnability >= 1 && winnability <= 5 ? winnability : 0;
  const total = u + c + w;
  const hasAllFactors = u > 0 && c > 0 && w > 0;
  return {
    total,
    max: 15,
    greenlit: hasAllFactors && total >= 11,
    hasAllFactors,
  };
}

export function countMarkdownWords(markdown: string): number {
  const plain = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\{\{CTA\}\}/gi, " ")
    .replace(/[#*_`>\[\]()!|-]/g, " ")
    .trim();
  if (!plain) return 0;
  return plain.split(/\s+/).filter(Boolean).length;
}

export function slugifyHeadingText(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 72) || "section"
  );
}

export interface MarkdownHeading {
  level: 2 | 3;
  text: string;
  id: string;
}

/**
 * Extracts H2 and H3 headings from Markdown with deterministic, collision-safe IDs.
 */
export function extractMarkdownHeadings(markdown: string): MarkdownHeading[] {
  const lines = markdown.split(/\r?\n/);
  const headings: MarkdownHeading[] = [];
  const counts = new Map<string, number>();
  let inCodeFence = false;

  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      inCodeFence = !inCodeFence;
      continue;
    }
    if (inCodeFence) continue;

    const match = line.match(/^(#{2,3})\s+(.+?)\s*#*$/);
    const hashes = match?.[1];
    const headingBody = match?.[2];
    if (!hashes || !headingBody) continue;

    const level = hashes.length as 2 | 3;
    const rawText = headingBody
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/[*_`~]/g, "")
      .trim();
    if (!rawText) continue;

    const baseId = slugifyHeadingText(rawText);
    const seen = counts.get(baseId) ?? 0;
    counts.set(baseId, seen + 1);
    const id = seen === 0 ? baseId : `${baseId}-${seen + 1}`;
    headings.push({ level, text: rawText, id });
  }

  return headings;
}

/**
 * Splits Markdown into [beforeCta, afterCta] so a contextual Mid-Article CTA card
 * renders cleanly at an explicit `{{CTA}}` marker or automatically before the 3rd H2.
 */
export function splitMarkdownForMidArticleCta(markdown: string): {
  before: string;
  after: string | null;
} {
  const markerRegex = /\n?\s*\{\{CTA\}\}\s*\n?/i;
  if (markerRegex.test(markdown)) {
    const parts = markdown.split(markerRegex);
    return {
      before: (parts[0] || "").trim(),
      after: parts.slice(1).join("\n\n").trim() || null,
    };
  }

  const lines = markdown.split(/\r?\n/);
  let h2Count = 0;
  let inCodeFence = false;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? "";
    if (/^\s*```/.test(line)) {
      inCodeFence = !inCodeFence;
      continue;
    }
    if (inCodeFence) continue;
    if (/^##\s+/.test(line)) {
      h2Count += 1;
      if (h2Count === 3) {
        return {
          before: lines.slice(0, i).join("\n").trim(),
          after: lines.slice(i).join("\n").trim(),
        };
      }
    }
  }

  return { before: markdown, after: null };
}

export interface QaGateResult {
  id: string;
  label: string;
  mode: "auto" | "manual";
  passed: boolean;
  detail: string;
}

export interface ResourceSeoQaReport {
  gates: QaGateResult[];
  passedCount: number;
  totalCount: number;
  readyToPublish: boolean;
  wordCount: number;
  seoTitleLength: number;
  seoDescriptionLength: number;
  internalLinkCount: number;
  govOutlinkCount: number;
  hasVisualAnchor: boolean;
}

export interface EvaluateQaInput {
  title: string;
  slug: string;
  excerpt: string;
  bodyMarkdown: string;
  primaryKeyword?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  targetWordCount?: number | null;
  faqItems?: ResourceFaqItem[];
  midArticleCta?: ResourceMidArticleCta | null;
  showLegalDisclaimer?: boolean;
  qaChecklist?: Partial<ResourceQaChecklist> | null;
  authoritativeSources?: ResourceAuthoritativeSource[];
}

function extractMarkdownLinks(markdown: string): string[] {
  const urls: string[] = [];
  const mdLinkRe = /(?<!!)\[[^\]]+\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  let m: RegExpExecArray | null;
  while ((m = mdLinkRe.exec(markdown)) !== null) {
    if (m[1]) urls.push(m[1].trim());
  }
  return urls;
}

function isInternalSiteLink(url: string): boolean {
  if (url.startsWith("/") && !url.startsWith("//")) return true;
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "").toLowerCase() === "stem-cogent.com";
  } catch {
    return false;
  }
}

function isOfficialRegulatorLink(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    return (
      host.endsWith(".gov.ng") ||
      host.endsWith(".gov.ke") ||
      host.endsWith(".gov.gh") ||
      host.endsWith(".gov.za") ||
      host.includes("cbn.gov") ||
      host.includes("sec.gov") ||
      host.includes("ndpc.gov") ||
      host.includes("fccpc.gov") ||
      host.includes("nfiu.gov") ||
      host.includes("arcon.gov") ||
      host.includes("centralbank.go.ke") ||
      host.includes("bog.gov.gh")
    );
  } catch {
    return false;
  }
}

/**
 * Evaluates all 12 Playbook Phase 4 Maker-Checker Quality Assurance gates.
 */
export function evaluateResourceSeoAndQa(input: EvaluateQaInput): ResourceSeoQaReport {
  const title = (input.title || "").trim();
  const slug = (input.slug || "").trim();
  const keyword = (input.primaryKeyword || "").trim().toLowerCase();
  const body = input.bodyMarkdown || "";
  const effectiveSeoTitle = ((input.seoTitle || "").trim() || title);
  const effectiveSeoDesc = ((input.seoDescription || "").trim() || (input.excerpt || "").trim());

  const wordCount = countMarkdownWords(body);
  const links = extractMarkdownLinks(body);
  const sourceUrls = (input.authoritativeSources || [])
    .map((s) => s.url || "")
    .filter(Boolean);
  const allOutbound = [...links, ...sourceUrls];

  const internalLinkCount = links.filter(isInternalSiteLink).length;
  const govOutlinkCount = new Set(allOutbound.filter(isOfficialRegulatorLink)).size;

  const plainOpening = body
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#*_`>\[\]()|-]/g, " ")
    .trim()
    .split(/\s+/)
    .slice(0, 110)
    .join(" ")
    .toLowerCase();

  const headings = extractMarkdownHeadings(body);
  const h2Count = headings.filter((h) => h.level === 2).length;
  const hasKeywordInTitle = keyword
    ? title.toLowerCase().includes(keyword) || effectiveSeoTitle.toLowerCase().includes(keyword)
    : title.length >= 15;
  const seoTitleInRange = effectiveSeoTitle.length >= 35 && effectiveSeoTitle.length <= 65;

  const hasKeywordInOpening = keyword
    ? plainOpening.includes(keyword)
    : plainOpening.length >= 120;

  const hasTable = /\|.+\|\s*\n\|[\s:|-]+\|/.test(body);
  const hasChecklistOrList = /^\s*(?:[-*]|\d+\.)\s+/m.test(body);
  const hasVisualAnchor = hasTable || hasChecklistOrList;

  const slugStopWords = /(?:^|-)(?:the|and|for|with|that|this|from|your)(?:-|$)/;
  const slugClean =
    slug.length >= 3 &&
    slug.length <= 75 &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) &&
    !slugStopWords.test(slug);

  const faqCount = (input.faqItems || []).filter(
    (f) => f.question.trim().length >= 5 && f.answer.trim().length >= 10,
  ).length;

  const hasMidCta = Boolean(input.midArticleCta?.headline?.trim());

  const gates: QaGateResult[] = [
    {
      id: "statutory_accuracy",
      label: "Statutory Accuracy",
      mode: "manual",
      passed: Boolean(input.qaChecklist?.statutoryAccuracyVerified),
      detail: input.qaChecklist?.statutoryAccuracyVerified
        ? "Primary circular codes, sections & dates verified by Checker."
        : "Checker sign-off needed: verify circular codes, sections & effective dates.",
    },
    {
      id: "repealed_rule_check",
      label: "Repealed Rule Check",
      mode: "manual",
      passed: Boolean(input.qaChecklist?.repealedRuleChecked),
      detail: input.qaChecklist?.repealedRuleChecked
        ? "Confirmed no superseded or revoked directives are cited."
        : "Checker sign-off needed: confirm no cited rule was revoked/superseded.",
    },
    {
      id: "legal_disclaimer",
      label: "Legal Disclaimer",
      mode: "auto",
      passed: input.showLegalDisclaimer !== false,
      detail:
        input.showLegalDisclaimer !== false
          ? "Standard regulatory informational disclaimer is enabled."
          : "Enable the standard legal disclaimer footer toggle.",
    },
    {
      id: "h1_title_tag",
      label: "H1 & SEO Title Tag",
      mode: "auto",
      passed: hasKeywordInTitle && seoTitleInRange,
      detail: `${effectiveSeoTitle.length} chars (target 55–60)${
        keyword ? (hasKeywordInTitle ? " · Keyword matched" : " · Missing primary keyword") : ""
      }`,
    },
    {
      id: "url_cleanliness",
      label: "Canonical URL Slug",
      mode: "auto",
      passed: slugClean,
      detail: slugClean
        ? `Clean slug (${slug.length} chars) under /resources/[category]/${slug}`
        : "Keep slug short (<75 chars), lowercase hyphenated, without filler stop words.",
    },
    {
      id: "first_100_words",
      label: "First-100-Words BLUF",
      mode: "auto",
      passed: hasKeywordInOpening,
      detail: keyword
        ? hasKeywordInOpening
          ? `Primary keyword "${input.primaryKeyword}" appears in the opening BLUF.`
          : `Include "${input.primaryKeyword}" within the first 100 words.`
        : "Add a Primary Keyword in Brief & Strategy for exact BLUF verification.",
    },
    {
      id: "semantic_subheadings",
      label: "Semantic H2/H3 Structure",
      mode: "auto",
      passed: h2Count >= 3,
      detail: `${h2Count} H2 headings (${headings.length} total H2/H3) — target ≥ 3 H2 sections.`,
    },
    {
      id: "visual_scannability",
      label: "Table / Checklist Anchor",
      mode: "auto",
      passed: hasVisualAnchor,
      detail: hasTable
        ? "Structured comparison table detected."
        : hasChecklistOrList
          ? "Bulleted/numbered checklist detected (consider adding a comparison table too)."
          : "Insert at least one comparison table or numbered compliance checklist.",
    },
    {
      id: "internal_link_mesh",
      label: "Internal Link Mesh (≥ 3)",
      mode: "auto",
      passed: internalLinkCount >= 3,
      detail: `${internalLinkCount} internal link(s) found (target ≥ 3 to /solutions, /resources/..., /pricing).`,
    },
    {
      id: "gov_outlinks",
      label: "Official .gov.ng Outlinks (≥ 2)",
      mode: "auto",
      passed: govOutlinkCount >= 2,
      detail: `${govOutlinkCount} official regulator link(s) detected in body or sources (target ≥ 2).`,
    },
    {
      id: "faq_schema",
      label: "Article + FAQPage Schema",
      mode: "auto",
      passed: faqCount >= 2,
      detail:
        faqCount >= 2
          ? `${faqCount} structured FAQs ready — FAQPage JSON-LD auto-generated.`
          : `Add at least 2–3 structured FAQs (${faqCount} added) to emit FAQPage JSON-LD.`,
    },
    {
      id: "conversion_cta",
      label: "Contextual Conversion CTA",
      mode: "auto",
      passed: hasMidCta,
      detail: hasMidCta
        ? `Mid-article CTA active → ${input.midArticleCta?.buttonUrl || "/sign-up"}`
        : "Configure a contextual Mid-Article CTA driving to the 7-day free workspace.",
    },
  ];

  const passedCount = gates.filter((g) => g.passed).length;
  return {
    gates,
    passedCount,
    totalCount: gates.length,
    readyToPublish: passedCount >= 10 && Boolean(input.qaChecklist?.statutoryAccuracyVerified),
    wordCount,
    seoTitleLength: effectiveSeoTitle.length,
    seoDescriptionLength: effectiveSeoDesc.length,
    internalLinkCount,
    govOutlinkCount,
    hasVisualAnchor,
  };
}

export interface RefreshStatus {
  due: boolean;
  reason: string | null;
  daysSinceAudit: number | null;
}

export function isPostRefreshDue(
  post: Pick<ResourcePost, "status" | "publishedAt" | "lastStatutoryAuditAt" | "refreshDueAt" | "effectiveDate">,
  now: Date = new Date(),
): RefreshStatus {
  if (post.status !== "published") {
    return { due: false, reason: null, daysSinceAudit: null };
  }

  const nowMs = now.getTime();
  const auditIso = post.lastStatutoryAuditAt || post.publishedAt;
  const daysSinceAudit = auditIso
    ? Math.floor((nowMs - Date.parse(auditIso)) / (1000 * 60 * 60 * 24))
    : null;

  if (post.refreshDueAt) {
    const dueMs = Date.parse(post.refreshDueAt);
    if (!Number.isNaN(dueMs) && dueMs <= nowMs) {
      return { due: true, reason: "Scheduled 30-day refresh date reached", daysSinceAudit };
    }
  }

  if (post.effectiveDate) {
    const effMs = Date.parse(post.effectiveDate);
    if (!Number.isNaN(effMs)) {
      const daysToDeadline = Math.ceil((effMs - nowMs) / (1000 * 60 * 60 * 24));
      if (daysToDeadline < 0) {
        return {
          due: true,
          reason: "Regulatory deadline has passed — verify active enforcement & update copy",
          daysSinceAudit,
        };
      }
      if (daysToDeadline <= 14 && (daysSinceAudit === null || daysSinceAudit > 7)) {
        return {
          due: true,
          reason: `Regulatory deadline in ${daysToDeadline}d — add urgency update callout`,
          daysSinceAudit,
        };
      }
    }
  }

  if (daysSinceAudit !== null && daysSinceAudit >= 30) {
    return {
      due: true,
      reason: `Published ${daysSinceAudit} days ago without a statutory refresh`,
      daysSinceAudit,
    };
  }

  return { due: false, reason: null, daysSinceAudit };
}

export interface PillarMixEntry {
  pillar: ContentPillar;
  code: string;
  shortLabel: string;
  targetPercent: number;
  count: number;
  actualPercent: number;
}

export function computePillarMix(posts: Pick<ResourcePost, "status" | "contentPillar">[]): {
  totalTagged: number;
  entries: PillarMixEntry[];
} {
  const publishedTagged = posts.filter((p) => p.status === "published" && p.contentPillar);
  const totalTagged = publishedTagged.length;
  const entries = CONTENT_PILLARS.map((pillar) => {
    const count = publishedTagged.filter((p) => p.contentPillar === pillar).length;
    const actualPercent = totalTagged > 0 ? Math.round((count / totalTagged) * 100) : 0;
    return {
      pillar,
      code: CONTENT_PILLAR_META[pillar].code,
      shortLabel: CONTENT_PILLAR_META[pillar].shortLabel,
      targetPercent: CONTENT_PILLAR_META[pillar].targetPercent,
      count,
      actualPercent,
    };
  });
  return { totalTagged, entries };
}

export interface CtaPreset {
  label: string;
  cta: ResourceMidArticleCta;
}

export const CTA_PRESETS: readonly [CtaPreset, CtaPreset, CtaPreset, CtaPreset] = [
  {
    label: "AML Policy Redline (< 5 Mins)",
    cta: {
      eyebrow: "COGENT WORKFLOW 02 · AML POLICY REDLINES",
      headline: "Audit and redline your AML/CFT manual in under 5 minutes",
      description:
        "Upload your current policy inside an isolated 7-day Cogent workspace and generate clause-by-clause redlines mapped to active CBN and NFIU circulars.",
      buttonLabel: "Start Free 7-Day Workspace",
      buttonUrl: "/sign-up",
    },
  },
  {
    label: "Lending Pre-Launch Audit (FCCPC + NDPA)",
    cta: {
      eyebrow: "PRE-LAUNCH REGULATORY GUARDRAILS",
      headline: "Launching a lending app or BNPL feature in Nigeria?",
      description:
        "Run an instant FCCPC DEON + NDPA 2023 + ARCON pre-launch compliance audit inside Cogent's free 7-day workspace before writing code or shipping ads.",
      buttonLabel: "Run Pre-Launch Check",
      buttonUrl: "/sign-up",
    },
  },
  {
    label: "Sponsor-Bank DDQ Readiness",
    cta: {
      eyebrow: "DDQ OPERATIONS PLATFORM",
      headline: "Answer 40-question sponsor-bank due diligence audits in hours, not weeks",
      description:
        "Centralize verified evidence, statutory citations, and maker-checker sign-offs in one isolated compliance workspace built for Nigerian fintechs.",
      buttonLabel: "Explore Sponsor-Bank Readiness",
      buttonUrl: "/solutions/payment-licensing-cross-border-africa",
    },
  },
  {
    label: "Cross-Border Expansion OS (NG → KE / GH)",
    cta: {
      eyebrow: "CROSS-BORDER EXPANSION OS",
      headline: "Expanding from Nigeria to Kenya, Ghana, or South Africa?",
      description:
        "Map licensing gates, data localization rules, and regulator obligations side-by-side with live statutory citations before committing legal retainers.",
      buttonLabel: "Start Free 7-Day Workspace",
      buttonUrl: "/sign-up",
    },
  },
];

export interface PlaybookTemplateDefinition {
  pillar: ContentPillar;
  name: string;
  defaultCategory: ResourceCategory;
  defaultPersona: TargetPersona;
  defaultTrack: WorkflowTrack;
  defaultTargetWordCount: number;
  defaultRegulators: string[];
  defaultCta: ResourceMidArticleCta;
  starterFaqs: ResourceFaqItem[];
  bodyMarkdown: string;
}

export const PLAYBOOK_TEMPLATES: Record<ContentPillar, PlaybookTemplateDefinition> = {
  pillar_1_circular: {
    pillar: "pillar_1_circular",
    name: "Pillar 1 · Rapid Regulatory Circular Decoder",
    defaultCategory: "insights",
    defaultPersona: "cco_mlro",
    defaultTrack: "track_a_rapid_48h",
    defaultTargetWordCount: 1800,
    defaultRegulators: ["CBN"],
    defaultCta: CTA_PRESETS[0].cta,
    starterFaqs: [
      {
        question: "Which Nigerian financial institutions must comply with this directive?",
        answer:
          "The directive applies to licensed commercial banks, microfinance banks (MFBs), payment service solution providers (PSSPs), and mobile money operators (MMOs) operating under CBN supervision.",
      },
      {
        question: "What is the compliance deadline and penalty for non-compliance?",
        answer:
          "Institutions must complete implementation before the stated effective date in the circular. Non-compliance exposes institutions to administrative sanctions, daily monetary penalties, or supervisory restrictions under BOFIA 2020.",
      },
      {
        question: "How can compliance teams update internal policies against this circular quickly?",
        answer:
          "Upload your current internal policy into Cogent's isolated workspace to flag outdated clauses automatically and export redlined DOCX/PDF drafts with verified statutory citations in under 5 minutes.",
      },
    ],
    bodyMarkdown: `**Bottom Line Up Front:** On [Issue Date], the [Central Bank of Nigeria (CBN)](https://www.cbn.gov.ng/) issued circular **[CIRCULAR CODE]**, requiring all [PSSPs, MMOs, MFBs, and commercial banks] to [Core Mandate] before **[Deadline Date]**. Non-compliance exposes institutions to [Specific Penalty under BOFIA 2020 / FCCPA / NDPA]. Below is the section-by-section breakdown and the 5-step compliance checklist your team must execute now.

## What Changed Under [Circular Code]?

Summarize the exact scope of the directive, which previous guideline it amends or replaces, and link directly to the primary source on [cbn.gov.ng](https://www.cbn.gov.ng/) or [ndpc.gov.ng](https://ndpc.gov.ng/).

- **Affected License Categories:** Commercial Banks, MFBs, PSSPs, MMOs, Switching & Processing Companies
- **Primary Statutory Authority:** BOFIA 2020 / NDPA 2023 / [Parent Act Section]
- **Effective / Enforcement Date:** [Month Day, Year]

## 5-Step Compliance Checklist for Affected Institutions

1. **Audit Existing SOPs & Manuals:** Cross-reference your current AML/CFT, Data Governance, or Consumer Protection manual against the new thresholds.
2. **Verify Technical & Reporting Controls:** Confirm automated logging, screening, or local hosting controls meet the new SLA.
3. **Update Customer & App Disclosures:** Align onboarding flows, fee schedules, and marketing copy with mandatory disclosure rules.
4. **Document Maker-Checker Sign-Off:** Record Compliance review, Legal sign-off, and Board/EXCO approval for supervisory inspection.
5. **Monitor Addenda & Enforcement Notices:** Track follow-up circulars across [our Regulatory Resources Hub](/resources/insights) and [AML compliance solutions](/solutions/aml-compliance-banks-fintechs-nigeria).

## Penalties for Non-Compliance & Operational Risks

| Requirement Area | Legacy / Manual Approach | New Statutory Standard | Non-Compliance Risk |
| --- | --- | --- | --- |
| Policy Alignment | 4–7 days manual PDF review | Automated clause-level gap analysis | Supervisory audit findings |
| Reporting & SLAs | Ad-hoc spreadsheet tracking | Timestamped escalation & audit trail | Administrative fines / sanctions |
| Product & Ad Clearance | Post-launch remediation | Pre-launch statutory guardrail check | Product suspension or delisting |

{{CTA}}

## How to Automate This Workflow in Under 5 Minutes With Cogent

Instead of manually hunting through unindexed .gov.ng PDFs, compliance and legal teams use [Cogent's Compliance Operating System](/platform) to map circular obligations directly to internal policies, generate export-ready redlines, and prepare sponsor-bank evidence packs. Review our [payment licensing & cross-border playbook](/solutions/payment-licensing-cross-border-africa) or [start a 7-day workspace](/sign-up) to run this check on your own documents.
`,
  },

  pillar_2_jtbd: {
    pillar: "pillar_2_jtbd",
    name: "Pillar 2 · JTBD Workflow Guide",
    defaultCategory: "insights",
    defaultPersona: "cco_mlro",
    defaultTrack: "track_b_evergreen_5d",
    defaultTargetWordCount: 2000,
    defaultRegulators: ["CBN", "NFIU"],
    defaultCta: CTA_PRESETS[0].cta,
    starterFaqs: [
      {
        question: "How long does it normally take to complete this compliance workflow manually?",
        answer:
          "Manually cross-referencing CBN, NFIU, and NDPC PDFs against an 80-page internal manual typically consumes 4 to 7 business days across Compliance, Legal, and external counsel.",
      },
      {
        question: "What primary Nigerian statutes must be referenced during this workflow?",
        answer:
          "Depending on your license tier, teams typically cross-check BOFIA 2020, the Money Laundering (Prevention and Prohibition) Act 2022, CBN AML/CFT/CPF Regulations, and NDPA 2023.",
      },
    ],
    bodyMarkdown: `**Bottom Line Up Front:** Completing [Workflow Name — e.g., updating an 80-page AML/CFT manual or answering a 40-question sponsor-bank DDQ] typically consumes **4 to 7 business days** of back-and-forth between Compliance, Legal, and outside counsel. Most of that bottleneck comes from manually cross-referencing scattered [.gov.ng](https://www.cbn.gov.ng/) and [NFIU](https://www.nfiu.gov.ng/) PDFs against internal SOPs. In this guide, we walk through the exact step-by-step checklist—and show how teams compress the workflow into under 5 minutes.

## Why Traditional Manual Compliance Workflows Stall

- Buried, unindexed PDF circulars across multiple regulatory portals
- Conflicting or superseded thresholds still sitting inside legacy Word manuals
- Slow external counsel turnaround for routine clause checks and redlines

## Step-by-Step Operational Checklist

1. **Scope Your License & Active Statutory Baseline:** Confirm which CBN, SEC, FCCPC, or NDPC instruments apply to your exact license tier.
2. **Audit High-Risk Clauses First:** Prioritize transaction monitoring SLAs, sanctions/PEP screening, STR escalation windows, and data governance rules.
3. **Prepare Verifiable Evidence Artifacts:** Link each policy clause to signed controls, audit logs, and board resolutions.
4. **Run Maker-Checker Sign-Off:** Separate drafting from CCO/GC approval before exporting the final pack.

## Manual Process (5–7 Days) vs. Cogent Automated Workflow (< 5 Mins)

| Workflow Step | Traditional Manual Process (5–7 Days) | Cogent Automated Workflow (< 5 Mins) |
| --- | --- | --- |
| Circular Discovery | Manually searching buried PDFs across CBN & NFIU portals | Live tracking across active Nigerian & African statutory vaults |
| Gap Analysis | Ctrl+F searching an 80-page Word document line-by-line | Upload once; Cogent flags outdated clauses automatically |
| Deliverable Output | Emailing redlined Word versions back and forth | Export-ready DOCX/PDF redlines with clickable statutory citations |

{{CTA}}

## Related Playbooks & Next Steps

Explore our [AML compliance solutions for Nigerian banks and fintechs](/solutions/aml-compliance-banks-fintechs-nigeria), review our [digital lending compliance hub](/solutions/digital-lending-fccpc-compliance), or browse [all Cogent Resources](/resources/insights). Ready to test it on your own SOPs? [Create a free 7-day workspace](/sign-up).
`,
  },

  pillar_3_license: {
    pillar: "pillar_3_license",
    name: "Pillar 3 · License-Specific Solution Guide",
    defaultCategory: "insights",
    defaultPersona: "founder_product",
    defaultTrack: "track_b_evergreen_5d",
    defaultTargetWordCount: 2000,
    defaultRegulators: ["CBN", "FCCPC", "NDPC"],
    defaultCta: CTA_PRESETS[1].cta,
    starterFaqs: [
      {
        question: "Which regulators oversee this license category in Nigeria?",
        answer:
          "Depending on product scope, institutions typically navigate CBN prudential/payment guidelines, NDPC data protection audits under NDPA 2023, FCCPC consumer protection rules, and ARCON ad vetting.",
      },
      {
        question: "Can a fintech launch before completing full compliance documentation?",
        answer:
          "No. Sponsor banks, payment processors, and app stores require complete AML/CFT policies, NDPA privacy notices, and regulator registrations before approving go-live.",
      },
    ],
    bodyMarkdown: `**Bottom Line Up Front:** Operating or launching as a **[License Type — e.g., PSSP, MMO, MFB, or Digital Lender]** in Nigeria requires simultaneous compliance across [CBN](https://www.cbn.gov.ng/), [NDPC](https://ndpc.gov.ng/), and [FCCPC](https://fccpc.gov.ng/). Missing a single disclosure, capital requirement, or reporting SLA can stall sponsor-bank onboarding or trigger enforcement. Use this license-specific compliance matrix to structure your operations right the first time.

## Regulatory Scope & Mandatory Prerequisites

Detail capital requirements, CAC incorporation prerequisites, CBN/SEC/FCCPC license filings, and ongoing reporting obligations for this license category.

## Core Compliance Pillars for [License Type]

| Compliance Domain | Governing Authority | Mandatory Artifact / Control | Inspection Frequency |
| --- | --- | --- | --- |
| Licensing & Governance | CBN / BOFIA 2020 | Board charter, approved organogram, fit & proper filings | Annual / On change |
| AML / CFT / CPF | CBN & NFIU | Automated transaction monitoring, STR/CTR reporting, pKYC | Continuous |
| Data Protection | NDPC (NDPA 2023) | Privacy notice, DPIA, data localization & lawful basis audit | Annual NDPC audit |
| Consumer & Ad Vetting | FCCPC & ARCON | Transparent APR/fee disclosures, pre-vetted ad copy | Pre-launch |

{{CTA}}

## Pre-Launch Operational Readiness Checklist

1. Lock in approved product terms, interest/fee ceilings, and complaint resolution SLAs (48–72 hours).
2. Validate all marketing copy and app-store screenshots before launch against FCCPC and ARCON guidelines.
3. Assemble your sponsor-bank due diligence pack inside [Cogent](/platform).
4. See how teams handle [digital lending compliance](/solutions/digital-lending-fccpc-compliance), [payment licensing](/solutions/payment-licensing-cross-border-africa), and [pricing plans](/pricing).
`,
  },

  pillar_4_comparison: {
    pillar: "pillar_4_comparison",
    name: "Pillar 4 · Category Comparison & ROI Teardown",
    defaultCategory: "insights",
    defaultPersona: "general_counsel",
    defaultTrack: "track_b_evergreen_5d",
    defaultTargetWordCount: 1600,
    defaultRegulators: ["CBN", "SEC", "NDPC"],
    defaultCta: CTA_PRESETS[2].cta,
    starterFaqs: [
      {
        question: "Does Cogent replace our external law firm or General Counsel?",
        answer:
          "No. Cogent eliminates the 80% repetitive research, circular tracking, first-draft policy redlining, and DDQ assembly so your General Counsel and external lawyers focus exclusively on high-stakes legal strategy and regulator negotiation.",
      },
      {
        question: "How does Cogent differ from KYC/identity verification APIs?",
        answer:
          "KYC APIs verify individual customer identities (BVN, NIN, liveness). Cogent is your regulatory compliance operating system—tracking CBN/SEC/NDPC/FCCPC rules, redlining policies, clearing product launches, and running sponsor-bank DDQs.",
      },
    ],
    bodyMarkdown: `**Bottom Line Up Front:** Financial institutions in Nigeria often debate whether to manage regulatory compliance through **[Alternative — e.g., Traditional Law Firm Retainers / Spreadsheets / KYC APIs]** or adopt a dedicated **Compliance Operating System**. Here is an objective, side-by-side breakdown of turnaround speed, statutory coverage across [CBN](https://www.cbn.gov.ng/) and [SEC](https://sec.gov.ng/), total cost of ownership, and when to use each.

## Head-to-Head Operational Comparison

| Evaluation Dimension | Traditional Approach (Law Firm / Spreadsheets) | Cogent Compliance Operating System |
| --- | --- | --- |
| Turnaround Time | 3–10 business days per memo or policy redline | Under 5 minutes with clickable statutory citations |
| Regulatory Coverage | Manual ad-hoc lookup when issues arise | Continuous Nigerian & African statutory vault + live alerts |
| Sponsor-Bank DDQs | Copy-pasting old spreadsheets & email threads | Central Evidence Vault + Approved Q&A Library |
| Governance & Privacy | Unstructured Word attachments over email | Isolated workspace with 3-Lines Maker-Checker sign-offs |
| Cost Structure | High hourly retainers for routine checks | Predictable SaaS plan ([view pricing](/pricing)) |

## Where Traditional Counsel Still Wins (And How Teams Combine Both)

Be transparent and credible: high-stakes license negotiations, litigation defense, and novel regulatory sandbox petitions still belong with specialist external counsel. Cogent compresses the 80% preparatory legwork before counsel ever opens the file.

{{CTA}}

## Total Cost & Speed-to-Launch Impact

- **Faster Product Launches:** Clear USD virtual cards, BNPL, and cross-border features days faster.
- **Audit-Ready Evidence:** Maintain cryptographic audit trails for CBN, NDPC, and sponsor-bank reviews.
- Explore [Cogent's Platform](/platform), [AML solutions](/solutions/aml-compliance-banks-fintechs-nigeria), or [start a free 7-day workspace](/sign-up).
`,
  },
};

export interface AtomizeInput {
  title: string;
  excerpt: string;
  bodyMarkdown: string;
  category: ResourceCategory;
  slug: string;
  circularCode?: string | null;
  regulators?: string[];
  targetPersona?: TargetPersona | null;
  primaryKeyword?: string | null;
}

/**
 * Deterministic 1-to-7 Playbook Atomization generator (works instantly offline or as Gemini fallback).
 * Always links to the canonical `/resources/[category]/[slug]` URL.
 */
export function buildDeterministicAtomizationKit(
  input: AtomizeInput,
  siteUrl: string = "https://stem-cogent.com",
): ResourceAtomizationKit {
  const cleanSite = siteUrl.replace(/\/+$/, "");
  const canonicalUrl = `${cleanSite}/resources/${input.category}/${input.slug || "guide"}`;
  const headings = extractMarkdownHeadings(input.bodyMarkdown)
    .filter((h) => h.level === 2)
    .map((h) => h.text)
    .slice(0, 4);
  const regulatorsLabel =
    input.regulators && input.regulators.length > 0 ? input.regulators.join(" / ") : "CBN / NDPC / FCCPC";
  const circularLabel = input.circularCode ? ` (${input.circularCode})` : "";
  const summary = input.excerpt.trim() || `Complete section-by-section breakdown of ${input.title}.`;

  const bulletTakeaways =
    headings.length > 0
      ? headings.map((h, i) => `${i + 1}. ${h}`).join("\n")
      : `1. Scope & affected institutions under ${regulatorsLabel}\n2. Step-by-step operational compliance checklist\n3. Manual bottleneck vs. Cogent 5-minute workflow`;

  const linkedinCarousel = [
    `SLIDE 1 (Cover Hook):\n${input.title}${circularLabel}\nWhat Nigerian & African fintech compliance teams must update now.`,
    `SLIDE 2 (The Bottleneck):\nMost compliance teams spend 4–7 days manually hunting through unindexed .gov.ng PDFs and cross-checking legacy SOPs.`,
    `SLIDE 3 (Key Rule #1):\n${headings[0] || `Scope & Statutory Obligations (${regulatorsLabel})`}\n${summary}`,
    `SLIDE 4 (Key Rule #2):\n${headings[1] || "Actionable Compliance Checklist"}\nVerify internal policies, reporting SLAs, and mandatory customer disclosures before inspection.`,
    `SLIDE 5 (Manual vs. Cogent):\nManual: 5–7 days of PDF hunting & Word redlines.\nCogent: Upload your policy once → clause-by-clause redlines with verified citations in < 5 minutes.`,
    `SLIDE 6 (CTA):\nRead the full breakdown & checklist (link in first comment):\n${canonicalUrl}\nOr run this check on your own SOPs in a free 7-day Cogent workspace.`,
  ].join("\n\n---\n\n");

  const founderLinkedinPost = [
    `Most fintech compliance delays in Nigeria don't happen because teams ignore the rules.`,
    `They happen because turning ${regulatorsLabel} directives${circularLabel} into updated internal SOPs still takes 4 to 7 days manually.`,
    `We just broke down "${input.title}" step by step:`,
    bulletTakeaways
      .split("\n")
      .map((line) => `→ ${line.replace(/^\d+\.\s*/, "")}`)
      .join("\n"),
    `${summary}`,
    `Full checklist & statutory citations are live on stem-cogent.com — link in the comments ↓ (or test it against your current policies inside a free 7-day Cogent workspace).`,
    `\n[First Comment Link]: ${canonicalUrl}`,
  ].join("\n\n");

  const twitterThread = [
    `1/5 🚨 ${regulatorsLabel} Compliance Breakdown${circularLabel}: ${input.title}\n\n${summary}\n\nHere's what affected fintechs, banks, and compliance teams need to execute now 🧵👇`,
    `2/5 Key focus area #1: ${headings[0] || "Who is affected & core statutory obligations"}\n\nDon't wait for a sponsor-bank audit or supervisory inspection to catch outdated clauses.`,
    `3/5 Key focus area #2: ${headings[1] || "Operational checklist & required controls"}\n\nMap every requirement directly to your AML/CFT manual, privacy notice, and product disclosures.`,
    `4/5 Why teams lose 5+ days here: manually reading unindexed .gov.ng PDFs and redlining 80-page Word manuals by hand.\n\nWith Cogent, you generate citation-backed redlines in under 5 minutes.`,
    `5/5 Read the full section-by-section checklist, penalty table & FAQs on @stem_cogent:\n${canonicalUrl}`,
  ].join("\n\n");

  const newsletterBrief = [
    `SUBJECT: The Weekly Regulatory Brief: ${input.title}`,
    `EXECUTIVE SUMMARY:\n${summary}`,
    `WHAT YOUR TEAM NEEDS TO DO THIS WEEK:\n${bulletTakeaways}`,
    `CTA BUTTON: Read Full Breakdown & Checklist → ${canonicalUrl}\nSECONDARY CTA: Run this check against your own policies in a free 7-day Cogent workspace → ${cleanSite}/sign-up`,
  ].join("\n\n");

  const salesBattlecard = [
    `SUBJECT: Quick question on [Company Name]'s ${regulatorsLabel} compliance workflow`,
    `Hi [First Name],`,
    `With the active compliance requirements around ${input.title}${circularLabel}, several compliance and legal leads we speak with are spending days manually mapping ${regulatorsLabel} directives against their internal manuals and sponsor-bank questionnaires.`,
    `We just published a concise breakdown of the exact statutory requirements and operational checklist here: ${canonicalUrl}`,
    `If you'd like to see how Cogent automatically flags outdated clauses in your existing policies and generates citation-backed redlines in under 5 minutes (inside an isolated workspace), I'd be happy to set up a free 7-day evaluation account for your team. Worth a quick look?`,
  ].join("\n\n");

  return {
    linkedinCarousel,
    founderLinkedinPost,
    twitterThread,
    newsletterBrief,
    salesBattlecard,
    gscIndexedAt: null,
    internalLinksUpdated: false,
    completedChannels: ["website"],
  };
}
