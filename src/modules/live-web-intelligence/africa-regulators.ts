/**
 * Cogent Regulatory Intelligence Platform
 * Curated Nigeria & Pan-African Regulator Domain Taxonomy, Trust Classifier, and Evidence Sanitizer
 * Document Reference: Document 14 & Document 15 (Section 4.1)
 */

import crypto from "crypto";
import type { SearchJurisdiction, SourceTrustTier } from "@/contracts/search.contracts";

export interface JurisdictionRegistryEntry {
  code: SearchJurisdiction;
  name: string;
  officialDomains: readonly string[];
  legalFirmDomains: readonly string[];
  mediaDomains: readonly string[];
  serpLocale: {
    gl: string;
    hl: string;
    location: string;
  };
}

export const TIER_1_AFRICAN_LAW_FIRMS = [
  "banwo-ighodalo.com",
  "aluko-oyebode.com",
  "templars-law.com",
  "uubo.org",
  "olaniwunajayi.net",
  "pavestoneslegal.com",
  "detailcommercialsolicitors.com",
  "aelex.com",
  "bowmanslaw.com",
  "ensafrica.com",
  "aln.africa",
  "cliffedekkerhofmeyr.com",
  "webberwentzel.com",
  "jacksonettiandedu.com",
  "mondaq.com",
  "lexology.com",
  "iclg.com",
  "iflr.com",
] as const;

/**
 * Low-signal UGC/social domains excluded only during open-web neural search
 * so open-web discovery surfaces high-signal blogs, news, Substacks, and research cleanly.
 */
export const LOW_SIGNAL_NOISE_DOMAINS = [
  "pinterest.com",
  "quora.com",
  "tiktok.com",
  "instagram.com",
  "facebook.com",
] as const;

export const AFRICA_JURISDICTION_REGISTRY: Record<SearchJurisdiction, JurisdictionRegistryEntry> = {
  NG: {
    code: "NG",
    name: "Nigeria",
    officialDomains: [
      "cbn.gov.ng",
      "sec.gov.ng",
      "ndpc.gov.ng",
      "fccpc.gov.ng",
      "arcon.gov.ng",
      "advertcouncil.gov.ng",
      "ndic.gov.ng",
      "nfiu.gov.ng",
      "firs.gov.ng",
      "nitda.gov.ng",
      "cac.gov.ng",
      "nibss-plc.com.ng",
      "naicom.gov.ng",
      "pencom.gov.ng",
      "nipc.gov.ng",
    ],
    legalFirmDomains: TIER_1_AFRICAN_LAW_FIRMS,
    mediaDomains: [
      "nairametrics.com",
      "businessday.ng",
      "techcabal.com",
      "techpoint.africa",
      "benjamindada.com",
      "stears.co",
      "condia.africa",
      "proshare.co",
      "mariblock.com",
      "thecable.ng",
      "premiumtimesng.com",
      "punchng.com",
      "thisdaylive.com",
      "guardian.ng",
    ],
    serpLocale: { gl: "ng", hl: "en", location: "Lagos, Nigeria" },
  },
  GH: {
    code: "GH",
    name: "Ghana",
    officialDomains: ["bog.gov.gh", "sec.gov.gh", "dataprotection.org.gh", "nicgh.org"],
    legalFirmDomains: ["bowmanslaw.com", "ensafrica.com", "aln.africa", "templars-law.com", "mondaq.com", "lexology.com"],
    mediaDomains: ["citinewsroom.com", "thebftonline.com", "myjoyonline.com", "techcabal.com", "condia.africa"],
    serpLocale: { gl: "gh", hl: "en", location: "Accra, Ghana" },
  },
  KE: {
    code: "KE",
    name: "Kenya",
    officialDomains: [
      "centralbank.go.ke",
      "cbk.go.ke",
      "cma.or.ke",
      "odpc.go.ke",
      "cak.go.ke",
      "ira.go.ke",
    ],
    legalFirmDomains: ["bowmanslaw.com", "aln.africa", "ensafrica.com", "mondaq.com", "lexology.com"],
    mediaDomains: ["businessdailyafrica.com", "nation.africa", "techcabal.com", "techweez.com", "condia.africa"],
    serpLocale: { gl: "ke", hl: "en", location: "Nairobi, Kenya" },
  },
  ZA: {
    code: "ZA",
    name: "South Africa",
    officialDomains: [
      "resbank.co.za",
      "fsca.co.za",
      "fic.gov.za",
      "inforegulator.org.za",
      "ncr.org.za",
    ],
    legalFirmDomains: [
      "bowmanslaw.com",
      "ensafrica.com",
      "cliffedekkerhofmeyr.com",
      "webberwentzel.com",
      "mondaq.com",
      "lexology.com",
    ],
    mediaDomains: ["moneyweb.co.za", "businesslive.co.za", "dailymaverick.co.za", "techcentral.co.za"],
    serpLocale: { gl: "za", hl: "en", location: "Johannesburg, South Africa" },
  },
  RW: {
    code: "RW",
    name: "Rwanda",
    officialDomains: ["bnr.rw", "cma.rw", "dpo.gov.rw", "rura.rw"],
    legalFirmDomains: ["bowmanslaw.com", "ensafrica.com", "aln.africa", "mondaq.com"],
    mediaDomains: ["newtimes.co.rw", "ktpress.rw", "techcabal.com"],
    serpLocale: { gl: "rw", hl: "en", location: "Kigali, Rwanda" },
  },
  EG: {
    code: "EG",
    name: "Egypt",
    officialDomains: ["cbe.org.eg", "fra.gov.eg"],
    legalFirmDomains: ["aln.africa", "bowmanslaw.com", "mondaq.com", "lexology.com"],
    mediaDomains: ["enterprise.press", "dailynewsegypt.com", "waya.media"],
    serpLocale: { gl: "eg", hl: "en", location: "Cairo, Egypt" },
  },
  AFRICA_REGIONAL: {
    code: "AFRICA_REGIONAL",
    name: "Pan-African Regional",
    officialDomains: ["afreximbank.com", "afdb.org", "au.int", "papss.com", "giaba.org", "fatf-gafi.org", "bis.org"],
    legalFirmDomains: TIER_1_AFRICAN_LAW_FIRMS,
    mediaDomains: [
      "techcabal.com",
      "nairametrics.com",
      "businessdailyafrica.com",
      "theafricareport.com",
      "disruptafrica.com",
      "weetracker.com",
      "african.business",
      "techpoint.africa",
      "condia.africa",
    ],
    serpLocale: { gl: "ng", hl: "en", location: "Lagos, Nigeria" },
  },
};

export function buildJurisdictionSearchContext(jurisdictions: SearchJurisdiction[]): string {
  const names = Array.from(
    new Set(
      (jurisdictions.length > 0 ? jurisdictions : (["NG"] as SearchJurisdiction[]))
        .map((j) => AFRICA_JURISDICTION_REGISTRY[j]?.name)
        .filter((n): n is string => Boolean(n)),
    ),
  );
  return names.join(" ");
}

export interface DomainTrustClassification {
  trustTier: SourceTrustTier;
  trustBadgeLabel: string;
  authorityWeight: number;
  domain: string;
  jurisdictionHint: SearchJurisdiction;
  isPdf: boolean;
}

/**
 * Checks strict domain suffix equality (`host === allowed` or `host.endsWith("." + allowed)`),
 * preventing spoofed domains like `cbn.gov.ng.attacker.example` from passing as official regulators.
 */
export function matchesDomainSuffix(hostname: string, candidateDomain: string): boolean {
  const cleanHost = hostname.toLowerCase().replace(/\.$/, "");
  const cleanTarget = candidateDomain.toLowerCase().replace(/^\./, "");
  return cleanHost === cleanTarget || cleanHost.endsWith(`.${cleanTarget}`);
}

/**
 * Deterministically classifies any HTTP/HTTPS URL into Cogent's 3 Live-Web Trust Tiers.
 */
export function classifyDomainTrustTier(
  rawUrl: string,
  fallbackJurisdiction: SearchJurisdiction = "NG",
): DomainTrustClassification {
  let hostname = "unknown";
  let pathname = "";
  try {
    const parsed = new URL(rawUrl);
    hostname = parsed.hostname.toLowerCase().replace(/\.$/, "");
    pathname = parsed.pathname.toLowerCase();
  } catch {
    return {
      trustTier: "GENERAL_LIVE_WEB",
      trustBadgeLabel: "General Web",
      authorityWeight: 0.45,
      domain: hostname,
      jurisdictionHint: fallbackJurisdiction,
      isPdf: false,
    };
  }

  const isPdf = pathname.endsWith(".pdf") || rawUrl.toLowerCase().includes("filetype=pdf");

  for (const entry of Object.values(AFRICA_JURISDICTION_REGISTRY)) {
    if (entry.officialDomains.some((d) => matchesDomainSuffix(hostname, d))) {
      return {
        trustTier: "OFFICIAL_REGULATOR_WEB",
        trustBadgeLabel: `Live Official • ${hostname}`,
        authorityWeight: 1.0,
        domain: hostname,
        jurisdictionHint: entry.code,
        isPdf,
      };
    }
  }

  for (const entry of Object.values(AFRICA_JURISDICTION_REGISTRY)) {
    if (entry.legalFirmDomains.some((d) => matchesDomainSuffix(hostname, d))) {
      return {
        trustTier: "VERIFIED_AFRICAN_LEGAL_MEDIA",
        trustBadgeLabel: `Legal Briefing • ${hostname}`,
        authorityWeight: 0.82,
        domain: hostname,
        jurisdictionHint: entry.code,
        isPdf,
      };
    }
    if (entry.mediaDomains.some((d) => matchesDomainSuffix(hostname, d))) {
      return {
        trustTier: "VERIFIED_AFRICAN_LEGAL_MEDIA",
        trustBadgeLabel: `Financial Press • ${hostname}`,
        authorityWeight: 0.74,
        domain: hostname,
        jurisdictionHint: entry.code,
        isPdf,
      };
    }
  }

  return {
    trustTier: "GENERAL_LIVE_WEB",
    trustBadgeLabel: `Live Web • ${hostname}`,
    authorityWeight: 0.45,
    domain: hostname,
    jurisdictionHint: fallbackJurisdiction,
    isPdf,
  };
}

/**
 * Collects unique official, legal, or media domains for a jurisdiction array.
 */
export function getDomainsForJurisdictions(
  jurisdictions: SearchJurisdiction[],
  options: { includeOfficial?: boolean; includeLegal?: boolean; includeMedia?: boolean } = {
    includeOfficial: true,
    includeLegal: true,
    includeMedia: false,
  },
): string[] {
  const list = jurisdictions.length > 0 ? jurisdictions : (["NG"] as SearchJurisdiction[]);
  const set = new Set<string>();
  for (const code of list) {
    const entry = AFRICA_JURISDICTION_REGISTRY[code];
    if (!entry) continue;
    if (options.includeOfficial !== false) {
      entry.officialDomains.forEach((d) => set.add(d));
    }
    if (options.includeLegal) {
      entry.legalFirmDomains.forEach((d) => set.add(d));
    }
    if (options.includeMedia) {
      entry.mediaDomains.forEach((d) => set.add(d));
    }
  }
  return Array.from(set);
}

export function getPrimarySerpLocale(jurisdictions: SearchJurisdiction[]) {
  const first = jurisdictions[0] || "NG";
  return AFRICA_JURISDICTION_REGISTRY[first]?.serpLocale || AFRICA_JURISDICTION_REGISTRY.NG.serpLocale;
}

/**
 * Strips tracking query parameters, fragments, and normalizes trailing slashes for deduplication.
 */
export function canonicalizeUrl(rawUrl: string): { canonicalUrl: string; hash: string } | null {
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return null;
    }
    if (parsed.username || parsed.password) {
      return null;
    }
    const trackingPrefixes = ["utm_", "fbclid", "gclid", "mc_cid", "mc_eid", "ref_src"];
    for (const key of Array.from(parsed.searchParams.keys())) {
      const lower = key.toLowerCase();
      if (trackingPrefixes.some((prefix) => lower === prefix || lower.startsWith(prefix))) {
        parsed.searchParams.delete(key);
      }
    }
    parsed.hash = "";
    if (parsed.pathname.length > 1 && parsed.pathname.endsWith("/")) {
      parsed.pathname = parsed.pathname.slice(0, -1);
    }
    const canonicalUrl = parsed.toString();
    const hash = crypto.createHash("sha256").update(canonicalUrl).digest("hex");
    return { canonicalUrl, hash };
  } catch {
    return null;
  }
}

/**
 * Detects formal Nigerian circular codes or explicit regulatory PDF triggers.
 */
export function isCircularLookupQuery(query: string): boolean {
  const circularPattern = /\b(?:BSD|FPR|PSM|BPS|OFI|TED|COD|DIR|GEN|LAB|SEC|NDPC|FCCPC)\/[A-Z0-9\/-]{2,}\b/i;
  if (circularPattern.test(query)) return true;
  return /\b(circular|directive|exposure draft|gazette|guidelines?|framework)\b/i.test(query);
}

/**
 * Strips prompt injection strings, control bytes, and XML fence breakouts from external web snippets.
 */
export function sanitizeExternalEvidenceText(rawText: string, maxChars: number = 2500): string {
  if (!rawText) return "";
  const cleaned = rawText
    .replace(/\u0000/g, "")
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, " ")
    .replace(/<\/?(untrusted_live_web_evidence|verified_statutory_vault|internal_institutional_truth|system|instructions)>/gi, "[redacted_tag]")
    .replace(/(?:ignore|disregard|forget)\s+(?:all\s+)?(?:previous|prior|above)\s+(?:instructions|prompts|rules)/gi, "[filtered_instruction]")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned.length > maxChars ? `${cleaned.slice(0, maxChars - 3)}...` : cleaned;
}
