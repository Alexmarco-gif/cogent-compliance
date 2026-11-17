# Implementation Plan (Post-Approval Execution Roadmap)

**Status:** Blueprint Ready — **Awaiting User Approval Before Code Execution**  
**Stack Constraint:** Zero new dependencies required (`Next.js 15.5.29`, `React 19`, `Tailwind CSS 3.4.17`, `lucide-react`, `@clerk/nextjs`).  
**Preservation Guarantee:** All authenticated workspace logic (`/chat`, `/onboarding`, `/knowledge-base`, `/drift-monitors`, `/settings`, `/api/*`, `src/modules/*`) remains intact.

---

## 1. Routing & Auth Compatibility Strategy (Critical Check)

Before building pages, verify how `/` and Clerk redirects interact:
1. **`src/middleware.ts`:** Add `"/"`, `"/platform(.*)"`, `"/solutions(.*)"`, `"/regulatory-vault(.*)"`, `"/resources(.*)"`, `"/company(.*)"`, `"/legal(.*)"` to `isAlwaysPublicRoute`.
2. **`src/app/page.tsx`:** Replace the unconditional `redirect("/sign-in")` / `redirect("/chat")` with the public marketing homepage, reading `auth()` non-blockingly solely to pass `isSignedIn: boolean` into `<MarketingHeader />` (showing `Open Workspace →` for signed-in users, or `Sign in` / `Start 7-Day Evaluation` for visitors).
3. **Clerk Redirect Safety:** Ensure `NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL` / `afterSignInUrl` / `AuthSplitLayout` sign-in & sign-up flows route authenticated users directly to `/chat` (or `/onboarding`), **not** back into a loop on `/`. Check `.env.example` and Clerk props during Sprint 1.
4. **Root Metadata (`src/app/layout.tsx`):** Update page title/description/OpenGraph metadata cleanly for public search and social sharing without breaking workspace subpage titles.

---

## 2. Sequenced Implementation Sprints

### Sprint 1 — Tokens, Shared Marketing Shell & Auth Routing
- Extend `tailwind.config.ts` / `src/app/globals.css` with subtle marketing utility tokens (`marketing-cobalt-wash`, hairline architectural grid utility) while keeping all existing workspace tokens untouched.
- Update `src/middleware.ts` public route matcher.
- Build `<MarketingHeader />`, `<MarketingFooter />`, and `<SectionHeader />` in `src/components/marketing/`.
- Update `src/app/pricing/page.tsx` header/footer to adopt `<MarketingHeader />` and `<MarketingFooter />` while preserving 100% of existing Paystack checkout and FX logic.

### Sprint 2 — Flagship Homepage (`/`)
- Build static typed scenario datasets (`src/data/marketing-scenarios.ts`) grounded strictly in real Cogent engines (`AprCalculatorService`, `MechanicalLocksEngine`, `VisualForensicsService`, `LicenseScopeService`).
- Implement the 9Homepage modules:
  1. `<HeroWorkbenchDemo />`
  2. `<RegulatorStrip />`
  3. `<ExposureContrastGrid />`
  4. `<LicenseVerticalSwitcher />`
  5. `<ComplianceEngineBento />`
  6. `<StudioWalkthrough />`
  7. `<AdoptionSteps />`
  8. `<CompetitorComparisonTable />`
  9. `<ExecutiveCtaBanner />`
- Replace `src/app/page.tsx` with the composed Homepage.

### Sprint 3 — Deep-Dive Public Pages (Wave 1)
- `/platform` (`src/app/platform/page.tsx`): Three-Source Intelligence, 3 Deterministic Locks, APR/IRR Engine, 7-Layer Guardrails, and Zero-Prompt Sentinels.
- `/solutions` (`src/app/solutions/page.tsx`): Anchored deep-dives for Digital Lenders, MFBs & Commercial Banks, PSBs & MMOs, and WealthTech & VASPs.
- `/regulatory-vault` (`src/app/regulatory-vault/page.tsx`): Filterable public explorer reading non-sensitive statutory metadata from `GOLDEN_50_INSTRUMENTS` & `REGULATORY_BODIES`.

### Sprint 4 — Wave 2 Pages & Full Verification
- `/resources/faq` (`src/app/resources/faq/page.tsx`): Searchable FAQ hub (`ref/wq.webp` methodology).
- `/company` (`src/app/company/page.tsx`) + `/legal/privacy` + `/legal/terms`.
- Run full verification suite:
  - `pnpm typecheck` (`tsc --noEmit`)
  - `pnpm lint`
  - `pnpm test:unit` (ensure existing tests pass + add unit/component tests for public marketing data/components)
  - `pnpm build` (production Next.js build)
  - Playwright visual & responsive audit (`375px`, `768px`, `1280px`, `1440px`) across `/`, `/platform`, `/solutions`, `/regulatory-vault`, `/pricing`, and `/sign-in`.
