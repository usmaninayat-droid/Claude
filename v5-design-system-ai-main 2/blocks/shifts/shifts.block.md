# shifts — workforce shift planner block

> **What it is.** A reusable **workforce scheduling** module with TWO views:
> **Planning** (`ShiftPlanner`) — a weekly/daily grid (workers × days) with **conflict** +
> **utilization** flags, a 3-tab **Create/Edit** sheet with a **recurrence engine** + occurrence
> preview, and a **recurring-delete** dialog; and **Compliance Monitoring** (`WorkforceCompliance`)
> — per-worker-per-day coverage derived from the SAME shifts (table + a wide detail sheet: KPI grid
> with an overall-compliance gauge + per-sub-area Visited/Not-Visited cards). No bespoke screen.

Adapted from the IIMS "Inspector Shifts" module (Tadweer Figma frames). It holds **no domain
vocabulary** — the same block schedules inspectors, drivers, technicians, guards, or cleaners.

## Anatomy
- **Planning view** — `ShiftPlanner`: toolbar (search · filter · **+ New Shift**), a **Weekly/Daily**
  toggle, a week/day navigator, a **Highlight Conflicts** switch + legend (Missing % · Conflict %).
  - *Weekly*: rows = workers (avatar · name · role · utilization badge) × 7 day columns; each cell
    stacks shift **chips** (time · task · area). A synthetic **Unassigned** row collects
    missing-assignment shifts.
  - *Daily*: rows = workers × hour columns; shifts render as proportional time bars.
  - Chips: hover ⋮ → **Edit** / **Delete**; click the body → the edit sheet.
- **Create / Edit sheet** — right `Sheet`, tabs **Basic Info · (Scheduled Plans) · Shift Info**.
  Basic = date · area · sub-area · (optional map). Shift = worker · start/end · task · notes ·
  **Recurring** (Daily/Weekly/Monthly · repeat-every · ends on/after · live **preview** table with
  per-occurrence conflict marks). Create builds one shift per occurrence; Edit's **Update** is
  disabled until a field changes.
- **Delete** — recurring shift → a `Dialog` with **This shift / This and following / All shifts**;
  non-recurring deletes immediately.

## Status semantics (the only non-blue colors)
- **Conflict** (red) — same worker, same day, overlapping times.
- **Missing assignment** (amber) — `workerId === ''`.
- **Utilization** — blue "Utilized for {h}h per week" / red "Not Utilized".

## Adapt to a workforce (the knobs — all props on `ShiftPlanner`)
1. `workers: ShiftWorker[]` — `{ id, name, roleLabel?, color? }`.
2. `areas: ShiftArea[]` — the schedulable area (`{ id, label, sub? }` → "Lot 1 · Deira" / "Route 12").
3. `subAreas?: string[]` — finer split (Sectors / Stops / Wings). Omit → no sub-area field or chip line.
4. `tasks: string[]` — the task dropdown.
5. `labels` — `{ workerSingular, workerPlural, areaSingular, subAreaSingular }`, e.g.
   `{ workerSingular:'Driver', workerPlural:'Drivers', areaSingular:'Route', subAreaSingular:'Stop' }`.
6. `now?`, `dayStartHour?`, `dayEndHour?` — reference week + daily-view hour range.

## Wire the data (CONTROLLED)
`ShiftPlanner` is controlled: pass `shifts: PlannedShift[]` and handle the callbacks — the product owns
persistence (sim engine / store / API).
- `onCreate(shifts)` — append the built shifts (recurring → one per occurrence).
- `onUpdate(id, patch)` — patch one shift.
- `onDelete(id, scope, shift)` — `scope` is `'one' | 'following' | 'all'`; use `shift.seriesId` +
  `shift.dateISO` for `following`/`all` (see the demo wrapper in `shifts.block.tsx`).

Optional render slots keep the DS core dependency-free:
- `ShiftPlanner.renderAreaMap({ area, subArea })` — a map card in Basic Info (e.g. a DS `LeafletMap`).
- `ShiftPlanner.renderPlansTab({ area })` — a "Scheduled Plans" reference tab (e.g. a DS `DataTable`); provided → 3 tabs.
- `WorkforceCompliance.renderRouteMap({ entry })` — a map card in the compliance detail sheet (e.g. a route-replay `LeafletMap`).

## Compliance Monitoring view (`WorkforceCompliance`)
Second tab of the module. Takes the SAME `workers`/`areas`/`subAreas`/`shifts`/`labels`; it derives one
coverage record per worker per day (`deriveComplianceEntries`, deterministic) — no extra data to wire.
- **Table** — Date · Worker · Area · Sub-areas Visited (`3 / 4` ratio, hover lists each ✓/✗) · Compliance
  (mini-donut) · Incidents · Time in Sectors · Area Coverage. Row click → detail sheet.
- **Detail sheet** — a KPI grid (overall-compliance `ComplianceGauge` + worker/sub-areas/timings/visited/
  incidents/time/coverage/idle), a compact **Plan Log** timeline, and per-sub-area **Visited / Not Visited**
  cards (gauge · window · time-in-area · area-coverage bar · reported-incidents table). Supply
  `renderRouteMap` to add the GPS **route-replay** map beside the Plan Log.
- Both views share one store so edits in Planning reflect in Compliance instantly (see `useShifts` in the block).

## Compose
Splice the module into the app (like any view block):
```ts
import { shiftsBlock } from '.../blocks/shifts/shifts.block';
// modules: [ ...entities, shiftsBlock, ... ]
```
`shifts.block.tsx` ships a working demo (local-state wrapper + seed with a conflict, an unassigned
shift, and a never-scheduled worker). Copy it into the app, point the handlers at your data source,
and set the labels/options for the workforce.

## Follow-ons (app-specific, not in the core block)
The **route-replay player** (a controlled Leaflet map that animates the worker along the GPS route,
draws it progressively, pops in incident pins, with a scrubber/speed player) is data/telemetry-heavy
and app-specific — build it in the app and pass it via `WorkforceCompliance.renderRouteMap`. The
scheduling + compliance cores (grid, sheet, recurrence, coverage table + detail) live here.
