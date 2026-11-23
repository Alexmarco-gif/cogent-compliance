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
  impacted_feature_id?: string | null;
  impacted_feature_name?: string | null;
  impacted_control_ids?: string[];
  impacted_control_codes?: string[];
  impacted_owner_roles?: string[];
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
   * Scans a tenant's active Product Rate Cards, Approved Campaigns, AND Live Governed
   * Product Features + Controls (`product_features` & `feature_controls`) against a new
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

    // -------------------------------------------------------------------------
    // 3. Enterprise Feature Governance Ripple Engine:
    //    Map new CBN/NFIU/NDPC/FCCPC/SEC circulars onto live & in-flight
    //    `product_features`, their specific `feature_controls`, and 3LoD `owner_roles`.
    // -------------------------------------------------------------------------
    const featureAlerts = await this.scanFeaturesAndControlsForRipple(
      tenantId,
      regulator,
      circular,
      corpus,
    );
    alertsCreated.push(...featureAlerts);

    return alertsCreated;
  }

  /**
   * Maps a regulatory circular directly onto live/in-flight `product_features`,
   * identifies impacted `feature_controls` and accountable Line-of-Defence `owner_roles`,
   * flags impacted controls for reassessment, and creates Feature Ripple Alerts.
   */
  public async scanFeaturesAndControlsForRipple(
    tenantId: string,
    regulator: string,
    circular: CircularRippleInput,
    corpus: string,
  ): Promise<RegulatoryRippleAlertRecord[]> {
    const supabase = createAdminSupabaseClient();
    const featureAlerts: RegulatoryRippleAlertRecord[] = [];

    let features: Array<{
      id: string;
      feature_code: string;
      feature_name: string;
      financial_activity_type: string;
      lifecycle_stage: string;
      applicable_regulators: string[];
      regulatory_domains: string[];
      owner_role: string;
    }> = [];

    try {
      const { data: featRows } = await supabase
        .from("product_features")
        .select(
          "id, feature_code, feature_name, financial_activity_type, lifecycle_stage, applicable_regulators, regulatory_domains, owner_role",
        )
        .eq("tenant_id", tenantId)
        .neq("lifecycle_stage", "RETIRED");
      if (Array.isArray(featRows)) {
        features = featRows;
      }
    } catch (err) {
      logger.warn("RegulatoryRippleService: failed to query product_features", {
        tenantId,
        error: (err as Error).message,
      });
      return [];
    }

    if (features.length === 0) return [];

    const matchedDomains = this.detectCircularDomains(regulator, corpus);

    for (const feature of features) {
      let controls: Array<{
        id: string;
        control_code: string;
        compliance_domain: string;
        regulator: string;
        owner_role: string;
        control_objective: string;
        verification_status: string;
      }> = [];

      try {
        const { data: ctrlRows } = await supabase
          .from("feature_controls")
          .select(
            "id, control_code, compliance_domain, regulator, owner_role, control_objective, verification_status",
          )
          .eq("tenant_id", tenantId)
          .eq("feature_id", feature.id);
        if (Array.isArray(ctrlRows)) {
          controls = ctrlRows;
        }
      } catch {
        controls = [];
      }

      const impactedControls = controls.filter(
        (c) =>
          matchedDomains.has(c.compliance_domain) ||
          c.regulator.toUpperCase().includes(regulator),
      );

      const featureRegMatches =
        Array.isArray(feature.applicable_regulators) &&
        feature.applicable_regulators.some((r) => r.toUpperCase() === regulator);

      if (impactedControls.length === 0 && !featureRegMatches) {
        continue;
      }

      const impactedControlIds = impactedControls.map((c) => c.id);
      const impactedControlCodes = impactedControls.map((c) => c.control_code);
      const ownerRoles = Array.from(
        new Set<string>([
          feature.owner_role,
          ...impactedControls.map((c) => c.owner_role),
          "CHIEF_COMPLIANCE_OFFICER",
        ]),
      );

      const severity: "CRITICAL" | "HIGH" | "MEDIUM" =
        matchedDomains.has("AML_CFT_CPF") ||
        matchedDomains.has("SANCTIONS") ||
        matchedDomains.has("DATA_PROTECTION") ||
        /automated\s+aml|baseline\s+standards|data\s+locali|bvn|nin|str|nfiu|freeze|sanction/i.test(corpus)
          ? "CRITICAL"
          : impactedControls.length >= 2
            ? "HIGH"
            : "MEDIUM";

      const blindSpotSummary = `New ${regulator} directive ("${circular.title}") impacts live/governed feature '${feature.feature_name}' (${feature.feature_code}, stage: ${feature.lifecycle_stage}) across ${impactedControlCodes.length > 0 ? `controls ${impactedControlCodes.join(", ")}` : `domains ${Array.from(matchedDomains).join(", ")}`}.`;
      const consequenceSummary = `Accountable Line-of-Defence owners (${ownerRoles.join(", ")}) must reassess control effectiveness and update SOPs/engineering logic; failing to align exposes the institution to ${regulator} supervisory sanctions, mandatory feature suspension, or audit findings.`;
      const recommendedFix = `Review impacted controls (${impactedControlCodes.join(", ") || "feature RIA"}), attach updated validation evidence, and record a Material Change / Regulatory Reassessment in Feature Governance before the compliance deadline.`;

      // Flag CRITICAL impacted VERIFIED controls for reassessment so Launch Gate / PIR cannot ignore circular drift
      if (severity === "CRITICAL" && impactedControlIds.length > 0) {
        try {
          await supabase
            .from("feature_controls")
            .update({
              verification_status: "REASSESSMENT_REQUIRED",
              verification_notes: `Flagged automatically by Regulatory Ripple Engine due to ${regulator} circular: "${circular.title}".`,
              updated_at: new Date().toISOString(),
            })
            .eq("tenant_id", tenantId)
            .eq("feature_id", feature.id)
            .in("id", impactedControlIds);
        } catch {
          // Non-fatal in unit mocks
        }
      }

      let incidentConversationId: string | null = null;
      try {
        const { data: conv } = await supabase
          .from("marketing_conversations")
          .insert({
            tenant_id: tenantId,
            created_by: "system_ripple_sentinel",
            title: `[Feature Ripple Alert] ${regulator}: ${feature.feature_name}`,
            context_type: "REGULATORY",
            status: "ACTIVE",
            metadata: {
              zero_prompt_source: "FEATURE_REGULATORY_RIPPLE_ENGINE",
              regulator,
              impacted_feature_id: feature.id,
              impacted_control_codes: impactedControlCodes,
              impacted_owner_roles: ownerRoles,
            },
          })
          .select("id")
          .single();

        if (conv?.id) {
          incidentConversationId = conv.id;
          await supabase.from("marketing_messages").insert({
            conversation_id: conv.id,
            tenant_id: tenantId,
            role: "ASSISTANT",
            content: [
              `### Feature Governance Regulatory Ripple Alert: ${circular.title}`,
              `**Impacted Feature:** \`${feature.feature_name}\` (\`${feature.feature_code}\`) — Stage: \`${feature.lifecycle_stage}\``,
              `**Impacted Controls:** ${impactedControlCodes.length > 0 ? impactedControlCodes.map((c) => `\`${c}\``).join(", ") : "Feature-level RIA"}`,
              `**Accountable Owners (3LoD):** ${ownerRoles.join(", ")}`,
              "",
              `1. **Exposure Identified:** ${blindSpotSummary}`,
              `2. **Supervisory Consequence:** ${consequenceSummary}`,
              `3. **Required Remediation:** ${recommendedFix}`,
            ].join("\n"),
            content_type: "TEXT",
            status: "COMPLETED",
            sequence_number: 1,
            metadata: {
              zero_prompt_source: "FEATURE_REGULATORY_RIPPLE_ENGINE",
              regulator,
              impacted_feature_id: feature.id,
            },
          });
        }
      } catch {
        // Non-fatal
      }

      const fallbackAlert: RegulatoryRippleAlertRecord = {
        id: `fripple_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        tenant_id: tenantId,
        regulatory_instrument_id: circular.instrumentId || null,
        regulator,
        circular_title: circular.title,
        impacted_feature_id: feature.id,
        impacted_feature_name: feature.feature_name,
        impacted_control_ids: impactedControlIds,
        impacted_control_codes: impactedControlCodes,
        impacted_owner_roles: ownerRoles,
        incident_conversation_id: incidentConversationId,
        blind_spot_summary: blindSpotSummary,
        consequence_summary: consequenceSummary,
        recommended_fix: recommendedFix,
        severity,
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
            impacted_feature_id: feature.id,
            impacted_feature_name: feature.feature_name,
            impacted_control_ids: impactedControlIds,
            impacted_control_codes: impactedControlCodes,
            impacted_owner_roles: ownerRoles,
            incident_conversation_id: incidentConversationId,
            blind_spot_summary: blindSpotSummary,
            consequence_summary: consequenceSummary,
            recommended_fix: recommendedFix,
            severity,
            status: "OPEN",
          })
          .select("*")
          .single();

        featureAlerts.push((inserted as RegulatoryRippleAlertRecord) || fallbackAlert);
      } catch {
        featureAlerts.push(fallbackAlert);
      }

      await auditService.appendEvent({
        tenantId,
        actorId: "system_ripple_sentinel",
        actorType: "SYSTEM",
        action: "FEATURE_REGULATORY_RIPPLE_MAPPED",
        entityType: "PRODUCT_FEATURE",
        entityId: feature.id,
        eventData: {
          regulator,
          circularTitle: circular.title,
          featureCode: feature.feature_code,
          impactedControlCodes,
          impactedOwnerRoles: ownerRoles,
          severity,
        },
      });
    }

    return featureAlerts;
  }

  private detectCircularDomains(regulator: string, corpus: string): Set<string> {
    const domains = new Set<string>();
    if (/aml|cft|cpf|money\s+laundering|automated\s+aml|str|suspicious\s+transaction|goaml|nfiu|mlppa/.test(corpus) || regulator === "NFIU") {
      domains.add("AML_CFT_CPF");
      domains.add("TRANSACTION_MONITORING");
      domains.add("RECORD_KEEPING");
    }
    if (/sanction|pep|terroris|watchlist|freeze/.test(corpus)) {
      domains.add("SANCTIONS");
    }
    if (/kyc|cdd|bvn|nin|tier[- ]?1|onboarding|identity/.test(corpus)) {
      domains.add("KYC_CDD");
    }
    if (/ndpc|ndpa|gaid|privacy|data\s+protection|data\s+locali|residency|breach|consent/.test(corpus) || regulator === "NDPC") {
      domains.add("DATA_PROTECTION");
      domains.add("INFOSEC");
    }
    if (/consumer|disclosure|fee|apr|kfs|key\s+facts|charge|lending|deon|fccpc/.test(corpus) || regulator === "FCCPC") {
      domains.add("CONSUMER_PROTECTION");
      domains.add("LICENSING_PERIMETER");
    }
    if (/dispute|complaint|chargeback|refund|duplicate\s+debit|48\s*hour|72\s*hour/.test(corpus)) {
      domains.add("DISPUTES_COMPLAINTS");
    }
    if (/fraud|cyber|authentication|mfa|unauthorized|account\s+takeover/.test(corpus)) {
      domains.add("FRAUD_PREVENTION");
      domains.add("INFOSEC");
    }
    if (/retention|record|audit\s+trail|5[- ]year/.test(corpus)) {
      domains.add("RECORD_KEEPING");
    }
    if (domains.size === 0) {
      domains.add("CONSUMER_PROTECTION");
      domains.add("LICENSING_PERIMETER");
    }
    return domains;
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
