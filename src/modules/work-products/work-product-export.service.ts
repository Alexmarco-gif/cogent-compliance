/**
 * Cogent Regulatory Intelligence Platform
 * Work Product PDF (pdf-lib) & Word DOCX (docx) Export Service
 * Document Reference: Document 14 & Document 15 (Phase 3)
 */

import crypto from "crypto";
import { PDFDocument, StandardFonts, rgb, grayscale, degrees, type PDFFont } from "pdf-lib";
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
import { sanitizeAssistantOutput } from "@/lib/ai/output-sanitizer";
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

  private stripInlineMarkdown(input: string): string {
    return input
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, "$1 ($2)")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/`([^`]+)`/g, "$1");
  }

  private wrapTextByWidth(
    text: string,
    font: PDFFont,
    fontSize: number,
    maxWidth: number
  ): string[] {
    const out: string[] = [];
    const safeMax = Math.max(24, maxWidth);
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
        const candidate = current ? `${current} ${word}` : word;
        if (font.widthOfTextAtSize(candidate, fontSize) <= safeMax) {
          current = candidate;
          continue;
        }

        if (current) {
          out.push(current);
          current = "";
        }

        if (font.widthOfTextAtSize(word, fontSize) <= safeMax) {
          current = word;
        } else {
          // Break unusually long unbroken tokens (e.g. URLs) cleanly inside bounds
          let piece = "";
          for (const ch of word) {
            if (font.widthOfTextAtSize(piece + ch, fontSize) <= safeMax) {
              piece += ch;
            } else {
              if (piece) out.push(piece);
              piece = ch;
            }
          }
          current = piece;
        }
      }

      if (current) out.push(current);
    }

    return out;
  }

  private parseMarkdownTableRow(rowLine: string): string[] {
    const trimmed = rowLine.trim();
    const inner = trimmed.replace(/^\|/, "").replace(/\|$/, "");
    return inner.split("|").map((c) => this.stripInlineMarkdown(c.trim()));
  }

  private isMarkdownTableSeparator(line: string): boolean {
    const trimmed = line.trim();
    return /^\|?(?:\s*:?-{2,}:?\s*\|)+\s*(?::?-{2,}:?\s*\|?)?$/.test(trimmed);
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

    const colorBlack = rgb(0.08, 0.09, 0.11);
    const colorMuted = rgb(0.42, 0.44, 0.48);
    const colorAccent = rgb(0.06, 0.09, 0.16);
    const colorHeaderBg = rgb(0.95, 0.96, 0.97);
    const colorAltRowBg = rgb(0.985, 0.988, 0.992);
    const colorQuoteBg = rgb(0.965, 0.968, 0.975);
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const marginX = 42;
    const contentWidth = pageWidth - marginX * 2;
    const bottomMargin = 54;

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
    const startNewPage = () => {
      pageNum += 1;
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      addHeader(page, pageNum);
      y = pageHeight - 90;
    };
    const ensureSpace = (needed: number) => {
      if (y - needed < bottomMargin) {
        startNewPage();
      }
    };

    // Title Block
    for (const tLine of this.wrapTextByWidth(this.toWinAnsiSafe(wp.title), fontBold, 13, contentWidth)) {
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

    const drawTableBlock = (rawTableLines: string[]) => {
      const dataLines = rawTableLines.filter((tl) => !this.isMarkdownTableSeparator(tl));
      if (dataLines.length === 0) return;

      const parsedRows = dataLines.map((rl) =>
        this.parseMarkdownTableRow(rl).map((cell) => this.toWinAnsiSafe(cell))
      );
      const numCols = Math.max(1, ...parsedRows.map((r) => r.length));
      const normalizedRows = parsedRows.map((r) => {
        const padded = [...r];
        while (padded.length < numCols) padded.push("");
        return padded;
      });

      // Compute proportional column widths with a safe minimum so narrow label columns stay crisp
      const minColW = Math.min(72, contentWidth / numCols);
      const weights = Array.from({ length: numCols }, (_, colIdx) => {
        const maxChars = normalizedRows.reduce(
          (acc, row) => Math.max(acc, (row[colIdx] || "").length),
          8
        );
        return Math.min(64, Math.max(10, maxChars));
      });
      const totalWeight = weights.reduce((a, b) => a + b, 0) || numCols;
      let colWidths = weights.map((w) => Math.max(minColW, (w / totalWeight) * contentWidth));
      const rawSum = colWidths.reduce((a, b) => a + b, 0);
      if (rawSum > 0) {
        colWidths = colWidths.map((w) => (w / rawSum) * contentWidth);
      }

      const cellPadX = 5;
      const cellPadY = 5;
      const lineHeight = 10.5;

      const prepareRowLayout = (row: string[], isHeader: boolean) => {
        const cellFont = isHeader ? fontBold : fontRegular;
        const cellFontSize = isHeader ? 8.1 : 7.9;
        const wrappedCells = row.map((cellText, colIdx) => {
          const maxCellTextWidth = Math.max(20, (colWidths[colIdx] ?? minColW) - cellPadX * 2);
          const lines = this.wrapTextByWidth(cellText, cellFont, cellFontSize, maxCellTextWidth);
          return lines.length > 0 ? lines : [""];
        });
        const maxLines = Math.max(1, ...wrappedCells.map((l) => l.length));
        const rowHeight = maxLines * lineHeight + cellPadY * 2;
        return { wrappedCells, rowHeight, cellFont, cellFontSize };
      };

      const headerRow = normalizedRows[0];
      const headerLayout = headerRow ? prepareRowLayout(headerRow, true) : null;

      const renderRow = (
        row: string[],
        rowIdx: number,
        isHeader: boolean,
        precomputedLayout?: ReturnType<typeof prepareRowLayout>
      ) => {
        const layout = precomputedLayout || prepareRowLayout(row, isHeader);
        const { wrappedCells, rowHeight, cellFont, cellFontSize } = layout;

        if (y - rowHeight < bottomMargin) {
          startNewPage();
          if (!isHeader && headerRow && headerLayout && y - headerLayout.rowHeight >= bottomMargin) {
            renderRow(headerRow, 0, true, headerLayout);
          }
        }

        const rowTopY = y;
        const rowBottomY = rowTopY - rowHeight;

        let cursorX = marginX;
        for (let colIdx = 0; colIdx < numCols; colIdx++) {
          const colW = colWidths[colIdx] ?? minColW;
          const bgColor = isHeader
            ? colorHeaderBg
            : rowIdx % 2 === 0
              ? colorAltRowBg
              : rgb(1, 1, 1);

          page.drawRectangle({
            x: cursorX,
            y: rowBottomY,
            width: colW,
            height: rowHeight,
            color: bgColor,
            borderColor: isHeader ? grayscale(0.72) : grayscale(0.84),
            borderWidth: 0.6,
          });

          const cellLines = wrappedCells[colIdx] || [""];
          let textY = rowTopY - cellPadY - cellFontSize + 1;
          for (const cLine of cellLines) {
            if (cLine) {
              page.drawText(cLine, {
                x: cursorX + cellPadX,
                y: textY,
                size: cellFontSize,
                font: cellFont,
                color: isHeader ? colorAccent : colorBlack,
              });
            }
            textY -= lineHeight;
          }

          cursorX += colW;
        }

        y = rowBottomY;
      };

      y -= 4;
      for (let rIdx = 0; rIdx < normalizedRows.length; rIdx++) {
        const row = normalizedRows[rIdx]!;
        renderRow(row, rIdx, rIdx === 0, rIdx === 0 && headerLayout ? headerLayout : undefined);
      }
      y -= 10;
    };

    // Sanitized Markdown body rendering
    const sanitizedContent = sanitizeAssistantOutput(wp.markdown_content);
    const rawLines = sanitizedContent.split(/\r?\n/);
    let idx = 0;
    while (idx < rawLines.length) {
      const rawLine = rawLines[idx] ?? "";
      const trimmed = rawLine.trim();

      if (!trimmed) {
        y -= 6;
        idx++;
        continue;
      }

      // 1. Horizontal Rules (---, ***, ___)
      if (/^(?:-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
        ensureSpace(12);
        y -= 4;
        page.drawRectangle({
          x: marginX,
          y,
          width: contentWidth,
          height: 0.75,
          color: grayscale(0.85),
        });
        y -= 10;
        idx++;
        continue;
      }

      // 2. Markdown Tables
      if (trimmed.startsWith("|") && trimmed.indexOf("|", 1) !== -1) {
        const tableLines: string[] = [];
        while (idx < rawLines.length) {
          const candidate = (rawLines[idx] ?? "").trim();
          if (candidate.startsWith("|") && candidate.indexOf("|", 1) !== -1) {
            tableLines.push(candidate);
            idx++;
          } else {
            break;
          }
        }
        drawTableBlock(tableLines);
        continue;
      }

      // 3. Headings
      const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
      if (headingMatch?.[2]) {
        const level = headingMatch[1]?.length ?? 2;
        const cleanHeading = this.toWinAnsiSafe(this.stripInlineMarkdown(headingMatch[2]));
        const headingSize = level <= 2 ? 10.5 : 9.5;
        ensureSpace(24);
        y -= 5;
        for (const l of this.wrapTextByWidth(cleanHeading.toUpperCase(), fontBold, headingSize, contentWidth)) {
          ensureSpace(15);
          page.drawText(l, {
            x: marginX,
            y,
            size: headingSize,
            font: fontBold,
            color: colorAccent,
          });
          y -= 14;
        }
        y -= 2;
        idx++;
        continue;
      }

      // 4. Blockquotes
      if (trimmed.startsWith(">")) {
        const quoteLines: string[] = [];
        while (idx < rawLines.length && (rawLines[idx] ?? "").trim().startsWith(">")) {
          quoteLines.push((rawLines[idx] ?? "").trim().replace(/^>\s?/, ""));
          idx++;
        }
        const quoteText = this.toWinAnsiSafe(this.stripInlineMarkdown(quoteLines.join(" ")));
        const wrappedQuote = this.wrapTextByWidth(quoteText, fontRegular, 8.6, contentWidth - 20);
        const blockHeight = wrappedQuote.length * 12 + 10;
        ensureSpace(blockHeight + 4);
        const blockTop = y;
        page.drawRectangle({
          x: marginX,
          y: blockTop - blockHeight,
          width: contentWidth,
          height: blockHeight,
          color: colorQuoteBg,
        });
        page.drawRectangle({
          x: marginX,
          y: blockTop - blockHeight,
          width: 2.5,
          height: blockHeight,
          color: colorAccent,
        });
        let qY = blockTop - 13;
        for (const ql of wrappedQuote) {
          page.drawText(ql, {
            x: marginX + 10,
            y: qY,
            size: 8.6,
            font: fontRegular,
            color: colorBlack,
          });
          qY -= 12;
        }
        y = blockTop - blockHeight - 8;
        continue;
      }

      // 5. Bulleted & Numbered Lists
      const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/);
      const numberedMatch = trimmed.match(/^(\d+\.)\s+(.+)$/);
      if (bulletMatch?.[1] || numberedMatch?.[2]) {
        const marker = numberedMatch?.[1] || "*";
        const bodyText = this.toWinAnsiSafe(
          this.stripInlineMarkdown(bulletMatch?.[1] || numberedMatch?.[2] || "")
        );
        const wrapped = this.wrapTextByWidth(bodyText, fontRegular, 8.8, contentWidth - 18);
        for (let lineIdx = 0; lineIdx < wrapped.length; lineIdx++) {
          ensureSpace(13);
          if (lineIdx === 0) {
            page.drawText(marker, {
              x: marginX + 4,
              y,
              size: 8.8,
              font: fontBold,
              color: colorAccent,
            });
          }
          page.drawText(wrapped[lineIdx]!, {
            x: marginX + 18,
            y,
            size: 8.8,
            font: fontRegular,
            color: colorBlack,
          });
          y -= 12.2;
        }
        y -= 2;
        idx++;
        continue;
      }

      // 6. Standard Prose Paragraph
      const cleanLine = this.toWinAnsiSafe(this.stripInlineMarkdown(trimmed));
      const wrapped = this.wrapTextByWidth(cleanLine, fontRegular, 8.9, contentWidth);
      for (const l of wrapped) {
        ensureSpace(13);
        page.drawText(l, {
          x: marginX,
          y,
          size: 8.9,
          font: fontRegular,
          color: colorBlack,
        });
        y -= 12.5;
      }
      y -= 3;
      idx++;
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
        for (const l of this.wrapTextByWidth(label, fontRegular, 8, contentWidth - 8)) {
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

    // Parse sanitized Markdown blocks & Markdown tables into native Word paragraphs/tables
    const lines = sanitizeAssistantOutput(wp.markdown_content).split(/\r?\n/);
    let i = 0;
    while (i < lines.length) {
      const line = lines[i] ?? "";
      const trimmed = line.trim();

      if (!trimmed) {
        i++;
        continue;
      }

      if (/^(?:-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
        children.push(new Paragraph({ text: "" }));
        i++;
        continue;
      }

      // Detect Markdown table block
      if (trimmed.startsWith("|") && trimmed.indexOf("|", 1) !== -1) {
        const tableLines: string[] = [];
        while (i < lines.length) {
          const candidate = (lines[i] ?? "").trim();
          if (candidate.startsWith("|") && candidate.indexOf("|", 1) !== -1) {
            tableLines.push(candidate);
            i++;
          } else {
            break;
          }
        }

        const dataLines = tableLines.filter((tl) => !this.isMarkdownTableSeparator(tl));
        if (dataLines.length > 0) {
          const parsedRows = dataLines.map((rl) => this.parseMarkdownTableRow(rl));
          const numCols = Math.max(1, ...parsedRows.map((r) => r.length));
          const rows = parsedRows.map((rawCells, rowIdx) => {
            const cells = [...rawCells];
            while (cells.length < numCols) cells.push("");

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
                text: this.stripInlineMarkdown(trimmed.replace(/^#{1,2}\s+/, "")),
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
                text: this.stripInlineMarkdown(trimmed.replace(/^#{3,4}\s+/, "")),
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
                text: this.stripInlineMarkdown(trimmed.replace(/^[-*]\s+/, "")),
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
                text: this.stripInlineMarkdown(trimmed),
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

    lines.push("", "---", "", sanitizeAssistantOutput(wp.markdown_content).trim());

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
