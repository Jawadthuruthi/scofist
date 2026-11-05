# Spec: Vercel React Performance & Bundle Optimization

## Objective
Apply critical Vercel React Best Practices to reduce client bundle sizes, eliminate server-side waterfalls, and minimize unnecessary DOM hydration across Scofist dashboard pages.

## Key Focus Areas
1. **Bundle Size Reduction (`bundle-dynamic-imports`):** Dynamically load heavy libraries (`xlsx`) only when export actions are triggered by the user in `DataTableComponent.jsx`, cutting ~800KB from initial table page chunks.
2. **Conditional Component Tree (`bundle-conditional`):** Conditionally render role-specific mobile bottom navigation bars in `app/dashboard/layout.jsx` matching the current `activeRole`, avoiding mounting 9 separate role components simultaneously.
3. **Eliminating Server-Side Waterfalls & Over-fetching (`async-cheap-condition-before-await`):** In `app/dashboard/page.jsx`, evaluate `if (activeRole === "Student")` before fetching 7 unused admin-only endpoints (`periods`, `teachersLeaveRecord`, `attendances`, etc.), cutting student SSR latency and database overhead.
4. **Parallel Query Execution (`async-parallel`):** In `app/api/attendance-sheet/route.js`, parallelize independent database queries (`Attendance.find` and `LeaveRecord.find`) using `Promise.all`.
5. **Lazy State Initialization (`rerender-lazy-state-init`):** Replace inline date/cookie calculations in `useState` calls with lazy function initializers (`useState(() => ...)`) to avoid redundant re-execution on every render.

---

## Tech Stack & Commands
- **Framework:** Next.js 15.2+ (App Router)
- **Frontend:** React 18, Tailwind CSS, Lucide Icons
- **Database:** MongoDB Atlas, Mongoose 8.11+
- **Hosting Target:** Vercel Hobby Tier

### Commands
- Dev Server: `npm run dev`
- Lint: `npm run lint`
- Production Build Verification: `npm run build`

---

## Project Structure & Target Files
```text
components/
├── DataTableComponent.jsx     → Lazy-load xlsx on export button click
├── Attendance.jsx             → Convert inline useState date format to lazy initializer
└── HifzDoura.jsx              → Convert inline useState date/cookie to lazy initializers

app/
├── dashboard/
│   ├── layout.jsx             → Role-gate bottom bars based on activeRole
│   └── page.jsx               → Branch student dashboard fetch before admin endpoints
└── api/
    └── attendance-sheet/
        └── route.js           → Parallelize Attendance and LeaveRecord queries via Promise.all
```

---

## Code Style & Patterns

### 1. Dynamic Library Import
Load large libraries only when the user invokes the action:
```javascript
// Good: Loaded only when user clicks Export
const handleExportExcel = async () => {
  const XLSX = await import("xlsx");
  const worksheet = XLSX.utils.json_to_sheet(excelData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  XLSX.writeFile(workbook, "Export.xlsx");
};
```

### 2. Early Branching Before Expensive Fetches
Check cheap synchronous invariants before awaiting remote promises:
```javascript
// Good: Student skips 7 admin queries entirely
if (activeRole === "Student") {
  const [classes, batches, updatesData, debtBalances] = await Promise.all([...]);
  return <StudentDashboard ... />;
}

// Admin fetch only executes for admin/teacher roles
const [classes, batches, teachers, periods, attendances, ...] = await Promise.all([...]);
```

### 3. Role-Gated Component Mounting
Mount only the UI tree corresponding to the active session:
```jsx
{activeRole === "Teacher" && <TeacherBottomBar user={user} activeRole={activeRole} />}
{activeRole === "Librarian" && <LibrarianBottomBar user={user} activeRole={activeRole} />}
{activeRole === "College Admin" && <CollegeAdminBottomBar user={user} activeRole={activeRole} />}
```

### 4. Lazy State Initializers
Prevent executing functions during every render pass:
```javascript
// Good: Runs once on component mount
const [filterDate, setFilterDate] = useState(() => formatDate(new Date()));
const [activeYear, setActiveYear] = useState(() => Cookies.get("active-year") || "");
```

---

## Boundaries
- **Always do:**
  - Preserve exact export behavior, file names, and table formatting for Excel downloads.
  - Preserve all bottom bar navigation links, active states, and role permissions.
  - Verify full production build passes (`npm run build`).
- **Ask first:**
  - Modifying public API contracts or route URLs.
- **Never do:**
  - Never break SSR fallback behavior if an optional prop is missing.
  - Never regress student dashboard widgets (classes, batches, updates, debt balances).

---

## Success Criteria
1. **Bundle Size Reduction:** `DataTableComponent` client bundle no longer embeds static `xlsx`; initial load for all `/dashboard/*` data tables drops by ~800KB uncompressed.
2. **DOM Tree Cleanup:** Dashboard layout mounts only 1 role-appropriate bottom bar rather than 9 redundant component trees.
3. **Student SSR Latency Reduction:** Loading `/dashboard` as a Student runs 2–4 queries instead of 11 queries, reducing serverless execution time by >50% for student logins.
4. **Clean Production Build:** `npm.cmd run build` completes with exit code 0 across all 94 routes.

---

## Open Questions
1. **Bottom Bar Fallback:** If a user has no active role selected (or a custom role), should the bottom bar hide completely or fallback to a default view? *(Recommended: Hide bottom bar when activeRole does not match any bottom bar component)*.
2. **Student Dashboard Updates:** Currently `updates` are fetched on `/dashboard` for students. Are there any other widgets on the student dashboard that require server-prefetched data? *(Recommended: Preserve existing `classes`, `batches`, `updates`, and `debtBalances`)*.
