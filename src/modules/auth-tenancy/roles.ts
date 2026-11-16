/**
 * Cogent Marketing Shield - Client-Safe Role Catalog & Helper Utilities
 * Shared across Onboarding, Settings -> Team & Roles, and RBAC permission displays.
 */

import type { CanonicalRole } from "./types";

export interface RoleMetadata {
  role: CanonicalRole;
  label: string;
  shortLabel: string;
  description: string;
  canCreateCampaigns: boolean;
  canManageProducts: boolean;
  canApproveCampaigns: boolean;
  canPublishKnowledge: boolean;
  canManageTeamAndSettings: boolean;
  recommendedForCreator?: boolean;
}

export const CANONICAL_ROLE_CATALOG: readonly RoleMetadata[] = [
  {
    role: "CHIEF_COMPLIANCE_OFFICER",
    label: "Chief Compliance Officer",
    shortLabel: "CCO",
    description:
      "Full institutional governance: create & audit campaigns, manage products & playbooks, issue final approvals, and manage team & settings.",
    canCreateCampaigns: true,
    canManageProducts: true,
    canApproveCampaigns: true,
    canPublishKnowledge: true,
    canManageTeamAndSettings: true,
    recommendedForCreator: true,
  },
  {
    role: "LEGAL_COUNSEL",
    label: "Legal Counsel",
    shortLabel: "Legal",
    description:
      "Review promotional materials, issue binding legal approvals or rejections, publish statutory rules, and inspect immutable audit trails.",
    canCreateCampaigns: true,
    canManageProducts: true,
    canApproveCampaigns: true,
    canPublishKnowledge: true,
    canManageTeamAndSettings: false,
  },
  {
    role: "COMPLIANCE_ANALYST",
    label: "Compliance Analyst",
    shortLabel: "Analyst",
    description:
      "Run audits, draft campaign revisions, upload playbooks, manage product rate cards, and escalate reviews to Legal or CCO.",
    canCreateCampaigns: true,
    canManageProducts: true,
    canApproveCampaigns: false,
    canPublishKnowledge: false,
    canManageTeamAndSettings: false,
  },
  {
    role: "MARKETING_GROWTH",
    label: "Product & Marketing Manager",
    shortLabel: "Product Manager",
    description:
      "Create campaigns, manage product rate cards, upload marketing flyers/copy, apply compliant rewrites, and submit for approval.",
    canCreateCampaigns: true,
    canManageProducts: true,
    canApproveCampaigns: false,
    canPublishKnowledge: false,
    canManageTeamAndSettings: false,
  },
  {
    role: "WORKSPACE_ADMIN",
    label: "Workspace Admin",
    shortLabel: "IT Admin",
    description:
      "Manage organization details, team roles, billing, and regulatory playbooks (restricted from campaign drafting and approvals).",
    canCreateCampaigns: false,
    canManageProducts: true,
    canApproveCampaigns: false,
    canPublishKnowledge: true,
    canManageTeamAndSettings: true,
  },
] as const;

export const ROLE_METADATA_MAP: Record<CanonicalRole, RoleMetadata> = Object.fromEntries(
  CANONICAL_ROLE_CATALOG.map((item) => [item.role, item]),
) as Record<CanonicalRole, RoleMetadata>;

export function getRoleMetadata(role: CanonicalRole | string | null | undefined): RoleMetadata {
  if (role && role in ROLE_METADATA_MAP) {
    return ROLE_METADATA_MAP[role as CanonicalRole];
  }
  return ROLE_METADATA_MAP.MARKETING_GROWTH;
}

export function mapCanonicalRoleToClerkOrgRole(role: CanonicalRole): "org:admin" | "org:member" {
  return role === "CHIEF_COMPLIANCE_OFFICER" || role === "WORKSPACE_ADMIN"
    ? "org:admin"
    : "org:member";
}
