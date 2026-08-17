# DataTable — behavioral spec

## Source of truth

- `src/components/data-display/data-table.tsx`
- Ticket: T-087 (client: "don't add paginations like this; list/table
  everything should be scrollable, lazy load") — added `scrollMode="lazy"`,
  the windowed-scroll replacement for hand-rolled Prev/Next page controls.

## Purpose

Generic sortable / selectable / groupable table over `TableCell`. Used by
every entity/pipeline `list`/`hybrid` view (via `ListView`/`PipelineListView`/
`HybridView` in `app-shell/view-renderers.tsx`) and directly by product
modules that need full control over a table's content.

## Props (core, unchanged)

```ts
interface DataTableProps<T = any> {
  columns: DataTableColumn<T>[];
  data: T[];
  getRowId?: (row: T, index: number) => string;
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string | undefined;
  emptyState?: React.ReactNode;
  loading?: boolean;
  stickyHeader?: boolean;      // default true
  manageColumns?: boolean;     // "Columns" show/hide popover
  groupBy?: { get: (row: T) => string; label?: (key: string) => React.ReactNode };
}
```

Sort is internal state (click a `sortable` column header); selection is
controlled (`selectedIds`/`onSelectionChange`). `groupBy` partitions the
(already sorted) rows into collapsible sections, each collapsed state kept in
local state — first-seen key order.

### `stickyHeader` MUST be opaque (T-087 client fix)

The `<thead>` background is `bg-muted` (a solid, fully-opaque token) — never a
tinted/translucent variant like `bg-muted/40`. A sticky header with an alpha
background lets scrolled rows visibly bleed through it (client-reported on
Skills Matrix: a row's text showing through the "EMPLOYEE" header column). This
matters for EVERY table now that `scrollMode="lazy"` makes every table its own
scroll region, not just tables that happen to overflow a page. If a future
change touches the header's background, keep it a solid color.

## `scrollMode="lazy"` — windowed scroll (T-087)

```ts
interface DataTableProps<T = any> {
  // …core props above, plus:
  scrollMode?: 'lazy';
  rowHeightPx?: number;    // default 44, self-measures from the first row
  chunkSize?: number;      // default 100 — rows revealed per scroll-near-bottom batch
  windowSize?: number;     // default 300 — hard cap on rows mounted at once
  onLazyProgress?: (info: { loadedCount: number; total: number }) => void;
}
```

### What it replaces

Every hand-rolled `PAGE_SIZE` + `page` state + Prev/Next footer (Workforce
list, Attendance Logs, Skills Matrix, the payroll Worksheet, zone-detail's
Workforces/Attendance tabs, …) is a **DOM-size mitigation**, not a real
pagination need — there is no server page boundary, the full filtered array is
already in memory. `scrollMode="lazy"` gets the same DOM bound (the T-057
finding: ~8,040 unpaginated rows ≈ 207k DOM nodes / ~450MB heap) via
windowing instead of clicking through pages.

### Design (chunk 100 / window 300 / row height 44px default)

1. **Reveal frontier** (`loadedCount`) — starts at `min(total, chunkSize)`
   and grows in `chunkSize` increments whenever an internal bottom sentinel
   `<tr>` (rendered right after the currently-mounted rows, once the window's
   end reaches the frontier) intersects the scroll container (`rootMargin:
   '600px 0px'` — usually fires before the user ever sees it, i.e. "seamless"
   loading; the sentinel's "Loading more…" text is the visible fallback for a
   fast/erratic scroll).
2. **Mount window** (`range`) — computed from the CURRENT scroll position
   (`scrollTop / rowHeightPx`, ± one viewport of overscan), clamped to
   `[0, loadedCount)` and hard-capped to `windowSize` rows. This is scroll-
   position-based, not a monotonic tail — scrolling back UP re-mounts
   earlier, already-revealed rows (no "evicted forever" state). Only rows
   inside `range` are ever in the DOM; everything else is two spacer `<tr>`s
   (`height: N * rowHeightPx`) that preserve true scrollbar geometry against
   the FULL row count (`sortedData.length`), not just what's loaded so far.
3. **Scroll container = the table's own region.** `scrollMode="lazy"` makes
   the table's internal `overflow-auto` wrapper (already there for the
   sticky header) the actual scroll boundary — pass `className="h-full"` (or
   similar) to `DataTable` and make its own parent chain a bounded
   flex/height context (drop any wrapping `overflow-auto` div the consumer
   used to add for a paginated table; nesting two scroll regions double-
   scrolls). The built-in `ListView`/`PipelineListView`/`HybridView`
   renderers do this automatically via `EntityModuleData.listScrollMode` /
   `PipelineModuleData.listScrollMode`.
4. **Row height** — `rowHeightPx` if given, else measured off the actual
   first rendered row (`getBoundingClientRect().height`) and self-corrected
   once (epsilon-guarded so it doesn't loop). Pass it explicitly if row
   height genuinely varies row-to-row (this component assumes uniform rows
   for the spacer math, like virtually every virtualization approach).
5. **Honest count** — DataTable itself renders no footer text (unchanged);
   use `onLazyProgress` to drive a truthful "Showing 1–{loadedCount} of
   {total}" label, or the simpler always-true "{total} records · scroll for
   more" if you don't need the precise loaded count.

### What survives windowing

A row unmounting/remounting is safe for state that lives ABOVE the table
(lifted into the consumer, e.g. an `overrides` map keyed by row id, read via
`value={l[field]}` on a controlled input) — the row re-renders from the same
source data when it re-mounts. It is NOT safe for state stored INSIDE a
custom `cell` renderer's own `useState` (that state is lost on unmount) — any
consumer whose cells hold uncommitted local edits (the payroll Worksheet)
must lift that state to the consumer, not the row.

### Unsupported combination

`scrollMode="lazy"` is a no-op when `groupBy` is also set (falls back to full
render) — group each row set with its own bounded per-group window/page
instead (see `workforce.tsx`'s `GroupedWorkforceList`, which uses `scrollMode`
per expanded group rather than on the un-grouped `DataTable.groupBy` path).

### Backward compatibility

Omitting `scrollMode` is byte-identical to the pre-T-087 component — every
existing consumer is unaffected. `EntityModuleData.listScrollMode` /
`PipelineModuleData.listScrollMode` are optional config flags the built-in
renderers thread straight into `DataTable`'s `scrollMode`, so a config-only
product module (no custom `render`) can opt in with a one-line data change.

## Hard constraints

1. Never reintroduce a `PAGE_SIZE`/`page`-state/Prev-Next footer over a
   `DataTable` — reach for `scrollMode="lazy"` (or `listScrollMode` on the
   module data) instead.
2. Don't combine `scrollMode="lazy"` with a wrapping `overflow-auto` div —
   pick ONE scroll container (the table's own).
3. Selection (`selectedIds`/`allSelected`) always operates over the FULL
   `data` array, never the lazy window — unaffected by scrollMode.

## Anti-patterns

- ❌ A local `useState` inside a `cell` renderer for an editable field when
  the table might run in `scrollMode="lazy"` — lift it to the consumer.
- ❌ Assuming `rowHeightPx` needs to be pixel-perfect — it only has to be
  close; the self-measurement corrects it after the first paint.
- ❌ Wrapping a lazy `DataTable` in another scrollable div "just in case".

## Cross-references

- Used by: `app-shell/view-renderers.tsx` (`ListView`, `PipelineListView`,
  `HybridView`), and directly by `workforce.tsx`, `attendance.tsx`,
  `skills-matrix.tsx`, `zone-detail.tsx`, `payroll/worksheet.tsx` (ifm-workforce).
- Related: `ColumnConfig` (manage-columns popover), `TableCell`.
