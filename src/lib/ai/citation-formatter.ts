/**
 * Cogent Compliance Platform
 * Shared Citation Sanitization, Deduplication & Source Display Formatting
 */

import type { CitationItem } from "@/contracts/conversation.contracts";
import { sanitizeAssistantOutput } from "@/lib/ai/output-sanitizer";

export type SourceTierGroup =
  | "STATUTORY_VAULT"
  | "INTERNAL_PLAYBOOK"
  | "OFFICIAL_REGULATOR_WEB"
  | "LEGAL_AND_PRESS";

export interface FormattedSourceEntry {
  citation: CitationItem;
  tierGroup: SourceTierGroup;
  badgeLabel: string;
  primaryTitle: string;
  subtitle?: string;
  hostname?: string;
  href?: string;
  clauseId?: string;
}

const GENERIC_WEB_TITLES = new Set([
  "client alert",
  "regulatory intelligence source",
  "home",
  "index",
  "untitled",
  "pdf",
  "document",
  "article",
  "news",
  "press release",
  "bank of ghana",
  "central bank of nigeria",
]);

export function cleanCitationLabel(raw?: string, maxLen = 72): string | undefined {
  if (!raw) return undefined;
  let s = sanitizeAssistantOutput(raw).replace(/\s+/g, " ").trim();
  // Remove bracketed page markers like "[P..." or "[Page 12]"
  s = s.replace(/\[P(?:age)?[^\]]*\]?/gi, "").replace(/\[[^\]]*$/g, "").trim();
  // Collapse OCR stutter like "35.35.AnAn advertiser,advertiser, pr..." -> "Section 35"
  const stutterMatch = s.match(/^(\d+(?:\.\d+)*)\.\1\.?(?:\s+|(?=[A-Za-z]))/);
  if (stutterMatch?.[1]) {
    return `Section ${stutterMatch[1]}`;
  }
  // Collapse repeated words like "AnAn" or "advertiser,advertiser"
  s = s
    .replace(/\b([A-Za-z]{2,})\1\b/g, "$1")
    .replace(/\b([A-Za-z]{2,})\s*,\s*\1\b/gi, "$1");
  // If it's a long OCR sentence starting with a number, extract the section number
  const leadingNumMatch = s.match(/^(\d+(?:\.\d+)*)\.?\s*[A-Za-z]/);
  if (leadingNumMatch?.[1] && s.length > 42) {
    return `Section ${leadingNumMatch[1]}`;
  }
  // Clean ALL-CAPS PART headers e.g. "PART II—REGISTRATION AND APPROVAL..."
  const partMatch = s.match(/^(PART\s+[IVXLC0-9]+)\s*[—–-]\s*(.+)$/i);
  if (partMatch?.[1] && partMatch[2]) {
    const partLabel = partMatch[1].toUpperCase();
    const partTitle = partMatch[2]
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .slice(0, 48)
      .trim();
    return `${partLabel} — ${partTitle}`;
  }
  if (s.length <= maxLen) return s;
  const sliced = s.slice(0, maxLen - 3);
  const lastSpace = sliced.lastIndexOf(" ");
  const boundary = lastSpace >= 20 ? sliced.slice(0, lastSpace) : sliced;
  return `${boundary.replace(/[\s\-:—,.;]+$/, "")}...`;
}

export function extractHostname(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return undefined;
  }
}

function normalizeUrlForDedupe(url?: string): string {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    const pathname = parsed.pathname.replace(/\/+$/, "") || "/";
    return `${parsed.hostname.replace(/^www\./i, "").toLowerCase()}${pathname}`;
  } catch {
    return url.trim().toLowerCase();
  }
}

function humanizeUrlSlug(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname
      .split("/")
      .map((seg) => seg.trim())
      .filter((seg) => seg && !/^(en|ng|gh|ke|za|pdf|docs?|wp-content|uploads|\d{4}|\d{2})$/i.test(seg));
    const lastSeg = segments[segments.length - 1];
    if (!lastSeg) return undefined;
    const cleaned = decodeURIComponent(lastSeg)
      .replace(/\.(html?|php|aspx?|pdf)$/i, "")
      .replace(/[-_]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (cleaned.length < 4) return undefined;
    return cleaned
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .slice(0, 72)
      .trim();
  } catch {
    return undefined;
  }
}

function isPoorWebTitle(title: string | undefined): boolean {
  if (!title) return true;
  const clean = title.trim();
  if (clean.length < 6) return true;
  if (GENERIC_WEB_TITLES.has(clean.toLowerCase())) return true;
  // Detect truncated mid-word or sentence-starter snippets ("This guide provides the requirements f...")
  if (/\.{3}$/.test(clean) && clean.length < 48) return true;
  if (/^this\s+(?:guide|document|page|circular)\s+provides/i.test(clean)) return true;
  // Detect short byline-only scrape like "Adewale F."
  if (/^[A-Z][a-z]+\s+[A-Z]\.?$/.test(clean)) return true;
  return false;
}

/**
 * Deduplicates citations across Statutory Vault clauses, Internal Playbooks, and Live Web sources,
 * removing OCR stutter and duplicate Paragraph/Section hits from the same instrument or URL.
 */
export function deduplicateCitations(rawCitations: CitationItem[]): CitationItem[] {
  const unique: CitationItem[] = [];
  const seenSemanticKeys = new Set<string>();
  const seenIds = new Set<string>();
  const seenWebUrls = new Set<string>();
  const seenVaultClauses = new Set<string>();

  for (const cit of rawCitations) {
    const cleanedClause = cleanCitationLabel(cit.clause_reference);
    const cleanedTitle = cleanCitationLabel(cit.instrument_title, 88) || cit.instrument_title;
    const cleanedRule = cleanCitationLabel(cit.rule_title, 88) || cit.rule_title;
    const cleanedPageTitle = cit.page_title
      ? sanitizeAssistantOutput(cit.page_title).replace(/\s+/g, " ").trim()
      : undefined;

    if (cit.source_class === "LIVE_WEB_INTELLIGENCE" && cit.retrieved_url) {
      const normalizedUrl = normalizeUrlForDedupe(cit.retrieved_url);
      if (normalizedUrl && seenWebUrls.has(normalizedUrl)) {
        continue;
      }
      if (normalizedUrl) seenWebUrls.add(normalizedUrl);
    }

    if (cit.source_class === "VERIFIED_OFFICIAL_SOURCE") {
      const reg = (cit.regulator || "STATUTE").toUpperCase();
      const clauseKey = (cleanedClause || "").toLowerCase();
      const titleKey = (cleanedTitle || "").toLowerCase();
      if (clauseKey) {
        const vaultTuple = `${reg}::${titleKey || "_"}::${clauseKey}`;
        const regClauseTuple = `${reg}::${clauseKey}`;
        if (seenVaultClauses.has(vaultTuple) || (!titleKey && seenVaultClauses.has(regClauseTuple))) {
          continue;
        }
        seenVaultClauses.add(vaultTuple);
        seenVaultClauses.add(regClauseTuple);
      }
    }

    const idKey = cit.regulatory_clause_id || cit.retrieved_url || "";
    const hasSemanticLabel = Boolean(cleanedTitle || cleanedRule || cleanedPageTitle || cleanedClause);
    const semanticKey = hasSemanticLabel
      ? [
          cit.source_class,
          (cit.regulator || "").toUpperCase(),
          (cleanedTitle || cleanedRule || cleanedPageTitle || "").toLowerCase(),
          (cleanedClause || "").toLowerCase(),
        ].join("::")
      : `${cit.source_class}::${idKey}`;

    if ((idKey && seenIds.has(idKey)) || seenSemanticKeys.has(semanticKey)) {
      continue;
    }
    if (idKey) seenIds.add(idKey);
    seenSemanticKeys.add(semanticKey);

    unique.push({
      ...cit,
      ...(cleanedClause ? { clause_reference: cleanedClause } : {}),
      ...(cleanedTitle ? { instrument_title: cleanedTitle } : {}),
      ...(cleanedRule ? { rule_title: cleanedRule } : {}),
      ...(cleanedPageTitle ? { page_title: cleanedPageTitle } : {}),
    });
  }

  return unique;
}

/**
 * Formats a citation into a rich, human-readable source row for the Sources Drawer.
 */
export function formatSourceEntry(cit: CitationItem): FormattedSourceEntry {
  if (cit.source_class === "VERIFIED_OFFICIAL_SOURCE") {
    const reg = (cit.regulator || "STATUTE").toUpperCase();
    const clause = cleanCitationLabel(cit.clause_reference, 72);
    const instrument = cleanCitationLabel(cit.instrument_title, 96);
    const primaryTitle = instrument
      ? clause
        ? `${instrument} — ${clause}`
        : instrument
      : clause || `${reg} Statutory Provision`;

    return {
      citation: cit,
      tierGroup: "STATUTORY_VAULT",
      badgeLabel: reg,
      primaryTitle,
      subtitle: clause && instrument ? clause : "Verified Statutory Vault Provision",
      clauseId: cit.regulatory_clause_id,
      href: cit.retrieved_url,
    };
  }

  if (cit.source_class === "INTERNAL_PLAYBOOK") {
    const primaryTitle =
      cleanCitationLabel(cit.rule_title || cit.instrument_title, 96) ||
      "Approved Institutional Policy / Rate Card";
    return {
      citation: cit,
      tierGroup: "INTERNAL_PLAYBOOK",
      badgeLabel: "PLAYBOOK",
      primaryTitle,
      subtitle: cit.instrument_title && cit.rule_title ? cleanCitationLabel(cit.instrument_title, 80) : "Internal Institutional Schedule",
    };
  }

  const hostname = extractHostname(cit.retrieved_url);
  const rawTitle = cit.page_title ? sanitizeAssistantOutput(cit.page_title).trim() : undefined;
  const slugTitle = humanizeUrlSlug(cit.retrieved_url);
  const primaryTitle = !isPoorWebTitle(rawTitle)
    ? rawTitle!
    : slugTitle && hostname
      ? `${slugTitle}`
      : rawTitle && rawTitle.length >= 4
        ? `${rawTitle}${hostname ? ` (${hostname})` : ""}`
        : hostname || cit.retrieved_url || "Regulatory Web Reference";

  const isOfficial = cit.trust_tier === "OFFICIAL_REGULATOR_WEB";
  const isLegalPress = cit.trust_tier === "VERIFIED_AFRICAN_LEGAL_MEDIA";

  return {
    citation: cit,
    tierGroup: isOfficial ? "OFFICIAL_REGULATOR_WEB" : "LEGAL_AND_PRESS",
    badgeLabel: isOfficial ? "OFFICIAL WEB" : isLegalPress ? "LEGAL / PRESS" : "WEB SOURCE",
    primaryTitle,
    subtitle: hostname,
    hostname,
    href: cit.retrieved_url,
  };
}
