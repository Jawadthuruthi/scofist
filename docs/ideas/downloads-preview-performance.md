# Downloads & Document Preview Optimization

## Problem Statement
How might we render multi-page academic documents instantly on low-memory mobile devices without freezing the browser or exhausting device RAM?

## Recommended Direction: Paginated Single-Canvas Modal with Direct Byte Streaming
Replace the current unbounded multi-canvas loop in `DocumentPreviewDialog.jsx` with a single-page viewer architecture:
1. **Single Canvas Lifecycle:** At any time, exactly 1 `<canvas>` exists in the DOM. Changing pages cancels the prior `renderTask` and re-renders the new page on the existing canvas context.
2. **Snappy Navigation Controls:** Floating bottom toolbar with Previous/Next buttons, page indicator (`Page X of Y`), jump-to-page input, and zoom controls.
3. **Direct R2 / Cloudinary Range Streaming:** Ensure PDF.js directly accesses the CDN source with HTTP `Range` headers so it only requests bytes for the active page rather than buffering 50MB into browser memory.
4. **Native Viewer Escape Hatch:** Keep a prominent "Open Native" / "Download" button for students who want full device-native reading features for large textbooks.

## Key Assumptions to Validate
- [ ] Validating that `isR2Url` files allow CORS byte-range requests directly from the client without routing through `/api/download-file`.
- [ ] Validating that destroying and re-rendering on a single canvas prevents mobile Safari and Chrome WebKit process termination on 100+ page documents.
- [ ] Testing on low-end Android (Chrome) and iPhone (Safari) under simulated 3G/4G network throttling.

## MVP Scope
- Refactor `components/DocumentPreviewDialog.jsx`:
  - Add `currentPage` state (default 1).
  - Add page navigation toolbar (`< Prev`, `Page X of Y`, `Next >`).
  - Render only the active page; cancel previous render tasks on page flip.
  - Add swipe gesture or keyboard arrow support for page turning.
- Ensure large PDF direct URLs bypass `/api/download-file` serverless proxying to avoid Vercel 4.5MB payload limits.

## Not Doing (and Why)
- **Not building complex infinite-scroll DOM virtualization:** Inertial scroll on mobile creates white flashes and delayed GC canvas memory leaks. Single-page windowing is 10x more reliable and predictable.
- **Not generating server-side WebP thumbnails for every page:** Would require expensive server compute/lambdas outside the free Vercel tier.
- **Not forcing external tab opens exclusively:** Preserves the in-app experience requested by users.

## Open Questions
1. Should we support horizontal swipe gestures (left/right) on mobile screens to turn pages in addition to the Prev/Next buttons?
2. Do we want to persist the last viewed page number per document in `sessionStorage` so students don't lose their place if they accidentally close the dialog?
