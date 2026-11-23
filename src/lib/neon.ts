/**
 * Cogent Resources Hub - Isolated Neon Postgres Client
 * Strictly separate from Supabase so core compliance SaaS storage/memory is untouched.
 */

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

function stripQuotesAndKeyPrefix(raw: string, expectedKey: string): string {
  let cleaned = raw.trim();
  // Strip accidental `KEY=value` or `KEY:value` if pasted into Vercel value input
  const prefixEq = `${expectedKey}=`;
  const prefixColon = `${expectedKey}:`;
  if (cleaned.startsWith(prefixEq)) {
    cleaned = cleaned.slice(prefixEq.length).trim();
  } else if (cleaned.startsWith(prefixColon)) {
    cleaned = cleaned.slice(prefixColon.length).trim();
  }
  // Strip accidental `psql '...'` wrapper copied from Neon dashboard
  if (cleaned.toLowerCase().startsWith("psql ")) {
    cleaned = cleaned.slice(5).trim();
  }
  cleaned = cleaned.replace(/^['"]+|['"]+$/g, "").trim();
  return cleaned;
}

export function isValidPostgresUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      (parsed.protocol === "postgresql:" || parsed.protocol === "postgres:") &&
      parsed.hostname.length > 0
    );
  } catch {
    return false;
  }
}

export function getNeonResourcesDatabaseUrl(
  env: Record<string, string | undefined> = process.env,
): string | null {
  const raw = env.NEON_RESOURCES_DATABASE_URL || "";
  if (!raw.trim()) return null;
  const cleaned = stripQuotesAndKeyPrefix(raw, "NEON_RESOURCES_DATABASE_URL");
  return isValidPostgresUrl(cleaned) ? cleaned : null;
}

export function getNeonResourcesConfigError(
  env: Record<string, string | undefined> = process.env,
): string | null {
  const raw = (env.NEON_RESOURCES_DATABASE_URL || "").trim();
  if (!raw) return null;
  const cleaned = stripQuotesAndKeyPrefix(raw, "NEON_RESOURCES_DATABASE_URL");
  if (isValidPostgresUrl(cleaned)) return null;

  const preview = cleaned.length > 40 ? `${cleaned.slice(0, 40)}...` : cleaned;
  return `NEON_RESOURCES_DATABASE_URL is set to an invalid value ("${preview}"). In Vercel → Settings → Environment Variables, set the Value to your actual postgresql://... connection string from Neon (not the variable name).`;
}

export function isNeonResourcesConfigured(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return Boolean(getNeonResourcesDatabaseUrl(env));
}

let cachedClient: NeonQueryFunction<false, false> | null = null;
let cachedUrl: string | null = null;

export function getNeonResourcesSql(): NeonQueryFunction<false, false> {
  const configError = getNeonResourcesConfigError();
  if (configError) {
    throw new Error(configError);
  }
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
