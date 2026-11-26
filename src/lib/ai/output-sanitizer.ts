/**
 * Cogent Output Sanitizer
 * Strips leaked internal prompt context XML tags, internal engine terminology,
 * and overly robotic symbol conventions (such as §§ / §) from LLM outputs
 * across streaming SSE deltas, saved chat messages, work products, and UI rendering.
 */

export const INTERNAL_CONTEXT_TAG_NAMES = [
  "canonical_computed_financials",
  "deterministic_structuring_findings",
  "deterministic_feature_governance_pack",
  "verified_statutory_vault",
  "statutory_reference_matrix",
  "internal_institutional_truth",
  "dual_grounding_context",
  "untrusted_live_web_evidence",
  "uploaded_asset_extracted_content",
  "referenced_product_and_lock_scan",
  "workspace_product_context",
  "active_thread_audit_context",
  "prior_turn_audit_summary",
  "prior_uploaded_document_context",
  "fetched_live_url_content",
] as const;

const INTERNAL_TAG_GROUP = INTERNAL_CONTEXT_TAG_NAMES.join("|");

const PAREN_WRAPPED_INTERNAL_TAG_RE = new RegExp(
  `\\s*\\(\\s*\`?<\\/?(?:${INTERNAL_TAG_GROUP})(?:\\s+[^>]*)?>\`?\\s*\\)`,
  "gi"
);

const STANDALONE_INTERNAL_TAG_RE = new RegExp(
  `\`?<\\/?(?:${INTERNAL_TAG_GROUP})(?:\\s+[^>]*)?>\`?`,
  "gi"
);

/** Matches leaked raw database UUIDs in brackets, e.g. [d156429b-ccea-4032-bbee-36dc67599a96] */
const BRACKETED_UUID_RE =
  /\s*\[[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\]/gi;

/**
 * Sanitizes assistant-authored Markdown (chat replies & work products):
 * 1. Strips leaked internal XML prompt delimiters, empty wrapper parens, and raw bracketed UUIDs.
 * 2. Replaces leaked "canonical computation engine" backend phrasing.
 * 3. Normalizes double/single section symbols (§§ / §) into plain legal text
 *    ("Sections" / "Section") while leaving URLs untouched.
 */
export function sanitizeAssistantOutput(raw: string): string {
  if (!raw) return "";

  let cleaned = raw
    .replace(PAREN_WRAPPED_INTERNAL_TAG_RE, "")
    .replace(STANDALONE_INTERNAL_TAG_RE, "")
    .replace(BRACKETED_UUID_RE, "")
    .replace(/\bPer the canonical computation engine\b/g, "Based on the verified loan schedule")
    .replace(/\bper the canonical computation engine\b/g, "based on the verified loan schedule")
    .replace(/\bthe canonical computation engine\b/gi, "the verified loan schedule");

  // Normalize §§ and § when directly preceding a section number (e.g., "NDPA 2023 §§ 26, 35" -> "NDPA 2023 Sections 26, 35")
  cleaned = cleaned
    .replace(/§§\s*(?=\d)/g, "Sections ")
    .replace(/§\s*(?=\d)/g, "Section ");

  // Clean accidental empty parens and spaces immediately before punctuation created by removing tags
  cleaned = cleaned
    .replace(/\(\s*\)/g, "")
    .replace(/[ \t]+([,.;:!?])/g, "$1")
    .replace(/([A-Za-z0-9])[ \t]{2,}(?=[A-Za-z0-9])/g, "$1 ");

  return cleaned;
}

/**
 * Stateful streaming sanitizer that emits chunks immediately in the common case
 * (zero buffering when no partial internal XML tag or trailing § is pending),
 * while safely holding back partial `<internal_tag...` or trailing `§` boundaries.
 */
export function createStreamingOutputSanitizer(): {
  push: (chunk: string) => string;
  flush: () => string;
} {
  let buffer = "";

  const push = (chunk: string): string => {
    if (!chunk) return "";
    buffer += chunk;

    // Hold trailing '§' so a split '§' + '§' across chunks still maps cleanly to 'Sections '
    if (buffer.endsWith("§")) {
      const ready = buffer.slice(0, -1);
      buffer = "§";
      return ready ? sanitizeAssistantOutput(ready) : "";
    }

    // Hold trailing '(' or '(`' briefly so ' (`<internal_tag>`)' can be stripped cleanly across chunks
    const trailingParenMatch = buffer.match(/(\s*\(\s*`?)$/);
    if (trailingParenMatch?.[1] && !buffer.includes("<")) {
      const ready = buffer.slice(0, buffer.length - trailingParenMatch[1].length);
      buffer = trailingParenMatch[1];
      return ready ? sanitizeAssistantOutput(ready) : "";
    }

    // Hold back if the tail looks like an unfinished bracketed UUID ` [d156429b-...`
    const trailingUuidPrefix = buffer.match(/(\s*\[[0-9a-f-]{0,36})$/i);
    if (trailingUuidPrefix?.[1] && !trailingUuidPrefix[1].includes("]")) {
      const ready = buffer.slice(0, buffer.length - trailingUuidPrefix[1].length);
      buffer = trailingUuidPrefix[1];
      return ready ? sanitizeAssistantOutput(ready) : "";
    }

    // Hold back only if the tail looks like an unfinished `<internal_tag...` or `(<internal_tag...`
    const lastLt = buffer.lastIndexOf("<");
    if (lastLt !== -1) {
      const tailFromLt = buffer.slice(lastLt);
      const hasClosingGt = tailFromLt.includes(">");
      if (!hasClosingGt && tailFromLt.length <= 64) {
        const beforeLt = buffer.slice(0, lastLt);
        const prefixMatch = beforeLt.match(/(\s*\(\s*`?|`)$/);
        const prefixStart = prefixMatch?.[1] ? lastLt - prefixMatch[1].length : lastLt;
        const candidateTail = buffer.slice(prefixStart);
        if (/^(?:\s*\(\s*)?`?<\/?[a-z_]*$/.test(candidateTail)) {
          const ready = buffer.slice(0, prefixStart);
          buffer = candidateTail;
          return ready ? sanitizeAssistantOutput(ready) : "";
        }
      }
    }

    const sanitized = sanitizeAssistantOutput(buffer);
    const postTagTrailingParen = sanitized.match(/(\s*\(\s*)$/);
    if (postTagTrailingParen?.[1]) {
      const ready = sanitized.slice(0, sanitized.length - postTagTrailingParen[1].length);
      buffer = postTagTrailingParen[1];
      return ready;
    }

    buffer = "";
    return sanitized;
  };

  const flush = (): string => {
    if (!buffer) return "";
    const out = sanitizeAssistantOutput(buffer);
    buffer = "";
    return out;
  };

  return { push, flush };
}
