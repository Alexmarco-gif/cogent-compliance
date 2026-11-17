# Content Architecture & Narrative Cadence

**Methodology Reference:** `ref/wireframe.webp`, `ref/competito_comparison.webp`, `ref/w7.png`, `ref/payop-steps_1.mp4`  
**Objective:** Define the exact narrative arc of the Homepage (`/`) and core subpages so every section earns attention before requesting conversion.

---

## 1. Homepage (`/`) 9-Section Narrative Arc

| # | Section | Strategic Role | Reference Lineage | Core Copy & Visual Mechanics |
|---|---|---|---|---|
| **01** | **Hero & Interactive Workbench Stage** | <5s comprehension + immediate product proof | `ref/w1.png`, `ref/q.webp`, `docs/ui1.jpg` | Eyebrow: `NIGERIAN REGULATORY COMPLIANCE OS`. Display H1 (*Instrument Serif* + *Inter*): *"Clear every financial campaign before the regulator does."* Subcopy explaining deterministic locks + CBN/FCCPC/ARCON/NDPC/SEC grounding. Dual CTAs (`Start 7-Day Evaluation`, `Explore Platform`). Interactive framed Cogent Workbench preview showing live `BLOCK -> Fix -> PASS` flow. |
| **02** | **Statutory & Institutional Scope Strip** | Instant Nigerian regulatory credibility | `ref/q.webp` bottom trust bar | Clean monochrome ticker/bar: `GROUNDED IN VERIFIED NIGERIAN REGULATORY CORPORA` listing the 5 regulators (`CBN`, `FCCPC`, `ARCON`, `NDPC`, `SEC`) with real instrument counts (`141` source documents). |
| **03** | **The Problem Contrast ("Why Generic AI & Manual Queues Fail")** | Agitate buyer pain without hype | `ref/w5.png`, `ref/wq.webp` | Centered thesis statement + 4 crisp architectural problem cards: (1) *Hallucinated AI Citations*, (2) *Hidden Drip-Pricing & Rate Mismatches*, (3) *5–10 Day Legal Bottlenecks*, (4) *Missing 2-Year Audit Trails*. |
| **04** | **Institution Vertical Switcher ("Built for Every Nigerian License")** | Show tailored applicability | `ref/payop-services.mp4` | Interactive 4-tab switcher: `Digital Lenders` \| `MFBs & Commercial Banks` \| `PSBs & Mobile Money` \| `WealthTech & VASPs`. Morphs active rulesets, sample blind spot detected, and statutory citations in place. |
| **05** | **Core Engine Bento Grid ("Five Layers of Deterministic Defense")** | Unpack complex platform modularly | `ref/w7.png`, `ref/ww.png` | Asymmetric 5-card bento grid: (1) *Three-Source Grounding Stack* (wide span), (2) *Deterministic APR/IRR Calculator*, (3) *Flyer Visual & OCR Forensics*, (4) *App Store & License Matrix*, (5) *2-Year SHA-256 Dossiers & URL Drift*. |
| **06** | **Interactive Product Walkthrough ("Inspect a Campaign in Real Time")** | Deep product-led demonstration | `ref/w2.png`, `docs/s.webp` | Left interactive step/feature accordion (`1. Zero-Click Rate Matching`, `2. Flyer Fine-Print Ratio`, `3. Lock-Verified Rewrites`, `4. Dual-Control CCO Sign-Off`) paired with right interactive Cogent Studio frame. |
| **07** | **4-Step Operational Workflow** | Make adoption feel effortless | `ref/payop-steps_1.mp4` | Numbered 4-step sequence matching Cogent's actual `/onboarding` & `/chat` flow: `01. Configure Regulatory Scope` -> `02. Seed Product Rate Cards` -> `03. Run Pre-Flight & Remediate` -> `04. Seal Dossier & Monitor Live URLs`. |
| **08** | **Comparison & Exposure Table ("Cogent vs. Status Quo")** | Commercial ROI justification | `ref/competito_comparison.webp`, `pricing/page.tsx` | Side-by-side matrix comparing **Manual External Retainer** vs. **Generic AI Chatbots (ChatGPT/Claude)** vs. **Cogent Marketing Shield** across statutory provenance, rate math, RBAC sign-off, Play Store checks, and cost/speed. |
| **09** | **Executive Dark Authority CTA & Footer** | Convert CCOs, Legal & Growth leads | `ref/log1.png`, `AuthSplitLayout.tsx` | Deep Obsidian (`#09090B`) architectural panel with subtle Cobalt accent grid: *"Start your 7-day evaluation pilot. Run 3 live campaign audits free."* Dual actions: `Start 7-Day Evaluation` + `View Plans & Naira Billing` (`/pricing`). |

---

## 2. Subpage Content Architecture

### `/platform`
- Deep architecture breakdown of the **23-Tool Autonomous Analyst**, **3 Deterministic Locks**, **7-Layer Guardrail Validation Pipeline**, and **Zero-Prompt Background Sentinels** (URL Drift + Regulatory Ripple Watcher).

### `/solutions`
- Dedicated deep-dive sections (anchorable `#digital-lenders`, `#banking`, `#payments`, `#wealthtech`) mapping each of the 10 `InstitutionLicenseTier` classes to exact regulatory pitfalls (e.g., PSB credit restrictions, `<60-day` Play Store loan ban, SEC guaranteed-return prohibition, NDPC pre-ticked consent).

### `/regulatory-vault`
- Transparent showcase of the **5 Regulators & 141 Source Instruments** on disk (`CBN`: 94, `FCCPC`: 17, `SEC`: 15, `ARCON`: 11, `NDPC`: 4), explaining `CURRENT` vs. `SUPERSEDED` lifecycle tracking, SHA-256 verification, and Hybrid RRF retrieval (`pgvector` + FTS).

### `/pricing`
- Preserves live `/api/marketing-shield/v1/billing/plans` FX integration and Paystack checkout logic while wrapping the page in the unified `<MarketingHeader />` and `<MarketingFooter />` and adding a full feature-comparison matrix + billing FAQ.
