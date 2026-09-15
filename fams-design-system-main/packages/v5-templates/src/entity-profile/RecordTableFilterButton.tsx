import { useMemo } from 'react'
import { Filter } from '@fams/ui-kit/icons'
import {
  Checkbox,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@fams/ui-kit'
import { humanizeEnumValue } from '@fams/v5-composer'
import type { RecordTableColumn } from './RecordTable'

/**
 * RecordTableFilterButton — the toolbar Filter icon-button + its popover.
 * Extracted from `RecordTable.tsx` so the shared table component stays under
 * the ~300-line file budget (root `CLAUDE.md` rule 12), and so the filter
 * behaviour has one place worth reading.
 *
 * What it filters — the row array `RecordTable` is already about to render —
 * makes this a self-contained UI-only interaction, the same category as the
 * table's own `search` toolbar (state-agnostic body of a tier-2 pattern,
 * Rule 8 of the constitution: no fetch, no global store; the caller owns
 * the row source).
 *
 * How it's presented — one checkbox group per column with a bounded set of
 * distinct values in the CURRENT rows. `statusPill` columns are always
 * eligible (they name enums by definition); text-shaped columns
 * (`text`/`idChip`/`avatar`) are eligible only when their distinct-value
 * count is small (≤ 12) — anything longer belongs in the search box, not
 * behind a checkbox list. `datetime`/`number`/`progress`/`photo` columns
 * are never presented as filterable here (a checkbox per timestamp/measure
 * is worse than the search box; a range picker is out of scope for a
 * detail-tab filter). A tab with no eligible column shows a friendly
 * empty-state message instead of a blank popover.
 */
export interface RecordTableFilterButtonProps {
  columns: RecordTableColumn[]
  /** Currently-visible rows (already narrowed by search but NOT by these filters), used only to derive the distinct value set per column. */
  rows: Record<string, unknown>[]
  /** Active selections keyed by column key: an entry present with a non-empty array narrows that column to those values; an absent entry (or empty array) means "all". */
  value: Record<string, string[]>
  onChange: (next: Record<string, string[]>) => void
  /** `statusPill` label lookup, shared with `RecordTable`'s cell render. */
  statusLabels?: Record<string, string>
}

const MAX_DISTINCT = 12

function distinctValues(rows: Record<string, unknown>[], key: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const row of rows) {
    const raw = row[key]
    if (raw == null || raw === '') continue
    const text = String(raw)
    if (seen.has(text)) continue
    seen.add(text)
    out.push(text)
    if (out.length > MAX_DISTINCT) return out
  }
  return out
}

function labelFor(value: string, columnType: RecordTableColumn['type'], statusLabels?: Record<string, string>): string {
  if (columnType === 'statusPill') return statusLabels?.[value] ?? humanizeEnumValue(value)
  return value
}

function eligibleColumns(columns: RecordTableColumn[], rows: Record<string, unknown>[]) {
  return columns.flatMap((column) => {
    if (column.type === 'statusPill') {
      const values = distinctValues(rows, column.key)
      return values.length ? [{ column, values }] : []
    }
    if (column.type === 'text' || column.type === 'idChip' || column.type === 'avatar') {
      const values = distinctValues(rows, column.key)
      if (values.length === 0 || values.length > MAX_DISTINCT) return []
      return [{ column, values }]
    }
    return []
  })
}

export function RecordTableFilterButton({
  columns,
  rows,
  value,
  onChange,
  statusLabels,
}: RecordTableFilterButtonProps) {
  const groups = useMemo(() => eligibleColumns(columns, rows), [columns, rows])
  const activeCount = useMemo(
    () => Object.values(value).reduce((acc, list) => acc + (list.length > 0 ? 1 : 0), 0),
    [value],
  )

  const toggle = (key: string, entry: string) => {
    const current = value[key] ?? []
    const next = current.includes(entry) ? current.filter((v) => v !== entry) : [...current, entry]
    const merged = { ...value, [key]: next }
    if (next.length === 0) delete merged[key]
    onChange(merged)
  }

  const clearAll = () => onChange({})

  return (
    <Popover>
      <PopoverTrigger
        aria-label="Filter"
        className="relative grid size-10 shrink-0 place-items-center rounded-sm border border-border text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-muted data-[state=open]:text-foreground"
      >
        <Filter className="size-4" aria-hidden="true" />
        {activeCount > 0 ? (
          <span
            data-slot="filter-active-badge"
            aria-hidden="true"
            className="absolute -end-1 -top-1 grid size-4 place-items-center rounded-full bg-primary text-[10px] font-semibold leading-none text-primary-foreground"
          >
            {activeCount}
          </span>
        ) : null}
      </PopoverTrigger>
      <PopoverContent align="end" aria-label="Filter records" className="w-72 p-0">
        {groups.length === 0 ? (
          <p className="p-4 text-body-sm text-muted-foreground">No filters available for this view.</p>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <span className="text-body-sm font-semibold text-foreground">Filter</span>
              <button
                type="button"
                onClick={clearAll}
                disabled={activeCount === 0}
                className="text-body-sm font-medium text-primary outline-none hover:underline disabled:cursor-default disabled:text-muted-foreground disabled:no-underline focus-visible:underline"
              >
                Clear all
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto p-2">
              {groups.map(({ column, values }) => (
                <fieldset key={column.key} className="mb-2 last:mb-0">
                  <legend className="px-2 pb-1 text-caption font-semibold uppercase tracking-wide text-muted-foreground">
                    {column.label}
                  </legend>
                  <div className="flex flex-col">
                    {values.map((entry) => {
                      const selected = (value[column.key] ?? []).includes(entry)
                      return (
                        <label
                          key={entry}
                          className="flex cursor-pointer items-center gap-2 rounded-xs px-2 py-1.5 text-body-sm text-foreground hover:bg-muted"
                        >
                          <Checkbox checked={selected} onCheckedChange={() => toggle(column.key, entry)} />
                          <span className="truncate">{labelFor(entry, column.type, statusLabels)}</span>
                        </label>
                      )
                    })}
                  </div>
                </fieldset>
              ))}
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}

RecordTableFilterButton.displayName = 'RecordTableFilterButton'

/** Apply the filter selections to a row array — kept next to the UI it drives. */
export function applyRecordTableFilters(
  rows: Record<string, unknown>[],
  filters: Record<string, string[]>,
): Record<string, unknown>[] {
  const entries = Object.entries(filters).filter(([, list]) => list.length > 0)
  if (entries.length === 0) return rows
  return rows.filter((row) =>
    entries.every(([key, allowed]) => {
      const raw = row[key]
      if (raw == null || raw === '') return false
      return allowed.includes(String(raw))
    }),
  )
}
