/**
 * Cogent Marketing Shield - Client-Safe Role Catalog & Helper Utilities
 * Shared across Onboarding, Settings -> Team & Roles, and RBAC permission displays.
 */

import type { CanonicalRole, DefenseLine } from "./types";

export interface RoleMetadata {
  role: CanonicalRole;
  label: string;
  shortLabel: string;
  defenseLine: DefenseLine;
  defenseLineLabel: string;
  department: string;
  description: string;
  isAdvisoryOnly?: boolean;
  canCreateCampaigns: boolean;
  canManageProducts: boolean;
  canApproveCampaigns: boolean;
  canApprovePolicies: boolean;
  policyApprovalTier?: "TIER_1_CCO" | "TIER_2_COMMITTEE" | "TIER_3_BOARD";
  canPublishKnowledge: boolean;
  canManageTeamAndSettings: boolean;
  recommendedForCreator?: boolean;
}

export const CANONICAL_ROLE_CATALOG: readonly RoleMetadata[] = [
  {
    role: "CHIEF_COMPLIANCE_OFFICER",
    label: "Chief Compliance Officer",
    shortLabel: "CCO",
    defenseLine: "SECOND_LINE",
    defenseLineLabel: "2nd Line — Compliance",
    department: "Compliance",
    description:
      "Full institutional governance: validate statutory QA, issue CCO policy & campaign approvals, publish approved policies, and manage team & settings.",
    canCreateCampaigns: true,
    canManageProducts: true,
    canApproveCampaigns: true,
    canApprovePolicies: true,
    policyApprovalTier: "TIER_1_CCO",
    canPublishKnowledge: true,
    canManageTeamAndSettings: true,
    recommendedForCreator: true,
  },
  {
    role: "LEGAL_COUNSEL",
    label: "Legal Counsel",
    shortLabel: "Legal",
    defenseLine: "SECOND_LINE",
    defenseLineLabel: "2nd Line — Legal",
    department: "Legal",
    description:
      "Review legal enforceability and statutory obligations, issue binding legal campaign approvals, publish institutional policies, and inspect audit trails.",
    canCreateCampaigns: true,
    canManageProducts: true,
    canApproveCampaigns: true,
    canApprovePolicies: false,
    canPublishKnowledge: true,
    canManageTeamAndSettings: false,
  },
  {
    role: "RISK_OFFICER",
    label: "Risk Officer",
    shortLabel: "Risk",
    defenseLine: "SECOND_LINE",
    defenseLineLabel: "2nd Line — Risk",
    department: "Risk Management",
    description:
      "Assess enterprise and compliance risk exposure, validate control design, review policy drafts, and inspect audit trails.",
    canCreateCampaigns: false,
    canManageProducts: false,
    canApproveCampaigns: false,
    canApprovePolicies: false,
    canPublishKnowledge: false,
    canManageTeamAndSettings: false,
  },
  {
    role: "COMPLIANCE_ANALYST",
    label: "Compliance Analyst",
    shortLabel: "Analyst",
    defenseLine: "SECOND_LINE",
    defenseLineLabel: "2nd Line — Compliance",
    department: "Compliance",
    description:
      "Run audits, draft & redline compliance policies, run statutory QA checks, manage product rate cards, and escalate reviews to Legal or CCO.",
    canCreateCampaigns: true,
    canManageProducts: true,
    canApproveCampaigns: false,
    canApprovePolicies: false,
    canPublishKnowledge: false,
    canManageTeamAndSettings: false,
  },
  {
    role: "MARKETING_GROWTH",
    label: "Product & Marketing Manager",
    shortLabel: "Product Manager",
    defenseLine: "FIRST_LINE",
    defenseLineLabel: "1st Line — Business/Product",
    department: "Business / Product",
    description:
      "Create campaigns, manage product rate cards, review policy product impact, execute operationalization tasks, and complete attestations.",
    canCreateCampaigns: true,
    canManageProducts: true,
    canApproveCampaigns: false,
    canApprovePolicies: false,
    canPublishKnowledge: false,
    canManageTeamAndSettings: false,
  },
  {
    role: "OPERATIONS_LEAD",
    label: "Operations Lead",
    shortLabel: "Operations",
    defenseLine: "FIRST_LINE",
    defenseLineLabel: "1st Line — Operations",
    department: "Operations",
    description:
      "Assess operational feasibility during policy review, raise feasibility blockers, execute implementation tasks, and operate first-line controls.",
    canCreateCampaigns: false,
    canManageProducts: false,
    canApproveCampaigns: false,
    canApprovePolicies: false,
    canPublishKnowledge: false,
    canManageTeamAndSettings: false,
  },
  {
    role: "TECHNOLOGY_LEAD",
    label: "Technology & Engineering Lead",
    shortLabel: "Technology",
    defenseLine: "FIRST_LINE",
    defenseLineLabel: "1st Line — Technology",
    department: "Technology",
    description:
      "Review system and automation feasibility of policy requirements, flag technical blockers, and execute system configuration tasks.",
    canCreateCampaigns: false,
    canManageProducts: false,
    canApproveCampaigns: false,
    canApprovePolicies: false,
    canPublishKnowledge: false,
    canManageTeamAndSettings: false,
  },
  {
    role: "INFOSEC_LEAD",
    label: "Information Security Lead",
    shortLabel: "InfoSec",
    defenseLine: "FIRST_LINE",
    defenseLineLabel: "1st Line — InfoSec",
    department: "Information Security",
    description:
      "Review data protection, access control, and security implications of policies, manage security controls, and close remediation tasks.",
    canCreateCampaigns: false,
    canManageProducts: false,
    canApproveCampaigns: false,
    canApprovePolicies: false,
    canPublishKnowledge: false,
    canManageTeamAndSettings: false,
  },
  {
    role: "INTERNAL_AUDIT",
    label: "Internal Audit (Advisory Only)",
    shortLabel: "Internal Audit",
    defenseLine: "THIRD_LINE",
    defenseLineLabel: "3rd Line — Independent Assurance",
    department: "Internal Audit",
    description:
      "Provide independent control-design observations and inspect immutable audit trails. Strictly prohibited from approving or publishing policies to preserve 3rd-line independence.",
    isAdvisoryOnly: true,
    canCreateCampaigns: false,
    canManageProducts: false,
    canApproveCampaigns: false,
    canApprovePolicies: false,
    canPublishKnowledge: false,
    canManageTeamAndSettings: false,
  },
  {
    role: "COMMITTEE_MEMBER",
    label: "Management Committee Approver",
    shortLabel: "Mgmt Committee",
    defenseLine: "GOVERNANCE",
    defenseLineLabel: "Governance — Management Committee",
    department: "Executive Management",
    description:
      "Exercise delegated Management Committee approval authority for Tier 2 operational policies and review Tier 3 Board submissions.",
    canCreateCampaigns: false,
    canManageProducts: false,
    canApproveCampaigns: false,
    canApprovePolicies: true,
    policyApprovalTier: "TIER_2_COMMITTEE",
    canPublishKnowledge: false,
    canManageTeamAndSettings: false,
  },
  {
    role: "BOARD_MEMBER",
    label: "Board of Directors Approver",
    shortLabel: "Board",
    defenseLine: "GOVERNANCE",
    defenseLineLabel: "Governance — Board of Directors",
    department: "Board of Directors",
    description:
      "Exercise ultimate Board approval authority for statutory Tier 3 policies (e.g., CBN AML/CFT/CPF, Enterprise Risk, Data Protection) and review Board packs.",
    canCreateCampaigns: false,
    canManageProducts: false,
    canApproveCampaigns: false,
    canApprovePolicies: true,
    policyApprovalTier: "TIER_3_BOARD",
    canPublishKnowledge: false,
    canManageTeamAndSettings: false,
  },
  {
    role: "WORKSPACE_ADMIN",
    label: "Workspace Admin",
    shortLabel: "IT Admin",
    defenseLine: "PLATFORM_ADMIN",
    defenseLineLabel: "Platform Administration",
    department: "IT Administration",
    description:
      "Manage organization details, team roles, billing, and regulatory playbooks (restricted from campaign drafting and policy/campaign approvals).",
    canCreateCampaigns: false,
    canManageProducts: true,
    canApproveCampaigns: false,
    canApprovePolicies: false,
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
