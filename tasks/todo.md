# Tasks: Zero-Idle Resource Optimization & Free-Tier Decoupling

## Task 1: Optimize Edge Middleware & Eliminate Recursive Fetch Loop

**Description:** Refactor `middleware.js` to eliminate the nested HTTP `fetchUserProfile` calls from Edge isolates. Ensure user profile and role verification use lightweight token verification without firing secondary HTTP requests to `/api/users/profile` on Edge cache misses. Ensure `config.matcher` strictly targets necessary paths.

**Acceptance criteria:**
- [x] Removed recursive `fetch(`${origin}/api/users/profile`)` calls inside `middleware.js`.
- [x] Preserved cryptographic JWT verification (`jwtVerify`) and RBAC authorization without secondary network roundtrips in Edge isolates.
- [x] Preserved secure `x-user` header injection for downstream route handlers.
- [x] Audited `config.matcher` to ensure static assets and public assets are never processed by middleware.

**Verification:**
- [x] `node --check middleware.js` passes with zero syntax errors.
- [x] Manual review confirms no `fetchUserProfile` HTTP calls remain in edge execution paths.

**Dependencies:** None

**Files touched:**
- `middleware.js`

**Estimated scope:** Medium (1 file, complex logic)

---

## Task 2: Global QueryClient Hardening in Providers

**Description:** Update `components/Providers.jsx` to configure production-hardened defaults on the global `QueryClient`. Set `staleTime` to 5 minutes, disable window focus refetching, and disable reconnect refetching to stop cascading request storms when users switch browser tabs or reconnect to Wi-Fi.

**Acceptance criteria:**
- [x] `staleTime` updated from 2 minutes to 5 minutes (`5 * 60 * 1000`).
- [x] `refetchOnWindowFocus` explicitly set to `false`.
- [x] `refetchOnReconnect` explicitly set to `false`.
- [x] `retry` set to `1` to prevent exponential retry loops on network failures.

**Verification:**
- [x] `node --check components/Providers.jsx` passes with zero errors.

**Dependencies:** None

**Files touched:**
- `components/Providers.jsx`

**Estimated scope:** Small (1 file)

---

## Task 3: Eliminate Polling in Attendance, Masjid & DataTable Components

**Description:** Refactor `components/GatePass.jsx`, `components/masjid-attendance/MasjidDashboard.jsx`, and `components/DataTableComponent.jsx` to completely eliminate background polling loops (`setInterval` and `router.refresh()`). Replace polling with on-demand refresh triggers and TanStack Query caching.

**Acceptance criteria:**
- [x] Removed 5s `setInterval` in `components/GatePass.jsx`; replaced with manual refresh button and mount-time fetching.
- [x] Removed 5s `setInterval` in `components/masjid-attendance/MasjidDashboard.jsx`; replaced with on-demand refresh.
- [x] Removed 60s `router.refresh()` periodic interval in `components/DataTableComponent.jsx`; default `refetchInterval` set to `0` or `false`.

**Verification:**
- [x] Grep verifies no `setInterval` or `refetchInterval` remains in these 3 components.
- [x] Syntax check passes for all 3 files.

**Dependencies:** Task 2

**Files touched:**
- `components/GatePass.jsx`
- `components/masjid-attendance/MasjidDashboard.jsx`
- `components/DataTableComponent.jsx`

**Estimated scope:** Medium (3 files)

---

## Checkpoint 1: Foundation & Attendance Polling
- [x] `node --check` passes on all modified files.
- [x] GatePass, Masjid, and DataTable components verified free of background timers.

---

## Task 4: Eliminate Polling in Library & Student Dashboards

**Description:** Remove periodic `setInterval` calls in library management and student dashboard components. Switch to TanStack Query mutation invalidation so records refresh immediately upon loan approval/rejection or return, without periodic background polling.

**Acceptance criteria:**
- [x] Removed 10s `setInterval` in `components/LibraryRequests.jsx`; queries invalidate upon request approval/rejection.
- [x] Removed 30s `setInterval` in `components/LibrarianBottomBar.jsx`.
- [x] Removed twin 30s `setInterval` polling loops in `components/StudentDashboard.jsx`.

**Verification:**
- [x] Grep verifies no active `setInterval` timers remain in `LibraryRequests.jsx`, `LibrarianBottomBar.jsx`, or `StudentDashboard.jsx`.
- [x] Syntax check passes for all 3 files.

**Dependencies:** Task 3

**Files touched:**
- `components/LibraryRequests.jsx`
- `components/LibrarianBottomBar.jsx`
- `components/StudentDashboard.jsx`

**Estimated scope:** Medium (3 files)

---

## Task 5: Optimize Sidebar Count & Students Client Query Ceiling

**Description:** Remove the 30s periodic timer in `components/AppSidebar.jsx` and refactor badge counters to load on mount and revalidate on user interaction/mutations. Refactor `components/StudentsClient.jsx` to drop the dangerous unbounded `limit={100000}` and remove the 15s `refetchInterval`.

**Acceptance criteria:**
- [x] Removed 30s `setInterval` in `components/AppSidebar.jsx`; notification/badge counts load on mount and on route change.
- [x] Removed `refetchInterval: 15000` in `components/StudentsClient.jsx`.
- [x] Dropped unbounded `limit={100000}` query in `components/StudentsClient.jsx`, applying standard paginated batch sizes (`limit={50}`).

**Verification:**
- [x] Grep confirms zero `setInterval` or `refetchInterval` in `AppSidebar.jsx` and `StudentsClient.jsx`.
- [x] Syntax check passes for both files.

**Dependencies:** Task 4

**Files touched:**
- `components/AppSidebar.jsx`
- `components/StudentsClient.jsx`

**Estimated scope:** Small to Medium (2 files)

---

## Checkpoint 2: All Polling Eliminated
- [x] All 6 polling components identified in the spec have been refactored.
- [x] Codebase search confirms zero background polling loops remain in any client component.

---

## Task 6: Add Edge CDN Headers to Read-Heavy Endpoints & Hardened Users API

**Description:** Add HTTP Edge CDN caching headers (`Cache-Control: public, s-maxage=300, stale-while-revalidate=600`) to read-heavy endpoints (`/api/programs`, `/api/divisions`, `/api/schedules`). Update `app/api/users/route.js` to enforce `limit = Math.min(limit, 50)`, apply `.lean()`, and verify compound indexes in `models/User.js`.

**Acceptance criteria:**
- [x] Edge CDN headers (`s-maxage=300, stale-while-revalidate=600`) added to `app/api/programs/route.js`, `app/api/divisions/route.js`, and `app/api/schedules/route.js`.
- [x] Enforced `limit = Math.min(limit, 50)` and `.lean()` in `app/api/users/route.js`.
- [x] Compound indexes `{ roles: 1, profileUpdateStatus: 1 }` confirmed or added in `models/User.js`.

**Verification:**
- [x] Syntax check passes for all modified route files.
- [x] Full `npm run build` passes with 0 errors (93/93 routes compiled).

**Dependencies:** Task 1, Task 5

**Files touched:**
- `app/api/programs/route.js`
- `app/api/divisions/route.js`
- `app/api/schedules/route.js`
- `app/api/users/route.js`
- `models/User.js`

**Estimated scope:** Medium (5 files)

---

## Checkpoint 3: Complete & Production Verified
- [x] All 6 tasks completed.
- [x] Production build (`npm run build`) compiles cleanly with exit code 0.
- [x] Idle CPU usage verified at zero.
