/**
 * Cogent Marketing Shield - Statutory Vault Ingestion CLI
 * Document Reference: Document 05, Document 08 (Phase 5 Remediation)
 *
 * Usage:
 *   pnpm dlx tsx --env-file=.env.local scripts/ingest-statutory-vault.ts --wave=1
 *   pnpm dlx tsx --env-file=.env.local scripts/ingest-statutory-vault.ts --wave=2
 */

import { existsSync, readdirSync, statSync } from "fs";
import path from "path";
import {
  statutoryVaultIngestionService,
  type DocumentMetadata,
  type IngestedDocumentResult,
} from "../src/modules/regulatory-vault/ingestion.service";
import { logger } from "../src/lib/logger";

interface CoreDocSpec {
  relPath: string;
  meta: DocumentMetadata;
}

const CORE_WAVE_1_DOCS: CoreDocSpec[] = [
  // FCCPC
  {
    relPath: "fccpc/Publication-of-Sales-Promo-Regulations-2026-Stakeholders-Letters-2.pdf",
    meta: {
      regulatorAcronym: "FCCPC",
      instrumentTitle: "FCCPC Sales Promotion Regulations, 2026",
      instrumentType: "REGULATION",
      publicationDate: "2026-01-15",
      effectiveDate: "2026-01-15",
      sourceUrl: "https://fccpc.gov.ng/regulations/sales-promo-2026",
    },
  },
  {
    relPath: "fccpc/Digital-Electronic-Online-or-Non-Traditional-Consumer-Lending-Regulations-2025.pdf",
    meta: {
      regulatorAcronym: "FCCPC",
      instrumentTitle: "Digital, Electronic, Online, or Non-Traditional Consumer Lending Regulations, 2025",
      instrumentType: "REGULATION",
      publicationDate: "2025-04-10",
      effectiveDate: "2025-04-10",
      sourceUrl: "https://fccpc.gov.ng/regulations/deon-lending-2025",
    },
  },
  {
    relPath: "fccpc/DEON-Consumer-Lending-Guidelines-2025.pdf",
    meta: {
      regulatorAcronym: "FCCPC",
      instrumentTitle: "Digital, Electronic, Online, or Non-Traditional Consumer Lending Guidelines, 2025",
      instrumentType: "GUIDELINE",
      publicationDate: "2025-04-10",
      effectiveDate: "2025-04-10",
      sourceUrl: "https://fccpc.gov.ng/guidelines/deon-consumer-lending",
    },
  },
  {
    relPath: "fccpc/FCCPA-2018.pdf",
    meta: {
      regulatorAcronym: "FCCPC",
      instrumentTitle: "Federal Competition and Consumer Protection Act, 2018",
      instrumentType: "ACT",
      instrumentNumber: "Act No. 1 of 2019",
      publicationDate: "2019-01-30",
      effectiveDate: "2019-01-30",
      sourceUrl: "https://fccpc.gov.ng/legislation/fccpa-2018",
    },
  },
  {
    relPath: "fccpc/FCCP-Consumer-Protection-Regulations-Exposure-Draft-.pdf",
    meta: {
      regulatorAcronym: "FCCPC",
      instrumentTitle: "FCCPC Consumer Protection Regulations, 2026",
      instrumentType: "REGULATION",
      publicationDate: "2026-02-01",
      effectiveDate: "2026-02-01",
      sourceUrl: "https://fccpc.gov.ng/regulations/cpr-2026",
    },
  },

  // CBN
  {
    relPath: "cbn/cbn consumer protection regulations.pdf",
    meta: {
      regulatorAcronym: "CBN",
      instrumentTitle: "Central Bank of Nigeria Consumer Protection Regulations, 2019",
      instrumentType: "REGULATION",
      publicationDate: "2019-12-20",
      effectiveDate: "2019-12-20",
      sourceUrl: "https://cbn.gov.ng/documents/consumer-protection-regulations-2019",
    },
  },
  {
    relPath: "cbn/consumer protection framework (final).pdf",
    meta: {
      regulatorAcronym: "CBN",
      instrumentTitle: "Central Bank of Nigeria Consumer Protection Framework (CPF), 2016",
      instrumentType: "GUIDELINE",
      publicationDate: "2016-11-07",
      effectiveDate: "2016-11-07",
      sourceUrl: "https://cbn.gov.ng/documents/consumer-protection-framework-2016",
    },
  },
  {
    relPath: "cbn/Signed Guide to Charges April 2026.pdf",
    meta: {
      regulatorAcronym: "CBN",
      instrumentTitle: "Guide to Charges by Banks, Other Financial and Non-Bank Financial Institutions in Nigeria, 2026",
      instrumentType: "GUIDELINE",
      publicationDate: "2026-04-01",
      effectiveDate: "2026-04-01",
      sourceUrl: "https://cbn.gov.ng/documents/guide-to-charges-2026",
    },
  },
  {
    relPath: "cbn/ATM Guidelines.pdf",
    meta: {
      regulatorAcronym: "CBN",
      instrumentTitle: "Guidelines on the Operations of Automated Teller Machines (ATMs) in Nigeria, 2026",
      instrumentType: "GUIDELINE",
      publicationDate: "2026-03-01",
      effectiveDate: "2026-03-01",
      sourceUrl: "https://cbn.gov.ng/documents/atm-guidelines-2026",
    },
  },
  {
    relPath: "cbn/CIRCULAR AND GUIDELINES FOR THE OPERATIONS OF AGENT BANKING IN NIGERIA OCTOBER 6 2025.pdf",
    meta: {
      regulatorAcronym: "CBN",
      instrumentTitle: "Guidelines for the Operations of Agent Banking in Nigeria, 2025",
      instrumentType: "GUIDELINE",
      publicationDate: "2025-10-06",
      effectiveDate: "2025-10-06",
      sourceUrl: "https://cbn.gov.ng/documents/agent-banking-guidelines-2025",
    },
  },
  {
    relPath: "cbn/COMPLIANCE WITH REGULATORY PROVISIONS ON ADVERTISEMENT AND IMMEDIATE WITHDRAWAL OF NON-COMPLIANT ADVERTISEMENTS.pdf",
    meta: {
      regulatorAcronym: "CBN",
      instrumentTitle: "Compliance with Regulatory Provisions on Advertisement and Immediate Withdrawal of Non-Compliant Advertisements",
      instrumentType: "CIRCULAR",
      instrumentNumber: "CMD/DIR/PUB/CIR/001/003",
      publicationDate: "2025-11-27",
      effectiveDate: "2025-11-27",
      sourceUrl: "https://cbn.gov.ng/circulars/advertising-compliance-withdrawal-2025",
    },
  },
  {
    relPath: "cbn/CBN Risk-Based Cybersecurity Framework for DMBs and PSBs_2024.pdf",
    meta: {
      regulatorAcronym: "CBN",
      instrumentTitle: "Risk-Based Cybersecurity Framework and Guidelines for Deposit Money Banks and Payment Service Banks, 2024",
      instrumentType: "GUIDELINE",
      publicationDate: "2024-05-31",
      effectiveDate: "2024-05-31",
      sourceUrl: "https://cbn.gov.ng/documents/cybersecurity-framework-2024",
    },
  },
  {
    relPath: "cbn/GUIDELINES ON OPERATIONS OF BANK ACCOUNTS FOR VIRTUAL Asset Providers.pdf",
    meta: {
      regulatorAcronym: "CBN",
      instrumentTitle: "Guidelines on Operations of Bank Accounts for Virtual Assets Service Providers (VASPs), 2023",
      instrumentType: "GUIDELINE",
      publicationDate: "2023-12-22",
      effectiveDate: "2023-12-22",
      sourceUrl: "https://cbn.gov.ng/documents/vasp-guidelines-2023",
    },
  },

  // ARCON
  {
    relPath: "arcon/ARCON Act 2022.pdf",
    meta: {
      regulatorAcronym: "ARCON",
      instrumentTitle: "Advertising Regulatory Council of Nigeria Act, 2022",
      instrumentType: "ACT",
      instrumentNumber: "Act No. 23 of 2022",
      publicationDate: "2022-07-05",
      effectiveDate: "2022-07-05",
      sourceUrl: "https://arcon.gov.ng/legislation/arcon-act-2022",
    },
  },
  {
    relPath: "arcon/Vetting Guidelines.pdf",
    meta: {
      regulatorAcronym: "ARCON",
      instrumentTitle: "Advertising Standards Panel (ASP) Vetting Guidelines to Check Advertising Abuses",
      instrumentType: "GUIDELINE",
      publicationDate: "2022-10-01",
      effectiveDate: "2022-10-01",
      sourceUrl: "https://arcon.gov.ng/guidelines/asp-vetting-guidelines",
    },
  },
  {
    relPath: "arcon/Standards of Practice.pdf",
    meta: {
      regulatorAcronym: "ARCON",
      instrumentTitle: "Advertising Industry Standards of Practice (AISOP), 2021",
      instrumentType: "CODE",
      publicationDate: "2021-10-06",
      effectiveDate: "2021-10-06",
      sourceUrl: "https://arcon.gov.ng/codes/aisop-2021",
    },
  },
  {
    relPath: "arcon/BAN ON FOREIGN MODELS.pdf",
    meta: {
      regulatorAcronym: "ARCON",
      instrumentTitle: "Ban on the Use of Foreign Models and Voice-Over Artists in Nigerian Advertisements",
      instrumentType: "DIRECTIVE",
      publicationDate: "2022-08-22",
      effectiveDate: "2022-08-22",
      sourceUrl: "https://arcon.gov.ng/directives/ban-foreign-models",
    },
  },

  // NDPC
  {
    relPath: "ndpc/Nigeria_Data_Protection_Act_2023.pdf",
    meta: {
      regulatorAcronym: "NDPC",
      instrumentTitle: "Nigeria Data Protection Act, 2023",
      instrumentType: "ACT",
      instrumentNumber: "Act No. 37 of 2023",
      publicationDate: "2023-06-12",
      effectiveDate: "2023-06-12",
      sourceUrl: "https://ndpc.gov.ng/legislation/ndpa-2023",
    },
  },
  {
    relPath: "ndpc/NDP-ACT-GAID-2025-MARCH-20TH.pdf",
    meta: {
      regulatorAcronym: "NDPC",
      instrumentTitle: "Nigeria Data Protection Act General Application and Implementation Directive (GAID), 2025",
      instrumentType: "DIRECTIVE",
      instrumentNumber: "NDPC/NDP ACT-GAID/01/2025",
      publicationDate: "2025-03-20",
      effectiveDate: "2025-03-20",
      sourceUrl: "https://ndpc.gov.ng/directives/gaid-2025",
    },
  },

  // SEC
  {
    relPath: "sec/Rules-on-Crowdfunding_210121.pdf",
    meta: {
      regulatorAcronym: "SEC",
      instrumentTitle: "Securities and Exchange Commission Rules on Crowdfunding, 2021",
      instrumentType: "REGULATION",
      publicationDate: "2021-01-21",
      effectiveDate: "2021-01-21",
      sourceUrl: "https://sec.gov.ng/rules/crowdfunding-2021",
    },
  },
  {
    relPath: "sec/Rules-on-Robo-Advisory-Services_Executed-30-August-2021.pdf",
    meta: {
      regulatorAcronym: "SEC",
      instrumentTitle: "Securities and Exchange Commission Rules on Robo-Advisory Services, 2021",
      instrumentType: "REGULATION",
      publicationDate: "2021-08-30",
      effectiveDate: "2021-08-30",
      sourceUrl: "https://sec.gov.ng/rules/robo-advisory-2021",
    },
  },
  {
    relPath: "sec/Rules-on-Issuance-Offering-and-Custody-of-Digital-Assets.pdf",
    meta: {
      regulatorAcronym: "SEC",
      instrumentTitle: "Rules on Issuance, Offering Platforms and Custody of Digital Assets, 2022",
      instrumentType: "REGULATION",
      publicationDate: "2022-05-11",
      effectiveDate: "2022-05-11",
      sourceUrl: "https://sec.gov.ng/rules/digital-assets-2022",
    },
  },
  {
    relPath: "sec/SEC-AMLCFTCPF-REGULATIONS-12-MAY-2022.pdf",
    meta: {
      regulatorAcronym: "SEC",
      instrumentTitle: "SEC Capital Market Operators Anti-Money Laundering, Combating Terrorism Financing and Proliferation Financing Regulations, 2022",
      instrumentType: "REGULATION",
      publicationDate: "2022-05-12",
      effectiveDate: "2022-05-12",
      sourceUrl: "https://sec.gov.ng/regulations/aml-cft-cpf-2022",
    },
  },
];

function getAllPdfFiles(dir: string): string[] {
  const files: string[] = [];
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      files.push(...getAllPdfFiles(full));
    } else if (entry.toLowerCase().endsWith(".pdf")) {
      files.push(full);
    }
  }
  return files;
}

function inferMetadataFromPath(filePath: string): DocumentMetadata {
  const norm = filePath.replace(/\\/g, "/");
  const filename = path.basename(filePath, ".pdf");

  let regulatorAcronym: DocumentMetadata["regulatorAcronym"] = "CBN";
  if (norm.includes("/fccpc/")) regulatorAcronym = "FCCPC";
  else if (norm.includes("/arcon/")) regulatorAcronym = "ARCON";
  else if (norm.includes("/ndpc/")) regulatorAcronym = "NDPC";
  else if (norm.includes("/sec/")) regulatorAcronym = "SEC";

  let instrumentType: DocumentMetadata["instrumentType"] = "CIRCULAR";
  if (/act/i.test(filename)) instrumentType = "ACT";
  else if (/regulation/i.test(filename)) instrumentType = "REGULATION";
  else if (/guideline/i.test(filename) || /framework/i.test(filename)) instrumentType = "GUIDELINE";
  else if (/code/i.test(filename) || /standard/i.test(filename)) instrumentType = "CODE";
  else if (/directive/i.test(filename) || /order/i.test(filename)) instrumentType = "DIRECTIVE";
  else if (/notice/i.test(filename)) instrumentType = "NOTICE";

  const cleanTitle = filename
    .replace(/[_-]+/g, " ")
    .replace(/\bpdf\b/gi, "")
    .trim();

  return {
    regulatorAcronym,
    instrumentTitle: `${regulatorAcronym} - ${cleanTitle}`,
    instrumentType,
    publicationDate: "2024-01-01",
    effectiveDate: "2024-01-01",
    sourceUrl: `https://${regulatorAcronym.toLowerCase()}.gov.ng`,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const isWave1 = args.includes("--wave=1") || args.length === 0;
  const isWave2 = args.includes("--wave=2") || args.includes("--all");

  console.log(`\n===============================================================`);
  console.log(`COGENT MARKETING SHIELD - STATUTORY VAULT INGESTION PIPELINE`);
  console.log(`Mode: ${isWave1 ? "Wave 1 (Top Core Documents)" : "Wave 2 (Full Batched Ingestion)"}`);
  console.log(`===============================================================\n`);

  const basePath = path.join(process.cwd(), "data", "statutory-vault");
  if (!existsSync(basePath)) {
    console.error(`Error: Path ${basePath} does not exist.`);
    process.exit(1);
  }

  const results: IngestedDocumentResult[] = [];
  const startTime = Date.now();

  if (isWave1) {
    console.log(`[Wave 1] Ingesting ${CORE_WAVE_1_DOCS.length} Top Core Regulatory Documents...\n`);

    for (let i = 0; i < CORE_WAVE_1_DOCS.length; i++) {
      const spec = CORE_WAVE_1_DOCS[i]!;
      const fullPath = path.join(basePath, spec.relPath);

      if (!existsSync(fullPath)) {
        console.warn(`[WARN] File not found: ${fullPath}`);
        continue;
      }

      console.log(`[${i + 1}/${CORE_WAVE_1_DOCS.length}] Processing: ${spec.meta.regulatorAcronym} - ${spec.meta.instrumentTitle}`);
      try {
        const res = await statutoryVaultIngestionService.ingestPdf(fullPath, spec.meta);
        results.push(res);
        console.log(`  ✓ Result: ${res.clauseCount} verbatim clauses | SHA-256: ${res.fileSha256.slice(0, 16)}...`);
      } catch (err) {
        console.error(`  ✗ Error ingesting ${spec.relPath}:`, (err as Error).message);
      }
    }
  }

  if (isWave2) {
    const allFiles = getAllPdfFiles(basePath);
    console.log(`[Wave 2] Discovered ${allFiles.length} Total PDFs. Starting batched processing...\n`);

    for (let i = 0; i < allFiles.length; i++) {
      const filePath = allFiles[i]!;
      const meta = inferMetadataFromPath(filePath);

      // Skip non-statutory brochures or pure press notices if detected
      if (/annual[-_ ]report|brochure|magazine|speech/i.test(filePath)) {
        console.log(`[${i + 1}/${allFiles.length}] Skipping non-statutory file: ${path.basename(filePath)}`);
        continue;
      }

      console.log(`[${i + 1}/${allFiles.length}] Processing: ${meta.regulatorAcronym} - ${path.basename(filePath)}`);
      try {
        const res = await statutoryVaultIngestionService.ingestPdf(filePath, meta);
        results.push(res);
        console.log(`  ✓ Result: ${res.clauseCount} clauses | ${res.skippedDeduplication ? "(deduped)" : "newly indexed"}`);
      } catch (err) {
        console.error(`  ✗ Error:`, (err as Error).message);
      }
    }
  }

  const durationSec = Math.round((Date.now() - startTime) / 1000);
  const totalClauses = results.reduce((acc, r) => acc + r.clauseCount, 0);

  console.log(`\n===============================================================`);
  console.log(`INGESTION COMPLETE`);
  console.log(`Total Documents Ingested/Verified: ${results.length}`);
  console.log(`Total Verbatim Clauses: ${totalClauses}`);
  console.log(`Elapsed Time: ${durationSec}s`);
  console.log(`===============================================================\n`);
}

main().catch((err) => {
  console.error("Fatal ingestion error:", err);
  process.exit(1);
});
