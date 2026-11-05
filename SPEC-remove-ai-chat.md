# Spec: Remove AI Chat from Project Entirely

## Objective
Completely remove the Gemini-powered AI Chat / AI Search feature from the Scofist codebase. The removal must eliminate all dead code, API endpoints, UI components, helper utilities, navigation items, and configuration without breaking the College Admin dashboard, mobile navigation, middleware route gating, or project build.

## Tech Stack
- **Framework:** Next.js 15.2+ (App Router)
- **Frontend:** React 18, Tailwind CSS, Lucide Icons
- **Backend:** Next.js Route Handlers (`app/api/*`)
- **Runtime & Build Tools:** Node.js, `npm.cmd`

## Commands
```bash
# Build & Compilation Verification
npm.cmd run build

# Development Server
npm.cmd run dev

# Verification of references
powershell -Command "Get-ChildItem -Recurse -File -Path app, components, lib, middleware.js | Select-String -Pattern 'ai-search|CollegeAdminAISearch|gemini|aiDatabaseTools' | Select-Object Path, LineNumber, Line"
```

## Project Structure & Impacted Files

### 1. Files & Directories to Delete
| Path | Description |
|---|---|
| `app/dashboard/ai/page.jsx` | Dedicated AI assistant / search page |
| `app/dashboard/ai/loading.jsx` | Loading skeleton for the AI page |
| `app/dashboard/ai/` | Entire directory containing AI dashboard routes |
| `app/api/dashboard/ai-search/route.js` | 3,900+ line Gemini text-to-query backend endpoint |
| `app/api/dashboard/ai-search/` | Entire directory containing the route handler |
| `components/CollegeAdminAISearch.jsx` | 700+ line client-side AI chat UI component |
| `lib/gemini.js` | Direct Google Gemini REST API client and fallback runner |
| `lib/aiDatabaseTools.js` | Schema catalog and MongoDB query executor for Gemini function calling |
| `lib/fuzzySearch.js` | Fuzzy matching and Damerau-Levenshtein helper created solely for `ai-search` (confirmed for deletion) |
| `SPEC-ai-fuzzy-engine.md` | Outdated AI fuzzy engine specification markdown file (confirmed for deletion) |
| `SPEC-ai-text-to-mql.md` | Outdated AI text-to-MQL specification markdown file (confirmed for deletion) |

### 2. Files to Modify
| File | Changes Required |
|---|---|
| `components/Dashboard.jsx` | Remove `CollegeAdminAISearch` import (line 80) and the `{activeRole === "College Admin" && <CollegeAdminAISearch ... />}` block (lines 3072–3074). |
| `components/CollegeAdminBottomBar.jsx` | Remove `{ title: "AI Search", label: "AI", href: "/dashboard/ai", icon: Sparkles, ... }` navigation item; remove `Sparkles` icon import if unused. |
| `middleware.js` | Remove `/dashboard/ai` route entry from `pages` array (lines 576–580). |

*Note: Environment variables `GEMINI_API_KEY` and `GEMINI_MODEL` in `.env.example` and `.env.local` will be preserved per user instruction.*

## Code Style & Conventions

### Import & JSX Cleanup
When removing components from compound views (such as `components/Dashboard.jsx`), ensure clean removal without leaving orphan imports, unused state/props, or stray tags:

```javascript
// BEFORE in components/Dashboard.jsx
import Header from "@/components/Header";
import CollegeAdminAISearch from "@/components/CollegeAdminAISearch";
import TimeTableComponent from "@/components/TimeTableComponent";
...
<Header
  title="DASHBOARD"
  subTitle={currentDateStr}
  icon={<Calendar className="h-5 w-5 text-muted-foreground" />}
/>

{activeRole === "College Admin" && (
  <CollegeAdminAISearch settings={settings} apiKey={apiKey} />
)}

{error && <ErrorAlert message={error} />}

// AFTER in components/Dashboard.jsx
import Header from "@/components/Header";
import TimeTableComponent from "@/components/TimeTableComponent";
...
<Header
  title="DASHBOARD"
  subTitle={currentDateStr}
  icon={<Calendar className="h-5 w-5 text-muted-foreground" />}
/>

{error && <ErrorAlert message={error} />}
```

### Bottom Navigation Bar Grid Balance
In `components/CollegeAdminBottomBar.jsx`, removing the 2nd item (`AI Search`) reduces the item count from 5 to 4:
- Dashboard (`/dashboard`)
- Accounts (`/dashboard/accounts`)
- Applications (`/dashboard/applications`)
- Marks (`/dashboard/marks`)

Verify that the grid layout (`grid-cols-4` vs `grid-cols-5`) in `BaseRoleBottomBar` or `CollegeAdminBottomBar` adapts gracefully to 4 items on mobile screens.

## Testing & Verification Strategy

1. **Static Analysis & Reference Check:**
   - Run case-insensitive string searches across `app/`, `components/`, `lib/`, `models/`, and root files to guarantee zero remaining references to `ai-search`, `CollegeAdminAISearch`, `lib/gemini`, `aiDatabaseTools`, and `/dashboard/ai`.
2. **Build Verification:**
   - Execute `npm.cmd run build` to confirm Next.js generates static and server pages without missing import errors, unresolved routes, or compilation warnings.
3. **Manual Route & Layout Sanity Check:**
   - Confirm `/dashboard` loads seamlessly for "College Admin" role with header and tabs intact.
   - Confirm navigating to `/dashboard/ai` returns 404 cleanly and is not intercepted by middleware routing as a valid authenticated view.
   - Confirm mobile bottom navigation renders evenly with the remaining navigation items.

## Boundaries
- **Always do:**
  - Verify every deletion candidate has zero remaining consumers in the codebase before deleting.
  - Run build verification (`npm.cmd run build`) after modifications.
  - Clean up both imports and usage sites together.
- **Ask first:**
  - Whether to delete or preserve `lib/fuzzySearch.js` (it has no dependencies on Gemini and can serve as a standalone string utility, though it is currently unreferenced outside `ai-search`).
  - Whether to delete historical specs `SPEC-ai-fuzzy-engine.md` and `SPEC-ai-text-to-mql.md`.
- **Never do:**
  - Never modify unrelated dashboard tabs, attendance logic, or models.
  - Never remove or alter other API keys or environment variables in `.env.local` or `.env.example`.
  - Never leave dead imports or orphan routes.

## Success Criteria
- [ ] `app/api/dashboard/ai-search/` and its contents are completely deleted.
- [ ] `app/dashboard/ai/` and its contents are completely deleted.
- [ ] `components/CollegeAdminAISearch.jsx`, `lib/gemini.js`, and `lib/aiDatabaseTools.js` are deleted.
- [ ] `components/Dashboard.jsx` no longer imports or renders `CollegeAdminAISearch`.
- [ ] `components/CollegeAdminBottomBar.jsx` no longer includes the AI Search navigation tab.
- [ ] `middleware.js` no longer contains the `/dashboard/ai` route rule.
- [ ] No remaining references to AI chat/search exist in the active application code.
- [ ] `npm.cmd run build` compiles successfully with exit code 0.

## Decisions & Confirmed Scope
1. **`lib/fuzzySearch.js`:** Delete along with other AI search files.
2. **Historical AI Specs (`SPEC-ai-fuzzy-engine.md` and `SPEC-ai-text-to-mql.md`):** Delete to keep specs aligned with active capabilities.
3. **Environment Variables:** Preserved — `GEMINI_API_KEY` and `GEMINI_MODEL` remain intact in `.env.example` and `.env.local` per user request.
