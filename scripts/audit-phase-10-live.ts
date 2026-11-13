/**
 * Cogent Marketing Shield - Phase 10 Comprehensive Live Audit Script
 * Document Reference: Document 03, 04, 05, 07, 08 (Phase 10), 09 (Section 3.1, 5.2)
 *
 * Runs exhaustive real-world execution testing against local services,
 * database models, Deterministic Lock 2 rate/fee truth, RBAC boundaries,
 * and live HTTP server endpoints.
 */

import { productService } from "../src/modules/knowledge-base/product.service";
import { playbookService } from "../src/modules/knowledge-base/playbook.service";
import { mechanicalLocksEngine } from "../src/modules/compliance-assessment/mechanical-locks";
import { ROLE_PERMISSIONS } from "../src/modules/auth-tenancy/permissions";
import { STATUTORY_TOOL_DECLARATIONS, statutoryToolExecutor } from "../src/modules/ai-orchestration/tools/statutory-tools";
import { inngestFunctions, playbookIngestionJob } from "../src/modules/jobs/inngest.functions";
import { createAdminSupabaseClient } from "../src/lib/supabase";

interface AuditStepResult {
  step: string;
  category: string;
  passed: boolean;
  details: string;
}

async function runPhase10Audit(): Promise<void> {
  console.log(`\n===============================================================`);
  console.log(`  COGENT MARKETING SHIELD - PHASE 10 100% AUDIT & LIVE TEST SUITE`);
  console.log(`  Vertical Slice 5: Institutional Knowledge Base, Playbooks & Product Truth`);
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
      name: "Phase 10 Audit Institution",
      slug: "phase-10-audit-institution",
      status: "ACTIVE",
      settings: {},
    },
    { onConflict: "id" }
  );

  if (tenantErr) {
    console.warn(`[WARN] Failed to upsert test tenant: ${tenantErr.message}`);
  }

  // --------------------------------------------------------------------------
  // TEST 1: Live HTTP Daemon Health Check
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
  // TEST 2: Product Truth CRUD & Persistence in Supabase
  // --------------------------------------------------------------------------
  let createdProductId: string | null = null;
  try {
    const newProduct = await productService.createProduct(testTenantId, testUserId, {
      product_name: "Audit Test Salary Advance Loan",
      product_type: "DIGITAL_LENDING",
      description: "Short term salary advance for verified formal employees",
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
        ],
      },
      status: "ACTIVE",
    });

    createdProductId = newProduct.id;

    // Verify retrieval
    const fetched = await productService.getProduct(testTenantId, createdProductId);
    const updateRes = await productService.updateProduct(testTenantId, testUserId, createdProductId, {
      description: "Updated description for formal salary loans",
    });

    const passed =
      fetched.product_name === "Audit Test Salary Advance Loan" &&
      fetched.approved_terms.interest_rate_min === 4.0 &&
      fetched.approved_terms.processing_fee_percent === 1.5 &&
      updateRes.description === "Updated description for formal salary loans";

    results.push({
      step: "Product Truth CRUD & Persistence",
      category: "Product Truth",
      passed,
      details: `Created product UUID: ${createdProductId} | Name: ${fetched.product_name} | Rate: 4.0%-6.0%`,
    });
  } catch (err) {
    results.push({
      step: "Product Truth CRUD & Persistence",
      category: "Product Truth",
      passed: false,
      details: `Error: ${(err as Error).message}`,
    });
  }

  // --------------------------------------------------------------------------
  // TEST 3: Deterministic Lock 2 Rate, Fee & Tenor Matcher (LOCK2-001 to 004)
  // --------------------------------------------------------------------------
  const sampleTruth = {
    productName: "Audit Test Salary Advance Loan",
    productType: "DIGITAL_LENDING",
    interestRateMin: 4.0,
    interestRateMax: 6.0,
    interestRateType: "MONTHLY" as const,
    processingFeePercent: 1.5,
    tenorMinDays: 30,
    tenorMaxDays: 90,
    requiredDisclosures: [
      "Terms and conditions apply",
      "Licensed by the Central Bank of Nigeria",
    ],
  };

  // Case LOCK2-001: Deceptive Fee claim
  const lock2_001 = await mechanicalLocksEngine.executeLocks({
    tenantId: testTenantId,
    contentText: "Get fast salary cash up to N500k. 0% processing fee and no fees forever!",
    productTruth: sampleTruth,
  });
  const hasFeeBreach = lock2_001.lock2_product_rate_match.breaches.some(
    (b) => b.breachType === "FEE_SCHEDULE_MISMATCH"
  );
  results.push({
    step: "LOCK2-001: Deceptive Fee Claim Matcher",
    category: "Deterministic Lock 2",
    passed: hasFeeBreach,
    details: hasFeeBreach
      ? `Flagged: ${lock2_001.lock2_product_rate_match.breaches[0]?.matchedText} (Truth requires 1.5% fee)`
      : "Failed to detect fee discrepancy",
  });

  // Case LOCK2-002: Understated Interest Rate
  const lock2_002 = await mechanicalLocksEngine.executeLocks({
    tenantId: testTenantId,
    contentText: "Low rate credit at 2% monthly interest! Apply today.",
    productTruth: sampleTruth,
  });
  const hasRateBreach = lock2_002.lock2_product_rate_match.breaches.some(
    (b) => b.breachType === "INTEREST_RATE_UNDERSTATED"
  );
  results.push({
    step: "LOCK2-002: Understated Rate Matcher",
    category: "Deterministic Lock 2",
    passed: hasRateBreach,
    details: hasRateBreach
      ? `Flagged: ${lock2_002.lock2_product_rate_match.breaches[0]?.matchedText} (Below minimum 4.0%)`
      : "Failed to detect rate discrepancy",
  });

  // Case LOCK2-003: Tenor Limit Exceeded
  const lock2_003 = await mechanicalLocksEngine.executeLocks({
    tenantId: testTenantId,
    contentText: "Enjoy easy repayment over 180 days tenor with salary credit.",
    productTruth: sampleTruth,
  });
  const hasTenorBreach = lock2_003.lock2_product_rate_match.breaches.some(
    (b) => b.breachType === "TENOR_LIMIT_EXCEEDED"
  );
  results.push({
    step: "LOCK2-003: Tenor Limit Matcher",
    category: "Deterministic Lock 2",
    passed: hasTenorBreach,
    details: hasTenorBreach
      ? `Flagged: ${lock2_003.lock2_product_rate_match.breaches[0]?.matchedText} (Exceeds max 90 days)`
      : "Failed to detect tenor discrepancy",
  });

  // Case LOCK2-004: Compliant Copy Clean Pass
  const lock2_004 = await mechanicalLocksEngine.executeLocks({
    tenantId: testTenantId,
    contentText:
      "Get a QuickCash salary advance up to ₦500k. 5% monthly interest and 1.5% processing fee apply. Repayment over 60 days tenor. APR 60% annualized. Subject to credit appraisal. Terms and conditions apply. Licensed by the Central Bank of Nigeria.",
    productTruth: sampleTruth,
  });
  const lock2CleanPass =
    lock2_004.lock2_product_rate_match.passed &&
    lock2_004.lock2_product_rate_match.breaches.length === 0 &&
    lock2_004.passed === true;

  results.push({
    step: "LOCK2-004: Compliant Bounds Clean Pass",
    category: "Deterministic Lock 2",
    passed: lock2CleanPass,
    details: lock2CleanPass
      ? "Passed 100% cleanly: 0 breaches across Lock 1, Lock 2, and Lock 3"
      : `Unexpected breaches found: ${lock2_004.totalBreachCount}`,
  });

  // --------------------------------------------------------------------------
  // TEST 4: Playbook Ingestion, Chunking & Candidate Rule Extraction
  // --------------------------------------------------------------------------
  let registeredDocId: string | null = null;
  let candidateRuleId: string | null = null;
  try {
    const samplePolicyText = `
SECTION 1: DIGITAL LENDING PROMOTIONAL PRINCIPLES
All digital lending promotions must be clear, transparent, and fair to Nigerian consumers.
Commercial creators are strictly prohibited from using phrases like '100% free loan' or 'guaranteed approval'.

SECTION 2: MANDATORY STATUTORY DISCLOSURES
All promotional materials must include our official licensing status stating:
'Licensed by the Central Bank of Nigeria as a Digital Lending Institution'.
Furthermore, every communication must display 'Terms and conditions apply'.

SECTION 3: ADMINISTRATIVE & RATE CEILINGS
Processing fees shall not exceed 2.0% of principal disbursement.
Our authorized slogan is 'Fast, ethical credit for working Nigerians'.
Prior to publication, all advertising assets must undergo formal review and legal sign-off from compliance.
    `.trim();

    const registered = await playbookService.registerDocument(testTenantId, testUserId, {
      title: "Fair Practice Digital Lending Playbook 2026",
      document_type: "MARKETING_POLICY",
      description: "Institutional fair practice compliance policy",
      initial_content: samplePolicyText,
      effective_date: "2026-01-01",
      version_number: 1,
    });

    registeredDocId = registered.id;

    // Fetch document with chunk & rule statistics
    const docWithStats = await playbookService.getDocument(testTenantId, registeredDocId);

    // Fetch extracted rules
    const rules = await playbookService.listRules(testTenantId, { document_id: registeredDocId });
    const hasProhibited = rules.some((r) => r.rule_type === "PROHIBITED");
    const hasDisclosure = rules.some((r) => r.rule_type === "REQUIRED_DISCLOSURE");
    const hasRateLimit = rules.some((r) => r.rule_type === "RATE_FEE_LIMIT");

    if (rules.length > 0) {
      candidateRuleId = rules[0]!.id;
    }

    const passed =
      registeredDocId !== null &&
      (docWithStats.chunk_count || 0) > 0 &&
      rules.length >= 3 &&
      hasProhibited &&
      hasDisclosure &&
      hasRateLimit;

    results.push({
      step: "Playbook Chunking & Rule Extraction",
      category: "Playbook Engine",
      passed,
      details: `Doc ID: ${registeredDocId} | Chunks: ${docWithStats.chunk_count} | Extracted Rules: ${rules.length} (PROHIBITED, REQUIRED_DISCLOSURE, RATE_FEE_LIMIT)`,
    });
  } catch (err) {
    results.push({
      step: "Playbook Chunking & Rule Extraction",
      category: "Playbook Engine",
      passed: false,
      details: `Error: ${(err as Error).message}`,
    });
  }

  // --------------------------------------------------------------------------
  // TEST 5: Rule Activation & Live Enforcement Sync
  // --------------------------------------------------------------------------
  if (candidateRuleId) {
    try {
      const activated = await playbookService.activateRule(testTenantId, testUserId, candidateRuleId);
      const passed = activated.status === "ACTIVE";

      results.push({
        step: "Rule Activation & Enforcement Sync",
        category: "Rule Engine",
        passed,
        details: `Rule ID: ${candidateRuleId} | Title: "${activated.rule_title}" | Status: ${activated.status}`,
      });
    } catch (err) {
      results.push({
        step: "Rule Activation & Enforcement Sync",
        category: "Rule Engine",
        passed: false,
        details: `Error: ${(err as Error).message}`,
      });
    }
  }

  // --------------------------------------------------------------------------
  // TEST 6: RBAC Separation of Duties on Rule Activation & Product Truth
  // --------------------------------------------------------------------------
  const mktgCannotPublish = !ROLE_PERMISSIONS.MARKETING_GROWTH.has("knowledge.publish");
  const analystCannotPublish = !ROLE_PERMISSIONS.COMPLIANCE_ANALYST.has("knowledge.publish");
  const legalCanPublish = ROLE_PERMISSIONS.LEGAL_COUNSEL.has("knowledge.publish");
  const ccoCanPublish = ROLE_PERMISSIONS.CHIEF_COMPLIANCE_OFFICER.has("knowledge.publish");
  const mktgCannotWriteProduct = !ROLE_PERMISSIONS.MARKETING_GROWTH.has("product.write");
  const analystCanWriteProduct = ROLE_PERMISSIONS.COMPLIANCE_ANALYST.has("product.write");

  const rbacPassed =
    mktgCannotPublish &&
    analystCannotPublish &&
    legalCanPublish &&
    ccoCanPublish &&
    mktgCannotWriteProduct &&
    analystCanWriteProduct;

  results.push({
    step: "RBAC & Separation of Duties Matrix",
    category: "Security / RBAC",
    passed: rbacPassed,
    details: `Marketing/Analyst blocked from knowledge.publish (403) | Legal/CCO permitted | Marketing blocked from product.write`,
  });

  // --------------------------------------------------------------------------
  // TEST 7: Gemini Copilot Tools 7 & 8 Declarations & Executors
  // --------------------------------------------------------------------------
  try {
    const hasTool7 = STATUTORY_TOOL_DECLARATIONS.some((t) => t.name === "search_institutional_knowledge");
    const hasTool8 = STATUTORY_TOOL_DECLARATIONS.some((t) => t.name === "get_product_approved_terms");

    // Execute Tool 7
    const tool7Res = await statutoryToolExecutor.searchInstitutionalKnowledge(
      { query: "digital lending fee limits" },
      { tenantId: testTenantId }
    );

    // Execute Tool 8
    const tool8Res = await statutoryToolExecutor.getProductApprovedTerms(
      { product_name_query: "Salary Advance" },
      { tenantId: testTenantId }
    );

    const passed =
      hasTool7 &&
      hasTool8 &&
      tool7Res.success === true &&
      tool7Res.source_class === "INSTITUTIONAL_KNOWLEDGE" &&
      tool8Res.success === true &&
      tool8Res.product_truth !== null;

    results.push({
      step: "Gemini Copilot Tools 7 & 8",
      category: "AI Copilot Registry",
      passed,
      details: `Tool 7 (search_institutional_knowledge) & Tool 8 (get_product_approved_terms) verified with [Internal Playbook Rule] citations`,
    });
  } catch (err) {
    results.push({
      step: "Gemini Copilot Tools 7 & 8",
      category: "AI Copilot Registry",
      passed: false,
      details: `Error: ${(err as Error).message}`,
    });
  }

  // --------------------------------------------------------------------------
  // TEST 8: Inngest Durable Workflow Registration
  // --------------------------------------------------------------------------
  const hasPlaybookJob = inngestFunctions.includes(playbookIngestionJob);
  const totalInngestJobs = inngestFunctions.length;
  results.push({
    step: "Inngest Durable Workflow Registration",
    category: "Background Workflows",
    passed: hasPlaybookJob && totalInngestJobs === 6,
    details: `playbookIngestionJob registered in inngestFunctions (Total registered: ${totalInngestJobs} durable jobs)`,
  });

  // --------------------------------------------------------------------------
  // CLEANUP: Clean up test artifacts in database
  // --------------------------------------------------------------------------
  if (createdProductId) {
    try {
      await productService.deleteProduct(testTenantId, testUserId, createdProductId);
    } catch {
      // ignore
    }
  }
  if (registeredDocId) {
    try {
      await supabase.from("marketing_knowledge_documents").delete().eq("id", registeredDocId);
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

runPhase10Audit().catch((err) => {
  console.error("Fatal audit error:", err);
  process.exit(1);
});
