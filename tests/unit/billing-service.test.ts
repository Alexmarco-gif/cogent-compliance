import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";
import {
  PaystackCheckoutValidationError,
  paystackBillingService,
} from "@/modules/billing/paystack.service";
import * as supabaseModule from "@/lib/supabase";

describe("PaystackBillingService & Dual-Currency Engine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
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

  describe("Checkout Session Initialization & Channel Routing", () => {
    it("resolves card_bank by default and avoids exposing bank_transfer unless requested", () => {
      expect(paystackBillingService.resolveCheckoutChannels()).toEqual(["card", "bank"]);
      expect(paystackBillingService.resolveCheckoutChannels("card_bank")).toEqual(["card", "bank"]);
      expect(paystackBillingService.resolveCheckoutChannels("all_channels")).toEqual([
        "card",
        "bank",
        "ussd",
        "qr",
        "bank_transfer",
      ]);
      expect(paystackBillingService.resolveCheckoutChannels("bank_transfer")).toEqual([
        "bank_transfer",
        "bank",
        "card",
      ]);
      expect(
        paystackBillingService.resolveCheckoutChannels("card_bank", ["card", "ussd", "card"]),
      ).toEqual(["card", "ussd"]);
    });

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
      expect(checkout.authorization_url).toContain("channels=card%2Cbank");
      expect(checkout.amount_usd_cents).toBe(44900);
      expect(checkout.amount_kobo).toBe(69595000);
      expect(checkout.currency).toBe("NGN");
    });

    it("blocks transactions above Paystack ₦10,000,000 single online ceiling (Enterprise Annual)", async () => {
      try {
        await paystackBillingService.initializeCheckout({
          tenantId: "11111111-1111-1111-1111-111111111111",
          planSlug: "enterprise",
          billingInterval: "annual",
          userEmail: "cfo@fintech.ng",
        });
        expect.unreachable("Should have thrown PaystackCheckoutValidationError");
      } catch (err) {
        expect(err).toBeInstanceOf(PaystackCheckoutValidationError);
        expect((err as PaystackCheckoutValidationError).code).toBe("PAYSTACK_TX_LIMIT_EXCEEDED");
        expect((err as Error).message).toContain("10,000,000");
      }
    });

    it("forwards channels: ['card', 'bank'] to Paystack initialize endpoint when non-mock", async () => {
      vi.stubEnv("NODE_ENV", "development");
      vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_live_simulated_key");

      vi.spyOn(supabaseModule, "createAdminSupabaseClient").mockReturnValue({
        from: vi.fn().mockImplementation(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          insert: vi.fn().mockResolvedValue({ error: null }),
        })),
      } as any);

      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          status: true,
          data: {
            authorization_url: "https://checkout.paystack.com/live_acc_123",
            access_code: "live_acc_123",
          },
        }),
      } as any);

      try {
        const res = await paystackBillingService.initializeCheckout({
          tenantId: "11111111-1111-1111-1111-111111111111",
          planSlug: "scale",
          billingInterval: "monthly",
          userEmail: "cmo@fintech.ng",
        });

        expect(res.authorization_url).toBe("https://checkout.paystack.com/live_acc_123");
        expect(fetchSpy).toHaveBeenCalledTimes(1);
        const firstCall = fetchSpy.mock.calls[0];
        expect(firstCall).toBeDefined();
        const init = firstCall?.[1];
        const sentBody = JSON.parse(String(init?.body));
        expect(sentBody.channels).toEqual(["card", "bank"]);
        expect(sentBody.amount).toBe(69595000);
        expect(sentBody.currency).toBe("NGN");
      } finally {
        fetchSpy.mockRestore();
        vi.unstubAllEnvs();
      }
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

  describe("Charge Success Idempotency & Pending Transaction Recovery", () => {
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

    it("recovers tenant context from a pending billing_transactions row and updates pending -> success", async () => {
      const tenantId = "11111111-1111-1111-1111-111111111111";
      const txUpdateSpy = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });
      const upsertSubSpy = vi.fn().mockResolvedValue({ error: null });
      const tenantUpdateSpy = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      vi.spyOn(supabaseModule, "createAdminSupabaseClient").mockReturnValue({
        from: vi.fn().mockImplementation((table: string) => {
          if (table === "billing_transactions") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      id: "tx_pending_1",
                      status: "pending",
                      tenant_id: tenantId,
                      raw_payload: {
                        plan_slug: "scale",
                        billing_interval: "annual",
                      },
                    },
                    error: null,
                  }),
                }),
              }),
              update: txUpdateSpy,
            };
          }
          if (table === "tenant_subscriptions") {
            return {
              upsert: upsertSubSpy,
            };
          }
          if (table === "tenants") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: { settings: {} }, error: null }),
                }),
              }),
              update: tenantUpdateSpy,
            };
          }
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }),
      } as any);

      const result = await paystackBillingService.processChargeSuccess({
        event: "charge.success",
        data: {
          reference: "COG_11111111_999999",
          amount: 667740000,
          currency: "NGN",
          status: "success",
          channel: "card",
          // Omitted metadata simulated
        } as any,
      });

      expect(result.processed).toBe(true);
      expect(result.tenantId).toBe(tenantId);
      expect(txUpdateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ status: "success", amount_kobo: 667740000 }),
      );
      expect(upsertSubSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          tenant_id: tenantId,
          status: "active",
          billing_interval: "annual",
        }),
        { onConflict: "tenant_id" },
      );
      expect(tenantUpdateSpy).toHaveBeenCalled();
    });

    it("parses stringified metadata returned from Paystack verify API", async () => {
      vi.stubEnv("NODE_ENV", "development");
      vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_live_simulated_key");

      vi.spyOn(supabaseModule, "createAdminSupabaseClient").mockReturnValue({
        from: vi.fn().mockImplementation((table: string) => {
          if (table === "billing_transactions") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
              insert: vi.fn().mockResolvedValue({ error: null }),
            };
          }
          if (table === "tenant_subscriptions") {
            return { upsert: vi.fn().mockResolvedValue({ error: null }) };
          }
          if (table === "tenants") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: { settings: {} }, error: null }),
                }),
              }),
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
            };
          }
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }),
      } as any);

      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          status: true,
          data: {
            status: "success",
            reference: "COG_STR_META",
            amount: 23095000,
            currency: "NGN",
            metadata: JSON.stringify({
              tenant_id: "11111111-1111-1111-1111-111111111111",
              plan_slug: "growth",
              billing_interval: "monthly",
            }),
          },
        }),
      } as any);

      try {
        const res = await paystackBillingService.verifyTransaction(
          "COG_STR_META",
          "11111111-1111-1111-1111-111111111111",
        );
        expect(res.verified).toBe(true);
        expect(res.planSlug).toBe("growth");
      } finally {
        fetchSpy.mockRestore();
        vi.unstubAllEnvs();
      }
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

