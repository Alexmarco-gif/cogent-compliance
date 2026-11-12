/**
 * Central AI Model Configuration
 * Document Reference: Document 02 (Section 9), Document 04 (Section 7), Document 08
 *
 * Models validated with Google GenAI SDK (@google/genai):
 * - gemini-3.5-flash: Primary reasoning, assessment, and orchestration
 * - gemini-3.1-flash-lite: Fast contextual routing and classification
 * - gemini-embedding-001: 768-dimensional text embeddings for pgvector
 */

import { env } from "@/lib/env";

export const AI_MODELS = {
  /**
   * Primary reasoning and compliance assessment engine
   */
  PRO: env.GEMINI_PRO_MODEL || "gemini-3.5-flash",

  /**
   * Fast orchestration, two-step web search summarization, context assembling
   */
  FLASH: env.GEMINI_FLASH_MODEL || "gemini-3.5-flash",

  /**
   * Lightweight classification and query rewriting
   */
  FLASH_LITE: env.GEMINI_FLASH_LITE_MODEL || "gemini-3.1-flash-lite",

  /**
   * 768-dimensional semantic embedding model (pgvector column match)
   */
  EMBEDDING: env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001",
} as const;

export const EMBEDDING_DIMENSION = 768;
