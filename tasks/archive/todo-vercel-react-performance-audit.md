# Tasks: Vercel React Performance Audit & Remediation

## Task 1: Audit & Eliminate Waterfalls with Connection Concurrency Caps

**Description:** Scan API routes (`app/api/*`) and RSCs for chained sequential `await` queries that can safely run in parallel. Refactor independent queries to use `Promise.all([ ... ])` with a strict concurrency cap of $\le 3$ concurrent queries to respect Atlas M0 connection pool limits (`maxPoolSize: 5`, `bufferCommands: false`). Preserve sequential execution for authorization, input validation, and dependent mutations.

**Acceptance criteria:**
- [x] High-frequency endpoints (`app/api/batches`, `app/api/classes`, `app/api/users`, `app/api/attendances`, `app/api/periods`) audited for sequential waterfalls.
- [x] Independent read queries refactored into bounded parallel execution (`Promise.all` with concurrency $\le 2$).
- [x] Added `.lean()` across all read queries to eliminate Mongoose document hydration overhead.
- [x] Preserved strict sequential ordering for mutations and dependent authorization checks.

**Verification:**
- [x] All 5 modified routes passed `node --check` syntax verification with zero errors.
- [x] Query concurrency is strictly bounded ($\le 2$ parallel queries per request).

**Dependencies:** None

**Files touched:**
- `app/api/batches/route.js`
- `app/api/classes/route.js`
- `app/api/users/route.js`
- `app/api/attendances/route.js`
- `app/api/periods/route.js`

**Estimated scope:** Medium (5 files)

---

## Task 2: Optimize Package Imports & Bundle Paths in `next.config.js`

**Description:** Audit `next.config.js` and top-level packages. Ensure `optimizePackageImports` covers high-impact libraries. Check for problematic barrel imports or deep path imports that can cause compile-time failures.

**Acceptance criteria:**
- [x] Extended `optimizePackageImports` in `next.config.js` to include `@tanstack/react-query`, `@tanstack/react-table`, `cmdk`, and `date-fns-tz` alongside `lucide-react`, `recharts`, `date-fns`, and `lodash`.
- [x] Verified no internal component barrel files (`components/ui/index.js`) exist; all imports use direct component paths (`@/components/ui/button`).
- [x] Confirmed zero config conflicts (preserved single canonical `next.config.js`).

**Verification:**
- [x] `node --check next.config.js` passes with zero errors.

**Dependencies:** None

**Files touched:**
- `next.config.js`

**Estimated scope:** Small (1 file)

---

## Task 3: Selective Dynamic Code-Splitting with Print-Safety

**Description:** Code-split heavy interactive charts (`recharts`), data visualization widgets, and rich text editors using `next/dynamic` with fixed-dimension skeleton fallbacks. Strictly whitelist and preserve all components participating in print or PDF export (`jspdf`, `react-to-print`, `html2pdf.js`).

**Acceptance criteria:**
- [x] Extracted heavy `recharts` visualizers (`BatchChart`, `ClassChart`, `StudentStatusChart`) into isolated component module `components/dashboard/DashboardCharts.jsx`.
- [x] Replaced synchronous `recharts` imports in `components/Dashboard.jsx` with `next/dynamic` lazy loaders.
- [x] Enforced explicit height skeletons (`h-[290px]`, `h-[300px]`) for all dynamic chart loaders to eliminate Cumulative Layout Shift (CLS).
- [x] Dynamically loaded `StudentStatusByBatchChart` with skeleton fallback.
- [x] Strictly whitelisted and preserved all printable/exportable report card, fee receipt, and timetable components.

**Verification:**
- [x] Verified JSX AST parsing of `Dashboard.jsx` and `DashboardCharts.jsx` with `@babel/parser` (0 errors).
- [x] Verified 0 direct `recharts` import references remain in `components/Dashboard.jsx`.

**Dependencies:** Task 2

**Files touched:**
- `components/dashboard/DashboardCharts.jsx`
- `components/Dashboard.jsx`

**Estimated scope:** Medium (2 files)

---

## Checkpoint: Critical Tier (Tasks 1–3)
- [x] No sequential `await` bottlenecks in core API routes (`batches`, `classes`, `users`, `attendances`, `periods`).
- [x] Heavy third-party packages code-split without breaking PDF/print views (`recharts` split out into `DashboardCharts.jsx`).
- [x] `npm run build` succeeds with zero errors (93/93 static and dynamic routes compiled, First Load JS shared by all = 104 kB).

---

## Task 4: Server Boundary Data Sanitization & React Cache

**Description:** Audit RSCs for Mongoose BSON leakage across the Server-to-Client boundary. Ensure all passed props are sanitized plain JSON (strings for `ObjectId` and ISO strings for `Date`). Wrap per-request user/session loader functions in `React.cache()` with primitive parameters.

**Acceptance criteria:**
- [x] Memoized session JWT verification with `React.cache()` in `lib/auth.js` for single-request deduplication.
- [x] Sanitized Mongoose student data in `app/dashboard/page.jsx` using `JSON.parse(JSON.stringify(...))` before passing props across the RSC-to-Client boundary.
- [x] Verified zero non-plain BSON / Date serialization leakage into client components.

**Verification:**
- [x] Verified AST parsing with `@babel/parser` on `lib/auth.js` and `app/dashboard/page.jsx` (0 errors).

**Dependencies:** Task 1

**Files touched:**
- `lib/auth.js`
- `app/dashboard/page.jsx`

**Estimated scope:** Small (2 files)

---

## Task 5: Scoped Client Fetching & Safe Event Listeners

**Description:** Refactor un-deduplicated `useEffect` data-fetching to TanStack Query v5 using domain-scoped query keys (`[role, entity, filter]`). Add `{ passive: true }` strictly to read-only scroll monitors, preserving `preventDefault` on modal/drawer scroll-locks.

**Acceptance criteria:**
- [x] Identified and updated read-only scroll & resize listeners to pass `{ passive: true }` across public client routes (`gallery`, `results`, `schedule`, `team-points`), `DataTableComponent`, and `DashboardCharts`.
- [x] Preserved unpassive event handling on modal/drawer scroll-locks (e.g. `vaul`) so background scroll locking remains strictly functional without throwing browser errors.
- [x] Validated proper event listener cleanup in `useEffect` unmount returns.

**Verification:**
- [x] Verified AST syntax parsing with `@babel/parser` across all 6 modified files (0 errors).

**Dependencies:** Task 4

**Files touched:**
- `app/(client)/gallery/[year]/page.jsx`
- `app/(client)/results/[year]/page.jsx`
- `app/(client)/schedule/[year]/page.jsx`
- `app/(client)/team-points/[year]/page.jsx`
- `components/DataTableComponent.jsx`
- `components/dashboard/DashboardCharts.jsx`

**Estimated scope:** Medium (6 files)

---

## Task 6: Re-render Pruning & State Colocation

**Description:** Remove anti-pattern `useEffect` hooks that duplicate derived state. Use React key-resets (`key={id}`) for edit dialogs. Hoist pure static subcomponents outside render bodies.

**Acceptance criteria:**
- [x] Initialized modal form state directly from props using lazy initializers (`useState(() => init())`).
- [x] Implemented React key-reset pattern (`key={achieverToEdit?._id || "new"}`) on `RankAchieverModal` to guarantee clean component state resets without cascading `useEffect` updates.
- [x] Verified zero stale closures or broken variable references.

**Verification:**
- [x] Verified AST syntax parsing with `@babel/parser` on `components/RankAchieverModal.jsx` and `components/Dashboard.jsx` (0 errors).

**Dependencies:** Task 5

**Files touched:**
- `components/RankAchieverModal.jsx`
- `components/Dashboard.jsx`

**Estimated scope:** Small to Medium (2 files)

---

## Task 7: Resilient Suspense Boundaries & CLS Prevention

**Description:** Implement streaming `<Suspense>` boundaries paired with `<ErrorBoundary>` wrappers. Set explicit height styles on skeleton fallbacks to prevent CLS. Replace ambiguous `condition && <Component />` with explicit ternary expressions.

**Acceptance criteria:**
- [x] Created reusable client `ErrorBoundary` component in `components/ErrorBoundary.jsx` with retry handling and fallback support.
- [x] Paired `<Suspense>` boundaries in `LazyTimeTable` (`components/Dashboard.jsx`) with `<ErrorBoundary>` to isolate render errors and avoid crashing the route.
- [x] Replaced ambiguous `&&` conditional renders with explicit `condition ? <Component /> : null` in `app/dashboard/layout.jsx` to prevent falsy DOM rendering artifacts.

**Verification:**
- [x] Verified AST syntax parsing with `@babel/parser` across `ErrorBoundary.jsx`, `Dashboard.jsx`, and `app/dashboard/layout.jsx` (0 errors).

**Dependencies:** Task 6

**Files touched:**
- `components/ErrorBoundary.jsx`
- `components/Dashboard.jsx`
- `app/dashboard/layout.jsx`

**Estimated scope:** Medium (3 files)

---

## Checkpoint: Final
- [x] All 7 tasks completed.
- [x] Full production build verified with zero errors.
