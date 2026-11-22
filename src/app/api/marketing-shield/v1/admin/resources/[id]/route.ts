/**
 * Owner-only Resources CMS API - Item Route
 * GET    -> fetch single resource post by ID
 * PATCH  -> update resource post (title, body, media links, status, etc.)
 * DELETE -> delete resource post
 * Non-owners receive 404.
 */

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { UpdateResourcePostSchema } from "@/contracts/resources.contracts";
import { isNeonResourcesConfigured } from "@/lib/neon";
import { requireResourcesAdminSession } from "@/modules/resources/resources-admin.guard";
import { resourcesService } from "@/modules/resources/resources.service";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const NOT_FOUND = () => NextResponse.json({ error: "Not found" }, { status: 404 });
const NO_STORE = { "Cache-Control": "no-store, max-age=0" };
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requireResourcesAdminSession();
  if (!session.authorized) return NOT_FOUND();
  if (!isNeonResourcesConfigured()) {
    return NextResponse.json({ error: "NEON_RESOURCES_DATABASE_URL is not configured." }, { status: 503 });
  }

  const { id } = await context.params;
  if (!UUID_REGEX.test(id)) return NOT_FOUND();

  const post = await resourcesService.getResourceByIdForAdmin(id);
  if (!post) return NOT_FOUND();

  return NextResponse.json({ post }, { status: 200, headers: NO_STORE });
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requireResourcesAdminSession();
  if (!session.authorized) return NOT_FOUND();
  if (!isNeonResourcesConfigured()) {
    return NextResponse.json({ error: "NEON_RESOURCES_DATABASE_URL is not configured." }, { status: 503 });
  }

  const { id } = await context.params;
  if (!UUID_REGEX.test(id)) return NOT_FOUND();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const parsed = UpdateResourcePostSchema.safeParse(body);
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
    const previous = await resourcesService.getResourceByIdForAdmin(id);
    if (!previous) return NOT_FOUND();

    const updated = await resourcesService.updateResource(id, parsed.data);
    if (!updated) return NOT_FOUND();

    revalidatePath("/resources");
    revalidatePath(`/resources/${previous.category}`);
    revalidatePath(`/resources/${previous.category}/${previous.slug}`);
    revalidatePath(`/resources/${updated.category}`);
    revalidatePath(`/resources/${updated.category}/${updated.slug}`);
    revalidatePath("/sitemap.xml");

    return NextResponse.json({ post: updated }, { status: 200, headers: NO_STORE });
  } catch (err) {
    logger.error("Failed to update resource post in Neon", {
      id,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update resource post." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requireResourcesAdminSession();
  if (!session.authorized) return NOT_FOUND();
  if (!isNeonResourcesConfigured()) {
    return NextResponse.json({ error: "NEON_RESOURCES_DATABASE_URL is not configured." }, { status: 503 });
  }

  const { id } = await context.params;
  if (!UUID_REGEX.test(id)) return NOT_FOUND();

  try {
    const existing = await resourcesService.getResourceByIdForAdmin(id);
    if (!existing) return NOT_FOUND();

    await resourcesService.deleteResource(id);

    revalidatePath("/resources");
    revalidatePath(`/resources/${existing.category}`);
    revalidatePath(`/resources/${existing.category}/${existing.slug}`);
    revalidatePath("/sitemap.xml");

    return NextResponse.json({ deleted: true, id }, { status: 200, headers: NO_STORE });
  } catch (err) {
    logger.error("Failed to delete resource post in Neon", {
      id,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete resource post." },
      { status: 500 },
    );
  }
}
