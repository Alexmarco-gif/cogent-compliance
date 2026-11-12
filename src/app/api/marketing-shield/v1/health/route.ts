import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") || randomUUID();
  const timestamp = new Date().toISOString();

  // Child logger with bound correlation ID
  const routeLogger = logger.withContext({
    requestId,
    endpoint: "/api/marketing-shield/v1/health",
    method: "GET",
  });

  routeLogger.info("System health check requested");

  const responseBody = {
    success: true,
    data: {
      status: "healthy",
      service: "Cogent Marketing Shield",
      version: "2.0.0",
      architecture: "Modular Monolith with Asynchronous Workers",
      environment: process.env.NODE_ENV || "development",
      timestamp,
    },
    meta: {
      request_id: requestId,
      timestamp,
    },
  };

  return NextResponse.json(responseBody, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "X-Request-ID": requestId,
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
