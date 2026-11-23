import React from "react";
import { notFound } from "next/navigation";
import { getNeonResourcesConfigError, isNeonResourcesConfigured } from "@/lib/neon";
import { requireResourcesAdminSession } from "@/modules/resources/resources-admin.guard";
import { isResourcesR2Configured } from "@/modules/resources/resources-media.service";
import { ResourcesAdminStudio } from "@/components/admin/resources/ResourcesAdminStudio";

export async function AdminResourcesView({ portalPrefix }: { portalPrefix: string }) {
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
