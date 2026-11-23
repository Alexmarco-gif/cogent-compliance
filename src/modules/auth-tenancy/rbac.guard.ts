/**
 * Cogent Marketing Shield - Server-Side RBAC Guard & Separation of Duties
 * Document Reference: Document 07 (Section 5) & Document 08 (Phase 3)
 */

import { AuthTenancyError, PermissionKey, TenantContext } from "./types";

/**
 * Authoritatively checks if a tenant context possesses a required permission.
 */
export function hasPermission(ctx: TenantContext, permission: PermissionKey): boolean {
  if (ctx.status !== "ACTIVE") {
    return false;
  }
  return ctx.permissions.has(permission);
}

/**
 * Centralized RBAC guard enforcing permission checks.
 * Throws a typed AuthTenancyError with HTTP status 403 on denial.
 */
export function requirePermission(ctx: TenantContext, required: PermissionKey): void {
  if (ctx.status === "SUSPENDED") {
    throw new AuthTenancyError(
      "TENANT_SUSPENDED",
      `Membership for user ${ctx.clerkUserId} in tenant ${ctx.orgSlug} is SUSPENDED`,
      403,
    );
  }

  if (!hasPermission(ctx, required)) {
    // Specific business error code for approvals
    if (required === "approval.decide") {
      throw new AuthTenancyError(
        "APPROVAL_NOT_PERMITTED",
        `Role ${ctx.role} is not authorized to approve or reject compliance revisions. Only Legal Counsel and Chief Compliance Officer hold approval authority.`,
        403,
      );
    }

    throw new AuthTenancyError(
      "FORBIDDEN",
      `Role ${ctx.role} lacks required permission: ${required}`,
      403,
    );
  }
}

/**
 * Enforces Document 07 Section 5.3 Anti-Self-Approval & Dual Control Rule:
 * A compliance officer or legal counsel cannot approve a campaign revision that they personally authored.
 *
 * @param ctx The authenticated officer attempting approval
 * @param revisionCreatedBy The user ID or Clerk user ID who authored the revision
 * @param enforceDualControl Whether dual-control is active for this tenant (default true)
 */
export function assertAntiSelfApproval(
  ctx: TenantContext,
  revisionCreatedBy: string,
  enforceDualControl: boolean = true,
): void {
  if (!enforceDualControl) {
    return;
  }

  const isSelf =
    ctx.userId === revisionCreatedBy ||
    ctx.clerkUserId === revisionCreatedBy;

  if (isSelf) {
    throw new AuthTenancyError(
      "SELF_APPROVAL_VIOLATION",
      `Anti-Self-Approval Violation: User ${ctx.clerkUserId} authored this campaign revision and cannot approve it under institutional dual-control policy. A second authorized officer must review and sign off.`,
      403,
    );
  }
}

/**
 * Convenience composite gate for revision approval endpoints.
 * Verifies both `approval.decide` permission AND dual-control anti-self-approval.
 */
export function assertCanApprove(
  ctx: TenantContext,
  revisionCreatedBy: string,
  enforceDualControl: boolean = true,
): void {
  requirePermission(ctx, "approval.decide");
  assertAntiSelfApproval(ctx, revisionCreatedBy, enforceDualControl);
}

/**
 * Three Lines of Defense Independence Gate:
 * Internal Audit (3rd Line) provides independent assurance and advisory commentary only.
 * It must NEVER hold formal approval or publication authority over policies it will later audit.
 */
export function assertNotInternalAuditApprover(ctx: TenantContext): void {
  if (ctx.role === "INTERNAL_AUDIT") {
    throw new AuthTenancyError(
      "AUDIT_INDEPENDENCE_VIOLATION",
      "Three Lines of Defense Violation: Internal Audit (3rd Line) is strictly advisory-only and cannot formally approve or publish compliance policies to preserve audit independence.",
      403,
    );
  }
}

/**
 * Delegated Policy Approval Authority Gate:
 * Enforces:
 * 1. Internal Audit independence (always blocked from approving).
 * 2. Exact DoA tier permission matching the approval step (CCO / Management Committee / Board).
 * 3. Optional dual-control anti-self-approval (policy version drafter cannot self-approve).
 */
export function assertPolicyApprovalAuthority(
  ctx: TenantContext,
  requiredApproverRole: "CHIEF_COMPLIANCE_OFFICER" | "COMMITTEE_MEMBER" | "BOARD_MEMBER",
  versionCreatedBy?: string | null,
  enforceDualControl: boolean = true,
): void {
  assertNotInternalAuditApprover(ctx);

  const requiredPermission: PermissionKey =
    requiredApproverRole === "CHIEF_COMPLIANCE_OFFICER"
      ? "policy.approve.cco"
      : requiredApproverRole === "COMMITTEE_MEMBER"
        ? "policy.approve.committee"
        : "policy.approve.board";

  if (!hasPermission(ctx, requiredPermission)) {
    throw new AuthTenancyError(
      "APPROVAL_NOT_PERMITTED",
      `Role ${ctx.role} lacks delegated approval authority (${requiredPermission}) for step requiring ${requiredApproverRole}.`,
      403,
    );
  }

  if (versionCreatedBy) {
    assertAntiSelfApproval(ctx, versionCreatedBy, enforceDualControl);
  }
}
