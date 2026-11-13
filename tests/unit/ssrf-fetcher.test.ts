/**
 * Cogent Marketing Shield - SSRF Defense & URL Fetcher Unit Tests
 * Document Reference: Document 07 (Section 6.2), Document 09 (Section 5.3)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { webSearchRouter } from "@/modules/live-web-intelligence/web-search.router";

describe("SSRF Defense & Live URL Fetcher (SEC-SSRF-001 to 005)", () => {
  const tenantId = "tenant_test_ssrf_001";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("SEC-SSRF-001: strictly rejects non-HTTPS schemes (http://, file://, ftp://)", async () => {
    await expect(
      webSearchRouter.fetchLiveUrlContent(
        { url: "http://example.com/promo" },
        tenantId
      )
    ).rejects.toThrow(/HTTPS.*required/i);

    await expect(
      webSearchRouter.fetchLiveUrlContent(
        { url: "file:///etc/passwd" },
        tenantId
      )
    ).rejects.toThrow();
  });

  it("SEC-SSRF-002: strictly blocks localhost and loopback targets (127.0.0.1, ::1)", async () => {
    await expect(
      webSearchRouter.fetchLiveUrlContent(
        { url: "https://localhost:8080/admin" },
        tenantId
      )
    ).rejects.toThrow(/URL_FETCH_BLOCKED/);

    await expect(
      webSearchRouter.fetchLiveUrlContent(
        { url: "https://127.0.0.1:3000/api" },
        tenantId
      )
    ).rejects.toThrow(/URL_FETCH_BLOCKED/);
  });

  it("SEC-SSRF-003: strictly blocks AWS/GCP cloud metadata IP (169.254.169.254)", async () => {
    await expect(
      webSearchRouter.fetchLiveUrlContent(
        { url: "https://169.254.169.254/latest/meta-data/" },
        tenantId
      )
    ).rejects.toThrow(/URL_FETCH_BLOCKED/);
  });

  it("SEC-SSRF-004: strictly blocks private RFC-1918 subnets (10.0.0.0/8, 192.168.0.0/16)", async () => {
    await expect(
      webSearchRouter.fetchLiveUrlContent(
        { url: "https://10.0.0.1/internal-dashboard" },
        tenantId
      )
    ).rejects.toThrow(/URL_FETCH_BLOCKED/);

    await expect(
      webSearchRouter.fetchLiveUrlContent(
        { url: "https://192.168.1.1/router-login" },
        tenantId
      )
    ).rejects.toThrow(/URL_FETCH_BLOCKED/);
  });

  it("SEC-SSRF-005: successfully fetches and sanitizes valid public HTTPS target", async () => {
    // Mock global fetch for public URL test
    const mockHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Access Bank Salary Advance Promo</title>
          <script>alert('malicious')</script>
          <style>body { color: red; }</style>
        </head>
        <body>
          <h1>Quick Payday Advance</h1>
          <p>Get up to ₦500,000 in minutes. 5% monthly interest applies.</p>
          <footer>Terms and conditions apply. Licensed by the Central Bank of Nigeria.</footer>
        </body>
      </html>
    `;

    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(mockHtml, {
        status: 200,
        headers: { "Content-Type": "text/html" },
      })
    );

    const result = await webSearchRouter.fetchLiveUrlContent(
      { url: "https://accessbankplc.com/salary-advance" },
      tenantId
    );

    expect(result.success).toBe(true);
    expect(result.page_title).toBe("Access Bank Salary Advance Promo");
    expect(result.content_text).toContain("Quick Payday Advance");
    expect(result.content_text).toContain("Licensed by the Central Bank of Nigeria");
    expect(result.content_text).not.toContain("<script>");
    expect(result.content_text).not.toContain("alert('malicious')");
    expect(result.sha256_hash).toHaveLength(64);
  });
});
