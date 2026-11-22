import type { MetadataRoute } from "next";
import { getPublicSiteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getPublicSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/solutions",
          "/company",
          "/resources",
          "/resources/",
          "/legal",
        ],
        disallow: [
          "/admin",
          "/chat",
          "/onboarding",
          "/knowledge-base",
          "/drift-monitors",
          "/settings",
          "/pricing",
          "/studio",
          "/api/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
