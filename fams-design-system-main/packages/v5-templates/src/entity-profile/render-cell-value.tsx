import type { ReactNode } from 'react'
import type { Cell, CompiledFieldSet, EntityRecord, FieldDescriptor } from '@fams/v5-composer'
import { resolveReadRenderer, withPlacementComponent } from '../views/field-cell'

/**
 * A read value for a derived detail/section/card cell. Resolution order is
 * PLACEMENT wins, then MASTER, then type default:
 *
 * 1. `cell.component` — the PLACEMENT's own override (`profile.details[]`/
 *    section-field/`kanbanCard.*[]`'s `component`, name AND props, e.g.
 *    `{name:"PersonView", props:{tone:"danger"}}` for a Supervisor detail
 *    row) via the named-component registry.
 * 2. `descriptor.component` — the field's authored MASTER `component` (the
 *    systemcolumn's own default override, e.g. `{name:"IconTextView",
 *    props:{icon:"marker-pin-02"}}` — figma-spec-kanban.md §5.3's lot/
 *    location meta rows), used when the placement carries no override of
 *    its own.
 * 3. `getReadRenderer(descriptor.type)` — the type-keyed registry, the
 *    plain fallback every field has.
 *
 * An unregistered/mistyped `component.name` at any step falls through to the
 * next step rather than rendering nothing, so a typo degrades to the
 * field's ordinary rendering instead of breaking.
 *
 * This used to resolve ONLY step 2/3 — `cell.component` (the placement's own
 * override, distinct from the field's master `component`) was computed by
 * `deriveDetail`/`deriveCard` but silently dropped here, the root cause
 * `KanbanCardView`'s `renderCardCell` wrapper was written to work around for
 * the kanban surface alone (see its doc); this fix folds that same
 * placement-wins merge into the shared function so every caller —
 * `EntityProfile`, `ProfileSectionsPanel`, `KanbanCardView` — gets it "for
 * free" without a per-surface wrapper.
 */
export function renderCellValue(
  compiled: CompiledFieldSet | null,
  record: EntityRecord | undefined,
  cell: Cell,
): ReactNode {
  const base: FieldDescriptor =
    compiled?.byCol[cell.col] ??
    ({
      id: `fld_${cell.col}`,
      col: cell.col,
      label: cell.label,
      type: 'SmallText',
      required: false,
      multiple: false,
    } satisfies FieldDescriptor)
  // Layer the placement's own override over the base descriptor and resolve
  // via the SAME "placement wins, then master, then type default" helper
  // `views/field-cell.tsx` uses for its own read paths (`renderReadCell`/
  // `EditableCell`) — shared rather than re-implemented, per this file's own
  // module doc.
  const descriptor: FieldDescriptor = withPlacementComponent(base, cell.component)
  const Read = resolveReadRenderer(base, cell.component)
  return <Read descriptor={descriptor} value={cell.value} record={record} />
}
