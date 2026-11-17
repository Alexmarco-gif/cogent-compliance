# Asset Inventory & Strategic Mapping

**Scope:** Complete inventory of all visual, video, and reference assets in `/ref/`, `/docs/`, and `src/`, mapped to their strategic design role (Study Reference vs. Reusable Pattern vs. Retire/Replace).  
**Rule Compliance:** Existing files in `/ref/` and `/docs/` are preserved untouched as reference intelligence. Zero placeholder assets or generic stock illustrations are recommended for production.

---

## 1. `/ref` Directory Inventory (PayOp & Goodface Reference Suite)

| File | Type / Dimensions | Visual Content | Methodology Lesson | Production Mapping for Cogent |
|---|---|---|---|---|
| `project_plan.webp` | WebP | Goodface 3-sprint project timeline (Discovery & Design stages) | Sequencing discovery & wireframes before UI polish | Guides our 5-phase blueprint roadmap |
| `4eed46249755747.6abc5ec623e28.png` | PNG `1600×880` | Variant of Goodface 3-sprint project timeline | Visual milestone clarity | Process reference only (do not ship) |
| `competito_comparison.webp` | WebP `2000×1121` | 6-competitor comparison table across 7 UX/commercial criteria | Exposing competitor blind spots before writing copy | Shapes Cogent's "Why Cogent vs. Generic AI / Manual Counsel" matrix |
| `website_,map.webp` | WebP | 23-page sitemap diagram (`Homepage`, `Internal`, `Navigation`, `External`) | Structured page taxonomy prevents orphan pages | Template for `03-ux-architecture/SITEMAP.md` |
| `wireframe.webp` | WebP `2000×1121` | Monochrome low-fidelity structural wireframes of hero & proof cards | Proving layout hierarchy before color | Template for `04-ui-design/DESIGN_CONCEPTS.md` |
| `q.webp` | WebP `2000×1122` | Tilted tablet hero showing PayOp navbar, bold headline, mobile UI, trust logos | Hero clarity + immediate trust strip | Structural blueprint for Cogent Hero + Trust Regulator/Institution Bar |
| `w1.png` | PNG `2000×1122` | Desktop monitor framing PayOp hero with embedded mobile UI & badges | Framing real product UI inside crisp device/editorial containers | Inspire Cogent's framed interactive product showcase (using real Cogent UI) |
| `payop-cover.mp4` | MP4 Video | Morphing hero across 4 verticals (`Gaming`, `Digital Goods`, `E-Commerce`, `iGaming`) | Dynamic vertical positioning in hero/solutions | Inspire Cogent's Institution/Regulator context switcher |
| `navigation_1.mp4` | MP4 Video | Floating pill navbar with 2-col/4-col mega-menus | Clean, uncluttered top navigation with rich dropdowns | Blueprint for Cogent's public `<MarketingHeader />` mega-menu |
| `payop-services.mp4` | MP4 Video | 4-tab vertical switcher pairing copy + metric case study card | Interactive proof per customer segment | Blueprint for Cogent's "Built for Every Nigerian Financial License" module |
| `w7.png` | PNG `2000×1122` | Progressive-opacity headline + 4-card asymmetric bento feature grid | Avoid monotonous 3-col cards; use varied bento geometry | Blueprint for Cogent's "5-Layer Compliance Engine" Bento Grid |
| `w2.png` | PNG `1552×1552` | Tablet frame: left interactive feature accordion + right live UI card | Pair concise feature triggers with live UI state | Blueprint for Cogent's interactive "See Cogent Inspect a Campaign" walkthrough |
| `payop-globe-animation (1).mp4` | MP4 Video | Orbital arc showing global currencies (`GBP`, `CAD`, `USD`, `EUR`, `BRL`) | Clean orbital/coverage graphic without messy maps | Inspire a **Nigerian 5-Regulator Coverage Matrix** (`CBN`, `FCCPC`, `ARCON`, `NDPC`, `SEC`) |
| `payop-steps_1.mp4` | MP4 Video | 4-step numbered onboarding carousel with progress ring | Turning complex onboarding into 4 calm steps | Blueprint for Cogent's 4-step workflow (`Connect Scope -> Seed Rate Card -> Audit Campaign -> Seal 2-Yr Dossier`) |
| `w5.png` | PNG `2000×1122` | Dark canvas centered thesis + 4 surrounding pain cards | Problem-agitation framing around a single core truth | Translate into horizontal/grid **Regulatory Exposure Matrix** (non-tilted, institutional) |
| `w4.png` | PNG `2000×2079` | Team/leadership card carousel (`Top-tier Finance Players`) | Humanizing enterprise leadership & credentials | Reference for `/about` leadership/advisory authority block (serious tone, no gaming bios) |
| `w6.png` | PNG `2000×1122` | Company timeline (`Founded in 2016`) + photo cards | Chronological credibility | Reference for `/about` or regulatory milestone timeline |
| `w3.png` | PNG `1552×1552` | Mobile viewport framing hero + burger menu + tight vertical rhythm | Mobile-first readability and thumb-zone CTA placement | Guides `05-implementation/RESPONSIVE_GUIDELINES.md` |
| `wq.webp` | WebP `2000×2328` | Composite: FAQ search hub, mobile blog filter, mobile 4-step card, flow diagram | Searchable knowledge hub + architectural process flow | Guides Cogent's Regulatory FAQ / Resources & "Legacy Counsel vs. Cogent" flow |
| `icon.png` | PNG `1600×1600` | 3×3 flat monochrome/slate icon grid | Restraint in UI iconography (pixel-tight, uniform weight) | Aligns with Lucide `1.5px`–`1.75px` stroke discipline in Cogent |
| `payop-icons-anim.mp4` | MP4 Video | Morphing 3D toy/sticker icons across 4 verticals | Cohesive visual theme per vertical (technique only) | **Do not copy 3D toys**; replace with geometric SVG/UI micro-diagrams |
| `finup_2_45bdf7b7a5.mp4` | MP4 Video | FinUp social cards with deep obsidian-to-cobalt light beams | High-contrast dark obsidian + cobalt lighting | Compatible secondary accent mood for dark institutional callout bands |
| `log1.png` | PNG `1176×1176` | FinUp verified profile card over diagonal obsidian/cobalt split | Clean white card contrast over deep navy/cobalt backdrop | Similar lineage to Cogent's existing `AuthSplitLayout.tsx` |
| `logo.png` | PNG `2000×1121` | FinUp wordmark over construction grid lines | Brand mark geometry & grid discipline | Reinforces Cogent's architectural grid aesthetic |
| `ww.png` | PNG `2000×1968` | Browser frame: centered hero + bento grid with subtle tinted cards | Clean light-mode bento layout (`#FFFFFF` + subtle tint) | Directly compatible with Document 12 monochrome + light tint surfaces |
| `README.md` | Text (2 bytes) | Contains `"j"` (placeholder) | — | Ignore |

---

## 2. `/docs` Visual References (Internal Product Baseline)

| File | Content | Current Codebase Alignment | Marketing Website Role |
|---|---|---|---|
| `ui1.jpg` | Centered editorial serif headline + prompt dock + 2×3 starter grid | Implemented in `src/app/chat/page.tsx` & `ChatComposer.tsx` | Recreate as interactive/authentic product demo in Hero & Platform showcase |
| `ui3.jpg` | Clean 240px monochrome sidebar + workspace breadcrumb header | Implemented in `WorkspaceSidebar.tsx` & `WorkspaceHeader.tsx` | Source pattern for interactive workspace preview frames |
| `s.webp`, `s1.webp`, `s2.webp`, `s3.webp`, `s4.webp`, `s5.webp`, `sa.webp` | Split-pane document studio, auto-save state, trial watermark, bottom quota card | Adapted in `ContextualCampaignInspector.tsx`, `ArtifactCanvasDrawer.tsx`, `WorkspaceSidebar.tsx` | Source truth for showing **real Cogent dossier, redline rewrite, and OCR inspector** on marketing pages |

---

## 3. Existing Codebase Brand & Visual Assets (`src/`)

| Asset / Component | Path | Status | Action for Marketing Site |
|---|---|---|---|
| `CogentLogo` & `CogentMark` | `src/components/brand/CogentLogo.tsx` | Production-ready SVG (`dark`, `light`, `blue`, `mark`) | **Primary brand mark** across marketing header, footer, favicon, and hero frames |
| `src/app/icon.svg` | `src/app/icon.svg` | Existing app icon | Verify alignment with `CogentMark` |
| `AuthSplitLayout` | `src/components/auth/AuthSplitLayout.tsx` | Production-ready cobalt/alabaster split showcase | Harmonize marketing site's Cobalt (`#2A4BFF`) + Alabaster (`#FAFAFA`) + Obsidian (`#09090B`) palette with this component so `/`, `/pricing`, and `/sign-in` feel like one product |
| `data/statutory-vault/*` | 141 real PDF instruments (`CBN`: 94, `FCCPC`: 17, `SEC`: 15, `ARCON`: 11, `NDPC`: 4) | Live corpus on disk | Real statutory metadata powers accurate regulator badges and Statutory Vault showcase numbers (**never fabricate numbers**) |

---

## 4. Asset Creation Gap List (What Must Be Designed/Built Without Generic AI Art)

Because Cogent has **no `public/` directory** and zero marketing-site illustrations today, we will produce **purpose-built, code-rendered product and architectural assets** (no external stock photos of handshakes, no generic AI robots):
1. **Interactive / High-Precision Coded Product Mockups (React/SVG):**
   - **Hero Interactive Workbench Preview:** Live-rendered miniature/interactive preview of Cogent inspecting a Nigerian loan flyer (showing Lock 1–3 badges, `182%` Effective APR vs `5%` advertised warning, and `[Accept Compliant Rewrite]` diff).
   - **Bento Capability Visuals:**
     - *Three-Source Grounding Stack* (`Golden 50 Statutory Vault` + `Tenant Rate Cards & Playbooks` + `Live .gov.ng Web Intelligence`).
     - *Deterministic APR / Drip-Pricing Math Card* (`Net Disbursed ₦47,500`, `Effective APR`, `<60d Play Store Ban` alert).
     - *Flyer Visual Forensics Frame* (bounding-box overlay checking disclaimer-to-headline ratio & ARCON ASP ID).
     - *Tamper-Evident Dossier & SHA-256 Ledger Card* (FCCPC Reg. 32 2-year preservation seal).
     - *URL Drift Redline Monitor* (live page diff detecting dropped KFS link / CBN license footer).
   - **5-Regulator Coverage Architecture Graphic:** Clean architectural grid/orbital diagram for `CBN`, `FCCPC`, `ARCON`, `NDPC`, and `SEC` showing real document counts (`94 / 17 / 11 / 4 / 15` source instruments in repository).
2. **Optional Static OpenGraph / Social Share Image:** Clean brand OG image using `CogentLogo` + editorial typography (`Instrument Serif` + `Inter`).
