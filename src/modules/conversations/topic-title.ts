/**
 * Cogent Marketing Shield - Contextual Conversation Topic Naming
 * Derives concise, context-aware topic titles from prompts, linked products, and headings
 * instead of truncating raw prompt text mid-word.
 */

const INSTRUCTION_PREFIXES = [
  /^(?:please\s+)?(?:can\s+you\s+|could\s+you\s+)?(?:help\s+me\s+)?(?:tell\s+me\s+about|explain\s+to\s+me|explain|describe)\s+/i,
  /^(?:please\s+)?(?:can\s+you\s+|could\s+you\s+)?(?:review|audit|check|inspect|analyze|analyse|assess|evaluate|screen|scan|verify)\s+(?:this|the|our|my)?\s*/i,
  /^(?:what\s+are\s+the|what\s+is\s+the|what\s+are|what\s+is|how\s+do\s+i|how\s+can\s+we)\s+/i,
];

function truncateAtWordBoundary(input: string, maxLen = 56): string {
  const clean = input.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLen) return clean;
  const sliced = clean.slice(0, maxLen);
  const lastSpace = sliced.lastIndexOf(" ");
  if (lastSpace >= 20) {
    return sliced.slice(0, lastSpace).replace(/[\s\-:—,.;]+$/, "");
  }
  return sliced.replace(/[\s\-:—,.;]+$/, "");
}

function toTitleCasePhrase(text: string): string {
  const smallWords = new Set(["and", "or", "for", "of", "the", "in", "on", "to", "with", "under", "via", "a", "an"]);
  const acronyms = new Set(["CBN", "FCCPC", "ARCON", "NDPC", "NDPA", "SEC", "NDIC", "APR", "SMS", "URL", "DEON", "CPF", "KYC", "ASP", "AISOP", "GAID", "MFB", "PSB", "MMO"]);

  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((word, idx) => {
      const upper = word.toUpperCase();
      if (acronyms.has(upper)) return upper;
      const lower = word.toLowerCase();
      if (idx > 0 && smallWords.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

function detectChannelLabel(text: string): string | null {
  const lower = text.toLowerCase();
  if (/\bsocial\s+media\b|\binstagram\b|\bfacebook\b|\btiktok\b|\blinkedin\b|\bx\s+post\b|\btweet\b/.test(lower)) {
    return "Social Media Ad";
  }
  if (/\bsms\b|\btext\s+message\b/.test(lower)) {
    return "SMS Copy";
  }
  if (/\binfluencer\b|\bskit\b|\bcreator\b/.test(lower)) {
    return "Influencer Script";
  }
  if (/\bflyer\b|\bbanner\b|\bposter\b|\bbillboard\b|\bprint\b/.test(lower)) {
    return "Campaign Flyer";
  }
  if (/\bemail\b|\bnewsletter\b/.test(lower)) {
    return "Email Campaign";
  }
  if (/\blanding\s+page\b|\bwebpage\b|\bwebsite\b|https?:\/\//.test(lower)) {
    return "Landing Page";
  }
  return null;
}

export interface TopicTitleOptions {
  productName?: string | null;
  attachmentName?: string | null;
  assistantHeading?: string | null;
}

/**
 * Generates a concise topic/context title for a compliance conversation.
 */
export function deriveConversationTopicTitle(
  prompt: string,
  options?: TopicTitleOptions,
): string {
  const trimmed = prompt.trim();
  const productName = options?.productName?.trim();

  // 1. Uploaded asset prompt (either explicit attachmentName or asset upload prompt)
  const uploadedAssetMatch = trimmed.match(/^uploaded\s+(?:campaign\s+)?asset\s+"([^"]+)"/i);
  const resolvedAttachment = options?.attachmentName || uploadedAssetMatch?.[1];
  if (resolvedAttachment) {
    const cleanFile = resolvedAttachment.replace(/\.[^/.]+$/, "").trim();
    const base = productName ? `${productName} — ${cleanFile}` : `${cleanFile} Asset Audit`;
    return truncateAtWordBoundary(base);
  }

  if (!trimmed) {
    return productName
      ? `${productName} Compliance Audit`
      : "New Compliance Audit";
  }

  const channelLabel = detectChannelLabel(trimmed);

  // 2. URL inspection prompt
  const urlMatch = trimmed.match(/https?:\/\/[^\s"'<>]+/i);
  if (urlMatch) {
    try {
      const host = new URL(urlMatch[0]).hostname.replace(/^www\./, "");
      if (host) {
        const base = productName
          ? `${productName} — ${host} Audit`
          : `${host} Landing Page Audit`;
        return truncateAtWordBoundary(base);
      }
    } catch {
      // Ignore malformed URLs and continue
    }
    return truncateAtWordBoundary(
      productName ? `${productName} — Landing Page Audit` : "Landing Page Compliance Audit",
    );
  }

  // 3. Referenced product + campaign copy or channel
  if (productName) {
    if (channelLabel) {
      return truncateAtWordBoundary(`${productName} — ${channelLabel} Audit`);
    }
    return truncateAtWordBoundary(`${productName} — Compliance Review`);
  }

  // 4. Remove quoted ad copy after colon/newline so we summarize the subject rather than ad text
  const beforeQuote = trimmed
    .split(/:\s*["“\n]/)[0]
    ?.split(/\n/)[0]
    ?.trim() || trimmed;

  let topic = beforeQuote;
  for (const prefix of INSTRUCTION_PREFIXES) {
    topic = topic.replace(prefix, "").trim();
  }

  // Remove trailing filler phrases
  topic = topic
    .replace(/\bfor\s+(?:regulatory\s+)?compliance(?:\s+in\s+nigeria)?\s*[?:.]*$/i, "")
    .replace(/\bfor\s+(?:cbn|fccpc|arcon|ndpc|sec)(?:,\s*(?:cbn|fccpc|arcon|ndpc|sec))*(?:\s+and\s+(?:cbn|fccpc|arcon|ndpc|sec))?\s+compliance\s*[?:.]*$/i, "")
    .replace(/\s+in\s+nigeria\s*[?:.]*$/i, "")
    .replace(/[?:.!"“”]+$/g, "")
    .trim();

  // Handle "social media ad for our Quick Cash Loan" -> "Quick Cash Loan — Social Media Ad"
  const channelForSubjectMatch = topic.match(
    /^(social media ad|sms copy|campaign copy|promotional copy|influencer script|campaign flyer|landing page|ad copy|email campaign)\s+(?:for|about|on)\s+(?:our\s+|the\s+|a\s+)?(.+)$/i,
  );
  if (channelForSubjectMatch?.[1] && channelForSubjectMatch[2]) {
    const channelPart = toTitleCasePhrase(channelForSubjectMatch[1]);
    const subjectPart = toTitleCasePhrase(channelForSubjectMatch[2]);
    return truncateAtWordBoundary(`${subjectPart} — ${channelPart}`);
  }

  // If assistant provided a clean ### Heading and topic is still very generic or long
  const assistantHeading = options?.assistantHeading
    ?.replace(/^#+\s*/, "")
    .replace(/^overview of\s+/i, "")
    .replace(/\s+in nigeria$/i, "")
    .trim();

  if (topic.length >= 4 && topic.length <= 56) {
    const formatted = toTitleCasePhrase(topic);
    if (channelLabel && !formatted.toLowerCase().includes(channelLabel.toLowerCase())) {
      return truncateAtWordBoundary(`${formatted} — ${channelLabel}`);
    }
    return truncateAtWordBoundary(formatted);
  }

  if (assistantHeading && assistantHeading.length >= 4) {
    return truncateAtWordBoundary(assistantHeading);
  }

  return truncateAtWordBoundary(toTitleCasePhrase(topic || trimmed));
}
