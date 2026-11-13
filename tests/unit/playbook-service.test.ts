/**
 * Cogent Marketing Shield - Playbook Service & Knowledge RBAC Unit Tests
 * Document Reference: Document 08 (Phase 10), Document 07 (Section 5.2), Document 09 (Section 5.2)
 */

import { describe, it, expect } from "vitest";
import { playbookService } from "@/modules/knowledge-base/playbook.service";
import { ROLE_PERMISSIONS } from "@/modules/auth-tenancy/permissions";

describe("Playbook Service Chunking & Rule Extraction", () => {
  it("chunks multi-paragraph playbook text into discrete segments with overlap", () => {
    const samplePlaybook = `
SECTION 1: DIGITAL LENDING PROMOTIONAL PRINCIPLES
All digital lending promotions must be clear, transparent, and fair to Nigerian consumers.
No misleading statements or hidden balloon payments shall be permitted.

SECTION 2: PROHIBITED MARKETING PHRASES
Commercial teams are strictly prohibited from using phrases like '100% free loan' or 'guaranteed approval'.
Never use predatory bait-and-switch promotional copy on social media channels.

SECTION 3: MANDATORY DISCLOSURES
All marketing materials must include the mandatory regulatory license disclosure stating:
'Licensed by the Central Bank of Nigeria as a Digital Lending Institution'.
Furthermore, every communication must display 'Terms and conditions apply'.

SECTION 4: FEE CEILINGS
Processing fees shall not exceed 2.0% of principal disbursement.
Administrative charges must remain capped at zero for first-time retail borrowers.
    `.trim();

    const chunks = playbookService.chunkText(samplePlaybook, 300, 80);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]!.chunkIndex).toBe(0);
    expect(chunks[0]!.chunkText.length).toBeGreaterThan(20);
  });

  it("extracts candidate rules categorized as PROHIBITED, REQUIRED_DISCLOSURE, RATE_FEE_LIMIT, and SOP_RULE", () => {
    const sampleText = `
Commercial creators are strictly prohibited from advertising zero interest when processing fees apply.
All promotional flyers must include our official licensing status and clear contact details.
The maximum interest rate shall not exceed 5% monthly under any circumstances.
Our approved tagline is 'Fast, ethical credit for working Nigerians'.
Prior to publication, all advertising assets must undergo formal review and legal sign-off from compliance.
    `.trim();

    const rules = playbookService.extractCandidateRules(sampleText);
    expect(rules.length).toBeGreaterThanOrEqual(4);

    const types = rules.map((r) => r.ruleType);
    expect(types).toContain("PROHIBITED");
    expect(types).toContain("REQUIRED_DISCLOSURE");
    expect(types).toContain("RATE_FEE_LIMIT");
    expect(types).toContain("APPROVED_LANGUAGE");
    expect(types).toContain("SOP_RULE");
  });
});

describe("Knowledge Base RBAC & Separation of Duties", () => {
  it("strictly denies knowledge.publish to MARKETING_GROWTH and COMPLIANCE_ANALYST", () => {
    // Marketing cannot activate internal compliance rules for live enforcement
    expect(ROLE_PERMISSIONS.MARKETING_GROWTH.has("knowledge.publish")).toBe(false);

    // Compliance Analyst cannot activate rules without Legal / CCO sign-off
    expect(ROLE_PERMISSIONS.COMPLIANCE_ANALYST.has("knowledge.publish")).toBe(false);
  });

  it("permits knowledge.publish strictly to LEGAL_COUNSEL, CHIEF_COMPLIANCE_OFFICER, and WORKSPACE_ADMIN", () => {
    expect(ROLE_PERMISSIONS.LEGAL_COUNSEL.has("knowledge.publish")).toBe(true);
    expect(ROLE_PERMISSIONS.CHIEF_COMPLIANCE_OFFICER.has("knowledge.publish")).toBe(true);
    expect(ROLE_PERMISSIONS.WORKSPACE_ADMIN.has("knowledge.publish")).toBe(true);
  });

  it("enforces product.write and knowledge.write boundaries across roles", () => {
    // Marketing cannot alter product truth or upload institutional policy manuals
    expect(ROLE_PERMISSIONS.MARKETING_GROWTH.has("product.write")).toBe(false);
    expect(ROLE_PERMISSIONS.MARKETING_GROWTH.has("knowledge.write")).toBe(false);

    // Compliance Analyst, Legal Counsel, and CCO can author drafts
    expect(ROLE_PERMISSIONS.COMPLIANCE_ANALYST.has("product.write")).toBe(true);
    expect(ROLE_PERMISSIONS.COMPLIANCE_ANALYST.has("knowledge.write")).toBe(true);
    expect(ROLE_PERMISSIONS.LEGAL_COUNSEL.has("product.write")).toBe(true);
    expect(ROLE_PERMISSIONS.CHIEF_COMPLIANCE_OFFICER.has("product.write")).toBe(true);
  });
});
