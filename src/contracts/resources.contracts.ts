/**
 * Cogent Resources Hub - Contracts, Validation & Embed Normalization
 * Categories: Insights & News | Videos | Reports | Events
 */

import { z } from "zod";

export const RESOURCE_CATEGORIES = ["insights", "videos", "reports", "events"] as const;
export type ResourceCategory = (typeof RESOURCE_CATEGORIES)[number];

export const RESOURCE_STATUSES = ["draft", "published"] as const;
export type ResourceStatus = (typeof RESOURCE_STATUSES)[number];

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
 * Validates safe external HTTPS/HTTP URLs or internal `/api/marketing-shield/v1/resources/media/...` paths.
 * Rejects `javascript:`, `data:`, `vbscript:`, etc.
 */
export function isSafeResourceUrl(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return true;
  if (trimmed.startsWith("/api/marketing-shield/v1/resources/media/")) {
    return !trimmed.includes("..");
  }
  if (trimmed.startsWith("/images/")) {
    return !trimmed.includes("..");
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
    message: "URL must be a valid http(s) link or uploaded resource media path",
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
  eventStartsAt: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((val) => (val && val.trim().length > 0 ? val.trim() : null))
    .refine((val) => !val || !Number.isNaN(Date.parse(val)), {
      message: "Event date must be a valid ISO date/time",
    }),
  eventLocation: OptionalTrimmedStringSchema(160),
  eventRegistrationUrl: OptionalSafeUrlSchema,

  // SEO & publish date
  seoTitle: OptionalTrimmedStringSchema(160),
  seoDescription: OptionalTrimmedStringSchema(320),
  publishedAt: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((val) => (val && val.trim().length > 0 ? val.trim() : null))
    .refine((val) => !val || !Number.isNaN(Date.parse(val)), {
      message: "Publish date must be a valid ISO date/time",
    }),
});

export const UpdateResourcePostSchema = CreateResourcePostSchema.partial();

export type CreateResourcePostInput = z.infer<typeof CreateResourcePostSchema>;
export type UpdateResourcePostInput = z.infer<typeof UpdateResourcePostSchema>;

export interface ResourcePost {
  id: string;
  slug: string;
  category: ResourceCategory;
  status: ResourceStatus;
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
