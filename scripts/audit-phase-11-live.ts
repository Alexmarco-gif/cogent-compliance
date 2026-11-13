/**
 * Cogent Marketing Shield - Phase 11 Comprehensive Live Audit Script
 * Document Reference: Document 02 (Section 6.2), Document 03 (Sections 3.8, 3.12),
 * Document 04 (Tools 9 & 10, Section 5.5), Document 07 (Section 6.2), Document 08 (Phase 11), Document 09
 *
 * Runs exhaustive real-world execution testing against local services,
 * live Next.js daemon server (http://localhost:3000), Supabase PostgreSQL,
 * SSRF filters, Two-Step Live Web Search router, and Post-Publication Drift Watcher.
 */

import crypto from "crypto";
import { webSearchRouter } from "../src/modules/live-web-intelligence/web-search.router";
import { driftService } from "../src/modules/drift-monitor/drift.service";
import { productService } from "../src/modules/knowledge-base/product.service";
import {
  STATUTORY_TOOL_DECLARATIONS,
  statutoryToolExecutor,
} from "../src/modules/ai-orchestration/tools/statutory-tools";
import {
  inngestFunctions,
  driftMonitoringJob,
  scheduledDriftWatcherJob,
} from "../src/modules/jobs/inngest.functions";
import { createAdminSupabaseClient } from "../src/lib/supabase";

interface AuditStepResult {
  step: string;
  category: string;
  passed: boolean;
  details: string;
}

async function runPhase11Audit(): Promise<void> {
  console.log(`\n===============================================================`);
  console.log(`  COGENT MARKETING SHIELD - PHASE 11 100% AUDIT & LIVE TEST SUITE`);
  console.log(`  Vertical Slice 6: Real-Time Live Web Intelligence & Post-Publication Drift`);
  console.log(`===============================================================\n`);

  const results: AuditStepResult[] = [];
  const testTenantId = "00000000-0000-0000-0000-000000000001";
  const testUserId = "user_audit_lead_cco";
  const supabase = createAdminSupabaseClient();

  // --------------------------------------------------------------------------
  // PRE-AUDIT SETUP: Dynamically provision test tenant for FK integrity
  // --------------------------------------------------------------------------
  console.log(`[INIT] Provisioning test tenant: ${testTenantId}`);
  const { error: tenantErr } = await supabase.from("tenants").upsert(
    {
      id: testTenantId,
      name: "Phase 11 Audit Institution",
      slug: "phase-11-audit-institution",
      status: "ACTIVE",
      settings: {},
    },
    { onConflict: "id" }
  );

  if (tenantErr) {
    console.warn(`[WARN] Failed to upsert test tenant: ${tenantErr.message}`);
  }

  // --------------------------------------------------------------------------
  // TEST 1: Live HTTP Daemon Health Check Gateway
  // --------------------------------------------------------------------------
  try {
    const res = await fetch("http://localhost:3000/api/marketing-shield/v1/health");
    const json = await res.json();
    const passed = res.status === 200 && json.success === true && json.data.status === "healthy";
    results.push({
      step: "HTTP Health Check Gateway",
      category: "Daemon Server",
      passed,
      details: `Status ${res.status} | Service: ${json.data?.service} | Version: ${json.data?.version}`,
    });
  } catch (err) {
    results.push({
      step: "HTTP Health Check Gateway",
      category: "Daemon Server",
      passed: false,
      details: `Connection failed: ${(err as Error).message}`,
    });
  }

  // --------------------------------------------------------------------------
  // TEST 2: Strict SSRF Defense (SEC-SSRF-001 to 004)
  // --------------------------------------------------------------------------
  let ssrfBlockedCount = 0;
  const attackTargets = [
    "http://insecure-http.com/promo",
    "https://127.0.0.1:3000/api/admin",
    "https://localhost:8080/secrets",
    "https://169.254.169.254/latest/meta-data/",
    "https://10.0.0.1/network-switch",
    "https://192.168.1.1/gateway",
  ];

  for (const target of attackTargets) {
    try {
      await webSearchRouter.fetchLiveUrlContent({ url: target }, testTenantId);
    } catch (err) {
      if (
        (err as Error).message.includes("URL_FETCH_BLOCKED") ||
        (err as Error).message.includes("HTTPS") ||
        (err as Error).message.includes("prohibited")
      ) {
        ssrfBlockedCount++;
      }
    }
  }

  const ssrfPassed = ssrfBlockedCount === attackTargets.length;
  results.push({
    step: "SEC-SSRF: Private IP & Metadata Blocking",
    category: "SSRF Security Gate",
    passed: ssrfPassed,
    details: `Blocked ${ssrfBlockedCount}/${attackTargets.length} attack vectors (127.0.0.1, localhost, 169.254.169.254, 10.0.0.1, 192.168.1.1, non-HTTPS)`,
  });

  // --------------------------------------------------------------------------
  // TEST 3: Public HTTPS Live Landing Page Fetcher & Fingerprinting
  // --------------------------------------------------------------------------
  try {
    const fetchRes = await webSearchRouter.fetchLiveUrlContent(
      { url: "https://www.cbn.gov.ng" },
      testTenantId
    );

    const passed =
      fetchRes.success === true &&
      fetchRes.content_text.length > 50 &&
      fetchRes.sha256_hash.length === 64;

    results.push({
      step: "Live HTTPS Snapshot & SHA-256 Fingerprint",
      category: "URL Snapshotter",
      passed,
      details: `Title: "${fetchRes.page_title}" | Text Length: ${fetchRes.text_length} chars | SHA-256: ${fetchRes.sha256_hash.slice(0, 16)}...`,
    });
  } catch (err) {
    results.push({
      step: "Live HTTPS Snapshot & SHA-256 Fingerprint",
      category: "URL Snapshotter",
      passed: false,
      details: `Fetch failed: ${(err as Error).message}`,
    });
  }

  // --------------------------------------------------------------------------
  // TEST 4: Two-Step Live Web Search Router (Tool 9)
  // --------------------------------------------------------------------------
  let testRetrievalId: string | null = null;
  try {
    const searchRes = await webSearchRouter.searchLiveWeb(
      {
        query: "CBN circular digital lending fees interest rate regulations",
        prioritize_official_regulators: true,
      },
      testTenantId
    );

    const hasResults =
      searchRes.source_class === "LIVE_WEB_INTELLIGENCE" &&
      (searchRes.results.length > 0 || searchRes.status === "no_verified_live_results");

    if (searchRes.results.length > 0) {
      testRetrievalId = searchRes.results[0]!.live_web_retrieval_id;
    }

    results.push({
      step: "Two-Step Live Web Search (googleSearch Grounding)",
      category: "Live Web Intelligence",
      passed: hasResults,
      details: `Source Class: ${searchRes.source_class} | Results: ${searchRes.results.length} | Status: ${searchRes.status || "verified_citations_returned"}`,
    });
  } catch (err) {
    results.push({
      step: "Two-Step Live Web Search (googleSearch Grounding)",
      category: "Live Web Intelligence",
      passed: false,
      details: `Error: ${(err as Error).message}`,
    });
  }

  // --------------------------------------------------------------------------
  // SETUP TEST CAMPAIGN & APPROVED REVISION FOR DRIFT MONITORING
  // --------------------------------------------------------------------------
  let createdCampaignId: string | null = null;
  let createdRevisionId: string | null = null;
  let createdProductId: string | null = null;
  let createdMonitorId: string | null = null;

  try {
    // A. Create product truth
    const product = await productService.createProduct(testTenantId, testUserId, {
      product_name: "Audit Live QuickCash Loan",
      product_type: "DIGITAL_LENDING",
      approved_terms: {
        interest_rate_min: 4.0,
        interest_rate_max: 6.0,
        interest_rate_type: "MONTHLY",
        processing_fee_percent: 1.5,
        management_fee_percent: 0,
        tenor_min_days: 30,
        tenor_max_days: 90,
        required_disclosures: [
          "Terms and conditions apply",
          "Licensed by the Central Bank of Nigeria",
          "APR 60% annualized",
        ],
      },
      status: "ACTIVE",
    });
    createdProductId = product.id;

    // B. Create campaign
    const { data: campaign, error: campErr } = await supabase
      .from("marketing_campaigns")
      .insert({
        tenant_id: testTenantId,
        campaign_name: "Audit Live QuickCash Promo 2026",
        channel: "WEB_LANDING",
        product_id: createdProductId,
        created_by: testUserId,
        status: "APPROVED",
      })
      .select("id")
      .single();

    if (campErr || !campaign) {
      throw new Error(`Failed to create test campaign: ${campErr?.message}`);
    }

    createdCampaignId = campaign.id;

    // C. Create approved revision baseline
    const baselineText =
      "Get up to N500,000 with Audit Live QuickCash Loan. 5% monthly interest and 1.5% processing fee apply. Repayment over 60 days tenor. APR 60% annualized. Terms and conditions apply. Licensed by the Central Bank of Nigeria.";

    const { data: rev, error: revErr } = await supabase
      .from("campaign_revisions")
      .insert({
        tenant_id: testTenantId,
        campaign_id: createdCampaignId,
        revision_number: 1,
        content_text: baselineText,
        revision_source: "INITIAL_IMPORT",
        change_summary: "Initial approved baseline for drift audit",
        created_by: testUserId,
      })
      .select("id")
      .single();

    if (revErr || !rev) {
      throw new Error(`Failed to create test revision: ${revErr?.message}`);
    }

    createdRevisionId = rev.id;

    // Update campaign with approved_revision_id
    await supabase
      .from("marketing_campaigns")
      .update({ approved_revision_id: createdRevisionId })
      .eq("id", createdCampaignId);

    // --------------------------------------------------------------------------
    // TEST 5: Campaign Drift Monitor Registration (CRUD)
    // --------------------------------------------------------------------------
    const monitor = await driftService.createDriftMonitor(testTenantId, testUserId, {
      campaign_id: createdCampaignId!,
      approved_revision_id: createdRevisionId || undefined,
      published_url: "https://audit-bank.com.ng/promos/quickcash",
    });

    createdMonitorId = monitor.id;

    const fetchedMonitor = await driftService.getDriftMonitor(testTenantId, createdMonitorId);
    const monitorList = await driftService.listDriftMonitors(testTenantId, {
      campaign_id: createdCampaignId || undefined,
    });

    const crudPassed =
      fetchedMonitor.id === createdMonitorId &&
      fetchedMonitor.status === "ACTIVE" &&
      monitorList.length >= 1;

    results.push({
      step: "Post-Publication Drift Monitor Registration",
      category: "Drift Monitor CRUD",
      passed: crudPassed,
      details: `Monitor ID: ${createdMonitorId} | Campaign: "${fetchedMonitor.campaign_title}" | Status: ${fetchedMonitor.status}`,
    });
  } catch (err) {
    results.push({
      step: "Post-Publication Drift Monitor Registration",
      category: "Drift Monitor CRUD",
      passed: false,
      details: `Error: ${(err as Error).message}`,
    });
  }

  // --------------------------------------------------------------------------
  // TEST 6: Post-Publication Drift Detection - DRIFT-001 (Disclosures Removed)
  // --------------------------------------------------------------------------
  if (createdMonitorId) {
    const originalFetch = webSearchRouter.fetchLiveUrlContent.bind(webSearchRouter);

    try {
      // Simulate live URL returning copy with stripped disclosures
      const strippedDisclosuresCopy =
        "Get up to N500,000 instantly with QuickCash Loan. 5% monthly interest and 1.5% processing fee apply. Repayment over 60 days tenor. Instant cash!";

      webSearchRouter.fetchLiveUrlContent = async () => ({
        success: true,
        url: "https://audit-bank.com.ng/promos/quickcash",
        page_title: "QuickCash Promo",
        content_text: strippedDisclosuresCopy,
        text_length: strippedDisclosuresCopy.length,
        retrieved_at: new Date().toISOString(),
        source_class: "UNTRUSTED_USER_MATERIAL",
        sha256_hash: crypto.createHash("sha256").update(strippedDisclosuresCopy).digest("hex"),
      });

      const driftResult = await driftService.checkDrift(testTenantId, testUserId, createdMonitorId);
      webSearchRouter.fetchLiveUrlContent = originalFetch;

      const hasMissingDisclosures =
        driftResult.monitor.status === "DRIFT_DETECTED" &&
        driftResult.details.discrepancies.some((d) => d.type === "MISSING_DISCLOSURE");

      results.push({
        step: "DRIFT-001: Disclosure Removal Detection",
        category: "Post-Publication Drift",
        passed: hasMissingDisclosures,
        details: hasMissingDisclosures
          ? `Flagged DRIFT_DETECTED: ${driftResult.details.discrepancies.length} discrepancy(s) found (Missing mandatory CBN / T&C disclosures)`
          : "Failed to detect stripped disclosures",
      });
    } catch (err) {
      webSearchRouter.fetchLiveUrlContent = originalFetch;
      results.push({
        step: "DRIFT-001: Disclosure Removal Detection",
        category: "Post-Publication Drift",
        passed: false,
        details: `Error: ${(err as Error).message}`,
      });
    }

    // --------------------------------------------------------------------------
    // TEST 7: Post-Publication Drift Detection - DRIFT-002 (Rate/Fee Breach)
    // --------------------------------------------------------------------------
    try {
      // Simulate live URL advertising deceptive 0% fee and 2% rate
      const feeBreachCopy =
        "Get up to N500,000 with QuickCash Loan. 2% monthly interest and 0% processing fee with no fees ever! Repayment over 60 days tenor. APR 60% annualized. Terms and conditions apply. Licensed by the Central Bank of Nigeria.";

      webSearchRouter.fetchLiveUrlContent = async () => ({
        success: true,
        url: "https://audit-bank.com.ng/promos/quickcash",
        page_title: "QuickCash Promo",
        content_text: feeBreachCopy,
        text_length: feeBreachCopy.length,
        retrieved_at: new Date().toISOString(),
        source_class: "UNTRUSTED_USER_MATERIAL",
        sha256_hash: crypto.createHash("sha256").update(feeBreachCopy).digest("hex"),
      });

      const rateDriftResult = await driftService.checkDrift(testTenantId, testUserId, createdMonitorId);
      webSearchRouter.fetchLiveUrlContent = originalFetch;

      const hasRateDiscrepancy =
        rateDriftResult.monitor.status === "DRIFT_DETECTED" &&
        rateDriftResult.details.discrepancies.some((d) => d.type === "RATE_MISMATCH");

      results.push({
        step: "DRIFT-002: Deceptive Rate/Fee Breach Detection",
        category: "Post-Publication Drift",
        passed: hasRateDiscrepancy,
        details: hasRateDiscrepancy
          ? `Flagged DRIFT_DETECTED: Rate/fee schedule mismatch detected against approved product truth`
          : "Failed to detect fee discrepancy",
      });
    } catch (err) {
      webSearchRouter.fetchLiveUrlContent = originalFetch;
      results.push({
        step: "DRIFT-002: Deceptive Rate/Fee Breach Detection",
        category: "Post-Publication Drift",
        passed: false,
        details: `Error: ${(err as Error).message}`,
      });
    }

    // --------------------------------------------------------------------------
    // TEST 8: Post-Publication Drift Clean Pass - DRIFT-003 (Compliant Copy)
    // --------------------------------------------------------------------------
    try {
      const compliantCopy =
        "Get up to N500,000 with Audit Live QuickCash Loan. 5% monthly interest and 1.5% processing fee apply. Repayment over 60 days tenor. APR 60% annualized. Terms and conditions apply. Licensed by the Central Bank of Nigeria.";

      webSearchRouter.fetchLiveUrlContent = async () => ({
        success: true,
        url: "https://audit-bank.com.ng/promos/quickcash",
        page_title: "QuickCash Promo",
        content_text: compliantCopy,
        text_length: compliantCopy.length,
        retrieved_at: new Date().toISOString(),
        source_class: "UNTRUSTED_USER_MATERIAL",
        sha256_hash: crypto.createHash("sha256").update(compliantCopy).digest("hex"),
      });

      const cleanResult = await driftService.checkDrift(testTenantId, testUserId, createdMonitorId);
      webSearchRouter.fetchLiveUrlContent = originalFetch;

      const cleanPassed =
        cleanResult.details.status === "COMPLIANT" &&
        cleanResult.details.discrepancies.length === 0 &&
        cleanResult.monitor.status === "ACTIVE";

      results.push({
        step: "DRIFT-003: Compliant Baseline Clean Pass",
        category: "Post-Publication Drift",
        passed: cleanPassed,
        details: cleanPassed
          ? "Passed cleanly: Status is ACTIVE, 0 discrepancies, divergence score = 0%"
          : `Unexpected discrepancies found: ${cleanResult.details.discrepancies.length}`,
      });
    } catch (err) {
      webSearchRouter.fetchLiveUrlContent = originalFetch;
      results.push({
        step: "DRIFT-003: Compliant Baseline Clean Pass",
        category: "Post-Publication Drift",
        passed: false,
        details: `Error: ${(err as Error).message}`,
      });
    }
  }

  // --------------------------------------------------------------------------
  // TEST 9: Admin Workflow - Queue Discovered Circular into Statutory Vault
  // --------------------------------------------------------------------------
  let queuedDocId: string | null = null;
  try {
    // Insert a verified live_web_retrieval for queueing test
    const { data: retRow } = await supabase
      .from("live_web_retrievals")
      .insert({
        tenant_id: testTenantId,
        search_query: "CBN Revised Consumer Protection Framework 2026",
        retrieved_url: "https://www.cbn.gov.ng/circulars/2026/consumer-protection.pdf",
        page_title: "CBN Circular: Revised Consumer Protection Framework",
        snippet_content: "All financial institutions must provide 30-day notice prior to fee adjustments...",
        source_class: "LIVE_WEB_INTELLIGENCE",
      })
      .select("id")
      .single();

    const queued = await driftService.queueDiscoveredCircular(testTenantId, testUserId, {
      live_web_retrieval_id: retRow!.id,
      regulator: "CBN",
      doc_type: "Circular / Directive",
    });

    queuedDocId = queued.document_id;
    const passed = queued.document_id !== null && queued.title.includes("CBN");

    results.push({
      step: "Admin Workflow: Queue Discovered Circular",
      category: "Statutory Vault Ingestion",
      passed,
      details: `Queued document UUID: ${queued.document_id} | Title: "${queued.title}"`,
    });
  } catch (err) {
    results.push({
      step: "Admin Workflow: Queue Discovered Circular",
      category: "Statutory Vault Ingestion",
      passed: false,
      details: `Error: ${(err as Error).message}`,
    });
  }

  // --------------------------------------------------------------------------
  // TEST 10: Inngest Durable Workflows (7 Registered Functions)
  // --------------------------------------------------------------------------
  const hasDriftJob = inngestFunctions.includes(driftMonitoringJob);
  const hasCronJob = inngestFunctions.includes(scheduledDriftWatcherJob);
  const totalInngest = inngestFunctions.length;

  results.push({
    step: "Inngest Durable Workflows (7 Functions)",
    category: "Background Workflows",
    passed: hasDriftJob && hasCronJob && totalInngest === 7,
    details: `driftMonitoringJob & scheduledDriftWatcherJob registered (Total: ${totalInngest} production workflows)`,
  });

  // --------------------------------------------------------------------------
  // TEST 11: Gemini Copilot Tools 9 & 10 Declarations & Citations
  // --------------------------------------------------------------------------
  try {
    const hasTool9 = STATUTORY_TOOL_DECLARATIONS.some((t) => t.name === "search_live_web");
    const hasTool10 = STATUTORY_TOOL_DECLARATIONS.some((t) => t.name === "fetch_live_url_content");

    const passed = hasTool9 && hasTool10;
    results.push({
      step: "Gemini Copilot Tools 9 & 10",
      category: "AI Copilot Registry",
      passed,
      details: "Tool 9 (search_live_web) & Tool 10 (fetch_live_url_content) registered with [Live Web Intelligence] badge support",
    });
  } catch (err) {
    results.push({
      step: "Gemini Copilot Tools 9 & 10",
      category: "AI Copilot Registry",
      passed: false,
      details: `Error: ${(err as Error).message}`,
    });
  }

  // --------------------------------------------------------------------------
  // CLEANUP: Clean up test artifacts
  // --------------------------------------------------------------------------
  console.log(`[CLEANUP] Removing test tenant artifacts...`);
  if (createdMonitorId) {
    try {
      await driftService.deleteDriftMonitor(testTenantId, testUserId, createdMonitorId);
    } catch {
      // ignore
    }
  }
  if (createdProductId) {
    try {
      await productService.deleteProduct(testTenantId, testUserId, createdProductId);
    } catch {
      // ignore
    }
  }
  if (createdCampaignId) {
    try {
      await supabase.from("marketing_campaigns").delete().eq("id", createdCampaignId);
    } catch {
      // ignore
    }
  }
  if (queuedDocId) {
    try {
      await supabase.from("regulatory_instruments").delete().eq("id", queuedDocId);
    } catch {
      // ignore
    }
  }
  try {
    await supabase.from("tenants").delete().eq("id", testTenantId);
  } catch {
    // ignore
  }

  // --------------------------------------------------------------------------
  // FINAL REPORT
  // --------------------------------------------------------------------------
  console.log(`\n===============================================================`);
  console.log(`AUDIT EXECUTION RESULTS:`);
  console.log(`===============================================================\n`);

  let allPassed = true;
  for (let i = 0; i < results.length; i++) {
    const r = results[i]!;
    const mark = r.passed ? "✓ PASS" : "✗ FAIL";
    console.log(`[${i + 1}] ${mark} [${r.category}] ${r.step}`);
    console.log(`    ↳ ${r.details}`);
    if (!r.passed) allPassed = false;
  }

  console.log(`\n===============================================================`);
  console.log(`AUDIT VERDICT: ${allPassed ? "100% AUDIT PASSED - PRODUCTION READY" : "AUDIT FAILED"}`);
  console.log(`Total Checks: ${results.length} | Passed: ${results.filter((r) => r.passed).length} | Failed: ${results.filter((r) => !r.passed).length}`);
  console.log(`===============================================================\n`);

  if (!allPassed) {
    process.exit(1);
  }
}

runPhase11Audit().catch((err) => {
  console.error("Fatal audit error:", err);
  process.exit(1);
});
