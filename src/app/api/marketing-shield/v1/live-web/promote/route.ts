/**
 * Cogent Regulatory Intelligence Platform
 * Live Web Retrieval -> Verified Vault Promotion Endpoint
 * POST /api/marketing-shield/v1/live-web/promote
 */

import crypto from "crypto";
import { AppApiError, createApiHandler } from "@/lib/api-handler";
import { createAdminSupabaseClient } from "@/lib/supabase";
import { promoteLiveWebRequestSchema } from "@/contracts/search.contracts";
import { regulatoryRippleService } from "@/modules/regulatory-vault/regulatory-ripple.service";
import { auditService } from "@/modules/audit/audit.service";

export const dynamic = "force-dynamic";

export const POST = createApiHandler(
  {
    bodySchema: promoteLiveWebRequestSchema,
    requiredPermission: "knowledge.write",
  },
  async (_req, context) => {
    const supabase = createAdminSupabaseClient();
    const {
      live_web_retrieval_id,
      regulator_acronym,
      instrument_title,
      jurisdiction_code,
      trigger_ripple_scan,
    } = context.body;

    // 1. Load live web retrieval scoped strictly to caller tenant
    const { data: retrieval, error: retErr } = await supabase
      .from("live_web_retrievals")
      .select("*")
      .eq("tenant_id", context.tenant.tenantId)
      .eq("id", live_web_retrieval_id)
      .maybeSingle();

    if (retErr || !retrieval) {
      throw new AppApiError("NOT_FOUND", "Live web retrieval record not found for tenant", 404);
    }

    if (retrieval.promoted_instrument_id) {
      return {
        already_promoted: true,
        instrument_id: retrieval.promoted_instrument_id,
        ripple_alerts_count: 0,
      };
    }

    // 2. Resolve or create regulatory_bodies record
    const normalizedAcronym = regulator_acronym.trim().toUpperCase();
    let regulatorId: string | null = null;
    const { data: existingReg } = await supabase
      .from("regulatory_bodies")
      .select("id")
      .eq("acronym", normalizedAcronym)
      .maybeSingle();

    if (existingReg?.id) {
      regulatorId = existingReg.id;
    } else {
      let domain = "cbn.gov.ng";
      try {
        domain = new URL(String(retrieval.retrieved_url)).hostname;
      } catch {
        // ignore parse failure
      }
      const { data: newReg, error: regErr } = await supabase
        .from("regulatory_bodies")
        .insert({
          name: `${normalizedAcronym} Regulatory Authority`,
          acronym: normalizedAcronym,
          official_domain: domain,
          status: "ACTIVE",
        })
        .select("id")
        .single();
      if (regErr || !newReg) {
        throw new Error(`Failed to resolve regulatory body: ${regErr?.message || "Unknown"}`);
      }
      regulatorId = newReg.id;
    }

    // 3. Insert regulatory_instruments + regulatory_document_versions + regulatory_clauses
    const snippetBody =
      String(retrieval.full_content_excerpt || retrieval.snippet_content || instrument_title).trim();
    const contentHash = crypto
      .createHash("sha256")
      .update(`${retrieval.retrieved_url}:${snippetBody}`)
      .digest("hex");
    const todayIso = new Date().toISOString().split("T")[0]!;

    const { data: instrument, error: instErr } = await supabase
      .from("regulatory_instruments")
      .insert({
        regulator_id: regulatorId,
        title: instrument_title,
        instrument_type: "CIRCULAR",
        jurisdiction: (jurisdiction_code || "NG").toUpperCase(),
        description: snippetBody.slice(0, 800),
        status: "ACTIVE",
      })
      .select("id")
      .single();

    if (instErr || !instrument) {
      throw new Error(`Failed to promote regulatory instrument: ${instErr?.message || "Unknown"}`);
    }

    const { data: docVer, error: verErr } = await supabase
      .from("regulatory_document_versions")
      .insert({
        instrument_id: instrument.id,
        version_number: "1.0-promoted",
        source_url: retrieval.retrieved_url,
        document_hash: contentHash,
        storage_key: `promoted-web/${instrument.id}/${live_web_retrieval_id}.txt`,
        publication_date: todayIso,
        effective_date: todayIso,
        verification_status: "VERIFIED_OFFICIAL_SOURCE",
        lifecycle_status: "CURRENT",
        verified_by: context.tenant.userId,
        verified_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (verErr || !docVer) {
      throw new Error(`Failed to create regulatory document version: ${verErr?.message || "Unknown"}`);
    }

    const { data: clause } = await supabase
      .from("regulatory_clauses")
      .insert({
        document_version_id: docVer.id,
        clause_reference: "Promoted Live Regulatory Update §1",
        clause_text: snippetBody.slice(0, 6000),
        extraction_status: "VERIFIED",
        verification_status: "VERIFIED",
      })
      .select("id")
      .single();

    await supabase
      .from("live_web_retrievals")
      .update({ promoted_instrument_id: instrument.id })
      .eq("tenant_id", context.tenant.tenantId)
      .eq("id", live_web_retrieval_id);

    // 4. Optional Ripple Scan against tenant Product Rate Cards & Campaigns
    let rippleAlertsCount = 0;
    if (trigger_ripple_scan) {
      const alerts = await regulatoryRippleService.scanTenantForCircularRipple(
        context.tenant.tenantId,
        {
          instrumentId: instrument.id,
          regulator: normalizedAcronym,
          title: instrument_title,
          summaryText: snippetBody,
          sourceUrl: retrieval.retrieved_url,
        }
      );
      rippleAlertsCount = alerts.length;
    }

    await auditService.appendEvent({
      tenantId: context.tenant.tenantId,
      actorId: context.tenant.userId,
      actorType: "USER",
      action: "LIVE_WEB_PROMOTED_TO_VAULT",
      entityType: "REGULATORY_INSTRUMENT",
      entityId: instrument.id,
      eventData: {
        liveWebRetrievalId: live_web_retrieval_id,
        sourceUrl: retrieval.retrieved_url,
        regulator: normalizedAcronym,
        rippleAlertsCount,
      },
    });

    return {
      already_promoted: false,
      instrument_id: instrument.id,
      version_id: docVer.id,
      clause_id: clause?.id || null,
      ripple_alerts_count: rippleAlertsCount,
    };
  }
);
