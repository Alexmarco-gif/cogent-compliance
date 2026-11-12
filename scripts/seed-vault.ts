/**
 * Cogent Marketing Shield - Statutory Vault Seeder Runner
 */

import { regulatoryVaultSeedService } from "../src/modules/regulatory-vault/seed.service";

process.on("unhandledRejection", (err) => {
  console.warn("Background transport notice:", (err as Error)?.message || err);
});

async function main() {
  console.log("🚀 Starting Golden 50 Nigerian Statutory Vault Seeding...");
  const summary = await regulatoryVaultSeedService.seedGolden50Corpus({
    generateEmbeddings: true,
  });
  console.log("✅ Seeding Summary:", JSON.stringify(summary, null, 2));

  console.log("🔍 Running Corpus Integrity & Hybrid RRF Search Verification...");
  const verification = await regulatoryVaultSeedService.verifyCorpusIntegrity();
  console.log("📊 Verification Results:", JSON.stringify(verification, null, 2));

  if (!verification.passed) {
    console.error("❌ Integrity verification failed!");
    process.exit(1);
  } else {
    console.log("🎉 Golden 50 Statutory Vault verified successfully with sub-200ms Hybrid RRF retrieval!");
  }
}

main().catch((err) => {
  console.error("💥 Unhandled Error:", err);
  process.exit(1);
});
