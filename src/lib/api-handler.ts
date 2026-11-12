/**
 * Cogent Marketing Shield - Standard API Gateway Route Wrapper & Error Handler
 * Document Reference: Document 04 (Section 2) & Document 08 (Phase 4)
 */

import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { resolveTenantContext } from "@/modules/auth-tenancy/tenant.resolver";
import { requirePermission } from "@/modules/auth-tenancy/rbac.guard";
import { AuthTenancyError, PermissionKey, TenantContext } from "@/modules/auth-tenancy/types";
import { logger } from "./logger";
import { ApiErrorResponse, StandardErrorCode } from "@/contracts/api.contracts";

export interface ApiHandlerOptions<TBody = unknown, TQuery = unknown> {
  bodySchema?: z.ZodType<TBody>;
  querySchema?: z.ZodType<TQuery>;
  requiredPermission?: PermissionKey;
  requireIdempotency?: boolean;
  isPublic?: boolean;
}

export interface ApiRequestContext<TBody = unknown, TQuery = unknown> {
  readonly requestId: string;
  readonly tenant: TenantContext;
  readonly body: TBody;
  readonly query: TQuery;
  readonly params: Record<string, string | string[]>;
}

export type ApiRouteHandler<TData = unknown, TBody = unknown, TQuery = unknown> = (
  req: NextRequest,
  context: ApiRequestContext<TBody, TQuery>,
) => Promise<TData>;

/**
 * Higher-order function wrapping Next.js route handlers.
 * Standardizes:
 * - X-Request-ID correlation
 * - Server-side tenant resolution
 * - RBAC permission verification
 * - Idempotency key verification on state-changing calls
 * - Zod body & query schema validation
 * - Standard JSON success and error envelopes (Document 04 Section 2.3)
 */
export function createApiHandler<TData, TBody = unknown, TQuery = unknown>(
  options: ApiHandlerOptions<TBody, TQuery>,
  handler: ApiRouteHandler<TData, TBody, TQuery>,
) {
  return async (
    req: NextRequest,
    routeProps?: { params?: Promise<Record<string, string | string[]>> | Record<string, string | string[]> },
  ): Promise<NextResponse> => {
    const startTime = Date.now();
    const requestId = req.headers.get("x-request-id") || crypto.randomUUID();
    const endpoint = req.nextUrl.pathname;
    const method = req.method;

    const requestLogger = logger.withContext({
      requestId,
      endpoint,
      method,
    });

    try {
      // 1. Idempotency Check for state-changing requests
      if (options.requireIdempotency) {
        const idempotencyKey = req.headers.get("idempotency-key");
        if (!idempotencyKey || idempotencyKey.trim().length === 0) {
          return createErrorResponse(
            "VALIDATION_FAILED",
            "State-changing operations require an 'Idempotency-Key' header (UUID v4) to prevent duplicate execution.",
            400,
            requestId,
            [{ field: "headers.idempotency-key", issue: "Missing mandatory Idempotency-Key header" }],
          );
        }
      }

      // 2. Resolve Tenant Identity & RBAC (unless explicitly marked public)
      let tenant: TenantContext;
      if (options.isPublic) {
        tenant = {
          tenantId: "00000000-0000-0000-0000-000000000000",
          userId: "anonymous",
          clerkOrgId: "public",
          clerkUserId: "anonymous",
          orgSlug: "public",
          orgName: "Public",
          role: "MARKETING_GROWTH",
          permissions: new Set(),
          status: "ACTIVE",
        };
      } else {
        tenant = await resolveTenantContext(req);

        // 3. Verify Required Permission Key
        if (options.requiredPermission) {
          requirePermission(tenant, options.requiredPermission);
        }
      }

      // 4. Validate Query Parameters
      let parsedQuery = {} as TQuery;
      if (options.querySchema) {
        const queryParams = Object.fromEntries(req.nextUrl.searchParams.entries());
        const queryResult = options.querySchema.safeParse(queryParams);
        if (!queryResult.success) {
          return handleZodError(queryResult.error, requestId);
        }
        parsedQuery = queryResult.data;
      }

      // 5. Validate Body (for POST, PUT, PATCH)
      let parsedBody = {} as TBody;
      if (options.bodySchema && ["POST", "PUT", "PATCH"].includes(method)) {
        let rawBody: unknown;
        try {
          rawBody = await req.json();
        } catch {
          return createErrorResponse(
            "VALIDATION_FAILED",
            "Malformed JSON request body",
            400,
            requestId,
          );
        }

        const bodyResult = options.bodySchema.safeParse(rawBody);
        if (!bodyResult.success) {
          return handleZodError(bodyResult.error, requestId);
        }
        parsedBody = bodyResult.data;
      }

      // 6. Resolve Route Params (supporting async params in Next 15)
      let resolvedParams: Record<string, string | string[]> = {};
      if (routeProps?.params) {
        resolvedParams =
          typeof (routeProps.params as Promise<Record<string, string | string[]>>).then === "function"
            ? await (routeProps.params as Promise<Record<string, string | string[]>>)
            : (routeProps.params as Record<string, string | string[]>);
      }

      // 7. Execute Handler
      const data = await handler(req, {
        requestId,
        tenant,
        body: parsedBody,
        query: parsedQuery,
        params: resolvedParams,
      });

      const latencyMs = Date.now() - startTime;
      requestLogger.info("API request completed successfully", {
        latencyMs,
        tenantId: tenant.tenantId,
        userRole: tenant.role,
      });

      // 8. Return Standard Success Envelope (Document 04 Section 2.3)
      return NextResponse.json(
        {
          success: true,
          data,
          meta: {
            request_id: requestId,
            timestamp: new Date().toISOString(),
          },
        },
        {
          status: method === "POST" ? 201 : 200,
          headers: {
            "x-request-id": requestId,
          },
        },
      );
    } catch (err: unknown) {
      const latencyMs = Date.now() - startTime;

      if (err instanceof AuthTenancyError) {
        requestLogger.warn(`AuthTenancy rejection: ${err.message}`, {
          code: err.code,
          statusCode: err.statusCode,
          latencyMs,
        });

        return createErrorResponse(err.code as StandardErrorCode, err.message, err.statusCode, requestId);
      }

      if (err instanceof ZodError) {
        return handleZodError(err, requestId);
      }

      requestLogger.error("Unhandled API error", {
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        latencyMs,
      });

      return createErrorResponse(
        "INTERNAL_SERVER_ERROR",
        "An unexpected error occurred processing your compliance request",
        500,
        requestId,
      );
    }
  };
}

/**
 * Creates a standardized JSON error response matching Document 04 Section 2.3.
 */
export function createErrorResponse(
  code: StandardErrorCode,
  message: string,
  statusCode: number,
  requestId: string,
  details?: Array<{ field?: string; issue: string }>,
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        details,
      },
      meta: {
        request_id: requestId,
        timestamp: new Date().toISOString(),
      },
    },
    {
      status: statusCode,
      headers: {
        "x-request-id": requestId,
      },
    },
  );
}

/**
 * Converts Zod validation errors to standard ApiErrorResponse details.
 */
function handleZodError(error: ZodError, requestId: string): NextResponse<ApiErrorResponse> {
  const details = error.errors.map((e) => ({
    field: e.path.join("."),
    issue: e.message,
  }));

  return createErrorResponse(
    "VALIDATION_FAILED",
    "Request payload validation failed",
    400,
    requestId,
    details,
  );
}
