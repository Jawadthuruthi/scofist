<!-- See AGENTS.md for full context specifications -->
# Project: Scofist Education Management System

## Infrastructure Constraints (Strict)
- **Vercel Free Tier:** 10s maximum function timeout, 4.5MB payload limit, max 2 cron jobs.
- **MongoDB Free Tier (Atlas M0):** 512MB storage cap, low connection limit. Mandatory singleton connection via `@/lib/db.js` (`bufferCommands: false`, `maxPoolSize: 5`).
- **Memory & Bandwidth Discipline:** Always use `.lean()`, field projection, and pagination (`limit`) on MongoDB queries to avoid OOM and serverless timeouts.

## Commands
- Dev: `npm run dev`
- Build: `npm run build`
- Start: `npm run start`
- Lint: `npm run lint`

## Code Conventions
- Route handlers must use `await connectToDB()` from `@/lib/db`.
- Standardized API responses must use `@/lib/apiResponse` (`apiSuccess`, etc.) and `@/lib/errorHandler` (`handleApiError`).
- File uploads must go directly to Cloudinary via `@/lib/cloudinary.js`; never write to local disk.
- Role-based permissions are enforced via `middleware.js` and verified in sensitive route handlers.

For complete architectural patterns and example routes, see `AGENTS.md`.
