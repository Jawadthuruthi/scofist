# Implementation Plan: Remove AI Chat from Project Entirely

## Overview
Completely remove the Gemini-powered AI Chat / AI Search feature from the Scofist repository. This includes deleting the standalone AI page, the AI search API route, the client UI component, the Gemini client, the AI database tool helpers, the fuzzy search library, and outdated AI specifications, while cleanly updating the College Admin dashboard, bottom navigation bar, and middleware route rules. Per user instruction, environment keys `GEMINI_API_KEY` and `GEMINI_MODEL` are preserved.

## Architecture Decisions
- **Decouple before Deleting:** Remove references in `Dashboard.jsx`, `CollegeAdminBottomBar.jsx`, and `middleware.js` first so no imports or route definitions reference deleted files during the transition.
- **Complete Deletion of Auxiliary Files:** `lib/fuzzySearch.js`, `SPEC-ai-fuzzy-engine.md`, and `SPEC-ai-text-to-mql.md` are deleted as they were built specifically to support the AI search engine.
- **Preserve Environment Keys:** Leave `GEMINI_API_KEY` and `GEMINI_MODEL` in `.env.example` and `.env.local` as requested by the user.
- **Production Build Verification:** Execute `npm.cmd run build` to validate full Next.js bundling, tree-shaking, and route manifest generation.

## Task List

### Phase 1: Reference Decoupling
- [x] Task 1: Unlink and remove UI & Navigation references (`Dashboard.jsx`, `CollegeAdminBottomBar.jsx`, `middleware.js`)

### Checkpoint: Decoupling
- [x] No active component or middleware links to `CollegeAdminAISearch` or `/dashboard/ai`.

### Phase 2: File Deletions
- [x] Task 2: Delete AI Pages, Components, APIs, and Backend Helper Files
- [x] Task 3: Delete Outdated AI Specs and Run Global Reference Audit

### Checkpoint: Clean Workspace
- [x] Zero dead files or orphaned AI imports remain across the repository.

### Phase 3: Verification
- [x] Task 4: Production Build Verification & Regression Check

### Checkpoint: Complete
- [x] `npm.cmd run build` passes with zero errors. All acceptance criteria met.

## Risks and Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| Broken imports in `components/Dashboard.jsx` causing build failure | High | Decouple imports and usages in Task 1 before deleting components in Task 2. |
| Navigation bar grid misaligns on mobile after removing 1 tab | Low | CollegeAdminBottomBar uses flex/grid styling with dynamic items; verify remaining 4 items display evenly. |
| Middleware blocking legitimate routes or crashing on lookup | Medium | Verify `middleware.js` pages array structure remains valid after removing `/dashboard/ai`. |

## Open Questions
- None. All requirements and scope decisions have been resolved and confirmed by the user.
