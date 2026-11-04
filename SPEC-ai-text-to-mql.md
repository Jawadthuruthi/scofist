# Specification: Dynamic Read-Only Database Tool Calling for Scofist AI Assistant

**Module ID:** `ai-text-to-mql`  
**Status:** DRAFT (Awaiting Approval)  
**Target:** Next.js Route Handler (`app/api/dashboard/ai-search/route.js`) & Gemini Integration (`lib/gemini.js`)

---

## 1. Objective
Empower the Scofist College Admin AI Search Assistant to answer **any arbitrary inquiry** across the live college database (all active Mongoose collections) by granting Google Gemini a sandboxed, strictly read-only MongoDB query execution tool. 

Instead of relying on fragile keyword heuristics and pre-fetched query templates, Gemini will inspect a concise schema catalog, autonomously formulate a targeted read-only aggregation pipeline or find query, receive verified database JSON records, and synthesize an accurate administrative report for the user.

---

## 2. Tech Stack & Environment Constraints

- **Framework:** Next.js 15.2+ (App Router, JavaScript/ESM)
- **Database:** MongoDB Atlas (M0 shared cluster, `Mongoose 8.11+`)
- **LLM Engine:** Google Generative Language REST API (`gemini-flash-lite-latest` primary, `gemini-3.5-flash-lite` fallback)
- **Infrastructure Budget:**
  - Vercel Serverless Function: Max 10s execution timeout.
  - MongoDB Atlas M0: Max 5 pool connections, shared CPU/RAM budget.
  - Tool Execution Timeout: Hard cutoff at 3,500ms per database query.

---

## 3. Commands
- **Dev Server:** `npm.cmd run dev`
- **Production Build:** `npm.cmd run build`
- **Lint Check:** `npm.cmd run lint`
- **API Test:** `node --env-file=.env.local test-query.mjs`

---

## 4. Project Structure
```text
app/api/dashboard/ai-search/
  └── route.js                  → POST handler, intent routing, schema prompt, and fallback engine
lib/
  ├── db.js                     → Cached Mongoose singleton
  ├── gemini.js                 → Generative Language REST API client (function declarations & tool calling)
  └── aiDatabaseTools.js        → (NEW) Whitelisted read-only MQL runner & schema catalog
models/                         → Existing Mongoose models (User, Class, StudentAttendance, Mark, Debtor, etc.)
components/
  └── CollegeAdminAISearch.jsx  → Frontend chat interface with multi-turn history & reset controls
```

---

## 5. Architectural Design & Security Sandbox

### 5.1 Tool Definition: `query_college_database`
Gemini will be configured with a single declarative tool:
```json
{
  "name": "query_college_database",
  "description": "Execute a read-only MongoDB aggregation pipeline or find query to retrieve live records from the Scofist college database.",
  "parameters": {
    "type": "OBJECT",
    "properties": {
      "collection": {
        "type": "STRING",
        "description": "Target collection name (e.g., 'studentattendances', 'users', 'debtors', 'marks', 'librarybooks', 'rentals', 'teams', 'hifzdouras', 'classes')"
      },
      "operation": {
        "type": "STRING",
        "enum": ["aggregate", "find", "count"],
        "description": "Read operation to perform"
      },
      "pipeline": {
        "type": "ARRAY",
        "description": "MongoDB aggregation pipeline stages for 'aggregate' operation"
      },
      "filter": {
        "type": "OBJECT",
        "description": "MongoDB query filter for 'find' or 'count' operation"
      },
      "projection": {
        "type": "OBJECT",
        "description": "Field projections for 'find' operation"
      },
      "sort": {
        "type": "OBJECT",
        "description": "Sort criteria"
      },
      "limit": {
        "type": "INTEGER",
        "description": "Maximum records to return (capped at 50)"
      }
    },
    "required": ["collection", "operation"]
  }
}
```

### 5.2 Strict Security & Safety Sandbox
To prevent unintended mutations, memory exhaustion, or Denial of Service:
1. **Whitelist Collections:** Only allow recognized application collections (`users`, `classes`, `studentattendances`, `marks`, `debtors`, `librarybooks`, `rentals`, `teams`, `hifzdouras`, `gatepasses`, `leaverecords`, `remarks`, `programs`, `results`, `academiccalendars`, `subjects`, `periods`, `batches`, `courses`).
2. **Deny Mutation Operators:** Reject any pipeline or query containing `$out`, `$merge`, `$lookup` into unauthorized collections, `$where`, `$accumulator`, `$function`, or update/delete primitives.
3. **Hard Limit Enforcement:** Force `.limit(50)` on all `find` and `aggregate` pipelines to protect memory and payload budgets.
4. **Lean Query Execution:** Execute all queries via `mongoose.connection.db.collection(coll)` or `.lean()` to bypass document hydration overhead.
5. **Execution Timeout:** Enforce `maxTimeMS: 3000` on MongoDB operations.

### 5.3 Execution Flow & Agentic Loop
```text
1. User enters inquiry in CollegeAdminAISearch.
2. Route checks if Gemini is active.
3. System prompt loads condensed Scofist Schema Dictionary & Tool Declarations.
4. Step 1 (Call Gemini):
   - If Gemini responds with text directly (e.g. general questions or guidance) → Return response.
   - If Gemini requests `query_college_database` tool execution → Proceed to Step 5.
5. Sandbox Execution:
   - Validate AST of query against safety rules.
   - Run query against Atlas with maxTimeMS: 3000 and limit: 50.
6. Step 2 (Call Gemini with Tool Result):
   - Pass tool execution JSON output back to Gemini (`functionResponse`).
   - Gemini synthesizes the markdown tables, quotes exact metrics, and includes direct portal links.
7. Return standardized API response envelope to frontend.
8. If Gemini fails or times out → Seamlessly fallback to existing `synthesizeDatabaseAnswer`.
```

---

## 6. Code Style & Example Implementation

```javascript
// Example of Sandboxed Query Runner in lib/aiDatabaseTools.js
const ALLOWED_COLLECTIONS = new Set([
  "users", "classes", "batches", "courses", "studentattendances",
  "marks", "debtors", "librarybooks", "rentals", "teams", "programs",
  "results", "remarks", "leaverecords", "gatepasses", "hifzdouras",
  "academiccalendars", "subjects", "periods"
]);

const FORBIDDEN_OPERATORS = ["$out", "$merge", "$where", "$function", "$accumulator"];

export async function executeSafeMongoQuery(params) {
  const { collection, operation, pipeline, filter, projection, sort, limit = 25 } = params;

  if (!ALLOWED_COLLECTIONS.has(collection.toLowerCase())) {
    throw new Error(`Unauthorized collection access: ${collection}`);
  }

  const queryStr = JSON.stringify(params);
  for (const op of FORBIDDEN_OPERATORS) {
    if (queryStr.includes(op)) {
      throw new Error(`Forbidden MongoDB operator detected: ${op}`);
    }
  }

  const db = mongoose.connection.db;
  const col = db.collection(collection);
  const safeLimit = Math.min(Math.max(1, limit || 20), 50);

  if (operation === "aggregate") {
    const safePipeline = Array.isArray(pipeline) ? [...pipeline] : [];
    // Ensure pipeline ends with a limit stage
    safePipeline.push({ $limit: safeLimit });
    return await col.aggregate(safePipeline, { maxTimeMS: 3000 }).toArray();
  }

  if (operation === "find") {
    return await col.find(filter || {}, {
      projection: projection || {},
      sort: sort || {},
      limit: safeLimit,
      maxTimeMS: 3000
    }).toArray();
  }

  if (operation === "count") {
    return { count: await col.countDocuments(filter || {}, { maxTimeMS: 3000 }) };
  }

  throw new Error(`Unsupported operation: ${operation}`);
}
```

---

## 7. Testing Strategy

1. **Unit Testing Tool Sandbox:**
   - Verify `$out` and `$merge` are rejected with safety error.
   - Verify unwhitelisted collection access is rejected.
   - Verify `maxTimeMS` and limits are clamped to 50.
2. **Integration Testing with Gemini Function Calling:**
   - Test complex arbitrary inquiries:
     - *"Who are the top 3 students in Plus One by attendance in October 2026?"*
     - *"Which students have fee dues exceeding ₹2,000 in batch NOVEA?"*
     - *"Who recited the most pages in Quran Hifz this semester?"*
     - *"Which team has the highest stage points in arts fest?"*
3. **Fallback Testing:**
   - Verify that simulated Gemini timeout gracefully falls back to `synthesizeDatabaseAnswer` without HTTP 500 error.
4. **Vercel Timeout Verification:**
   - Measure 2-pass tool calling roundtrip latency to ensure total serverless duration remains under 7.5 seconds.

---

## 8. Boundaries

### Always Do:
- Validate every tool call parameter before MongoDB dispatch.
- Enforce strict read-only execution with hard `.limit(50)` and `maxTimeMS: 3000`.
- Preserve existing `synthesizeDatabaseAnswer` fallback so the assistant never goes down if Gemini has demand spikes.
- Quote verified numbers, names, and IDs directly from database output.

### Ask First:
- Modifying MongoDB collection schema definitions or adding new Mongoose indexes.
- Changing model defaults or adjusting serverless timeouts.

### Never Do:
- Never allow write, update, delete, drop, or index manipulation operations.
- Never execute raw JavaScript strings (`$where`, `$function`, `eval`).
- Never expose API keys or internal database connection URIs in client responses.

---

## 9. Success Criteria

1. **Arbitrary Query Coverage:** The assistant successfully answers previously unsupported cross-domain inquiries (e.g., student dues + attendance, specific exam subject averages, teacher substitution patterns) using live records.
2. **Deterministic Data Grounding:** 100% of names, counts, balances, and percentages in answers match Atlas database records.
3. **Execution Latency:** Full request-response cycle completes in `< 8.0s` on Vercel Hobby serverless tier.
4. **Zero Regressions:** Existing student profile queries, class counts, and UI portal navigation links continue functioning identically.
5. **Zero Mutation Vulnerability:** 100% of injection attempts (`$out`, `$merge`, `dropDatabase`) are blocked at the validation layer.

---

## 10. Open Questions

1. **Multi-Step Tool Calls:** Should we permit a maximum of 1 tool call per request (recommended for Vercel 10s budget) or allow up to 2 chained calls (e.g. Find class ID first, then Query student attendance)?
   - *Recommendation:* 1 tool call per turn, providing class & batch maps in the system prompt so the LLM has IDs ready on step 1.
2. **Chat History in Tool Calls:** When continuing conversations across multiple turns, should the tool responses be summarized in history to keep token counts compact?
   - *Recommendation:* Keep the assistant's final markdown response in `chatHistory`, omitting raw tool JSON blobs to conserve context tokens and latency.
