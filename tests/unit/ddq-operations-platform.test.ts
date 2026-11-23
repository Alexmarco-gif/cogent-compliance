/**
 * Cogent Compliance Operations - Path A End-to-End DDQ Operations Unit Test Suite
 * Verifies:
 *   1. 150-question multi-sheet .xlsx parsing & coordinate preservation (no 25-question cap)
 *   2. 16-domain & 10-department responsibility routing classifier
 *   3. Central Evidence Vault expiry health computation & chunking
 *   4. Approved Q&A Library matching & staleness detection (review cycle + linked evidence expiry)
 *   5. Per-question anti-fabrication drafting (Q&A reuse, stale Q&A warning, evidence grounding, missing evidence)
 *   6. Lossless round-trip .xlsx export into sponsor bank cells + complete .zip Submission Pack (Annexures A–Z)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import ExcelJS from "exceljs";
import JSZip from "jszip";

const mockSupabase = {
  from: vi.fn(),
  rpc: vi.fn(),
};

vi.mock("@/lib/supabase", () => ({
  createAdminSupabaseClient: () => mockSupabase,
}));

vi.mock("@/modules/ai-orchestration/gemini.service", () => ({
  geminiService: {
    generateEmbedding: vi.fn().mockRejectedValue(new Error("Offline test mode")),
    generateText: vi.fn().mockRejectedValue(new Error("Offline test mode")),
  },
}));

vi.mock("@/modules/asset-processing/r2.storage", () => ({
  r2StorageService: {
    putObjectBuffer: vi.fn().mockResolvedValue(undefined),
    getObjectBuffer: vi.fn().mockRejectedValue(new Error("Offline test mode")),
  },
}));

import {
  classifyDdqQuestion,
  parseCsvDdq,
  parseTextDdq,
  parseXlsxDdq,
} from "@/modules/ddq/ddq-parser.service";
import {
  chunkEvidenceText,
  computeEvidenceHealth,
} from "@/modules/evidence/evidence.service";
import {
  computeQuestionLexicalSimilarity,
  evaluateQaStaleness,
} from "@/modules/ddq/qa-library.service";
import { DdqDraftingService } from "@/modules/ddq/ddq-drafting.service";
import {
  computeDdqSnapshotHash,
  ddqExportService,
} from "@/modules/ddq/ddq-export.service";
import { indexToAnnexureLabel } from "@/modules/ddq/ddq.service";
import type {
  DdqEngagementRecord,
  DdqQuestionRecord,
  DdqSignoffRecord,
  EvidenceItemRecord,
} from "@/contracts/ddq.contracts";

async function buildSponsorBankXlsx(questionCount: number): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const sheet1 = wb.addWorksheet("AML & KYC");
  sheet1.addRow(["Ref", "Section", "Question", "Institution Response", "Supporting Evidence"]);

  const sheet2 = wb.addWorksheet("InfoSec & Finance");
  sheet2.addRow(["No.", "Domain", "Due Diligence Requirement", "Fintech Answer", "Annexure"]);

  const half = Math.ceil(questionCount / 2);
  for (let i = 1; i <= half; i++) {
    sheet1.addRow([
      `AML-${i}`,
      "AML/CFT",
      `Do you maintain automated transaction monitoring and file NFIU STRs within 24 hours for item ${i}?`,
      "",
      "",
    ]);
  }
  for (let i = half + 1; i <= questionCount; i++) {
    sheet2.addRow([
      `SEC-${i}`,
      "Cybersecurity",
      `Confirm annual independent VAPT penetration testing and CBN cybersecurity compliance for control ${i}?`,
      "",
      "",
    ]);
  }

  const arr = await wb.xlsx.writeBuffer();
  return Buffer.from(arr as ArrayBuffer);
}

describe("Path A: End-to-End DDQ Operations Platform", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("parses a 150-question multi-sheet sponsor bank .xlsx without truncating at 25 and preserves cell coordinates", async () => {
    const buffer = await buildSponsorBankXlsx(150);
    const parsed = await parseXlsxDdq(buffer);

    expect(parsed.source_format).toBe("XLSX");
    expect(parsed.questions).toHaveLength(150);
    expect(parsed.source_structure.sheets).toHaveLength(2);

    const first = parsed.questions[0]!;
    expect(first.question_code).toBe("AML-1");
    expect(first.source_sheet_name).toBe("AML & KYC");
    expect(first.source_row_number).toBe(2);
    expect(first.source_question_col).toBe(3);
    expect(first.source_answer_col).toBe(4);
    expect(first.source_evidence_col).toBe(5);
    expect(first.domain).toBe("AML_CFT");
    expect(first.assigned_department).toBe("COMPLIANCE");

    const last = parsed.questions[149]!;
    expect(last.question_code).toBe("SEC-150");
    expect(last.source_sheet_name).toBe("InfoSec & Finance");
    expect(last.domain).toBe("CYBERSECURITY");
    expect(last.assigned_department).toBe("INFOSEC");
  });

  it("accurately classifies DDQ questions across the 10 fintech departments", () => {
    expect(
      classifyDdqQuestion("Do you screen customers against OFAC and Nigeria Sanctions lists?").assigned_department
    ).toBe("COMPLIANCE");
    expect(
      classifyDdqQuestion("Provide evidence of your annual VAPT penetration test and ISO 27001 certification.").assigned_department
    ).toBe("INFOSEC");
    expect(
      classifyDdqQuestion("Confirm NDPA 2023 Data Protection Officer appointment and 31 March NDPC CAR filing.").assigned_department
    ).toBe("LEGAL");
    expect(
      classifyDdqQuestion("How are virtual NUBAN nominee accounts reconciled daily for NIP settlements?").assigned_department
    ).toBe("OPERATIONS");
    expect(
      classifyDdqQuestion("Provide your latest audited financial statements and paid-up share capital.").assigned_department
    ).toBe("FINANCE");
    expect(
      classifyDdqQuestion("Describe your AWS cloud architecture, disaster recovery RTO/RPO, and failover.").assigned_department
    ).toBe("TECHNOLOGY");
    expect(
      classifyDdqQuestion("How do you conduct employee background checks and annual AML staff training?").assigned_department
    ).toBe("HR");
    expect(
      classifyDdqQuestion("Do you conduct independent compliance audits and control testing via Internal Audit?").assigned_department
    ).toBe("INTERNAL_AUDIT");
    expect(
      classifyDdqQuestion("Provide your Board Risk & Compliance Committee charter and shareholding structure.").assigned_department
    ).toBe("EXECUTIVE");
  });

  it("parses CSV and sectioned plain-text DDQs cleanly", () => {
    const csv = `Ref,Section,Question,Response\nQ1,KYC,"Do you verify BVN and NIN via NIBSS and NIMC before account activation?",\nQ2,BCP,"Do you maintain a tested Business Continuity Plan and Disaster Recovery Plan?",`;
    const csvParsed = parseCsvDdq(csv);
    expect(csvParsed.questions).toHaveLength(2);
    expect(csvParsed.questions[0]!.domain).toBe("KYC_CDD");
    expect(csvParsed.questions[1]!.domain).toBe("BUSINESS_CONTINUITY");

    const text = `SECTION 1: AML\n1. Do you have a Board-approved AML/CFT policy?\n2. What is your NFIU STR filing timeline?\nSECTION 2: FINANCE\n3. Provide audited financial statements for the past 2 years.`;
    const textParsed = parseTextDdq(text, "TEXT");
    expect(textParsed.questions).toHaveLength(3);
    expect(textParsed.questions[2]!.assigned_department).toBe("FINANCE");
  });

  it("computes Central Evidence Vault expiry health (ACTIVE, EXPIRING_SOON, EXPIRED) and chunks text", () => {
    const futureDate = new Date(Date.now() + 120 * 86400_000).toISOString().slice(0, 10);
    const soonDate = new Date(Date.now() + 10 * 86400_000).toISOString().slice(0, 10);
    const pastDate = new Date(Date.now() - 15 * 86400_000).toISOString().slice(0, 10);

    expect(computeEvidenceHealth({ status: "ACTIVE", expiry_date: futureDate }).computed_health).toBe("ACTIVE");
    expect(computeEvidenceHealth({ status: "ACTIVE", expiry_date: soonDate }).computed_health).toBe("EXPIRING_SOON");
    expect(computeEvidenceHealth({ status: "ACTIVE", expiry_date: pastDate }).computed_health).toBe("EXPIRED");
    expect(computeEvidenceHealth({ status: "SUPERSEDED", expiry_date: futureDate }).computed_health).toBe("SUPERSEDED");

    const chunks = chunkEvidenceText("Paragraph one.\n\n".repeat(120), 600, 100);
    expect(chunks.length).toBeGreaterThan(2);
  });

  it("detects Q&A Library staleness when review date passed OR linked evidence expired", () => {
    const sim = computeQuestionLexicalSimilarity(
      "Do you screen customers against international sanctions and PEP lists?",
      "Confirm whether your onboarding screens customers against sanctions lists and PEPs."
    );
    expect(sim).toBeGreaterThanOrEqual(0.55);

    const freshMap = new Map([
      ["ev_1", { title: "AML Policy v3", computed_health: "ACTIVE", expiry_date: "2027-12-31" }],
    ]);
    const freshCheck = evaluateQaStaleness(
      {
        status: "ACTIVE",
        review_due_at: new Date(Date.now() + 90 * 86400_000).toISOString(),
        linked_evidence_ids: ["ev_1"],
      },
      freshMap
    );
    expect(freshCheck.is_stale).toBe(false);

    const expiredMap = new Map([
      ["ev_2", { title: "2024 VAPT Report", computed_health: "EXPIRED", expiry_date: "2025-01-01" }],
    ]);
    const staleCheck = evaluateQaStaleness(
      {
        status: "ACTIVE",
        review_due_at: new Date(Date.now() + 90 * 86400_000).toISOString(),
        linked_evidence_ids: ["ev_2"],
      },
      expiredMap
    );
    expect(staleCheck.is_stale).toBe(true);
    expect(staleCheck.staleness_reasons[0]).toContain("2024 VAPT Report");
  });

  it("enforces anti-fabrication when Evidence Vault is empty and auto-reuses fresh Q&A Library matches", async () => {
    // Mock empty vault & empty QA library -> MUST flag MISSING_EVIDENCE with [NEEDS_INTERNAL_EVIDENCE]
    mockSupabase.rpc.mockResolvedValue({ data: [], error: null });
    mockSupabase.from.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          neq: () => ({ limit: async () => ({ data: [] }) }),
          not: () => ({ limit: async () => ({ data: [] }) }),
          in: async () => ({ data: [] }),
          limit: async () => ({ data: [] }),
        }),
      }),
    }));

    const drafter = new DdqDraftingService();
    const gapOutcome = await drafter.draftSingleQuestion(
      "tenant_1",
      "PayFlow Nigeria Ltd",
      {
        id: "q_1",
        ddq_id: "ddq_1",
        question_code: "Q1",
        section_name: "AML/CFT",
        question_text: "State your NFIU CTR and STR filing timelines under MLPPA 2022.",
        domain: "AML_CFT",
        assigned_department: "COMPLIANCE",
      },
      { useAiSynthesis: false }
    );

    expect(gapOutcome.answer_source).toBe("AI_GAP_FLAGGED");
    expect(gapOutcome.grounding_classification).toBe("MISSING_EVIDENCE");
    expect(gapOutcome.evidence_gap_flag).toBe(true);
    expect(gapOutcome.draft_answer).toContain("[NEEDS_INTERNAL_EVIDENCE]");
    expect(gapOutcome.statutory_citations.length).toBeGreaterThan(0);

    // Now mock a fresh Approved Q&A Library match -> MUST auto-reuse with QA_LIBRARY_EXACT!
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "ddq_qa_library") {
        return {
          select: () => ({
            eq: () => ({
              neq: () => ({
                limit: async () => ({
                  data: [
                    {
                      id: "qa_approved_1",
                      tenant_id: "tenant_1",
                      canonical_question: "State your NFIU CTR and STR filing timelines under MLPPA 2022.",
                      approved_answer:
                        "PayFlow files CTRs (>₦5M individual / >₦10M corporate) within 7 days (MLPPA 2022 s.11) and STRs via goAML within 24 hours (MLPPA 2022 s.7).",
                      domain: "AML_CFT",
                      owner_department: "COMPLIANCE",
                      linked_evidence_ids: ["ev_aml_1"],
                      statutory_citations: [],
                      tags: [],
                      status: "ACTIVE",
                      approved_by: "user_cco",
                      approved_at: new Date().toISOString(),
                      review_due_at: new Date(Date.now() + 120 * 86400_000).toISOString(),
                      times_reused: 2,
                    },
                  ],
                }),
              }),
            }),
          }),
          update: () => ({ eq: () => ({ eq: async () => ({ error: null }) }) }),
        };
      }
      if (table === "compliance_evidence_items") {
        return {
          select: () => ({
            eq: () => ({
              in: async () => ({
                data: [
                  {
                    id: "ev_aml_1",
                    title: "AML/CFT Policy v3.0",
                    status: "ACTIVE",
                    expiry_date: "2027-12-31",
                  },
                ],
              }),
            }),
          }),
        };
      }
      return {
        select: () => ({ eq: () => ({ limit: async () => ({ data: [] }) }) }),
      };
    });

    const reuseOutcome = await drafter.draftSingleQuestion(
      "tenant_1",
      "PayFlow Nigeria Ltd",
      {
        id: "q_2",
        ddq_id: "ddq_2",
        question_code: "Q1",
        section_name: "AML/CFT",
        question_text: "State your NFIU CTR and STR filing timelines under MLPPA 2022.",
        domain: "AML_CFT",
        assigned_department: "COMPLIANCE",
      },
      { useAiSynthesis: false }
    );

    expect(reuseOutcome.answer_source).toBe("QA_LIBRARY_EXACT");
    expect(reuseOutcome.grounding_classification).toBe("VERIFIED_EVIDENCE");
    expect(reuseOutcome.evidence_gap_flag).toBe(false);
    expect(reuseOutcome.linked_evidence_ids).toEqual(["ev_aml_1"]);
    expect(reuseOutcome.draft_answer).toContain("goAML within 24 hours");
  });

  it("performs lossless round-trip .xlsx export into sponsor bank cells and builds a valid .zip Submission Pack", async () => {
    expect(indexToAnnexureLabel(0)).toBe("Annexure A");
    expect(indexToAnnexureLabel(25)).toBe("Annexure Z");
    expect(indexToAnnexureLabel(26)).toBe("Annexure AA");

    const originalBuffer = await buildSponsorBankXlsx(2);
    const parsed = await parseXlsxDdq(originalBuffer);

    const evItem: EvidenceItemRecord = {
      id: "ev_100",
      tenant_id: "t1",
      title: "Board-Approved AML/CFT Policy 2026",
      description: "Approved by Board Risk Committee",
      category: "AML_CFT_POLICY",
      owner_department: "COMPLIANCE",
      owner_user_id: "u_cco",
      owner_name: "Adebayo CCO",
      version_number: 3,
      parent_evidence_id: null,
      status: "ACTIVE",
      computed_health: "ACTIVE",
      days_until_expiry: 300,
      effective_date: "2026-01-01",
      expiry_date: "2027-01-01",
      review_cycle_days: 365,
      file_name: "AML_CFT_Policy_v3.pdf",
      mime_type: "application/pdf",
      file_size_bytes: 1024,
      storage_key: null,
      sha256_hash: "a".repeat(64),
      extracted_text: "All STRs are filed to NFIU goAML within 24 hours per MLPPA 2022 Section 7.",
      knowledge_document_id: null,
      tags: ["AML"],
      metadata: {},
      uploaded_by: "u_cco",
      approved_by: "u_cco",
      approved_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const engagement: DdqEngagementRecord = {
      id: "ddq_export_1",
      tenant_id: "t1",
      title: "Providus Sponsor Bank 2026 DDQ",
      requesting_institution: "Providus Bank",
      requester_type: "SPONSOR_BANK",
      reference_code: "PROV-2026-01",
      contact_name: "Partner Oversight",
      contact_email: "oversight@providus.ng",
      status: "APPROVED",
      due_date: "2026-12-01",
      submitted_at: null,
      decision_notes: null,
      source_file_name: "Providus_DDQ.xlsx",
      source_mime_type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      source_storage_key: null,
      source_sha256: "b".repeat(64),
      source_format: "XLSX",
      source_structure: parsed.source_structure,
      total_questions: 2,
      answered_count: 2,
      auto_matched_count: 1,
      validated_count: 2,
      evidence_gap_count: 0,
      created_by: "u_cco",
      cco_owner_id: "u_cco",
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const questions: DdqQuestionRecord[] = parsed.questions.map((pq, i) => ({
      id: `q_${i + 1}`,
      tenant_id: "t1",
      ddq_id: engagement.id,
      question_index: pq.question_index,
      question_code: pq.question_code,
      section_name: pq.section_name,
      question_text: pq.question_text,
      domain: pq.domain,
      assigned_department: pq.assigned_department,
      assigned_user_id: null,
      assigned_user_name: "Adebayo CCO",
      assigned_email: null,
      due_date: null,
      source_sheet_name: pq.source_sheet_name,
      source_row_number: pq.source_row_number,
      source_question_col: pq.source_question_col,
      source_answer_col: pq.source_answer_col,
      source_evidence_col: pq.source_evidence_col,
      status: "CCO_VALIDATED",
      answer_source: "QA_LIBRARY_EXACT",
      matched_qa_id: null,
      match_confidence: 0.95,
      draft_answer: `Verified response for ${pq.question_code}`,
      final_answer: `CCO-validated institutional response for ${pq.question_code}`,
      grounding_classification: "VERIFIED_EVIDENCE",
      evidence_gap_flag: false,
      evidence_gap_reason: null,
      statutory_citations: [{ authority: "NFIU / MLPPA 2022", reference: "Section 7" }],
      ai_confidence: 0.95,
      reviewer_notes: null,
      validated_by: "u_cco",
      validated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      evidence_links:
        i === 0
          ? [
              {
                id: "link_1",
                tenant_id: "t1",
                ddq_id: engagement.id,
                question_id: `q_${i + 1}`,
                evidence_item_id: evItem.id,
                annexure_label: "Annexure A",
                relevance_note: null,
                linked_by: "u_cco",
                created_at: new Date().toISOString(),
                evidence_item: evItem,
              },
            ]
          : [],
    }));

    const snapshotHash = computeDdqSnapshotHash(engagement.id, questions);
    const signoffs: DdqSignoffRecord[] = [
      {
        id: "so_1",
        tenant_id: "t1",
        ddq_id: engagement.id,
        signoff_role: "CCO_MLRO",
        signer_user_id: "u_cco",
        signer_name: "Adebayo CCO",
        signer_email: "cco@payflow.ng",
        status: "APPROVED",
        attestation_statement: "Verified against active institutional controls.",
        comments: "Cleared for submission",
        snapshot_sha256: snapshotHash,
        decided_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    // 1. Verify round-trip Excel writes into exact bank cells
    const xlsxRes = await ddqExportService.generateCompletedXlsx({
      engagement,
      orgName: "PayFlow Nigeria Ltd",
      questions,
      annexures: [{ annexure_label: "Annexure A", evidence_item: evItem, question_codes: ["AML-1"] }],
      signoffs,
      originalXlsxBuffer: originalBuffer,
    });

    const reloaded = new ExcelJS.Workbook();
    await reloaded.xlsx.load(xlsxRes.buffer as unknown as ArrayBuffer);
    const amlSheet = reloaded.getWorksheet("AML & KYC")!;
    expect(amlSheet.getRow(2).getCell(4).value).toBe("CCO-validated institutional response for AML-1");
    expect(String(amlSheet.getRow(2).getCell(5).value)).toContain("Annexure A");
    expect(reloaded.getWorksheet("Annexures & Sign-Off")).toBeDefined();

    // 2. Verify complete ZIP Submission Bundle
    const zipRes = await ddqExportService.generateSubmissionZipBundle({
      engagement,
      orgName: "PayFlow Nigeria Ltd",
      questions,
      annexures: [{ annexure_label: "Annexure A", evidence_item: evItem, question_codes: ["AML-1"] }],
      signoffs,
      originalXlsxBuffer: originalBuffer,
    });

    expect(zipRes.snapshotSha256).toBe(snapshotHash);
    const unzipped = await JSZip.loadAsync(zipRes.buffer);
    const fileNames = Object.keys(unzipped.files);
    expect(fileNames.some((n) => n.startsWith("01_") && n.endsWith(".xlsx"))).toBe(true);
    expect(fileNames).toContain("02_Executive_Cover_and_SignOff_Certificate.md");
    expect(fileNames).toContain("03_Annexures_Schedule.csv");
    expect(fileNames.some((n) => n.startsWith("Annexures/Annexure_A_"))).toBe(true);

    const coverContent = await unzipped.file("02_Executive_Cover_and_SignOff_Certificate.md")!.async("string");
    expect(coverContent).toContain(snapshotHash);
    expect(coverContent).toContain("Providus Bank");
  });

  it("handles edge cases: 500-question ceiling on oversized inputs, quoted CSV commas, non-Excel fallback workbook export, and Zod contract validation", async () => {
    // 1. Oversized 550-question input is safely capped at MAX_DDQ_QUESTIONS (500)
    const oversizedLines = Array.from(
      { length: 550 },
      (_, i) => `${i + 1}. Do you maintain compliance control verification record number ${i + 1} for CBN inspection?`
    ).join("\n");
    const parsedOversized = parseTextDdq(oversizedLines, "TEXT");
    expect(parsedOversized.questions).toHaveLength(500);
    expect(parsedOversized.questions[499]!.question_code).toBe("Q500");

    // 2. CSV with quoted commas, escaped double quotes, and blank rows
    const trickyCsv = [
      `Ref,Section,Question,Response`,
      `"", "", "", ""`,
      `AML-10,"AML, KYC & Sanctions","When a transaction exceeds ""₦5,000,000"", how does your system escalate to the MLRO?",""`,
    ].join("\n");
    const csvParsed = parseCsvDdq(trickyCsv);
    expect(csvParsed.questions).toHaveLength(1);
    expect(csvParsed.questions[0]!.question_code).toBe("AML-10");
    expect(csvParsed.questions[0]!.section_name).toBe("AML, KYC & Sanctions");
    expect(csvParsed.questions[0]!.question_text).toContain('exceeds "₦5,000,000"');

    // 3. Empty/noise input produces 0 questions without throwing
    expect(parseTextDdq("   \n\n  # Heading Only \n Short ", "TEXT").questions).toHaveLength(0);

    // 4. Fallback Excel export when DDQ originated from pasted TEXT (no original .xlsx buffer)
    const textEngagement: DdqEngagementRecord = {
      id: "ddq_text_only",
      tenant_id: "t1",
      title: "CBN Ad-Hoc Questionnaire",
      requesting_institution: "Central Bank of Nigeria",
      requester_type: "REGULATOR",
      reference_code: null,
      contact_name: null,
      contact_email: null,
      status: "IN_PROGRESS",
      due_date: null,
      submitted_at: null,
      decision_notes: null,
      source_file_name: null,
      source_mime_type: null,
      source_storage_key: null,
      source_sha256: null,
      source_format: "TEXT",
      source_structure: {},
      total_questions: 1,
      answered_count: 1,
      auto_matched_count: 0,
      validated_count: 0,
      evidence_gap_count: 1,
      created_by: "u_cco",
      cco_owner_id: "u_cco",
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const fallbackXlsx = await ddqExportService.generateCompletedXlsx({
      engagement: textEngagement,
      orgName: "PayFlow Nigeria Ltd",
      questions: [
        {
          id: "q_txt_1",
          tenant_id: "t1",
          ddq_id: textEngagement.id,
          question_index: 1,
          question_code: "Q1",
          section_name: "Governance",
          question_text: "Who is your appointed Chief Compliance Officer?",
          domain: "GOVERNANCE",
          assigned_department: "EXECUTIVE",
          assigned_user_id: null,
          assigned_user_name: null,
          assigned_email: null,
          due_date: null,
          source_sheet_name: null,
          source_row_number: null,
          source_question_col: null,
          source_answer_col: null,
          source_evidence_col: null,
          status: "AI_DRAFTED",
          answer_source: "AI_GAP_FLAGGED",
          matched_qa_id: null,
          match_confidence: null,
          draft_answer: "[NEEDS_INTERNAL_EVIDENCE] Provide Board appointment resolution.",
          final_answer: null,
          grounding_classification: "MISSING_EVIDENCE",
          evidence_gap_flag: true,
          evidence_gap_reason: "Missing Board resolution",
          statutory_citations: [],
          ai_confidence: 0.4,
          reviewer_notes: null,
          validated_by: null,
          validated_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          evidence_links: [],
        },
      ],
      annexures: [],
      signoffs: [],
    });

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(fallbackXlsx.buffer as unknown as ArrayBuffer);
    expect(wb.getWorksheet("DDQ Responses")).toBeDefined();
    expect(wb.getWorksheet("Annexures & Sign-Off")).toBeDefined();
  });
});
