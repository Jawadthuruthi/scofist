# Scofist — Education Management System (EMS)

> **Operational & Engineering Contract**  
> *Targeted at internal engineers and autonomous AI agents.* This document defines system boundaries, execution constraints, architecture conventions, and setup requirements.

---

## 1. System Overview

**Scofist** is an integrated multi-role Education Management System (EMS) built to operate across academic, administrative, and extracurricular operations.

### Core Subsystems
- **Academic & Timetable:** Academic batches, course allocation, class period timetables, and scheduling.
- **Attendance Engine:** Real-time student period attendance, teacher attendance tracking, and automated absentee cron workers.
- **Exams & Grading:** Examination scheduling, result processing, and student report generation.
- **Finance & Fee Ledger:** Transaction recording, fee collections, invoice tracking, and reconciliation.
- **Library Management:** Cataloging, barcode/QR tracking, member borrowing, and TSV bulk import pipelines.
- **Student & Program Operations:** Student verification, extracurricular event management (Program Committee, Literary Leadership, Spark Admin).
- **AI Integrations:** Google Gemini AI SDK capabilities for academic reporting and workflows.

---

## 2. Infrastructure & Hosting Guardrails (Non-Negotiable)

This system is engineered to run reliably within free-tier cloud limits. **Engineers and AI agents must strictly comply with these boundaries.**

### A. Vercel Serverless (Hobby Tier)
| Constraint | Hard Limit | Engineering Rule |
|---|---|---|
| **Execution Timeout** | **10 seconds** | API routes and cron tasks taking >10s fail with `504 Gateway Timeout`. Heavy synchronous processing is forbidden. Keep MongoDB queries indexed and tight. |
| **Request/Response Body** | **4.5 MB** | Never buffer or process raw media uploads in serverless memory. Upload large files directly to Cloudinary or Cloudflare R2 via presigned URLs. |
| **Cron Job Limit** | **Max 2 crons** | Defined in `vercel.json` (allocated to absentee teacher marking and missing attendance). Cron routes must be authenticated via `Authorization: Bearer <CRON_SECRET>`. |
| **Filesystem** | **Stateless (`/tmp` only)** | Ephemeral across cold starts. Never store persistent data or local uploads on disk. |

### B. MongoDB Atlas (M0 Shared Tier)
| Rule | Requirement |
|---|---|
| **Connection Pooling** | **Always** import and use `@/lib/db.js` (`connectToDB`). It maintains a cached singleton promise (`bufferCommands: false`, `maxPoolSize: 5`, `maxIdleTimeMS: 10000`). **Never instantiate separate `mongoose.connect()` calls.** |
| **Fail-Fast Policy** | `bufferCommands` is disabled globally to prevent connection buffering from hanging until the Vercel 10s timeout triggers. |
| **Lean Document Reads** | **Always append `.lean()`** to read-only queries to bypass heavy Mongoose document hydration and save serverless memory. |
| **Field Projections** | **Always specify `.select(...)`** or field projections to return only required attributes over the wire. |
| **Bounded Queries** | **Unbounded queries (`Model.find({})`) are strictly prohibited.** Enforce pagination (`skip` + `limit`) with sensible ceilings (default limit `20`, max `100`). |
| **Indexes** | Any field frequently queried, filtered, or sorted must have a corresponding index in its schema file in `models/`. |

---

## 3. Tech Stack

- **Framework:** Next.js 15+ (App Router, Turbopack, JavaScript / ESM)
- **Frontend:** React 18, Tailwind CSS, Radix UI Primitives, Lucide Icons, Recharts, TanStack Table & Query
- **Database & ODM:** MongoDB Atlas with Mongoose 8.x
- **Edge Auth & Routing:** Jose JWT validation within Next.js edge `middleware.js`
- **External Services:**
  - **Cloudinary:** Media and image asset management
  - **Cloudflare R2:** Academic documents and large file storage
  - **Resend:** Transactional email delivery
  - **Web Push:** PWA notification delivery
  - **Google AI SDK (`@ai-sdk/google`):** Gemini model integrations

---

## 4. Role-Based Access Control (RBAC)

All route access and API security policies are governed via JWT claims validated in `middleware.js` and downstream endpoint checks. The system recognizes 9 discrete roles:

1. `College Admin` — Full institution administrative authority
2. `Org Admin` — Organization and institutional oversight
3. `Teacher` — Class management, grading, and period attendance
4. `Student` — Timetables, attendance history, academic reports, and fee records
5. `Finance` — Fee collection, ledger entries, and financial audits
6. `Program Committee` — Institutional event planning and coordination
7. `Program Leader` — Event-level leadership and participant oversight
8. `Literary Leader` — Literary and cultural activity administration
9. `Spark Admin` — Specialized initiative and sub-program administrator

> **Rule:** Backend handlers must inspect the JWT payload or authenticated user context directly. Never rely solely on frontend UI gating.

---

## 5. Directory Architecture

```
scofist/
├── app/
│   ├── (client)/             # Public, auth, and student-facing pages
│   ├── dashboard/            # Role-gated administration dashboard views
│   └── api/                  # REST API route handlers (route.js)
├── components/               # Reusable UI components & Radix wrappers
├── hooks/                    # Custom React client hooks
├── lib/                      # Core cross-cutting utilities
│   ├── db.js                 # Cached singleton MongoDB connection pool
│   ├── apiResponse.js        # Standardized API response envelope
│   ├── errorHandler.js       # Centralized API error handling
│   ├── auth.js               # JWT verification & claims utilities
│   ├── cloudinary.js         # Cloudinary media upload integration
│   └── s3.js                 # Cloudflare R2 presigned URL and storage client
├── libservices/              # Encapsulated domain business logic (Finance, Attendance, etc.)
├── models/                   # Mongoose schemas and data models
├── public/                   # Static assets, manifests, icons
├── scripts/                  # Administrative, backfill, and database migration tasks
├── tasks/                    # Project tracking and planning docs
├── worker/                   # Service worker and push notification worker
├── middleware.js             # Global Edge JWT validation & RBAC routing
├── AGENTS.md                 # Primary system rules for AI agents
└── vercel.json               # Cron task definitions and deployment configuration
```

---

## 6. Quick Start & Local Setup

### Prerequisites
- **Node.js:** `18.x` or `20.x`
- **MongoDB:** Active MongoDB Atlas URI (or local MongoDB replica set for transaction testing)

### Installation
```bash
# 1. Clone the repository
git clone <repository-url>
cd scofist

# 2. Install dependencies
npm install

# 3. Setup environment variables
cp .env.example .env.local
```

### Environment Configuration (`.env.local`)
Ensure the following variables are configured before launching:

```ini
# Core Configuration
MONGODB_URI="mongodb+srv://..."
JWT_SECRET="your-jwt-secret"
API_KEY="your-internal-api-key"
COMPANY_NAME="Scofist"
NEXT_PUBLIC_BASE_URL="http://localhost:3000"

# Cron Security
CRON_SECRET="your-cron-secret"

# Storage: Cloudinary
CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=""

# Storage: Cloudflare R2
R2_ACCOUNT_ID=""
R2_ACCESS_KEY_ID=""
R2_SECRET_ACCESS_KEY=""
R2_BUCKET_NAME=""
R2_PUBLIC_DOMAIN=""

# Email & Notifications
RESEND_API_KEY=""
VAPID_PUBLIC_KEY=""
VAPID_PRIVATE_KEY=""
NEXT_PUBLIC_VAPID_PUBLIC_KEY=""

# AI Engine
GEMINI_API_KEY=""
```

---

## 7. Development & Build Commands

Due to compilation scale and Turbopack optimizations, Next.js processes are configured with explicit Node memory ceilings:

| Command | Action | Memory Setting |
|---|---|---|
| `npm run dev` | Starts local dev server with Turbopack | `NODE_OPTIONS='--max-old-space-size=3072'` (3GB) |
| `npm run build` | Builds production Next.js artifact | `NODE_OPTIONS='--max-old-space-size=8192'` (8GB) |
| `npm run start` | Boots production server | Default |
| `npm run lint` | Runs ESLint across the codebase | Default |

---

## 8. API & Database Conventions

### Standard API Route Pattern
All route handlers in `app/api/*/route.js` must adhere to this pattern:

```javascript
import connectToDB from "@/lib/db";
import { apiSuccess } from "@/lib/apiResponse";
import { handleApiError, ApiError } from "@/lib/errorHandler";
import Student from "@/models/Student";

export async function GET(req) {
  try {
    await connectToDB();

    const { searchParams } = new URL(req.url);
    const page = Math.max(0, parseInt(searchParams.get("page") || "0", 10));
    const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") || "20", 10)), 100);

    const filter = { isActive: true };

    const [items, total] = await Promise.all([
      Student.find(filter)
        .select("name registerNumber batchId status") // Lean projection
        .skip(page * limit)
        .limit(limit)
        .lean(),                                       // Bypasses Mongoose hydration
      Student.countDocuments(filter),
    ]);

    return apiSuccess(items, "Students retrieved successfully", {
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return handleApiError(error, "GET /api/students");
  }
}
```

### Standard API Response Envelope
- **Success (`200` / `201`):**
  ```json
  {
    "success": true,
    "data": [...],
    "message": "Human readable confirmation",
    "meta": { "pagination": { "page": 0, "limit": 20, "total": 120, "totalPages": 6 } }
  }
  ```
- **Error (`400` / `401` / `403` / `404` / `500`):**
  ```json
  {
    "success": false,
    "error": "Descriptive error message",
    "code": "ERROR_CODE",
    "details": {}
  }
  ```

---

## 9. Administrative & Migration Scripts

Data repair, TSV book ingestion, and attendance integrity scripts live in the `scripts/` directory:

```bash
# Ingest books from TSV file
node scripts/upload_books.js

# Deduplicate corrupted attendance records
node scripts/deduplicate-attendance.js

# Cleanup leave attendance conflicts
node scripts/cleanup-leave-attendance.js

# Backfill batch IDs on legacy attendance entries
node scripts/fix-attendance-batchid.js
```

> **Warning:** Before running any script in `scripts/`, verify that your `MONGODB_URI` points to the intended target environment and create a database snapshot.
