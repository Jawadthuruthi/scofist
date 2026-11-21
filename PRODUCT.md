# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary Users:** Higher Education & Degree College administrators (`College Admin`), academic faculty and teachers (`Teacher`), department heads, and enrolled students (`Student`).
- **Specialized Operational Roles:**
  - Finance Officers (`Finance`): Tuition and fee collection, transaction ledgers, debtor monitoring, and invoice reconciliation.
  - Librarians & Assistants: Physical cataloging, barcode/QR checkout/check-in, membership records, and bulk inventory ingest.
  - Extracurricular & Event Leadership (`Program Committee`, `Program Leader`, `Literary Leader`, `Spark Admin`): Managing event stages, category allocations, participant rosters, and team scores.
  - Event Judges (`Judge`): Dedicated external/internal judge portal for live event scoring, criteria evaluation, and result submission.
  - Central Trust Administrators (`Org Admin`): Oversight across organizational branches and institutional settings.

## Product Purpose

Scofist is an integrated multi-role Education Management System (EMS) engineered to unify academic administration, financial ledgers, campus facilities, and extracurricular programs into a cohesive, centralized operating platform.

Success means zero institutional fragmentation:
- Teachers take period attendance in seconds with zero friction.
- Administrators schedule batches, publish exam results, and verify students without manual paperwork.
- Finance teams balance fee accounts and enforce clearance policies with full auditability.
- Event committees run high-stakes, multi-category cultural and literary fests with live scoring and automated result computation—all within the same platform ecosystem.

## Positioning

An all-in-one institutional operating system that bridges core academic governance (period timetables, attendance, exams, fees, library) directly with extracurricular fest programs, participant scoring, and judge evaluation portals in a unified, multi-role web environment.

Unlike traditional, siloed school ERPs that require disparate third-party tools or spreadsheets for fests and events, Scofist unifies academic rigor and campus culture into one high-throughput operational platform.

## Operating Context

- **Environments:** Desktop workstations in administrative, finance, and faculty offices; laptops and tablets in classrooms, laboratories, and library circulation desks; mobile devices and tablets for live on-stage and backstage event scoring.
- **Rituals & Workflows:**
  - Daily morning roll calls, period-level attendance logging, and automated absentee cron triggers.
  - Academic calendar batch promotions, division assignments, and timetable scheduling.
  - Semester exam mark entry, grade evaluation sheets, and report card generation.
  - Fee invoice issuance, payment collection, and digital clearance certificate generation.
  - Physical book circulation with QR/barcode scanning and TSV batch catalog imports.
  - Event setup, participant badge/code-letter generation, live rubric-based judging, and real-time team point aggregation.

## Capabilities and Constraints

- **Core Capabilities:**
  - Multi-role JWT authentication and Edge Middleware role-based access control.
  - Real-time student period attendance tracking with automated background cron workers for missing attendance and absentee marking.
  - Timetable, batch, division, and faculty course allocation engine.
  - Examination result processing, evaluation sheets, and grade calculations.
  - Financial ledger, accounts receivable, fee tracking, and debtor management.
  - Comprehensive library cataloging with barcode/QR generation and bulk import pipelines.
  - Extracurricular fest management: participant tracking, category judging portal, evaluation sheets, and team point leaderboards.
  - Student self-service: admissions, applications, clearance certificates, and academic records.
- **Technical Constraints:**
  - **Vercel Serverless (Hobby Tier):** Strict 10-second execution timeout per route; maximum 4.5MB request/response payload size; ephemeral stateless runtime (`/tmp` only).
  - **MongoDB Atlas (M0 Shared Tier):** Strict connection pool boundaries (cached singleton via `@/lib/db.js`, `bufferCommands: false`); mandatory `.lean()` on read queries; mandatory field projections (`.select(...)`); strict pagination limits (default 20, max 100); indexed query fields.
  - **Asset Storage:** Media and documents must be uploaded directly to Cloudinary or presigned S3/R2 storage, never buffered in memory or saved to disk.
- **Key Terminology:** Batches, Divisions, Periods, Clearance Certificates, Code Letters, Debtors, Program Committee, Spark Admin, Judge Portal, Evaluation Sheets.

## Brand Commitments

- **Name:** Scofist
- **Voice & Tone:** High-density, utilitarian, professional, and clear.
- **Design Philosophy:** Operational clarity over decorative fluff; dense, actionable, and rapid navigation tailored for everyday power users.

## Evidence on Hand

- **Codebase:** Next.js 15 App Router codebase under `app/`, Mongoose data models under `models/`, shared utilities under `lib/` and `libservices/`.
- **System Architecture & Operational Boundaries:** Fully documented in [AGENTS.md](file:///C:/projects/scofist/AGENTS.md) and [README.md](file:///C:/projects/scofist/README.md).
- **Domain Surfaces:** Fully scaffolded route trees in `app/dashboard/` (40+ functional areas), `app/(client)/`, `app/judge-portal/`, and `app/library-dashboard/`.
- **Absences:** No commercial customer testimonials, marketing fluff, or pricing tiers currently exist; future work must not fabricate them.

## Product Principles

1. **High-Density Operational Precision:** Optimize interface layouts for scanability, keyboard efficiency, rich tabular data, and minimal friction. High data density and visual clarity take precedence over sprawling whitespace.
2. **Zero-Fragmentation Unification:** Maintain cohesive interoperability between traditional academic routines (attendance, grading, fees) and campus activities (fests, clubs, judging).
3. **Strict Resource Discipline:** Respect serverless execution windows and shared database budgets at every layer—enforcing indexed queries, lean hydration, bounded pagination, and direct-to-cloud asset transfers.
4. **Role-Gated Clarity:** Deliver tailored, role-specific views (`College Admin`, `Teacher`, `Finance`, `Judge`, `Student`) that surface relevant actions immediately while filtering out ambient noise.

## Accessibility & Inclusion

- Adherence to WCAG 2.1 AA standards.
- Full keyboard accessibility for high-frequency workflows (data tables, form dialogs, selection dropdowns).
- High visual contrast across dashboard data grids, status badges, and typography.
