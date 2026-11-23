/**
 * Cogent Marketing Shield - End-to-End Autonomous Analyst Scenarios & Route Integration Tests
 * Document Reference: Document 13 (Sections 2, 3, 4, 5 & 9)
 *
 * Verifies all real-world compliance scenarios, multi-step SSE orchestration,
 * Zero-Prompt Drift & Ripple Sentinels, and API route handlers.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import type { SSEEvent } from "@/contracts/conversation.contracts";

const mockTenantContext = {
  userId: "user_cco_001",
  orgId: "org_fintech_ng",
  tenantId: "11111111-1111-1111-1111-111111111111",
  tenantSlug: "kuda-mfb",
  tenantName: "Kuda Microfinance Bank",
  role: "COMPLIANCE_OFFICER" as const,
  permissions: [
    "conversation.read",
    "conversation.write",
    "campaign.read",
    "campaign.create",
    "approval.decide",
    "dossier.generate",
  ] as const,
};

vi.mock("@/modules/auth-tenancy/tenant.resolver", () => ({
  resolveTenantContext: vi.fn(async () => mockTenantContext),
}));

vi.mock("@/modules/auth-tenancy/rbac.guard", () => ({
  requirePermission: vi.fn(() => true),
  hasPermission: vi.fn(() => true),
  assertThirdLineIndependence: vi.fn(() => undefined),
}));

vi.mock("@/lib/rate-limit", () => ({
  enforceRateLimit: vi.fn(() => ({
    allowed: true,
    limit: 60,
    remaining: 59,
    resetAt: Date.now() + 60_000,
  })),
}));

vi.mock("@/modules/audit/audit.service", () => ({
  auditService: {
    appendEvent: vi.fn().mockResolvedValue({ id: "audit_evt_001" }),
  },
}));

vi.mock("@/lib/notifications", () => ({
  notificationService: {
    sendDriftAlert: vi.fn().mockResolvedValue({ success: true, messageId: "msg_001" }),
  },
}));

const mockQuickCashProductRow = {
  id: "22222222-2222-2222-2222-222222222222",
  tenant_id: "11111111-1111-1111-1111-111111111111",
  product_name: "QuickCash 15-Day Express",
  product_type: "DIGITAL_LOAN",
  description: "Instant 15-day salary advance",
  status: "ACTIVE",
  interest_rate_min: 5,
  interest_rate_max: 5,
  interest_rate_type: "MONTHLY",
  processing_fee_percent: 0,
  tenor_min_days: 15,
  tenor_max_days: 15,
  required_disclosures: [
    "Licensed by the Central Bank of Nigeria",
    "Terms and Conditions apply",
  ],
  approved_terms: {
    interest_rate_min: 5,
    interest_rate_max: 5,
    interest_rate_type: "MONTHLY",
    processing_fee_percent: 0,
    tenor_min_days: 15,
    tenor_max_days: 15,
    required_disclosures: [
      "Licensed by the Central Bank of Nigeria",
      "Terms and Conditions apply",
    ],
    custom_terms: {
      processing_fee_flat_ngn: 2500,
    },
  },
  created_at: "2026-11-10T00:00:00.000Z",
  updated_at: "2026-11-10T00:00:00.000Z",
};

vi.mock("@/lib/supabase", () => {
  const createChain = (table: string) => {
    const chain: Record<string, unknown> = {};
    chain.select = vi.fn(() => chain);
    chain.eq = vi.fn(() => chain);
    chain.in = vi.fn(() => chain);
    chain.order = vi.fn(() => chain);
    chain.limit = vi.fn(() => {
      if (table === "campaign_products") {
        return Promise.resolve({ data: [mockQuickCashProductRow], error: null });
      }
      if (table === "regulatory_ripple_alerts") {
        return Promise.resolve({
          data: [
            {
              id: "ripple_alert_001",
              tenant_id: "11111111-1111-1111-1111-111111111111",
              regulator: "CBN",
              circular_title: "CBN Revised KFS Directive 2026",
              impacted_product_id: mockQuickCashProductRow.id,
              impacted_product_name: mockQuickCashProductRow.product_name,
              incident_conversation_id: "conv_incident_001",
              blind_spot_summary: "New CBN KFS schedule applies to QuickCash.",
              consequence_summary: "₦2,000,000 penalty per non-compliant product.",
              recommended_fix: "Adopt updated 12-row CBN KFS table.",
              severity: "CRITICAL",
              status: "OPEN",
              created_at: new Date().toISOString(),
            },
          ],
          error: null,
        });
      }
      return Promise.resolve({ data: [], error: null });
    });
    chain.maybeSingle = vi.fn(() => {
      if (table === "tenants") {
        return Promise.resolve({
          data: {
            id: "11111111-1111-1111-1111-111111111111",
            name: "Kuda Microfinance Bank",
            regulatory_profile: { license_tier: "MFB_NATIONAL" },
          },
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    });
    chain.single = vi.fn(() => {
      if (table === "marketing_conversations" || table === "conversations") {
        return Promise.resolve({
          data: { id: "conv_incident_spawned_001" },
          error: null,
        });
      }
      if (table === "regulatory_ripple_alerts") {
        return Promise.resolve({
          data: {
            id: "ripple_created_001",
            tenant_id: "11111111-1111-1111-1111-111111111111",
            regulator: "CBN",
            circular_title: "CBN Circular on Digital Lending APR 2026",
            impacted_product_id: mockQuickCashProductRow.id,
            impacted_product_name: mockQuickCashProductRow.product_name,
            incident_conversation_id: "conv_incident_spawned_001",
            blind_spot_summary:
              "New CBN circular directly affects your 'QuickCash 15-Day Express' rate card.",
            consequence_summary: "₦2,000,000 penalty and campaign recall.",
            recommended_fix: "Update KFS table and re-verify active revisions.",
            severity: "CRITICAL",
            status: "OPEN",
            created_at: new Date().toISOString(),
          },
          error: null,
        });
      }
      if (table === "campaign_revisions") {
        return Promise.resolve({
          data: {
            id: "rev_001",
            content_text:
              "Borrow with QuickCash. Licensed by the Central Bank of Nigeria. Terms and Conditions apply.",
          },
          error: null,
        });
      }
      if (table === "campaign_drift_monitors") {
        return Promise.resolve({
          data: {
            id: "mon_001",
            status: "DRIFT_DETECTED",
          },
          error: null,
        });
      }
      return Promise.resolve({ data: { id: "generic_001" }, error: null });
    });
    chain.insert = vi.fn(() => chain);
    chain.update = vi.fn(() => chain);
    // Allow direct awaiting on eq() for campaign_products query
    chain.then = (resolve: (val: unknown) => void) => {
      if (table === "campaign_products") {
        return Promise.resolve({ data: [mockQuickCashProductRow], error: null }).then(
          resolve,
        );
      }
      return Promise.resolve({ data: [], error: null }).then(resolve);
    };
    return chain;
  };

  return {
    createAdminSupabaseClient: vi.fn(() => ({
      from: vi.fn((table: string) => createChain(table)),
    })),
  };
});

vi.mock("@/modules/conversations/conversation.service", () => ({
  conversationService: {
    createMessage: vi.fn().mockImplementation((params) =>
      Promise.resolve({
        id: params.role === "USER" ? "user_msg_101" : "asst_msg_102",
        tenant_id: params.tenantId,
        conversation_id: params.conversationId,
        role: params.role,
        content: params.content,
        sequence_number: params.role === "USER" ? 1 : 2,
        status: params.status || "COMPLETED",
        created_at: new Date().toISOString(),
      }),
    ),
    listMessages: vi.fn().mockResolvedValue({ messages: [] }),
    updateMessage: vi.fn().mockResolvedValue({ id: "asst_msg_102", status: "COMPLETED" }),
  },
}));

describe("End-to-End Autonomous Compliance Analyst Scenarios & Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("SCENARIO 1: Silent Blind-Spot Detection catches 'Marketing vs. App Rate Card' mismatch (60% implied vs 182.5% true APR) and emits StructuredComplianceReport", async () => {
    const { CopilotOrchestrator } = await import(
      "@/modules/conversations/copilot.orchestrator"
    );

    const mockGenAi = {
      models: {
        generateContent: vi.fn().mockResolvedValue({
          text: "1. **What You Missed (The Blind Spot):** Your flyer implies 60% APR, but your active QuickCash rate card charges 182.5% APR.\n2. **What It Costs You (The Consequence):** Publishing this violates FCCPA Section 115.\n3. **One-Click Resolution (The Done-For-You Fix):** Use the CBN Key Facts Statement table below.",
          functionCalls: [],
        }),
      },
    };

    const orchestrator = new CopilotOrchestrator(mockGenAi as never);

    const events: SSEEvent[] = [];
    for await (const ev of orchestrator.streamChat({
      conversationId: "conv_001",
      tenantId: mockTenantContext.tenantId,
      userId: mockTenantContext.userId,
      userPrompt:
        "Does this flyer sound good? Get ₦50,000 in 5 minutes at 5% monthly with QuickCash!",
    })) {
      events.push(ev);
    }

    const planCreated = events.find((e) => e.type === "plan.created");
    expect(planCreated).toBeDefined();
    if (planCreated && planCreated.type === "plan.created") {
      expect(planCreated.data.steps).toHaveLength(5);
    }

    const assessmentCompleted = events.find((e) => e.type === "assessment.completed");
    expect(assessmentCompleted).toBeDefined();
    if (assessmentCompleted && assessmentCompleted.type === "assessment.completed") {
      const report = assessmentCompleted.data.structured_report;
      expect(report.pre_flight_gate.verdict).toBe("BLOCK");
      expect(report.campaign_context?.product_name).toBe("QuickCash 15-Day Express");
      expect(report.pre_flight_gate.apr_audit).toBeDefined();
      expect(report.pre_flight_gate.apr_audit!.advertised_implied_apr).toBe(60);
      expect(report.pre_flight_gate.apr_audit!.effective_nominal_apr).toBeCloseTo(
        182.5,
        1,
      );
      expect(
        report.blind_spot_findings.some(
          (b) => b.finding_code === "APR_DRIP_PRICING_MISMATCH",
        ),
      ).toBe(true);
      expect(report.artifacts.kfs_table?.markdown_table).toContain("182.5% APR p.a.");
      expect(
        report.artifacts.compliant_rewrite?.sms_160_char?.length,
      ).toBeLessThanOrEqual(160);

      // Pillar 4 & Canvas Deliverables: Single Source of Truth computed_financials & compliance_artifacts
      expect(report.computed_financials).toBeDefined();
      expect(report.computed_financials?.principal_ngn).toBe(50000);
      expect(report.computed_financials?.total_upfront_fees_ngn).toBe(2500);
      expect(report.computed_financials?.net_disbursed_cash_ngn).toBe(47500);
      expect(report.computed_financials?.total_cost_of_credit_ngn).toBe(3750);
      expect(report.computed_financials?.effective_apr_percent).toBeCloseTo(182.5, 1);
      expect(report.computed_financials?.tenor_days).toBe(15);

      expect(report.compliance_artifacts).toBeDefined();
      const artifactTypes = report.compliance_artifacts?.map((a) => a.type) ?? [];
      expect(artifactTypes).toContain("compliant_ad_rewrite");
      expect(artifactTypes).toContain("cbn_kfs_statement");
      expect(artifactTypes).toContain("arcon_vetting_memo");
      expect(artifactTypes).toContain("audit_dossier_summary");
    }
  });

  it("SCENARIO 4: Dynamic Intent Adaptation — Quick Regulatory Q&A streams natural editorial prose WITHOUT forcing a Pre-Flight Gate or KFS template", async () => {
    const { CopilotOrchestrator } = await import(
      "@/modules/conversations/copilot.orchestrator"
    );

    const mockGenAi = {
      models: {
        generateContent: vi.fn().mockResolvedValue({
          text: "### ARCON Pre-Vetting for Influencer Skits\n\nYes. Under **[ARCON Act 2022 §54]** and **[ARCON ASP Code Art. 21]**, all influencer skits, paid partnerships, and social media endorsements promoting financial services in Nigeria require mandatory Advertising Standards Panel (ASP) vetting and a valid ASP Certificate of Approval before publication.",
          functionCalls: [],
        }),
      },
    };

    const orchestrator = new CopilotOrchestrator(mockGenAi as never);

    const events: SSEEvent[] = [];
    for await (const ev of orchestrator.streamChat({
      conversationId: "conv_qa_001",
      tenantId: mockTenantContext.tenantId,
      userId: mockTenantContext.userId,
      userPrompt: "Does ARCON require pre-vetting for influencer skits?",
    })) {
      events.push(ev);
    }

    const planCreated = events.find((e) => e.type === "plan.created");
    expect(planCreated).toBeUndefined();

    const assessmentCompleted = events.find((e) => e.type === "assessment.completed");
    expect(assessmentCompleted).toBeUndefined();

    const messageCompleted = events.find((e) => e.type === "message.completed");
    expect(messageCompleted).toBeDefined();
    if (messageCompleted && messageCompleted.type === "message.completed") {
      expect(messageCompleted.data.structured_report).toBeUndefined();
    }
  });

  it("SCENARIO 5: Conversational Follow-Up ('This is good so what next do you recommend i do now') streams direct CCO advice with ZERO 5-step audit checklist", async () => {
    const { CopilotOrchestrator } = await import(
      "@/modules/conversations/copilot.orchestrator"
    );

    const mockGenAi = {
      models: {
        generateContent: vi.fn().mockResolvedValue({
          text: "### Recommended Next Steps\n\n1. **Apply the Compliant Rewrite & CBN KFS Table** from the right-hand Artifact Canvas Drawer.\n2. **Submit the ARCON ASP Vetting Memo** to obtain your ASP Certificate ID before media placement.\n3. **Enable Live URL Drift Monitoring** once the campaign page goes live.",
          functionCalls: [],
        }),
      },
    };

    const orchestrator = new CopilotOrchestrator(mockGenAi as never);

    // Even when activeCampaignId and referencedProductId are set on the thread (after a clearance or with product selected),
    // conversational follow-ups and questions must NEVER be forced into a 5-step clearance audit
    expect(
      orchestrator.classifyTurnIntent({
        conversationId: "conv_followup_001",
        tenantId: mockTenantContext.tenantId,
        userId: mockTenantContext.userId,
        activeCampaignId: "camp_001",
        referencedProductId: mockQuickCashProductRow.id,
        userPrompt: "This is good so what next do you recommend i do now",
      })
    ).toBe("CONVERSATIONAL_ADVISORY");

    expect(
      orchestrator.classifyTurnIntent({
        conversationId: "conv_followup_001",
        tenantId: mockTenantContext.tenantId,
        userId: mockTenantContext.userId,
        activeCampaignId: "camp_001",
        referencedProductId: mockQuickCashProductRow.id,
        userPrompt: "Why did you say 182.5% APR and what if we lower the fee to ₦1,000?",
      })
    ).toBe("CONVERSATIONAL_ADVISORY");

    expect(
      orchestrator.classifyTurnIntent({
        conversationId: "conv_followup_001",
        tenantId: mockTenantContext.tenantId,
        userId: mockTenantContext.userId,
        referencedProductId: mockQuickCashProductRow.id,
        userPrompt:
          "Can a Nigerian bank or fintech advertise '0% interest' without disclosing management fees and total cost of credit under CBN Consumer Protection Regulations?",
      })
    ).toBe("REGULATORY_LOOKUP");

    const events: SSEEvent[] = [];
    for await (const ev of orchestrator.streamChat({
      conversationId: "conv_followup_001",
      tenantId: mockTenantContext.tenantId,
      userId: mockTenantContext.userId,
      activeCampaignId: "camp_001",
      referencedProductId: mockQuickCashProductRow.id,
      userPrompt: "This is good so what next do you recommend i do now",
    })) {
      events.push(ev);
    }

    // Must NOT emit the 5-step audit plan box or any plan.step_updated events
    expect(events.find((e) => e.type === "plan.created")).toBeUndefined();
    expect(events.find((e) => e.type === "plan.step_updated")).toBeUndefined();
    expect(events.find((e) => e.type === "assessment.completed")).toBeUndefined();

    const deltas = events
      .filter((e) => e.type === "assistant.delta")
      .map((e) => (e.type === "assistant.delta" ? e.data.text_delta : ""))
      .join("");
    expect(deltas).toContain("Recommended Next Steps");
  });

  it("SCENARIO 2: Zero-Prompt URL Drift Sentinel detects newly introduced <60-day Play Store trap & spawns an Incident Conversation", async () => {
    const { driftService } = await import("@/modules/drift-monitor/drift.service");
    const { webSearchRouter } = await import(
      "@/modules/live-web-intelligence/web-search.router"
    );
    const { productService } = await import("@/modules/knowledge-base/product.service");

    vi.spyOn(driftService, "getDriftMonitor").mockResolvedValueOnce({
      id: "mon_001",
      tenant_id: mockTenantContext.tenantId,
      campaign_id: "camp_001",
      approved_revision_id: "rev_001",
      published_url: "https://kuda.com/promos/quickcash",
      status: "ACTIVE",
      last_checked_at: null,
      last_drift_detected_at: null,
      drift_details: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      campaign_title: "QuickCash 15-Day Express",
    });

    vi.spyOn(webSearchRouter, "fetchLiveUrlContent").mockResolvedValueOnce({
      success: true,
      url: "https://kuda.com/promos/quickcash",
      page_title: "QuickCash Instant Loan",
      content_text:
        "Get ₦50,000 in 5 minutes at 5% monthly! Repay in 14 days. Our app will access your contact list to verify identity.",
      text_length: 118,
      retrieved_at: new Date().toISOString(),
      source_class: "UNTRUSTED_USER_MATERIAL",
      sha256_hash: "drifted_hash_999",
    });

    vi.spyOn(productService, "getProductTruth").mockResolvedValueOnce(
      mockQuickCashProductRow as never,
    );

    const res = await driftService.checkDrift(
      mockTenantContext.tenantId,
      mockTenantContext.userId,
      "mon_001",
    );

    expect(res.details.status).toBe("DRIFT_DETECTED");
    expect(res.details.incident_conversation_id).toBe("conv_incident_spawned_001");
    expect(res.monitor.incident_conversation_id).toBe("conv_incident_spawned_001");
    expect(res.details.discrepancies.length).toBeGreaterThanOrEqual(2);
  });

  it("SCENARIO 3: GET & POST /api/marketing-shield/v1/ripple-alerts route handlers list and trigger Zero-Prompt Regulatory Ripple Alerts", async () => {
    const { GET, POST } = await import(
      "@/app/api/marketing-shield/v1/ripple-alerts/route"
    );

    const getReq = new NextRequest(
      "http://localhost:3000/api/marketing-shield/v1/ripple-alerts?status=OPEN",
    );
    const getRes = await GET(getReq, { params: Promise.resolve({}) });
    const getJson = await getRes.json();

    expect(getRes.status).toBe(200);
    expect(getJson.success).toBe(true);
    expect(getJson.data.alerts).toHaveLength(1);
    expect(getJson.data.alerts[0].circular_title).toBe("CBN Revised KFS Directive 2026");

    const postReq = new NextRequest(
      "http://localhost:3000/api/marketing-shield/v1/ripple-alerts",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          regulator: "CBN",
          title: "CBN Circular on Digital Lending APR 2026",
          summary_text:
            "All digital loan and credit products must disclose effective APR and KFS tables prior to sign-up.",
          clause_reference: "Section 4.2.1",
        }),
      },
    );
    const postRes = await POST(postReq, { params: Promise.resolve({}) });
    const postJson = await postRes.json();

    expect(postRes.status).toBe(201);
    expect(postJson.success).toBe(true);
    expect(postJson.data.created_count).toBeGreaterThanOrEqual(1);
    expect(postJson.data.alerts[0].impacted_product_name).toBe(
      "QuickCash 15-Day Express",
    );
    expect(postJson.data.alerts[0].incident_conversation_id).toBe(
      "conv_incident_spawned_001",
    );
  });
});
