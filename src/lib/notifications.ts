/**
 * Cogent Marketing Shield - Transactional Email Notification Service (Resend)
 * Document Reference: Document 08 (Phase 4 & Phase 9)
 */

import { Resend } from "resend";
import { logger } from "./logger";
import {
  SendReviewRequestNotification,
  SendApprovalDecisionNotification,
  SendDriftAlertNotification,
} from "@/contracts/notifications.contracts";

export interface EmailDispatchResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class TransactionalNotificationService {
  private resend: Resend | null = null;
  private fromEmail: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    this.fromEmail = process.env.RESEND_FROM_EMAIL || "compliance@notifications.stem-cogent.com";

    if (apiKey && apiKey.trim().length > 0 && (!apiKey.includes("mock") || process.env.NODE_ENV === "test")) {
      try {
        this.resend = new Resend(apiKey);
      } catch (err) {
        logger.warn("Failed to initialize Resend client", { error: err });
      }
    }
  }

  /**
   * Dispatches an email notifying Legal Counsel / CCO that a campaign is ready for formal review.
   */
  public async sendReviewRequest(
    params: SendReviewRequestNotification,
  ): Promise<EmailDispatchResult> {
    const subject = `[Action Required] Compliance Review Requested: "${params.campaign_title}" (${params.institution_name})`;

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden;">
        <div style="background: #0B0F1A; padding: 24px; text-align: center;">
          <h1 style="color: #FFFFFF; margin: 0; font-size: 20px; font-weight: 700;">Cogent Marketing Shield</h1>
          <p style="color: #94A3B8; margin: 4px 0 0 0; font-size: 13px;">Enterprise Regulatory Compliance Operating System</p>
        </div>
        <div style="padding: 32px 24px;">
          <h2 style="color: #0B0F1A; margin-top: 0; font-size: 18px;">Formal Compliance Review Required</h2>
          <p style="color: #334155; line-height: 1.6; font-size: 14px;">
            A marketing campaign has passed automated 7-Layer Guardrails and has been submitted for formal review by <strong>${params.submitter_name}</strong> at <strong>${params.institution_name}</strong>.
          </p>
          <div style="background: #F8FAFC; border-left: 4px solid #2A4BFF; padding: 16px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 14px; color: #0B0F1A;"><strong>Campaign Title:</strong> ${params.campaign_title}</p>
            <p style="margin: 6px 0 0 0; font-size: 12px; color: #64748B;">Campaign ID: ${params.campaign_id}</p>
          </div>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${params.review_url}" style="background: #2A4BFF; color: #FFFFFF; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block;">
              Review Campaign & Findings
            </a>
          </div>
          <p style="color: #64748B; font-size: 12px; margin-bottom: 0;">
            Note: Under institutional dual-control policies, only designated Legal Counsel and Chief Compliance Officers are authorized to sign off.
          </p>
        </div>
      </div>
    `;

    return this.sendEmail(params.to, subject, html);
  }

  /**
   * Dispatches an email notifying the campaign author of an approval or rejection decision.
   */
  public async sendApprovalDecision(
    params: SendApprovalDecisionNotification,
  ): Promise<EmailDispatchResult> {
    const isApproved = params.decision === "APPROVED";
    const statusColor = isApproved ? "#10B981" : "#EF4444";
    const subject = `Campaign ${params.decision}: "${params.campaign_title}"`;

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden;">
        <div style="background: #0B0F1A; padding: 24px; text-align: center;">
          <h1 style="color: #FFFFFF; margin: 0; font-size: 20px; font-weight: 700;">Cogent Marketing Shield</h1>
          <p style="color: #94A3B8; margin: 4px 0 0 0; font-size: 13px;">Compliance Review Decision</p>
        </div>
        <div style="padding: 32px 24px;">
          <div style="display: inline-block; background: ${statusColor}15; color: ${statusColor}; padding: 6px 12px; border-radius: 4px; font-weight: 700; font-size: 13px; margin-bottom: 16px;">
            DECISION: ${params.decision}
          </div>
          <h2 style="color: #0B0F1A; margin: 0 0 16px 0; font-size: 18px;">${params.campaign_title}</h2>
          <p style="color: #334155; line-height: 1.6; font-size: 14px;">
            A formal sign-off decision was recorded by <strong>${params.officer_name}</strong> (${params.officer_role}).
          </p>
          ${
            params.comments
              ? `<div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 16px; margin: 20px 0; border-radius: 6px;">
                  <strong style="font-size: 12px; color: #64748B; text-transform: uppercase;">Officer Comments:</strong>
                  <p style="margin: 8px 0 0 0; font-size: 14px; color: #1E293B;">${params.comments}</p>
                </div>`
              : ""
          }
          <div style="text-align: center; margin: 32px 0;">
            <a href="${params.campaign_url}" style="background: #0B0F1A; color: #FFFFFF; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block;">
              View Campaign & Audit Dossier
            </a>
          </div>
        </div>
      </div>
    `;

    return this.sendEmail(params.to, subject, html);
  }

  /**
   * Dispatches an alert when the Live Drift Watcher detects post-publication compliance drift.
   */
  public async sendDriftAlert(
    params: SendDriftAlertNotification,
  ): Promise<EmailDispatchResult> {
    const subject = `[URGENT DRIFT ALERT] Compliance Drift on "${params.campaign_title}"`;

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden;">
        <div style="background: #EF4444; padding: 20px; text-align: center;">
          <h1 style="color: #FFFFFF; margin: 0; font-size: 18px; font-weight: 700;">⚠️ Marketing Drift Alert</h1>
        </div>
        <div style="padding: 32px 24px;">
          <h2 style="color: #0B0F1A; margin-top: 0; font-size: 18px;">${params.campaign_title}</h2>
          <p style="color: #334155; line-height: 1.6; font-size: 14px;">
            The scheduled Live Drift Watcher detected <strong>${params.drift_findings_count} drift finding(s)</strong> with severity <strong>${params.drift_severity}</strong>.
          </p>
          <div style="background: #FEF2F2; border-left: 4px solid #EF4444; padding: 16px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 14px; color: #991B1B;">${params.summary}</p>
          </div>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${params.alert_url}" style="background: #EF4444; color: #FFFFFF; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block;">
              Inspect Drift Findings Immediately
            </a>
          </div>
        </div>
      </div>
    `;

    return this.sendEmail(params.to, subject, html);
  }

  private async sendEmail(
    to: string,
    subject: string,
    html: string,
  ): Promise<EmailDispatchResult> {
    if (!this.resend) {
      logger.info("[Mock Resend] Simulated email dispatch", { to, subject });
      return { success: true, messageId: `mock_${Date.now()}` };
    }

    try {
      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject,
        html,
      });

      if (error || !data) {
        logger.error("Failed to deliver transactional email via Resend", {
          to,
          subject,
          error: error?.message,
        });
        return { success: false, error: error?.message };
      }

      logger.info("Delivered transactional email via Resend", {
        to,
        subject,
        messageId: data.id,
      });

      return { success: true, messageId: data.id };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error("Exception during email dispatch", { to, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }
}

export const notificationService = new TransactionalNotificationService();
