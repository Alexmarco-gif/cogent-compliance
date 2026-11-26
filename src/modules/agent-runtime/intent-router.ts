/**
 * Cogent Agent Runtime — Turn Intent Router
 *
 * Classifies an incoming user turn into the exact WorkflowPack ID for the active role.
 * Supports all specialized compliance workflows PLUS universal ad-hoc compliance work
 * (non-marketing PDF/DOCX analysis, real-time data queries, daily operational questions,
 * and on-demand editable Studio document creation without clicking a preset workflow).
 */

import type { ComplianceTurnIntent } from "@/contracts/agent-runtime.contracts";
import type { SearchJurisdiction } from "@/contracts/search.contracts";
import type { WorkflowType } from "@/contracts/work-product.contracts";
import { extractTargetJurisdictionsFromPrompt } from "@/modules/live-web-intelligence/africa-regulators";

export interface IntentClassificationInput {
  userPrompt: string;
  attachmentAssetIds?: string[];
  attachmentFilenames?: string[];
  attachmentMimeTypes?: string[];
  campaignUrls?: string[];
  referencedKnowledgeDocId?: string | null;
  searchJurisdictions?: SearchJurisdiction[];
  workflowHint?: WorkflowType | null;
}

/**
 * Returns true strictly for lightweight greetings, polite acknowledgements, or
 * brief capability questions ("Hi", "Thanks", "Hi, what can you help our team do?").
 */
export function isPureGreetingOrAck(prompt: string): boolean {
  const trimmed = prompt.trim();
  if (!trimmed) return false;
  if (
    /^(?:hi|hello|hey|good\s+(?:morning|afternoon|evening)|howdy|greetings|yo|thanks|thank\s+you|ok|okay|got\s+it|makes\s+sense|awesome|great|nice|perfect|cheers|noted)[!.,?\s]*$/i.test(
      trimmed
    )
  ) {
    return true;
  }
  if (
    /^(?:hi|hello|hey|good\s+(?:morning|afternoon|evening))[\s,!.]*(?:what\s+can\s+you\s+(?:do|help(?:\s+[\w\s]{0,36})?\s+(?:with|do))|how\s+(?:can|do)\s+you\s+help(?:\s+[\w\s]{0,36})?|who\s+are\s+you)[?!.\s]*$/i.test(
      trimmed
    )
  ) {
    return true;
  }
  if (
    /^(?:what\s+can\s+you\s+(?:do|help(?:\s+[\w\s]{0,36})?\s+(?:with|do))|how\s+(?:can|do)\s+you\s+help(?:\s+us)?|who\s+are\s+you)[?!.\s]*$/i.test(
      trimmed
    )
  ) {
    return true;
  }
  return false;
}

/**
 * Detects natural-language requests asking Cogent to produce, draft, or export a standalone
 * compliance document (memo, brief, report, checklist, letter, summary doc, board paper,
 * risk register, email template, etc.) without requiring a preset workflow button click.
 */
export function hasExplicitDocumentCreationRequest(prompt: string): boolean {
  const trimmed = prompt.trim();
  if (!trimmed) return false;

  const directDocumentVerbPattern =
    /\b(?:create|generate|draft|write(?:\s+up)?|prepare|produce|build|compile|make|put\s+(?:this|that|it|everything|all\s+of\s+this)\s+(?:into|in)|turn\s+(?:this|that|it|the\s+above|our\s+(?:discussion|chat|analysis|findings)|these\s+(?:findings|notes|points))\s+into|convert\s+(?:this|that|it|the\s+above)\s+into|export(?:\s+(?:this|that|it))?\s+(?:as|to)|format(?:\s+(?:this|that|it))?\s+(?:as|into))\s+(?:a\s+|an\s+|the\s+|me\s+a\s+|me\s+an\s+|us\s+a\s+|us\s+an\s+)?(?:(?:formal|complete|comprehensive|detailed|board[- ]?ready|executive|downloadable|editable|structured|clean|printable|word|pdf|docx|compliance|regulatory|internal|external|client|customer|vendor|incident|audit|risk|briefing|summary|one[- ]?page|action|remediation|response|onboarding|training|legal|technical)\s+){0,4}(?:document|doc|docx|pdf|memo|memorandum|brief|briefing|report|checklist|board\s+(?:paper|memo|brief|update|pack)|letter|notice|correspondence|email(?:\s+(?:draft|template|response))?|guide|playbook|register|matrix|schedule|plan|roadmap|summary\s+(?:sheet|doc|document|report|memo)|deliverable)\b/i;

  if (directDocumentVerbPattern.test(trimmed)) {
    return true;
  }

  const documentForThisPattern =
    /\b(?:create|make|generate|draft|prepare|give\s+me|save(?:\s+this)?\s+as)\s+(?:a\s+|an\s+)?(?:[\w-]+\s+){0,2}(?:document|doc|word\s+(?:file|doc)|pdf|memo|brief|report|checklist|letter)\s+(?:for|from|of|on|about|out\s+of)\s+(?:this|that|it|the\s+above|these|the\s+attached)\b/i;

  if (documentForThisPattern.test(trimmed)) {
    return true;
  }

  const studioSavePattern =
    /\b(?:save|open|put|send|export)\s+(?:this|that|it|the\s+above|your\s+(?:answer|response|summary))\s+(?:in|into|as|to)\s+(?:the\s+)?(?:studio|a\s+(?:document|doc|word\s+doc|pdf|file)|work\s+product)\b/i;

  return studioSavePattern.test(trimmed);
}

/**
 * Detects whether a prompt asks for real-time, current, breaking, or external live web data
 * (circulars, announcements, news, current rates/MPR/FX, deadlines, or live online lookups).
 */
export function hasRealTimeOrExternalDataCue(prompt: string): boolean {
  const trimmed = prompt.trim();
  if (!trimmed) return false;

  return /\b(?:latest|recent(?:ly)?|new(?:est)?|current(?:ly)?|today|this\s+(?:week|month|quarter|year)|202[5-9]|real[- ]?time|live\s+(?:data|rate|rates|update|updates|search|status|web|news|url|link)|up[- ]?to[- ]?date|breaking|news|update[sd]?|circulars?|gazette|announcement|press\s+release|search(?:\s+the)?\s+web|look\s+up|find\s+out|check\s+online|exchange\s+rate|fx\s+rate|mpr\b|monetary\s+policy\s+rate|inflation\s+rate|deadline|effective\s+date|commencement\s+date|status\s+of|still\s+(?:valid|active|in\s+force)|has\s+(?:cbn|sec|ndpc|fccpc|arcon|nfiu|cbk|bog|sarb)|did\s+(?:cbn|sec|ndpc|fccpc|arcon|nfiu|cbk|bog|sarb))\b/i.test(
    trimmed
  );
}

/**
 * Determines whether the user's prompt, uploaded files, or URLs represent a marketing /
 * promotional creative clearance (flyer, banner, ad copy, landing page promo, influencer
 * script) rather than a general compliance PDF/DOCX/URL (circular, contract, report, letter).
 */
export function hasMarketingPromotionalCue(params: {
  prompt: string;
  extractedAssetTexts?: string[];
  attachmentFilenames?: string[];
  attachmentMimeTypes?: string[];
}): boolean {
  const prompt = (params.prompt || "").trim();
  const extractedJoined = (params.extractedAssetTexts || []).join("\n");
  const filenames = params.attachmentFilenames || [];
  const mimeTypes = params.attachmentMimeTypes || [];

  const promptMarketingCue =
    /\b(?:flyer|banner|poster|billboard|ad\s+copy|promo(?:tional)?\s+(?:copy|material|asset|campaign|draw|raffle|video|banner|landing\s+page)|campaign\s+(?:asset|copy|creative|flyer|banner|clearance|kit|audit|landing\s+page)|marketing\s+(?:asset|copy|creative|flyer|campaign|material|collateral)|creative\s+(?:asset|copy)|social\s+(?:media\s+)?(?:ad|post|caption)|instagram\s+(?:ad|post|caption|reel)|tiktok\s+(?:ad|script|video)|facebook\s+ad|influencer\s+(?:script|skit|post|endorsement)|sms\s+(?:blast|promo|ad|copy)|play\s*store|app\s*store|landing\s*page|arcon\s+asp|pre[- ]?vetting|kfs\s+table)\b/i.test(
      prompt
    );
  if (promptMarketingCue) return true;

  const extractedPromoClaims =
    /\b(?:0%\s*interest|zero\s+interest|instant\s+(?:loan|cash|credit|approval)|no\s+collateral|zero\s+paperwork|guaranteed\s+returns?|100%\s*risk[- ]?free|risk[- ]?free\s+(?:returns?|investment|loan)|apply\s+now|sign\s+up\s+(?:now|today)|borrow\s+(?:up\s+to\s+)?(?:₦|NGN)|loan\s+in\s+\d+\s*(?:min|minute|hour|sec)|get\s+(?:₦|NGN)\s*[\d,]+(?:\s+in\s+\d+|\s+instantly|\s+today)|win\s+(?:a\s+)?(?:iphone|car|₦|cash\s+prize))\b/i.test(
      extractedJoined
    );
  if (extractedPromoClaims) return true;

  // Image attachments (flyers/banners/ads) default to marketing clearance UNLESS the user
  // explicitly identifies them as a non-marketing document (circular, contract, letter, invoice, etc.)
  const hasImageAttachment =
    mimeTypes.some((m) => m.toLowerCase().startsWith("image/")) ||
    filenames.some((f) => /\.(?:jpg|jpeg|png|webp)$/i.test(f)) ||
    /\.(?:jpg|jpeg|png|webp)\b/i.test(prompt);

  const explicitNonMarketingImageCue =
    /\b(?:circular|gazette|contract|agreement|sla|nda|dpa|letter|invoice|receipt|certificate|license|licence|statement|id\s+card|passport|nin\s+slip|cac\s+certificate|board\s+minutes|audit\s+report|risk\s+register)\b/i.test(
      `${prompt} ${filenames.join(" ")}`
    );

  if (hasImageAttachment && !explicitNonMarketingImageCue) {
    return true;
  }

  return false;
}

const REGULATORY_OR_COMPLIANCE_SIGNAL_RE =
  /\b(?:cbn|fccpc|arcon|ndpc|sec|nfiu|ndic|fccpa|deon|ndpa|isa|bofia|mlppa|gaid|pencom|naicom|cac|firs|nrs|ncc|nitda|asp\b|kfs\b|apr\b|ear\b|aml|cft|cpf|kyc|kyb|pep\b|sanctions?|ofac|str\b|ctr\b|goaml|bvn|nin|dpo\b|dpia|dsar|pre[- ]?vetting|influencer|penalty|penalties|fine|fines|sanction|section\s+\d|clause|circular|regulation|regulations|statute|statutory|guideline|guidelines|framework|directive|license|licence|licensing|tier\s*[123]|mfb|psb|pssp|mmo|imto|vasp|dmb|drip\s*pricing|cooling[- ]?off|data\s+(?:breach|protection|privacy|localization|localisation|transfer)|whistleblow|escrow|chargeback|fraud|onboarding|compliance|regulator|regulatory|audit|governance|risk\s+assessment|pci[- ]?dss|iso\s*27001|mpr\b|fx\s+(?:rule|policy|rate|circular))\b/i;

/**
 * Classifies a user turn into one of Cogent's operational compliance intents:
 * - Deliverable Workflows: PRODUCT_STRUCTURING_MEMO, POLICY_GAP_REDLINE, POLICY_DRAFT_NEW,
 *   SUPERVISORY_DDQ_RESPONSE, CROSS_BORDER_COMPARISON, GENERAL_COMPLIANCE_DOCUMENT
 * - Marketing Clearance & Daily Compliance Q&A: FULL_COMPLIANCE_AUDIT, REGULATORY_LOOKUP,
 *   CONVERSATIONAL_ADVISORY
 */
export function classifyComplianceTurnIntent(
  options: IntentClassificationInput,
  extractedAssetTexts: string[] = []
): ComplianceTurnIntent {
  const prompt = options.userPrompt.trim();

  // 0. Explicit workflow hint from UI starter cards, Workflows menu, or REST caller
  if (options.workflowHint === "PRODUCT_STRUCTURING_MEMO") {
    return "PRODUCT_STRUCTURING_MEMO";
  }
  if (options.workflowHint === "POLICY_GAP_REDLINE") {
    return "POLICY_GAP_REDLINE";
  }
  if (options.workflowHint === "POLICY_DRAFT_NEW") {
    return "POLICY_DRAFT_NEW";
  }
  if (options.workflowHint === "SUPERVISORY_DDQ_RESPONSE") {
    return "SUPERVISORY_DDQ_RESPONSE";
  }
  if (options.workflowHint === "CROSS_BORDER_COMPARISON") {
    return "CROSS_BORDER_COMPARISON";
  }
  if (options.workflowHint === "GENERAL_COMPLIANCE_DOCUMENT") {
    return "GENERAL_COMPLIANCE_DOCUMENT";
  }
  if (options.workflowHint === "CAMPAIGN_COMPLIANCE_KIT") {
    return "FULL_COMPLIANCE_AUDIT";
  }

  // 1a. Explicit Policy Redline (referenced knowledge document or policy comparison/gap command)
  if (
    options.referencedKnowledgeDocId ||
    (/\b(?:policy|sop|manual|handbook)\b/i.test(prompt) &&
      /\b(?:redline|compare|update|gap|outdated|align|rewrite\s+(?:our|the)\s+(?:policy|clause|sop))\b/i.test(
        prompt
      ))
  ) {
    return "POLICY_GAP_REDLINE";
  }

  // 1b. Net-New Institutional Compliance Policy Drafting from Scratch
  if (
    /\b(?:draft|write|create|build|develop)\s+(?:a\s+|an\s+)?(?:new\s+|complete\s+|board[- ]?ready\s+|comprehensive\s+)?(?:[\w/& -]{0,40}\s+)?(?:policy|sop|compliance\s+manual)\b/i.test(
      prompt
    ) &&
    !/\b(?:ddq|questionnaire|campaign|flyer|ad\s+copy|structuring\s+memo)\b/i.test(prompt)
  ) {
    return "POLICY_DRAFT_NEW";
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

  // 4. Uploaded attachments, file mentions, or live URLs:
  //    Route ONLY marketing/promotional creatives to FULL_COMPLIANCE_AUDIT.
  //    Non-marketing PDFs/DOCX/URLs (circulars, contracts, board papers, letters, reports)
  //    route to GENERAL_COMPLIANCE_DOCUMENT (if a document is requested) or REGULATORY_LOOKUP
  //    for deep, neutral document analysis backed by the Statutory Vault & Live Web.
  const hasAttachmentsOrUrls =
    (options.attachmentAssetIds && options.attachmentAssetIds.length > 0) ||
    (options.campaignUrls && options.campaignUrls.length > 0) ||
    extractedAssetTexts.length > 0 ||
    /https?:\/\/\S+/i.test(prompt) ||
    /\.(?:jpg|jpeg|png|webp|pdf|docx)\b/i.test(prompt);

  if (hasAttachmentsOrUrls) {
    if (
      hasMarketingPromotionalCue({
        prompt,
        extractedAssetTexts,
        attachmentFilenames: options.attachmentFilenames,
        attachmentMimeTypes: options.attachmentMimeTypes,
      })
    ) {
      return "FULL_COMPLIANCE_AUDIT";
    }

    if (hasExplicitDocumentCreationRequest(prompt)) {
      return "GENERAL_COMPLIANCE_DOCUMENT";
    }

    return "REGULATORY_LOOKUP";
  }

  // 5. Product & Feature Structuring Memo
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

  // 6. Explicit clearance / audit request targeting a creative, flyer, banner, or ad copy
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

  // 7. Universal On-Demand Document Creation (works from any prompt or follow-up without clicking a workflow)
  if (hasExplicitDocumentCreationRequest(prompt)) {
    return "GENERAL_COMPLIANCE_DOCUMENT";
  }

  // 8. Pure greetings, acknowledgements, and direct thread follow-ups
  if (isPureGreetingOrAck(prompt)) {
    return "CONVERSATIONAL_ADVISORY";
  }

  const isDirectThreadFollowUp =
    /\b(?:what\s+(?:next|now|do\s+(?:i|we)\s+do|should\s+(?:i|we)\s+do|do\s+you\s+recommend|would\s+you\s+recommend|is\s+it\s+you\s+recommend|if\s+(?:i|we))|recommend\s+(?:i|we)\s+do|where\s+do\s+(?:i|we)\s+start|next\s+steps?|how\s+do\s+(?:i|we)\s+(?:fix\s+this|fix\s+it|go\s+about\s+this)|which\s+one\s+should\s+(?:i|we)|why\s+did\s+you|tell\s+me\s+more)\b/i.test(
      prompt
    ) ||
    /^(?:thanks|thank\s+you|ok|okay|got\s+it|makes\s+sense|awesome|great|nice|perfect|this\s+is\s+good|that\s+is\s+good)\b/i.test(
      prompt
    );

  if (isDirectThreadFollowUp) {
    return "CONVERSATIONAL_ADVISORY";
  }

  const hasSoftExplainFollowUp =
    /\b(?:why\s+(?:did|is|was|does)|can\s+you\s+explain|how\s+do\s+(?:i|we)\s+(?:proceed|start))\b/i.test(
      prompt
    );
  const refersToPriorTurn = /\b(?:this|that|it|above|earlier|you\s+said|your\s+(?:review|finding|audit|report))\b/i.test(
    prompt
  );

  if (
    hasSoftExplainFollowUp &&
    (refersToPriorTurn ||
      (!REGULATORY_OR_COMPLIANCE_SIGNAL_RE.test(prompt) && !hasRealTimeOrExternalDataCue(prompt)))
  ) {
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

  // 10. Specific regulatory, operational compliance, or real-time intelligence questions
  if (
    REGULATORY_OR_COMPLIANCE_SIGNAL_RE.test(prompt) ||
    hasRealTimeOrExternalDataCue(prompt)
  ) {
    return "REGULATORY_LOOKUP";
  }

  return "CONVERSATIONAL_ADVISORY";
}
