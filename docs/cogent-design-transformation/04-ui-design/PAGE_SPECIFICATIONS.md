# Page Specifications (Wireframe-to-Spec Blueprint)

**Scope:** Detailed section-by-section blueprint for all Wave 1 public marketing pages (`/`, `/platform`, `/solutions`, `/regulatory-vault`, `/pricing`) plus Wave 2 pages (`/resources/faq`, `/company`).

---

## 1. Homepage (`/`) — `src/app/page.tsx`

*Note: Currently `src/app/page.tsx` only performs server-side redirects. In Phase 5, `/` becomes the public marketing storefront while authenticated post-login flows still direct to `/chat` or `/onboarding` via Clerk callbacks.*

| Section | Layout Grid | Components Used | Key Data / Interactions |
|---|---|---|---|
| **Header** | Sticky `h-16` (`border-b border-zinc-200/80 bg-white/90 backdrop-blur`) | `<MarketingHeader />` | `CogentLogo`, 4 nav items (`Platform`, `Solutions`, `Statutory Vault`, `Pricing`), dynamic CTA (`Sign in` + `Start 7-Day Evaluation`, or `Open Workspace →` if signed in). |
| **1. Hero & Workbench Stage** | Centered stack (`max-w-[1200px]`), H1 `max-w-3xl`, Stage `max-w-5xl` | `<HeroWorkbenchDemo />` | Interactive 3-tab demo (`Loan Flyer Audit`, `Live URL Drift`, `App Store Policy`) + working simulated `[Apply Compliant Rewrite]` toggle that flips gate from `BLOCK` to `PASS`. |
| **2. Statutory Corpus Strip** | Single horizontal band (`border-y border-zinc-200 bg-zinc-50`) | `<RegulatorStrip />` | Lists `CBN (94)`, `FCCPC (17)`, `ARCON (11)`, `NDPC (4)`, `SEC (15)` — exact disk counts from `data/statutory-vault/`, linking to `/regulatory-vault`. |
| **3. Problem Contrast Band** | Dark Obsidian section (`bg-zinc-950 text-white py-24`) | `<ExposureContrastGrid />` | Centered statement + 2×2 architectural grid detailing hallucinated AI, drip pricing, ARCON/Play Store penalties, and 2-year retention gaps. |
| **4. Institution Switcher** | 12-col split (`bg-white py-24`) | `<LicenseVerticalSwitcher />` | 4 vertical tabs (`Digital Lenders`, `MFBs & Banks`, `PSBs & MMOs`, `WealthTech & VASPs`); renders active ruleset, real blind-spot example, and statutory citation card. |
| **5. Core Engine Bento** | Asymmetric 12-col grid (`bg-zinc-50 border-y border-zinc-200 py-24`) | `<ComplianceEngineBento />` | 5 distinct capability cards with embedded coded UI micro-previews (3-Source Stack, APR Calculator, Flyer Forensics, App Store/License Matrix, SHA-256 Dossier/Drift). |
| **6. Interactive Walkthrough** | 5-col accordion + 7-col preview frame (`bg-white py-24`) | `<StudioWalkthrough />` | 4 interactive workflow steps updating the framed Studio/Dossier preview on the right. |
| **7. 4-Step Activation Flow** | 4-col stepped sequence (`bg-zinc-50 border-y border-zinc-200 py-20`) | `<AdoptionSteps />` | `01 Scope` -> `02 Rate Card` -> `03 Sandbox Audit` -> `04 Seal & Monitor`, matching `/onboarding` reality. |
| **8. Comparison Matrix** | Centered `max-w-5xl` crisp table (`bg-white py-24`) | `<CompetitorComparisonTable />` | Compares **External Legal Retainer**, **Generic AI Chatbots**, and **Cogent Marketing Shield** across 7 buyer criteria. |
| **9. Executive CTA + Footer** | Cobalt/Alabaster or Obsidian split CTA + 5-col footer | `<ExecutiveCtaBanner />`, `<MarketingFooter />` | *"Start your 7-day evaluation pilot — 3 live campaign audits included."* Links to `/sign-up` and `/pricing`. |

---

## 2. Platform Architecture Page (`/platform`)

- **Hero:** *"Deterministic compliance locks backed by verifiable Nigerian law."*
- **Section A — Three-Source Intelligence Architecture:** Interactive diagram distinguishing Class A (`Golden 50 Statutory Vault`), Class C (`Tenant Institutional Playbooks & campaign_products`), and Class D (`Live .gov.ng Web Intelligence`).
- **Section B — The 3 Mechanical Locks & APR Engine:** Interactive mini-spec showing how Lock 1 (Prohibited Terms), Lock 2 (Numerical Rate Match), Lock 3 (Mandatory Disclosures), and `AprCalculatorService` execute outside the LLM.
- **Section C — 7-Layer Guardrails & Human-in-the-Loop Governance:** Shows how Cogent prevents hallucinated citations, enforces dual-control RBAC (`approval.decide`), seals SHA-256 Dossiers, and watches live URLs for drift.

---

## 3. Solutions Page (`/solutions`)

- **Top Filter / Anchor Nav:** Jump links for `#digital-lenders`, `#banking`, `#payments`, `#wealthtech`.
- **4 Deep-Dive Modules:** Each module includes:
  - License tiers covered (`LicenseScopeService`)
  - Primary governing regulators & instruments
  - Top 3 silent blind spots caught by Cogent (e.g., PSB lending ban under CBN PSB Guidelines; `<60d` Play Store ban under Google Play + FCCPC DEON; guaranteed yield ban under SEC ISA)
  - Sample before/after compliant rewrite card.

---

## 4. Statutory Vault Explorer (`/regulatory-vault`)

- **Purpose:** Turn Cogent's `141` official PDFs and `Golden 50` instruments into tangible institutional proof.
- **Interactive Filter Bar:** Filter by regulator (`All`, `CBN`, `FCCPC`, `ARCON`, `NDPC`, `SEC`) and search by keyword.
- **Data Source:** Derived cleanly from a static/exported catalog of `GOLDEN_50_INSTRUMENTS` & `REGULATORY_BODIES` metadata (`src/modules/regulatory-vault/golden50.data.ts`)—displaying instrument title, number, effective date, lifecycle status (`CURRENT`), and sample clause obligation without exposing private tenant data.

---

## 5. Pricing Page (`/pricing` Upgrade)

- **Preserve 100% of existing billing logic:** Keep `GET /api/marketing-shield/v1/billing/plans`, `POST /api/marketing-shield/v1/billing/checkout`, live FX conversion (`₦1,550/$1`), monthly/annual `-20%` toggle, and all 4 tiers (`Evaluation`, `Growth $149`, `Scale $449`, `Enterprise $1,499`).
- **Visual Upgrade:**
  - Replace the simplified local `<header>` in `src/app/pricing/page.tsx` with the shared `<MarketingHeader />` and add `<MarketingFooter />` so `/pricing` feels completely unified with `/`, `/platform`, `/solutions`, and `/regulatory-vault`.
  - Add an expandable **Full Plan Feature Matrix** below the 4 tier cards (Seats, Audits, Rewrites, Rate Cards, PDF Watermark/Signing, Drift Monitors, Retention 7d/90d/2yr/7yr, SLA) and a **Billing & Paystack FAQ** (USD display vs. NGN Paystack settlement, team invites, trial expiry).
