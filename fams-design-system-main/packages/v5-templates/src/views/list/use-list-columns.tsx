import { useMemo, type ReactNode } from 'react'
import type { LucideIcon } from '@fams/ui-kit/icons'
import { StatusPill, type DataTableColumn, type DataTableGroupBy } from '@fams/ui-kit'
import { useDisplayName } from '@fams/v5-composer'
import type { CompiledFieldSet, Column, EntityRecord, FieldOptionContext, StatusDef } from '@fams/v5-composer'
import { EditableCell } from '../field-cell'

const EMPTY = '\u2014'

export interface UseListColumnsOptions {
  /** `deriveColumns(config)` output — the blueprint's own column set. */
  derived: Column[]
  compiled: CompiledFieldSet
  /** Cols the user may inline-edit. */
  editable: Set<string>
  onRecordChange?: (col: string, value: unknown, record: EntityRecord) => void
  fieldContext?: FieldOptionContext
  groupByCol?: string | null
  groupedColumnOrder?: string[]
  /** `statusList` keyed by stage key — drives the STATUS column's pill. */
  statusByKey: Map<string, StatusDef>
  /**
   * Drops the STATUS column entirely (SPEC Addendum "Stage tabs" — the
   * `HybridView`/`MapHybridView` stage-tabs lens: an active stage tab
   * already states the stage, so the per-row pill would be redundant). Same
   * spirit as the `groupByCol` exclusion above, but independent of grouping
   * — this hides the column outright rather than moving its value to a
   * group header. Omit/`false` to keep the column (unchanged default).
   */
  hideStatusCol?: boolean
  visibleCols?: string[]
  /** Minimum inline-size applied to EVERY derived column (UX-1/UX-5). */
  columnMinWidth?: string
  /** Per-column READ-cell overrides, keyed by column key (SPEC P0-1.1). */
  cellOverrides?: Record<string, (row: EntityRecord) => ReactNode>
}

/**
 * useListColumns / useListGroupBy — `ListView`'s column and grouping derivation.
 * [tier-2 internal]
 *
 * Extracted from `ListView` verbatim under root rule 12's decompose-on-touch
 * (this wave added the lens `h2` + count row and the file was already past its
 * accepted 469-line exception). Behaviour is unchanged: same derivation, same
 * overrides, same memo dependencies — a move, not a rewrite.
 */
export function useListColumns({
  derived,
  compiled,
  editable,
  onRecordChange,
  fieldContext,
  groupByCol,
  groupedColumnOrder,
  statusByKey,
  hideStatusCol,
  visibleCols,
  columnMinWidth,
  cellOverrides,
}: UseListColumnsOptions): DataTableColumn<EntityRecord>[] {
  return useMemo<DataTableColumn<EntityRecord>[]>(() => {
    // The actively-grouped column's value is already shown on the group
    // header row — showing it again in every row's own cells is redundant
    // (figma-spec-list.md §4: "the STATUS column is dropped from the row
    // content" when grouped by status; generalized here to ANY groupBy col).
    // `hideStatusCol` drops it for the SAME reason under stage tabs, without
    // requiring an active grouping.
    const grouped = derived.filter(
      (col) => col.accessorKey !== groupByCol && !(hideStatusCol && col.accessorKey === 'status'),
    )
    // `visibleCols` is an unconditional whitelist+order (unlike
    // `groupedColumnOrder`, which only reorders while grouped) — e.g.
    // HybridView's compact left-list showing just name + a couple of chips.
    const base = visibleCols?.length
      ? visibleCols
          .map((key) => grouped.find((col) => col.accessorKey === key))
          .filter((col): col is (typeof grouped)[number] => !!col)
      : grouped

    const cells: DataTableColumn<EntityRecord>[] = base.map((col) => {
      const isStatusCol = col.accessorKey === 'status' && statusByKey.size > 0 && !editable.has(col.accessorKey)
      // figma-spec-list.md §3 (ticketing): the ID column is PLAIN Semibold
      // text — no chip/background — while the SAME `uniqueidentifier` field
      // renders as a filled `IdChip` on the kanban card (figma-spec-kanban.md
      // §3). The field registry's `ReadAuto` renderer (shared by both
      // surfaces) always wraps it in `IdChip`, so the list table overrides
      // this ONE column's presentation directly rather than making a
      // context-blind field renderer guess which host it's in (round-1
      // design QA C3) — UNLESS the column's own listcolumns placement opts
      // back into the chip via `component: {name: "IdChip"}` (asset/
      // Collection-Point's own figma-spec-list.md §3 wants the Hash ID Chip
      // in the list, not plain text) — that explicit per-placement override
      // wins and falls through to the normal `EditableCell` render path below.
      const isIdCol =
        col.accessorKey === 'uniqueidentifier' &&
        !editable.has(col.accessorKey) &&
        col.component?.name !== 'IdChip'
      return {
        key: col.accessorKey,
        label: col.header,
        isSortable: col.sortable ?? true,
        // A minimum width for the plain-text id column (round-2 design QA:
        // "WTK-04" wrapped onto two lines) — never grows unbounded, but
        // guarantees enough room that a short id + its sort glyph never gets
        // squeezed below one line by its neighbors' own widths.
        width: isIdCol ? '6rem' : undefined,
        // Per-column floor so a wide table overflows into its own inner
        // horizontal scroll instead of crushing columns (UX-1/UX-5).
        minWidth: columnMinWidth,
        // Threaded straight from `deriveColumns` (W9 P0-1a) — TS accepts
        // this structurally, `Column.contentType`'s literal union is
        // identical to `DataTableColumn.contentType`'s, no cast needed.
        contentType: col.contentType,
        render: (row: EntityRecord) => {
          // Host-supplied cell for this column (see `cellOverrides`).
          const override = cellOverrides?.[col.accessorKey]
          if (override && !editable.has(col.accessorKey)) return override(row)
          if (isStatusCol) {
            const raw = row[col.accessorKey]
            const stage = raw != null ? statusByKey.get(String(raw)) : undefined
            return stage ? (
              // UPPERCASE via `StatusPill`'s own default CSS transform (UX
              // ruling A7, run 2026-09-05, W9/C9) — SUPERSEDES round-2 design
              // QA's `normal-case` override below, which had chased a
              // different reference (Figma's Title Case "Resolved"/
              // "Schedule") that this run's UX pass re-examined against the
              // grouped-list Figma source directly and reversed: uppercase is
              // confirmed correct there, with a mandatory rule that the
              // ACCESSIBLE NAME/DOM text stay sentence case — satisfied here
              // unchanged, since `stage.label` itself is never uppercased,
              // only the CSS `text-transform` (`StatusPill`'s base class) is.
              // Solid fill (this project's standard status-pill treatment)
              // applied uniformly across every stage. `stage.color` is the
              // DS-token hex sourced from the blueprint's `statusList[].tone`
              // (never an arbitrary value), pre-picked from a shade whose
              // white-on-fill contrast passes WCAG AA.
              <StatusPill color={stage.color} textColor={stage.textColor}>
                {stage.label}
              </StatusPill>
            ) : (
              <span className="text-body-sm text-muted-foreground">{raw != null ? String(raw) : EMPTY}</span>
            )
          }
          if (isIdCol) {
            const raw = row[col.accessorKey]
            // `whitespace-nowrap` (round-2 design QA: an id like "WTK-04"
            // wrapped onto two lines) — paired with this column's own
            // `width` below so the id never wraps AND never gets squeezed
            // by its neighbors first.
            return (
              <span className="whitespace-nowrap text-body-sm font-semibold text-foreground">
                {raw != null && raw !== '' ? String(raw) : EMPTY}
              </span>
            )
          }
          return (
            <EditableCell
              compiled={compiled}
              record={row}
              col={col.accessorKey}
              label={col.header}
              // The listcolumns placement's OWN `component` override (name +
              // props, `Column.component` from `deriveColumns`) — wins over
              // the field's master `component` for this cell's READ
              // presentation (round-1 QA C4–C6/C8's "placement override
              // ignored in the list" root cause).
              component={col.component}
              editable={editable.has(col.accessorKey)}
              onCommit={onRecordChange ? (value) => onRecordChange(col.accessorKey, value, row) : undefined}
              fieldContext={fieldContext}
            />
          )
        },
      }
    })

    // Grouped-mode-only column reordering (figma-spec-list.md §4: Ticket
    // Type before Title) — see `groupedColumnOrder`'s doc. No-op while
    // ungrouped, or when the caller doesn't supply an order.
    if (!groupByCol || !groupedColumnOrder?.length) return cells
    const byKey = new Map(cells.map((c) => [c.key, c]))
    const ordered = groupedColumnOrder.map((key) => byKey.get(key)).filter((c): c is DataTableColumn<EntityRecord> => !!c)
    const remaining = cells.filter((c) => !groupedColumnOrder.includes(c.key))
    return [...ordered, ...remaining]
  }, [derived, compiled, editable, onRecordChange, fieldContext, groupByCol, groupedColumnOrder, statusByKey, hideStatusCol, visibleCols, columnMinWidth, cellOverrides])

}

/**
 * How the ACTIVE grouping's header row presents itself, beyond the status
 * pill the renderer has always drawn. Both fields are opt-in and both default
 * to today's behaviour, so a caller that passes nothing (or omits the whole
 * argument) gets byte-identical group headers.
 */
export interface ListGroupHeaderOptions {
  /**
   * The grouped column stores REFERENCE ids (`VEH-01`), so the header's key
   * is an id and must be read through the app's display-name directory
   * before it is shown. False/omitted keeps the raw key — the behaviour every
   * non-reference grouping (status included) has always had.
   */
  resolveReferenceLabel?: boolean
  /** Leading glyph for this grouping's headers (see `resolveGroupHeaderIcon`). */
  icon?: LucideIcon
}

/** The grouped-list group key + header renderer (figma-spec-list.md §4). */
export function useListGroupBy(
  groupByCol: string | null | undefined,
  statusByKey: Map<string, StatusDef>,
  options?: ListGroupHeaderOptions,
): DataTableGroupBy<EntityRecord> | undefined {
  // `useDisplayName` is the ONE identity seam every record surface already
  // reads (`DisplayNameProvider`); with no provider it is the identity
  // function, so this hook is safe to call unconditionally and resolves to
  // the raw id exactly as before whenever the app injects no directory.
  const displayName = useDisplayName()
  const resolveReferenceLabel = options?.resolveReferenceLabel ?? false
  const Icon = options?.icon
  return useMemo<DataTableGroupBy<EntityRecord> | undefined>(() => {
    if (!groupByCol) return undefined
    return {
      getGroupKey: (row) => {
        const raw = row[groupByCol]
        return raw != null && raw !== '' ? String(raw) : EMPTY
      },
      getGroupLabel: (key) => {
        const stage = statusByKey.get(key)
        // UPPERCASE via `StatusPill`'s own default CSS transform (UX ruling
        // A7, run 2026-09-05, W9/C9) — SUPERSEDES round-1/round-2 design
        // QA's `normal-case` override (figma-spec-list.md §4, D3), which
        // this run's UX pass re-examined against the grouped-list Figma
        // source directly and reversed. See the row-level STATUS cell's own
        // comment above (`isStatusCol` branch) for the full reasoning —
        // both pills share the same fix for the same reason.
        if (stage) return (
          <StatusPill color={stage.color} textColor={stage.textColor}>
            {stage.label}
          </StatusPill>
        )
        // A non-status grouping. Figma `29535:4487`: a reference grouping's
        // header reads the referenced record's NAME with its glyph
        // ("Tanker 01" + a car), not the stored id. Both halves are opt-in
        // and independent — with neither, this is the same single `<span>`
        // of raw text it has always been.
        const label = resolveReferenceLabel && key !== EMPTY ? displayName(key) : key
        if (!Icon) return <span className="text-body-sm font-medium text-foreground">{label}</span>
        return (
          <span className="inline-flex items-center gap-1.5 text-body-sm font-medium text-foreground">
            <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
            {label}
          </span>
        )
      },
    }
  }, [groupByCol, statusByKey, resolveReferenceLabel, displayName, Icon])
}
