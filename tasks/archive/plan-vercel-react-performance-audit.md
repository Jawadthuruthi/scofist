# Implementation Plan: Vercel React Performance Audit & Remediation

## Overview
Conduct an end-to-end performance audit and surgical remediation of the Scofist EMS application across the 70 rules in the **`vercel-react-best-practices`** guide. This plan eliminates sequential database waterfalls, optimizes bundle code-splitting, establishes safe RSC serialization boundaries, and prunes unnecessary React re-renders—hardened against Vercel Hobby serverless limits (10s max duration) and MongoDB Atlas M0 resource boundaries (5 connection pool cap).

---

## Architecture Decisions
1. **Vertical Triage by Impact Priority:** Prioritize Critical (`async-`, `bundle-`) and High (`server-`, `client-`) tiers before touching micro-optimizations (`js-`).
2. **MongoDB M0 Concurrency Throttling:** Strict concurrency bounds ($\le 2-3$ queries) on `Promise.all` to never exhaust Atlas M0's 5-connection pool (`bufferCommands: false`).
3. **Preserve Configuration Invariants:** Modify `next.config.js` directly; do not create duplicate or conflicting config files.
4. **Print & Export Safety Guardrail:** Never apply `{ ssr: false }` to components participating in report card, fee receipt, or timetable PDF generation.
5. **RSC Serialization Sanitization:** Explicitly convert BSON `ObjectId` (`.toString()`) and native `Date` (`.toISOString()`) to JSON-safe primitives when crossing server-to-client boundaries.
6. **Scoped Query Keys & Error Boundaries:** Enforce hierarchical query keys (`[role, domain, id/filter]`) in TanStack Query and wrap all data-streaming Suspense boundaries with `<ErrorBoundary>`.

---

## Task List

### Phase 1: Critical Impact — Waterfalls & Async Optimization (`async-`)
- [x] **Task 1: Audit & Eliminate Waterfalls with Connection Concurrency Caps**
  - Refactor independent DB calls to `Promise.all` capped at $\le 3$ concurrent queries.
  - Preserve sequential execution for auth checks, mutations, and dependent lookups.

### Checkpoint 1: Async Waterfalls
- [x] No sequential `await` bottlenecks in high-frequency API route handlers.
- [x] Atlas M0 connection pool remains protected ($\le 2$ concurrent queries checked out).

### Phase 2: Critical Impact — Bundle Size & Dynamic Imports (`bundle-`)
- [x] **Task 2: Optimize Package Imports & Bundle Paths in `next.config.js`**
  - Audit custom internal utility imports and barrel files.
  - Verify and extend `optimizePackageImports` in `next.config.js`.
- [x] **Task 3: Selective Dynamic Code-Splitting with Print-Safety**
  - Lazy load heavy screen-only analytics/charts (`recharts`) with fixed-height skeletons.
  - Whitelist and preserve all printable/exportable report card and receipt components.

### Checkpoint 2: Bundle Size
- [x] Heavy third-party packages split out of initial route chunks.
- [x] Print/export workflows verified intact.
- [x] Full production build passed (93/93 routes compiled cleanly, exit code 0).

### Phase 3: High Impact — Server & Client Data Fetching (`server-`, `client-`)
- [x] **Task 4: Server Boundary Data Sanitization & React Cache**
  - Enforce BSON `_id` and `Date` serialization sanitization on all RSC prop transfers.
  - Apply `React.cache()` with primitive arguments for per-request user/session deduplication.
- [x] **Task 5: Scoped Client Fetching & Safe Event Listeners**
  - Apply `{ passive: true }` strictly to read-only scroll and resize listeners across client routes.
  - Preserve `preventDefault` on modal/drawer scroll-locks.

### Checkpoint 3: Data Boundaries & Caching
- [x] Zero RSC serialization warnings.
- [x] No scroll-lock interference, passive listener frame drops eliminated.

### Phase 4: Medium Impact — Re-render & Rendering Performance (`rerender-`, `rendering-`)
- [x] **Task 6: Re-render Pruning & State Colocation**
  - Eliminate redundant derived-state `useEffect` calls; use key-reset (`key={id}`) for edit forms.
  - Initialize modal state lazily from props.
- [x] **Task 7: Resilient Suspense Boundaries & CLS Prevention**
  - Create reusable `ErrorBoundary` and pair with streaming `<Suspense>` boundaries.
  - Replace ambiguous `&&` conditionals with explicit ternaries in `app/dashboard/layout.jsx`.

### Checkpoint 4: Complete
- [x] Full `npm run build` succeeds with zero errors.
- [x] All 93 routes compile cleanly.

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
| :--- | :--- | :--- |
| **Atlas M0 Connection Depletion** | High | Cap `Promise.all` concurrency to $\le 3$; maintain `@/lib/db.js` global cached connection. |
| **Print/Export DOM Destruction** | High | Whitelist printable report card / receipt components to remain SSR-rendered; do not apply `{ ssr: false }`. |
| **RSC Serialization Error** | High | Convert BSON `ObjectId` and native `Date` to strings before crossing server-to-client boundary. |
| **Vercel 10s Serverless Timeout** | High | Remove sequential waterfalls, use `.lean()` and `.select()` projections, and set `.maxTimeMS(2500)` on queries. |
