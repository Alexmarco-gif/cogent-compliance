/**
 * Cogent Compliance Operations - Multi-Format DDQ Parser & Domain/Department Classifier
 * Supports real 150–500+ question DDQs in .xlsx, .docx, .pdf, .csv, and plain text.
 * Preserves exact Excel coordinates (sheet, row, question col, answer col, evidence col)
 * so completed answers export cleanly back into the sponsor bank's original workbook.
 */

import ExcelJS from "exceljs";
import mammoth from "mammoth";
import { extractText as extractPdfText } from "unpdf";
import type { ComplianceDepartment, DdqDomain } from "@/contracts/ddq.contracts";

export interface ParsedDdqQuestion {
  question_index: number;
  question_code: string;
  section_name: string | null;
  question_text: string;
  domain: DdqDomain;
  assigned_department: ComplianceDepartment;
  source_sheet_name: string | null;
  source_row_number: number | null;
  source_question_col: number | null;
  source_answer_col: number | null;
  source_evidence_col: number | null;
  existing_answer?: string | null;
}

export interface ParsedDdqResult {
  source_format: "XLSX" | "DOCX" | "PDF" | "CSV" | "TEXT";
  questions: ParsedDdqQuestion[];
  source_structure: {
    sheets?: Array<{
      name: string;
      header_row: number | null;
      code_col: number | null;
      section_col: number | null;
      question_col: number;
      answer_col: number;
      evidence_col: number | null;
      question_count: number;
    }>;
    total_detected: number;
  };
}

export const MAX_DDQ_QUESTIONS = 500;

/**
 * Deterministic domain classification + default departmental owner mapping
 * aligned with fintech compliance operations (Section 5 responsibility matrix).
 */
const DOMAIN_ROUTING_RULES: Array<{
  domain: DdqDomain;
  department: ComplianceDepartment;
  patterns: RegExp[];
}> = [
  {
    domain: "SANCTIONS",
    department: "COMPLIANCE",
    patterns: [
      /\b(sanction|ofac|pep|politically exposed|watchlist|nigeria sanctions|unsc|screening list|adverse media)\b/i,
    ],
  },
  {
    domain: "AML_CFT",
    department: "COMPLIANCE",
    patterns: [
      /\b(aml|cft|cpf|anti[- ]money laundering|nfiu|goaml|mlppa|str\b|ctr\b|suspicious transaction|currency transaction|transaction monitoring|mlro|structuring|terrorist financing)\b/i,
    ],
  },
  {
    domain: "KYC_CDD",
    department: "COMPLIANCE",
    patterns: [
      /\b(kyc|kyb|cdd|edd|customer due diligence|onboarding|bvn|nin\b|tier[- ]?[123]|nibss|nimc|identity verification|beneficial owner|ubo|customer risk classification|customer risk assessment)\b/i,
    ],
  },
  {
    domain: "CYBERSECURITY",
    department: "INFOSEC",
    patterns: [
      /\b(cyber|vapt|penetration test|vulnerability|iso\s*27001|pci[- ]?dss|soc\s*2|ciso|encryption|firewall|siem|access control|mfa|security incident|infosec|information security|zero trust)\b/i,
    ],
  },
  {
    domain: "DATA_PROTECTION",
    department: "LEGAL",
    patterns: [
      /\b(ndpa|ndpr|ndpc|gaid|data protection|dpo\b|privacy|car filing|compliance audit return|personal data|cross[- ]border transfer|data locali[sz]ation|gdpr|data retention|consent)\b/i,
    ],
  },
  {
    domain: "LICENSING_REGULATORY",
    department: "COMPLIANCE",
    patterns: [
      /\b(licence|license|pssp|ptsp|mmo\b|mfb\b|psb\b|cbn|sec\b|fccpc|ndic|bofia|regulatory sanction|regulatory examination|supervisory|authorisation|authorization|approvals?|regulatory return)\b/i,
    ],
  },
  {
    domain: "OPERATIONS_SETTLEMENT",
    department: "OPERATIONS",
    patterns: [
      /\b(settlement|reconcil|nominee account|virtual account|nuban|nip\b|chargeback|dispute|dispense error|reversal|refund|payout|clearing|float|escrow|segregat|trust account)\b/i,
    ],
  },
  {
    domain: "FRAUD_MANAGEMENT",
    department: "RISK",
    patterns: [
      /\b(fraud|unauthori[sz]ed debit|account takeover|phishing|velocity limit|chargeback ratio|app fraud|scam|identity theft)\b/i,
    ],
  },
  {
    domain: "THIRD_PARTY_MERCHANTS",
    department: "COMPLIANCE",
    patterns: [
      /\b(sub[- ]?merchant|merchant onboarding|high[- ]risk merchant|agent banking|agent onboarding|third[- ]party|vendor|vasp|crypto|digital lender|aggregator|partner oversight)\b/i,
    ],
  },
  {
    domain: "BUSINESS_CONTINUITY",
    department: "TECHNOLOGY",
    patterns: [
      /\b(business continuity|bcp\b|disaster recovery|drp\b|rto\b|rpo\b|failover|backup|resilience|uptime|sla\b|availability|incident recovery)\b/i,
    ],
  },
  {
    domain: "TECHNOLOGY_INFRASTRUCTURE",
    department: "TECHNOLOGY",
    patterns: [
      /\b(infrastructure|cloud|aws|azure|gcp|architecture|api\b|database|hosting|server|microservices|ci\/cd|change management|devops|system availability)\b/i,
    ],
  },
  {
    domain: "FINANCIAL",
    department: "FINANCE",
    patterns: [
      /\b(audited financial|balance sheet|capital adequacy|shareholders?['’]?\s*fund|paid[- ]up capital|liquidity|solvency|tax clearance|revenue|treasury|cfo|financial stability|statutory reserve)\b/i,
    ],
  },
  {
    domain: "HR_TRAINING",
    department: "HR",
    patterns: [
      /\b(training|background check|employee screening|staff vetting|conduct|whistleblow|code of ethics|hr\b|human resources|fit and proper)\b/i,
    ],
  },
  {
    domain: "RISK_MANAGEMENT",
    department: "RISK",
    patterns: [
      /\b(enterprise risk|erm\b|risk appetite|risk assessment|risk register|operational risk|credit risk|three lines of defence|risk committee|kri\b)\b/i,
    ],
  },
  {
    domain: "GOVERNANCE",
    department: "EXECUTIVE",
    patterns: [
      /\b(board of directors|board committee|corporate governance|ownership structure|shareholding|organogram|org chart|independent audit|internal audit|unresolved audit finding|cco\b|chief compliance officer)\b/i,
    ],
  },
  {
    domain: "LEGAL",
    department: "LEGAL",
    patterns: [
      /\b(litigation|legal dispute|contract|indemnity|cac\b|incorporation|memorandum|articles of association|intellectual property|terms and conditions|lawsuit)\b/i,
    ],
  },
];

export function classifyDdqQuestion(
  questionText: string,
  sectionName?: string | null
): { domain: DdqDomain; assigned_department: ComplianceDepartment } {
  const combined = `${sectionName || ""} ${questionText}`.trim();

  // Internal audit explicit override
  if (/\b(internal audit|independent compliance audit|control testing|audit charter)\b/i.test(combined)) {
    return { domain: "GOVERNANCE", assigned_department: "INTERNAL_AUDIT" };
  }

  // HR & Staff Training explicit override (even when question mentions "AML staff training")
  if (/\b(employee background|background check|staff training|employee screening|staff vetting|whistleblow|code of ethics|human resources)\b/i.test(combined)) {
    return { domain: "HR_TRAINING", assigned_department: "HR" };
  }

  for (const rule of DOMAIN_ROUTING_RULES) {
    if (rule.patterns.some((p) => p.test(combined))) {
      return { domain: rule.domain, assigned_department: rule.department };
    }
  }

  return { domain: "OTHER", assigned_department: "COMPLIANCE" };
}

export function getDefaultDepartmentForDomain(domain: DdqDomain): ComplianceDepartment {
  const found = DOMAIN_ROUTING_RULES.find((r) => r.domain === domain);
  return found ? found.department : "COMPLIANCE";
}

function cellToString(val: unknown): string {
  if (val == null) return "";
  if (typeof val === "string") return val.trim();
  if (typeof val === "number" || typeof val === "boolean") return String(val).trim();
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  if (typeof val === "object") {
    const obj = val as Record<string, unknown>;
    if ("richText" in obj && Array.isArray(obj.richText)) {
      return (obj.richText as Array<{ text?: string }>).map((t) => t.text || "").join("").trim();
    }
    if ("text" in obj && typeof obj.text === "string") return obj.text.trim();
    if ("result" in obj && obj.result != null) return String(obj.result).trim();
  }
  return String(val).trim();
}

function isLikelyQuestionText(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 12) return false;
  if (/^(question|questions|item|description|requirement|response|answer|comments|evidence|status|ref|no\.?|#)$/i.test(trimmed)) {
    return false;
  }
  // Ends with ? or starts with interrogative/directive verb or contains compliance prompt structure
  if (trimmed.endsWith("?")) return true;
  if (
    /^(do you|does the|are you|is there|have you|has the|how do|how does|what |who |when |where |please |confirm |provide |describe |detail |explain |state |list |attach |outline |specify |indicate )/i.test(
      trimmed
    )
  ) {
    return true;
  }
  // Longer substantive requirement statements in spreadsheets (>= 24 chars with spaces)
  return trimmed.length >= 24 && /\s/.test(trimmed);
}

/**
 * Parses an Excel (.xlsx) DDQ workbook across ALL sheets while preserving exact coordinates
 * so responses can be written back into the bank's original template.
 */
export async function parseXlsxDdq(buffer: Buffer): Promise<ParsedDdqResult> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);

  const questions: ParsedDdqQuestion[] = [];
  const sheetMeta: NonNullable<ParsedDdqResult["source_structure"]["sheets"]> = [];
  let globalIndex = 0;

  workbook.eachSheet((sheet) => {
    if (globalIndex >= MAX_DDQ_QUESTIONS) return;

    // Detect header row in first 12 rows
    let headerRow: number | null = null;
    let codeCol: number | null = null;
    let sectionCol: number | null = null;
    let questionCol: number | null = null;
    let answerCol: number | null = null;
    let evidenceCol: number | null = null;

    const maxScanRow = Math.min(sheet.rowCount || 0, 15);
    for (let r = 1; r <= maxScanRow; r++) {
      const row = sheet.getRow(r);
      let rowHasQuestionHeader = false;
      const maxCols = Math.min(row.cellCount || 20, 20);
      for (let c = 1; c <= maxCols; c++) {
        const text = cellToString(row.getCell(c).value).toLowerCase();
        if (!text) continue;

        if (/^(#|no\.?|id|ref|code|q\s*no|item\s*no|s\/n)$/i.test(text)) {
          codeCol = codeCol ?? c;
        } else if (/\b(section|category|domain|area|topic|module)\b/i.test(text) && text.length < 35) {
          sectionCol = sectionCol ?? c;
        } else if (/\b(question|questionnaire|requirement|control|inquiry|item|prompt|due diligence)\b/i.test(text) && text.length < 60) {
          questionCol = c;
          rowHasQuestionHeader = true;
        } else if (/\b(response|answer|reply|vendor response|fintech response|institution response|details)\b/i.test(text) && text.length < 50) {
          answerCol = answerCol ?? c;
        } else if (/\b(evidence|annexure|attachment|document|supporting|reference|artifact)\b/i.test(text) && text.length < 50) {
          evidenceCol = evidenceCol ?? c;
        }
      }

      if (rowHasQuestionHeader && questionCol != null) {
        headerRow = r;
        break;
      }
    }

    // Heuristic fallback if sheet has no explicit header row: pick the column with the longest average text
    if (questionCol == null) {
      const colLengths = new Map<number, number>();
      const sampleRows = Math.min(sheet.rowCount || 0, 40);
      for (let r = 1; r <= sampleRows; r++) {
        const row = sheet.getRow(r);
        for (let c = 1; c <= Math.min(row.cellCount || 10, 10); c++) {
          const val = cellToString(row.getCell(c).value);
          if (val.length >= 15) {
            colLengths.set(c, (colLengths.get(c) || 0) + val.length);
          }
        }
      }
      let bestCol = 1;
      let bestLen = 0;
      for (const [col, len] of colLengths.entries()) {
        if (len > bestLen) {
          bestLen = len;
          bestCol = col;
        }
      }
      if (bestLen === 0) return; // Empty or metadata-only sheet
      questionCol = bestCol;
      if (bestCol > 1) codeCol = bestCol - 1;
    }

    const resolvedAnswerCol = answerCol ?? questionCol + 1;
    const resolvedEvidenceCol = evidenceCol ?? resolvedAnswerCol + 1;

    let currentSection: string | null = sheet.name;
    let sheetQuestionCount = 0;
    const startRow = headerRow ? headerRow + 1 : 1;

    for (let r = startRow; r <= (sheet.rowCount || 0); r++) {
      if (globalIndex >= MAX_DDQ_QUESTIONS) break;

      const row = sheet.getRow(r);
      const qText = cellToString(row.getCell(questionCol).value);
      const codeVal = codeCol ? cellToString(row.getCell(codeCol).value) : "";
      const secVal = sectionCol ? cellToString(row.getCell(sectionCol).value) : "";
      const existingAns = cellToString(row.getCell(resolvedAnswerCol).value);

      if (secVal) {
        currentSection = secVal;
      }

      if (!qText) {
        // Check if column 1 holds a section banner row (e.g., "SECTION 2: AML/CFT CONTROLS")
        const col1 = cellToString(row.getCell(1).value);
        if (col1 && col1.length >= 4 && col1.length <= 90 && !col1.endsWith("?")) {
          currentSection = col1;
        }
        continue;
      }

      // Detect inline section headers (short title in question col with no code and not a question)
      if (!codeVal && !qText.endsWith("?") && qText.length < 65 && /^(section|part|\d+\.\s+[A-Z])/i.test(qText) && !isLikelyQuestionText(qText)) {
        currentSection = qText;
        continue;
      }

      if (!isLikelyQuestionText(qText)) continue;

      globalIndex += 1;
      sheetQuestionCount += 1;
      const classification = classifyDdqQuestion(qText, currentSection);

      questions.push({
        question_index: globalIndex,
        question_code: codeVal || `Q${globalIndex}`,
        section_name: currentSection,
        question_text: qText,
        domain: classification.domain,
        assigned_department: classification.assigned_department,
        source_sheet_name: sheet.name,
        source_row_number: r,
        source_question_col: questionCol,
        source_answer_col: resolvedAnswerCol,
        source_evidence_col: resolvedEvidenceCol,
        existing_answer: existingAns || null,
      });
    }

    if (sheetQuestionCount > 0) {
      sheetMeta.push({
        name: sheet.name,
        header_row: headerRow,
        code_col: codeCol,
        section_col: sectionCol,
        question_col: questionCol,
        answer_col: resolvedAnswerCol,
        evidence_col: resolvedEvidenceCol,
        question_count: sheetQuestionCount,
      });
    }
  });

  return {
    source_format: "XLSX",
    questions,
    source_structure: {
      sheets: sheetMeta,
      total_detected: questions.length,
    },
  };
}

/**
 * Parses CSV text cleanly (handling quoted commas).
 */
function parseCsvRow(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur.trim());
  return out;
}

export function parseCsvDdq(csvText: string): ParsedDdqResult {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) {
    return { source_format: "CSV", questions: [], source_structure: { total_detected: 0 } };
  }

  const header = parseCsvRow(lines[0]!).map((h) => h.toLowerCase());
  let qCol = header.findIndex((h) => /question|requirement|inquiry|control|item/.test(h));
  let codeCol = header.findIndex((h) => /^(#|no|id|ref|code|q)/.test(h));
  const secCol = header.findIndex((h) => /section|category|domain|area/.test(h));
  const ansCol = header.findIndex((h) => /response|answer|reply/.test(h));

  const hasHeader = qCol >= 0;
  if (qCol < 0) {
    qCol = header.length > 1 ? 1 : 0;
    codeCol = header.length > 1 ? 0 : -1;
  }

  const questions: ParsedDdqQuestion[] = [];
  let currentSection: string | null = null;
  let idx = 0;

  for (let r = hasHeader ? 1 : 0; r < lines.length && idx < MAX_DDQ_QUESTIONS; r++) {
    const cols = parseCsvRow(lines[r]!);
    const qText = (cols[qCol] || "").trim();
    if (!isLikelyQuestionText(qText)) continue;

    const sec = secCol >= 0 ? (cols[secCol] || "").trim() : "";
    if (sec) currentSection = sec;
    const code = codeCol >= 0 ? (cols[codeCol] || "").trim() : "";
    const existing = ansCol >= 0 ? (cols[ansCol] || "").trim() : "";

    idx += 1;
    const cls = classifyDdqQuestion(qText, currentSection);
    questions.push({
      question_index: idx,
      question_code: code || `Q${idx}`,
      section_name: currentSection,
      question_text: qText,
      domain: cls.domain,
      assigned_department: cls.assigned_department,
      source_sheet_name: null,
      source_row_number: r + 1,
      source_question_col: qCol + 1,
      source_answer_col: ansCol >= 0 ? ansCol + 1 : qCol + 2,
      source_evidence_col: null,
      existing_answer: existing || null,
    });
  }

  return {
    source_format: "CSV",
    questions,
    source_structure: { total_detected: questions.length },
  };
}

/**
 * Parses unstructured or semi-structured text (from pasted DDQs, PDFs, or DOCX)
 * supporting up to 500 numbered, Q-coded, bulleted, or interrogative questions with section headers.
 */
export function parseTextDdq(
  rawText: string,
  sourceFormat: "DOCX" | "PDF" | "TEXT" = "TEXT"
): ParsedDdqResult {
  const lines = rawText.split(/\r?\n/).map((l) => l.trim());
  const questions: ParsedDdqQuestion[] = [];
  let currentSection: string | null = null;
  let idx = 0;

  const sectionHeaderRegex = /^(?:SECTION\s+\d+|PART\s+[A-Z0-9]+|#{1,3}\s+|[A-Z]\.\s+[A-Z][A-Za-z\s&/-]{3,60}$)/;
  const numberedQuestionRegex = /^(?:(?:Q|Question)\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)[.)]|\((\d+)\)|[-*•])\s*(?:\(([^)]{2,45})\)\s*)?[:.-]?\s*(.+)$/i;

  for (const line of lines) {
    if (idx >= MAX_DDQ_QUESTIONS) break;
    if (!line || line.length < 4) continue;

    // Detect section heading
    if (sectionHeaderRegex.test(line) && !line.endsWith("?") && line.length <= 100) {
      currentSection = line.replace(/^#{1,3}\s+/, "").trim();
      continue;
    }

    const match = line.match(numberedQuestionRegex);
    if (match) {
      const codeNum = match[1] || match[2] || match[3];
      const topicHint = match[4]?.trim() || null;
      const qBody = (match[5] || "").trim();

      if (qBody.length >= 10) {
        idx += 1;
        const effectiveSection = topicHint || currentSection;
        const cls = classifyDdqQuestion(qBody, effectiveSection);
        questions.push({
          question_index: idx,
          question_code: codeNum ? `Q${codeNum}` : `Q${idx}`,
          section_name: effectiveSection,
          question_text: qBody,
          domain: cls.domain,
          assigned_department: cls.assigned_department,
          source_sheet_name: null,
          source_row_number: null,
          source_question_col: null,
          source_answer_col: null,
          source_evidence_col: null,
        });
        continue;
      }
    }

    if (line.endsWith("?") && line.length >= 14) {
      idx += 1;
      const cls = classifyDdqQuestion(line, currentSection);
      questions.push({
        question_index: idx,
        question_code: `Q${idx}`,
        section_name: currentSection,
        question_text: line,
        domain: cls.domain,
        assigned_department: cls.assigned_department,
        source_sheet_name: null,
        source_row_number: null,
        source_question_col: null,
        source_answer_col: null,
        source_evidence_col: null,
      });
    }
  }

  return {
    source_format: sourceFormat,
    questions,
    source_structure: { total_detected: questions.length },
  };
}

/**
 * Unified multi-format DDQ file parser (.xlsx, .docx, .pdf, .csv, .txt).
 */
export async function parseDdqFile(
  buffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<ParsedDdqResult> {
  const lowerName = fileName.toLowerCase();
  const lowerMime = mimeType.toLowerCase();

  if (lowerName.endsWith(".xlsx") || lowerMime.includes("spreadsheetml")) {
    return parseXlsxDdq(buffer);
  }

  if (lowerName.endsWith(".csv") || lowerMime === "text/csv") {
    return parseCsvDdq(buffer.toString("utf-8"));
  }

  if (lowerName.endsWith(".docx") || lowerMime.includes("wordprocessingml")) {
    const res = await mammoth.extractRawText({ buffer });
    return parseTextDdq(res.value || "", "DOCX");
  }

  if (lowerName.endsWith(".pdf") || lowerMime === "application/pdf") {
    const res = await extractPdfText(new Uint8Array(buffer));
    const text = Array.isArray(res.text) ? res.text.join("\n") : String(res.text || "");
    return parseTextDdq(text, "PDF");
  }

  return parseTextDdq(buffer.toString("utf-8"), "TEXT");
}

/**
 * Extracts structured DDQ question/answer pairs from a Chat Studio DDQ Work Product markdown document.
 * Supports:
 *   1. Markdown response matrices (`| Q# | Question | Draft Response | ... |`)
 *   2. Sectioned Q&A blocks (`### Q1: ...` / `**Q1.** ...` / `1. **Question:** ...` + answer paragraphs)
 *   3. Plain text questionnaire fallback via `parseTextDdq`
 *   4. Single holistic working-material item fallback so the DDQ register is never empty.
 */
export function parseWorkProductDdqMarkdown(
  markdown: string,
  fallbackTitle: string
): ParsedDdqResult {
  const cleanMd = (markdown || "").trim();
  if (!cleanMd) {
    return {
      source_format: "TEXT",
      questions: [],
      source_structure: { total_detected: 0 },
    };
  }

  const lines = cleanMd.split(/\r?\n/);
  const questions: ParsedDdqQuestion[] = [];
  let currentSection: string | null = null;

  const stripMd = (val: string) =>
    val
      .replace(/\\\[/g, "[")
      .replace(/\\\]/g, "]")
      .replace(/\*\*/g, "")
      .replace(/`/g, "")
      .trim();

  // Pass 1: Extract structured Markdown tables containing Question & Response/Answer columns
  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i]?.trim() || "";
    if (/^#{1,3}\s+/.test(rawLine)) {
      currentSection = stripMd(rawLine.replace(/^#{1,3}\s+/, ""));
      continue;
    }

    if (!rawLine.startsWith("|") || !lines[i + 1]?.trim().startsWith("|")) continue;
    const sepLine = lines[i + 1]?.trim() || "";
    if (!/^\|[\s:|-]+\|$/.test(sepLine)) continue;

    const headers = rawLine
      .split("|")
      .slice(1, -1)
      .map((h) => stripMd(h).toLowerCase());

    const qCol = headers.findIndex((h) => /\b(question|query|prompt|requirement|item)\b/i.test(h));
    const aCol = headers.findIndex((h) =>
      /\b(answer|response|draft|position|statement|disclosure)\b/i.test(h)
    );
    const codeCol = headers.findIndex((h) => /^(#|no\.?|id|code|ref|q#)$/i.test(h));

    if (qCol >= 0 && aCol >= 0 && qCol !== aCol) {
      let rowCursor = i + 2;
      while (rowCursor < lines.length && questions.length < MAX_DDQ_QUESTIONS) {
        const rowLine = lines[rowCursor]?.trim() || "";
        if (!rowLine.startsWith("|")) break;
        const cells = rowLine
          .split("|")
          .slice(1, -1)
          .map((c) => c.trim());
        const qText = stripMd(cells[qCol] || "");
        const aText = (cells[aCol] || "").trim();
        const codeText = codeCol >= 0 ? stripMd(cells[codeCol] || "") : "";

        if (qText.length >= 8) {
          const nextIdx = questions.length + 1;
          const directCls = classifyDdqQuestion(qText, null);
          const cls =
            directCls.domain !== "OTHER" ? directCls : classifyDdqQuestion(qText, currentSection);
          questions.push({
            question_index: nextIdx,
            question_code: codeText ? (codeText.match(/^Q/i) ? codeText : `Q${codeText}`) : `Q${nextIdx}`,
            section_name: currentSection,
            question_text: qText,
            domain: cls.domain,
            assigned_department: cls.assigned_department,
            source_sheet_name: null,
            source_row_number: null,
            source_question_col: null,
            source_answer_col: null,
            source_evidence_col: null,
            existing_answer: aText || null,
          });
        }
        rowCursor += 1;
      }
      i = rowCursor - 1;
    }
  }

  if (questions.length > 0) {
    return {
      source_format: "TEXT",
      questions,
      source_structure: { total_detected: questions.length },
    };
  }

  // Pass 2: Extract structured Q&A heading/numbered blocks (e.g., `### Q1: ...` or `**Q1.** ...`)
  const qaHeadingRegex =
    /^(?:#{2,4}\s*)?(?:\*\*)?(?:Q(?:uestion)?\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)[.)]\s*(?:Question|Query)?)\s*[:.-]?\s*(?:\*\*)?\s*(.+?)(?:\*\*)?$/i;
  const answerPrefixRegex = /^(?:\*\*)?(?:Draft\s+)?(?:Response|Answer|Position|Reply)(?:\*\*)?\s*[:.-]\s*/i;

  let activeSection: string | null = null;
  let currentQ: { code: string; section: string | null; text: string; answerLines: string[] } | null = null;

  const flushCurrentQ = () => {
    if (!currentQ) return;
    const qText = stripMd(currentQ.text);
    if (qText.length >= 8 && questions.length < MAX_DDQ_QUESTIONS) {
      const nextIdx = questions.length + 1;
      const directCls = classifyDdqQuestion(qText, null);
      const cls =
        directCls.domain !== "OTHER" ? directCls : classifyDdqQuestion(qText, currentQ.section);
      const answerBody = currentQ.answerLines.join("\n").trim();
      questions.push({
        question_index: nextIdx,
        question_code: currentQ.code || `Q${nextIdx}`,
        section_name: currentQ.section,
        question_text: qText,
        domain: cls.domain,
        assigned_department: cls.assigned_department,
        source_sheet_name: null,
        source_row_number: null,
        source_question_col: null,
        source_answer_col: null,
        source_evidence_col: null,
        existing_answer: answerBody || null,
      });
    }
    currentQ = null;
  };

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      if (currentQ && currentQ.answerLines.length > 0) {
        currentQ.answerLines.push("");
      }
      continue;
    }

    const qMatch = trimmed.match(qaHeadingRegex);
    const looksLikeQuestionHeading =
      Boolean(qMatch) &&
      (trimmed.includes("?") ||
        /^#{2,4}\s*(?:\*\*)?Q(?:uestion)?\s*\d+/i.test(trimmed) ||
        /^(?:\*\*)?Q(?:uestion)?\s*\d+/i.test(trimmed));

    if (looksLikeQuestionHeading && qMatch) {
      flushCurrentQ();
      const num = qMatch[1] || qMatch[2];
      const qBody = (qMatch[3] || "").trim();
      currentQ = {
        code: num ? `Q${num}` : `Q${questions.length + 1}`,
        section: activeSection,
        text: qBody,
        answerLines: [],
      };
      continue;
    }

    if (/^#{1,3}\s+/.test(trimmed)) {
      const heading = stripMd(trimmed.replace(/^#{1,3}\s+/, ""));
      // Skip meta headings inside an active answer unless it's clearly a new top-level section
      if (/^#{1,2}\s+/.test(trimmed)) {
        flushCurrentQ();
        activeSection = heading;
        continue;
      }
    }

    if (currentQ) {
      const cleanedLine = trimmed.replace(answerPrefixRegex, "");
      currentQ.answerLines.push(cleanedLine);
    }
  }
  flushCurrentQ();

  if (questions.length > 0) {
    return {
      source_format: "TEXT",
      questions,
      source_structure: { total_detected: questions.length },
    };
  }

  // Pass 3: Fallback to standard plain-text DDQ question detector
  const textParsed = parseTextDdq(cleanMd, "TEXT");
  if (textParsed.questions.length > 0) {
    return textParsed;
  }

  // Pass 4: Holistic working-material item so the promoted DDQ register always captures the Studio draft
  const safeTitle = fallbackTitle.trim() || "Supervisory & Partner DDQ Response";
  const cls = classifyDdqQuestion(safeTitle, null);
  return {
    source_format: "TEXT",
    questions: [
      {
        question_index: 1,
        question_code: "Q1",
        section_name: "Promoted Studio Response",
        question_text: `${safeTitle} — Consolidated DDQ Working Response`,
        domain: cls.domain,
        assigned_department: cls.assigned_department,
        source_sheet_name: null,
        source_row_number: null,
        source_question_col: null,
        source_answer_col: null,
        source_evidence_col: null,
        existing_answer: cleanMd,
      },
    ],
    source_structure: { total_detected: 1 },
  };
}
