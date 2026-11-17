/**
 * Cogent Regulatory Intelligence Platform
 * Work Products Collection Endpoint
 * GET /api/marketing-shield/v1/work-products
 * POST /api/marketing-shield/v1/work-products
 */

import { z } from "zod";
import { createApiHandler } from "@/lib/api-handler";
import {
  createWorkProductSchema,
  WORKFLOW_TYPES,
  WORK_PRODUCT_STATUSES,
} from "@/contracts/work-product.contracts";
import { workProductService } from "@/modules/work-products/work-product.service";

export const dynamic = "force-dynamic";

const listWorkProductsQuerySchema = z.object({
  conversation_id: z.string().uuid().optional(),
  workflow_type: z.enum(WORKFLOW_TYPES).optional(),
  status: z.enum(WORK_PRODUCT_STATUSES).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30).optional(),
});

export const GET = createApiHandler(
  {
    querySchema: listWorkProductsQuerySchema,
    requiredPermission: "conversation.read",
  },
  async (_req, context) => {
    const items = await workProductService.listWorkProducts(
      context.tenant.tenantId,
      context.query
    );
    return {
      work_products: items,
      count: items.length,
    };
  }
);

export const POST = createApiHandler(
  {
    bodySchema: createWorkProductSchema,
    requiredPermission: "conversation.create",
  },
  async (_req, context) => {
    const result = await workProductService.upsertWorkProduct(
      context.tenant.tenantId,
      context.tenant.userId,
      {
        ...context.body,
        status: context.body.status ?? "DRAFT",
      }
    );
    return {
      work_product: result.workProduct,
      created: result.created,
    };
  }
);
