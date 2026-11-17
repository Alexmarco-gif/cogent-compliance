import fs from "fs";
import { defineConfig, devices } from "@playwright/test";

const systemChromium = fs.existsSync("/usr/bin/chromium")
  ? "/usr/bin/chromium"
  : fs.existsSync("/usr/bin/google-chrome")
    ? "/usr/bin/google-chrome"
    : undefined;

const chromiumExecutable =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || systemChromium;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        ignoreHTTPSErrors: true,
        launchOptions: {
          ...(chromiumExecutable ? { executablePath: chromiumExecutable } : {}),
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--proxy-bypass-list=localhost;127.0.0.1",
          ],
        },
      },
    },
  ],
  webServer: process.env.CI
    ? {
        command: "pnpm start",
        url: "http://localhost:3000",
        reuseExistingServer: false,
        timeout: 120 * 1000,
      }
    : undefined,
});
