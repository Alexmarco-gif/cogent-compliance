# COGENT MARKETING SHIELD — EXTERNAL PRODUCTION CONFIGURATION RUNBOOK

**Document Reference:** `08_Greenfield_Implementation_Roadmap_and_Antigravity_Execution_Plan.md`  
**Governance Principle:** *Strict Real-World Production Setup. Zero Mockups. Zero Fake Credentials. Every external service is provisioned in its real production environment before closing any phase.*  
**Current Active Phase:** **PHASE 2 (Database Architecture, Composite Tenancy & Vector Foundation) — COMPLETED & READY FOR SIGN-OFF**  
**Next Upcoming Phase:** **PHASE 3 (Authentication, Clerk Organization Sync & RBAC Infrastructure)**  

---

# TABLE OF CONTENTS
1. [Overview & How to Use This Runbook](#1-overview--how-to-use-this-runbook)
2. [PHASE 1: External Production Setup (COMPLETED & SIGNED OFF)](#2-phase-1-external-production-setup-completed--signed-off)
3. [PHASE 2: Supabase PostgreSQL & pgvector Setup (COMPLETED & VERIFIED)](#3-phase-2-supabase-postgresql--pgvector-setup-completed--verified)
4. [PHASE 3: Clerk Production Organizations & Svix Webhook Setup (ACTION REQUIRED FOR PHASE 3)](#4-phase-3-clerk-production-organizations--svix-webhook-setup-action-required-for-phase-3)
   - [Task 3.1: Create Clerk Production Application](#task-31-create-clerk-production-application)
   - [Task 3.2: Enable Clerk Organizations](#task-32-enable-clerk-organizations)
   - [Task 3.3: Configure Roles & Permissions Mapping](#task-33-configure-roles--permissions-mapping)
   - [Task 3.4: Configure Clerk Svix Webhook Endpoint](#task-34-configure-clerk-svix-webhook-endpoint)
   - [Task 3.5: Retrieve API Keys & Webhook Signing Secret](#task-35-retrieve-api-keys--webhook-signing-secret)
   - [Task 3.6: Add Clerk Environment Variables to Vercel & Local Environment](#task-36-add-clerk-environment-variables-to-vercel--local-environment)
5. [UPCOMING PHASES: Production Infrastructure Roadmap](#5-upcoming-phases-production-infrastructure-roadmap)
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

# 3. PHASE 2: Supabase PostgreSQL & pgvector Setup (COMPLETED & VERIFIED)

All Phase 2 database requirements have been deployed and verified against the live Supabase instance:

- **Project ID:** `igrcwfojsliohdhivhby`
- **Region:** AWS Frankfurt (`eu-central-1`)
- **Live Supabase URL:** `https://igrcwfojsliohdhivhby.supabase.co`
- **Extensions Verified:** `vector` (version 0.8.2), `pgcrypto` (version 1.3)
- **Tables Deployed & Verified:** 35 tables in `public` schema (all 28 canonical Marketing Shield tables)
- **Stored Procedures Deployed:**
  1. `search_regulatory_clauses_rrf(p_tenant_id, p_query_text, p_query_embedding, p_match_count, p_rrf_k)`
  2. `search_knowledge_chunks_rrf(p_tenant_id, p_query_text, p_query_embedding, p_match_count, p_rrf_k)`
- **Composite Multi-Tenancy Constraints:** 16 composite foreign keys enforcing `(tenant_id, id)` linkage
- **Live Cross-Tenant Isolation Verified:** Cross-tenant insertion rejected by PostgreSQL with foreign key violation code `23503`

### Final External Action for Phase 2:
Add the following 3 environment variables to your **Vercel Project Settings** (`https://vercel.com/<your-team>/cogent-compliance/settings/environment-variables`):
1. `NEXT_PUBLIC_SUPABASE_URL` = `https://igrcwfojsliohdhivhby.supabase.co`
2. `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `sb_publishable_YCP6X5J1BLZhpfSQoDLZTg_EO8oTd0j`
3. `SUPABASE_SERVICE_ROLE_KEY` = `<YOUR_SUPABASE_SERVICE_ROLE_SECRET_KEY>`

---

# 4. PHASE 3: Clerk Production Organizations & Svix Webhook Setup (ACTION REQUIRED FOR PHASE 3)

Follow these exact click-by-click instructions to configure your Clerk production authentication, multi-tenant organization sync, and Svix webhook.

---

## Task 3.1: Create Clerk Production Application

1. Open your browser and navigate to:  
   👉 `https://dashboard.clerk.com` (log in to your Clerk account).
2. If you already have an existing Clerk organization, click the **"Add application"** button (or navigate to `https://dashboard.clerk.com/apps/new`).
3. Fill out the application creation form:
   - **Application name:** Enter `Cogent Marketing Shield` (or `Cogent Compliance`).
   - **How will your users sign in?:**
     - Check: **Email** (Email code or link).
     - (Optional): Check **Google** (OAuth).
   - Click the purple button: **"Create application"**.
4. In the top navigation banner, confirm whether the environment badge says **"Production"** or **"Development"**:
   - For initial enterprise setup, Clerk provides a Production setup wizard or you can choose your production domain.
   - If prompted to connect a custom domain or configure production, click **"Configure for Production"** or select your Production instance.

---

## Task 3.2: Enable Clerk Organizations

Each Nigerian financial institution (bank, fintech, insurer) is represented in Clerk as an **Organization**. This provides natural multi-tenancy that syncs directly into the Supabase `tenants` and `tenant_memberships` tables.

1. In the left-hand navigation menu of the Clerk Dashboard, look under the **"Configure"** or **"Organization Settings"** section.
2. Click on **"Organizations"** (`https://dashboard.clerk.com/apps/<app-id>/instances/<instance-id>/organizations/settings`).
3. Set the toggle for **"Enable Organizations"** to **ON / Enabled**.
4. Configure organization permissions and limits:
   - **Max allowed memberships per user:** Set to `5` (or leave default).
   - **Allowed roles:** We will configure the 5 canonical roles in Task 3.3.
5. Click **"Save changes"**.

---

## Task 3.3: Configure Roles & Permissions Mapping

In Document 07 and Document 08, Cogent Marketing Shield enforces **5 canonical RBAC roles** and a locked **22-permission matrix**:

| Canonical Role | Clerk Role Key | Description |
|---|---|---|
| **Chief Compliance Officer** | `org:chief_compliance_officer` (or `org:admin`) | Executive authority: approves/rejects revisions, publishes rules, views audit trail |
| **Legal Counsel** | `org:legal_counsel` | Legal authority: approves/rejects revisions, creates playbooks, views audit trail |
| **Compliance Analyst** | `org:compliance_analyst` | Operational compliance: drafts playbooks, reviews findings, cannot approve campaigns |
| **Marketing / Growth** | `org:marketing_growth` (or `org:member`) | Campaign author: creates campaigns, uploads assets, proposes revisions, submits for review |
| **Workspace Admin** | `org:workspace_admin` | Technical admin: manages organization users, configures integrations, publishes rules |

*(Note: In Clerk, custom organization roles are available under **Organizations $\rightarrow$ Roles & Permissions**. If using the standard Clerk roles, `org:admin` maps to Chief Compliance Officer / Workspace Admin, and `org:member` maps to Marketing / Growth. Our backend authorizer `src/modules/auth-tenancy/` dynamically maps both standard and custom Clerk role keys).*

---

## Task 3.4: Configure Clerk Svix Webhook Endpoint

Clerk uses **Svix** under the hood to deliver signed webhooks. When an organization is created or a user is added to a tenant in Clerk, a webhook fires to our API endpoint to immediately provision or update the tenant row in Supabase.

1. In the left-hand navigation menu, click on **"Configure"** $\rightarrow$ **"Webhooks"** (`https://dashboard.clerk.com/apps/<app-id>/instances/<instance-id>/webhooks`).
2. Click the purple button in the top-right corner: **"+ Add Endpoint"**.
3. In the **Endpoint URL** field, enter your production Vercel URL with the webhook route:  
   👉 `https://<YOUR-VERCEL-DOMAIN>/api/webhooks/clerk`  
   *(For example: `https://cogent-compliance-xxx.vercel.app/api/webhooks/clerk`).*
4. Under **Message Filtering** / **Subscribe to events**, select the following 9 events:
   - **Organization events:**
     - `organization.created`
     - `organization.updated`
     - `organization.deleted`
   - **Organization Membership events:**
     - `organizationMembership.created`
     - `organizationMembership.updated`
     - `organizationMembership.deleted`
   - **User events:**
     - `user.created`
     - `user.updated`
     - `user.deleted`
5. Click **"Create"** at the bottom of the modal.
6. **Retrieve the Webhook Signing Secret:**
   - In the webhook details page that opens, locate the box on the right titled **"Signing Secret"**.
   - Click the eye icon to reveal the secret (starts with `whsec_...`).
   - Click the copy button next to it.
   - **Save this as `CLERK_WEBHOOK_SIGNING_SECRET`**.

---

## Task 3.5: Retrieve API Keys & Webhook Signing Secret

1. In the Clerk left-hand navigation menu, click on **"API Keys"** (`https://dashboard.clerk.com/apps/<app-id>/instances/<instance-id>/api-keys`).
2. Under **Quick Copy**, find:
   - **Publishable key:** Starts with `pk_live_...` (or `pk_test_...` if in development).  
     *(This is your `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`).*
   - **Secret key:** Starts with `sk_live_...` (or `sk_test_...`). Click **"Copy"**.  
     *(This is your `CLERK_SECRET_KEY`).*
3. You now have the three required Clerk credentials:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
   - `CLERK_WEBHOOK_SIGNING_SECRET`

---

## Task 3.6: Add Clerk Environment Variables to Vercel & Local Environment

### In Vercel:
1. Open your Vercel Dashboard $\rightarrow$ select `cogent-compliance`.
2. Go to **Settings** $\rightarrow$ **Environment Variables**.
3. Add the three variables:
   - Key: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Value: `pk_...` | Environments: `Production`, `Preview`, `Development`
   - Key: `CLERK_SECRET_KEY` | Value: `sk_...` | Environments: `Production`, `Preview`
   - Key: `CLERK_WEBHOOK_SIGNING_SECRET` | Value: `whsec_...` | Environments: `Production`, `Preview`
4. Click **Save** on each.

### In Local Workspace:
Add them to your `.env.local` file:
```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
CLERK_WEBHOOK_SIGNING_SECRET=whsec_...
```

---

## What to Provide to Kick Off Phase 3

Once you have reviewed this runbook and are ready for Phase 3, provide:
1. Confirmation of Phase 2 Sign-Off.
2. Confirmation that the 3 Supabase variables were added to Vercel.
3. Your Clerk credentials:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
   - `CLERK_WEBHOOK_SIGNING_SECRET`
   *(Or confirm you have added them directly to Vercel and `.env.local`).*

---

# 5. UPCOMING PHASES: Production Infrastructure Roadmap

### Phase 4 Preview: Cloudflare R2 & Resend
- **Services:** Cloudflare R2 (Private Object Storage) & Resend (Transactional Notifications).
- **Tokens to Retrieve:** `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `RESEND_API_KEY`.

### Phase 5 Preview: Google Gemini API & Inngest Production
- **Services:** Google AI Studio / Vertex AI & Inngest.
- **Tokens to Retrieve:** `GEMINI_API_KEY`, `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`.
