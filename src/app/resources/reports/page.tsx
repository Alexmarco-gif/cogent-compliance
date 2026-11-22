import React from "react";
import type { Metadata } from "next";
import { RESOURCE_CATEGORY_META } from "@/contracts/resources.contracts";
import { ResourceCategoryPageView } from "@/components/marketing/resources/ResourceCategoryPageView";

export const dynamic = "force-dynamic";

const meta = RESOURCE_CATEGORY_META.reports;

export const metadata: Metadata = {
  title: meta.seoTitle,
  description: meta.seoDescription,
  alternates: { canonical: "/resources/reports" },
  openGraph: {
    title: meta.seoTitle,
    description: meta.seoDescription,
    url: "/resources/reports",
  },
};

export default async function ReportsResourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const { tag } = await searchParams;
  return <ResourceCategoryPageView category="reports" selectedTag={tag} />;
}
