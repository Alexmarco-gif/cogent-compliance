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

export default async function AdminResourcesPage({
  params,
}: {
  params: Promise<{ portalPrefix: string }>;
}) {
  const { portalPrefix } = await params;
  return <AdminResourcesView portalPrefix={portalPrefix} />;
}
