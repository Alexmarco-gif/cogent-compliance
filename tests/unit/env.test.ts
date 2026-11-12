import { describe, it, expect } from "vitest";
import { validateEnv, serverEnvSchema, clientEnvSchema } from "@/lib/env";

describe("Environment Configuration & Validation (src/lib/env.ts)", () => {
  const validMockEnv = {
    NODE_ENV: "test",
    SKIP_ENV_VALIDATION: "false",
    CLERK_SECRET_KEY: "sk_test_1234567890",
    CLERK_WEBHOOK_SIGNING_SECRET: "whsec_1234567890",
    SUPABASE_SERVICE_ROLE_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy",
    R2_ACCOUNT_ID: "account_id_123",
    R2_ACCESS_KEY_ID: "access_key_123",
    R2_SECRET_ACCESS_KEY: "secret_access_key_123",
    R2_BUCKET_NAME: "cogent-compliance-r2",
    GEMINI_API_KEY: "AIzaSy_dummy_key",
    INNGEST_EVENT_KEY: "inngest_event_key_123",
    INNGEST_SIGNING_KEY: "signkey-prod-123",
    RESEND_API_KEY: "re_1234567890",
    RESEND_FROM_EMAIL: "compliance@notifications.cogentshield.com",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_1234567890",
    NEXT_PUBLIC_CLERK_SIGN_IN_URL: "/sign-in",
    NEXT_PUBLIC_CLERK_SIGN_UP_URL: "/sign-up",
    NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_anon",
  };

  it("should validate and parse a complete environment config", () => {
    const parsed = validateEnv(validMockEnv);
    expect(parsed.CLERK_SECRET_KEY).toBe("sk_test_1234567890");
    expect(parsed.NEXT_PUBLIC_SUPABASE_URL).toBe("https://project.supabase.co");
    expect(parsed.GEMINI_API_KEY).toBe("AIzaSy_dummy_key");
  });

  it("should fail fast if required server variables are missing and validation is active", () => {
    const invalidEnv = { ...validMockEnv };
    delete (invalidEnv as Record<string, unknown>).CLERK_SECRET_KEY;
    delete (invalidEnv as Record<string, unknown>).GEMINI_API_KEY;

    expect(() => validateEnv(invalidEnv)).toThrowError(
      /Missing or invalid variables:.*CLERK_SECRET_KEY.*GEMINI_API_KEY/,
    );
  });

  it("should fail fast if required client variables are missing or malformed", () => {
    const invalidEnv = {
      ...validMockEnv,
      NEXT_PUBLIC_SUPABASE_URL: "not-a-valid-url",
    };

    expect(() => validateEnv(invalidEnv)).toThrowError(
      /NEXT_PUBLIC_SUPABASE_URL/,
    );
  });

  it("should return safe placeholders when SKIP_ENV_VALIDATION is true", () => {
    const ciEnv = {
      SKIP_ENV_VALIDATION: "true",
      NODE_ENV: "test",
    };

    const parsed = validateEnv(ciEnv);
    expect(parsed.NODE_ENV).toBe("test");
    expect(parsed.CLERK_SECRET_KEY).toBe("mock_clerk_secret_key");
    expect(parsed.NEXT_PUBLIC_SUPABASE_URL).toBe("https://mock.supabase.co");
  });
});
