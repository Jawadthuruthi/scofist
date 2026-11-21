---
name: Scofist EMS
description: Dual-surface Education Management System combining a dignified collegiate editorial public face with high-density operational flight-deck dashboards
colors:
  primary: "#18181b"
  primary-foreground: "#fafafa"
  background: "#ffffff"
  foreground: "#09090b"
  card: "#ffffff"
  card-foreground: "#09090b"
  muted: "#f4f4f5"
  muted-foreground: "#71717a"
  border: "#cbcbd2"
  input: "#e4e4e7"
  destructive: "#ef4444"
  public-obsidian: "#080c09"
  public-ivory: "#f7f5ee"
  public-sand: "#ded9ce"
  public-evergreen: "#1b2b20"
  public-emerald: "#10b981"
  public-gold: "#d4af37"
typography:
  display:
    fontFamily: "Playfair Display, Georgia, serif"
    fontSize: "3.75rem"
    fontWeight: 400
    lineHeight: 1.12
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Playfair Display, Georgia, serif"
    fontSize: "2rem"
    fontWeight: 400
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Montserrat, 'Google Sans', sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Montserrat, 'Google Sans', sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0em"
  label:
    fontFamily: "Montserrat, 'Google Sans', sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "0.02em"
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  topbar: "56px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "#27272a"
  button-public-apply:
    backgroundColor: "{colors.public-ivory}"
    textColor: "#07160d"
    rounded: "{rounded.full}"
    padding: "12px 28px"
  button-public-apply-hover:
    backgroundColor: "#ffffff"
  button-public-glass:
    backgroundColor: "rgba(255, 255, 255, 0.04)"
    textColor: "{colors.public-sand}"
    rounded: "{rounded.full}"
    padding: "12px 24px"
  input-default:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
  card-dashboard:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.lg}"
    padding: "20px"
---

# Design System: Scofist EMS

## Overview

**Creative North Star: "The Collegiate Sanctuary & The Flight Deck"**

Scofist is built on a deliberate dual-world aesthetic architecture. Rather than forcing a single generic visual language across fundamentally different user contexts, Scofist strictly bifurcates its experience into two intentional modes:

1. **The Public Surface ("The Collegiate Sanctuary" — Persuade & Read):**  
   The external facing pages (`app/(client)/*`) embody academic heritage, scholarly dignity, and moral purpose. Built with deep obsidian-evergreen grounds (`#080c09`), warm ivory typography (`#f7f5ee`), and literary `Playfair Display` serif headlines, it evokes classical collegiate gravitas while utilizing modern architectural frosted glass (`backdrop-blur-xl`) and pill contours (`rounded-full`). It gives prospective students, parents, and patrons an atmosphere of enduring institutional pedigree.

2. **The Dashboard Surface ("The Flight Deck" — Operate):**  
   The internal EMS surfaces (`app/dashboard/*`, `app/judge-portal/*`, `app/library-dashboard/*`) function as high-throughput operational cockpits for administrators, teachers, librarians, and event judges. Governed by high data density, rapid scanability, and zero decorative overhead, it employs a clean monochrome base, HSL semantic variables, adaptive Light/Dark mode themes, strict 8px rounded geometry (`rounded-md`), compact tabular rhythm, and multi-script support for Arabic (`Sakkal Majalla`) and Malayalam (`Noto Sans Malayalam`).

**Key Characteristics:**
- **Strict Boundary Division:** Public pages never use dashboard data cards; dashboard screens never bleed public marketing gradients or serif display fonts.
- **Atmospheric Public Grounding:** Organic radial dark-emerald glows, muted sand and ivory text, architectural frosted glass headers.
- **Flight-Deck Data Density:** 14px base font scaling down to 10px (`xxs`) for status badges, tight 8px padding, sticky headers, and responsive role-based bottom bars.
- **Script-Aware Academic Inclusivity:** Purpose-built font stacks handling Arabic treatises and Malayalam texts alongside English Latin glyphs.

---

## Colors

The Scofist palette is intentionally partitioned into an **Internal HSL Semantic Engine** and a **Public Collegiate Heritage Palette**.

### Primary (Internal Flight Deck)
- **Deep Ink Neutral** (`hsl(240, 5.9%, 10%)` / `#18181b` in Light mode; `hsl(0, 0%, 98%)` / `#fafafa` in Dark mode): High-contrast authority for primary actions, active navigational states, and critical triggers.
- **Canvas Ground** (`hsl(0, 0%, 100%)` in Light mode; `hsl(240, 10%, 3.9%)` in Dark mode): Neutral, clean surface maximizing tabular readability and scan speed.

### Public Collegiate Palette
- **Deep Obsidian Ground** (`#080c09` / `#080d09`): Atmospheric dark foundation providing deep contrast without artificial OLED pitch-black harshness.
- **Warm Alabaster Ivory** (`#f7f5ee`): Luminous, low-glare primary text and solid CTA pill fills.
- **Muted Sand & Bone** (`#ded9ce`): Secondary body prose, preserving warmth against dark obsidian grounds.
- **Heritage Evergreen** (`#1b2b20` / `#0f2115`): Structural borders, institutional badge backgrounds, and subtle ambient glows.
- **Collegiate Gold** (`#d4af37`): Restrained historical seal crests and honors accents.

### Neutral (Dashboard Semantic Scale)
- **Muted Surface** (`hsl(240, 4.8%, 95.9%)` in Light; `hsl(240, 3.7%, 15.9%)` in Dark): Subtle background for secondary buttons, table headers, and badges.
- **Structural Border** (`hsl(240, 5.9%, 80%)` in Light; `hsl(240, 5%, 34%)` in Dark): Hairline separation for data tables, card frames, and split panels.
- **Muted Text** (`hsl(240, 3.8%, 46.1%)` in Light; `hsl(240, 5%, 64.9%)` in Dark): Form hints, meta timestamps, and secondary captions.

### Semantic Alerts & Badges
- **Destructive** (`hsl(0, 84.2%, 60.2%)` / `#ef4444`): Absent markings, fee arrears, overdue returns, and deletion confirmations.
- **Success** (`#16a34a` / `green-600`): Present attendance status, cleared fees, approved applications.
- **Alert / Pending** (`hsl(48, 96%, 89%)` bg, `hsl(48, 90%, 10%)` fg): Warning states, pending evaluation sheets, and unverified enrollments.

### Named Rules
**The Surface Separation Rule.** Never use `#080c09` obsidian or `#f7f5ee` ivory inside the dashboard. Conversely, never use dashboard zinc grey tables or raw HSL cards on the public homepage.

**The Functional Color Rule.** In the dashboard, color indicates state only (present/absent, paid/unpaid, active/locked). Never introduce saturated accent colors for decoration.

---

## Typography

### Typography Stacks
- **Public Display Font:** `Playfair Display, Georgia, serif` (Evoking scholarly dignity, academic treatises, and collegiate gravitas).
- **Primary Body Font:** `Montserrat, 'Google Sans', sans-serif` (Crisp, modern, neutral geometry for high legibility across screens).
- **Secondary UI Font:** `'Product Sans', 'Google Sans', sans-serif` (Clean interface hierarchy for dashboard controls).
- **Academic Script Fallbacks:** `'Sakkal Majalla', 'Traditional Arabic', 'Noto Naskh Arabic', serif` for Arabic script; `'Noto Sans Malayalam'` for Malayalam script.

### Hierarchy

#### Public Surface (Collegiate)
- **Display Hero:** `Playfair Display`, Regular (400), 3.75rem – 4.5rem, line-height 1.12, letter-spacing -0.02em. Used strictly for homepage hero and section anchors.
- **Headline Charter:** `Playfair Display`, Regular (400), 2rem – 2.25rem, line-height 1.25. Section titles and vision headings.
- **Public Body:** `Montserrat`, Regular (400), 1rem – 1.125rem, line-height 1.6, color `#ded9ce`.
- **Institutional Eyebrow:** `Montserrat`, Medium (500), 0.75rem, letter-spacing 0.05em, color `#a6ada4`.

#### Dashboard Surface (EMS Flight Deck)
- **Dashboard View Title:** `Montserrat`, SemiBold (600), 1.5rem (24px), line-height 1.3, tracking -0.01em.
- **Section / Card Header:** `Montserrat`, SemiBold (600), 1.125rem (18px), line-height 1.4.
- **Table & Form Body:** `Montserrat` or `Google Sans`, Regular (400), 0.875rem (14px), line-height 1.5.
- **Dense Grid & Badges (`text-xxs`):** `0.625rem` (10px), line-height 1.0rem, font-weight 600, uppercase. Used for timetable periods, status chips, and code-letters.

### Named Rules
**The Serif Containment Rule.** `Playfair Display` is exclusively permitted on public editorial landing surfaces and graduation/merit certificates. It must never appear inside dashboard tables, forms, or sidebars.

---

## Layout

### Public Surface Layout
- **Container Rhythm:** Centered reading width (`max-w-5xl`, `max-w-2xl` for text columns), generous vertical cadence (`py-16` to `py-28`).
- **Floating Island Masthead:** Sticky top-4 floating capsule (`max-w-2xl`, `w-[90%]`) enclosed in architectural frosted glass.

### Dashboard Surface Layout
- **App Shell Framework:** Fixed-height viewport layout (`h-screen overflow-hidden`) with collapsible `AppSidebar` (width 16rem / 4rem collapsed).
- **Fixed Topbar:** Fixed 3.5rem (`--topbar-height: 56px`) operational bar housing active academic year badge, festival toggle, role switcher, and user profile.
- **Scrollable Canvas:** `main.flex-1 overflow-auto p-4 lg:p-6` with built-in container constraints and print styling overrides (`print:overflow-visible print:p-0`).
- **Role Bottom Navigation:** Mobile-first sticky bottom navigation bar dedicated to quick-actions for high-frequency roles (`Teacher`, `Librarian`, `Student`, `Judge`, `College Admin`).

---

## Elevation & Depth

### Public Surface: Atmospheric & Frosted Depth
- **Ground Glow:** Radial soft emerald illumination (`radial-gradient(1000px 500px at 50% -80px, rgba(20, 80, 50, 0.3), transparent 70%)`).
- **Glass Enclosure:** `backdrop-blur-xl` over `rgba(8, 13, 9, 0.85)` with a 1px `border-white/[0.08]` hairline outline.
- **Floating Shadows:** Deep ambient diffuse shadow `0 16px 40px -8px rgba(0, 0, 0, 0.85)` on scroll; `0 4px 20px rgba(247, 245, 238, 0.12)` subtle ivory glow under primary CTA.

### Dashboard Surface: Flat-By-Default Structural Depth
- **Flat-By-Default Doctrine:** Surfaces in the dashboard are flat at rest. Depth is communicated via 1px border contrast (`border-border`), not floating drop shadows.
- **Layering Over Elevation:** Modals, popovers, and dropdown menus utilize clean 1px borders with crisp dark-tinted backdrops (`bg-background/80 backdrop-blur-sm`).
- **Interactive Response:** Subtle hover border highlighting (`hover:border-accent-foreground/20`) rather than physical Y-axis card translation.

---

## Shapes

- **Public Contours (Pill Architecture):**
  - Interactive actions and badges use `rounded-full` (`9999px`) capsules.
  - Institutional feature cards use soft, generous corners (`rounded-2xl` to `rounded-3xl` / 16px–24px).
- **Dashboard Contours (Precision Utility):**
  - Base radius: `--radius: 0.5rem` (`8px`).
  - Cards & Panels: `rounded-xl` (`12px`) with 1px border boundary.
  - Buttons, Inputs, Dropdowns: `rounded-md` (`6px` to `8px`).
  - Status Badges: `rounded-md` with `px-2 py-0.5` compact padding.

---

## Components

### 1. Buttons

#### Dashboard Buttons (`components/ui/button.jsx`)
- **Primary:** `bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm rounded-md px-4 py-2 text-sm font-medium`.
- **Outline:** `border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md px-4 py-2`.
- **Secondary:** `bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md px-4 py-2`.
- **Destructive:** `bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-md px-4 py-2`.
- **Success:** `bg-green-600 text-white hover:bg-green-600/90 rounded-md px-4 py-2`.
- **Print:** `bg-black text-white dark:bg-white dark:text-black rounded-md px-4 py-2`.

#### Public Collegiate Action Buttons (`components/AuthButtons.jsx`)
- **Primary Public CTA:** Solid Ivory pill (`bg-[#f7f5ee] text-[#07160d] hover:bg-white rounded-full min-h-[48px] px-7 py-3 font-semibold text-sm shadow-[0_4px_20px_rgba(247,245,238,0.12)]`).
- **Secondary Public Link:** Architectural frosted pill (`bg-white/[0.04] hover:bg-white/[0.08] border border-white/12 text-[#ded9ce] rounded-full min-h-[48px] px-6 py-3 text-sm font-medium`).

### 2. Cards & Containers
- **Dashboard Card (`components/ui/card.jsx`):** `rounded-xl border border-border bg-card text-card-foreground shadow-sm p-5`.
- **Public Feature Panel:** Dark frosted slate (`bg-white/[0.02] border border-[#1b2b20] rounded-2xl p-6`).

### 3. Inputs & Forms
- **Dashboard Input:** `h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring`. Number inputs have spinners hidden.

### 4. Navigation
- **Public Header (`components/PublicHeader.jsx`):** Centered floating pill masthead with brand seal, college title, and quick portal links.
- **Dashboard AppSidebar (`components/AppSidebar.jsx`):** Collapsible vertical sidebar partitioned by operational domains (Academics, Attendance, Finance, Library, Programs).
- **Dashboard Topbar (`components/Topbar.jsx`):** Sticky 56px utility bar containing active session metadata, role indicators, and system theme toggles.

---

## Do's and Don'ts

### Do:
- **Do** respect the surface boundary: use `Playfair Display`, `#080c09`, and pill geometry on public pages; use `Montserrat`/`Google Sans`, HSL tokens, and 8px precision corners in the dashboard.
- **Do** apply `.book-text-font` whenever rendering book titles, Arabic citations, or Malayalam student records.
- **Do** keep dashboard tables compact: use `text-xs` or `text-sm`, bounded row heights, and sticky column headers.
- **Do** ensure all dashboard interactive components support both Light and Dark themes via Tailwind `dark:` variants.
- **Do** provide immediate keyboard focus rings (`focus-visible:ring-1 focus-visible:ring-ring`) on all dashboard action triggers.

### Don't:
- **Don't** add drop shadows or gradients to dashboard data tables or management forms.
- **Don't** use decorative uppercase pills or marketing tags inside administrative data grids.
- **Don't** place public marketing slogans, testimonials, or pricing tables inside the dashboard.
- **Don't** invent random hex colors; always use HSL semantic tokens (`border-border`, `bg-card`, `text-muted-foreground`) in dashboard views.
- **Don't** hardcode light-only colors (`bg-white`, `text-black`) inside dashboard components without their dark mode counterparts.
