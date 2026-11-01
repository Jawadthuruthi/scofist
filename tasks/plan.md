# Implementation Plan: Downloads & Document Preview Performance Optimization

## Overview
Transform the document preview modal (`components/DocumentPreviewDialog.jsx`) from an unbounded multi-canvas renderer into a memory-efficient, paginated single-canvas viewer. This resolves device hangs and freezes on low-memory mobile devices when opening large multi-page PDFs (books, question papers, syllabi), while optimizing the serverless proxy route (`app/api/download-file/route.js`) with streaming to prevent Vercel 4.5MB payload limits and timeouts.

## Architecture Decisions
1. **Single-Canvas Rendering Lifecycle:** At any time, exactly one `<canvas>` exists in the DOM. Moving between pages cleans up the prior canvas context and cancels any pending PDF.js render tasks (`renderTask.cancel()`), capping client memory consumption at ~10MB regardless of whether the document has 2 pages or 500 pages.
2. **Backwards-Compatible Component Interface:** Keep the existing `<DocumentPreviewDialog open={...} onOpenChange={...} item={...} />` contract intact. All 4 calling views (`Downloads.jsx`, `Books.jsx`, `Syllabus.jsx`, and `StudentDashboard.jsx`) will immediately inherit the performance fix without requiring caller code modifications.
3. **Responsive Navigation & Mobile Gestures:** Provide a sticky navigation bar with Previous/Next controls, page counter, jump-to-page input, keyboard navigation (left/right arrows), and touch swipe gestures for mobile ergonomics.
4. **Native Reader Escape Hatch:** Provide an explicit "Open in Browser" button that delegates long reading sessions to the device's native hardware-accelerated PDF engine (`window.open(directUrl, '_blank')`).
5. **Streaming Serverless Proxy:** Upgrade `/api/download-file/route.js` from in-memory buffering (`arrayBuffer()`) to direct streaming (`response.body`) with support for byte ranges, preventing Vercel function payload errors on files > 4.5MB.

---

## Task List

### Phase 1: Core Single-Canvas Engine
- [x] **Task 1: Single-Page Rendering and Cancellation in `DocumentPreviewDialog.jsx`**
  - Add `currentPage` state (defaults to page 1, bounded to `numPages`).
  - Render strictly one `<PdfPageItem>` at a time.
  - Cancel any in-flight PDF.js render tasks when switching pages or zoom levels.

### Checkpoint: Core Engine
- [x] PDF renders page 1 cleanly with a single canvas element in DOM.
- [x] Memory consumption remains flat when changing pages.

---

### Phase 2: Navigation & UX Controls
- [x] **Task 2: Responsive Page Navigation & Jump-to-Page Toolbar**
  - Add floating navigation bar with Prev/Next buttons and page counter (`Page X of Y`).
  - Add jump-to-page numeric input with validation.
  - Implement keyboard arrow navigation (`ArrowLeft` / `ArrowRight`).
  - Implement mobile touch swipe detection (left/right swipe).
- [x] **Task 3: Native Viewer Escape Hatch & Action Bar Enhancements**
  - Add a dedicated "Open in Browser" / native viewer button in the dialog header.
  - Ensure zoom in, zoom out, and fit-to-width controls seamlessly resize the single active page.

### Checkpoint: Navigation & Controls
- [x] User can navigate pages via buttons, keyboard, and touch swipe.
- [x] "Open in Browser" opens native reader in a new tab without closing current work.

---

### Phase 3: Proxy Streaming & Network Optimization
- [x] **Task 4: Streaming & Range Support in `/api/download-file`**
  - Stream `response.body` directly in `NextResponse` instead of buffering into `Buffer.from(arrayBuffer)`.
  - Pass through `Content-Range`, `Accept-Ranges`, and `Content-Length` headers so PDF.js can stream page byte ranges.

### Checkpoint: Network & Proxy
- [x] Large files (> 5MB) download and preview without 4.5MB payload errors or 504 timeouts.

---

### Phase 4: Integration Verification & Production Build
- [x] **Task 5: Cross-Module Verification & Production Build**
  - Verify preview functionality across Downloads, Books, Syllabus, and Student Dashboard.
  - Execute `npm run build` to confirm zero lint or compilation errors.

### Checkpoint: Complete
- [x] No device lag or freezes when previewing 50+ page PDFs.
- [x] Full production build clean and ready for deployment.

---

## Risks and Mitigations
| Risk | Impact | Mitigation |
| :--- | :--- | :--- |
| Fast page flipping triggers `RenderingCancelledException` in PDF.js | Low | Gracefully catch and swallow `RenderingCancelledException` during cleanup |
| File host CORS blocks direct range requests | Medium | Proxy route (`/api/download-file`) streams chunks with `Accept-Ranges: bytes` |
| Mobile touch scroll conflicts with touch swipe | Low | Require horizontal swipe threshold (> 50px deltaX and deltaX > 2 * deltaY) |

---

## Open Questions
- None blocking implementation. Single-canvas pagination is universally safe and fully backwards-compatible.
