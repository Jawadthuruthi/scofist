# Spec: Vercel & React Performance Optimization Audit — V1

## Objective
Audit and remediate performance bottlenecks across the Scofist EMS application adhering strictly to the **Vercel React Best Practices** engineering guidelines. The primary goal is to drastically reduce **Vercel Fluid Active CPU** usage to permanently operate within the **4.0 hours/month Hobby tier allowance**, while preserving **100% of current functional behavior, UI appearances, API response contracts, and RBAC authorization rules**.

---

## Assumptions
1. The project must stay within the Vercel Hobby Plan (Serverless Functions: 10s execution timeout, 4.5MB payload limit, 4-hour active CPU limit per month) and MongoDB Atlas M0 (5 connections cap, no paid compute).
2. Existing API endpoint response contracts (`{ success, data, message, meta }`) cannot change because frontend client components rely on their exact schemas.
3. No breaking UI/UX alterations are acceptable; visual design, navigation, and user workflows must remain identical.
4. Database document structures will not undergo destructive schema changes in this phase; optimizations will focus on query filtering, caching, bundle lazy loading, and compute efficiency.

---

## Tech Stack & Runtime Environment
- **Framework:** Next.js 15.2.4 (App Router, JavaScript/ESM)
- **Frontend:** React 18.3.1, Tailwind CSS 3.4.1, Radix UI Primitives, Lucide Icons, Recharts, TanStack Table & TanStack Query v5
- **Backend/DB:** Next.js Route Handlers (`app/api/*`), Mongoose 8.11.0, MongoDB Atlas M0
- **Auth:** Jose JWT with Next.js Edge Middleware
- **Deployment Platform:** Vercel Hobby Plan (Node.js Serverless runtime + Edge Middleware)

---

## Commands
```powershell
# Development server
npm run dev

# Production build validation
npm run build

# Code linting
npm.cmd run lint

# Fast constraint & floor check
node scripts/floor-guard.mjs
```

---

## Project Structure & Audit Scope

```
scofist/
├── app/
│   ├── api/
│   │   ├── og/results/[year]/route.js        → High-priority: CPU-heavy OG image generation
│   │   ├── teacherAttendances/route.js       → High-priority: In-memory synthesis & Infinity limit
│   │   ├── studentAttendances/route.js       → High-priority: Institution-wide student array iteration
│   │   ├── attendance-sheet/route.js         → High-priority: Sequential DB queries & large loops
│   │   ├── cron/missing-attendance/route.js  → Scheduled compute optimization
│   │   └── settings/route.js                 → 45KB handler called via internal self-fetch
│   ├── dashboard/
│   │   ├── layout.jsx                        → High-priority: Server layout self-fetch loop & dynamic SSR
│   │   └── students-reports/                 → Heavy reporting modules (xlsx, jspdf, recharts)
│   └── middleware.js                         → High-priority: Double JWT verification on every request
├── lib/
│   ├── teacherAttendanceService.js           → Mongoose dirty-checking & findIndex loops
│   ├── db.js                                 → Connection singleton & pool caching
│   └── utils.js                              → fetchData helper causing server self-requests
└── spec/
    └── SPEC-vercel-performance-audit.md       → This specification document
```

---

## Best Practices Rule Mapping & Remediation Plan

### 1. Eliminating Waterfalls & Server Loops (`async-`, `server-`)
* **Rule `async-parallel` & `server-parallel-fetching`:**
  - Audit all API routes using sequential `await` queries and combine independent promises using `Promise.all()`.
* **Fixing Server Self-Fetch Loop in Layout (`server-no-shared-module-state`, `server-cache-react`):**
  - In `app/dashboard/layout.jsx`, replace `await fetchData("settings")` (which makes an outbound HTTP request back to `/api/settings` triggering middleware and another serverless cold start) with a direct, cached database read or `React.cache()` function.
  - Remove unnecessary `export const dynamic = 'force-dynamic'` from layout wrappers where segment configs or React server components can stream without forced de-opt.

### 2. Server-Side Performance & Edge Caching (`server-`, `bundle-`)
* **Rule `server-hoist-static-io` & Edge Caching for `@vercel/og`:**
  - In `app/api/og/results/[year]/route.js`, eliminate `export const dynamic = "force-dynamic"` and `revalidate = 0`.
  - Add immutable edge caching headers:
    ```javascript
    headers: {
      "Cache-Control": "public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=86400",
    }
    ```
  - This prevents bots and preview crawlers from burning serverless CPU on repeated image rasterization.
* **Middleware Optimization (`async-cheap-condition-before-await`):**
  - In `middleware.js`, skip the secondary `profile-cache` JWT verification if the primary `auth-token` verification already succeeded with valid role claims.

### 3. JavaScript Performance & In-Memory Computation (`js-`, `server-`)
* **Rule `js-combine-iterations`, `js-set-map-lookups`, and DB-Level Filtering:**
  - In `app/api/teacherAttendances/route.js`, replace in-memory day-by-day date synthesis and unbounded loops with scoped MongoDB date queries (`$gte`, `$lte`).
  - Replace default pagination `limit = Infinity` with sane, capped pagination (e.g. `limit = Math.min(requestedLimit || 50, 100)`) to stop memory spikes.
  - In `app/api/studentAttendances/route.js`, eliminate `User.find({ roles: "Student" })` fetching all school students into memory. Filter student IDs directly in the MongoDB query.

### 4. Bundle Size & Client Heavyweight Splitting (`bundle-dynamic-imports`)
* **Rule `bundle-dynamic-imports`:**
  - Dynamic import (`next/dynamic({ ssr: false })`) for heavy browser-only libraries (`jspdf`, `xlsx`, `html2canvas`, `modern-screenshot`, `recharts`) in reporting dashboards and poster generators.
  - Keep initial bundle load lightweight so client rendering starts immediately.

---

## Code Style & Implementation Standard

```javascript
// Example: Standardized High-Performance API Route
import connectToDB from "@/lib/db";
import { apiSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/errorHandler";
import MyModel from "@/models/MyModel";

export async function GET(req) {
  try {
    await connectToDB();

    const { searchParams } = new URL(req.url);
    const page = Math.max(0, parseInt(searchParams.get("page") || "0", 10));
    // Enforce strict upper bound on limit to prevent unbounded memory allocation
    const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") || "50", 10)), 100);

    const query = { /* indexed conditions */ };

    // Parallelize read query and count
    const [items, total] = await Promise.all([
      MyModel.find(query)
        .select("_id name status createdAt") // Strict projection
        .skip(page * limit)
        .limit(limit)
        .lean(),                            // Zero Mongoose document hydration overhead
      MyModel.countDocuments(query),
    ]);

    return apiSuccess(items, "Fetched successfully", {
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    return handleApiError(error, "GET /api/resource");
  }
}
```

---

## Testing & Verification Strategy
1. **Functional Parity Verification:**
   - Every modified API endpoint must be checked with matching query parameters to confirm that JSON response structures, keys, and values are identical to current behavior.
2. **Floor Integrity Guard:**
   - Run `node scripts/floor-guard.mjs` on every change to ensure zero floor violations, no secret leaks, and no suppressed linter errors.
3. **Build & Type Cleanliness:**
   - Run `npm run build` to confirm zero build or SSR compilation errors.
4. **Vercel Hobby Compliance:**
   - Verify every route handler completes well below the 10-second timeout budget and produces responses < 4.5MB.

---

## Boundaries
- **Always:**
  - Preserve identical API response envelopes and status codes.
  - Maintain all RBAC checks in `middleware.js` and route handlers.
  - Use `.lean()` and explicit field `.select()` projections for read operations.
  - Run `node scripts/floor-guard.mjs` before concluding tasks.
- **Ask First:**
  - Any change to database schemas or removing existing fields from Mongoose schemas.
  - Altering user role definitions or session duration.
- **Never:**
  - Never alter user-facing UI layouts, styles, or interactive workflows.
  - Never allow unbounded queries (`find({})` without pagination) on high-frequency models.
  - Never leave dynamic `@vercel/og` image routes uncached on CDN.
  - Never store uploaded files on the local filesystem.

---

## Success Criteria
1. **Active CPU Reduction:** Estimated > 60% reduction in serverless active compute consumption across peak traffic periods.
2. **Zero Functional Regressions:** All attendance views, dashboards, festival results, and reports produce the exact same data and UI behavior.
3. **OG Image Caching:** `/api/og/results/[year]` serves cache hits (`x-vercel-cache: HIT`) after the first edge generation.
4. **Layout Efficiency:** Elimination of serverless internal self-fetch loops on dashboard layout loads.
5. **Passing Checks:** `node scripts/floor-guard.mjs` and `npm run build` succeed with 0 errors.

---

## Out of Scope (Deferred to V2)
- Database schema restructuring (e.g. migrating `attendanceRecords` subdocument arrays into a standalone collection with foreign keys). *Reason: Requires database migration scripts and downtime coordination.*
- Client-side full redesign or switching state management libraries. *Reason: Must not change user experience.*
- Upgrading from Next.js 15 to future major versions. *Reason: Keep current dependency matrix stable.*

---

## Open Questions
1. For `/api/teacherAttendances` and `/api/studentAttendances`: when clients do not pass a `limit` parameter, is capping the default to **100 records per page** acceptable, or are there specific table views that require fetching an entire class/batch at once (e.g., 50–100 students)?
2. For the `@vercel/og` result poster generator: are results static once published for a year, so a 1-year CDN cache header (`s-maxage=31536000`) is safe, or should revalidation occur if results are updated?
