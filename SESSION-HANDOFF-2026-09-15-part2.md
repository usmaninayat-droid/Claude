# Session handoff — IWMP demo work (2026-09-15, part 2)

Continues `SESSION-HANDOFF-2026-09-15.md`. Everything below is **committed** on
`main` (39 commits between `f1170d9` and `cfa503a`). Not pushed.

## How to run

```bash
cd fams-v5-demo-environment-main && pnpm --filter app dev    # → http://localhost:6300
```

Reach modules at `http://localhost:6300/<module>?tenant=iwmp&persona=u_admin`.
After any blueprint change: `pnpm demo resolve iwmp && pnpm demo check` (4
pre-existing inert seed warnings expected).

## What this session changed — themed summary

### Design-system chrome (applies to every module across every tenant)
- **Toolbar → content gap tightened** — `ModuleViewShell` body inset changed
  from `py-6` to `pt-0 pb-6`; `ListView` count-row-to-first-content gap
  `gap-3 → gap-1`. Filters row now flows right into the summary tiles /
  table. (`ba08bcd`)
- **Column expand toggle removed globally** — `ExpandColumnToggle` in
  `DataTableColumnControls` was a hover Maximize icon on every column
  header; deleted. Only the drag/keyboard resize handle remains. (`b0607e8`)
- **KpiTile summary rows are equal-width** on the list view AND on the profile
  RecordTable — swapped `flex-row wrap` for `grid auto-fit minmax(13rem,
  1fr)`, so a wrapped 4th tile is the same width as the row above.
  (`ca41fed`)
- **Summary tile → table breathing room** restored — `list-view-summary`
  gains `mb-3` after the earlier gap-tighten swallowed the vertical
  spacing between KPIs and the table. (`3c6a097`)
- **Record-count row collapses to zero height** when empty — `min-h-5`
  reservation dropped, `empty:hidden` added; the row still mounts so
  `aria-live` narrowing announcements fire. (`a931b64`)
- **Module body is white; grey only on the top bar** — `ModuleViewShell`
  root gains `bg-card`; the filters row and alert-bar wrapper drop their
  own `bg-background`. (`ea0d2c6`)
- **List table hugs its rows** — `DataTable` no longer stretches to fill
  the shell height (`min-h-0 flex-1` → `min-h-0`); long lists still
  scroll through the shell body's `overflow-auto`. (`a60d233`)
- **Entity-profile tag chips match Figma** node 7112:8289 — borderless,
  soft `-scale-100/-scale-50` bg, WCAG-safe `-text` foreground; the
  shared Badge component is untouched, so status pills / filter chips /
  everywhere else keep their bordered look. (`907f103`)
- **Perfect-square profile hero + module-icon identity** — the identity
  panel tile is `aspect-square w-full` (was `h-[12.5rem]`); the
  placeholder icon falls back to the module's own `uiConfig.icon`
  through the DS icon registry; the entity record-tab chrome icon reads
  the same seam. Also added the new `stand` glyph to the DS icon
  registry for Training's mark. (`b0607e8`)
- **List-summary icon resolver falls back to the full DS icon
  registry** — the same recipe the dashboard-widget shell uses; a
  blueprint's icon name isn't limited to the curated 8-entry map any
  more. (`8ab8cb2`)

### Composer & blueprint contract (new authoring surface)
- `uiConfig.creation.disabled?: boolean` — hides the module-header "New
  X" CTA AND every inline `onCreateFromSearch` create affordance. Types
  + blueprint TS + JSON schema. (`fbb016a`)
- `uiConfig.alertBar?: {...}` — pinned soft-tinted strip above the
  filters row; on click opens a per-record conflict-resolve side sheet.
  See the "Attendance dispatching" section below for the full delta.
  (`60b2f8f`)

### Attendance module — dispatching flow
End-to-end reworked to mirror the shift-rostering "Reassign Route" +
"Manual" side sheets.

- **Row-kebab menu (`DispatchAction`)** replaces the inline "Dispatch
  Reliever" button. Kebab renders on EVERY row now (not just gated);
  Present/Late rows show `[View Profile]`, Absent rows show `[View
  Profile, Dispatch Reliever]`. View Profile synthesises a click on the
  row's `<tr>` so the caller's own `onRowClick` opens the profile drawer.
  (`3c6a097`, `2d1a0d6`, `855cd2e`, `0bdc491`, `ae96d25`, `f63b665`)
- **Dispatch Reliever side sheet** — Suggested view mirrors shift-
  rostering: swap card with `R#{uid} · {plan}` header + red-outlined
  `EMPLOYEE ABSENT` tag; strikethrough outbound row + amber Absent pill
  + red-dot "Originally Assigned"; down-arrow circle; suggested reliever
  row + green "Available for Shift" pill + blue-dot "Suggested
  Replacement"; footer "Replace Manually" text + "Dispatch Reliever"
  primary. Replace Manually flips to a search + selectable list within
  the same sheet. (`ca875d8`, `afe0d2e`)
- **Alert bar `uiConfig.alertBar`** — the "5 employees are absent
  today…" strip pinned above the Attendance filters row. Click opens
  the "Resolve Attendance Coverage" side sheet (no KPI row, per user
  ask) with a list of per-record conflict cards. Each card has the
  swap-card layout above; footer "View Plan" ghost + "Replace Manually"
  text + green "Approve Replacement" primary. "Approve All Suggestions"
  in the section header applies every pending card in sequence.
  Approve animates each card out (`max-height + opacity + translateX
  28px + margin-bottom` over 270ms) — matches shift-rostering's
  `applyMove` leave. Replace Manually opens a stacked side sheet on
  top with the DRIVER / STATUS table (blue "Suggested" chip on the
  record's own suggestion, amber "Overtime" pill authored via
  `alertBar.suggestions[].status`), View Plan ghost + Assign
  Replacement primary. Assign closes the manual sheet and triggers
  the card leave in the underlying sheet. (`60b2f8f`, `3d56246`,
  `e9982e3`, `3c69938`, `6c4f7d2`, `4f74523`)
- **Chrome** — external circular close 48px on both sheets (matches
  shift-rostering `.rp-close`), header tag reads as a status pill not a
  button (`bg-error-100 text-error-700`, no border). (`afe0d2e`)
- **Attendance blueprint** — icons on filter facets (`status`,
  `calendar`, `map-pin`); status pill hexes set to the -500 trio
  (`#22C882` PRESENT, `#F79009` LATE, `#F04438` ABSENT); creation CTA
  disabled; alert bar authored with `filter: status equals Absent`,
  role-aware toast copy. (`907f537`, `76bb4ec`, `855cd2e`, `60b2f8f`)

### Training module (list)
- Module icon is the new `stand` (projector) glyph in the nav rail,
  the profile identity-panel placeholder, AND the entity record-tab
  chrome. (`f4cfb5e`)
- `Category` and `Licence Class Required` render as plain text
  (`TextView`) in the profile details block and Details tab — matches
  the list columns' earlier override. (`1f89df5`)
- Overview KPI-tile labels re-worded so each names its subject:
  Certified Workers / Expiring Soon / Certificates Expired / Blocked
  from Roster. (`6c8c5a0`)
- Creation CTA disabled via the new `uiConfig.creation.disabled` flag.
  (`fbb016a`)

### RecordTable — functional Filter popover
- The toolbar's Filter icon-button was decorative. Now opens a Popover
  with one checkbox group per column that has a bounded (≤ 12) distinct
  set of values in the current rows; `statusPill` columns are always
  eligible. "Clear all" + active-count badge on the trigger. Extracted
  into `RecordTableFilterButton.tsx` so `RecordTable.tsx` stays under
  the file budget. (`ee15bfd`)
- Also gained two generic passthroughs to DataTable: `trailingAction`
  (pencil header) and `rowActions` (per-row control). Additive.
  (`124d1ed`)

### Workforce profile — Training tab (Figma 6557:19850)
New tier-2 profile-tab component `ComplianceTable` in v5-templates,
registered by name in the tab-component registry. Layout:
1. Alert band while any row sits in a critical bucket.
2. `ComplianceGauge` + summary card (four tone-coloured stats + stacked
   bar).
3. "Required for Role – {role}" section label.
4. `RecordTable` over the same rows with per-row `⋮` kebab.

Every module-specific name is field-key indirection on
`component.props` (`field`, `statusKey`, `buckets`, `codeKey`,
`nameKey`, `roleField`, `sectionLabel`, `criticalBuckets`, `alert`,
`suggestions`, …) — rule 10, any module with a lifecycle status can
name this tab. `nameKey` + `{names}` template var landed so the alert
prints readable training names ("Waste Collection Safety") not codes
("WCS"). Workforce delta authors:
- 8 columns: TRAINING NAME · ID · CLASSIFICATION · ELIGIBLE FOR ·
  GRACE PERIOD · COMPLETED · EXPIRES · STATUS.
- Buckets: `valid`/`expiring`/`expired`/`blocked` → seed statuses (4th
  labelled **Blocked**, not "Missing" — matches scope §5.1 vocabulary).
- Score/summary labels use "Competency" (scope §5.1 §TRN-06/TRN-07), not
  "Compliance".
- Alert (short form, scope-vocabulary): "{count} required training{s}
  expired beyond grace — renew {names} to restore assignment."
- No trailing pencil header, no "All Course" category filter (both
  props still exist on ComplianceTable for future callers).

Seed additions: `eligibleFor` per training code (from scope's vehicle-
category matrix), `gracePeriod` 90 days on every training record
(scope BR-12). (`124d1ed`, `4154951`, `96bae12`, `edd36f9`, `95c613f`,
`c2863cc`, `de2fbe4`, `ce038a8`)

### Workforce profile — Attendance Log tab (Figma 6545:15223)
New tier-2 OverviewWidgets kind `attendanceHeatmap`. Weekly-grid
heatmap over one of the record's own array fields; ChartCard header
with title + icon and "Showing 1-30 out of N" pagination in the
actions slot; legend row above the grid; 7-row (SUN→SAT) × N-week
grid; each cell painted by its status token. All strings authored
on the widget config (`statuses[]`, `paginationTemplate`,
`windowDays`, …). State-agnostic. Seed: each workforce record's
`attendanceLog` extended to 30 days over Sep 2025 with a `status`
field per entry (Present / Late / Overtime / Absent / Leave). Delta
inserts the widget after the filterBar. (`cfa503a`)

## What's uncommitted / untracked

- `assets/tadweer-driver-home/standby-anim.gif.zip` — the same stray
  2 MB archive from the previous handoff. Not this session; leave it.

Everything else is on `main`.

## Reasonable next steps (not started)

- **Design-system release** — DS `main` still holds 30+ session's worth
  of committed changes; `../fams-design-system/CLAUDE.md` says the flow
  is a branch off `design-master` + `node scripts/release-version.mjs
  patch --publish`. This repo has NO `design-master` branch (single
  git repo, both packages linked in the workspace, per the earlier
  handoff), so the ceremony is informational — but a `patch --publish`
  would be needed for any consumer running in registry mode.
- **Push** — nothing pushed to `origin` today. The wrapper repo remote
  is `usmaninayat-droid/Claude`.
- **Contract Management module** — the untouched Figma polish items
  from the earlier handoff (real map imagery on the zone step,
  custom empty-state illustrations, end-date field icon nuance) still
  stand.
- **Compliance/Competency alert copy on other tenants** — only IWMP's
  workforce delta is wired; `ComplianceTable` is generic and ready
  for other modules (e.g. any module with a `licence` / `certificate`
  register).
- **Compliance table category filter** — the "All Course" trigger is
  removed from the workforce Training tab but the `categoryKey`
  prop stays on `ComplianceTable`; a caller who wants it back adds
  a one-line JSON prop.

## Rebuild notes

Both consumer packages (`@fams/v5-templates`, `@fams/v5-composer`) are
consumed in link mode by the demo. Any DS change from here needs the
matching package rebuilt (`pnpm --filter <pkg> build`) before the
`:6300` server picks it up; `pnpm demo resolve iwmp` + `pnpm demo check`
after any blueprint or seed edit.

## Where to look

- **Alert bar** — `packages/v5-composer/src/fields/ModuleAlertBar.tsx`,
  types in `types.ts` / `blueprint-schema.ts` / `schemas/
  EntityModuleConfig.schema.json`, wired through
  `packages/v5-templates/src/views/ModuleView.tsx` +
  `ModuleViewShell.tsx` (`alertBar` slot).
- **Dispatch kebab + sheet** — `packages/v5-composer/src/fields/
  DispatchActionMenu.tsx`, registered in `renderers.tsx` as
  `ReadDispatchAction`.
- **Compliance/Competency tab** — `packages/v5-templates/src/entity-
  profile/ComplianceTable.tsx`, adapter registered in
  `EntityProfile.tsx`.
- **Attendance heatmap** — `packages/v5-templates/src/entity-profile/
  AttendanceHeatmapWidget.tsx`, wired into
  `OverviewWidgets.tsx` + `.types.ts`.
- **Attendance blueprint** — `fams-v5-demo-environment-main/tenants/
  iwmp/modules/attendance/blueprint.json`.
- **Workforce Training + Attendance-Log tab deltas** —
  `tenants/iwmp/deltas/workforce.ops.json` (ops
  `op_iwmp_workforce_trainings_tab` and `op_iwmp_workforce_attendance_
  tab`).
