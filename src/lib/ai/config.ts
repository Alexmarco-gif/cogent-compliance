/**
 * Central AI Model Configuration
 * Document Reference: Document 02 (Section 9), Document 04 (Section 7), Document 08
 *
 * Models validated with Google GenAI SDK (@google/genai):
 * - gemini-3.6-flash: Primary reasoning, assessment, and orchestration (replaces deprecated gemini-3.5-flash)
 * - gemini-3.8-flash: High-intelligence Flash fallback for complex reasoning and tool orchestration
 * - gemini-3.5-flash-lite: Fast, low-latency Flash-Lite model (replaces gemini-2.5-flash-lite / gemini-3.1-flash-lite)
 * - gemini-embedding-001: 768-dimensional text embeddings for pgvector
 */

import { env } from "@/lib/env";

export const AI_MODELS = {
  /**
   * Primary reasoning and compliance assessment engine
   */
  PRO: env.GEMINI_PRO_MODEL || "gemini-3.6-flash",

  /**
   * Fast orchestration, two-step web search summarization, context assembling
   */
  FLASH: env.GEMINI_FLASH_MODEL || "gemini-3.6-flash",

  /**
   * Lightweight classification and query rewriting
   */
  FLASH_LITE: env.GEMINI_FLASH_LITE_MODEL || "gemini-3.5-flash-lite",

  /**
   * 768-dimensional semantic embedding model (pgvector column match)
   */
  EMBEDDING: env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001",

  /**
   * Active GA Gemini 3 fallback models when primary hits 503/429 spikes or 404 deprecation
   */
  FALLBACK_FLASH: "gemini-3.8-flash",
  FALLBACK_FLASH_LITE: "gemini-3.5-flash-lite",
} as const;

export const EMBEDDING_DIMENSION = 768;
