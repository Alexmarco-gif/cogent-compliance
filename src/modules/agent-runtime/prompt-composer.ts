/**
 * Cogent Agent Runtime — Scoped Professional System Prompt Composer
 *
 * Composes a clean, high-signal system instruction from:
 *  - Role Base Identity, Personality, Communication Constitution & Operational Boundaries
 *  - Active WorkflowPack Reasoning Methodology, Deliverable Architecture & Escalation Rules
 *
 * Inactive workflow blueprints are deliberately excluded so prompts stay focused,
 * compact, and free of cross-workflow instruction interference.
 */

import type {
  AgentRoleProfile,
  WorkflowPackDefinition,
} from "@/contracts/agent-runtime.contracts";

export function composeAgentSystemInstruction(
  role: AgentRoleProfile,
  workflowPack: WorkflowPackDefinition
): string {
  const basePrompt = role.buildBaseSystemPrompt().trim();

  const reasoningBlock =
    workflowPack.reasoningSteps.length > 0
      ? `\nWORKING METHODOLOGY FOR THIS ASSIGNMENT:\n${workflowPack.reasoningSteps
          .map((step, index) => `${index + 1}. ${step}`)
          .join("\n")}`
      : "";

  const escalationBlock =
    workflowPack.escalationPolicy.failClosedConditions.length > 0
      ? `\nJUDGMENT & ESCALATION BOUNDARIES:\n- Permitted verdicts: ${workflowPack.escalationPolicy.verdictOptions.join(" | ")}\n- Missing internal evidence marker: \`${workflowPack.escalationPolicy.evidenceGapMarker}\`\n- Fail-closed triggers:\n${workflowPack.escalationPolicy.failClosedConditions
          .map((cond) => `  * ${cond}`)
          .join("\n")}`
      : "";

  return `${basePrompt}

${workflowPack.systemPromptOverlay.trim()}${reasoningBlock}${escalationBlock}`.trim();
}
