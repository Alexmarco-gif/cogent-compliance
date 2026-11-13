/**
 * Cogent Marketing Shield - Statutory Dossier Generation Service Unit Tests
 * Document Reference: Document 04 (Section 5.5), Document 08 (Phase 9), Document 09 (E2E-004)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { StatutoryDossierService } from "@/modules/dossier/statutory-dossier.service";
import { r2StorageService } from "@/modules/asset-processing/r2.storage";
import { auditService } from "@/modules/audit/audit.service";

// Helper for chainable Supabase query mocks
function createMockQuery(resolvedValue: { data: any; error: any }) {
  const query: any = {};
  query.select = vi.fn().mockReturnValue(query);
  query.insert = vi.fn().mockReturnValue(query);
  query.update = vi.fn().mockReturnValue(query);
  query.delete = vi.fn().mockReturnValue(query);
  query.eq = vi.fn().mockReturnValue(query);
  query.in = vi.fn().mockReturnValue(query);
  query.order = vi.fn().mockReturnValue(query);
  query.limit = vi.fn().mockReturnValue(query);
  query.single = vi.fn().mockResolvedValue(resolvedValue);
  query.maybeSingle = vi.fn().mockResolvedValue(resolvedValue);
  query.then = (onfulfilled: any) => Promise.resolve(resolvedValue).then(onfulfilled);
  return query;
}

// Mock Supabase
const mockFrom = vi.fn();
vi.mock("@/lib/supabase", () => ({
  createAdminSupabaseClient: () => ({
    from: mockFrom,
  }),
}));

// Mock R2 Storage Service
vi.mock("@/modules/asset-processing/r2.storage", () => ({
  r2StorageService: {
    putObjectBuffer: vi.fn().mockResolvedValue(undefined),
    generatePresignedDownloadUrl: vi
      .fn()
      .mockResolvedValue("https://r2.cogent.com/dossiers/sample.pdf?signed=true"),
  },
}));

// Mock Audit Service
vi.mock("@/modules/audit/audit.service", () => ({
  auditService: {
    appendEvent: vi.fn().mockResolvedValue({ id: "audit-dossier-123" }),
  },
}));

describe("StatutoryDossierService (Document 08 Phase 9)", () => {
  let service: StatutoryDossierService;
  const tenantId = "11111111-1111-1111-1111-111111111111";
  const userId = "user_cco_001";
  const campaignId = "camp-2222-2222-2222-222222222222";
  const revisionId = "rev-3333-3333-3333-333333333333";

  beforeEach(() => {
    vi.clearAllMocks();
    service = new StatutoryDossierService();
  });

  it("should compile a real, valid PDF dossier (%PDF-), upload to R2, and record an audit event", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "marketing_campaigns") {
        return createMockQuery({
          data: {
            id: campaignId,
            campaign_name: "QuickCredit Launch Promo",
            channel: "PAID_SOCIAL_FEED",
            status: "APPROVED",
            created_at: new Date().toISOString(),
            tenants: { id: tenantId, name: "Stanbic IBTC Bank PLC" },
          },
          error: null,
        });
      }
      if (table === "campaign_revisions") {
        return createMockQuery({
          data: {
            id: revisionId,
            revision_number: 2,
            content_text: "Borrow at an interest rate of 18.5% p.a. APR 19.2%. Licensed by CBN. Terms apply.",
            revision_source: "AI_REWRITE_ACCEPTED",
            change_summary: "Aligned interest rate and added CBN licensing disclosure.",
            created_at: new Date().toISOString(),
            created_by: userId,
          },
          error: null,
        });
      }
      if (table === "campaign_assessments") {
        return createMockQuery({
          data: {
            id: "ass-1",
            overall_risk_level: "LOW",
            numerical_rate_status: "PASSED",
            prohibited_lexicon_status: "PASSED",
            mandatory_disclosure_status: "PASSED",
            summary: "Campaign compliant under CBN & FCCPC guardrails.",
            created_at: new Date().toISOString(),
          },
          error: null,
        });
      }
      if (table === "compliance_findings") {
        return createMockQuery({
          data: [
            {
              id: "f-1",
              finding_code: "FCCPA-S115-01",
              title: "Misleading initial rate statement remediated",
              description: "Previous copy contained ambiguous promotional terms.",
              severity: "MEDIUM",
              recommended_action: "Ensure prominent APR display.",
              source_clause_id: "clause-abc",
              regulatory_clauses: {
                clause_reference: "Section 115(1)",
                instrument_title: "Federal Competition and Consumer Protection Act, 2018",
                regulator_acronym: "FCCPC",
              },
            },
          ],
          error: null,
        });
      }
      if (table === "campaign_assets") {
        return createMockQuery({
          data: [
            {
              id: "asset-1",
              original_filename: "quickcredit_banner.png",
              file_sha256: "b".repeat(64),
              mime_type: "image/png",
              file_size_bytes: 204800,
            },
          ],
          error: null,
        });
      }
      if (table === "campaign_approvals") {
        return createMockQuery({
          data: {
            id: "approval-1",
            decision: "APPROVED",
            decision_reason: "Verified against FCCPC 2026 Sales Promotion Regulations.",
            conditions: { must_obtain_arcon_asp_certificate_before_print: true },
            approved_by: userId,
            decided_at: new Date().toISOString(),
          },
          error: null,
        });
      }
      return createMockQuery({ data: null, error: null });
    });

    const result = await service.generateDossier(tenantId, userId, campaignId, revisionId);

    // Verify metadata
    expect(result.campaign_id).toBe(campaignId);
    expect(result.revision_id).toBe(revisionId);
    expect(result.storage_key).toContain(`tenants/${tenantId}/dossiers/${campaignId}`);
    expect(result.download_url).toBe("https://r2.cogent.com/dossiers/sample.pdf?signed=true");
    expect(result.file_size_bytes).toBeGreaterThan(1000); // Genuine PDF size
    expect(result.file_sha256).toHaveLength(64);
    expect(result.compliance_seal.decision).toBe("APPROVED");
    expect(result.compliance_seal.officer_id).toBe(userId);

    // Verify R2 PutObject was called with genuine PDF buffer starting with %PDF- (0x25 0x50 0x44 0x46)
    expect(r2StorageService.putObjectBuffer).toHaveBeenCalled();
    const putCallArgs = vi.mocked(r2StorageService.putObjectBuffer).mock.calls[0]!;
    const uploadedBuffer = putCallArgs[1] as Buffer;
    expect(uploadedBuffer).toBeInstanceOf(Buffer);
    expect(uploadedBuffer.slice(0, 4).toString("utf-8")).toBe("%PDF");
    expect(putCallArgs[2]).toBe("application/pdf");

    // Verify Audit Event logged
    expect(auditService.appendEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId,
        actorId: userId,
        action: "STATUTORY_DOSSIER_GENERATED",
        entityType: "DOSSIER",
      }),
    );
  });

  it("should throw an error if campaign is not found", async () => {
    mockFrom.mockReturnValue(createMockQuery({ data: null, error: { message: "Not found" } }));

    await expect(
      service.generateDossier(tenantId, userId, "unknown-camp", revisionId),
    ).rejects.toThrow("Campaign unknown-camp not found");
  });

  it("should generate a presigned download URL for an existing storage key", async () => {
    const key = `tenants/${tenantId}/dossiers/test.pdf`;
    const url = await service.getDossierDownloadUrl(key);
    expect(url).toBe("https://r2.cogent.com/dossiers/sample.pdf?signed=true");
    expect(r2StorageService.generatePresignedDownloadUrl).toHaveBeenCalledWith(key, 3600);
  });
});
