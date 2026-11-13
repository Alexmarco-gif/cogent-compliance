# DOCUMENT 12: UI/UX VISUAL BLUEPRINT & REFERENCE ARCHITECTURE

**System:** Cogent Compliance Platform — Marketing Shield  
**Document Code:** `COG-DOC-12`  
**Version:** `1.0.0-PROD`  
**Status:** `Approved & Locked`  
**Target Environment:** Next.js (App Router), Tailwind CSS, Lucide Icons, Clerk Auth (`stem-cogent.com`)  
**Companion Specifications:** `06_Frontend_Experience_Specification.md`, `10_Adaptive_Conversational_Presentation_Constitution.md`, `11_Onboarding_Pricing_and_Paystack_Billing.md`

---

## 1. EXECUTIVE PURPOSE & ANTI-"AI SLOP" MANDATE

This document defines the exact visual layout, component hierarchy, design tokens, and interaction architecture for **Cogent Marketing Shield**. It eliminates subjective guesswork and prevents generic "AI-generated template" UI patterns by anchoring every screen to verified Silicon Valley enterprise SaaS references (**Linear, Harvey AI, Stripe, Claude, Perplexity**) and our approved visual reference suite (`ui1.jpg`, `ui3.jpg`, `s1–sa.webp`).

### 1.1 Visual Defects Strictly Purged from the Codebase
Based on our Phase 5/6 UI audit (`add.JPG`), the following patterns are **permanently banned** across all routes:
1. **Self-Congratulatory Status Pills:** Never render development milestone badges (e.g., `"Phase 1 Baseline Verified"`) in application headers.
2. **Marketing Hero Copy Inside Authenticated Workspaces:** Never display landing-page sales paragraphs (e.g., *"Automated Nigerian Financial Regulatory Defense..."*) inside `/chat` or `/studio`.
3. **Pastel "Rainbow Pill" Architecture Cards:** Never render multi-colored pastel boxes explaining internal backend classifications (`[Verified Statutory Vault]`, `[Internal Playbook Rule]`, `[Live Web Intelligence]`) on the workspace canvas.
4. **Exposed Internal API Health Banners:** Never display raw endpoint paths (`/api/marketing-shield/v1/health`) in user-facing footers.
5. **Oversized Generic Squircles & Emoji Clutter:** Replace heavy gradient icon boxes and decorative emojis (`🚀`, `✨`, `💡`) with crisp `1px` hairline geometry and monochrome typography.

---

## 2. ENTERPRISE DESIGN TOKENS (`tailwind.config.ts`)

Cogent enforces a **92% Monochrome + Semantic State Accent** color system:

| Token Role | Token Name | Hex Value | Tailwind Class | Usage Rule |
| :--- | :--- | :--- | :--- | :--- |
| **Primary Canvas** | `surface-canvas` | `#FFFFFF` | `bg-white` | Main conversational stream, active document sheets, modals |
| **Secondary Canvas** | `surface-subtle` | `#FAFAFA` | `bg-zinc-50` | Left sidebar, right studio backdrop, table headers |
| **Elevated Sheet** | `surface-elevated` | `#F4F4F5` | `bg-zinc-100` | Document preview backdrop (`s.webp`), inactive pills |
| **Hairline Borders** | `border-hairline` | `#E4E4E7` | `border-zinc-200` | All layout dividers, input docks, starter cards, table grids |
| **Primary Ink** | `ink-primary` | `#09090B` | `text-zinc-950` | Headings, primary buttons, active navigation items |
| **Secondary Ink** | `ink-secondary` | `#52525B` | `text-zinc-600` | Body prose, descriptions, table cells |
| **Muted Ink** | `ink-muted` | `#A1A1AA` | `text-zinc-400` | Placeholders, timestamps, keyboard shortcut hints (`⌘K`) |
| **Primary CTA** | `action-primary` | `#18181B` | `bg-zinc-900 text-white` | `+ New Audit`, `Run Compliance Audit`, `Accept Rewrite` |
| **Breach / Critical** | `state-critical` | `#BE123C` | `text-rose-700 bg-rose-50/60` | Inline flyer/copy statutory violations, Lock 1–3 failures |
| **Uncertain / Review** | `state-warning` | `#B45309` | `text-amber-700 bg-amber-50/60` | Unverified live web snippets, low-confidence OCR segments |
| **Verified / Approved** | `state-verified` | `#047857` | `text-emerald-700 bg-emerald-50/60` | CCO signed-off revisions, Layer 6 passed rewrites |

### Typography Scale
* **Editorial Display (`font-serif` — Newsreader / Instrument Serif):** Used exclusively for the centered zero-state greeting (*"Verify every claim before it goes live."*) inspired by `ui1.jpg`.
* **Interface & Prose (`font-sans` — Inter / Geist Sans):** Used for all navigation, chat streams, findings, and controls (`14.5px`, `leading-relaxed`).
* **Regulatory & Financial Data (`font-mono` — JetBrains Mono / Geist Mono):** Used strictly for statutory section citations (`CBN CPF §4.2`), `SHA-256` document fingerprints, and Naira figures (`₦100,000,000`).

---

## 3. MASTER REFERENCE-TO-COMPONENT ARCHITECTURE

Every layout zone in Cogent Marketing Shield maps directly to a specific visual reference:

```
+---------------------------------------------------------------------------------------------------+
| [LEFT SIDEBAR: ui3.jpg + s2.webp]   | [CENTER/LEFT: ui1.jpg]      | [RIGHT STUDIO: s1-sa.webp]   |
| 240px Fixed • bg-zinc-50            | Flex-1 (Centered on empty;  | 55% Width (Slides open when   |
|                                     | 45% width in Studio mode)   | campaign/audit is active)     |
|-------------------------------------|-----------------------------|-------------------------------|
| • Cogent Wordmark + Collapse Icon   | Top Breadcrumb Header:      | Studio Mode Tabs:             |
| • Search Input (⌘K)                 | Marketing Shield / Thread   | [Canvas] [Claims] [Dossier]   |
|                                     | Right: [Folders] [+ New]    | Status: (✓ Auto-saved) [PDF]  |
| WORKSPACE                           |-----------------------------|-------------------------------|
| • New Audit                         | ZERO STATE (ui1.jpg):       | EMPTY STATE (s3.webp):        |
| • Campaign Audits                   | Centered Serif Greeting     | Calm centered placeholder     |
| • Knowledge & Playbooks             | Unified Multi-Line Dock     | guiding user to submit copy   |
| • Product Rate Cards                | 2x3 Hairline Starter Grid   |                               |
|                                     |                             | ACTIVE SHEET (s.webp/sa.webp):|
| GOVERNANCE                          | ACTIVE STREAM:              | Elevated white document sheet |
| • Audit Ledger                      | Collapsible Tool Trace      | Inline red/amber claim marks  |
| • URL Drift Monitors                | Adaptive Markdown Prose     | Diagonal EVALUATION PREVIEW   |
|                                     | Superscript Citations [1]   | watermark on Trial tier       |
|-------------------------------------|-----------------------------|-------------------------------|
| BOTTOM RAIL (s2.webp):              | Bottom-Anchored Prompt Dock | Footer Action Bar:            |
| • Plan & Quota Card (2/3 Audits)    | [Attach] [URL] [Rate Card]  | [Submit for CCO Sign-Off]     |
| • Settings & Team                   |                     [Send ↑]| [Approve Revision #N]         |
| • Clerk Org Switcher (Acme MFB)     |                             |                               |
+---------------------------------------------------------------------------------------------------+
```

---

## 4. DETAILED COMPONENT SPECIFICATIONS BY REFERENCE

### 4.1 Left Navigation Sidebar (`src/components/shell/WorkspaceSidebar.tsx`)
* **Visual Reference:** `ui3.jpg` (Top search & grouped sections) + `s2.webp` (Bottom quota card & organization switcher).
* **Layout & Geometry:** `w-[240px] shrink-0 bg-zinc-50 border-r border-zinc-200 flex flex-col justify-between h-screen`.
* **Top Section:**
  * Crisp `16px` semi-bold `Cogent` wordmark paired with a minimalist collapse toggle icon (`PanelLeftClose`).
  * Compact search input (`Search... ⌘K`) styled with `bg-white border border-zinc-200 rounded-md h-8 text-[13px]`.
* **Grouped Navigation Links:**
  * **Group 1 — `Workspace`:** `New Audit`, `Campaign Audits`, `Knowledge & Playbooks`, `Product Rate Cards`.
  * **Group 2 — `Governance`:** `Statutory Vault (141)`, `URL Drift Monitors`, `Audit Ledger`.
  * Active link state uses `bg-zinc-200/60 text-zinc-950 font-medium rounded-md` (no bright blue sidebars or glowing backgrounds).
* **Bottom Rail (`s2.webp` Adaptation):**
  * **Monochrome Plan & Usage Card:**
    * Header: `Evaluation Pilot` + right-aligned `2/3 Audits` counter (`font-mono text-[11px] bg-zinc-100 px-1.5 py-0.5 rounded`).
    * Body: `Trial ends in 6 days` + subtle `Upgrade plan →` trigger opening the Paystack billing modal.
    * *Strict Styling Rule:* Replaces the rainbow pastel gradient in `s2.webp` with a clean `bg-white border border-zinc-200 rounded-lg p-3` card.
  * **Utility Links:** `Team & Roles`, `Settings`.
  * **Organization Switcher:** Full-width Clerk `<OrganizationSwitcher />` styled as a `1px` bordered pill (`RM • Acme MFB ⌄`).

---

### 4.2 Top Contextual Header (`src/components/shell/WorkspaceHeader.tsx`)
* **Visual Reference:** `ui3.jpg` + `s4.webp`.
* **Layout & Geometry:** `h-13 border-b border-zinc-200 bg-white px-6 flex items-center justify-between`.
* **Left Zone:** Interactive breadcrumb path (`Marketing Shield / Q4 Salary Advance Flyer`) in `text-[13px] text-zinc-500` with the active title in `text-zinc-900 font-medium`.
* **Right Zone:**
  * `Search thread` ghost button (`border border-zinc-200 rounded-md text-[13px] px-3 py-1.5`).
  * `Folders` ghost button.
  * Primary dark CTA button: `+ New Audit` (`bg-zinc-900 hover:bg-zinc-800 text-white rounded-md text-[13px] font-medium px-3.5 py-1.5`).

---

### 4.3 Conversational Zero-State & Prompt Dock (`src/components/chat/ZeroStateCanvas.tsx`)
* **Visual Reference:** `ui1.jpg`.
* **Layout Behavior:** When `messages.length === 0`, the prompt dock is vertically centered in the main canvas (`max-w-2xl mx-auto`). Once the user submits their first message, the dock transitions smoothly to a sticky bottom-anchored container (`border-t border-zinc-200 bg-white`).
* **Zero-State Elements (`ui1.jpg`):**
  1. **Centered Editorial Headline:** `"Verify every claim before it goes live."` (`font-serif text-3xl tracking-tight text-zinc-900 text-center mb-6`).
  2. **Unified Composer Dock:**
     * `rounded-xl border border-zinc-200 bg-white shadow-xs focus-within:border-zinc-400 transition-colors p-3`.
     * Auto-expanding textarea (`placeholder="Paste ad copy, drop a flyer, or ask a CBN / FCCPC compliance question..."`).
     * **Bottom Action Bar:**
       * Left controls: `Attach Flyer / PDF` (paperclip icon), `Scan URL` (globe icon), `Product Context` selector (`QuickCash Loan ⌄`).
       * Right controls: `Live Web Search` toggle + circular dark submit button (`bg-zinc-900 text-white w-8 h-8 rounded-full`).
  3. **2×3 Starter Action Grid (Below Composer):**
     * Six crisp, monochrome `1px` bordered cards (`grid-cols-1 sm:grid-cols-3 gap-2.5 mt-5`):
       1. **Audit a Campaign Flyer** — *Extract OCR text & check ARCON rules*
       2. **Verify Loan APR & Fees** — *Cross-check copy against internal rate card*
       3. **Screen Influencer Script** — *Check FCCPC Reg. 33 & disclosure rules*
       4. **Scan Live Landing Page** — *Snapshot URL & detect compliance drift*
       5. **CBN Disclosure Checklist** — *Consumer Protection Framework requirements*
       6. **Generate Audit Dossier** — *Compile 2-year FCCPC Reg. 32 record*
  * *Omitted Elements:* The floating YouTube widget (`ui1.jpg`) and 3D speaker graphic (`ui3.jpg`) are strictly excluded.

---

### 4.4 Active Message Stream & Citation Chips (`src/components/chat/MessageStream.tsx`)
* **Visual Reference:** `ui1.jpg` + `10_Adaptive_Conversational_Presentation_Constitution.md`.
* **Collapsible Tool Execution Trace:**
  * While tools execute (`search_regulatory_evidence`, `run_deterministic_compliance_locks`, `search_live_web`), render a single subtle collapsible row above the assistant message:
    `Checked 5 CBN & FCCPC provisions and QuickCash Rate Card  ▸`
  * Expanding reveals the exact sources queried in `12px` muted monospace text.
* **Inline Citation Footnotes:**
  * Rendered via `AdaptiveMessageRenderer.tsx` as compact monochrome superscript chips (`[CBN CPF §4.2]`).
  * Clicking any chip opens the **Slide-Over Source Drawer** (`w-[440px] border-l border-zinc-200 bg-white`), displaying the exact verbatim clause text, official regulator URL, publication date, and `SHA-256` file fingerprint.

---

### 4.5 Split-Screen Compliance Studio & Watermarked Dossier Canvas (`src/components/studio/ComplianceStudioPane.tsx`)
* **Visual Reference:** `s1.webp`, `s3.webp`, `s4.webp`, `s.webp`, `sa.webp`.
* **Activation Trigger:** Opens automatically on the right (`w-[55%] border-l border-zinc-200 bg-zinc-50`) whenever a campaign audit is created, a flyer/PDF is uploaded, or an existing campaign is selected.
* **Studio Sub-Header (`s4.webp`):**
  * Left tabs with bottom active underline (`border-b-2 border-zinc-900`): `Campaign Canvas` | `Claims & Locks (3)` | `Audit Dossier`.
  * Right status & export controls: `✓ Auto-saved` muted pill (`text-zinc-500 text-[12px]`) + `[Export PDF]` button.
* **Empty Canvas State (`s3.webp`):**
  * When opened manually before content is submitted, displays a centered `bg-white border border-zinc-200 rounded-xl p-10 text-center max-w-sm mx-auto` card:
    *"Submit campaign copy or upload a flyer on the left to inspect claims and generate your compliance dossier."*
* **Elevated Document Preview Sheet (`s.webp`):**
  * Renders an elevated white A4-proportioned sheet (`bg-white border border-zinc-200 rounded-lg shadow-xs max-w-[680px] mx-auto my-6 p-8`) over the `bg-zinc-100/70` backdrop.
  * Displays the campaign copy or flyer OCR segments with **inline crimson underlines** (`bg-rose-50 border-b-2 border-rose-600 text-rose-950 cursor-pointer`) on flagged claims. Clicking an underlined claim highlights the corresponding finding in the left Copilot stream and offers one-click **`[Accept Compliant Rewrite]`**.
* **Evaluation Trial Watermark Gate (`sa.webp`):**
  * When `tenant.plan_slug === 'evaluation'`, the `Audit Dossier` preview sheet renders a subtle diagonal repeating watermark (`EVALUATION PREVIEW • UPGRADE FOR FILING`) across the sheet (`pointer-events-none select-none opacity-[0.06] text-4xl font-bold tracking-widest -rotate-30`), matching `sa.webp`.
  * Clicking `[Export Official PDF]` on the Evaluation tier opens the Paystack upgrade modal (`11_Onboarding_Pricing_and_Paystack_Billing.md`). Once `tenant_subscriptions.status === 'active'`, the watermark is immediately removed.

---

## 5. IMPLEMENTATION CHECKLIST FOR ANTIGRAVITY IDE

When building Phase 6 and Phase 7 frontend components, verify every item below before marking UI tasks complete:

1. **Zero `add.JPG` Leftovers:** Confirm zero occurrences of `"Phase 1 Baseline Verified"`, `"Automated Nigerian Financial Regulatory Defense"`, rainbow source cards, or `/api/marketing-shield/v1/health` banners in `src/app/` or `src/components/`.
2. **Exact Layout Proportions:** Left sidebar fixed at `240px`; empty-state chat composer centered (`max-w-2xl`); split-screen studio divides `45%` Copilot / `55%` Document Canvas on desktop (`>= 1024px`) and stacks cleanly with a mobile tab toggle on smaller viewports.
3. **Interactive Citation Drawer:** Clicking any superscript citation chip opens the right-hand Source Drawer populated with real database fields (`instrument_title`, `section_ref`, `verbatim_text`, `file_sha256`).
4. **Trial Watermark Binding:** Confirm that `sa.webp` diagonal watermark renders on `Audit Dossier` sheets for `evaluation` tenants and disappears automatically when `status === 'active'`.