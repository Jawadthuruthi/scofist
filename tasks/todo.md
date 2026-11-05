# Tasks: Remove AI Chat from Project Entirely

## Task 1: Unlink and remove UI & Navigation references

**Description:** Decouple all active components and routing rules that import or reference the AI chat feature. In `components/Dashboard.jsx`, remove the `CollegeAdminAISearch` import and JSX render block. In `components/CollegeAdminBottomBar.jsx`, remove the AI Search item and unused icon import. In `middleware.js`, remove the `/dashboard/ai` route entry from `pages`.

**Acceptance criteria:**
- [x] In `components/Dashboard.jsx`: `import CollegeAdminAISearch ...` is removed.
- [x] In `components/Dashboard.jsx`: `{activeRole === "College Admin" && <CollegeAdminAISearch ... />}` block is removed.
- [x] In `components/CollegeAdminBottomBar.jsx`: "AI Search" navigation item is removed and `Sparkles` import is removed if unused.
- [x] In `middleware.js`: `/dashboard/ai` route item is removed from `pages` array.

**Verification:**
- [x] `Select-String -Path components\Dashboard.jsx, components\CollegeAdminBottomBar.jsx, middleware.js -Pattern "ai-search|CollegeAdminAISearch|/dashboard/ai"` returns no results.

**Dependencies:** None

**Files likely touched:**
- `components/Dashboard.jsx`
- `components/CollegeAdminBottomBar.jsx`
- `middleware.js`

**Estimated scope:** Small (3 files)

---

## Checkpoint: Decoupling
- [x] UI and middleware routes cleanly decoupled without dangling references to the AI feature.

---

## Task 2: Delete AI Pages, Components, APIs, and Backend Helper Files

**Description:** Remove all dedicated AI chat files and directories: the `/dashboard/ai` page directory, the `/api/dashboard/ai-search` route directory, the `CollegeAdminAISearch.jsx` component, `lib/gemini.js`, `lib/aiDatabaseTools.js`, and `lib/fuzzySearch.js`.

**Acceptance criteria:**
- [x] `app/dashboard/ai/` directory and all files inside (`page.jsx`, `loading.jsx`) are deleted.
- [x] `app/api/dashboard/ai-search/` directory and `route.js` are deleted.
- [x] `components/CollegeAdminAISearch.jsx` is deleted.
- [x] `lib/gemini.js` is deleted.
- [x] `lib/aiDatabaseTools.js` is deleted.
- [x] `lib/fuzzySearch.js` is deleted.

**Verification:**
- [x] Verify using `Test-Path` that none of the deleted paths exist.

**Dependencies:** Task 1

**Files likely touched:**
- `app/dashboard/ai/page.jsx`
- `app/dashboard/ai/loading.jsx`
- `app/api/dashboard/ai-search/route.js`
- `components/CollegeAdminAISearch.jsx`
- `lib/gemini.js`
- `lib/aiDatabaseTools.js`
- `lib/fuzzySearch.js`

**Estimated scope:** Medium (6 files + 2 directories)

---

## Task 3: Delete Outdated AI Specs and Run Global Reference Audit

**Description:** Delete outdated AI specifications (`SPEC-ai-fuzzy-engine.md`, `SPEC-ai-text-to-mql.md`), run a global repository search for any leftover AI chat references across the codebase, and verify that `GEMINI_API_KEY` and `GEMINI_MODEL` remain preserved in `.env.example` and `.env.local`.

**Acceptance criteria:**
- [x] `SPEC-ai-fuzzy-engine.md` and `SPEC-ai-text-to-mql.md` are deleted.
- [x] Global search in `app/`, `components/`, `lib/`, `models/`, `libservices/` shows zero matches for `ai-search`, `CollegeAdminAISearch`, `aiDatabaseTools`, `gemini.js`, `fuzzySearch.js`.
- [x] `.env.example` and `.env.local` still contain `GEMINI_API_KEY` and `GEMINI_MODEL`.

**Verification:**
- [x] Search script confirms zero occurrences of removed symbols/files.
- [x] `Select-String -Path .env.example, .env.local -Pattern "GEMINI"` confirms keys are preserved.

**Dependencies:** Task 2

**Files likely touched:**
- `SPEC-ai-fuzzy-engine.md`
- `SPEC-ai-text-to-mql.md`

**Estimated scope:** Small (2 files + verification script)

---

## Checkpoint: Clean Workspace
- [x] All AI code and outdated specs removed, active code verified clean of AI search references.

---

## Task 4: Production Build Verification & Regression Check

**Description:** Run the full Next.js production build (`npm.cmd run build`) to ensure there are no compilation errors, no broken module imports, and no bundle failures.

**Acceptance criteria:**
- [x] `npm.cmd run build` executes and succeeds with exit code 0.
- [x] Next.js successfully compiles client and server bundles without warnings about missing modules.

**Verification:**
- [x] Build terminal logs show successful compilation and page generation.

**Dependencies:** Tasks 1, 2, 3

**Files likely touched:** None (verification run)

**Estimated scope:** Small (Verification command)

---

## Checkpoint: Complete
- [x] All 4 tasks completed and verified.
- [x] AI chat is completely excised from the project.
