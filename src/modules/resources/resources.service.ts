/**
 * Cogent Resources Hub - Neon Postgres Repository & Service Layer
 * Zero Supabase DB usage; gracefully degrades to empty reads if NEON_RESOURCES_DATABASE_URL is not configured yet.
 */

import {
  type CreateResourcePostInput,
  type ResourceCategory,
  type ResourcePost,
  type ResourceStatus,
  type UpdateResourcePostInput,
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
};

function toIsoStringOrNull(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? String(value) : new Date(parsed).toISOString();
}

export function mapResourceRow(row: ResourcePostRow): ResourcePost {
  return {
    id: row.id,
    slug: row.slug,
    category: row.category,
    status: row.status,
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
  };
}

export class ResourcesService {
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
      where.push(`(title ILIKE $${params.length} OR excerpt ILIKE $${params.length} OR slug ILIKE $${params.length})`);
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
    const sql = getNeonResourcesSql();
    const rows = (await sql.query(
      `SELECT * FROM resource_posts WHERE id = $1 LIMIT 1`,
      [id],
    )) as ResourcePostRow[];
    return rows[0] ? mapResourceRow(rows[0]) : null;
  }

  public async createResource(input: CreateResourcePostInput): Promise<ResourcePost> {
    const sql = getNeonResourcesSql();
    const baseSlug = input.slug ? slugifyTitle(input.slug) : slugifyTitle(input.title);
    const slug = await this.ensureUniqueSlug(baseSlug);
    const readingTimeMinutes =
      input.readingTimeMinutes ?? estimateReadingTimeMinutes(input.bodyMarkdown || input.excerpt);
    const publishedAt =
      input.status === "published"
        ? input.publishedAt || new Date().toISOString()
        : input.publishedAt || null;

    const rows = (await sql.query(
      `
      INSERT INTO resource_posts (
        slug, category, status, title, excerpt, body_markdown, cover_image_url,
        author_name, author_role, tags, featured, reading_time_minutes,
        video_embed_url, video_duration,
        report_file_url, report_file_label,
        event_starts_at, event_location, event_registration_url,
        seo_title, seo_description, published_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12,
        $13, $14,
        $15, $16,
        $17, $18, $19,
        $20, $21, $22
      )
      RETURNING *
      `,
      [
        slug,
        input.category,
        input.status,
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

    let nextPublishedAt = existing.publishedAt;
    if (input.publishedAt !== undefined) {
      nextPublishedAt = input.publishedAt;
    } else if (nextStatus === "published" && !existing.publishedAt) {
      nextPublishedAt = new Date().toISOString();
    }

    const rows = (await sql.query(
      `
      UPDATE resource_posts
      SET
        slug = $2,
        category = $3,
        status = $4,
        title = $5,
        excerpt = $6,
        body_markdown = $7,
        cover_image_url = $8,
        author_name = $9,
        author_role = $10,
        tags = $11,
        featured = $12,
        reading_time_minutes = $13,
        video_embed_url = $14,
        video_duration = $15,
        report_file_url = $16,
        report_file_label = $17,
        event_starts_at = $18,
        event_location = $19,
        event_registration_url = $20,
        seo_title = $21,
        seo_description = $22,
        published_at = $23,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
      `,
      [
        id,
        nextSlug,
        input.category ?? existing.category,
        nextStatus,
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
      ],
    )) as ResourcePostRow[];

    return rows[0] ? mapResourceRow(rows[0]) : null;
  }

  public async deleteResource(id: string): Promise<boolean> {
    const sql = getNeonResourcesSql();
    const rows = (await sql.query(
      `DELETE FROM resource_posts WHERE id = $1 RETURNING id`,
      [id],
    )) as Array<{ id: string }>;
    return rows.length > 0;
  }
}

export const resourcesService = new ResourcesService();
