/**
 * Cogent Marketing Shield - Cloudflare R2 Storage & Binary Inspection Unit Tests
 * Document Reference: Document 07 (Section 6.1) & Document 08 (Phase 4)
 */

import { describe, it, expect } from "vitest";
import crypto from "crypto";
import { R2StorageService } from "@/modules/asset-processing/r2.storage";

describe("Cloudflare R2 Storage & Magic-Byte Validation (Phase 4)", () => {
  const r2Service = new R2StorageService();

  describe("Presigned URL Generation", () => {
    it("should generate tenant-scoped presigned PUT storage key", async () => {
      const result = await r2Service.generatePresignedUploadUrl({
        tenantId: "11111111-1111-1111-1111-111111111111",
        assetId: "22222222-2222-2222-2222-222222222222",
        filename: "cbn_apr_flyer_2026.png",
        mimeType: "image/png",
        fileSizeBytes: 1024 * 500,
      });

      expect(result.storageKey).toBe(
        "tenants/11111111-1111-1111-1111-111111111111/assets/22222222-2222-2222-2222-222222222222/cbn_apr_flyer_2026.png",
      );
      expect(result.expiresInSeconds).toBe(900);
      expect(result.uploadUrl).toBeDefined();
    });

    it("should sanitize unsafe characters from filename in storage key", async () => {
      const result = await r2Service.generatePresignedUploadUrl({
        tenantId: "11111111-1111-1111-1111-111111111111",
        assetId: "22222222-2222-2222-2222-222222222222",
        filename: "unsafe ../ flyer & rates #1.pdf",
        mimeType: "application/pdf",
        fileSizeBytes: 1024 * 100,
      });

      expect(result.storageKey).not.toContain(" ");
      expect(result.storageKey).not.toContain("&");
      expect(result.storageKey).not.toContain("#");
      expect(result.storageKey).toContain("unsafe_..__flyer___rates__1.pdf");
    });
  });

  describe("Magic-Byte File Signature Verification (Document 07 Section 6.1)", () => {
    it("should validate genuine PNG binary header (89 50 4E 47 0D 0A 1A 0A)", () => {
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
      const result = R2StorageService.verifyMagicBytes(pngBuffer, "image/png");

      expect(result.valid).toBe(true);
      expect(result.detectedMimeType).toBe("image/png");
      expect(result.isHostilePayload).toBe(false);
    });

    it("should validate genuine JPEG binary header (FF D8 FF)", () => {
      const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
      const result = R2StorageService.verifyMagicBytes(jpegBuffer, "image/jpeg");

      expect(result.valid).toBe(true);
      expect(result.detectedMimeType).toBe("image/jpeg");
    });

    it("should validate genuine WEBP binary header (RIFF....WEBP)", () => {
      const webpBuffer = Buffer.from([
        0x52, 0x49, 0x46, 0x46, // RIFF
        0x00, 0x00, 0x00, 0x00,
        0x57, 0x45, 0x42, 0x50, // WEBP
      ]);
      const result = R2StorageService.verifyMagicBytes(webpBuffer, "image/webp");

      expect(result.valid).toBe(true);
      expect(result.detectedMimeType).toBe("image/webp");
    });

    it("should validate genuine PDF binary header (%PDF-)", () => {
      const pdfBuffer = Buffer.from("%PDF-1.7\n%some-pdf-content");
      const result = R2StorageService.verifyMagicBytes(pdfBuffer, "application/pdf");

      expect(result.valid).toBe(true);
      expect(result.detectedMimeType).toBe("application/pdf");
    });

    it("should validate genuine DOCX binary header (PK 03 04)", () => {
      const docxBuffer = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00]);
      const result = R2StorageService.verifyMagicBytes(
        docxBuffer,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      );

      expect(result.valid).toBe(true);
      expect(result.detectedMimeType).toBe(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      );
    });

    it("should REJECT hostile Windows executable disguised as PNG (MZ header 4D 5A)", () => {
      const exeBuffer = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]);
      const result = R2StorageService.verifyMagicBytes(exeBuffer, "image/png");

      expect(result.valid).toBe(false);
      expect(result.isHostilePayload).toBe(true);
      expect(result.reason).toContain("Disguised Windows executable");
    });

    it("should REJECT hostile SVG payload disguised as PNG (<svg script injection)", () => {
      const svgBuffer = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
      const result = R2StorageService.verifyMagicBytes(svgBuffer, "image/png");

      expect(result.valid).toBe(false);
      expect(result.isHostilePayload).toBe(true);
      expect(result.reason).toContain("Disguised SVG or HTML/Script content");
    });

    it("should REJECT disguised HTML payload (<!DOCTYPE html>)", () => {
      const htmlBuffer = Buffer.from("<!DOCTYPE html><html><body>Phishing page</body></html>");
      const result = R2StorageService.verifyMagicBytes(htmlBuffer, "application/pdf");

      expect(result.valid).toBe(false);
      expect(result.isHostilePayload).toBe(true);
    });
  });

  describe("SHA-256 Digest Verification", () => {
    it("should verify matching SHA-256 hash", () => {
      const testContent = Buffer.from("CBN Regulatory Compliance Flyer Content 2026");
      const expectedHash = crypto.createHash("sha256").update(testContent).digest("hex");

      expect(R2StorageService.verifySha256(testContent, expectedHash)).toBe(true);
    });

    it("should reject tampered content when hash does not match", () => {
      const original = Buffer.from("0% Interest Loan Promise");
      const tampered = Buffer.from("0% Interest Loan Promise (Tampered)");
      const originalHash = crypto.createHash("sha256").update(original).digest("hex");

      expect(R2StorageService.verifySha256(tampered, originalHash)).toBe(false);
    });
  });
});
