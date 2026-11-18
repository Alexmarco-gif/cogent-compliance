import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { GeminiKeyPool } from "@/lib/ai/gemini-key-pool";
import { formatCleanAiError } from "@/lib/ai/error-formatter";

describe("GeminiKeyPool (3-Key Cascade Failover & Error Formatting)", () => {
  const savedEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...savedEnv };
    delete process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY_2;
    delete process.env.GEMINI_API_KEY_3;
    delete process.env.GEMINI_KEY_2;
    delete process.env.GEMINI_KEY_3;
    delete process.env.KEY_2;
    delete process.env.KEY_3;
  });

  afterEach(() => {
    process.env = { ...savedEnv };
  });

  it("loads GEMINI_API_KEY, GEMINI_API_KEY_2, GEMINI_API_KEY_3 in priority order and deduplicates identical values", () => {
    process.env.GEMINI_API_KEY = "AIza_key_one";
    process.env.GEMINI_API_KEY_2 = "AIza_key_two";
    process.env.GEMINI_API_KEY_3 = "AIza_key_three";

    const pool = new GeminiKeyPool();
    const slots = pool.getConfiguredKeySlots();

    expect(slots.map((s) => s.slotName)).toEqual(["KEY_1", "KEY_2", "KEY_3"]);
    expect(slots.map((s) => s.apiKey)).toEqual([
      "AIza_key_one",
      "AIza_key_two",
      "AIza_key_three",
    ]);
    expect(pool.hasActiveRealKey()).toBe(true);
  });

  it("supports GEMINI_KEY_2 / KEY_2 and GEMINI_KEY_3 / KEY_3 aliases", () => {
    process.env.GEMINI_API_KEY = "AIza_primary";
    process.env.GEMINI_KEY_2 = "AIza_backup2";
    process.env.KEY_3 = "AIza_backup3";

    const pool = new GeminiKeyPool();
    const slots = pool.getConfiguredKeySlots();

    expect(slots.map((s) => s.apiKey)).toEqual([
      "AIza_primary",
      "AIza_backup2",
      "AIza_backup3",
    ]);
  });

  it("fails over KEY_1 -> KEY_2 -> KEY_3 when keys hit daily limit or 429 quota and puts exhausted keys in cooldown", async () => {
    process.env.GEMINI_API_KEY = "AIza_key1";
    process.env.GEMINI_API_KEY_2 = "AIza_key2";
    process.env.GEMINI_API_KEY_3 = "AIza_key3";

    const pool = new GeminiKeyPool();
    const attemptedSlots: string[] = [];

    const res = await pool.execute({
      primaryModel: "gemini-3.5-flash",
      enableModelFallback: false,
      operationName: "test_daily_cascade",
      run: async (_client, _model, slot) => {
        attemptedSlots.push(slot.slotName);
        if (slot.slotName === "KEY_1") {
          throw new Error("429 RESOURCE_EXHAUSTED: Quota exceeded for quota metric RequestsPerDay limit_per_day");
        }
        if (slot.slotName === "KEY_2") {
          throw new Error("429 RESOURCE_EXHAUSTED: Daily quota limit exceeded");
        }
        return "ok-from-key-3";
      },
    });

    expect(res.result).toBe("ok-from-key-3");
    expect(res.slotName).toBe("KEY_3");
    expect(attemptedSlots).toEqual(["KEY_1", "KEY_2", "KEY_3"]);

    // Subsequent call should immediately prioritize healthy KEY_3 without retrying cooled KEY_1/KEY_2
    const nextSlots = pool.getPrioritizedKeySlots().map((s) => s.slotName);
    expect(nextSlots).toEqual(["KEY_3"]);
  });

  it("falls back to active GA Flash models (gemini-3.8-flash) when primary model returns 503 UNAVAILABLE high demand", async () => {
    process.env.GEMINI_API_KEY = "AIza_key1";
    process.env.GEMINI_API_KEY_2 = "AIza_key2";

    const pool = new GeminiKeyPool();
    const attempts: Array<{ model: string; slot: string }> = [];

    const res = await pool.execute({
      primaryModel: "gemini-3.6-flash",
      enableModelFallback: true,
      operationName: "test_503_model_fallback",
      run: async (_client, model, slot) => {
        attempts.push({ model, slot: slot.slotName });
        if (model === "gemini-3.6-flash") {
          throw new Error(
            '{"error":{"code":503,"message":"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.","status":"UNAVAILABLE"}}'
          );
        }
        return `served-by-${model}-${slot.slotName}`;
      },
    });

    expect(res.model).toBe("gemini-3.8-flash");
    expect(res.result).toContain("served-by-gemini-3.8-flash");
    expect(attempts.some((a) => a.model === "gemini-3.6-flash" && a.slot === "KEY_1")).toBe(true);
    expect(attempts.some((a) => a.model === "gemini-3.6-flash" && a.slot === "KEY_2")).toBe(true);
    expect(attempts.some((a) => a.model === "gemini-3.8-flash")).toBe(true);
  });

  it("immediately fails over from deprecated 404 primary model (e.g. gemini-2.5-flash) to active Gemini 3 GA models without wasting keys", async () => {
    process.env.GEMINI_API_KEY = "AIza_key1";
    process.env.GEMINI_API_KEY_2 = "AIza_key2";

    const pool = new GeminiKeyPool();
    const attempts: Array<{ model: string; slot: string }> = [];

    const res = await pool.execute({
      primaryModel: "gemini-2.5-flash",
      enableModelFallback: true,
      operationName: "test_404_deprecated_fallback",
      run: async (_client, model, slot) => {
        attempts.push({ model, slot: slot.slotName });
        if (model === "gemini-2.5-flash") {
          throw new Error(
            '{"error":{"message":"{\\n \\"error\\": {\\n \\"code\\": 404,\\n \\"message\\": \\"This model models/gemini-2.5-flash is no longer available to new users. Please update your code to use models/gemini-3.5-flash-lite\\",\\n \\"status\\": \\"NOT_FOUND\\"\\n }\\n}"}}'
          );
        }
        return `served-by-${model}-${slot.slotName}`;
      },
    });

    expect(res.model).toBe("gemini-3.6-flash");
    expect(res.result).toBe("served-by-gemini-3.6-flash-KEY_1");
    expect(attempts.filter((a) => a.model === "gemini-2.5-flash")).toHaveLength(1);
    expect(pool.getModelFallbackChain("gemini-2.5-flash", true)).not.toContain("gemini-2.5-flash-lite");
  });

  it("does not swallow non-retryable 400 validation errors", async () => {
    process.env.GEMINI_API_KEY = "AIza_key1";
    process.env.GEMINI_API_KEY_2 = "AIza_key2";

    const pool = new GeminiKeyPool();
    const run = vi.fn().mockRejectedValue(new Error("400 INVALID_ARGUMENT: Malformed schema"));

    await expect(
      pool.execute({
        primaryModel: "gemini-3.6-flash",
        run,
      })
    ).rejects.toThrow("400 INVALID_ARGUMENT");

    expect(run).toHaveBeenCalledTimes(1);
  });

  it("formats raw nested Google SDK 503, 429, and 404 JSON payloads cleanly for users", () => {
    const raw503 =
      '{"error":{"message":"{\\n  \\"error\\": {\\n    \\"code\\": 503,\\n    \\"message\\": \\"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.\\",\\n    \\"status\\": \\"UNAVAILABLE\\"\\n  }\\n}\\n","code":503,"status":"Service Unavailable"}}';

    const clean503 = formatCleanAiError(raw503);
    expect(clean503).not.toContain("{");
    expect(clean503).not.toContain('"code":503');
    expect(clean503).toContain("high-demand spike");

    const raw404 =
      '{"error":{"message":"{\\n \\"error\\": {\\n \\"code\\": 404,\\n \\"message\\": \\"This model models/gemini-2.5-flash-lite is no longer available to new users. Please update your code to use models/gemini-3.5-flash-lite for the latest features and..."}}';
    const clean404 = formatCleanAiError(raw404);
    expect(clean404).not.toContain("{");
    expect(clean404).not.toContain('"code"');
    expect(clean404).toContain("unavailable or deprecated");

    const clean429 = formatCleanAiError("429 RESOURCE_EXHAUSTED: RequestsPerDay exceeded");
    expect(clean429).toContain("rate or daily quota limit");
  });
});
