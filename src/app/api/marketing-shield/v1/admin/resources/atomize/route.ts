/**
 * Owner-only Resources CMS 1-to-7 Content Atomization Endpoint
 * Generates channel-native LinkedIn Carousel, Founder LinkedIn Post, X Thread,
 * Weekly Regulatory Brief Email, and SDR Outbound Battlecard from an article.
 *
 * Uses @google/genai directly (zero env.ts / Supabase dependency) with graceful
 * fallback to deterministic Playbook templates if Gemini is unavailable.
 * Non-owners receive 404.
 */

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import {
  RESOURCE_CATEGORIES,
  TARGET_PERSONAS,
  TARGET_PERSONA_META,
} from "@/contracts/resources.contracts";
import { requireResourcesAdminSession } from "@/modules/resources/resources-admin.guard";
import { buildDeterministicAtomizationKit } from "@/modules/resources/resources-playbook.helpers";
import { getPublicSiteUrl } from "@/lib/site-url";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const NOT_FOUND = () => NextResponse.json({ error: "Not found" }, { status: 404 });

const AtomizeRequestSchema = z.object({
  title: z.string().trim().min(3).max(240),
  excerpt: z.string().trim().max(1000).default(""),
  bodyMarkdown: z.string().max(120_000).default(""),
  category: z.enum(RESOURCE_CATEGORIES).default("insights"),
  slug: z.string().trim().max(140).default("guide"),
  circularCode: z.string().trim().max(140).optional().nullable(),
  regulators: z.array(z.string().trim().max(40)).max(10).default([]),
  targetPersona: z.enum(TARGET_PERSONAS).optional().nullable(),
  primaryKeyword: z.string().trim().max(160).optional().nullable(),
});

const GeminiAtomizeOutputSchema = z.object({
  linkedinCarousel: z.string().min(40),
  founderLinkedinPost: z.string().min(40),
  twitterThread: z.string().min(40),
  newsletterBrief: z.string().min(40),
  salesBattlecard: z.string().min(40),
});

function getGeminiKeys(): string[] {
  return [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2 || process.env.GEMINI_KEY_2,
    process.env.GEMINI_API_KEY_3 || process.env.GEMINI_KEY_3,
  ]
    .map((k) => (k || "").trim())
    .filter((k) => k.length > 0 && !k.startsWith("mock_"));
}

export async function POST(req: NextRequest) {
  const session = await requireResourcesAdminSession();
  if (!session.authorized) return NOT_FOUND();

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const parsed = AtomizeRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const siteUrl = getPublicSiteUrl();
  const canonicalUrl = `${siteUrl}/resources/${input.category}/${input.slug || "guide"}`;
  const fallbackKit = buildDeterministicAtomizationKit(input, siteUrl);

  const keys = getGeminiKeys();
  if (keys.length === 0) {
    return NextResponse.json({ kit: fallbackKit, source: "template" }, { status: 200 });
  }

  const personaLabel = input.targetPersona
    ? `${TARGET_PERSONA_META[input.targetPersona].label} (${TARGET_PERSONA_META[input.targetPersona].hookAngle})`
    : "Chief Compliance Officer / General Counsel / Fintech Founder in Nigeria & Africa";

  const prompt = `You are the senior B2B RegTech content strategist for Cogent by Stem Systems (${siteUrl}), a fintech & banking compliance operating system for Nigeria and Africa.

Atomize the article below into 5 high-trust, zero-fluff B2B distribution assets following the Cogent 1-to-7 Content Atomization Matrix.

RULES:
- NEVER invent statutes, circular codes, penalties, or deadlines not present in the source article.
- Always link strictly to the canonical URL: ${canonicalUrl} (never use /blog/...).
- Keep tone crisp, practitioner-grade, and scannable for Nigerian/African fintech & banking leaders.
- Target Persona: ${personaLabel}
- Circular Code: ${input.circularCode || "N/A"}
- Regulators: ${input.regulators.join(", ") || "N/A"}
- Primary Keyword: ${input.primaryKeyword || "N/A"}

ARTICLE TITLE: ${input.title}
ARTICLE EXCERPT: ${input.excerpt}
ARTICLE BODY (Markdown excerpt):
${input.bodyMarkdown.slice(0, 14000)}

Return ONLY valid JSON with these exact 5 string keys:
{
  "linkedinCarousel": "6 slides clearly separated by --- (Slide 1 Hook, Slides 2-4 Key Rules, Slide 5 Manual vs Cogent, Slide 6 CTA with link in first comment)",
  "founderLinkedinPost": "200-250 word zero-click practitioner text post with sharp opening hook, arrow bullets, and first-comment link note to ${canonicalUrl}",
  "twitterThread": "5 numbered tweets (1/5 to 5/5) ending with ${canonicalUrl}",
  "newsletterBrief": "Weekly Regulatory Brief issue with Subject line, 150-word executive summary, What your team needs to do this week box, and CTA links",
  "salesBattlecard": "Concise 3-paragraph SDR outbound email script targeting affected CCOs/Founders referencing ${canonicalUrl} and the free 7-day Cogent workspace"
}`;

  const model = (process.env.GEMINI_FLASH_MODEL || "gemini-2.5-flash").trim();

  for (const apiKey of keys) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.4,
        },
      });
      const text = response.text?.trim() || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) continue;
      const parsedJson = GeminiAtomizeOutputSchema.safeParse(JSON.parse(jsonMatch[0]));
      if (parsedJson.success) {
        return NextResponse.json(
          {
            kit: {
              ...fallbackKit,
              ...parsedJson.data,
            },
            source: "gemini",
          },
          { status: 200 },
        );
      }
    } catch (err) {
      logger.warn("Gemini atomization attempt failed; trying next key or template fallback", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({ kit: fallbackKit, source: "template" }, { status: 200 });
}
