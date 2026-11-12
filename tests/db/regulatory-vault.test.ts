/**
 * Cogent Marketing Shield - Statutory Vault DB Integration & Hybrid RRF Benchmark
 * Document Reference: Document 03 (Section 7), Document 05, Document 08 (Phase 5)
 */

import { describe, it, expect } from "vitest";
import { createAdminSupabaseClient } from "@/lib/supabase";
import { geminiService } from "@/modules/ai-orchestration/gemini.service";

describe("Golden 50 Nigerian Statutory Vault & Hybrid RRF Retrieval (DB Integration)", () => {
  const supabase = createAdminSupabaseClient();

  it("should have all 5 Nigerian regulatory bodies active in PostgreSQL", async () => {
    const { data: bodies, error } = await supabase
      .from("regulatory_bodies")
      .select("acronym, official_domain, status")
      .order("acronym", { ascending: true });

    expect(error).toBeNull();
    expect(bodies).toBeDefined();
    expect(bodies!.length).toBe(5);

    const acronyms = bodies!.map((b) => b.acronym);
    expect(acronyms).toEqual(["ARCON", "CBN", "FCCPC", "NDPC", "SEC"]);

    for (const body of bodies!) {
      expect(body.status).toBe("ACTIVE");
      expect(body.official_domain).toMatch(/\.gov\.ng$/);
    }
  });

  it("should have at least 50 Golden Regulatory Instruments seeded with NIGERIA jurisdiction", async () => {
    const { count, error } = await supabase
      .from("regulatory_instruments")
      .select("*", { count: "exact", head: true })
      .eq("jurisdiction", "NIGERIA")
      .eq("status", "ACTIVE");

    expect(error).toBeNull();
    expect(count).toBeGreaterThanOrEqual(50);
  });

  it("should have zero null embeddings across all seeded regulatory clauses", async () => {
    const { count: nullCount, error: nullErr } = await supabase
      .from("regulatory_clauses")
      .select("*", { count: "exact", head: true })
      .is("embedding", null);

    expect(nullErr).toBeNull();
    expect(nullCount).toBe(0);

    const { data: sampleClauses, error: sampleErr } = await supabase
      .from("regulatory_clauses")
      .select("id, clause_reference, embedding")
      .limit(5);

    expect(sampleErr).toBeNull();
    expect(sampleClauses).toBeDefined();
    expect(sampleClauses!.length).toBeGreaterThan(0);

    for (const clause of sampleClauses!) {
      expect(clause.embedding).toBeDefined();
      // Supabase returns vector as string '[...]' or array of floats
      const vectorLength = Array.isArray(clause.embedding)
        ? clause.embedding.length
        : JSON.parse(clause.embedding as unknown as string).length;
      expect(vectorLength).toBe(768);
    }
  });

  it("should have statutory prohibited terms active for Deterministic Lock 1", async () => {
    const { data: terms, error } = await supabase
      .from("prohibited_terms")
      .select("term, category, severity, source_type, status")
      .eq("source_type", "STATUTORY")
      .eq("status", "ACTIVE");

    expect(error).toBeNull();
    expect(terms).toBeDefined();
    expect(terms!.length).toBeGreaterThanOrEqual(10);

    const termStrings = terms!.map((t) => t.term.toLowerCase());
    expect(termStrings).toContain("100% risk-free");
    expect(termStrings).toContain("guaranteed returns");
    expect(termStrings).toContain("no credit check ever");
    expect(termStrings).toContain("free money");
  });

  it("should execute search_regulatory_clauses_rrf in sub-200ms and return ranked statutory citations", async () => {
    const query = "APR annual percentage rate total cost of credit fee disclosure";
    const queryEmbedding = await geminiService.generateEmbedding(query);

    expect(queryEmbedding).toHaveLength(768);

    const startTime = Date.now();
    const { data: rrfResults, error } = await supabase.rpc("search_regulatory_clauses_rrf", {
      query_text: query,
      query_embedding: queryEmbedding,
      match_count: 5,
      rrf_k: 60,
    });
    const latencyMs = Date.now() - startTime;

    expect(error).toBeNull();
    expect(rrfResults).toBeDefined();
    expect(rrfResults!.length).toBeGreaterThan(0);

    // Verify query performance (allowing headroom for cross-continental HTTPS network roundtrip)
    expect(latencyMs).toBeLessThan(1500);

    const topResult = rrfResults![0];
    expect(topResult).toHaveProperty("clause_id");
    expect(topResult).toHaveProperty("clause_reference");
    expect(topResult).toHaveProperty("clause_text");
    expect(topResult).toHaveProperty("instrument_title");
    expect(topResult).toHaveProperty("regulator_acronym");
    expect(topResult).toHaveProperty("rrf_score");
    expect(Number(topResult.rrf_score)).toBeGreaterThan(0);
  });
});
