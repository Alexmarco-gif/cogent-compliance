/**
 * Cogent Regulatory Intelligence Platform
 * Work Product PDF (pdf-lib) & Word DOCX (docx) Export Service
 * Document Reference: Document 14 & Document 15 (Phase 3)
 */

import crypto from "crypto";
import { PDFDocument, StandardFonts, rgb, grayscale, degrees } from "pdf-lib";
import {
  Document,
  Packer,
  Paragraph,
  HeadingLevel,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  ShadingType,
} from "docx";
import { createAdminSupabaseClient } from "@/lib/supabase";
import { r2StorageService } from "@/modules/asset-processing/r2.storage";
import { auditService } from "@/modules/audit/audit.service";
import { entitlementsService } from "@/modules/billing/entitlements.service";
import { workProductService } from "@/modules/work-products/work-product.service";
import { logger } from "@/lib/logger";
import type { WorkProductRecord } from "@/contracts/work-product.contracts";

export interface WorkProductExportResult {
  work_product_id: string;
  format: "pdf" | "docx" | "md";
  filename: string;
  content_type: string;
  storage_key: string;
  download_url: string;
  file_size_bytes: number;
  file_sha256: string;
  watermarked: boolean;
  generated_at: string;
  buffer: Buffer;
}

export class WorkProductExportService {
  /**
   * Standard PDF fonts (Helvetica / Courier) use WinAnsi encoding.
   * Normalize Nigerian Naira (₦), arrows, and non-WinAnsi symbols safely before drawText.
   */
  private toWinAnsiSafe(input: string): string {
    return input
      .replace(/₦/g, "NGN ")
      .replace(/→/g, "->")
      .replace(/←/g, "<-")
      .replace(/≥/g, ">=")
      .replace(/≤/g, "<=")
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/[—–]/g, "-")
      .replace(/•/g, "*")
      .replace(/[^\x20-\x7E\xA0-\xFF]/g, " ");
  }

  private wrapLines(text: string, maxChars: number): string[] {
    const out: string[] = [];
    const paragraphs = text.split(/\r?\n/);
    for (const para of paragraphs) {
      const trimmed = para.trimEnd();
      if (!trimmed) {
        out.push("");
        continue;
      }
      const words = trimmed.split(/\s+/);
      let current = "";
      for (const word of words) {
        if (!current) {
          current = word.slice(0, maxChars);
          if (word.length > maxChars) {
            out.push(current);
            current = "";
          }
        } else if (current.length + 1 + word.length <= maxChars) {
          current += ` ${word}`;
        } else {
          out.push(current);
          current = word.slice(0, maxChars);
        }
      }
      if (current) out.push(current);
    }
    return out;
  }

  private sanitizeFilename(title: string, version: number, ext: "pdf" | "docx" | "md"): string {
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48);
    return `${slug || "cogent-work-product"}-v${version}.${ext}`;
  }

  private async compilePdf(
    wp: WorkProductRecord,
    institutionName: string,
    watermarked: boolean
  ): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create();
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontMono = await pdfDoc.embedFont(StandardFonts.Courier);

    const colorBlack = rgb(0.04, 0.04, 0.05);
    const colorMuted = rgb(0.42, 0.44, 0.48);
    const colorAccent = rgb(0.06, 0.09, 0.16);
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const marginX = 42;
    const contentWidth = pageWidth - marginX * 2;

    const addHeader = (page: ReturnType<typeof pdfDoc.addPage>, pageIndex: number) => {
      page.drawRectangle({
        x: 36,
        y: pageHeight - 66,
        width: pageWidth - 72,
        height: 40,
        color: colorAccent,
      });
      page.drawText(
        this.toWinAnsiSafe(`COGENT REGULATORY WORK PRODUCT  |  ${wp.workflow_type}`),
        {
          x: 46,
          y: pageHeight - 43,
          size: 8.5,
          font: fontBold,
          color: rgb(1, 1, 1),
        }
      );
      page.drawText(
        this.toWinAnsiSafe(
          `${institutionName}  |  v${wp.version_number} (${wp.status})  |  Jurisdictions: ${(wp.jurisdiction_scope || ["NG"]).join(", ")}`
        ),
        {
          x: 46,
          y: pageHeight - 57,
          size: 7.5,
          font: fontRegular,
          color: rgb(0.84, 0.86, 0.9),
        }
      );

      if (watermarked) {
        page.drawText("EVALUATION PREVIEW - NOT FOR SUPERVISORY FILING", {
          x: 68,
          y: 350,
          size: 20,
          font: fontBold,
          color: rgb(0.8, 0.18, 0.18),
          rotate: degrees(42),
          opacity: 0.16,
        });
      }

      page.drawText(
        this.toWinAnsiSafe(
          `SHA-256: ${wp.source_hash_sha256.slice(0, 24)}...  |  Page ${pageIndex}`
        ),
        {
          x: marginX,
          y: 26,
          size: 7.5,
          font: fontMono,
          color: colorMuted,
        }
      );
    };

    let pageNum = 1;
    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    addHeader(page, pageNum);

    let y = pageHeight - 92;
    const ensureSpace = (needed: number) => {
      if (y - needed < 54) {
        pageNum += 1;
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        addHeader(page, pageNum);
        y = pageHeight - 90;
      }
    };

    // Title Block
    for (const tLine of this.wrapLines(this.toWinAnsiSafe(wp.title), 68)) {
      ensureSpace(18);
      page.drawText(tLine, {
        x: marginX,
        y,
        size: 13,
        font: fontBold,
        color: colorBlack,
      });
      y -= 17;
    }

    page.drawRectangle({
      x: marginX,
      y: y - 4,
      width: contentWidth,
      height: 1,
      color: grayscale(0.82),
    });
    y -= 18;

    // Markdown body rendering
    const rawLines = wp.markdown_content.split(/\r?\n/);
    for (const rawLine of rawLines) {
      const trimmed = rawLine.trim();
      if (!trimmed) {
        y -= 7;
        continue;
      }

      const isHeading = /^#{1,4}\s+/.test(trimmed);
      const cleanLine = this.toWinAnsiSafe(
        trimmed
          .replace(/^#{1,4}\s+/, "")
          .replace(/\*\*([^*]+)\*\*/g, "$1")
          .replace(/`([^`]+)`/g, "$1")
      );

      if (isHeading) {
        ensureSpace(24);
        y -= 4;
        for (const l of this.wrapLines(cleanLine.toUpperCase(), 80)) {
          ensureSpace(14);
          page.drawText(l, {
            x: marginX,
            y,
            size: 10,
            font: fontBold,
            color: colorAccent,
          });
          y -= 14;
        }
        continue;
      }

      const wrapped = this.wrapLines(cleanLine, 92);
      for (const l of wrapped) {
        ensureSpace(13);
        page.drawText(l, {
          x: marginX,
          y,
          size: 8.8,
          font: trimmed.startsWith("|") ? fontMono : fontRegular,
          color: colorBlack,
        });
        y -= 12;
      }
    }

    // Citations Appendix
    if (wp.citations && wp.citations.length > 0) {
      ensureSpace(44);
      y -= 12;
      page.drawText("STATUTORY & LIVE REGULATORY CITATIONS APPENDIX", {
        x: marginX,
        y,
        size: 10,
        font: fontBold,
        color: colorAccent,
      });
      y -= 16;

      for (const cit of wp.citations.slice(0, 30)) {
        const label = this.toWinAnsiSafe(
          `[${cit.badge_label}] ${cit.regulator || ""} ${cit.instrument_title || ""} ${cit.clause_reference || ""} ${cit.retrieved_url ? `(${cit.retrieved_url})` : ""}`
        ).trim();
        for (const l of this.wrapLines(label, 92)) {
          ensureSpace(12);
          page.drawText(l, {
            x: marginX + 4,
            y,
            size: 8,
            font: fontRegular,
            color: colorMuted,
          });
          y -= 11;
        }
      }
    }

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  private async compileDocx(
    wp: WorkProductRecord,
    institutionName: string,
    watermarked: boolean
  ): Promise<Buffer> {
    const children: Array<Paragraph | Table> = [];

    if (watermarked) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: "EVALUATION PREVIEW — UPGRADE TO GROWTH OR SCALE FOR PRODUCTION EXPORT",
              bold: true,
              color: "B91C1C",
              size: 18,
            }),
          ],
        })
      );
    }

    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun({ text: wp.title, bold: true })],
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Institution: ${institutionName}  |  Workflow: ${wp.workflow_type}  |  Version: v${wp.version_number} (${wp.status})  |  Jurisdictions: ${(wp.jurisdiction_scope || ["NG"]).join(", ")}`,
            size: 18,
            color: "52525B",
          }),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `SHA-256 Digest: ${wp.source_hash_sha256}`,
            font: "Courier New",
            size: 16,
            color: "71717A",
          }),
        ],
      }),
      new Paragraph({ text: "" })
    );

    // Parse Markdown blocks & Markdown tables into native Word paragraphs/tables
    const lines = wp.markdown_content.split(/\r?\n/);
    let i = 0;
    while (i < lines.length) {
      const line = lines[i] ?? "";
      const trimmed = line.trim();

      if (!trimmed) {
        i++;
        continue;
      }

      // Detect Markdown table block
      if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
        const tableLines: string[] = [];
        while (
          i < lines.length &&
          (lines[i] ?? "").trim().startsWith("|") &&
          (lines[i] ?? "").trim().endsWith("|")
        ) {
          tableLines.push((lines[i] ?? "").trim());
          i++;
        }

        const dataLines = tableLines.filter((tl) => !/^\|[\s:|-]+\|$/.test(tl));
        if (dataLines.length > 0) {
          const rows = dataLines.map((rowLine, rowIdx) => {
            const cells = rowLine
              .slice(1, -1)
              .split("|")
              .map((c) => c.trim().replace(/\*\*([^*]+)\*\*/g, "$1"));

            return new TableRow({
              tableHeader: rowIdx === 0,
              children: cells.map(
                (cellText) =>
                  new TableCell({
                    shading:
                      rowIdx === 0
                        ? { type: ShadingType.SOLID, color: "F4F4F5" }
                        : undefined,
                    borders: {
                      top: { style: BorderStyle.SINGLE, size: 1, color: "D4D4D8" },
                      bottom: { style: BorderStyle.SINGLE, size: 1, color: "D4D4D8" },
                      left: { style: BorderStyle.SINGLE, size: 1, color: "D4D4D8" },
                      right: { style: BorderStyle.SINGLE, size: 1, color: "D4D4D8" },
                    },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: cellText,
                            bold: rowIdx === 0,
                            size: 18,
                          }),
                        ],
                      }),
                    ],
                  })
              ),
            });
          });

          children.push(
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows,
            }),
            new Paragraph({ text: "" })
          );
        }
        continue;
      }

      if (/^#{1,2}\s+/.test(trimmed)) {
        children.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [
              new TextRun({
                text: trimmed.replace(/^#{1,2}\s+/, "").replace(/\*\*/g, ""),
                bold: true,
              }),
            ],
          })
        );
      } else if (/^#{3,4}\s+/.test(trimmed)) {
        children.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_3,
            children: [
              new TextRun({
                text: trimmed.replace(/^#{3,4}\s+/, "").replace(/\*\*/g, ""),
                bold: true,
              }),
            ],
          })
        );
      } else if (/^[-*]\s+/.test(trimmed)) {
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            children: [
              new TextRun({
                text: trimmed.replace(/^[-*]\s+/, "").replace(/\*\*([^*]+)\*\*/g, "$1"),
                size: 20,
              }),
            ],
          })
        );
      } else {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: trimmed.replace(/\*\*([^*]+)\*\*/g, "$1"),
                size: 20,
              }),
            ],
          })
        );
      }
      i++;
    }

    // Citations Appendix
    if (wp.citations && wp.citations.length > 0) {
      children.push(
        new Paragraph({ text: "" }),
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text: "Statutory & Regulatory Citations Appendix", bold: true })],
        })
      );
      for (const cit of wp.citations) {
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            children: [
              new TextRun({
                text: `[${cit.badge_label}] ${cit.regulator || ""} ${cit.instrument_title || ""} ${cit.clause_reference || ""}${cit.retrieved_url ? ` — ${cit.retrieved_url}` : ""}`.trim(),
                size: 18,
              }),
            ],
          })
        );
      }
    }

    const doc = new Document({
      creator: "Cogent Regulatory Intelligence Platform",
      title: wp.title,
      sections: [{ children }],
    });

    return Buffer.from(await Packer.toBuffer(doc));
  }

  private compileMarkdown(
    wp: WorkProductRecord,
    institutionName: string,
    watermarked: boolean
  ): Buffer {
    const lines: string[] = [
      `# ${wp.title}`,
      "",
      `- **Institution:** ${institutionName}`,
      `- **Workflow:** ${wp.workflow_type}`,
      `- **Version:** v${wp.version_number} (${wp.status})`,
      `- **Jurisdiction Scope:** ${(wp.jurisdiction_scope || ["NG"]).join(", ")}`,
      `- **Document SHA-256:** \`${wp.source_hash_sha256}\``,
      `- **Exported At:** ${new Date().toISOString()}`,
    ];

    if (watermarked) {
      lines.push(
        "",
        "> **EVALUATION PILOT WATERMARK:** Generated on Cogent Evaluation Pilot. Upgrade to Growth or Scale for unwatermarked regulatory work product exports."
      );
    }

    lines.push("", "---", "", wp.markdown_content.trim());

    if (wp.citations && wp.citations.length > 0) {
      lines.push("", "## Statutory & Regulatory Citations Appendix", "");
      for (const cit of wp.citations) {
        const label = `[${cit.badge_label}]`;
        const meta = [cit.regulator, cit.instrument_title, cit.clause_reference]
          .filter(Boolean)
          .join(" — ");
        const urlPart = cit.retrieved_url ? ` (${cit.retrieved_url})` : "";
        lines.push(`- **${label}** ${meta}${urlPart}`.trim());
      }
    }

    return Buffer.from(`${lines.join("\n")}\n`, "utf-8");
  }

  /**
   * Exports a persisted Work Product into PDF, DOCX, or Markdown, uploads to Cloudflare R2 (when configured),
   * updates last_exported_at, and records an immutable audit event.
   */
  public async exportWorkProduct(
    tenantId: string,
    userId: string,
    workProductId: string,
    format: "pdf" | "docx" | "md"
  ): Promise<WorkProductExportResult> {
    const record = await workProductService.getWorkProductWithRevisions(tenantId, workProductId);
    if (!record) {
      throw new Error(`Work product ${workProductId} not found`);
    }

    const wp = record.work_product;
    const supabase = createAdminSupabaseClient();

    const [{ data: tenantRow }, subInfo, unwatermarked] = await Promise.all([
      supabase.from("tenants").select("name").eq("id", tenantId).maybeSingle(),
      entitlementsService.getTenantSubscriptionInfo(tenantId),
      entitlementsService.checkTenantEntitlement(tenantId, "export_unwatermarked"),
    ]);

    if (format === "docx" && !subInfo.plan.features.work_product_docx_export) {
      throw new Error(
        "DOCX_EXPORT_UPGRADE_REQUIRED: Editable Word (.docx) export requires Growth, Scale, or Enterprise plan."
      );
    }

    const institutionName = tenantRow?.name || "Regulated Financial Institution";
    const watermarked = !unwatermarked.allowed;

    const buffer =
      format === "pdf"
        ? await this.compilePdf(wp, institutionName, watermarked)
        : format === "docx"
          ? await this.compileDocx(wp, institutionName, watermarked)
          : this.compileMarkdown(wp, institutionName, watermarked);

    const contentType =
      format === "pdf"
        ? "application/pdf"
        : format === "docx"
          ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          : "text/markdown; charset=utf-8";
    const filename = this.sanitizeFilename(wp.title, wp.version_number, format);
    const fileSha256 = crypto.createHash("sha256").update(buffer).digest("hex");
    const storageKey = `tenants/${tenantId}/work-products/${wp.id}/${filename}`;

    await r2StorageService.putObjectBuffer(storageKey, buffer, contentType);
    const downloadUrl = await r2StorageService.generatePresignedDownloadUrl(storageKey, 3600);

    await supabase
      .from("work_product_artifacts")
      .update({ last_exported_at: new Date().toISOString() })
      .eq("tenant_id", tenantId)
      .eq("id", wp.id);

    await auditService.appendEvent({
      tenantId,
      actorId: userId,
      actorType: "USER",
      action: "WORK_PRODUCT_EXPORTED",
      entityType: "WORK_PRODUCT_ARTIFACT",
      entityId: wp.id,
      eventData: {
        format,
        filename,
        storageKey,
        fileSizeBytes: buffer.length,
        fileSha256,
        watermarked,
      },
    });

    logger.info("Exported work product artifact", {
      tenantId,
      workProductId: wp.id,
      format,
      fileSizeBytes: buffer.length,
    });

    return {
      work_product_id: wp.id,
      format,
      filename,
      content_type: contentType,
      storage_key: storageKey,
      download_url: downloadUrl,
      file_size_bytes: buffer.length,
      file_sha256: fileSha256,
      watermarked,
      generated_at: new Date().toISOString(),
      buffer,
    };
  }
}

export const workProductExportService = new WorkProductExportService();
