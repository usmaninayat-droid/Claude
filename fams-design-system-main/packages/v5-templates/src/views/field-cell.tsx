import { useState, type ReactNode } from 'react'
import {
  getCellEditor,
  getComponentRenderer,
  getReadRenderer,
  type CompiledFieldSet,
  type EntityRecord,
  type FieldDescriptor,
  type FieldOptionContext,
} from '@fams/v5-composer'
import { cn } from '../lib/cn'

/**
 * Shared field-cell rendering for the view templates. [tier-2 internal]
 *
 * One place that turns a compiled field descriptor + a record value into a
 * read presentation (via the FieldRegistry read renderer) or an inline editor
 * (via `getCellEditor`, task 2.2). `ListView` uses `EditableCell`; `TaskDetail`
 * uses `renderReadCell`.
 *
 * Resolution order is PLACEMENT wins, then MASTER, then type default:
 * 1. The caller's own placement override (`placementComponent` — a
 *    `listcolumns[].component`/`profile.details[].component`/section-field
 *    `component`, name AND props) — the SAME per-surface override
 *    `KanbanCardView`'s `renderCardCell` already honors for kanbanCard
 *    placements (figma-spec-kanban.md §6's "Reopened" badge) and
 *    `render-cell-value.tsx`'s `renderCellValue` now honors for
 *    detail/section cells. A placement can style the SAME field differently
 *    per surface (e.g. Priority Level: a light pill in Kanban/List's
 *    systemcolumn-level default, a bare flag+text via a List-specific
 *    listcolumns override) without touching the field's master definition.
 * 2. The field's authored master `component` (`descriptor.component`, the
 *    systemcolumn's own default override) — used when the placement carries
 *    none of its own.
 * 3. The type-keyed registry (`getReadRenderer(descriptor.type)`) — the
 *    plain type-based fallback every field has.
 *
 * This file used to only ever consult (2)/(3) — a listcolumns/profile.details
 * placement's OWN `component` (distinct from the field's master one) was
 * silently dropped on both the list and detail surfaces, the root cause
 * documented in `qa/deviations.md`'s FIX-3 entry ("per-placement component
 * overrides are silently ignored on every read path").
 *
 * Exported (module-internal API, not part of the package's public barrel) so
 * `../entity-profile/render-cell-value.tsx`'s `renderCellValue` shares this
 * SAME resolution order instead of re-implementing it — the two used to carry
 * parallel copies of this exact lookup, a duplication finding from the
 * 2026-08-13 code review.
 */
export function resolveReadRenderer(
  descriptor: FieldDescriptor,
  placementComponent?: { name: string; props?: Record<string, unknown> },
) {
  if (placementComponent) {
    const Placement = getComponentRenderer(placementComponent.name)
    if (Placement) return Placement
  }
  return (descriptor.component?.name ? getComponentRenderer(descriptor.component.name) : undefined) ?? getReadRenderer(descriptor.type)
}

/**
 * Layers `placementComponent` (a placement's own `component` override) over
 * `descriptor` so a resolved renderer's `descriptor.component.props` read
 * (e.g. `ReadPersonView`'s `tone`, `ReadStatusPill`'s `color`/`icon`) sees the
 * PLACEMENT's props, not the master field's — same merge `KanbanCardView`'s
 * `renderCardCell` already does for kanbanCard placements. Exported for the
 * same cross-file reuse reason as `resolveReadRenderer` above.
 */
export function withPlacementComponent(
  descriptor: FieldDescriptor,
  placementComponent?: { name: string; props?: Record<string, unknown> },
): FieldDescriptor {
  return placementComponent ? { ...descriptor, component: placementComponent } : descriptor
}

/** Resolve a descriptor for `col`, falling back to a plain text descriptor. */
export function descriptorFor(compiled: CompiledFieldSet | null, col: string, label = col): FieldDescriptor {
  return (
    compiled?.byCol[col] ??
    ({
      id: `fld_${col}`,
      col,
      label,
      type: 'SmallText',
      required: false,
      multiple: false,
    } satisfies FieldDescriptor)
  )
}

/**
 * Render the read presentation of a record's value for `col`.
 *
 * `placementComponent` is the CALLER's own placement-level `component`
 * override (e.g. `TaskDetail`'s `Cell.component` from `deriveDetail`'s
 * `profile.details`/section placements) — pass it through so it wins over
 * the field's master `component`. Omit when the caller has no placement
 * object at hand (falls back to master/type as before).
 */
export function renderReadCell(
  compiled: CompiledFieldSet | null,
  record: EntityRecord | undefined,
  col: string,
  label?: string,
  placementComponent?: { name: string; props?: Record<string, unknown> },
): ReactNode {
  const base = descriptorFor(compiled, col, label)
  const descriptor = withPlacementComponent(base, placementComponent)
  const Read = resolveReadRenderer(base, placementComponent)
  return <Read descriptor={descriptor} value={record?.[col]} record={record} />
}

export interface EditableCellProps {
  compiled: CompiledFieldSet | null
  record: EntityRecord
  col: string
  label?: string
  /**
   * The listcolumns placement's own `component` override (name + props) —
   * e.g. `Column.component` from `deriveColumns` — wins over the field's
   * master `component` for the READ presentation only; the inline EDITOR
   * (`getCellEditor`) is still resolved purely by field `type`, unaffected.
   */
  component?: { name: string; props?: Record<string, unknown> }
  /** When false, the cell is read-only (no double-click affordance). */
  editable?: boolean
  /** Commit handler — fires with the new value for `col`. */
  onCommit?: (value: unknown) => void
  /** Injected option data for reference/assignee/tag editors (Rule 8). */
  fieldContext?: FieldOptionContext
}

/**
 * A single table cell: read renderer by default, swapping to the field type's
 * inline editor on double-click when `editable`. Commit (Enter/blur, or an
 * immediate discrete control) calls `onCommit`; Escape cancels.
 */
export function EditableCell({
  compiled,
  record,
  col,
  label,
  component,
  editable = false,
  onCommit,
  fieldContext,
}: EditableCellProps) {
  const [editing, setEditing] = useState(false)
  const baseDescriptor = descriptorFor(compiled, col, label)
  const descriptor = withPlacementComponent(baseDescriptor, component)

  if (editing && editable && onCommit) {
    const Editor = getCellEditor(descriptor.type)
    return (
      <div data-slot="editable-cell" data-editing="true">
        <Editor
          descriptor={descriptor}
          value={record[col]}
          context={fieldContext}
          onCommit={(value) => {
            setEditing(false)
            onCommit(value)
          }}
          onCancel={() => setEditing(false)}
        />
      </div>
    )
  }

  const Read = resolveReadRenderer(baseDescriptor, component)
  return (
    <div
      data-slot="editable-cell"
      // A double-click affordance layered over a real cell value; the value's
      // own interactive controls (links/chips) keep their semantics.
      onDoubleClick={editable && onCommit ? () => setEditing(true) : undefined}
      className={cn(editable && onCommit && 'cursor-text rounded-xs hover:bg-muted/50')}
      title={editable && onCommit ? 'Double-click to edit' : undefined}
    >
      <Read descriptor={descriptor} value={record[col]} record={record} />
    </div>
  )
}

EditableCell.displayName = 'EditableCell'
