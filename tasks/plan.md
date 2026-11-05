# Implementation Plan: Zero-Idle Resource Optimization & Polling Elimination

## Overview
Eliminate serverless CPU exhaustion on Vercel (breached at 6h 12m Fluid Active CPU and 420K invocations) by replacing blind continuous client-side polling with an on-demand, cache-first architecture. This plan de-escalates all 5s–60s polling loops across admin sidebars, student tables, gate pass, library, and masjid attendance into on-demand fetches with manual refresh actions, and hardens MongoDB indexes and lean queries in `/api/users`.

---

## Architecture Decisions
- **Zero Idle Polling:** No component is permitted to maintain an unthrottled `setInterval` or `refetchInterval` calling Vercel serverless routes while idle.
- **On-Demand & Mutation-Driven Updates:** Pages fetch once upon mounting (or reuse TanStack Query cache). Updates occur reactively when the user creates/updates/deletes a record, changes search filters, or explicitly clicks the manual "Refresh" button.
- **Standardized Manual Refresh UI:** Provide a consistent `<Button variant="outline" size="sm" onClick={refetch}>` with an animated `RefreshCw` icon on live operational views (`GatePass`, `LibraryRequests`).
- **Compound Database Indexing & Lean Serialization:** Add targeted MongoDB compound indexes on `User` collection and switch high-frequency read handlers to `.lean()` to drastically drop per-invocation CPU execution duration.

---

## Dependency Graph
```text
Task 1: Core Admin & Table Views (DataTableComponent, StudentsClient, AppSidebar, LibrarianBottomBar)
        │
        ▼
Task 2: Operational & Student Views (GatePass, LibraryRequests, MasjidDashboard, StudentDashboard)
        │
        ▼
Task 3: Backend Database Indexing & API Lean Query Optimization (User.js, /api/users/route.js)
        │
        ▼
Task 4: System-Wide Audit & Production Build Verification
```

---

## Tasks Overview

### Phase 1: Core Admin & Table Views
- [ ] **Task 1:** Remove periodic `router.refresh()` from `DataTableComponent.jsx`, remove `refetchInterval` (15000) and `limit={100000}` from `StudentsClient.jsx`, and eliminate 30s polling loops in `AppSidebar.jsx` and `LibrarianBottomBar.jsx`.

### Checkpoint: Core Views
- [ ] Admin pages and tables load cleanly with zero background polling intervals.

---

### Phase 2: Operational & Student Views
- [ ] **Task 2:** Convert `GatePass.jsx` (5s), `MasjidDashboard.jsx` (5s), `LibraryRequests.jsx` (10s), and `StudentDashboard.jsx` (30s) to on-demand data fetching with visible manual refresh buttons.

### Checkpoint: Operational Views
- [ ] Gate pass, library, and masjid portals operate smoothly on-demand with instant manual refresh and zero idle requests.

---

### Phase 3: Backend Indexing & Query Lean Optimization
- [ ] **Task 3:** Add compound indexes in `models/User.js` for roles, profile status, classId, and batchId; apply `.lean()` and sane limit ceilings in `app/api/users/route.js`.

### Checkpoint: Database Efficiency
- [ ] `/api/users` query latency and memory footprint reduced, leveraging MongoDB compound index lookups.

---

### Phase 4: Full Audit & Build Verification
- [ ] **Task 4:** Grep entire codebase for remaining unthrottled interval polls, run `npm.cmd run build`, and confirm production readiness.

### Checkpoint: Complete
- [ ] All 94+ routes build with 0 errors. Idle network activity drops to 0 requests/min.
