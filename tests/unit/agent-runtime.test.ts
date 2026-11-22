/**
 * Cogent Agent Runtime — Role Profile, Workflow Pack Scoping & Multi-Role Extensibility Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { GoogleGenAI } from "@google/genai";
import {
  AgentRoleRegistry,
  agentRoleRegistry,
  COMPLIANCE_OFFICER_ROLE_ID,
  REGULATORY_COMPLIANCE_OFFICER_ROLE,
  scopeToolDeclarationsForPack,
  composeAgentSystemInstruction,
} from "@/modules/agent-runtime";
import type { AgentRoleProfile } from "@/contracts/agent-runtime.contracts";
import { STATUTORY_TOOL_DECLARATIONS } from "@/modules/ai-orchestration/tools/statutory-tools";

vi.mock("@/lib/supabase", () => ({
  createAdminSupabaseClient: () => ({ from: vi.fn(), rpc: vi.fn() }),
}));

const mockUpdateMessage = vi.fn().mockResolvedValue({ id: "asst_role_1", status: "COMPLETED" });

vi.mock("@/modules/conversations/conversation.service", () => ({
  conversationService: {
    createMessage: vi.fn().mockImplementation((params) =>
      Promise.resolve({
        id: params.role === "USER" ? "user_role_1" : "asst_role_1",
        tenant_id: params.tenantId,
        conversation_id: params.conversationId,
        role: params.role,
        content: params.content,
        sequence_number: params.role === "USER" ? 1 : 2,
        status: params.status || "COMPLETED",
        created_at: new Date().toISOString(),
      })
    ),
    listMessages: vi.fn().mockResolvedValue({ messages: [] }),
    updateMessage: (...args: unknown[]) => mockUpdateMessage(...args),
    updateConversation: vi.fn().mockResolvedValue({ id: "conv_role_1", title: "Updated" }),
  },
}));

describe("Cogent Professional Agent Runtime (7-Layer Role & Workflow Pack Engine)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers the flagship Regulatory & Compliance Officer role with all 7 Cogent workflow packs", () => {
    const roles = agentRoleRegistry.listRoles();
    expect(roles.some((r) => r.roleId === COMPLIANCE_OFFICER_ROLE_ID)).toBe(true);

    const flagship = agentRoleRegistry.getRole(COMPLIANCE_OFFICER_ROLE_ID);
    expect(flagship.identity.communicationConstitution.constitutionId).toBe("DOC-10-ACPC");
    expect(flagship.identity.disposition.length).toBeGreaterThanOrEqual(6);
    expect(flagship.identity.operationalBoundaries.length).toBeGreaterThanOrEqual(5);
    expect(flagship.rbacApprovalRoles).toEqual(["LEGAL_COUNSEL", "CHIEF_COMPLIANCE_OFFICER"]);

    expect(Object.keys(flagship.workflowPacks)).toEqual(
      expect.arrayContaining([
        "PRODUCT_STRUCTURING_MEMO",
        "POLICY_GAP_REDLINE",
        "SUPERVISORY_DDQ_RESPONSE",
        "CROSS_BORDER_COMPARISON",
        "FULL_COMPLIANCE_AUDIT",
        "REGULATORY_LOOKUP",
        "CONVERSATIONAL_ADVISORY",
      ])
    );
  });

  it("isolates active WorkflowPack instructions so inactive blueprints never bloat the system prompt", () => {
    const policyPlan = agentRoleRegistry.resolveTurnPlan({
      intentInput: {
        userPrompt: "Redline our internal AML & Collections SOP v2.4 against current CBN and NDPA rules.",
      },
      allToolDeclarations: STATUTORY_TOOL_DECLARATIONS,
    });

    expect(policyPlan.turnIntent).toBe("POLICY_GAP_REDLINE");
    expect(policyPlan.temperature).toBe(0.15);
    expect(policyPlan.systemInstruction).toContain(
      "ACTIVE ASSIGNMENT: INTERNAL POLICY & SOP GAP REDLINE"
    );
    // Zero cross-workflow prompt leakage
    expect(policyPlan.systemInstruction).not.toContain(
      "ACTIVE ASSIGNMENT: MARKETING CLEARANCE & CAMPAIGN COMPLIANCE AUDIT"
    );
    expect(policyPlan.systemInstruction).not.toContain(
      "ACTIVE ASSIGNMENT: CROSS-BORDER REGULATORY MATRIX & COMPARISON"
    );
    expect(policyPlan.systemInstruction).not.toContain(
      "ACTIVE ASSIGNMENT: SUPERVISORY INQUIRY / SPONSOR BANK DDQ RESPONSE"
    );
    expect(policyPlan.systemInstruction).not.toContain(
      "ACTIVE ASSIGNMENT: PRODUCT & FEATURE STRUCTURING MEMO"
    );

    const ddqPlan = agentRoleRegistry.resolveTurnPlan({
      intentInput: {
        userPrompt: "Draft formal answers to our Sponsor Bank DDQ and CBN supervisory inquiry.",
      },
      allToolDeclarations: STATUTORY_TOOL_DECLARATIONS,
    });

    expect(ddqPlan.turnIntent).toBe("SUPERVISORY_DDQ_RESPONSE");
    expect(ddqPlan.systemInstruction).toContain(
      "ACTIVE ASSIGNMENT: SUPERVISORY INQUIRY / SPONSOR BANK DDQ RESPONSE"
    );
    expect(ddqPlan.systemInstruction).not.toContain(
      "ACTIVE ASSIGNMENT: INTERNAL POLICY & SOP GAP REDLINE"
    );
  });

  it("scopes tool declarations strictly to the active WorkflowPack instead of exposing all 30+ tools", () => {
    const advisoryPack = REGULATORY_COMPLIANCE_OFFICER_ROLE.workflowPacks.CONVERSATIONAL_ADVISORY!;
    const advisoryTools = scopeToolDeclarationsForPack(STATUTORY_TOOL_DECLARATIONS, advisoryPack);
    const advisoryToolNames = advisoryTools.map((t) => t.name);

    expect(advisoryTools.length).toBeLessThan(STATUTORY_TOOL_DECLARATIONS.length);
    expect(advisoryToolNames).toContain("search_regulatory_evidence");
    expect(advisoryToolNames).not.toContain("audit_flyer_visual_forensics");
    expect(advisoryToolNames).not.toContain("compare_policy_against_regulation");
    expect(advisoryToolNames).not.toContain("parse_and_answer_ddq_questions");

    const ddqPack = REGULATORY_COMPLIANCE_OFFICER_ROLE.workflowPacks.SUPERVISORY_DDQ_RESPONSE!;
    const ddqTools = scopeToolDeclarationsForPack(STATUTORY_TOOL_DECLARATIONS, ddqPack);
    const ddqToolNames = ddqTools.map((t) => t.name);

    expect(ddqToolNames).toContain("parse_and_answer_ddq_questions");
    expect(ddqToolNames).toContain("upsert_work_product_artifact");
    expect(ddqToolNames).not.toContain("audit_flyer_visual_forensics");
    expect(ddqToolNames).not.toContain("generate_kfs_and_channel_kit");
  });

  it("supports registering additional enterprise RoleProfiles without modifying the core runtime", () => {
    const customRegistry = new AgentRoleRegistry([REGULATORY_COMPLIANCE_OFFICER_ROLE]);

    const enterpriseRiskRole: AgentRoleProfile = {
      identity: {
        roleId: "enterprise_risk_officer",
        displayName: "Cogent Enterprise Risk Officer",
        professionalTitle: "Chief Risk Officer Advisory Partner",
        targetAudience: ["Chief Risk Officers", "Board Risk Committees"],
        disposition: [
          {
            attribute: "Quantitative Rigor",
            expectedBehavior: "Quantifies exposure bands, likelihood, and residual risk after controls.",
          },
        ],
        workStandards: ["Structured risk registers with control owners and review cadences."],
        operationalBoundaries: ["Never approve risk appetite exceptions without Board Risk Committee sign-off."],
        communicationConstitution: {
          constitutionId: "DOC-10-ACPC",
          version: "1.1.0-PROD",
          voiceSummary: "Crisp Board Risk Committee executive voice.",
          forbiddenJargon: ["Autonomous Workflow Engine"],
          forbiddenSymbols: ["🚀"],
          citationStyle: "Cite CBN ERM Guidelines and internal risk appetite thresholds.",
          currencyDiscipline: "Use ₦ for Naira exposure and ISO codes for FX.",
          confidentialityTags: [],
        },
      },
      knowledgeScope: {
        authorizedSourceClasses: ["VERIFIED_OFFICIAL_SOURCE", "INTERNAL_PLAYBOOK"],
        primaryAuthorities: ["CBN", "NDIC"],
        panAfricanRegulators: [],
        globalCorridors: [],
        defaultJurisdictions: ["NG"],
        usesPrecedentMemory: true,
      },
      workflowPacks: {
        CONVERSATIONAL_ADVISORY: {
          id: "CONVERSATIONAL_ADVISORY",
          displayName: "Risk Appetite Advisory",
          description: "Advises on operational, credit, and liquidity risk controls.",
          workflowType: null,
          artifactType: null,
          isWorkProductWorkflow: false,
          densityTier: "TIER_2_WORKFLOW",
          reasoningSteps: ["Identify risk driver", "Quantify inherent vs residual risk", "Recommend mitigating controls"],
          deterministicPreChecks: [],
          allowedTools: ["search_institutional_knowledge", "recall_institutional_precedents"],
          maxToolRounds: 2,
          temperature: 0.2,
          prefersLiveWebSearch: false,
          systemPromptOverlay: "ACTIVE ASSIGNMENT: ENTERPRISE RISK APPETITE ADVISORY",
          requiredDeliverableSections: [],
          escalationPolicy: {
            verdictOptions: ["WITHIN_APPETITE", "ESCALATE_TO_BOARD_RISK_COMMITTEE"],
            evidenceGapMarker: "[NEEDS_RISK_DATA]",
            requiresHumanApprovalForFinalization: true,
            authorizedSignOffRoles: ["CHIEF_COMPLIANCE_OFFICER"],
            failClosedConditions: ["Exceeds Board-approved concentration or liquidity threshold."],
          },
        },
      },
      defaultWorkflowId: "CONVERSATIONAL_ADVISORY",
      rbacApprovalRoles: ["CHIEF_COMPLIANCE_OFFICER"],
      buildBaseSystemPrompt: () => "You are Cogent's Enterprise Risk Officer advisory partner.",
    };

    customRegistry.registerRole(enterpriseRiskRole);
    expect(customRegistry.hasRole("enterprise_risk_officer")).toBe(true);

    const plan = customRegistry.resolveTurnPlan({
      roleId: "enterprise_risk_officer",
      intentInput: { userPrompt: "Hi, how should we structure our operational risk register?" },
      allToolDeclarations: STATUTORY_TOOL_DECLARATIONS,
    });

    expect(plan.role.identity.roleId).toBe("enterprise_risk_officer");
    expect(plan.systemInstruction).toContain("Enterprise Risk Officer advisory partner");
    expect(plan.systemInstruction).toContain("ACTIVE ASSIGNMENT: ENTERPRISE RISK APPETITE ADVISORY");
    expect(plan.scopedToolDeclarations.map((t) => t.name)).toEqual([
      "search_institutional_knowledge",
      "recall_institutional_precedents",
    ]);
  });

  it("rejects malformed RoleProfiles whose defaultWorkflowId is missing from workflowPacks", () => {
    const customRegistry = new AgentRoleRegistry([]);
    expect(() =>
      customRegistry.registerRole({
        ...REGULATORY_COMPLIANCE_OFFICER_ROLE,
        defaultWorkflowId: "NON_EXISTENT_PACK",
      })
    ).toThrow(/defaultWorkflowId/);
  });

  it("wires CopilotOrchestrator to pass scoped system instructions and persist role_id + workflow_pack_id metadata", async () => {
    const { CopilotOrchestrator } = await import(
      "@/modules/conversations/copilot.orchestrator"
    );

    const generateContent = vi.fn().mockResolvedValueOnce({
      candidates: [
        {
          content: {
            parts: [
              {
                text: "Hello. I help compliance, legal, and product teams clear campaigns, structure new products, redline internal policies, and draft regulator responses.",
              },
            ],
          },
        },
      ],
    });

    const orchestrator = new CopilotOrchestrator(
      { models: { generateContent } } as unknown as GoogleGenAI,
      agentRoleRegistry
    );

    const events = [];
    for await (const ev of orchestrator.streamChat({
      tenantId: "00000000-0000-0000-0000-000000000001",
      userId: "user_cco",
      conversationId: "conv_role_1",
      userPrompt: "Hi, what can you help our compliance team do?",
      roleId: COMPLIANCE_OFFICER_ROLE_ID,
    })) {
      events.push(ev);
    }

    expect(events.some((e) => e.type === "message.completed")).toBe(true);
    const callConfig = generateContent.mock.calls[0]?.[0]?.config;
    expect(callConfig?.systemInstruction).toContain(
      "ACTIVE ASSIGNMENT: CONVERSATIONAL ADVISORY & FOLLOW-UP GUIDANCE"
    );
    expect(callConfig?.systemInstruction).not.toContain(
      "ACTIVE ASSIGNMENT: INTERNAL POLICY & SOP GAP REDLINE"
    );

    expect(mockUpdateMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          role_id: COMPLIANCE_OFFICER_ROLE_ID,
          workflow_pack_id: "CONVERSATIONAL_ADVISORY",
        }),
      })
    );
  });

  it("composes working methodology and escalation boundaries cleanly into system instructions", () => {
    const pack = REGULATORY_COMPLIANCE_OFFICER_ROLE.workflowPacks.SUPERVISORY_DDQ_RESPONSE!;
    const prompt = composeAgentSystemInstruction(REGULATORY_COMPLIANCE_OFFICER_ROLE, pack);
    expect(prompt).toContain("WORKING METHODOLOGY FOR THIS ASSIGNMENT:");
    expect(prompt).toContain("JUDGMENT & ESCALATION BOUNDARIES:");
    expect(prompt).toContain("[NEEDS_INTERNAL_EVIDENCE]");
  });
});
