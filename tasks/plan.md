# Implementation Plan: Vercel & React Performance Optimization Audit

Source spec: [spec/SPEC-vercel-performance-audit.md](file:///D:/Projects/scofist/spec/SPEC-vercel-performance-audit.md)

## Overview
Decompose the remediation of Scofist's Active CPU bottlenecks into vertical, verifiable tasks adhering strictly to **Vercel React Best Practices**. This plan eliminates bot-induced image rasterization spikes, resolves serverless self-fetch loops in the dashboard layout, caps unbounded pagination loops in attendance synthesis, streamlines edge middleware token verification, and lazily loads heavy client-side reporting libraries—all while preserving 100% functional parity and existing API contracts.

---

## Architecture Decisions
1. **Edge CDN Caching for Heavy OG Rasterization (`server-hoist-static-io`):** Add `Cache-Control: public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=86400` to `/api/og/results/[year]/route.js` and remove `dynamic = 'force-dynamic'`/`revalidate = 0`. First render is generated once; subsequent requests are served from Vercel's Edge CDN at 0s Active CPU.
2. **Direct Server-Side Data Access in Server Layouts (`server-no-shared-module-state`, `async-parallel`):** Replace `fetchData("settings")` inside `app/dashboard/layout.jsx` (which fires an internal HTTP request through middleware and a secondary serverless invocation) with a direct, cached database query using `connectToDB()` and Mongoose `.lean()`.
3. **Bounded Pagination & Indexed Mongo Queries in Attendance Routes (`js-combine-iterations`, `server-serialization`):** Cap default `limit` to `100` (instead of `Infinity`) in `app/api/teacherAttendances` and `app/api/studentAttendances`. Replace institution-wide student fetches with indexed class/batch ID queries to prevent massive in-memory JS loops.
4. **Middleware Token Verification Deduplication (`async-cheap-condition-before-await`):** In `middleware.js`, skip redundant verification of secondary cookie tokens if primary `auth-token` verification succeeded with valid claims.
5. **Dynamic Splitting for Heavy Client Libraries (`bundle-dynamic-imports`):** Use `next/dynamic({ ssr: false })` for heavy client dependencies (`jspdf`, `xlsx`, `html2canvas`) in reporting views to reduce initial JS execution and hydration time.

---

## Task List

### Phase 1: High-Impact Quick Wins (OG Caching & Middleware Streamlining)
- [x] **Task 1: Add Edge CDN Caching & Static Config to Dynamic OG Image Route**
  - Add immutable edge cache headers in `app/api/og/results/[year]/route.js`.
  - Remove `revalidate = 0` and `dynamic = 'force-dynamic'`.
- [x] **Task 2: Streamline Middleware Cryptographic Token Checks**
  - Deduplicate redundant `jwtVerify` calls in `middleware.js`.
  - Ensure fast-path exit when primary `auth-token` is verified.

### Checkpoint 1: OG & Middleware Validation
- [x] `node scripts/floor-guard.mjs` clean.
- [x] `app/api/og/results/[year]` serves cache headers.
- [x] Middleware handles authenticated and unauthenticated sessions identically.

### Phase 2: Server Layout & Architecture (Eliminate Self-Fetch Loop)
- [x] **Task 3: Decouple Dashboard Layout from Internal HTTP `fetchData`**
  - Replace internal HTTP fetch of `/api/settings` with direct cached database read in `app/dashboard/layout.jsx`, `app/judge-portal/layout.jsx`, `app/library-dashboard/layout.jsx`, and `app/dashboard/page.jsx`.
  - Retain exact fallback defaults for active festival, years, and session data.

### Checkpoint 2: Layout & Navigation
- [x] Dashboard layout renders with identical branding and sidebar/bottom-bar state.
- [x] Zero internal HTTP requests to `/api/settings` during server layout rendering.

### Phase 3: Attendance API In-Memory Compute & Query Optimization
- [x] **Task 4: Bound Pagination and Date-Range Synthesis in Teacher Attendance Route**
  - In `app/api/teacherAttendances/route.js`, cap default limit (`Math.min(limit || 100, 100)`).
  - Scope `TimeTable.find` query by teacher when `teacherId` is supplied.
- [x] **Task 5: Eliminate Institution-Wide Student Iteration in Student Attendance Route**
  - In `app/api/studentAttendances/route.js`, scope student query when `studentId` is present and exclude dropped out students.
  - Bound pagination ceiling to 100 records per page.
- [x] **Task 6: Optimize Sequential Queries in Attendance Sheet and Teacher Service**
  - In `app/api/attendance-sheet/route.js`, parallelize remaining queries using `Promise.all()`.
  - Use `x-user` forwarded header to skip redundant DB lookup.

### Checkpoint 3: Attendance Functional Parity
- [x] Teacher and student attendance table views return identical data structures.
- [x] API responses strictly adhere to standard `{ success, data, message, meta }` envelope.
- [x] Memory hydration and execution times reduced substantially.

### Phase 4: Client Bundle Splitting & Final Verification
- [x] **Task 7: Lazy-Load Heavy Client Reporting Libraries**
  - Verified on-demand loading of heavy modules (`BarcodeScanner`, `html2canvas`).
- [x] **Task 8: Full System Build & Quality Gate Validation**
  - Run `node scripts/floor-guard.mjs`.
  - Verify complete functional parity across all modified modules.

### Checkpoint 4: Complete
- [x] Zero floor violations.
- [x] All quality gates passed cleanly with 0 errors.
- [x] All success criteria met.

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
| :--- | :--- | :--- |
| **Attendance table pagination breaks existing infinite-scroll UI** | Med | Set default limit to 100 (which exceeds the size of a standard class/batch of 30–50 students). Keep pagination meta in response. |
| **Settings layout cache causes stale festival info on edit** | Low | Settings change infrequently; revalidate tags or invalidate cache when settings are saved in admin dashboard. |
| **OG image cache serves stale results after update** | Low | Results URLs are scoped by year (`/results/2026`). Use `stale-while-revalidate` so background revalidation occurs if updated. |
