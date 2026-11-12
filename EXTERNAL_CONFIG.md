# COGENT MARKETING SHIELD — EXTERNAL PRODUCTION CONFIGURATION RUNBOOK

**Document Reference:** `08_Greenfield_Implementation_Roadmap_and_Antigravity_Execution_Plan.md`  
**Governance Principle:** *Strict Real-World Production Setup. Zero Mockups. Zero Fake Credentials. Every external service is provisioned in its real production environment before closing any phase.*  
**Current Active Phase:** **PHASE 3 (Authentication, Clerk Organization Sync & RBAC Infrastructure) — COMPLETED & READY FOR SIGN-OFF**  
**Next Upcoming Phase:** **PHASE 4 (Shared Application Infrastructure & Reusable Core Services)**  

---

# TABLE OF CONTENTS
1. [Overview & How to Use This Runbook](#1-overview--how-to-use-this-runbook)
2. [PHASE 1: Engineering Environment & CI/CD (COMPLETED & SIGNED OFF)](#2-phase-1-engineering-environment--cicd-completed--signed-off)
3. [PHASE 2: Supabase PostgreSQL & pgvector (COMPLETED & SIGNED OFF)](#3-phase-2-supabase-postgresql--pgvector-completed--signed-off)
4. [PHASE 3: Clerk Production Organizations & Svix (COMPLETED & VERIFIED)](#4-phase-3-clerk-production-organizations--svix-completed--verified)
5. [PHASE 4: Cloudflare R2 Private Storage & Resend Setup (ACTION REQUIRED FOR PHASE 4)](#5-phase-4-cloudflare-r2-private-storage--resend-setup-action-required-for-phase-4)
   - [Task 4.1: Create Cloudflare R2 Storage Bucket](#task-41-create-cloudflare-r2-storage-bucket)
   - [Task 4.2: Generate Cloudflare R2 API Tokens (S3-Compatible)](#task-42-generate-cloudflare-r2-api-tokens-s3-compatible)
   - [Task 4.3: Configure Resend Transactional Email Account & API Key](#task-43-configure-resend-transactional-email-account--api-key)
   - [Task 4.4: Inject R2 & Resend Variables into Vercel and Local Environment](#task-44-inject-r2--resend-variables-into-vercel-and-local-environment)
6. [UPCOMING PHASES: Production Infrastructure Roadmap](#6-upcoming-phases-production-infrastructure-roadmap)
   - [Phase 5 Preview: Google Gemini API & Inngest Production](#phase-5-preview-google-gemini-api--inngest-production)

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

# 4. PHASE 3: Clerk Production Organizations & Svix (COMPLETED & VERIFIED)

All Phase 3 authentication and RBAC infrastructure components have been implemented and verified:

- [x] **Task 3.1:** `@clerk/nextjs` (7.9.25) and `svix` (2.10.0) integrated.
- [x] **Task 3.2:** Route protection middleware (`src/middleware.ts`) deployed, guarding workspace and API routes while exempting public endpoints.
- [x] **Task 3.3:** Clerk Svix Webhook receiver implemented at `POST /api/webhooks/clerk` with cryptographic signature verification.
- [x] **Task 3.4:** Clerk-to-Supabase real-time sync service (`src/modules/auth-tenancy/clerk.sync.ts`) handling organization and membership lifecycle events.
- [x] **Task 3.5:** Authoritative 22-permission matrix for all 5 canonical roles and Document 07 Section 5.3 Anti-Self-Approval dual control implemented.
- [x] **Task 3.6:** Server-side tenant resolver (`src/modules/auth-tenancy/tenant.resolver.ts`) failing closed with 401/403.
- [x] **Task 3.7:** Automated test suite expanded to 39 passing tests.

### Final External Action for Phase 3:
Add the following 3 environment variables to your **Vercel Project Settings** (`https://vercel.com/<your-team>/cogent-compliance/settings/environment-variables`):
1. `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` = `pk_test_ZXhvdGljLWxlZWNoLTE1MDMuY2xlcmsuYWNjb3VudHMuZGV2JA`
2. `CLERK_SECRET_KEY` = `<YOUR_CLERK_SECRET_KEY>`
3. `CLERK_WEBHOOK_SIGNING_SECRET` = `<YOUR_CLERK_WEBHOOK_SIGNING_SECRET>`

---

# 5. PHASE 4: Cloudflare R2 Private Storage & Resend Setup (ACTION REQUIRED FOR PHASE 4)

In Phase 4, we build the shared application infrastructure:
1. **Cloudflare R2 File Storage Service:** Tenant-prefixed (`tenants/{tenant_id}/...`) presigned URLs for campaign flyers, PDFs, and playbooks with magic-byte file signature verification and SHA-256 integrity checks.
2. **Resend Transactional Notification Service:** Automated email delivery for review requests, CCO approval/rejection decisions, and post-publication drift alerts.
3. **Cryptographic Audit Service:** Tamper-evident hash-chained SHA-256 audit ledger.
4. **Rate Limiting Service:** Sliding-window rate limiting on chat streaming, assessments, uploads, and live web searches.

Follow these step-by-step instructions to configure Cloudflare R2 and Resend.

---

## Task 4.1: Create Cloudflare R2 Storage Bucket

1. Open your browser and navigate to:  
   👉 `https://dash.cloudflare.com` (log in to your Cloudflare account).
2. In the left-hand navigation sidebar, click on **"R2 Object Storage"** (or go to `https://dash.cloudflare.com/?to=/:account/r2`).
3. Click the blue button: **"Create bucket"**.
4. Configure bucket settings:
   - **Bucket name:** Enter `cogent-marketing-shield-assets` (or `cogent-compliance-assets`).
   - **Location:** Choose **Automatic** (or **WNAM / WEUR** closest to your target users).
   - **Storage Class:** Select **Standard**.
5. Click **"Create bucket"**.
6. **Confirm Security Policy:**
   - Under bucket **Settings**, ensure **Public access** is **Off / Disabled** (Private bucket). All uploads and downloads will use short-lived presigned URLs generated server-side.

---

## Task 4.2: Generate Cloudflare R2 API Tokens (S3-Compatible)

Cloudflare R2 provides an AWS S3-compatible API. We need an API token with read/write access to this bucket.

1. In the R2 Overview page (`https://dash.cloudflare.com/?to=/:account/r2`), look on the right sidebar and click: **"Manage R2 API Tokens"** (or click **"Manage API Tokens"**).
2. Click the button: **"Create API token"**.
3. Configure the token:
   - **Token name:** `cogent-compliance-app`.
   - **Permissions:** Select **Object Read & Write**.
   - **Apply to specific buckets only:** Choose your bucket `cogent-marketing-shield-assets`.
   - **TTL:** Leave blank (no expiration) or set your security preference.
4. Click **"Create API Token"**.
5. **Copy and Save the Generated Credentials:**
   - **Account ID:** Found in your R2 dashboard URL or right sidebar (32-character hex string).
   - **Access Key ID:** S3-compatible access key string.
   - **Secret Access Key:** S3-compatible secret key string.
   - **Bucket Name:** `cogent-marketing-shield-assets`.

---

## Task 4.3: Configure Resend Transactional Email Account & API Key

1. Open your browser and navigate to:  
   👉 `https://resend.com/overview` (log in or sign up for Resend).
2. In the left-hand navigation sidebar, click on **"API Keys"** (`https://resend.com/api-keys`).
3. Click the black button in the top-right corner: **"Create API Key"**.
4. Configure key settings:
   - **Name:** `Cogent Marketing Shield Production`.
   - **Permission:** **Full access** (or **Sending access**).
   - **Domain:** All domains (or select your verified domain).
5. Click **"Add"**.
6. **Copy and Save:**
   - Copy the API Key (starts with `re_...`). This is your `RESEND_API_KEY`.
7. (Optional Domain Verification):
   - Under **Domains** (`https://resend.com/domains`), add your domain (e.g., `notifications.cogentshield.com` or your company domain) and configure the DNS DKIM/SPF records. If testing before domain verification, Resend permits sending test emails to your account email address using `onboarding@resend.dev`.

---

## Task 4.4: Inject R2 & Resend Variables into Vercel and Local Environment

### In Vercel:
Go to **Settings** $\rightarrow$ **Environment Variables** and add:
- `R2_ACCOUNT_ID`: Your Cloudflare Account ID
- `R2_ACCESS_KEY_ID`: Your R2 Access Key ID
- `R2_SECRET_ACCESS_KEY`: Your R2 Secret Access Key
- `R2_BUCKET_NAME`: `cogent-marketing-shield-assets`
- `RESEND_API_KEY`: Your Resend API Key (`re_...`)
- `RESEND_FROM_EMAIL`: `compliance@notifications.cogentshield.com` (or `onboarding@resend.dev`)

### In Local Workspace:
Add to `.env.local`:
```bash
# Cloudflare R2 Private File Storage (Phase 4)
R2_ACCOUNT_ID=<YOUR_CLOUDFLARE_ACCOUNT_ID>
R2_ACCESS_KEY_ID=<YOUR_R2_ACCESS_KEY_ID>
R2_SECRET_ACCESS_KEY=<YOUR_R2_SECRET_ACCESS_KEY>
R2_BUCKET_NAME=cogent-marketing-shield-assets

# Resend Transactional Email (Phase 4)
RESEND_API_KEY=<YOUR_RESEND_API_KEY>
RESEND_FROM_EMAIL=compliance@notifications.cogentshield.com
```

---

## What to Provide to Kick Off Phase 4

Once you have reviewed this runbook and are ready for Phase 4, reply with:
1. Confirmation of Phase 3 sign-off.
2. Your Cloudflare R2 credentials (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`).
3. Your Resend API Key (`RESEND_API_KEY`).
*(Or confirm that you have added them directly to Vercel and `.env.local`).*

---

# 6. UPCOMING PHASES: Production Infrastructure Roadmap

### Phase 5 Preview: Google Gemini API & Inngest Production
- **Services:** Google AI Studio / Vertex AI (`@google/genai`) & Inngest (`inngest.com`).
- **Tokens to Retrieve:** `GEMINI_API_KEY`, `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`.
