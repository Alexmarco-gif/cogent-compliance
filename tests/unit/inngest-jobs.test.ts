/**
 * Cogent Marketing Shield - Inngest Durable Workflow Unit Tests
 * Document Reference: Document 02 (Section 6) & Document 08 (Phase 5)
 */

import { describe, it, expect } from "vitest";
import { inngest } from "@/modules/jobs/inngest.client";
import {
  inngestFunctions,
  assessmentExecutionJob,
  regulatoryEmbeddingJob,
  driftMonitoringJob,
  scheduledDriftWatcherJob,
  dossierGenerationJob,
  assetExtractionJob,
  playbookIngestionJob,
} from "@/modules/jobs/inngest.functions";

describe("Inngest Durable Workflow Engine (Phase 5, 10 & 11)", () => {
  it("should initialize Inngest client with correct application ID and schemas", () => {
    expect(inngest.id).toBe("cogent-marketing-shield");
  });

  it("should register all 7 production workflow functions", () => {
    expect(inngestFunctions).toHaveLength(7);
    expect(inngestFunctions).toContain(assessmentExecutionJob);
    expect(inngestFunctions).toContain(regulatoryEmbeddingJob);
    expect(inngestFunctions).toContain(driftMonitoringJob);
    expect(inngestFunctions).toContain(scheduledDriftWatcherJob);
    expect(inngestFunctions).toContain(dossierGenerationJob);
    expect(inngestFunctions).toContain(assetExtractionJob);
    expect(inngestFunctions).toContain(playbookIngestionJob);
  });

  it("should configure tenant-scoped concurrency on assessmentExecutionJob", () => {
    const fnConfig = assessmentExecutionJob as unknown as {
      opts: {
        id: string;
        concurrency: { limit: number; key: string };
        retries: number;
      };
    };

    expect(fnConfig.opts.id).toBe("execute-campaign-assessment");
    expect(fnConfig.opts.concurrency.limit).toBe(5);
    expect(fnConfig.opts.concurrency.key).toBe("event.data.tenantId");
    expect(fnConfig.opts.retries).toBe(3);
  });

  it("should configure retry limits on auxiliary background jobs", () => {
    const embedConfig = regulatoryEmbeddingJob as unknown as { opts: { id: string; retries: number } };
    const driftConfig = driftMonitoringJob as unknown as { opts: { id: string; retries: number } };
    const dossierConfig = dossierGenerationJob as unknown as { opts: { id: string; retries: number } };

    expect(embedConfig.opts.id).toBe("embed-regulatory-clause");
    expect(embedConfig.opts.retries).toBeGreaterThanOrEqual(2);

    expect(driftConfig.opts.id).toBe("check-campaign-drift");
    expect(driftConfig.opts.retries).toBe(2);

    expect(dossierConfig.opts.id).toBe("generate-statutory-dossier");
    expect(dossierConfig.opts.retries).toBe(2);
  });
});
