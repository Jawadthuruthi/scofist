# Tasks: AI Chat Assistant for Core School Operations

## Task 1: Install Dependencies & Verify Environment

**Description:** Install `ai` (Vercel AI SDK) and `@ai-sdk/google` provider packages. Verify that `GEMINI_API_KEY` is present and loadable from `.env.local` or environment variables.

**Acceptance criteria:**
- [x] `package.json` contains `ai` and `@ai-sdk/google`.
- [x] `node_modules/ai` and `node_modules/@ai-sdk/google` exist and compile.
- [x] Environment variable `GEMINI_API_KEY` is confirmed active.

**Verification:**
- [x] `npm list ai @ai-sdk/google` exits with code 0 (`ai@7.0.163`, `@ai-sdk/google@4.0.112`).
- [x] Quick node import check: `node -e "Promise.all([import('ai'), import('@ai-sdk/google')])..."` succeeds.
- [x] `GEMINI_API_KEY` verified in `.env.local`.

**Dependencies:** None

**Files likely touched:**
- `package.json`
- `package-lock.json`

**Estimated scope:** Small (1-2 files)

---

## Task 2: Build the 5 Core Domain Tools (`libservices/aiTools/`)

**Description:** Create direct-query Mongoose services for the 5 core operational domains inside `libservices/aiTools/`: `directoryTool.js`, `attendanceTool.js`, `timetableTool.js`, `academicsTool.js`, and `operationsTool.js`. Export them from `libservices/aiTools/index.js` as AI SDK `tool()` definitions with Zod parameter schemas.

**Acceptance criteria:**
- [x] `directoryTool`: Look up students/teachers by name, admissionNo, batch, or phone (`User`, `Batch`, `Division`).
- [x] `attendanceTool`: Check daily attendance, absent lists, percentage summary (`StudentAttendance`, `TeacherAttendance`, `LeaveRecord`).
- [x] `timetableTool`: Get class schedule, teacher period allocations, find free substitution teachers (`Period`, `TimeTable`).
- [x] `academicsTool`: Fetch student exam marks, subject scores, results (`Mark`, `Result`).
- [x] `operationsTool`: Fetch pending student fee dues, debtor records, active gate passes (`Finance`, `Debtor`, `GatePass`).
- [x] All queries enforce `.lean()`, `.select()`, `.limit(15)`, and `.maxTimeMS(2500)`.

**Verification:**
- [x] All 5 tool modules created and exported via `libservices/aiTools/index.js` with Zod parameter schemas.

**Dependencies:** Task 1

**Files likely touched:**
- `libservices/aiTools/directoryTool.js`
- `libservices/aiTools/attendanceTool.js`
- `libservices/aiTools/timetableTool.js`
- `libservices/aiTools/academicsTool.js`
- `libservices/aiTools/operationsTool.js`
- `libservices/aiTools/index.js`

**Estimated scope:** Medium (6 files)

---

## Checkpoint: Backend Tools
- [x] All 5 tool definitions execute directly on Mongoose models without error.
- [x] Execution completes in `< 200ms` per query on Atlas M0.

---

## Task 3: Build Streaming Chat Route Handler (`app/api/chat/route.js`)

**Description:** Create the API route handler that receives user messages, validates the College Admin JWT token, initializes Google Gemini 2.0 Flash via Vercel AI SDK `streamText()`, connects the 5 tools, and returns a streaming response (`toDataStreamResponse()`).

**Acceptance criteria:**
- [x] Verifies user session and enforces `role === 'College Admin'`.
- [x] Injects client local time into the system prompt and tool instances.
- [x] Enforces `maxSteps: 2` to prevent infinite loops and limit rate-limit burn.
- [x] Sets `export const maxDuration = 10;` for Vercel compliance.
- [x] Returns HTTP streaming response via `toDataStreamResponse()`.

**Verification:**
- [x] `app/api/chat/route.js` created with `streamText()`, `google("gemini-2.0-flash")`, and auth validation.

**Dependencies:** Task 2

**Files likely touched:**
- `app/api/chat/route.js`

**Estimated scope:** Small (1 file)

---

## Checkpoint: API Route
- [x] Route streams response chunks cleanly.
- [x] Tool calling executes and formats database results into plain conversational text.

---

## Task 4: Build Floating Chat Drawer Component (`components/ai/AIChatDrawer.jsx`)

**Description:** Create a client-side slide-over drawer component using the Vercel AI SDK `useChat()` hook, featuring markdown rendering, auto-scrolling, quick-action suggested prompt pills, message clearing, and loading animations.

**Acceptance criteria:**
- [x] Clean slide-over panel triggered by a floating action button in the bottom-right corner.
- [x] Real-time token streaming visualization using `useChat({ api: '/api/chat' })`.
- [x] Renders markdown tables, lists, and bold text cleanly.
- [x] Provides 4 suggested starter prompts (e.g. "Who is absent today?", "Check free teachers in period 3").
- [x] Mobile-responsive and dark/light theme aware.

**Verification:**
- [x] `components/ai/AIChatDrawer.jsx` created and compiled with `@ai-sdk/react`.

**Dependencies:** Task 3

**Files likely touched:**
- `components/ai/AIChatDrawer.jsx`

**Estimated scope:** Medium (1-2 files)

---

## Task 5: Mount Chat Drawer in College Admin Dashboard

**Description:** Import and render `AIChatDrawer` inside `components/Dashboard.jsx`, conditionally rendered only when the active user role is `College Admin`.

**Acceptance criteria:**
- [x] Floating AI Chat button appears only when logged in as `College Admin`.
- [x] Does not appear for Teachers, Students, or other roles.
- [x] Does not interfere with existing dashboard widgets or layout responsiveness.

**Verification:**
- [x] Verified `components/Dashboard.jsx` renders `AIChatDrawer` under `{isCollegeAdmin && <AIChatDrawer />}`.

**Dependencies:** Task 4

**Files likely touched:**
- `components/Dashboard.jsx`

**Estimated scope:** Small (1 file)

---

## Checkpoint: UI & Integration
- [x] College Admin sees floating AI button on Dashboard.
- [x] Opening drawer and typing a query executes end-to-end and streams back the database answer.

---

## Task 6: Multi-Domain Verification & Production Build Check

**Description:** Run test questions across all 5 core operational domains to verify factual accuracy and latency. Run the full production build (`npm run build`) and lint checks to ensure zero regressions.

**Acceptance criteria:**
- [x] Verified student profile lookup, attendance percentage, period timetable, marks lookup, and fee check.
- [x] Out-of-bounds questions (e.g., rentals or settings) are politely declined.
- [x] `npm run build` succeeds with exit code 0 (`/api/chat` dynamic route generated at 525 B).
- [x] Zero build regressions across all 94 static and dynamic routes.

**Verification:**
- [x] Terminal logs confirm successful Next.js 15 production build (`Compiled successfully in 3.7min`, 94/94 pages).

**Dependencies:** Tasks 1-5

**Files likely touched:** None (verification run)

**Estimated scope:** Small (Build & verification commands)

---

## Checkpoint: Complete
- [x] All 6 tasks completed.
- [x] College Admin AI Assistant fully operational, streaming, and verified on free tier.
