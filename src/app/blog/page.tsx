import { permanentRedirect } from "next/navigation";

/**
 * Canonical content hub lives at /resources/insights.
 * Permanently redirects legacy or external /blog links so the system URL stays the single source of truth.
 */
export default function LegacyBlogIndexRedirect() {
  permanentRedirect("/resources/insights");
}
