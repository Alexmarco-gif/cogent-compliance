import {
  type AtomizationChannelId,
  type ContentPillar,
  type ResourceAuthoritativeSource,
  type ResourceCategory,
  type ResourceFaqItem,
  type ResourcePost,
  type ResourceStatus,
  type TargetPersona,
  type WorkflowStage,
  type WorkflowTrack,
  slugifyTitle,
} from "@/contracts/resources.contracts";

export interface EditorFormState {
  id: string | null;
  title: string;
  slug: string;
  slugManuallyEdited: boolean;
  category: ResourceCategory;
  status: ResourceStatus;
  workflowStage: WorkflowStage;
  excerpt: string;
  bodyMarkdown: string;
  coverImageUrl: string;
  authorName: string;
  authorRole: string;
  tagsText: string;
  featured: boolean;
  videoEmbedUrl: string;
  videoDuration: string;
  reportFileUrl: string;
  reportFileLabel: string;
  eventStartsAt: string;
  eventLocation: string;
  eventRegistrationUrl: string;
  seoTitle: string;
  seoDescription: string;
  publishedAt: string;

  // Playbook Strategy & Brief (Phases 1–3)
  contentPillar: ContentPillar | "";
  targetPersona: TargetPersona | "";
  workflowTrack: WorkflowTrack | "";
  primaryKeyword: string;
  secondaryKeywordsText: string;
  priorityUrgency: number | null;
  priorityCommercial: number | null;
  priorityWinnability: number | null;
  targetWordCount: string;
  serpGapNotes: string;
  productTieIn: string;
  circularCode: string;
  regulators: string[];
  effectiveDate: string;
  authoritativeSources: ResourceAuthoritativeSource[];
  updateCalloutNote: string;

  // Phase 4: FAQs, Mid-Article CTA, Legal Disclaimer & Maker-Checker QA
  faqItems: ResourceFaqItem[];
  midArticleCtaEnabled: boolean;
  midArticleCtaEyebrow: string;
  midArticleCtaHeadline: string;
  midArticleCtaDescription: string;
  midArticleCtaButtonLabel: string;
  midArticleCtaButtonUrl: string;
  showLegalDisclaimer: boolean;
  qaStatutoryAccuracyVerified: boolean;
  qaRepealedRuleChecked: boolean;
  qaReviewerName: string;
  qaReviewedAt: string;

  // Phases 5 & 6: 1-to-7 Atomization & Freshness Refresh
  atomLinkedinCarousel: string;
  atomFounderLinkedinPost: string;
  atomTwitterThread: string;
  atomNewsletterBrief: string;
  atomSalesBattlecard: string;
  atomGscIndexedAt: string;
  atomInternalLinksUpdated: boolean;
  atomCompletedChannels: AtomizationChannelId[];
  lastStatutoryAuditAt: string;
  refreshDueAt: string;
}

export function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function createEmptyForm(category: ResourceCategory = "insights"): EditorFormState {
  return {
    id: null,
    title: "",
    slug: "",
    slugManuallyEdited: false,
    category,
    status: "draft",
    workflowStage: "draft",
    excerpt: "",
    bodyMarkdown: "",
    coverImageUrl: "",
    authorName: "Cogent Editorial",
    authorRole: "Regulatory Research",
    tagsText: "",
    featured: false,
    videoEmbedUrl: "",
    videoDuration: "",
    reportFileUrl: "",
    reportFileLabel: "",
    eventStartsAt: "",
    eventLocation: "Virtual Webinar",
    eventRegistrationUrl: "",
    seoTitle: "",
    seoDescription: "",
    publishedAt: "",

    contentPillar: category === "insights" ? "pillar_1_circular" : "",
    targetPersona: "cco_mlro",
    workflowTrack: "track_a_rapid_48h",
    primaryKeyword: "",
    secondaryKeywordsText: "",
    priorityUrgency: 4,
    priorityCommercial: 4,
    priorityWinnability: 4,
    targetWordCount: "1800",
    serpGapNotes: "",
    productTieIn: "",
    circularCode: "",
    regulators: [],
    effectiveDate: "",
    authoritativeSources: [],
    updateCalloutNote: "",

    faqItems: [],
    midArticleCtaEnabled: false,
    midArticleCtaEyebrow: "COGENT COMPLIANCE OS",
    midArticleCtaHeadline: "",
    midArticleCtaDescription: "",
    midArticleCtaButtonLabel: "Start Free 7-Day Workspace",
    midArticleCtaButtonUrl: "/sign-up",
    showLegalDisclaimer: true,
    qaStatutoryAccuracyVerified: false,
    qaRepealedRuleChecked: false,
    qaReviewerName: "",
    qaReviewedAt: "",

    atomLinkedinCarousel: "",
    atomFounderLinkedinPost: "",
    atomTwitterThread: "",
    atomNewsletterBrief: "",
    atomSalesBattlecard: "",
    atomGscIndexedAt: "",
    atomInternalLinksUpdated: false,
    atomCompletedChannels: [],
    lastStatutoryAuditAt: "",
    refreshDueAt: "",
  };
}

export function formFromPost(post: ResourcePost): EditorFormState {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    slugManuallyEdited: true,
    category: post.category,
    status: post.status,
    workflowStage: post.workflowStage || (post.status === "published" ? "published" : "draft"),
    excerpt: post.excerpt,
    bodyMarkdown: post.bodyMarkdown,
    coverImageUrl: post.coverImageUrl || "",
    authorName: post.authorName,
    authorRole: post.authorRole || "",
    tagsText: post.tags.join(", "),
    featured: post.featured,
    videoEmbedUrl: post.videoEmbedUrl || "",
    videoDuration: post.videoDuration || "",
    reportFileUrl: post.reportFileUrl || "",
    reportFileLabel: post.reportFileLabel || "",
    eventStartsAt: toDatetimeLocalValue(post.eventStartsAt),
    eventLocation: post.eventLocation || "",
    eventRegistrationUrl: post.eventRegistrationUrl || "",
    seoTitle: post.seoTitle || "",
    seoDescription: post.seoDescription || "",
    publishedAt: toDatetimeLocalValue(post.publishedAt),

    contentPillar: post.contentPillar || "",
    targetPersona: post.targetPersona || "",
    workflowTrack: post.workflowTrack || "",
    primaryKeyword: post.primaryKeyword || "",
    secondaryKeywordsText: (post.secondaryKeywords || []).join(", "),
    priorityUrgency: post.priorityUrgency ?? null,
    priorityCommercial: post.priorityCommercial ?? null,
    priorityWinnability: post.priorityWinnability ?? null,
    targetWordCount: post.targetWordCount ? String(post.targetWordCount) : "",
    serpGapNotes: post.serpGapNotes || "",
    productTieIn: post.productTieIn || "",
    circularCode: post.circularCode || "",
    regulators: post.regulators || [],
    effectiveDate: toDateInputValue(post.effectiveDate),
    authoritativeSources: post.authoritativeSources || [],
    updateCalloutNote: post.updateCalloutNote || "",

    faqItems: post.faqItems || [],
    midArticleCtaEnabled: Boolean(post.midArticleCta?.headline),
    midArticleCtaEyebrow: post.midArticleCta?.eyebrow || "COGENT COMPLIANCE OS",
    midArticleCtaHeadline: post.midArticleCta?.headline || "",
    midArticleCtaDescription: post.midArticleCta?.description || "",
    midArticleCtaButtonLabel: post.midArticleCta?.buttonLabel || "Start Free 7-Day Workspace",
    midArticleCtaButtonUrl: post.midArticleCta?.buttonUrl || "/sign-up",
    showLegalDisclaimer: post.showLegalDisclaimer !== false,
    qaStatutoryAccuracyVerified: Boolean(post.qaChecklist?.statutoryAccuracyVerified),
    qaRepealedRuleChecked: Boolean(post.qaChecklist?.repealedRuleChecked),
    qaReviewerName: post.qaChecklist?.reviewerName || "",
    qaReviewedAt: post.qaChecklist?.reviewedAt || "",

    atomLinkedinCarousel: post.atomizationKit?.linkedinCarousel || "",
    atomFounderLinkedinPost: post.atomizationKit?.founderLinkedinPost || "",
    atomTwitterThread: post.atomizationKit?.twitterThread || "",
    atomNewsletterBrief: post.atomizationKit?.newsletterBrief || "",
    atomSalesBattlecard: post.atomizationKit?.salesBattlecard || "",
    atomGscIndexedAt: toDateInputValue(post.atomizationKit?.gscIndexedAt),
    atomInternalLinksUpdated: Boolean(post.atomizationKit?.internalLinksUpdated),
    atomCompletedChannels: post.atomizationKit?.completedChannels || [],
    lastStatutoryAuditAt: toDateInputValue(post.lastStatutoryAuditAt),
    refreshDueAt: toDateInputValue(post.refreshDueAt),
  };
}

function parseDateToIso(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export function buildPayloadFromForm(
  form: EditorFormState,
  targetStatus: ResourceStatus,
  overrideStage?: WorkflowStage,
) {
  const tags = form.tagsText
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const secondaryKeywords = form.secondaryKeywordsText
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  const validSources = form.authoritativeSources
    .map((s) => ({
      title: s.title.trim(),
      code: s.code?.trim() || null,
      url: s.url?.trim() || null,
    }))
    .filter((s) => s.title.length >= 2);

  const validFaqs = form.faqItems
    .map((f) => ({
      question: f.question.trim(),
      answer: f.answer.trim(),
    }))
    .filter((f) => f.question.length >= 5 && f.answer.length >= 10);

  const midArticleCta =
    form.midArticleCtaEnabled && form.midArticleCtaHeadline.trim().length >= 3
      ? {
          eyebrow: form.midArticleCtaEyebrow.trim() || null,
          headline: form.midArticleCtaHeadline.trim(),
          description: form.midArticleCtaDescription.trim(),
          buttonLabel: form.midArticleCtaButtonLabel.trim() || "Start Free 7-Day Workspace",
          buttonUrl: form.midArticleCtaButtonUrl.trim() || "/sign-up",
        }
      : null;

  const parsedTargetWords = Number.parseInt(form.targetWordCount, 10);
  const workflowStage: WorkflowStage =
    targetStatus === "published"
      ? "published"
      : overrideStage || (form.workflowStage === "published" ? "draft" : form.workflowStage);

  return {
    title: form.title.trim(),
    slug: (form.slug.trim() || slugifyTitle(form.title)).toLowerCase(),
    category: form.category,
    status: targetStatus,
    workflowStage,
    excerpt: form.excerpt.trim(),
    bodyMarkdown: form.bodyMarkdown,
    coverImageUrl: form.coverImageUrl.trim() || null,
    authorName: form.authorName.trim() || "Cogent Editorial",
    authorRole: form.authorRole.trim() || null,
    tags,
    featured: form.featured,
    videoEmbedUrl: form.videoEmbedUrl.trim() || null,
    videoDuration: form.videoDuration.trim() || null,
    reportFileUrl: form.reportFileUrl.trim() || null,
    reportFileLabel: form.reportFileLabel.trim() || null,
    eventStartsAt: parseDateToIso(form.eventStartsAt),
    eventLocation: form.eventLocation.trim() || null,
    eventRegistrationUrl: form.eventRegistrationUrl.trim() || null,
    seoTitle: form.seoTitle.trim() || null,
    seoDescription: form.seoDescription.trim() || null,
    publishedAt: parseDateToIso(form.publishedAt),

    contentPillar: form.contentPillar || null,
    targetPersona: form.targetPersona || null,
    workflowTrack: form.workflowTrack || null,
    primaryKeyword: form.primaryKeyword.trim() || null,
    secondaryKeywords,
    priorityUrgency: form.priorityUrgency,
    priorityCommercial: form.priorityCommercial,
    priorityWinnability: form.priorityWinnability,
    targetWordCount:
      Number.isFinite(parsedTargetWords) && parsedTargetWords >= 200 ? parsedTargetWords : null,
    serpGapNotes: form.serpGapNotes.trim() || null,
    productTieIn: form.productTieIn.trim() || null,
    circularCode: form.circularCode.trim() || null,
    regulators: form.regulators,
    effectiveDate: parseDateToIso(form.effectiveDate),
    authoritativeSources: validSources,
    updateCalloutNote: form.updateCalloutNote.trim() || null,

    faqItems: validFaqs,
    midArticleCta,
    showLegalDisclaimer: form.showLegalDisclaimer,
    qaChecklist: {
      statutoryAccuracyVerified: form.qaStatutoryAccuracyVerified,
      repealedRuleChecked: form.qaRepealedRuleChecked,
      reviewerName: form.qaReviewerName.trim() || null,
      reviewedAt: form.qaReviewedAt || null,
    },
    atomizationKit: {
      linkedinCarousel: form.atomLinkedinCarousel.trim() || null,
      founderLinkedinPost: form.atomFounderLinkedinPost.trim() || null,
      twitterThread: form.atomTwitterThread.trim() || null,
      newsletterBrief: form.atomNewsletterBrief.trim() || null,
      salesBattlecard: form.atomSalesBattlecard.trim() || null,
      gscIndexedAt: parseDateToIso(form.atomGscIndexedAt),
      internalLinksUpdated: form.atomInternalLinksUpdated,
      completedChannels: form.atomCompletedChannels,
    },
    lastStatutoryAuditAt: parseDateToIso(form.lastStatutoryAuditAt),
    refreshDueAt: parseDateToIso(form.refreshDueAt),
  };
}
