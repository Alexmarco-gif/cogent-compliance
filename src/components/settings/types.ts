import type { CanonicalRole } from "@/modules/auth-tenancy/types";
import type { RoleMetadata } from "@/modules/auth-tenancy/roles";
import type { CompliancePolicy, OrganizationProfile } from "@/contracts/settings.contracts";

export interface AuthMeData {
  tenantId: string;
  userId: string;
  clerkUserId: string;
  clerkOrgId: string;
  orgName: string;
  orgSlug: string;
  role: CanonicalRole;
  roleMetadata: RoleMetadata;
  permissions: string[];
  status: string;
}

export interface WorkspaceSettingsData {
  tenantId: string;
  organizationName: string;
  organizationSlug: string;
  clerkOrgId: string | null;
  activeRegulatoryScopes: string[];
  organizationProfile: OrganizationProfile & { clerkLogoUrl?: string | null };
  compliancePolicy: CompliancePolicy;
  currentRole: CanonicalRole;
  canManageWorkspace: boolean;
  canManageTeam: boolean;
}
