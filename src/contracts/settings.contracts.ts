/**
 * Cogent Marketing Shield - Workspace Settings & Team Governance Contracts
 */

import { z } from "zod";
import { CANONICAL_ROLES } from "@/modules/auth-tenancy/types";
import { REGULATORY_SCOPES } from "./billing.contracts";

export const BusinessAddressSchema = z.object({
  country: z.string().max(120).optional(),
  state_region: z.string().max(120).optional(),
  city: z.string().max(120).optional(),
  street_address: z.string().max(240).optional(),
  office_suite: z.string().max(120).optional(),
  postal_code: z.string().max(40).optional(),
});

export interface BusinessAddress {
  country: string;
  state_region: string;
  city: string;
  street_address: string;
  office_suite: string;
  postal_code: string;
}

export const OrganizationProfileSchema = z.object({
  registration_number: z.string().max(120).optional(),
  regulator_license_id: z.string().max(120).optional(),
  phone: z.string().max(60).optional(),
  email: z.string().max(160).optional(),
  website: z.string().max(240).optional(),
  timezone: z.string().max(80).optional(),
  logo_url: z.string().max(300_000).nullable().optional(),
  address: BusinessAddressSchema.optional(),
});

export interface OrganizationProfile {
  registration_number: string;
  regulator_license_id: string;
  phone: string;
  email: string;
  website: string;
  timezone: string;
  logo_url?: string | null;
  address: BusinessAddress;
}

export const DRIFT_FREQUENCIES = ["HOURLY", "DAILY", "WEEKLY", "MANUAL"] as const;

export const CompliancePolicySchema = z.object({
  enforce_dual_control_approval: z.boolean().optional(),
  cco_alert_email: z.string().max(160).optional(),
  default_drift_frequency: z.enum(DRIFT_FREQUENCIES).optional(),
  auto_create_drift_incident_thread: z.boolean().optional(),
});

export interface CompliancePolicy {
  enforce_dual_control_approval: boolean;
  cco_alert_email: string;
  default_drift_frequency: (typeof DRIFT_FREQUENCIES)[number];
  auto_create_drift_incident_thread: boolean;
}

export const UpdateWorkspaceSettingsSchema = z.object({
  organization_name: z.string().min(2).max(160).optional(),
  active_regulatory_scopes: z
    .array(z.enum(REGULATORY_SCOPES))
    .min(1, "Select at least one regulatory scope")
    .optional(),
  organization_profile: OrganizationProfileSchema.optional(),
  compliance_policy: CompliancePolicySchema.optional(),
});

export type UpdateWorkspaceSettingsInput = z.infer<typeof UpdateWorkspaceSettingsSchema>;

export const TeamInviteEntrySchema = z.object({
  email: z.string().trim().email("Please enter a valid work email address"),
  role: z.enum(CANONICAL_ROLES),
});

export const InviteTeamMembersSchema = z.object({
  invitations: z
    .array(TeamInviteEntrySchema)
    .min(1, "Provide at least one team member to invite")
    .max(20, "Maximum 20 invitations per batch"),
});

export type InviteTeamMembersInput = z.infer<typeof InviteTeamMembersSchema>;

export const RevokeInvitationSchema = z.object({
  invitationId: z.string().min(1, "Invitation ID is required"),
  email: z.string().optional(),
});

export type RevokeInvitationInput = z.infer<typeof RevokeInvitationSchema>;

export const UpdateTeamMemberSchema = z.object({
  role: z.enum(CANONICAL_ROLES).optional(),
  status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
});

export type UpdateTeamMemberInput = z.infer<typeof UpdateTeamMemberSchema>;
