# COGENT MARKETING SHIELD
## Frontend Experience and Interaction Specification

**Product Name:** Cogent Marketing Shield  
**Product Type:** Standalone Enterprise Regulatory & Marketing Compliance Operating System  
**Document Number:** 06  
**Document Title:** Frontend Experience and Interaction Specification  
**Version:** 2.0 (Greenfield Source of Truth)  
**Status:** Approved Design & Frontend Engineering Baseline  
**Framework & Styling:** Next.js (App Router, TypeScript), Tailwind CSS, Lucide Icons  
**AI Provider & SDK:** Google Gemini API (Consumed strictly via `/api/marketing-shield/v1` REST & SSE endpoints)  
**Primary Market:** Nigerian Regulated Financial Institutions

---

# 1. Executive Purpose & Frontend Philosophy

## 1.1 Purpose
This document defines the complete frontend user experience, layout architecture, interaction states, visual design tokens, and component responsibilities for **Cogent Marketing Shield**. It removes all visual and behavioral ambiguity before frontend implementation begins in the Gemini Antigravity IDE.

## 1.2 Anti-"ChatGPT Wrapper" Experience Philosophy
If a compliance officer, legal counsel, or fintech product manager opens Cogent and sees nothing but a generic chat bubble, they will mentally compare it to a $20/month consumer chatbot. Conversely, if they open a cluttered 1990s banking form with 30 mandatory inputs, they will abandon it due to friction.

Cogent Marketing Shield solves both problems through **Conversational-First Intake + Progressive Operational Disclosure**:
1. **Zero-Friction Conversational Entry:** Users start in a clean, authoritative conversational workspace where they can immediately ask a statutory question, query an internal playbook, trigger a live web regulatory search, or drop a campaign flyer/URL.
2. **Instant Structural Transition (The Contextual Campaign Inspector):** The moment promotional material is introduced, the workspace smoothly expands into a dual-pane **Compliance Operating System**—surfacing **Deterministic Lock Badges**, **Visual Flyer OCR Bounding Boxes**, **Three-Source Evidence Badges**, **Side-by-Side Rewrite Diffs**, and **Cryptographic CCO Sign-Off Controls**.
3. **Visible Authority & Source Separation:** Every piece of regulatory or institutional evidence is badged with its exact source class (`[Verified Statutory Vault]`, `[Internal Playbook Rule]`, or `[Live Web Intelligence]`) and opens an inspectable **Evidence Drawer** showing verbatim text, SHA-256 document hashes, and effective dates.

---

# 2. Enterprise Visual Direction & Design Tokens

## 2.1 Aesthetic Persona: "Sovereign Regulatory Authority"
The interface must feel like mission-critical institutional software built for Chief Compliance Officers, General Counsel, and Fintech Product Managers—combining the precision of Linear/Stripe with the authority of a legal and financial terminal.
- **What to Avoid:** Playful robot avatars, neon purple/pink AI gradients, consumer-grade chat stickers, or unverified "100% Legal Guarantee!" green confetti banners.

## 2.2 Locked Color & Typography Tokens (`tailwind.config.ts`)

| Token Category | Token Name | Hex / Value | Usage |
|---|---|---|---|
| **Canvas Backgrounds** | `bg-canvas` | `#F5F6FA` | Main application background surface |
| | `bg-surface` | `#FFFFFF` | Cards, Inspector panels, Composer, Evidence Drawer |
| | `bg-sidebar` | `#0B0F1A` | Deep Slate Navy persistent primary navigation sidebar |
| **Brand & Accents** | `brand-primary` | `#2A4BFF` | Primary interactive buttons, active tabs, focus rings |
| | `brand-navy` | `#0F172A` | Primary headings, high-contrast authority headers |
| **Source-Class Badges** | `badge-statutory` | Bg: `#EFF6FF`, Text: `#1D4ED8`, Border: `#BFDBFE` | **`[Verified Statutory Vault]`** (Class A — Golden 50) |
| | `badge-playbook` | Bg: `#F5F3FF`, Text: `#6D28D9`, Border: `#DDD6FE` | **`[Internal Playbook Rule]`** (Class C — Tenant Vault) |
| | `badge-liveweb` | Bg: `#ECFEFF`, Text: `#0E7490`, Border: `#A5F3FC` | **`[Live Web Intelligence]`** (Class D — Live Search) |
| **Severity & Lock States** | `status-critical` | Bg: `#FEF2F2`, Text: `#B91C1C`, Border: `#FECACA` | `CRITICAL` / `HIGH` findings, Deterministic Lock