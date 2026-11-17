import { describe, it, expect } from "vitest";
import { aprCalculatorService } from "@/modules/compliance-assessment/apr-calculator.service";
import { visualForensicsService } from "@/modules/asset-processing/visual-forensics.service";
import { appStoreAuditorService } from "@/modules/compliance-assessment/app-store-auditor.service";
import { licenseScopeService } from "@/modules/compliance-assessment/license-scope.service";
import { kfsGeneratorService } from "@/modules/compliance-assessment/kfs-generator.service";
import { precedentMemoryService } from "@/modules/ai-orchestration/precedent-memory.service";
import { mechanicalLocksEngine } from "@/modules/compliance-assessment/mechanical-locks";
import type { CampaignProduct } from "@/contracts/knowledge-product.contracts";

const SAMPLE_QUICKCASH_PRODUCT: CampaignProduct = {
  id: "22222222-2222-2222-2222-222222222222",
  tenant_id: "11111111-1111-1111-1111-111111111111",
  product_name: "QuickCash 15-Day Express",
  product_type: "DIGITAL_LOAN",
  description: "Short-term salary advance",
  status: "ACTIVE",
  created_at: "2026-11-10T00:00:00.000Z",
  updated_at: "2026-11-10T00:00:00.000Z",
  approved_terms: {
    interest_rate_min: 5,
    interest_rate_max: 5,
    interest_rate_type: "MONTHLY",
    processing_fee_percent: 0,
    tenor_min_days: 15,
    tenor_max_days: 15,
    required_disclosures: [
      "Licensed by the Central Bank of Nigeria",
      "Terms and Conditions apply",
    ],
    custom_terms: {
      processing_fee_flat_ngn: 2500,
    },
  },
};

describe("Phase A: Autonomous Compliance Analyst Deterministic & Forensic Engines", () => {
  describe("1. AprCalculatorService — Marketing vs. App Rate Card Mismatch & Drip Pricing", () => {
    it("catches the exact ₦50,000 @ 5% monthly flyer vs. ₦2,500 fee + 15-day tenor mismatch (60% implied vs 182.5% true APR)", () => {
      const flyerCopy = "Get ₦50,000 in 5 minutes at 5% monthly interest!";
      const result = aprCalculatorService.analyzeCopyAgainstProductTruth(
        flyerCopy,
        SAMPLE_QUICKCASH_PRODUCT
      );

      expect(result).not.toBeNull();
      expect(result!.principalNgn).toBe(50_000);
      expect(result!.tenorDays).toBe(15);
      expect(result!.upfrontFeesNgn).toBe(2_500);
      expect(result!.netDisbursedNgn).toBe(47_500);
      expect(result!.advertisedImpliedAprPercent).toBe(60);
      // 15-day interest at 5%/mo = ₦1,250 + ₦2,500 fee = ₦3,750 TCC -> (3750 / 50000) * (365 / 15) = 182.5% APR
      expect(result!.effectiveNominalAprPercent).toBeCloseTo(182.5, 1);
      expect(result!.effectiveNetDisbursedAprPercent).toBeCloseTo(192.11, 1);
      expect(result!.dripPricingDetected).toBe(true);
      expect(result!.shortTenorPlayStoreViolation).toBe(true);

      const dripSpot = result!.blindSpots.find(
        (b) => b.findingCode === "APR_DRIP_PRICING_MISMATCH"
      );
      expect(dripSpot).toBeDefined();
      expect(dripSpot!.whatYouMissed).toContain("60% APR");
      expect(dripSpot!.whatYouMissed).toContain("182.5% APR");
      expect(dripSpot!.whatItCostsYou).toContain("FCCPA 2018 Section 115");
      expect(dripSpot!.oneClickFix).toContain("Effective APR: 182.5% p.a.");
    });

    it("flags excessive daily rollover penalties breaching the CBN 1%/month default cap", () => {
      const res = aprCalculatorService.calculateEffectiveApr({
        principalNgn: 100_000,
        advertisedRatePercent: 4,
        advertisedRatePeriod: "MONTHLY",
        tenorDays: 90,
        dailyPenaltyPercent: 1.5,
      });

      expect(res.excessivePenaltyViolation).toBe(true);
      expect(
        res.blindSpots.some((b) => b.findingCode === "EXCESSIVE_ROLLOVER_PENALTY")
      ).toBe(true);
    });
  });

  describe("2. VisualForensicsService — Bounding-Box Typography Ratio & ARCON ASP Seal", () => {
    it("detects microscopic footer disclaimers (< 12% of headline height) and missing ARCON ASP ID", () => {
      const audit = visualForensicsService.evaluateSegments({
        fullText:
          "GET ₦500,000 INSTANT LOAN AT 3% MONTHLY\nTerms and conditions apply. Licensed by CBN.",
        segments: [
          {
            segmentIndex: 0,
            textContent: "GET ₦500,000 INSTANT LOAN AT 3% MONTHLY",
            boundingBox: { ymin: 100, xmin: 50, ymax: 240, xmax: 950, label: "HEADLINE" }, // height = 140
          },
          {
            segmentIndex: 1,
            textContent: "Terms and conditions apply. Licensed by CBN.",
            boundingBox: { ymin: 960, xmin: 50, ymax: 970, xmax: 950, label: "DISCLAIMER" }, // height = 10 -> ratio = 0.071 (7.1%)
          },
        ],
      });

      expect(audit.headlineBoxHeight).toBe(140);
      expect(audit.smallestDisclaimerBoxHeight).toBe(10);
      expect(audit.disclaimerToHeadlineRatio).toBeCloseTo(0.071, 2);
      expect(audit.hasMicroscopicDisclosures).toBe(true);
      expect(audit.hasArconAspCertificateId).toBe(false);
      expect(
        audit.blindSpots.some((b) => b.findingCode === "VISUAL_MICROSCOPIC_DISCLAIMER")
      ).toBe(true);
      expect(
        audit.blindSpots.some((b) => b.findingCode === "MISSING_ARCON_ASP_PRE_VETTING_ID")
      ).toBe(true);
    });

    it("passes visual audit when disclaimer height >= 12% and ARCON ASP ID is present", () => {
      const audit = visualForensicsService.evaluateSegments({
        fullText:
          "SME Working Capital Loans up to ₦5,000,000. Licensed by CBN. Terms and Conditions apply. ARCON/ASP/2026/88412",
        segments: [
          {
            segmentIndex: 0,
            textContent: "SME Working Capital Loans up to ₦5,000,000",
            boundingBox: { ymin: 100, xmin: 50, ymax: 200, xmax: 900, label: "HEADLINE" }, // height 100
          },
          {
            segmentIndex: 1,
            textContent:
              "Licensed by CBN. Terms and Conditions apply. ARCON/ASP/2026/88412",
            boundingBox: { ymin: 880, xmin: 50, ymax: 900, xmax: 900, label: "DISCLAIMER" }, // height 20 -> ratio 0.20
          },
        ],
      });

      expect(audit.hasMicroscopicDisclosures).toBe(false);
      expect(audit.hasArconAspCertificateId).toBe(true);
      expect(audit.detectedArconAspId).toContain("ARCON/ASP/2026/88412");
      expect(audit.passedVisualAudit).toBe(true);
    });
  });

  describe("3. AppStoreAuditorService — Google Play <60d Ban, FCCPC DEON & NDPC Dark Patterns", () => {
    it("catches <60d repayment trap, contact-list scraping, and bundled NDPC marketing consent", () => {
      const badListing = `
        Download FastNaira! Get loans in 3 minutes with 7 to 21 days repayment period.
        To verify your identity, our app will access your contact list and photo gallery.
        By signing up, you automatically agree to our terms and receive marketing SMS offers.
      `;

      const res = appStoreAuditorService.auditListingOrLandingPage({
        listingText: badListing,
      });

      expect(res.passed).toBe(false);
      expect(res.hasShortTenorViolation).toBe(true);
      expect(res.hasBannedPrivacyOrRecoveryTrap).toBe(true);
      expect(res.hasBundledConsentDarkPattern).toBe(true);
      expect(
        res.blindSpots.some((b) => b.findingCode === "APP_STORE_SHORT_TENOR_TRAP")
      ).toBe(true);
      expect(
        res.blindSpots.some((b) => b.findingCode === "FCCPC_DEON_CONTACT_SCRAPING_BAN")
      ).toBe(true);
      expect(
        res.blindSpots.some(
          (b) => b.findingCode === "NDPC_GAID_BUNDLED_CONSENT_DARK_PATTERN"
        )
      ).toBe(true);
    });

    it("passes a compliant Google Play loan listing with 61-180d tenor, KFS example, and 24h/14d redress", () => {
      const compliantListing = `
        Minimum and maximum period for repayment: 61 to 180 days.
        Maximum APR: 48% per annum.
        Representative example: If you borrow ₦100,000 over 90 days at 4% monthly interest and ₦0 processing fee, total cost of credit is ₦12,000 and total repayable is ₦112,000.
        For customer support or dispute resolution, contact help@bank.ng (resolved within 24 hours; escalate unresolved complaints after 14 days to CBN CPD).
      `;

      const res = appStoreAuditorService.auditListingOrLandingPage({
        listingText: compliantListing,
      });

      expect(res.passed).toBe(true);
      expect(res.blindSpots).toHaveLength(0);
    });
  });

  describe("4. LicenseScopeService — Cross-Regulator License Boundary Matrix", () => {
    it("blocks a Payment Service Bank (PSB) from advertising direct loans", () => {
      const res = licenseScopeService.verifyLicenseScope({
        contentText: "Get an instant loan up to ₦200,000 directly from our PSB wallet today!",
        licenseTier: "PSB_PAYMENT_SERVICE_BANK",
      });

      expect(res.passedLicenseBoundary).toBe(false);
      expect(
        res.blindSpots.some((b) => b.findingCode === "LICENSE_SCOPE_UNAUTHORIZED_LENDING")
      ).toBe(true);
    });

    it("blocks an FCCPC Digital Lender from soliciting public savings/deposits under BOFIA 2020 §2", () => {
      const res = licenseScopeService.verifyLicenseScope({
        contentText: "Open a savings account with us and earn 22% p.a. on your fixed deposit!",
        licenseTier: "FCCPC_DIGITAL_LENDER",
      });

      expect(res.passedLicenseBoundary).toBe(false);
      expect(
        res.blindSpots.some(
          (b) => b.findingCode === "LICENSE_SCOPE_UNLAWFUL_DEPOSIT_SOLICITATION"
        )
      ).toBe(true);
    });
  });

  describe("5. KfsGeneratorService & PrecedentMemoryService — KFS Artifacts & Zero-Click Product Match", () => {
    it("generates a 12-row CBN Key Facts Statement table, <=160 char SMS, and Lock-compliant social copy", async () => {
      const kit = kfsGeneratorService.generateKfsAndChannelKit({
        product: SAMPLE_QUICKCASH_PRODUCT,
        institutionName: "Kuda Microfinance Bank",
      });

      expect(kit.kfsRows.length).toBeGreaterThanOrEqual(10);
      expect(kit.kfsMarkdownTable).toContain("Key Facts Statement (KFS) Item");
      expect(kit.kfsMarkdownTable).toContain("182.5% APR p.a.");
      expect(kit.channelKit.sms160Char.length).toBeLessThanOrEqual(160);
      expect(kit.channelKit.arconAspSubstantiationMemo).toContain("ARCON Act 2022 §54");

      // Verify the generated social copy passes Lock 1 and Lock 3 deterministically
      const lockCheck = await mechanicalLocksEngine.executeLocks({
        tenantId: "11111111-1111-1111-1111-111111111111",
        contentText: kit.channelKit.socialCaptionAndFlyer,
      });
      expect(lockCheck.lock1_prohibited_terms.passed).toBe(true);
      expect(lockCheck.lock3_mandatory_disclosures.passed).toBe(true);
    });

    it("auto-matches a product from catalog even when explicitProductId is null", () => {
      const matched = precedentMemoryService.matchProductFromCatalog(
        "Does this flyer for our QuickCash promo look fine?",
        [SAMPLE_QUICKCASH_PRODUCT],
        null
      );

      expect(matched).not.toBeNull();
      expect(matched!.id).toBe(SAMPLE_QUICKCASH_PRODUCT.id);
    });
  });

  describe("6. Phase B & Reg-Intel: 32-Tool Autonomous Function Calling & Copilot Registry", () => {
    it("exposes all 32 statutory, campaign, forensic, autonomous copilot, and regulatory intelligence tools", async () => {
      const { STATUTORY_TOOL_DECLARATIONS } = await import(
        "@/modules/ai-orchestration/tools/statutory-tools"
      );
      expect(STATUTORY_TOOL_DECLARATIONS).toHaveLength(32);
      const toolNames = STATUTORY_TOOL_DECLARATIONS.map((t) => t.name);
      expect(toolNames).toContain("calculate_effective_apr_and_drip_fees");
      expect(toolNames).toContain("audit_flyer_visual_forensics");
      expect(toolNames).toContain("audit_app_store_listing");
      expect(toolNames).toContain("verify_license_scope_matrix");
      expect(toolNames).toContain("generate_kfs_and_channel_kit");
      expect(toolNames).toContain("recall_institutional_precedents");
      expect(toolNames).toContain("get_campaign_context");
      expect(toolNames).toContain("assess_campaign_compliance");
      // 5 Dynamic Autonomous Copilot Tools
      expect(toolNames).toContain("match_product_rate_card");
      expect(toolNames).toContain("calculate_cbn_apr_and_drip_pricing");
      expect(toolNames).toContain("search_nigerian_regulations");
      expect(toolNames).toContain("scan_live_url_or_creative");
      expect(toolNames).toContain("create_compliance_artifact");
      // 4 Phase 3 Regulatory Intelligence & Work Product Studio Tools
      expect(toolNames).toContain("compare_policy_against_regulation");
      expect(toolNames).toContain("parse_and_answer_ddq_questions");
      expect(toolNames).toContain("compare_african_jurisdictions");
      expect(toolNames).toContain("upsert_work_product_artifact");
    });
  });

  describe("7. Phase D: Zero-Prompt Regulatory Ripple Sentinel", () => {
    it("evaluates circular ripple impact against saved Product Rate Cards with Problem -> Risk -> Fix output", async () => {
      const { regulatoryRippleService } = await import(
        "@/modules/regulatory-vault/regulatory-ripple.service"
      );
      const impact = (
        regulatoryRippleService as unknown as {
          evaluateProductImpact: (
            product: Record<string, unknown>,
            regulator: string,
            circular: { regulator: string; title: string; summaryText: string; clauseReference?: string },
            corpus: string
          ) => {
            severity: string;
            blindSpot: string;
            consequence: string;
            recommendedFix: string;
          } | null;
        }
      ).evaluateProductImpact(
        {
          id: SAMPLE_QUICKCASH_PRODUCT.id,
          product_name: "QuickCash 30-Day",
          product_type: "DIGITAL_LOAN",
          interest_rate_max: 5,
          interest_rate_type: "MONTHLY",
          processing_fee_percent: 2.5,
          tenor_min_days: 30,
        },
        "CBN",
        {
          regulator: "CBN",
          title: "CBN Revised Consumer Protection Key Facts Statement (KFS) Circular 2026",
          summaryText: "All digital lending products must update APR and processing fee disclosures.",
          clauseReference: "Section 4.2.1 (KFS Schedule)",
        },
        "cbn revised consumer protection key facts statement (kfs) circular 2026 all digital lending products must update apr and processing fee disclosures."
      );

      expect(impact).not.toBeNull();
      expect(impact!.severity).toBe("CRITICAL");
      expect(impact!.blindSpot).toContain("QuickCash 30-Day");
      expect(impact!.blindSpot).toContain("Section 4.2.1 (KFS Schedule)");
      expect(impact!.consequence).toContain("₦2,000,000");
      expect(impact!.recommendedFix).toContain("Key Facts Statement (KFS)");
    });
  });

  describe("8. Single Source of Truth for Math (computedFinancials <-> KFS <-> Rewrite <-> ARCON Memo)", () => {
    it("locks 66.92% Effective APR identically across computedFinancials, Pre-Flight Gate, KFS Table, Rewrite, and ARCON Memo without double-counting fees or leaking raw markdown", async () => {
      const { aprCalculatorService } = await import(
        "@/modules/compliance-assessment/apr-calculator.service"
      );
      const { kfsGeneratorService } = await import(
        "@/modules/compliance-assessment/kfs-generator.service"
      );

      const quickCash500kProduct: CampaignProduct = {
        ...SAMPLE_QUICKCASH_PRODUCT,
        product_name: "QuickCash 30-Day Salary Advance",
        approved_terms: {
          ...SAMPLE_QUICKCASH_PRODUCT.approved_terms,
          interest_rate_max: 4,
          interest_rate_type: "MONTHLY",
          processing_fee_percent: 1.5,
          tenor_min_days: 30,
          tenor_max_days: 30,
          custom_terms: {},
        },
      };

      const preflightApr = aprCalculatorService.calculateEffectiveApr({
        principalNgn: 500_000,
        advertisedRatePercent: 4,
        advertisedRatePeriod: "MONTHLY",
        tenorDays: 30,
        processingFeePercent: 1.5,
      });

      expect(preflightApr.effectiveNominalAprPercent).toBe(66.92);
      expect(preflightApr.upfrontFeesNgn).toBe(7500);
      expect(preflightApr.netDisbursedNgn).toBe(492500);

      // Verify canonical computedFinancials structure
      expect(preflightApr.computedFinancials).toBeDefined();
      expect(preflightApr.computedFinancials.principal_ngn).toBe(500_000);
      expect(preflightApr.computedFinancials.total_upfront_fees_ngn).toBe(7500);
      expect(preflightApr.computedFinancials.net_disbursed_cash_ngn).toBe(492_500);
      expect(preflightApr.computedFinancials.nominal_interest_ngn).toBe(20_000);
      expect(preflightApr.computedFinancials.total_cost_of_credit_ngn).toBe(27_500);
      expect(preflightApr.computedFinancials.total_repayable_ngn).toBe(520_000);
      expect(preflightApr.computedFinancials.effective_apr_percent).toBe(66.92);
      expect(preflightApr.computedFinancials.tenor_days).toBe(30);
      expect(preflightApr.computedFinancials.itemized_upfront_fees).toHaveLength(1);
      expect(preflightApr.computedFinancials.itemized_upfront_fees[0]?.amount_ngn).toBe(7500);

      const kfsKit = kfsGeneratorService.generateKfsAndChannelKit({
        product: quickCash500kProduct,
        principalNgn: 500_000,
        interestRatePercent: 4,
        tenorDays: 30,
        processingFeeFlatNgn: preflightApr.upfrontFeesNgn,
        lockedAprAudit: preflightApr,
      });

      // 1. KFS APR summary matches Pre-Flight Gate (66.92%, not 85.17%)
      expect(kfsKit.aprSummary.effectiveNominalAprPercent).toBe(66.92);
      expect(kfsKit.aprSummary.upfrontFeesNgn).toBe(7500);
      expect(kfsKit.aprSummary.tenorDays).toBe(30);

      // 2. KFS table row matches 66.92%
      const aprRow = kfsKit.kfsRows.find((r) =>
        r.field.includes("Effective Annual Percentage Rate")
      );
      expect(aprRow?.value).toContain("66.92%");

      // 3. Channel rewrites & ARCON memo all state 66.92% and have zero raw markdown markers
      expect(kfsKit.channelKit.webLandingDisclosureHtml).toContain("66.92%");
      expect(kfsKit.channelKit.socialCaptionAndFlyer).toContain("66.92%");
      expect(kfsKit.channelKit.arconAspSubstantiationMemo).toContain("66.92%");
      expect(kfsKit.channelKit.arconAspSubstantiationMemo).not.toContain("85.17%");
      expect(kfsKit.channelKit.arconAspSubstantiationMemo).not.toContain("###");
      expect(kfsKit.channelKit.arconAspSubstantiationMemo).not.toContain("**");
    });
  });

  describe("9. Editorial Markdown Sanitization & Citation OCR Deduplication", () => {
    it("strips ```text wrappers and ASCII box borders while preserving GFM tables and headings", async () => {
      const { sanitizeEditorialMarkdown, cleanAndDeduplicateCitations } = await import(
        "@/components/chat/AdaptiveMessageRenderer"
      );

      const dirtyMarkdown = [
        "### Executive Compliance Summary",
        "+-------------------+-------------------+",
        "```text",
        "| Metric | Value |",
        "| :--- | :--- |",
        "| Effective APR | 66.92% p.a. |",
        "```",
        "==================",
      ].join("\n");

      const cleaned = sanitizeEditorialMarkdown(dirtyMarkdown);
      expect(cleaned).not.toContain("```text");
      expect(cleaned).not.toContain("+-------------------+");
      expect(cleaned).not.toContain("==================");
      expect(cleaned).toContain("| Metric | Value |");
      expect(cleaned).toContain("| Effective APR | 66.92% p.a. |");

      const deduped = cleanAndDeduplicateCitations([
        {
          source_class: "VERIFIED_OFFICIAL_SOURCE",
          badge_label: "Verified Statutory Vault",
          regulator: "FCCPC",
          instrument_title: "FCCPA 2018",
          clause_reference: "35.35.AnAn advertiser,advertiser, promoter shall not...",
          regulatory_clause_id: "id_1",
        },
        {
          source_class: "VERIFIED_OFFICIAL_SOURCE",
          badge_label: "Verified Statutory Vault",
          regulator: "FCCPC",
          instrument_title: "FCCPA 2018",
          clause_reference: "35.35.AnAn advertiser,advertiser, promoter shall not...",
          regulatory_clause_id: "id_2",
        },
      ]);

      expect(deduped).toHaveLength(1);
      expect(deduped[0]?.clause_reference).toBe("Section 35");
    });
  });
});



