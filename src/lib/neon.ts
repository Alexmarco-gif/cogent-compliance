/**
 * Cogent Resources Hub - Isolated Neon Postgres Client
 * Strictly separate from Supabase so core compliance SaaS storage/memory is untouched.
 */

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

export function getNeonResourcesDatabaseUrl(
  env: Record<string, string | undefined> = process.env,
): string | null {
  const raw = (env.NEON_RESOURCES_DATABASE_URL || "").trim();
  return raw.length > 0 ? raw : null;
}

export function isNeonResourcesConfigured(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return Boolean(getNeonResourcesDatabaseUrl(env));
}

let cachedClient: NeonQueryFunction<false, false> | null = null;
let cachedUrl: string | null = null;

export function getNeonResourcesSql(): NeonQueryFunction<false, false> {
  const url = getNeonResourcesDatabaseUrl();
  if (!url) {
    throw new Error(
      "NEON_RESOURCES_DATABASE_URL is not configured. Set it in .env.local or Vercel environment variables.",
    );
  }
  if (!cachedClient || cachedUrl !== url) {
    cachedClient = neon(url);
    cachedUrl = url;
  }
  return cachedClient;
}
