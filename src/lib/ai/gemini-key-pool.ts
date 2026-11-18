/**
 * Cogent Compliance Platform
 * Central Gemini 3-Key Failover Pool & Resilient Model Fallback Engine
 *
 * Key cascade order:
 * 1. GEMINI_API_KEY (Primary)
 * 2. GEMINI_API_KEY_2 (or GEMINI_KEY_2 / KEY_2)
 * 3. GEMINI_API_KEY_3 (or GEMINI_KEY_3 / KEY_3)
 *
 * When a key hits daily/RPM quota (429 / RESOURCE_EXHAUSTED), auth errors (401/403),
 * or capacity/timeout errors (503 / UNAVAILABLE), it enters a warm cooldown window
 * and immediately cascades to Key 2 -> Key 3. If a model itself returns 503/404
 * across keys, it also falls back cleanly to GA high-capacity Flash models.
 */

import { GoogleGenAI } from "@google/genai";
import { AI_MODELS } from "@/lib/ai/config";
import { formatCleanAiError } from "@/lib/ai/error-formatter";
import { logger } from "@/lib/logger";

export interface GeminiKeySlot {
  slotName: "KEY_1" | "KEY_2" | "KEY_3";
  envVar: string;
  apiKey: string;
}

interface KeyCooldownEntry {
  cooldownUntil: number;
  reason: "DAILY_QUOTA" | "RATE_LIMIT" | "UNAVAILABLE" | "AUTH_INVALID";
}

export type GeminiFailureKind =
  | "DAILY_QUOTA"
  | "RATE_LIMIT"
  | "MODEL_UNAVAILABLE"
  | "MODEL_NOT_FOUND"
  | "AUTH_INVALID"
  | "TIMEOUT"
  | "NON_RETRYABLE";

export class GeminiKeyPool {
  private readonly cooldowns = new Map<string, KeyCooldownEntry>();
  private readonly clients = new Map<string, GoogleGenAI>();

  /**
   * Reads primary + Key 2 + Key 3 from runtime environment cleanly, preserving order
   * and deduplicating identical values.
   */
  public getConfiguredKeySlots(): GeminiKeySlot[] {
    const rawSlots: Array<{ slotName: GeminiKeySlot["slotName"]; envVar: string; value?: string }> = [
      {
        slotName: "KEY_1",
        envVar: "GEMINI_API_KEY",
        value: process.env.GEMINI_API_KEY,
      },
      {
        slotName: "KEY_2",
        envVar: "GEMINI_API_KEY_2",
        value: process.env.GEMINI_API_KEY_2 || process.env.GEMINI_KEY_2 || process.env.KEY_2,
      },
      {
        slotName: "KEY_3",
        envVar: "GEMINI_API_KEY_3",
        value: process.env.GEMINI_API_KEY_3 || process.env.GEMINI_KEY_3 || process.env.KEY_3,
      },
    ];

    const slots: GeminiKeySlot[] = [];
    const seen = new Set<string>();
    for (const s of rawSlots) {
      const trimmed = (s.value || "").trim();
      if (!trimmed || seen.has(trimmed)) continue;
      seen.add(trimmed);
      slots.push({
        slotName: s.slotName,
        envVar: s.envVar,
        apiKey: trimmed,
      });
    }

    if (slots.length === 0) {
      slots.push({
        slotName: "KEY_1",
        envVar: "GEMINI_API_KEY",
        apiKey: "mock_gemini_api_key",
      });
    }
    return slots;
  }

  public hasActiveRealKey(): boolean {
    return this.getConfiguredKeySlots().some((s) => !s.apiKey.startsWith("mock_"));
  }

  public clearCooldowns(): void {
    this.cooldowns.clear();
  }

  private getClientForKey(apiKey: string): GoogleGenAI {
    let client = this.clients.get(apiKey);
    if (!client) {
      client = new GoogleGenAI({ apiKey });
      this.clients.set(apiKey, client);
    }
    return client;
  }

  public classifyError(err: unknown): GeminiFailureKind {
    const raw = err instanceof Error ? err.message : String(err || "");
    const lower = raw.toLowerCase();

    if (
      lower.includes("per day") ||
      lower.includes("daily") ||
      lower.includes("limit_per_day") ||
      lower.includes("quota exceeded for quota metric")
    ) {
      return "DAILY_QUOTA";
    }
    if (
      lower.includes("429") ||
      lower.includes("resource_exhausted") ||
      lower.includes("rate limit") ||
      lower.includes("too many requests")
    ) {
      return "RATE_LIMIT";
    }
    if (
      lower.includes("503") ||
      lower.includes("unavailable") ||
      lower.includes("high demand") ||
      lower.includes("overloaded") ||
      lower.includes("service unavailable")
    ) {
      return "MODEL_UNAVAILABLE";
    }
    if (
      lower.includes("404") ||
      lower.includes("not_found") ||
      lower.includes("not found") ||
      lower.includes("not supported") ||
      lower.includes("invalid model")
    ) {
      return "MODEL_NOT_FOUND";
    }
    if (
      lower.includes("401") ||
      lower.includes("403") ||
      lower.includes("api_key_invalid") ||
      lower.includes("api key not valid") ||
      lower.includes("permission_denied")
    ) {
      return "AUTH_INVALID";
    }
    if (
      lower.includes("timed out") ||
      lower.includes("timeout") ||
      lower.includes("abort") ||
      lower.includes("econnreset") ||
      lower.includes("fetch failed")
    ) {
      return "TIMEOUT";
    }
    return "NON_RETRYABLE";
  }

  public markCooldown(apiKey: string, kind: GeminiFailureKind): void {
    const now = Date.now();
    if (kind === "DAILY_QUOTA") {
      this.cooldowns.set(apiKey, {
        cooldownUntil: now + 15 * 60 * 1000,
        reason: "DAILY_QUOTA",
      });
    } else if (kind === "RATE_LIMIT") {
      this.cooldowns.set(apiKey, {
        cooldownUntil: now + 60 * 1000,
        reason: "RATE_LIMIT",
      });
    } else if (kind === "AUTH_INVALID") {
      this.cooldowns.set(apiKey, {
        cooldownUntil: now + 30 * 60 * 1000,
        reason: "AUTH_INVALID",
      });
    } else if (kind === "MODEL_UNAVAILABLE" || kind === "TIMEOUT") {
      this.cooldowns.set(apiKey, {
        cooldownUntil: now + 20 * 1000,
        reason: "UNAVAILABLE",
      });
    }
  }

  /**
   * Returns keys ordered with uncooled keys first (preserving KEY_1 -> KEY_2 -> KEY_3),
   * followed by cooled keys sorted by earliest cooldown expiration as a safety net.
   */
  public getPrioritizedKeySlots(): GeminiKeySlot[] {
    const slots = this.getConfiguredKeySlots();
    const now = Date.now();
    const fresh: GeminiKeySlot[] = [];
    const cooled: Array<{ slot: GeminiKeySlot; until: number }> = [];

    for (const slot of slots) {
      const entry = this.cooldowns.get(slot.apiKey);
      if (!entry || entry.cooldownUntil <= now) {
        if (entry) this.cooldowns.delete(slot.apiKey);
        fresh.push(slot);
      } else {
        cooled.push({ slot, until: entry.cooldownUntil });
      }
    }

    if (fresh.length > 0) {
      return fresh;
    }

    // All keys are on cooldown (e.g., transient burst) -> try non-auth-invalid keys once by earliest expiry
    return cooled
      .sort((a, b) => a.until - b.until)
      .map((c) => c.slot);
  }

  public getModelFallbackChain(primaryModel: string, includeFallbackModels = true): string[] {
    if (!includeFallbackModels) return [primaryModel];
    return Array.from(
      new Set([
        primaryModel,
        "gemini-3.6-flash",
        AI_MODELS.FALLBACK_FLASH,
        AI_MODELS.FALLBACK_FLASH_LITE,
      ]),
    );
  }

  /**
   * Executes a Gemini API call with automatic KEY_1 -> KEY_2 -> KEY_3 failover
   * and optional GA model fallback on 503/404 high-demand spikes.
   */
  public async execute<T>(options: {
    primaryModel: string;
    customClient?: GoogleGenAI;
    enableModelFallback?: boolean;
    operationName?: string;
    run: (client: GoogleGenAI, model: string, slot: GeminiKeySlot) => Promise<T>;
  }): Promise<{ result: T; model: string; slotName: string }> {
    const {
      primaryModel,
      customClient,
      enableModelFallback = true,
      operationName = "gemini_call",
      run,
    } = options;

    if (customClient) {
      const result = await run(customClient, primaryModel, {
        slotName: "KEY_1",
        envVar: "CUSTOM_CLIENT",
        apiKey: "custom",
      });
      return { result, model: primaryModel, slotName: "KEY_1" };
    }

    const models = this.getModelFallbackChain(primaryModel, enableModelFallback);
    let lastError: unknown = null;

    for (let mIdx = 0; mIdx < models.length; mIdx++) {
      const model = models[mIdx]!;
      const slots = this.getPrioritizedKeySlots();

      for (let kIdx = 0; kIdx < slots.length; kIdx++) {
        const slot = slots[kIdx]!;
        const client = this.getClientForKey(slot.apiKey);

        try {
          const result = await run(client, model, slot);
          return { result, model, slotName: slot.slotName };
        } catch (err) {
          lastError = err;
          const kind = this.classifyError(err);

          if (kind === "NON_RETRYABLE") {
            throw err;
          }

          if (kind !== "MODEL_NOT_FOUND") {
            this.markCooldown(slot.apiKey, kind);
          }

          const hasNextKey = kIdx < slots.length - 1;
          const hasNextModel = mIdx < models.length - 1;

          logger.warn("Gemini call failed; evaluating key/model failover", {
            operationName,
            model,
            failedSlot: slot.slotName,
            failureKind: kind,
            hasNextKey,
            hasNextModel,
            error: (err instanceof Error ? err.message : String(err)).slice(0, 220),
          });

          // If the model itself doesn't exist on this API, no need to retry the same invalid model on Key 2/Key 3
          if (kind === "MODEL_NOT_FOUND") {
            break;
          }
        }
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error(String(lastError || "All Gemini API keys failed."));
  }

  /**
   * Formats raw Google GenAI SDK JSON error payloads into clean, actionable user messages.
   */
  public formatUserFacingError(err: unknown): string {
    return formatCleanAiError(err);
  }
}

export const geminiKeyPool = new GeminiKeyPool();
