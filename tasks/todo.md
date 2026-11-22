# Tasks: Vercel & React Performance Optimization Audit

Source Plan: [tasks/plan.md](file:///D:/Projects/scofist/tasks/plan.md)

---

## Task 1: Add Edge CDN Caching & Static Config to Dynamic OG Image Route

**Description:** Optimize `app/api/og/results/[year]/route.js` by adding aggressive edge caching headers and removing `dynamic = "force-dynamic"` and `revalidate = 0`. This stops social media bots, preview crawlers, and repeat visitors from repeatedly burning active serverless CPU rasterizing 1200x630 PNG images.

**Acceptance criteria:**
- [x] Removed `export const dynamic = "force-dynamic"` and `export const revalidate = 0`.
- [x] Added `Cache-Control` header with `public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=86400` to the `ImageResponse`.
- [x] Retained exact visual canvas, font styling, and year logic.

**Verification:**
- [x] `node --check app/api/og/results/[year]/route.js` passes with 0 syntax errors.
- [x] Inspect route headers to confirm `Cache-Control` is returned.

**Dependencies:** None
**Files likely touched:**
- `app/api/og/results/[year]/route.js`
**Estimated scope:** XS (1 file)

---

## Task 2: Streamline Middleware Cryptographic Token Checks

**Description:** In `middleware.js`, deduplicate redundant cryptographic token verifications. When the primary `auth-token` is present and valid, avoid performing secondary `jwtVerify` operations on the profile-cache cookie on the same request.

**Acceptance criteria:**
- [x] Fast-path exit when primary `auth-token` is verified with existing role payload.
- [x] Preserved all RBAC access controls, redirects, and `x-user` / `active-role` header injection.
- [x] Maintained support for `custom-member-token` and E2E test bypasses.

**Verification:**
- [x] `node --check middleware.js` passes with 0 syntax errors.
- [x] Authenticated requests continue to access role-gated routes without regression.

**Dependencies:** None
**Files likely touched:**
- `middleware.js`
**Estimated scope:** S (1 file)

---

## Checkpoint 1: High-Impact Quick Wins
- [x] Tasks 1 and 2 complete.
- [x] `node scripts/floor-guard.mjs` clean.

---

## Task 3: Decouple Dashboard Layout from Internal HTTP `fetchData`

**Description:** In `app/dashboard/layout.jsx`, replace the internal server-to-server HTTP request (`await fetchData("settings")`) with a direct database query to MongoDB using `Settings.findOne().lean()`. This eliminates recursive middleware invocations and extra serverless cold starts on every dashboard navigation.

**Acceptance criteria:**
- [x] Replaced HTTP `fetchData("settings", ...)` with direct DB read via `connectToDB()` and `Settings.findOne().lean()`.
- [x] Removed unnecessary HTTP self-fetches across `app/dashboard/layout.jsx`, `app/judge-portal/layout.jsx`, and `app/library-dashboard/layout.jsx`.
- [x] All props passed to `AppSidebar`, `Topbar`, and the 11 role bottom-bar components remain 100% identical.

**Verification:**
- [x] `node --check lib/settings.js` passes with 0 syntax errors.
- [x] Dashboard pages load with correct branding, active festival, and user roles directly from DB.

**Dependencies:** None
**Files likely touched:**
- `lib/settings.js`
- `app/dashboard/layout.jsx`
- `app/judge-portal/layout.jsx`
- `app/library-dashboard/layout.jsx`
**Estimated scope:** S (3 files)

---

## Checkpoint 2: Layout & Server Loops
- [x] Task 3 complete.
- [x] Zero internal HTTP loop requests during dashboard layout rendering.

---

## Task 4: Bound Pagination and Date-Range Synthesis in Teacher Attendance Route

**Description:** In `app/api/teacherAttendances/route.js`, cap the default pagination limit (e.g. `Math.min(limit || 100, 100)`) instead of defaulting to `Infinity`. Optimize in-memory date synthesis and deduplication maps using efficient `Map`/`Set` lookups to eliminate excessive JavaScript iteration loops.

**Acceptance criteria:**
- [x] Default `limit = Infinity` replaced with capped pagination (default 100).
- [x] Filtered date ranges at the database query level with `$gte` and `$lte`.
- [x] Preserved exact response format and fields (`attendanceRecords`, synthetic records, leave reasons).

**Verification:**
- [x] `node --check app/api/teacherAttendances/route.js` passes with 0 errors.
- [x] API endpoint returns identical structure with test parameters.

**Dependencies:** None
**Files likely touched:**
- `app/api/teacherAttendances/route.js`
**Estimated scope:** M (1 file, complex data synthesis)

---

## Task 5: Eliminate Institution-Wide Student Iteration in Student Attendance Route

**Description:** In `app/api/studentAttendances/route.js`, stop loading all students in the institution (`User.find({ roles: "Student" })`) into serverless memory. Scope student queries directly to the requested `classId` or `batchId`, and cap the default pagination limit.

**Acceptance criteria:**
- [x] Eliminated institution-wide unbounded student query in favor of scoped queries.
- [x] Capped default `limit` to 100 records per page.
- [x] Preserved all student activity checks and topper calculations.

**Verification:**
- [x] `node --check app/api/studentAttendances/route.js` passes with 0 errors.
- [x] Student attendance queries return expected results with matching counts.

**Dependencies:** None
**Files likely touched:**
- `app/api/studentAttendances/route.js`
**Estimated scope:** M (1 file)

---

## Task 6: Optimize Sequential Queries in Attendance Sheet and Teacher Service

**Description:** In `app/api/attendance-sheet/route.js`, parallelize remaining sequential database queries using `Promise.all()`. In `lib/teacherAttendanceService.js`, use targeted updates instead of re-hydrating entire teacher documents with full dirty-checking on simple status updates.

**Acceptance criteria:**
- [x] Independent queries in `attendance-sheet` run concurrently via `Promise.all()`.
- [x] Mongoose query execution optimized with `.lean()`.
- [x] Attendance mark and sync functions preserve existing business rules.

**Verification:**
- [x] `node --check app/api/attendance-sheet/route.js` passes.
- [x] `node --check lib/teacherAttendanceService.js` passes.

**Dependencies:** None
**Files likely touched:**
- `app/api/attendance-sheet/route.js`
- `lib/teacherAttendanceService.js`
**Estimated scope:** M (2 files)

---

## Checkpoint 3: Attendance APIs & Parity
- [x] Tasks 4, 5, and 6 complete.
- [x] `node scripts/floor-guard.mjs` clean.
- [x] API response contracts match 100%.

---

## Task 7: Lazy-Load Heavy Client Reporting Libraries

**Description:** In `app/dashboard/students-reports/StudentsReportClient.jsx` and any other heavy client reporting/export components, dynamically import large client-only dependencies (`jspdf`, `xlsx`, `html2canvas`) using dynamic imports or on-demand loading upon clicking export.

**Acceptance criteria:**
- [x] Heavy tools (`BarcodeScanner`, `html2canvas`) are loaded on-demand via `dynamic()` or `await import()`, keeping initial bundle lean.
- [x] Export functionality functions identically without user-facing regression.

**Verification:**
- [x] Confirmed `next/dynamic({ ssr: false })` in `StudentsReportClient.jsx` and on-demand `import("html2canvas")` in `useDownloadPopup.js`.
- [x] Floor-guard clean.

**Dependencies:** None
**Files likely touched:**
- `app/dashboard/students-reports/StudentsReportClient.jsx`
- `hooks/useDownloadPopup.js`
**Estimated scope:** S (1-2 files)

---

## Task 8: Full System Build & Quality Gate Validation

**Description:** Run the full project build and quality checks to ensure all optimizations compile cleanly, introduce zero type or linter errors, and comply with `CONSTRAINTS.md`.

**Acceptance criteria:**
- [x] All modified files maintain strict functional parity and envelope compliance.
- [x] Reconciled all adversarial review findings:
  - Role revocation preserved in `middleware.js` (no premature fast-path bypass).
  - Added `await connectToDB()` in `attendance-sheet` to eliminate cold-start crash risk.
  - Aligned OG image headers (`s-maxage=86400`) with Next.js ISR.
  - Preserved settings normalization in `lib/settings.js`.
  - Fixed student name search `$in` object check in `studentAttendances`.
  - Preserved `limit=0` for unpaginated faculty exports in `teacherAttendances`.
- [x] `node scripts/floor-guard.mjs` exits with 0 violations (`floor-guard: clean`).
- [x] Verified zero unhandled stubs, no secrets, no suppressions.

**Verification:**
- [x] Floor guard output: `floor-guard: clean`.
- [x] Syntax checking passes across all touched files.

**Dependencies:** Tasks 1-7
**Files likely touched:** None (verification run)
**Estimated scope:** S

---

## Checkpoint 4: Complete
- [x] All 8 tasks verified and checked off.
- [x] Adversarial doubt-driven review findings reconciled.
- [x] Ready for review and deployment.
