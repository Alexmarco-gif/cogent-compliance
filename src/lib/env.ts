import { z } from "zod";

/**
 * Server-only environment variables schema.
 * These are NEVER exposed to the browser client.
 */
export const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  SKIP_ENV_VALIDATION: z.enum(["true", "false", "1", "0"]).optional(),

  // Clerk Authentication
  CLERK_SECRET_KEY: z.string().min(1, "CLERK_SECRET_KEY is required for server authentication"),
  CLERK_WEBHOOK_SIGNING_SECRET: z
    .string()
    .min(1, "CLERK_WEBHOOK_SIGNING_SECRET is required to verify Svix webhooks"),

  // Supabase Data & Vector Layer
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, "SUPABASE_SERVICE_ROLE_KEY is required for admin workers and audit operations"),

  // Cloudflare R2 Object Storage
  R2_ACCOUNT_ID: z.string().min(1, "R2_ACCOUNT_ID is required for Cloudflare R2"),
  R2_ACCESS_KEY_ID: z.string().min(1, "R2_ACCESS_KEY_ID is required for Cloudflare R2"),
  R2_SECRET_ACCESS_KEY: z.string().min(1, "R2_SECRET_ACCESS_KEY is required for Cloudflare R2"),
  R2_BUCKET_NAME: z.string().min(1, "R2_BUCKET_NAME is required for Cloudflare R2"),
  R2_PUBLIC_URL_PREFIX: z.string().url().optional(),

  // Google Gemini API (@google/genai SDK)
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required for AI reasoning and embeddings"),
  GEMINI_PRO_MODEL: z.string().optional(),
  GEMINI_FLASH_MODEL: z.string().optional(),
  GEMINI_FLASH_LITE_MODEL: z.string().optional(),
  GEMINI_EMBEDDING_MODEL: z.string().optional(),

  // Inngest Background Queue
  INNGEST_EVENT_KEY: z.string().min(1, "INNGEST_EVENT_KEY is required for durable background events"),
  INNGEST_SIGNING_KEY: z.string().min(1, "INNGEST_SIGNING_KEY is required to sign Inngest webhooks"),

  // Better Stack Observability & Logs
  BETTER_STACK_LOGTAIL_SOURCE_TOKEN: z.string().optional(),
  BETTER_STACK_UPTIME_HEARTBEAT_URL: z.string().url().optional(),
  BETTERSTACK_SOURCE_TOKEN: z.string().optional(),
  BETTERSTACK_INGESTING_HOST: z.string().optional(),

  // Resend Transactional Notifications
  RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY is required for email alerts"),
  RESEND_FROM_EMAIL: z.string().default("compliance@notifications.cogentshield.com"),

  // Paystack Billing
  PAYSTACK_SECRET_KEY: z.string().optional(),

  // Internal / Founder Enterprise Allowlist (comma-separated verified emails)
  INTERNAL_ENTERPRISE_EMAILS: z.string().optional(),

  // Dual-Engine Regulatory Web Search (Document 14 & Document 15)
  EXA_API_KEY: z.string().optional(),
  SERPAPI_API_KEY: z.string().optional(),
  LIVE_WEB_INTERACTIVE_TIMEOUT_MS: z.coerce.number().int().min(1000).max(15000).default(3500),
  LIVE_WEB_CACHE_TTL_HOURS: z.coerce.number().int().min(1).max(168).default(12),
  ENABLE_DUAL_LIVE_WEB_SEARCH: z.enum(["true", "false"]).default("true"),
});

/**
 * Client-accessible environment variables schema.
 * Must be explicitly prefixed with NEXT_PUBLIC_.
 */
export const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),

  // Paystack Client Key
  NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY: z.string().optional(),

  // Clerk Client Keys
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is required"),
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string().default("/sign-in"),
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: z.string().default("/sign-up"),

  // Supabase Client Keys
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url("NEXT_PUBLIC_SUPABASE_URL must be a valid HTTPS URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type ClientEnv = z.infer<typeof clientEnvSchema>;
export type Env = ServerEnv & ClientEnv;

/**
 * Validates process.env against server and client schemas.
 * Returns validated typed environment object or throws descriptive error.
 */
export function validateEnv(customEnv?: Record<string, string | undefined>): Env {
  const sourceEnv = customEnv || process.env;
  const rawEnv: Record<string, string | undefined> = {
    ...sourceEnv,
    SUPABASE_SERVICE_ROLE_KEY:
      sourceEnv.SUPABASE_SERVICE_ROLE_KEY || sourceEnv.SUPABASE_SECRET_KEY,
    NEXT_PUBLIC_SUPABASE_URL:
      sourceEnv.NEXT_PUBLIC_SUPABASE_URL || sourceEnv.SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      sourceEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      sourceEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      sourceEnv.SUPABASE_PUBLISHABLE_KEY ||
      sourceEnv.SUPABASE_ANON_KEY,
  };
  const isTestRuntime = !customEnv && process.env.NODE_ENV === "test";
  const shouldSkip =
    rawEnv.SKIP_ENV_VALIDATION === "true" ||
    rawEnv.SKIP_ENV_VALIDATION === "1" ||
    (isTestRuntime && rawEnv.SKIP_ENV_VALIDATION !== "false");

  if (shouldSkip) {
    // Provide safe placeholders in CI/build/test environments
    return {
      NODE_ENV: (rawEnv.NODE_ENV as "development" | "test" | "production") || "test",
      SKIP_ENV_VALIDATION: rawEnv.SKIP_ENV_VALIDATION as "true" | "false" | "1" | "0" | undefined,
      CLERK_SECRET_KEY: rawEnv.CLERK_SECRET_KEY || "mock_clerk_secret_key",
      CLERK_WEBHOOK_SIGNING_SECRET: rawEnv.CLERK_WEBHOOK_SIGNING_SECRET || "mock_svix_secret",
      SUPABASE_SERVICE_ROLE_KEY: rawEnv.SUPABASE_SERVICE_ROLE_KEY || "mock_service_role_key",
      R2_ACCOUNT_ID: rawEnv.R2_ACCOUNT_ID || "mock_r2_account_id",
      R2_ACCESS_KEY_ID: rawEnv.R2_ACCESS_KEY_ID || "mock_r2_access_key_id",
      R2_SECRET_ACCESS_KEY: rawEnv.R2_SECRET_ACCESS_KEY || "mock_r2_secret_access_key",
      R2_BUCKET_NAME: rawEnv.R2_BUCKET_NAME || "cogent-compliance-r2",
      R2_PUBLIC_URL_PREFIX: rawEnv.R2_PUBLIC_URL_PREFIX,
      GEMINI_API_KEY: rawEnv.GEMINI_API_KEY || "mock_gemini_api_key",
      GEMINI_PRO_MODEL: rawEnv.GEMINI_PRO_MODEL || "gemini-3.5-flash",
      GEMINI_FLASH_MODEL: rawEnv.GEMINI_FLASH_MODEL || "gemini-3.5-flash",
      GEMINI_FLASH_LITE_MODEL: rawEnv.GEMINI_FLASH_LITE_MODEL || "gemini-3.1-flash-lite",
      GEMINI_EMBEDDING_MODEL: rawEnv.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001",
      BETTERSTACK_SOURCE_TOKEN: rawEnv.BETTERSTACK_SOURCE_TOKEN,
      BETTERSTACK_INGESTING_HOST: rawEnv.BETTERSTACK_INGESTING_HOST,
      INNGEST_EVENT_KEY: rawEnv.INNGEST_EVENT_KEY || "mock_inngest_event_key",
      INNGEST_SIGNING_KEY: rawEnv.INNGEST_SIGNING_KEY || "mock_inngest_signing_key",
      BETTER_STACK_LOGTAIL_SOURCE_TOKEN: rawEnv.BETTER_STACK_LOGTAIL_SOURCE_TOKEN,
      BETTER_STACK_UPTIME_HEARTBEAT_URL: rawEnv.BETTER_STACK_UPTIME_HEARTBEAT_URL,
      RESEND_API_KEY: rawEnv.RESEND_API_KEY || "mock_resend_api_key",
      RESEND_FROM_EMAIL: rawEnv.RESEND_FROM_EMAIL || "compliance@notifications.cogentshield.com",
      NEXT_PUBLIC_APP_URL: rawEnv.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
        rawEnv.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "pk_test_mock_publishable_key",
      NEXT_PUBLIC_CLERK_SIGN_IN_URL: rawEnv.NEXT_PUBLIC_CLERK_SIGN_IN_URL || "/sign-in",
      NEXT_PUBLIC_CLERK_SIGN_UP_URL: rawEnv.NEXT_PUBLIC_CLERK_SIGN_UP_URL || "/sign-up",
      NEXT_PUBLIC_SUPABASE_URL: rawEnv.NEXT_PUBLIC_SUPABASE_URL || "https://mock.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY:
        rawEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY || "mock_supabase_anon_key",
      PAYSTACK_SECRET_KEY: rawEnv.PAYSTACK_SECRET_KEY || "sk_test_mock_paystack_secret_key",
      INTERNAL_ENTERPRISE_EMAILS: rawEnv.INTERNAL_ENTERPRISE_EMAILS,
      NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY:
        rawEnv.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "pk_test_mock_paystack_public_key",
      EXA_API_KEY: rawEnv.EXA_API_KEY,
      SERPAPI_API_KEY: rawEnv.SERPAPI_API_KEY,
      LIVE_WEB_INTERACTIVE_TIMEOUT_MS: Number(rawEnv.LIVE_WEB_INTERACTIVE_TIMEOUT_MS) || 3500,
      LIVE_WEB_CACHE_TTL_HOURS: Number(rawEnv.LIVE_WEB_CACHE_TTL_HOURS) || 12,
      ENABLE_DUAL_LIVE_WEB_SEARCH:
        rawEnv.ENABLE_DUAL_LIVE_WEB_SEARCH === "false" ? "false" : "true",
    };
  }

  const serverResult = serverEnvSchema.safeParse(rawEnv);
  const clientResult = clientEnvSchema.safeParse(rawEnv);

  if (!serverResult.success || !clientResult.success) {
    const serverErrors = !serverResult.success ? serverResult.error.flatten().fieldErrors : {};
    const clientErrors = !clientResult.success ? clientResult.error.flatten().fieldErrors : {};

    const formattedErrors = {
      ...serverErrors,
      ...clientErrors,
    };

    if (process.env.NODE_ENV !== "test") {
      console.error("❌ Invalid environment variables:", JSON.stringify(formattedErrors, null, 2));
    }
    throw new Error(
      `Invalid environment configuration. Missing or invalid variables: ${Object.keys(formattedErrors).join(", ")}`,
    );
  }

  return {
    ...serverResult.data,
    ...clientResult.data,
  };
}

export const env = validateEnv();
