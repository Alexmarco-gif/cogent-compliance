/**
 * Cogent Compliance Platform - Marketing Shield
 * Billing, Plans, Entitlements & Onboarding Contracts
 * Document Reference: Document 11 & Document 08 (Phase 6 / Phase 12)
 */

import { z } from "zod";
import { CANONICAL_ROLES } from "@/modules/auth-tenancy/types";

// ---------------------------------------------------------------------------
// Regulatory Scopes
// ---------------------------------------------------------------------------
export const REGULATORY_SCOPES = [
  "DIGITAL_LENDING",
  "PAYMENTS_SWITCHING",
  "BANKING_DEPOSIT",
  "WEALTH_INVESTMENT",
  "DATA_PRIVACY_GENERAL",
] as const;

export type RegulatoryScopeKey = (typeof REGULATORY_SCOPES)[number];

export const REGULATORY_SCOPE_METADATA: Record<
  RegulatoryScopeKey,
  { label: string; regulator: string; mandates: string; description: string }
> = {
  DIGITAL_LENDING: {
    label: "Digital Lending & Credit",
    regulator: "FCCPC & CBN",
    mandates: "FCCPC DEON Regulations (2025/2026), CBN Microfinance Directives",
    description: "Requires APR disclosures, prohibits harassment, caps hidden penalty interest.",
  },
  PAYMENTS_SWITCHING: {
    label: "Payments, PSSP & Switching",
    regulator: "CBN",
    mandates: "CBN PSSP/MMO Guidelines, Consumer Protection Framework (CPF)",
    description: "Mandates transaction fee transparency, uptime disclosure, refund latency rules.",
  },
  BANKING_DEPOSIT: {
    label: "Banking & Deposit Taking",
    regulator: "CBN & NDIC",
    mandates: "BOFIA 2020, CBN Consumer Protection Regulations (2019)",
    description: "Governs savings interest claims, deposit insurance disclaimers, clear T&Cs.",
  },
  WEALTH_INVESTMENT: {
    label: "Wealth & Digital Assets",
    regulator: "SEC Nigeria",
    mandates: "SEC Digital Assets Rules, Robo-Advisory & Crowdfunding Guidelines",
    description: "Strictly bans 'guaranteed return' claims, mandates risk warnings, SEC registration disclaimers.",
  },
  DATA_PRIVACY_GENERAL: {
    label: "Cross-Sector Data Privacy",
    regulator: "NDPC",
    mandates: "NDPA 2023 & General Application and Implementation Directive (GAID)",
    description: "Regulates consent gathering, biometric marketing disclosures, data sovereignty.",
  },
};

// ---------------------------------------------------------------------------
// Subscription Plans & Billing
// ---------------------------------------------------------------------------
export const PLAN_SLUGS = ["evaluation", "growth", "scale", "enterprise"] as const;
export type PlanSlug = (typeof PLAN_SLUGS)[number];

export const BILLING_INTERVALS = ["monthly", "annual"] as const;
export type BillingInterval = (typeof BILLING_INTERVALS)[number];

export const SUBSCRIPTION_STATUSES = ["trialing", "active", "past_due", "canceled"] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const PlanFeaturesSchema = z.object({
  export_unwatermarked: z.boolean().default(false),
  cco_approval_lock: z.boolean().default(false),
  url_drift_monitoring: z.boolean().default(false),
  custom_rate_cards: z.number().default(1),
  compliant_rewrites: z.number().default(10), // -1 for unlimited
  support_sla: z.string().default("Community"),
  custom_corpora: z.boolean().optional().default(false),
  live_web_search: z.boolean().optional().default(false),
  cross_border_research: z.boolean().optional().default(false),
  work_product_docx_export: z.boolean().optional().default(false),
  regulatory_ripple_live_web: z.boolean().optional().default(false),
  monthly_live_search_limit: z.number().int().optional().default(0), // -1 = unlimited
});
export type PlanFeatures = z.infer<typeof PlanFeaturesSchema>;

export const SubscriptionPlanSchema = z.object({
  id: z.string().uuid(),
  slug: z.enum(PLAN_SLUGS),
  name: z.string(),
  price_usd_cents: z.number().int().nonnegative(),
  price_usd_annual_cents: z.number().int().nonnegative(),
  paystack_plan_code_monthly: z.string().nullable().optional(),
  paystack_plan_code_annual: z.string().nullable().optional(),
  monthly_audit_limit: z.number().int(), // -1 = unlimited
  seat_limit: z.number().int(), // -1 = unlimited
  url_drift_monitor_limit: z.number().int(), // -1 = unlimited
  monthly_live_search_limit: z.number().int().optional().default(0), // -1 = unlimited
  allowed_search_jurisdictions: z.array(z.string()).optional().default([]),
  retention_days: z.number().int(),
  features: PlanFeaturesSchema,
  is_active: z.boolean().default(true),
  created_at: z.string().optional(),
});
export type SubscriptionPlan = z.infer<typeof SubscriptionPlanSchema>;

export const TenantSubscriptionSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  plan_id: z.string().uuid(),
  plan: SubscriptionPlanSchema.optional(),
  status: z.enum(SUBSCRIPTION_STATUSES),
  billing_interval: z.enum(BILLING_INTERVALS),
  paystack_customer_code: z.string().nullable().optional(),
  paystack_subscription_code: z.string().nullable().optional(),
  paystack_email_token: z.string().nullable().optional(),
  current_period_start: z.string(),
  current_period_end: z.string(),
  canceled_at: z.string().nullable().optional(),
  updated_at: z.string().optional(),
});
export type TenantSubscription = z.infer<typeof TenantSubscriptionSchema>;

// ---------------------------------------------------------------------------
// Checkout Schemas
// ---------------------------------------------------------------------------
export const PAYSTACK_PAYMENT_CHANNELS = [
  "card",
  "bank",
  "bank_transfer",
  "ussd",
  "qr",
  "mobile_money",
  "apple_pay",
] as const;
export type PaystackChannel = (typeof PAYSTACK_PAYMENT_CHANNELS)[number];

export const PAYMENT_PREFERENCES = ["card_bank", "all_channels", "bank_transfer"] as const;
export type PaymentPreference = (typeof PAYMENT_PREFERENCES)[number];

export const CheckoutRequestSchema = z.object({
  planSlug: z.enum(PLAN_SLUGS),
  billingInterval: z.enum(BILLING_INTERVALS).default("monthly"),
  emailOverride: z.string().email().optional(),
  paymentPreference: z.enum(PAYMENT_PREFERENCES).optional().default("card_bank"),
  channels: z.array(z.enum(PAYSTACK_PAYMENT_CHANNELS)).min(1).optional(),
});
export type CheckoutRequest = z.infer<typeof CheckoutRequestSchema>;

export const CheckoutResponseSchema = z.object({
  authorization_url: z.string().url(),
  access_code: z.string(),
  reference: z.string(),
  amount_kobo: z.number().int().positive(),
  amount_usd_cents: z.number().int().positive(),
  fx_rate: z.number().positive(),
  currency: z.literal("NGN"),
});
export type CheckoutResponse = z.infer<typeof CheckoutResponseSchema>;

// ---------------------------------------------------------------------------
// Paystack Webhook Schemas
// ---------------------------------------------------------------------------
export const PaystackChargeSuccessMetadataSchema = z.object({
  tenant_id: z.string().uuid(),
  plan_id: z.string().uuid().optional(),
  plan_slug: z.string().optional(),
  billing_interval: z.enum(BILLING_INTERVALS).optional().default("monthly"),
  usd_cents: z.number().int().optional(),
  fx_rate: z.number().optional(),
});

export const PaystackChargeSuccessDataSchema = z.object({
  id: z.number().optional(),
  domain: z.string().optional(),
  status: z.string(),
  reference: z.string(),
  amount: z.number().int().positive(),
  currency: z.string().default("NGN"),
  channel: z.string().optional(),
  paid_at: z.string().optional(),
  customer: z
    .object({
      id: z.number().optional(),
      customer_code: z.string().optional(),
      email: z.string().email().optional(),
    })
    .optional(),
  subscription_code: z.string().nullable().optional(),
  metadata: PaystackChargeSuccessMetadataSchema.optional(),
});

export const PaystackWebhookEventSchema = z.object({
  event: z.string(),
  data: PaystackChargeSuccessDataSchema,
});
export type PaystackWebhookEvent = z.infer<typeof PaystackWebhookEventSchema>;

// ---------------------------------------------------------------------------
// Feature Gating & Entitlements
// ---------------------------------------------------------------------------
export const FEATURE_GATE_TYPES = [
  "run_audit",
  "export_unwatermarked",
  "cco_approval_lock",
  "url_drift_monitoring",
  "live_web_search",
  "cross_border_research",
] as const;
export type FeatureGateType = (typeof FEATURE_GATE_TYPES)[number];

export const EntitlementCheckResultSchema = z.object({
  allowed: z.boolean(),
  feature: z.enum(FEATURE_GATE_TYPES),
  reason: z.string().optional(),
  currentCount: z.number().int().optional(),
  limit: z.number().int().optional(), // -1 = unlimited
  remaining: z.number().int().optional(), // -1 = unlimited
  allowedJurisdictions: z.array(z.string()).optional(),
  planSlug: z.enum(PLAN_SLUGS).optional(),
  status: z.enum(SUBSCRIPTION_STATUSES).optional(),
  trialDaysRemaining: z.number().int().optional(),
});
export type EntitlementCheckResult = z.infer<typeof EntitlementCheckResultSchema>;

// ---------------------------------------------------------------------------
// Progressive Onboarding Schemas
// ---------------------------------------------------------------------------
export const OnboardingScopeRequestSchema = z.object({
  scopes: z
    .array(z.enum(REGULATORY_SCOPES))
    .min(1, "Please select at least one active regulatory scope"),
  organization_name: z.string().optional(),
  creator_role: z.enum(CANONICAL_ROLES).optional(),
});
export type OnboardingScopeRequest = z.infer<typeof OnboardingScopeRequestSchema>;

export const OnboardingProductTruthRequestSchema = z.object({
  product_name: z.string().min(2, "Product name must be at least 2 characters"),
  monthly_interest_rate_percent: z.number().min(0).max(100),
  mandatory_fees_percent: z.number().min(0).max(100),
  fee_description: z.string().optional(),
  skip: z.boolean().optional().default(false),
});
export type OnboardingProductTruthRequest = z.infer<typeof OnboardingProductTruthRequestSchema>;

export const OnboardingStatusResponseSchema = z.object({
  stepCompleted: z.number().int().min(0).max(3),
  activeScopes: z.array(z.string()),
  hasProductTruth: z.boolean(),
  onboardingCompleted: z.boolean(),
  flagshipProduct: z
    .object({
      id: z.string(),
      name: z.string(),
      interest_rate_monthly: z.number().optional(),
    })
    .nullable()
    .optional(),
});
export type OnboardingStatusResponse = z.infer<typeof OnboardingStatusResponseSchema>;
