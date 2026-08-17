# Trip Management block — spec (Pass 1 · the spine)

**Type:** `live-monitoring` (Law 3 — not a new module type). **Renderer:** the DS
`LiveMonitoringView` (`src/components/app-shell/live-monitoring-view.tsx`), rendering its new
config-gated **trip-card list variant** (`MonitoringModuleData.listVariant: 'trip'`). Source: the
consolidated 3-Figma-file spec (FAMS Web Portal · Berkeley Telematics · Americana Foods) —
`docs/contracts/00-INDEX.md` (C1 — list toolbar), `docs/contracts/list-toolbar.contract.md`.

## What it is
A hybrid list + map monitoring surface for trip/route-shaped records, shown across (eventually) 3
use-case skins from ONE config: FAMS Web Portal (canonical, richest — telematics delivery/fleet),
Berkeley Telematics (fleet trips, 5-state taxonomy), Americana Foods (passenger/route transport,
binary seats-availability). Everything domain-specific is DATA: module title, create-verb, status
taxonomy + tones, which metric chips show, capacity vs telematics framing.

## Pass 1 scope (this block)
- Hybrid list + map (reused wholesale from `LiveMonitoringView` — no fork).
- Trip-card list variant: id/title + date/time + `StatePill` (Row1) · vehicle thumb/plate +
  driver avatar/name + right-aligned metric chips (Row2) · multi-leg progress (Row3).
- "Fleet Utilization" progress KPI above the list (`listKpi`).
- List toolbar: the existing hand-rolled live-monitoring search+filter row (see
  `// TODO(C1 adoption)` in `live-monitoring-view.tsx` — the exported `ModuleToolbar` is a
  full-width entity/pipeline row and doesn't fit this ≤~420px list panel without a rewrite of
  both; tracked, not solved here).
- Map: reuses the DS map + `MonitoringRoute`; a trip's route only draws while its row is selected
  (`MonitoringRoute.entityId`); empty state = the new config-driven `emptyPreview` overlay ("No
  Trip Preview!").
- Status taxonomy via `StatePill` (`entity.statusTone` + `entity.statusLabel`) — Completed
  (green) · Ongoing (orange) · Upcoming (purple) for this (FAMS Web Portal) skin.

## Deferred (ticketed — do NOT build against this block yet)
- **Pass 2** — Trip detail via `TaskDetail` (summary grid + assigned vehicle/driver + Timeline /
  Alarms / All-logs sub-tabs + `ActivityFeed`).
- **Pass 3** — route-replay (actual/planned/deviation overlays + numbered stop markers/popups) +
  playback scrubber (`MonitoringRoute.osrm`/`animateMarkerId` already support this; not wired here).
- **Pass 4** — New-Trip 2-step wizard (`StepWizardSheet`) OR an "Optimize Trips/Routes"
  generate-action, wired through `MonitoringModuleData.onCreate`; + a "Send Trip Plan" side-sheet.
- **Pass 5** — workforce-by-site/pickup-point grouped table.

## Adapt (second skin = config, not code)
Swap `LABELS.statusList` for a 5-state taxonomy (Berkeley) or a binary
Seats-Available/Unavailable pair keyed off capacity (Americana); relabel `moduleTitle`/
`createVerb` (Trips → Routes); add/drop `metricChips` per row (cost/fuel are FAMS-portal-specific,
Americana would show pax counts instead) — the `TripCard`/`LiveMonitoringView` renderer never
changes.

## Compose
Wired into `src/showcase/apps/smart-cities.config.tsx`'s `modules` array, same as every other
block in that reference app (see `operationsCenterBlock`/`liveMonitoringBlock` for the pattern).
