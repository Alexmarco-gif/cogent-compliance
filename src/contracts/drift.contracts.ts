/**
 * Cogent Marketing Shield - Post-Publication Drift & Live Web Contracts
 * Document Reference: Document 03 (Section 3.8, 3.12), Document 04 (Section 5.5, Tools 9 & 10), Document 08 (Phase 11)
 */

import { z } from "zod";

export const driftMonitorStatusSchema = z.enum(["ACTIVE", "PAUSED", "DRIFT_DETECTED"]);
export type DriftMonitorStatus = z.infer<typeof driftMonitorStatusSchema>;

export const createDriftMonitorSchema = z.object({
  campaign_id: z.string().uuid("A valid campaign UUID is required"),
  approved_revision_id: z.string().uuid().optional(),
  published_url: z
    .string()
    .url("Must be a valid URL")
    .refine((u) => u.startsWith("https://"), {
      message: "Only HTTPS promotional URLs are permitted for drift monitoring",
    }),
});

export type CreateDriftMonitorInput = z.infer<typeof createDriftMonitorSchema>;

export const queryDriftMonitorsSchema = z.object({
  campaign_id: z.string().uuid().optional(),
  status: driftMonitorStatusSchema.optional(),
  limit: z.coerce.number().min(1).max(50).optional(),
});

export type QueryDriftMonitorsInput = z.infer<typeof queryDriftMonitorsSchema>;

export const triggerDriftCheckSchema = z.object({
  monitor_id: z.string().uuid("A valid drift monitor UUID is required"),
});

export type TriggerDriftCheckInput = z.infer<typeof triggerDriftCheckSchema>;

export const queueDiscoveredCircularSchema = z.object({
  live_web_retrieval_id: z.string().uuid("A valid live web retrieval UUID is required"),
  regulator: z.enum(["CBN", "FCCPC", "ARCON", "NDPC", "SEC", "OTHER"]).optional(),
  doc_type: z
    .enum([
      "Act / Legislation",
      "Regulation",
      "Circular / Directive",
      "Guidelines & Standards",
      "Exposure Draft",
      "Sanctions / Enforcement Order",
    ])
    .optional(),
});

export type QueueDiscoveredCircularInput = z.infer<typeof queueDiscoveredCircularSchema>;

export interface DriftDiscrepancy {
  type: "MISSING_DISCLOSURE" | "RATE_MISMATCH" | "PROHIBITED_TERM" | "CONTENT_DIVERGENCE";
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  description: string;
  expectedValue?: string;
  actualValue?: string;
}

export interface DriftDetails {
  status: "COMPLIANT" | "DRIFT_DETECTED";
  checked_at: string;
  divergence_score: number;
  discrepancies: DriftDiscrepancy[];
  live_text_length: number;
  live_sha256_hash: string;
  approved_text_length: number;
  approved_sha256_hash: string;
  summary: string;
}

export interface CampaignDriftMonitor {
  id: string;
  tenant_id: string;
  campaign_id: string;
  approved_revision_id: string;
  published_url: string;
  status: DriftMonitorStatus;
  last_checked_at: string | null;
  last_drift_detected_at: string | null;
  drift_details: DriftDetails | Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // Joined fields
  campaign_title?: string;
  campaign_status?: string;
  revision_number?: number;
}
