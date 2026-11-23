/**
 * Cogent Compliance Operations - Per-Question DDQ Auto-Match & Evidence-Grounded Drafting Engine
 * Evaluates each DDQ question individually (scaling to 150–500+ questions via Inngest batches):
 *   1. Approved Q&A Library lookup (instant reuse + staleness check)
 *   2. Central Evidence Vault + Internal Playbook retrieval (per question — never truncated to first 6!)
 *   3. Nigerian Statutory Reference Matrix citations (BOFIA 2020, CBN, NDPA 2023, MLPPA 2022, FCCPC)
 *   4. Anti-Fabrication Gemini synthesis classifying VERIFIED_EVIDENCE vs MISSING_EVIDENCE
 */

import { createAdminSupabaseClient } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { geminiService } from "@/modules/ai-orchestration/gemini.service";
import { AI_MODELS } from "@/lib/ai/config";
import { evidenceService, type EvidenceSearchHit } from "@/modules/evidence/evidence.service";
import { qaLibraryService } from "@/modules/ddq/qa-library.service";
import { statutoryReferenceMatrix } from "@/modules/compliance-assessment/statutory-reference-matrix";
import type {
  DdqAnswerSource,
  DdqGroundingClassification,
  DdqQuestionRecord,
  DdqQuestionStatus,
  StatutoryCitationItem,
} from "@/contracts/ddq.contracts";

export interface DraftQuestionOutcome {
  question_id: string;
  answer_source: DdqAnswerSource;
  status: DdqQuestionStatus;
  matched_qa_id: string | null;
  match_confidence: number | null;
  draft_answer: string;
  grounding_classification: DdqGroundingClassification;
  evidence_gap_flag: boolean;
  evidence_gap_reason: string | null;
  statutory_citations: StatutoryCitationItem[];
  ai_confidence: number;
  linked_evidence_ids: string[];
}

export class DdqDraftingService {
  /**
   * Drafts or auto-matches a single DDQ question against:
   *  (a) Approved Q&A Library, (b) Central Evidence Vault, (c) Nigerian Statutory Reference Matrix.
   */
  public async draftSingleQuestion(
    tenantId: string,
    orgName: string,
    question: Pick<
      DdqQuestionRecord,
      "id" | "ddq_id" | "question_code" | "section_name" | "question_text" | "domain" | "assigned_department"
    >,
    options?: {
      useAiSynthesis?: boolean;
    }
  ): Promise<DraftQuestionOutcome> {
    // 1. Extract applicable Nigerian statutory provisions for this exact question
    const matchedProvisions = statutoryReferenceMatrix
      .extractApplicableProvisions(`${question.section_name || ""} ${question.question_text}`)
      .slice(0, 4);

    const statutoryCitations: StatutoryCitationItem[] = matchedProvisions.map((p) => ({
      authority: `${p.regulator} — ${p.instrument_title}`,
      reference: p.clause_reference,
      summary: (p.compliance_directive || p.verbatim_excerpt).slice(0, 260),
    }));

    // 2. Check Approved Q&A Knowledge Library first (Days -> Minutes engine for Bank #2, #3...)
    const qaMatch = await qaLibraryService.findBestMatch(tenantId, question.question_text, 0.62);
    if (qaMatch) {
      const mergedCitations =
        qaMatch.entry.statutory_citations.length > 0
          ? qaMatch.entry.statutory_citations
          : statutoryCitations;

      if (!qaMatch.is_stale) {
        return {
          question_id: question.id,
          answer_source: "QA_LIBRARY_EXACT",
          status: "AI_DRAFTED",
          matched_qa_id: qaMatch.entry.id,
          match_confidence: qaMatch.confidence,
          draft_answer: qaMatch.entry.approved_answer,
          grounding_classification:
            qaMatch.entry.linked_evidence_ids.length > 0
              ? "VERIFIED_EVIDENCE"
              : "MANAGEMENT_ASSERTION",
          evidence_gap_flag: qaMatch.entry.linked_evidence_ids.length === 0,
          evidence_gap_reason:
            qaMatch.entry.linked_evidence_ids.length === 0
              ? "Matched an approved Q&A Library response, but no supporting evidence artifact is attached yet."
              : null,
          statutory_citations: mergedCitations,
          ai_confidence: qaMatch.confidence,
          linked_evidence_ids: qaMatch.entry.linked_evidence_ids,
        };
      }

      // Stale Q&A match — surface the answer for fast revalidation, NEVER silently mark fresh!
      return {
        question_id: question.id,
        answer_source: "QA_LIBRARY_STALE",
        status: "IN_REVIEW",
        matched_qa_id: qaMatch.entry.id,
        match_confidence: qaMatch.confidence,
        draft_answer: `${qaMatch.entry.approved_answer}\n\n[NEEDS_INTERNAL_EVIDENCE] Review required before submission: ${qaMatch.staleness_reasons.join(" ")}`,
        grounding_classification: "MANAGEMENT_ASSERTION",
        evidence_gap_flag: true,
        evidence_gap_reason: `Stale Q&A match (${Math.round(qaMatch.confidence * 100)}%): ${qaMatch.staleness_reasons.join(" ")}`,
        statutory_citations: mergedCitations,
        ai_confidence: qaMatch.confidence,
        linked_evidence_ids: qaMatch.entry.linked_evidence_ids,
      };
    }

    // 3. Retrieve per-question evidence from Central Evidence Repository
    const evidenceHits = await evidenceService.searchEvidenceForQuestion(
      tenantId,
      question.question_text,
      4
    );

    // Also pull any matching legacy Knowledge Base chunks so uploaded playbooks still ground answers
    const kbSnippets = await this.searchLegacyKnowledgeChunks(tenantId, question.question_text, 2);

    const activeEvidenceHits = evidenceHits.filter(
      (h) => h.computed_health === "ACTIVE" || h.computed_health === "EXPIRING_SOON"
    );
    const expiredEvidenceHits = evidenceHits.filter((h) => h.computed_health === "EXPIRED");

    const hasVerifiedEvidence = activeEvidenceHits.length > 0 || kbSnippets.length > 0;
    const linkedEvidenceIds = Array.from(new Set(activeEvidenceHits.map((h) => h.evidence_item_id)));

    // 4. Draft formal anti-fabrication response
    const shouldCallAi = options?.useAiSynthesis !== false && Boolean(process.env.GEMINI_API_KEY);
    if (shouldCallAi) {
      try {
        const aiResult = await this.synthesizeWithGemini({
          tenantId,
          orgName,
          question,
          activeEvidenceHits,
          expiredEvidenceHits,
          kbSnippets,
          statutoryCitations,
        });

        return {
          question_id: question.id,
          answer_source: hasVerifiedEvidence ? "AI_EVIDENCE_GROUNDED" : "AI_GAP_FLAGGED",
          status: hasVerifiedEvidence ? "AI_DRAFTED" : "NEEDS_EVIDENCE",
          matched_qa_id: null,
          match_confidence: null,
          draft_answer: aiResult.answer,
          grounding_classification: hasVerifiedEvidence
            ? aiResult.classification
            : "MISSING_EVIDENCE",
          evidence_gap_flag: !hasVerifiedEvidence || expiredEvidenceHits.length > 0,
          evidence_gap_reason: !hasVerifiedEvidence
            ? `No active supporting evidence found in Central Evidence Vault for ${question.assigned_department}. Upload or attach verified documentation before CCO sign-off.`
            : expiredEvidenceHits.length > 0
              ? `Related evidence expired (${expiredEvidenceHits.map((e) => e.title).join(", ")}); upload current version.`
              : null,
          statutory_citations: statutoryCitations,
          ai_confidence: hasVerifiedEvidence ? 0.84 : 0.45,
          linked_evidence_ids: linkedEvidenceIds,
        };
      } catch (err) {
        logger.warn("Gemini DDQ synthesis fell back to deterministic builder", {
          questionId: question.id,
          error: (err as Error).message,
        });
      }
    }

    // 5. Deterministic anti-fabrication synthesis fallback (fast, zero-hallucination)
    return this.buildDeterministicDraft({
      orgName,
      question,
      activeEvidenceHits,
      expiredEvidenceHits,
      kbSnippets,
      statutoryCitations,
      linkedEvidenceIds,
    });
  }

  private async searchLegacyKnowledgeChunks(
    tenantId: string,
    questionText: string,
    limit: number
  ): Promise<Array<{ title: string; text: string }>> {
    try {
      const supabase = createAdminSupabaseClient();
      const tokens = questionText
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((t) => t.length >= 4)
        .slice(0, 6);
      if (tokens.length === 0) return [];

      const { data: chunks } = await supabase
        .from("marketing_knowledge_chunks")
        .select("chunk_text, knowledge_document_id")
        .eq("tenant_id", tenantId)
        .limit(40);

      if (!chunks || chunks.length === 0) return [];

      const matches: Array<{ title: string; text: string; score: number }> = [];
      for (const ch of chunks as Array<{ chunk_text?: string; knowledge_document_id?: string }>) {
        const txt = String(ch.chunk_text || "");
        const lower = txt.toLowerCase();
        const hits = tokens.filter((t) => lower.includes(t)).length;
        if (hits >= 2) {
          matches.push({
            title: "Internal Playbook Document",
            text: txt.slice(0, 800),
            score: hits,
          });
        }
      }

      return matches
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(({ title, text }) => ({ title, text }));
    } catch {
      return [];
    }
  }

  private async synthesizeWithGemini(params: {
    tenantId: string;
    orgName: string;
    question: Pick<DdqQuestionRecord, "question_code" | "section_name" | "question_text" | "domain" | "assigned_department">;
    activeEvidenceHits: EvidenceSearchHit[];
    expiredEvidenceHits: EvidenceSearchHit[];
    kbSnippets: Array<{ title: string; text: string }>;
    statutoryCitations: StatutoryCitationItem[];
  }): Promise<{ answer: string; classification: DdqGroundingClassification }> {
    const evidenceBlock =
      params.activeEvidenceHits.length > 0
        ? params.activeEvidenceHits
            .map(
              (e, idx) =>
                `[Evidence ${idx + 1}: ${e.title} | Category: ${e.category} | Dept: ${e.owner_department} | Expiry: ${e.expiry_date || "N/A"}]\n${e.chunk_text.slice(0, 900)}`
            )
            .join("\n\n")
        : "NONE FOUND IN CENTRAL EVIDENCE VAULT";

    const kbBlock =
      params.kbSnippets.length > 0
        ? params.kbSnippets.map((k, idx) => `[Playbook ${idx + 1}: ${k.title}]\n${k.text}`).join("\n\n")
        : "NONE";

    const statutoryBlock =
      params.statutoryCitations.length > 0
        ? params.statutoryCitations
            .map((s) => `- ${s.authority} (${s.reference}): ${s.summary || ""}`)
            .join("\n")
        : "No specific Nigerian statutory override triggered; apply general CBN/BOFIA/NDPA accuracy standards.";

    const systemInstruction = `You are a Chief Compliance Officer's DDQ drafting assistant for ${params.orgName}, a Nigerian regulated financial institution.
STRICT ANTI-FABRICATION RULE (BOFIA 2020 & CBN Consumer Protection Regulations 2019 Reg 7):
- ONLY assert controls, dates, certifications, filings (NDPC CAR, VAPT, STR, CTR), or metrics that are explicitly supported by <verified_evidence> or <internal_playbooks>.
- If <verified_evidence> is "NONE FOUND IN CENTRAL EVIDENCE VAULT" and <internal_playbooks> is "NONE", DO NOT claim the control is already implemented. Instead:
  1. State the exact applicable Nigerian statutory standard briefly.
  2. Insert [NEEDS_INTERNAL_EVIDENCE] and clearly specify the exact document or confirmation required from ${params.question.assigned_department} (with safe [insert ...] placeholders).
- Keep the answer crisp, bank-ready, formal, and 3–6 sentences maximum. Do NOT include markdown headers or repeat the question verbatim.`;

    const prompt = `DDQ Question (${params.question.question_code} | Section: ${params.question.section_name || "General"} | Department: ${params.question.assigned_department}):
${params.question.question_text}

<verified_evidence>
${evidenceBlock}
</verified_evidence>

<internal_playbooks>
${kbBlock}
</internal_playbooks>

<applicable_nigerian_statutes>
${statutoryBlock}
</applicable_nigerian_statutes>

Draft the formal, concise DDQ answer now.`;

    const res = await geminiService.generateText({
      prompt,
      systemInstruction,
      model: AI_MODELS.FLASH,
      temperature: 0.12,
      maxOutputTokens: 520,
      context: {
        tenantId: params.tenantId,
        taskType: "ASSESSMENT_REASONING",
      },
    });

    const text = res.text.trim();
    const hasMissingMarker = /\[NEEDS_INTERNAL_EVIDENCE\]|\[insert\s/i.test(text);
    const hasProspective = /\b(will implement|planned for|target completion|roadmap)\b/i.test(text);

    let classification: DdqGroundingClassification = "VERIFIED_EVIDENCE";
    if (params.activeEvidenceHits.length === 0 && params.kbSnippets.length === 0) {
      classification = "MISSING_EVIDENCE";
    } else if (hasMissingMarker) {
      classification = "MANAGEMENT_ASSERTION";
    } else if (hasProspective) {
      classification = "PROSPECTIVE_COMMITMENT";
    }

    return { answer: text, classification };
  }

  private buildDeterministicDraft(params: {
    orgName: string;
    question: Pick<DdqQuestionRecord, "id" | "question_code" | "question_text" | "assigned_department">;
    activeEvidenceHits: EvidenceSearchHit[];
    expiredEvidenceHits: EvidenceSearchHit[];
    kbSnippets: Array<{ title: string; text: string }>;
    statutoryCitations: StatutoryCitationItem[];
    linkedEvidenceIds: string[];
  }): DraftQuestionOutcome {
    const statRefText =
      params.statutoryCitations.length > 0
        ? ` Applicable statutory reference: ${params.statutoryCitations.map((s) => `${s.authority} (${s.reference})`).join("; ")}.`
        : "";

    if (params.activeEvidenceHits.length > 0) {
      const top = params.activeEvidenceHits[0]!;
      const excerpt = top.chunk_text.replace(/\s+/g, " ").trim().slice(0, 320);
      const expiryNote =
        top.computed_health === "EXPIRING_SOON" && top.expiry_date
          ? ` (Note: Evidence "${top.title}" expires on ${top.expiry_date}; schedule renewal.)`
          : "";

      return {
        question_id: params.question.id,
        answer_source: "AI_EVIDENCE_GROUNDED",
        status: "AI_DRAFTED",
        matched_qa_id: null,
        match_confidence: null,
        draft_answer: `Per ${params.orgName}'s verified internal record "${top.title}" (${top.category.replace(/_/g, " ")}): ${excerpt}${excerpt.length >= 320 ? "..." : ""}${statRefText}${expiryNote}`,
        grounding_classification: "VERIFIED_EVIDENCE",
        evidence_gap_flag: false,
        evidence_gap_reason: null,
        statutory_citations: params.statutoryCitations,
        ai_confidence: 0.78,
        linked_evidence_ids: params.linkedEvidenceIds,
      };
    }

    if (params.kbSnippets.length > 0) {
      const topKb = params.kbSnippets[0]!;
      const excerpt = topKb.text.replace(/\s+/g, " ").trim().slice(0, 300);
      return {
        question_id: params.question.id,
        answer_source: "AI_EVIDENCE_GROUNDED",
        status: "AI_DRAFTED",
        matched_qa_id: null,
        match_confidence: null,
        draft_answer: `Grounded in internal policy records: ${excerpt}${excerpt.length >= 300 ? "..." : ""}${statRefText} [Attach formal Evidence Vault artifact for submission annexure.]`,
        grounding_classification: "MANAGEMENT_ASSERTION",
        evidence_gap_flag: false,
        evidence_gap_reason: null,
        statutory_citations: params.statutoryCitations,
        ai_confidence: 0.7,
        linked_evidence_ids: [],
      };
    }

    const expiredNotice =
      params.expiredEvidenceHits.length > 0
        ? ` Existing document "${params.expiredEvidenceHits[0]!.title}" expired on ${params.expiredEvidenceHits[0]!.expiry_date || "record"} and cannot be relied upon without renewal.`
        : "";

    return {
      question_id: params.question.id,
      answer_source: "AI_GAP_FLAGGED",
      status: "NEEDS_EVIDENCE",
      matched_qa_id: null,
      match_confidence: null,
      draft_answer: `[NEEDS_INTERNAL_EVIDENCE] Assigned to ${params.question.assigned_department}: Please provide verified internal documentation and factual confirmation for "${params.question.question_text.slice(0, 140)}". [insert verified operational response and supporting evidence reference].${expiredNotice}${statRefText}`,
      grounding_classification: "MISSING_EVIDENCE",
      evidence_gap_flag: true,
      evidence_gap_reason:
        params.expiredEvidenceHits.length > 0
          ? `Matching evidence expired (${params.expiredEvidenceHits.map((e) => e.title).join(", ")}); renewed document required from ${params.question.assigned_department}.`
          : `No active supporting document found in Central Evidence Vault. Assign to ${params.question.assigned_department} to supply verified evidence.`,
      statutory_citations: params.statutoryCitations,
      ai_confidence: 0.4,
      linked_evidence_ids: [],
    };
  }
}

export const ddqDraftingService = new DdqDraftingService();
