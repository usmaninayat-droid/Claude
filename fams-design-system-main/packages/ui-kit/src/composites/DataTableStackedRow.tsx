import type { ReactNode } from 'react'
import { Circle } from '../icons'
import { cn } from '../lib/cn'
import { Checkbox } from '../primitives/Checkbox'
import type { DataTableColumn } from './DataTable.types'

export interface DataTableStackedRowProps<T> {
  row: T
  index: number
  /** Visible columns, same set the table layout would render. */
  columns: DataTableColumn<T>[]
  /** Which column renders on the row's own first line. Defaults to `columns[0]`. */
  identifierKey?: string
  isSelectable?: boolean
  isSelected?: boolean
  selectionMode?: 'checkbox' | 'radio'
  onToggleSelect?: (checked: boolean) => void
  onRowClick?: () => void
  hasFocusableRows?: boolean
  rowActions?: ReactNode
  renderCell: (col: DataTableColumn<T>, row: T, index: number) => ReactNode
}

/**
 * DataTableStackedRow — `DataTable`'s `layout="stacked"` row shape (a list
 * beside a map, per the stakeholder-agreed responsive rules): the identifier
 * column on its own line, every other visible column folded onto a wrapping
 * "label: value" line underneath, instead of one `<td>` per column. [internal
 * to DataTable — not part of the public component surface, same convention
 * as `DataTableGroupHeaderRow`]
 *
 * Deliberately v1-scoped — this exact shape is still under stakeholder
 * debate (see `DataTableProps.layout`'s doc comment): no per-column sort
 * control (there is no header row to click in this layout). Selection and
 * `rowActions` are unaffected — both render as their own compact slot beside
 * the stacked text, same behavior as the table layout.
 */
export function DataTableStackedRow<T>({
  row,
  index,
  columns,
  identifierKey,
  isSelectable,
  isSelected,
  selectionMode = 'checkbox',
  onToggleSelect,
  onRowClick,
  hasFocusableRows,
  rowActions,
  renderCell,
}: DataTableStackedRowProps<T>) {
  const identifierCol = (identifierKey ? columns.find((c) => c.key === identifierKey) : undefined) ?? columns[0]
  const otherCols = columns.filter((c) => c.key !== identifierCol?.key)

  return (
    /* `role="listitem"` is on the plugin's fixed non-interactive-role list,
       so it always flags this click/tabIndex/keydown trio regardless of
       whether real keyboard support is present — it is: `onKeyDown` below
       activates on Enter/Space exactly like `DataTable`'s own `<tr>` body
       row (`renderRow` in `DataTable.tsx`), gated the same way behind
       `hasFocusableRows` so a non-clickable stacked row stays out of the tab
       order. `listitem` is also the correct semantic role for a row inside
       this `role="list"` container — swapping to a native `<button>` would
       lose that list/listitem relationship for assistive tech. */
    /* eslint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */
    <div
      data-slot="data-table-stacked-row"
      data-row-id={index}
      role="listitem"
      onClick={onRowClick}
      tabIndex={onRowClick && hasFocusableRows ? 0 : undefined}
      onKeyDown={
        onRowClick && hasFocusableRows
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onRowClick()
              }
            }
          : undefined
      }
      /* eslint-enable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */
      className={cn(
        'flex items-start gap-3 border-b border-border px-3 py-3 outline-none last:border-b-0',
        onRowClick && 'cursor-pointer hover:bg-muted/40',
        onRowClick && hasFocusableRows && 'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
        isSelected && 'bg-secondary/40',
      )}
    >
      {isSelectable ? (
        // `onClick` here only stops the click from bubbling into the row's
        // own `onRowClick` (same guard `DataTable.tsx`'s checkbox `<td>`
        // uses) — the actual interactive control is the `Checkbox`/radio
        // `<button>` nested inside, not this wrapper.
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
        <span className="mt-0.5 flex shrink-0 items-center" onClick={(e) => e.stopPropagation()}>
          {selectionMode === 'radio' ? (
            <button
              type="button"
              role="radio"
              aria-checked={!!isSelected}
              aria-label="Select row"
              onClick={() => onToggleSelect?.(true)}
              className={cn(
                'flex aspect-square size-4 shrink-0 items-center justify-center rounded-full border border-border bg-input-background outline-none transition-shadow',
                'focus-visible:ring-2 focus-visible:ring-ring',
                isSelected && 'border-primary',
              )}
            >
              {isSelected ? <Circle className="size-2 fill-primary text-primary" /> : null}
            </button>
          ) : (
            <Checkbox
              checked={!!isSelected}
              onCheckedChange={(c) => onToggleSelect?.(c === true)}
              aria-label="Select row"
            />
          )}
        </span>
      ) : null}

      <div className="min-w-0 flex-1">
        {identifierCol ? (
          <div className="truncate text-sm font-medium text-foreground">
            {renderCell(identifierCol, row, index)}
          </div>
        ) : null}
        {otherCols.length > 0 ? (
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground">
            {otherCols.map((col) => (
              <span key={col.key} className="inline-flex min-w-0 items-center gap-1">
                <span className="shrink-0 font-medium text-foreground/80">
                  {typeof col.label === 'string' ? col.label : col.key}
                </span>
                <span className="min-w-0 truncate">{renderCell(col, row, index)}</span>
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {rowActions ? (
        // Same propagation guard as above — `rowActions` owns its own
        // interactivity (a menu button, typically).
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
        <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
          {rowActions}
        </div>
      ) : null}
    </div>
  )
}

DataTableStackedRow.displayName = 'DataTableStackedRow'
