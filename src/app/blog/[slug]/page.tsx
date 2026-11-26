import { permanentRedirect } from "next/navigation";

/**
 * Canonical article URLs live at /resources/insights/[slug].
 * Permanently redirects any external /blog/[slug] references without duplicating SEO routes.
 */
export default async function LegacyBlogSlugRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  permanentRedirect(`/resources/insights/${encodeURIComponent(slug)}`);
}
