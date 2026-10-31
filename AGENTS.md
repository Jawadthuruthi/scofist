# Project: Scofist Education Management System

## Overview
Scofist is a comprehensive multi-role Education Management System (EMS) managing students, teachers, academic batches, class attendance, timetables, examinations, library, finance, and extracurricular programs.

## Target Environment & Infrastructure Constraints

### 1. Vercel (Hobby / Free Tier)
- **Function Execution Timeout:** 10 seconds default max execution time. Any API route or cron task taking >10s will terminate with 504 Gateway Timeout. Keep database queries fast and indexed.
- **Payload Limits:** Maximum 4.5MB serverless request and response body size. Heavy media/files must be streamed directly to Cloudinary, never processed in-memory or buffered through serverless functions.
- **Cron Jobs Limit:** Maximum 2 cron jobs defined in `vercel.json` (currently allocated for absent-teacher marking and missing attendance). Cron routes must be secured using `Authorization: Bearer <CRON_SECRET>` headers.
- **Stateless Environment:** Ephemeral filesystem (`/tmp` only, wiped across cold starts). Never persist uploaded assets or local state to the server filesystem.

### 2. MongoDB Atlas (M0 / Free Tier)
- **Connection Cap:** Atlas M0 has limited concurrent connections (typically 100-500, shared tier). Uncontrolled connection creation will exhaust the pool immediately.
- **Connection Caching:** Always use `@/lib/db.js` (`connectToDB`) which implements global singleton promise caching (`bufferCommands: false`, `maxPoolSize: 5`, `maxIdleTimeMS: 10000`). Never instantiate separate `mongoose.connect()` calls.
- **Compute & RAM Budget:** Shared CPU, 512MB total storage. 
  - Always use `.lean()` for read-only queries to prevent Mongoose document hydration memory overhead.
  - Always apply `.select()` or field projections (`projections`) to return only necessary fields.
  - Enforce pagination (`skip` + `limit`) with sane defaults; never execute unbounded `.find({})` on large collections (such as `Attendance`, `StudentAttendance`, `Period`, or `User`).
  - Ensure any filtered fields in high-frequency queries have corresponding MongoDB indexes in their schema.

---

## Tech Stack
- **Framework:** Next.js 15.2+ (App Router, JavaScript/ESM)
- **Frontend & UI:** React 18, Tailwind CSS, Radix UI primitives, Lucide Icons, Recharts, TanStack Table, TanStack Query
- **Backend & Database:** Next.js Route Handlers (`app/api/*`), Mongoose 8.11+, MongoDB Atlas
- **Authentication & Security:** Jose JWT with Next.js edge `middleware.js` role validation
- **External Services:** Cloudinary (media storage), Resend (emails)

---

## Commands
- **Dev Server:** `npm run dev`
- **Production Build:** `npm run build`
- **Production Start:** `npm run start`
- **Lint:** `npm run lint`

---

## Directory Architecture
- `app/(client)/`: Public and student-facing pages.
- `app/dashboard/`: Role-gated dashboard (Admin, Teacher, Finance, etc.).
- `app/api/`: Next.js REST API route handlers (`route.js`).
- `models/`: Mongoose data models and schemas.
- `lib/`:
  - `db.js`: Cached MongoDB connection singleton.
  - `apiResponse.js`: Standardized API JSON response helpers (`apiSuccess`, `apiResponse`).
  - `errorHandler.js`: Centralized API error handling (`handleApiError`, `ApiError`).
  - `auth.js`: JWT token verification utilities.
  - `cloudinary.js`: Cloudinary media upload integration.
- `libservices/`: Domain-specific business logic (Finance, Verification, Attendance).
- `middleware.js`: Global edge middleware for JWT validation, role checks, and routing.

---

## Core Code Conventions & Patterns

### 1. API Route Handlers (`app/api/*/route.js`)
All route handlers must follow this structure:
```javascript
import connectToDB from "@/lib/db";
import { apiSuccess } from "@/lib/apiResponse";
import { handleApiError, ApiError } from "@/lib/errorHandler";
import MyModel from "@/models/MyModel";

export async function GET(req) {
  try {
    await connectToDB();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "0", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);

    const query = { /* filter conditions */ };

    const [items, total] = await Promise.all([
      MyModel.find(query)
        .select("name status createdAt") // Limit payload
        .skip(page * limit)
        .limit(limit)
        .lean(),                        // Lean queries for memory efficiency
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

### 2. Standard Response Format
Never return raw `NextResponse.json({ ... })` without the standard envelope:
- **Success:**
  ```json
  {
    "success": true,
    "data": [...],
    "message": "Human readable message",
    "meta": { ... }
  }
  ```
- **Error:**
  ```json
  {
    "success": false,
    "error": "Error description",
    "code": "ERROR_CODE",
    "details": { ... }
  }
  ```

### 3. Role-Based Access Control (RBAC)
- Roles (`College Admin`, `Teacher`, `Org Admin`, `Student`, `Program Committee`, `Program Leader`, `Finance`, `Literary Leader`, `Spark Admin`) are defined and checked in `middleware.js`.
- Always verify sensitive operations in backend handlers by inspecting the JWT payload or user session, not solely relying on frontend routing.

---

## Non-Negotiable Boundaries
1. **Never create ad-hoc database connections.** Always import and call `await connectToDB()`.
2. **Never store uploaded files on disk.** Use Cloudinary or object storage.
3. **Never run unbounded queries.** Always restrict with `limit`, `lean()`, and projection.
4. **Never hardcode secrets or cron keys in source code.** Read from `process.env`.
5. **Fail fast on database connectivity.** Mongoose is configured with `bufferCommands: false` to prevent hanging until Vercel 10s timeouts. Do not alter this without explicit justification.
