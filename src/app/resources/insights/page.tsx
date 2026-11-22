import React from "react";
import type { Metadata } from "next";
import { RESOURCE_CATEGORY_META } from "@/contracts/resources.contracts";
import { ResourceCategoryPageView } from "@/components/marketing/resources/ResourceCategoryPageView";

export const dynamic = "force-dynamic";

const meta = RESOURCE_CATEGORY_META.insights;

export const metadata: Metadata = {
  title: meta.seoTitle,
  description: meta.seoDescription,
  alternates: { canonical: "/resources/insights" },
  openGraph: {
    title: meta.seoTitle,
    description: meta.seoDescription,
    url: "/resources/insights",
  },
};

export default async function InsightsResourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const { tag } = await searchParams;
  return <ResourceCategoryPageView category="insights" selectedTag={tag} />;
}
