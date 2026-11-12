/**
 * Cogent Marketing Shield - Authoritative Role-to-Permission Matrix
 * Document Reference: Document 07 (Section 5.2) & Document 08 (Phase 3)
 */

import { CanonicalRole, PermissionKey } from "./types";

/**
 * The authoritative 22-permission mapping for all 5 canonical enterprise roles.
 * Modifying this matrix requires a formal regulatory audit sign-off.
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
    "tenant.admin",
    "user.manage",
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

  // Custom roles
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
