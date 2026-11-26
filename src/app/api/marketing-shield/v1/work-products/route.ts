/**
 * Cogent Regulatory Intelligence Platform
 * Work Products Collection Endpoint
 * GET /api/marketing-shield/v1/work-products
 * POST /api/marketing-shield/v1/work-products
 */

import { z } from "zod";
import { createApiHandler } from "@/lib/api-handler";
import { createAdminSupabaseClient } from "@/lib/supabase";
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

    // If created from an existing chat message ("Save as Document"), attach the work product
    // reference to that message's metadata so the Studio card persists across reloads.
    if (context.body.message_id) {
      try {
        const supabase = createAdminSupabaseClient();
        const { data: existingMsg } = await supabase
          .from("marketing_messages")
          .select("id, metadata")
          .eq("tenant_id", context.tenant.tenantId)
          .eq("id", context.body.message_id)
          .maybeSingle();

        if (existingMsg) {
          const prevMeta = ((existingMsg.metadata || {}) as Record<string, unknown>);
          const wp = result.workProduct;
          await supabase
            .from("marketing_messages")
            .update({
              metadata: {
                ...prevMeta,
                work_product_id: wp.id,
                work_product: {
                  work_product_id: wp.id,
                  artifact_type: wp.artifact_type,
                  workflow_type: wp.workflow_type,
                  title: wp.title,
                  version_number: wp.version_number,
                },
              },
            })
            .eq("tenant_id", context.tenant.tenantId)
            .eq("id", context.body.message_id);
        }
      } catch {
        // Non-blocking: the work product itself is already persisted
      }
    }

    return {
      work_product: result.workProduct,
      created: result.created,
    };
  }
);
