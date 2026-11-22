import type { MetadataRoute } from "next";
import { getPublicSiteUrl } from "@/lib/site-url";
import { SOLUTION_VERTICAL_PAGES } from "@/data/marketing-scenarios";
import { RESOURCE_CATEGORIES } from "@/contracts/resources.contracts";
import { resourcesService } from "@/modules/resources/resources.service";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getPublicSiteUrl();
  const lastModified = new Date();

  const solutionPages: MetadataRoute.Sitemap = SOLUTION_VERTICAL_PAGES.map((page) => ({
    url: `${baseUrl}/solutions/${page.slug}`,
    lastModified,
    changeFrequency: "weekly",
    priority: 0.9,
  }));

  const resourceSectionPages: MetadataRoute.Sitemap = RESOURCE_CATEGORIES.map((category) => ({
    url: `${baseUrl}/resources/${category}`,
    lastModified,
    changeFrequency: "weekly",
    priority: 0.85,
  }));

  const publishedPosts = await resourcesService.listPublishedSitemapEntries();
  const resourcePostPages: MetadataRoute.Sitemap = publishedPosts.map((entry) => ({
    url: `${baseUrl}/resources/${entry.category}/${entry.slug}`,
    lastModified: new Date(entry.updatedAt),
    changeFrequency: "weekly",
    priority: 0.8,
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
      priority: 0.85,
    },
    ...resourceSectionPages,
    ...resourcePostPages,
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
