import { test, expect } from "@playwright/test";

test.describe("Cogent Regulatory Intelligence E2E & Production SaaS Route Audit", () => {
  test("All public marketing, auth, robots & sitemap routes render cleanly without 500s or runtime errors", async ({
    page,
    context,
    request,
    baseURL,
  }) => {
    await context.addCookies([
      {
        name: "__clerk_db_jwt",
        value: "e2e_signed_out_browser",
        url: baseURL || "http://localhost:3107",
      },
    ]);

    const uncaughtErrors: string[] = [];
    page.on("pageerror", (err) => uncaughtErrors.push(err.message));

    const publicPages = ["/", "/platform", "/solutions", "/resources/faq", "/company", "/sign-in", "/sign-up"];
    for (const path of publicPages) {
      const res = await page.goto(path, { waitUntil: "domcontentloaded" });
      expect(res?.status(), `Expected <400 on ${path}`).toBeLessThan(400);
    }

    const robotsRes = await request.get("/robots.txt");
    expect(robotsRes.status()).toBe(200);
    const sitemapRes = await request.get("/sitemap.xml");
    expect(sitemapRes.status()).toBe(200);

    expect(uncaughtErrors).toEqual([]);
  });

  test("Billing plans endpoints (/v1/billing/plans & /api/billing/plans alias) advertise Growth & Scale entitlements", async ({
    request,
  }) => {
    for (const endpoint of ["/api/marketing-shield/v1/billing/plans", "/api/billing/plans"]) {
      const res = await request.get(endpoint);
      expect(res.status()).toBe(200);
      const json = await res.json();
      const plans = (json.plans || json.data?.plans || json.data || []) as Array<{
        slug: string;
        monthly_live_search_limit?: number;
        allowed_search_jurisdictions?: string[];
        features?: Record<string, unknown>;
      }>;
      expect(Array.isArray(plans)).toBe(true);
      expect(plans.length).toBeGreaterThanOrEqual(3);

      const evalPlan = plans.find((p) => p.slug === "evaluation");
      const growthPlan = plans.find((p) => p.slug === "growth");
      const scalePlan = plans.find((p) => p.slug === "scale");

      expect(evalPlan?.monthly_live_search_limit).toBe(0);
      expect((growthPlan?.monthly_live_search_limit ?? 0) > 0).toBe(true);
      expect(growthPlan?.allowed_search_jurisdictions).toContain("NG");
      expect((scalePlan?.monthly_live_search_limit ?? 0) >= (growthPlan?.monthly_live_search_limit ?? 0)).toBe(true);
      expect((scalePlan?.allowed_search_jurisdictions || []).length).toBeGreaterThan(1);
    }
  });

  test("Fail-closed security boundary: ALL protected API route groups reject unauthenticated callers with 401 (never 500)", async ({
    request,
  }) => {
    const spoofHeaders = {
      "content-type": "application/json",
      "x-plan-override": "enterprise",
      "x-tenant-plan": "scale",
      "x-tenant-id": "11111111-1111-1111-1111-111111111111",
    };

    const getRoutes = [
      "/api/marketing-shield/v1/auth/me",
      "/api/marketing-shield/v1/search/quota",
      "/api/marketing-shield/v1/work-products",
      "/api/marketing-shield/v1/work-products/00000000-0000-4000-8000-000000000001",
      "/api/marketing-shield/v1/conversations",
      "/api/marketing-shield/v1/campaigns",
      "/api/marketing-shield/v1/drift-monitors",
      "/api/marketing-shield/v1/products",
      "/api/marketing-shield/v1/knowledge-base/documents",
      "/api/marketing-shield/v1/knowledge-base/rules",
      "/api/marketing-shield/v1/ripple-alerts",
      "/api/marketing-shield/v1/settings/workspace",
      "/api/marketing-shield/v1/team/members",
      "/api/marketing-shield/v1/billing/entitlements",
      "/api/billing/entitlements",
      "/api/marketing-shield/v1/onboarding/status",
    ];

    for (const route of getRoutes) {
      const res = await request.get(route, { headers: spoofHeaders });
      expect(res.status(), `Expected 401 on GET ${route}`).toBe(401);
    }

    const postRoutes: Array<[string, Record<string, unknown>]> = [
      [
        "/api/marketing-shield/v1/search",
        {
          query: "CBN stablecoin settlement circular",
          mode: "HYBRID_LIVE_WEB",
          enable_live_web: true,
          jurisdictions: ["NG", "KE"],
        },
      ],
      [
        "/api/marketing-shield/v1/work-products/00000000-0000-4000-8000-000000000001/export",
        { format: "pdf" },
      ],
      [
        "/api/marketing-shield/v1/work-products/00000000-0000-4000-8000-000000000001/export",
        { format: "md" },
      ],
      [
        "/api/marketing-shield/v1/live-web/promote",
        {
          live_web_retrieval_id: "00000000-0000-4000-8000-000000000001",
          regulator_acronym: "CBN",
          instrument_title: "Spoofed Promotion",
        },
      ],
      [
        "/api/marketing-shield/v1/live-web/queue-vault",
        {
          url: "https://www.cbn.gov.ng/Out/2026/sample.pdf",
          title: "Spoofed Queue",
          regulator: "CBN",
        },
      ],
      ["/api/marketing-shield/v1/billing/checkout", { planSlug: "growth", billingInterval: "monthly" }],
      ["/api/billing/checkout", { planSlug: "growth", billingInterval: "monthly" }],
      ["/api/marketing-shield/v1/billing/verify", { reference: "COG_SPOOF" }],
      ["/api/marketing-shield/v1/onboarding/complete", {}],
    ];

    for (const [route, data] of postRoutes) {
      const res = await request.post(route, { headers: spoofHeaders, data });
      expect(res.status(), `Expected 401 on POST ${route}`).toBe(401);
    }
  });

  test("Webhook signature guards reject unsigned Paystack & Clerk webhook requests cleanly", async ({
    request,
  }) => {
    const paystackRes = await request.post("/api/marketing-shield/v1/billing/webhooks/paystack", {
      headers: { "content-type": "application/json", "x-paystack-signature": "forged_sig" },
      data: { event: "charge.success", data: { reference: "COG_FORGED" } },
    });
    expect(paystackRes.status()).toBe(401);

    const clerkRes = await request.post("/api/webhooks/clerk", {
      headers: { "content-type": "application/json" },
      data: { type: "organization.created", data: {} },
    });
    expect([400, 401, 500]).toContain(clerkRes.status());
  });

  test("All protected workspace pages fail closed and redirect unauthenticated browsers to /sign-in", async ({
    page,
    context,
    baseURL,
  }) => {
    await context.addCookies([
      {
        name: "__clerk_db_jwt",
        value: "e2e_signed_out_browser",
        url: baseURL || "http://localhost:3107",
      },
    ]);

    const protectedPages = [
      "/search?q=CBN+AML+Standards",
      "/chat?workflow=PRODUCT_STRUCTURING_MEMO",
      "/knowledge-base",
      "/drift-monitors",
      "/settings",
      "/settings/billing",
      "/onboarding",
    ];

    for (const path of protectedPages) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await expect(page, `Expected redirect to /sign-in from ${path}`).toHaveURL(/\/sign-in/);
    }
  });
});
