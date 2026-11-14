# Implementation Plan: Zero-Idle Resource Optimization & Free-Tier Decoupling

## Overview
Eliminate serverless resource exhaustion on Vercel's free hobby tier (which was paused at 6h 47m Fluid Active CPU and 422K invocations) and ensure compatibility with zero-cost deployment architectures. This plan removes all 6 background client-side polling loops, eliminates edge middleware recursive fetch and overhead, configures resilient TanStack Query caching, and adds Edge CDN caching to high-frequency read endpoints.

---

## Architecture Decisions
1. **Decouple Middleware from Ephemeral Recursive HTTP Calls:** Remove `fetchUserProfile` HTTP calls from Edge middleware. Rely on compact JWT claims and fast-path edge validation to eliminate the 1h 20m Edge CPU burn.
2. **Zero-Idle Client Architecture:** Replace all `setInterval` / `router.refresh()` polling loops across components with event-driven React Query mutations and on-demand manual refresh.
3. **Resilient Global QueryClient Defaults:** Set global `staleTime: 5 * 60 * 1000` (5 minutes) and `refetchOnWindowFocus: false` to stop tab-switch refetch avalanches across the school's staff and students.
4. **Edge CDN Caching for Read-Heavy Endpoints:** Inject `Cache-Control: public, s-maxage=300, stale-while-revalidate=600` on public and school schedule/program endpoints so requests are served directly from Vercel's Edge CDN with 0s Serverless CPU.
5. **Strict Pagination & Projection Guards:** Cap `app/api/users` at `Math.min(limit, 50)` with `.lean()` and indexed field projections to eliminate heavy memory hydration.

---

## Task List

### Phase 1: Middleware & Edge Optimization
- [x] **Task 1: Optimize Edge Middleware & Eliminate Recursive Fetch Loop**
  - Remove `fetchUserProfile` HTTP fetches from Edge middleware (`middleware.js`).
  - Optimize `config.matcher` and bypass unnecessary Edge processing for public static assets.

### Phase 2: Client-Side Polling Elimination (Vertical Slices)
- [x] **Task 2: Global QueryClient Hardening in Providers**
  - Set `staleTime: 5 * 60 * 1000`, `refetchOnWindowFocus: false`, and `refetchOnReconnect: false` in `components/Providers.jsx`.
- [x] **Task 3: Eliminate Polling in Attendance, Masjid & DataTable Components**
  - Remove 5s `setInterval` in `components/GatePass.jsx`.
  - Remove 5s `setInterval` in `components/masjid-attendance/MasjidDashboard.jsx`.
  - Remove 60s `router.refresh()` loop and default interval in `components/DataTableComponent.jsx`.

### Checkpoint 1: Foundation & Attendance Polling
- [x] `npm run lint` and syntax check pass cleanly.
- [x] GatePass, Masjid, and DataTable components render without background timer execution.

### Phase 3: Library, Dashboard & Sidebar Polling Elimination
- [x] **Task 4: Eliminate Polling in Library & Student Dashboards**
  - Remove 10s `setInterval` in `components/LibraryRequests.jsx`.
  - Remove 30s `setInterval` in `components/LibrarianBottomBar.jsx`.
  - Remove twin 30s intervals in `components/StudentDashboard.jsx`.
- [x] **Task 5: Optimize Sidebar Count & Students Client Query Ceiling**
  - Remove 30s `setInterval` in `components/AppSidebar.jsx`; trigger counts on mount and mutation invalidation.
  - Drop unbounded `limit={100000}` and remove 15s interval in `components/StudentsClient.jsx`.

### Checkpoint 2: All Polling Eliminated
- [x] Zero background `setInterval` timers remain in client components.
- [x] All dashboard mutations invalidate queries reliably without timers.

### Phase 4: API Edge CDN Caching & Query Hardening
- [x] **Task 6: Add Edge CDN Headers to Read-Heavy Endpoints & Hardened Users API**
  - Add `Cache-Control: public, s-maxage=300, stale-while-revalidate=600` to `/api/programs`, `/api/divisions`, `/api/schedules`.
  - Hardened `app/api/users/route.js` with `limit: 50` ceiling and compound index in `models/User.js`.

### Checkpoint 3: Complete
- [x] Production build (`npm run build`) compiles cleanly (100% pass rate).
- [x] Codebase operates at strictly zero-idle CPU overhead.

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
| :--- | :--- | :--- |
| **Outdated Client UI State without Polling** | Med | TanStack Query mutation invalidation automatically refetches fresh data when any user creates, edits, or deletes records. Add manual refresh button where needed. |
| **Edge Middleware Role Desynchronization** | High | Preserve role token payload validation and update cookie handling without blocking on external HTTP fetches in edge isolates. |
| **Build OOM during verification** | High | Use Turbopack dev/build flags and existing `cross-env NODE_OPTIONS` when compiling. |
