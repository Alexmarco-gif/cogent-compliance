/**
 * Cogent Marketing Shield - Campaign Products Endpoint
 * POST /api/marketing-shield/v1/products
 * GET  /api/marketing-shield/v1/products
 * Document Reference: Document 04 (Section 6.2), Document 08 (Phase 10)
 */

import { createApiHandler } from "@/lib/api-handler";
import { createProductSchema } from "@/contracts/knowledge-product.contracts";
import { productService } from "@/modules/knowledge-base/product.service";

/**
 * GET /api/marketing-shield/v1/products
 * Lists institutional product truth schedules.
 */
export const GET = createApiHandler(
  {
    requiredPermission: "campaign.read",
  },
  async (req, { tenant }) => {
    const url = new URL(req.url);
    const status = (url.searchParams.get("status") as "ACTIVE" | "INACTIVE") || undefined;
    const query = url.searchParams.get("query") || undefined;

    return productService.listProducts(tenant.tenantId, { status, query });
  }
);

/**
 * POST /api/marketing-shield/v1/products
 * Creates a new product rate/fee truth schedule (used by Deterministic Lock 2).
 */
export const POST = createApiHandler(
  {
    requiredPermission: "product.write",
    bodySchema: createProductSchema,
  },
  async (_req, { tenant, body }) => {
    return productService.createProduct(tenant.tenantId, tenant.userId, body);
  }
);
