/**
 * Cogent Marketing Shield - Transactional Notification Contracts
 * Document Reference: Document 08 (Phase 4 & Phase 9)
 */

import { z } from "zod";

export const SendReviewRequestNotificationSchema = z.object({
  to: z.string().email(),
  campaign_id: z.string().uuid(),
  campaign_title: z.string().min(1),
  submitter_name: z.string().min(1),
  institution_name: z.string().min(1),
  review_url: z.string().url(),
});

export type SendReviewRequestNotification = z.infer<typeof SendReviewRequestNotificationSchema>;

export const SendApprovalDecisionNotificationSchema = z.object({
  to: z.string().email(),
  campaign_id: z.string().uuid(),
  campaign_title: z.string().min(1),
  decision: z.enum(["APPROVED", "REJECTED", "CONDITIONAL"]),
  officer_name: z.string().min(1),
  officer_role: z.string().min(1),
  comments: z.string().optional(),
  campaign_url: z.string().url(),
});

export type SendApprovalDecisionNotification = z.infer<typeof SendApprovalDecisionNotificationSchema>;

export const SendDriftAlertNotificationSchema = z.object({
  to: z.string().email(),
  campaign_id: z.string().uuid(),
  campaign_title: z.string().min(1),
  drift_severity: z.enum(["CRITICAL_BREACH", "HIGH_RISK", "MEDIUM_RISK"]),
  drift_findings_count: z.number().int().positive(),
  summary: z.string().min(1),
  alert_url: z.string().url(),
});

export type SendDriftAlertNotification = z.infer<typeof SendDriftAlertNotificationSchema>;
