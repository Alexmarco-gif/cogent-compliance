import React from "react";
import type { Metadata } from "next";
import { ExpansionDashboardClient } from "@/components/expansions/ExpansionDashboardClient";

export const metadata: Metadata = {
  title: "Cross-Border Expansion OS | Cogent Compliance",
  description:
    "8-Stage Cross-Border Financial Compliance Operating System: Market Entry, Licensing, Group-to-Local Policy Localisation, Risk Registers, Pre-Launch Validation & Go-Live Gate.",
};

export default function ExpansionsPage() {
  return <ExpansionDashboardClient />;
}
