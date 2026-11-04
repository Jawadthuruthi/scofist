# Specification: Resilient Fuzzy Query Engine & Typo-Tolerant AI Search

## Objective
Upgrade the Scofist College Admin AI Search system to guarantee **100% answer reliability across all college database collections** even when:
1. The user's query contains spelling mistakes or abbreviations (e.g., *"studnts in PG FIRT YEAR"*, *"dedatn points"*, *"atenance for blumea"*).
2. The Google Gemini API hits daily Free Tier rate limits (HTTP 429 Quota Exceeded), is queued, or experiences latency spikes.
3. Complex multi-table questions (enrollment, fee balances, exam score distributions, attendance summaries, arts fest standings) are asked without exact field matches.

Success is defined as: **Zero query failures, zero unhandled errors, zero empty responses, and sub-second deterministic fallback when external AI models are unavailable or throttled.**

---

## Assumptions
1. **Database Truth:** MongoDB Atlas is the single source of truth for all college data (56 collections, including `users`, `classes`, `batches`, `studentattendances`, `marks`, `debtors`, `teams`, `rentals`, `librarybooks`).
2. **Quota Reality:** The Google AI Studio free tier key is subject to hard quota caps (20 requests/day on preview models and shared queuing on lite models). Therefore, the system must not be a single point of failure that depends on Gemini to return accurate data.
3. **Execution Budget:** Running in Next.js 15 on Node.js/Vercel. Deterministic queries must execute in <150ms. Any external LLM calls must fail-fast within 5 seconds.
4. **Typo Scope:** Misspellings occur primarily on entity names (class titles, batch names, student names, team names, subjects) and action keywords (attendance, marks, fees, leaves).

---

## System Architecture

```
User Query (with potential typos, e.g. "studnts in PG FIRT YEAR")
                       │
                       ▼
         [Fuzzy Entity Normalizer]
       (Levenshtein / Word Boundary)
   - "studnts"  ──> "students"
   - "FIRT"     ──> "FIRST"
   - "PG FIRT"  ──> matches class "PG FIRST YEAR"
                       │
                       ▼
            [Intent & Entity Matcher]
   - Extracts: Target = "students", Filter = { classId: "CLS-PG1" }
                       │
        ┌──────────────┴──────────────┐
        ▼                             ▼
 [Gemini AI Engine]        [Deterministic DB Engine]
  - If quota available:     - Always executes in parallel
    calls MongoDB tool      - Resolves exact MongoDB records
    with regex & formats     - Zero API cost, <100ms latency
    conversational text     - Generates Markdown tables & links
        │                             │
        └──────────────┬──────────────┘
                       ▼
       [Resilient Response Dispatcher]
  - Returns Gemini answer if fast & valid (<5s)
  - Instantly returns Deterministic DB answer if Gemini
    times out, hits 429 quota, or outputs empty response.
```

---

## Technical Design & Modules

### 1. In-Memory Fuzzy Entity Resolver (`lib/fuzzySearch.js`)
A lightweight, zero-dependency string distance & fuzzy matcher:
- Implements Damerau-Levenshtein distance with token similarity score ($0.0 - 1.0$).
- Pre-indexes active college entity names:
  - **Classes:** `PLUS ONE`, `PLUS TWO`, `DEGREE FIRST YEAR`, `DEGREE SECOND YEAR`, `DEGREE FINAL YEAR`, `PG FIRST YEAR`, `PG FINAL YEAR`.
  - **Batches:** `BLUMEA`, `NOVEA`, `ORCHID`, `AURELIA`, etc.
  - **Teams:** `DEEDATIAN`, `ATTASIAN`, `AL-GHAZALI`, etc.
  - **Keywords:** `attendance`, `students`, `teachers`, `fees`, `debtors`, `marks`, `library`, `rentals`, `gatepass`, `remarks`.
- Functions:
  - `fuzzyMatchEntity(input, candidateList, threshold = 0.65)`: Returns the highest-scoring canonical entity and its ID.
  - `normalizeQueryKeywords(rawQuery)`: Corrects common typographical errors before processing.

### 2. Typo-Tolerant MongoDB Tool Runner (`lib/aiDatabaseTools.js`)
- Update schema instructions so Gemini formulates **case-insensitive wildcard regexes** instead of exact strings:
  - Example: `{ name: { $regex: "first", $options: "i" } }` instead of `{ name: "FIRST" }`.
- When an exact class name or batch name is not found in a `find` or `aggregate` filter, the tool runner automatically falls back to fuzzy candidate matching against active database documents.

### 3. Comprehensive Deterministic Fallback Engine (`app/api/dashboard/ai-search/route.js`)
Upgrade `synthesizeDatabaseAnswer` to resolve all 30 primary dashboard domains directly from MongoDB:
- **Class & Batch Inquiries:** Resolves enrollment counts and student lists even if the class name was mistyped.
- **Attendance Standings:** Resolves attendance percentages, absent lists, and attendance toppers.
- **Fee Balances (Debtors):** Calculates total fee dues, collected amounts, and pending balances.
- **Arts Fest Leaderboards:** Returns stage points, off-stage points, and total standings for teams.
- **Library & Books:** Lists available books and active student rentals.
- **Exams & Marks:** Calculates class average scores and top performers.
- Every response includes direct clickable links (e.g. `[👉 Open Students Portal](/dashboard/students)`).

---

## Tech Stack & Commands
- **Framework:** Next.js 15.2+ (App Router)
- **Language:** JavaScript (ESM, Node.js v24+)
- **Database:** MongoDB Atlas (Mongoose 8.11+ / Native Driver)
- **AI Model:** Google Gemini API (`gemini-3-flash-preview` / `gemini-3.6-flash` / `gemini-flash-lite-latest`)

### Commands
- **Run dev server:** `npm run dev`
- **Build production:** `npm.cmd run build`
- **Run unit verification:** `node --env-file=.env.local test-fuzzy-search.mjs`

---

## Boundaries
- **Always:** Use `.lean()` and pagination limits (`limit <= 50`) on all MongoDB reads.
- **Always:** Enforce `{ maxTimeMS: 3000 }` on MongoDB queries.
- **Always:** Return verified Markdown tables with exact database figures.
- **Never:** Hardcode API keys or credentials.
- **Never:** Allow write/mutation operators (`$out`, `$merge`, `$where`, `$function`, drop, delete).
- **Never:** Return a generic "unsupported search" or "API error" message to the end user.

---

## Success Criteria
1. **Typo Tolerance:**
   - `"how many studnts in PG FIRT YEAR"` correctly resolves to class `PG FIRST YEAR` and returns the exact student enrollment count.
   - `"who are top 2 tams in arts fest"` correctly resolves to `teams` and returns the standings for `DEEDATIAN` and `ATTASIAN`.
   - `"atenance for bluma"` correctly matches batch `BLUMEA` and returns attendance records.
2. **Quota Resilience:**
   - When Gemini returns HTTP 429 (Quota Exceeded) or times out, the user receives the complete, accurate database report in **under 150 milliseconds** via deterministic fallback.
3. **Accuracy:**
   - 100% of reported numbers match the active MongoDB Atlas documents.
4. **Zero Regressions:**
   - Production build (`npm.cmd run build`) passes with exit code 0.

---

## Open Questions
1. Are there specific custom student aliases or nicknames that administrators commonly search (e.g., admission number without prefix, or informal batch names)?
2. Should the fuzzy matcher threshold be strict (0.75 similarity) or lenient (0.60 similarity) to tolerate severe typos?
