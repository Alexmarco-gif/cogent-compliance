/**
 * Cogent Resources Hub - Neon Postgres Repository & Service Layer
 * Zero Supabase DB usage; gracefully degrades to empty reads if NEON_RESOURCES_DATABASE_URL is not configured yet.
 * Auto-ensures Playbook Ops columns (002_resources_playbook_ops.sql) idempotently once per runtime.
 */

import {
  type ContentPillar,
  type CreateResourcePostInput,
  type ResourceAtomizationKit,
  type ResourceAuthoritativeSource,
  type ResourceCategory,
  type ResourceFaqItem,
  type ResourceMidArticleCta,
  type ResourcePost,
  type ResourceQaChecklist,
  type ResourceStatus,
  type TargetPersona,
  type UpdateResourcePostInput,
  type WorkflowStage,
  type WorkflowTrack,
  estimateReadingTimeMinutes,
  slugifyTitle,
} from "@/contracts/resources.contracts";
import { getNeonResourcesSql, isNeonResourcesConfigured } from "@/lib/neon";
import { logger } from "@/lib/logger";

type ResourcePostRow = {
  id: string;
  slug: string;
  category: ResourceCategory;
  status: ResourceStatus;
  workflow_stage?: WorkflowStage | null;
  title: string;
  excerpt: string;
  body_markdown: string;
  cover_image_url: string | null;
  author_name: string;
  author_role: string | null;
  tags: string[] | null;
  featured: boolean;
  reading_time_minutes: number | null;
  video_embed_url: string | null;
  video_duration: string | null;
  report_file_url: string | null;
  report_file_label: string | null;
  event_starts_at: string | Date | null;
  event_location: string | null;
  event_registration_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
  published_at: string | Date | null;
  created_at: string | Date;
  updated_at: string | Date;

  // Playbook v2 columns (optional for seamless backward compatibility)
  content_pillar?: ContentPillar | null;
  target_persona?: TargetPersona | null;
  workflow_track?: WorkflowTrack | null;
  primary_keyword?: string | null;
  secondary_keywords?: string[] | null;
  priority_urgency?: number | null;
  priority_commercial?: number | null;
  priority_winnability?: number | null;
  target_word_count?: number | null;
  serp_gap_notes?: string | null;
  product_tie_in?: string | null;
  circular_code?: string | null;
  regulators?: string[] | null;
  effective_date?: string | Date | null;
  authoritative_sources?: unknown;
  update_callout_note?: string | null;
  faq_items?: unknown;
  mid_article_cta?: unknown;
  show_legal_disclaimer?: boolean | null;
  qa_checklist?: unknown;
  atomization_kit?: unknown;
  last_statutory_audit_at?: string | Date | null;
  refresh_due_at?: string | Date | null;
};

const DEFAULT_QA_CHECKLIST: ResourceQaChecklist = {
  statutoryAccuracyVerified: false,
  repealedRuleChecked: false,
  reviewerName: null,
  reviewedAt: null,
};

const DEFAULT_ATOMIZATION_KIT: ResourceAtomizationKit = {
  linkedinCarousel: null,
  founderLinkedinPost: null,
  twitterThread: null,
  newsletterBrief: null,
  salesBattlecard: null,
  gscIndexedAt: null,
  internalLinksUpdated: false,
  completedChannels: [],
};

function toIsoStringOrNull(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? String(value) : new Date(parsed).toISOString();
}

function parseJsonValue<T>(raw: unknown, fallback: T): T {
  if (raw === null || raw === undefined) return fallback;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }
  return raw as T;
}

function addDaysIso(baseIso: string, days: number): string {
  const ms = Date.parse(baseIso);
  const start = Number.isNaN(ms) ? Date.now() : ms;
  return new Date(start + days * 24 * 60 * 60 * 1000).toISOString();
}

export function mapResourceRow(row: ResourcePostRow): ResourcePost {
  const rawSources = parseJsonValue<ResourceAuthoritativeSource[]>(row.authoritative_sources, []);
  const rawFaqs = parseJsonValue<ResourceFaqItem[]>(row.faq_items, []);
  const rawCta = parseJsonValue<ResourceMidArticleCta | null>(row.mid_article_cta, null);
  const rawQa = parseJsonValue<Partial<ResourceQaChecklist>>(row.qa_checklist, {});
  const rawAtom = parseJsonValue<Partial<ResourceAtomizationKit>>(row.atomization_kit, {});

  const resolvedStage: WorkflowStage =
    row.workflow_stage || (row.status === "published" ? "published" : "draft");

  return {
    id: row.id,
    slug: row.slug,
    category: row.category,
    status: row.status,
    workflowStage: resolvedStage,
    title: row.title,
    excerpt: row.excerpt || "",
    bodyMarkdown: row.body_markdown || "",
    coverImageUrl: row.cover_image_url ?? null,
    authorName: row.author_name || "Cogent Editorial",
    authorRole: row.author_role ?? null,
    tags: Array.isArray(row.tags) ? row.tags : [],
    featured: Boolean(row.featured),
    readingTimeMinutes: row.reading_time_minutes ?? null,
    videoEmbedUrl: row.video_embed_url ?? null,
    videoDuration: row.video_duration ?? null,
    reportFileUrl: row.report_file_url ?? null,
    reportFileLabel: row.report_file_label ?? null,
    eventStartsAt: toIsoStringOrNull(row.event_starts_at),
    eventLocation: row.event_location ?? null,
    eventRegistrationUrl: row.event_registration_url ?? null,
    seoTitle: row.seo_title ?? null,
    seoDescription: row.seo_description ?? null,
    publishedAt: toIsoStringOrNull(row.published_at),
    createdAt: toIsoStringOrNull(row.created_at) || new Date().toISOString(),
    updatedAt: toIsoStringOrNull(row.updated_at) || new Date().toISOString(),

    contentPillar: row.content_pillar ?? null,
    targetPersona: row.target_persona ?? null,
    workflowTrack: row.workflow_track ?? null,
    primaryKeyword: row.primary_keyword ?? null,
    secondaryKeywords: Array.isArray(row.secondary_keywords) ? row.secondary_keywords : [],
    priorityUrgency: row.priority_urgency ?? null,
    priorityCommercial: row.priority_commercial ?? null,
    priorityWinnability: row.priority_winnability ?? null,
    targetWordCount: row.target_word_count ?? null,
    serpGapNotes: row.serp_gap_notes ?? null,
    productTieIn: row.product_tie_in ?? null,
    circularCode: row.circular_code ?? null,
    regulators: Array.isArray(row.regulators) ? row.regulators : [],
    effectiveDate: toIsoStringOrNull(row.effective_date),
    authoritativeSources: Array.isArray(rawSources) ? rawSources : [],
    updateCalloutNote: row.update_callout_note ?? null,
    faqItems: Array.isArray(rawFaqs) ? rawFaqs : [],
    midArticleCta: rawCta && typeof rawCta === "object" && rawCta.headline ? rawCta : null,
    showLegalDisclaimer: row.show_legal_disclaimer !== false,
    qaChecklist: {
      ...DEFAULT_QA_CHECKLIST,
      ...(rawQa && typeof rawQa === "object" ? rawQa : {}),
    },
    atomizationKit: {
      ...DEFAULT_ATOMIZATION_KIT,
      ...(rawAtom && typeof rawAtom === "object" ? rawAtom : {}),
      completedChannels: Array.isArray(rawAtom?.completedChannels) ? rawAtom.completedChannels : [],
    },
    lastStatutoryAuditAt: toIsoStringOrNull(row.last_statutory_audit_at),
    refreshDueAt: toIsoStringOrNull(row.refresh_due_at),
  };
}

let schemaEnsured = false;

export class ResourcesService {
  /**
   * Idempotently ensures Playbook Ops v2 columns exist on Neon `resource_posts`
   * so deployments work immediately even before manual SQL execution.
   */
  public async ensurePlaybookSchema(): Promise<void> {
    if (schemaEnsured || !isNeonResourcesConfigured()) return;
    try {
      const sql = getNeonResourcesSql();
      await sql.query(`
        ALTER TABLE resource_posts
          ADD COLUMN IF NOT EXISTS workflow_stage TEXT NOT NULL DEFAULT 'draft',
          ADD COLUMN IF NOT EXISTS content_pillar TEXT,
          ADD COLUMN IF NOT EXISTS target_persona TEXT,
          ADD COLUMN IF NOT EXISTS workflow_track TEXT,
          ADD COLUMN IF NOT EXISTS primary_keyword TEXT,
          ADD COLUMN IF NOT EXISTS secondary_keywords TEXT[] NOT NULL DEFAULT '{}',
          ADD COLUMN IF NOT EXISTS priority_urgency SMALLINT,
          ADD COLUMN IF NOT EXISTS priority_commercial SMALLINT,
          ADD COLUMN IF NOT EXISTS priority_winnability SMALLINT,
          ADD COLUMN IF NOT EXISTS target_word_count INTEGER,
          ADD COLUMN IF NOT EXISTS serp_gap_notes TEXT,
          ADD COLUMN IF NOT EXISTS product_tie_in TEXT,
          ADD COLUMN IF NOT EXISTS circular_code TEXT,
          ADD COLUMN IF NOT EXISTS regulators TEXT[] NOT NULL DEFAULT '{}',
          ADD COLUMN IF NOT EXISTS effective_date TIMESTAMPTZ,
          ADD COLUMN IF NOT EXISTS authoritative_sources JSONB NOT NULL DEFAULT '[]'::jsonb,
          ADD COLUMN IF NOT EXISTS update_callout_note TEXT,
          ADD COLUMN IF NOT EXISTS faq_items JSONB NOT NULL DEFAULT '[]'::jsonb,
          ADD COLUMN IF NOT EXISTS mid_article_cta JSONB,
          ADD COLUMN IF NOT EXISTS show_legal_disclaimer BOOLEAN NOT NULL DEFAULT true,
          ADD COLUMN IF NOT EXISTS qa_checklist JSONB NOT NULL DEFAULT '{}'::jsonb,
          ADD COLUMN IF NOT EXISTS atomization_kit JSONB NOT NULL DEFAULT '{}'::jsonb,
          ADD COLUMN IF NOT EXISTS last_statutory_audit_at TIMESTAMPTZ,
          ADD COLUMN IF NOT EXISTS refresh_due_at TIMESTAMPTZ
      `);
      schemaEnsured = true;
    } catch (err) {
      logger.warn("Could not auto-ensure Playbook Ops schema columns on Neon", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  private async ensureUniqueSlug(desiredSlug: string, excludeId?: string): Promise<string> {
    const sql = getNeonResourcesSql();
    let candidate = desiredSlug;
    let suffix = 2;

    while (suffix < 50) {
      const rows = (await sql.query(
        excludeId
          ? "SELECT id FROM resource_posts WHERE slug = $1 AND id <> $2 LIMIT 1"
          : "SELECT id FROM resource_posts WHERE slug = $1 LIMIT 1",
        excludeId ? [candidate, excludeId] : [candidate],
      )) as Array<{ id: string }>;

      if (rows.length === 0) return candidate;
      candidate = `${desiredSlug}-${suffix}`;
      suffix += 1;
    }

    return `${desiredSlug}-${Date.now()}`;
  }

  /**
   * Public read: lists published posts, returning [] cleanly if Neon is not yet configured.
   */
  public async listPublishedResources(filters?: {
    category?: ResourceCategory;
    tag?: string;
    limit?: number;
    offset?: number;
  }): Promise<ResourcePost[]> {
    if (!isNeonResourcesConfigured()) return [];

    try {
      const sql = getNeonResourcesSql();
      const where: string[] = ["status = 'published'"];
      const params: unknown[] = [];

      if (filters?.category) {
        params.push(filters.category);
        where.push(`category = $${params.length}`);
      }
      if (filters?.tag) {
        params.push(filters.tag);
        where.push(`$${params.length} = ANY(tags)`);
      }

      const limit = Math.min(Math.max(filters?.limit ?? 48, 1), 100);
      const offset = Math.max(filters?.offset ?? 0, 0);
      params.push(limit, offset);

      const query = `
        SELECT *
        FROM resource_posts
        WHERE ${where.join(" AND ")}
        ORDER BY featured DESC, published_at DESC NULLS LAST, created_at DESC
        LIMIT $${params.length - 1} OFFSET $${params.length}
      `;

      const rows = (await sql.query(query, params)) as ResourcePostRow[];
      return rows.map(mapResourceRow);
    } catch (err) {
      logger.warn("Failed to list published resources from Neon", {
        error: err instanceof Error ? err.message : String(err),
      });
      return [];
    }
  }

  /**
   * Public read: fetches a single published resource by category + slug.
   */
  public async getPublishedResourceBySlug(
    category: ResourceCategory,
    slug: string,
  ): Promise<ResourcePost | null> {
    if (!isNeonResourcesConfigured()) return null;

    try {
      const sql = getNeonResourcesSql();
      const rows = (await sql.query(
        `SELECT * FROM resource_posts WHERE category = $1 AND slug = $2 AND status = 'published' LIMIT 1`,
        [category, slug],
      )) as ResourcePostRow[];

      return rows[0] ? mapResourceRow(rows[0]) : null;
    } catch (err) {
      logger.warn("Failed to fetch published resource by slug from Neon", {
        category,
        slug,
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  }

  /**
   * Public read: fetches related published posts for the detail page.
   */
  public async listRelatedPublishedResources(
    post: ResourcePost,
    limit = 3,
  ): Promise<ResourcePost[]> {
    if (!isNeonResourcesConfigured()) return [];

    try {
      const sql = getNeonResourcesSql();
      const rows = (await sql.query(
        `
        SELECT *
        FROM resource_posts
        WHERE status = 'published'
          AND id <> $1
        ORDER BY
          (CASE WHEN category = $2 THEN 0 ELSE 1 END) ASC,
          published_at DESC NULLS LAST,
          created_at DESC
        LIMIT $3
        `,
        [post.id, post.category, limit],
      )) as ResourcePostRow[];
      return rows.map(mapResourceRow);
    } catch {
      return [];
    }
  }

  /**
   * Public read for dynamic sitemap.xml.
   */
  public async listPublishedSitemapEntries(): Promise<
    Array<{ category: ResourceCategory; slug: string; updatedAt: string }>
  > {
    if (!isNeonResourcesConfigured()) return [];

    try {
      const sql = getNeonResourcesSql();
      const rows = (await sql.query(
        `SELECT category, slug, updated_at FROM resource_posts WHERE status = 'published' ORDER BY published_at DESC NULLS LAST`,
      )) as Array<{ category: ResourceCategory; slug: string; updated_at: string | Date }>;

      return rows.map((r) => ({
        category: r.category,
        slug: r.slug,
        updatedAt: toIsoStringOrNull(r.updated_at) || new Date().toISOString(),
      }));
    } catch {
      return [];
    }
  }

  /**
   * Admin read: lists all posts (draft + published) with optional filters.
   */
  public async listAllResourcesForAdmin(filters?: {
    category?: ResourceCategory;
    status?: ResourceStatus;
    search?: string;
  }): Promise<ResourcePost[]> {
    await this.ensurePlaybookSchema();
    const sql = getNeonResourcesSql();
    const where: string[] = ["1=1"];
    const params: unknown[] = [];

    if (filters?.category) {
      params.push(filters.category);
      where.push(`category = $${params.length}`);
    }
    if (filters?.status) {
      params.push(filters.status);
      where.push(`status = $${params.length}`);
    }
    if (filters?.search && filters.search.trim().length > 0) {
      params.push(`%${filters.search.trim()}%`);
      where.push(
        `(title ILIKE $${params.length} OR excerpt ILIKE $${params.length} OR slug ILIKE $${params.length})`,
      );
    }

    const rows = (await sql.query(
      `
      SELECT *
      FROM resource_posts
      WHERE ${where.join(" AND ")}
      ORDER BY updated_at DESC, created_at DESC
      LIMIT 200
      `,
      params,
    )) as ResourcePostRow[];

    return rows.map(mapResourceRow);
  }

  public async getResourceByIdForAdmin(id: string): Promise<ResourcePost | null> {
    await this.ensurePlaybookSchema();
    const sql = getNeonResourcesSql();
    const rows = (await sql.query(`SELECT * FROM resource_posts WHERE id = $1 LIMIT 1`, [
      id,
    ])) as ResourcePostRow[];
    return rows[0] ? mapResourceRow(rows[0]) : null;
  }

  public async createResource(input: CreateResourcePostInput): Promise<ResourcePost> {
    await this.ensurePlaybookSchema();
    const sql = getNeonResourcesSql();
    const baseSlug = input.slug ? slugifyTitle(input.slug) : slugifyTitle(input.title);
    const slug = await this.ensureUniqueSlug(baseSlug);
    const readingTimeMinutes =
      input.readingTimeMinutes ?? estimateReadingTimeMinutes(input.bodyMarkdown || input.excerpt);
    const nowIso = new Date().toISOString();
    const publishedAt =
      input.status === "published" ? input.publishedAt || nowIso : input.publishedAt || null;
    const workflowStage: WorkflowStage =
      input.status === "published"
        ? "published"
        : input.workflowStage && input.workflowStage !== "published"
          ? input.workflowStage
          : "draft";
    const lastStatutoryAuditAt =
      input.lastStatutoryAuditAt ??
      (input.status === "published" && input.qaChecklist?.statutoryAccuracyVerified ? nowIso : null);
    const refreshDueAt =
      input.refreshDueAt ?? (input.status === "published" ? addDaysIso(publishedAt || nowIso, 30) : null);

    const rows = (await sql.query(
      `
      INSERT INTO resource_posts (
        slug, category, status, workflow_stage, title, excerpt, body_markdown, cover_image_url,
        author_name, author_role, tags, featured, reading_time_minutes,
        video_embed_url, video_duration,
        report_file_url, report_file_label,
        event_starts_at, event_location, event_registration_url,
        seo_title, seo_description, published_at,
        content_pillar, target_persona, workflow_track, primary_keyword, secondary_keywords,
        priority_urgency, priority_commercial, priority_winnability,
        target_word_count, serp_gap_notes, product_tie_in,
        circular_code, regulators, effective_date, authoritative_sources, update_callout_note,
        faq_items, mid_article_cta, show_legal_disclaimer, qa_checklist,
        atomization_kit, last_statutory_audit_at, refresh_due_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13,
        $14, $15,
        $16, $17,
        $18, $19, $20,
        $21, $22, $23,
        $24, $25, $26, $27, $28,
        $29, $30, $31,
        $32, $33, $34,
        $35, $36, $37, $38::jsonb, $39,
        $40::jsonb, $41::jsonb, $42, $43::jsonb,
        $44::jsonb, $45, $46
      )
      RETURNING *
      `,
      [
        slug,
        input.category,
        input.status,
        workflowStage,
        input.title,
        input.excerpt,
        input.bodyMarkdown,
        input.coverImageUrl ?? null,
        input.authorName,
        input.authorRole ?? null,
        input.tags,
        input.featured,
        readingTimeMinutes,
        input.videoEmbedUrl ?? null,
        input.videoDuration ?? null,
        input.reportFileUrl ?? null,
        input.reportFileLabel ?? null,
        input.eventStartsAt ?? null,
        input.eventLocation ?? null,
        input.eventRegistrationUrl ?? null,
        input.seoTitle ?? null,
        input.seoDescription ?? null,
        publishedAt,
        input.contentPillar ?? null,
        input.targetPersona ?? null,
        input.workflowTrack ?? null,
        input.primaryKeyword ?? null,
        input.secondaryKeywords ?? [],
        input.priorityUrgency ?? null,
        input.priorityCommercial ?? null,
        input.priorityWinnability ?? null,
        input.targetWordCount ?? null,
        input.serpGapNotes ?? null,
        input.productTieIn ?? null,
        input.circularCode ?? null,
        input.regulators ?? [],
        input.effectiveDate ?? null,
        JSON.stringify(input.authoritativeSources ?? []),
        input.updateCalloutNote ?? null,
        JSON.stringify(input.faqItems ?? []),
        input.midArticleCta ? JSON.stringify(input.midArticleCta) : null,
        input.showLegalDisclaimer ?? true,
        JSON.stringify(input.qaChecklist ?? DEFAULT_QA_CHECKLIST),
        JSON.stringify(input.atomizationKit ?? DEFAULT_ATOMIZATION_KIT),
        lastStatutoryAuditAt,
        refreshDueAt,
      ],
    )) as ResourcePostRow[];

    if (!rows[0]) {
      throw new Error("Failed to insert resource post into Neon");
    }
    return mapResourceRow(rows[0]);
  }

  public async updateResource(
    id: string,
    input: UpdateResourcePostInput,
  ): Promise<ResourcePost | null> {
    await this.ensurePlaybookSchema();
    const existing = await this.getResourceByIdForAdmin(id);
    if (!existing) return null;

    const sql = getNeonResourcesSql();
    const nextSlug = input.slug
      ? await this.ensureUniqueSlug(slugifyTitle(input.slug), id)
      : existing.slug;
    const nextStatus = input.status ?? existing.status;
    const nextBody = input.bodyMarkdown ?? existing.bodyMarkdown;
    const nextExcerpt = input.excerpt ?? existing.excerpt;
    const nextReadingTime =
      input.readingTimeMinutes !== undefined
        ? input.readingTimeMinutes
        : estimateReadingTimeMinutes(nextBody || nextExcerpt);

    const nowIso = new Date().toISOString();
    let nextPublishedAt = existing.publishedAt;
    if (input.publishedAt !== undefined) {
      nextPublishedAt = input.publishedAt;
    } else if (nextStatus === "published" && !existing.publishedAt) {
      nextPublishedAt = nowIso;
    }

    let nextWorkflowStage: WorkflowStage = input.workflowStage ?? existing.workflowStage;
    if (nextStatus === "published") {
      nextWorkflowStage = "published";
    } else if (nextWorkflowStage === "published") {
      nextWorkflowStage = "draft";
    }

    let nextRefreshDueAt =
      input.refreshDueAt !== undefined ? input.refreshDueAt : existing.refreshDueAt;
    if (nextStatus === "published" && !nextRefreshDueAt) {
      nextRefreshDueAt = addDaysIso(nextPublishedAt || nowIso, 30);
    }

    const nextQaChecklist =
      input.qaChecklist !== undefined ? input.qaChecklist : existing.qaChecklist;
    const nextAtomizationKit =
      input.atomizationKit !== undefined ? input.atomizationKit : existing.atomizationKit;
    const nextMidArticleCta =
      input.midArticleCta !== undefined ? input.midArticleCta : existing.midArticleCta;

    const rows = (await sql.query(
      `
      UPDATE resource_posts
      SET
        slug = $2,
        category = $3,
        status = $4,
        workflow_stage = $5,
        title = $6,
        excerpt = $7,
        body_markdown = $8,
        cover_image_url = $9,
        author_name = $10,
        author_role = $11,
        tags = $12,
        featured = $13,
        reading_time_minutes = $14,
        video_embed_url = $15,
        video_duration = $16,
        report_file_url = $17,
        report_file_label = $18,
        event_starts_at = $19,
        event_location = $20,
        event_registration_url = $21,
        seo_title = $22,
        seo_description = $23,
        published_at = $24,
        content_pillar = $25,
        target_persona = $26,
        workflow_track = $27,
        primary_keyword = $28,
        secondary_keywords = $29,
        priority_urgency = $30,
        priority_commercial = $31,
        priority_winnability = $32,
        target_word_count = $33,
        serp_gap_notes = $34,
        product_tie_in = $35,
        circular_code = $36,
        regulators = $37,
        effective_date = $38,
        authoritative_sources = $39::jsonb,
        update_callout_note = $40,
        faq_items = $41::jsonb,
        mid_article_cta = $42::jsonb,
        show_legal_disclaimer = $43,
        qa_checklist = $44::jsonb,
        atomization_kit = $45::jsonb,
        last_statutory_audit_at = $46,
        refresh_due_at = $47,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
      `,
      [
        id,
        nextSlug,
        input.category ?? existing.category,
        nextStatus,
        nextWorkflowStage,
        input.title ?? existing.title,
        nextExcerpt,
        nextBody,
        input.coverImageUrl !== undefined ? input.coverImageUrl : existing.coverImageUrl,
        input.authorName ?? existing.authorName,
        input.authorRole !== undefined ? input.authorRole : existing.authorRole,
        input.tags ?? existing.tags,
        input.featured ?? existing.featured,
        nextReadingTime,
        input.videoEmbedUrl !== undefined ? input.videoEmbedUrl : existing.videoEmbedUrl,
        input.videoDuration !== undefined ? input.videoDuration : existing.videoDuration,
        input.reportFileUrl !== undefined ? input.reportFileUrl : existing.reportFileUrl,
        input.reportFileLabel !== undefined ? input.reportFileLabel : existing.reportFileLabel,
        input.eventStartsAt !== undefined ? input.eventStartsAt : existing.eventStartsAt,
        input.eventLocation !== undefined ? input.eventLocation : existing.eventLocation,
        input.eventRegistrationUrl !== undefined
          ? input.eventRegistrationUrl
          : existing.eventRegistrationUrl,
        input.seoTitle !== undefined ? input.seoTitle : existing.seoTitle,
        input.seoDescription !== undefined ? input.seoDescription : existing.seoDescription,
        nextPublishedAt,
        input.contentPillar !== undefined ? input.contentPillar : existing.contentPillar,
        input.targetPersona !== undefined ? input.targetPersona : existing.targetPersona,
        input.workflowTrack !== undefined ? input.workflowTrack : existing.workflowTrack,
        input.primaryKeyword !== undefined ? input.primaryKeyword : existing.primaryKeyword,
        input.secondaryKeywords ?? existing.secondaryKeywords,
        input.priorityUrgency !== undefined ? input.priorityUrgency : existing.priorityUrgency,
        input.priorityCommercial !== undefined ? input.priorityCommercial : existing.priorityCommercial,
        input.priorityWinnability !== undefined
          ? input.priorityWinnability
          : existing.priorityWinnability,
        input.targetWordCount !== undefined ? input.targetWordCount : existing.targetWordCount,
        input.serpGapNotes !== undefined ? input.serpGapNotes : existing.serpGapNotes,
        input.productTieIn !== undefined ? input.productTieIn : existing.productTieIn,
        input.circularCode !== undefined ? input.circularCode : existing.circularCode,
        input.regulators ?? existing.regulators,
        input.effectiveDate !== undefined ? input.effectiveDate : existing.effectiveDate,
        JSON.stringify(input.authoritativeSources ?? existing.authoritativeSources),
        input.updateCalloutNote !== undefined
          ? input.updateCalloutNote
          : existing.updateCalloutNote,
        JSON.stringify(input.faqItems ?? existing.faqItems),
        nextMidArticleCta ? JSON.stringify(nextMidArticleCta) : null,
        input.showLegalDisclaimer !== undefined
          ? input.showLegalDisclaimer
          : existing.showLegalDisclaimer,
        JSON.stringify(nextQaChecklist),
        JSON.stringify(nextAtomizationKit),
        input.lastStatutoryAuditAt !== undefined
          ? input.lastStatutoryAuditAt
          : existing.lastStatutoryAuditAt,
        nextRefreshDueAt,
      ],
    )) as ResourcePostRow[];

    return rows[0] ? mapResourceRow(rows[0]) : null;
  }

  public async deleteResource(id: string): Promise<boolean> {
    const sql = getNeonResourcesSql();
    const rows = (await sql.query(`DELETE FROM resource_posts WHERE id = $1 RETURNING id`, [
      id,
    ])) as Array<{ id: string }>;
    return rows.length > 0;
  }
}

export const resourcesService = new ResourcesService();
