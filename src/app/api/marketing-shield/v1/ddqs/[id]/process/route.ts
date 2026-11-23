/**
 * Cogent Compliance Operations - Trigger/Resume DDQ Auto-Matching & Grounded Drafting
 * POST /api/marketing-shield/v1/ddqs/[id]/process
 */

import { z } from "zod";
import { createApiHandler } from "@/lib/api-handler";
import { ddqService } from "@/modules/ddq/ddq.service";
import { inngest } from "@/modules/jobs/inngest.client";
import { logger } from "@/lib/logger";

const processSchema = z.object({
  question_ids: z.array(z.string().uuid()).max(50).optional(),
  force_redraft: z.boolean().default(false).optional(),
  run_async: z.boolean().default(false).optional(),
  limit: z.number().int().min(1).max(50).default(25).optional(),
});

export const POST = createApiHandler(
  {
    requiredPermission: "campaign.create",
    bodySchema: processSchema,
  },
  async (_req, { tenant, params, body }) => {
    const ddqId = String(params.id || "");

    if (body.run_async && (!body.question_ids || body.question_ids.length === 0)) {
      try {
        await inngest.send({
          name: "marketing-shield/ddq.process",
          data: {
            ddqId,
            tenantId: tenant.tenantId,
            orgName: tenant.orgName,
            triggeredByUserId: tenant.userId,
            forceRedraft: Boolean(body.force_redraft),
          },
        });
        return { queued: true, ddq_id: ddqId };
      } catch (err) {
        logger.warn("Inngest async queue fallback to synchronous batch", {
          ddqId,
          error: (err as Error).message,
        });
      }
    }

    const result = await ddqService.processQuestionsBatch(
      tenant.tenantId,
      tenant.userId,
      tenant.orgName,
      ddqId,
      {
        questionIds: body.question_ids,
        limit: body.limit ?? 25,
        forceRedraft: Boolean(body.force_redraft),
        useAiSynthesis: true,
      }
    );

    return { queued: false, ddq_id: ddqId, ...result };
  }
);
