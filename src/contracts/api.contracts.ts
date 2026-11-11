import { z } from "zod";

/**
 * Standard API Metadata Schema
 */
export const apiMetaSchema = z.object({
  request_id: z.string().uuid().or(z.string()),
  timestamp: z.string().datetime().or(z.string()),
});

/**
 * Standard API Error Details Schema
 */
export const apiErrorDetailsSchema = z.object({
  field: z.string().optional(),
  issue: z.string(),
});

/**
 * Standard API Error Schema
 */
export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.array(apiErrorDetailsSchema).optional(),
});

/**
 * Standard Successful API Response Envelope
 */
export function createSuccessResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    success: z.literal(true),
    data: dataSchema,
    meta: apiMetaSchema,
  });
}

/**
 * Standard Error API Response Envelope
 */
export const apiErrorEnvelopeSchema = z.object({
  success: z.literal(false),
  error: apiErrorSchema,
  meta: apiMetaSchema,
});

/**
 * Health check data schema
 */
export const healthDataSchema = z.object({
  status: z.literal("healthy"),
  service: z.string(),
  version: z.string(),
  architecture: z.string().optional(),
  environment: z.string(),
  timestamp: z.string(),
});

export type ApiMeta = z.infer<typeof apiMetaSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;
export type HealthData = z.infer<typeof healthDataSchema>;
