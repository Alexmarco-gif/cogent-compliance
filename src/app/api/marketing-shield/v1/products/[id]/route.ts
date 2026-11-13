/**
 * Cogent Marketing Shield - Individual Campaign Product Endpoint
 * GET    /api/marketing-shield/v1/products/[id]
 * PATCH  /api/marketing-shield/v1/products/[id]
 * DELETE /api/marketing-shield/v1/products/[id]
 * Document Reference: Document 04 (Section 6.2), Document 08 (Phase 10)
 */

import { createApiHandler } from "@/lib/api-handler";
import { updateProductSchema } from "@/contracts/knowledge-product.contracts";
import { productService } from "@/modules/knowledge-base/product.service";

/**
 * GET /api/marketing-shield/v1/products/[id]
 */
export const GET = createApiHandler(
  {
    requiredPermission: "campaign.read",
  },
  async (_req, { tenant, params }) => {
    const productId = params.id as string;
    return productService.getProduct(tenant.tenantId, productId);
  }
);

/**
 * PATCH /api/marketing-shield/v1/products/[id]
 * Updates product truth terms.
 */
export const PATCH = createApiHandler(
  {
    requiredPermission: "product.write",
    bodySchema: updateProductSchema,
  },
  async (_req, { tenant, params, body }) => {
    const productId = params.id as string;
    return productService.updateProduct(tenant.tenantId, tenant.userId, productId, body);
  }
);

/**
 * DELETE /api/marketing-shield/v1/products/[id]
 */
export const DELETE = createApiHandler(
  {
    requiredPermission: "product.write",
  },
  async (_req, { tenant, params }) => {
    const productId = params.id as string;
    return productService.deleteProduct(tenant.tenantId, tenant.userId, productId);
  }
);
