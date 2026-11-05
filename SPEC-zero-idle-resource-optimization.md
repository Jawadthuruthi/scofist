# Spec: Zero-Idle Resource Optimization & Polling Elimination (Direction A)

## Objective
Eliminate serverless resource exhaustion on Vercel's free hobby tier (breached at 6h 12m Fluid Active CPU and 420K invocations) by replacing all client-side background polling loops with an event-driven, cache-first, on-demand architecture. Ensure the system operates strictly within Vercel's 4-hour monthly CPU limit and MongoDB Atlas M0 free tier quotas without degrading UX.

## Core Problem & Scope
1. **Background Polling Loops:** Six UI components actively poll API routes every 5–60 seconds even when idle or in background tabs, generating hundreds of thousands of unnecessary serverless invocations.
2. **Periodic Server Component Rerenders:** `DataTableComponent` triggers `router.refresh()` every 60 seconds, forcing full server-side route re-evaluation.
3. **Expensive Endpoint Overhead:** `/api/users` lacks lean projections and runs in-memory collation sorts and full hydration over large result sets without proper compound indexes on `models/User.js`.

---

## Tech Stack & Commands
- **Framework:** Next.js 15.2+ (App Router)
- **State & Data Fetching:** React 18, TanStack Query v5 (`@tanstack/react-query`)
- **Database & ODM:** MongoDB Atlas, Mongoose 8.11+
- **Hosting Target:** Vercel Hobby Tier (4.0 hours Fluid Active CPU, 1M invocations max)

### Commands
- Dev Server: `npm run dev`
- Lint: `npm run lint`
- Production Build Verification: `npm run build`

---

## Project Structure & Target Files
```text
components/
├── AppSidebar.jsx                         → Remove 30s setInterval polling; load on mount & invalidate on mutation
├── DataTableComponent.jsx                 → Remove router.refresh() 60s loop; ensure refetchInterval defaults to 0
├── GatePass.jsx                           → Remove 5s setInterval; replace with on-demand refresh & search
├── LibraryRequests.jsx                    → Remove 10s setInterval; refresh on mount and after approvals/rejections
├── LibrarianBottomBar.jsx                 → Remove 30s setInterval count polling
├── StudentsClient.jsx                     → Remove refetchInterval (15000) & drop unbounded limit={100000}
├── StudentDashboard.jsx                   → Remove twin 30s intervals on Library tab
└── masjid-attendance/MasjidDashboard.jsx  → Remove 5s setInterval polling

models/
└── User.js                                → Add compound indexes for { roles: 1, profileUpdateStatus: 1 } and { "studentSpecificField.classId": 1 }

app/api/users/route.js                     → Apply .lean(), remove redundant in-memory collation when unnecessary, enforce sane limit ceilings
```

---

## Code Style & Conventions

### 1. Zero-Idle TanStack Query Pattern
Never use `setInterval` to refetch data. Rely on query keys and mutation invalidation:
```javascript
// Good: Query cached, refetched only on mount or user mutation
const { data, refetch, isFetching } = useQuery({
  queryKey: ["gatePassLogs", date],
  queryFn: () => fetchLogs(date),
  staleTime: 5 * 60 * 1000, // Fresh for 5 minutes
  refetchOnWindowFocus: false,
});

// Mutations automatically keep views in sync:
const mutation = useMutation({
  mutationFn: updateLogStatus,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["gatePassLogs"] });
  },
});
```

### 2. Manual Action / Refresh UI Pattern
For real-time operational views (e.g. `GatePass.jsx` or `LibraryRequests.jsx`), provide an explicit, lightweight refresh button with spinner state instead of automated polling:
```jsx
<Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
  <RefreshCw className={cn("h-4 w-4 mr-1", isFetching && "animate-spin")} />
  Refresh
</Button>
```

### 3. API Lean Projection Standard
High-frequency GET routes must avoid hydrating heavy Mongoose documents:
```javascript
const users = await User.find(query, projections)
  .lean()
  .skip(page * limit)
  .limit(Math.min(limit, 100));
```

---

## Boundaries
- **Always do:**
  - Verify every mutation (`create`, `update`, `delete`) invalidates its associated React Query cache keys so stale data is never shown.
  - Preserve all existing user permissions and functionality.
  - Ensure zero unhandled exceptions when network calls are user-initiated.
- **Ask first:**
  - Adding any new external packages or changing database schema definitions outside indexing.
- **Never do:**
  - Never leave an unthrottled `setInterval` or `refetchInterval` hitting API routes in any component.
  - Never use unbounded queries (such as `limit={100000}`) without server-side pagination constraints.
  - Never defeat Vercel timeouts with hacky retries or busy loops.

---

## Success Criteria
1. **Zero Automated Network Traffic When Idle:** Leaving the browser open on any dashboard, table, or portal (including `GatePass` and `StudentsClient`) results in **0 API calls** while the user is inactive.
2. **Immediate Reaction to Writes:** Whenever an admin or user creates, updates, or deletes a record, the local UI updates immediately via React Query invalidation or optimistic update.
3. **Database Performance Boost:** `/api/users` requests for pending profiles and student listings use indexed queries and lean hydration, dropping individual function CPU execution time by >40%.
4. **Clean Production Build:** `npm run build` succeeds with zero errors or broken imports.
5. **Projected Resource Burn:** Monthly serverless invocations drop from ~420K to under 50K, and Fluid Active CPU drops from 6.2 hours to < 1.0 hour.

---

## Open Questions & Decisions for Approval
1. **GatePass & Masjid Attendance UX:** Will users be satisfied with a visible "Refresh" button alongside automatic refresh on search and approval, or do you require an optional user-toggled "Live Mode" (which auto-refreshes only while the tab is actively visible)? *(Recommended: Standard on-demand + visible refresh button)*.
2. **Badge Counts in AppSidebar:** Sidebar counters (e.g., pending profile requests, pending book requests) will load once on mount and update when an admin acts on a request in their session. Is this acceptable? *(Recommended: Yes)*.
