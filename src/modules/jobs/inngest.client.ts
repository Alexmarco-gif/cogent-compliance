/**
 * Cogent Marketing Shield - Inngest Durable Execution Client
 * Document Reference: Document 02 (Section 6) & Document 08 (Phase 5)
 */

import { Inngest } from "inngest";

/**
 * Strongly typed Inngest event payloads for Cogent Marketing Shield.
 */
export type InngestEvents = {
  "marketing-shield/assessment.execute": {
    data: {
      assessmentId: string;
      campaignId: string;
      tenantId: string;
      triggeredByUserId: string;
    };
  };
  "marketing-shield/regulatory.embed": {
    data: {
      clauseId: string;
      clauseText: string;
      instrumentName: string;
    };
  };
  "marketing-shield/dossier.generate": {
    data: {
      campaignId: string;
      revisionId: string;
      tenantId: string;
      requestedByUserId: string;
    };
  };
  "marketing-shield/drift.check": {
    data: {
      campaignId: string;
      tenantId: string;
      liveUrl: string;
    };
  };
};

/**
 * Singleton Inngest client.
 */
export const inngest = new Inngest({
  id: "cogent-marketing-shield",
  eventKey: process.env.INNGEST_EVENT_KEY,
  signingKey: process.env.INNGEST_SIGNING_KEY,
});
