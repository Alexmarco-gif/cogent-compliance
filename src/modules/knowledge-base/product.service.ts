/**
 * Cogent Marketing Shield - Product Truth Service
 * Document Reference: Document 03 (Section 3.3), Document 04 (Section 6.2), Document 08 (Phase 10)
 *
 * Enforces structured institutional product rates, APRs, fees, tenors, and disclosures
 * used as the ground truth for Deterministic Lock 2 compliance verification.
 */

import { createAdminSupabaseClient } from "@/lib/supabase";
import { auditService } from "@/modules/audit/audit.service";
import { logger } from "@/lib/logger";
import {
  CreateProductInput,
  UpdateProductInput,
  CampaignProduct,
} from "@/contracts/knowledge-product.contracts";

export class ProductService {
  /**
   * Registers a new campaign product truth schedule in campaign_products.
   */
  public async createProduct(
    tenantId: string,
    userId: string,
    input: CreateProductInput
  ): Promise<CampaignProduct> {
    const supabase = createAdminSupabaseClient();

    const insertPayload = {
      tenant_id: tenantId,
      product_name: input.product_name,
      product_type: input.product_type,
      description: input.description || null,
      approved_terms: input.approved_terms,
      status: input.status || "ACTIVE",
    };

    const { data: product, error } = await supabase
      .from("campaign_products")
      .insert(insertPayload)
      .select("*")
      .single();

    if (error || !product) {
      logger.error("Failed to create campaign product truth", {
        tenantId,
        productName: input.product_name,
        error: error?.message,
      });
      throw new Error(`Failed to create product truth: ${error?.message || "Unknown error"}`);
    }

    // Append hash-chained audit record
    await auditService.appendEvent({
      tenantId,
      actorId: userId,
      actorType: "USER",
      action: "CAMPAIGN_PRODUCT_TRUTH_CREATED",
      entityType: "CAMPAIGN_PRODUCT",
      entityId: product.id,
      eventData: {
        productName: product.product_name,
        productType: product.product_type,
        approvedTerms: product.approved_terms,
      },
    });

    logger.info("Created campaign product truth schedule", {
      tenantId,
      productId: product.id,
      productName: product.product_name,
    });

    return product as CampaignProduct;
  }

  /**
   * Updates an existing campaign product truth schedule.
   */
  public async updateProduct(
    tenantId: string,
    userId: string,
    productId: string,
    input: UpdateProductInput
  ): Promise<CampaignProduct> {
    const supabase = createAdminSupabaseClient();

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (input.product_name !== undefined) updatePayload.product_name = input.product_name;
    if (input.product_type !== undefined) updatePayload.product_type = input.product_type;
    if (input.description !== undefined) updatePayload.description = input.description;
    if (input.approved_terms !== undefined) updatePayload.approved_terms = input.approved_terms;
    if (input.status !== undefined) updatePayload.status = input.status;

    const { data: updated, error } = await supabase
      .from("campaign_products")
      .update(updatePayload)
      .eq("id", productId)
      .eq("tenant_id", tenantId)
      .select("*")
      .single();

    if (error || !updated) {
      logger.error("Failed to update campaign product truth", {
        tenantId,
        productId,
        error: error?.message,
      });
      throw new Error(`Failed to update product truth: ${error?.message || "Product not found"}`);
    }

    // Append hash-chained audit record
    await auditService.appendEvent({
      tenantId,
      actorId: userId,
      actorType: "USER",
      action: "CAMPAIGN_PRODUCT_TRUTH_UPDATED",
      entityType: "CAMPAIGN_PRODUCT",
      entityId: productId,
      eventData: {
        updates: input,
        newApprovedTerms: updated.approved_terms,
      },
    });

    logger.info("Updated campaign product truth schedule", {
      tenantId,
      productId,
    });

    return updated as CampaignProduct;
  }

  /**
   * Retrieves a single campaign product truth record by ID.
   */
  public async getProduct(tenantId: string, productId: string): Promise<CampaignProduct> {
    const supabase = createAdminSupabaseClient();

    const { data: product, error } = await supabase
      .from("campaign_products")
      .select("*")
      .eq("id", productId)
      .eq("tenant_id", tenantId)
      .single();

    if (error || !product) {
      throw new Error(`Product not found with id: ${productId}`);
    }

    return product as CampaignProduct;
  }

  /**
   * Lists all products for a tenant with optional filtering.
   */
  public async listProducts(
    tenantId: string,
    options?: { status?: "ACTIVE" | "INACTIVE"; query?: string }
  ): Promise<CampaignProduct[]> {
    const supabase = createAdminSupabaseClient();

    let query = supabase
      .from("campaign_products")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (options?.status) {
      query = query.eq("status", options.status);
    }

    if (options?.query) {
      query = query.ilike("product_name", `%${options.query}%`);
    }

    const { data: products, error } = await query;

    if (error) {
      logger.error("Failed to list campaign products", { tenantId, error: error.message });
      throw new Error(`Failed to list products: ${error.message}`);
    }

    return (products || []) as CampaignProduct[];
  }

  /**
   * Deactivates or deletes a product truth schedule.
   */
  public async deleteProduct(
    tenantId: string,
    userId: string,
    productId: string
  ): Promise<{ success: boolean }> {
    const supabase = createAdminSupabaseClient();

    const { error } = await supabase
      .from("campaign_products")
      .delete()
      .eq("id", productId)
      .eq("tenant_id", tenantId);

    if (error) {
      logger.error("Failed to delete campaign product", { tenantId, productId, error: error.message });
      throw new Error(`Failed to delete product: ${error.message}`);
    }

    await auditService.appendEvent({
      tenantId,
      actorId: userId,
      actorType: "USER",
      action: "CAMPAIGN_PRODUCT_TRUTH_DELETED",
      entityType: "CAMPAIGN_PRODUCT",
      entityId: productId,
      eventData: { deletedAt: new Date().toISOString() },
    });

    return { success: true };
  }

  /**
   * Resolves product truth for Deterministic Lock 2 by ID or matching product name.
   */
  public async getProductTruth(
    tenantId: string,
    query?: { productId?: string; productName?: string }
  ): Promise<CampaignProduct | null> {
    const supabase = createAdminSupabaseClient();

    if (query?.productId) {
      const { data } = await supabase
        .from("campaign_products")
        .select("*")
        .eq("id", query.productId)
        .eq("tenant_id", tenantId)
        .eq("status", "ACTIVE")
        .maybeSingle();

      if (data) return data as CampaignProduct;
    }

    if (query?.productName) {
      const { data } = await supabase
        .from("campaign_products")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("status", "ACTIVE")
        .ilike("product_name", `%${query.productName}%`)
        .limit(1)
        .maybeSingle();

      if (data) return data as CampaignProduct;
    }

    // Default to first active product if tenant has only one active product
    const { data: products } = await supabase
      .from("campaign_products")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("status", "ACTIVE")
      .limit(2);

    if (products && products.length === 1) {
      return products[0] as CampaignProduct;
    }

    return null;
  }
}

export const productService = new ProductService();
