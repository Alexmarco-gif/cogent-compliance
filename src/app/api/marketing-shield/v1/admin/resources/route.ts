/**
 * Owner-only Resources CMS API - Collection Route
 * GET  -> list all posts (draft + published) with config status
 * POST -> create a new resource post in Neon Postgres
 * Non-owners receive 404 so the endpoint is not disclosed.
 */

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  CreateResourcePostSchema,
  isResourceCategory,
  type ResourceStatus,
} from "@/contracts/resources.contracts";
import {
  getNeonResourcesConfigError,
  isNeonResourcesConfigured,
} from "@/lib/neon";
import { requireResourcesAdminSession } from "@/modules/resources/resources-admin.guard";
import { isResourcesR2Configured } from "@/modules/resources/resources-media.service";
import { resourcesService } from "@/modules/resources/resources.service";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const NOT_FOUND = () => NextResponse.json({ error: "Not found" }, { status: 404 });
const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

export async function GET(req: NextRequest) {
  const session = await requireResourcesAdminSession();
  if (!session.authorized) return NOT_FOUND();

  const neonConfigError = getNeonResourcesConfigError();
  const neonConfigured = isNeonResourcesConfigured();
  const r2Configured = isResourcesR2Configured();

  if (neonConfigError) {
    return NextResponse.json(
      {
        neonConfigured: false,
        neonConfigError,
        r2Configured,
        posts: [],
      },
      { status: 200, headers: NO_STORE },
    );
  }

  if (!neonConfigured) {
    return NextResponse.json(
      {
        neonConfigured: false,
        neonConfigError: null,
        r2Configured,
        posts: [],
      },
      { status: 200, headers: NO_STORE },
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const rawCategory = searchParams.get("category") || undefined;
    const rawStatus = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;

    const category = rawCategory && isResourceCategory(rawCategory) ? rawCategory : undefined;
    const status: ResourceStatus | undefined =
      rawStatus === "draft" || rawStatus === "published" ? rawStatus : undefined;

    const posts = await resourcesService.listAllResourcesForAdmin({
      category,
      status,
      search,
    });

    return NextResponse.json(
      {
        neonConfigured: true,
        r2Configured,
        posts,
      },
      { status: 200, headers: NO_STORE },
    );
  } catch (err) {
    logger.error("Failed to fetch admin resources list from Neon", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to query Neon Resources database. Ensure the 001_resources_cms.sql migration has been applied.",
      },
      { status: 500, headers: NO_STORE },
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await requireResourcesAdminSession();
  if (!session.authorized) return NOT_FOUND();

  if (!isNeonResourcesConfigured()) {
    return NextResponse.json(
      { error: "NEON_RESOURCES_DATABASE_URL is not configured." },
      { status: 503, headers: NO_STORE },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const parsed = CreateResourcePostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  try {
    const created = await resourcesService.createResource(parsed.data);

    revalidatePath("/resources");
    revalidatePath(`/resources/${created.category}`);
    revalidatePath(`/resources/${created.category}/${created.slug}`);
    revalidatePath("/sitemap.xml");

    return NextResponse.json({ post: created }, { status: 201, headers: NO_STORE });
  } catch (err) {
    logger.error("Failed to create resource post in Neon", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create resource post." },
      { status: 500 },
    );
  }
}
