/**
 * Cogent Marketing Shield - Zero-Prompt Regulatory Ripple Sentinel Service
 * Document Reference: Document 13 (Section 5.3, Phase D)
 *
 * Proactively cross-checks newly discovered or ingested CBN, FCCPC, ARCON, NDPC, and SEC
 * circulars against a tenant's saved Product Rate Cards (`campaign_products`) and active
 * approved campaigns (`marketing_campaigns`). Generates actionable `Problem -> Risk -> Fix`
 * ripple alerts and spawns Zero-Prompt Incident Conversations automatically.
 */

import { createAdminSupabaseClient } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { auditService } from "@/modules/audit/audit.service";
import { kfsGeneratorService } from "@/modules/compliance-assessment/kfs-generator.service";

export interface CircularRippleInput {
  instrumentId?: string;
  regulator: "CBN" | "FCCPC" | "ARCON" | "NDPC" | "SEC" | string;
  title: string;
  summaryText: string;
  clauseReference?: string;
  sourceUrl?: string;
}

export interface RegulatoryRippleAlertRecord {
  id: string;
  tenant_id: string;
  regulatory_instrument_id?: string | null;
  regulator: string;
  circular_title: string;
  impacted_product_id?: string | null;
  impacted_product_name?: string | null;
  impacted_campaign_id?: string | null;
  impacted_campaign_name?: string | null;
  incident_conversation_id?: string | null;
  blind_spot_summary: string;
  consequence_summary: string;
  recommended_fix: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  status: "OPEN" | "ACKNOWLEDGED" | "RESOLVED";
  created_at: string;
}

export class RegulatoryRippleService {
  /**
   * Scans a tenant's active Product Rate Cards and Approved Campaigns against a new
   * regulatory circular and generates Zero-Prompt Ripple Alerts + Incident Threads.
   */
  public async scanTenantForCircularRipple(
    tenantId: string,
    circular: CircularRippleInput,
  ): Promise<RegulatoryRippleAlertRecord[]> {
    const supabase = createAdminSupabaseClient();
    const corpus = `${circular.title} ${circular.summaryText}`.toLowerCase();
    const regulator = (circular.regulator || "CBN").toUpperCase();

    // 1. Load active Product Rate Cards for this tenant
    let products: Array<{
      id: string;
      product_name: string;
      product_type: string;
      interest_rate_min?: number | null;
      interest_rate_max?: number | null;
      interest_rate_type?: string | null;
      processing_fee_percent?: number | null;
      tenor_min_days?: number | null;
      tenor_max_days?: number | null;
      required_disclosures?: string[] | null;
    }> = [];

    try {
      const { data: prodRows } = await supabase
        .from("campaign_products")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("status", "ACTIVE");
      if (Array.isArray(prodRows)) {
        products = prodRows;
      }
    } catch (err) {
      logger.warn("RegulatoryRippleService: failed to query campaign_products", {
        tenantId,
        error: (err as Error).message,
      });
    }

    // 2. Load active/approved campaigns for this tenant
    let campaigns: Array<{
      id: string;
      campaign_name: string;
      channel: string;
      product_id?: string | null;
      status: string;
    }> = [];

    try {
      const { data: campRows } = await supabase
        .from("marketing_campaigns")
        .select("id, campaign_name, channel, product_id, status")
        .eq("tenant_id", tenantId)
        .in("status", ["APPROVED", "IN_REVIEW", "DRAFT"])
        .limit(25);
      if (Array.isArray(campRows)) {
        campaigns = campRows;
      }
    } catch (err) {
      logger.warn("RegulatoryRippleService: failed to query marketing_campaigns", {
        tenantId,
        error: (err as Error).message,
      });
    }

    const alertsCreated: RegulatoryRippleAlertRecord[] = [];

    for (const product of products) {
      const impact = this.evaluateProductImpact(product, regulator, circular, corpus);
      if (!impact) continue;

      const linkedCampaign = campaigns.find((c) => c.product_id === product.id);
      let incidentConversationId: string | null = null;

      // Spawn a Zero-Prompt Incident Conversation for the CCO
      try {
        const threadTitle = `[Regulatory Ripple Alert] ${regulator}: ${product.product_name}`;
        const { data: conv } = await supabase
          .from("marketing_conversations")
          .insert({
            tenant_id: tenantId,
            created_by: "system_ripple_sentinel",
            title: threadTitle,
            context_type: "REGULATORY",
            active_campaign_id: linkedCampaign?.id || null,
            status: "ACTIVE",
            metadata: {
              zero_prompt_source: "REGULATORY_RIPPLE_SENTINEL",
              regulator,
              impacted_product_id: product.id,
            },
          })
          .select("id")
          .single();

        if (conv?.id) {
          incidentConversationId = conv.id;
          const kfsArtifact = kfsGeneratorService.generateKfsAndChannelKit({
            productName: product.product_name,
            interestRatePercent: Number(
              product.interest_rate_max ?? product.interest_rate_min ?? 5,
            ),
            interestRatePeriod:
              product.interest_rate_type === "DAILY"
                ? "DAILY"
                : product.interest_rate_type === "APR"
                  ? "ANNUAL"
                  : "MONTHLY",
            processingFeePercent: Number(product.processing_fee_percent ?? 1.5),
            tenorDays: Number(product.tenor_min_days ?? 60),
          });

          const markdownReport = [
            `### Zero-Prompt Regulatory Ripple Alert: ${circular.title}`,
            `**Impacted Product Rate Card:** \`${product.product_name}\` (${product.product_type})`,
            linkedCampaign
              ? `**Impacted Active Campaign:** \`${linkedCampaign.campaign_name}\` (${linkedCampaign.channel})`
              : "",
            "",
            `1. **What You Missed (The Blind Spot):** ${impact.blindSpot}`,
            `2. **What It Costs You (The Consequence):** ${impact.consequence}`,
            `3. **One-Click Resolution (The Done-For-You Fix):** ${impact.recommendedFix}`,
            "",
            kfsArtifact.kfsMarkdownTable,
          ]
            .filter(Boolean)
            .join("\n");

          await supabase.from("marketing_messages").insert({
            conversation_id: conv.id,
            tenant_id: tenantId,
            role: "ASSISTANT",
            content: markdownReport,
            content_type: "TEXT",
            status: "COMPLETED",
            sequence_number: 1,
            metadata: {
              zero_prompt_source: "REGULATORY_RIPPLE_SENTINEL",
              regulator,
              circular_title: circular.title,
              impacted_product_id: product.id,
            },
          });
        }
      } catch (convErr) {
        logger.warn("RegulatoryRippleService: could not create incident conversation", {
          tenantId,
          error: (convErr as Error).message,
        });
      }

      const alertRow: RegulatoryRippleAlertRecord = {
        id: `ripple_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        tenant_id: tenantId,
        regulatory_instrument_id: circular.instrumentId || null,
        regulator,
        circular_title: circular.title,
        impacted_product_id: product.id,
        impacted_product_name: product.product_name,
        impacted_campaign_id: linkedCampaign?.id || null,
        impacted_campaign_name: linkedCampaign?.campaign_name || null,
        incident_conversation_id: incidentConversationId,
        blind_spot_summary: impact.blindSpot,
        consequence_summary: impact.consequence,
        recommended_fix: impact.recommendedFix,
        severity: impact.severity,
        status: "OPEN",
        created_at: new Date().toISOString(),
      };

      try {
        const { data: inserted } = await supabase
          .from("regulatory_ripple_alerts")
          .insert({
            tenant_id: tenantId,
            regulatory_instrument_id: circular.instrumentId || null,
            regulator,
            circular_title: circular.title,
            impacted_product_id: product.id,
            impacted_product_name: product.product_name,
            impacted_campaign_id: linkedCampaign?.id || null,
            impacted_campaign_name: linkedCampaign?.campaign_name || null,
            incident_conversation_id: incidentConversationId,
            blind_spot_summary: impact.blindSpot,
            consequence_summary: impact.consequence,
            recommended_fix: impact.recommendedFix,
            severity: impact.severity,
            status: "OPEN",
          })
          .select("*")
          .single();

        if (inserted) {
          alertsCreated.push(inserted as RegulatoryRippleAlertRecord);
        } else {
          alertsCreated.push(alertRow);
        }
      } catch {
        alertsCreated.push(alertRow);
      }

      await auditService.appendEvent({
        tenantId,
        actorId: "system_ripple_sentinel",
        actorType: "SYSTEM",
        action: "REGULATORY_RIPPLE_ALERT_CREATED",
        entityType: "CAMPAIGN_PRODUCT",
        entityId: product.id,
        eventData: {
          regulator,
          circularTitle: circular.title,
          productName: product.product_name,
          severity: impact.severity,
          incidentConversationId,
        },
      });
    }

    return alertsCreated;
  }

  /**
   * Lists Regulatory Ripple Alerts for a tenant.
   */
  public async listRippleAlerts(
    tenantId: string,
    status?: "OPEN" | "ACKNOWLEDGED" | "RESOLVED",
  ): Promise<RegulatoryRippleAlertRecord[]> {
    const supabase = createAdminSupabaseClient();
    let q = supabase
      .from("regulatory_ripple_alerts")
      .select("*")
      .eq("tenant_id", tenantId);

    if (status) {
      q = q.eq("status", status);
    }

    const { data, error } = await q
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) {
      logger.warn("Failed to list regulatory ripple alerts", {
        tenantId,
        error: error.message,
      });
      return [];
    }
    return (data || []) as RegulatoryRippleAlertRecord[];
  }

  private evaluateProductImpact(
    product: {
      id: string;
      product_name: string;
      product_type: string;
      interest_rate_min?: number | null;
      interest_rate_max?: number | null;
      interest_rate_type?: string | null;
      processing_fee_percent?: number | null;
      tenor_min_days?: number | null;
      tenor_max_days?: number | null;
      required_disclosures?: string[] | null;
    },
    regulator: string,
    circular: CircularRippleInput,
    corpus: string,
  ): {
    severity: "CRITICAL" | "HIGH" | "MEDIUM";
    blindSpot: string;
    consequence: string;
    recommendedFix: string;
  } | null {
    const prodType = (product.product_type || "").toUpperCase();
    const isCreditProduct =
      prodType.includes("LOAN") ||
      prodType.includes("LENDING") ||
      prodType.includes("CREDIT") ||
      prodType.includes("OVERDRAFT");

    const clauseRef = circular.clauseReference || "Section 4.2.1 / Mandatory Disclosure Clause";

    // Case 1: CBN / FCCPC circular affecting digital lending / APR / KFS / recovery / fees
    if (
      isCreditProduct &&
      (regulator === "CBN" ||
        regulator === "FCCPC" ||
        /\b(loan|lending|apr|interest|fee|kfs|key facts|deon|recovery|credit|tenor)\b/i.test(corpus))
    ) {
      const minTenor = Number(product.tenor_min_days ?? 30);
      const feePct = Number(product.processing_fee_percent ?? 0);
      return {
        severity: minTenor < 60 || feePct > 0 ? "CRITICAL" : "HIGH",
        blindSpot: `New ${regulator} circular ("${circular.title}") directly affects your '${product.product_name}' rate card (${clauseRef}). Your active schedule (${product.interest_rate_max ?? product.interest_rate_min ?? 5}% ${product.interest_rate_type || "MONTHLY"}, ${feePct}% processing fee, ${minTenor}-day minimum tenor) requires updated Key Facts Statement (KFS) and effective APR disclosures.`,
        consequence:
          regulator === "FCCPC"
            ? "Continuing to run campaigns under the superseded disclosure schedule triggers FCCPC DEON delisting, Google Play Store removal, and administrative penalties up to ₦100,000,000 or 1% of annual turnover under FCCPA Section 155."
            : "Non-alignment with the new CBN Consumer Protection circular exposes the institution to a ₦2,000,000 per-product penalty, mandatory campaign recall, and CBN examination sanctions.",
        recommendedFix: `Update the '${product.product_name}' required disclosures to include the revised ${regulator} ${clauseRef} Key Facts Statement (KFS) table and re-verify all active campaign revisions in 1 click.`,
      };
    }

    // Case 2: ARCON circular affecting all active promotional products
    if (
      regulator === "ARCON" ||
      /\b(arcon|asp|pre-vetting|advertising|influencer|social media)\b/i.test(corpus)
    ) {
      return {
        severity: "HIGH",
        blindSpot: `New ARCON enforcement notice ("${circular.title}", ${clauseRef}) tightens Advertising Standards Panel (ASP) pre-vetting requirements for '${product.product_name}' public creatives.`,
        consequence:
          "Publishing unvetted social, influencer, or OOH creatives without a valid ARCON/ASP Certificate ID carries a minimum ₦500,000 statutory fine per medium and immediate ad takedown under the ARCON Act 2022.",
        recommendedFix: `Attach a valid ARCON ASP Certificate ID to all '${product.product_name}' creatives and generate the updated ARCON Substantiation Memo before deployment.`,
      };
    }

    // Case 3: NDPC / SEC circular affecting deposits, investments, or data collection
    if (
      regulator === "NDPC" ||
      regulator === "SEC" ||
      /\b(ndpc|ndpa|consent|privacy|investment|yield|deposit)\b/i.test(corpus)
    ) {
      return {
        severity: "MEDIUM",
        blindSpot: `New ${regulator} directive ("${circular.title}", ${clauseRef}) impacts customer onboarding & promotional disclosures for '${product.product_name}'.`,
        consequence:
          "Violation of NDPC GAID 2025 or SEC investment solicitation rules exposes the institution to up to 2% of gross annual revenue in data protection fines or SEC enforcement action.",
        recommendedFix: `Append the unbundled NDPA 2023 Section 26 consent checkbox and statutory risk disclaimer to '${product.product_name}' landing pages.`,
      };
    }

    return null;
  }
}

export const regulatoryRippleService = new RegulatoryRippleService();
