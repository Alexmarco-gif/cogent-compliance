import React from "react";
import type { Metadata } from "next";
import { AdminResourcesView } from "@/components/admin/resources/AdminResourcesView";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Resources Publishing Studio",
  robots: {
    index: false,
    follow: false,
  },
};

/**
 * Serves /resources/@/admin/resources alongside /resources/[category]/[slug].
 * Next.js App Router forbids sibling dynamic folders with different slug names
 * under the same directory, so this route reuses `[category]` and validates
 * strictly that `decodeURIComponent(category) === "@"` inside AdminResourcesView.
 */
export default async function ResourcesScopedAdminPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  return <AdminResourcesView portalPrefix={category} />;
}
