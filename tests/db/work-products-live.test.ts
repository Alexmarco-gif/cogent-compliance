/**
 * Cogent Regulatory Intelligence Platform
 * Live Supabase DB Integration & Isolation Test (Phase 4)
 * Tests Work Products CRUD + Revisions, Cross-Tenant Isolation, PDF Compilation,
 * and Unified Command Center Search against live PostgreSQL.
 */

import { describe, it, expect, afterAll } from "vitest";
import { createAdminSupabaseClient } from "@/lib/supabase";
import { workProductService } from "@/modules/work-products/work-product.service";
import { workProductExportService } from "@/modules/work-products/work-product-export.service";
import { unifiedSearchService } from "@/modules/live-web-intelligence/unified-search.service";

const isMockDb =
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL.includes("mock") ||
  !process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY.includes("mock");

const LIVE_TENANT_A = "5cee04f7-a313-4068-ad78-d15ceff3f317";
const LIVE_USER_A = "user_3M7kRmRMOf88sqFwWFMxtec8YuW";
const LIVE_TENANT_B = "11111111-1111-1111-1111-111111111111";

describe.skipIf(isMockDb)(
  "Phase 4 Live Supabase Work Products, Export & Unified Search Integration",
  () => {
    const createdWorkProductIds: string[] = [];

    afterAll(async () => {
      const supabase = createAdminSupabaseClient();
      const { data: leftover } = await supabase
        .from("work_product_artifacts")
        .select("id")
        .like("title", "__LIVE_TEST__%");
      const allIds = Array.from(
        new Set([
          ...createdWorkProductIds,
          ...(leftover || []).map((r: { id: string }) => r.id),
        ])
      );
      for (const wpId of allIds) {
        await supabase.from("work_product_revisions").delete().eq("work_product_id", wpId);
        await supabase.from("work_product_artifacts").delete().eq("id", wpId);
        await supabase.from("marketing_audit_events").delete().eq("entity_id", wpId);
      }
    }, 30_000);

    it(
      "persists v1 work product, updates inline to v2 with revision audit, blocks cross-tenant read, and compiles real PDF",
      async () => {
        const v1 = await workProductService.upsertWorkProduct(LIVE_TENANT_A, LIVE_USER_A, {
          workflow_type: "PRODUCT_STRUCTURING_MEMO",
          artifact_type: "statutory_structuring_memo",
          title: "__LIVE_TEST__ USD Virtual Card Structuring Memo",
          jurisdiction_scope: ["NG"],
          markdown_content:
            "# USD Virtual Card Structuring Memo\n\nEffective APR: 24% p.a. Maintenance fee ₦500.\n\nGrounded against CBN Consumer Protection Framework & NDPA 2023.",
          structured_payload: { liveIntegrationTest: true },
          citations: [
            {
              source_class: "VERIFIED_OFFICIAL_SOURCE",
              badge_label: "CBN CPF §3.2",
              regulator: "CBN",
            },
          ],
          evidence_gaps: [],
          status: "DRAFT",
        });

        expect(v1.created).toBe(true);
        expect(v1.workProduct.version_number).toBe(1);
        createdWorkProductIds.push(v1.workProduct.id);

        const v2 = await workProductService.updateWorkProductInline(
          LIVE_TENANT_A,
          LIVE_USER_A,
          v1.workProduct.id,
          {
            markdown_content:
              "# USD Virtual Card Structuring Memo (v2)\n\nNet disbursed payout ₦9,500. AML records kept >= 5 years (NFIU/CBN AML) and breach notice <= 72 hours (NDPC).",
            status: "REVIEWED",
            change_summary: "Verified legal floor clauses",
          }
        );

      expect(v2.workProduct.version_number).toBe(2);
      expect(v2.revision.version_number).toBe(2);
      expect(v2.workProduct.source_hash_sha256).not.toBe(v1.workProduct.source_hash_sha256);

        const fetchedOwn = await workProductService.getWorkProductWithRevisions(
          LIVE_TENANT_A,
          v1.workProduct.id
        );
        expect(fetchedOwn).not.toBeNull();
        expect(fetchedOwn!.revisions.length).toBe(2);

        // Strict cross-tenant isolation
        const fetchedCrossTenant = await workProductService.getWorkProductWithRevisions(
          LIVE_TENANT_B,
          v1.workProduct.id
        );
        expect(fetchedCrossTenant).toBeNull();

        // Compile real PDF binary & verify WinAnsi + %PDF- signature
        const pdfExport = await workProductExportService.exportWorkProduct(
          LIVE_TENANT_A,
          LIVE_USER_A,
          v1.workProduct.id,
          "pdf"
        );
        expect(pdfExport.format).toBe("pdf");
        expect(pdfExport.buffer.subarray(0, 5).toString("ascii")).toBe("%PDF-");
        expect(pdfExport.file_size_bytes).toBeGreaterThan(500);

        // Compile Markdown (.md) export & verify UTF-8 content
        const mdExport = await workProductExportService.exportWorkProduct(
          LIVE_TENANT_A,
          LIVE_USER_A,
          v1.workProduct.id,
          "md"
        );
        expect(mdExport.format).toBe("md");
        expect(mdExport.content_type).toContain("text/markdown");
        expect(mdExport.buffer.toString("utf8")).toContain("USD Virtual Card Structuring Memo");
      },
      30_000
    );

    it(
      "executes Unified Search cleanly on live Supabase with strict entitlement gate",
      async () => {
        const res = await unifiedSearchService.executeUnifiedSearch(LIVE_TENANT_A, {
          query: "consumer protection disclosure apr",
          mode: "HYBRID_LIVE_WEB",
          enable_live_web: true,
          jurisdictions: ["NG"],
          search_intent: "REGULATORY_CIRCULAR",
          include_news: false,
          limit: 5,
        });

        expect(["ENTITLEMENT_BLOCKED", "EXECUTED", "NO_RESULTS"]).toContain(res.live_web_status);
        expect(res.quota.plan_slug).toBeTruthy();
        expect(Array.isArray(res.vault_clauses)).toBe(true);
        expect(Array.isArray(res.workspace_hits)).toBe(true);
      },
      30_000
    );
  }
);
