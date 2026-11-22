import React from "react";
import type { Metadata } from "next";
import { RESOURCE_CATEGORY_META } from "@/contracts/resources.contracts";
import { ResourceCategoryPageView } from "@/components/marketing/resources/ResourceCategoryPageView";

export const dynamic = "force-dynamic";

const meta = RESOURCE_CATEGORY_META.events;

export const metadata: Metadata = {
  title: meta.seoTitle,
  description: meta.seoDescription,
  alternates: { canonical: "/resources/events" },
  openGraph: {
    title: meta.seoTitle,
    description: meta.seoDescription,
    url: "/resources/events",
  },
};

export default async function EventsResourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const { tag } = await searchParams;
  return <ResourceCategoryPageView category="events" selectedTag={tag} />;
}
