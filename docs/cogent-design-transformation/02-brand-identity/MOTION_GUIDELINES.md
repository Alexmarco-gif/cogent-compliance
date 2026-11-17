# Motion & Interaction Guidelines

**Principle:** Motion in Cogent exists solely to **clarify verification state, causality, and spatial context**—never to entertain or distract a compliance buyer.

---

## 1. Timing & Easing Standards

- **Primary Architectural Ease:** `cubic-bezier(0.22, 1, 0.36, 1)` (decisive departure, crisp settle with zero overshoot bounce).
- **Micro-Interaction Duration:** `150ms`–`200ms` (button hover, dropdown open, tab switch).
- **State Transition Duration:** `280ms`–`420ms` (accordion preview morph, vertical license switcher, simulated Pre-Flight Gate transition).
- **Scroll Reveal:** Subtle `12px` vertical translate + opacity `0 -> 1` over `400ms` once (`viewport={{ once: true, amount: 0.2 }}`). Zero heavy scroll-jacking.
- **Reduced Motion Mandate:** All transitions and simulated audit sequences must honor `@media (prefers-reduced-motion: reduce)` by snapping immediately to final visible state.

---

## 2. Purposeful Motion Patterns (Mapped from PayOp Methodology)

| Marketing Module | Reference Pattern | Cogent Purposeful Motion |
|---|---|---|
| **Mega-Menu Dropdown** | `ref/navigation_1.mp4` | Fast `150ms` fade + `4px` downward reveal; smooth cross-fade when switching between `Platform`, `Solutions`, and `Resources`. |
| **Interactive Hero Workbench** | `ref/payop-cover.mp4` | Allows visitor to toggle sample scenarios (*Loan Flyer*, *Landing Page URL*, *SMS Promo*); animates deterministic Lock 1–3 badges settling from `Scanning` -> `BLOCK` -> `Apply Rewrite` -> `PASS` in clean `250ms` steps. |
| **Institution License Switcher** | `ref/payop-services.mp4` | Cross-fades regulatory ruleset, applicable statutory bodies (`CBN` / `FCCPC` / `ARCON` / `NDPC` / `SEC`), and sample finding card smoothly when selecting `Digital Lenders`, `MFBs & Banks`, `PSBs & MMOs`, or `WealthTech`. |
| **Capability Accordion -> Live Frame** | `ref/w2.png` | Clicking any capability row highlights the active `2px` cobalt/obsidian left rail and cross-fades the paired UI demonstration on the right. |
| **4-Step Workflow Progression** | `ref/payop-steps_1.mp4` | Crisp progress indicator (`1 -> 2 -> 3 -> 4`) advancing automatically or on click without dizzying 3D card flips. |
| **Regulator Orbit / Coverage Index** | `ref/payop-globe-animation (1).mp4` | Gentle, low-velocity radial or tabular highlight cycling through `CBN`, `FCCPC`, `ARCON`, `NDPC`, `SEC` (pauses on hover/focus). |

---

## 3. Strictly Banned Motion Patterns

- No bouncing 3D stickers or floating avatars.
- No continuous pulsing neon glows around buttons.
- No tilted/skewed cards sliding sideways on scroll (`ref/w5.png` tilt is rejected).
- No heavy external runtime animation libraries (`GSAP` / `Three.js`) unless strictly justified; CSS transitions + lightweight React state (or `motion/react` only if approved) keep First Contentful Paint fast for Nigerian enterprise networks.
