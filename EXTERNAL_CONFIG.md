# COGENT MARKETING SHIELD — EXTERNAL PRODUCTION CONFIGURATION RUNBOOK

**Document Reference:** `08_Greenfield_Implementation_Roadmap_and_Antigravity_Execution_Plan.md`  
**Governance Principle:** *Strict Real-World Production Setup. Zero Mockups. Zero Fake Credentials. Every external service is provisioned in its real production environment before closing any phase.*  
**Current Active Phase:** **PHASE 1 (Engineering Environment, Repository & CI/CD Baseline)**  

---

# TABLE OF CONTENTS
1. [Overview & How to Use This Runbook](#1-overview--how-to-use-this-runbook)
2. [PHASE 1: External Production Setup (ACTIVE)](#2-phase-1-external-production-setup-active)
   - [Task 1.1: Verify GitHub Actions CI Run](#task-11-verify-github-actions-ci-run)
   - [Task 1.2: Vercel Production Project Setup & Deployment](#task-12-vercel-production-project-setup--deployment)
   - [Task 1.3: Better Stack Logs Ingestion Setup](#task-13-better-stack-logs-ingestion-setup)
   - [Task 1.4: Better Uptime Synthetic Monitor Configuration](#task-14-better-uptime-synthetic-monitor-configuration)
   - [Task 1.5: Verification & Gate Sign-Off Proof](#task-15-verification--gate-sign-off-proof)
3. [UPCOMING PHASES: Production Infrastructure Roadmap](#3-upcoming-phases-production-infrastructure-roadmap)
   - [Phase 2 Preview: Supabase PostgreSQL & pgvector](#phase-2-preview-supabase-postgresql--pgvector)
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

# 2. PHASE 1: External Production Setup (ACTIVE)

Complete the following 4 tasks to satisfy the Phase 1 External Gate.

---

## Task 1.1: Verify GitHub Actions CI Run

Before deploying to Vercel, verify that the automated CI pipeline has executed and passed on GitHub.

### Step-by-Step Instructions:
1. Open your browser and navigate to:  
   👉 `https://github.com/Alexmarco-gif/cogent-compliance/actions`
2. Under **"All workflows"**, you will see a workflow named **"Cogent CI Pipeline"**.
3. Look for the workflow run triggered by the latest commit (`b1d7d91` — *"feat(phase-1): establish engineering environment..."*).
4. Click on that workflow run to open the execution view.
5. In the left panel, click on the job named **"Typecheck, Lint, Test & Build"**.
6. Verify that each step has a **green checkmark (`✓`)**:
   - `✓ Checkout Source Code`
   - `✓ Setup pnpm`
   - `✓ Setup Node.js (22.x LTS)`
   - `✓ Install Dependencies` (`pnpm install --frozen-lockfile`)
   - `✓ Strict TypeScript Verification` (`pnpm typecheck`)
   - `✓ ESLint Verification` (`pnpm lint`)
   - `✓ Vitest Unit Test Suite` (`pnpm test:unit` — 9 tests passing)
   - `✓ Production Build Check` (`pnpm build`)
7. **Gate Requirement:** The overall workflow status MUST show **"This workflow run completed successfully"** with a green checkmark.

---

## Task 1.2: Vercel Production Project Setup & Deployment

We now connect your GitHub repository to **Vercel** to establish the live production edge hosting.

### Step-by-Step Instructions:
1. Open your browser and navigate to:  
   👉 `https://vercel.com` (log in to your account).
2. Go to your dashboard: `https://vercel.com/dashboard`.
3. In the top-right corner, click the blue or black button: **"Add New..."** $\rightarrow$ select **"Project"** from the dropdown menu (or go directly to `https://vercel.com/new`).
4. Under the section **"Import Git Repository"**:
   - If your GitHub account is not connected to Vercel, click **"Add GitHub Account"** and follow the GitHub prompt to install the Vercel GitHub App with access to `Alexmarco-gif/cogent-compliance`.
   - In the search bar, type `cogent-compliance`.
   - When `Alexmarco-gif/cogent-compliance` appears in the list, click the blue button **"Import"** next to it.
5. You are now on the **"Configure Project"** screen:
   - **Project Name:** Keep the default `cogent-compliance` (or name it `cogent-marketing-shield`).
   - **Framework Preset:** Confirm that Vercel has automatically selected **Next.js**.
   - **Root Directory:** Leave it as `./` (do not change).
   - **Build and Output Settings:** Leave all toggles at their defaults (Vercel automatically runs `pnpm build` using the committed `pnpm-lock.yaml`).
6. **Environment Variables Configuration (Crucial):**
   - Click to expand the **"Environment Variables"** accordion section.
   - Add the following variable:
     - **Key:** `SKIP_ENV_VALIDATION`
     - **Value:** `true`
     - **Target Environments:** Check all three boxes: `Production`, `Preview`, and `Development`.
     - Click the **"Add"** button.
     *(Note: This allows Next.js to build and deploy cleanly on Vercel while we configure external services phase-by-phase. In subsequent phases, real secrets will be added here).*
   - Add the second variable:
     - **Key:** `NODE_ENV`
     - **Value:** `production`
     - **Target Environments:** `Production`.
     - Click the **"Add"** button.
7. Click the black button: **"Deploy"** at the bottom of the page.
8. **Wait for Build & Deployment:**
   - Vercel will clone the repo, run `pnpm install`, run `pnpm build`, and upload the serverless edge lambdas.
   - This takes approximately 45–75 seconds.
   - When finished, you will see a screen with confetti stating **"Congratulations! You just deployed a new Next.js project to Vercel."**
9. Click the button: **"Continue to Dashboard"**.
10. **Retrieve & Test Your Production URL:**
    - On your project dashboard, find the **Domains** section (e.g., `https://cogent-compliance.vercel.app` or `https://cogent-compliance-alexmarco-gifs-projects.vercel.app`).
    - Copy this production URL.
    - Open a new browser tab and navigate to:  
      👉 `https://<YOUR-VERCEL-DOMAIN>/api/marketing-shield/v1/health`
    - You must see a valid JSON response:
      ```json
      {
        "success": true,
        "data": {
          "status": "healthy",
          "service": "Cogent Marketing Shield",
          "version": "2.0.0",
          "architecture": "Modular Monolith with Asynchronous Workers",
          "environment": "production",
          "timestamp": "..."
        },
        "meta": {
          "request_id": "...",
          "timestamp": "..."
        }
      }
      ```
    - Check the response header: verify that `X-Request-ID` is returned in the response headers.

---

## Task 1.3: Better Stack Logs Ingestion Setup

Better Stack Logs (Logtail) is our locked production observability sink. We will configure it to ingest all logs from Vercel in real time.

### Step-by-Step Instructions:
1. Open your browser and navigate to:  
   👉 `https://telemetry.betterstack.com` (sign in or create a free account).
2. In the left sidebar navigation, click on **"Sources"** (or visit `https://telemetry.betterstack.com/sources`).
3. Click the black button in the top-right corner: **"Connect source"**.
4. In the search/filter box, type `Vercel` or scroll to find the **Vercel** integration card.
5. Click on the **Vercel** card:
   - Click the button **"Install Vercel Integration"** or **"Connect Vercel"**.
   - A Vercel authorization window will pop up.
   - Select your Vercel account/team.
   - Choose **"Specific Projects"** $\rightarrow$ select `cogent-compliance`.
   - Click **"Add Integration"** or **"Install"**.
   - Better Stack and Vercel will now be linked via an official Vercel Log Drain. Every single console log, API request, error, and `route.ts` execution will automatically flow directly into Better Stack Logs without any code changes!
6. **Configure Direct Server Logger Token (Optional / High Redundancy):**
   - In Better Stack, go back to **"Sources"** $\rightarrow$ click **"Connect source"**.
   - Select **"Node.js"** / **"JavaScript"**.
   - Name the source: `cogent-production-server`.
   - Platform: `Node.js`.
   - Click **"Save source"**.
   - Better Stack will generate and display a **Source Token** (e.g. `abc123xyz456...`).
   - Copy this Source Token.
   - Go back to your Vercel Dashboard $\rightarrow$ **Settings** $\rightarrow$ **Environment Variables**.
   - Add new variable:
     - **Key:** `BETTER_STACK_LOGTAIL_SOURCE_TOKEN`
     - **Value:** `<YOUR_COPIED_TOKEN>`
     - **Environments:** Check `Production` and `Preview`.
     - Click **Save**.
7. **Verify Live Log Ingestion:**
   - In Better Stack, click **"Live tail"** in the left sidebar (`https://telemetry.betterstack.com/tail`).
   - Open your browser in another window and refresh your live health check URL (`https://<YOUR-VERCEL-DOMAIN>/api/marketing-shield/v1/health`) 2 or 3 times.
   - Within 2–5 seconds, you will see structured JSON logs appear in Better Stack Live Tail:
     `{"level":"info","message":"System health check requested","context":{"endpoint":"/api/marketing-shield/v1/health","method":"GET","requestId":"..."}}`
   - **Gate Requirement:** Confirm that logs from your live Vercel deployment are visibly streaming into Better Stack.

---

## Task 1.4: Better Uptime Synthetic Monitor Configuration

Better Uptime monitors platform availability, warns of outages, and tracks response latency.

### Step-by-Step Instructions:
1. Open your browser and navigate to:  
   👉 `https://betteruptime.com` (or click **"Uptime"** in the top navigation bar of Better Stack).
2. In the left sidebar, click on **"Monitors"** (`https://uptime.betterstack.com/monitors`).
3. In the top-right corner, click the button: **"Create monitor"**.
4. Fill in the monitor form with the following production values:
   - **What to monitor:** Select the radio button **"URL / IP"** (default).
   - **URL to monitor:** Paste your exact live health check URL:  
     `https://<YOUR-VERCEL-DOMAIN>/api/marketing-shield/v1/health`
   - **Monitor name:** Enter:  
     `Cogent Marketing Shield - Production API Gateway Health`
   - **Alert us when:** Ensure it is set to:  
     `URL becomes unavailable or returns HTTP status other than 200`
   - **Check frequency:** Select `1 minute` (or `3 minutes`).
   - **Advanced settings (Click to expand):**
     - **HTTP Method:** `GET`
     - **Request timeout:** `10 seconds`
     - **Request headers:**
       - Header Name: `X-Request-ID`
       - Header Value: `synthetic-uptime-monitor`
   - **How should we notify you?:**
     - Check **"Email"** and enter your primary notification email.
     - (Optional) Enter your mobile phone number for urgent SMS/call alerts.
5. Click the green/black button at the bottom: **"Create monitor"**.
6. **Verify Monitor Status:**
   - Better Uptime will immediately issue an initial probe to your endpoint.
   - Within 15 seconds, the monitor row must display a green circle and the word **"Operational"** with response latency (e.g. `~85 ms`) and `100%` uptime.
   - **Gate Requirement:** The monitor must be active and displaying **"Operational"**.

---

## Task 1.5: Verification & Gate Sign-Off Proof

Once you have completed Tasks 1.1 through 1.4, provide the following details in your chat response so we can record them in `WORKFLOW.md` and officially close Phase 1:

1. **Vercel Production Health URL:** (e.g., `https://cogent-compliance-xxx.vercel.app/api/marketing-shield/v1/health`)
2. **GitHub Actions CI Status:** Confirm green checkmark on commit `b1d7d91`.
3. **Better Stack Logs Status:** Confirm live log stream is verified.
4. **Better Uptime Status:** Confirm monitor shows green "Operational".

Once provided, Phase 1 will be marked **COMPLETED** in `WORKFLOW.md`, and we will immediately initiate **Phase 2 (Database Architecture, Composite Tenancy & Vector Foundation)**.

---

# 3. UPCOMING PHASES: Production Infrastructure Roadmap

*(Keep this section as reference. Detailed click-by-click instructions will be added for each phase when its gate opens).*

### Phase 2 Preview: Supabase PostgreSQL & pgvector
- **Service:** Supabase (Database & Vector Engine).
- **Region:** AWS Frankfurt (`eu-central-1`) or AWS London (`eu-west-2`) (lowest latency to Nigeria).
- **Production Requirements:** PostgreSQL 15+, `pgvector` extension enabled, Point-in-Time Recovery (PITR) backup enabled, Composite Tenant Foreign Keys, and strict Row Level Security (RLS) on all 22 tenant-owned tables.
- **Tokens to Retrieve:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

### Phase 3 Preview: Clerk Production Organizations & Svix
- **Service:** Clerk (Authentication & Tenant RBAC Sync).
- **Production Requirements:** Real Clerk Production instance (not development instance), custom domain or production subdomain, **Organizations** enabled, Svix Webhook endpoint configured pointing to `/api/webhooks/clerk`, 5 RBAC roles configured (`MARKETING_GROWTH`, `COMPLIANCE_ANALYST`, `LEGAL_COUNSEL`, `CHIEF_COMPLIANCE_OFFICER`, `WORKSPACE_ADMIN`).
- **Tokens to Retrieve:** `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SIGNING_SECRET`.

### Phase 4 Preview: Cloudflare R2 & Resend
- **Services:** Cloudflare R2 (Private Object Storage) & Resend (Transactional Notifications).
- **Production Requirements:**
  - Cloudflare: Private R2 Bucket (`cogent-compliance-production`), Zero public access, CORS rules for presigned uploads, R2 API Token with Object Read & Write permissions.
  - Resend: Verified domain DNS records (DKIM, SPF, DMARC), Production API key.
- **Tokens to Retrieve:** `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `RESEND_API_KEY`.

### Phase 5 Preview: Google Gemini API & Inngest Production
- **Services:** Google AI Studio / Vertex AI & Inngest.
- **Production Requirements:**
  - Google Gemini API: Production API key with access to `gemini-2.5-pro`, `gemini-2.5-flash`, and `text-embedding-004`.
  - Inngest: Production Inngest environment linked to Vercel production webhook (`/api/inngest`), signing keys configured.
- **Tokens to Retrieve:** `GEMINI_API_KEY`, `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`.
