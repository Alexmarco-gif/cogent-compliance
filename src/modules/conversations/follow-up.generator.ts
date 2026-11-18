/**
 * Cogent Compliance Platform
 * Contextual Follow-Up Actions & Next Questions Generator
 * Produces Perplexity-style deeper deliverable prompts (workflow) and focused drill-down questions (question)
 * strictly grounded in the turn's regulators, jurisdictions, products, and findings.
 */

import { Type } from "@google/genai";
import type {
  CitationItem,
  FollowUpSuggestion,
  StructuredComplianceReport,
} from "@/contracts/conversation.contracts";
import { WORKFLOW_TYPES, type WorkflowType } from "@/contracts/work-product.contracts";
import { AI_MODELS } from "@/lib/ai/config";
import { geminiKeyPool } from "@/lib/ai/gemini-key-pool";
import { sanitizeAssistantOutput } from "@/lib/ai/output-sanitizer";
import { logger } from "@/lib/logger";

const PURE_GREETING_RE =
  /^(?:hi|hello|hey|good\s+(?:morning|afternoon|evening)|howdy|greetings|yo|sup|thanks|thank\s+you)[!.,?\s]*$/i;

const VALID_WORKFLOW_SET = new Set<string>(WORKFLOW_TYPES);

export interface FollowUpGeneratorInput {
  userPrompt: string;
  responseText: string;
  jurisdictions?: string[];
  citations?: CitationItem[];
  productName?: string | null;
  structuredReport?: StructuredComplianceReport;
  workProductWorkflowType?: string | null;
  hasCustomAiClient?: boolean;
}

function cleanSuggestionText(raw: string, maxLen = 128): string {
  const clean = sanitizeAssistantOutput(raw)
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]+/gu, "")
    .replace(/^[-*•↗↳\d.)\s]+/, "")
    .replace(/\s+/g, " ")
    .trim();
  if (clean.length <= maxLen) return clean;
  const sliced = clean.slice(0, maxLen - 3);
  const lastSpace = sliced.lastIndexOf(" ");
  return `${(lastSpace >= 30 ? sliced.slice(0, lastSpace) : sliced).replace(/[\s\-:—,.;]+$/, "")}...`;
}

function defaultBadgeForWorkflow(wf?: WorkflowType): string {
  switch (wf) {
    case "CAMPAIGN_COMPLIANCE_KIT":
      return "Audit Kit";
    case "POLICY_GAP_REDLINE":
      return "Policy Redline";
    case "SUPERVISORY_DDQ_RESPONSE":
      return "DDQ Draft";
    case "CROSS_BORDER_COMPARISON":
      return "Matrix";
    case "PRODUCT_STRUCTURING_MEMO":
    default:
      return "Work Product";
  }
}

function normalizeFollowUps(rawItems: unknown[]): FollowUpSuggestion[] {
  const seen = new Set<string>();
  const workflows: FollowUpSuggestion[] = [];
  const questions: FollowUpSuggestion[] = [];

  for (const raw of rawItems) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    const kind = item.kind === "workflow" ? "workflow" : "question";
    const rawLabel = typeof item.label === "string" ? item.label : "";
    const rawPrompt = typeof item.prompt === "string" ? item.prompt : rawLabel;

    const label = cleanSuggestionText(rawLabel, 128);
    const prompt = cleanSuggestionText(rawPrompt, 240);
    if (label.length < 12 || prompt.length < 12) continue;

    const dedupeKey = label.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (!dedupeKey || seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const candidateWf =
      typeof item.workflow_hint === "string" && VALID_WORKFLOW_SET.has(item.workflow_hint)
        ? (item.workflow_hint as WorkflowType)
        : undefined;

    const entry: FollowUpSuggestion = {
      id: `fu_${kind}_${workflows.length + questions.length + 1}`,
      kind,
      label,
      prompt,
      ...(kind === "workflow" && candidateWf ? { workflow_hint: candidateWf } : {}),
      ...(kind === "workflow"
        ? {
            badge_label:
              typeof item.badge_label === "string" && item.badge_label.trim().length > 0
                ? cleanSuggestionText(item.badge_label, 24)
                : defaultBadgeForWorkflow(candidateWf),
          }
        : {}),
    };

    if (kind === "workflow" && workflows.length < 2) {
      workflows.push(entry);
    } else if (kind === "question" && questions.length < 3) {
      questions.push(entry);
    }
  }

  return [...workflows, ...questions].slice(0, 5);
}

/**
 * Deterministic fallback that derives grounded workflow + question follow-ups
 * directly from detected jurisdictions, regulators, rate cards, and audit findings.
 */
export function buildFallbackFollowUps(input: FollowUpGeneratorInput): FollowUpSuggestion[] {
  const promptTrimmed = input.userPrompt.trim();
  if (!promptTrimmed || PURE_GREETING_RE.test(promptTrimmed) || input.responseText.trim().length < 140) {
    return [];
  }

  const combinedText = `${input.userPrompt}\n${input.responseText.slice(0, 2400)}`;
  const jurisdictions = Array.from(
    new Set(
      [
        ...(input.jurisdictions || []),
        ...( /\bkenya\b|\bcbk\b|\bodpc\b/i.test(combinedText) ? ["KE"] : []),
        ...( /\bghana\b|\bbank of ghana\b|\bbog\b/i.test(combinedText) ? ["GH"] : []),
        ...( /\bsouth africa\b|\bsarb\b|\bfsca\b|\bpopia\b/i.test(combinedText) ? ["ZA"] : []),
        ...( /\brwanda\b|\bbnr\b/i.test(combinedText) ? ["RW"] : []),
        ...( /\begypt\b|\bcbe\b/i.test(combinedText) ? ["EG"] : []),
      ].filter(Boolean)
    )
  );
  const regulators = Array.from(
    new Set(
      (input.citations || [])
        .map((c) => c.regulator?.toUpperCase())
        .filter((r): r is string => Boolean(r))
    )
  );
  const prodLabel = input.productName?.trim() || input.structuredReport?.campaign_context?.product_name;
  const activeWf = input.workProductWorkflowType;

  const candidates: Array<{
    kind: "workflow" | "question";
    label: string;
    prompt: string;
    workflow_hint?: WorkflowType;
    badge_label?: string;
  }> = [];

  if (input.structuredReport) {
    const verdict = input.structuredReport.pre_flight_gate.verdict;
    const firstFinding = input.structuredReport.blind_spot_findings[0];
    if (verdict !== "PASS") {
      candidates.push({
        kind: "workflow",
        label: `Generate an ARCON ASP pre-vetting memo and redlined policy checklist${prodLabel ? ` for ${prodLabel}` : ""}`,
        prompt: `Draft an ARCON ASP pre-vetting substantiation memo and redlined disclosure checklist${prodLabel ? ` for ${prodLabel}` : ""} addressing every hold condition above.`,
        workflow_hint: "POLICY_GAP_REDLINE",
        badge_label: "Work Product",
      });
    }
    if (firstFinding) {
      candidates.push({
        kind: "question",
        label: `Rewrite the flagged copy across SMS, WhatsApp, and Instagram to clear ${firstFinding.violated_statute}`,
        prompt: `Provide ready-to-publish compliant copy variants for SMS (160 chars), WhatsApp, and Instagram that resolve ${firstFinding.violated_statute}.`,
      });
    }
    candidates.push({
      kind: "question",
      label: `Break down the exact mandatory CBN Key Facts Statement figures${prodLabel ? ` for ${prodLabel}` : ""}`,
      prompt: `Show the full CBN Key Facts Statement fee, net disbursement, and effective APR breakdown${prodLabel ? ` for ${prodLabel}` : ""} so finance and legal can sign off.`,
    });
    candidates.push({
      kind: "question",
      label: "List the internal evidence and approval sign-offs needed before launch",
      prompt: "List the exact internal documents, CCO sign-offs, and live URL monitoring checks we should complete before launching this campaign.",
    });
  } else if (jurisdictions.length >= 2 || /cross[- ]border|kenya|ghana|south africa|passport/i.test(combinedText)) {
    const marketNames: Record<string, string> = {
      NG: "Nigeria",
      KE: "Kenya",
      GH: "Ghana",
      ZA: "South Africa",
      RW: "Rwanda",
      EG: "Egypt",
    };
    const namedMarkets = jurisdictions
      .map((code) => marketNames[code] || code)
      .slice(0, 4)
      .join(", ");

    if (activeWf !== "PRODUCT_STRUCTURING_MEMO") {
      candidates.push({
        kind: "workflow",
        label: `Draft a Board Expansion & Licensing Memo${namedMarkets ? ` covering ${namedMarkets}` : ""} — governance, capital, and rollout sequence`,
        prompt: `Draft a board-ready regulatory structuring and licensing memo${namedMarkets ? ` covering ${namedMarkets}` : ""} detailing licensing pathways, minimum capital, local governance, and launch sequence.`,
        workflow_hint: "PRODUCT_STRUCTURING_MEMO",
        badge_label: "Work Product",
      });
    }
    if (activeWf !== "CROSS_BORDER_COMPARISON") {
      candidates.push({
        kind: "workflow",
        label: `Build a side-by-side Cross-Border Regulatory Matrix${namedMarkets ? ` (${namedMarkets})` : ""}`,
        prompt: `Build a side-by-side cross-border regulatory comparison matrix${namedMarkets ? ` for ${namedMarkets}` : ""} covering payment licensing, data localisation, and consumer protection rules.`,
        workflow_hint: "CROSS_BORDER_COMPARISON",
        badge_label: "Matrix",
      });
    }
    candidates.push(
      {
        kind: "question",
        label: "Detail local capital, shareholding, and resident director requirements by country",
        prompt: `Detail the minimum paid-up capital, local equity, and resident director requirements across ${namedMarkets || "these jurisdictions"}.`,
      },
      {
        kind: "question",
        label: "Compare data localisation and cross-border data transfer rules across these regulators",
        prompt: `Compare data residency, localisation, and cross-border data transfer approval rules across ${namedMarkets || "these jurisdictions"}.`,
      },
      {
        kind: "question",
        label: "Outline practical banking and PSP partnership structures where direct licensing takes longer",
        prompt: `Outline compliant local bank and PSP partnership structures we can use while direct licensing is underway in ${namedMarkets || "these markets"}.`,
      }
    );
  } else {
    const focusReg = regulators[0] || (/ndpa|ndpc|data|privacy/i.test(combinedText) ? "NDPC" : /arcon|advert/i.test(combinedText) ? "ARCON" : "CBN");
    if (activeWf !== "POLICY_GAP_REDLINE") {
      candidates.push({
        kind: "workflow",
        label: `Draft a Policy Redline & Compliance Checklist under ${focusReg} rules`,
        prompt: `Draft a practical internal policy gap redline and compliance control checklist aligned with ${focusReg} requirements discussed above.`,
        workflow_hint: "POLICY_GAP_REDLINE",
        badge_label: "Work Product",
      });
    }
    if (activeWf !== "CAMPAIGN_COMPLIANCE_KIT") {
      candidates.push({
        kind: "workflow",
        label: `Audit a sample marketing copy or product disclosure against ${focusReg} & FCCPC rules`,
        prompt: `Run a pre-flight marketing and disclosure audit template against ${focusReg}, FCCPC, and ARCON requirements for our product.`,
        workflow_hint: "CAMPAIGN_COMPLIANCE_KIT",
        badge_label: "Audit Kit",
      });
    }
    candidates.push(
      {
        kind: "question",
        label: `Show the exact statutory penalties and enforcement triggers under ${focusReg} rules`,
        prompt: `Summarize the specific statutory sanctions, fines, and enforcement triggers if an institution misses these ${focusReg} obligations.`,
      },
      {
        kind: "question",
        label: "List the internal evidence and audit trail records examiners ask for first",
        prompt: "What internal records, board approvals, and customer disclosure logs do regulators typically request during an inspection on this topic?",
      },
      {
        kind: "question",
        label: "Turn these requirements into a short operational checklist for product and marketing teams",
        prompt: "Convert these statutory requirements into a crisp pre-launch sign-off checklist for product, legal, and marketing.",
      }
    );
  }

  return normalizeFollowUps(candidates);
}

/**
 * Generates 3–5 concise, contextual Perplexity-style follow-up actions and questions.
 * Uses Gemini Flash-Lite with a strict timeout when configured, falling back deterministically.
 */
export async function generateContextualFollowUps(
  input: FollowUpGeneratorInput
): Promise<FollowUpSuggestion[]> {
  const promptTrimmed = input.userPrompt.trim();
  if (!promptTrimmed || PURE_GREETING_RE.test(promptTrimmed) || input.responseText.trim().length < 140) {
    return [];
  }

  // Skip network call in unit tests / custom mock clients or when no real Gemini key is present
  if (input.hasCustomAiClient || !geminiKeyPool.hasActiveRealKey()) {
    return buildFallbackFollowUps(input);
  }

  const regulators = Array.from(
    new Set(
      (input.citations || [])
        .map((c) => c.regulator)
        .filter((r): r is string => Boolean(r))
    )
  ).slice(0, 6);

  const systemPrompt = [
    "You generate 4 to 5 ultra-crisp, high-value follow-up prompts shown under an African financial compliance advisor reply.",
    "Include:",
    "- 1 or 2 items with kind='workflow' (substantive deliverables/work-products such as a Board Memo, Policy Redline, Cross-Border Matrix, Supervisory DDQ Response, or Campaign Compliance Kit). Omit any workflow_hint matching the deliverable already created in this turn.",
    "- 2 or 3 items with kind='question' (specific, practical next questions digging into capital rules, timelines, disclosures, partnerships, or penalties mentioned in the reply).",
    "Rules:",
    "- Ground every suggestion in the exact countries, regulators, products, or gaps from the turn.",
    "- Plain business/compliance English only. NO AI jargon, NO emojis, NO § or §§ glyphs (write Section/Sections).",
    "- Keep each label concise and under 115 characters.",
  ].join("\n");

  const userPayload = [
    `USER QUESTION: ${promptTrimmed.slice(0, 500)}`,
    input.jurisdictions?.length ? `JURISDICTIONS: ${input.jurisdictions.join(", ")}` : "",
    regulators.length ? `CITED REGULATORS: ${regulators.join(", ")}` : "",
    input.productName ? `PRODUCT: ${input.productName}` : "",
    input.workProductWorkflowType ? `WORKFLOW ALREADY CREATED THIS TURN: ${input.workProductWorkflowType}` : "",
    `ASSISTANT ANSWER EXCERPT:\n${input.responseText.slice(0, 2200)}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const { result } = await geminiKeyPool.execute({
      primaryModel: AI_MODELS.FLASH_LITE,
      operationName: "follow_up_suggestions",
      run: async (client, model) => {
        const res = await client.models.generateContent({
          model,
          contents: [{ role: "user", parts: [{ text: userPayload }] }],
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.25,
            maxOutputTokens: 512,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  kind: { type: Type.STRING, enum: ["workflow", "question"] },
                  label: { type: Type.STRING },
                  prompt: { type: Type.STRING },
                  workflow_hint: {
                    type: Type.STRING,
                    enum: [...WORKFLOW_TYPES],
                    nullable: true,
                  },
                  badge_label: { type: Type.STRING, nullable: true },
                },
                required: ["kind", "label", "prompt"],
              },
            },
            abortSignal: AbortSignal.timeout(3200),
          },
        });
        return res.text || "";
      },
    });

    const parsed = JSON.parse(result);
    if (Array.isArray(parsed)) {
      const normalized = normalizeFollowUps(parsed);
      if (normalized.length > 0) {
        return normalized;
      }
    }
  } catch (err) {
    logger.warn("Contextual follow-up LLM generation fell back deterministically", {
      error: (err as Error).message,
    });
  }

  return buildFallbackFollowUps(input);
}
