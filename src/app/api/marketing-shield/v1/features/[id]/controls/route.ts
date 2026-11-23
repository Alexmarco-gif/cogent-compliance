/**
 * Cogent Compliance Platform — Feature Controls, Evidence Attachment & 2nd-Line Verification API
 * POST  /api/marketing-shield/v1/features/[id]/controls  (create control)
 * PATCH /api/marketing-shield/v1/features/[id]/controls  (attach evidence OR 2nd-line verify)
 */

import { z } from "zod";
import { AppApiError, createApiHandler } from "@/lib/api-handler";
import {
  attachControlEvidenceSchema,
  createControlSchema,
  verifyControlSchema,
} from "@/contracts/feature-governance.contracts";
import { featureGovernanceService } from "@/modules/feature-governance/feature-governance.service";

export const dynamic = "force-dynamic";

const uuidSchema = z.string().uuid();

const patchControlActionSchema = z.discriminatedUnion("action", [
  attachControlEvidenceSchema.extend({ action: z.literal("ATTACH_EVIDENCE") }),
  verifyControlSchema.extend({ action: z.literal("VERIFY_CONTROL") }),
]);

export const POST = createApiHandler(
  {
    requiredPermission: "feature.control.manage",
    bodySchema: createControlSchema,
  },
  async (_req, { tenant, params, body }) => {
    const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
    const parsedId = uuidSchema.safeParse(rawId);
    if (!parsedId.success) {
      throw new AppApiError("VALIDATION_FAILED", "Invalid feature UUID", 400);
    }

    const control = await featureGovernanceService.addControl(tenant, parsedId.data, body);
    return { control };
  }
);

export const PATCH = createApiHandler(
  {
    requiredPermission: "feature.read",
    bodySchema: patchControlActionSchema,
  },
  async (_req, { tenant, params, body }) => {
    const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
    const parsedId = uuidSchema.safeParse(rawId);
    if (!parsedId.success) {
      throw new AppApiError("VALIDATION_FAILED", "Invalid feature UUID", 400);
    }

    if (body.action === "ATTACH_EVIDENCE") {
      const control = await featureGovernanceService.attachControlEvidence(
        tenant,
        parsedId.data,
        body
      );
      return { control };
    }

    const control = await featureGovernanceService.verifyControl(tenant, parsedId.data, body);
    return { control };
  }
);
