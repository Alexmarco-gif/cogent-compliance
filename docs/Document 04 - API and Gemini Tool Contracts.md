# COGENT MARKETING SHIELD
## API and Gemini Tool Contracts Specification

**Product Name:** Cogent Marketing Shield  
**Product Type:** Standalone Enterprise Regulatory & Marketing Compliance Operating System  
**Document Number:** 04  
**Document Title:** API and Gemini Tool Contracts Specification  
**Version:** 2.0 (Greenfield Source of Truth)  
**Status:** Approved Technical Baseline for API & AI Tool Implementation  
**AI Provider & SDK:** Google Gemini API (`@google/genai` SDK — Gemini 2.5 Pro, Gemini 2.5 Flash, `text-embedding-004`)  
**API Base Path:** `/api/marketing-shield/v1`  
**Schema Validation:** Zod (`src/contracts/api.contracts.ts`, `src/contracts/tools.contracts.ts`)  
**Primary Market:** Nigerian Regulated Financial Institutions

---

# 1. Document Purpose and Core Contract Principles

## 1.1 Objective
This document defines the exact REST API endpoints, Server-Sent Events (SSE) streaming contracts, and the **17-Tool Gemini Function Calling Registry** for **Cogent Marketing Shield**. It serves as the strict interface contract between:
- The Next.js App Router frontend (`src/components/*`).
- The API Gateway & Middleware layer (`src/app/api/marketing-shield/v1/*`).
- The AI Orchestration & Tool Execution Engine (`src/modules/ai-orchestration/*`).
- The Three-Source Intelligence Services (Golden 50 Statutory Vault, Institutional Playbooks & Product Truth, and Two-Step Live Web Search Router).
- The Autonomous Campaign Assessment, Guardrail, Revision, Approval, Dossier, and Drift Monitoring domain services.

## 1.2 Core Contract Principles
1. **Server-Derived Tenant Authority:** No API request body or Gemini tool call may specify an authoritative `tenant_id`. The backend resolves `user_id`, `tenant_id`, and `role_permissions` exclusively from the verified Supabase Auth session and `tenant_memberships`.
2. **Unified Canonical Naming:** Every API payload, database reference, and tool contract uses identical field names (`campaign_id`, `revision_id`, `asset_id`, `claim_id`, `finding_id`, `assessment_id`, `regulatory_clause_id`, `knowledge_rule_id`, `live_web_retrieval_id`) and the exact 11-state campaign lifecycle defined in Documents 01–03.
3. **Two-Step Live Web Search Isolation:** Because the `@google/genai` SDK cannot combine native `googleSearch: {}` grounding and custom `functionDeclarations` in the same `generateContent` call, the primary orchestrator exposes `search_live_web` as a custom function declaration. When Gemini invokes `search_live_web`, the backend executes an isolated secondary `gemini-2.5-flash` call with `tools: [{ googleSearch: {} }]`, stores the result in `live_web_retrievals`, and returns structured citations to the primary orchestrator.
4. **Strict Separation of Read, Analytical, State-Changing, and Human-Only Operations:** Gemini tools can read authorized context, run compliance assessments, search the Three-Source Intelligence engine, and propose rewrites. Gemini tools can **never** approve or reject a campaign (`approval.decide` is a human-only REST action).
5. **Zod Validation Everywhere:** Every incoming HTTP body, query parameter, Gemini tool argument, and structured model output is validated via Zod before execution or persistence.

---

# 2. Global API Conventions

## 2.1 Base URL & Versioning
All endpoints are mounted under:
```text
/api/marketing-shield/v1
```

## 2.2 Required Request Headers
| Header | Requirement | Description |
|---|---|---|
| `Authorization` | Mandatory (or HTTP-only session cookie) | Supabase Auth JWT bearer token verified on the server. |
| `Content-Type` | Mandatory for `POST`/`PATCH` | `application/json` (File binary uploads go directly to Presigned Storage URLs). |
| `Idempotency-Key` | Mandatory for state-changing `POST` | UUID v4 string preventing duplicate message, campaign, revision, or approval creation on retry. |
| `X-Request-ID` | Optional (Generated if absent) | UUID v4 correlation identifier propagated across logs, `ai_model_runs`, and `marketing_audit_events`. |

## 2.3 Standard JSON Response Envelope

### Successful Response (`200 OK`, `201 Created`, `202 Accepted`)
```json
{
  "success": true,
  "data": {
    "campaign_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"
  },
  "meta": {
    "request_id": "c4f9b0a1-7e2d-4c8a-9b1f-3d5e7a9c2b4e",
    "timestamp": "2026-11-10T09:30:00.000Z"
  }
}
```

### Paginated Collection Response
```json
{
  "success": true,
  "data": {
    "items": [],
    "pagination": {
      "limit": 20,
      "next_cursor": "eyJpZCI6IjliMWRlYjRkIn0=",
      "has_more": false
    }
  },
  "meta": {
    "request_id": "c4f9b0a1-7e2d-4c8a-9b1f-3d5e7a9c2b4e",
    "timestamp": "2026-11-10T09:30:00.000Z"
  }
}
```

### Error Response (`4xx` / `5xx`)
```json
{
  "success": false,
  "error": {
    "code": "APPROVAL_NOT_PERMITTED",
    "message": "Your role (MARKETING_GROWTH) is not authorized to approve campaign revisions.",
    "details": [
      {
        "field": "role",
        "issue": "Requires LEGAL_COUNSEL or CHIEF_COMPLIANCE_OFFICER role."
      }
    ]
  },
  "meta": {
    "request_id": "c4f9b0a1-7e2d-4c8a-9b1f-3d5e7a9c2b4e",
    "timestamp": "2026-11-10T09:30:00.000Z"
  }
}
```

---

# 3. Conversation & SSE Streaming API Contracts

## 3.1 Create Conversation
- **Endpoint:** `POST /api/marketing-shield/v1/conversations`
- **Permission Required:** `conversation.create`
- **Request Body:**
```json
{
  "title": "CBN & FCCPC Digital Lending Disclosure Inquiry",
  "context_type": "GENERAL",
  "active_campaign_id": null
}
```
- **Response (`201 Created`):**
```json
{
  "success": true,
  "data": {
    "conversation_id": "11111111-2222-3333-4444-555555555555",
    "title": "CBN & FCCPC Digital Lending Disclosure Inquiry",
    "status": "ACTIVE",
    "context_type": "GENERAL",
    "active_campaign_id": null,
    "created_at": "2026-11-10T09:30:00.000Z"
  }
}
```

## 3.2 List Conversations
- **Endpoint:** `GET /api/marketing-shield/v1/conversations?status=ACTIVE&limit=20&cursor=...`
- **Permission Required:** `conversation.read`
- **Behaviour:** Returns tenant-scoped conversations ordered by `last_message_at DESC`.

## 3.3 Retrieve Conversation & Messages
- **Endpoint 1:** `GET /api/marketing-shield/v1/conversations/{conversation_id}`
- **Endpoint 2:** `GET /api/marketing-shield/v1/conversations/{conversation_id}/messages?limit=50&cursor=...`
- **Permission Required:** `conversation.read`
- **Behaviour:** Returns conversation metadata, linked `active_campaign_id`, and chronological messages (`sequence_number ASC`) including inline citation badges and tool execution summaries.

## 3.4Rename or Archive Conversation
- **Endpoint 1:** `PATCH /api/marketing-shield/v1/conversations/{conversation_id}` (`{ "title": "Updated Title" }`)
- **Endpoint 2:** `POST /api/marketing-shield/v1/conversations/{conversation_id}/archive`
- **Rule:** Archiving a conversation sets `status = 'ARCHIVED'` and never deletes linked campaigns, assets, or audit records.

## 3.5 Send Message & Stream Response (Server-Sent Events)
- **Endpoint:** `POST /api/marketing-shield/v1/conversations/{conversation_id}/messages/stream`
- **Permission Required:** `conversation.create`
- **Headers:** `Accept: text/event-stream`, `Idempotency-Key: <uuid>`
- **Request Body:**
```json
{
  "content": "Review this flyer for our QuickCash promo and check if ARCON or FCCPC issued any new rules this month.",
  "attachment_asset_ids": [
    "aaaa1111-bbbb-2222-cccc-333333333333"
  ],
  "campaign_urls": [],
  "active_campaign_id": null
}
```

### SSE Event Stream Protocol
The server emits newline-delimited SSE frames (`event: <type>\ndata: <json>\n\n`):

1. **`message.started`**
```json
{
  "type": "message.started",
  "data": {
    "user_message_id": "msg_user_001",
    "assistant_message_id": "msg_asst_002",
    "sequence_number": 4
  }
}
```

2. **`tool.started`**
```json
{
  "type": "tool.started",
  "data": {
    "tool_call_id": "tc_001",
    "tool_name": "search_regulatory_evidence",
    "display_label": "Searching Golden 50 Statutory Vault (CBN, FCCPC, ARCON)..."
  }
}
```

3. **`tool.completed`**
```json
{
  "type": "tool.completed",
  "data": {
    "tool_call_id": "tc_001",
    "tool_name": "search_regulatory_evidence",
    "status": "COMPLETED",
    "summary": "Retrieved 4 verified provisions from FCCPC 2026 Regulations and ARCON Code."
  }
}
```

4. **`campaign.created`** *(Emitted when promotional material triggers Autonomous Campaign Analyst mode)*
```json
{
  "type": "campaign.created",
  "data": {
    "campaign_id": "camp_999",
    "revision_id": "rev_001",
    "revision_number": 1,
    "campaign_name": "QuickCash Promo Flyer Review",
    "status": "ASSESSMENT_IN_PROGRESS"
  }
}
```

5. **`assessment.completed`**
```json
{
  "type": "assessment.completed",
  "data": {
    "assessment_id": "assess_777",
    "campaign_id": "camp_999",
    "revision_id": "rev_001",
    "overall_risk_level": "HIGH",
    "campaign_status": "REVISION_REQUIRED",
    "findings_count": {
      "critical": 0,
      "high": 2,
      "medium": 1,
      "low": 0,
      "informational": 1
    }
  }
}
```

6. **`assistant.delta`**
```json
{
  "type": "assistant.delta",
  "data": {
    "text_delta": "Based on the **FCCPC Sales Promotion Regulations** and your **QuickCash Product Terms**, there are two high-risk compliance issues..."
  }
}
```

7. **`message.completed`**
```json
{
  "type": "message.completed",
  "data": {
    "assistant_message_id": "msg_asst_002",
    "finish_reason": "STOP",
    "citations": [
      {
        "source_class": "VERIFIED_OFFICIAL_SOURCE",
        "badge_label": "Verified Statutory Vault",
        "regulator": "FCCPC",
        "instrument_title": "Sales Promotion (Amended) Regulations",
        "clause_reference": "Regulation 32",
        "regulatory_clause_id": "clause_888"
      },
      {
        "source_class": "INTERNAL_PLAYBOOK",
        "badge_label": "Internal Playbook Rule",
        "rule_title": "QuickCash Approved Fee Schedule",
        "knowledge_rule_id": "krule_444"
      },
      {
        "source_class": "LIVE_WEB_INTELLIGENCE",
        "badge_label": "Live Web Intelligence",
        "page_title": "FCCPC Enforcement Update on Digital Lenders",
        "retrieved_url": "https://fccpc.gov.ng/releases/...",
        "live_web_retrieval_id": "web_555"
      }
    ]
  }
}
```

8. **`message.failed`**
```json
{
  "type": "message.failed",
  "data": {
    "code": "AI_PROVIDER_UNAVAILABLE",
    "message": "The compliance reasoning service experienced a temporary timeout. Your message and attachments have been saved."
  }
}
```

---

# 4. Campaign, Asset & Assessment API Contracts

## 4.1 Create Campaign Explicitly
- **Endpoint:** `POST /api/marketing-shield/v1/campaigns`
- **Permission Required:** `campaign.create`
- **Request Body:**
```json
{
  "conversation_id": "11111111-2222-3333-4444-555555555555",
  "campaign_name": "November QuickCash Salary Advance Promo",
  "description": "Instagram flyer and SMS broadcast for salary advance loans",
  "channel": "SOCIAL_MEDIA",
  "product_id": "prod_12345",
  "initial_content_text": "Get instant salary advance with 0% fees! Apply in 30 seconds."
}
```
- **Behaviour:** Atomically creates `marketing_campaigns` (`status = 'DRAFT'`), `conversation_campaign_links`, and initial `campaign_revisions` (`revision_number = 1`).

## 4.2 List & Retrieve Campaigns
- **Endpoint 1:** `GET /api/marketing-shield/v1/campaigns?status=UNDER_REVIEW&channel=SOCIAL_MEDIA&limit=20`
- **Endpoint 2:** `GET /api/marketing-shield/v1/campaigns/{campaign_id}`
- **Permission Required:** `campaign.read`
- **Response (`GET /campaigns/{campaign_id}`):** Returns campaign metadata, `current_revision_id`, `approved_revision_id`, linked `product_id` details, asset list, latest assessment summary, and status history.

## 4.3 Presigned Asset Upload Session & Completion
- **Endpoint 1 (Initiate):** `POST /api/marketing-shield/v1/assets/upload-session`
  - **Permission Required:** `asset.upload`
  - **Request Body:**
  ```json
  {
    "conversation_id": "11111111-2222-3333-4444-555555555555",
    "campaign_id": "camp_999",
    "original_filename": "november_flyer.png",
    "mime_type": "image/png",
    "file_size_bytes": 2450000,
    "sha256_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  }
  ```
  - **Response (`201 Created`):** Returns `asset_id`, short-lived `presigned_upload_url`, and required headers.
- **Endpoint 2 (Complete & Queue Extraction):** `POST /api/marketing-shield/v1/assets/{asset_id}/complete`
  - **Behaviour:** Verifies object existence in private storage, checks magic bytes and SHA-256 hash, and enqueues `ASSET_SECURITY_AND_EXTRACTION` in `processing_jobs`.
- **Endpoint 3 (Inspect Extraction & Update OCR):**
  - `GET /api/marketing-shield/v1/assets/{asset_id}/extraction`
  - `PATCH /api/marketing-shield/v1/assets/{asset_id}/segments/{segment_id}` (Allows user to correct a low-confidence OCR segment and logs audit event).

## 4.4 Trigger & Retrieve Campaign Compliance Assessment
- **Endpoint 1 (Trigger Assessment):** `POST /api/marketing-shield/v1/campaigns/{campaign_id}/assessments`
  - **Permission Required:** `campaign.create`
  - **Request Body:**
  ```json
  {
    "revision_id": "rev_001",
    "include_live_web_check": false
  }
  ```
  - **Behaviour:** Runs (or queues via `CAMPAIGN_COMPLIANCE_ASSESSMENT`) claim extraction, the 3 Deterministic Locks, Multi-Source Retrieval, Gemini 2.5 Pro compliance reasoning, and the 7-Layer Guardrails.
- **Endpoint 2 (Retrieve Assessment & Deterministic Locks):** `GET /api/marketing-shield/v1/assessments/{assessment_id}`
- **Endpoint 3 (List Findings for Campaign Revision):** `GET /api/marketing-shield/v1/campaigns/{campaign_id}/findings?revision_id=rev_001&severity=HIGH`
- **Endpoint 4 (Retrieve Single Finding & Full Evidence Chain):** `GET /api/marketing-shield/v1/findings/{finding_id}`

---

# 5. Rewrite, Immutable Revision, Approval, Dossier & Drift API Contracts

## 5.1 Generate & Validate Compliant Rewrite Suggestion
- **Endpoint:** `POST /api/marketing-shield/v1/findings/{finding_id}/rewrite-suggestions`
- **Permission Required:** `revision.propose`
- **Request Body:**
```json
{
  "tone": "PROFESSIONAL",
  "custom_instructions": "Keep under 160 characters for SMS broadcast while including our mandatory CBN disclosure."
}
```
- **Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "suggestion_id": "sugg_101",
    "finding_id": "find_505",
    "original_text": "Get instant salary advance with 0% fees! Guaranteed approval in 30 seconds.",
    "proposed_text": "Get a QuickCash salary advance up to N500k. 1.5% processing fee & 4% monthly interest apply. Subject to credit approval. T&Cs apply. Licensed by CBN.",
    "explanation": "Replaced '0% fees' with the approved 1.5% processing fee and 4% interest rate from QuickCash product terms, removed 'Guaranteed approval', and appended mandatory CBN licensing disclosure.",
    "layer_6_validation": {
      "validation_status": "PASSED",
      "original_issue_addressed": true,
      "new_prohibited_terms_detected": false,
      "product_rate_fee_match": "PASSED",
      "mandatory_disclosures_present": true
    }
  }
}
```

## 5.2 Accept Rewrite / Create Immutable Campaign Revision
- **Endpoint:** `POST /api/marketing-shield/v1/campaigns/{campaign_id}/revisions`
- **Permission Required:** `revision.create`
- **Request Body:**
```json
{
  "parent_revision_id": "rev_001",
  "content_text": "Get a QuickCash salary advance up to N500k. 1.5% processing fee & 4% monthly interest apply. Subject to credit approval. T&Cs apply. Licensed by CBN.",
  "revision_source": "AI_REWRITE_ACCEPTED",
  "change_summary": "Applied validated rewrite resolving fee misrepresentation and adding CBN disclosure.",
  "auto_reassess": true
}
```
- **Behaviour:** Atomically creates `revision_number = N + 1`, updates `marketing_campaigns.current_revision_id`, invalidates any prior approval if the campaign was previously `APPROVED`, transitions status to `RESUBMITTED` $\rightarrow$ `PROCESSING`, and triggers reassessment.

## 5.3 Compare Campaign Revisions (Side-by-Side Diff)
- **Endpoint:** `GET /api/marketing-shield/v1/campaigns/{campaign_id}/revisions/compare?from_revision_id=rev_001&to_revision_id=rev_002`
- **Permission Required:** `campaign.read`
- **Response:** Returns structured word/line diffs, resolved findings, remaining open findings, and deterministic lock comparison between the two revisions.

## 5.4 Submit for Review & Record Formal Human Approval / Rejection
- **Endpoint 1 (Submit for Sign-Off):** `POST /api/marketing-shield/v1/campaigns/{campaign_id}/submit-review`
  - **Permission Required:** `campaign.submit_review`
  - **Request Body:** `{ "revision_id": "rev_002", "comment": "All high-risk findings resolved in Revision 2. Ready for CCO sign-off." }`
  - **Behaviour:** Verifies `rev_002` has a completed assessment, transitions campaign status to `UNDER_REVIEW`, and notifies `LEGAL_COUNSEL` / `CHIEF_COMPLIANCE_OFFICER`.
- **Endpoint 2 (Formal Approval or Rejection Decision):** `POST /api/marketing-shield/v1/campaigns/{campaign_id}/approvals`
  - **Permission Required:** `approval.decide` (**Strictly restricted to `LEGAL_COUNSEL` and `CHIEF_COMPLIANCE_OFFICER` roles**)
  - **Request Body:**
  ```json
  {
    "revision_id": "rev_002",
    "decision": "APPROVED",
    "decision_reason": "Verified against FCCPC 2026 Sales Promotion Regulations and QuickCash approved rate card.",
    "conditions": {
      "must_obtain_arcon_asp_certificate_before_print": true
    }
  }
  ```
  - **Behaviour:** Verifies RBAC permission, confirms `revision_id` is the campaign's current assessed revision, inserts an immutable record in `campaign_approvals`, sets `marketing_campaigns.approved_revision_id = rev_002` and `status = 'APPROVED'`, and appends a hash-chained audit record.

## 5.5 Statutory Compliance Dossier & Post-Publication Drift Monitors
- **Endpoint 1 (Generate PDF Dossier):** `POST /api/marketing-shield/v1/campaigns/{campaign_id}/dossiers` (`{ "revision_id": "rev_002" }`)
- **Endpoint 2 (Retrieve Dossier Download URL):** `GET /api/marketing-shield/v1/dossiers/{dossier_id}`
- **Endpoint 3 (Create/Enable URL Drift Monitor):** `POST /api/marketing-shield/v1/campaigns/{campaign_id}/drift-monitors`
  - **Request Body:** `{ "approved_revision_id": "rev_002", "published_url": "https://quickcash.example.ng/november-promo" }`
- **Endpoint 4 (Trigger Immediate Drift Check):** `POST /api/marketing-shield/v1/drift-monitors/{monitor_id}/check`

---

# 6. Three-Source Intelligence & Knowledge Base REST API Contracts

## 6.1 Statutory Vault Inspection Endpoints
- `GET /api/marketing-shield/v1/regulatory/instruments` — Lists the Golden 50 instruments filterable by regulator (`CBN`, `FCCPC`, `ARCON`, `NDPC`, `SEC`) and `lifecycle_status`.
- `GET /api/marketing-shield/v1/regulatory/clauses/{clause_id}` — Returns the exact verbatim clause text, page number, parent instrument, document version, `document_hash`, `effective_date`, official source URL, and linked `regulatory_obligations`.

## 6.2 Institutional Knowledge Base & Product Truth Endpoints
- `POST /api/marketing-shield/v1/knowledge-base/documents` — Registers an uploaded internal playbook PDF/DOCX (`MARKETING_POLICY`, `BRAND_GUIDELINE`, `PRODUCT_DISCLOSURE`, `SOP`) and queues `PLAYBOOK_DOCUMENT_INGESTION`.
- `GET /api/marketing-shield/v1/knowledge-base/rules?status=DRAFT` — Lists extracted or manually created internal rules (`marketing_knowledge_rules`).
- `POST /api/marketing-shield/v1/knowledge-base/rules/{rule_id}/activate` — (`knowledge.publish` permission required) Activates an internal rule so the Autonomous Campaign Analyst enforces it.
- `POST /api/marketing-shield/v1/products` & `PATCH /api/marketing-shield/v1/products/{product_id}` — Creates or updates structured `campaign_products` truth (approved interest rates, APRs, processing fees, penalty fees, tenor limits, mandatory product disclaimers).

---

# 7. The 17-Tool Gemini Function Calling Registry

The AI Orchestration Service (`src/modules/ai-orchestration/`) exposes exactly **17 strongly typed tools** to Gemini via `functionDeclarations`.

## 7.1 Master Tool Inventory & Authorization Classification

| # | Tool Name (`snake_case`) | Risk Class | Required User Permission | Primary Purpose |
|---|---|---|---|---|
| 1 | `get_conversation_context` | Read-Only | `conversation.read` | Load earlier messages or summaries from the current conversation. |
| 2 | `get_campaign_context` | Read-Only | `campaign.read` | Load campaign metadata, current revision text, assets, claims, and lock statuses. |
| 3 | `search_regulatory_evidence` | Read-Only | `conversation.read` | Hybrid semantic + FTS RRF search over the Golden 50 Statutory Vault. |
| 4 | `get_regulatory_provision` | Read-Only | `conversation.read` | Fetch verbatim text, version, hash, and obligations for a specific `regulatory_clause_id`. |
| 5 | `verify_regulatory_evidence` | Read-Only | `conversation.read` | Verify lifecycle status (`CURRENT` vs `SUPERSEDED`) and effective dates of cited clauses. |
| 6 | `assess_regulatory_applicability` | Analytical | `conversation.read` | Evaluate whether statutory obligations apply to a specific institution type, product, and channel. |
| 7 | `search_institutional_knowledge` | Read-Only | `conversation.read` | Hybrid search over the tenant's internal playbooks (`marketing_knowledge_chunks`) and active rules. |
| 8 | `get_product_approved_terms` | Read-Only | `conversation.read` | Retrieve exact approved interest rates, fees, tenors, and disclaimers from `campaign_products`. |
| 9 | `search_live_web` | Analytical | `intelligence.live_web.search` | Execute the Two-Step Live Web Search Router (`googleSearch`) for real-time regulatory updates. |
| 10 | `fetch_live_url_content` | Analytical | `asset.upload` | Safely fetch, sanitize, and snapshot a live promotional URL for compliance review. |
| 11 | `get_campaign_asset_content` | Read-Only | `campaign.read` | Retrieve extracted text and OCR segments (with page/bounding-box provenance) for an asset. |
| 12 | `extract_campaign_claims` | Analytical | `campaign.create` | Extract and categorize promotional claims from campaign text and assets. |
| 13 | `run_deterministic_compliance_locks` | Analytical | `campaign.create` | Run Lock 1 (Prohibited Terms), Lock 2 (Product Rate/Fee Match), and Lock 3 (Mandatory Disclosures). |
| 14 | `assess_campaign_compliance` | Analytical | `campaign.create` | Run the full Autonomous Campaign Assessment + 7-Layer Guardrails on a `revision_id`. |
| 15 | `get_compliance_findings` | Read-Only | `assessment.read` | Retrieve persisted findings and evidence chains for a campaign revision. |
| 16 | `generate_rewrite_suggestions` | Analytical | `revision.propose` | Generate a compliant rewrite proposal and run Layer 6 Rewrite Validation automatically. |
| 17 | `compare_campaign_revisions` | Read-Only | `campaign.read` | Compute structured diffs and finding resolution status between two `revision_id` records. |

> **Strict Security Boundary:** Creating a new saved revision (`POST /revisions`), submitting for review (`POST /submit-review`), approving/rejecting a campaign (`POST /approvals`), and activating institutional rules (`POST /rules/{id}/activate`) are **never** executed autonomously by Gemini. They require explicit user clicks in the UI backed by authenticated REST calls.

---

## 7.2 Detailed Gemini Tool Schemas (`functionDeclarations`)

### Tool 1: `get_conversation_context`
- **Description:** Retrieves earlier messages and context summaries for the active conversation.
- **Arguments Schema:**
```json
{
  "type": "OBJECT",
  "properties": {
    "conversation_id": { "type": "STRING", "description": "UUID of the current conversation." },
    "message_limit": { "type": "INTEGER", "description": "Number of recent messages to retrieve (max 30)." }
  },
  "required": ["conversation_id"]
}
```

### Tool 2: `get_campaign_context`
- **Description:** Retrieves metadata, current revision text, linked product terms, assets, and deterministic lock statuses for a campaign.
- **Arguments Schema:**
```json
{
  "type": "OBJECT",
  "properties": {
    "campaign_id": { "type": "STRING", "description": "UUID of the campaign." },
    "revision_id": { "type": "STRING", "description": "Optional specific revision UUID. Defaults to current_revision_id." }
  },
  "required": ["campaign_id"]
}
```

### Tool 3: `search_regulatory_evidence`
- **Description:** Searches the verified Golden 50 Nigerian Statutory Vault (CBN, FCCPC, ARCON, NDPC, SEC) using hybrid semantic and full-text RRF search.
- **Arguments Schema:**
```json
{
  "type": "OBJECT",
  "properties": {
    "query": { "type": "STRING", "description": "Regulatory search query." },
    "regulators": {
      "type": "ARRAY",
      "items": { "type": "STRING", "enum": ["CBN", "FCCPC", "ARCON", "NDPC", "SEC"] },
      "description": "Optional filter by Nigerian regulatory body."
    },
    "as_of_date": { "type": "STRING", "description": "ISO date (YYYY-MM-DD) for temporal validity filtering." },
    "include_superseded": { "type": "BOOLEAN", "description": "Defaults to false. Set true only for historical audits." },
    "limit": { "type": "INTEGER", "description": "Max clauses to return (1 to 15)." }
  },
  "required": ["query"]
}
```

### Tool 4: `get_regulatory_provision`
- **Description:** Retrieves the exact verbatim statutory text, instrument title, document hash, effective date, and extracted obligations for a specific `regulatory_clause_id`.
- **Arguments Schema:**
```json
{
  "type": "OBJECT",
  "properties": {
    "regulatory_clause_id": { "type": "STRING", "description": "UUID of the regulatory clause." }
  },
  "required": ["regulatory_clause_id"]
}
```

### Tool 5: `verify_regulatory_evidence`
- **Description:** Verifies whether one or more `regulatory_clause_id` records are `CURRENT`, `SUPERSEDED`, `FUTURE_EFFECTIVE`, or `REPEALED` as of a given date.
- **Arguments Schema:**
```json
{
  "type": "OBJECT",
  "properties": {
    "regulatory_clause_ids": {
      "type": "ARRAY",
      "items": { "type": "STRING" },
      "description": "List of regulatory_clause_id UUIDs to verify."
    },
    "as_of_date": { "type": "STRING", "description": "ISO date (YYYY-MM-DD)." }
  },
  "required": ["regulatory_clause_ids"]
}
```

### Tool 6: `assess_regulatory_applicability`
- **Description:** Evaluates `applicability_rules` for retrieved clauses against the institution type, product category, and communication channel.
- **Arguments Schema:**
```json
{
  "type": "OBJECT",
  "properties": {
    "regulatory_clause_ids": { "type": "ARRAY", "items": { "type": "STRING" } },
    "institution_type": { "type": "STRING", "description": "e.g. DIGITAL_LENDER, MFB, PSB, MMO, COMMERCIAL_BANK, WEALTHTECH" },
    "product_type": { "type": "STRING", "description": "e.g. DIGITAL_LENDING, SAVINGS, INVESTMENT, PAYMENTS" },
    "channel": { "type": "STRING", "enum": ["SOCIAL_MEDIA", "SMS", "WEB_LANDING", "PRINT_FLYER", "EMAIL", "RADIO_TV", "INFLUENCER", "OTHER"] }
  },
  "required": ["regulatory_clause_ids"]
}
```

### Tool 7: `search_institutional_knowledge`
- **Description:** Searches the institution's private Knowledge Base & Playbooks (`marketing_knowledge_chunks` and active `marketing_knowledge_rules`) for internal marketing policies, brand guidelines, and SOPs.
- **Arguments Schema:**
```json
{
  "type": "OBJECT",
  "properties": {
    "query": { "type": "STRING", "description": "Search query for internal company playbooks and rules." },
    "document_types": {
      "type": "ARRAY",
      "items": { "type": "STRING", "enum": ["MARKETING_POLICY", "BRAND_GUIDELINE", "PRODUCT_DISCLOSURE", "SOP", "OTHER"] }
    },
    "limit": { "type": "INTEGER", "description": "Max results to return (1 to 10)." }
  },
  "required": ["query"]
}
```

### Tool 8: `get_product_approved_terms`
- **Description:** Retrieves the institution's structured product rate, fee, APR, tenor, and mandatory disclaimer schedule from `campaign_products`.
- **Arguments Schema:**
```json
{
  "type": "OBJECT",
  "properties": {
    "product_id": { "type": "STRING", "description": "Optional UUID of the product." },
    "product_name_query": { "type": "STRING", "description": "Optional product name search string (e.g. 'QuickCash')." }
  }
}
```

### Tool 9: `search_live_web`
- **Description:** Invokes the Two-Step Live Web Search Router (`googleSearch` grounding) to find real-time regulatory announcements, recent CBN/FCCPC/ARCON/NDPC/SEC circulars, or breaking enforcement news.
- **Arguments Schema:**
```json
{
  "type": "OBJECT",
  "properties": {
    "query": { "type": "STRING", "description": "Focused search query for live regulatory or market information." },
    "prioritize_official_regulators": { "type": "BOOLEAN", "description": "Defaults to true; prioritizes .gov.ng domains." }
  },
  "required": ["query"]
}
```
- **Tool Return Structure:**
```json
{
  "success": true,
  "tool": "search_live_web",
  "data": {
    "source_class": "LIVE_WEB_INTELLIGENCE",
    "results": [
      {
        "live_web_retrieval_id": "web_555",
        "page_title": "FCCPC Releases Amended Sales Promotion Regulations",
        "retrieved_url": "https://fccpc.gov.ng/...",
        "snippet_content": "Promoters must retain records of all promotional content for a minimum of two years...",
        "retrieved_at": "2026-11-10T09:31:00.000Z"
      }
    ]
  }
}
```

### Tool 10: `fetch_live_url_content`
- **Description:** Safely fetches, sanitizes, and snapshots the visible text and disclosures of a live `HTTPS` campaign landing page URL.
- **Arguments Schema:**
```json
{
  "type": "OBJECT",
  "properties": {
    "url": { "type": "STRING", "description": "Full HTTPS URL of the promotional page." },
    "campaign_id": { "type": "STRING", "description": "Optional campaign UUID to attach the URL snapshot asset to." }
  },
  "required": ["url"]
}
```

### Tool 11: `get_campaign_asset_content`
- **Description:** Retrieves the extracted text, page numbers, and OCR segments (`asset_extraction_segments`) for an uploaded flyer, PDF, or DOCX asset.
- **Arguments Schema:**
```json
{
  "type": "OBJECT",
  "properties": {
    "asset_id": { "type": "STRING", "description": "UUID of the campaign asset." }
  },
  "required": ["asset_id"]
}
```

### Tool 12: `extract_campaign_claims`
- **Description:** Extracts and categorizes discrete promotional claims from a campaign revision's text and attached assets, preserving exact provenance.
- **Arguments Schema:**
```json
{
  "type": "OBJECT",
  "properties": {
    "campaign_id": { "type": "STRING", "description": "UUID of the campaign." },
    "revision_id": { "type": "STRING", "description": "UUID of the campaign revision." }
  },
  "required": ["campaign_id", "revision_id"]
}
```

### Tool 13: `run_deterministic_compliance_locks`
- **Description:** Executes Deterministic Lock 1 (Prohibited Terms), Lock 2 (Product Rate/Fee Schedule Match against `campaign_products`), and Lock 3 (Mandatory Disclosures Check) on a campaign revision.
- **Arguments Schema:**
```json
{
  "type": "OBJECT",
  "properties": {
    "campaign_id": { "type": "STRING", "description": "UUID of the campaign." },
    "revision_id": { "type": "STRING", "description": "UUID of the campaign revision." }
  },
  "required": ["campaign_id", "revision_id"]
}
```

### Tool 14: `assess_campaign_compliance`
- **Description:** Runs the complete Autonomous Campaign Assessment pipeline (Claim Extraction + 3 Deterministic Locks + Three-Source Retrieval + Contextual Reasoning + 7-Layer Guardrails) and persists `compliance_findings`.
- **Arguments Schema:**
```json
{
  "type": "OBJECT",
  "properties": {
    "campaign_id": { "type": "STRING", "description": "UUID of the campaign." },
    "revision_id": { "type": "STRING", "description": "UUID of the campaign revision to assess." },
    "include_live_web_check": { "type": "BOOLEAN", "description": "Set true if real-time regulatory updates should also be checked." }
  },
  "required": ["campaign_id", "revision_id"]
}
```

### Tool 15: `get_compliance_findings`
- **Description:** Retrieves all persisted `compliance_findings` and linked `finding_evidence` records for a campaign revision.
- **Arguments Schema:**
```json
{
  "type": "OBJECT",
  "properties": {
    "campaign_id": { "type": "STRING", "description": "UUID of the campaign." },
    "revision_id": { "type": "STRING", "description": "UUID of the campaign revision." }
  },
  "required": ["campaign_id", "revision_id"]
}
```

### Tool 16: `generate_rewrite_suggestions`
- **Description:** Generates a compliant rewrite proposal for a specific finding or campaign revision, constrained by `campaign_products` approved terms, and automatically runs Layer 6 Rewrite Validation.
- **Arguments Schema:**
```json
{
  "type": "OBJECT",
  "properties": {
    "finding_id": { "type": "STRING", "description": "UUID of the compliance finding to remediate." },
    "tone": { "type": "STRING", "enum": ["PROFESSIONAL", "CONCISE_SMS", "CONVERSATIONAL_SOCIAL", "FORMAL_LEGAL"] },
    "instructions": { "type": "STRING", "description": "Additional user instructions for the rewrite." }
  },
  "required": ["finding_id"]
}
```

### Tool 17: `compare_campaign_revisions`
- **Description:** Compares two revisions of a campaign (`from_revision_id` and `to_revision_id`), returning text diffs and finding resolution status.
- **Arguments Schema:**
```json
{
  "type": "OBJECT",
  "properties": {
    "campaign_id": { "type": "STRING", "description": "UUID of the campaign." },
    "from_revision_id": { "type": "STRING", "description": "UUID of the base/earlier revision." },
    "to_revision_id": { "type": "STRING", "description": "UUID of the newer revision." }
  },
  "required": ["campaign_id", "from_revision_id", "to_revision_id"]
}
```

---

# 8. Standardized Error Code Catalogue

All REST endpoints, SSE failure frames, and tool error responses use this locked error code enum:

| Error Code | HTTP Status | Meaning |
|---|---|---|
| `UNAUTHENTICATED` | `401` | Missing, expired, or invalid Supabase Auth session token. |
| `TENANT_CONTEXT_INVALID` | `403` | User does not have an active membership in `tenant_memberships`. |
| `FORBIDDEN` | `403` | User role lacks the required permission key for this operation. |
| `APPROVAL_NOT_PERMITTED` | `403` | User attempted to approve/reject a campaign without `approval.decide` permission. |
| `RESOURCE_NOT_FOUND` | `404` | Requested conversation, campaign, revision, asset, or clause does not exist in tenant scope. |
| `VALIDATION_ERROR` | `400` | Request payload or query parameters failed Zod schema validation. |
| `IDEMPOTENCY_CONFLICT` | `409` | Duplicate `Idempotency-Key` submitted with a different request payload. |
| `CAMPAIGN_REVISION_STALE` | `409` | Attempted to create a revision or approval against an outdated `parent_revision_id`. |
| `ASSET_TYPE_UNSUPPORTED` | `415` | File MIME type or magic bytes do not match `PNG`, `JPEG`, `WEBP`, `PDF`, or `DOCX`. |
| `ASSET_SIZE_EXCEEDED` | `413` | File exceeds 15 MB (images) or 25 MB (documents). |
| `URL_FETCH_BLOCKED` | `422` | Submitted URL failed SSRF validation, scheme check (`HTTPS` required), or timed out. |
| `GUARDRAIL_CITATION_REJECTED` | `422` | Model output referenced an unverified or non-existent statutory clause. |
| `REWRITE_VALIDATION_FAILED` | `422` | Proposed rewrite failed Layer 6 validation (invented rate/fee or removed mandatory disclosure). |
| `AI_PROVIDER_UNAVAILABLE` | `503` | Gemini API timed out or returned a transient 5xx error after configured retries. |

---

# 9. Contract Acceptance Criteria

This specification is satisfied during implementation only when:
1. All REST endpoints and all 17 Gemini tools validate inputs and outputs through shared Zod schemas in `src/contracts/`.
2. The Two-Step Live Web Search Router (`search_live_web`) executes `googleSearch: {}` in an isolated secondary Gemini call so custom `functionDeclarations` never conflict.
3. Every citation returned in REST or SSE payloads includes its explicit `source_class` (`VERIFIED_OFFICIAL_SOURCE`, `INTERNAL_PLAYBOOK`, or `LIVE_WEB_INTELLIGENCE`).
4. No Gemini tool exists that can approve a campaign, alter user roles, or bypass `tenant_id` scoping.

**End of Document 04 — API and Gemini Tool Contracts Specification.**