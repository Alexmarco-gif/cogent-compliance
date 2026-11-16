/**
 * Cogent Marketing Shield - Cross-Thread Institutional Memory & CCO Precedent Engine
 * Document Reference: Document 13 (Section 4.2 Tool 23, Section 5.1)
 *
 * Gives Cogent persistent institutional memory across conversations:
 * - Resolves the tenant's regulatory profile (license tier, active regulator scopes)
 * - Auto-matches promotional copy to the tenant's saved `campaign_products` without manual selection
 * - Recalls past CCO/Legal approval rejections and recurring compliance findings as institutional precedents
 */

import { createAdminSupabaseClient } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { CampaignProduct } from "@/contracts/knowledge-product.contracts";
import {
  InstitutionLicenseTier,
  licenseScopeService,
} from "@/modules/compliance-assessment/license-scope.service";

export interface InstitutionalPrecedent {
  sourceType: "CCO_REJECTION_DECISION" | "RECURRING_FINDING_PATTERN" | "ACTIVE_PLAYBOOK_RULE";
  title: string;
  summary: string;
  decidedAt?: string;
  severity?: string;
}

export interface TenantInstitutionalMemory {
  tenantId: string;
  institutionName: string;
  licenseTier: InstitutionLicenseTier;
  activeRegulatoryScopes: string[];
  activeProducts: CampaignProduct[];
  autoMatchedProduct: CampaignProduct | null;
  precedents: InstitutionalPrecedent[];
}

export class PrecedentMemoryService {
  /**
   * Automatically matches user prompt or flyer OCR text against the tenant's active `campaign_products`
   * so Cogent cross-checks rate cards even when the user did not select a product from the UI dropdown.
   */
  public matchProductFromCatalog(
    text: string,
    products: CampaignProduct[],
    explicitProductId?: string | null
  ): CampaignProduct | null {
    if (!products || products.length === 0) return null;

    if (explicitProductId) {
      const exact = products.find((p) => p.id === explicitProductId);
      if (exact) return exact;
    }

    const lowerText = text.toLowerCase();

    // 1. Direct or tokenized product name match
    let bestProduct: CampaignProduct | null = null;
    let bestScore = 0;

    for (const prod of products) {
      const prodNameLower = prod.product_name.toLowerCase();
      if (lowerText.includes(prodNameLower)) {
        return prod;
      }

      const tokens = prodNameLower
        .split(/[\s\-_]+/)
        .filter((t) => t.length >= 3 && !["loan", "credit", "bank", "the", "and"].includes(t));

      let score = 0;
      for (const tok of tokens) {
        if (lowerText.includes(tok)) {
          score += 3;
        }
      }

      if (
        /\b(?:loan|borrow|interest|apr|repay|disburse|credit|cash)\b/i.test(lowerText) &&
        /loan|lending|credit|advance/i.test(`${prod.product_name} ${prod.product_type}`)
      ) {
        score += 1;
      }

      if (score > bestScore) {
        bestScore = score;
        bestProduct = prod;
      }
    }

    // If only 1 active product exists in the tenant workspace and the user is asking about a promotion/rate/flyer,
    // use that flagship product as the silent cross-check baseline.
    if (!bestProduct && products.length > 0 && products[0]) {
      const hasPromotionalSignal =
        /\b(?:loan|borrow|interest|apr|fee|%|₦|flyer|campaign|ad|promo|landing\s*page|app\s*store)\b/i.test(
          lowerText
        );
      if (hasPromotionalSignal) {
        return products[0];
      }
    }

    return bestProduct;
  }

  /**
   * Loads the tenant's full institutional memory (license profile, product rate cards,
   * auto-matched product, and historical CCO redlines/rejections).
   */
  public async loadInstitutionalMemory(params: {
    tenantId: string;
    userPrompt: string;
    explicitProductId?: string | null;
    limitPrecedents?: number;
  }): Promise<TenantInstitutionalMemory> {
    const supabase = createAdminSupabaseClient();
    const limit = Math.min(params.limitPrecedents || 5, 15);

    let institutionName = "Regulated Financial Institution";
    let activeRegulatoryScopes: string[] = ["CBN", "FCCPC", "ARCON", "NDPC", "SEC"];
    let rawLicenseTier: string | null = null;
    let activeProducts: CampaignProduct[] = [];
    const precedents: InstitutionalPrecedent[] = [];

    try {
      const [tenantRes, productsRes, approvalsRes, findingsRes, rulesRes] = await Promise.all([
        Promise.resolve(
          supabase
            .from("tenants")
            .select("name, settings")
            .eq("id", params.tenantId)
            .maybeSingle()
        ).catch(() => ({ data: null })),
        Promise.resolve(
          supabase
            .from("campaign_products")
            .select("*")
            .eq("tenant_id", params.tenantId)
            .eq("status", "ACTIVE")
            .order("created_at", { ascending: false })
            .limit(20)
        ).catch(() => ({ data: null })),
        Promise.resolve(
          supabase
            .from("campaign_approvals")
            .select("decision, decision_reason, decided_at")
            .eq("tenant_id", params.tenantId)
            .order("decided_at", { ascending: false })
            .limit(limit)
        ).catch(() => ({ data: null })),
        Promise.resolve(
          supabase
            .from("compliance_findings")
            .select("finding_code, title, recommended_action, severity, created_at")
            .eq("tenant_id", params.tenantId)
            .in("severity", ["CRITICAL", "HIGH"])
            .order("created_at", { ascending: false })
            .limit(limit)
        ).catch(() => ({ data: null })),
        Promise.resolve(
          supabase
            .from("marketing_knowledge_rules")
            .select("rule_title, rule_text, rule_type, severity")
            .eq("tenant_id", params.tenantId)
            .eq("status", "ACTIVE")
            .limit(limit)
        ).catch(() => ({ data: null })),
      ]);

      if (tenantRes?.data) {
        institutionName = tenantRes.data.name || institutionName;
        const settings = (tenantRes.data.settings || {}) as Record<string, unknown>;
        if (Array.isArray(settings.active_regulatory_scopes)) {
          activeRegulatoryScopes = settings.active_regulatory_scopes.map(String);
        }
        if (typeof settings.institution_license_tier === "string") {
          rawLicenseTier = settings.institution_license_tier;
        }
      }

      if (productsRes?.data && productsRes.data.length > 0) {
        activeProducts = (productsRes.data as Array<Record<string, unknown>>).map((row) => {
          const existingTerms = (row.approved_terms || {}) as Record<string, unknown>;
          const meta = (row.metadata || {}) as Record<string, unknown>;
          const monthlyRate =
            typeof row.interest_rate_monthly === "number"
              ? row.interest_rate_monthly
              : undefined;

          return {
            id: String(row.id),
            tenant_id: String(row.tenant_id),
            product_name: String(row.product_name || "Credit Product"),
            product_type: String(row.product_type || "DIGITAL_LOAN"),
            description: row.description ? String(row.description) : null,
            status: (row.status as "ACTIVE" | "INACTIVE") || "ACTIVE",
            created_at: String(row.created_at || new Date().toISOString()),
            updated_at: String(row.updated_at || new Date().toISOString()),
            approved_terms: {
              interest_rate_min:
                typeof existingTerms.interest_rate_min === "number"
                  ? existingTerms.interest_rate_min
                  : monthlyRate,
              interest_rate_max:
                typeof existingTerms.interest_rate_max === "number"
                  ? existingTerms.interest_rate_max
                  : monthlyRate,
              interest_rate_type:
                (existingTerms.interest_rate_type as "APR" | "MONTHLY" | "FLAT" | "DAILY") ||
                (monthlyRate !== undefined ? "MONTHLY" : "APR"),
              processing_fee_percent:
                typeof existingTerms.processing_fee_percent === "number"
                  ? existingTerms.processing_fee_percent
                  : typeof meta.mandatory_fees_percent === "number"
                    ? meta.mandatory_fees_percent
                    : undefined,
              management_fee_percent:
                typeof existingTerms.management_fee_percent === "number"
                  ? existingTerms.management_fee_percent
                  : undefined,
              penalty_fee_percent:
                typeof existingTerms.penalty_fee_percent === "number"
                  ? existingTerms.penalty_fee_percent
                  : undefined,
              tenor_min_days:
                typeof existingTerms.tenor_min_days === "number"
                  ? existingTerms.tenor_min_days
                  : undefined,
              tenor_max_days:
                typeof existingTerms.tenor_max_days === "number"
                  ? existingTerms.tenor_max_days
                  : undefined,
              required_disclosures: Array.isArray(existingTerms.required_disclosures)
                ? existingTerms.required_disclosures.map(String)
                : [],
              custom_terms:
                (existingTerms.custom_terms as Record<string, unknown>) || {},
            },
          };
        });
      }

      if (approvalsRes?.data) {
        for (const app of approvalsRes.data) {
          if (app.decision_reason) {
            precedents.push({
              sourceType: "CCO_REJECTION_DECISION",
              title: `CCO/Legal ${app.decision} Precedent`,
              summary: String(app.decision_reason),
              decidedAt: app.decided_at ? String(app.decided_at) : undefined,
              severity: app.decision === "REJECTED" ? "HIGH" : "LOW",
            });
          }
        }
      }

      if (rulesRes?.data) {
        for (const rule of rulesRes.data) {
          precedents.push({
            sourceType: "ACTIVE_PLAYBOOK_RULE",
            title: String(rule.rule_title),
            summary: String(rule.rule_text),
            severity: String(rule.severity || "HIGH"),
          });
        }
      }

      if (findingsRes?.data) {
        const seenCodes = new Set<string>();
        for (const f of findingsRes.data) {
          const code = String(f.finding_code || f.title);
          if (!seenCodes.has(code)) {
            seenCodes.add(code);
            precedents.push({
              sourceType: "RECURRING_FINDING_PATTERN",
              title: String(f.title),
              summary: String(f.recommended_action || ""),
              decidedAt: f.created_at ? String(f.created_at) : undefined,
              severity: String(f.severity || "HIGH"),
            });
          }
        }
      }
    } catch (err) {
      logger.warn("Institutional memory hydration encountered non-fatal error", {
        tenantId: params.tenantId,
        error: (err as Error).message,
      });
    }

    const licenseTier = licenseScopeService.resolveLicenseTier(
      rawLicenseTier,
      activeRegulatoryScopes
    );

    const autoMatchedProduct = this.matchProductFromCatalog(
      params.userPrompt,
      activeProducts,
      params.explicitProductId
    );

    return {
      tenantId: params.tenantId,
      institutionName,
      licenseTier,
      activeRegulatoryScopes,
      activeProducts,
      autoMatchedProduct,
      precedents: precedents.slice(0, limit),
    };
  }
}

export const precedentMemoryService = new PrecedentMemoryService();
