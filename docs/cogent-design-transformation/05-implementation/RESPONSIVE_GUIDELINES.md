# Responsive & Mobile Design Guidelines

**Methodology Reference:** `ref/w3.png`, `ref/wq.webp` (PayOp Mobile Experience)  
**Target Viewports:** `375px` (iPhone SE / standard mobile), `390px` (modern mobile), `768px` (tablet), `1024px` (laptop), `1440px` (desktop).

---

## 1. Breakpoint & Adaptation Rules

1. **Navigation (`<MarketingHeader />`):**
   - `>= 1024px` (`lg`): Full horizontal nav with hover/click mega-dropdowns and right-aligned CTAs.
   - `< 1024px`: Collapses cleanly into `CogentLogo` + single mobile menu toggle button (`44×44px` hit area). Mobile drawer stacks `Platform`, `Solutions`, `Statutory Vault`, `Pricing` with expandable accordions and a pinned bottom full-width CTA (`Start 7-Day Evaluation` + `Sign in`).
2. **Hero & Interactive Workbench (`<HeroWorkbenchDemo />`):**
   - Headline scales cleanly from `56px` desktop -> `44px` tablet -> `34px` mobile (`leading-[1.1]`) so the value proposition and primary CTAs appear above the fold on `390×844` screens.
   - Inside `<HeroWorkbenchDemo />`, the 2-column inspection split (`Submitted Copy` | `Pre-Flight Gate & Fix`) stacks vertically below `lg`, with horizontal scrollable scenario tabs (`overflow-x-auto no-scrollbar`) and full-width `[Apply Compliant Rewrite]` thumb-accessible button.
3. **Bento Grid (`<ComplianceEngineBento />`):**
   - `lg`: 12-column asymmetric bento (`7+5` top row, `4+4+4` bottom row).
   - `md`: 2-column grid (`col-span-2` flagship top card, `1+1` pairs below).
   - `< md`: Single-column vertical stack with `gap-4` and compact internal padding (`p-5`).
4. **Institution Vertical Switcher & Studio Walkthrough:**
   - Tabs convert into a horizontal pill/underline scroller on mobile (`whitespace-nowrap overflow-x-auto`).
   - Walkthrough accordion items expand inline above/below the preview on mobile or render a compact preview inside the active accordion panel so users never have to scroll up and down blindly to see what changed.
5. **Comparison Table (`<CompetitorComparisonTable />`):**
   - Desktop: Full 4-column comparative table (`Criterion | External Retainer | Generic AI | Cogent`).
   - Mobile (`< 640px`): Either horizontal scroll with sticky first column OR clean stacked comparison cards per criterion so zero text wraps into illegible 2-character slivers.

---

## 2. Touch, Typography & Performance Rules

- **Minimum Touch Target:** `44px × 44px` on all interactive mobile buttons, tabs, and accordion headers.
- **No Horizontal Page Overflow:** Strict `overflow-x-hidden` guard audited at `375px` width.
- **Readability:** Body copy never drops below `14px` on mobile; `font-mono` citations maintain `>= 11.5px` with adequate contrast (`>= 4.5:1` WCAG AA).
- **Network Efficiency:** Because Nigerian enterprise and mobile users frequently browse on variable 4G connections, avoiding unoptimized multi-megabyte hero videos (`ref/*.mp4` are 2–11 MB each!) and rendering crisp SVG/HTML interactive product previews guarantees sub-second LCP.
