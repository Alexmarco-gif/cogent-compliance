/**
 * Cogent Marketing Shield - Transactional Notification Service Unit Tests
 * Document Reference: Document 08 (Phase 4 & Phase 9)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { TransactionalNotificationService } from "@/lib/notifications";

const mockSend = vi.fn().mockResolvedValue({
  data: { id: "resend_msg_mock_123" },
  error: null,
});

vi.mock("resend", () => {
  return {
    Resend: vi.fn().mockImplementation(() => ({
      emails: {
        send: mockSend,
      },
    })),
  };
});

describe("Transactional Notification Service (Resend)", () => {
  let service: TransactionalNotificationService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new TransactionalNotificationService();
  });

  it("should dispatch compliance review request notification", async () => {
    const result = await service.sendReviewRequest({
      to: "cco@firstbank.com.ng",
      campaign_id: "00000000-0000-0000-0000-000000000001",
      campaign_title: "Quick Credit 24-Hour Approval Promo",
      submitter_name: "Folake Adebayo (Growth Lead)",
      institution_name: "First Bank of Nigeria PLC",
      review_url: "https://compliance.cogentshield.com/campaigns/00000000-0000-0000-0000-000000000001/review",
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toBe("resend_msg_mock_123");
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "cco@firstbank.com.ng",
        subject: expect.stringContaining("Action Required"),
      }),
    );
  });

  it("should dispatch approval decision notification on sign-off", async () => {
    const result = await service.sendApprovalDecision({
      to: "marketing@accessbankplc.com",
      campaign_id: "00000000-0000-0000-0000-000000000002",
      campaign_title: "SME Working Capital Loan Campaign",
      decision: "APPROVED",
      officer_name: "Dr. Emeka Okonkwo",
      officer_role: "Chief Compliance Officer",
      comments: "All mandatory CBN APR disclosures and FCCPC dispute contact numbers verified.",
      campaign_url: "https://compliance.cogentshield.com/campaigns/00000000-0000-0000-0000-000000000002",
    });

    expect(result.success).toBe(true);
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "marketing@accessbankplc.com",
        subject: expect.stringContaining("APPROVED"),
      }),
    );
  });

  it("should dispatch rejection decision notification on compliance failure", async () => {
    const result = await service.sendApprovalDecision({
      to: "marketing@gtbank.com",
      campaign_id: "00000000-0000-0000-0000-000000000003",
      campaign_title: "Instant 0% Interest Payday Advance",
      decision: "REJECTED",
      officer_name: "Barrister Amina Bello",
      officer_role: "Legal Counsel",
      comments: "Breach of CBN Consumer Protection Framework: 0% Interest claim omits mandatory 5% processing fee.",
      campaign_url: "https://compliance.cogentshield.com/campaigns/00000000-0000-0000-0000-000000000003",
    });

    expect(result.success).toBe(true);
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "marketing@gtbank.com",
        subject: expect.stringContaining("REJECTED"),
      }),
    );
  });

  it("should dispatch urgent drift alert notification", async () => {
    const result = await service.sendDriftAlert({
      to: "compliance-alerts@zenithbank.com",
      campaign_id: "00000000-0000-0000-0000-000000000004",
      campaign_title: "Diaspora Mortgage Advantage",
      drift_severity: "CRITICAL_BREACH",
      drift_findings_count: 2,
      summary: "Live landing page interest rate drifted from approved 14.5% to advertised 9.9% without revised CCO approval.",
      alert_url: "https://compliance.cogentshield.com/campaigns/00000000-0000-0000-0000-000000000004/drift",
    });

    expect(result.success).toBe(true);
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "compliance-alerts@zenithbank.com",
        subject: expect.stringContaining("DRIFT ALERT"),
      }),
    );
  });
});
