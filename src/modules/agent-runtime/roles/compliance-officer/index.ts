/**
 * Cogent Regulatory Intelligence Platform
 * Flagship Professional Role #1: Regulatory & Compliance Officer Role Profile
 */

import type { AgentRoleProfile } from "@/contracts/agent-runtime.contracts";
import {
  COMPLIANCE_OFFICER_IDENTITY,
  COMPLIANCE_OFFICER_KNOWLEDGE_SCOPE,
  COMPLIANCE_OFFICER_ROLE_ID,
  buildComplianceOfficerBaseSystemPrompt,
} from "./identity";
import { PRODUCT_STRUCTURING_PACK } from "./packs/product-structuring.pack";
import { POLICY_GAP_REDLINE_PACK } from "./packs/policy-gap-redline.pack";
import { POLICY_DRAFT_NEW_PACK } from "./packs/policy-draft-new.pack";
import { SUPERVISORY_DDQ_PACK } from "./packs/supervisory-ddq.pack";
import { CROSS_BORDER_COMPARISON_PACK } from "./packs/cross-border-comparison.pack";
import { CAMPAIGN_CLEARANCE_PACK } from "./packs/campaign-clearance.pack";
import { REGULATORY_LOOKUP_PACK } from "./packs/regulatory-lookup.pack";
import { CONVERSATIONAL_ADVISORY_PACK } from "./packs/conversational-advisory.pack";

export const REGULATORY_COMPLIANCE_OFFICER_ROLE: AgentRoleProfile = {
  identity: COMPLIANCE_OFFICER_IDENTITY,
  knowledgeScope: COMPLIANCE_OFFICER_KNOWLEDGE_SCOPE,
  workflowPacks: {
    PRODUCT_STRUCTURING_MEMO: PRODUCT_STRUCTURING_PACK,
    POLICY_GAP_REDLINE: POLICY_GAP_REDLINE_PACK,
    POLICY_DRAFT_NEW: POLICY_DRAFT_NEW_PACK,
    SUPERVISORY_DDQ_RESPONSE: SUPERVISORY_DDQ_PACK,
    CROSS_BORDER_COMPARISON: CROSS_BORDER_COMPARISON_PACK,
    FULL_COMPLIANCE_AUDIT: CAMPAIGN_CLEARANCE_PACK,
    REGULATORY_LOOKUP: REGULATORY_LOOKUP_PACK,
    CONVERSATIONAL_ADVISORY: CONVERSATIONAL_ADVISORY_PACK,
  },
  defaultWorkflowId: "CONVERSATIONAL_ADVISORY",
  rbacApprovalRoles: ["LEGAL_COUNSEL", "CHIEF_COMPLIANCE_OFFICER"],
  buildBaseSystemPrompt: buildComplianceOfficerBaseSystemPrompt,
};

export {
  COMPLIANCE_OFFICER_ROLE_ID,
  COMPLIANCE_OFFICER_IDENTITY,
  COMPLIANCE_OFFICER_KNOWLEDGE_SCOPE,
  PRODUCT_STRUCTURING_PACK,
  POLICY_GAP_REDLINE_PACK,
  POLICY_DRAFT_NEW_PACK,
  SUPERVISORY_DDQ_PACK,
  CROSS_BORDER_COMPARISON_PACK,
  CAMPAIGN_CLEARANCE_PACK,
  REGULATORY_LOOKUP_PACK,
  CONVERSATIONAL_ADVISORY_PACK,
};
