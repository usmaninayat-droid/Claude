# TimesheetGrid — attendance-based timesheet matrix (scheduling)

T-046 kit-lift (new — the DS had no Timesheet component). R&D basis: `Timesheet Module — R&D
and Plan.md` — this is the **attendance-based** timesheet (the reconciliation + approval layer
between Attendance and Payroll), **not** a project/billable time-tracker. Figma parity target:
`timesheet-2205-19382.png` (worker rows × day columns, actual/planned pill per cell, month + week
steppers, Monthly/Weekly/Daily toggle, right ACTUAL/PLANNED totals column).

## Component (`src/components/scheduling/timesheet-grid.tsx`)
- **TimesheetGrid** — workers × days matrix. CONTROLLED like `ShiftPlanner`: `workers` +
  `view`/`anchor` (+ `onViewChange`/`onAnchorChange`) + two pure lookup callbacks —
  `getCell(workerId, dateISO) → TimesheetCell` and `getTotals(workerId, days) → TimesheetTotals`
  — are the entire data contract. No domain vocabulary, no OT/leave/regularization business rules
  baked in; all of that is product-owned (`data/timesheet.ts` in the ifm-workforce consumer).
- **Cell rendering** — a two-tone `RatioBar` (fill % = actual/planned) + `"HH:MM / HH:MM"` text:
  - `no-shift` → muted bar + `-` (no shift scheduled — day off).
  - `scheduled` → muted bar + `- / HH:MM` (shift planned, day hasn't happened / attendance not
    yet recorded — distinct from `no-shift` so a future/out-of-window day never lies about having
    no shift).
  - `on-plan` (green) / `short` (red) — ratio-derived tone.
  - `overtimeMin > 0` → amber ring drawn around ANY of the above (OT must stand out — R&D law).
  - `exceptionLabel` set → a small amber flag marker + native `title` tooltip (missing punch,
    absence, early-out…).
  - `regularized: true` → a small primary-tint edit marker (audit-visible correction).
  - `status: 'leave'` → plain text (`label`, e.g. "Sick Leave"), no pill at all — matches the
    Figma reference exactly.
- **Views** — `daily` (1 day column, richer cell showing `clockIn`/`clockOut` if provided) /
  `weekly` (7 days, the Figma default) / `monthly` (every day in the anchor's month — same table,
  horizontally scrollable). Navigation is TWO steppers exactly like the Figma: a month stepper
  (always) + a week/day stepper (weekly/daily only) — bounded by optional `minDateISO`/
  `maxDateISO` (a consumer's underlying data window, e.g. "today ± 6 weeks").
- **Toolbar** (component-owned, no shell chrome — same law as `ShiftPlanner`): row 1 = search
  (own state, filters rows by name/role) + `filterSlot` (consumer's own site-scoping control,
  identical slot pattern to `ShiftPlanner.filterSlot`) + a FUNCTIONAL role/tag filter popover +
  `statusSlot` (consumer's lifecycle control) + `onExport` button. Row 2 = view toggle + stepper(s)
  + a legend + an optional `periodFooter` (Regular/OT/leave split chips).
- **Interaction** — every row is `cursor-pointer` + hover-tinted (row click → `onRowClick`); each
  cell is independently clickable (`onCellClick`, event-stopped so it doesn't also fire the row
  handler) — the product wires these to a worker/day drill sheet.

## Laws
- Token-only (`--status-success`/`-error`/`-warning`, `--primary`, `--border`/`--muted`). No hex.
- Config-driven, domain-agnostic — no "vehicle"/"fleet" vocabulary; `labels.workerSingular/Plural`
  overrides the default "Worker(s)".
- Search field = the FAMS composition (`SearchSm` icon + `pl-8` + "Search anything here").

## Consumer (ifm-workforce, T-046)
`src/modules/timesheets.tsx` — one `dashboard`-type module ("Timesheet & Reports"), tab 1 (default)
= `TimesheetGrid` + a worker/day drill sheet + an Exceptions tab + a Regularize sheet + a compact
Draft→Submitted→Approved lifecycle control (`statusSlot`); tab 2 = the existing Reports catalog
(system reports + "+ New Report" builder), unchanged in spirit, fixed per the Reports defect list.
Cell/period derivations live in `src/data/timesheet.ts` (attendance + shifts + leave → payable
hours; regularization overlay + period lifecycle in the store's generic `custom` bucket).
