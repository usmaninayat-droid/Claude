import type { ReactNode } from 'react'
import {
  getComponentRenderer,
  type Cell,
  type CompiledFieldSet,
  type EntityRecord,
  type FieldDescriptor,
} from '@fams/v5-composer'
import { renderCellValue } from '../../entity-profile/render-cell-value'
import type { CellRow } from './kanban-model'

/**
 * kanban-card-cells.tsx — cell rendering for `KanbanCardView`. [tier-2 internal]
 *
 * Extracted per root rule 12's decompose-on-touch when wave A6 added the
 * card's `leading` slot. Behaviour is unchanged — this is a move, not a
 * rewrite.
 */

/**
 * Renders one card cell, honoring the KANBAN PLACEMENT's own `component`
 * override (`Cell.component` — `deriveCard`'s per-placement `{name, props}`,
 * e.g. the "Reopened" flag's `{name:"StatusPill", props:{color:"#f79009",
 * icon:"refresh"}}`, figma-spec-kanban.md §6) FIRST, with its authored props
 * intact.
 *
 * `renderCellValue` (the shared entity-profile cell path) only resolves a
 * component override off the COMPILED field descriptor — i.e. the
 * systemcolumn's own default `component`, not this specific placement's.
 * For a field with no default component of its own (the common case: the
 * "Reopened" flag column carries no systemcolumn-level component, only the
 * kanbanCard placement does), that path silently drops the placement's
 * override entirely and falls back to the field's raw TYPE renderer — which
 * is why the "Reopened" badge rendered as plain unstyled text instead of
 * `ui-kit`'s filled `StatusPill`. This wrapper checks the placement override
 * first and falls back to `renderCellValue`'s existing resolution otherwise,
 * so every other cell keeps its current behavior unchanged.
 */
export function renderCardCell(compiled: CompiledFieldSet | null, record: EntityRecord, cell: Cell): ReactNode {
  if (cell.component) {
    const Read = getComponentRenderer(cell.component.name)
    if (Read) {
      const base =
        compiled?.byCol[cell.col] ??
        ({
          id: `fld_${cell.col}`,
          col: cell.col,
          label: cell.label,
          type: 'SmallText',
          required: false,
          multiple: false,
        } satisfies FieldDescriptor)
      const descriptor: FieldDescriptor = { ...base, component: cell.component }
      return <Read descriptor={descriptor} value={cell.value} record={record} />
    }
  }
  return renderCellValue(compiled, record, cell)
}

/** One grouped cell-row rendered as a flex line: `left` cells first, then `right` cells with `ms-auto` pinning the first right cell to the far end (mirrors the ticketing blueprint's header/body/footer `pos` convention). */
export function CellRowLine({
  row,
  compiled,
  record,
  className,
}: {
  row: CellRow
  compiled: CompiledFieldSet | null
  record: EntityRecord
  className: string
}): ReactNode {
  if (row.left.length === 0 && row.right.length === 0) return null
  return (
    <div className={className}>
      {row.left.map((cell) => (
        <span key={cell.col} className="inline-flex items-center gap-1">
          {renderCardCell(compiled, record, cell)}
        </span>
      ))}
      {row.right.map((cell, i) => (
        <span key={cell.col} className={i === 0 ? 'ms-auto inline-flex items-center gap-1' : 'inline-flex items-center gap-1'}>
          {renderCardCell(compiled, record, cell)}
        </span>
      ))}
    </div>
  )
}

