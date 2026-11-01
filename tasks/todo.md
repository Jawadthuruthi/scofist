# Tasks: Downloads & Document Preview Performance Optimization

## Task 1: Single-Page Rendering and Cancellation in `DocumentPreviewDialog.jsx`

**Description:** Refactor the PDF rendering loop in `components/DocumentPreviewDialog.jsx` to render strictly one page at a time (`currentPage`). Ensure any existing render task is safely cancelled before starting a new page render, preventing concurrent canvas executions and memory leaks.

**Acceptance criteria:**
- [x] Add `currentPage` state (defaulting to 1, clamped between 1 and `pdfDoc.numPages`).
- [x] Replace `Array.from({ length: pdfDoc.numPages })` with a single `<PdfPageItem>` rendering `currentPage`.
- [x] Cancel prior `renderTask` upon page or zoom change, swallowing `RenderingCancelledException`.
- [x] Total active `<canvas>` elements in the dialog remains at 1 regardless of document length.

**Verification:**
- [x] Build succeeds: `node --check components/DocumentPreviewDialog.jsx` (compiled in Next.js build)
- [x] Manual check: Opening a document mounts only 1 page canvas; changing page swaps canvas content without DOM bloat.

**Dependencies:** None

**Files likely touched:**
- `components/DocumentPreviewDialog.jsx`

**Estimated scope:** Small (1 file)

---

## Checkpoint: Core Engine
- [x] Single canvas mounts on document load.
- [x] Memory footprint does not scale with page count.

---

## Task 2: Responsive Page Navigation & Jump-to-Page Toolbar

**Description:** Add intuitive, mobile-friendly navigation controls to `DocumentPreviewDialog.jsx`, including Previous/Next page buttons, page counter (`Page X of Y`), jump-to-page input, keyboard navigation (left/right arrows), and touch swipe gestures.

**Acceptance criteria:**
- [x] Previous button disabled on page 1; Next button disabled on `numPages`.
- [x] Jump-to-page input allows direct navigation to any valid page number.
- [x] Pressing `ArrowLeft` and `ArrowRight` changes pages.
- [x] Touch gestures on mobile (swiping left goes to next page, swiping right goes to previous page).

**Verification:**
- [x] Build succeeds: verified through Next.js compilation
- [x] Manual check: Page navigation works via buttons, keyboard shortcuts, and touch gestures.

**Dependencies:** Task 1

**Files likely touched:**
- `components/DocumentPreviewDialog.jsx`

**Estimated scope:** Small (1 file)

---

## Task 3: Native Viewer Escape Hatch & Action Bar Enhancements

**Description:** Provide a direct "Open in Browser" / native viewer button in the dialog header so users can view heavy 100+ page documents using their device's built-in PDF viewer if preferred. Polish the zoom controls to operate smoothly on the single active page.

**Acceptance criteria:**
- [x] Dedicated "Open in Browser" button opens the document URL in a new window/tab (`_blank`).
- [x] Zoom controls (zoom in, zoom out, reset to fit) scale the active page cleanly.
- [x] Dialog header remains compact and well-aligned on mobile screen widths without overflowing.

**Verification:**
- [x] Build succeeds: verified through Next.js compilation
- [x] Manual check: "Open in Browser" button correctly triggers native view; header layout adapts smoothly on mobile viewport.

**Dependencies:** Task 2

**Files likely touched:**
- `components/DocumentPreviewDialog.jsx`

**Estimated scope:** Small (1 file)

---

## Checkpoint: Navigation & Controls
- [x] Complete pagination controls functioning smoothly.
- [x] Native escape hatch accessible directly from the top bar.

---

## Task 4: Streaming & Range Support in `/api/download-file`

**Description:** Upgrade the proxy route `app/api/download-file/route.js` from in-memory buffering (`Buffer.from(arrayBuffer)`) to streaming via Web standard `ReadableStream` / `response.body`. Forward `Range` and `Accept-Ranges` headers so PDF.js and browsers can stream page chunks without running into Vercel's 4.5MB payload limit.

**Acceptance criteria:**
- [x] Do not buffer complete file payloads in server memory using `arrayBuffer()`.
- [x] Pass through `response.body` directly to `NextResponse`.
- [x] Forward HTTP byte ranges (`Range` header) to the upstream storage host and return 206 Partial Content when applicable.

**Verification:**
- [x] Build succeeds: `node --check app/api/download-file/route.js`
- [x] Manual check: Downloading/previewing files larger than 4.5MB streams without Vercel payload limit errors.

**Dependencies:** None

**Files likely touched:**
- `app/api/download-file/route.js`

**Estimated scope:** Small (1 file)

---

## Checkpoint: Network & Proxy
- [x] Proxy route streams chunks instead of buffering entire files in RAM.
- [x] Avoids Vercel 10s execution timeouts and 4.5MB body limits.

---

## Task 5: Cross-Module Verification & Production Build

**Description:** Verify document previews across all 4 entry points (`Downloads`, `Books`, `Syllabus`, and `StudentDashboard`), ensuring backward compatibility. Run a full Next.js production build (`npm run build`).

**Acceptance criteria:**
- [x] Verify preview works identically in Downloads (`components/Downloads.jsx`), Books (`components/Books.jsx`), Syllabus (`components/Syllabus.jsx`), and Student Dashboard (`components/StudentDashboard.jsx`).
- [x] `npm run build` succeeds with zero errors.

**Verification:**
- [x] Build succeeds: `npm run build` (All 94 routes generated successfully)
- [x] Manual check: No console errors, no memory leaks, smooth page navigation.

**Dependencies:** Tasks 1, 2, 3, 4

**Files likely touched:**
- `components/Downloads.jsx` (verification)
- `components/Books.jsx` (verification)
- `components/Syllabus.jsx` (verification)
- `components/StudentDashboard.jsx` (verification)

**Estimated scope:** Small (Verification only)

---

## Checkpoint: Complete
- [x] All acceptance criteria met across all tasks.
- [x] Full production build green and ready to ship.
