# ADR-002: Dynamic Code-Splitting of Chart Visualizers with CLS-Protected Fallbacks

## Status
Accepted

## Date
2026-11-14

## Context
`recharts` is a heavy data visualization library (~180KB minified and gzipped) that renders responsive SVG charts (`BarChart`, `PieChart`, `ResponsiveContainer`).

In the original dashboard architecture, `components/Dashboard.jsx` imported `recharts` statically at the top of the file. This caused:
1. **Initial Bundle Inflation:** Every user (including mobile users, students, and admins on slow connections) was forced to download the entire Recharts package on initial dashboard load, even when navigating tabs that contained no charts.
2. **First Load JS Penalties:** Bloated the entry bundle and degraded Core Web Vitals (LCP and FCP).
3. **Cumulative Layout Shift (CLS) Risk:** Naive dynamic code-splitting using generic `<Skeleton />` loaders without fixed heights causes page content below the chart to jump downward once the SVG hydrates.
4. **Print & PDF Export Interference:** Applying `{ ssr: false }` to components that participate in PDF generation (`jspdf`, `react-to-print`, `html2pdf.js`) causes print routines to capture empty loading skeletons or throw DOM snapshot exceptions.

## Decision
1. **Extract Chart Visualizers into an Isolated Module:**
   - Moved `BatchChart`, `ClassChart`, and `StudentStatusChart` into `components/dashboard/DashboardCharts.jsx`.
   - `Dashboard.jsx` now has zero direct imports from `recharts`.
2. **Lazy-Load via `next/dynamic` with Dimension-Locked Skeletons:**
   - Dynamically load charts in `Dashboard.jsx` using `next/dynamic(..., { ssr: false, loading: () => <Skeleton className="h-[290px] w-full rounded-md" /> })`.
   - The explicit height styling ensures zero layout shift when the SVG charts complete mounting.
3. **Strict Print/Export Whitelist:**
   - Never apply `{ ssr: false }` to components that are part of printable document DOM trees (e.g., student report cards, fee receipts, identity cards, or printable timetables).
   - Dynamic client-only imports are strictly restricted to screen-only interactive dashboard visualizers.
4. **Schema Alignment for Extracted Subcomponents:**
   - `BatchChart` resolves student batches through `student.studentSpecificField?.batchId?._id || student.studentSpecificField?.batchId || student.batchId`.
   - `StudentStatusChart` resolves student statuses through `student.studentSpecificField?.status || student.status || "Unknown"`.

## Alternatives Considered

### 1. Replace Recharts with a Micro-Charting Library (e.g. Chart.js, uPlot)
- **Pros:** Smaller raw bundle size (~40KB).
- **Cons:** Would require rewriting existing custom tooltips, bar border-radii, responsive resize listeners, and legend styles across multiple dashboards. High regression risk.
- **Rejected:** Excessive complexity and code churn when dynamic code-splitting achieves identical initial bundle reduction without rewriting visual logic.

### 2. Server-Side Rendering (SSR) for SVG Charts
- **Pros:** Immediate SVG rendering without dynamic client chunks.
- **Cons:** Recharts requires browser DOM dimensions (`window.innerWidth`, container measurements) for `ResponsiveContainer` and dynamic bar widths. SSR produces hydration mismatch errors and broken aspect ratios.
- **Rejected:** Incompatible with responsive Recharts containers in Next.js App Router.

## Consequences
- Initial shared JS bundle remains compact at **104 kB**.
- Zero Cumulative Layout Shift (CLS) during chart hydration due to dimension-locked skeleton placeholders.
- Critical school printing workflows (ID cards, report cards, receipts) remain 100% reliable.
