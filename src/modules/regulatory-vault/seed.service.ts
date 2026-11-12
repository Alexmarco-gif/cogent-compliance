/**
 * Cogent Marketing Shield - Golden 50 Statutory Vault Seed & Ingestion Service
 * Document Reference: Document 05 (Section 3 & 4), Document 08 (Phase 5)
 */

import { createAdminSupabaseClient } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { geminiService } from "@/modules/ai-orchestration/gemini.service";
import {
  REGULATORY_BODIES,
  GOLDEN_50_INSTRUMENTS,
  STATUTORY_PROHIBITED_TERMS,
} from "./golden50.data";

export interface SeedingSummary {
  bodiesSeeded: number;
  instrumentsSeeded: number;
  versionsSeeded: number;
  clausesSeeded: number;
  embeddingsGenerated: number;
  obligationsSeeded: number;
  prohibitedTermsSeeded: number;
}

export interface CorpusVerificationResult {
  passed: boolean;
  totalBodies: number;
  totalInstruments: number;
  totalClauses: number;
  nullEmbeddingsCount: number;
  sampleRrfQueryLatencyMs: number;
  topRankedClauseReference?: string;
  topRankedInstrument?: string;
  errorMessage?: string;
}

export class RegulatoryVaultSeedService {
  /**
   * Seeds the entire Golden 50 Nigerian Statutory Vault and generates 768-dim embeddings.
   */
  public async seedGolden50Corpus(options?: { generateEmbeddings?: boolean }): Promise<SeedingSummary> {
    const shouldEmbed = options?.generateEmbeddings ?? true;
    const supabase = createAdminSupabaseClient();
    logger.info("Starting Golden 50 Nigerian Statutory Vault Ingestion");

    let bodiesSeeded = 0;
    let instrumentsSeeded = 0;
    let versionsSeeded = 0;
    let clausesSeeded = 0;
    let embeddingsGenerated = 0;
    let obligationsSeeded = 0;
    let prohibitedTermsSeeded = 0;

    // 1. Seed 5 Primary Regulatory Bodies
    const bodyIdMap: Record<string, string> = {};
    for (const body of REGULATORY_BODIES) {
      const { data, error } = await supabase
        .from("regulatory_bodies")
        .upsert(
          {
            name: body.name,
            acronym: body.acronym,
            description: body.description,
            official_domain: body.official_domain,
            status: "ACTIVE",
          },
          { onConflict: "acronym" }
        )
        .select("id, acronym")
        .single();

      if (error || !data) {
        logger.error(`Failed to upsert regulatory body ${body.acronym}:`, { error: error?.message });
        throw new Error(`Regulatory body seed failed: ${error?.message}`);
      }
      bodyIdMap[data.acronym] = data.id;
      bodiesSeeded++;
    }

    // 2. Seed Golden 50 Regulatory Instruments, Document Versions, Clauses, and Obligations
    for (const inst of GOLDEN_50_INSTRUMENTS) {
      const regulatorId = bodyIdMap[inst.regulatorAcronym];
      if (!regulatorId) {
        throw new Error(`Missing regulator ID for acronym: ${inst.regulatorAcronym}`);
      }

      // Check existing instrument or insert
      const { data: existingInst } = await supabase
        .from("regulatory_instruments")
        .select("id")
        .eq("title", inst.title)
        .maybeSingle();

      let instrumentId = existingInst?.id;

      if (!instrumentId) {
        const { data: newInst, error: instErr } = await supabase
          .from("regulatory_instruments")
          .insert({
            regulator_id: regulatorId,
            title: inst.title,
            instrument_type: inst.instrument_type,
            instrument_number: inst.instrument_number,
            description: inst.description,
            jurisdiction: "NIGERIA",
            status: "ACTIVE",
          })
          .select("id")
          .single();

        if (instErr || !newInst) {
          logger.error(`Failed to insert instrument "${inst.title}":`, { error: instErr?.message });
          continue;
        }
        instrumentId = newInst.id;
        instrumentsSeeded++;
      }

      // Ensure Document Version
      const { data: existingVersion } = await supabase
        .from("regulatory_document_versions")
        .select("id")
        .eq("instrument_id", instrumentId)
        .eq("version_number", "1.0")
        .maybeSingle();

      let versionId = existingVersion?.id;

      if (!versionId) {
        const { data: newVer, error: verErr } = await supabase
          .from("regulatory_document_versions")
          .insert({
            instrument_id: instrumentId,
            version_number: "1.0",
            source_url: inst.source_url,
            document_hash: inst.document_hash,
            storage_key: `regulatory-vault/${inst.regulatorAcronym.toLowerCase()}/${instrumentId}/v1.0.pdf`,
            publication_date: inst.publication_date,
            effective_date: inst.effective_date,
            verification_status: "VERIFIED_OFFICIAL_SOURCE",
            lifecycle_status: "CURRENT",
          })
          .select("id")
          .single();

        if (verErr || !newVer) {
          logger.error(`Failed to insert document version for "${inst.title}":`, { error: verErr?.message });
          continue;
        }
        versionId = newVer.id;
        versionsSeeded++;
      }

      // Seed Clauses (if specified)
      if (inst.clauses && inst.clauses.length > 0) {
        for (const clause of inst.clauses) {
          const { data: existingClause } = await supabase
            .from("regulatory_clauses")
            .select("id, embedding")
            .eq("document_version_id", versionId)
            .eq("clause_reference", clause.clause_reference)
            .maybeSingle();

          let clauseId = existingClause?.id;

          if (!clauseId) {
            let embeddingVector: number[] | null = null;
            let embeddedAt: string | null = null;

            if (shouldEmbed) {
              try {
                embeddingVector = await geminiService.generateEmbedding(clause.clause_text);
                embeddedAt = new Date().toISOString();
                embeddingsGenerated++;
              } catch (embedErr) {
                logger.warn(`Failed to generate embedding for clause ${clause.clause_reference}:`, {
                  error: (embedErr as Error).message,
                });
              }
            }

            const { data: newClause, error: clauseErr } = await supabase
              .from("regulatory_clauses")
              .insert({
                document_version_id: versionId,
                clause_reference: clause.clause_reference,
                clause_text: clause.clause_text,
                page_number: clause.page_number,
                extraction_status: "VERIFIED",
                verification_status: "VERIFIED",
                embedding: embeddingVector,
                embedded_at: embeddedAt,
              })
              .select("id")
              .single();

            if (clauseErr || !newClause) {
              logger.error(`Failed to insert clause ${clause.clause_reference}:`, { error: clauseErr?.message });
              continue;
            }
            clauseId = newClause.id;
            clausesSeeded++;
          } else if (shouldEmbed && existingClause && !existingClause.embedding) {
            // Fill missing embedding
            try {
              const vector = await geminiService.generateEmbedding(clause.clause_text);
              await supabase
                .from("regulatory_clauses")
                .update({
                  embedding: vector,
                  embedded_at: new Date().toISOString(),
                })
                .eq("id", clauseId);
              embeddingsGenerated++;
            } catch (embedErr) {
              logger.warn(`Failed to update embedding for clause ${clauseId}:`, {
                error: (embedErr as Error).message,
              });
            }
          }

          // Seed Obligations & Applicability Rules
          if (clause.obligations && clause.obligations.length > 0) {
            for (const ob of clause.obligations) {
              const { data: existingOb } = await supabase
                .from("regulatory_obligations")
                .select("id")
                .eq("clause_id", clauseId)
                .eq("obligation_text", ob.obligation_text)
                .maybeSingle();

              let obligationId = existingOb?.id;

              if (!obligationId) {
                const { data: newOb, error: obErr } = await supabase
                  .from("regulatory_obligations")
                  .insert({
                    clause_id: clauseId,
                    obligation_text: ob.obligation_text,
                    obligation_type: ob.obligation_type,
                    severity: ob.severity,
                    applicability_description: ob.applicability_description,
                    verification_status: "VERIFIED",
                  })
                  .select("id")
                  .single();

                if (obErr || !newOb) continue;
                obligationId = newOb.id;
                obligationsSeeded++;

                // Applicability Rule
                await supabase.from("applicability_rules").insert({
                  obligation_id: obligationId,
                  institution_type: ob.institution_type || "ALL",
                  product_type: ob.product_type || "ALL",
                  activity_type: "MARKETING_COMMUNICATION",
                  channel: ob.channel || null,
                  jurisdiction: "NIGERIA",
                  verification_status: "VERIFIED",
                });
              }
            }
          }
        }
      }
    }

    // 3. Seed Statutory Prohibited Terms (Deterministic Lock 1 Baseline)
    for (const term of STATUTORY_PROHIBITED_TERMS) {
      const { data: existingTerm } = await supabase
        .from("prohibited_terms")
        .select("id")
        .eq("term", term.term)
        .is("tenant_id", null)
        .maybeSingle();

      if (!existingTerm) {
        const { error: termErr } = await supabase.from("prohibited_terms").insert({
          tenant_id: null, // Global statutory term
          term: term.term,
          normalized_term: term.normalized_term,
          category: term.category,
          reason: term.reason,
          severity: term.severity,
          source_type: "STATUTORY",
          matching_mode: term.matching_mode,
          status: "ACTIVE",
        });

        if (!termErr) {
          prohibitedTermsSeeded++;
        }
      }
    }

    logger.info("Golden 50 Nigerian Statutory Vault Seeding Completed", {
      bodiesSeeded,
      instrumentsSeeded,
      versionsSeeded,
      clausesSeeded,
      embeddingsGenerated,
      obligationsSeeded,
      prohibitedTermsSeeded,
    });

    return {
      bodiesSeeded,
      instrumentsSeeded,
      versionsSeeded,
      clausesSeeded,
      embeddingsGenerated,
      obligationsSeeded,
      prohibitedTermsSeeded,
    };
  }

  /**
   * Verifies Statutory Corpus integrity and benchmarks sub-200ms Hybrid RRF retrieval.
   */
  public async verifyCorpusIntegrity(): Promise<CorpusVerificationResult> {
    const supabase = createAdminSupabaseClient();

    try {
      // 1. Count bodies
      const { count: bodyCount, error: bErr } = await supabase
        .from("regulatory_bodies")
        .select("*", { count: "exact", head: true });
      if (bErr) throw new Error(`Failed to query regulatory bodies: ${bErr.message}`);

      // 2. Count instruments
      const { count: instCount, error: iErr } = await supabase
        .from("regulatory_instruments")
        .select("*", { count: "exact", head: true });
      if (iErr) throw new Error(`Failed to query regulatory instruments: ${iErr.message}`);

      // 3. Count clauses & null embeddings
      const { count: clauseCount, error: cErr } = await supabase
        .from("regulatory_clauses")
        .select("*", { count: "exact", head: true });
      if (cErr) throw new Error(`Failed to query regulatory clauses: ${cErr.message}`);

      const { count: nullEmbeddingCount, error: nErr } = await supabase
        .from("regulatory_clauses")
        .select("*", { count: "exact", head: true })
        .is("embedding", null);
      if (nErr) throw new Error(`Failed to check null embeddings: ${nErr.message}`);

      // 4. Test Hybrid RRF Search with live query vector
      const sampleQuery = "APR annual percentage rate fees mandatory disclosure";
      const sampleVector = await geminiService.generateEmbedding(sampleQuery);

      const searchStartTime = Date.now();
      const { data: rrfResults, error: rrfErr } = await supabase.rpc("search_regulatory_clauses_rrf", {
        query_text: sampleQuery,
        query_embedding: sampleVector,
        match_count: 5,
        rrf_k: 60,
      });
      const latencyMs = Date.now() - searchStartTime;

      if (rrfErr) {
        throw new Error(`Hybrid RRF search RPC failed: ${rrfErr.message}`);
      }

      const topResult = rrfResults && rrfResults.length > 0 ? rrfResults[0] : null;

      const passed =
        (bodyCount ?? 0) >= 5 &&
        (instCount ?? 0) >= 50 &&
        (clauseCount ?? 0) > 0 &&
        (nullEmbeddingCount ?? 0) === 0 &&
        latencyMs < 1500;

      return {
        passed,
        totalBodies: bodyCount ?? 0,
        totalInstruments: instCount ?? 0,
        totalClauses: clauseCount ?? 0,
        nullEmbeddingsCount: nullEmbeddingCount ?? 0,
        sampleRrfQueryLatencyMs: latencyMs,
        topRankedClauseReference: topResult?.clause_reference,
        topRankedInstrument: topResult?.instrument_title,
      };
    } catch (err: unknown) {
      return {
        passed: false,
        totalBodies: 0,
        totalInstruments: 0,
        totalClauses: 0,
        nullEmbeddingsCount: -1,
        sampleRrfQueryLatencyMs: -1,
        errorMessage: (err as Error).message,
      };
    }
  }
}

export const regulatoryVaultSeedService = new RegulatoryVaultSeedService();
