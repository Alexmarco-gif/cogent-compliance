/**
 * Client-side helpers for unwrapping standard API Gateway envelopes and error payloads.
 */

export interface ParsedApiError {
  status: number;
  code: string;
  message: string;
}

/**
 * Extracts a structured error code and human-readable message from an API response body.
 * Supports both createApiHandler envelopes (`{ success: false, error: { code, message } }`)
 * and lightweight JSON errors (`{ error: "message" }`).
 */
export function extractApiError(
  status: number,
  body: unknown,
  fallbackMessage: string,
): ParsedApiError {
  const defaultCode =
    status === 401
      ? "UNAUTHENTICATED"
      : status === 403
        ? "TENANT_CONTEXT_INVALID"
        : "INTERNAL_SERVER_ERROR";

  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    if (record.error && typeof record.error === "object") {
      const errObj = record.error as Record<string, unknown>;
      return {
        status,
        code: typeof errObj.code === "string" ? errObj.code : defaultCode,
        message: typeof errObj.message === "string" ? errObj.message : fallbackMessage,
      };
    }
    if (typeof record.error === "string" && record.error.trim().length > 0) {
      return {
        status,
        code: defaultCode,
        message: record.error,
      };
    }
    if (typeof record.message === "string" && record.message.trim().length > 0) {
      return {
        status,
        code: defaultCode,
        message: record.message,
      };
    }
  }

  return {
    status,
    code: defaultCode,
    message: fallbackMessage,
  };
}

/**
 * Unwraps array payloads wrapped inside `createApiHandler`'s `{ success: true, data }` envelope,
 * optionally reading a named collection property such as `campaigns` or `conversations`.
 */
export function unwrapApiList<T>(body: unknown, nestedKey?: string): T[] {
  if (Array.isArray(body)) {
    return body as T[];
  }
  if (!body || typeof body !== "object") {
    return [];
  }

  const record = body as Record<string, unknown>;
  const candidate = "data" in record ? record.data : record;

  if (Array.isArray(candidate)) {
    return candidate as T[];
  }
  if (nestedKey && candidate && typeof candidate === "object") {
    const nested = (candidate as Record<string, unknown>)[nestedKey];
    if (Array.isArray(nested)) {
      return nested as T[];
    }
  }
  return [];
}

/**
 * Extracts the JSON/text `data:` payload from an SSE frame block that may also
 * contain `event:`, `id:`, or comment lines.
 */
export function extractSseDataFromBlock(block: string): string | null {
  const dataLines = block
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trimStart());

  if (dataLines.length === 0) {
    return null;
  }

  const joined = dataLines.join("\n").trim();
  return joined.length > 0 ? joined : null;
}
