/**
 * Canonical public marketing site URL helper for SEO metadata, OpenGraph, robots.txt, and sitemap.xml.
 */
export function getPublicSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://stem-cogent.com";
  return raw.replace(/\/+$/, "");
}
