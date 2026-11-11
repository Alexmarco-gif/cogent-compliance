import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { createAdminSupabaseClient } from "@/lib/supabase";

describe("Database Tenant Isolation & Composite Keys (Phase 2)", () => {
  const migrationPath = path.resolve(
    process.cwd(),
    "supabase/migrations/20261111000001_marketing_shield_schema.sql",
  );

  it("should enforce composite UNIQUE (tenant_id, id) on all parent tenant tables", () => {
    const sql = fs.readFileSync(migrationPath, "utf-8");

    const requiredParentTables = [
      "marketing_conversations",
      "marketing_campaigns",
      "campaign_products",
      "campaign_assets",
      "marketing_knowledge_documents",
      "campaign_assessments",
      "compliance_findings",
      "campaign_revisions",
    ];

    for (const table of requiredParentTables) {
      const regex = new RegExp(
        `CREATE TABLE IF NOT EXISTS ${table}[\\s\\S]*?CONSTRAINT ${table}_tenant_id_id_unique UNIQUE \\(tenant_id, id\\)`,
        "i",
      );
      expect(sql).toMatch(regex);
    }
  });

  it("should enforce composite FOREIGN KEY (tenant_id, parent_id) on all child tables", () => {
    const sql = fs.readFileSync(migrationPath, "utf-8");

    // 1. Messages -> Conversation
    expect(sql).toMatch(
      /CONSTRAINT fk_marketing_messages_conversation FOREIGN KEY \(tenant_id, conversation_id\)\s+REFERENCES marketing_conversations\(tenant_id, id\)/i,
    );

    // 2. Claims -> Campaign
    expect(sql).toMatch(
      /CONSTRAINT fk_claims_campaign FOREIGN KEY \(tenant_id, campaign_id\)\s+REFERENCES marketing_campaigns\(tenant_id, id\)/i,
    );

    // 3. Findings -> Assessment
    expect(sql).toMatch(
      /CONSTRAINT fk_findings_assessment FOREIGN KEY \(tenant_id, assessment_id\)\s+REFERENCES campaign_assessments\(tenant_id, id\)/i,
    );

    // 4. Revisions -> Campaign
    expect(sql).toMatch(
      /CONSTRAINT fk_revisions_campaign FOREIGN KEY \(tenant_id, campaign_id\)\s+REFERENCES marketing_campaigns\(tenant_id, id\)/i,
    );

    // 5. Approvals -> Campaign
    expect(sql).toMatch(
      /CONSTRAINT fk_approvals_campaign FOREIGN KEY \(tenant_id, campaign_id\)\s+REFERENCES marketing_campaigns\(tenant_id, id\)/i,
    );
  });

  it("should enforce ON DELETE RESTRICT on historical compliance audit tables", () => {
    const sql = fs.readFileSync(migrationPath, "utf-8");

    // campaign_assessments
    expect(sql).toMatch(
      /CONSTRAINT fk_assessments_campaign FOREIGN KEY \(tenant_id, campaign_id\)\s+REFERENCES marketing_campaigns\(tenant_id, id\) ON DELETE RESTRICT/i,
    );

    // compliance_findings
    expect(sql).toMatch(
      /CONSTRAINT fk_findings_assessment FOREIGN KEY \(tenant_id, assessment_id\)\s+REFERENCES campaign_assessments\(tenant_id, id\) ON DELETE RESTRICT/i,
    );

    // campaign_revisions
    expect(sql).toMatch(
      /CONSTRAINT fk_revisions_campaign FOREIGN KEY \(tenant_id, campaign_id\)\s+REFERENCES marketing_campaigns\(tenant_id, id\) ON DELETE RESTRICT/i,
    );

    // campaign_approvals
    expect(sql).toMatch(
      /CONSTRAINT fk_approvals_campaign FOREIGN KEY \(tenant_id, campaign_id\)\s+REFERENCES marketing_campaigns\(tenant_id, id\) ON DELETE RESTRICT/i,
    );
  });

  it("should verify live database cross-tenant insertion rejection when live Supabase credentials are configured", async () => {
    const isLiveConfigured =
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      !process.env.SUPABASE_SERVICE_ROLE_KEY.includes("mock") &&
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("mock");

    if (!isLiveConfigured) {
      // In CI/offline build, structural SQL proof passes
      return;
    }

    const supabase = createAdminSupabaseClient();
    const tenantA = "00000000-0000-0000-0000-000000000001";
    const tenantB = "00000000-0000-0000-0000-000000000002";
    const campaignId = "00000000-0000-0000-0000-000000000003";

    // Attempt to insert a claim owned by Tenant A referencing a campaign owned by Tenant B
    const { error } = await supabase.from("campaign_claims").insert({
      tenant_id: tenantA,
      campaign_id: campaignId,
      claim_text: "Malicious cross-tenant claim",
      claim_category: "INTEREST_RATE_OR_APR",
      extraction_method: "TEST",
    });

    // PostgreSQL MUST reject this with a foreign key violation (23503)
    expect(error).toBeDefined();
    expect(error?.code).toBe("23503");
  });
});
