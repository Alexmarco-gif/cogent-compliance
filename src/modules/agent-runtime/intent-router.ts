/**
 * Cogent Agent Runtime — Turn Intent Router
 *
 * Classifies an incoming user turn into the exact WorkflowPack ID for the active role.
 * Preserves all 7 operational intents for Cogent's flagship Regulatory Compliance Officer
 * while remaining decoupled from streaming/transport orchestration.
 */

import type { ComplianceTurnIntent } from "@/contracts/agent-runtime.contracts";
import type { SearchJurisdiction } from "@/contracts/search.contracts";
import type { WorkflowType } from "@/contracts/work-product.contracts";
import { extractTargetJurisdictionsFromPrompt } from "@/modules/live-web-intelligence/africa-regulators";

export interface IntentClassificationInput {
  userPrompt: string;
  attachmentAssetIds?: string[];
  campaignUrls?: string[];
  referencedKnowledgeDocId?: string | null;
  searchJurisdictions?: SearchJurisdiction[];
  workflowHint?: WorkflowType | null;
}

/**
 * Classifies a user turn into one of Cogent's 7 operational compliance intents:
 * - Deliverable Workflows: PRODUCT_STRUCTURING_MEMO, POLICY_GAP_REDLINE,
 *   SUPERVISORY_DDQ_RESPONSE, CROSS_BORDER_COMPARISON
 * - Marketing Clearance & Q&A: FULL_COMPLIANCE_AUDIT, REGULATORY_LOOKUP,
 *   CONVERSATIONAL_ADVISORY
 */
export function classifyComplianceTurnIntent(
  options: IntentClassificationInput,
  extractedAssetTexts: string[] = []
): ComplianceTurnIntent {
  const prompt = options.userPrompt.trim();

  // 0. Explicit workflow hint from UI starter cards or REST caller
  if (options.workflowHint === "PRODUCT_STRUCTURING_MEMO") {
    return "PRODUCT_STRUCTURING_MEMO";
  }
  if (options.workflowHint === "POLICY_GAP_REDLINE") {
    return "POLICY_GAP_REDLINE";
  }
  if (options.workflowHint === "SUPERVISORY_DDQ_RESPONSE") {
    return "SUPERVISORY_DDQ_RESPONSE";
  }
  if (options.workflowHint === "CROSS_BORDER_COMPARISON") {
    return "CROSS_BORDER_COMPARISON";
  }
  if (options.workflowHint === "CAMPAIGN_COMPLIANCE_KIT") {
    return "FULL_COMPLIANCE_AUDIT";
  }

  // 1. Explicit Policy Redline (referenced knowledge document or policy comparison command)
  if (
    options.referencedKnowledgeDocId ||
    (/\b(?:policy|sop|manual|handbook)\b/i.test(prompt) &&
      /\b(?:redline|compare|update|gap|outdated|align|rewrite\s+(?:our|the)\s+(?:policy|clause|sop))\b/i.test(
        prompt
      ))
  ) {
    return "POLICY_GAP_REDLINE";
  }

  // 2. Supervisory / Sponsor Bank DDQ Response
  const combinedDdqSignalText = [prompt, ...extractedAssetTexts].join(" ");
  if (
    /\b(?:ddq|due\s+diligence\s+questionnaire|regulator\s+(?:inquiry|letter|query)|supervisory\s+(?:inquiry|query|response|examination|letter)|cbn\s+(?:supervisory\s+(?:inquiry|query|letter)|inquiry|query)|audit\s+questionnaire)\b/i.test(
      combinedDdqSignalText
    ) ||
    (/\b(?:sponsor\s+bank|nibss|cbn\s+examination|compliance\s+questionnaire)\b/i.test(
      combinedDdqSignalText
    ) &&
      /\b(?:ddq|questionnaire|inquiry|answer|respond|draft|reply|complete|questions?|part\s+[ab])\b/i.test(
        combinedDdqSignalText
      )) ||
    (/\bfailed\s+nip\b/i.test(combinedDdqSignalText) &&
      /\b(?:48[- ]hour|inquiry|cbn|restitution|unauthori[sz]ed\s+(?:wallet\s+)?debit)\b/i.test(
        combinedDdqSignalText
      ))
  ) {
    return "SUPERVISORY_DDQ_RESPONSE";
  }

  // 3. Explicit Product Structuring Memo request (even if a PRD document or offshore hosting/API region is mentioned)
  const explicitStructuringRequest =
    /\b(?:structuring\s+memo|product\s+structuring|statutory\s+product\s+structuring|compliant\s+restructuring\s+pathway)\b/i.test(
      prompt
    );
  const hasExplicitCrossBorderComparisonCue =
    /\b(?:cross[- ]?border\s+(?:expansion|licensing|comparison|matrix|strategy)|multi[- ]?(?:country|jurisdiction)\s+(?:matrix|comparison|expansion|licensing)|regulatory\s+matrix\s+comparing|side[- ]by[- ]side\s+comparison|compare\s+(?:regulations?|licensing|frameworks?)\s+(?:across|between|in))\b/i.test(
      prompt
    );

  if (
    explicitStructuringRequest &&
    !hasExplicitCrossBorderComparisonCue &&
    !(options.searchJurisdictions && options.searchJurisdictions.some((j) => j !== "NG"))
  ) {
    return "PRODUCT_STRUCTURING_MEMO";
  }

  // 3b. Pan-African & Global Cross-Border Comparison (open-world country detection)
  const detectedJurisdictions = extractTargetJurisdictionsFromPrompt(
    prompt,
    options.searchJurisdictions
  );
  const hasCrossBorderKeywords =
    /\b(?:kenya|ghana|south\s+africa|rwanda|egypt|senegal|ivory\s+coast|cote\s+d['’]?ivoire|tanzania|uganda|ethiopia|morocco|zambia|cameroon|cbk\b|bog\b|sarb\b|fsca\b|bnr\b|cbe\b|bceao\b|pan[- ]?african|cross[- ]?border\s+(?:expansion|licensing|comparison|matrix|strategy|remittance)|multi[- ]?(?:country|jurisdiction)\s+(?:matrix|comparison|expansion|licensing)|regulatory\s+matrix\s+comparing)\b/i.test(
      prompt
    );

  if (
    (options.searchJurisdictions && options.searchJurisdictions.some((j) => j !== "NG")) ||
    detectedJurisdictions.length > 1 ||
    (detectedJurisdictions.some((j) => j !== "NG") && hasCrossBorderKeywords) ||
    hasCrossBorderKeywords
  ) {
    return "CROSS_BORDER_COMPARISON";
  }

  // 4. Only NEW marketing attachments or explicit URLs sent on THIS message force an immediate marketing clearance
  if (
    (options.attachmentAssetIds && options.attachmentAssetIds.length > 0) ||
    (options.campaignUrls && options.campaignUrls.length > 0) ||
    extractedAssetTexts.length > 0
  ) {
    return "FULL_COMPLIANCE_AUDIT";
  }

  // 5. Live URL or attached file name in the message text
  if (/https?:\/\/\S+/i.test(prompt) || /\.(?:jpg|jpeg|png|webp|pdf|docx)\b/i.test(prompt)) {
    return "FULL_COMPLIANCE_AUDIT";
  }

  // 6. Product & Feature Structuring Memo
  if (
    /\b(?:structuring\s+memo|launch\s+(?:a|an|new)|product\s+structuring|expand\s+into)\b/i.test(
      prompt
    ) &&
    /\b(?:virtual\s+card|bnpl|buy\s+now\s+pay\s+later|stablecoin|vasp|wallet|remittance|pssp|mmo|escrow|lending|card|fx|feature|product)\b/i.test(
      prompt
    )
  ) {
    return "PRODUCT_STRUCTURING_MEMO";
  }

  // 7. Explicit clearance / audit request targeting a creative, flyer, banner, or ad copy
  const hasExplicitClearanceCommand =
    /\b(?:audit|review|clear|scan|vet)\b.*\b(?:flyer|banner|copy|ad|promo|campaign|landing\s*page|play\s*store|app\s*store|creative|script|headline|caption|sms|post)\b/i.test(
      prompt
    ) ||
    /\b(?:flyer|banner|ad\s*copy|promo\s*copy|landing\s*page|play\s*store|app\s*store)\b.*\b(?:sound\s+good|compliant|violat|check|look|review|audit|clear)\b/i.test(
      prompt
    ) ||
    /\b(?:does\s+this|check\s+this|audit\s+this|review\s+this|clear\s+this)\s+(?:flyer|banner|ad|copy|promo|headline|caption|sms|post|landing\s*page)\b/i.test(
      prompt
    );

  if (hasExplicitClearanceCommand) {
    return "FULL_COMPLIANCE_AUDIT";
  }

  // 8. Conversational follow-ups, next-step recommendations, greetings, "what if" brainstorming, or "why/how" questions
  const isConversationalFollowUp =
    /\b(?:what\s+(?:next|now|do\s+(?:i|we)\s+do|should\s+(?:i|we)\s+do|do\s+you\s+recommend|would\s+you\s+recommend|is\s+it\s+you\s+recommend|if\s+(?:i|we))|recommend\s+(?:i|we)\s+do|where\s+do\s+(?:i|we)\s+start|next\s+steps?|how\s+do\s+(?:i|we)\s+(?:proceed|start|fix\s+this|fix\s+it|go\s+about)|which\s+one\s+should\s+(?:i|we)|why\s+(?:did|is|was|does)|can\s+you\s+explain|tell\s+me\s+more)\b/i.test(
      prompt
    ) ||
    /^(?:hi|hello|hey|good\s+(?:morning|afternoon|evening)|thanks|thank\s+you|ok|okay|got\s+it|makes\s+sense|awesome|great|nice|perfect|this\s+is\s+good|that\s+is\s+good)\b/i.test(
      prompt
    );

  if (isConversationalFollowUp) {
    return "CONVERSATIONAL_ADVISORY";
  }

  // 9. Pasted promotional ad copy containing call-to-action claims + Naira/percentage figures
  const hasPastedAdCopyWithRates =
    (/(?:₦|NGN\s*)\d/i.test(prompt) || /\d+(?:\.\d+)?\s*%/i.test(prompt)) &&
    /\b(?:get\s+₦|borrow|loan\s+in\s+\d+|apply\s+now|sign\s+up|instant\s+(?:loan|cash|credit)|in\s+\d+\s+minutes|no\s+collateral|zero\s+paperwork|disburse|repay\s+in)\b/i.test(
      prompt
    ) &&
    !/^(?:what|why|how|when|where|who|which|can\s+(?:a|an|i|we|you)|could|should|would|do\s+(?:i|we|you)|is\s+it|explain)\b/i.test(
      prompt
    );

  if (hasPastedAdCopyWithRates) {
    return "FULL_COMPLIANCE_AUDIT";
  }

  // 10. Specific Nigerian regulatory/statutory lookup questions
  const hasRegulatoryLookupSignal =
    /\b(?:cbn|fccpc|arcon|ndpc|sec|nfiu|ndic|fccpa|deon|ndpa|isa|asp\b|kfs\b|apr\b|pre[- ]?vetting|influencer|penalty|penalties|fine|fines|sanction|section\s+\d|clause|circular|regulation|statute|license|tier\s*[12]|mfb|psb|drip\s*pricing|cooling[- ]?off)\b/i.test(
      prompt
    );

  if (hasRegulatoryLookupSignal) {
    return "REGULATORY_LOOKUP";
  }

  return "CONVERSATIONAL_ADVISORY";
}
