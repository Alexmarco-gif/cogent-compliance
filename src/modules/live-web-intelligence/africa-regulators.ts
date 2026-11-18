/**
 * Cogent Regulatory Intelligence Platform
 * Universal Global & Pan-African Regulator Taxonomy, Open-World Jurisdiction Resolver,
 * Multi-Pillar Query Planner, Trust Classifier, and Evidence Sanitizer
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
  regulatorKeywords?: readonly string[];
  serpLocale: {
    gl: string;
    hl: string;
    location: string;
  };
}

export interface PlannedSearchQuery {
  query: string;
  jurisdiction: SearchJurisdiction;
  facet: string;
  searchIntent: "REGULATORY_CIRCULAR" | "LEGAL_ANALYSIS" | "NEWS_ENFORCEMENT" | "CROSS_BORDER";
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
  "launchpad.ng",
  "chambers.com",
  "legal500.com",
  "dlapiper.com",
  "cliffordchance.com",
  "linklaters.com",
  "whitecase.com",
  "nortonrosefulbright.com",
  "dentons.com",
  "cms.law",
  "freshfields.com",
  "hoganlovells.com",
  "africanlii.org",
  "nigerialii.org",
  "ghalii.org",
  "saflii.org",
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

export const AFRICA_JURISDICTION_REGISTRY: Record<string, JurisdictionRegistryEntry> = {
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
    regulatorKeywords: ["CBN", "NDPC", "FCCPC", "SEC Nigeria", "CAC", "NFIU", "NDPA 2023"],
    serpLocale: { gl: "ng", hl: "en", location: "Lagos, Nigeria" },
  },
  GH: {
    code: "GH",
    name: "Ghana",
    officialDomains: [
      "bog.gov.gh",
      "sec.gov.gh",
      "dataprotection.org.gh",
      "nicgh.org",
      "orc.gov.gh",
      "rgd.gov.gh",
      "mofep.gov.gh",
      "ghipss.net",
    ],
    legalFirmDomains: [
      "bowmanslaw.com",
      "ensafrica.com",
      "aln.africa",
      "templars-law.com",
      "mondaq.com",
      "lexology.com",
      "iclg.com",
      "ghalii.org",
    ],
    mediaDomains: [
      "citinewsroom.com",
      "thebftonline.com",
      "myjoyonline.com",
      "techcabal.com",
      "condia.africa",
    ],
    regulatorKeywords: [
      "Bank of Ghana",
      "BoG",
      "Act 987",
      "Payment Systems and Services Act 2019",
      "Data Protection Commission Ghana",
      "Act 843",
      "SEC Ghana",
    ],
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
      "kenyalaw.org",
      "parliament.go.ke",
      "treasury.go.ke",
      "frc.go.ke",
    ],
    legalFirmDomains: [
      "bowmanslaw.com",
      "aln.africa",
      "ensafrica.com",
      "mondaq.com",
      "lexology.com",
      "iclg.com",
    ],
    mediaDomains: [
      "businessdailyafrica.com",
      "nation.africa",
      "techcabal.com",
      "techweez.com",
      "condia.africa",
      "standardmedia.co.ke",
    ],
    regulatorKeywords: [
      "Central Bank of Kenya",
      "CBK",
      "National Payment System",
      "ODPC",
      "Kenya Data Protection Act 2019",
      "CMA Kenya",
    ],
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
      "pasa.org.za",
      "gov.za",
      "treasury.gov.za",
      "cipc.co.za",
    ],
    legalFirmDomains: [
      "bowmanslaw.com",
      "ensafrica.com",
      "cliffedekkerhofmeyr.com",
      "webberwentzel.com",
      "mondaq.com",
      "lexology.com",
      "iclg.com",
      "saflii.org",
    ],
    mediaDomains: [
      "moneyweb.co.za",
      "businesslive.co.za",
      "dailymaverick.co.za",
      "techcentral.co.za",
      "itweb.co.za",
    ],
    regulatorKeywords: [
      "SARB",
      "South African Reserve Bank",
      "FinSurv",
      "FSCA",
      "Information Regulator",
      "POPIA",
      "PASA",
      "ADLA",
      "TPPP",
    ],
    serpLocale: { gl: "za", hl: "en", location: "Johannesburg, South Africa" },
  },
  RW: {
    code: "RW",
    name: "Rwanda",
    officialDomains: ["bnr.rw", "cma.rw", "dpo.gov.rw", "rura.rw", "rdb.rw"],
    legalFirmDomains: ["bowmanslaw.com", "ensafrica.com", "aln.africa", "mondaq.com", "lexology.com"],
    mediaDomains: ["newtimes.co.rw", "ktpress.rw", "techcabal.com"],
    regulatorKeywords: ["BNR", "National Bank of Rwanda", "DPO Rwanda", "CMA Rwanda"],
    serpLocale: { gl: "rw", hl: "en", location: "Kigali, Rwanda" },
  },
  EG: {
    code: "EG",
    name: "Egypt",
    officialDomains: ["cbe.org.eg", "fra.gov.eg", "ntra.gov.eg"],
    legalFirmDomains: ["aln.africa", "bowmanslaw.com", "mondaq.com", "lexology.com", "iclg.com"],
    mediaDomains: ["enterprise.press", "dailynewsegypt.com", "waya.media"],
    regulatorKeywords: ["Central Bank of Egypt", "CBE", "FRA Egypt", "PDPL Egypt"],
    serpLocale: { gl: "eg", hl: "en", location: "Cairo, Egypt" },
  },
  AFRICA_REGIONAL: {
    code: "AFRICA_REGIONAL",
    name: "Pan-African Regional",
    officialDomains: [
      "afreximbank.com",
      "afdb.org",
      "au.int",
      "papss.com",
      "giaba.org",
      "fatf-gafi.org",
      "bis.org",
      "bceao.int",
      "beac.int",
    ],
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
    regulatorKeywords: ["PAPSS", "AfCFTA", "Afreximbank", "BCEAO", "BEAC"],
    serpLocale: { gl: "ng", hl: "en", location: "Lagos, Nigeria" },
  },
};

/**
 * Open-World Global & Pan-African Jurisdiction Directory.
 * Any jurisdiction outside AFRICA_JURISDICTION_REGISTRY is resolved dynamically here or synthesized
 * on-the-fly so live web search is NEVER restricted to a hardcoded country list.
 */
export const OPEN_WORLD_JURISDICTION_DIRECTORY: Record<
  string,
  {
    code: string;
    name: string;
    aliases: readonly string[];
    regulatorKeywords: readonly string[];
    officialDomains: readonly string[];
    serpLocale: { gl: string; hl: string; location: string };
  }
> = {
  SN: {
    code: "SN",
    name: "Senegal",
    aliases: ["senegal", "senegalese", "dakar"],
    regulatorKeywords: ["BCEAO", "WAEMU", "UEMOA", "CDP Senegal"],
    officialDomains: ["bceao.int", "cdp.sn", "gouv.sn"],
    serpLocale: { gl: "sn", hl: "fr", location: "Dakar, Senegal" },
  },
  CI: {
    code: "CI",
    name: "Cote d'Ivoire",
    aliases: ["cote d'ivoire", "ivory coast", "ivorian", "abidjan", "côte d'ivoire"],
    regulatorKeywords: ["BCEAO", "WAEMU", "UEMOA", "ARTCI"],
    officialDomains: ["bceao.int", "artci.ci", "gouv.ci"],
    serpLocale: { gl: "ci", hl: "fr", location: "Abidjan, Cote d'Ivoire" },
  },
  TZ: {
    code: "TZ",
    name: "Tanzania",
    aliases: ["tanzania", "tanzanian", "dar es salaam"],
    regulatorKeywords: ["Bank of Tanzania", "BoT", "PDPC Tanzania", "CMSA Tanzania"],
    officialDomains: ["bot.go.tz", "pdpc.go.tz", "cmsa.go.tz", "tanzlii.org"],
    serpLocale: { gl: "tz", hl: "en", location: "Dar es Salaam, Tanzania" },
  },
  UG: {
    code: "UG",
    name: "Uganda",
    aliases: ["uganda", "ugandan", "kampala"],
    regulatorKeywords: ["Bank of Uganda", "BoU", "National Payment Systems Act Uganda", "PDPO Uganda"],
    officialDomains: ["bou.or.ug", "pdpo.go.ug", "cma.co.ug", "ulii.org"],
    serpLocale: { gl: "ug", hl: "en", location: "Kampala, Uganda" },
  },
  ET: {
    code: "ET",
    name: "Ethiopia",
    aliases: ["ethiopia", "ethiopian", "addis ababa"],
    regulatorKeywords: ["National Bank of Ethiopia", "NBE", "ECMA Ethiopia"],
    officialDomains: ["nbe.gov.et", "ecma.gov.et"],
    serpLocale: { gl: "et", hl: "en", location: "Addis Ababa, Ethiopia" },
  },
  MA: {
    code: "MA",
    name: "Morocco",
    aliases: ["morocco", "moroccan", "casablanca", "rabat"],
    regulatorKeywords: ["Bank Al-Maghrib", "BAM", "AMMC", "CNDP Morocco"],
    officialDomains: ["bkam.ma", "ammc.ma", "cndp.ma"],
    serpLocale: { gl: "ma", hl: "en", location: "Casablanca, Morocco" },
  },
  MU: {
    code: "MU",
    name: "Mauritius",
    aliases: ["mauritius", "mauritian", "port louis"],
    regulatorKeywords: ["Bank of Mauritius", "BoM", "FSC Mauritius", "Data Protection Office Mauritius"],
    officialDomains: ["bom.mu", "fscmauritius.org", "dataprotection.govmu.org"],
    serpLocale: { gl: "mu", hl: "en", location: "Port Louis, Mauritius" },
  },
  ZM: {
    code: "ZM",
    name: "Zambia",
    aliases: ["zambia", "zambian", "lusaka"],
    regulatorKeywords: ["Bank of Zambia", "BoZ", "SEC Zambia"],
    officialDomains: ["boz.zm", "seczambia.org.zm", "zambialii.org"],
    serpLocale: { gl: "zm", hl: "en", location: "Lusaka, Zambia" },
  },
  CM: {
    code: "CM",
    name: "Cameroon",
    aliases: ["cameroon", "cameroonian", "douala", "yaounde"],
    regulatorKeywords: ["BEAC", "COBAC", "CEMAC", "COSUMAF"],
    officialDomains: ["beac.int", "cosumaf.org"],
    serpLocale: { gl: "cm", hl: "en", location: "Douala, Cameroon" },
  },
  BW: {
    code: "BW",
    name: "Botswana",
    aliases: ["botswana", "gaborone"],
    regulatorKeywords: ["Bank of Botswana", "NBFIRA"],
    officialDomains: ["bankofbotswana.bw", "nbfira.org.bw", "gov.bw"],
    serpLocale: { gl: "bw", hl: "en", location: "Gaborone, Botswana" },
  },
  NA: {
    code: "NA",
    name: "Namibia",
    aliases: ["namibia", "namibian", "windhoek"],
    regulatorKeywords: ["Bank of Namibia", "BoN", "NAMFISA"],
    officialDomains: ["bon.com.na", "namfisa.com.na"],
    serpLocale: { gl: "na", hl: "en", location: "Windhoek, Namibia" },
  },
  GB: {
    code: "GB",
    name: "United Kingdom",
    aliases: ["united kingdom", "uk", "britain", "british", "england", "london", "fca"],
    regulatorKeywords: ["FCA", "Financial Conduct Authority", "PSR", "Bank of England", "ICO", "UK GDPR"],
    officialDomains: ["fca.org.uk", "bankofengland.co.uk", "psr.org.uk", "ico.org.uk", "legislation.gov.uk", "gov.uk"],
    serpLocale: { gl: "uk", hl: "en", location: "London, United Kingdom" },
  },
  US: {
    code: "US",
    name: "United States",
    aliases: ["united states", "usa", "u.s.", "us", "america", "american", "fincen", "cfpb"],
    regulatorKeywords: ["FinCEN", "CFPB", "OCC", "FDIC", "Federal Reserve", "SEC", "MTL"],
    officialDomains: ["fincen.gov", "consumerfinance.gov", "occ.gov", "fdic.gov", "federalreserve.gov", "sec.gov"],
    serpLocale: { gl: "us", hl: "en", location: "United States" },
  },
  EU: {
    code: "EU",
    name: "European Union",
    aliases: ["european union", "eu", "eea", "europe", "psd2", "psd3", "mica", "gdpr"],
    regulatorKeywords: ["EBA", "ECB", "ESMA", "PSD2", "PSD3", "MiCA", "GDPR", "EDPB"],
    officialDomains: ["eba.europa.eu", "ecb.europa.eu", "esma.europa.eu", "edpb.europa.eu", "eur-lex.europa.eu"],
    serpLocale: { gl: "ie", hl: "en", location: "Ireland" },
  },
  AE: {
    code: "AE",
    name: "United Arab Emirates",
    aliases: ["united arab emirates", "uae", "dubai", "abu dhabi", "difc", "adgm", "vara", "dfsa"],
    regulatorKeywords: ["CBUAE", "DFSA", "ADGM", "FSRA", "VARA"],
    officialDomains: ["centralbank.ae", "cbuae.gov.ae", "dfsa.ae", "adgm.com", "vara.ae"],
    serpLocale: { gl: "ae", hl: "en", location: "Dubai, United Arab Emirates" },
  },
  SG: {
    code: "SG",
    name: "Singapore",
    aliases: ["singapore", "singaporean", "mas"],
    regulatorKeywords: ["Monetary Authority of Singapore", "MAS", "Payment Services Act Singapore", "PDPC Singapore"],
    officialDomains: ["mas.gov.sg", "pdpc.gov.sg", "sso.agc.gov.sg", "gov.sg"],
    serpLocale: { gl: "sg", hl: "en", location: "Singapore" },
  },
  CA: {
    code: "CA",
    name: "Canada",
    aliases: ["canada", "canadian", "fintrac", "rpaa"],
    regulatorKeywords: ["FINTRAC", "Bank of Canada", "RPAA", "PIPEDA"],
    officialDomains: ["fintrac-canafe.gc.ca", "bankofcanada.ca", "priv.gc.ca", "canada.ca"],
    serpLocale: { gl: "ca", hl: "en", location: "Toronto, Canada" },
  },
  IN: {
    code: "IN",
    name: "India",
    aliases: ["india", "indian", "rbi", "mumbai"],
    regulatorKeywords: ["Reserve Bank of India", "RBI", "SEBI", "DPDP Act India"],
    officialDomains: ["rbi.org.in", "sebi.gov.in", "meity.gov.in"],
    serpLocale: { gl: "in", hl: "en", location: "Mumbai, India" },
  },
  BR: {
    code: "BR",
    name: "Brazil",
    aliases: ["brazil", "brazilian", "bcb", "lgpd"],
    regulatorKeywords: ["Banco Central do Brasil", "BCB", "ANPD", "LGPD"],
    officialDomains: ["bcb.gov.br", "gov.br"],
    serpLocale: { gl: "br", hl: "en", location: "Sao Paulo, Brazil" },
  },
  SA: {
    code: "SA",
    name: "Saudi Arabia",
    aliases: ["saudi arabia", "saudi", "sama", "riyadh", "sdaia"],
    regulatorKeywords: ["Saudi Central Bank", "SAMA", "CMA Saudi", "SDAIA PDPL"],
    officialDomains: ["sama.gov.sa", "cma.org.sa", "sdaia.gov.sa"],
    serpLocale: { gl: "sa", hl: "en", location: "Riyadh, Saudi Arabia" },
  },
  AU: {
    code: "AU",
    name: "Australia",
    aliases: ["australia", "australian", "asic", "apra", "austrac"],
    regulatorKeywords: ["ASIC", "APRA", "AUSTRAC", "RBA", "OAIC"],
    officialDomains: ["asic.gov.au", "apra.gov.au", "austrac.gov.au", "rba.gov.au", "oaic.gov.au"],
    serpLocale: { gl: "au", hl: "en", location: "Sydney, Australia" },
  },
};

/**
 * Resolves any jurisdiction code or country name (African or Global) into a normalized descriptor.
 * Never fails or restricts unknown countries — synthesizes a clean open-world entry dynamically.
 */
export function resolveJurisdictionDescriptor(codeOrName: string): JurisdictionRegistryEntry {
  const raw = (codeOrName || "").trim();
  const upper = raw.toUpperCase();

  if (AFRICA_JURISDICTION_REGISTRY[upper]) {
    return AFRICA_JURISDICTION_REGISTRY[upper]!;
  }

  if (upper === "UK") {
    return resolveJurisdictionDescriptor("GB");
  }
  if (upper === "UAE") {
    return resolveJurisdictionDescriptor("AE");
  }
  if (upper === "USA") {
    return resolveJurisdictionDescriptor("US");
  }

  const openEntry = OPEN_WORLD_JURISDICTION_DIRECTORY[upper];
  if (openEntry) {
    return {
      code: openEntry.code,
      name: openEntry.name,
      officialDomains: openEntry.officialDomains,
      legalFirmDomains: TIER_1_AFRICAN_LAW_FIRMS,
      mediaDomains: ["reuters.com", "bloomberg.com", "ft.com", "fintechfutures.com", "pymnts.com"],
      regulatorKeywords: openEntry.regulatorKeywords,
      serpLocale: openEntry.serpLocale,
    };
  }

  // Search by country name or alias
  const lower = raw.toLowerCase();
  for (const entry of Object.values(AFRICA_JURISDICTION_REGISTRY)) {
    if (entry.name.toLowerCase() === lower) {
      return entry;
    }
  }
  for (const entry of Object.values(OPEN_WORLD_JURISDICTION_DIRECTORY)) {
    if (entry.name.toLowerCase() === lower || entry.aliases.includes(lower)) {
      return {
        code: entry.code,
        name: entry.name,
        officialDomains: entry.officialDomains,
        legalFirmDomains: TIER_1_AFRICAN_LAW_FIRMS,
        mediaDomains: ["reuters.com", "bloomberg.com", "ft.com", "fintechfutures.com", "pymnts.com"],
        regulatorKeywords: entry.regulatorKeywords,
        serpLocale: entry.serpLocale,
      };
    }
  }

  // Dynamic open-world fallback for ANY country/territory on Earth
  const prettyName =
    raw.length <= 3
      ? upper
      : raw
          .toLowerCase()
          .replace(/\b\w/g, (c) => c.toUpperCase());

  return {
    code: upper.replace(/[^A-Z0-9_]/g, "_").slice(0, 24) || "GLOBAL",
    name: prettyName || "Global",
    officialDomains: [],
    legalFirmDomains: TIER_1_AFRICAN_LAW_FIRMS,
    mediaDomains: ["reuters.com", "bloomberg.com", "ft.com", "fintechfutures.com", "pymnts.com"],
    regulatorKeywords: [`${prettyName} Central Bank`, `${prettyName} Financial Regulator`, `${prettyName} Data Protection`],
    serpLocale: { gl: "us", hl: "en", location: "United States" },
  };
}

/**
 * Extracts all target jurisdictions mentioned in a user prompt (plus any explicit non-default selections).
 * Works across preset African countries, global hubs, and open-world country names in lists/comparisons.
 */
export function extractTargetJurisdictionsFromPrompt(
  prompt: string,
  explicitJurisdictions?: SearchJurisdiction[],
): SearchJurisdiction[] {
  const detected: string[] = [];
  const addCode = (code: string) => {
    const clean = code.trim().toUpperCase();
    if (clean && !detected.includes(clean)) {
      detected.push(clean);
    }
  };

  const text = prompt || "";
  const lower = text.toLowerCase();

  // 1. Check preset African jurisdictions in order of appearance in the prompt
  const candidateMatches: Array<{ code: string; index: number }> = [];

  const registerPattern = (code: string, regex: RegExp) => {
    const match = regex.exec(text);
    if (match && typeof match.index === "number") {
      candidateMatches.push({ code, index: match.index });
    }
  };

  registerPattern("NG", /\b(?:nigeria|nigerian|cbn\b|ndpc\b|ndpa\b|fccpc\b|arcon\b|naicom\b|pencom\b|nfiu\b)\b/i);
  registerPattern("KE", /\b(?:kenya|kenyan|cbk\b|central\s+bank\s+of\s+kenya|odpc\b|nairobi)\b/i);
  registerPattern("GH", /\b(?:ghana|ghanaian|bank\s+of\s+ghana|\bbog\b|act\s+987|act\s+843|accra)\b/i);
  registerPattern("ZA", /\b(?:south\s+africa|south\s+african|\bsarb\b|\bfsca\b|\bfinsurv\b|\bpopia\b|\bfic\b|\bpasa\b|johannesburg)\b/i);
  registerPattern("RW", /\b(?:rwanda|rwandan|\bbnr\b|national\s+bank\s+of\s+rwanda|kigali)\b/i);
  registerPattern("EG", /\b(?:egypt|egyptian|\bcbe\b|central\s+bank\s+of\s+egypt|\bfra\s+egypt|cairo)\b/i);
  registerPattern("AFRICA_REGIONAL", /\b(?:afcfta|papss|afreximbank|ecowas|sadc|eac\b)\b/i);

  for (const entry of Object.values(OPEN_WORLD_JURISDICTION_DIRECTORY)) {
    const escapedAliases = [entry.name.toLowerCase(), ...entry.aliases].map((a) =>
      a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    );
    const pattern = new RegExp(`\\b(?:${escapedAliases.join("|")})\\b`, "i");
    registerPattern(entry.code, pattern);
  }

  // 2. Also detect open-world countries from numbered lists or "across/between/in" patterns
  // e.g. "1. Senegal\n2. Tanzania" or "comparing Colombia, Mexico, and Chile"
  const numberedCountryRegex = /(?:^|\n)\s*\d+[.)]\s*([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,2})(?:\s*\([^)]*\))?\s*(?:\n|$)/g;
  const ignoredHeadings = new Set([
    "primary",
    "required",
    "minimum",
    "virtual",
    "data",
    "recommended",
    "executive",
    "pillar",
    "section",
    "stage",
    "step",
    "part",
    "table",
    "question",
    "key",
    "compliance",
    "regulatory",
    "fintech",
    "board",
    "product",
    "internal",
    "direct",
    "local",
  ]);
  let listMatch: RegExpExecArray | null;
  while ((listMatch = numberedCountryRegex.exec(text)) !== null) {
    const candidateName = (listMatch[1] || "").trim();
    const firstWord = candidateName.split(/\s+/)[0]?.toLowerCase() || "";
    if (
      candidateName.length >= 4 &&
      candidateName.length <= 28 &&
      !ignoredHeadings.has(firstWord) &&
      !candidateMatches.some(
        (m) => resolveJurisdictionDescriptor(m.code).name.toLowerCase() === candidateName.toLowerCase(),
      )
    ) {
      // Check if it looks like a proper geographical name mentioned after "jurisdictions" / "countries" / "markets"
      const preceding = text.slice(Math.max(0, listMatch.index - 160), listMatch.index).toLowerCase();
      if (/\b(?:jurisdictions?|countries|markets?|territories|regions?)\b/.test(preceding)) {
        const desc = resolveJurisdictionDescriptor(candidateName);
        candidateMatches.push({ code: desc.code, index: listMatch.index });
      }
    }
  }

  candidateMatches.sort((a, b) => a.index - b.index);
  for (const m of candidateMatches) {
    addCode(m.code);
  }

  // 3. Merge with explicitJurisdictions from caller/UI
  const cleanExplicit = (explicitJurisdictions || [])
    .map((j) => j.trim().toUpperCase())
    .filter(Boolean);

  // If caller passed non-default explicit jurisdictions (e.g., ["NG", "KE"] or ["GH"]), include them all
  const isDefaultNgOnly = cleanExplicit.length === 1 && cleanExplicit[0] === "NG";
  if (!isDefaultNgOnly) {
    for (const exp of cleanExplicit) {
      addCode(exp);
    }
  }

  // If nothing was detected from prompt, fall back to explicitJurisdictions or ["NG"]
  if (detected.length === 0) {
    if (cleanExplicit.length > 0) {
      return cleanExplicit;
    }
    return ["NG"];
  }

  // If the prompt explicitly mentions Nigeria or home market alongside other countries, NG is already in `detected`.
  // If `detected` only has non-NG countries and the prompt says "cross-border from Nigeria" or "CBN", NG is also in `detected`.
  if (lower.includes("home market") && !detected.includes("NG") && isDefaultNgOnly) {
    detected.unshift("NG");
  }

  return detected;
}

/**
 * Decomposes a complex multi-jurisdiction or multi-pillar regulatory prompt into targeted,
 * high-recall search queries per jurisdiction & regulatory facet (never truncating at 180 chars).
 */
export function planMultiJurisdictionSearchQueries(
  userPrompt: string,
  jurisdictions: SearchJurisdiction[],
  productName?: string | null,
): PlannedSearchQuery[] {
  const targetJurisdictions =
    jurisdictions.length > 0
      ? jurisdictions
      : extractTargetJurisdictionsFromPrompt(userPrompt);

  const lower = userPrompt.toLowerCase();
  const hasLicensingOrCapital =
    /\b(?:licens|capital|equity|sharehold|director|residen|incorporat|passport|pssp|imto|emi|psp|mmo|vasp|sandbox|sponsor|bin|adla|tppp)\b/.test(
      lower,
    );
  const hasFxOrCardsOrCrypto =
    /\b(?:virtual\s+card|usd|fx|foreign\s+exchange|remittance|settlement|repatriation|stablecoin|crypto|virtual\s+asset|vasp|bin\s+sponsorship|cross[- ]?border)\b/.test(
      lower,
    );
  const hasDataLocalization =
    /\b(?:data\s+locali[sz]ation|data\s+protection|cross[- ]?border\s+data|ndpa|ndpc|odpc|popia|gdpr|transfer\s+mandate|data\s+residency|act\s+843|dpa\s+2019)\b/.test(
      lower,
    );

  // Extract numbered or bulleted topical pillars from the user's prompt (filtering out short lines that are just country names)
  const rawNumberedLines = Array.from(
    userPrompt.matchAll(/(?:^|\n)\s*(?:\d+[.)]|[-*•])\s*([^\n]{18,260})/g),
  ).map((m) => (m[1] || "").trim());

  const cleanPillarText = (line: string): string =>
    line
      .replace(/\b(?:e\.g\.|i\.e\.|whether\s+a|and\s+estimated|vs\.?)\b/gi, " ")
      .replace(/[^\w\s/-]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120);

  const extractedPillars = rawNumberedLines
    .map(cleanPillarText)
    .filter((line) => line.split(/\s+/).length >= 4);

  // Extract concise topical keywords from the prompt if no numbered pillars were provided
  const cleanCoreTerms = userPrompt
    .replace(/We are preparing[^.\n]*[.\n]/gi, " ")
    .replace(/Please build a comprehensive[^:\n]*[:\n]/gi, " ")
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 140);

  const planned: PlannedSearchQuery[] = [];

  for (const code of targetJurisdictions.slice(0, 6)) {
    const desc = resolveJurisdictionDescriptor(code);
    const countryName = desc.name;
    const regKeywords = (desc.regulatorKeywords || []).slice(0, 4).join(" ") || `${countryName} regulator`;

    if (extractedPillars.length >= 2) {
      const mid = Math.ceil(extractedPillars.length / 2);
      const firstHalfTerms = extractedPillars.slice(0, mid).join(" ").slice(0, 180);
      const secondHalfTerms = extractedPillars.slice(mid).join(" ").slice(0, 180);

      planned.push({
        jurisdiction: desc.code,
        facet: "pillars_group_1",
        searchIntent: "CROSS_BORDER",
        query: `${countryName} ${regKeywords} ${firstHalfTerms} official statutory requirements 2025 2026`
          .replace(/\s+/g, " ")
          .trim(),
      });

      planned.push({
        jurisdiction: desc.code,
        facet: "pillars_group_2",
        searchIntent: "REGULATORY_CIRCULAR",
        query: `${countryName} ${regKeywords} ${secondHalfTerms} circular guidelines 2025 2026 2027`
          .replace(/\s+/g, " ")
          .trim(),
      });
    } else {
      if (hasLicensingOrCapital || targetJurisdictions.length > 1) {
        planned.push({
          jurisdiction: desc.code,
          facet: "licensing_capital_governance",
          searchIntent: "CROSS_BORDER",
          query: `${countryName} ${regKeywords} ${productName || ""} ${cleanCoreTerms} licensing capital governance requirements 2025 2026`
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 260),
        });
      }
      if (hasDataLocalization || hasFxOrCardsOrCrypto) {
        planned.push({
          jurisdiction: desc.code,
          facet: "fx_cards_data_localization",
          searchIntent: "REGULATORY_CIRCULAR",
          query: `${countryName} ${regKeywords} ${cleanCoreTerms} FX settlement data localization protection circular 2025 2026`
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 260),
        });
      }
      if (!hasLicensingOrCapital && !hasDataLocalization && !hasFxOrCardsOrCrypto && targetJurisdictions.length <= 1) {
        planned.push({
          jurisdiction: desc.code,
          facet: "general_regulatory",
          searchIntent: "REGULATORY_CIRCULAR",
          query: `${countryName} ${regKeywords} ${productName || ""} ${cleanCoreTerms}`
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 260),
        });
      }
    }
  }

  if (planned.length === 0) {
    const primaryCode = targetJurisdictions[0] || "NG";
    const desc = resolveJurisdictionDescriptor(primaryCode);
    planned.push({
      jurisdiction: desc.code,
      facet: "primary_query",
      searchIntent: "REGULATORY_CIRCULAR",
      query: `${desc.name} ${cleanCoreTerms || userPrompt.slice(0, 160)}`.replace(/\s+/g, " ").trim(),
    });
  }

  return planned;
}

export function buildJurisdictionSearchContext(jurisdictions: SearchJurisdiction[]): string {
  const names = Array.from(
    new Set(
      (jurisdictions.length > 0 ? jurisdictions : (["NG"] as SearchJurisdiction[]))
        .map((j) => resolveJurisdictionDescriptor(j).name)
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

const UNIVERSAL_OFFICIAL_REGULATOR_DOMAINS = [
  "fca.org.uk",
  "bankofengland.co.uk",
  "psr.org.uk",
  "ico.org.uk",
  "legislation.gov.uk",
  "fincen.gov",
  "consumerfinance.gov",
  "occ.gov",
  "fdic.gov",
  "federalreserve.gov",
  "sec.gov",
  "mas.gov.sg",
  "pdpc.gov.sg",
  "centralbank.ae",
  "cbuae.gov.ae",
  "dfsa.ae",
  "adgm.com",
  "vara.ae",
  "eba.europa.eu",
  "ecb.europa.eu",
  "esma.europa.eu",
  "edpb.europa.eu",
  "eur-lex.europa.eu",
  "rbi.org.in",
  "sebi.gov.in",
  "bcb.gov.br",
  "sama.gov.sa",
  "cma.org.sa",
  "sdaia.gov.sa",
  "asic.gov.au",
  "apra.gov.au",
  "austrac.gov.au",
  "rba.gov.au",
  "fintrac-canafe.gc.ca",
  "bankofcanada.ca",
  "bceao.int",
  "beac.int",
  "bot.go.tz",
  "bou.or.ug",
  "nbe.gov.et",
  "bkam.ma",
  "bom.mu",
  "fscmauritius.org",
  "boz.zm",
  "bankofbotswana.bw",
  "bon.com.na",
  "kenyalaw.org",
  "parliament.go.ke",
  "pasa.org.za",
] as const;

const UNIVERSAL_FINANCIAL_MEDIA_DOMAINS = [
  "reuters.com",
  "bloomberg.com",
  "ft.com",
  "thebanker.com",
  "fintechfutures.com",
  "pymnts.com",
  "restofworld.org",
  "semafor.com",
] as const;

/**
 * Deterministically classifies any HTTP/HTTPS URL into Cogent's 3 Live-Web Trust Tiers.
 * Supports both preset African regulators and universal open-world sovereign/regulator domains.
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

  // 1. Check preset African jurisdiction official domains
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

  // 2. Check open-world directory official domains
  for (const entry of Object.values(OPEN_WORLD_JURISDICTION_DIRECTORY)) {
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

  // 3. Universal sovereign government / central bank TLD check (strictly anchored at end of hostname to block spoofing)
  if (
    UNIVERSAL_OFFICIAL_REGULATOR_DOMAINS.some((d) => matchesDomainSuffix(hostname, d)) ||
    /\.(?:gov|go|gouv|gob)\.[a-z]{2}$/i.test(hostname) ||
    /\.gov$/i.test(hostname) ||
    /\.europa\.eu$/i.test(hostname)
  ) {
    const ccMatch = hostname.match(/\.([a-z]{2})$/i);
    const inferredCode = ccMatch?.[1] ? ccMatch[1].toUpperCase() : fallbackJurisdiction;
    return {
      trustTier: "OFFICIAL_REGULATOR_WEB",
      trustBadgeLabel: `Live Official • ${hostname}`,
      authorityWeight: 1.0,
      domain: hostname,
      jurisdictionHint: inferredCode === "UK" ? "GB" : inferredCode,
      isPdf,
    };
  }

  // 4. Legal firms & verified legal/financial media
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

  if (TIER_1_AFRICAN_LAW_FIRMS.some((d) => matchesDomainSuffix(hostname, d))) {
    return {
      trustTier: "VERIFIED_AFRICAN_LEGAL_MEDIA",
      trustBadgeLabel: `Legal Briefing • ${hostname}`,
      authorityWeight: 0.82,
      domain: hostname,
      jurisdictionHint: fallbackJurisdiction,
      isPdf,
    };
  }

  if (UNIVERSAL_FINANCIAL_MEDIA_DOMAINS.some((d) => matchesDomainSuffix(hostname, d))) {
    return {
      trustTier: "VERIFIED_AFRICAN_LEGAL_MEDIA",
      trustBadgeLabel: `Financial Press • ${hostname}`,
      authorityWeight: 0.74,
      domain: hostname,
      jurisdictionHint: fallbackJurisdiction,
      isPdf,
    };
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
    const entry =
      AFRICA_JURISDICTION_REGISTRY[code] || resolveJurisdictionDescriptor(code);
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
  return (
    AFRICA_JURISDICTION_REGISTRY[first]?.serpLocale ||
    resolveJurisdictionDescriptor(first).serpLocale ||
    AFRICA_JURISDICTION_REGISTRY.NG!.serpLocale
  );
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
 * Detects formal circular codes or explicit single-instrument lookup triggers.
 */
export function isCircularLookupQuery(query: string): boolean {
  const circularPattern = /\b(?:BSD|FPR|PSM|BPS|OFI|TED|COD|DIR|GEN|LAB|SEC|NDPC|FCCPC|PSS)\/[A-Z0-9/-]{2,}\b/i;
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
