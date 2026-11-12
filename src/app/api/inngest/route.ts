/**
 * Cogent Marketing Shield - Inngest HTTP Serving Endpoint
 * Document Reference: Document 02 (Section 6) & Document 08 (Phase 5)
 */

import { serve } from "inngest/next";
import { inngest } from "@/modules/jobs/inngest.client";
import { inngestFunctions } from "@/modules/jobs/inngest.functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: inngestFunctions,
});
