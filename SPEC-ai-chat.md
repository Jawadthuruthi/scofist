# Spec: AI Chat Assistant for Core School Operations

## Objective
Build a fast, 100% free-tier compliant, streaming AI Chat Assistant for the Scofist Education Management System. The assistant enables non-technical staff (College Admin, Teachers) to ask natural language questions about daily school operations and receive immediate, factual answers backed by database records. 

The architecture strictly operates within **Vercel Hobby Tier limits (10s execution timeout)**, **MongoDB Atlas M0 limits (512MB RAM, shared CPU, maxPoolSize: 5)**, and **Google Gemini Free Tier limits (15 RPM, 1,000,000 TPM)** without incurring any monthly cost or risking 504 timeouts.

---

## Assumptions
1. **Model:** `gemini-2.0-flash` (or `gemini-1.5-flash`) via `@ai-sdk/google` using the existing `GEMINI_API_KEY` in environment variables.
2. **Framework:** Vercel AI SDK (`ai` v4+) using `streamText()` and `tool()` with client-side `useChat()`.
3. **Database Access:** Direct Mongoose queries using existing `@/lib/db.js` (`connectToDB`) with `.lean()`, `.select()`, `.limit(15)`, and `.maxTimeMS(2500)`. No internal HTTP `fetch()`.
4. **Scope Boundaries:** Strictly covers the **5 Core Operational Domains** (Students/Staff Directory, Attendance & Leaves, Timetables & Schedules, Exams & Marks, Fees & Gate Passes). Does not attempt arbitrary queries on the remaining 45+ internal plumbing/event models.
5. **Security & RBAC:** Multi-tenant scoping (`collegeId`) and user authentication are validated server-side from JWT session before any tool query runs.

---

## Tech Stack
- **Framework:** Next.js 15.2+ (App Router, React 18)
- **AI Engine:** Vercel AI SDK (`ai` package) + `@ai-sdk/google` provider
- **Schema Validation:** `zod` (`^3.24.2`, already installed)
- **Database:** Mongoose 8.11+, MongoDB Atlas M0
- **UI & Styling:** Tailwind CSS, Radix UI Primitives, Lucide React Icons

---

## Commands
```bash
# Install required AI SDK dependencies
npm install ai @ai-sdk/google

# Development Server
npm run dev

# Production Build Verification
npm run build

# Lint Verification
npm run lint
```

---

## Project Structure
```
app/
  api/
    chat/
      route.js                  → Edge/Node Serverless route handling streamText & tool calling
components/
  ai/
    AIChatDrawer.jsx            → Slide-over drawer UI with useChat() streaming
    AIChatMessage.jsx           → Markdown message bubble with loading state
libservices/
  aiTools/
    directoryTool.js            → Student, Teacher, Batch, Kinship lookups (User, Batch, Division)
    attendanceTool.js           → Daily attendance, absent lists, % calculations (StudentAttendance, TeacherAttendance, LeaveRecord)
    timetableTool.js            → Class schedules, period allocations, free teacher lookups (Period, TimeTable)
    academicsTool.js            → Marks, exam results, grade rankings (Mark, Result, Subject)
    operationsTool.js           → Fee dues, debtor balance, active gate passes (Finance, Debtor, GatePass)
    index.js                    → Aggregated AI SDK tools object for route.js
```

---

## Code Style & Conventions

### Serverless Route Handler (`app/api/chat/route.js`)
```javascript
import { streamText } from "ai";
import { google } from "@ai-sdk/google";
import connectToDB from "@/lib/db";
import { aiTools } from "@/libservices/aiTools";

export const maxDuration = 10; // Enforce Vercel 10s ceiling

export async function POST(req) {
  await connectToDB();
  const { messages, clientTime, collegeId } = await req.json();

  const result = streamText({
    model: google("gemini-2.0-flash"),
    system: `You are the Scofist EMS AI Assistant. 
Today is ${clientTime || new Date().toISOString()}.
Answer staff questions accurately using provided tools.
If information is missing, ask clarifying questions instead of guessing.
For non-core features (settings, gallery, rentals), direct users to the dashboard.`,
    messages,
    tools: aiTools({ collegeId }),
    maxSteps: 2, // Strictly 1 tool call + 1 answer generation (prevents loops & saves RPM)
  });

  return result.toDataStreamResponse();
}
```

### Direct-Query Tool Pattern (`libservices/aiTools/attendanceTool.js`)
```javascript
import { tool } from "ai";
import { z } from "zod";
import StudentAttendance from "@/models/StudentAttendance";

export const attendanceTool = ({ collegeId }) =>
  tool({
    description: "Check daily attendance, absent student lists, or attendance percentage.",
    parameters: z.object({
      date: z.string().describe("ISO date string YYYY-MM-DD"),
      batchId: z.string().optional().describe("Batch ID if specific"),
      status: z.enum(["Present", "Absent", "Late"]).optional(),
    }),
    execute: async ({ date, batchId, status }) => {
      const query = { college: collegeId, date: new Date(date) };
      if (batchId) query.batch = batchId;
      if (status) query.status = status;

      return await StudentAttendance.find(query)
        .select("student status period remarks")
        .populate("student", "name rollNumber")
        .limit(15)
        .maxTimeMS(2500)
        .lean();
    },
  });
```

---

## Testing & Verification Strategy
1. **Latency & Timeout Guard:** Every tool query must complete in `< 200ms` on Atlas M0. End-to-end response streaming must start `< 1.2s`.
2. **Vercel Build Check:** `npm run build` must succeed with zero type errors or bundle bloat.
3. **Empty / Clarification Flow:** Test colloquial queries ("Who is absent?") $\rightarrow$ AI must request the date and class rather than crashing.
4. **Tenant Isolation:** Ensure querying from `collegeId: "A"` cannot access data from `collegeId: "B"`.

---

## Boundaries

### Always Do
- Always use `.lean()`, `.select()`, and `.maxTimeMS(2500)` on all Mongoose tool queries.
- Always enforce `maxSteps: 2` to prevent infinite tool-calling loops and protect Google's 15 RPM free limit.
- Always pass client local timezone in the system prompt.
- Always stream responses using `streamText()` and `toDataStreamResponse()`.

### Ask First
- Adding any new domain tool beyond the 5 core operational domains.
- Adding any non-Google AI provider or switching from `gemini-2.0-flash`.
- Exposing any administrative write/update actions to the chat interface.

### Never Do
- Never invoke internal Next.js API routes with HTTP `fetch('/api/...')` (prevents serverless self-fetch deadlock).
- Never allow raw MQL, `$where`, or unindexed dynamic `$lookup`s from user input.
- Never expose password hashes, reset tokens, or private secrets in tool projections.
- Never run unbounded `.find({})` queries without `.limit()`.

---

## Success Criteria
1. **$0 Operating Cost:** Functions completely within Google Gemini AI Studio Free Tier (15 RPM / 1M TPM) and Vercel Hobby limits.
2. **Sub-3s Response Time:** Time-to-first-token is `< 1.2s`, full answers stream and complete in `< 3.0s`.
3. **Zero 504 Timeouts:** 100% of tested queries complete inside Vercel's 10-second ceiling.
4. **Accuracy on Core Operations:** 100% factual accuracy on the 5 Core Operational Domains (Students, Attendance, Timetables, Marks, Fees).
5. **Graceful Handling of Non-Core Queries:** When asked about non-core collections, the AI politely directs users to the dashboard instead of hallucinating or failing.

---

## Open Questions
1. **UI Placement:** Should the AI Chat Assistant be a **global floating chat drawer** accessible on all dashboard pages, or a **dedicated page (`/dashboard/ai`)**?
2. **Access Control:** Should this assistant be accessible to **College Admin & Teachers only**, or should Students also have restricted access (e.g., viewing only their own marks/attendance)?
