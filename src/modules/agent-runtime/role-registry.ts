/**
 * Cogent Agent Runtime — Multi-Role Professional Agent Registry
 *
 * Hosts Cogent's flagship Regulatory & Compliance Officer role out of the box
 * while providing a clean, typed registration seam for additional enterprise
 * professional roles (e.g., MLRO / Financial Crime, General Counsel, Enterprise Risk)
 * without modifying the core execution engine.
 */

import type { FunctionDeclaration } from "@google/genai";
import type {
  AgentRoleProfile,
  ResolvedAgentTurnPlan,
  WorkflowPackDefinition,
} from "@/contracts/agent-runtime.contracts";
import {
  agentIdentityProfileSchema,
  agentKnowledgeScopeSchema,
} from "@/contracts/agent-runtime.contracts";
import {
  COMPLIANCE_OFFICER_ROLE_ID,
  REGULATORY_COMPLIANCE_OFFICER_ROLE,
} from "./roles/compliance-officer";
import {
  classifyComplianceTurnIntent,
  type IntentClassificationInput,
} from "./intent-router";
import { composeAgentSystemInstruction } from "./prompt-composer";
import { scopeToolDeclarationsForPack } from "./tool-scoper";

export class AgentRoleRegistry {
  private readonly roles = new Map<string, AgentRoleProfile>();
  private defaultRoleId: string;

  constructor(initialRoles: AgentRoleProfile[] = [REGULATORY_COMPLIANCE_OFFICER_ROLE]) {
    this.defaultRoleId = COMPLIANCE_OFFICER_ROLE_ID;
    for (const role of initialRoles) {
      this.registerRole(role);
    }
  }

  /**
   * Validates and registers a Professional Agent RoleProfile.
   */
  public registerRole(role: AgentRoleProfile): void {
    agentIdentityProfileSchema.parse(role.identity);
    agentKnowledgeScopeSchema.parse(role.knowledgeScope);

    if (!role.workflowPacks[role.defaultWorkflowId]) {
      throw new Error(
        `Role '${role.identity.roleId}' defaultWorkflowId '${role.defaultWorkflowId}' does not exist in workflowPacks.`
      );
    }

    this.roles.set(role.identity.roleId, role);
  }

  public getRole(roleId?: string | null): AgentRoleProfile {
    if (roleId && this.roles.has(roleId)) {
      return this.roles.get(roleId)!;
    }
    const fallback = this.roles.get(this.defaultRoleId);
    if (!fallback) {
      throw new Error(`Default agent role '${this.defaultRoleId}' is not registered.`);
    }
    return fallback;
  }

  public hasRole(roleId: string): boolean {
    return this.roles.has(roleId);
  }

  public listRoles(): Array<{
    roleId: string;
    displayName: string;
    professionalTitle: string;
    workflowIds: string[];
    rbacApprovalRoles: string[];
  }> {
    return Array.from(this.roles.values()).map((r) => ({
      roleId: r.identity.roleId,
      displayName: r.identity.displayName,
      professionalTitle: r.identity.professionalTitle,
      workflowIds: Object.keys(r.workflowPacks),
      rbacApprovalRoles: [...r.rbacApprovalRoles],
    }));
  }

  public resolveWorkflowPack(
    roleId: string | null | undefined,
    workflowId: string
  ): WorkflowPackDefinition {
    const role = this.getRole(roleId);
    return (
      role.workflowPacks[workflowId] || role.workflowPacks[role.defaultWorkflowId]!
    );
  }

  /**
   * Resolves the full scoped execution plan for a single conversation turn:
   *  - Active RoleProfile
   *  - Classified WorkflowPack
   *  - Scoped System Instruction (zero cross-workflow prompt bloat)
   *  - Scoped Tool Declarations
   *  - Calibrated temperature & maxToolRounds
   */
  public resolveTurnPlan(params: {
    roleId?: string | null;
    intentInput: IntentClassificationInput;
    extractedAssetTexts?: string[];
    explicitWorkflowId?: string;
    allToolDeclarations: FunctionDeclaration[];
  }): ResolvedAgentTurnPlan {
    const role = this.getRole(params.roleId);
    const classifiedIntent =
      params.explicitWorkflowId ||
      classifyComplianceTurnIntent(
        params.intentInput,
        params.extractedAssetTexts || []
      );

    const workflowPack =
      role.workflowPacks[classifiedIntent] ||
      role.workflowPacks[role.defaultWorkflowId]!;

    const systemInstruction = composeAgentSystemInstruction(role, workflowPack);
    const scopedToolDeclarations = scopeToolDeclarationsForPack(
      params.allToolDeclarations,
      workflowPack
    );

    return {
      role,
      workflowPack,
      turnIntent: workflowPack.id,
      systemInstruction,
      scopedToolDeclarations,
      maxToolRounds: workflowPack.maxToolRounds,
      temperature: workflowPack.temperature,
    };
  }
}

export const agentRoleRegistry = new AgentRoleRegistry();
