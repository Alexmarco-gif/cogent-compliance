function unwrapNestedErrorText(raw: string): string {
  let current = raw;
  for (let depth = 0; depth < 5; depth++) {
    const trimmed = current.trim();
    if (!trimmed.startsWith("{")) break;
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;
      const nestedError =
        parsed.error && typeof parsed.error === "object"
          ? (parsed.error as Record<string, unknown>)
          : null;
      const next =
        (nestedError && typeof nestedError.message === "string"
          ? nestedError.message
          : undefined) ??
        (typeof parsed.message === "string" ? parsed.message : undefined) ??
        (typeof parsed.error === "string" ? parsed.error : undefined);
      if (next && next.trim()) {
        current = next;
        continue;
      }
      break;
    } catch {
      break;
    }
  }
  return current;
}

/**
 * Client- and server-safe helper to turn raw AI SDK JSON errors into crisp,
 * actionable user-facing messages.
 */
export function formatCleanAiError(rawInput: unknown): string {
  const initial =
    rawInput instanceof Error
      ? rawInput.message
      : typeof rawInput === "string"
        ? rawInput
        : String(rawInput || "Unknown error");

  const unwrapped = unwrapNestedErrorText(initial);
  const lower = `${initial} ${unwrapped}`.toLowerCase();

  if (
    lower.includes("per day") ||
    lower.includes("daily") ||
    lower.includes("limit_per_day") ||
    lower.includes("quota exceeded for quota metric") ||
    lower.includes("resource_exhausted") ||
    lower.includes("429") ||
    lower.includes("rate limit")
  ) {
    return "All configured Gemini API keys have temporarily reached their rate or daily quota limit. Please retry in a minute or verify quota billing on your Gemini keys.";
  }

  if (
    lower.includes("503") ||
    lower.includes("unavailable") ||
    lower.includes("high demand") ||
    lower.includes("overloaded") ||
    lower.includes("service unavailable")
  ) {
    return "Google Gemini is experiencing a temporary high-demand spike across failover models. Please retry your message in a few seconds.";
  }

  if (
    lower.includes("401") ||
    lower.includes("403") ||
    lower.includes("api_key_invalid") ||
    lower.includes("api key not valid") ||
    lower.includes("permission_denied")
  ) {
    return "Configured Gemini API key authentication failed. Please verify GEMINI_API_KEY, GEMINI_API_KEY_2, and GEMINI_API_KEY_3 in Vercel environment settings.";
  }

  if (
    lower.includes("no longer available") ||
    lower.includes("not_found") ||
    lower.includes("invalid model") ||
    (lower.includes("404") && lower.includes("model"))
  ) {
    return "The configured Gemini AI model is unavailable or deprecated for this API key. Please retry or verify your Gemini model configuration.";
  }

  if (
    lower.includes("timed out") ||
    lower.includes("timeout") ||
    lower.includes("did not respond")
  ) {
    return "The regulatory synthesis request timed out waiting for the AI model. Please retry or narrow the query scope.";
  }

  if (!unwrapped.trim().startsWith("{")) {
    const clean = unwrapped.replace(/\s+/g, " ").trim();
    return clean.length > 240 ? `${clean.slice(0, 237).trim()}...` : clean;
  }

  // Fallback for truncated/malformed nested JSON: find the innermost non-JSON "message" string
  const matches = Array.from(
    initial.matchAll(/\\?"message\\?"\s*:\s*\\?"((?:[^"\\]|\\.)*)/g),
  );
  for (let i = matches.length - 1; i >= 0; i--) {
    const candidate = matches[i]?.[1];
    if (!candidate) continue;
    const cleaned = candidate
      .replace(/\\n/g, " ")
      .replace(/\\"/g, '"')
      .replace(/\s+/g, " ")
      .trim();
    if (cleaned && !cleaned.startsWith("{")) {
      return cleaned.length > 240 ? `${cleaned.slice(0, 237).trim()}...` : cleaned;
    }
  }

  const trimmed = initial.replace(/\s+/g, " ").trim();
  return trimmed.length > 240 ? `${trimmed.slice(0, 237).trim()}...` : trimmed;
}
