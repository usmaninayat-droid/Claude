# Tech Stack — locked (all free OSS, license-verified July 2026)

Selection criteria: UX quality · performance at enterprise scale · high customizability (low-code) · active maintenance · free license. Performance verdicts from the dedicated enterprise scan (no swaps needed).

| Capability | Pick | Notes / rules |
|---|---|---|
| Headless base | **Base UI** (`@base-ui/react`) + **React Aria** for date/time pickers (+Tree) only | shadcn default since Jul 2026; React Aria = Arabic/RTL/Islamic calendars. Existing Radix: migrate-on-touch, lint-ban new usage. **TanStack Table for ALL tables** |
| Styling | **Tailwind v4** + tokens | Zero runtime; tenant switch = CSS var override; prune unused `@theme` namespaces |
| Tokens | **DTCG + Style Dictionary v5** | Ben's pipeline; outputs CSS vars, Tailwind theme, ECharts theme, tenants.css, types |
| Figma sync | **Tokens Studio free tier** (single-file git sync is free; theme-authoring is Pro → tenant themes authored in code) | Repo = source of truth |
| Tables/lists | **TanStack Table + TanStack Virtual** → own ListView | AG Grid Community lacks grouping/tree (Enterprise-only, excluded). Server-side grouping past ~50k rows |
| Forms | **react-hook-form + Zod v4** + own FieldRegistry | RJSF/JSONForms rejected. Compile metadata→schema ONCE, cache per definition version (Zod v4 creates slowly, runs fast) |
| Charts | **Apache ECharts** (own thin wrapper) | **Pin v5.6.x** (v6.0.0 regression #21434). Mandatory dispose-on-unmount; lazy-init offscreen |
| Maps | **MapLibre GL** (react-map-gl) + **deck.gl** + **Terra Draw** | One map per page; interleaved shared GL context; GPU markers + supercluster, never DOM markers |
| Drag & drop | **pragmatic-drag-and-drop** (Atlassian) | dnd-kit rejected (core stale since Dec 2024) |
| Dashboard grid | **react-grid-layout** | Memo widgets; resize charts only on drag stop |
| Calendar | **react-big-calendar** (events) + **DayPilot Lite** (resource scheduler) → own timeline on TanStack Virtual later (~4–6 wks MVP) | All polished timelines are paid. Range-windowed queries + "+N more" caps |
| Router | **TanStack Router** | Type-safe search params (saved views); autoCodeSplitting |
| State | **TanStack Query** (server) + **Zustand** (client) + **Jotai** inside the composer | Per-class gcTime; clean up dynamic atoms |
| Dates | **date-fns v4** (+ @date-fns/tz) | Never moment |
| Mock backend (demo) | **MSW** + Shaheer's sim store formalized | Same API contract as production |
| Visual regression | **Playwright + self-hosted Visual Regression Tracker** | Chromatic (paid) excluded; Lost Pixel dead |
| Workshop | **Storybook 10** | |
| Icons | **lucide-react** | ISC |
| Misc kept | signature_pad, fuse.js, exceljs, jspdf (framework-agnostic); react-international-phone; native BarcodeDetector + ponyfill | |

**Excluded (paid/dead):** AG Grid Enterprise, MUI X Pro/Premium, FullCalendar Premium (no free resource view exists), Schedule-X Premium, Bryntum, Mobiscroll, Planby (custom license), Handsontable (non-commercial), Chromatic, SVAR Gantt (GPLv3), Lost Pixel (archived), dnd-kit (stale).

## The 8 performance rules (design-system law, decision #22)

1. **Grids:** stable memoized data/column refs; server-side grouping past ~50k rows; inline-edit state isolated per cell.
2. **Charts:** one shared ECharts wrapper, dispose on unmount, lazy-init offscreen, pin v5.6.x.
3. **Maps:** one map per page; deck.gl interleaved in MapLibre's GL context; GPU layers only.
4. **Forms:** compile metadata→Zod once, cache per definition version; scoped `useWatch`.
5. **Calendars:** fetch only visible range; cap per-day with "+N more".
6. **Dashboards:** memo every widget; chart resize on drag-stop only.
7. **Bundles:** route-based code splitting; ECharts/MapLibre/DayPilot lazy per route; login path ships none.
8. **Cache:** per-query-class gcTime; composer cleans dynamic form atoms; per-tenant cache wiped on logout.
