/**
 * Cogent Compliance OS — Cross-Functional Stakeholder Review & Feasibility Blockers API (Stage 4)
 * POST  /api/marketing-shield/v1/policies/[id]/reviews  (Assign reviewers OR post clause comment/blocker)
 * PATCH /api/marketing-shield/v1/policies/[id]/reviews  (Resolve comment/blocker OR complete assignment)
 */

import { AppApiError, createApiHandler } from "@/lib/api-handler";
import {
  policyReviewPatchSchema,
  policyReviewPostSchema,
} from "@/contracts/policy.contracts";
import { policyWorkflowService } from "@/modules/policies";

export const POST = createApiHandler(
  {
    requiredPermission: "policy.review",
    bodySchema: policyReviewPostSchema,
  },
  async (_req, { tenant, params, body }) => {
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    if (!id) {
      throw new AppApiError("VALIDATION_FAILED", "Policy id is required", 400);
    }
    return policyWorkflowService.handleStakeholderReviewPost(tenant, id, body);
  },
);

export const PATCH = createApiHandler(
  {
    requiredPermission: "policy.review",
    bodySchema: policyReviewPatchSchema,
  },
  async (_req, { tenant, params, body }) => {
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    if (!id) {
      throw new AppApiError("VALIDATION_FAILED", "Policy id is required", 400);
    }
    return policyWorkflowService.handleStakeholderReviewPatch(tenant, id, body);
  },
);
