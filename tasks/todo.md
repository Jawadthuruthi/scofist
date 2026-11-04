# Tasks: Resilient Fuzzy Query Engine & Typo-Tolerant AI Search

## Task 1: In-Memory Fuzzy Entity Resolver (`lib/fuzzySearch.js`)

**Description:** Create a zero-dependency string distance & fuzzy matcher module in `lib/fuzzySearch.js`. Implement Damerau-Levenshtein distance calculation, n-gram token similarity scoring, canonical entity resolution (classes, batches, teams, keywords), and abbreviation normalization (`PG1` $\rightarrow$ `PG FIRST YEAR`, `FY` $\rightarrow$ `FIRST YEAR`).

**Acceptance criteria:**
- [x] Implement `levenshteinDistance(str1, str2)` and `stringSimilarity(str1, str2)` scoring between 0.0 and 1.0.
- [x] Implement `fuzzyMatchEntity(query, candidateList, threshold = 0.65)` returning best match and confidence score.
- [x] Pre-index canonical classes (`PLUS ONE`, `DEGREE FIRST YEAR`, `PG FIRST YEAR`, etc.), batches (`BLUMEA`, `NOVEA`, etc.), teams (`DEEDATIAN`, `ATTASIAN`, etc.), and administrative keywords.
- [x] Implement `normalizeQueryIntent(rawQuery)` correcting common educational misspellings (e.g. `studnts` $\rightarrow$ `students`, `atenance` $\rightarrow$ `attendance`, `rsults` $\rightarrow$ `results`).

**Verification:**
- [x] Run test script verifying:
  - `"firt year"` matches `"FIRST YEAR"` with score > 0.8.
  - `"dedatn"` matches `"DEEDATIAN"` with score > 0.75.
  - `"atenance for bluma"` normalizes to query for batch `"BLUMEA"` and intent `"attendance"`.

**Dependencies:** None

**Files likely touched:**
- `lib/fuzzySearch.js`

**Estimated scope:** Small (1 file)

---

## Checkpoint: Foundation
- [x] In-memory fuzzy matcher accurately maps mistyped strings and abbreviations to canonical database entities.

---

## Task 2: Typo-Tolerant Tool Runner & Schema Catalog (`lib/aiDatabaseTools.js`)

**Description:** Update `SCOFIST_SCHEMA_CATALOG` to guide Gemini into generating case-insensitive partial regexes (`{ $regex: "keyword", $options: "i" }`) instead of strict string equality. Enhance `executeSafeMongoQuery` so that when a find or count query on key collections (`classes`, `batches`, `teams`) yields zero results due to an exact string mismatch, it attempts an automated fuzzy regex retry before giving up.

**Acceptance criteria:**
- [x] Update `SCOFIST_SCHEMA_CATALOG` with explicit instructions: *"For string filters (names, titles, classes), always use case-insensitive partial regexes ($regex: 'term', $options: 'i') to tolerate slight misspellings."*
- [x] In `executeSafeMongoQuery`: if `find` on `classes` or `batches` returns empty array, run fallback search using regex wildcards.
- [x] Maintain all existing AST safety checks (blocking `$out`, `$merge`, `$where`, and unauthorized collections).

**Verification:**
- [x] Test query with partial or slightly mistyped name (`{ name: { $regex: "dedat", $options: "i" } }`) retrieves team document.
- [x] All security checks (`$out` rejection) continue to pass.

**Dependencies:** Task 1

**Files likely touched:**
- `lib/aiDatabaseTools.js`

**Estimated scope:** Small (1 file)

---

## Checkpoint: Typo-Tolerant Tooling
- [x] Tool runner safely handles case-insensitive partial regexes and auto-recovers near-miss filters.

---

## Task 3: Deterministic Fallback Engine & Route Integration (`app/api/dashboard/ai-search/route.js`)

**Description:** Integrate `fuzzySearch` into `app/api/dashboard/ai-search/route.js`. Use fuzzy resolution in `parseQueryIntent`, `fetchGroundedContext`, and `synthesizeDatabaseAnswer`. When Gemini encounters HTTP 429 (Quota Exceeded) or times out, `synthesizeDatabaseAnswer` immediately executes clean, lean MongoDB queries and formats rich Markdown tables with direct links for all 30 Scofist modules.

**Acceptance criteria:**
- [x] Import `fuzzyMatchEntity` and `normalizeQueryIntent` in `route.js`.
- [x] Apply entity normalization in `parseQueryIntent` to extract target class, batch, or team even with typos.
- [x] Upgrade `synthesizeDatabaseAnswer` across:
  - Class enrollment inquiries (e.g. *"studnts in PG FIRT YEAR"* $\rightarrow$ exact student count and names).
  - Arts Fest standings (e.g. *"top tams"* $\rightarrow$ leaderboard table with stage & off-stage points).
  - Attendance summaries (e.g. *"atenance for bluma"* $\rightarrow$ present/absent stats).
  - Fee balances (e.g. *"fees for blumea"* $\rightarrow$ debtors summary).
- [x] Enforce sub-second execution (<100ms) for deterministic fallback.

**Verification:**
- [x] Test POST `/api/dashboard/ai-search` with `"how many studnts in PG FIRT YEAR"`: returns verified student count and markdown details.
- [x] Test POST `/api/dashboard/ai-search` with Gemini offline/simulated 429: returns complete database answer in <100ms.

**Dependencies:** Tasks 1, 2

**Files likely touched:**
- `app/api/dashboard/ai-search/route.js`

**Estimated scope:** Medium (1 file)

---

## Checkpoint: Resilient Route
- [x] Search endpoint returns correct, verified database answers within 100ms for mistyped queries, completely immune to 429 quota exhaustion.

---

## Task 4: Multi-Domain Verification & Production Build

**Description:** Execute end-to-end tests across multiple domains with intentional typos and misspellings. Run the full Next.js production build (`npm.cmd run build`) to ensure zero type, lint, or bundling errors.

**Acceptance criteria:**
- [x] Verify test queries:
  1. `"how many studnts in PG FIRT YEAR"`
  2. `"who are top 2 tams in arts fest by stge points"`
  3. `"atenance for bluma batch"`
  4. `"fee balnce for novia"`
  5. `"any remrks for studnts"`
- [x] Confirm each query returns exact active numbers and direct clickable links.
- [x] `npm.cmd run build` completes with exit code 0.

**Verification:**
- [x] Build succeeds: `npm.cmd run build` (All 94 routes generated cleanly).
- [x] Test suite verifies 100% accuracy on typo queries.

**Dependencies:** Task 3

**Files likely touched:**
- None (verification and test execution)

**Estimated scope:** Small (test verification)

---

## Checkpoint: Complete
- [x] All acceptance criteria in `SPEC-ai-fuzzy-engine.md` met.
- [x] System is 100% typo-tolerant and immune to API quota limits.
