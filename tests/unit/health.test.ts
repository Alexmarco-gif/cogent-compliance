import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/marketing-shield/v1/health/route";
import { NextRequest } from "next/server";
import { healthDataSchema, apiMetaSchema } from "@/contracts/api.contracts";

describe("Health Check API Contract (/api/marketing-shield/v1/health)", () => {
  it("should return HTTP 200 with standard envelope and matching schemas", async () => {
    const request = new NextRequest("http://localhost:3000/api/marketing-shield/v1/health", {
      headers: {
        "x-request-id": "11111111-2222-3333-4444-555555555555",
      },
    });

    const response = await GET(request);
    expect(response.status).toBe(200);
    expect(response.headers.get("X-Request-ID")).toBe("11111111-2222-3333-4444-555555555555");
    expect(response.headers.get("Content-Type")).toContain("application/json");

    const body = await response.json();
    expect(body.success).toBe(true);

    const parsedData = healthDataSchema.safeParse(body.data);
    expect(parsedData.success).toBe(true);
    if (parsedData.success) {
      expect(parsedData.data.status).toBe("healthy");
      expect(parsedData.data.service).toBe("Cogent Marketing Shield");
      expect(parsedData.data.version).toBe("2.0.0");
    }

    const parsedMeta = apiMetaSchema.safeParse(body.meta);
    expect(parsedMeta.success).toBe(true);
    if (parsedMeta.success) {
      expect(parsedMeta.data.request_id).toBe("11111111-2222-3333-4444-555555555555");
    }
  });

  it("should generate a fallback request ID if none is supplied in header", async () => {
    const request = new NextRequest("http://localhost:3000/api/marketing-shield/v1/health");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.meta.request_id).toBeDefined();
    expect(typeof body.meta.request_id).toBe("string");
    expect(body.meta.request_id.length).toBeGreaterThan(0);
  });
});
