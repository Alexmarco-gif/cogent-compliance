/**
 * Cogent Marketing Shield - Central Gemini Orchestration Service
 * Document Reference: Document 02 (Section 4), Document 04, Document 05, Document 08 (Phase 5)
 */

import { GoogleGenAI } from "@google/genai";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { createAdminSupabaseClient } from "@/lib/supabase";
import type { AiTaskType, AiModelRun } from "@/contracts/ai.contracts";

export interface GenerateTextOptions {
  prompt: string;
  imageInlineData?: { mimeType: string; data: string };
  systemInstruction?: string;
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  tools?: Record<string, unknown>[];
  context?: {
    tenantId?: string;
    conversationId?: string;
    messageId?: string;
    campaignId?: string;
    assessmentId?: string;
    taskType?: AiTaskType;
    metadata?: Record<string, unknown>;
  };
}

export interface GenerateTextResult {
  text: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  modelRunId?: string;
  groundingMetadata?: Record<string, unknown>;
}

export interface EmbeddingOptions {
  model?: string;
  context?: {
    tenantId?: string;
    taskType?: AiTaskType;
    metadata?: Record<string, unknown>;
  };
}

/**
 * Standard Token Pricing reference per 1,000,000 tokens (USD)
 */
const TOKEN_PRICING: Record<string, { inputRate: number; outputRate: number }> = {
  "gemini-3.5-flash": { inputRate: 0.075, outputRate: 0.3 },
  "gemini-3.8-flash": { inputRate: 0.075, outputRate: 0.3 },
  "gemini-3.1-flash-lite": { inputRate: 0.0375, outputRate: 0.15 },
  "gemini-2.5-pro": { inputRate: 1.25, outputRate: 5.0 },
  "gemini-embedding-001": { inputRate: 0.02, outputRate: 0.0 },
};

import { AI_MODELS } from "@/lib/ai/config";

export class GeminiService {
  private client: GoogleGenAI;
  private defaultReasoningModel: string;
  private defaultFastModel: string;
  private defaultEmbeddingModel: string;

  constructor(customClient?: GoogleGenAI) {
    this.client = customClient || new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    this.defaultReasoningModel = AI_MODELS.PRO;
    this.defaultFastModel = AI_MODELS.FLASH;
    this.defaultEmbeddingModel = AI_MODELS.EMBEDDING;
  }

  /**
   * Helper to sleep with exponential backoff for transient 429/503 limits.
   */
  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Calculate estimated USD cost based on token counts and model pricing.
   */
  private calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const pricing = TOKEN_PRICING[model] || { inputRate: 0.1, outputRate: 0.4 };
    const cost =
      (inputTokens / 1_000_000) * pricing.inputRate +
      (outputTokens / 1_000_000) * pricing.outputRate;
    return Number(cost.toFixed(6));
  }

  /**
   * Records AI Model Run execution telemetry in PostgreSQL ai_model_runs table.
   */
  public async recordModelRun(run: AiModelRun): Promise<string | null> {
    try {
      const supabase = createAdminSupabaseClient();
      const { data, error } = await supabase
        .from("ai_model_runs")
        .insert({
          tenant_id: run.tenantId || null,
          conversation_id: run.conversationId || null,
          message_id: run.messageId || null,
          campaign_id: run.campaignId || null,
          assessment_id: run.assessmentId || null,
          provider: run.provider,
          model_name: run.modelName,
          model_version: run.modelVersion,
          task_type: run.taskType,
          status: run.status,
          input_tokens: run.inputTokens,
          output_tokens: run.outputTokens,
          estimated_cost: run.estimatedCost,
          latency_ms: run.latencyMs,
          error_code: run.errorCode || null,
          error_message: run.errorMessage || null,
          metadata: run.metadata || {},
          completed_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (error) {
        logger.warn("Failed to record ai_model_run telemetry", { error: error.message });
        return null;
      }
      return data?.id || null;
    } catch (err) {
      logger.warn("Failed to write to ai_model_runs", { error: (err as Error).message });
      return null;
    }
  }

  /**
   * Central text & reasoning generation wrapper.
   */
  public async generateText(options: GenerateTextOptions): Promise<GenerateTextResult> {
    const model = options.model || this.defaultReasoningModel;
    const taskType = options.context?.taskType || "CHAT_RESPONSE";
    const startTime = Date.now();

    let attempts = 0;
    const maxAttempts = 3;
    let lastError: Error | null = null;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const config: Record<string, unknown> = {};
        if (options.systemInstruction) {
          config.systemInstruction = options.systemInstruction;
        }
        if (typeof options.temperature === "number") {
          config.temperature = options.temperature;
        }
        if (options.maxOutputTokens) {
          config.maxOutputTokens = options.maxOutputTokens;
        }
        if (options.tools && options.tools.length > 0) {
          config.tools = options.tools;
        }

        const contents:
          | string
          | Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> =
          options.imageInlineData
            ? [
                {
                  inlineData: {
                    mimeType: options.imageInlineData.mimeType,
                    data: options.imageInlineData.data,
                  },
                },
                { text: options.prompt },
              ]
            : options.prompt;

        const response = await this.client.models.generateContent({
          model,
          contents,
          config,
        });

        const latencyMs = Date.now() - startTime;
        const text = response.text || "";
        const inputTokens = response.usageMetadata?.promptTokenCount || Math.ceil(options.prompt.length / 4);
        const outputTokens = response.usageMetadata?.candidatesTokenCount || Math.ceil(text.length / 4);
        const estimatedCost = this.calculateCost(model, inputTokens, outputTokens);

        const candidate = response.candidates?.[0];
        const groundingMetadata = (candidate?.groundingMetadata as Record<string, unknown>) || undefined;

        const modelRunId = await this.recordModelRun({
          tenantId: options.context?.tenantId,
          conversationId: options.context?.conversationId,
          messageId: options.context?.messageId,
          campaignId: options.context?.campaignId,
          assessmentId: options.context?.assessmentId,
          provider: "GOOGLE_GEMINI",
          modelName: model,
          modelVersion: "1.0",
          taskType,
          status: "COMPLETED",
          inputTokens,
          outputTokens,
          estimatedCost,
          latencyMs,
          metadata: {
            ...options.context?.metadata,
            hasGrounding: !!groundingMetadata,
          },
        });

        return {
          text,
          model,
          inputTokens,
          outputTokens,
          latencyMs,
          modelRunId: modelRunId || undefined,
          groundingMetadata,
        };
      } catch (err: unknown) {
        lastError = err as Error;
        const errMsg = lastError.message || "";
        // Check for rate limits or temporary service unavailabilities
        const isRetryable =
          errMsg.includes("429") ||
          errMsg.includes("RESOURCE_EXHAUSTED") ||
          errMsg.includes("503") ||
          errMsg.includes("UNAVAILABLE");

        if (isRetryable && attempts < maxAttempts) {
          const backoffMs = attempts * 1500;
          logger.warn(`Gemini rate limited (${errMsg}), backing off ${backoffMs}ms (attempt ${attempts}/${maxAttempts})`);
          await this.delay(backoffMs);
          continue;
        }
        break;
      }
    }

    const latencyMs = Date.now() - startTime;
    await this.recordModelRun({
      tenantId: options.context?.tenantId,
      conversationId: options.context?.conversationId,
      messageId: options.context?.messageId,
      campaignId: options.context?.campaignId,
      assessmentId: options.context?.assessmentId,
      provider: "GOOGLE_GEMINI",
      modelName: model,
      modelVersion: "1.0",
      taskType,
      status: "FAILED",
      inputTokens: 0,
      outputTokens: 0,
      estimatedCost: 0,
      latencyMs,
      errorCode: "GEMINI_EXECUTION_FAILED",
      errorMessage: lastError?.message || "Unknown error",
      metadata: options.context?.metadata || {},
    });

    throw new Error(`Gemini API execution failed after ${attempts} attempts: ${lastError?.message}`);
  }

  /**
   * Generates a single 768-dimensional embedding vector for regulatory text or knowledge chunks.
   */
  public async generateEmbedding(
    text: string,
    options?: EmbeddingOptions
  ): Promise<number[]> {
    const model = options?.model || this.defaultEmbeddingModel;
    const taskType = options?.context?.taskType || "EMBEDDING_GENERATION";
    const startTime = Date.now();
    let attempts = 0;
    const maxAttempts = 5;
    let lastError: Error | null = null;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const response = await this.client.models.embedContent({
          model,
          contents: text.slice(0, 1000),
          config: {
            outputDimensionality: 768,
          },
        });

        const latencyMs = Date.now() - startTime;
        const embeddingValues = response.embeddings?.[0]?.values;

        if (!embeddingValues || embeddingValues.length !== 768) {
          throw new Error(
            `Invalid embedding dimensionality: expected 768, received ${embeddingValues?.length ?? 0}`
          );
        }

        const inputTokens = Math.ceil(text.length / 4);
        const estimatedCost = this.calculateCost(model, inputTokens, 0);

        await this.recordModelRun({
          tenantId: options?.context?.tenantId,
          provider: "GOOGLE_GEMINI",
          modelName: model,
          modelVersion: "1.0",
          taskType,
          status: "COMPLETED",
          inputTokens,
          outputTokens: 0,
          estimatedCost,
          latencyMs,
          metadata: {
            ...options?.context?.metadata,
            textLength: text.length,
            dimensions: 768,
          },
        });

        return embeddingValues;
      } catch (err) {
        lastError = err as Error;
        const errMsg = lastError.message || "";

        // Immediately throw dimensionality validation errors without retrying
        if (errMsg.includes("Invalid embedding dimensionality")) {
          throw lastError;
        }

        let sleepMs = 3000;

        const retryMatch = /retry in ([\d.]+)s/i.exec(errMsg) || /retryDelay.*?(\d+)s/i.exec(errMsg);
        if (retryMatch && retryMatch[1]) {
          const parsed = Math.ceil(parseFloat(retryMatch[1]) * 1000) + 1500;
          if (parsed > 60000 || errMsg.includes("per day limit exceeded")) {
            throw new Error(`Gemini embedding daily quota limit exceeded: ${errMsg}`);
          }
          sleepMs = parsed;
        } else if (errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED")) {
          if (errMsg.includes("per day limit exceeded")) {
            throw new Error(`Gemini embedding daily quota limit exceeded: ${errMsg}`);
          }
          sleepMs = Math.min(3000 * Math.pow(2, attempts), 45000);
        }

        if (attempts < maxAttempts) {
          logger.warn("Embedding API transient error, backing off", {
            attempt: attempts,
            sleepSeconds: Math.round(sleepMs / 1000),
            error: errMsg.slice(0, 200),
          });
          await this.delay(sleepMs);
        }
      }
    }

    throw new Error(`Gemini embedding failed after ${maxAttempts} attempts: ${lastError?.message}`);
  }

  /**
   * Batch generates 768-dimensional embeddings with controlled concurrency.
   */
  public async generateEmbeddingsBatch(
    texts: string[],
    options?: EmbeddingOptions
  ): Promise<number[][]> {
    const results: number[][] = [];
    for (const text of texts) {
      const vector = await this.generateEmbedding(text, options);
      results.push(vector);
      // Small pause between items to respect rate limits
      await this.delay(200);
    }
    return results;
  }
}

export const geminiService = new GeminiService();
