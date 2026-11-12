/**
 * Cogent Marketing Shield - Authoritative RBAC & Multi-Tenant Types
 * Document Reference: Document 07 (Section 5) & Document 08 (Phase 3)
 */

export const CANONICAL_ROLES = [
  "MARKETING_GROWTH",
  "COMPLIANCE_ANALYST",
  "LEGAL_COUNSEL",
  "CHIEF_COMPLIANCE_OFFICER",
  "WORKSPACE_ADMIN",
] as const;

export type CanonicalRole = (typeof CANONICAL_ROLES)[number];

export const PERMISSION_KEYS = [
  // Conversational Copilot
  "conversation.create",
  "conversation.read",
  "intelligence.live_web.search",

  // Campaigns & Assets
  "campaign.create",
  "campaign.read",
  "asset.upload",
  "assessment.read",

  // Revisions & Review
  "revision.propose",
  "revision.accept",
  "revision.create",
  "campaign.submit_review",
  "review.comment",
  "review.escalate",

  // Approvals (Separation of Duties Gate)
  "approval.decide",

  // Dossiers
  "dossier.generate",
  "dossier.download",

  // Knowledge & Playbooks
  "knowledge.write",
  "knowledge.publish",
  "product.write",

  // Administration & Audit
  "tenant.admin",
  "user.manage",
  "audit.read",
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export type TenantMembershipStatus = "ACTIVE" | "SUSPENDED" | "INVITED";

export type TenantStatus = "ACTIVE" | "SUSPENDED" | "ARCHIVED";

export interface TenantContext {
  /** Internal UUID of the tenant institution in Supabase `tenants` table */
  readonly tenantId: string;
  /** Internal UUID of the user in Supabase `tenant_memberships` table */
  readonly userId: string;
  /** Primary Clerk Organization ID (e.g., 'org_xxx') */
  readonly clerkOrgId: string;
  /** Primary Clerk User ID (e.g., 'user_xxx') */
  readonly clerkUserId: string;
  /** Institutional organization slug */
  readonly orgSlug: string;
  /** Institutional organization name */
  readonly orgName: string;
  /** Resolved canonical RBAC role */
  readonly role: CanonicalRole;
  /** Authoritative immutable set of permissions granted to this role */
  readonly permissions: ReadonlySet<PermissionKey>;
  /** Membership status */
  readonly status: TenantMembershipStatus;
}

export type AuthErrorCode =
  | "UNAUTHENTICATED"
  | "TENANT_CONTEXT_INVALID"
  | "TENANT_SUSPENDED"
  | "FORBIDDEN"
  | "APPROVAL_NOT_PERMITTED"
  | "SELF_APPROVAL_VIOLATION";

export class AuthTenancyError extends Error {
  public readonly code: AuthErrorCode;
  public readonly statusCode: number;

  constructor(code: AuthErrorCode, message: string, statusCode: number = 403) {
    super(message);
    this.name = "AuthTenancyError";
    this.code = code;
    this.statusCode = statusCode;
  }
}
