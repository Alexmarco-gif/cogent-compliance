/**
 * Cogent Marketing Shield - Campaign Service Unit Tests
 * Document Reference: Document 04 (Section 4), Document 08 (Phase 7)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { CampaignService } from "@/modules/campaigns/campaign.service";
import { auditService } from "@/modules/audit/audit.service";
import { r2StorageService } from "@/modules/asset-processing/r2.storage";
import { mechanicalLocksEngine } from "@/modules/compliance-assessment/mechanical-locks";
import { guardrailValidator } from "@/modules/compliance-assessment/guardrails.validator";

// Mock Supabase
const mockFrom = vi.fn();
const mockRpc = vi.fn().mockResolvedValue({ data: [], error: null });
vi.mock("@/lib/supabase", () => ({
  createAdminSupabaseClient: () => ({
    from: mockFrom,
    rpc: mockRpc,
  }),
}));

// Mock Audit Service
vi.mock("@/modules/audit/audit.service", () => ({
  auditService: {
    appendEvent: vi.fn().mockResolvedValue({ id: "audit-123" }),
  },
}));

// Mock R2 Storage Service
vi.mock("@/modules/asset-processing/r2.storage", () => ({
  r2StorageService: {
    generatePresignedUploadUrl: vi.fn(),
    getObjectBuffer: vi.fn(),
  },
}));

// Mock Mechanical Locks Engine
vi.mock("@/modules/compliance-assessment/mechanical-locks", () => ({
  mechanicalLocksEngine: {
    executeLocks: vi.fn(),
  },
}));

// Mock Guardrail Validator
vi.mock("@/modules/compliance-assessment/guardrails.validator", () => ({
  guardrailValidator: {
    validateFindings: vi.fn(),
  },
}));

// Mock Claim Extractor Engine
vi.mock("@/modules/compliance-assessment/claim-extractor", () => ({
  claimExtractorEngine: {
    extractClaims: vi.fn().mockResolvedValue([]),
  },
}));

// Mock Gemini Service
vi.mock("@/modules/ai-orchestration/gemini.service", () => ({
  geminiService: {
    generateText: vi.fn().mockResolvedValue({
      text: JSON.stringify({
        overall_risk_level: "LOW",
        statutory_summary: "Compliant campaign",
        candidate_findings: [],
      }),
      tokensUsed: { prompt: 100, completion: 50, total: 150 },
    }),
  },
}));

describe("CampaignService (Phase 7)", () => {
  let service: CampaignService;
  const tenantId = "11111111-1111-1111-1111-111111111111";
  const userId = "user_officer_01";

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CampaignService();
  });

  describe("createCampaign", () => {
    it("should insert campaign, create revision #1, and log an audit event", async () => {
      const mockCampaign = {
        id: "camp_101",
        tenant_id: tenantId,
        campaign_name: "Easter Cash Promo 2026",
        campaign_type: "PROMOTIONAL",
        channel: "SOCIAL_MEDIA",
        status: "DRAFT",
      };

      const mockRevision = {
        id: "rev_201",
      };

      // Set up chained mock returns for Supabase calls
      mockFrom.mockImplementation((table: string) => {
        if (table === "marketing_campaigns") {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockCampaign, error: null }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          };
        }
        if (table === "campaign_revisions") {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockRevision, error: null }),
              }),
            }),
          };
        }
        return {
          insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      const result = await service.createCampaign(tenantId, userId, {
        campaign_name: "Easter Cash Promo 2026",
        channel: "SOCIAL_MEDIA",
        campaign_type: "PROMOTIONAL",
        initial_content_text: "Borrow at low rates today!",
      });

      expect(result.id).toBe("camp_101");
      expect(result.current_revision_id).toBe("rev_201");
      expect(auditService.appendEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId,
          actorId: userId,
          action: "CAMPAIGN_CREATED",
          entityType: "MARKETING_CAMPAIGN",
          entityId: "camp_101",
        })
      );
    });
  });

  describe("createAssetUploadSession", () => {
    it("should generate presigned R2 upload URL and insert pending campaign_asset record", async () => {
      vi.mocked(r2StorageService.generatePresignedUploadUrl).mockResolvedValueOnce({
        uploadUrl: "https://r2.cloudflarestorage.com/cogent-assets/tenants/mock-upload",
        storageKey: "tenants/11111111-1111-1111-1111-111111111111/assets/asset_1/flyer.png",
        expiresInSeconds: 900,
        maxSizeBytes: 26214400,
      });

      mockFrom.mockImplementation((table: string) => {
        if (table === "campaign_assets") {
          return {
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        return {};
      });

      const session = await service.createAssetUploadSession(tenantId, userId, {
        campaign_id: "camp_101",
        original_filename: "easter_flyer.png",
        mime_type: "image/png",
        file_size_bytes: 1048576,
        sha256_hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      });

      expect(session.asset_id).toBeDefined();
      expect(session.presigned_upload_url).toContain("https://r2.cloudflarestorage.com");
      expect(session.storage_key).toContain("tenants/11111111-1111-1111-1111-111111111111/assets/");
      expect(session.expires_in_seconds).toBe(900);
      expect(mockFrom).toHaveBeenCalledWith("campaign_assets");
    });
  });

  describe("updateExtractionSegment", () => {
    it("should update OCR segment text and log audit event with previous and new text", async () => {
      const oldSegment = {
        id: "seg_1",
        tenant_id: tenantId,
        text_content: "0% Interst Loan",
        metadata: { confidence: 0.65 },
      };

      const updatedSegment = {
        id: "seg_1",
        tenant_id: tenantId,
        text_content: "0% Interest Loan",
        metadata: {
          confidence: 0.65,
          corrected_by: userId,
          correction_reason: "Fix typo from OCR",
        },
      };

      mockFrom.mockImplementation((table: string) => {
        if (table === "asset_extraction_segments") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: oldSegment, error: null }),
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: updatedSegment, error: null }),
                }),
              }),
            }),
          };
        }
        return {};
      });

      const res = await service.updateExtractionSegment(
        tenantId,
        userId,
        "asset_1",
        "seg_1",
        {
          text_content: "0% Interest Loan",
          correction_reason: "Fix typo from OCR",
        }
      );

      expect(res.text_content).toBe("0% Interest Loan");
      expect(auditService.appendEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId,
          actorId: userId,
          action: "OCR_SEGMENT_CORRECTED",
          entityType: "ASSET_EXTRACTION_SEGMENT",
          entityId: "seg_1",
          eventData: expect.objectContaining({
            previousText: "0% Interst Loan",
            newText: "0% Interest Loan",
            correctionReason: "Fix typo from OCR",
          }),
        })
      );
    });
  });

  describe("triggerAssessment", () => {
    it("should execute deterministic mechanical locks and record breaches when deceptive terms exist", async () => {
      const mockCampaign = {
        id: "camp_101",
        tenant_id: tenantId,
        campaign_name: "100% Free Loan Promo",
        current_revision_id: "rev_201",
        product_id: null,
      };

      const mockRevision = {
        id: "rev_201",
        content_text: "Get your 100% risk-free loan now with guaranteed returns!",
      };

      const mockAssessment = {
        id: "asmt_501",
        campaign_id: "camp_101",
        tenant_id: tenantId,
      };

      // Mock Mechanical Locks finding a breach
      vi.mocked(mechanicalLocksEngine.executeLocks).mockResolvedValueOnce({
        passed: false,
        lock1_prohibited_terms: {
          passed: false,
          breaches: [
            {
              lockNumber: 1,
              lockName: "PROHIBITED_TERMS",
              breachType: "PROHIBITED_MARKETING_TERM",
              matchedText: "100% risk-free",
              severity: "CRITICAL",
              explanation: "Absolute risk-free representation prohibited under FCCPA Section 123",
              statutoryReference: "FCCPA 2018 Section 123(1)",
            },
          ],
        },
        lock2_product_rate_match: { passed: true, breaches: [] },
        lock3_mandatory_disclosures: { passed: true, breaches: [], missingDisclosures: [] },
        totalBreachCount: 1,
      });

      // Mock Guardrails to pass candidate findings
      vi.mocked(guardrailValidator.validateFindings).mockResolvedValueOnce({
        passed: true,
        totalCandidateFindings: 1,
        validatedFindings: [
          {
            findingCode: "FINDING-PROHIBITED-TERM",
            claimText: "100% risk-free",
            title: "Prohibited absolute guarantee claim",
            description: "Absolute risk-free representation prohibited under FCCPA Section 123",
            severity: "CRITICAL",
            recommendedAction: "Remove absolute guarantee",
            regulatoryClauseId: "cl_1",
            applicabilityStatus: "VERIFIED",
            requiresHumanReview: false,
            sourceClass: "VERIFIED_OFFICIAL_SOURCE",
            layerStatus: {
              layer1_source_exists: true,
              layer2_lifecycle_current: true,
              layer3_text_injected: true,
              layer4_claim_provenance_verified: true,
              layer5_applicability_checked: true,
            },
          },
        ],
        rejectedFindingsCount: 0,
        rejectedReasons: [],
      });

      mockFrom.mockImplementation((table: string) => {
        if (table === "marketing_campaigns") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: mockCampaign, error: null }),
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          };
        }
        if (table === "campaign_revisions") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockRevision, error: null }),
              }),
            }),
          };
        }
        if (table === "campaign_assets") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        if (table === "campaign_assessments") {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockAssessment, error: null }),
              }),
            }),
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                  }),
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          };
        }
        if (table === "compliance_findings") {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: "find_1" }, error: null }),
              }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
          insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      const assessment = await service.triggerAssessment(tenantId, userId, "camp_101", {
        revision_id: "rev_201",
      });

      expect(assessment).toBeDefined();
      expect(assessment.assessmentId).toBe("asmt_501");
      expect(mechanicalLocksEngine.executeLocks).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId,
          contentText: mockRevision.content_text,
        })
      );
      expect(auditService.appendEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId,
          actorId: userId,
          action: "CAMPAIGN_ASSESSMENT_COMPLETED",
          entityType: "CAMPAIGN_ASSESSMENT",
          entityId: "asmt_501",
        })
      );
    });
  });
});
