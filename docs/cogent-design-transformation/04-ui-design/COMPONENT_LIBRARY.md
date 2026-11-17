# Marketing Component Library Specification

**Location Convention (Proposed for Phase 5):** `src/components/marketing/*` (keeping authenticated workspace components in `src/components/shell/`, `src/components/chat/`, `src/components/campaign/` strictly untouched).

---

## 1. Shared Layout & Navigation Components

| Component | File Path | Props / Behavior |
|---|---|---|
| `<MarketingHeader />` | `src/components/marketing/MarketingHeader.tsx` | Sticky header with `<CogentLogo variant="dark" />`, accessible hover/click mega-dropdowns (`Platform`, `Solutions`), direct links (`Statutory Vault`, `Pricing`), mobile drawer, and auth-aware CTA (`useAuth()` client check or server prop for `Sign in` / `Start Evaluation` vs. `Open Workspace →`). |
| `<MarketingFooter />` | `src/components/marketing/MarketingFooter.tsx` | 5-column institutional footer with regulator coverage tags, route links, and copyright. |
| `<SectionHeader />` | `src/components/marketing/SectionHeader.tsx` | Standardized eyebrow (`font-mono uppercase text-[11px]`), editorial heading (`Instrument Serif` + `Inter`), and constrained subcopy (`max-w-2xl`). |

---

## 2. Interactive Product & Proof Modules

| Component | Reference Lineage | Purpose & Interactive Behavior |
|---|---|---|
| `<HeroWorkbenchDemo />` | `ref/w1.png`, `docs/ui1.jpg` | Interactive 3-tab product frame (`Loan Flyer Audit`, `Live URL Drift`, `App Store Policy`). Shows realistic Nigerian promotional input on left + Pre-Flight Gate (`BLOCK`/`PASS`), Lock 1–3 badges, APR discrepancy, and working `[Apply Compliant Rewrite]` simulation button on right. |
| `<RegulatorStrip />` | `ref/q.webp` | Clean 5-regulator trust strip (`CBN · 94`, `FCCPC · 17`, `SEC · 15`, `ARCON · 11`, `NDPC · 4` source instruments) with clickable links to `/regulatory-vault?regulator=...`. |
| `<ExposureContrastGrid />` | `ref/w5.png` (adapted) | Dark obsidian (`#09090B`) 2×2 grid highlighting the 4 concrete compliance failure modes in Nigerian financial marketing. |
| `<LicenseVerticalSwitcher />` | `ref/payop-services.mp4` | Segmented 4-vertical selector (`Digital Lenders`, `MFBs & Commercial Banks`, `PSBs & MMOs`, `WealthTech & VASPs`) dynamically updating statutory scope, blind spot case, and regulatory citation card. |
| `<ComplianceEngineBento />` | `ref/w7.png`, `ref/ww.png` | Asymmetric 12-col bento grid containing 5 custom coded UI micro-vignettes (3-Source Stack, APR Drip-Pricing Math, Flyer OCR Ratio Overlay, App Store & License Matrix, SHA-256 Dossier & Drift). |
| `<StudioWalkthrough />` | `ref/w2.png`, `docs/s.webp` | 4-step interactive accordion synced with an architectural right-hand Studio preview sheet (Rate Card Match -> OCR Bounding Box -> Redline Rewrite & KFS -> CCO Sign-Off Seal). |
| `<AdoptionSteps />` | `ref/payop-steps_1.mp4` | 4-step horizontal/grid progression with step indicator (`01`–`04`) mapping directly to `/onboarding` and `/chat`. |
| `<CompetitorComparisonTable />` | `ref/competito_comparison.webp` | Clean monochrome + semantic checkmark matrix comparing External Counsel, Generic AI, and Cogent across 7 institutional criteria. |
| `<VaultExplorer />` | `ref/wq.webp` | Searchable, regulator-filterable explorer for `/regulatory-vault` rendering real instrument metadata and sample clauses. |
| `<ExecutiveCtaBanner />` | `AuthSplitLayout.tsx` | High-contrast Cobalt/Obsidian conversion panel driving directly to `/sign-up` and `/pricing`. |

---

## 3. Component Hygiene Rules

1. **Zero Duplicate Business Logic:** Marketing preview demos (`<HeroWorkbenchDemo />`, `<StudioWalkthrough />`) use static, deterministic illustrative Nigerian compliance scenarios—they never hit authenticated `/api/marketing-shield/v1/*` endpoints as an unauthenticated visitor.
2. **Real Product Parity:** Every badge label (`LOCK 1: PROHIBITED TERMS`, `CBN CPF §4.2`, `FCCPA §115`), color token (`bg-rose-50 text-rose-700`, `bg-emerald-50 text-emerald-700`), and KFS table layout mirrors the real `AutonomousAnalystWorkbench.tsx` and `ArtifactCanvasDrawer.tsx` components.
3. **Keyboard & Screen Reader Accessibility:** Mega-menus, vertical tabs, and walkthrough accordions must support `Arrow` keys, `Enter`/`Space`, `Escape` dismissal, `aria-expanded`, `role="tablist"`, and `role="tabpanel"`.
