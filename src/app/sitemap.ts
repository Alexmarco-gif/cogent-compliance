import type { MetadataRoute } from "next";
import { getPublicSiteUrl } from "@/lib/site-url";
import { SOLUTION_VERTICAL_PAGES } from "@/data/marketing-scenarios";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getPublicSiteUrl();
  const lastModified = new Date();

  const solutionPages: MetadataRoute.Sitemap = SOLUTION_VERTICAL_PAGES.map((page) => ({
    url: `${baseUrl}/solutions/${page.slug}`,
    lastModified,
    changeFrequency: "weekly",
    priority: 0.9,
  }));

  return [
    {
      url: `${baseUrl}/`,
      lastModified,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/solutions`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...solutionPages,
    {
      url: `${baseUrl}/resources`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/company`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${baseUrl}/resources/faq`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${baseUrl}/legal`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];
}
