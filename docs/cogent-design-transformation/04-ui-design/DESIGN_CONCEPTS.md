# Design Concepts & Structural Wireframes

**Methodology Reference:** `ref/wireframe.webp`, `ref/w1.png`, `ref/w7.png`, `ref/w2.png`, `docs/ui1.jpg`, `docs/s.webp`  
**Status:** Concept & Wireframe Specification (Pre-Implementation)

---

## 1. Hero Concept: "Editorial Authority + Live Verification Stage"

Learning from `ref/w1.png` (framed product proof) and `docs/ui1.jpg` (serif editorial restraint):

```
+---------------------------------------------------------------------------------------------------+
|  [CogentLogo]       Platform ▾    Solutions ▾    Statutory Vault    Pricing      Sign in [Start]  |
+---------------------------------------------------------------------------------------------------+
|                                                                                                   |
|                          [CBN · FCCPC · ARCON · NDPC · SEC · NIGERIA]                             |
|                                                                                                   |
|                       Clear every financial campaign before                                       |
|                             the regulator does.  (Instrument Serif)                               |
|                                                                                                   |
|            Verify promotional copy, loan flyers, APR math, and live URLs against                  |
|           Nigerian statutory law and your internal rate cards—before publication.                  |
|                                                                                                   |
|                    [ Start 7-Day Evaluation → ]   [ Explore Platform ]                            |
|                                                                                                   |
|  +---------------------------------------------------------------------------------------------+  |
|  |  STAGE CHROME: Scenario Tabs: [Loan Flyer Audit]  [Live URL Drift]  [App Store Policy]      |  |
|  |--------------------------------------------------------------+------------------------------|  |
|  |  SUBMITTED FLYER / COPY                                      |  PRE-FLIGHT GATE: [BLOCK]    |  |
|  |  "Get ₦500k in 3 mins! 5% monthly, 0% hidden fees,           |  Risk Score: 88/100          |  |
|  |   guaranteed approval."                                      |  Lock 1 (Terms):   FAIL      |  |
|  |   └── [Highlighted Rose Breach Chips]                        |  Lock 2 (Rate):    FAIL      |  |
|  |                                                              |  Lock 3 (Discl.):  FAIL      |  |
|  |  WHAT YOU MISSED: Effective APR is 182.4% p.a. vs 60%        |  --------------------------  |  |
|  |  implied; missing ARCON ASP ID & CBN License footer.         |  [Apply Compliant Rewrite ✓]   |  |
|  +--------------------------------------------------------------+------------------------------|  |
|  TRUST STRIP: Grounded in 141 Official Nigerian Regulatory Instruments (CBN 94 · FCCPC 17 · ...)  |
+---------------------------------------------------------------------------------------------------+
```

### Why This Works
- **Zero fluff:** Visitors immediately see *what* Cogent checks (real Nigerian loan copy, APR math, ARCON/CBN citations) and *how* it resolves risk (`Apply Compliant Rewrite`).
- **Interactive state:** Clicking the 3 scenario tabs (`Loan Flyer Audit`, `Live URL Drift`, `App Store Policy`) or clicking `[Apply Compliant Rewrite]` transitions the frame from `BLOCK` -> `PASS` with emerald-highlighted statutory disclosures—without leaving the homepage.

---

## 2. Core Engine Bento Concept (`ref/w7.png` & `ref/ww.png` Translation)

Instead of 6 identical cards, use an **asymmetric 12-column architectural bento** on `#FAFAFA` (`border: 1px solid #E4E4E7`, `rounded-xl`):

```
+-------------------------------------------------------+-------------------------------------------+
|  COL 1–7 (Wide Flagship Card)                         |  COL 8–12                                 |
|  Three-Source Grounded Intelligence                   |  Deterministic APR & Drip-Pricing Engine  |
|  • [Golden 50 Statutory Vault]                        |  Net Disbursed: ₦47,500                   |
|  • [Institutional Playbooks & Rate Cards]             |  Implied APR: 60.0% -> True APR: 182.4%   |
|  • [Live .gov.ng Web Search]                          |  [FCCPA §115 • DRIP PRICING DETECTED]     |
+-----------------------------------+-------------------+---------------+---------------------------+
|  COL 1–4                          |  COL 5–8                          |  COL 9–12                 |
|  Flyer Visual & OCR Forensics     |  App Store & License Matrix       |  2-Year Dossier & Drift   |
|  Headline-to-disclaimer ratio     |  10 CBN/FCCPC/SEC License Tiers   |  SHA-256 Hash Chain       |
|  ARCON ASP Certificate detection  |  Google Play <60-day Tenor Ban    |  24/7 Live URL Diff       |
+-----------------------------------+-----------------------------------+---------------------------+
```

---

## 3. Problem Contrast Band (`ref/w5.png` Translation Without Tilted Clutter)

`ref/w5.png` uses tilted floating white cards on dark navy. For Cogent's institutional buyers, we replace the playful tilt with an **Obsidian Authority Grid (`bg-zinc-950`)**:
- Centered editorial thesis: *"Compliance tools shouldn't guess the law—or stall your launch."*
- Crisp 2×2 architectural grid (`border border-zinc-800 bg-zinc-900/60`) contrasting 4 concrete Nigerian risks:
  1. **Hallucinated Citations:** Consumer chatbots invent CBN/FCCPC sections that fail under legal inspection.
  2. **Hidden Drip-Pricing Liability:** Marketing advertises `"5% monthly"`, ignoring upfront fees that push true APR above `180%`.
  3. **Unvetted Channel Exposure:** One missing ARCON ASP ID or `<60-day` Play Store tenor triggers `₦1M–₦3M` fines or app takedown.
  4. **Missing 2-Year Audit Trail:** FCCPC Reg. 32 requires preserved promotional evidence; scattered Slack/email approvals fail audits.

---

## 4. Interactive Campaign Walkthrough (`ref/w2.png` Translation)

Left column (`5 cols`): 4 clickable operational stages with crisp hairline borders and an active `2px` cobalt/obsidian left accent bar.  
Right column (`7 cols`): Framed live-rendered Cogent Studio canvas (`docs/s.webp` lineage) showing the corresponding view:
1. `01. Auto-Hydrate Product Truth` -> Displays `QuickCash Loan (4.5%/mo + 1.5% fee)` auto-matched to flyer text.
2. `02. Visual Forensics & Lock Scan` -> Displays flyer OCR bounding box with `0.07` disclaimer ratio warning (`< 0.12`).
3. `03. Lock-Verified Rewrite & KFS` -> Displays side-by-side redline diff + generated CBN Key Facts Statement table.
4. `04. Dual-Control CCO Sign-Off` -> Displays RBAC approval lock (`Marketing cannot self-approve`) + SHA-256 PDF Dossier seal.
