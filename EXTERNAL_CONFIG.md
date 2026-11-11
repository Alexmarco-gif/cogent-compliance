# COGENT MARKETING SHIELD — EXTERNAL PRODUCTION CONFIGURATION RUNBOOK

**Document Reference:** `08_Greenfield_Implementation_Roadmap_and_Antigravity_Execution_Plan.md`  
**Governance Principle:** *Strict Real-World Production Setup. Zero Mockups. Zero Fake Credentials. Every external service is provisioned in its real production environment before closing any phase.*  
**Current Active Phase:** **PHASE 2 (Database Architecture, Composite Tenancy & Vector Foundation)**  

---

# TABLE OF CONTENTS
1. [Overview & How to Use This Runbook](#1-overview--how-to-use-this-runbook)
2. [PHASE 1: External Production Setup (COMPLETED & SIGNED OFF)](#2-phase-1-external-production-setup-completed--signed-off)
3. [PHASE 2: Supabase PostgreSQL & pgvector Setup (ACTIVE)](#3-phase-2-supabase-postgresql--pgvector-setup-active)
   - [Task 2.1: Create Real Supabase Production Project](#task-21-create-real-supabase-production-project)
   - [Task 2.2: Retrieve Production Database Keys & Connection Strings](#task-22-retrieve-production-database-keys--connection-strings)
   - [Task 2.3: Execute Versioned SQL Migration in Supabase](#task-23-execute-versioned-sql-migration-in-supabase)
   - [Task 2.4: Inject Supabase Credentials into Vercel and Local Environment](#task-24-inject-supabase-credentials-into-vercel-and-local-environment)
   - [Task 2.5: Verify 28 Tables, Composite Isolation & RLS](#task-25-verify-28-tables-composite-isolation--rls)
4. [UPCOMING PHASES: Production Infrastructure Roadmap](#4-upcoming-phases-production-infrastructure-roadmap)
   - [Phase 3 Preview: Clerk Production Organizations & Svix](#phase-3-preview-clerk-production-organizations--svix)
   - [Phase 4 Preview: Cloudflare R2 & Resend](#phase-4-preview-cloudflare-r2--resend)
   - [Phase 5 Preview: Google Gemini API & Inngest Production](#phase-5-preview-google-gemini-api--inngest-production)

---

# 1. Overview & How to Use This Runbook

This document is your **click-by-click, screen-by-screen external operations runbook**.

- For every phase, you will find exact URLs, exact navigation steps, exact button labels, exact form inputs, and exact verification tests.
- **Do not use "Sandbox / Development / Test-Only" mockups where production is needed.** Every step is configured for real enterprise production stability.
- **You must complete and verify all tasks in a phase before we proceed to write code for the next phase.**

---

# 2. PHASE 1: External Production Setup (COMPLETED & SIGNED OFF)

- [x] **Task 1.1:** GitHub Actions CI Pipeline verified on `main` branch.
- [x] **Task 1.2:** Vercel Production deployment active on Next.js 15.5.29.
- [x] **Task 1.3:** Better Stack Logtail Source Token connected: `xL1zCjM9t7iCAwHigBXrQDt9`.
- [x] **Task 1.4:** Better Uptime synthetic health monitor active on `/api/marketing-shield/v1/health`.
- [x] **Task 1.5:** Phase 1 sign-off confirmed on 2026-11-11.

---

# 3. PHASE 2: Supabase PostgreSQL & pgvector Setup (ACTIVE)

Complete the following 5 tasks to deploy all 28 canonical tables, vector indexes, and composite tenant isolation on Supabase.

---

## Task 2.1: Create Real Supabase Production Project

1. Open your browser and navigate to:  
   👉 `https://supabase.com/dashboard` (log in to your Supabase account).
2. Click on your Organization, then click the green button in the top-right: **"New project"** (or go to `https://supabase.com/dashboard/new`).
3. Fill out the project creation form with the following production settings:
   - **Organization:** Select your primary organization.
   - **Name:** Enter `cogent-compliance-production` (or `cogent-marketing-shield`).
   - **Database Password:** Click **"Generate a password"** $\rightarrow$ Click **"Copy"** and store it safely in your password manager. *(You will need this if connecting via psql / direct CLI).*
   - **Region:** Select **AWS Frankfurt (`eu-central-1`)** or **AWS London (`eu-west-2`)**.  
     *(CRITICAL: These regions offer the lowest packet round-trip latency to Nigeria and West Africa while maintaining GDPR / NDPA international compliance standards).*
   - **Pricing Plan:** Select **Free** tier (or **Pro** if you require Point-in-Time Recovery backups and expanded compute).
4. Click the green button at the bottom: **"Create new project"**.
5. **Wait for Provisioning:** Supabase will take approximately 90–120 seconds to provision your dedicated PostgreSQL instance, setup connection poolers, and initialize auth schemas.

---

## Task 2.2: Retrieve Production Database Keys & Connection Strings

Once the project setup dashboard is ready:

1. In the left-hand navigation sidebar, look all the way at the bottom and click the gear icon: **"Project Settings"** (⚙️).
2. In the Project Settings sub-menu, click on **"API"** (`https://supabase.com/dashboard/project/<YOUR-PROJECT-REF>/settings/api`):
   - Under **Project URL**, find **URL**. Click the copy button next to it.  
     *(This is your `NEXT_PUBLIC_SUPABASE_URL` — format: `https://<ref>.supabase.co`).*
   - Under **Project API Keys**, find the row named **`anon` `public`**. Click the copy button.  
     *(This is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`).*
   - Under **Project API Keys**, find the row named **`service_role` `secret`**. Click **"Reveal"**, then click the copy button.  
     *(This is your `SUPABASE_SERVICE_ROLE_KEY` — NEVER expose this on the client).*
3. In the left-hand navigation sub-menu, click on **"Database"** (`https://supabase.com/dashboard/project/<YOUR-PROJECT-REF>/settings/database`):
   - Scroll down to the **Connection string** section.
   - Click the **"URI"** tab.
   - Choose **"Transaction Pooler"** (Port 6543) or **"Direct connection"** (Port 5432).
   - Copy this URI string for CLI migrations.

---

## Task 2.3: Execute Versioned SQL Migration in Supabase

We will now apply the canonical migration file that creates all **28 tables**, composite foreign keys, vector indexes, RRF RPC functions, and Row Level Security policies.

1. Open the migration file in your local workspace:  
   👉 [`supabase/migrations/20261111000001_marketing_shield_schema.sql`](file:///home/antigravity/Alexmarco-gif/cogent-compliance/supabase/migrations/20261111000001_marketing_shield_schema.sql)
2. Select all content (`Ctrl+A` / `Cmd+A`) and copy it (`Ctrl+C` / `Cmd+C`).
3. In your Supabase Dashboard, look at the left sidebar and click the **"SQL Editor"** icon (terminal icon with `>_` or visit `https://supabase.com/dashboard/project/<YOUR-PROJECT-REF>/sql/new`).
4. Click the button: **"+ New query"**.
5. Paste the entire SQL script into the query editor.
6. Click the green button in the bottom-right corner: **"Run"** (or press `Ctrl+Enter` / `Cmd+Enter`).
7. **Verify Migration Execution:**
   - The query execution will take ~5–10 seconds.
   - In the results pane at the bottom, confirm that it says **"Success. No rows returned"** with a green checkmark.
   - In the left sidebar, click on **"Table Editor"** (table icon).
   - Confirm that all **28 canonical tables** appear in the list:
     - `tenants`, `tenant_memberships`
     - `marketing_conversations`, `marketing_messages`, `conversation_campaign_links`
     - `marketing_campaigns`, `campaign_status_history`, `campaign_products`
     - `campaign_assets`, `asset_extractions`, `asset_extraction_segments`
     - `campaign_claims`
     - `regulatory_bodies`, `regulatory_instruments`, `regulatory_document_versions`, `regulatory_clauses`, `regulatory_obligations`, `applicability_rules`
     - `marketing_knowledge_documents`, `marketing_knowledge_chunks`, `marketing_knowledge_rules`, `prohibited_terms`
     - `live_web_retrievals`
     - `campaign_assessments`, `compliance_findings`, `finding_evidence`, `assessment_evidence_snapshots`
     - `campaign_revisions`, `campaign_reviews`, `campaign_approvals`, `campaign_drift_monitors`
     - `ai_model_runs`, `ai_tool_calls`, `processing_jobs`, `marketing_audit_events`

---

## Task 2.4: Inject Supabase Credentials into Vercel and Local Environment

Now connect your live Vercel deployment and local environment to your real Supabase instance.

### In Vercel:
1. Open your Vercel Dashboard $\rightarrow$ select `cogent-compliance`.
2. Go to **Settings** $\rightarrow$ **Environment Variables**.
3. Add the following three variables:
   - **Variable 1:**
     - Key: `NEXT_PUBLIC_SUPABASE_URL`
     - Value: `<YOUR-PROJECT-URL>` (e.g. `https://xxxx.supabase.co`)
     - Environments: Check `Production`, `Preview`, `Development`.
     - Click **Save**.
   - **Variable 2:**
     - Key: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - Value: `<YOUR-ANON-PUBLIC-KEY>`
     - Environments: Check `Production`, `Preview`, `Development`.
     - Click **Save**.
   - **Variable 3:**
     - Key: `SUPABASE_SERVICE_ROLE_KEY`
     - Value: `<YOUR-SERVICE-ROLE-SECRET-KEY>`
     - Environments: Check `Production`, `Preview`.
     - Click **Save**.

### In Local Workspace:
Create or update your `.env.local` file with the exact values:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://<YOUR-PROJECT-REF>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<YOUR-ANON-KEY>
SUPABASE_SERVICE_ROLE_KEY=<YOUR-SERVICE-ROLE-KEY>
```

---

## Task 2.5: Verify 28 Tables, Composite Isolation & RLS

1. Run the database tenant-isolation integration test locally:
   ```bash
   pnpm test:db
   ```
2. Verify that all 4 tests pass:
   - Composite `UNIQUE (tenant_id, id)` constraints on parent tables.
   - Composite `FOREIGN KEY (tenant_id, parent_id)` on child tables.
   - `ON DELETE RESTRICT` on historical compliance records.
   - Live cross-tenant insertion rejection (PostgreSQL code `23503`).

---

## What to Provide to Close Phase 2

Once you have executed Tasks 2.1 through 2.4, reply with:
1. **Your Supabase Project URL** (e.g., `https://xxxx.supabase.co`)
2. **Confirmation** that the SQL migration was executed with 28 tables visible in Table Editor
3. **Your `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`** (keep `SUPABASE_SERVICE_ROLE_KEY` in Vercel/`.env.local`)

Once provided, I will run the live database verification check, update [`WORKFLOW.md`](file:///home/antigravity/Alexmarco-gif/cogent-compliance/WORKFLOW.md), and unlock **Phase 3 (Authentication, Clerk Organization Sync & RBAC Infrastructure)**!

---

# 4. UPCOMING PHASES: Production Infrastructure Roadmap

### Phase 3 Preview: Clerk Production Organizations & Svix
- **Service:** Clerk (Authentication & Tenant RBAC Sync).
- **Production Requirements:** Real Clerk Production instance, custom domain, **Organizations** enabled, Svix Webhook endpoint configured pointing to `/api/webhooks/clerk`, 5 RBAC roles configured.
- **Tokens to Retrieve:** `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SIGNING_SECRET`.

### Phase 4 Preview: Cloudflare R2 & Resend
- **Services:** Cloudflare R2 (Private Object Storage) & Resend (Transactional Notifications).
- **Tokens to Retrieve:** `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `RESEND_API_KEY`.

### Phase 5 Preview: Google Gemini API & Inngest Production
- **Services:** Google AI Studio / Vertex AI & Inngest.
- **Tokens to Retrieve:** `GEMINI_API_KEY`, `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`.
