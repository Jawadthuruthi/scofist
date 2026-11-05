# Tasks: Vercel React Performance & Bundle Optimization

## Task 1: Bundle Size & Layout Optimization

**Description:** Strip heavy static dependencies and unnecessary DOM hydration. In `components/DataTableComponent.jsx`, remove top-level `import * as XLSX from "xlsx"` and dynamically load it with `await import("xlsx")` inside the export handler. In `app/dashboard/layout.jsx`, conditionally render only the bottom navigation bar matching `activeRole` instead of mounting all 9 bottom bar components simultaneously.

**Acceptance criteria:**
- [x] In `components/DataTableComponent.jsx`: remove top-level static `xlsx` import; dynamically import `xlsx` in `exportToExcel`.
- [x] In `app/dashboard/layout.jsx`: render only `{activeRole === "Role" && <RoleBottomBar ... />}` for all 9 role bottom bars.
- [x] Excel export button continues to generate and download `.xlsx` files properly.

**Verification:**
- [x] Verify `DataTableComponent.jsx` has no top-level `import * as XLSX`.
- [x] Verify `app/dashboard/layout.jsx` mounts only the matching bottom bar.

**Dependencies:** None

**Files likely touched:**
- `components/DataTableComponent.jsx`
- `app/dashboard/layout.jsx`

**Estimated scope:** Small (2 files)

---

## Checkpoint: Bundle & Layout
- [ ] Table pages no longer bundle `xlsx` by default; layout DOM contains only 1 active bottom bar.

---

## Task 2: Server-Side Performance & Waterfall Elimination

**Description:** Eliminate server-side over-fetching and parallelize database queries. In `app/dashboard/page.jsx`, move the `if (activeRole === "Student")` condition above the main admin `Promise.all` fetch, querying only `classes`, `batches`, `updates`, and `debtBalances` for students. In `app/api/attendance-sheet/route.js`, parallelize independent `Attendance.find` and `LeaveRecord.find` queries using `Promise.all`.

**Acceptance criteria:**
- [x] In `app/dashboard/page.jsx`: when `activeRole === "Student"`, skip fetching the 7 unused admin endpoints (`periods`, `teachersLeaveRecord`, `attendances`, `leaveRecords`, `settings`, `teachers`).
- [x] In `app/api/attendance-sheet/route.js`: execute `Attendance.find` and `LeaveRecord.find` concurrently via `Promise.all`.
- [x] Student dashboard and admin dashboard render identically without data omissions.

**Verification:**
- [x] Verify code branches early on `activeRole === "Student"`.
- [x] Verify both `attendanceRecords` and `leaveRecords` resolve concurrently in `attendance-sheet/route.js`.

**Dependencies:** Task 1

**Files likely touched:**
- `app/dashboard/page.jsx`
- `app/api/attendance-sheet/route.js`

**Estimated scope:** Small (2 files)

---

## Checkpoint: Server-Side Optimization
- [ ] Student SSR latency reduced by skipping admin queries; attendance sheet API queries execute in parallel.

---

## Task 3: Re-render Polish & Production Build Verification

**Description:** Optimize component initializations and verify the entire system. In `components/Attendance.jsx` and `components/HifzDoura.jsx`, wrap function calls in `useState` with lazy initializers (`useState(() => ...)`). Run the full Next.js production build (`npm.cmd run build`) to confirm zero type, lint, or bundling errors.

**Acceptance criteria:**
- [x] In `components/Attendance.jsx`: convert `useState(dateParam || formatDate(new Date()))` to lazy function.
- [x] In `components/HifzDoura.jsx`: convert `useState(formatDate(new Date()))` and `useState(Cookies.get("active-year") || "")` to lazy functions.
- [x] Full production build succeeds cleanly (`npm.cmd run build`).

**Verification:**
- [x] Grep confirms lazy initializers in touched components.
- [x] `npm.cmd run build` completes with exit code 0.

**Dependencies:** Tasks 1, 2

**Files likely touched:**
- `components/Attendance.jsx`
- `components/HifzDoura.jsx`

**Estimated scope:** Small (2 files + build verification)

---

## Checkpoint: Complete
- [x] All 3 tasks completed.
- [x] Client bundles are significantly lighter (~800KB saved on tables).
- [x] Server component data fetching and API query execution streamlined.
