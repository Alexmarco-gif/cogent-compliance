# Design Tokens Specification

**Alignment:** Extends existing `tailwind.config.ts` and `src/app/globals.css` without breaking any authenticated workspace classes.

---

## 1. Color Tokens

### 1.1 Existing Locked Tokens (Preserved)
| Token | Hex | CSS / Tailwind Usage |
|---|---|---|
| `surface-canvas` | `#FFFFFF` | Primary light section & card surface |
| `surface-subtle` | `#FAFAFA` | Alternating marketing band & sidebar canvas |
| `surface-elevated` | `#F4F4F5` | Showcase backdrop, pill container, table header |
| `border-hairline` | `#E4E4E7` | Primary `1px` grid & card borders |
| `ink-primary` | `#09090B` | Primary headings & obsidian dark sections |
| `ink-secondary` | `#52525B` | Body prose & subcaptions |
| `ink-muted` | `#A1A1AA` | Metadata, eyebrows, placeholders |
| `action-primary` | `#18181B` | Primary CTA fill (`#09090B` / `#18181B`) |
| `brand.cobalt` | `#2A4BFF` | Precision brand accent & focus highlight |
| `status.critical` | `#BE123C` / `#FFF1F2` / `#FECDD3` | Breach, Lock fail, exposure metric |
| `status.warning` | `#B45309` / `#FFFBEB` / `#FDE68A` | Conditional / drift warning |
| `status.success` | `#047857` / `#ECFDF5` / `#A7F3D0` | Verified, compliant rewrite diff, sealed |

### 1.2 Marketing-Specific Extension Tokens (Proposed for Phase 5)
| Token Name | Value | Purpose |
|---|---|---|
| `marketing-obsidian` | `#09090B` | Dark authority showcase band (Regulatory Exposure / Audit Trail band) |
| `marketing-obsidian-card` | `#111114` | Card surface inside dark authority band (`border: #27272A`) |
| `marketing-cobalt-wash` | `linear-gradient(155deg, #FAFBFF 0%, #EEF2FF 38%, #DBE4FF 100%)` | Subtle architectural tint for Hero/CTA visual stage (harmonized with `AuthSplitLayout.tsx`) |
| `marketing-grid-line` | `rgba(228, 228, 231, 0.55)` | Subtle `1px` architectural grid backdrop |

---

## 2. Typography Scale (Marketing vs. Workspace)

| Token | Desktop Size / Line Height | Mobile Size / Line Height | Tracking | Font |
|---|---|---|---|---|
| `display-hero` | `56px` (`3.5rem`) / `1.06` | `36px` (`2.25rem`) / `1.10` | `-0.025em` | `Instrument Serif` (or `Inter` `600` + `Instrument Serif` accent) |
| `display-section` | `40px` (`2.5rem`) / `1.12` | `28px` (`1.75rem`) / `1.16` | `-0.02em` | `Instrument Serif` / `Inter` |
| `heading-card` | `20px` (`1.25rem`) / `1.28` | `18px` (`1.125rem`) / `1.30` | `-0.015em` | `Inter` `600` |
| `body-lead` | `17px` (`1.0625rem`) / `1.55` | `15.5px` / `1.55` | `-0.005em` | `Inter` `400` |
| `body-standard` | `14.5px` / `1.60` | `14px` / `1.55` | `0` | `Inter` `400` |
| `eyebrow-mono` | `11px` / `1.2` | `11px` / `1.2` | `+0.10em` | `JetBrains Mono` `500` uppercase |
| `data-mono` | `12.5px` / `1.4` | `12px` / `1.4` | `0` | `JetBrains Mono` `500` `tabular-nums` |

---

## 3. Spacing, Grid & Radius Scale

- **Max Container Width:** `1200px` (`max-w-[1200px] mx-auto px-5 sm:px-8`) for editorial rhythm; `1280px` max for full-bleed product frame showcases.
- **Section Vertical Rhythm:**
  - Compact bands (Trust strip, Footer): `py-12 lg:py-16`
  - Standard feature bands: `py-20 lg:py-28`
  - Hero top/bottom breathing room: `pt-28 pb-16 lg:pt-36 lg:pb-24`
- **Grid Columns:** `12-column` desktop (`gap-6`), `4-column` mobile (`gap-4`).
- **Border Radii:**
  - Outer showcase frames: `16px` (`rounded-2xl`)
  - Bento & capability cards: `12px` (`rounded-xl`)
  - Buttons & inputs: `8px` (`rounded-lg`) or `6px` (`rounded-md`) — **never** oversized pill-only buttons everywhere (keep primary CTAs crisp `rounded-lg`, reserve `rounded-full` strictly for tiny status dots or compact segmented switches).
- **Elevation / Shadow Discipline:**
  - Prefer `border border-zinc-200` over heavy box-shadows.
  - Showcase frame elevation: `0 1px 2px rgba(9,9,11,0.04), 0 12px 32px -12px rgba(9,9,11,0.08)`.
