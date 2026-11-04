# Implementation Plan: Resilient Fuzzy Query Engine & Typo-Tolerant AI Search

## Overview
Implement an in-memory fuzzy entity normalizer and upgrade the Scofist AI Search engine to be 100% typo-tolerant and quota-resilient. This ensures that any query—even with spelling errors (e.g., *"studnts in PG FIRT YEAR"*, *"dedatn points"*, *"atenance for bluma"*) or when external Gemini API quota limits (HTTP 429) are active—resolves to the correct MongoDB records and returns verified data in formatted Markdown tables within milliseconds.

---

## Architecture Decisions
- **Zero-Dependency Levenshtein & N-gram Token Matcher:** Build a lightweight, sub-millisecond string distance utility in `lib/fuzzySearch.js` rather than adding large external dependencies. Pre-index canonical classes, batches, teams, and administrative keywords.
- **Fail-Fast Hybrid Dispatcher:** When Gemini is available and responsive within 5 seconds, use LLM generation with relaxed regex tool-calling. If Gemini encounters HTTP 429 (Quota Exceeded), times out, or fails, immediately fall back to the deterministic fuzzy engine without any downtime or error screens.
- **AST-Safe Fuzzy Retry in Tool Runner:** If a tool call targets an exact string that yields zero documents (e.g. `{ name: "PG FIRT YEAR" }`), the runner attempts fuzzy resolution against the collection's actual index and transparently recovers the target record.
- **Rich Markdown Fallback Synthesis:** Ensure `synthesizeDatabaseAnswer` produces structured Markdown tables, exact figures, and direct clickable links (`/dashboard/...`) across all 30 Scofist modules.

---

## Dependency Graph
```
lib/fuzzySearch.js (Levenshtein & Entity Resolver)
        │
        ├──> lib/aiDatabaseTools.js (Typo-Tolerant Tool Runner & Schema Catalog)
        │
        └──> app/api/dashboard/ai-search/route.js (Deterministic Engine & Dispatcher)
                    │
                    └──> End-to-End Verification & Production Build
```

---

## Tasks Overview

### Phase 1: Foundation — In-Memory Fuzzy Entity Resolver (`lib/fuzzySearch.js`)
- [ ] **Task 1:** Build `lib/fuzzySearch.js` with Damerau-Levenshtein distance, n-gram token similarity, entity dictionary, and abbreviation mapper (`FY` $\rightarrow$ `FIRST YEAR`, `PG1` $\rightarrow$ `PG FIRST YEAR`).

### Checkpoint: Foundation
- [ ] Unit tests pass for fuzzy string distances, entity matching, and query normalization.

---

### Phase 2: Tool Runner & Schema Upgrades (`lib/aiDatabaseTools.js`)
- [ ] **Task 2:** Update `SCOFIST_SCHEMA_CATALOG` to enforce `$regex` wildcard patterns for names and titles. Add automated fallback recovery in `executeSafeMongoQuery` when zero documents match an exact string filter.

### Checkpoint: Typo-Tolerant Tooling
- [ ] Verified that queries with minor misspellings resolve MongoDB records safely within sandbox limits.

---

### Phase 3: Deterministic Engine & Route Integration (`app/api/dashboard/ai-search/route.js`)
- [ ] **Task 3:** Wire `fuzzySearch` into `parseQueryIntent`, `fetchGroundedContext`, and `synthesizeDatabaseAnswer`. Support classes, batches, teams, attendance, fees, exams, and library queries with zero-timeout deterministic execution.

### Checkpoint: Resilient Route
- [ ] End-to-end queries with typos resolve verified database data in <150ms even when Gemini returns 429 Quota Exceeded.

---

### Phase 4: Multi-Domain Verification & Production Build
- [ ] **Task 4:** Run comprehensive test suite across diverse typo queries. Verify clean production build (`npm.cmd run build`) with zero lint or bundling regressions.

### Checkpoint: Complete
- [ ] All acceptance criteria in `SPEC-ai-fuzzy-engine.md` met. Ready for deployment.

---

## Risks and Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| Overly aggressive fuzzy matching (false positives) | Medium | Enforce adaptive thresholding (0.65 default; minimum token length > 3; exact prefix boosting). |
| Google AI Studio Free Tier 429 Quota Exceeded | High | The deterministic engine runs in parallel or as instant fallback, guaranteeing 100% uptime with zero external dependencies. |
| In-memory lookup memory consumption | Low | Pre-indexed dictionaries are lightweight JS objects (<50KB RAM), well within Atlas M0 and Vercel limits. |
