/**
 * Cogent Agent Runtime — Workflow-Scoped Tool Filtering
 *
 * Prevents exposing all 23+ tools on every turn. Each WorkflowPack declares
 * the exact tool subset relevant to its assignment, reducing tool-selection noise,
 * token overhead, and unintended cross-workflow tool invocations.
 */

import type { FunctionDeclaration } from "@google/genai";
import type { WorkflowPackDefinition } from "@/contracts/agent-runtime.contracts";

/**
 * Returns only the FunctionDeclarations permitted by the active WorkflowPack.
 * If `workflowPack.allowedTools` is empty or `allDeclarations` is empty (e.g. unit mocks),
 * returns `allDeclarations` unchanged.
 */
export function scopeToolDeclarationsForPack(
  allDeclarations: FunctionDeclaration[],
  workflowPack: WorkflowPackDefinition
): FunctionDeclaration[] {
  if (!allDeclarations || allDeclarations.length === 0) {
    return [];
  }
  if (!workflowPack.allowedTools || workflowPack.allowedTools.length === 0) {
    return allDeclarations;
  }

  const allowedSet = new Set(workflowPack.allowedTools);
  return allDeclarations.filter((decl) => decl.name != null && allowedSet.has(decl.name));
}
