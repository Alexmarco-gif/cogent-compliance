# Quality Assurance & Anti-Slop Checklist

**Purpose:** Final verification gate to run after Phase 5 implementation before any production release.

---

## 1. Brand & Anti-"AI Slop" Visual Audit

- [ ] **Zero Generic AI Tropes:** Zero glowing purple/pink neon gradients, zero AI robot/brain illustrations, zero random floating glassmorphism cards, zero tilted sticker badges, zero decorative emojis (`🚀`, `✨`, `💡`).
- [ ] **Monochrome + Cobalt Discipline:** Primary surfaces adhere to `#FFFFFF` / `#FAFAFA`, deep contrast bands use `#09090B`, accent precision uses `#2A4BFF`, and semantic rose/amber/emerald colors appear *only* on authentic compliance lock/breach/verified demonstrations.
- [ ] **Typography Consistency:** `Instrument Serif` used deliberately on display headlines; `Inter` on UI/prose; `JetBrains Mono` strictly on statutory citations, Naira/APR figures, SHA-256 hashes, and eyebrows.
- [ ] **Cross-Route Coherence:** Moving across `/`, `/platform`, `/solutions`, `/regulatory-vault`, `/pricing`, `/sign-in`, `/onboarding`, and `/chat` feels like one unified institutional product.
- [ ] **Document 12 Compliance:** Zero banned strings (`"Phase 1 Baseline Verified"`, exposed health endpoints, rainbow source cards) anywhere on public or private routes.

---

## 2. Factual Product & Regulatory Accuracy Audit

- [ ] Every capability shown on `/`, `/platform`, `/solutions`, and `/regulatory-vault` maps to a real implemented module in `src/modules/`.
- [ ] Regulator document counts match actual repository corpus (`CBN: 94`, `FCCPC: 17`, `SEC: 15`, `ARCON: 11`, `NDPC: 4` — total `141` PDFs / Golden 50 instruments).
- [ ] Pricing figures and Paystack FX copy match `src/app/pricing/page.tsx` and `Document 11` (`$0`, `$149`, `$449`, `$1,499` monthly; `-20%` annual).
- [ ] Copy explicitly states Cogent is a **decision-support and workflow-enforcement platform**, never claiming autonomous statutory approval without human authorization.

---

## 3. Functional, Routing & Auth Gate Audit

- [ ] Unauthenticated visitor can open `/`, `/platform`, `/solutions`, `/regulatory-vault`, `/pricing` with HTTP `200` (no forced redirect to `/sign-in`).
- [ ] Authenticated user still signs in cleanly to `/chat` (or `/onboarding` if incomplete), and `/chat`, `/knowledge-base`, `/drift-monitors`, `/settings` remain strictly Clerk-protected.
- [ ] `/pricing` monthly/annual toggle, live FX fetch (`/api/marketing-shield/v1/billing/plans`), and Paystack checkout trigger continue working identically.
- [ ] All interactive marketing demos (`<HeroWorkbenchDemo />`, `<LicenseVerticalSwitcher />`, `<StudioWalkthrough />`, `<VaultExplorer />`) work smoothly with mouse and keyboard (`Tab`, `Enter`, `Arrow` keys).

---

## 4. Technical, Accessibility & Responsive Audit

- [ ] `pnpm typecheck` passes with 0 errors.
- [ ] `pnpm lint` passes with 0 errors.
- [ ] `pnpm test` (Vitest) passes with 0 regressions.
- [ ] `pnpm build` succeeds cleanly.
- [ ] Playwright / browser visual inspection verified at `375px`, `768px`, `1280px`, and `1440px` with zero horizontal overflow, legible contrast (`WCAG AA >= 4.5:1`), and `prefers-reduced-motion` honored.
