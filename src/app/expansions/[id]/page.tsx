import React from "react";
import type { Metadata } from "next";
import { ExpansionDetailClient } from "@/components/expansions/ExpansionDetailClient";

export const metadata: Metadata = {
  title: "Cross-Border Corridor Control Plane | Cogent Compliance",
  description:
    "Manage country regulatory obligations, Group-to-Local policy localisation, risk register, operational workstreams, pre-launch validation tests, and CCO Go-Live Readiness Gate.",
};

export default async function ExpansionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ExpansionDetailClient expansionId={id} />;
}
