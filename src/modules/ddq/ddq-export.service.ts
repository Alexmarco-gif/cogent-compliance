/**
 * Cogent Compliance Operations - DDQ Round-Trip Excel (.xlsx) & Zipped Annexure Bundle Exporter
 * Generates:
 *   1. Round-Trip .xlsx: writes validated/drafted answers + Annexure references directly back into
 *      the sponsor bank's original Excel sheets/rows/columns (or produces a styled multi-tab workbook).
 *   2. Full Submission Pack (.zip): bundles the filled .xlsx + Executive Sign-Off Certificate (with
 *      cryptographic SHA-256 snapshot hash) + Annexures Schedule CSV + actual Evidence Vault files
 *      named Annexure_A_<file>, Annexure_B_<file>, etc.
 */

import crypto from "crypto";
import ExcelJS from "exceljs";
import JSZip from "jszip";
import { r2StorageService } from "@/modules/asset-processing/r2.storage";
import { logger } from "@/lib/logger";
import {
  DEPARTMENT_LABELS,
  DOMAIN_LABELS,
  SIGNOFF_ROLE_LABELS,
  type DdqEngagementRecord,
  type DdqQuestionEvidenceLinkRecord,
  type DdqQuestionRecord,
  type DdqSignoffRecord,
  type EvidenceItemRecord,
} from "@/contracts/ddq.contracts";

export interface DdqExportContext {
  engagement: DdqEngagementRecord;
  orgName: string;
  questions: DdqQuestionRecord[];
  annexures: Array<{
    annexure_label: string;
    evidence_item: EvidenceItemRecord;
    question_codes: string[];
  }>;
  signoffs: DdqSignoffRecord[];
  originalXlsxBuffer?: Buffer | null;
}

export function computeDdqSnapshotHash(
  engagementId: string,
  questions: Array<Pick<DdqQuestionRecord, "question_code" | "final_answer" | "draft_answer" | "status">>
): string {
  const canonical = questions
    .map((q) => `${q.question_code}|${q.status}|${(q.final_answer || q.draft_answer || "").trim()}`)
    .join("\n");
  return crypto.createHash("sha256").update(`${engagementId}\n${canonical}`, "utf8").digest("hex");
}

function getEffectiveAnswer(q: DdqQuestionRecord): string {
  return (q.final_answer || q.draft_answer || "").trim();
}

function formatAnnexureRefsForQuestion(links?: DdqQuestionEvidenceLinkRecord[]): string {
  if (!links || links.length === 0) return "";
  return links
    .map((l) => `${l.annexure_label}${l.evidence_item?.title ? ` (${l.evidence_item.title})` : ""}`)
    .join("; ");
}

function sanitizeFileSlug(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 64) || "DDQ";
}

export class DdqExportService {
  /**
   * Builds a completed .xlsx workbook:
   * - If the DDQ originated from an uploaded .xlsx file, populates answers directly into the
   *   original sheet/row/answer_col & evidence_col cells while keeping the bank's layout intact,
   *   and appends an "Annexures & Sign-Off" tab.
   * - Otherwise builds a structured multi-tab enterprise Excel workbook.
   */
  public async generateCompletedXlsx(ctx: DdqExportContext): Promise<{
    buffer: Buffer;
    fileName: string;
    mimeType: string;
  }> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = `Cogent Compliance Operations (${ctx.orgName})`;
    workbook.created = new Date();

    let sourceBuffer = ctx.originalXlsxBuffer ?? null;
    if (!sourceBuffer && ctx.engagement.source_format === "XLSX" && ctx.engagement.source_storage_key) {
      try {
        sourceBuffer = await r2StorageService.getObjectBuffer(ctx.engagement.source_storage_key);
      } catch (err) {
        logger.warn("Could not fetch original XLSX from R2; generating structured export workbook", {
          ddqId: ctx.engagement.id,
          error: (err as Error).message,
        });
      }
    }

    const canRoundTrip =
      Boolean(sourceBuffer) &&
      ctx.questions.some(
        (q) => q.source_sheet_name && q.source_row_number && q.source_answer_col
      );

    if (canRoundTrip && sourceBuffer) {
      await workbook.xlsx.load(sourceBuffer as unknown as ArrayBuffer);

      for (const q of ctx.questions) {
        if (!q.source_sheet_name || !q.source_row_number || !q.source_answer_col) continue;
        const sheet = workbook.getWorksheet(q.source_sheet_name);
        if (!sheet) continue;

        const row = sheet.getRow(q.source_row_number);
        const answerText = getEffectiveAnswer(q);
        if (answerText) {
          const ansCell = row.getCell(q.source_answer_col);
          ansCell.value = answerText;
          ansCell.alignment = { wrapText: true, vertical: "top" };
        }

        const annexText = formatAnnexureRefsForQuestion(q.evidence_links);
        if (annexText && q.source_evidence_col) {
          const evCell = row.getCell(q.source_evidence_col);
          evCell.value = annexText;
          evCell.alignment = { wrapText: true, vertical: "top" };
        }
        row.commit();
      }
    } else {
      // Build structured Responses worksheet
      const ws = workbook.addWorksheet("DDQ Responses");
      ws.columns = [
        { header: "Ref", key: "code", width: 10 },
        { header: "Section", key: "section", width: 22 },
        { header: "Domain", key: "domain", width: 22 },
        { header: "Owner Dept", key: "dept", width: 22 },
        { header: "Question", key: "question", width: 48 },
        { header: "Institution Response", key: "answer", width: 62 },
        { header: "Grounding", key: "grounding", width: 22 },
        { header: "Annexures / Evidence", key: "annexures", width: 32 },
        { header: "Statutory Citations", key: "citations", width: 34 },
        { header: "Validation Status", key: "status", width: 18 },
      ];

      const headerRow = ws.getRow(1);
      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF0F172A" },
      };

      for (const q of ctx.questions) {
        const row = ws.addRow({
          code: q.question_code,
          section: q.section_name || "General",
          domain: DOMAIN_LABELS[q.domain] || q.domain,
          dept: DEPARTMENT_LABELS[q.assigned_department] || q.assigned_department,
          question: q.question_text,
          answer: getEffectiveAnswer(q) || "[PENDING RESPONSE]",
          grounding: q.grounding_classification,
          annexures: formatAnnexureRefsForQuestion(q.evidence_links) || "None attached",
          citations: (q.statutory_citations || [])
            .map((c) => `${c.authority}: ${c.reference}`)
            .join("; "),
          status: q.status,
        });
        row.alignment = { wrapText: true, vertical: "top" };
      }
    }

    // Always include Annexures & Executive Sign-Off summary tab
    const annexSheetName = workbook.getWorksheet("Annexures & Sign-Off")
      ? "Cogent Annexures"
      : "Annexures & Sign-Off";
    const annexSheet = workbook.addWorksheet(annexSheetName);
    annexSheet.columns = [
      { header: "Annexure", key: "label", width: 16 },
      { header: "Document Title", key: "title", width: 36 },
      { header: "Category", key: "category", width: 24 },
      { header: "Owner Department", key: "dept", width: 22 },
      { header: "Version", key: "version", width: 10 },
      { header: "Expiry Date", key: "expiry", width: 16 },
      { header: "Health", key: "health", width: 16 },
      { header: "SHA-256 Hash", key: "hash", width: 34 },
      { header: "Referenced By Questions", key: "refs", width: 28 },
    ];
    annexSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    annexSheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1D4ED8" },
    };

    for (const ax of ctx.annexures) {
      annexSheet.addRow({
        label: ax.annexure_label,
        title: ax.evidence_item.title,
        category: ax.evidence_item.category,
        dept: DEPARTMENT_LABELS[ax.evidence_item.owner_department] || ax.evidence_item.owner_department,
        version: `v${ax.evidence_item.version_number}`,
        expiry: ax.evidence_item.expiry_date || "No Expiry",
        health: ax.evidence_item.computed_health,
        hash: ax.evidence_item.sha256_hash || "N/A",
        refs: ax.question_codes.join(", "),
      });
    }

    annexSheet.addRow({});
    const signHeader = annexSheet.addRow(["Executive Sign-Off Register"]);
    signHeader.font = { bold: true, size: 12 };
    annexSheet.addRow(["Role", "Signer", "Status", "Decided At", "Snapshot SHA-256", "Comments"]);
    for (const s of ctx.signoffs) {
      annexSheet.addRow([
        SIGNOFF_ROLE_LABELS[s.signoff_role] || s.signoff_role,
        s.signer_name || s.signer_email || "Pending assignment",
        s.status,
        s.decided_at ? s.decided_at.slice(0, 19).replace("T", " ") + "Z" : "Pending",
        s.snapshot_sha256 || "Pending",
        s.comments || "",
      ]);
    }

    const arrayBuf = await workbook.xlsx.writeBuffer();
    const buffer = Buffer.from(arrayBuf as ArrayBuffer);
    const fileName = `${sanitizeFileSlug(ctx.engagement.requesting_institution)}_${sanitizeFileSlug(ctx.engagement.title)}_Completed.xlsx`;

    return {
      buffer,
      fileName,
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    };
  }

  /**
   * Builds the complete Zipped Submission Package (.zip):
   *  - 01_<Completed_Questionnaire>.xlsx
   *  - 02_Executive_Cover_and_SignOff_Certificate.md
   *  - 03_Annexures_Schedule.csv
   *  - Annexures/Annexure_A_<filename> ...
   */
  public async generateSubmissionZipBundle(ctx: DdqExportContext): Promise<{
    buffer: Buffer;
    fileName: string;
    mimeType: string;
    snapshotSha256: string;
  }> {
    const zip = new JSZip();
    const snapshotSha256 = computeDdqSnapshotHash(ctx.engagement.id, ctx.questions);

    // 1. Completed Excel questionnaire
    const xlsx = await this.generateCompletedXlsx(ctx);
    zip.file(`01_${xlsx.fileName}`, xlsx.buffer);

    // 2. Executive Cover & Sign-Off Certificate
    const validatedCount = ctx.questions.filter(
      (q) => q.status === "CCO_VALIDATED" || q.status === "APPROVED"
    ).length;
    const gapCount = ctx.questions.filter((q) => q.evidence_gap_flag).length;

    const signoffLines = ctx.signoffs.map(
      (s) =>
        `| ${SIGNOFF_ROLE_LABELS[s.signoff_role] || s.signoff_role} | ${s.signer_name || s.signer_email || "—"} | **${s.status}** | ${s.decided_at ? s.decided_at.slice(0, 10) : "Pending"} | \`${(s.snapshot_sha256 || "—").slice(0, 16)}\` |`
    );

    const coverMd = [
      `# Due Diligence Questionnaire (DDQ) Submission Pack`,
      ``,
      `- **Submitting Institution:** ${ctx.orgName}`,
      `- **Requesting Institution:** ${ctx.engagement.requesting_institution} (${ctx.engagement.requester_type})`,
      `- **DDQ Title:** ${ctx.engagement.title}`,
      `- **Reference Code:** ${ctx.engagement.reference_code || "N/A"}`,
      `- **Generated At (UTC):** ${new Date().toISOString()}`,
      `- **Response Snapshot SHA-256:** \`${snapshotSha256}\``,
      ``,
      `## Completion & Grounding Summary`,
      `- **Total Questions:** ${ctx.questions.length}`,
      `- **CCO Validated / Approved:** ${validatedCount} / ${ctx.questions.length}`,
      `- **Open Evidence Gaps:** ${gapCount}`,
      `- **Attached Annexures:** ${ctx.annexures.length}`,
      ``,
      `## Executive Sign-Off Attestation Register`,
      `| Executive Role | Signer | Status | Date | Snapshot Hash |`,
      `|---|---|---|---|---|`,
      ...(signoffLines.length > 0 ? signoffLines : [`| — | No sign-off gates recorded | — | — | — |`]),
      ``,
      `## Factual Integrity Statement`,
      `Responses in this package distinguish between verified institutional evidence, management assertions, and prospective commitments. Human executive review and CCO approval are required prior to external submission.`,
    ].join("\n");

    zip.file("02_Executive_Cover_and_SignOff_Certificate.md", coverMd);

    // 3. Annexures Schedule CSV
    const csvRows = [
      ["Annexure", "Document Title", "Category", "Owner Department", "Version", "Expiry Date", "Health", "SHA-256", "Question Codes"].join(","),
      ...ctx.annexures.map((ax) =>
        [
          ax.annexure_label,
          `"${ax.evidence_item.title.replace(/"/g, '""')}"`,
          ax.evidence_item.category,
          ax.evidence_item.owner_department,
          `v${ax.evidence_item.version_number}`,
          ax.evidence_item.expiry_date || "No Expiry",
          ax.evidence_item.computed_health,
          ax.evidence_item.sha256_hash || "",
          `"${ax.question_codes.join("; ")}"`,
        ].join(",")
      ),
    ];
    zip.file("03_Annexures_Schedule.csv", csvRows.join("\n"));

    // 4. Attach actual Evidence Vault binary files (or text extracts/manifests) under Annexures/
    const annexFolder = zip.folder("Annexures");
    for (const ax of ctx.annexures) {
      const safeLabel = ax.annexure_label.replace(/\s+/g, "_");
      const safeBase = sanitizeFileSlug(ax.evidence_item.file_name || ax.evidence_item.title);
      let fileBuffer: Buffer | null = null;

      if (ax.evidence_item.storage_key) {
        try {
          fileBuffer = await r2StorageService.getObjectBuffer(ax.evidence_item.storage_key);
        } catch {
          fileBuffer = null;
        }
      }

      if (fileBuffer && annexFolder) {
        annexFolder.file(`${safeLabel}_${safeBase}`, fileBuffer);
      } else if (annexFolder) {
        const fallbackDoc = [
          `# ${ax.annexure_label}: ${ax.evidence_item.title}`,
          `Category: ${ax.evidence_item.category}`,
          `Owner Department: ${ax.evidence_item.owner_department}`,
          `Version: v${ax.evidence_item.version_number}`,
          `Effective Date: ${ax.evidence_item.effective_date || "N/A"}`,
          `Expiry Date: ${ax.evidence_item.expiry_date || "N/A"}`,
          `SHA-256: ${ax.evidence_item.sha256_hash || "N/A"}`,
          `Referenced By: ${ax.question_codes.join(", ")}`,
          ``,
          `--- Extracted Content ---`,
          ax.evidence_item.extracted_text || ax.evidence_item.description || "(Attach original binary file in Evidence Vault.)",
        ].join("\n");
        annexFolder.file(`${safeLabel}_${safeBase}.txt`, fallbackDoc);
      }
    }

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
    const fileName = `${sanitizeFileSlug(ctx.engagement.requesting_institution)}_${sanitizeFileSlug(ctx.engagement.title)}_Submission_Pack.zip`;

    return {
      buffer: zipBuffer,
      fileName,
      mimeType: "application/zip",
      snapshotSha256,
    };
  }
}

export const ddqExportService = new DdqExportService();
