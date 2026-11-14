# ADR-001: Bounded Query Concurrency on MongoDB Atlas M0 under Vercel Serverless

## Status
Accepted

## Date
2026-11-14

## Context
Scofist runs on Vercel's Hobby/Free tier and connects to MongoDB Atlas M0 (free shared tier). These infrastructure tiers introduce strict performance and resource constraints:
1. **Vercel Serverless Execution Window:** Default 10-second hard timeout. Long-running API requests or sequential database waterfalls trigger `504 Gateway Timeout`.
2. **Atlas M0 Connection Limits:** Shared CPU, 512MB RAM, and a strict connection pool cap. `@/lib/db.js` enforces `maxPoolSize: 5` and `bufferCommands: false` to fail fast instead of queuing until serverless timeout.
3. **Compound Concurrent Requests:** In server components like `app/dashboard/page.jsx`, up to 9 separate data endpoints are queried concurrently on initial render.

Under sequential `await` execution, queries take additive network latency (e.g. 5 sequential queries at 150ms each = 750ms+). However, unbounded parallelization (`Promise.all` across multiple resources) instantly exhausts the 5-connection pool, throwing unbuffered `MongoServerSelectionError` failures.

## Decision
1. **Cap Per-Request Parallelism to $\le 2$ Concurrent Queries:**
   - In API route handlers (`app/api/batches`, `app/api/users`, `app/api/attendances`, `app/api/periods`), parallelize independent data fetching and total count calculations using `const [items, total] = await Promise.all([ Model.find(query).lean(), Model.countDocuments(query) ])`.
   - Never initiate more than 2 database operations concurrently within a single handler.
2. **Eliminate Redundant Count Queries on In-Memory Slices:**
   - For collections loaded fully into memory for client-side sorting (e.g. `app/api/classes`), eliminate `Class.countDocuments(query)` entirely and derive `total = classes.length` directly.
3. **Mandatory `.lean()` on All Read Queries:**
   - Every read operation must call `.lean()` to eliminate Mongoose document hydration memory overhead, ensuring payloads stay well below Vercel's 4.5MB serverless body limit.
4. **Preserve Sequential Mutation and Auth Chains:**
   - Authorization, input validation, and dependent write operations must remain strictly sequential to prevent race conditions or invalid state writes.

## Alternatives Considered

### 1. Unbounded `Promise.all`
- **Pros:** Maximum theoretical parallel speed for a single request.
- **Cons:** A single multi-resource dashboard load issuing 4 parallel queries per route would request 20+ connections simultaneously, immediately crashing Atlas M0 (`maxPoolSize: 5`).
- **Rejected:** Causes immediate connection starvation in production.

### 2. Full Sequential Execution
- **Pros:** Uses only 1 connection at a time.
- **Cons:** Chained database waterfalls frequently push total latency above 3–5 seconds on high-volume routes, risking 504 timeouts on cold starts.
- **Rejected:** Violates Vercel React Best Practices rule `async-parallel`.

### 3. External Caching Tier (Redis / Upstash)
- **Pros:** Offloads read queries from MongoDB Atlas entirely.
- **Cons:** Adds infrastructure overhead, network serialization cost, and monthly pricing risk outside the project's 100% free-tier architecture contract.
- **Rejected:** Unnecessary when bounded queries and Next.js data caching provide sub-250ms response times.

## Consequences
- High-frequency API endpoints achieve sub-300ms response times without triggering Vercel 10s timeouts.
- Atlas M0 connection pool stays resilient under multi-user concurrency.
- API pagination contracts are strictly preserved with clean numeric defaults.
