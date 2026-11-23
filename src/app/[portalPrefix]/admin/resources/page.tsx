import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getNeonResourcesConfigError, isNeonResourcesConfigured } from "@/lib/neon";
import { requireResourcesAdminSession } from "@/modules/resources/resources-admin.guard";
import { isResourcesR2Configured } from "@/modules/resources/resources-media.service";
import { ResourcesAdminStudio } from "@/components/admin/resources/ResourcesAdminStudio";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Resources Publishing Studio",
  robots: {
    index: false,
    follow: false,
  },
};

/**
 * Serves strictly at /@/admin/resources (since Next.js reserves `@` folders for Parallel Routes).
 * Any other prefix returns 404 immediately, and non-owners also receive 404.
 */
export default async function AdminResourcesPage({
  params,
}: {
  params: Promise<{ portalPrefix: string }>;
}) {
  const { portalPrefix } = await params;
  let decodedPrefix = portalPrefix;
  try {
    decodedPrefix = decodeURIComponent(portalPrefix);
  } catch {
    notFound();
  }

  if (decodedPrefix !== "@") {
    notFound();
  }

  const session = await requireResourcesAdminSession();
  if (!session.authorized) {
    notFound();
  }

  return (
    <ResourcesAdminStudio
      initialNeonConfigured={isNeonResourcesConfigured()}
      initialNeonConfigError={getNeonResourcesConfigError()}
      initialR2Configured={isResourcesR2Configured()}
    />
  );
}
