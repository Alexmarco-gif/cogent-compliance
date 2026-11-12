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
