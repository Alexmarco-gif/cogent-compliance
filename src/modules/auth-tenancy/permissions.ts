/**
 * Cogent Marketing Shield - Authoritative Role-to-Permission Matrix
 * Document Reference: Document 07 (Section 5.2) & Document 08 (Phase 3)
 */

import { CanonicalRole, PermissionKey } from "./types";

/**
 * Authoritative Three Lines of Defense Role-to-Permission Matrix.
 * - First Line (Business / Ops / Tech / InfoSec): Review feasibility, execute tasks, attest.
 * - Second Line (Compliance / Risk / Legal / CCO): Draft, validate statutory QA, govern controls, CCO approval.
 * - Third Line (Internal Audit): Strictly advisory commentary & audit read-only; NEVER approves or publishes.
 * - Governance (Management Committee / Board): Delegated approval authority per institutional DoA.
 */
export const ROLE_PERMISSIONS: Readonly<Record<CanonicalRole, ReadonlySet<PermissionKey>>> = {
  MARKETING_GROWTH: new Set<PermissionKey>([
    "conversation.create",
    "conversation.read",
    "intelligence.live_web.search",
    "campaign.create",
    "campaign.read",
    "asset.upload",
    "assessment.read",
    "revision.propose",
    "revision.accept",
    "revision.create",
    "campaign.submit_review",
    "review.comment",
    "dossier.generate",
    "dossier.download",
    "product.write",
    "policy.read",
    "policy.review",
    "policy.tasks.manage",
    "policy.attest",
  ]),

  OPERATIONS_LEAD: new Set<PermissionKey>([
    "conversation.create",
    "conversation.read",
    "intelligence.live_web.search",
    "asset.upload",
    "assessment.read",
    "review.comment",
    "policy.read",
    "policy.review",
    "policy.tasks.manage",
    "policy.attest",
  ]),

  TECHNOLOGY_LEAD: new Set<PermissionKey>([
    "conversation.create",
    "conversation.read",
    "intelligence.live_web.search",
    "asset.upload",
    "assessment.read",
    "review.comment",
    "policy.read",
    "policy.review",
    "policy.tasks.manage",
    "policy.attest",
  ]),

  INFOSEC_LEAD: new Set<PermissionKey>([
    "conversation.create",
    "conversation.read",
    "intelligence.live_web.search",
    "asset.upload",
    "assessment.read",
    "review.comment",
    "policy.read",
    "policy.review",
    "policy.controls.manage",
    "policy.tasks.manage",
    "policy.attest",
  ]),

  COMPLIANCE_ANALYST: new Set<PermissionKey>([
    "conversation.create",
    "conversation.read",
    "intelligence.live_web.search",
    "campaign.create",
    "campaign.read",
    "asset.upload",
    "assessment.read",
    "revision.propose",
    "revision.accept",
    "revision.create",
    "campaign.submit_review",
    "review.comment",
    "review.escalate",
    "dossier.generate",
    "dossier.download",
    "knowledge.write",
    "product.write",
    "policy.read",
    "policy.create",
    "policy.draft",
    "policy.review",
    "policy.validate_qa",
    "policy.controls.manage",
    "policy.tasks.manage",
    "policy.attest",
  ]),

  RISK_OFFICER: new Set<PermissionKey>([
    "conversation.create",
    "conversation.read",
    "intelligence.live_web.search",
    "asset.upload",
    "assessment.read",
    "review.comment",
    "review.escalate",
    "dossier.download",
    "knowledge.write",
    "policy.read",
    "policy.create",
    "policy.draft",
    "policy.review",
    "policy.validate_qa",
    "policy.controls.manage",
    "policy.tasks.manage",
    "policy.attest",
    "audit.read",
  ]),

  LEGAL_COUNSEL: new Set<PermissionKey>([
    "conversation.create",
    "conversation.read",
    "intelligence.live_web.search",
    "campaign.create",
    "campaign.read",
    "asset.upload",
    "assessment.read",
    "revision.propose",
    "revision.accept",
    "revision.create",
    "campaign.submit_review",
    "review.comment",
    "review.escalate",
    "approval.decide",
    "dossier.generate",
    "dossier.download",
    "knowledge.write",
    "knowledge.publish",
    "product.write",
    "policy.read",
    "policy.create",
    "policy.draft",
    "policy.review",
    "policy.validate_qa",
    "policy.publish",
    "policy.controls.manage",
    "policy.tasks.manage",
    "policy.attest",
    "audit.read",
  ]),

  CHIEF_COMPLIANCE_OFFICER: new Set<PermissionKey>([
    "conversation.create",
    "conversation.read",
    "intelligence.live_web.search",
    "campaign.create",
    "campaign.read",
    "asset.upload",
    "assessment.read",
    "revision.propose",
    "revision.accept",
    "revision.create",
    "campaign.submit_review",
    "review.comment",
    "review.escalate",
    "approval.decide",
    "dossier.generate",
    "dossier.download",
    "knowledge.write",
    "knowledge.publish",
    "product.write",
    "policy.read",
    "policy.create",
    "policy.draft",
    "policy.review",
    "policy.validate_qa",
    "policy.approve.cco",
    "policy.publish",
    "policy.controls.manage",
    "policy.tasks.manage",
    "policy.attest",
    "tenant.admin",
    "user.manage",
    "audit.read",
  ]),

  // Third Line of Defense: Independent Assurance — Strictly Advisory Only (zero approval/publish/draft authority)
  INTERNAL_AUDIT: new Set<PermissionKey>([
    "conversation.create",
    "conversation.read",
    "assessment.read",
    "review.comment",
    "dossier.download",
    "policy.read",
    "policy.review",
    "policy.attest",
    "audit.read",
  ]),

  // Delegated Governance: Management Committee Approver
  COMMITTEE_MEMBER: new Set<PermissionKey>([
    "conversation.create",
    "conversation.read",
    "assessment.read",
    "review.comment",
    "dossier.download",
    "policy.read",
    "policy.review",
    "policy.approve.committee",
    "policy.attest",
    "audit.read",
  ]),

  // Delegated Governance: Board of Directors Approver
  BOARD_MEMBER: new Set<PermissionKey>([
    "conversation.read",
    "assessment.read",
    "dossier.download",
    "policy.read",
    "policy.approve.board",
    "policy.attest",
    "audit.read",
  ]),

  WORKSPACE_ADMIN: new Set<PermissionKey>([
    "conversation.create",
    "conversation.read",
    "intelligence.live_web.search",
    "campaign.read",
    "asset.upload",
    "assessment.read",
    "dossier.generate",
    "dossier.download",
    "knowledge.write",
    "knowledge.publish",
    "product.write",
    "policy.read",
    "policy.attest",
    "tenant.admin",
    "user.manage",
    "audit.read",
  ]),
};

/**
 * Maps raw Clerk Organization role strings to our CanonicalRole enum.
 * Supports both custom Clerk roles and default Clerk roles (`org:admin`, `org:member`).
 */
export function mapClerkRoleToCanonical(clerkRole: string | null | undefined): CanonicalRole {
  if (!clerkRole) {
    return "MARKETING_GROWTH";
  }

  const normalized = clerkRole.toLowerCase().trim();

  if (
    normalized === "org:chief_compliance_officer" ||
    normalized === "chief_compliance_officer" ||
    normalized === "cco" ||
    normalized === "org:cco"
  ) {
    return "CHIEF_COMPLIANCE_OFFICER";
  }

  if (
    normalized === "org:legal_counsel" ||
    normalized === "legal_counsel" ||
    normalized === "legal" ||
    normalized === "org:legal"
  ) {
    return "LEGAL_COUNSEL";
  }

  if (
    normalized === "org:compliance_analyst" ||
    normalized === "compliance_analyst" ||
    normalized === "compliance" ||
    normalized === "org:compliance"
  ) {
    return "COMPLIANCE_ANALYST";
  }

  if (
    normalized === "org:risk_officer" ||
    normalized === "risk_officer" ||
    normalized === "risk" ||
    normalized === "org:risk"
  ) {
    return "RISK_OFFICER";
  }

  if (
    normalized === "org:operations_lead" ||
    normalized === "operations_lead" ||
    normalized === "operations" ||
    normalized === "ops"
  ) {
    return "OPERATIONS_LEAD";
  }

  if (
    normalized === "org:technology_lead" ||
    normalized === "technology_lead" ||
    normalized === "technology" ||
    normalized === "engineering"
  ) {
    return "TECHNOLOGY_LEAD";
  }

  if (
    normalized === "org:infosec_lead" ||
    normalized === "infosec_lead" ||
    normalized === "infosec" ||
    normalized === "security"
  ) {
    return "INFOSEC_LEAD";
  }

  if (
    normalized === "org:internal_audit" ||
    normalized === "internal_audit" ||
    normalized === "audit"
  ) {
    return "INTERNAL_AUDIT";
  }

  if (
    normalized === "org:committee_member" ||
    normalized === "committee_member" ||
    normalized === "management_committee"
  ) {
    return "COMMITTEE_MEMBER";
  }

  if (
    normalized === "org:board_member" ||
    normalized === "board_member" ||
    normalized === "board"
  ) {
    return "BOARD_MEMBER";
  }

  if (
    normalized === "org:workspace_admin" ||
    normalized === "workspace_admin" ||
    normalized === "org:super_admin" ||
    normalized === "org:admin" ||
    normalized === "admin"
  ) {
    return "WORKSPACE_ADMIN";
  }

  if (
    normalized === "org:marketing_growth" ||
    normalized === "marketing_growth" ||
    normalized === "marketing" ||
    normalized === "org:marketing" ||
    normalized === "org:member" ||
    normalized === "member"
  ) {
    return "MARKETING_GROWTH";
  }

  return "MARKETING_GROWTH";
}

/**
 * Returns the immutable permission set for any given canonical role.
 */
export function getPermissionsForRole(role: CanonicalRole): ReadonlySet<PermissionKey> {
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) {
    return new Set<PermissionKey>();
  }
  return permissions;
}
