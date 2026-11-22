/**
 * Public Resources Media Proxy Route
 * Streams images and PDFs from the dedicated Resources Cloudflare R2 account
 * ONLY under the `resources/` key prefix (never touches core SaaS tenant assets).
 */

import { NextRequest, NextResponse } from "next/server";
import {
  isResourcesR2Configured,
  isValidResourcesStorageKey,
  resourcesMediaService,
} from "@/modules/resources/resources-media.service";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ key: string[] }> },
) {
  if (!isResourcesR2Configured()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { key } = await context.params;
  const storageKey = Array.isArray(key) ? key.join("/") : "";

  if (!isValidResourcesStorageKey(storageKey)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const obj = await resourcesMediaService.getMediaObject(storageKey);
  if (!obj) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(obj.buffer), {
    status: 200,
    headers: {
      "Content-Type": obj.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
