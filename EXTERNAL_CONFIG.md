# COGENT MARKETING SHIELD — EXTERNAL PRODUCTION CONFIGURATION RUNBOOK

**Document Reference:** `08_Greenfield_Implementation_Roadmap_and_Antigravity_Execution_Plan.md`  
**Governance Principle:** *Strict Real-World Production Setup. Zero Mockups. Zero Fake Credentials. Every external service is provisioned in its real production environment before closing any phase.*  
**Current Active Phase:** **PHASE 4 (Shared Application Infrastructure & Reusable Core Services) — COMPLETED & READY FOR SIGN-OFF**  
**Next Upcoming Phase:** **PHASE 5 (Durable Background Processing & Central Gemini Engine)**  

---

# TABLE OF CONTENTS
1. [Overview & How to Use This Runbook](#1-overview--how-to-use-this-runbook)
2. [PHASE 1: Engineering Environment & CI/CD (COMPLETED & SIGNED OFF)](#2-phase-1-engineering-environment--cicd-completed--signed-off)
3. [PHASE 2: Supabase PostgreSQL & pgvector (COMPLETED & SIGNED OFF)](#3-phase-2-supabase-postgresql--pgvector-completed--signed-off)
4. [PHASE 3: Clerk Production Organizations & Svix (COMPLETED & SIGNED OFF)](#4-phase-3-clerk-production-organizations--svix-completed--signed-off)
5. [PHASE 4: Cloudflare R2 Private Storage & Resend (COMPLETED & VERIFIED)](#5-phase-4-cloudflare-r2-private-storage--resend-completed--verified)
6. [PHASE 5: Google Gemini API & Inngest Production Setup (ACTION REQUIRED FOR PHASE 5)](#6-phase-5-google-gemini-api--inngest-production-setup-action-required-for-phase-5)
   - [Task 5.1: Retrieve Google Gemini API Key](#task-51-retrieve-google-gemini-api-key)
   - [Task 5.2: Create Inngest Production Account & Project](#task-52-create-inngest-production-account--project)
   - [Task 5.3: Retrieve Inngest Event & Signing Keys](#task-53-retrieve-inngest-event--signing-keys)
   - [Task 5.4: Inject Gemini & Inngest Keys into Vercel and Local Environment](#task-54-inject-gemini--inngest-keys-into-vercel-and-local-environment)
7. [UPCOMING PHASES: Production Infrastructure Roadmap](#7-upcoming-phases-production-infrastructure-roadmap)
   - [Phase 6 Preview: Vertical Slice 1 — Conversational Copilot Walking Skeleton](#phase-6-preview-vertical-slice-1--conversational-copilot-walking-skeleton)

---

# 1. Overview & How to Use This Runbook

This document is your **click-by-click, screen-by-screen external operations runbook**.

- For every phase, you will find exact URLs, exact navigation steps, exact button labels, exact form inputs, and exact verification tests.
- **Do not use "Sandbox / Development / Test-Only" mockups where production is needed.** Every step is configured for real enterprise production stability.
- **You must complete and verify all tasks in a phase before we proceed to write code for the next phase.**

---

# 2. PHASE 1: Engineering Environment & CI/CD (COMPLETED & SIGNED OFF)

- [x] **Task 1.1:** GitHub Actions CI Pipeline verified on `main` branch.
- [x] **Task 1.2:** Vercel Production deployment active on Next.js 15.5.29.
- [x] **Task 1.3:** Better Stack Logtail Source Token connected: `xL1zCjM9t7iCAwHigBXrQDt9`.
- [x] **Task 1.4:** Better Uptime synthetic health monitor active on `/api/marketing-shield/v1/health`.
- [x] **Task 1.5:** Phase 1 sign-off confirmed on 2026-11-11.

---

# 3. PHASE 2: Supabase PostgreSQL & pgvector (COMPLETED & SIGNED OFF)

- [x] **Task 2.1:** Real Supabase Production Project provisioned (`igrcwfojsliohdhivhby` in AWS Frankfurt `eu-central-1`).
- [x] **Task 2.2:** Database keys and connection URLs retrieved.
- [x] **Task 2.3:** Master canonical migration executed via Management API: 35 public tables, `pgvector 0.8.2`, `pgcrypto 1.3`, and 2 RRF RPC functions deployed.
- [x] **Task 2.4:** Composite foreign keys and live cross-tenant isolation enforcement (code `23503`) verified.
- [x] **Task 2.5:** Phase 2 sign-off confirmed on 2026-11-11.

---

# 4. PHASE 3: Clerk Production Organizations & Svix (COMPLETED & SIGNED OFF)

- [x] **Task 3.1:** `@clerk/nextjs` (7.9.25) and `svix` (2.10.0) integrated.
- [x] **Task 3.2:** Route protection middleware (`src/middleware.ts`) deployed, guarding workspace and API routes.
- [x] **Task 3.3:** Clerk Svix Webhook receiver implemented at `POST /api/webhooks/clerk` with cryptographic signature verification.
- [x] **Task 3.4:** Clerk-to-Supabase real-time sync service (`src/modules/auth-tenancy/clerk.sync.ts`) handling organization and membership lifecycle events.
- [x] **Task 3.5:** Authoritative 22-permission matrix for all 5 canonical roles and Document 07 Section 5.3 Anti-Self-Approval dual control implemented.
- [x] **Task 3.6:** Server-side tenant resolver (`src/modules/auth-tenancy/tenant.resolver.ts`) failing closed with 401/403.
- [x] **Task 3.7:** Phase 3 sign-off confirmed on 2026-11-11.

---

# 5. PHASE 4: Cloudflare R2 Private Storage & Resend (COMPLETED & VERIFIED)

All Phase 4 shared application infrastructure components have been implemented and verified:

- [x] **Task 4.1:** Cloudflare R2 bucket provisioned: `cogent-marketing-shield-assets`.
- [x] **Task 4.2:** Scoped presigned upload and download URL generator (`src/modules/asset-processing/r2.storage.ts`).
- [x] **Task 4.3:** Binary magic-byte inspection verifying genuine PNG, JPEG, WEBP, PDF, and DOCX headers while strictly rejecting disguised executables (`MZ`), SVGs (`<svg`), HTML (`<!DOCTYPE`), and script injections.
- [x] **Task 4.4:** SHA-256 binary digest verification.
- [x] **Task 4.5:** Cryptographic tamper-evident audit ledger (`src/modules/audit/audit.service.ts`) with SHA-256 hash chaining and tamper-detection verifier.
- [x] **Task 4.6:** Sliding-window rate limiter (`src/lib/rate-limit.ts`) protecting chat streams, assessments, uploads, and web searches.
- [x] **Task 4.7:** Transactional notification service (`src/lib/notifications.ts`) with responsive HTML templates matching Cogent brand tokens.
- [x] **Task 4.8:** Standard API gateway route wrapper (`src/lib/api-handler.ts`) with `X-Request-ID` correlation, tenant resolution, RBAC guards, and standard JSON envelopes.
- [x] **Task 4.9:** Automated test suite expanded to 67 passing tests.

### Final External Action for Phase 4:
Add the following environment variables to your **Vercel Project Settings** (`https://vercel.com/<your-team>/cogent-compliance/settings/environment-variables`):
1. `R2_ACCOUNT_ID` = `00a2b3f3a9307ba587e18784e5115ec9`
2. `R2_ACCESS_KEY_ID` = `b78ee8426b8d1a36777e4b48f294a94b`
3. `R2_SECRET_ACCESS_KEY` = `<YOUR_R2_SECRET_ACCESS_KEY>`
4. `R2_BUCKET_NAME` = `cogent-marketing-shield-assets`
5. `RESEND_API_KEY` = `<YOUR_RESEND_API_KEY>`
6. `RESEND_FROM_EMAIL` = `compliance@notifications.stem-cogent.com`

---

# 6. PHASE 5: Google Gemini API & Inngest Production Setup (ACTION REQUIRED FOR PHASE 5)

In Phase 5, we build:
1. **Central Google Gemini Engine (`src/modules/ai-orchestration/gemini.service.ts`):** Single server-only wrapper around `@google/genai` supporting `gemini-2.5-pro` (compliance assessment, flyer OCR, rewrite generation), `gemini-2.5-flash` (low-latency copilot chat, web search synthesis), and `text-embedding-004` (768-dim vector embeddings). Automatically records latency, token counts, and cost in `ai_model_runs`.
2. **Two-Step Live Web Search Router (`src/modules/live-web-intelligence/web-search.router.ts`):** Isolated secondary `gemini-2.5-flash` call with `tools: [{ googleSearch: {} }]` prioritizing CBN, FCCPC, ARCON, NDPC, and SEC official domains.
3. **Inngest Durable Background Queue (`src/modules/jobs/inngest.client.ts` & `/api/inngest`):** Step-level retries (`step.run`), per-tenant concurrency limits, and tracking in `processing_jobs`.
4. **Golden 50 Nigerian Statutory Vault Seeding:** Ingesting and embedding the 5 Nigerian regulatory bodies and the Golden 50 Nigerian Regulatory Instruments.

Follow these step-by-step instructions to configure Google Gemini and Inngest.

---

## Task 5.1: Retrieve Google Gemini API Key

1. Open your browser and navigate to Google AI Studio:  
   👉 `https://aistudio.google.com/apikey` (log in with your Google account).
2. Click the blue button: **"Create API key"** (or select your existing enterprise project).
3. Select your Google Cloud project (or choose "Create API key in new project").
4. Copy the generated key (starts with `AIzaSy...`).
5. **Save this as `GEMINI_API_KEY`**.

---

## Task 5.2: Create Inngest Production Account & Project

1. Open your browser and navigate to:  
   👉 `https://app.inngest.com` (log in or create an Inngest account).
2. Click **"Create project"** (or use your default organization).
3. Name your project: `Cogent Marketing Shield` (or `cogent-compliance`).
4. In your project dashboard, navigate to **Settings** or **Event Keys**:
   - URL: `https://app.inngest.com/env/production/settings/keys`

---

## Task 5.3: Retrieve Inngest Event & Signing Keys

1. Under **Event Keys**, click **"Create event key"** (or copy default event key).  
   - Key Name: `Cogent Production App`.  
   - Copy the key (starts with `ingest_...` or hex string).  
   - **Save this as `INNGEST_EVENT_KEY`**.
2. Under **Signing Key**, find your project's signing key.  
   - Click the eye icon to reveal the signing key (starts with `signkey-prod-...` or hex string).  
   - **Save this as `INNGEST_SIGNING_KEY`**.
3. Under **Apps / Webhook Sync**, note down your production sync URL:  
   👉 `https://<YOUR-VERCEL-DOMAIN>/api/inngest`  
   *(Inngest connects to this endpoint to discover workflows and dispatch background jobs).*

---

## Task 5.4: Inject Gemini & Inngest Keys into Vercel and Local Environment

### In Vercel:
Go to **Settings** $\rightarrow$ **Environment Variables** and add:
- `GEMINI_API_KEY`: Your Google AI Studio API key (`AIzaSy...`)
- `INNGEST_EVENT_KEY`: Your Inngest event key
- `INNGEST_SIGNING_KEY`: Your Inngest signing key

### In Local Workspace:
Add to `.env.local`:
```bash
# Google Gemini API (@google/genai SDK)
GEMINI_API_KEY=<YOUR_GEMINI_API_KEY>

# Inngest Background Queue
INNGEST_EVENT_KEY=<YOUR_INNGEST_EVENT_KEY>
INNGEST_SIGNING_KEY=<YOUR_INNGEST_SIGNING_KEY>
```

---

## What to Provide to Kick Off Phase 5

Once you have reviewed this runbook and are ready for Phase 5, reply with:
1. Confirmation of Phase 4 sign-off.
2. Your Google Gemini API Key (`GEMINI_API_KEY`).
3. Your Inngest keys (`INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`).
*(Or confirm that you have added them directly to Vercel and `.env.local`).*

---

# 7. UPCOMING PHASES: Production Infrastructure Roadmap

### Phase 6 Preview: Vertical Slice 1 — Conversational Copilot Walking Skeleton
- **Module:** `/chat` workspace, SSE streaming, Evidence Drawer, Golden 50 RRF search.
- **Milestone:** The first interactive end-to-end regulatory compliance copilot interface.
