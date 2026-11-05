# Tasks: Zero-Idle Resource Optimization & Polling Elimination

## Task 1: Core Admin & Table Views Polling Removal

**Description:** De-escalate background polling in core administrative components. In `DataTableComponent.jsx`, remove the 60s `router.refresh()` interval and ensure default refetch intervals stay disabled. In `StudentsClient.jsx`, remove `refetchInterval: 15000` from pending requests and remove `refetchInterval={15000}` & `limit={100000}` from the main student data table. In `AppSidebar.jsx` and `LibrarianBottomBar.jsx`, remove 30s `setInterval` count polling and load badge counts once on mount, listening for local mutations.

**Acceptance criteria:**
- [x] Remove `router.refresh()` interval from `components/DataTableComponent.jsx`.
- [x] Remove `refetchInterval: 15000` and `limit={100000}` from `components/StudentsClient.jsx`.
- [x] Remove `setInterval(fetchCounts, 30000)` and `setInterval(fetchCount, 30000)` from `components/AppSidebar.jsx`.
- [x] Remove `setInterval(fetchCount, 30000)` from `components/LibrarianBottomBar.jsx`.
- [x] Also check `components/PendingTeacherRequestsWrapper.jsx` to remove `refetchInterval: 15000`.

**Verification:**
- [x] Git grep verifies no `setInterval` or `refetchInterval` remain in touched files.
- [x] Table and sidebar render and navigate normally without console errors.

**Dependencies:** None

**Files likely touched:**
- `components/DataTableComponent.jsx`
- `components/StudentsClient.jsx`
- `components/PendingTeacherRequestsWrapper.jsx`
- `components/AppSidebar.jsx`
- `components/LibrarianBottomBar.jsx`

**Estimated scope:** Medium (4-5 files)

---

## Checkpoint: Core Views
- [ ] Admin dashboard and student tables no longer fire automated periodic requests when idle.

---

## Task 2: Operational & Student Views to On-Demand + Manual Refresh

**Description:** Convert operational views that have tight 5s–30s polling into on-demand loading with visible manual refresh triggers. In `GatePass.jsx`, replace the 5s interval with an explicit Refresh button with loading spinner in the toolbar/header, refreshing automatically after approving/rejecting a gate pass. In `MasjidDashboard.jsx`, remove the 5s polling interval while preserving window focus refetching. In `LibraryRequests.jsx`, remove the 10s interval and provide a manual refresh button. In `StudentDashboard.jsx`, remove the twin 30s intervals on the Library tab.

**Acceptance criteria:**
- [x] `components/GatePass.jsx`: Remove 5s `setInterval`; add manual Refresh button; refresh upon user actions.
- [x] `components/masjid-attendance/MasjidDashboard.jsx`: Remove 5s `setInterval` polling loop.
- [x] `components/LibraryRequests.jsx`: Remove 10s `setInterval`; add manual Refresh button.
- [x] `components/StudentDashboard.jsx`: Remove 30s intervals for `fetchLibraryBooks` and `fetchPendingRequests`.

**Verification:**
- [x] Git grep confirms removal of 5s, 10s, and 30s polling in these files.
- [x] Manual refresh buttons trigger fetches properly without page reloads.

**Dependencies:** Task 1

**Files likely touched:**
- `components/GatePass.jsx`
- `components/masjid-attendance/MasjidDashboard.jsx`
- `components/LibraryRequests.jsx`
- `components/StudentDashboard.jsx`

**Estimated scope:** Medium (4 files)

---

## Checkpoint: Operational Views
- [ ] Gate pass, library, and masjid portals operate smoothly on-demand with instant manual refresh and zero idle network calls.

---

## Task 3: Backend Database Indexing & API Lean Query Optimization

**Description:** Optimize database read paths and reduce serverless CPU duration per invocation. In `models/User.js`, add compound indexes on high-frequency query filters (`{ roles: 1, profileUpdateStatus: 1 }`, `{ "studentSpecificField.classId": 1 }`, `{ "studentSpecificField.batchId": 1 }`). In `app/api/users/route.js`, apply `.lean()` on queries where document instances are not modified, and enforce sane pagination defaults to prevent unbounded memory serialization.

**Acceptance criteria:**
- [x] In `models/User.js`: define compound indexes for `roles` + `profileUpdateStatus`, `studentSpecificField.classId`, and `studentSpecificField.batchId`.
- [x] In `app/api/users/route.js`: use `.lean()` on the find query and eliminate heavy unindexed collation overhead when not performing student admission sorting.
- [x] Ensure API response schema remains 100% backward-compatible with frontend data tables.

**Verification:**
- [x] Test GET `/api/users?roles=Teacher&profileUpdateStatus=Pending&limit=1` returns expected JSON structure rapidly.
- [x] Test GET `/api/users?roles=Student&classId=...` returns formatted students with `.lean()`.

**Dependencies:** None (can be done in parallel or sequence)

**Files likely touched:**
- `models/User.js`
- `app/api/users/route.js`

**Estimated scope:** Small (2 files)

---

## Checkpoint: Database Efficiency
- [ ] Database queries are index-backed and serialization memory/CPU footprint is minimized.

---

## Task 4: System-Wide Audit & Production Build Verification

**Description:** Perform a comprehensive audit for any remaining unthrottled timer or polling leaks across the entire codebase. Run the full Next.js production build (`npm.cmd run build`) to ensure zero bundling, lint, or type issues.

**Acceptance criteria:**
- [x] Complete codebase scan confirms zero automated `setInterval` or `refetchInterval` calling APIs in the background.
- [x] Full Next.js production build passes with exit code 0 (`npm.cmd run build`).

**Verification:**
- [x] `git grep -in "setInterval" components/ app/` shows only non-network UI timers (e.g. countdowns, image carousel rotation).
- [x] `npm.cmd run build` finishes cleanly.

**Dependencies:** Tasks 1, 2, 3

**Files likely touched:**
- None (verification and test execution)

**Estimated scope:** Small

---

## Checkpoint: Complete
- [x] All 4 tasks completed.
- [x] Scofist client operates with zero idle background requests.
- [x] Serverless resource consumption is safely contained within Vercel Free Tier limits.
