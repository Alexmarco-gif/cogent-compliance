/**
 * Cogent Compliance Platform - Marketing Shield
 * Progressive 60-Second Onboarding Engine Service
 * Document Reference: Document 11 (Section 2) & Document 08 (Phase 6 / Phase 12)
 */

import { createAdminSupabaseClient } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import {
  OnboardingProductTruthRequest,
  OnboardingScopeRequest,
  OnboardingStatusResponse,
  REGULATORY_SCOPES,
  RegulatoryScopeKey,
} from "@/contracts/billing.contracts";

export const SAMPLE_ONBOARDING_CAMPAIGN = {
  raw_copy:
    "Get an instant ₦500,000 loan in 3 minutes! Zero collateral, 0% hidden charges, guaranteed approval for all Nigerians.",
  compliant_rewrite:
    "Instant credit facilities up to ₦500,000 subject to credit assessment and terms. Transparent interest rates with zero unannounced fees in full compliance with FCCPC Digital Lending Regulations and CBN Consumer Protection Guidelines.",
  violations: [
    {
      code: "FCCPC-DEON-2025-R18",
      regulator: "FCCPC",
      phrase: "0% hidden charges",
      rule: "Digital Lending Regulation 18: Mandatory fee schedule & transparent penalty disclosures.",
      action: "Disclose all processing fees and late penalties explicitly in headline terms.",
    },
    {
      code: "ARCON-CODE-2023-S4.2",
      regulator: "ARCON",
      phrase: "guaranteed approval",
      rule: "ARCON Code Section 4.2: Prohibition of deceptive or unverified absolute guarantees.",
      action: "Replace absolute guarantee with eligibility qualification ('subject to credit assessment').",
    },
  ],
};

export class OnboardingService {
  /**
   * Retrieves the current onboarding progression for a tenant
   */
  public async getOnboardingStatus(tenantId: string): Promise<OnboardingStatusResponse> {
    const supabase = createAdminSupabaseClient();

    let stepCompleted = 0;
    let activeScopes: string[] = [];
    let onboardingCompleted = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let flagshipProduct: any = null;

    try {
      const { data: tenant } = await supabase
        .from("tenants")
        .select("settings")
        .eq("id", tenantId)
        .maybeSingle();

      const settings = (tenant?.settings || {}) as Record<string, unknown>;
      stepCompleted = (settings.onboarding_step as number) || 0;
      activeScopes = (settings.active_regulatory_scopes as string[]) || [];
      onboardingCompleted = Boolean(settings.onboarding_completed_at);

      // Check if product truth exists in campaign_products
      const { data: products } = await supabase
        .from("campaign_products")
        .select("id, product_name, interest_rate_monthly, metadata")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (products && products.length > 0 && products[0]) {
        const prod = products[0];
        flagshipProduct = {
          id: prod.id,
          name: prod.product_name,
          interest_rate_monthly: prod.interest_rate_monthly,
        };
      }
    } catch (err) {
      logger.warn("Error reading onboarding status from tenant settings", { tenantId, err });
    }

    return {
      stepCompleted,
      activeScopes: activeScopes.length > 0 ? activeScopes : [REGULATORY_SCOPES[0]],
      hasProductTruth: Boolean(flagshipProduct),
      onboardingCompleted,
      flagshipProduct,
    };
  }

  /**
   * Step 1: 1-Click Institution Scope Configuration
   * Writes active scopes to tenant settings & updates progression
   */
  public async saveInstitutionScope(
    tenantId: string,
    payload: OnboardingScopeRequest,
  ): Promise<{ success: boolean; scopes: RegulatoryScopeKey[] }> {
    const supabase = createAdminSupabaseClient();

    // 1. Fetch current settings
    const { data: tenant } = await supabase
      .from("tenants")
      .select("settings, name")
      .eq("id", tenantId)
      .single();

    const existingSettings = (tenant?.settings || {}) as Record<string, unknown>;
    const updatedSettings = {
      ...existingSettings,
      active_regulatory_scopes: payload.scopes,
      onboarding_step: Math.max(1, (existingSettings.onboarding_step as number) || 0),
      institution_scope_configured_at: new Date().toISOString(),
    };

    const updatePayload: Record<string, unknown> = {
      settings: updatedSettings,
    };

    if (payload.organization_name && payload.organization_name !== tenant?.name) {
      updatePayload.name = payload.organization_name;
    }

    const { error } = await supabase
      .from("tenants")
      .update(updatePayload)
      .eq("id", tenantId);

    if (error) {
      logger.error("Failed to update tenant institution scope", { tenantId, error });
      throw new Error("Failed to save regulatory scope configuration");
    }

    logger.info("Configured tenant regulatory scopes", {
      tenantId,
      scopes: payload.scopes,
    });

    return { success: true, scopes: payload.scopes };
  }

  /**
   * Step 2: "Seed Your Product Truth" (Rate card & truth baseline)
   * Upserts into campaign_products and advances step
   */
  public async seedProductTruth(
    tenantId: string,
    payload: OnboardingProductTruthRequest,
  ): Promise<{ success: boolean; productId?: string }> {
    const supabase = createAdminSupabaseClient();

    const isSkipped = payload.skip || !payload.product_name;
    const productName = isSkipped ? "Sample Quick Credit Loan" : payload.product_name;
    const monthlyRate = isSkipped ? 4.5 : payload.monthly_interest_rate_percent;
    const mandatoryFees = isSkipped ? 1.5 : payload.mandatory_fees_percent;
    const feeDescription = isSkipped
      ? "1.5% one-off disbursement fee"
      : payload.fee_description || `${mandatoryFees}% processing fee`;

    // 1. Insert/upsert product truth into campaign_products
    let productId: string | undefined;
    try {
      const { data: product, error } = await supabase
        .from("campaign_products")
        .insert({
          tenant_id: tenantId,
          product_name: productName,
          product_type: "DIGITAL_LOAN",
          interest_rate_monthly: monthlyRate,
          annual_percentage_rate: monthlyRate * 12,
          metadata: {
            mandatory_fees_percent: mandatoryFees,
            fee_description: feeDescription,
            seeded_via_onboarding: true,
            is_sample: isSkipped,
          },
        })
        .select("id")
        .single();

      if (!error && product) {
        productId = product.id;
      }
    } catch (insertErr) {
      logger.warn("Could not insert product into campaign_products table, persisting in settings", {
        insertErr,
      });
    }

    // 2. Advance onboarding step in tenant settings
    const { data: tenant } = await supabase
      .from("tenants")
      .select("settings")
      .eq("id", tenantId)
      .single();

    const existingSettings = (tenant?.settings || {}) as Record<string, unknown>;
    await supabase
      .from("tenants")
      .update({
        settings: {
          ...existingSettings,
          onboarding_step: Math.max(2, (existingSettings.onboarding_step as number) || 0),
          flagship_product_seeded: {
            name: productName,
            monthly_rate: monthlyRate,
            mandatory_fees: mandatoryFees,
            is_sample: isSkipped,
          },
        },
      })
      .eq("id", tenantId);

    logger.info("Successfully seeded product truth for tenant", {
      tenantId,
      productName,
      isSkipped,
    });

    return { success: true, productId };
  }

  /**
   * Step 3: Complete Progressive Onboarding
   * Marks workspace as initialized and activates 7-day Evaluation Pilot badge
   */
  public async completeOnboarding(tenantId: string): Promise<{ success: boolean; completedAt: string }> {
    const supabase = createAdminSupabaseClient();
    const completedAt = new Date().toISOString();

    const { data: tenant } = await supabase
      .from("tenants")
      .select("settings")
      .eq("id", tenantId)
      .single();

    const existingSettings = (tenant?.settings || {}) as Record<string, unknown>;
    await supabase
      .from("tenants")
      .update({
        settings: {
          ...existingSettings,
          onboarding_step: 3,
          onboarding_completed_at: completedAt,
        },
      })
      .eq("id", tenantId);

    logger.info("Tenant completed 60-second progressive onboarding", { tenantId, completedAt });

    return { success: true, completedAt };
  }
}

export const onboardingService = new OnboardingService();
