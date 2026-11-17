# Sitemap & Information Architecture

**Methodology Reference:** `ref/website_,map.webp` (Structured Taxonomy) + `ref/navigation_1.mp4` (Mega-Menu Discipline)  
**App Compatibility:** Preserves all existing authenticated routes (`/chat`, `/knowledge-base`, `/drift-monitors`, `/settings`, `/onboarding`, `/studio`).

---

## 1. Strategic Route Topology

### 1.1 Public Marketing Storefront (Added to `isAlwaysPublicRoute` in `src/middleware.ts`)
When signed out, visitors land on `/` and explore the full storefront freely. When signed in and onboarded, visiting `/` still renders the marketing front door (with a smart **"Open Workspace →"** header CTA replacing or supplementing `"Start Evaluation"`—ensuring authenticated users can also inspect the homepage if they click the logo, while `/chat` remains their workspace home after sign-in).

| Route | Page Title | Purpose | Launch Wave |
|---|---|---|---|
| `/` | **Homepage — Cogent Marketing Shield** | Flagship narrative, interactive workbench preview, 5-regulator authority, license verticals, 5-layer engine bento, 4-step flow, exposure comparison, conversion CTA. | **Wave 1 (Core)** |
| `/platform` | **Platform & Deterministic Architecture** | Deep dive into Three-Source Grounding, 3 Deterministic Locks, APR/IRR Drip-Pricing Engine, Flyer Visual Forensics, App Store Auditor, and 7-Layer Guardrails. | **Wave 1 (Core)** |
| `/solutions` | **Solutions by Institution & License** | Filterable / tabbed hub covering `Digital Lenders`, `Microfinance & Commercial Banks`, `PSBs & Mobile Money`, and `WealthTech & Capital Markets`. | **Wave 1 (Core)** |
| `/regulatory-vault` | **The Golden 50 Statutory Vault** | Interactive explorer of the 5 Nigerian regulators (`CBN`, `FCCPC`, `ARCON`, `NDPC`, `SEC`), real instrument corpus (`141` source PDFs), SHA-256 provenance, and live `.gov.ng` intelligence. | **Wave 1 (Core)** |
| `/pricing` | **Plans & Paystack Billing** *(Upgrade existing)* | Existing live USD/NGN Paystack pricing page unified with the shared `<MarketingHeader />` and `<MarketingFooter />` + expanded FAQ & ROI exposure table. | **Wave 1 (Core)** |
| `/resources/faq` | **Compliance & Product FAQ** | Searchable knowledge hub (`ref/wq.webp` pattern) answering buyer questions on ARCON pre-vetting, FCCPC 2-year retention, Paystack billing, Clerk RBAC, and data isolation. | **Wave 2** |
| `/company` | **About Cogent & Trust Architecture** | Institutional mission, security & tenancy governance (`Document 07`), and enterprise contact/demo request (`mailto:` / structured inquiry). | **Wave 2** |
| `/legal/privacy`, `/legal/terms` | **Privacy Policy & Terms of Service** | NDPA 2023-aligned institutional legal disclosures in footer. | **Wave 2** |

### 1.2 Authenticated Application & Funnel Routes (Preserved Unchanged)
- `/sign-in`, `/sign-up` (`AuthSplitLayout`)
- `/onboarding` (`/step-1`, `/step-2`, `/step-3`)
- `/chat` (Compliance Copilot + Artifact Canvas + Campaign Studio)
- `/knowledge-base` (Products & Rates, Playbooks & Policies, Compliance Rules)
- `/drift-monitors` (Live URL Sentinels + Regulatory Ripple Alerts)
- `/settings`, `/settings/billing`

---

## 2. Top Navigation Architecture (`<MarketingHeader />`)

Modeled on the clarity and low cognitive load of `ref/navigation_1.mp4`:

- **Left:** `<CogentLogo variant="dark" />` linking to `/`.
- **Center Navigation (4 Top-Level Items + Clean Dropdowns):**
  1. **`Platform` (2-Column Dropdown):**
     - *Left list:* Three-Source Statutory Grounding, Deterministic APR & Locks, Flyer & App Store Forensics, Audit Dossiers & URL Drift.
     - *Right live card:* Mini preview showing `Pre-Flight Gate: BLOCK -> PASS` + link `Explore Platform Architecture →` (`/platform`).
  2. **`Solutions` (4-Card Grid Dropdown):**
     - Digital Lenders (`FCCPC DEON & Play Store`) -> `/solutions#digital-lenders`
     - MFBs & Commercial Banks (`CBN CPF & BOFIA`) -> `/solutions#banking`
     - PSBs, MMOs & Payments (`CBN PSSP & License Matrix`) -> `/solutions#payments`
     - WealthTech & VASPs (`SEC ISA & VASP Rules`) -> `/solutions#wealthtech`
  3. **`Statutory Vault`** (Direct link or compact dropdown): Golden 50 Nigerian Corpus (`/regulatory-vault`) + FAQ (`/resources/faq`).
  4. **`Pricing`** (Direct link to `/pricing`).
- **Right Conversion Actions:**
  - If signed out: `Sign in` (ghost text link -> `/sign-in`) + `Start 7-Day Evaluation` (primary obsidian button -> `/sign-up`).
  - If signed in: `Open Workspace →` (primary obsidian button -> `/chat`).

---

## 3. Footer Architecture (`<MarketingFooter />`)

Structured 5-column institutional footer (`bg-zinc-950 text-zinc-400` or crisp `bg-zinc-50 border-t border-zinc-200`):
1. **Brand Column:** `CogentLogo`, concise one-line descriptor (*"Supervisory compliance & regulatory intelligence for Nigerian financial institutions."*), Nigerian regulator coverage tags (`CBN · FCCPC · ARCON · NDPC · SEC`).
2. **Platform:** Copilot & Locks, APR & Drip-Pricing Engine, Flyer Visual Forensics, Statutory Dossiers, URL Drift Sentinels.
3. **Solutions:** Digital Lenders, MFBs & Banks, PSBs & MMOs, WealthTech & Capital Markets.
4. **Resources:** Statutory Vault, Pricing, Compliance FAQ, Security & Tenancy.
5. **Account & Legal:** Sign in, Start 7-Day Evaluation, Privacy Policy, Terms of Use.
