# Implementation Plan: AI Chat Assistant for Core School Operations

## Overview
Implement a fast, streaming AI Chat Assistant for College Admins in the Scofist Education Management System. The solution uses the Vercel AI SDK (`ai` v4+) and Google Gemini 2.0 Flash (`@ai-sdk/google`) to deliver accurate, database-backed answers for the 5 Core Operational Domains. The implementation is 100% free-tier compliant, staying strictly within Vercel's 10-second serverless execution window and MongoDB Atlas M0 resource caps.

---

## Architecture Decisions
1. **Direct In-Memory Queries (No Internal HTTP Fetches):** Tool executions import Mongoose models directly via `@/lib/db.js` using `.lean()`, `.select()`, `.limit(15)`, and `.maxTimeMS(2500)` to eliminate serverless self-fetch deadlock risks.
2. **Turn-Bounded Execution (`maxSteps: 2`):** Strictly caps the LLM round-trips to 1 tool execution + 1 answer generation. This guarantees response times under 2.5s and keeps daily request volume well within Google's 15 RPM free limit.
3. **Floating Slide-Over Drawer UI:** A non-intrusive floating trigger button and slide-over panel accessible across dashboard views, strictly rendered for users with the `College Admin` role.
4. **Timezone Anchoring:** Client browser sends local time (`+05:30`) on every request, anchoring prompts so "today's attendance" queries the correct calendar day.

---

## Task List

### Phase 1: Foundation & Direct-Query Tools
- [ ] **Task 1: Install Dependencies & Verify Environment**
  - Install `ai` and `@ai-sdk/google`. Verify `GEMINI_API_KEY` configuration.
- [ ] **Task 2: Build the 5 Core Domain Tools (`libservices/aiTools/`)**
  - Implement `lookupDirectory`, `checkAttendance`, `getTimetable`, `getAcademicMarks`, and `getOperationsStatus` with Zod parameter validation and indexed Mongoose projections.

### Checkpoint: Tools Foundation
- [ ] Run isolated query test on tools to confirm sub-150ms execution on Atlas M0.

### Phase 2: Serverless Streaming API Route
- [ ] **Task 3: Build Streaming Chat Route Handler (`app/api/chat/route.js`)**
  - Implement `streamText()` with `gemini-2.0-flash`, `maxSteps: 2`, College Admin JWT role validation, and `maxDuration = 10`.

### Checkpoint: API Route Verification
- [ ] Verify route streaming response, tool calling resolution, and error handling.

### Phase 3: UI & Dashboard Integration
- [ ] **Task 4: Build Floating Chat Drawer Component (`components/ai/AIChatDrawer.jsx`)**
  - Implement responsive slide-over drawer using `useChat()`, markdown rendering, suggested query pills, and error toasts.
- [ ] **Task 5: Mount Chat Drawer in College Admin Dashboard**
  - Integrate `AIChatDrawer` into `components/Dashboard.jsx` gated strictly to `activeRole === "College Admin"`.

### Checkpoint: UI & Integration
- [ ] Chat drawer opens, sends messages, displays streaming text, and formats tool data properly.

### Phase 4: Verification & Build
- [ ] **Task 6: Multi-Domain Verification & Production Build Check**
  - Test questions across all 5 core domains, verify latency (<3s), check rate limit consumption, and verify `npm run build` succeeds with zero errors.

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
| :--- | :--- | :--- |
| **Vercel 10s Serverless Timeout** | High | `maxSteps: 2`, streaming responses via `toDataStreamResponse()`, fast Mongoose projections with `.maxTimeMS(2500)`. |
| **Atlas M0 Connection Depletion** | High | Always use `@/lib/db.js` singleton (`maxPoolSize: 5`, `bufferCommands: false`), strict `.limit(15)`. |
| **Google Free Tier 15 RPM Limit** | Medium | Limit tool recursion to 1 turn (`maxSteps: 2`) so each question uses at most 2 requests. |
| **UTC Server Timezone Skew** | Medium | Client passes ISO timestamp and local date string in the request payload. |
| **Data Leakage / Role Bypassing** | High | College Admin JWT session verification in route handler; queries scoped by `collegeId`. |
