import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isNeonResourcesConfigured } from "@/lib/neon";
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

export default async function AdminResourcesPage() {
  const session = await requireResourcesAdminSession();
  if (!session.authorized) {
    notFound();
  }

  return (
    <ResourcesAdminStudio
      initialNeonConfigured={isNeonResourcesConfigured()}
      initialR2Configured={isResourcesR2Configured()}
    />
  );
}
