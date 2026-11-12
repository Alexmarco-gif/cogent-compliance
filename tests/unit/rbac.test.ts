/**
 * Cogent Marketing Shield - RBAC & Separation of Duties Unit Test Suite
 * Document Reference: Document 07 (Section 5) & Document 08 (Phase 3)
 */

import { describe, it, expect } from "vitest";
import {
  CANONICAL_ROLES,
  PERMISSION_KEYS,
  CanonicalRole,
  PermissionKey,
  TenantContext,
  AuthTenancyError,
} from "@/modules/auth-tenancy/types";
import {
  ROLE_PERMISSIONS,
  getPermissionsForRole,
  mapClerkRoleToCanonical,
} from "@/modules/auth-tenancy/permissions";
import {
  hasPermission,
  requirePermission,
  assertAntiSelfApproval,
  assertCanApprove,
} from "@/modules/auth-tenancy/rbac.guard";

describe("Role-Based Access Control (RBAC) Specification Compliance", () => {
  it("should define exactly 5 canonical roles and 22 permission keys", () => {
    expect(CANONICAL_ROLES).toHaveLength(5);
    expect(PERMISSION_KEYS).toHaveLength(22);
  });

  describe("Role Permission Matrix Verification", () => {
    // Helper to create test context
    function createTestContext(
      role: CanonicalRole,
      status: "ACTIVE" | "SUSPENDED" = "ACTIVE",
      userId: string = "user_officer_01",
    ): TenantContext {
      return {
        tenantId: "11111111-1111-1111-1111-111111111111",
        userId,
        clerkOrgId: "org_access_bank",
        clerkUserId: userId,
        orgSlug: "access-bank",
        orgName: "Access Bank Plc",
        role,
        permissions: getPermissionsForRole(role),
        status,
      };
    }

    it("MARKETING_GROWTH: should allow campaign creation and revisions, but STRICTLY DENY approval.decide", () => {
      const ctx = createTestContext("MARKETING_GROWTH");

      // Allowed
      expect(hasPermission(ctx, "conversation.create")).toBe(true);
      expect(hasPermission(ctx, "campaign.create")).toBe(true);
      expect(hasPermission(ctx, "revision.propose")).toBe(true);
      expect(hasPermission(ctx, "campaign.submit_review")).toBe(true);
      expect(hasPermission(ctx, "dossier.download")).toBe(true);

      // Strictly Denied
      expect(hasPermission(ctx, "approval.decide")).toBe(false);
      expect(hasPermission(ctx, "knowledge.publish")).toBe(false);
      expect(hasPermission(ctx, "user.manage")).toBe(false);
      expect(hasPermission(ctx, "audit.read")).toBe(false);

      // requirePermission throws APPROVAL_NOT_PERMITTED on approval.decide
      expect(() => requirePermission(ctx, "approval.decide")).toThrowError(
        expect.objectContaining({
          code: "APPROVAL_NOT_PERMITTED",
          statusCode: 403,
        }),
      );
    });

    it("COMPLIANCE_ANALYST: should allow review, drafting playbooks, but STRICTLY DENY approval.decide", () => {
      const ctx = createTestContext("COMPLIANCE_ANALYST");

      // Allowed
      expect(hasPermission(ctx, "campaign.read")).toBe(true);
      expect(hasPermission(ctx, "review.escalate")).toBe(true);
      expect(hasPermission(ctx, "knowledge.write")).toBe(true);
      expect(hasPermission(ctx, "product.write")).toBe(true);

      // Strictly Denied
      expect(hasPermission(ctx, "approval.decide")).toBe(false);
      expect(hasPermission(ctx, "knowledge.publish")).toBe(false);
      expect(hasPermission(ctx, "tenant.admin")).toBe(false);
      expect(hasPermission(ctx, "audit.read")).toBe(false);

      expect(() => requirePermission(ctx, "approval.decide")).toThrowError(
        expect.objectContaining({
          code: "APPROVAL_NOT_PERMITTED",
          statusCode: 403,
        }),
      );
    });

    it("LEGAL_COUNSEL: should hold approval authority (approval.decide) and publish playbooks", () => {
      const ctx = createTestContext("LEGAL_COUNSEL");

      // Allowed
      expect(hasPermission(ctx, "approval.decide")).toBe(true);
      expect(hasPermission(ctx, "knowledge.publish")).toBe(true);
      expect(hasPermission(ctx, "audit.read")).toBe(true);
      expect(hasPermission(ctx, "campaign.submit_review")).toBe(true);

      // Denied
      expect(hasPermission(ctx, "tenant.admin")).toBe(false);
      expect(hasPermission(ctx, "user.manage")).toBe(false);

      expect(() => requirePermission(ctx, "approval.decide")).not.toThrow();
    });

    it("CHIEF_COMPLIANCE_OFFICER: should hold full compliance and approval authority", () => {
      const ctx = createTestContext("CHIEF_COMPLIANCE_OFFICER");

      // Allowed
      expect(hasPermission(ctx, "approval.decide")).toBe(true);
      expect(hasPermission(ctx, "knowledge.publish")).toBe(true);
      expect(hasPermission(ctx, "audit.read")).toBe(true);
      expect(hasPermission(ctx, "tenant.admin")).toBe(true);
      expect(hasPermission(ctx, "user.manage")).toBe(true);

      expect(() => requirePermission(ctx, "approval.decide")).not.toThrow();
      expect(() => requirePermission(ctx, "audit.read")).not.toThrow();
    });

    it("WORKSPACE_ADMIN: should manage users and tenants, but CANNOT create campaigns or decide approvals", () => {
      const ctx = createTestContext("WORKSPACE_ADMIN");

      // Allowed
      expect(hasPermission(ctx, "tenant.admin")).toBe(true);
      expect(hasPermission(ctx, "user.manage")).toBe(true);
      expect(hasPermission(ctx, "knowledge.publish")).toBe(true);
      expect(hasPermission(ctx, "audit.read")).toBe(true);

      // Strictly Denied (Separation of duties)
      expect(hasPermission(ctx, "campaign.create")).toBe(false);
      expect(hasPermission(ctx, "revision.propose")).toBe(false);
      expect(hasPermission(ctx, "approval.decide")).toBe(false);

      expect(() => requirePermission(ctx, "campaign.create")).toThrowError(
        expect.objectContaining({
          code: "FORBIDDEN",
          statusCode: 403,
        }),
      );
    });
  });

  describe("Suspended Membership Handling", () => {
    it("should fail-closed and deny all permissions if membership is SUSPENDED", () => {
      const ctx: TenantContext = {
        tenantId: "11111111-1111-1111-1111-111111111111",
        userId: "user_suspended_01",
        clerkOrgId: "org_access_bank",
        clerkUserId: "user_suspended_01",
        orgSlug: "access-bank",
        orgName: "Access Bank Plc",
        role: "CHIEF_COMPLIANCE_OFFICER", // Even CCO role is blocked
        permissions: getPermissionsForRole("CHIEF_COMPLIANCE_OFFICER"),
        status: "SUSPENDED",
      };

      expect(hasPermission(ctx, "conversation.read")).toBe(false);
      expect(hasPermission(ctx, "approval.decide")).toBe(false);

      expect(() => requirePermission(ctx, "conversation.read")).toThrowError(
        expect.objectContaining({
          code: "TENANT_SUSPENDED",
          statusCode: 403,
        }),
      );
    });
  });

  describe("Anti-Self-Approval & Dual Control Verification (Document 07 Section 5.3)", () => {
    it("should block an officer from approving a campaign revision they personally authored", () => {
      const authorUserId = "user_officer_adebayo";
      const approverCtx: TenantContext = {
        tenantId: "11111111-1111-1111-1111-111111111111",
        userId: authorUserId,
        clerkOrgId: "org_zenith_bank",
        clerkUserId: authorUserId,
        orgSlug: "zenith-bank",
        orgName: "Zenith Bank Plc",
        role: "CHIEF_COMPLIANCE_OFFICER",
        permissions: getPermissionsForRole("CHIEF_COMPLIANCE_OFFICER"),
        status: "ACTIVE",
      };

      // Adebayo attempts to approve Adebayo's revision
      expect(() => assertAntiSelfApproval(approverCtx, authorUserId)).toThrowError(
        expect.objectContaining({
          code: "SELF_APPROVAL_VIOLATION",
          statusCode: 403,
        }),
      );

      expect(() => assertCanApprove(approverCtx, authorUserId)).toThrowError(
        expect.objectContaining({
          code: "SELF_APPROVAL_VIOLATION",
          statusCode: 403,
        }),
      );
    });

    it("should permit approval when a second independent authorized officer signs off", () => {
      const authorUserId = "user_marketing_folake";
      const approverUserId = "user_cco_adebayo";

      const approverCtx: TenantContext = {
        tenantId: "11111111-1111-1111-1111-111111111111",
        userId: approverUserId,
        clerkOrgId: "org_zenith_bank",
        clerkUserId: approverUserId,
        orgSlug: "zenith-bank",
        orgName: "Zenith Bank Plc",
        role: "CHIEF_COMPLIANCE_OFFICER",
        permissions: getPermissionsForRole("CHIEF_COMPLIANCE_OFFICER"),
        status: "ACTIVE",
      };

      expect(() => assertAntiSelfApproval(approverCtx, authorUserId)).not.toThrow();
      expect(() => assertCanApprove(approverCtx, authorUserId)).not.toThrow();
    });
  });

  describe("Clerk Role Mapping Utility", () => {
    it("should accurately map Clerk custom and standard roles to canonical roles", () => {
      expect(mapClerkRoleToCanonical("org:admin")).toBe("WORKSPACE_ADMIN");
      expect(mapClerkRoleToCanonical("org:member")).toBe("MARKETING_GROWTH");
      expect(mapClerkRoleToCanonical("org:chief_compliance_officer")).toBe("CHIEF_COMPLIANCE_OFFICER");
      expect(mapClerkRoleToCanonical("cco")).toBe("CHIEF_COMPLIANCE_OFFICER");
      expect(mapClerkRoleToCanonical("org:legal_counsel")).toBe("LEGAL_COUNSEL");
      expect(mapClerkRoleToCanonical("org:compliance_analyst")).toBe("COMPLIANCE_ANALYST");
      expect(mapClerkRoleToCanonical("org:marketing_growth")).toBe("MARKETING_GROWTH");
      expect(mapClerkRoleToCanonical(undefined)).toBe("MARKETING_GROWTH");
      expect(mapClerkRoleToCanonical("")).toBe("MARKETING_GROWTH");
    });
  });
});
