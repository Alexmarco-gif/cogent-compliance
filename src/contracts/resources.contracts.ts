/**
 * Cogent Resources Hub - Contracts, Validation, Playbook Metadata & Embed Normalization
 * Categories: Insights & News | Videos | Reports | Events
 * Canonical URLs: /resources/[category]/[slug] (system source of truth)
 */

import { z } from "zod";

export const RESOURCE_CATEGORIES = ["insights", "videos", "reports", "events"] as const;
export type ResourceCategory = (typeof RESOURCE_CATEGORIES)[number];

export const RESOURCE_STATUSES = ["draft", "published"] as const;
export type ResourceStatus = (typeof RESOURCE_STATUSES)[number];

export const WORKFLOW_STAGES = ["idea", "brief", "draft", "sme_review", "published"] as const;
export type WorkflowStage = (typeof WORKFLOW_STAGES)[number];

export const CONTENT_PILLARS = [
  "pillar_1_circular",
  "pillar_2_jtbd",
  "pillar_3_license",
  "pillar_4_comparison",
] as const;
export type ContentPillar = (typeof CONTENT_PILLARS)[number];

export const TARGET_PERSONAS = ["cco_mlro", "general_counsel", "founder_product"] as const;
export type TargetPersona = (typeof TARGET_PERSONAS)[number];

export const WORKFLOW_TRACKS = ["track_a_rapid_48h", "track_b_evergreen_5d"] as const;
export type WorkflowTrack = (typeof WORKFLOW_TRACKS)[number];

export const WORKFLOW_STAGE_META: Record<
  WorkflowStage,
  { label: string; shortLabel: string; badgeClass: string }
> = {
  idea: {
    label: "1. Idea / Pitch",
    shortLabel: "Idea",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
  },
  brief: {
    label: "2. Research Brief",
    shortLabel: "Brief",
    badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  draft: {
    label: "3. Drafting",
    shortLabel: "Draft",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
  },
  sme_review: {
    label: "4. SME & SEO Review",
    shortLabel: "SME Review",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
  },
  published: {
    label: "5. Published Live",
    shortLabel: "Published",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
};

export const CONTENT_PILLAR_META: Record<
  ContentPillar,
  {
    code: string;
    label: string;
    shortLabel: string;
    targetPercent: number;
    funnelStage: string;
    description: string;
  }
> = {
  pillar_1_circular: {
    code: "Pillar 1",
    label: "Rapid Regulatory Breakdowns & Circular Decoders",
    shortLabel: "Circular Decoder",
    targetPercent: 40,
    funnelStage: "Top / Mid Funnel",
    description:
      "Capture urgent search spikes when CBN, SEC, NDPC, FCCPC, NFIU, or ARCON issues a directive.",
  },
  pillar_2_jtbd: {
    code: "Pillar 2",
    label: "Jobs-to-Be-Done (JTBD) Workflow Guides",
    shortLabel: "JTBD Guide",
    targetPercent: 30,
    funnelStage: "Mid / Bottom Funnel",
    description:
      "Operational guides showing manual compliance workflows vs. automated Cogent execution.",
  },
  pillar_3_license: {
    code: "Pillar 3",
    label: "License-Specific & Use-Case Solutions",
    shortLabel: "License Solution",
    targetPercent: 20,
    funnelStage: "Bottom Funnel",
    description:
      "Commercial deep dives tailored to MFBs, PSSPs, MMOs, Digital Lenders, and Banks.",
  },
  pillar_4_comparison: {
    code: "Pillar 4",
    label: "Category Comparisons & ROI Teardowns",
    shortLabel: "Comparison & ROI",
    targetPercent: 10,
    funnelStage: "Bottom Funnel",
    description:
      "Decision-stage comparisons: Cogent vs. law firm retainers, KYC APIs, or manual tracking.",
  },
};

export const TARGET_PERSONA_META: Record<
  TargetPersona,
  { label: string; shortLabel: string; role: string; hookAngle: string }
> = {
  cco_mlro: {
    label: "Chief Compliance Officer (CCO) / MLRO",
    shortLabel: "CCO / MLRO",
    role: "Economic Buyer",
    hookAngle: "Audit readiness, zero missed circulars, clause-by-clause redlines in under 5 minutes.",
  },
  general_counsel: {
    label: "General Counsel (GC) / Legal Lead",
    shortLabel: "General Counsel",
    role: "Technical Approver",
    hookAngle: "Verified statutory citations, maker-checker governance, isolated workspace privacy.",
  },
  founder_product: {
    label: "Fintech Founder / Head of Product",
    shortLabel: "Founder / Product",
    role: "Champion / Speed",
    hookAngle: "Ship products in days instead of weeks; instant regulatory guardrails before launch.",
  },
};

export const WORKFLOW_TRACK_META: Record<
  WorkflowTrack,
  { label: string; shortLabel: string; turnaround: string }
> = {
  track_a_rapid_48h: {
    label: "Track A: Rapid Newsjack (24–48 hr)",
    shortLabel: "48h Rapid",
    turnaround: "24–48 hours",
  },
  track_b_evergreen_5d: {
    label: "Track B: Evergreen Pillar Guide (5-Day)",
    shortLabel: "5-Day Deep",
    turnaround: "5 business days",
  },
};

export const RESOURCE_CATEGORY_META: Record<
  ResourceCategory,
  {
    label: string;
    shortLabel: string;
    tagline: string;
    description: string;
    seoTitle: string;
    seoDescription: string;
  }
> = {
  insights: {
    label: "Insights & News",
    shortLabel: "Insights",
    tagline: "CBN · SEC · NDPC · FCCPC",
    description:
      "Regulatory breakdowns, compliance playbooks, and editorial commentary for Nigerian and African financial institutions.",
    seoTitle: "Insights & News | Nigerian & African Fintech Compliance Blog",
    seoDescription:
      "Read Cogent's regulatory breakdowns, CBN and SEC circular analyses, and compliance operating playbooks for fintechs and banks.",
  },
  videos: {
    label: "Videos",
    shortLabel: "Videos",
    tagline: "Walkthroughs · Explainers",
    description:
      "Product walkthroughs, circular briefings, and compliance architecture explainers.",
    seoTitle: "Videos | Cogent Regulatory Briefings & Walkthroughs",
    seoDescription:
      "Watch concise video briefings on CBN AML updates, FCCPC lending rules, sponsor-bank audits, and Cogent workflows.",
  },
  reports: {
    label: "Reports",
    shortLabel: "Reports",
    tagline: "PDF Briefs · Checklists",
    description:
      "Downloadable statutory checklists, benchmark briefs, and sponsor-bank readiness templates.",
    seoTitle: "Reports & Compliance Checklists | Cogent",
    seoDescription:
      "Download practical compliance checklists, regulatory benchmark reports, and policy templates for Nigerian and African fintechs.",
  },
  events: {
    label: "Events",
    shortLabel: "Events",
    tagline: "Webinars · Roundtables",
    description:
      "Upcoming compliance briefings, executive roundtables, and on-demand session recaps.",
    seoTitle: "Events & Webinars | Cogent Regulatory Roundtables",
    seoDescription:
      "Register for upcoming Cogent compliance webinars and executive roundtables or catch up on past session recordings.",
  },
};

export function isResourceCategory(value: string): value is ResourceCategory {
  return (RESOURCE_CATEGORIES as readonly string[]).includes(value);
}

/**
 * Validates safe external HTTPS/HTTP URLs, same-origin internal site paths
 * (e.g., `/solutions`, `/resources/insights/...`, `/sign-up`, `/pricing`, `#anchor`),
 * or internal `/api/marketing-shield/v1/resources/media/...` paths.
 * Strictly rejects `javascript:`, `data:`, `vbscript:`, protocol-relative `//`, and `..` traversal.
 */
export function isSafeResourceUrl(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return true;
  if (trimmed.includes("..") || trimmed.includes("\\")) return false;
  if (trimmed.startsWith("#")) {
    return /^#[a-zA-Z0-9_-]+$/.test(trimmed);
  }
  if (trimmed.startsWith("/")) {
    // Reject protocol-relative URLs like `//evil.com`
    if (trimmed.startsWith("//")) return false;
    return !/[\s<>"'`]/.test(trimmed);
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

const OptionalSafeUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .refine(isSafeResourceUrl, {
    message: "URL must be a valid http(s) link or internal site path (e.g., /solutions)",
  })
  .optional()
  .nullable()
  .transform((val) => {
    if (!val) return null;
    const trimmed = val.trim();
    return trimmed.length > 0 ? trimmed : null;
  });

const OptionalTrimmedStringSchema = (maxLen: number) =>
  z
    .string()
    .trim()
    .max(maxLen)
    .optional()
    .nullable()
    .transform((val) => {
      if (!val) return null;
      const trimmed = val.trim();
      return trimmed.length > 0 ? trimmed : null;
    });

const OptionalIsoDateSchema = (label: string) =>
  z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((val) => (val && val.trim().length > 0 ? val.trim() : null))
    .refine((val) => !val || !Number.isNaN(Date.parse(val)), {
      message: `${label} must be a valid ISO date/time`,
    });

export const ResourceAuthoritativeSourceSchema = z.object({
  title: z.string().trim().min(2).max(240),
  code: z.string().trim().max(120).optional().nullable(),
  url: OptionalSafeUrlSchema,
});
export type ResourceAuthoritativeSource = z.infer<typeof ResourceAuthoritativeSourceSchema>;

export const ResourceFaqItemSchema = z.object({
  question: z.string().trim().min(5, "FAQ question must be at least 5 characters").max(300),
  answer: z.string().trim().min(10, "FAQ answer must be at least 10 characters").max(1600),
});
export type ResourceFaqItem = z.infer<typeof ResourceFaqItemSchema>;

export const ResourceMidArticleCtaSchema = z.object({
  eyebrow: z.string().trim().max(80).optional().nullable(),
  headline: z.string().trim().min(3).max(180),
  description: z.string().trim().max(400).default(""),
  buttonLabel: z.string().trim().min(2).max(80).default("Start Free 7-Day Workspace"),
  buttonUrl: z
    .string()
    .trim()
    .min(1)
    .max(512)
    .refine(isSafeResourceUrl, { message: "CTA URL must be a valid internal path or http(s) URL" })
    .default("/sign-up"),
});
export type ResourceMidArticleCta = z.infer<typeof ResourceMidArticleCtaSchema>;

export const ResourceQaChecklistSchema = z.object({
  statutoryAccuracyVerified: z.boolean().default(false),
  repealedRuleChecked: z.boolean().default(false),
  reviewerName: OptionalTrimmedStringSchema(120),
  reviewedAt: OptionalIsoDateSchema("Review timestamp"),
});
export type ResourceQaChecklist = z.infer<typeof ResourceQaChecklistSchema>;

export const ATOMIZATION_CHANNEL_IDS = [
  "website",
  "linkedin_company",
  "linkedin_founder",
  "twitter",
  "newsletter",
  "sales",
  "gsc",
] as const;
export type AtomizationChannelId = (typeof ATOMIZATION_CHANNEL_IDS)[number];

export const ResourceAtomizationKitSchema = z.object({
  linkedinCarousel: OptionalTrimmedStringSchema(10_000),
  founderLinkedinPost: OptionalTrimmedStringSchema(5_000),
  twitterThread: OptionalTrimmedStringSchema(5_000),
  newsletterBrief: OptionalTrimmedStringSchema(5_000),
  salesBattlecard: OptionalTrimmedStringSchema(5_000),
  gscIndexedAt: OptionalIsoDateSchema("GSC indexed date"),
  internalLinksUpdated: z.boolean().default(false),
  completedChannels: z.array(z.enum(ATOMIZATION_CHANNEL_IDS)).max(7).default([]),
});
export type ResourceAtomizationKit = z.infer<typeof ResourceAtomizationKitSchema>;

export const SlugSchema = z
  .string()
  .trim()
  .min(2, "Slug must be at least 2 characters")
  .max(140, "Slug must be at most 140 characters")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: "Slug must contain only lowercase letters, numbers, and hyphens",
  });

export const CreateResourcePostSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(220),
  slug: SlugSchema.optional(),
  category: z.enum(RESOURCE_CATEGORIES),
  status: z.enum(RESOURCE_STATUSES).default("draft"),
  workflowStage: z.enum(WORKFLOW_STAGES).optional(),
  excerpt: z.string().trim().max(600).default(""),
  bodyMarkdown: z.string().max(250_000).default(""),
  coverImageUrl: OptionalSafeUrlSchema,
  authorName: z.string().trim().min(1).max(120).default("Cogent Editorial"),
  authorRole: OptionalTrimmedStringSchema(120),
  tags: z.array(z.string().trim().min(1).max(48)).max(12).default([]),
  featured: z.boolean().default(false),
  readingTimeMinutes: z.number().int().min(1).max(180).optional().nullable(),

  // Video fields
  videoEmbedUrl: OptionalSafeUrlSchema,
  videoDuration: OptionalTrimmedStringSchema(32),

  // Report fields
  reportFileUrl: OptionalSafeUrlSchema,
  reportFileLabel: OptionalTrimmedStringSchema(64),

  // Event fields
  eventStartsAt: OptionalIsoDateSchema("Event date"),
  eventLocation: OptionalTrimmedStringSchema(160),
  eventRegistrationUrl: OptionalSafeUrlSchema,

  // SEO & publish date
  seoTitle: OptionalTrimmedStringSchema(160),
  seoDescription: OptionalTrimmedStringSchema(320),
  publishedAt: OptionalIsoDateSchema("Publish date"),

  // Playbook Strategy & Priority (Part 1 + Phase 1)
  contentPillar: z.enum(CONTENT_PILLARS).optional().nullable(),
  targetPersona: z.enum(TARGET_PERSONAS).optional().nullable(),
  workflowTrack: z.enum(WORKFLOW_TRACKS).optional().nullable(),
  primaryKeyword: OptionalTrimmedStringSchema(160),
  secondaryKeywords: z.array(z.string().trim().min(1).max(120)).max(12).default([]),
  priorityUrgency: z.number().int().min(1).max(5).optional().nullable(),
  priorityCommercial: z.number().int().min(1).max(5).optional().nullable(),
  priorityWinnability: z.number().int().min(1).max(5).optional().nullable(),

  // Research Brief & Regulatory Snapshot (Phases 2 & 3)
  targetWordCount: z.number().int().min(200).max(15000).optional().nullable(),
  serpGapNotes: OptionalTrimmedStringSchema(2000),
  productTieIn: OptionalTrimmedStringSchema(1000),
  circularCode: OptionalTrimmedStringSchema(140),
  regulators: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
  effectiveDate: OptionalIsoDateSchema("Effective date"),
  authoritativeSources: z.array(ResourceAuthoritativeSourceSchema).max(15).default([]),
  updateCalloutNote: OptionalTrimmedStringSchema(500),

  // Phase 4: FAQPage JSON-LD, Mid-Article CTA, Legal Disclaimer & Maker-Checker QA
  faqItems: z.array(ResourceFaqItemSchema).max(15).default([]),
  midArticleCta: ResourceMidArticleCtaSchema.optional().nullable(),
  showLegalDisclaimer: z.boolean().default(true),
  qaChecklist: ResourceQaChecklistSchema.optional().default({
    statutoryAccuracyVerified: false,
    repealedRuleChecked: false,
    reviewerName: null,
    reviewedAt: null,
  }),

  // Phases 5 & 6: 1-to-7 Atomization & 30-Day Freshness Refresh
  atomizationKit: ResourceAtomizationKitSchema.optional().default({
    linkedinCarousel: null,
    founderLinkedinPost: null,
    twitterThread: null,
    newsletterBrief: null,
    salesBattlecard: null,
    gscIndexedAt: null,
    internalLinksUpdated: false,
    completedChannels: [],
  }),
  lastStatutoryAuditAt: OptionalIsoDateSchema("Last statutory audit date"),
  refreshDueAt: OptionalIsoDateSchema("Refresh due date"),
});

export const UpdateResourcePostSchema = CreateResourcePostSchema.partial();

export type CreateResourcePostInput = z.infer<typeof CreateResourcePostSchema>;
export type UpdateResourcePostInput = z.infer<typeof UpdateResourcePostSchema>;

export interface ResourcePost {
  id: string;
  slug: string;
  category: ResourceCategory;
  status: ResourceStatus;
  workflowStage: WorkflowStage;
  title: string;
  excerpt: string;
  bodyMarkdown: string;
  coverImageUrl: string | null;
  authorName: string;
  authorRole: string | null;
  tags: string[];
  featured: boolean;
  readingTimeMinutes: number | null;
  videoEmbedUrl: string | null;
  videoDuration: string | null;
  reportFileUrl: string | null;
  reportFileLabel: string | null;
  eventStartsAt: string | null;
  eventLocation: string | null;
  eventRegistrationUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;

  // Playbook Strategy & Operations
  contentPillar: ContentPillar | null;
  targetPersona: TargetPersona | null;
  workflowTrack: WorkflowTrack | null;
  primaryKeyword: string | null;
  secondaryKeywords: string[];
  priorityUrgency: number | null;
  priorityCommercial: number | null;
  priorityWinnability: number | null;
  targetWordCount: number | null;
  serpGapNotes: string | null;
  productTieIn: string | null;
  circularCode: string | null;
  regulators: string[];
  effectiveDate: string | null;
  authoritativeSources: ResourceAuthoritativeSource[];
  updateCalloutNote: string | null;
  faqItems: ResourceFaqItem[];
  midArticleCta: ResourceMidArticleCta | null;
  showLegalDisclaimer: boolean;
  qaChecklist: ResourceQaChecklist;
  atomizationKit: ResourceAtomizationKit;
  lastStatutoryAuditAt: string | null;
  refreshDueAt: string | null;
}

export function slugifyTitle(title: string): string {
  const base = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
  return base.length >= 2 ? base : `post-${Date.now()}`;
}

export function estimateReadingTimeMinutes(markdown: string): number {
  const plain = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#*_`>\[\]()!-]/g, " ")
    .trim();
  if (!plain) return 1;
  const wordCount = plain.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / 210));
}

export interface NormalizedVideoSource {
  kind: "iframe" | "video" | "external";
  embedUrl: string;
  originalUrl: string;
  providerLabel: string;
}

/**
 * Converts common YouTube, Vimeo, Loom, Google Drive, or direct MP4/WebM links
 * into safe embeddable player metadata.
 */
export function normalizeVideoSource(rawUrl: string): NormalizedVideoSource {
  const originalUrl = rawUrl.trim();
  if (!isSafeResourceUrl(originalUrl) || !originalUrl) {
    return {
      kind: "external",
      embedUrl: "",
      originalUrl,
      providerLabel: "External Video",
    };
  }

  try {
    const u = new URL(originalUrl);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();

    // Direct video files (R2, CDN, pCloud direct stream)
    if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(u.pathname)) {
      return {
        kind: "video",
        embedUrl: originalUrl,
        originalUrl,
        providerLabel: "Direct Video",
      };
    }

    // YouTube watch / shorts / live / embed / youtu.be
    if (host === "youtu.be") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      if (id) {
        return {
          kind: "iframe",
          embedUrl: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`,
          originalUrl,
          providerLabel: "YouTube",
        };
      }
    }

    if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
      const watchId = u.searchParams.get("v");
      if (watchId) {
        return {
          kind: "iframe",
          embedUrl: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(watchId)}`,
          originalUrl,
          providerLabel: "YouTube",
        };
      }
      const parts = u.pathname.split("/").filter(Boolean);
      if ((parts[0] === "embed" || parts[0] === "shorts" || parts[0] === "live") && parts[1]) {
        return {
          kind: "iframe",
          embedUrl: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(parts[1])}`,
          originalUrl,
          providerLabel: "YouTube",
        };
      }
    }

    // Vimeo
    if (host === "vimeo.com" || host === "player.vimeo.com") {
      const parts = u.pathname.split("/").filter(Boolean);
      const id = parts[parts.length - 1];
      if (id && /^\d+$/.test(id)) {
        return {
          kind: "iframe",
          embedUrl: `https://player.vimeo.com/video/${id}`,
          originalUrl,
          providerLabel: "Vimeo",
        };
      }
    }

    // Loom
    if (host === "loom.com") {
      const parts = u.pathname.split("/").filter(Boolean);
      if ((parts[0] === "share" || parts[0] === "embed") && parts[1]) {
        return {
          kind: "iframe",
          embedUrl: `https://www.loom.com/embed/${encodeURIComponent(parts[1])}`,
          originalUrl,
          providerLabel: "Loom",
        };
      }
    }

    // Google Drive file preview
    if (host === "drive.google.com") {
      const match = u.pathname.match(/\/file\/d\/([^/]+)/);
      if (match?.[1]) {
        return {
          kind: "iframe",
          embedUrl: `https://drive.google.com/file/d/${encodeURIComponent(match[1])}/preview`,
          originalUrl,
          providerLabel: "Google Drive",
        };
      }
    }

    // pCloud or generic external share link
    if (host.endsWith("pcloud.link") || host.endsWith("pcloud.com")) {
      return {
        kind: "external",
        embedUrl: originalUrl,
        originalUrl,
        providerLabel: "pCloud",
      };
    }

    return {
      kind: "external",
      embedUrl: originalUrl,
      originalUrl,
      providerLabel: host,
    };
  } catch {
    return {
      kind: "external",
      embedUrl: originalUrl,
      originalUrl,
      providerLabel: "External Video",
    };
  }
}
