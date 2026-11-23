/**
 * Cogent Marketing Shield - Authoritative Role-to-Permission Matrix
 * Document Reference: Document 07 (Section 5.2) & Document 08 (Phase 3)
 */

import { CanonicalRole, PermissionKey } from "./types";

/**
 * Authoritative Three Lines of Defense Role-to-Permission Matrix (17 Roles x 45 Permissions).
 * Unifies Campaign Clearance, Policy Workflow OS, and Product Feature Governance (NPA).
 */
export const ROLE_PERMISSIONS: Readonly<Record<CanonicalRole, ReadonlySet<PermissionKey>>> = {
  // ---------------------------------------------------------------------------
  // FIRST LINE OF DEFENCE (Business, Product, Engineering, Tech, Ops, InfoSec)
  // ---------------------------------------------------------------------------
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
    "expansion.read",
    "expansion.manage",
    "feature.create",
    "feature.read",
    "feature.update",
    "feature.evidence.attach",
    "feature.gate.submit",
    "feature.change.assess",
  ]),

  PRODUCT_MANAGER: new Set<PermissionKey>([
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
    "expansion.read",
    "expansion.manage",
    "feature.create",
    "feature.read",
    "feature.update",
    "feature.control.manage",
    "feature.evidence.attach",
    "feature.gate.submit",
    "feature.pir.manage",
    "feature.change.assess",
  ]),

  ENGINEERING_LEAD: new Set<PermissionKey>([
    "conversation.create",
    "conversation.read",
    "intelligence.live_web.search",
    "campaign.read",
    "asset.upload",
    "assessment.read",
    "review.comment",
    "dossier.download",
    "policy.read",
    "policy.review",
    "policy.tasks.manage",
    "policy.attest",
    "expansion.read",
    "expansion.manage",
    "feature.read",
    "feature.update",
    "feature.evidence.attach",
    "feature.change.assess",
  ]),

  OPERATIONS_LEAD: new Set<PermissionKey>([
    "conversation.create",
    "conversation.read",
    "intelligence.live_web.search",
    "campaign.read",
    "asset.upload",
    "assessment.read",
    "review.comment",
    "dossier.download",
    "policy.read",
    "policy.review",
    "policy.tasks.manage",
    "policy.attest",
    "expansion.read",
    "expansion.manage",
    "feature.read",
    "feature.update",
    "feature.evidence.attach",
    "feature.pir.manage",
    "feature.change.assess",
  ]),

  TECHNOLOGY_LEAD: new Set<PermissionKey>([
    "conversation.create",
    "conversation.read",
    "intelligence.live_web.search",
    "campaign.read",
    "asset.upload",
    "assessment.read",
    "review.comment",
    "dossier.download",
    "policy.read",
    "policy.review",
    "policy.tasks.manage",
    "policy.attest",
    "expansion.read",
    "expansion.manage",
    "feature.read",
    "feature.update",
    "feature.evidence.attach",
    "feature.change.assess",
  ]),

  INFOSEC_LEAD: new Set<PermissionKey>([
    "conversation.create",
    "conversation.read",
    "intelligence.live_web.search",
    "campaign.read",
    "asset.upload",
    "assessment.read",
    "review.comment",
    "dossier.download",
    "policy.read",
    "policy.review",
    "policy.controls.manage",
    "policy.tasks.manage",
    "policy.attest",
    "expansion.read",
    "expansion.manage",
    "expansion.validate",
    "feature.read",
    "feature.update",
    "feature.evidence.attach",
    "feature.change.assess",
  ]),

  // ---------------------------------------------------------------------------
  // SECOND LINE OF DEFENCE (Compliance, Risk, AML/Fraud, InfoSec, Legal, CCO)
  // ---------------------------------------------------------------------------
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
    "expansion.read",
    "expansion.create",
    "expansion.manage",
    "expansion.validate",
    "feature.create",
    "feature.read",
    "feature.update",
    "feature.control.manage",
    "feature.control.verify",
    "feature.evidence.attach",
    "feature.gate.submit",
    "feature.pir.manage",
    "feature.change.assess",
  ]),

  RISK_OFFICER: new Set<PermissionKey>([
    "conversation.create",
    "conversation.read",
    "intelligence.live_web.search",
    "campaign.read",
    "asset.upload",
    "assessment.read",
    "review.comment",
    "review.escalate",
    "dossier.generate",
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
    "expansion.read",
    "expansion.create",
    "expansion.manage",
    "expansion.validate",
    "audit.read",
    "feature.create",
    "feature.read",
    "feature.update",
    "feature.control.manage",
    "feature.control.verify",
    "feature.evidence.attach",
    "feature.gate.decide",
    "feature.pir.manage",
    "feature.change.assess",
  ]),

  AML_FRAUD_OFFICER: new Set<PermissionKey>([
    "conversation.create",
    "conversation.read",
    "intelligence.live_web.search",
    "campaign.read",
    "asset.upload",
    "assessment.read",
    "review.comment",
    "review.escalate",
    "dossier.generate",
    "dossier.download",
    "knowledge.write",
    "policy.read",
    "policy.review",
    "policy.controls.manage",
    "policy.attest",
    "expansion.read",
    "expansion.manage",
    "expansion.validate",
    "audit.read",
    "feature.read",
    "feature.update",
    "feature.control.manage",
    "feature.control.verify",
    "feature.evidence.attach",
    "feature.gate.decide",
    "feature.pir.manage",
    "feature.change.assess",
  ]),

  INFOSEC_OFFICER: new Set<PermissionKey>([
    "conversation.create",
    "conversation.read",
    "intelligence.live_web.search",
    "campaign.read",
    "asset.upload",
    "assessment.read",
    "review.comment",
    "review.escalate",
    "dossier.generate",
    "dossier.download",
    "knowledge.write",
    "policy.read",
    "policy.review",
    "policy.controls.manage",
    "policy.attest",
    "expansion.read",
    "expansion.manage",
    "expansion.validate",
    "audit.read",
    "feature.read",
    "feature.update",
    "feature.control.manage",
    "feature.control.verify",
    "feature.evidence.attach",
    "feature.gate.decide",
    "feature.pir.manage",
    "feature.change.assess",
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
    "expansion.read",
    "expansion.create",
    "expansion.manage",
    "expansion.validate",
    "audit.read",
    "feature.create",
    "feature.read",
    "feature.update",
    "feature.control.manage",
    "feature.control.verify",
    "feature.evidence.attach",
    "feature.gate.submit",
    "feature.gate.decide",
    "feature.pir.manage",
    "feature.change.assess",
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
    "expansion.read",
    "expansion.create",
    "expansion.manage",
    "expansion.validate",
    "expansion.approve.cco",
    "tenant.admin",
    "user.manage",
    "audit.read",
    "feature.create",
    "feature.read",
    "feature.update",
    "feature.control.manage",
    "feature.control.verify",
    "feature.evidence.attach",
    "feature.gate.submit",
    "feature.gate.decide",
    "feature.pir.manage",
    "feature.change.assess",
  ]),

  // ---------------------------------------------------------------------------
  // THIRD LINE OF DEFENCE (Independent Assurance — Strictly Advisory / Read-Only)
  // ---------------------------------------------------------------------------
  INTERNAL_AUDIT: new Set<PermissionKey>([
    "conversation.create",
    "conversation.read",
    "campaign.read",
    "assessment.read",
    "review.comment",
    "dossier.download",
    "policy.read",
    "policy.review",
    "policy.attest",
    "expansion.read",
    "audit.read",
    "feature.read",
    "audit.assurance_note",
  ]),

  INTERNAL_AUDITOR: new Set<PermissionKey>([
    "conversation.read",
    "campaign.read",
    "assessment.read",
    "dossier.download",
    "policy.read",
    "expansion.read",
    "audit.read",
    "feature.read",
    "audit.assurance_note",
  ]),

  // ---------------------------------------------------------------------------
  // DELEGATED GOVERNANCE AUTHORITIES (Management Committee & Board)
  // ---------------------------------------------------------------------------
  COMMITTEE_MEMBER: new Set<PermissionKey>([
    "conversation.create",
    "conversation.read",
    "campaign.read",
    "assessment.read",
    "review.comment",
    "dossier.download",
    "policy.read",
    "policy.review",
    "policy.approve.committee",
    "policy.attest",
    "expansion.read",
    "expansion.approve.committee",
    "audit.read",
    "feature.read",
  ]),

  BOARD_MEMBER: new Set<PermissionKey>([
    "conversation.read",
    "campaign.read",
    "assessment.read",
    "dossier.download",
    "policy.read",
    "policy.approve.board",
    "policy.attest",
    "expansion.read",
    "expansion.approve.board",
    "audit.read",
    "feature.read",
  ]),

  // ---------------------------------------------------------------------------
  // PLATFORM ADMINISTRATION
  // ---------------------------------------------------------------------------
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
    "expansion.read",
    "tenant.admin",
    "user.manage",
    "audit.read",
    "feature.read",
  ]),
};

/**
 * Maps raw Clerk Organization role strings to our CanonicalRole enum.
 * Supports custom Three Lines of Defence Clerk roles and default Clerk roles (`org:admin`, `org:member`).
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
    normalized === "org:aml_fraud_officer" ||
    normalized === "aml_fraud_officer" ||
    normalized === "mlro" ||
    normalized === "aml" ||
    normalized === "org:aml"
  ) {
    return "AML_FRAUD_OFFICER";
  }

  if (
    normalized === "org:infosec_officer" ||
    normalized === "infosec_officer" ||
    normalized === "ciso" ||
    normalized === "org:infosec"
  ) {
    return "INFOSEC_OFFICER";
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
    normalized === "org:operations_lead" ||
    normalized === "operations_lead" ||
    normalized === "operations" ||
    normalized === "ops" ||
    normalized === "org:operations"
  ) {
    return "OPERATIONS_LEAD";
  }

  if (
    normalized === "org:product_manager" ||
    normalized === "product_manager" ||
    normalized === "product" ||
    normalized === "org:product"
  ) {
    return "PRODUCT_MANAGER";
  }

  if (
    normalized === "org:engineering_lead" ||
    normalized === "engineering_lead" ||
    normalized === "org:engineering"
  ) {
    return "ENGINEERING_LEAD";
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
    normalized === "org:internal_auditor" ||
    normalized === "internal_auditor" ||
    normalized === "auditor" ||
    normalized === "org:audit"
  ) {
    return "INTERNAL_AUDITOR";
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
