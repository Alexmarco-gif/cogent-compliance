import { describe, it, expect, vi } from "vitest";
import { redactSensitiveData, logger } from "@/lib/logger";

describe("Better Stack Logger & Redaction Baseline (src/lib/logger.ts)", () => {
  it("should deeply redact sensitive credential keys and PII", () => {
    const input = {
      user: {
        id: "usr_123",
        email: "cfo@fintech.ng",
        password: "SuperSecretPassword123!",
        bvn: "12345678901",
      },
      tokens: {
        apiKey: "AIzaSy_TopSecretKey",
        gemini_api_key: "AIzaSy_AnotherKey",
        clerkSecretKey: "sk_test_secret",
      },
      audit: {
        action: "CAMPAIGN_SUBMIT",
        details: {
          publicInfo: "Approved flyer copy",
        },
      },
    };

    const sanitized = redactSensitiveData(input) as Record<string, any>;

    expect(sanitized.user.password).toBe("[REDACTED]");
    expect(sanitized.user.bvn).toBe("[REDACTED]");
    expect(sanitized.user.email).toBe("cfo@fintech.ng");
    expect(sanitized.tokens.apiKey).toBe("[REDACTED]");
    expect(sanitized.tokens.gemini_api_key).toBe("[REDACTED]");
    expect(sanitized.tokens.clerkSecretKey).toBe("[REDACTED]");
    expect(sanitized.audit.action).toBe("CAMPAIGN_SUBMIT");
    expect(sanitized.audit.details.publicInfo).toBe("Approved flyer copy");
  });

  it("should redact Bearer authentication headers in string values", () => {
    const headerValue = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_token_value";
    expect(redactSensitiveData(headerValue)).toBe("Bearer [REDACTED]");
  });

  it("should create child loggers with preserved context and request ID", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const childLogger = logger.withContext({
      requestId: "test-req-1234-uuid",
      tenantId: "tenant_bank_ng",
    });

    childLogger.info("Operation succeeded", { campaignId: "camp_999" });

    expect(consoleSpy).toHaveBeenCalled();
    const firstCall = consoleSpy.mock.calls[0];
    expect(firstCall).toBeDefined();
    const loggedOutput = JSON.parse(firstCall![0] as string);

    expect(loggedOutput.level).toBe("info");
    expect(loggedOutput.message).toBe("Operation succeeded");
    expect(loggedOutput.context.requestId).toBe("test-req-1234-uuid");
    expect(loggedOutput.context.tenantId).toBe("tenant_bank_ng");
    expect(loggedOutput.context.campaignId).toBe("camp_999");

    consoleSpy.mockRestore();
  });
});
