# FAMS Frontend — Approved Libraries (OSS-only)

Canonical pick-list for the design system + product apps. **Hard rule: MIT / Apache-2.0 / BSD only — no paid tiers, per-seat, or mandatory SaaS.** Strategic rationale + the capability matrix live in-repo at `docs/ARCHITECTURE.md` (§4–§6); this file is the operational reference. Keep it updated as decisions land.

**Scope:** *Foundation* and *Primitives & overlays* are the **design system** itself. *State*, *realtime/offline*, *forms orchestration*, *exports*, and *field/media data* rows are the **application layer** (the frontend rebuild) — listed here as the shared platform reference, not shipped by the design system. The DS stays state-agnostic (see `docs/ARCHITECTURE.md` § Scope).

Legend: ✅ confirmed · 🔎 confirming (agent in flight) · ⛔ rejected (here for the record)

## Foundation
| Concern | React | Vue | License | Status |
|---|---|---|---|---|
| Language | TypeScript strict | TypeScript strict | Apache-2.0 | ✅ |
| Build | Vite 7 | Vite 7 | MIT | ✅ |
| Styling | Tailwind CSS v4 (`@theme`) | same | MIT | ✅ |
| Tokens | `@fams/tokens` (DTCG → Style Dictionary v5 → CSS vars + Tailwind preset) | same | Apache-2.0 | ✅ |
| Monorepo | pnpm + Turborepo | same | MIT | ✅ |

## Primitives & overlays
| Concern | React | Vue | License | Status |
|---|---|---|---|---|
| Primitive layer | shadcn/ui on **Radix** (unified `radix-ui` pkg, WorkOS-maintained) | shadcn-vue on **Reka UI v2** | MIT | ✅ |
| Dialog/Popover/Tooltip/Menu/Select | Radix | Reka | MIT | ✅ |
| Command palette / Combobox | **cmdk** (or Base UI Combobox for full React-19 cleanliness) | Reka Combobox (native) | MIT | ✅ |
| Headless alt (optional) | Base UI v1 (MUI, has Combobox/Autocomplete) | — | MIT | ✅ opt-in |
| Toast / notifications | **Sonner** | **vue-sonner** | MIT | ✅ |

## Forms & validation
| Concern | React | Vue | License | Status |
|---|---|---|---|---|
| Forms | React Hook Form | VeeValidate | MIT | ✅ |
| Validation | **Zod 4** (Standard-Schema; Valibot if bundle-critical) | same | MIT | ✅ |
| Escape hatch | TanStack Form v1 | TanStack Form v1 | MIT | ✅ |

## Data, tables, state
| Concern | React | Vue | License | Status |
|---|---|---|---|---|
| Server state / cache | TanStack Query **v5** | TanStack Query v5 (or Pinia Colada) | MIT | ✅ |
| Client state | Zustand 5 | Pinia | MIT | ✅ |
| Data grid | **TanStack Table v8** + shadcn DataTable | same | MIT | ✅ (AG Grid Enterprise ⛔ paid) |
| Big-data grid (opt) | Glide Data Grid / Material React Table | — | MIT | ✅ opt-in |
| Virtualization | **TanStack Virtual** | TanStack Virtual | MIT | ✅ |
| Drag & drop (Kanban/lists) | **@atlaskit/pragmatic-drag-and-drop** (+ `-hitbox`/`-react-drop-indicator`/`-live-region`) | — | Apache-2.0 | ✅ locked stack (`ui-kit` + `v5-templates`); a11y via each card's keyboard "Move to…" menu, `KANBAN-DND` (`docs/phase-2-tickets.md`, done 2026-07-23) |

## Maps & charts
| Concern | React | Vue | License | Status |
|---|---|---|---|---|
| Map engine | `react-map-gl/maplibre` v8 (MapLibre v5) | `@indoorequal/vue-maplibre-gl` v8 / raw | BSD/MIT | ✅ (single engine; Leaflet dropped) |
| Clustering / big-data layers | **supercluster** (index) → **deck.gl** GPU layers | same | ISC/MIT | ✅ |
| Geozone draw | **terra-draw** / `maplibre-gl-terradraw` | same | MIT | ✅ (mapbox-gl-draw ⛔ dead) |
| Charts (heavy dashboards) | **ECharts** (thin `echarts.init` wrapper; `echarts-for-react` is stale) | **vue-echarts** 8.x | Apache-2.0 | ✅ single-lib winner (geo+datazoom+100k) |
| Charts (specialist, opt-in) | **uPlot** (dense real-time time-series), **deck.gl** (geo 100k+) | same | MIT | ✅ opt-in for heavy panels |
| Charts (light KPI) | Recharts / Tremor | vue3-apexcharts | MIT | ✅ |

## Realtime, offline, exports
| Concern | React | Vue | License | Status |
|---|---|---|---|---|
| Realtime transport | **SSE** (target) / polling (day 1) → `queryClient.setQueryData`; `@microsoft/fetch-event-source` | SSE via VueUse `useEventSource` | MIT | ✅ (not WebSocket) |
| PWA | vite-plugin-pwa (Workbox) | same | MIT | ✅ |
| Offline store | **Dexie** (+ TanStack persist) | same | Apache-2.0 | ✅ (Dexie Cloud ⛔ SaaS; RxDB if turnkey sync later) |
| Excel | **ExcelJS** | same | MIT | ✅ (SheetJS ⛔ CDN+CVE+Pro) |
| PDF | jsPDF/autotable or pdfmake | same | MIT | ✅ |
| Screenshot | **modern-screenshot** | same | MIT | ✅ (html2canvas ⛔ breaks on TW v4 oklch) |

## Field / media
| Concern | React | Vue | License | Status |
|---|---|---|---|---|
| File upload (resumable) | `@uppy/react` (+ tus, self-host tusd) | `@uppy/vue` | MIT | ✅ |
| Image lightbox | yet-another-react-lightbox | vue-easy-lightbox / PhotoSwipe | MIT | ✅ (Fancybox ⛔ GPLv3) |
| Image annotation / doodle | react-konva | vue-konva (Konva) | MIT | ✅ (marker.js ⛔ Linkware) |
| GPS+timestamp overlay | custom canvas + browser-image-compression (+ piexifjs) | same | MIT | ✅ |
| Video / HLS | `@vidstack/react` + hls.js | Vidstack / `@videojs-player/vue` + hls.js | MIT/Apache | ✅ |
| QR / barcode | `@yudiel/react-qr-scanner` | `vue-qrcode-reader` (core: barcode-detector + zxing-wasm) | MIT/Apache | ✅ (html5-qrcode stale) |
| Signature | react-signature-canvas | vue3-signature (core: signature_pad) | MIT | ✅ |
| Phone input | react-phone-number-input | vue-tel-input (libphonenumber-js) | MIT | ✅ |
| Geolocation | native + usehooks | native + VueUse `useGeolocation` | MIT | ✅ |

## Utilities, email, docs/test
| Concern | React | Vue | License | Status |
|---|---|---|---|---|
| Dates | **date-fns v4 + @date-fns/tz** | same | MIT | ✅ (moment ⛔ deprecated) |
| Date/range picker | react-day-picker | Reka UI Calendar | MIT | ✅ |
| Client search | Fuse.js (FlexSearch >10k) | same | MIT | ✅ |
| Dynamic field rules | jexl + jsonpath-plus | same | MIT | ✅ |
| Email templates | **Maizzle** (Tailwind, framework-agnostic, consumes `@fams/tokens`) | same | MIT | ✅ → `packages/email` |
| Icons | **Iconify** engine + **Lucide** (ISC) base + per-tenant IconifyJSON; `<Icon>` resolves tenant→fams→lucide | same | MIT framework (⚠️ per-set licenses — allow-list + CI check) | ✅ retire icon font; migrate v1 IcoMoon→`fams` set |
| i18n (deferred) | react-i18next | vue-i18n | MIT | ✅ later |
| Preview/showcase | `workshop/showcase` — **the** live-preview + docs platform (primary) | — (Vue track removed) | — | ✅ |
| Component workbench | `workshop/storybook` — **Storybook 10** (React + Vite), additive second vehicle for isolated prop-level work + the a11y panel; showcase stays primary and owns the DoD/registry | — (Vue track removed) | MIT | ✅ (founder call 2026-08-05; Chromatic + every hosted addon ⛔ SaaS) |
| Test | Vitest + Testing Library + Playwright visual regression (harness exists, local-only — not yet a CI gate; see `CLAUDE.md`) | same | MIT (Vitest/Testing Library/Playwright); Apache-2.0 (`@visual-regression-tracker/agent-playwright`, the optional VRT-upload lane — not MIT-only, see Alignment) | ✅ |

## Rejected (record)
AG Grid Enterprise ($999/dev) · Highcharts (commercial) · SheetJS Pro · Dexie Cloud (SaaS) · Mapbox GL (proprietary) · marker.js (Linkware) · Fancybox (GPLv3) · mapbox-gl-draw (unmaintained) · html2canvas (oklch break) · html5-qrcode (stale) · Chromatic + every other hosted Storybook addon (SaaS — Storybook *core* is MIT and installed; the hosted layer is not).

## Alignment (Phase 1 §5)

Every dep below has a pinned entry in the `catalog:` block of
`pnpm-workspace.yaml` (pnpm@11 catalogs — central version pinning). Packages
that use a dep today reference it as `"catalog:"` in their `package.json`;
"catalog-only" deps exist **only** in the catalog + this table until a later
phase actually adopts them — they are never installed into any package until
then. License verdicts below are the decision #5 gate (`pnpm info <pkg>
license version`, checked 2026-07-21) — every entry here passed
(MIT/Apache-2.0/BSD/ISC only).

| Dep | Pinned (catalog) | License | Verdict | Where used / reserved for |
|---|---|---|---|---|
| `@tanstack/react-router` | `^1.170.18` | MIT | ✅ | `skeleton-kit` + `skeleton-example` (in use) |
| `@tanstack/react-query` | `^5.101.4` | MIT | ✅ | `skeleton-kit` + `skeleton-example` (in use) |
| `@tanstack/react-virtual` | `^3.14.5` | MIT | ✅ | `ui-kit` `DataTable` virtual body (in use) |
| `@tanstack/react-table` | `^8.21.3` | MIT | ✅ | catalog-only — `ui-kit`'s `DataTable` is a hand-rolled table (own `useDataTableSort`/`useDataTableColumns`/`useDataTablePagination`/`useDataTableGrouping` hooks), **not** on `@tanstack/react-table` today; reserved per decision #7/#8 ("TanStack Table for ALL tables") for when Task 6 or a later pass adopts it |
| `react-hook-form` | `^7.82.0` | MIT | ✅ | `v5-composer` (in use) — `SchemaForm` / `useSchemaForm` (phase 2 §2, FieldRegistry) |
| `zod` | `^4.4.3` (v4) | MIT | ✅ | `v5-composer` (in use) — the compiler emits a Zod v4 schema per field-set (phase 2 §2) |
| `@hookform/resolvers` | `^5.4.0` | MIT | ✅ | `v5-composer` (in use) — bridges the compiled Zod schema into react-hook-form via `zodResolver` (phase 2 §2). License checked 2026-07-22, `pnpm info @hookform/resolvers license version`; peer `react-hook-form@^7.55.0` satisfied by the pinned `^7.82.0` |
| `date-fns` | `^4.4.0` (v4) | MIT | ✅ | `ui-kit` (in use) — already on v4.4.0, matches the pinned catalog version exactly; no upgrade required. `react-day-picker@9` bundles its own `date-fns@^4.1.0` + `@date-fns/tz@^1.4.1` internally, so no peer conflict |
| `@date-fns/tz` | `^1.5.0` | MIT | ✅ | catalog-only — not imported directly by `ui-kit` source (only pulled transitively by `react-day-picker`'s own deps); reserved for when app code needs explicit IANA-timezone-aware dates |
| `echarts` | `~5.6.0` | Apache-2.0 | ✅ | `ui-kit` (in use) — pinned off the previous bare `^5` (which could silently resolve to 6.x on a fresh install) because **echarts v6 has a known regression, upstream issue #21434**; 5.6.0 is the latest 5.x release and matches what's already resolved in the lockfile |
| `@atlaskit/pragmatic-drag-and-drop` | `^2.0.1` | Apache-2.0 | ✅ | `ui-kit` + `v5-templates` (in use) — `KANBAN-DND` (`docs/phase-2-tickets.md`, done 2026-07-23); `@hello-pangea/dnd` removed from `ui-kit` |
| `@atlaskit/pragmatic-drag-and-drop-hitbox` | `^2.0.0` | Apache-2.0 | ✅ | `ui-kit` (in use) — `KanbanCard`'s closest-edge reorder detection |
| `@atlaskit/pragmatic-drag-and-drop-react-drop-indicator` | `^4.1.1` | Apache-2.0 | ✅ | `ui-kit` (in use) — `KanbanCard`'s drop-line visuals |
| `@atlaskit/pragmatic-drag-and-drop-live-region` | `^2.0.0` | Apache-2.0 | ✅ | `ui-kit` (in use) — `KanbanCard` lift/drop screen-reader announcements |
| `maplibre-gl` | `^5.24.0` | BSD-3-Clause | ✅ | `v5-templates` (in use) — `MapPanel`'s GL engine, phase 2 §3 |
| `react-map-gl` | `^8.1.1` | MIT | ✅ | `v5-templates` (in use) — `MapPanel`'s React binding (`react-map-gl/maplibre`), phase 2 §3 |
| `deck.gl` | `^9.3.7` | MIT | ✅ | `v5-templates` (in use) — `MapPanel`'s GPU marker/cluster/heatmap/geo-json layers via `MapboxOverlay` interleaved mode, phase 2 §3 |
| `@deck.gl/mapbox` | `^9.3.7` | MIT | ✅ | `v5-templates` (in use) — added alongside `deck.gl` (not re-exported from that metapackage's barrel, so it needs its own directly-resolvable pin); same project/license as `deck.gl`, version-locked to it, zero new legal surface. Supplies `MapboxOverlay` for interleaved-mode rendering into MapLibre's own WebGL context, phase 2 §3 |
| `terra-draw` | `^1.32.1` | MIT | ✅ | `v5-templates` (in use) — `MapPanel`'s geofence draw/edit (polygon + circle), phase 2 §3 |
| `terra-draw-maplibre-gl-adapter` | `^1.4.1` | MIT | ✅ | `v5-templates` (in use) — the MapLibre binding for `terra-draw` (engine-agnostic core, adapter is a separate package per terra-draw's own docs); not previously catalog-pinned, added alongside `terra-draw` for phase 2 §3 since draw doesn't function without it. License checked 2026-07-22, `pnpm info terra-draw-maplibre-gl-adapter license version`; peers (`terra-draw@^1.0.0`, `maplibre-gl@>=4`) satisfied by the pinned versions above |
| `supercluster` | `^8.0.1` | ISC | ✅ | `v5-templates` (in use) — `MapPanel`'s marker clustering feeding deck.gl (phase 2 §3). License checked 2026-07-22, `pnpm info supercluster license version`; its one dependency, `kdbush`, is also ISC (same author, checked same pass) |
| `msw` | `^2.15.0` | MIT | ✅ | catalog-only — phase 3 dev-dep (demo API mocking, decision #19) |
| `@visual-regression-tracker/agent-playwright` | `^5.3.1` | Apache-2.0 | ✅ | `showcase` (in use, `catalog:`) + `fams-v5-demo-environment/app` (in use, same pin) — dev-dep; uploads Playwright screenshots to the self-hosted Visual Regression Tracker (`infra/vrt/`) when `VRT_URL` is set, both suites' local-baseline default path otherwise (phase 4 §2). License checked 2026-07-22, `pnpm info @visual-regression-tracker/agent-playwright license version` |
| `@base-ui/react` | `^1.6.0` | MIT | ✅ | **added as a real `ui-kit` dependency** — headless base for new primitives going forward (decision #7). npm serves the package as **`@base-ui/react`**; the older name `@base-ui-components/react` is deprecated on the registry ("Package was renamed to @base-ui/react") — do not use it |
| `react-aria-components` | `^1.19.0` | Apache-2.0 | ✅ | catalog-only — reserved for date/time pickers + Tree only (decision #7); existing pickers (Radix `Slider`, `react-day-picker`) migrate on touch |
| `lucide-react` | `^1.22.0` | ISC | ✅ | `ui-kit` / `v5-templates` / `showcase` (in use) — kept at the already-installed version; a newer 1.25.0 exists but bumping icon-set versions is out of scope for a pure alignment pass |
| `cmdk` | `^1.1.1` | MIT | ✅ | `ui-kit` (in use) — already an `ui-kit` dependency (the `Combobox` composite's search list); centralized into the catalog on phase 1 §6 (Task 6) alongside porting a standalone `Command`/`CommandDialog` primitive (command palette) from `FAMS-Design-System-By-Shaheer`. License checked 2026-07-22, `pnpm info cmdk license version` |
| `vaul` | `^1.1.2` | MIT | ✅ | `ui-kit` — **added as a new dependency** on phase 1 §6 (Task 6): the `Drawer` primitive (gesture-driven bottom sheet), ported from `FAMS-Design-System-By-Shaheer`. License checked 2026-07-22, `pnpm info vaul license version` |
| `typescript` | `^5` | Apache-2.0 | ✅ | shared toolchain — identical range already used by every package; centralized for low-effort consistency, no version change |
| `vitest` | `^3.2.7` | MIT | ✅ | shared toolchain — same as above. Pinned to the patch floor (was a bare `^3`) so this repo and `fams-v5-demo-environment` resolve the SAME patch; both lockfiles are on 3.2.7 (verified 2026-08-05). 3.2.7 is the newest 3.x; vitest 4 is a deliberate non-move. `fams-v5-demo-environment` has no shared catalog, so it pins `^3.2.7` directly — keep in step. |
| `tsup` | `^8.5.1` | MIT | ✅ | shared toolchain — same as above |
| `storybook` | `^10.5.6` | MIT | ✅ | `storybook` (in use) — the Storybook 10 core/CLI for `workshop/storybook` (founder call 2026-08-05, reversing the earlier "not installed" backlog item). License checked 2026-08-05, `pnpm info storybook license version`. Peers `prettier`/`vite-plus`/`@types/react` are all optional-or-satisfied; **telemetry and crash reports are disabled** in `.storybook/main.ts` (`core.disableTelemetry`/`enableCrashReports: false`) so nothing phones home — hard rule 1. **Chromatic (and every other hosted Storybook addon) is rejected: SaaS.** |
| `@storybook/react-vite` | `^10.5.6` | MIT | ✅ | `storybook` (in use) — the React+Vite framework preset. License checked 2026-08-05, `pnpm info @storybook/react-vite license version`; peers `vite@^5\|\|^6\|\|^7\|\|^8` and `react`/`react-dom@^19` are satisfied by the repo's pinned Vite 6 + React 19 — **no pinned version had to move** |
| `@storybook/addon-a11y` | `^10.5.6` | MIT | ✅ | `storybook` (in use) — axe-core-backed accessibility panel per story (rule 5). License checked 2026-08-05, `pnpm info @storybook/addon-a11y license version`. Complements, does not replace, the authoritative `packages/ui-kit/src/a11y.axe.test.tsx` sweep that CI gates |
| `@storybook/addon-docs` | `^10.5.6` | MIT | ✅ | `storybook` (in use) — autodocs + props tables generated from the real TS interfaces (`reactDocgen: 'react-docgen-typescript'`, the same generator the showcase's `PropsTable` uses). License checked 2026-08-05, `pnpm info @storybook/addon-docs license version` |
| `@storybook/addon-themes` | `^10.5.6` | MIT | ✅ | `storybook` (in use) — `withThemeByDataAttribute` writes explicit `data-theme="light"\|"dark"` on `<html>`, which is exactly what `@fams/tokens` keys dark mode off (`:root[data-theme="dark"]`) and what the showcase toggle does (decision #2, ruling ⑤) — never media-query-only. License checked 2026-08-05, `pnpm info @storybook/addon-themes license version` |

**Kanban (`@hello-pangea/dnd` → `pragmatic-drag-and-drop`): DONE (2026-07-23).**
See `docs/phase-2-tickets.md` § `KANBAN-DND` for the full scoping evidence
that preceded the rewrite (API shape mismatch, no built-in reordering/
placeholder/auto-scroll, and — the deciding factor — pragmatic-dnd has no
drop-in equivalent to `@hello-pangea/dnd`'s built-in keyboard + screen-reader
support). The keyboard/screen-reader gap is closed by a board-provided
column registry that lets each `KanbanCard` render a "Move to…" menu, plus
`-live-region` lift/drop announcements. `@hello-pangea/dnd` has been removed
from `ui-kit` entirely.

**Radix lint ban (decision #7):** `packages/ui-kit/eslint.config.js` now
bans new `@radix-ui/*` / `radix-ui` imports via `no-restricted-imports`
(error), with an explicit migrate-on-touch allowlist in
`packages/ui-kit/eslint.radix-allowlist.mjs` covering every file that
imports Radix today (26 files, generated via `rg -l "@radix-ui|from
'radix-ui'" packages/ui-kit/src`). No existing Radix component was rewritten.
