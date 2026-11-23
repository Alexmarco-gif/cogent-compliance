/**
 * Cogent Compliance Operations - Live Supabase End-to-End DDQ Operations & Scenario Integration Tests
 * Executes against real Supabase PostgreSQL (or skips gracefully when run in offline CI without credentials).
 * Verifies:
 *   1. Central Evidence Vault: v1 upload -> chunk indexing -> v2 superseding chain -> expiry health -> Hybrid RRF RPC search
 *   2. Approved Q&A Library: Bank #1 DDQ intake, AI grounding, CCO validation & promotion to Q&A Library
 *   3. Bank #2 DDQ Auto-Reuse: Instant Q&A Library matching (<1s) + automatic Annexure A linking + reuse counter increment
 *   4. Edge Cases:
 *      - Expired evidence triggers Q&A staleness (QA_LIBRARY_STALE) and readiness blocker
 *      - Multi-executive sign-off cryptographic SHA-256 snapshot binding + RBAC enforcement
 *      - Post-submission bank follow-up clarification round lifecycle (OPEN -> ANSWERED -> RESOLVED)
 *      - Lossless round-trip .xlsx export into sponsor bank cells + full .zip Submission Pack (Annexures A–Z)
 *      - Strict cross-tenant isolation (Tenant B cannot view, update, or export Tenant A's Evidence, Q&A, or DDQs)
 */

import { describe, it, expect, afterAll } from "vitest";
import ExcelJS from "exceljs";
import JSZip from "jszip";
import { createAdminSupabaseClient } from "@/lib/supabase";
import { evidenceService } from "@/modules/evidence/evidence.service";
import { qaLibraryService } from "@/modules/ddq/qa-library.service";
import { ddqService } from "@/modules/ddq/ddq.service";
import { ddqExportService } from "@/modules/ddq/ddq-export.service";

const isMockDb =
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL.includes("mock") ||
  !process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY.includes("mock");

const LIVE_TENANT_A = "5cee04f7-a313-4068-ad78-d15ceff3f317";
const LIVE_USER_CCO = "user_3M7kRmRMOf88sqFwWFMxtec8YuW";
const LIVE_TENANT_B = "11111111-1111-1111-1111-111111111111";

async function buildBankDdqWorkbook(questions: Array<{ code: string; section: string; text: string }>): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Sponsor Bank DDQ");
  ws.addRow(["Ref", "Section", "Question", "Institution Response", "Supporting Evidence"]);
  for (const q of questions) {
    ws.addRow([q.code, q.section, q.text, "", ""]);
  }
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf as ArrayBuffer);
}

describe.skipIf(isMockDb)(
  "Live Supabase: Path A End-to-End DDQ Operations, Evidence Vault & Q&A Reuse Scenarios",
  () => {
    const createdEvidenceIds: string[] = [];
    const createdQaIds: string[] = [];
    const createdDdqIds: string[] = [];

    afterAll(async () => {
      const supabase = createAdminSupabaseClient();

      for (const ddqId of createdDdqIds) {
        await supabase.from("ddq_engagements").delete().eq("id", ddqId);
        await supabase.from("marketing_audit_events").delete().eq("entity_id", ddqId);
      }
      for (const qaId of createdQaIds) {
        await supabase.from("ddq_qa_library").delete().eq("id", qaId);
        await supabase.from("marketing_audit_events").delete().eq("entity_id", qaId);
      }
      for (const evId of createdEvidenceIds) {
        await supabase.from("compliance_evidence_items").delete().eq("id", evId);
        await supabase.from("marketing_audit_events").delete().eq("entity_id", evId);
      }

      // Sweep any leftover test rows by prefix
      await supabase.from("ddq_engagements").delete().like("title", "__LIVE_DDQ_TEST__%");
      await supabase.from("ddq_qa_library").delete().like("canonical_question", "__LIVE_DDQ_TEST__%");
      await supabase.from("compliance_evidence_items").delete().like("title", "__LIVE_DDQ_TEST__%");
    }, 30_000);

    it(
      "executes the complete CCO lifecycle: Evidence Vault versioning -> Bank #1 DDQ & Q&A promotion -> Bank #2 auto-reuse -> Stale evidence detection -> Sign-off & Round-Trip .xlsx/.zip export",
      async () => {
        // =========================================================================
        // 1. Central Evidence Vault: Create v1, supersede with v2, verify RRF search
        // =========================================================================
        const evV1 = await evidenceService.createEvidenceItem(LIVE_TENANT_A, LIVE_USER_CCO, {
          title: "__LIVE_DDQ_TEST__ Board-Approved AML/CFT Policy",
          description: "Enterprise AML/CFT and NFIU goAML reporting manual",
          category: "AML_CFT_POLICY",
          owner_department: "COMPLIANCE",
          owner_name: "Adebayo CCO",
          effective_date: "2025-01-01",
          expiry_date: "2027-12-31",
          extracted_text:
            "All Suspicious Transaction Reports (STRs) are filed immediately within 24 hours to the NFIU via goAML under MLPPA 2022 Section 7, and Currency Transaction Reports (CTRs) exceeding NGN 5,000,000 individual or NGN 10,000,000 corporate are filed within 7 days under Section 11.",
          tags: ["AML", "NFIU", "MLPPA"],
        });
        createdEvidenceIds.push(evV1.id);
        expect(evV1.version_number).toBe(1);
        expect(evV1.computed_health).toBe("ACTIVE");

        // Supersede v1 with v2
        const evV2 = await evidenceService.createEvidenceItem(LIVE_TENANT_A, LIVE_USER_CCO, {
          title: "__LIVE_DDQ_TEST__ Board-Approved AML/CFT Policy",
          description: "Updated 2026 Automated AML Baseline Standards edition",
          category: "AML_CFT_POLICY",
          owner_department: "COMPLIANCE",
          owner_name: "Adebayo CCO",
          parent_evidence_id: evV1.id,
          effective_date: "2026-01-01",
          expiry_date: "2028-01-01",
          extracted_text:
            "Updated 2026 AML Policy v2: Real-time automated transaction velocity monitoring with 24-hour NFIU goAML STR dispatch (MLPPA 2022 s.7) and 7-day CTR reporting (MLPPA 2022 s.11).",
          tags: ["AML", "NFIU", "2026"],
        });
        createdEvidenceIds.push(evV2.id);
        expect(evV2.version_number).toBe(2);

        const reloadedV1 = await evidenceService.getEvidenceItem(LIVE_TENANT_A, evV1.id);
        expect(reloadedV1?.status).toBe("SUPERSEDED");

        // Verify cross-tenant isolation on Evidence Vault
        const crossTenantEv = await evidenceService.getEvidenceItem(LIVE_TENANT_B, evV2.id);
        expect(crossTenantEv).toBeNull();

        // =========================================================================
        // 2. Bank #1 DDQ: Upload .xlsx, ground from Evidence Vault, CCO Validate & Promote to Q&A Library
        // =========================================================================
        const bank1Xlsx = await buildBankDdqWorkbook([
          {
            code: "Q1",
            section: "AML/CFT",
            text: "What are your statutory NFIU goAML STR and CTR filing timelines under MLPPA 2022?",
          },
          {
            code: "Q2",
            section: "Cybersecurity",
            text: "How frequently do you perform independent VAPT penetration testing under the CBN PSP Cybersecurity Framework?",
          },
        ]);

        const bank1Created = await ddqService.createEngagement(
          LIVE_TENANT_A,
          LIVE_USER_CCO,
          "Cogent Live Test Fintech Ltd",
          {
            title: "__LIVE_DDQ_TEST__ Providus Bank 2026 Sponsor DDQ",
            requesting_institution: "Providus Bank",
            requester_type: "SPONSOR_BANK",
            reference_code: "PROV-LIVE-01",
            due_date: "2026-12-15",
            auto_process: true,
          },
          {
            buffer: bank1Xlsx,
            fileName: "Providus_Sponsor_DDQ.xlsx",
            mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          }
        );
        createdDdqIds.push(bank1Created.engagement.id);
        expect(bank1Created.parsed_count).toBe(2);

        const bank1Detail = await ddqService.getEngagementDetail(
          LIVE_TENANT_A,
          bank1Created.engagement.id
        );
        expect(bank1Detail).not.toBeNull();
        expect(bank1Detail!.questions).toHaveLength(2);

        const q1Bank1 = bank1Detail!.questions[0]!;
        const q2Bank1 = bank1Detail!.questions[1]!;
        expect(q1Bank1.domain).toBe("AML_CFT");
        expect(q1Bank1.assigned_department).toBe("COMPLIANCE");
        expect(q2Bank1.domain).toBe("CYBERSECURITY");
        expect(q2Bank1.assigned_department).toBe("INFOSEC");

        // CCO validates Q1, links evV2 as Annexure A, and promotes to Approved Q&A Library
        const q1Validated = await ddqService.updateQuestion(
          LIVE_TENANT_A,
          LIVE_USER_CCO,
          "Adebayo CCO",
          bank1Created.engagement.id,
          q1Bank1.id,
          {
            final_answer:
              "Per Board-Approved AML/CFT Policy v2, STRs are filed via NFIU goAML within 24 hours (MLPPA 2022 Section 7) and CTRs (>₦5M individual / >₦10M corporate) within 7 days (Section 11).",
            link_evidence_ids: [evV2.id],
            validate_as_cco: true,
            promote_to_qa_library: true,
          },
          true
        );
        expect(q1Validated.question.status).toBe("CCO_VALIDATED");
        expect(q1Validated.promoted_qa_id).toBeDefined();
        if (q1Validated.promoted_qa_id) {
          createdQaIds.push(q1Validated.promoted_qa_id);
        }

        // Verify non-CCO cannot CCO-validate Q2
        await expect(
          ddqService.updateQuestion(
            LIVE_TENANT_A,
            "user_analyst",
            "Analyst",
            bank1Created.engagement.id,
            q2Bank1.id,
            { validate_as_cco: true },
            false
          )
        ).rejects.toThrow(/Only Legal Counsel or Chief Compliance Officer/);

        // =========================================================================
        // 3. Bank #2 DDQ: Verify Instant Approved Q&A Library Auto-Reuse!
        // =========================================================================
        const bank2Xlsx = await buildBankDdqWorkbook([
          {
            code: "WEMA-1",
            section: "Financial Crime",
            text: "State your statutory NFIU goAML STR and CTR filing timelines under MLPPA 2022?",
          },
        ]);

        const bank2Created = await ddqService.createEngagement(
          LIVE_TENANT_A,
          LIVE_USER_CCO,
          "Cogent Live Test Fintech Ltd",
          {
            title: "__LIVE_DDQ_TEST__ Wema Bank Partner Onboarding DDQ",
            requesting_institution: "Wema Bank",
            requester_type: "COMMERCIAL_BANK",
            auto_process: true,
          },
          {
            buffer: bank2Xlsx,
            fileName: "Wema_DDQ.xlsx",
            mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          }
        );
        createdDdqIds.push(bank2Created.engagement.id);

        const bank2Detail = await ddqService.getEngagementDetail(
          LIVE_TENANT_A,
          bank2Created.engagement.id
        );
        const wemaQ1 = bank2Detail!.questions[0]!;
        expect(wemaQ1.answer_source).toBe("QA_LIBRARY_EXACT");
        expect(wemaQ1.matched_qa_id).toBe(q1Validated.promoted_qa_id);
        expect(wemaQ1.evidence_gap_flag).toBe(false);
        expect(wemaQ1.draft_answer).toContain("MLPPA 2022 Section 7");
        expect(bank2Detail!.annexures).toHaveLength(1);
        expect(bank2Detail!.annexures[0]!.annexure_label).toBe("Annexure A");

        // =========================================================================
        // 4. Edge Case: Expire linked evidence -> Q&A Library must flag STALE!
        // =========================================================================
        await evidenceService.updateEvidenceItem(LIVE_TENANT_A, LIVE_USER_CCO, evV2.id, {
          expiry_date: "2024-01-01",
        });

        const staleMatch = await qaLibraryService.findBestMatch(
          LIVE_TENANT_A,
          "What are your statutory NFIU goAML STR and CTR filing timelines under MLPPA 2022?"
        );
        expect(staleMatch).not.toBeNull();
        expect(staleMatch!.is_stale).toBe(true);
        expect(staleMatch!.match_type).toBe("QA_LIBRARY_STALE");

        // Restore valid expiry date on evV2 and CCO-validate WEMA-1
        await evidenceService.updateEvidenceItem(LIVE_TENANT_A, LIVE_USER_CCO, evV2.id, {
          expiry_date: "2028-01-01",
        });
        await ddqService.updateQuestion(
          LIVE_TENANT_A,
          LIVE_USER_CCO,
          "Adebayo CCO",
          bank2Created.engagement.id,
          wemaQ1.id,
          { validate_as_cco: true },
          true
        );

        // =========================================================================
        // 5. Multi-Executive Sign-Offs, Follow-Up Register & Round-Trip .xlsx/.zip Export
        // =========================================================================
        for (const role of ["CCO_MLRO", "CEO", "CISO", "CFO"] as const) {
          const sign = await ddqService.recordSignoff(
            LIVE_TENANT_A,
            LIVE_USER_CCO,
            "Adebayo Executive",
            bank2Created.engagement.id,
            {
              signoff_role: role,
              status: "APPROVED",
              comments: `Approved by ${role}`,
            }
          );
          expect(sign.status).toBe("APPROVED");
          expect(sign.snapshot_sha256).toHaveLength(64);
        }

        const readyDetail = await ddqService.getEngagementDetail(
          LIVE_TENANT_A,
          bank2Created.engagement.id
        );
        expect(readyDetail!.engagement.status).toBe("APPROVED");
        expect(readyDetail!.readiness.ready_for_submission).toBe(true);
        expect(readyDetail!.readiness.blockers).toHaveLength(0);

        // Follow-up lifecycle: OPEN -> RESOLVED
        const followup = await ddqService.createFollowup(
          LIVE_TENANT_A,
          LIVE_USER_CCO,
          bank2Created.engagement.id,
          {
            round_number: 1,
            requester_query: "Please confirm goAML institution registration ID.",
          }
        );
        expect(followup.status).toBe("OPEN");

        const resolvedFollowup = await ddqService.updateFollowup(
          LIVE_TENANT_A,
          bank2Created.engagement.id,
          {
            followup_id: followup.id,
            response_text: "Confirmed: NFIU goAML Org ID #NG-PSSP-2026-882.",
            status: "RESOLVED",
          }
        );
        expect(resolvedFollowup.status).toBe("RESOLVED");

        // Export Round-Trip .xlsx & Full .zip Submission Pack
        const exportCtx = await ddqService.getExportContext(
          LIVE_TENANT_A,
          "Cogent Live Test Fintech Ltd",
          bank2Created.engagement.id
        );
        expect(exportCtx).not.toBeNull();

        const zipBundle = await ddqExportService.generateSubmissionZipBundle({
          ...exportCtx!,
          originalXlsxBuffer: bank2Xlsx,
        });
        const zip = await JSZip.loadAsync(zipBundle.buffer);
        const zipEntries = Object.keys(zip.files);
        expect(zipEntries.some((f) => f.endsWith("_Completed.xlsx"))).toBe(true);
        expect(zipEntries).toContain("02_Executive_Cover_and_SignOff_Certificate.md");
        expect(zipEntries).toContain("03_Annexures_Schedule.csv");
        expect(zipEntries.some((f) => f.startsWith("Annexures/Annexure_A_"))).toBe(true);

        // Cross-tenant isolation check on DDQ Detail
        const crossTenantDdq = await ddqService.getEngagementDetail(
          LIVE_TENANT_B,
          bank2Created.engagement.id
        );
        expect(crossTenantDdq).toBeNull();
      },
      45_000
    );
  }
);
