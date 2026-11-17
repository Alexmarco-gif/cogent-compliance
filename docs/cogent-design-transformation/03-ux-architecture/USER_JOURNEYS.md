# User Journeys & Conversion Flows

**Purpose:** Map every primary buyer's journey from initial discovery on `/` through evaluation, onboarding, and paid Paystack activation—eliminating dead ends and login friction.

---

## Journey 1: Chief Compliance Officer (CCO) — Risk & Auditability Evaluation
- **Entry Trigger:** Learns about Cogent after an FCCPC digital lending notice or ARCON pre-vetting delay; lands on `/`.
- **Step 1 (0–10s on `/`):** Reads hero headline (*"Clear every campaign before the regulator does."*) and sees verifiable Nigerian scope (`CBN`, `FCCPC`, `ARCON`, `NDPC`, `SEC`).
- **Step 2 (10–45s):** Interacts with the Hero Workbench Preview or Capability Accordion—clicks a `BLOCK` finding (`182.4% Effective APR` / `Missing ARCON ASP ID`) and inspects the linked verbatim statutory clause and SHA-256 Dossier preview.
- **Step 3 (45–90s):** Navigates to `/regulatory-vault` or `/pricing` to confirm 2-year FCCPC Reg. 32 retention (`Scale` plan) and 7-year BOFIA retention (`Enterprise` plan) plus dual-control RBAC (Marketing cannot self-approve).
- **Conversion Action:** Clicks **"Start 7-Day Evaluation"** -> `/sign-up` -> `/onboarding/step-1` (selects `CHIEF_COMPLIANCE_OFFICER` role and institution scopes) -> `/onboarding/step-3` live sandbox audit -> `/chat`.

## Journey 2: Growth / Product Lead — Speed & Play Store / Ad Clearance
- **Entry Trigger:** Frustrated by 5–10 day legal queues or a Google Play loan-app policy rejection; lands on `/` or `/solutions#digital-lenders`.
- **Step 1:** Sees the **Before/After Remediation Diff** and **160-char SMS / KFS Generator** in the Platform Bento Grid.
- **Step 2:** Switches the Institution Vertical selector to **Digital Lenders**, seeing immediate proof of `<60-day` Play Store tenor detection and drip-pricing checks.
- **Step 3:** Reviews `/pricing` comparing `₦1.5M–₦5M/mo` external retainer turnaround against `$149/mo` (`Growth`) immediate pre-flight checks.
- **Conversion Action:** Clicks **"Start 7-Day Evaluation"** -> tests a real campaign flyer in `/onboarding/step-3` -> invites CCO via `/settings?tab=team`.

## Journey 3: General Counsel / Legal Officer — Citation Integrity Verification
- **Entry Trigger:** Skeptical of AI chatbots that fabricate Nigerian legal sections.
- **Step 1:** Jumps directly to `/platform` or `/regulatory-vault`.
- **Step 2:** Inspects the **Three-Source Separation** diagram (`[Verified Statutory Vault]` vs. `[Internal Playbook Rule]` vs. `[Live Web Intelligence]`) and the **7-Layer Guardrail** explanation.
- **Step 3:** Verifies that Cogent never outputs unverified citations and requires human sign-off (`approval.decide`) rather than claiming autonomous legal approval.
- **Conversion Action:** Signs up for Evaluation Pilot or requests Enterprise custom policy library onboarding.

## Journey 4: Returning Authenticated User
- **Entry Trigger:** Visits root domain `/`.
- **Behavior:** Sees the public marketing site with a prominent **"Open Workspace →"** button in the top-right header (no unexpected forced redirect away from `/` if they intentionally visited the storefront, while `/sign-in` / Clerk post-auth redirect continues routing straight to `/chat` or `/onboarding`).
- *Note for Phase 5 confirmation:* Check whether the user prefers `/` to always show the public marketing storefront (with `Open Workspace →` CTA when signed in) or auto-redirect signed-in users to `/chat`. Blueprint defaults to **always rendering `/` as the public marketing site** (standard SaaS pattern like Linear/Stripe/Vercel) with an `Open Workspace →` CTA when `userId` is active.
