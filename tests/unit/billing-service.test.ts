import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";
import { paystackBillingService } from "@/modules/billing/paystack.service";

describe("PaystackBillingService & Dual-Currency Engine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PAYSTACK_SECRET_KEY = "sk_test_mock_paystack_secret_key";
  });

  describe("FX Rate and Kobo Calculation", () => {
    it("correctly converts USD cents to NGN Kobo at benchmark rate 1550.00", () => {
      const fxRate = 1550.0;
      // $149/mo (Growth plan) -> 14900 cents
      const growthKobo = paystackBillingService.calculateKoboAmount(14900, fxRate);
      expect(growthKobo).toBe(23095000); // ₦230,950.00 = 23,095,000 kobo

      // $449/mo (Scale plan) -> 44900 cents
      const scaleKobo = paystackBillingService.calculateKoboAmount(44900, fxRate);
      expect(scaleKobo).toBe(69595000); // ₦695,950.00 = 69,595,000 kobo

      // Annual discount 20% on Scale ($359/mo * 12 = $4,308/yr -> 430800 cents)
      const scaleAnnualKobo = paystackBillingService.calculateKoboAmount(430800, fxRate);
      expect(scaleAnnualKobo).toBe(667740000); // ₦6,677,400.00
    });

    it("handles zero price correctly for Evaluation Pilot", () => {
      const kobo = paystackBillingService.calculateKoboAmount(0, 1550.0);
      expect(kobo).toBe(0);
    });
  });

  describe("Checkout Session Initialization", () => {
    it("generates structured checkout payload with reference and authorization url", async () => {
      const tenantId = "11111111-1111-1111-1111-111111111111";
      const checkout = await paystackBillingService.initializeCheckout({
        tenantId,
        planSlug: "scale",
        billingInterval: "monthly",
        userEmail: "cmo@fintech.ng",
      });

      expect(checkout.reference).toMatch(/^COG_11111111_\d+$/);
      expect(checkout.authorization_url).toContain("https://checkout.paystack.com/");
      expect(checkout.amount_usd_cents).toBe(44900);
      expect(checkout.amount_kobo).toBe(69595000);
      expect(checkout.currency).toBe("NGN");
    });
  });

  describe("HMAC-SHA512 Webhook Signature Verification", () => {
    it("accepts authentic Paystack HMAC SHA-512 signatures", () => {
      const secret = "sk_test_mock_paystack_secret_key";
      const payload = JSON.stringify({
        event: "charge.success",
        data: { reference: "COG_TEST_001", amount: 69595000 },
      });

      const signature = crypto.createHmac("sha512", secret).update(payload).digest("hex");
      const isValid = paystackBillingService.verifyWebhookSignature(payload, signature);

      expect(isValid).toBe(true);
    });

    it("rejects forged or altered webhook payloads", () => {
      const secret = "sk_test_mock_paystack_secret_key";
      const authenticPayload = JSON.stringify({
        event: "charge.success",
        data: { reference: "COG_TEST_001", amount: 69595000 },
      });
      const alteredPayload = JSON.stringify({
        event: "charge.success",
        data: { reference: "COG_TEST_001", amount: 100 },
      });

      const signature = crypto.createHmac("sha512", secret).update(authenticPayload).digest("hex");
      const isValid = paystackBillingService.verifyWebhookSignature(alteredPayload, signature);

      expect(isValid).toBe(false);
    });

    it("rejects null or empty signatures", () => {
      const isValid = paystackBillingService.verifyWebhookSignature("{}", null);
      expect(isValid).toBe(false);
    });

    it("rejects signatures with mismatched byte lengths without throwing", () => {
      const isValid = paystackBillingService.verifyWebhookSignature("{}", "short_sig");
      expect(isValid).toBe(false);
    });
  });

  describe("Charge Success Idempotency", () => {
    it("rejects charge success missing tenant_id metadata gracefully", async () => {
      const event = {
        event: "charge.success",
        data: {
          reference: "COG_NO_TENANT_REF",
          amount: 69595000,
          currency: "NGN",
          status: "success",
          metadata: {
            tenant_id: "" as any,
          },
        },
      };

      const result = await paystackBillingService.processChargeSuccess(event as any);
      expect(result.processed).toBe(false);
      expect(result.reason).toContain("Missing tenant_id");
    });

    it("rejects Paystack checkout initialization for free $0 evaluation plan", async () => {
      await expect(
        paystackBillingService.initializeCheckout({
          tenantId: "11111111-1111-1111-1111-111111111111",
          planSlug: "evaluation",
          billingInterval: "monthly",
          userEmail: "cmo@fintech.ng",
        }),
      ).rejects.toThrow(/free \(\$0\)/i);
    });

    it("blocks cross-tenant Paystack transaction verification attempts", async () => {
      vi.stubEnv("NODE_ENV", "development");
      vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_live_simulated_key");
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          status: true,
          data: {
            status: "success",
            reference: "COG_OTHER_123",
            amount: 69595000,
            currency: "NGN",
            metadata: {
              tenant_id: "22222222-2222-2222-2222-222222222222",
              plan_slug: "scale",
            },
          },
        }),
      } as any);

      try {
        await expect(
          paystackBillingService.verifyTransaction(
            "COG_OTHER_123",
            "11111111-1111-1111-1111-111111111111",
          ),
        ).rejects.toThrow(/does not belong to the active workspace/i);
      } finally {
        fetchSpy.mockRestore();
        vi.unstubAllEnvs();
      }
    });
  });
});
