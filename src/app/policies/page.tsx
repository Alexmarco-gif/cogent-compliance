import React from "react";
import { PolicyDashboardClient } from "@/components/policies/PolicyDashboardClient";

export const metadata = {
  title: "Policy Workflow & Register | Cogent Compliance",
  description:
    "Governed institutional compliance policy lifecycle — Initiation, Clean Redline Compilation, Three-Lines Review, Statutory QA, Delegated Approval, Publication, Controls & Attestations.",
};

export default function PoliciesPage() {
  return <PolicyDashboardClient />;
}
