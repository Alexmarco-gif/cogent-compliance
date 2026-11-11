# COGENT MARKETING SHIELD
## Greenfield Implementation Roadmap & Antigravity Execution Plan

**Product Name:** Cogent Marketing Shield  
**Product Type:** Standalone Enterprise Regulatory & Marketing Compliance Operating System  
**Document Number:** 08  
**Document Title:** Greenfield Implementation Roadmap and Antigravity Execution Plan  
**Version:** 2.0 (Greenfield Source of Truth)  
**Status:** Approved Production Build Blueprint & AI Engineering Execution Contract  
**Development Environment:** Gemini Antigravity IDE  
**Locked Production Tech Stack:**
- **Hosting & Edge Runtime:** Vercel (Next.js App Router, TypeScript, Tailwind CSS)
- **Source Control & CI/CD:** GitHub & GitHub Actions
- **Authentication & Multi-Tenancy:** Clerk (Clerk Organizations mapped 1:1 to `tenants`, RBAC Roles, Svix Webhook Sync)
- **Database & Vector Engine:** Supabase (PostgreSQL, `pgvector`, Composite Tenant Foreign Keys + Row Level Security)
- **Private Object Storage & WAF:** Cloudflare (Cloudflare R2 Private Buckets with Presigned URLs, Cloudflare DNS/WAF)
- **Durable Async Workflows & Crons:** Inngest (Multi-step durable background jobs, retries, concurrency limits, scheduled drift crons)
- **AI Provider & Embeddings:** Google Gemini API (`@google/genai` SDK — `gemini-2.5-pro`, `gemini-2.5-flash`, `text-embedding-004`)
- **Observability, Logs & Uptime:** Better Stack (Better Stack Logs / Logtail + Better Uptime)
- **Transactional Notifications:** Resend + React Email
- **Validation & Document Parsing:** Zod, `unpdf` / `pdf-parse`, `mammoth`, `sharp`

---

# PART A — PRODUCTION ENGINEERING METHODOLOGY & ARCHITECTURE ALIGNMENT

# 1. Executive Purpose & The "Foundations First, Then Vertical Slices" Philosophy

## 1.1 Why This Document Exists
This document is the master production build sequence and engineering governance contract for building **Cogent Marketing Shield** from scratch.

A common failure in enterprise SaaS engineering is treating development as *"build all UI screens first, wire up the database second, and bolt on authentication, permissions, and tests at the end."* In a multi-tenant financial compliance platform, that approach leads to broken tenant boundaries, unverified AI outputs, and massive refactoring.

Instead, this roadmap enforces a disciplined **two-part production engineering methodology**:
1. **Phases 1 to 5 — Foundational Systems First:** Before building any user-facing compliance feature, we establish the engineering environment, CI/CD pipeline, PostgreSQL + `pgvector` data layer, Clerk Organization-to-Supabase multi-tenant authentication, centralized RBAC authorization infrastructure, shared backend services (Zod validation, error middleware, Cloudflare R2 file service, cryptographic audit ledger, Better Stack observability, Resend notifications), and the Inngest durable background job engine + Central Gemini Orchestrator.
2. **Phases 6 to 11 — Complete Vertical Feature Slices:** Once the foundations are verified, every product capability is built as a **complete end-to-end vertical slice** (Database $\rightarrow$ Inngest/Backend Service $\rightarrow$ Clerk RBAC Permission Enforcement $\rightarrow$ API/SSE Route $\rightarrow$ Next.js UI Component $\rightarrow$ Automated Unit, Integration & Cross-Tenant Security Tests).
3. **Phases 12 to 13 — System-Wide Hardening, Golden 50 Benchmarking & Production Release:** Full cross-tenant penetration testing, Golden 50 retrieval benchmarking, chaos/failure recovery testing, Vercel + Supabase + Inngest + Cloudflare R2 production deployment, and Better Stack operational monitoring.

## 1.2 Cross-Cutting Rule: Security, Authorization, Testing & Observability Span Every Phase
- **Continuous CI & Testing:** GitHub Actions CI, Vitest unit/integration tests, and Playwright E2E tests are initialized in **Phase 1** and expanded in every single phase—never postponed to the end.
- **Continuous Authorization Enforcement:** We build the Clerk + Backend RBAC guard infrastructure once in **Phase 3**, and we enforce and test feature-specific permissions (`campaign.create`, `revision.propose`, `approval.decide`, `knowledge.publish`) inside every vertical slice.
- **Continuous Observability:** Every API route, Inngest background step, and Gemini model invocation logs structured telemetry and correlation IDs (`X-Request-ID`) to **Better Stack** from Day 1.

---

# 2. Master 13-Phase Implementation Overview

| Phase | Phase Name | Architectural Category | Primary Outcome & Exit Deliverable |
|---|---|---|---|
| **Phase 1** | Engineering Environment, Repository & CI/CD Baseline | Foundation | Next.js + TypeScript repo, GitHub Actions CI, ESLint/Prettier, Vitest/Playwright harness, Vercel staging link, Better Stack logger initialized. |
| **Phase 2** | Database Architecture, Composite Tenancy & Vector Foundation | Foundation | All 28 PostgreSQL tables deployed on Supabase, `pgvector` indexes (`VECTOR(768)`), Composite Tenant Foreign Keys, and RLS policies verified. |
| **Phase 3** | Authentication, Clerk Organization Sync & RBAC Infrastructure | Foundation | Clerk Auth & Organizations integrated, Svix webhook syncing `tenants` & `tenant_memberships`, server-side `resolveTenantContext()` and `requirePermission()` guards tested. |
| **Phase 4** | Shared Application Infrastructure & Reusable Core Services | Foundation | API middleware, Zod validation, standardized error envelope, Cloudflare R2 presigned file service, SHA-256 hash-chain audit service, rate limiter, and Resend email service. |
| **Phase 5** | Durable Background Processing (Inngest) & Central Gemini Engine | Foundation | Inngest server & step workers, Central `@google/genai` wrapper, Two-Step Live Web Search Router, and Golden 50 Statutory Corpus seeded & embedded. |
| **Phase 6** | Vertical Slice 1 — Conversational Compliance Copilot ("Walking Skeleton") | Vertical Slice | End-to-end `/chat` workspace, SSE streaming, Golden 50 Hybrid RRF search, inline source-class badges, and slide-over Evidence Drawer. |
| **Phase 7** | Vertical Slice 2 — Campaign Intake, R2 Asset OCR & Autonomous Assessment | Vertical Slice | Multi-modal composer upload to Cloudflare R2, Inngest OCR/PDF/DOCX extraction, Claim Extraction, 3 Deterministic Locks, 7-Layer Guardrails, and Contextual Campaign Inspector (Tabs 1–3). |
| **Phase 8** | Vertical Slice 3 — Controlled Remediation, Rewrite Validation & Revisions | Vertical Slice | Rewrite generation (`generate_rewrite_suggestions`), Layer 6 Rewrite Validator, Side-by-Side Diff Viewer (Tab 4), immutable `campaign_revisions`, and automatic reassessment. |
| **Phase 9** | Vertical Slice 4 — Human Sign-Off, RBAC Approvals & Statutory PDF Dossier | Vertical Slice | Separation-of-duties review workflow, CCO/Legal approval modal (`approval.decide`), immutable `campaign_approvals`, Resend email alerts, and Inngest PDF Statutory Dossier export (Tab 5). |
| **Phase 10** | Vertical Slice 5 — Institutional Knowledge Base, Playbooks & Product Truth | Vertical Slice | `/knowledge-base` workspace, playbook PDF/DOCX ingestion via Inngest, `campaign_products` rate/fee editor (Lock 2 truth), and rule activation workflow (`knowledge.publish`). |
| **Phase 11** | Vertical Slice 6 — Real-Time Live Web Intelligence & Post-Publication Drift | Vertical Slice | Live regulatory search (`search_live_web`), SSRF-safe URL snapshotter (`fetch_live_url_content`), and scheduled Inngest cron Drift Watcher (`/drift-monitors`). |
| **Phase 12** | System-Wide Hardening, Golden 50 Benchmark & Cross-Tenant Pentesting | Hardening & QA | 150-query Golden 50 Retrieval Benchmark, cross-tenant breach suite, prompt-injection & SSRF adversarial suite, load testing, and Inngest failure recovery verification. |
| **Phase 13** | Production Deployment, Better Stack Operations & Release Runbook | Production Release | Zero-downtime Vercel + Supabase + Inngest + Cloudflare R2 production cutover, Better Uptime synthetic monitors, backup restoration drill, and Go-Live sign-off. |

---

# PART B — DETAILED PHASE-BY-PHASE IMPLEMENTATION SPECIFICATIONS

## PHASE 1 — Engineering Environment, Repository & CI/CD Baseline

### 1.1 Objective
Establish a clean, deterministic engineering environment, repository structure, type-safety baseline, observability sink, and automated CI pipeline before writing business logic.

### 1.2 What Gets Built
1. **Git Repository & Branching Strategy:**
   - Initialize greenfield repository (`cogent-compliance-platform`) on GitHub.
   - Configure branch protection on `main` (require PR review, passing GitHub Actions status checks, strict TypeScript build, zero lint errors) deployments.
2. **Project Scaffolding (`Next.js App Router + TypeScript`):**
   - Initialize Next.js with strict TypeScript (`strict: true`, `noUncheckedIndexedAccess: true`), Tailwind CSS configured with the locked design tokens from Document 06 (`#0B0F1A`, `#2A4BFF`, `#F5F6FA`), and modular directory structure (`src/app`, `src/components`, `src/modules`, `src/contracts`, `src/lib`).
3. **Environment Configuration & Validation (`src/lib/env.ts`):**
   - Implement a Zod-validated server/client environment schema checking credentials for Clerk, Supabase, Cloudflare R2, Google Gemini API, Inngest, Better Stack, and Resend. Fail fast at boot if any required variable is missing.
4. **CI Pipeline (`.github/workflows/ci.yml`):**
   - Runs on every push and pull request: `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm lint`, and `pnpm test:unit`.
5. **Better Stack Structured Logging Baseline (`src/lib/logger.ts`):**
   - Configure `@logtail/next` / Pino structured JSON logging shipping to **Better Stack Logs** with automatic `X-Request-ID` correlation and PII/secret redaction.

### 1.3 Exit Criteria
- `pnpm build`, `pnpm typecheck`, `pnpm lint`, and initial sample unit test pass locally and in GitHub Actions CI.
- Vercel preview deployment succeeds and streams structured health-check logs (`GET /api/marketing-shield/v1/health`) to Better Stack.

---

## PHASE 2 — Database Architecture, Composite Tenancy & Vector Foundation

### 2.1 Objective
Deploy the complete relational and vector data architecture on Supabase PostgreSQL (`03_Database_and_Data_Model.md`) and prove at the database engine level that organizational data is strictly isolated.

### 2.2 What Gets Built
1. **Versioned SQL Migrations (`supabase/migrations/`):**
   - Enable `pgcrypto` and `vector` (`pgvector`) extensions.
   - Create all **28 canonical tables** across Identity/Tenancy (`tenants`, `tenant_memberships`), Conversations, Campaigns, Assets, Claims, Golden 50 Statutory Vault, Institutional Knowledge Base (`campaign_products`, `marketing_knowledge_*`, `prohibited_terms`), Live Web Retrievals, Assessments/Findings/Snapshots, Revisions/Approvals/Drift Monitors, AI Telemetry, Processing Jobs, and Cryptographic Audit Events.
2. **Composite Tenant Foreign Keys & Constraints:**
   - Enforce `UNIQUE (tenant_id, id)` on every tenant-owned parent table and composite `FOREIGN KEY (tenant_id, parent_id)` on every child table.
   - Enforce `ON DELETE RESTRICT` on historical compliance records (`campaign_assessments`, `compliance_findings`, `assessment_evidence_snapshots`, `campaign_revisions`, `campaign_approvals`, `marketing_audit_events`).
3. **Indexes & Hybrid Search RPCs:**
   - Create all relational B-tree indexes, PostgreSQL GIN full-text search indexes (`to_tsvector('english', ...)`), and `pgvector` `ivfflat` cosine indexes (`VECTOR(768)`).
   - Create PostgreSQL RPC functions for Hybrid Reciprocal Rank Fusion (RRF) search over `regulatory_clauses` and tenant-scoped `marketing_knowledge_chunks`.
4. **Row Level Security (RLS) Policies:**
   - Enable and force RLS across all 22 tenant-owned tables and read-only public access on the 6 global `regulatory_*` tables.

### 2.3 Exit Criteria
- `supabase db reset` and migration scripts run cleanly with zero errors.
- Automated database integration tests (`tests/db/tenant-isolation.test.ts`) verify that attempting to link a child record with Tenant A's `tenant_id` to Tenant B's `campaign_id` fails with a PostgreSQL foreign-key violation.

---

## PHASE 3 — Authentication, Clerk Organization Sync & RBAC Infrastructure

### 3.1 Objective
Establish **Who are you?** (Authentication via Clerk) and **What are you allowed to do within this institution?** (Server-Side Multi-Tenant Resolution & Role-Based Access Control).

### 3.2 What Gets Built
1. **Clerk Authentication & Organizations Setup:**
   - Integrate `@clerk/nextjs` middleware protecting all `/(workspace)/*` routes and `/api/marketing-shield/v1/*` endpoints.
   - Configure Clerk Organizations so each financial institution maps 1:1 to a row in `tenants` (`tenants.clerk_org_id` / `slug`), and each member maps 1:1 to `tenant_memberships`.
2. **Clerk-to-Supabase Webhook Synchronization (`POST /api/webhooks/clerk`):**
   - Verify Svix cryptographic webhook signatures.
   - Handle `organization.created`, `organization.updated`, `organizationMembership.created`, `organizationMembership.updated`, and `organizationMembership.deleted` events idempotently to keep `tenants` and `tenant_memberships` (`status = 'ACTIVE' | 'SUSPENDED'`) synchronized in real time.
3. **Authoritative Tenant & RBAC Guard (`src/modules/auth-tenancy/`):**
   - Implement `resolveTenantContext(req)` which verifies the Clerk session token, confirms active membership in `tenant_memberships`, and resolves the user's canonical role (`MARKETING_GROWTH`, `COMPLIANCE_ANALYST`, `LEGAL_COUNSEL`, `CHIEF_COMPLIANCE_OFFICER`, `WORKSPACE_ADMIN`) and `Set<PermissionKey>`.
   - Implement `requirePermission(ctx, permissionKey)` enforcing the locked 22-permission matrix from Documents 01 & 07:

| Action / Capability | Permission Key | Marketing / Growth | Compliance Analyst | Legal Counsel | CCO | Workspace Admin |
|---|---|---|---|---|---|---|
| View conversations, campaigns & findings | `conversation.read`, `campaign.read`, `assessment.read` | Yes | Yes | Yes | Yes | Yes |
| Create campaigns & upload assets | `campaign.create`, `asset.upload` | Yes | Yes | Yes | Yes | No |
| Propose & save campaign revisions | `revision.propose`, `revision.create` | Yes | Yes | Yes | Yes | No |
| Submit campaign for formal review | `campaign.submit_review` | Yes | Yes | Yes | Yes | No |
| **Approve or Reject campaign revisions** | `approval.decide` | **No** | **No** | **Yes** | **Yes** | **No** |
| Upload/draft playbooks & product rates | `knowledge.write`, `product.write` | No | Yes (Draft) | Yes | Yes | Yes |
| **Activate institutional rules** | `knowledge.publish` | **No** | **No** | **Yes** | **Yes** | **Yes** |
| Invite users & manage roles | `user.manage`, `tenant.admin` | **No** | **No** | **No** | View | **Yes** |
| View cryptographic audit trail | `audit.read` | **No** | **No** | **Yes** | **Yes** | **Yes** |

### 3.3 Exit Criteria
- Unauthenticated requests return `401 UNAUTHENTICATED`.
- Users without an active organization membership or with `status = 'SUSPENDED'` receive `403 TENANT_CONTEXT_INVALID`.
- Automated RBAC unit and integration tests verify every cell of the permission matrix across all 5 roles.

---

## PHASE 4 — Shared Application Infrastructure & Reusable Core Services

### 4.1 Objective
Build the shared backend capabilities once so that every vertical feature slice consumes consistent validation, storage, audit, notification, rate-limiting, and error-handling infrastructure.

### 4.2 What Gets Built
| Shared Service / Component | Module Path | What It Does |
|---|---|---|
| **API Wrapper & Error Handler** | `src/lib/api-handler.ts` | Wraps Next.js route handlers with `X-Request-ID` generation, `resolveTenantContext()`, `Idempotency-Key` check, Better Stack request logging, and standardized JSON error envelopes (`04_API_and_Gemini_Tool_Contracts.md`). |
| **Zod Contract Validator** | `src/contracts/*` | Centralizes all request/response schemas, lifecycle enums, and Gemini tool schemas. |
| **Cloudflare R2 File Storage Service** | `src/modules/asset-processing/r2.storage.ts` | Generates tenant-prefixed (`tenants/{tenant_id}/...`) presigned `PUT` and `GET` URLs on private Cloudflare R2 buckets, verifies magic-byte signatures (`PNG`, `JPEG`, `WEBP`, `PDF`, `DOCX`), and verifies `SHA-256` file hashes. |
| **Cryptographic Audit Service** | `src/modules/audit/audit.service.ts` | Appends tamper-evident records to `marketing_audit_events` with chained `SHA-256` state hashes (`previous_state_hash` $\rightarrow$ `new_state_hash`) and provides an integrity verification utility. |
| **Rate Limiting Service** | `src/lib/rate-limit.ts` | Enforces per-user and per-tenant sliding-window rate limits on chat streaming, assessments, uploads, and live web searches. |
| **Transactional Notification Service** | `src/lib/notifications.ts` | Integrates **Resend** + React Email templates for review requests, CCO approval/rejection decisions, and post-publication drift alerts. |

### 4.3 Exit Criteria
- Cloudflare R2 presigned upload, magic-byte inspection (rejecting disguised `.exe`/`.svg`/`.html`), and SHA-256 verification pass integration tests.
- Cryptographic audit service writes chained events and detects any simulated row tampering.

---

## PHASE 5 — Durable Background Processing (Inngest) & Central Gemini Engine

### 5.1 Objective
Establish the asynchronous execution backbone (**Inngest**), the centralized **Google Gemini API (`@google/genai`)** orchestration service, the **Two-Step Live Web Search Router**, and seed the **Golden 50 Nigerian Statutory Vault**.

### 5.2 What Gets Built
1. **Inngest Durable Workflow Engine (`src/modules/jobs/inngest.client.ts` & `/api/inngest`):**
   - Configure typed Inngest events, step-level retries (`step.run`), concurrency limits per `tenant_id`, and synchronization with the `processing_jobs` table so the frontend can track real-time job progress and failures are logged to Better Stack.
2. **Central Gemini Service (`src/modules/ai-orchestration/gemini.service.ts`):**
   - Single server-only wrapper around `@google/genai` supporting:
     - `gemini-2.5-pro` for complex compliance assessment, multimodal flyer OCR, and rewrite generation.
     - `gemini-2.5-flash` for low-latency chat routing and Two-Step Live Web Search synthesis.
     - `text-embedding-004` for generating 768-dimensional vectors.
   - Automatically records input/output tokens, latency, model version, and estimated USD cost in `ai_model_runs`.
3. **Two-Step Live Web Search Router (`src/modules/live-web-intelligence/web-search.router.ts`):**
   - Implements the isolated secondary `gemini-2.5-flash` call with `tools: [{ googleSearch: {} }]` (prioritizing `cbn.gov.ng`, `fccpc.gov.ng`, `arcon.gov.ng`, `ndpc.gov.ng`, `sec.gov.ng`), persists results in `live_web_retrievals` (`source_class = 'LIVE_WEB_INTELLIGENCE'`), and returns structured citations to the primary tool executor.
4. **Golden 50 Statutory Vault Ingestion & Seeding (`supabase/seed/` & Inngest `REGULATORY_CORPUS_EMBEDDING`):**
   - Seed the 5 Nigerian regulatory bodies (`CBN`, `FCCPC`, `ARCON`, `NDPC`, `SEC`) and the **Golden 50 Nigerian Regulatory Instruments** (`05_Regulatory_Evidence_and_Guardrails.md`), hash source documents, populate verbatim `regulatory_clauses`, `regulatory_obligations`, `applicability_rules`, and statutory `prohibited_terms`, and generate `VECTOR(768)` embeddings with zero null embeddings.

### 5.3 Exit Criteria
- Inngest dev server and staging webhook execute multi-step durable functions with automatic retry recovery.
- All Golden 50 instruments are verified in PostgreSQL with `embedding IS NOT NULL`, and Hybrid RRF search (`search_regulatory_evidence`) returns sub-200ms ranked results.

---

## PHASE 6 — Vertical Slice 1: Conversational Compliance Copilot ("The Walking Skeleton")

### 6.1 Objective
Build and verify the first complete end-to-end vertical slice: a user logs in via Clerk, opens `/chat`, asks a standalone Nigerian regulatory question, watches real-time SSE streaming with tool activity pills, sees inline **`[Verified Statutory Vault]`** badges, and inspects the verbatim clause and SHA-256 hash in the slide-over **Evidence Drawer**.

### 6.2 End-to-End Slice Components
- **Backend & Tools:** Conversation service (`marketing_conversations`, `marketing_messages`), Context Assembler,SSE streaming controller (`POST /conversations/{id}/messages/stream`), and read-only statutory tools (`get_conversation_context`, `search_regulatory_evidence`, `get_regulatory_provision`, `verify_regulatory_evidence`, `assess_regulatory_applicability`).
- **Frontend UI (`06_Frontend_Experience_Specification.md`):** 3-zone enterprise application shell (`#0B0F1A` sidebar), conversation list/search/rename/archive, empty-state starter cards, streaming message renderer, tool activity pills, inline citation badges, and the slide-over `EvidenceDrawer.tsx`.
- **Security & Tests:** Enforce `conversation.create` and `conversation.read` permissions, verify tenant isolation on conversation history, and run Playwright E2E test `E2E-001 (Standalone Regulatory Conversation)`.

### 6.3 Exit Criteria
- A user can hold a multi-turn regulatory conversation grounded in the Golden 50 Vault, refresh the browser without losing history, inspect verbatim provisions in the Evidence Drawer, and zero campaign records are created unnecessarily.

---

## PHASE 7 — Vertical Slice 2: Campaign Intake, R2 Asset OCR & Autonomous Assessment Engine

### 7.1 Objective
Build the core **Autonomous Campaign Analyst** vertical slice: a user pastes ad copy or attaches a flyer (`PNG`/`JPEG`/`WEBP`) or document (`PDF`/`DOCX`) in chat, uploads directly to Cloudflare R2, triggers Inngest extraction/OCR, runs Claim Extraction + the **3 Deterministic Mechanical Locks** + **7-Layer Guardrail Pipeline**, and inspects results in the **Contextual Campaign Inspector (Tabs 1–3)**.

### 7.2 End-to-End Slice Components
1. **Cloudflare R2 Upload & Inngest Extraction Pipeline:**
   - `POST /assets/upload-session` & `POST /assets/{id}/complete`.
   - Inngest function `ASSET_SECURITY_AND_EXTRACTION` verifies magic bytes and SHA-256 hash, parses PDF (`unpdf`) / DOCX (`mammoth`), or runs Gemini 2.5 Pro multimodal OCR on flyers, saving `asset_extractions` and `asset_extraction_segments` (with page numbers, bounding boxes, and `OCR` vs `DIRECT_TEXT` provenance).
2. **Autonomous Campaign Assessment Engine (`CAMPAIGN_COMPLIANCE_ASSESSMENT`):**
   - Automatic conversation-to-campaign transition creating `marketing_campaigns` and `campaign_revisions` (`revision_number = 1`).
   - Claim Extraction (`extract_campaign_claims`) across all 11 controlled claim categories.
   - **Deterministic Lock 1** (Prohibited Terms), **Deterministic Lock 2** (Product Rate/Fee Match), and **Deterministic Lock 3** (Mandatory Disclosures).
   - Multi-Source Retrieval + Gemini 2.5 Pro reasoning + **7-Layer Guardrail Validator** (blocking hallucinated citations, injecting verbatim clause text, verifying claim provenance, and saving immutable `assessment_evidence_snapshots`).
3. **Frontend Contextual Campaign Inspector (Tabs 1, 2 & 3):**
   - Smooth dual-pane expansion on `campaign.created` SSE event.
   - **Tab 1:** 3 Deterministic Lock Pass/Fail cards and overall risk summary.
   - **Tab 2:** `FlyerBoundingBoxViewer.tsx` and inline `OcrSegmentEditor.tsx` (`PATCH /assets/{id}/segments/{seg_id}`) for correcting low-confidence OCR.
   - **Tab 3:** `FindingCard.tsx` list with severity, applicability badges, and Evidence Drawer links.

### 7.3 Exit Criteria
- Uploading a promotional flyer or pasting ad copy triggers the full pipeline, catches prohibited terms and missing disclosures deterministically, rejects any fabricated citation in guardrail tests, and renders Tabs 1–3 accurately.

---

## PHASE 8 — Vertical Slice 3: Controlled Remediation, Layer 6 Rewrite Validation & Revisions

### 8.1 Objective
Build the complete remediation and immutable versioning vertical slice so Marketing and Compliance teams can fix flagged issues safely without inventing financial rates or overwriting historical submissions.

### 8.2 End-to-End Slice Components
- **Backend & Guardrails:**
  - `POST /findings/{id}/rewrite-suggestions` & Gemini tool `generate_rewrite_suggestions` constrained by `campaign_products` approved terms and mandatory disclosures.
  - **Layer 6 Rewrite Validator:** Automatically re-runs Deterministic Locks 1–3 on `proposed_text` to verify the original issue is resolved, no prohibited terms were added, product rates/fees match `campaign_products`, and mandatory disclosures are preserved.
  - `POST /campaigns/{id}/revisions` creating immutable `revision_number = N + 1` linked to `parent_revision_id`, triggering automatic reassessment, and invalidating any prior approval if the campaign was previously `APPROVED`.
  - `GET /campaigns/{id}/revisions/compare` computing structured diffs and finding resolution status.
- **Frontend UI (Tab 4 — `RewriteDiffViewer.tsx`):**
  - Layer 6 validation status banner, side-by-side red/green diff viewer, revision selector dropdown (`Revision #1` vs `Revision #2`), and explicit **[Accept & Save as Revision #N]**, **[Edit Manually]**, and **[Reject]** controls.

### 8.3 Exit Criteria
- Accepting a validated rewrite creates `revision_number = 2`, preserves `revision_number = 1` immutably, runs reassessment automatically, and Layer 6 blocks any simulated rewrite that invents an unapproved interest rate.

---

## PHASE 9 — Vertical Slice 4: Human Sign-Off, RBAC Approvals & Statutory PDF Dossier

### 9.1 Objective
Build the institutional sign-off and audit shield vertical slice enforcing strict separation of duties between Marketing/Growth and Legal/CCO, and generating the one-click **FCCPC Regulation 32 (2-Year Audit) & ARCON ASP Pre-Vetting PDF Dossier**.

### 9.2 End-to-End Slice Components
- **Backend & Workflow:**
  - `POST /campaigns/{id}/submit-review` (`campaign.submit_review` permission) transitioning status to `UNDER_REVIEW` and sending a **Resend** email notification to authorized `LEGAL_COUNSEL` and `CHIEF_COMPLIANCE_OFFICER` members.
  - `POST /campaigns/{id}/approvals` strictly gated by `requirePermission(ctx, 'approval.decide')` and dual-control checks, binding an immutable decision (`APPROVED` or `REJECTED`) to the exact `revision_id`, updating `marketing_campaigns.approved_revision_id`, logging a chained SHA-256 event in `marketing_audit_events`, and sending a Resend decision notification.
  - Inngest function `STATUTORY_DOSSIER_GENERATION` (`POST /campaigns/{id}/dossiers`) compiling campaign metadata, original asset SHA-256 hashes, extracted claims, deterministic lock results, findings, `assessment_evidence_snapshots`, revision diffs, and the CCO's cryptographic approval signature into a downloadable PDF stored in Cloudflare R2.
- **Frontend UI (Tab 5 — Sign-Off & Dossier):**
  - Review comment thread, role-gated `ApprovalConfirmationModal.tsx` (disabled with separation-of-duties explanation for `MARKETING_GROWTH` and `COMPLIANCE_ANALYST`), and `DossierCard.tsx` download interface.

### 9.3 Exit Criteria
- Marketing users can submit for review but receive `403 APPROVAL_NOT_PERMITTED` if they attempt to approve.
- CCO/Legal approval binds to `revision_id = 2`, editing the campaign afterward automatically invalidates the approval, and the generated PDF Statutory Dossier contains the complete evidence and sign-off chain.

---

## PHASE 10 — Vertical Slice 5: Institutional Knowledge Base, Playbooks & Product Truth

### 10.1 Objective
Build the `/knowledge-base` vertical slice so each financial institution can upload its own internal marketing playbooks, manage structured `campaign_products` rate/fee truth (enforced by Deterministic Lock 2), and activate custom internal rules.

### 10.2 End-to-End Slice Components
- **Backend & Inngest Pipeline:**
  - `POST /products` & `PATCH /products/{id}` (`product.write` permission) managing structured product interest rates, APRs, processing fees, penalty fees, tenors, and product disclaimers in `campaign_products`.
  - `POST /knowledge-base/documents` uploading internal policy PDFs/DOCX to Cloudflare R2 and triggering Inngest `PLAYBOOK_DOCUMENT_INGESTION` (chunking into `marketing_knowledge_chunks`, embedding with `text-embedding-004`, and extracting candidate `marketing_knowledge_rules` in `DRAFT` status).
  - `POST /knowledge-base/rules/{id}/activate` (`knowledge.publish` permission restricted to `LEGAL_COUNSEL`, `CHIEF_COMPLIANCE_OFFICER`, `WORKSPACE_ADMIN`) activating rules for live enforcement.
  - Gemini tools `search_institutional_knowledge` and `get_product_approved_terms`.
- **Frontend UI (`/knowledge-base`):**
  - `PlaybookUploader.tsx`, `ProductRateEditor.tsx`, and `RuleActivationTable.tsx`.

### 10.3 Exit Criteria
- Uploading a playbook PDF chunks and embeds the document for chat Q&A (`[Internal Playbook Rule]` badge), activating an extracted rule enforces it in campaign assessments, and Lock 2 deterministically flags any campaign whose advertised rate/fee contradicts `campaign_products`.

---

## PHASE 11 — Vertical Slice 6: Real-Time Live Web Intelligence & Post-Publication Drift

### 11.1 Objective
Complete the Three-Source Intelligence engine and post-publication governance by wiring `search_live_web`, SSRF-safe `fetch_live_url_content`, and the scheduled Inngest **Post-Publication Drift Watcher** (`/drift-monitors`).

### 11.2 End-to-End Slice Components
- **Live Web & URL Inspection:**
  - Full integration of Tool 9 (`search_live_web`) and Tool 10 (`fetch_live_url_content` with DNS resolution and private-IP SSRF blocking) into chat and campaign intake.
  - Admin workflow to queue a newly discovered official regulator circular URL from `live_web_retrievals` into the Statutory Vault verification pipeline.
- **Post-Publication Drift Monitoring (`CAMPAIGN_URL_DRIFT_CHECK`):**
  - `POST /campaigns/{id}/drift-monitors` linking a live `HTTPS` promotional landing page to an `approved_revision_id`.
  - Scheduled Inngest cron job (every 6 hours) and manual trigger (`POST /drift-monitors/{id}/check`) fetching the live URL, comparing extracted claims and mandatory disclosures against the approved revision snapshot, transitioning monitor status to `DRIFT_DETECTED` if material changes occur, logging an audit event, and sending a high-priority **Resend** alert to the CCO.
- **Frontend UI (`/drift-monitors`):**
  - Drift Monitor dashboard and side-by-side comparison of Approved Snapshot vs. Live Published Webpage.

### 11.3 Exit Criteria
- Live web queries return real-time `.gov.ng` grounded citations badged as **`[Live Web Intelligence]`**, SSRF tests block private IPs (`127.0.0.1`, `169.254.169.254`), and simulated edits on a monitored landing page trigger `DRIFT_DETECTED` and CCO email alerts.

---

## PHASE 12 — System-Wide Hardening, Golden 50 Benchmark & Cross-Tenant Pentesting

### 12.1 Objective
Verify system-wide security, retrieval accuracy, performance, and failure recovery across all modules before production cutover (`09_Testing_and_Production_Readiness.md`).

### 12.2 System-Level Verification Suites
1. **Cross-Tenant Penetration Test Suite:**
   - Provision Tenant A and Tenant B in Clerk and Supabase. Attempt cross-tenant access across every REST endpoint, SSE stream, Cloudflare R2 presigned URL, Gemini tool call, and Inngest background job. Verify `100%` denial.
2. **Golden 50 Retrieval & Guardrail Benchmark Suite:**
   - Execute the 150-scenario Nigerian regulatory benchmark verifying `Hit Rate @ 5 >= 92%`, `MRR @ 10 >= 0.80`, `100%` hallucinated citation rejection, `100%` superseded provision blocking, and `100%` Lock 2 rate-mismatch detection.
3. **Adversarial Prompt-Injection, File & SSRF Hardening:**
   - Test flyers and PDFs embedded with prompt-injection instructions, disguised malware/SVG uploads, and SSRF redirect chains.
4. **Inngest Chaos & Failure Recovery Testing:**
   - Simulate Gemini API timeouts, R2 upload interruptions, and worker restarts; verify idempotent recovery and clean user-facing error states.

---

## PHASE 13 — Production Deployment, Better Stack Operations & Release Runbook

### 13.1 Objective
Execute controlled production deployment across Vercel, Supabase, Clerk, Cloudflare R2, Inngest, Resend, and Better Stack, and establish ongoing operational monitoring.

### 13.2 Production Release Pipeline
1. **Staging Rehearsal:** Run full database migrations, Golden 50 seed verification, and Playwright E2E suite on staging.
2. **Production Infrastructure Verification:**
   - **Supabase:** Production PostgreSQL instance with Point-in-Time Recovery (PITR) backups enabled, RLS verified, and connection pooling configured.
   - **Clerk:** Production instance with custom domain, Svix webhook secret, and Organization RBAC roles locked.
   - **Cloudflare R2:** Production private bucket with strict CORS, zero public access, and lifecycle rules.
   - **Inngest:** Production app synced with Vercel production URL and signing keys.
   - **Better Stack:** Production log drain connected to Vercel, synthetic uptime monitors on `/api/marketing-shield/v1/health`, and incident escalation alerts configured for 5xx spikes, guardrail rejections, or cross-tenant 403 anomalies.
3. **Go-Live Smoke Test & Rollback Readiness:** Execute production smoke tests across all 4 core user journeys and verify instant Vercel deployment rollback + database recovery runbooks.

---

# PART C — ANTIGRAVITY EXECUTION GOVERNANCE & MASTER PROMPTS

## 3. Rules of Engagement for the Gemini Antigravity IDE Agent

1. **Follow the 13 Phases Sequentially:** Do not skip foundational phases (Phases 1–5) to build UI screens prematurely, and do not build partial horizontal layers without their corresponding tests and RBAC checks.
2. **Strict Source-of-Truth Alignment:** All table names, column names, enum values, API routes (`/api/marketing-shield/v1/*`), and Gemini tool names must match Documents 01 through 07 verbatim.
3. **No Mocked Security or Fake Completion:** Never report a phase complete because a UI renders with hardcoded mock data or because a unit test passes with mocked authorization. Every phase requires working database constraints, real Clerk + RBAC enforcement, and passing automated tests.
4. **Stage Completion Gate:** At the end of each phase, produce a structured **Phase Completion Report** (Files Created/Modified, Migrations Applied, Commands & Tests Executed, Security & Tenant Isolation Verification, and Readiness for Next Phase) and wait for human approval before starting the next phase.

---

## 4. Copy-Paste Antigravity Execution Prompts

### Master Initialization Prompt (Run First in Gemini Antigravity IDE)
```text
You are the Principal Full-Stack & AI Systems Architect building Cogent Marketing Shield from the ground up as a greenfield enterprise SaaS application.

Before writing any code, read and internalize all 9 specification documents in our documentation directory (`01_PRD.md` through `09_Testing_and_Production_Readiness.md`). These documents are our single Source of Truth.

Our locked production tech stack is:
- Next.js (App Router, TypeScript, Tailwind CSS) deployed on Vercel
- GitHub & GitHub Actions for CI/CD
- Clerk (Clerk Organizations mapped 1:1 to `tenants` + RBAC permissions synced via Svix webhooks)
- Supabase PostgreSQL + `pgvector` (`VECTOR(768)`) with Composite Tenant Foreign Keys (`UNIQUE (tenant_id, id)`) and Row Level Security (RLS)
- Cloudflare R2 private object storage with presigned URLs, magic-byte inspection, and SHA-256 hashing
- Inngest for durable multi-step background workflows and scheduled crons
- Google Gemini API (`@google/genai` SDK — `gemini-2.5-pro`, `gemini-2.5-flash`, `text-embedding-004`)
- Better Stack for structured logging and uptime monitoring
- Resend + React Email for transactional notifications
- Zod for end-to-end schema validation

We are building this system using the 13-Phase "Foundations First, Then Complete Vertical Slices" methodology defined in `08_Implementation_Roadmap_and_Execution.md`.
Begin with Phase 1 (Engineering Environment, Repository & CI/CD Baseline). Produce your Phase 1 implementation plan, execute Phase 1, run all verification checks, and output the Phase 1 Completion Report. Do not proceed to Phase 2 until approved.
```

### Phase-by-Phase Execution Prompts
- **Prompt for Phase 2 (Database & Vector Foundation):** *"Execute Phase 2 of `08_Implementation_Roadmap_and_Execution.md`. Create the complete Supabase SQL migrations for all 28 tables defined in `03_Database_and_Data_Model.md`, including `pgvector` indexes, PostgreSQL FTS indexes, Hybrid RRF search RPCs, Composite Tenant Foreign Keys, and RLS policies. Write and run the database tenant-isolation integration tests and provide the Phase 2 Completion Report."*
- **Prompt for Phase 3 (Clerk Auth & Multi-Tenant RBAC):** *"Execute Phase 3 of `08_Implementation_Roadmap_and_Execution.md`. Integrate Clerk Authentication and Organizations, build the Svix webhook handler (`POST /api/webhooks/clerk`) syncing `tenants` and `tenant_memberships`, and implement `resolveTenantContext()` and `requirePermission()` enforcing the 22-permission matrix from `07_Security_and_Governance.md`. Run the RBAC test suite across all 5 roles and provide the Phase 3 Completion Report."*
- **Prompt for Phase 4 (Shared Core Infrastructure):** *"Execute Phase 4 of `08_Implementation_Roadmap_and_Execution.md`. Implement the shared API handler middleware, Zod contract schemas (`src/contracts/*`), Cloudflare R2 presigned storage service with magic-byte and SHA-256 verification, the SHA-256 hash-chained audit service (`marketing_audit_events`), rate limiter, and Resend notification service. Run all Phase 4 integration tests and provide the Phase 4 Completion Report."*
- **Prompt for Phase 5 (Inngest Durable Queue, Gemini Engine & Golden 50 Seed):** *"Execute Phase 5 of `08_Implementation_Roadmap_and_Execution.md`. Configure Inngest durable workflows synced with `processing_jobs`, build the Central Gemini Service (`@google/genai`), implement the Two-Step Live Web Search Router (`search_live_web`), and build/run the Golden 50 Nigerian Statutory Vault seed and `text-embedding-004` embedding pipeline. Verify zero null embeddings and sub-200ms Hybrid RRF retrieval, then provide the Phase 5 Completion Report."*
- **Prompt for Phases 6–11 (Vertical Slices 1–6):** *"Execute Phase [N] of `08_Implementation_Roadmap_and_Execution.md` as a complete vertical slice—implementing the backend domain service, Inngest worker steps (where applicable), Gemini tool executors, Clerk/RBAC permission checks, REST/SSE API endpoints (`04_API_and_Gemini_Tool_Contracts.md`), Next.js UI components (`06_Frontend_Experience_Specification.md`), and automated unit, integration, cross-tenant security, and E2E tests. Provide the Phase [N] Completion Report and wait for approval."*
- **Prompt for Phases 12–13 (Hardening, Benchmark & Production Release):** *"Execute Phase [12/13] of `08_Implementation_Roadmap_and_Execution.md` and `09_Testing_and_Production_Readiness.md`. Run the full Golden 50 Retrieval & Guardrail Benchmark, cross-tenant penetration tests, prompt-injection/SSRF tests, and production readiness checks. Output the complete verification report."*

**End of Document 08 — Greenfield Implementation Roadmap and Antigravity Execution Plan.**