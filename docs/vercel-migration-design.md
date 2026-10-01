# Vercel Migration Design & Specifications

## 1. Understanding Summary
*   **What is being built:** A migration of the `scofist` Next.js application's deployment configuration exclusively to Vercel.
*   **Why it exists:** To consolidate hosting on Vercel and cleanly remove redundant Cloudflare (OpenNext) and Netlify configurations.
*   **Who it is for:** The application's users (e.g., teachers/staff, based on the attendance cron jobs), designed to handle expected high traffic.
*   **Key constraints:** 
    *   Must operate within the **Vercel Free (Hobby) tier** limits (e.g., 10-second default serverless function timeout, maximum of 2 cron jobs).
    *   Requires robust MongoDB connection pooling/caching to prevent connection exhaustion under high traffic on serverless architecture.
*   **Explicit non-goals:** 
    *   We are not redesigning core application features.
    *   We are not maintaining multi-platform support (Netlify and Cloudflare will be completely removed).

## 2. Assumptions
*   **Timeouts:** The existing API routes and cron jobs can execute within the Vercel Hobby tier's maximum execution time.
*   **Database:** We will implement robust connection caching within the Next.js application using standard Mongoose/MongoDB caching patterns for serverless environments. 
*   **Security:** Vercel's secure environment variables (which are fully available on the Free tier) will be used to secure cron jobs instead of hardcoded URL parameters.
*   **Deployment:** The Git repository will be connected directly to Vercel for automatic deployments.

## 3. Decision Log
| Decision | Alternatives Considered | Why This Option Was Chosen |
| :--- | :--- | :--- |
| **Migration Strategy** | 1. Standard Serverless with Caching<br>2. Edge-Optimized with DB Data API<br>3. Serverless with External DB Pooler | **Standard Serverless with Caching** was chosen because it keeps the codebase largely intact, fits within the Vercel Free tier ecosystem, and avoids the massive rewrite required for the Data API. |
| **Database Connections** | Create a new connection per request. | **Global Singleton Caching** was chosen to prevent exhausting MongoDB connections under high traffic, which is a common issue with serverless functions. |
| **Cron Security** | Keep using hardcoded `?cronSecret=...` in URLs. | **Vercel `Authorization` Headers** were chosen because hardcoded secrets in `vercel.json` are exposed in source control. Secure headers are natively supported and vastly more secure. |

## 4. Final Design

### Part 1 - Architecture & Codebase Cleanup
*   **Deletions:** Remove `netlify.toml`, `open-next.config.ts`, `wrangler.jsonc`, `.open-next/`, and `.wrangler/`.
*   **NPM Scripts:** Remove `build:worker`, update `preview`, and remove `@netlify/plugin-nextjs`, `@opennextjs/cloudflare`, and `wrangler` from dependencies.
*   **Architecture:** The app will operate as a standard Next.js full-stack app on Vercel's Edge Network (frontend caching) and Serverless Functions (backend APIs).

### Part 2 - Database Connection Caching & Error Handling
*   **Singleton Pattern:** Implement a global connection cache in the database utility (e.g., `lib/db.js` or `lib/mongoose.js`).
*   **Data Flow:** API routes will request a connection. The utility will return the cached connection, wait for a pending promise, or initiate a new connection.
*   **Fail-Fast:** Configure Mongoose with `bufferCommands: false` to ensure functions fail immediately if the DB is unreachable, avoiding Vercel 10s timeouts. Failed connections will explicitly clear the promise cache.

### Part 3 - Cron Jobs Security & Deployment Configuration
*   **Configuration:** Remove the `cronSecret` query parameters from `vercel.json`.
*   **API Updates:** Update `/api/teacherAttendances/mark-teacher-absent` and `/api/cron/missing-attendance` to validate the `Authorization: Bearer <CRON_SECRET>` header.
*   **Deployment:** Require the `CRON_SECRET` to be added to the Vercel Dashboard Environment Variables.
