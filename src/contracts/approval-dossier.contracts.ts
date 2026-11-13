/**
 * Cogent Marketing Shield - Approval & Statutory Dossier Contracts
 * Document Reference: Document 04 (Sections 5.4, 5.5), Document 07 (Section 5.2), Document 08 (Phase 9)
 */

import { z } from "zod";

export const submitCampaignReviewSchema = z.object({
  revision_id: z.string().uuid("Invalid revision_id UUID"),
  comment: z.string().max(2000).optional(),
});

export type SubmitCampaignReviewInput = z.infer<typeof submitCampaignReviewSchema>;

export const campaignApprovalDecisionSchema = z.object({
  revision_id: z.string().uuid("Invalid revision_id UUID"),
  decision: z.enum(["APPROVED", "REJECTED"]),
  decision_reason: z
    .string()
    .min(5, "decision_reason must be at least 5 characters long"),
  conditions: z.record(z.string(), z.unknown()).default({}),
});

export type CampaignApprovalDecisionInput = {
  revision_id: string;
  decision: "APPROVED" | "REJECTED";
  decision_reason: string;
  conditions?: Record<string, unknown>;
};

export const generateDossierSchema = z.object({
  revision_id: z.string().uuid("Invalid revision_id UUID"),
});

export type GenerateDossierInput = z.infer<typeof generateDossierSchema>;

export const dossierMetadataSchema = z.object({
  dossier_id: z.string(),
  campaign_id: z.string().uuid(),
  revision_id: z.string().uuid(),
  storage_key: z.string(),
  download_url: z.string(),
  file_size_bytes: z.number(),
  file_sha256: z.string(),
  generated_at: z.string(),
  compliance_seal: z.object({
    officer_id: z.string(),
    decision: z.string(),
    decided_at: z.string(),
    statutory_framework: z.string(),
  }),
});

export type DossierMetadata = z.infer<typeof dossierMetadataSchema>;
