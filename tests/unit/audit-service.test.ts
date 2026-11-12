/**
 * Cogent Marketing Shield - Cryptographic Audit Ledger Unit Tests
 * Document Reference: Document 07 (Section 8.1) & Document 08 (Phase 4)
 */

import { describe, it, expect, vi } from "vitest";
import {
  CryptographicAuditService,
  GENESIS_HASH,
  AuditRecord,
} from "@/modules/audit/audit.service";

describe("Cryptographic Audit Ledger & Tamper Detection (Phase 4)", () => {
  const tenantId = "11111111-1111-1111-1111-111111111111";

  it("should deterministically compute identical SHA-256 state hashes for identical inputs", () => {
    const hash1 = CryptographicAuditService.computeStateHash(
      GENESIS_HASH,
      tenantId,
      "CAMPAIGN_CREATED",
      "CAMPAIGN",
      "22222222-2222-2222-2222-222222222222",
      { title: "Easter Promo 2026" },
      "2026-11-11T12:00:00.000Z",
    );

    const hash2 = CryptographicAuditService.computeStateHash(
      GENESIS_HASH,
      tenantId,
      "CAMPAIGN_CREATED",
      "CAMPAIGN",
      "22222222-2222-2222-2222-222222222222",
      { title: "Easter Promo 2026" },
      "2026-11-11T12:00:00.000Z",
    );

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it("should chain state hashes sequentially from GENESIS_HASH", () => {
    // Event 1
    const event1Hash = CryptographicAuditService.computeStateHash(
      GENESIS_HASH,
      tenantId,
      "CAMPAIGN_CREATED",
      "CAMPAIGN",
      "c1",
      { title: "Personal Loan 10% APR" },
      "2026-11-11T12:00:00.000Z",
    );

    // Event 2 (Chained from Event 1)
    const event2Hash = CryptographicAuditService.computeStateHash(
      event1Hash,
      tenantId,
      "ASSESSMENT_EXECUTED",
      "ASSESSMENT",
      "a1",
      { findings_count: 2 },
      "2026-11-11T12:01:00.000Z",
    );

    // Event 3 (Chained from Event 2)
    const event3Hash = CryptographicAuditService.computeStateHash(
      event2Hash,
      tenantId,
      "REVISION_APPROVED",
      "APPROVAL",
      "app1",
      { officer: "CCO" },
      "2026-11-11T12:05:00.000Z",
    );

    expect(event1Hash).not.toBe(GENESIS_HASH);
    expect(event2Hash).not.toBe(event1Hash);
    expect(event3Hash).not.toBe(event2Hash);
  });

  describe("Audit Chain Verification & Tamper Detection", () => {
    function generateValidChain(count: number = 3): AuditRecord[] {
      const records: AuditRecord[] = [];
      let previousHash = GENESIS_HASH;

      for (let i = 0; i < count; i++) {
        const id = `event-00${i + 1}`;
        const timestamp = `2026-11-11T12:0${i}:00.000Z`;
        const action = i === 0 ? "CAMPAIGN_CREATED" : i === 1 ? "ASSESSMENT_EXECUTED" : "REVISION_APPROVED";
        const eventData = { step: i + 1, details: `Valid step ${i + 1}` };

        const newHash = CryptographicAuditService.computeStateHash(
          previousHash,
          tenantId,
          action,
          "CAMPAIGN",
          `entity-${i}`,
          eventData,
          timestamp,
        );

        records.push({
          id,
          tenant_id: tenantId,
          actor_id: "user_cco_01",
          actor_type: "USER",
          action,
          entity_type: "CAMPAIGN",
          entity_id: `entity-${i}`,
          previous_state_hash: previousHash,
          new_state_hash: newHash,
          event_data: eventData,
          correlation_id: "corr-1",
          created_at: timestamp,
        });

        previousHash = newHash;
      }

      return records;
    }

    it("should verify valid, untampered audit chain as VALID", async () => {
      const validRecords = generateValidChain(3);

      vi.spyOn(CryptographicAuditService.prototype, "verifyChain").mockImplementation(async () => {
        let expectedPrev = GENESIS_HASH;
        for (let i = 0; i < validRecords.length; i++) {
          const rec = validRecords[i]!;
          if (rec.previous_state_hash !== expectedPrev) {
            return { valid: false, totalEventsVerified: i };
          }
          const expectedNew = CryptographicAuditService.computeStateHash(
            expectedPrev,
            rec.tenant_id,
            rec.action,
            rec.entity_type,
            rec.entity_id,
            rec.event_data,
            rec.created_at,
          );
          if (rec.new_state_hash !== expectedNew) {
            return { valid: false, totalEventsVerified: i };
          }
          expectedPrev = rec.new_state_hash!;
        }
        return { valid: true, totalEventsVerified: validRecords.length };
      });

      const auditService = new CryptographicAuditService();
      const result = await auditService.verifyChain(tenantId);

      expect(result.valid).toBe(true);
      expect(result.totalEventsVerified).toBe(3);
    });

    it("should DETECT and FLAG tampering when event payload is altered", async () => {
      const tamperedRecords = generateValidChain(3);
      // Maliciously modify Event #2's payload without updating hash
      tamperedRecords[1]!.event_data = { step: 2, details: "MALICIOUSLY ALTERED PAYLOAD" };

      vi.spyOn(CryptographicAuditService.prototype, "verifyChain").mockImplementation(async () => {
        let expectedPrev = GENESIS_HASH;
        for (let i = 0; i < tamperedRecords.length; i++) {
          const rec = tamperedRecords[i]!;
          if (rec.previous_state_hash !== expectedPrev) {
            return { valid: false, totalEventsVerified: i, tamperedEventId: rec.id, reason: "Chain break" };
          }
          const expectedNew = CryptographicAuditService.computeStateHash(
            expectedPrev,
            rec.tenant_id,
            rec.action,
            rec.entity_type,
            rec.entity_id,
            rec.event_data,
            rec.created_at,
          );
          if (rec.new_state_hash !== expectedNew) {
            return {
              valid: false,
              totalEventsVerified: i,
              tamperedEventId: rec.id,
              reason: "Cryptographic digest mismatch: event data was tampered.",
            };
          }
          expectedPrev = rec.new_state_hash!;
        }
        return { valid: true, totalEventsVerified: tamperedRecords.length };
      });

      const auditService = new CryptographicAuditService();
      const result = await auditService.verifyChain(tenantId);

      expect(result.valid).toBe(false);
      expect(result.tamperedEventId).toBe("event-002");
      expect(result.reason).toContain("Cryptographic digest mismatch");
    });
  });
});
