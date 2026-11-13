/**
 * Cogent Marketing Shield - Post-Publication Drift Monitor Unit Tests
 * Document Reference: Document 03 (Section 3.12), Document 08 (Phase 11), Document 09 (Section 6)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { driftService } from "@/modules/drift-monitor/drift.service";
import { webSearchRouter } from "@/modules/live-web-intelligence/web-search.router";
import { productService } from "@/modules/knowledge-base/product.service";
import { notificationService } from "@/lib/notifications";
import { createAdminSupabaseClient } from "@/lib/supabase";

vi.mock("@/lib/supabase", () => {
  const mockFrom = vi.fn();
  return {
    createAdminSupabaseClient: vi.fn(() => ({
      from: mockFrom,
    })),
  };
});

vi.mock("@/modules/audit/audit.service", () => ({
  auditService: {
    appendEvent: vi.fn().mockResolvedValue({ id: "audit_123" }),
  },
}));

vi.mock("@/lib/notifications", () => ({
  notificationService: {
    sendDriftAlert: vi.fn().mockResolvedValue({ success: true, messageId: "msg_drift_123" }),
  },
}));

vi.mock("@/modules/live-web-intelligence/web-search.router", () => ({
  webSearchRouter: {
    fetchLiveUrlContent: vi.fn(),
  },
}));

vi.mock("@/modules/knowledge-base/product.service", () => ({
  productService: {
    getProductTruth: vi.fn(),
  },
}));

describe("Post-Publication Drift Watcher (DRIFT-001 to 004)", () => {
  const tenantId = "00000000-0000-0000-0000-000000000001";
  const userId = "user_cco_001";
  const monitorId = "mon_00000000-0000-0000-0000-000000000001";
  const campaignId = "camp_00000000-0000-0000-0000-000000000001";
  const revisionId = "rev_00000000-0000-0000-0000-000000000001";

  const mockApprovedProductTruth = {
    id: "prod_1",
    product_name: "QuickCash Salary Advance",
    product_type: "DIGITAL_LENDING",
    approved_terms: {
      interest_rate_min: 4.0,
      interest_rate_max: 6.0,
      interest_rate_type: "MONTHLY" as const,
      processing_fee_percent: 1.5,
      tenor_min_days: 30,
      tenor_max_days: 90,
      required_disclosures: [
        "Terms and conditions apply",
        "Licensed by the Central Bank of Nigeria",
      ],
    },
  };

  const mockApprovedBaselineText =
    "Get up to N500,000 instantly with QuickCash Salary Advance. 5% monthly interest and 1.5% processing fee apply. Repayment over 60 days tenor. APR 60% annualized. Terms and conditions apply. Licensed by the Central Bank of Nigeria.";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("DRIFT-001: detects drift when mandatory disclosures are stripped from the live published page", async () => {
    const liveCopyWithoutDisclosures =
      "Get up to N500,000 instantly with QuickCash Salary Advance. 5% monthly interest and 1.5% processing fee apply. Repayment over 60 days tenor. Instant cash into your account!";

    // Setup mocks
    vi.spyOn(driftService, "getDriftMonitor").mockResolvedValueOnce({
      id: monitorId,
      tenant_id: tenantId,
      campaign_id: campaignId,
      approved_revision_id: revisionId,
      published_url: "https://bank.com.ng/promos/quickcash",
      status: "ACTIVE",
      last_checked_at: null,
      last_drift_detected_at: null,
      drift_details: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      campaign_title: "QuickCash Salary Advance",
    });

    const mockSupabase = createAdminSupabaseClient();
    vi.mocked(mockSupabase.from).mockImplementation((table: string) => {
      if (table === "campaign_revisions") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: revisionId, content_text: mockApprovedBaselineText },
            error: null,
          }),
        } as unknown as ReturnType<typeof mockSupabase.from>;
      }
      if (table === "campaign_drift_monitors") {
        return {
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: monitorId, status: "DRIFT_DETECTED" },
            error: null,
          }),
        } as unknown as ReturnType<typeof mockSupabase.from>;
      }
      return { select: vi.fn().mockReturnThis() } as unknown as ReturnType<typeof mockSupabase.from>;
    });

    vi.mocked(webSearchRouter.fetchLiveUrlContent).mockResolvedValueOnce({
      success: true,
      url: "https://bank.com.ng/promos/quickcash",
      page_title: "QuickCash Promo",
      content_text: liveCopyWithoutDisclosures,
      text_length: liveCopyWithoutDisclosures.length,
      retrieved_at: new Date().toISOString(),
      source_class: "UNTRUSTED_USER_MATERIAL",
      sha256_hash: "mock_hash_live_001",
    });

    vi.mocked(productService.getProductTruth).mockResolvedValueOnce(
      mockApprovedProductTruth as unknown as Awaited<ReturnType<typeof productService.getProductTruth>>
    );

    const result = await driftService.checkDrift(tenantId, userId, monitorId);

    expect(result.details.status).toBe("DRIFT_DETECTED");
    expect(result.details.discrepancies.some((d) => d.type === "MISSING_DISCLOSURE")).toBe(true);
    expect(notificationService.sendDriftAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        campaign_id: campaignId,
        drift_severity: "CRITICAL_BREACH",
      })
    );
  });

  it("DRIFT-002: detects drift when live published copy advertises unapproved 0% fee", async () => {
    const liveCopyWithFeeDiscrepancy =
      "Get up to N500,000 instantly with QuickCash Salary Advance. 5% monthly interest and 0% processing fee with no fees ever! Repayment over 60 days tenor. APR 60% annualized. Terms and conditions apply. Licensed by the Central Bank of Nigeria.";

    vi.spyOn(driftService, "getDriftMonitor").mockResolvedValueOnce({
      id: monitorId,
      tenant_id: tenantId,
      campaign_id: campaignId,
      approved_revision_id: revisionId,
      published_url: "https://bank.com.ng/promos/quickcash",
      status: "ACTIVE",
      last_checked_at: null,
      last_drift_detected_at: null,
      drift_details: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      campaign_title: "QuickCash Salary Advance",
    });

    const mockSupabase = createAdminSupabaseClient();
    vi.mocked(mockSupabase.from).mockImplementation((table: string) => {
      if (table === "campaign_revisions") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: revisionId, content_text: mockApprovedBaselineText },
            error: null,
          }),
        } as unknown as ReturnType<typeof mockSupabase.from>;
      }
      if (table === "campaign_drift_monitors") {
        return {
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: monitorId, status: "DRIFT_DETECTED" },
            error: null,
          }),
        } as unknown as ReturnType<typeof mockSupabase.from>;
      }
      return { select: vi.fn().mockReturnThis() } as unknown as ReturnType<typeof mockSupabase.from>;
    });

    vi.mocked(webSearchRouter.fetchLiveUrlContent).mockResolvedValueOnce({
      success: true,
      url: "https://bank.com.ng/promos/quickcash",
      page_title: "QuickCash Promo",
      content_text: liveCopyWithFeeDiscrepancy,
      text_length: liveCopyWithFeeDiscrepancy.length,
      retrieved_at: new Date().toISOString(),
      source_class: "UNTRUSTED_USER_MATERIAL",
      sha256_hash: "mock_hash_live_002",
    });

    vi.mocked(productService.getProductTruth).mockResolvedValueOnce(
      mockApprovedProductTruth as unknown as Awaited<ReturnType<typeof productService.getProductTruth>>
    );

    const result = await driftService.checkDrift(tenantId, userId, monitorId);

    expect(result.details.status).toBe("DRIFT_DETECTED");
    expect(result.details.discrepancies.some((d) => d.type === "RATE_MISMATCH")).toBe(true);
    expect(notificationService.sendDriftAlert).toHaveBeenCalled();
  });

  it("DRIFT-003: passes cleanly with status COMPLIANT when live published page matches approved baseline", async () => {
    vi.spyOn(driftService, "getDriftMonitor").mockResolvedValueOnce({
      id: monitorId,
      tenant_id: tenantId,
      campaign_id: campaignId,
      approved_revision_id: revisionId,
      published_url: "https://bank.com.ng/promos/quickcash",
      status: "ACTIVE",
      last_checked_at: null,
      last_drift_detected_at: null,
      drift_details: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      campaign_title: "QuickCash Salary Advance",
    });

    const mockSupabase = createAdminSupabaseClient();
    vi.mocked(mockSupabase.from).mockImplementation((table: string) => {
      if (table === "campaign_revisions") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: revisionId, content_text: mockApprovedBaselineText },
            error: null,
          }),
        } as unknown as ReturnType<typeof mockSupabase.from>;
      }
      if (table === "campaign_drift_monitors") {
        return {
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: monitorId, status: "ACTIVE" },
            error: null,
          }),
        } as unknown as ReturnType<typeof mockSupabase.from>;
      }
      return { select: vi.fn().mockReturnThis() } as unknown as ReturnType<typeof mockSupabase.from>;
    });

    vi.mocked(webSearchRouter.fetchLiveUrlContent).mockResolvedValueOnce({
      success: true,
      url: "https://bank.com.ng/promos/quickcash",
      page_title: "QuickCash Promo",
      content_text: mockApprovedBaselineText,
      text_length: mockApprovedBaselineText.length,
      retrieved_at: new Date().toISOString(),
      source_class: "UNTRUSTED_USER_MATERIAL",
      sha256_hash: "mock_hash_clean_003",
    });

    vi.mocked(productService.getProductTruth).mockResolvedValueOnce(
      mockApprovedProductTruth as unknown as Awaited<ReturnType<typeof productService.getProductTruth>>
    );

    const result = await driftService.checkDrift(tenantId, userId, monitorId);

    expect(result.details.status).toBe("COMPLIANT");
    expect(result.details.discrepancies).toHaveLength(0);
    expect(notificationService.sendDriftAlert).not.toHaveBeenCalled();
  });
});
