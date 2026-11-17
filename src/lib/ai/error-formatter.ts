/**
 * Client- and server-safe helper to turn raw AI SDK JSON errors into crisp,
 * actionable user-facing messages.
 */
export function formatCleanAiError(rawInput: unknown): string {
  const raw =
    rawInput instanceof Error
      ? rawInput.message
      : typeof rawInput === "string"
        ? rawInput
        : String(rawInput || "Unknown error");

  const lower = raw.toLowerCase();

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
    lower.includes("timed out") ||
    lower.includes("timeout") ||
    lower.includes("did not respond")
  ) {
    return "The regulatory synthesis request timed out waiting for the AI model. Please retry or narrow the query scope.";
  }

  // Strip nested escaped JSON wrappers such as {"error":{"message":"{\n \"error\"..."}}
  const innerMsgMatch = raw.match(/"message"\s*:\s*"([^"\\]+(?:\\.[^"\\]*)*)"/);
  if (innerMsgMatch?.[1]) {
    const unescaped = innerMsgMatch[1].replace(/\\n/g, " ").replace(/\\"/g, '"').trim();
    if (unescaped && !unescaped.startsWith("{")) {
      return unescaped;
    }
  }

  const trimmed = raw.replace(/\s+/g, " ").trim();
  return trimmed.length > 240 ? `${trimmed.slice(0, 237).trim()}...` : trimmed;
}
