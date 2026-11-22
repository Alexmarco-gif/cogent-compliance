import { describe, it, expect } from "vitest";
import { matchesResourcesAdmin } from "@/modules/resources/resources-admin.guard";
import {
  getResourcesR2Config,
  isResourcesR2Configured,
  isValidResourcesStorageKey,
} from "@/modules/resources/resources-media.service";
import { isNeonResourcesConfigured } from "@/lib/neon";

describe("Resources Admin Guard & Isolated Storage Config", () => {
  const ownerEnv = {
    PLATFORM_OWNER_EMAIL: "owner@stem-cogent.com",
    PLATFORM_OWNER_CLERK_USER_ID: "user_owner_123",
  };

  it("allows verified platform owner even in local development", () => {
    expect(
      matchesResourcesAdmin(
        {
          id: "user_owner_123",
          emailAddresses: [
            {
              emailAddress: "Owner@Stem-Cogent.com",
              verification: { status: "verified" },
            },
          ],
        },
        ownerEnv,
      ),
    ).toBe(true);
  });

  it("fails closed when email is unverified, wrong user ID, or unconfigured", () => {
    expect(
      matchesResourcesAdmin(
        {
          id: "user_owner_123",
          emailAddresses: [
            { emailAddress: "owner@stem-cogent.com", verification: { status: "unverified" } },
          ],
        },
        ownerEnv,
      ),
    ).toBe(false);

    expect(
      matchesResourcesAdmin(
        {
          id: "user_other_999",
          emailAddresses: [
            { emailAddress: "owner@stem-cogent.com", verification: { status: "verified" } },
          ],
        },
        ownerEnv,
      ),
    ).toBe(false);

    expect(
      matchesResourcesAdmin(
        {
          id: "user_owner_123",
          emailAddresses: [
            { emailAddress: "owner@stem-cogent.com", verification: { status: "verified" } },
          ],
        },
        {},
      ),
    ).toBe(false);
  });

  it("keeps Resources R2 strictly isolated from core SaaS R2_* variables", () => {
    const coreOnlyEnv = {
      R2_ACCOUNT_ID: "core_acct",
      R2_ACCESS_KEY_ID: "core_key",
      R2_SECRET_ACCESS_KEY: "core_secret",
      R2_BUCKET_NAME: "core_bucket",
    };

    expect(isResourcesR2Configured(coreOnlyEnv)).toBe(false);

    const resourcesR2Env = {
      ...coreOnlyEnv,
      RESOURCES_R2_ACCOUNT_ID: "res_acct",
      RESOURCES_R2_ACCESS_KEY_ID: "res_key",
      RESOURCES_R2_SECRET_ACCESS_KEY: "res_secret",
      RESOURCES_R2_BUCKET_NAME: "cogent-resources",
      RESOURCES_R2_PUBLIC_URL_PREFIX: "https://media.stem-cogent.com/",
    };

    expect(isResourcesR2Configured(resourcesR2Env)).toBe(true);
    expect(getResourcesR2Config(resourcesR2Env)).toMatchObject({
      configured: true,
      accountId: "res_acct",
      bucketName: "cogent-resources",
      publicUrlPrefix: "https://media.stem-cogent.com",
    });
  });

  it("enforces strict resources/ prefix on media proxy storage keys", () => {
    expect(isValidResourcesStorageKey("resources/2026/11/abc123-cover.png")).toBe(true);
    expect(isValidResourcesStorageKey("tenants/tenant-1/assets/secret.pdf")).toBe(false);
    expect(isValidResourcesStorageKey("resources/../../etc/passwd")).toBe(false);
  });

  it("detects Neon database configuration independently of Supabase", () => {
    expect(isNeonResourcesConfigured({})).toBe(false);
    expect(
      isNeonResourcesConfigured({
        NEON_RESOURCES_DATABASE_URL: "postgresql://user:pass@ep-cool.neon.tech/neondb?sslmode=require",
      }),
    ).toBe(true);
  });
});
