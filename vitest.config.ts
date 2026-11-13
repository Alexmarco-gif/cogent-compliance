import { defineConfig } from "vitest/config";
import path from "path";
import fs from "fs";

if (typeof process.loadEnvFile === "function") {
  const envLocal = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envLocal)) {
    process.loadEnvFile(envLocal);
  }
}

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: [
      "tests/unit/**/*.test.ts",
      "tests/unit/**/*.spec.ts",
      "tests/db/**/*.test.ts",
      "tests/security/**/*.test.ts",
      "tests/benchmarks/**/*.{test,bench}.ts",
      "tests/resilience/**/*.test.ts",
      "tests/integration/**/*.test.ts",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
