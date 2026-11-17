/**
 * Cogent Regulatory Intelligence Platform
 * Work Product Item Detail & Inline Studio Edit Endpoint
 * GET /api/marketing-shield/v1/work-products/[id]
 * PATCH /api/marketing-shield/v1/work-products/[id]
 */

import { z } from "zod";
import { AppApiError, createApiHandler } from "@/lib/api-handler";
import { updateWorkProductSchema } from "@/contracts/work-product.contracts";
import { workProductService } from "@/modules/work-products/work-product.service";

export const dynamic = "force-dynamic";

const uuidSchema = z.string().uuid();

export const GET = createApiHandler(
  {
    requiredPermission: "conversation.read",
  },
  async (_req, context) => {
    const rawId = Array.isArray(context.params.id)
      ? context.params.id[0]
      : context.params.id;
    const parsedId = uuidSchema.safeParse(rawId);
    if (!parsedId.success) {
      throw new AppApiError("VALIDATION_FAILED", "Invalid work product UUID", 400);
    }

    const record = await workProductService.getWorkProductWithRevisions(
      context.tenant.tenantId,
      parsedId.data
    );
    if (!record) {
      throw new AppApiError("NOT_FOUND", "Work product not found", 404);
    }

    return record;
  }
);

export const PATCH = createApiHandler(
  {
    bodySchema: updateWorkProductSchema,
    requiredPermission: "conversation.create",
  },
  async (_req, context) => {
    const rawId = Array.isArray(context.params.id)
      ? context.params.id[0]
      : context.params.id;
    const parsedId = uuidSchema.safeParse(rawId);
    if (!parsedId.success) {
      throw new AppApiError("VALIDATION_FAILED", "Invalid work product UUID", 400);
    }

    try {
      const updated = await workProductService.updateWorkProductInline(
        context.tenant.tenantId,
        context.tenant.userId,
        parsedId.data,
        context.body
      );
      return {
        work_product: updated.workProduct,
        revision: updated.revision,
      };
    } catch (err) {
      const msg = (err as Error).message || "Unable to update work product";
      if (msg.toLowerCase().includes("not found")) {
        throw new AppApiError("NOT_FOUND", "Work product not found", 404);
      }
      throw err;
    }
  }
);
