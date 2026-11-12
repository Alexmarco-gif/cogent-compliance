/**
 * Cogent Marketing Shield - Regulatory Evidence & Statutory Vault Contracts
 * Document Reference: Document 03 (Sections 7 & 8), Document 05
 */

import { z } from "zod";

export const regulatorAcronymSchema = z.enum(["CBN", "FCCPC", "ARCON", "NDPC", "SEC"]);
export type RegulatorAcronym = z.infer<typeof regulatorAcronymSchema>;

export const regulatoryBodySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  acronym: regulatorAcronymSchema,
  description: z.string().optional().nullable(),
  official_domain: z.string().min(1),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  created_at: z.string().datetime().optional(),
});

export type RegulatoryBody = z.infer<typeof regulatoryBodySchema>;

export const regulatoryInstrumentSchema = z.object({
  id: z.string().uuid(),
  regulator_id: z.string().uuid(),
  title: z.string().min(1),
  instrument_type: z.enum(["ACT", "REGULATION", "GUIDELINE", "CIRCULAR", "CODE", "DIRECTIVE", "NOTICE"]),
  jurisdiction: z.string().default("NIGERIA"),
  instrument_number: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "SUPERSEDED", "DRAFT", "REPEALED"]).default("ACTIVE"),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

export type RegulatoryInstrument = z.infer<typeof regulatoryInstrumentSchema>;

export const regulatoryDocumentVersionSchema = z.object({
  id: z.string().uuid(),
  instrument_id: z.string().uuid(),
  version_number: z.string().default("1.0"),
  source_url: z.string().url(),
  document_hash: z.string().length(64),
  storage_key: z.string().min(1),
  publication_date: z.string(),
  effective_date: z.string(),
  expiry_date: z.string().optional().nullable(),
  verification_status: z.enum(["PENDING", "VERIFIED_OFFICIAL_SOURCE", "REJECTED"]).default("VERIFIED_OFFICIAL_SOURCE"),
  lifecycle_status: z.enum(["CURRENT", "SUPERSEDED", "DRAFT", "FUTURE_EFFECTIVE", "REPEALED"]).default("CURRENT"),
  verified_by: z.string().optional().nullable(),
  verified_at: z.string().datetime().optional().nullable(),
  created_at: z.string().datetime().optional(),
});

export type RegulatoryDocumentVersion = z.infer<typeof regulatoryDocumentVersionSchema>;

export const regulatoryClauseSchema = z.object({
  id: z.string().uuid(),
  document_version_id: z.string().uuid(),
  clause_reference: z.string().min(1),
  parent_clause_id: z.string().uuid().optional().nullable(),
  clause_text: z.string().min(1),
  page_number: z.number().int().positive().default(1),
  extraction_status: z.string().default("VERIFIED"),
  verification_status: z.string().default("VERIFIED"),
  embedding: z.array(z.number()).length(768).optional().nullable(),
  embedded_at: z.string().datetime().optional().nullable(),
  created_at: z.string().datetime().optional(),
});

export type RegulatoryClause = z.infer<typeof regulatoryClauseSchema>;

export const regulatoryObligationSchema = z.object({
  id: z.string().uuid(),
  clause_id: z.string().uuid(),
  obligation_text: z.string().min(1),
  obligation_type: z.enum(["PRESCRIPTIVE", "PROHIBITIVE", "DISCLOSURE", "PROCEDURAL", "RESTRICTION"]),
  applicability_description: z.string().optional().nullable(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("HIGH"),
  verification_status: z.string().default("VERIFIED"),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

export type RegulatoryObligation = z.infer<typeof regulatoryObligationSchema>;

export const prohibitedTermSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().optional().nullable(),
  term: z.string().min(1),
  normalized_term: z.string().min(1),
  category: z.string().min(1),
  reason: z.string().min(1),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("HIGH"),
  source_type: z.enum(["STATUTORY", "INSTITUTIONAL"]),
  source_reference_id: z.string().uuid().optional().nullable(),
  matching_mode: z.enum(["EXACT", "PHRASE", "REGEX"]).default("EXACT"),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  created_at: z.string().datetime().optional(),
});

export type ProhibitedTerm = z.infer<typeof prohibitedTermSchema>;
