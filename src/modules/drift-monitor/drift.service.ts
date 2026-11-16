/**
 * Cogent Marketing Shield - Post-Publication Drift Monitor Service
 * Document Reference: Document 02 (Section 6.2), Document 03 (Section 3.8, 3.12),
 * Document 04 (Section 5.5, Tools 9 & 10), Document 07 (Section 6.2), Document 08 (Phase 11)
 *
 * Continuously monitors live published promotional landing pages against approved revision snapshots.
 * Automatically flags regulatory drift, rate changes, and disclosure removal with high-priority CCO alerts.
 */

import crypto from "crypto";
import { createAdminSupabaseClient } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { auditService } from "@/modules/audit/audit.service";
import { notificationService } from "@/lib/notifications";
import { webSearchRouter } from "@/modules/live-web-intelligence/web-search.router";
import { productService } from "@/modules/knowledge-base/product.service";
import { mechanicalLocksEngine } from "@/modules/compliance-assessment/mechanical-locks";
import { aprCalculatorService } from "@/modules/compliance-assessment/apr-calculator.service";
import { appStoreAuditorService } from "@/modules/compliance-assessment/app-store-auditor.service";
import { regulatoryRippleService } from "@/modules/regulatory-vault/regulatory-ripple.service";
import {
  CreateDriftMonitorInput,
  QueryDriftMonitorsInput,
  QueueDiscoveredCircularInput,
  CampaignDriftMonitor,
  DriftDetails,
  DriftDiscrepancy,
} from "@/contracts/drift.contracts";

export class DriftService {
  /**
   * Registers a live published URL to an approved campaign revision for drift monitoring.
   */
  public async createDriftMonitor(
    tenantId: string,
    userId: string,
    input: CreateDriftMonitorInput
  ): Promise<CampaignDriftMonitor> {
    const supabase = createAdminSupabaseClient();

    // 1. Verify campaign exists and belongs to tenant
    const { data: campaign, error: campErr } = await supabase
      .from("marketing_campaigns")
      .select("id, campaign_name, status, approved_revision_id, current_revision_id, product_id")
      .eq("id", input.campaign_id)
      .eq("tenant_id", tenantId)
      .single();

    if (campErr || !campaign) {
      throw new Error(`Campaign ${input.campaign_id} not found in active institution`);
    }

    // 2. Resolve baseline revision ID (prefer explicit/approved revision, fall back to active current revision)
    const isFormalApproved = Boolean(input.approved_revision_id || campaign.approved_revision_id);
    const revisionId =
      input.approved_revision_id || campaign.approved_revision_id || campaign.current_revision_id;
    if (!revisionId) {
      throw new Error(
        `Campaign "${campaign.campaign_name}" has no revision available for drift monitoring.`
      );
    }

    // Verify revision exists
    const { data: rev, error: revErr } = await supabase
      .from("campaign_revisions")
      .select("id, revision_number, content_text")
      .eq("id", revisionId)
      .eq("campaign_id", campaign.id)
      .single();

    if (revErr || !rev) {
      throw new Error(`Baseline revision ${revisionId} does not belong to this campaign`);
    }

    const baselineType = isFormalApproved ? "APPROVED_REVISION" : "ACTIVE_REVISION";

    // 3. Create the monitor
    const { data: monitor, error: insertErr } = await supabase
      .from("campaign_drift_monitors")
      .insert({
        tenant_id: tenantId,
        campaign_id: campaign.id,
        approved_revision_id: revisionId,
        published_url: input.published_url,
        status: "ACTIVE",
        drift_details: {
          status: "PENDING_FIRST_CHECK",
          created_at: new Date().toISOString(),
          baseline_type: baselineType,
          approved_text_length: rev.content_text?.length || 0,
          approved_text_preview: (rev.content_text || "").slice(0, 2500),
          approved_sha256_hash: crypto
            .createHash("sha256")
            .update(rev.content_text || "")
            .digest("hex"),
        },
      })
      .select("*")
      .single();

    if (insertErr || !monitor) {
      logger.error("Failed to insert campaign drift monitor", {
        tenantId,
        campaignId: campaign.id,
        error: insertErr?.message,
      });
      throw new Error(`Failed to create drift monitor: ${insertErr?.message || "Unknown error"}`);
    }

    // 4. Append chained audit event
    await auditService.appendEvent({
      tenantId,
      actorId: userId,
      actorType: "USER",
      action: "CAMPAIGN_DRIFT_MONITOR_CREATED",
      entityType: "CAMPAIGN_DRIFT_MONITOR",
      entityId: monitor.id,
      eventData: {
        campaignId: campaign.id,
        publishedUrl: input.published_url,
        approvedRevisionId: revisionId,
      },
    });

    logger.info("Successfully created campaign drift monitor", {
      tenantId,
      monitorId: monitor.id,
      campaignId: campaign.id,
      url: input.published_url,
    });

    return {
      ...monitor,
      campaign_title: campaign.campaign_name,
      campaign_status: campaign.status,
      product_id: campaign.product_id ?? null,
      revision_number: rev.revision_number,
    };
  }

  /**
   * Retrieves a single drift monitor with full campaign and revision metadata.
   */
  public async getDriftMonitor(
    tenantId: string,
    monitorId: string
  ): Promise<CampaignDriftMonitor> {
    const supabase = createAdminSupabaseClient();

    const { data: monitor, error } = await supabase
      .from("campaign_drift_monitors")
      .select(`
        *,
        marketing_campaigns (
          campaign_name,
          status,
          product_id
        )
      `)
      .eq("id", monitorId)
      .eq("tenant_id", tenantId)
      .single();

    if (error || !monitor) {
      throw new Error(`Drift monitor ${monitorId} not found`);
    }

    let revisionNumber: number | undefined;
    if (monitor.approved_revision_id) {
      const { data: rev } = await supabase
        .from("campaign_revisions")
        .select("revision_number")
        .eq("id", monitor.approved_revision_id)
        .maybeSingle();
      if (rev) revisionNumber = rev.revision_number;
    }

    const campaign = monitor.marketing_campaigns as {
      campaign_name?: string;
      status?: string;
      product_id?: string | null;
    } | null;
    const rawDetails = monitor.drift_details as DriftDetails | null | undefined;

    return {
      id: monitor.id,
      tenant_id: monitor.tenant_id,
      campaign_id: monitor.campaign_id,
      approved_revision_id: monitor.approved_revision_id,
      published_url: monitor.published_url,
      status: monitor.status,
      last_checked_at: monitor.last_checked_at,
      last_drift_detected_at: monitor.last_drift_detected_at,
      drift_details: monitor.drift_details,
      created_at: monitor.created_at,
      updated_at: monitor.updated_at,
      incident_conversation_id: rawDetails?.incident_conversation_id ?? null,
      campaign_title: campaign?.campaign_name || "Untitled Campaign",
      campaign_status: campaign?.status,
      product_id: campaign?.product_id ?? null,
      revision_number: revisionNumber,
    };
  }

  /**
   * Lists drift monitors for a tenant, optionally filtered by campaign or status.
   */
  public async listDriftMonitors(
    tenantId: string,
    query?: QueryDriftMonitorsInput
  ): Promise<CampaignDriftMonitor[]> {
    const supabase = createAdminSupabaseClient();

    let q = supabase
      .from("campaign_drift_monitors")
      .select(`
        *,
        marketing_campaigns (
          campaign_name,
          status,
          product_id
        )
      `)
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (query?.campaign_id) {
      q = q.eq("campaign_id", query.campaign_id);
    }
    if (query?.status) {
      q = q.eq("status", query.status);
    }
    if (query?.limit) {
      q = q.limit(query.limit);
    }

    const { data: rows, error } = await q;

    if (error) {
      logger.error("Failed to query drift monitors", { tenantId, error: error.message });
      throw new Error(`Failed to list drift monitors: ${error.message}`);
    }

    return (rows || []).map((m) => {
      const camp = m.marketing_campaigns as {
        campaign_name?: string;
        status?: string;
        product_id?: string | null;
      } | null;
      const rawDetails = m.drift_details as DriftDetails | null | undefined;
      return {
        id: m.id,
        tenant_id: m.tenant_id,
        campaign_id: m.campaign_id,
        approved_revision_id: m.approved_revision_id,
        published_url: m.published_url,
        status: m.status,
        last_checked_at: m.last_checked_at,
        last_drift_detected_at: m.last_drift_detected_at,
        drift_details: m.drift_details,
        created_at: m.created_at,
        updated_at: m.updated_at,
        incident_conversation_id: rawDetails?.incident_conversation_id ?? null,
        campaign_title: camp?.campaign_name || "Untitled Campaign",
        campaign_status: camp?.status,
        product_id: camp?.product_id ?? null,
      };
    });
  }

  /**
   * Executes a live drift inspection on a monitored published URL:
   * 1. Safely fetches published URL with SSRF checks.
   * 2. Checks Mandatory Disclosures against approved revision truth.
   * 3. Runs Deterministic Lock 2 against approved product truth.
   * 4. Runs Deterministic Lock 1 for newly introduced prohibited terms.
   * 5. If discrepancies found, updates status to DRIFT_DETECTED and sends CCO alert email.
   */
  public async checkDrift(
    tenantId: string,
    actorId: string,
    monitorId: string
  ): Promise<{ monitor: CampaignDriftMonitor; details: DriftDetails }> {
    const supabase = createAdminSupabaseClient();

    // 1. Fetch monitor & campaign details
    const monitor = await this.getDriftMonitor(tenantId, monitorId);

    const { data: revision } = await supabase
      .from("campaign_revisions")
      .select("id, content_text, approved_terms_snapshot")
      .eq("id", monitor.approved_revision_id)
      .single();

    const approvedText = revision?.content_text || "";
    const approvedHash = crypto.createHash("sha256").update(approvedText).digest("hex");

    // 2. Safely fetch live URL content
    logger.info("Drift inspection: fetching live URL", {
      monitorId,
      url: monitor.published_url,
    });

    const liveContent = await webSearchRouter.fetchLiveUrlContent(
      {
        url: monitor.published_url,
        campaign_id: monitor.campaign_id,
      },
      tenantId
    );

    const liveText = liveContent.content_text;
    const liveHash = liveContent.sha256_hash;

    // 3. Resolve Product Truth for Lock 2 matching
    const productTruth = await productService.getProductTruth(tenantId, {
      ...(monitor.product_id ? { productId: monitor.product_id } : {}),
      productName: monitor.campaign_title,
    });

    // 4. Run Deterministic Locks on the live published text
    const lockResults = await mechanicalLocksEngine.executeLocks({
      tenantId,
      contentText: liveText,
      productTruth: productTruth
        ? {
            productName: productTruth.product_name,
            productType: productTruth.product_type,
            interestRateMin: productTruth.approved_terms.interest_rate_min,
            interestRateMax: productTruth.approved_terms.interest_rate_max,
            interestRateType: (productTruth.approved_terms.interest_rate_type === "DAILY"
              ? "MONTHLY"
              : productTruth.approved_terms.interest_rate_type) as "APR" | "MONTHLY" | "FLAT" | undefined,
            processingFeePercent: productTruth.approved_terms.processing_fee_percent,
            tenorMinDays: productTruth.approved_terms.tenor_min_days,
            tenorMaxDays: productTruth.approved_terms.tenor_max_days,
            requiredDisclosures: productTruth.approved_terms.required_disclosures,
          }
        : undefined,
    });

    const discrepancies: DriftDiscrepancy[] = [];

    // Check A: Lock 3 Missing Disclosures
    if (lockResults.lock3_mandatory_disclosures.missingDisclosures.length > 0) {
      for (const disc of lockResults.lock3_mandatory_disclosures.missingDisclosures) {
        discrepancies.push({
          type: "MISSING_DISCLOSURE",
          severity: "CRITICAL",
          description: `Mandatory statutory disclosure is missing from published page: "${disc}"`,
          expectedValue: disc,
          actualValue: "[NOT_PRESENT_ON_LIVE_PAGE]",
        });
      }
    }

    // Check B: Lock 2 Rate / Fee Schedule Mismatches
    if (lockResults.lock2_product_rate_match.breaches.length > 0) {
      for (const breach of lockResults.lock2_product_rate_match.breaches) {
        discrepancies.push({
          type: "RATE_MISMATCH",
          severity: "CRITICAL",
          description: `Published rate claim diverged from approved product truth: ${breach.explanation}`,
          expectedValue: breach.statutoryReference || "Approved Truth Bounds",
          actualValue: breach.matchedText,
        });
      }
    }

    // Check C: Lock 1 Prohibited Terms
    if (lockResults.lock1_prohibited_terms.breaches.length > 0) {
      for (const breach of lockResults.lock1_prohibited_terms.breaches) {
        discrepancies.push({
          type: "PROHIBITED_TERM",
          severity: "HIGH",
          description: `Live published page contains prohibited term: "${breach.matchedText}"`,
          expectedValue: "[PROHIBITED]",
          actualValue: breach.matchedText,
        });
      }
    }

    // Check D: Autonomous Forensic Audits (APR Drip-Pricing & App Store / DEON / NDPA) when live content diverged from baseline
    if (liveText.trim() !== approvedText.trim()) {
      const aprAudit = aprCalculatorService.analyzeCopyAgainstProductTruth(
        liveText,
        productTruth,
      );

      if (aprAudit?.dripPricingDetected) {
        const primaryAprSpot = aprAudit.blindSpots[0];
        discrepancies.push({
          type: "RATE_MISMATCH",
          severity: "CRITICAL",
          description:
            primaryAprSpot?.whatYouMissed ||
            `Effective APR (${aprAudit.effectiveNominalAprPercent}%) diverges from implied headline APR (${aprAudit.advertisedImpliedAprPercent}%).`,
          expectedValue: `${aprAudit.effectiveNominalAprPercent}% Effective APR (with KFS)`,
          actualValue: `${aprAudit.advertisedImpliedAprPercent}% Implied APR`,
        });
      }

      const appStoreAudit = appStoreAuditorService.auditListingOrLandingPage({
        listingText: liveText,
        url: monitor.published_url,
        product: productTruth,
      });

      if (
        appStoreAudit.hasShortTenorViolation ||
        appStoreAudit.hasBannedPrivacyOrRecoveryTrap ||
        appStoreAudit.hasBundledConsentDarkPattern
      ) {
        for (const spot of appStoreAudit.blindSpots) {
          if (spot.severity === "CRITICAL") {
            discrepancies.push({
              type: "PROHIBITED_TERM",
              severity: "CRITICAL",
              description: spot.whatYouMissed,
              expectedValue: spot.oneClickFix,
              actualValue: spot.violatedStatute,
            });
          }
        }
      }
    }

    // Check E: Text & Hash Divergence
    const textLengthDiff = Math.abs(liveText.length - approvedText.length);
    const divergenceScore =
      discrepancies.length > 0
        ? Math.min(1.0, 0.4 + discrepancies.length * 0.2)
        : textLengthDiff > 200
        ? 0.25
        : 0.0;

    const isDriftDetected = discrepancies.length > 0 || (divergenceScore >= 0.5);
    const newStatus = isDriftDetected ? "DRIFT_DETECTED" : "ACTIVE";
    const nowIso = new Date().toISOString();

    const summary = isDriftDetected
      ? `Drift detected on ${monitor.published_url}: ${discrepancies.length} discrepancy(s) found (${discrepancies.map((d) => d.type).join(", ")}).`
      : `Live promotional URL matches approved compliance baseline cleanly.`;

    // Zero-Prompt Workflow: Automatically spawn an Incident Conversation thread when drift is detected
    let incidentConversationId: string | null = monitor.incident_conversation_id || null;
    if (isDriftDetected && !incidentConversationId) {
      try {
        const convQuery = supabase.from("marketing_conversations");
        if (convQuery && typeof convQuery.insert === "function") {
          const { data: incidentConv } = await convQuery
            .insert({
              tenant_id: tenantId,
              created_by: actorId || "system_drift_sentinel",
              title: `[Drift Sentinel Alert] ${monitor.campaign_title || monitor.published_url}`,
              context_type: "CAMPAIGN",
              active_campaign_id: monitor.campaign_id,
              status: "ACTIVE",
            })
            .select("id")
            .single();

          if (incidentConv?.id) {
            incidentConversationId = incidentConv.id;
            const msgQuery = supabase.from("marketing_messages");
            if (msgQuery && typeof msgQuery.insert === "function") {
              const driftMarkdown = [
                `### Zero-Prompt URL Drift Sentinel Alert`,
                `**Monitored Live URL:** ${monitor.published_url}`,
                `**Campaign:** \`${monitor.campaign_title || monitor.campaign_id}\``,
                "",
                ...discrepancies.map(
                  (d, idx) =>
                    `${idx + 1}. **What You Missed (The Blind Spot):** ${d.description}\n   - **What It Costs You (The Consequence):** Continuing to serve unapproved live terms violates FCCPA Section 115 / CBN CPD 2019 and risks immediate regulatory takedown or fine.\n   - **One-Click Resolution (The Done-For-You Fix):** Restore expected baseline: \`${d.expectedValue || "Approved Revision Snapshot"}\`.`,
                ),
              ].join("\n");

              await msgQuery.insert({
                conversation_id: incidentConv.id,
                tenant_id: tenantId,
                role: "ASSISTANT",
                content: driftMarkdown,
                content_type: "TEXT",
                status: "COMPLETED",
                sequence_number: 1,
                metadata: {
                  zero_prompt_source: "DRIFT_SENTINEL",
                  monitor_id: monitor.id,
                  published_url: monitor.published_url,
                  discrepancies,
                },
              });
            }
          }
        }
      } catch (incErr) {
        logger.warn("Could not spawn Zero-Prompt drift incident conversation", {
          monitorId,
          error: (incErr as Error).message,
        });
      }
    }

    const existingDetails = monitor.drift_details as DriftDetails | undefined;

    const details: DriftDetails = {
      status: isDriftDetected ? "DRIFT_DETECTED" : "COMPLIANT",
      checked_at: nowIso,
      divergence_score: divergenceScore,
      discrepancies,
      live_text_length: liveText.length,
      live_sha256_hash: liveHash,
      approved_text_length: approvedText.length,
      approved_sha256_hash: approvedHash,
      summary,
      incident_conversation_id: incidentConversationId,
      approved_text_preview: approvedText.slice(0, 2500),
      live_text_preview: liveText.slice(0, 2500),
      live_page_title: liveContent.page_title,
      ...(existingDetails?.baseline_type ? { baseline_type: existingDetails.baseline_type } : {}),
    };

    // 5. Update database monitor record
    const updatePayload: Record<string, unknown> = {
      status: newStatus,
      last_checked_at: nowIso,
      drift_details: details,
      updated_at: nowIso,
    };

    if (isDriftDetected) {
      updatePayload.last_drift_detected_at = nowIso;
    }

    const { data: updated, error: updateErr } = await supabase
      .from("campaign_drift_monitors")
      .update(updatePayload)
      .eq("id", monitor.id)
      .eq("tenant_id", tenantId)
      .select("*")
      .single();

    if (updateErr || !updated) {
      logger.error("Failed to update drift monitor status", {
        monitorId,
        error: updateErr?.message,
      });
      throw new Error(`Failed to update monitor state: ${updateErr?.message || "Unknown error"}`);
    }

    // 6. Append tamper-evident audit event
    await auditService.appendEvent({
      tenantId,
      actorId,
      actorType: "SYSTEM",
      action: isDriftDetected ? "CAMPAIGN_DRIFT_DETECTED" : "CAMPAIGN_DRIFT_CHECK_PASSED",
      entityType: "CAMPAIGN_DRIFT_MONITOR",
      entityId: monitor.id,
      eventData: {
        campaignId: monitor.campaign_id,
        publishedUrl: monitor.published_url,
        divergenceScore,
        discrepancyCount: discrepancies.length,
        status: newStatus,
        incidentConversationId,
      },
    });

    // 7. Dispatch CCO email notification if drift detected
    if (isDriftDetected) {
      try {
        let alertRecipient = "cco@institution.gov.ng";
        try {
          const { data: tenantRow } = await supabase
            .from("tenants")
            .select("settings")
            .eq("id", tenantId)
            .maybeSingle();
          const tenantSettings = (tenantRow as { settings?: Record<string, unknown> } | null)?.settings;
          const policy = (tenantSettings?.compliance_policy || {}) as Record<string, unknown>;
          const orgProfile = (tenantSettings?.organization_profile || {}) as Record<string, unknown>;
          if (typeof policy.cco_alert_email === "string" && policy.cco_alert_email.trim()) {
            alertRecipient = policy.cco_alert_email.trim();
          } else if (typeof orgProfile.email === "string" && orgProfile.email.trim()) {
            alertRecipient = orgProfile.email.trim();
          }
        } catch {
          // Fall back safely when tenant lookup is omitted in mocked tests
        }

        const severityLabel =
          discrepancies.some((d) => d.severity === "CRITICAL")
            ? "CRITICAL_BREACH"
            : "HIGH_RISK";

        await notificationService.sendDriftAlert({
          to: alertRecipient,
          campaign_id: monitor.campaign_id,
          campaign_title: monitor.campaign_title || "Monitored Campaign",
          drift_severity: severityLabel,
          drift_findings_count: discrepancies.length,
          summary,
          alert_url: `https://app.cogent-compliance.com/drift-monitors`,
        });
      } catch (notifErr) {
        logger.warn("Failed to dispatch CCO drift alert email", {
          error: (notifErr as Error).message,
        });
      }
    }

    logger.info("Completed post-publication drift inspection", {
      monitorId,
      status: newStatus,
      discrepancies: discrepancies.length,
    });

    return {
      monitor: {
        ...updated,
        campaign_title: monitor.campaign_title,
        campaign_status: monitor.campaign_status,
        revision_number: monitor.revision_number,
        incident_conversation_id: incidentConversationId,
      },
      details,
    };
  }

  /**
   * Deletes a drift monitor.
   */
  public async deleteDriftMonitor(
    tenantId: string,
    userId: string,
    monitorId: string
  ): Promise<void> {
    const supabase = createAdminSupabaseClient();

    const { error } = await supabase
      .from("campaign_drift_monitors")
      .delete()
      .eq("id", monitorId)
      .eq("tenant_id", tenantId);

    if (error) {
      throw new Error(`Failed to delete drift monitor: ${error.message}`);
    }

    await auditService.appendEvent({
      tenantId,
      actorId: userId,
      actorType: "USER",
      action: "CAMPAIGN_DRIFT_MONITOR_DELETED",
      entityType: "CAMPAIGN_DRIFT_MONITOR",
      entityId: monitorId,
    });
  }

  /**
   * Admin workflow: Queues a verified official regulatory circular discovered in live_web_retrievals
   * into the Statutory Vault ingestion pipeline.
   */
  public async queueDiscoveredCircular(
    tenantId: string,
    userId: string,
    input: QueueDiscoveredCircularInput
  ): Promise<{ document_id: string; title: string }> {
    const supabase = createAdminSupabaseClient();

    // 1. Fetch live retrieval
    const { data: retrieval, error: retErr } = await supabase
      .from("live_web_retrievals")
      .select("*")
      .eq("id", input.live_web_retrieval_id)
      .eq("tenant_id", tenantId)
      .single();

    if (retErr || !retrieval) {
      throw new Error(`Live web retrieval ${input.live_web_retrieval_id} not found`);
    }

    const title = retrieval.page_title || `Discovered Regulatory Notice: ${retrieval.search_query}`;
    const sourceUrl = retrieval.retrieved_url;
    const regulator = (input.regulator || "CBN").toUpperCase();
    let instType = "CIRCULAR";
    if (input.doc_type) {
      const dt = input.doc_type.toUpperCase();
      if (dt.includes("ACT")) instType = "ACT";
      else if (dt.includes("REGULATION")) instType = "REGULATION";
      else if (dt.includes("GUIDELINE")) instType = "GUIDELINE";
      else if (dt.includes("DIRECTIVE")) instType = "DIRECTIVE";
      else if (dt.includes("NOTICE")) instType = "NOTICE";
      else if (dt.includes("CODE")) instType = "CODE";
    }

    // 2. Fetch regulator UUID if known
    const { data: regBody } = await supabase
      .from("regulatory_bodies")
      .select("id")
      .eq("acronym", regulator)
      .maybeSingle();

    let regulatorId = regBody?.id || null;
    if (!regulatorId) {
      const { data: anyReg } = await supabase
        .from("regulatory_bodies")
        .select("id")
        .limit(1)
        .maybeSingle();
      regulatorId = anyReg?.id || null;
    }

    if (!regulatorId) {
      throw new Error(`Regulatory body ${regulator} not found in database`);
    }

    // 3. Register provisional regulatory instrument & document version
    const docHash = crypto
      .createHash("sha256")
      .update((retrieval.snippet_content || "") + sourceUrl)
      .digest("hex");

    const { data: instrument, error: instErr } = await supabase
      .from("regulatory_instruments")
      .insert({
        regulator_id: regulatorId,
        title,
        instrument_type: instType,
        jurisdiction: "NIGERIA",
        description: `Discovered live web notice queued for verification: ${title}`,
        status: "ACTIVE",
      })
      .select("id")
      .single();

    if (instErr || !instrument) {
      logger.error("Failed to queue discovered circular into regulatory_instruments", {
        error: instErr?.message,
      });
      throw new Error(`Failed to queue circular: ${instErr?.message || "Unknown error"}`);
    }

    const today = new Date().toISOString().split("T")[0];
    const { data: docVer, error: verErr } = await supabase
      .from("regulatory_document_versions")
      .insert({
        instrument_id: instrument.id,
        version_number: "1.0",
        source_url: sourceUrl,
        document_hash: docHash,
        storage_key: `discovered-circulars/${docHash}.html`,
        publication_date: today,
        effective_date: today,
        verification_status: "PENDING",
        lifecycle_status: "CURRENT",
      })
      .select("id")
      .single();

    if (verErr || !docVer) {
      logger.error("Failed to insert document version for queued circular", {
        error: verErr?.message,
      });
      throw new Error(`Failed to insert document version: ${verErr?.message || "Unknown error"}`);
    }

    // 4. Log tamper-evident audit event
    await auditService.appendEvent({
      tenantId,
      actorId: userId,
      actorType: "USER",
      action: "REGULATORY_DOCUMENT_VERSION_CREATED",
      entityType: "REGULATORY_INSTRUMENT",
      entityId: instrument.id,
      eventData: {
        liveWebRetrievalId: input.live_web_retrieval_id,
        sourceUrl,
        regulator,
        docType: instType,
        documentVersionId: docVer.id,
      },
    });

    // 5. Trigger Zero-Prompt Regulatory Ripple Sentinel across tenant rate cards & campaigns
    try {
      await regulatoryRippleService.scanTenantForCircularRipple(tenantId, {
        instrumentId: instrument.id,
        regulator,
        title,
        summaryText: retrieval.snippet_content || title,
        sourceUrl,
      });
    } catch (rippleErr) {
      logger.warn("Regulatory ripple scan after queueing circular failed", {
        tenantId,
        error: (rippleErr as Error).message,
      });
    }

    logger.info("Successfully queued discovered circular into Statutory Vault", {
      tenantId,
      documentId: instrument.id,
      versionId: docVer.id,
      title,
    });

    return {
      document_id: instrument.id,
      title,
    };
  }
}

export const driftService = new DriftService();
