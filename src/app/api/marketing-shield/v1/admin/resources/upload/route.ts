/**
 * Owner-only Resources CMS Media Upload API
 * Uploads images (PNG, JPEG, WEBP) and report PDFs strictly to the SEPARATE
 * Resources Cloudflare R2 account configured via RESOURCES_R2_*.
 * Never writes to Supabase Storage or the core SaaS R2 bucket.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireResourcesAdminSession } from "@/modules/resources/resources-admin.guard";
import {
  isResourcesR2Configured,
  resourcesMediaService,
} from "@/modules/resources/resources-media.service";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const NOT_FOUND = () => NextResponse.json({ error: "Not found" }, { status: 404 });

export async function POST(req: NextRequest) {
  const session = await requireResourcesAdminSession();
  if (!session.authorized) return NOT_FOUND();

  if (!isResourcesR2Configured()) {
    return NextResponse.json(
      {
        error:
          "Resources R2 storage is not configured. Set RESOURCES_R2_ACCOUNT_ID, RESOURCES_R2_ACCESS_KEY_ID, RESOURCES_R2_SECRET_ACCESS_KEY, and RESOURCES_R2_BUCKET_NAME, or paste an external Google Drive / pCloud / image link instead.",
      },
      { status: 503 },
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided in form field 'file'." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploaded = await resourcesMediaService.uploadMedia({
      filename: file.name || "resource-file",
      mimeType: file.type || "application/octet-stream",
      buffer,
    });

    return NextResponse.json(uploaded, { status: 201 });
  } catch (err) {
    logger.warn("Resources R2 media upload rejected or failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed." },
      { status: 400 },
    );
  }
}
