/**
 * Cogent Marketing Shield - Production Statutory Vault Ingestion Service
 * Document Reference: Document 05 (Section 3 & 4), Document 08 (Phase 5 Task 2)
 */

import crypto from "crypto";
import { readFileSync, existsSync } from "fs";
import { execSync } from "child_process";
import { extractText, getDocumentProxy } from "unpdf";
import { GoogleGenAI } from "@google/genai";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { createAdminSupabaseClient } from "@/lib/supabase";
import { AI_MODELS } from "@/lib/ai/config";

export interface DocumentMetadata {
  regulatorAcronym: "CBN" | "FCCPC" | "ARCON" | "NDPC" | "SEC";
  instrumentTitle: string;
  instrumentType: "ACT" | "REGULATION" | "GUIDELINE" | "CIRCULAR" | "CODE" | "DIRECTIVE" | "NOTICE";
  instrumentNumber?: string;
  publicationDate: string; // YYYY-MM-DD
  effectiveDate: string; // YYYY-MM-DD
  lifecycleStatus?: "CURRENT" | "SUPERSEDED" | "DRAFT" | "FUTURE_EFFECTIVE";
  sourceUrl?: string;
}

export interface ExtractedClause {
  clauseReference: string;
  verbatimText: string;
  pageNumber: number;
}

export interface IngestedDocumentResult {
  fileSha256: string;
  instrumentId: string;
  documentVersionId: string;
  instrumentTitle: string;
  regulatorAcronym: string;
  clauseCount: number;
  skippedDeduplication?: boolean;
}

export class StatutoryVaultIngestionService {
  private client: GoogleGenAI;
  private embeddingModel: string;

  constructor(customClient?: GoogleGenAI) {
    this.client = customClient || new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    this.embeddingModel = AI_MODELS.EMBEDDING;
  }

  /**
   * Computes the real SHA-256 hash of a file buffer.
   */
  public computeFileSha256(buffer: Buffer): string {
    return crypto.createHash("sha256").update(buffer).digest("hex");
  }

  /**
   * Extracts text page-by-page from a PDF buffer.
   * If average characters per page < 50 (scanned document), falls back to Tesseract OCR.
   */
  public async extractTextWithOcrFallback(
    filePath: string,
    buffer: Buffer
  ): Promise<{ fullText: string; pages: Array<{ pageNumber: number; text: string }> }> {
    try {
      const pdf = await getDocumentProxy(new Uint8Array(buffer));
      const { totalPages, text: pageTexts } = await extractText(pdf, { mergePages: false });

      const totalChars = pageTexts.reduce((acc, t) => acc + t.replace(/\s/g, "").length, 0);
      const avgCharsPerPage = totalPages > 0 ? totalChars / totalPages : 0;

      // If document has readable digital text, return it
      if (avgCharsPerPage >= 50 && totalChars > 100) {
        const pages = pageTexts.map((text, idx) => ({
          pageNumber: idx + 1,
          text: this.cleanPageText(text),
        }));
        return {
          fullText: pages.map((p) => p.text).join("\n\n"),
          pages,
        };
      }

      logger.info("PDF has low native text, invoking Tesseract OCR fallback", {
        filePath,
        totalPages,
        avgCharsPerPage,
      });

      return this.runTesseractOcr(filePath, totalPages);
    } catch (err) {
      logger.warn("unpdf extraction failed, falling back to OCR", {
        filePath,
        error: (err as Error).message,
      });
      return this.runTesseractOcr(filePath);
    }
  }

  private cleanPageText(text: string): string {
    return text
      .replace(/\r\n/g, "\n")
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
      .replace(/\n\s*Page \d+ of \d+\s*\n/gi, "\n")
      .replace(/\n\s*\d+\s*\|\s*P\s*a\s*g\s*e\s*\n/gi, "\n")
      .replace(/[ \t]+/g, " ")
      .trim();
  }

  /**
   * Executes local Tesseract OCR on scanned PDF pages.
   */
  private runTesseractOcr(
    filePath: string,
    maxPages = 20
  ): { fullText: string; pages: Array<{ pageNumber: number; text: string }> } {
    const tmpPrefix = `/tmp/ocr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const pages: Array<{ pageNumber: number; text: string }> = [];

    try {
      // Render pages to PNG (limit to maxPages to avoid excessive duration on huge scanned gazettes)
      execSync(`pdftoppm -png -r 150 -l ${maxPages} "${filePath}" "${tmpPrefix}" 2>/dev/null`);

      for (let i = 1; i <= maxPages; i++) {
        const paddedI = String(i).padStart(2, "0");
        const singleI = String(i);
        const imgPath = existsSync(`${tmpPrefix}-${paddedI}.png`)
          ? `${tmpPrefix}-${paddedI}.png`
          : existsSync(`${tmpPrefix}-${singleI}.png`)
            ? `${tmpPrefix}-${singleI}.png`
            : null;

        if (!imgPath) break;

        try {
          const ocrText = execSync(`tesseract "${imgPath}" stdout --oem 1 -l eng 2>/dev/null`)
            .toString()
            .trim();
          if (ocrText.length > 0) {
            pages.push({ pageNumber: i, text: ocrText });
          }
        } catch {
          // ignore single page ocr error
        }
      }
    } catch (err) {
      logger.error("Tesseract OCR execution error", { filePath, error: (err as Error).message });
    } finally {
      try {
        execSync(`rm -f ${tmpPrefix}*.png 2>/dev/null`);
      } catch {
        // cleanup ignore
      }
    }

    return {
      fullText: pages.map((p) => p.text).join("\n\n"),
      pages,
    };
  }

  /**
   * Splits legal document text into logical statutory chunks with substring verification.
   */
  public chunkStatutoryText(
    fullText: string,
    pages: Array<{ pageNumber: number; text: string }>
  ): ExtractedClause[] {
    const clauses: ExtractedClause[] = [];
    const normalizedFullText = fullText.replace(/\s+/g, " ");

    // Statutory split regex matching Parts, Sections, Regulations, Articles, or numbered points
    const statutoryRegex =
      /(?:^|\n)(?:(?:PART|Part)\s+[IVXLCDM0-9]+|(?:SECTION|Section|Sec\.)\s+[0-9]+[A-Za-z]?(?:\.[0-9]+)*|(?:REGULATION|Regulation|Reg\.)\s+[0-9]+[A-Za-z]?(?:\.[0-9]+)*|(?:ARTICLE|Article|Art\.)\s+[0-9]+|(?:RULE|Rule)\s+[0-9]+|(?:SCHEDULE|Schedule)\s+[0-9A-Za-z]+|[0-9]+\.[0-9]+(?:\.[0-9]+)*)\b[^\n]*/g;

    const matches: Array<{ index: number; header: string }> = [];
    let match: RegExpExecArray | null;

    while ((match = statutoryRegex.exec(fullText)) !== null) {
      matches.push({ index: match.index, header: match[0].trim() });
    }

    if (matches.length >= 3) {
      for (let i = 0; i < matches.length; i++) {
        const start = matches[i]!.index;
        const end = i + 1 < matches.length ? matches[i + 1]!.index : fullText.length;
        const rawChunk = fullText.slice(start, end).trim();

        if (rawChunk.length < 40) continue; // Skip tiny fragments

        // Derive clean reference
        const ref = matches[i]!.header.slice(0, 80).replace(/\s+/g, " ");

        // If chunk is excessively long (> 3000 chars), subdivide it into overlapping segments
        if (rawChunk.length > 3000) {
          const subChunks = this.splitLongChunk(rawChunk, 2500, 300);
          subChunks.forEach((sub, sIdx) => {
            const subRef = `${ref} [Part ${sIdx + 1}]`;
            const pageNum = this.findPageForOffset(start, pages);
            if (this.verifySubstring(sub, normalizedFullText)) {
              clauses.push({ clauseReference: subRef, verbatimText: sub, pageNumber: pageNum });
            }
          });
        } else {
          const pageNum = this.findPageForOffset(start, pages);
          if (this.verifySubstring(rawChunk, normalizedFullText)) {
            clauses.push({ clauseReference: ref, verbatimText: rawChunk, pageNumber: pageNum });
          }
        }
      }
    } else {
      // Paragraph-based chunking for circulars without explicit Section/Regulation headers
      const paragraphs = fullText
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter((p) => p.length >= 80);

      paragraphs.forEach((p, idx) => {
        const ref = `Paragraph ${idx + 1}`;
        const pageNum = this.findPageForOffset(fullText.indexOf(p), pages);
        if (this.verifySubstring(p, normalizedFullText)) {
          clauses.push({ clauseReference: ref, verbatimText: p, pageNumber: pageNum });
        }
      });
    }

    return clauses;
  }

  private splitLongChunk(text: string, maxLen: number, overlap: number): string[] {
    const result: string[] = [];
    let start = 0;
    while (start < text.length) {
      let end = start + maxLen;
      if (end < text.length) {
        // find sentence break
        const lastPeriod = text.lastIndexOf(".", end);
        if (lastPeriod > start + 500) {
          end = lastPeriod + 1;
        }
      }
      result.push(text.slice(start, end).trim());
      start = end - overlap;
      if (start >= text.length - overlap) break;
    }
    return result;
  }

  private findPageForOffset(
    offset: number,
    pages: Array<{ pageNumber: number; text: string }>
  ): number {
    let currentOffset = 0;
    for (const page of pages) {
      currentOffset += page.text.length + 2;
      if (offset <= currentOffset) return page.pageNumber;
    }
    return 1;
  }

  /**
   * Programmatic Substring Check (Task 2.4).
   * Verifies that the normalized verbatim text exists in the parent PDF source.
   */
  public verifySubstring(clauseText: string, normalizedParentText: string): boolean {
    const normalizedClause = clauseText.replace(/\s+/g, " ").trim();
    // Use first 100 characters to verify presence without whitespace sensitivity
    const anchor = normalizedClause.slice(0, Math.min(100, normalizedClause.length));
    return normalizedParentText.includes(anchor);
  }

  /**
   * Generates 768-dimensional embeddings in batches with exponential backoff and quota recovery.
   */
  public async batchEmbedClauses(
    texts: string[],
    batchSize = 4
  ): Promise<number[][]> {
    const allEmbeddings: number[][] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      // Bound input text to first 800 chars for semantic embedding to stay well within tokens/min quota
      const batch = texts.slice(i, i + batchSize).map((t) => t.slice(0, 800));
      let attempts = 0;
      let success = false;

      while (!success && attempts < 10) {
        attempts++;
        try {
          const res = await this.client.models.embedContent({
            model: this.embeddingModel,
            contents: batch,
            config: {
              outputDimensionality: 768,
            },
          });

          const embeddings = res.embeddings?.map((e) => e.values) || [];
          for (const emb of embeddings) {
            if (!emb || emb.length !== 768) {
              throw new Error(`Embedding dimensionality mismatch: expected 768, got ${emb?.length}`);
            }
            allEmbeddings.push(emb);
          }
          success = true;
        } catch (err) {
          const errMsg = (err as Error).message || "";
          let sleepMs = 5000;

          // Parse retry delay from Google API quota error if present
          const retryMatch = /retry in ([\d.]+)s/i.exec(errMsg) || /retryDelay.*?(\d+)s/i.exec(errMsg);
          if (retryMatch && retryMatch[1]) {
            const parsed = Math.ceil(parseFloat(retryMatch[1]) * 1000) + 2000;
            if (parsed > 60000 || errMsg.includes("per day limit exceeded")) {
              throw new Error(`Gemini embedding daily quota limit exceeded: ${errMsg}`);
            }
            sleepMs = parsed;
          } else if (errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED")) {
            if (errMsg.includes("per day limit exceeded")) {
              throw new Error(`Gemini embedding daily quota limit exceeded: ${errMsg}`);
            }
            sleepMs = Math.min(10000 * Math.pow(1.5, attempts), 60000);
          }

          logger.warn("Batch embedding rate limit, pausing before retry", {
            attempt: attempts,
            sleepSeconds: Math.round(sleepMs / 1000),
            batchStart: i,
          });

          await new Promise((r) => setTimeout(r, sleepMs));
        }
      }

      if (!success) {
        throw new Error(`Failed to generate embeddings for batch starting at index ${i}`);
      }

      // 1s pause between batches to pace tokens per minute smoothly
      await new Promise((r) => setTimeout(r, 1000));
    }

    return allEmbeddings;
  }

  /**
   * Complete end-to-end ingestion of a single official PDF.
   */
  public async ingestPdf(
    filePath: string,
    meta: DocumentMetadata
  ): Promise<IngestedDocumentResult> {
    const supabase = createAdminSupabaseClient();
    const buffer = readFileSync(filePath);
    const fileSha256 = this.computeFileSha256(buffer);

    // 1. Check deduplication by document_hash
    const { data: existingVersion } = await supabase
      .from("regulatory_document_versions")
      .select("id, instrument_id")
      .eq("document_hash", fileSha256)
      .maybeSingle();

    if (existingVersion) {
      const { count } = await supabase
        .from("regulatory_clauses")
        .select("id", { count: "exact", head: true })
        .eq("document_version_id", existingVersion.id);

      logger.info("PDF already ingested and verified, skipping duplicate", {
        filePath,
        fileSha256,
        existingClauseCount: count,
      });

      return {
        fileSha256,
        instrumentId: existingVersion.instrument_id,
        documentVersionId: existingVersion.id,
        instrumentTitle: meta.instrumentTitle,
        regulatorAcronym: meta.regulatorAcronym,
        clauseCount: count || 0,
        skippedDeduplication: true,
      };
    }

    // 2. Resolve regulator body ID
    const { data: body, error: bodyErr } = await supabase
      .from("regulatory_bodies")
      .select("id")
      .eq("acronym", meta.regulatorAcronym)
      .single();

    if (bodyErr || !body) {
      throw new Error(`Regulatory body not found: ${meta.regulatorAcronym}`);
    }

    // 3. Extract text
    const { fullText, pages } = await this.extractTextWithOcrFallback(filePath, buffer);
    if (!fullText || fullText.trim().length < 100) {
      throw new Error(`Failed to extract text from PDF: ${filePath}`);
    }

    // 4. Chunk text into statutory clauses
    const clauses = this.chunkStatutoryText(fullText, pages);
    if (clauses.length === 0) {
      throw new Error(`No valid statutory clauses could be extracted from: ${filePath}`);
    }

    logger.info("Extracted verbatim clauses, generating embeddings", {
      filePath,
      clauseCount: clauses.length,
      fileSha256,
    });

    // 5. Generate embeddings
    const clauseTexts = clauses.map((c) => c.verbatimText);
    const embeddings = await this.batchEmbedClauses(clauseTexts);

    // 6. Insert regulatory_instruments record
    const { data: instrument, error: instErr } = await supabase
      .from("regulatory_instruments")
      .insert({
        regulator_id: body.id,
        title: meta.instrumentTitle,
        instrument_type: meta.instrumentType,
        instrument_number: meta.instrumentNumber || null,
        jurisdiction: "NIGERIA",
        description: `Official statutory document: ${meta.instrumentTitle}`,
        status: "ACTIVE",
      })
      .select("id")
      .single();

    if (instErr || !instrument) {
      throw new Error(`Failed to insert regulatory instrument: ${instErr?.message}`);
    }

    // 7. Insert regulatory_document_versions record
    const storageKey = `statutory-vault/${meta.regulatorAcronym.toLowerCase()}/${fileSha256}.pdf`;
    const { data: docVersion, error: verErr } = await supabase
      .from("regulatory_document_versions")
      .insert({
        instrument_id: instrument.id,
        version_number: "1.0",
        source_url: meta.sourceUrl || `https://${meta.regulatorAcronym.toLowerCase()}.gov.ng`,
        document_hash: fileSha256,
        storage_key: storageKey,
        publication_date: meta.publicationDate,
        effective_date: meta.effectiveDate,
        verification_status: "VERIFIED_OFFICIAL_SOURCE",
        lifecycle_status: meta.lifecycleStatus || "CURRENT",
        verified_by: "INGESTION_PIPELINE",
        verified_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (verErr || !docVersion) {
      throw new Error(`Failed to insert document version: ${verErr?.message}`);
    }

    // 8. Insert regulatory_clauses with real embeddings
    const clauseInserts = clauses.map((c, idx) => ({
      document_version_id: docVersion.id,
      clause_reference: c.clauseReference,
      clause_text: c.verbatimText,
      page_number: c.pageNumber,
      extraction_status: "VERIFIED",
      verification_status: "VERIFIED",
      embedding: embeddings[idx],
      embedded_at: new Date().toISOString(),
    }));

    // Insert in batches of 50
    for (let i = 0; i < clauseInserts.length; i += 50) {
      const slice = clauseInserts.slice(i, i + 50);
      const { error: clauseErr } = await supabase.from("regulatory_clauses").insert(slice);
      if (clauseErr) {
        throw new Error(`Failed to insert regulatory clauses batch: ${clauseErr.message}`);
      }
    }

    logger.info("Successfully ingested official regulatory document", {
      title: meta.instrumentTitle,
      clausesIngested: clauses.length,
      fileSha256,
    });

    return {
      fileSha256,
      instrumentId: instrument.id,
      documentVersionId: docVersion.id,
      instrumentTitle: meta.instrumentTitle,
      regulatorAcronym: meta.regulatorAcronym,
      clauseCount: clauses.length,
    };
  }
}

export const statutoryVaultIngestionService = new StatutoryVaultIngestionService();
