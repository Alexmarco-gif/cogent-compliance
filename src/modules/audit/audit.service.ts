/**
 * Cogent Marketing Shield - Cryptographic Tamper-Evident Audit Ledger
 * Document Reference: Document 07 (Section 8.1) & Document 08 (Phase 4)
 */

import crypto from "crypto";
import { createAdminSupabaseClient } from "@/lib/supabase";
import { logger } from "@/lib/logger";

export const GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000";

export interface AppendAuditEventParams {
  tenantId: string;
  actorId: string;
  actorType?: "USER" | "SYSTEM" | "SERVICE";
  action: string;
  entityType: string;
  entityId: string;
  eventData?: Record<string, unknown>;
  correlationId?: string;
  timestamp?: string;
}

export interface AuditRecord {
  id: string;
  tenant_id: string;
  actor_id: string | null;
  actor_type: string;
  action: string;
  entity_type: string;
  entity_id: string;
  previous_state_hash: string | null;
  new_state_hash: string | null;
  event_data: Record<string, unknown>;
  correlation_id: string | null;
  created_at: string;
}

export interface AuditVerificationResult {
  valid: boolean;
  totalEventsVerified: number;
  tamperedEventId?: string;
  reason?: string;
}

export class CryptographicAuditService {
  /**
   * Computes the deterministic SHA-256 chained digest for an audit entry.
   */
  public static computeStateHash(
    previousHash: string,
    tenantId: string,
    action: string,
    entityType: string,
    entityId: string,
    eventData: Record<string, unknown>,
    createdAt: string,
  ): string {
    const serializedData = JSON.stringify(eventData);
    const payload = `${previousHash}:${tenantId}:${action}:${entityType}:${entityId}:${serializedData}:${createdAt}`;
    return crypto.createHash("sha256").update(payload).digest("hex");
  }

  /**
   * Appends an immutable, chained audit record to `marketing_audit_events`.
   */
  public async appendEvent(params: AppendAuditEventParams): Promise<AuditRecord> {
    const supabase = createAdminSupabaseClient();
    const createdAt = params.timestamp || new Date().toISOString();
    const eventData = params.eventData || {};
    const actorType = params.actorType || "USER";

    // 1. Retrieve the most recent event for this tenant to chain the previous_state_hash
    const { data: latestEvent } = await supabase
      .from("marketing_audit_events")
      .select("new_state_hash")
      .eq("tenant_id", params.tenantId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const previousHash = latestEvent?.new_state_hash || GENESIS_HASH;

    // 2. Compute the cryptographic next state hash
    const newStateHash = CryptographicAuditService.computeStateHash(
      previousHash,
      params.tenantId,
      params.action,
      params.entityType,
      params.entityId,
      eventData,
      createdAt,
    );

    // 3. Insert record into database
    const insertPayload = {
      tenant_id: params.tenantId,
      actor_id: params.actorId,
      actor_type: actorType,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId,
      previous_state_hash: previousHash,
      new_state_hash: newStateHash,
      event_data: eventData,
      correlation_id: params.correlationId || null,
      created_at: createdAt,
    };

    const { data: inserted, error } = await supabase
      .from("marketing_audit_events")
      .insert(insertPayload)
      .select()
      .single();

    if (error || !inserted) {
      logger.error("Failed to append cryptographic audit record", {
        tenantId: params.tenantId,
        action: params.action,
        error: error?.message,
      });
      throw new Error(`Audit ledger append failed: ${error?.message}`);
    }

    logger.info("Appended chained audit event", {
      auditId: inserted.id,
      tenantId: params.tenantId,
      action: params.action,
      stateHash: newStateHash.substring(0, 12),
    });

    return inserted as AuditRecord;
  }

  /**
   * Verifies the cryptographic chain integrity for a tenant's audit trail.
   * Detects any altered payloads, broken links, or unauthorized modifications.
   */
  public async verifyChain(
    tenantId: string,
    limit: number = 500,
  ): Promise<AuditVerificationResult> {
    const supabase = createAdminSupabaseClient();

    const { data: events, error } = await supabase
      .from("marketing_audit_events")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error) {
      return {
        valid: false,
        totalEventsVerified: 0,
        reason: `Failed to query audit events: ${error.message}`,
      };
    }

    if (!events || events.length === 0) {
      return {
        valid: true,
        totalEventsVerified: 0,
      };
    }

    let expectedPreviousHash = GENESIS_HASH;

    for (let i = 0; i < events.length; i++) {
      const event = events[i] as AuditRecord;

      // Check 1: previous_state_hash must equal the expectedPreviousHash
      if (event.previous_state_hash !== expectedPreviousHash) {
        return {
          valid: false,
          totalEventsVerified: i,
          tamperedEventId: event.id,
          reason: `Hash chain break at event #${i + 1} (${event.id}): previous_state_hash mismatch. Expected ${expectedPreviousHash.substring(0, 12)}..., found ${event.previous_state_hash?.substring(0, 12)}...`,
        };
      }

      // Check 2: recomputed new_state_hash must match stored new_state_hash
      const expectedNewHash = CryptographicAuditService.computeStateHash(
        expectedPreviousHash,
        event.tenant_id,
        event.action,
        event.entity_type,
        event.entity_id,
        event.event_data,
        event.created_at,
      );

      if (event.new_state_hash !== expectedNewHash) {
        return {
          valid: false,
          totalEventsVerified: i,
          tamperedEventId: event.id,
          reason: `Cryptographic digest mismatch at event #${i + 1} (${event.id}): event data or metadata was tampered.`,
        };
      }

      expectedPreviousHash = event.new_state_hash;
    }

    return {
      valid: true,
      totalEventsVerified: events.length,
    };
  }
}

export const auditService = new CryptographicAuditService();
