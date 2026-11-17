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
          "/platform",
          "/solutions",
          "/regulatory-vault",
          "/pricing",
          "/company",
          "/resources/",
        ],
        disallow: [
          "/chat",
          "/onboarding",
          "/knowledge-base",
          "/drift-monitors",
          "/settings",
          "/studio",
          "/api/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
