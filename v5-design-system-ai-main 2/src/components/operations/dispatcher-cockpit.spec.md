# Operations Center — Dispatcher Cockpit (contract)

The dispatcher's command surface. Ported from the shipped Tadweer ref
(`_unpacked/dispatcher/`, Figma `lXBH6N7ZpHfBuY60tH71TD` node `2227:76367`) into config-driven,
FAMS-branded, token-only DS components. Built **multi-pass** — this spec covers Pass 1.

## Components
- **KpiMetricCard** — value-first KPI: big value + optional colored left accent
  (`success`/`warning`/`error`/`primary` → status/brand tokens) + a delta/status `badge`
  (`up`/`down`/`success`/`warning`/`link`). `value` with a `/` renders a muted tail ("270/292").
  Clickable when `onClick` set (opens a raw-data sheet in a later pass). Complements the DS
  label-first `KpiTile`.
- **StatusBreakdownCard** — Fleet/Workforce panel: title + icon + optional filter, a row of
  labelled counts, and a single overlapping-segment proportion bar. `stats`/`bars` colours are
  DATA (the consumer passes DS tokens) — the component holds no colour literals.
- **DispatcherCockpit** — the page: `alert` (next-shift banner) · `filters` + `actions` ·
  value-first `kpis` grid (6-col) · `statusPanels` · a `children` slot for the Live GIS Map +
  analytics widgets (later passes). Fully config-driven (`DispatcherCockpitProps`).

## Laws
- Token-only; config-driven + domain-agnostic (KPIs/panels/filters are DATA — the block seeds the
  dispatcher/waste demo). Default FAMS brand (primary blue); status/category colours are tokens.
- Consumed via `blocks/operations-center/operations-center.block.tsx` (ModuleConfig, view
  "Dispatcher Cockpit"), wired into the Smart Cities showcase app.

## Multi-pass plan (see T-013)
1. **DONE** — page shell + alert + filters/actions + 12 KPIs + Fleet/Workforce panels.
2. Live GIS Map — DS `LeafletMap` + `AssetMarker` HTML overlay + route-card list + selection +
   telematics popup.
3. Analytics widgets — Route Fulfillment (DonutChart) · Planned vs Actual · Hourly Trend
   (AreaChart) · Client Locations · Bin Repair (DataTable). Reuse DS data-viz.
4. Side-sheets — KPI raw-data · Current Shift Issues · Nearby Routes · Replace Vehicle.
5. Manual Bin Reassignment — full-screen drag-to-draw zones → optimize → reassign flow.
