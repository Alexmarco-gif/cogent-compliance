# Visual Identity System

**Design Language:** Architectural Editorial RegTech (`Document 12` Monochrome + Sovereign Cobalt & Semantic Compliance Accents)  
**Continuity Anchor:** `src/components/brand/CogentLogo.tsx`, `src/components/auth/AuthSplitLayout.tsx`, `tailwind.config.ts`

---

## 1. Visual System Philosophy

Cogent's visual identity bridges two realities:
1. **The Marketing Storefront (`/`, `/platform`, `/solutions`, `/pricing`)**: Must project institutional stature, editorial confidence, and unmistakable visual distinction so an executive immediately separates Cogent from generic AI wrappers.
2. **The Authenticated Compliance OS (`/chat`, `/knowledge-base`, `/drift-monitors`, `/settings`)**: Locked to Document 12's **92% Monochrome + Semantic State Accent** workspace (`#FFFFFF`, `#FAFAFA`, `#09090B`, `#E4E4E7`, plus semantic rose/amber/emerald).

By inheriting `CogentLogo`, `Instrument Serif` + `Inter` + `JetBrains Mono`, `1px` hairline structural grids, and the **Alabaster-to-Cobalt** atmospheric treatment from `AuthSplitLayout.tsx`, the marketing site and product workspace look and feel like one cohesive flagship platform.

---

## 2. Color Architecture

### 2.1 Surface & Ink Hierarchy (90% Foundation)
- **Primary Canvas (`#FFFFFF`):** Crisp editorial white for primary sections, interactive product frames, and comparison sheets.
- **Alabaster Subtle (`#FAFAFA`):** Alternating page bands, bento card backdrops, and navigation surfaces.
- **Elevated Surface (`#F4F4F5`):** Code/UI frame backdrops, inactive segmented tabs, and subtle table headers.
- **Hairline Structural Borders (`#E4E4E7`):** `1px` borders defining grids, cards, tables, and device frames (replacing heavy drop shadows).
- **Obsidian Primary Ink (`#09090B`):** Display headings, high-contrast authority bands (dark sections), and primary actions (`#18181B`).
- **Secondary Ink (`#52525B`):** Body copy, subheadings, and analytical explanations.
- **Muted Ink (`#A1A1AA`):** Metadata labels, timestamps, keyboard hints, and structural captions.

### 2.2 Brand & Atmospheric Accents (5% Precision)
- **Sovereign Cobalt (`#2A4BFF`):** Existing `brand.cobalt` token used in `CogentLogo variant="blue"` and `AuthSplitLayout.tsx`. Reserved on the marketing site for:
  - Active architectural callouts, verified product frame highlights, and focus rings.
  - Subtle atmospheric wash (`#FAFBFF -> #EEF2FF -> #8BA4FC` / `#2A4BFF`) inside select executive visual frames (e.g., the Hero product showcase container or final CTA split panel).
  - *Never* used as full-page neon gradient noise or rainbow cards.

### 2.3 Semantic Regulatory Accents (5% Meaning)
Used exclusively inside **authentic product demonstrations** and **compliance telemetry**—never as arbitrary decoration:
- **Critical Breach / Lock Fail:** Rose `#BE123C` text on `#FFF1F2` fill (`#FECDD3` border) — e.g., `"0% hidden charges"` flagged text, `BLOCK` Pre-Flight Gate.
- **Review / Drift Warning:** Amber `#B45309` text on `#FFFBEB` fill (`#FDE68A` border) — e.g., `CONDITIONAL` gate, URL drift detected, low-confidence OCR.
- **Verified / Sealed:** Emerald `#047857` text on `#ECFDF5` fill (`#A7F3D0` border) — e.g., `PASS` lock, inserted compliant disclosure highlights, CCO signed dossier.

---

## 3. Typography System

Loaded in `src/app/layout.tsx` (zero new font families required):

| Role | Font Family | Weight / Style | Usage Rules |
|---|---|---|---|
| **Editorial Display** | `Instrument Serif` (`font-serif`) | `400` Regular & Italic | Hero H1 display statements, signature section thesis headlines, italic emphasis on the decisive verb/noun (e.g., *"Verify every claim *before* it goes live."*). |
| **Structural UI & Body** | `Inter` (`font-sans`) | `400`, `500`, `600` | Section headers, navigation, capability descriptions, bento titles, buttons, comparison tables. Tight `-0.02em` tracking on headings. |
| **Statutory & Financial Data** | `JetBrains Mono` (`font-mono`) | `400`, `500`, `600` | Regulator badges (`CBN`, `FCCPC`, `ARCON`, `NDPC`, `SEC`), section references (`CBN CPF §4.2`), APR metrics (`182.4% p.a.`), Naira amounts (`₦100,000,000`), `SHA-256` hashes, and uppercase eyebrow tags (`tracking-[0.08em]`). |

---

## 4. Iconography & Graphic Language

1. **Flat Vector UI Icons (`lucide-react`):** Consistent `1.5px`–`1.75px` stroke weight, monochrome (`zinc-700` / `zinc-950`), paired with `1px` crisp square/rounded-md enclosures (`ref/icon.png` discipline). Zero multi-color toy icons.
2. **Architectural Micro-Diagrams (Custom Inline SVG):**
   - **Verification Ledger Grid:** Faint `1px` `#E4E4E7` coordinate hairlines behind showcase frames (referencing `ref/logo.png` and `AuthSplitLayout.tsx` grid geometry).
   - **Bounding-Box Forensics Overlay:** Precision dashed/solid hairline callouts (`#BE123C` / `#047857`) over sample flyer mockups demonstrating real `visual-forensics.service.ts` height-ratio inspection.
   - **5-Regulator Coverage Ring / Matrix:** Clean geometric orbital/arc or architectural tabular index for `CBN`, `FCCPC`, `ARCON`, `NDPC`, `SEC` (reinterpreting `ref/payop-globe-animation (1).mp4` in monochrome + cobalt without country-flag clutter).

---

## 5. Photography & Device Framing Rules

- **No Generic Stock Photos:** Zero stock handshakes, smiling call-center models, or glowing brain renders.
- **Framing Product UI:** Marketing screenshots/live coded UI components sit inside crisp `1px` bordered architectural frames (`rounded-2xl border border-zinc-200 bg-white shadow-sm`) with subtle window/ledger chrome—matching the precision of `ref/w7.png` and `docs/s.webp`.
- **Optional Future Leadership Portraits (`/company`):** High-contrast neutral studio headshots only when real team photography is supplied; never fabricate AI faces.
