import type { Cell, CardModel, CompiledFieldSet, PipelineStage } from '@fams/v5-composer'

/**
 * Pure, React-free Kanban helpers — shared by `KanbanView`/`KanbanCardView` and
 * their tests so the move-guard and cell-layout logic has one implementation
 * and can be unit-tested without rendering anything.
 */

/** Predicate deciding whether a card may move from one stage to another. */
export type CanMove = (recordId: string, fromStage: string, toStage: string) => boolean

/** Group cards into their stage buckets, preserving stage order. */
export function groupCardsByStage(
  stages: PipelineStage[],
  cards: CardModel[],
): { stage: PipelineStage; cards: CardModel[] }[] {
  return stages.map((stage) => ({
    stage,
    cards: cards.filter((c) => c.stageId === stage.id),
  }))
}

/**
 * Group cards by an ARBITRARY column's value — the Group By popover's
 * non-status lanes (SPEC Addendum AC-6.1..6.4: "selecting a Group By option
 * must also regroup KANBAN lanes live", generalized from the hybrid list's
 * own grouping in `hybrid/MapHybridView.tsx`'s `groupedItems`). These are
 * DISPLAY-only lanes — a card's `col` value is not a pipeline stage, so there
 * is no "move" semantics for dragging between them (see `KanbanView`'s own
 * `canDropCardByStage` wiring, which rejects every drop while a non-status
 * grouping is active rather than silently reinterpreting a drag as a stage
 * change).
 *
 * Each distinct value becomes a `PipelineStage`-shaped lane (`id` = the raw
 * value, `label` from `labelOf`) so `KanbanLanes`/`KanbanColumnView` render
 * it exactly like a real stage lane — same header, same empty-lane copy,
 * same pin control — with zero new lane-rendering code. Lane order: `order`
 * ranks known values (e.g. a SingleSelect column's authored `listValues`
 * order); any value with no rank sorts alphabetically by its LABEL after
 * every ranked one — same convention `MapHybridView`'s `groupedItems` already
 * uses for the hybrid list, so the two lenses agree on lane order for the
 * same grouping.
 */
export function groupCardsByColumnValue(
  cards: CardModel[],
  col: string,
  order: Map<string, number>,
  labelOf: (value: string) => string,
): { stage: PipelineStage; cards: CardModel[] }[] {
  const buckets = new Map<string, CardModel[]>()
  for (const card of cards) {
    const raw = card.record[col]
    const value = raw == null || raw === '' ? '' : String(raw)
    const list = buckets.get(value)
    if (list) list.push(card)
    else buckets.set(value, [card])
  }
  const values = [...buckets.keys()].sort((a, b) => {
    const ra = order.has(a) ? order.get(a)! : Number.MAX_SAFE_INTEGER
    const rb = order.has(b) ? order.get(b)! : Number.MAX_SAFE_INTEGER
    if (ra !== rb) return ra - rb
    return labelOf(a).localeCompare(labelOf(b))
  })
  return values.map((value) => ({
    stage: { id: value === '' ? '__none__' : value, label: labelOf(value) },
    cards: buckets.get(value) ?? [],
  }))
}

/**
 * Resolve a completed drag into a move, or `null` when it should be ignored
 * (unknown destination, same-stage no-op, or `canMove` denial). Keeps the
 * board's `onMove` free of re-validation.
 *
 * `ui-kit`'s `KanbanBoard.onCardMove` fires `(cardId, fromColumnId,
 * toColumnId, toIndex)` — `toIndex` is a position-within-column precision
 * this app has no use for (pipeline stage moves have no meaningful order
 * within a stage), so `KanbanView` discards it before calling this.
 */
export function resolveMove(
  cardId: string,
  fromStage: string,
  toStage: string,
  knownStageIds: Set<string>,
  canMove?: CanMove,
): { cardId: string; fromStage: string; toStage: string } | null {
  if (!knownStageIds.has(toStage)) return null
  if (fromStage === toStage) return null
  if (canMove && !canMove(cardId, fromStage, toStage)) return null
  return { cardId, fromStage, toStage }
}

/**
 * True only when a move is a genuine `canMove` DENIAL — as opposed to the
 * other two reasons `resolveMove` returns `null` for (an unknown destination,
 * or a same-stage no-op), which are silent ignores, not denials, and should
 * never surface user-facing feedback. Lets `KanbanView` decide whether to
 * fire `onMoveDenied`/announce without re-deriving `resolveMove`'s ordering
 * by hand.
 */
export function isMoveDenied(
  cardId: string,
  fromStage: string,
  toStage: string,
  knownStageIds: Set<string>,
  canMove?: CanMove,
): boolean {
  if (!canMove) return false
  if (!knownStageIds.has(toStage)) return false
  if (fromStage === toStage) return false
  return !canMove(cardId, fromStage, toStage)
}

// ---------------------------------------------------------------------------
// Card cell layout — port of the real v5 Vue reference's `groupRows` computed
// property (`v5/src/modules/task/frontend/TaskCard.vue`), applied to a
// `CardModel`'s `header`/`body`/`footer` `Cell[]` (composer's `deriveCard`
// output — NOT pre-grouped into rows, that's a presentation concern).
// ---------------------------------------------------------------------------

export interface CellRow {
  order: number
  left: Cell[]
  right: Cell[]
}

/**
 * Sort cells by `order` (default 0), bucket cells sharing an `order` into one
 * row, and split each row into `left`/`right` sub-arrays by `pos` (default
 * `'left'`) — exactly `TaskCard.vue`'s `groupRows`.
 */
export function groupCellRows(cells: Cell[]): CellRow[] {
  const rows: CellRow[] = []
  const sorted = [...cells].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  for (const cell of sorted) {
    const order = cell.order ?? 0
    let row = rows.find((r) => r.order === order)
    if (!row) {
      row = { order, left: [], right: [] }
      rows.push(row)
    }
    if ((cell.pos ?? 'left') === 'right') row.right.push(cell)
    else row.left.push(cell)
  }
  return rows
}

/**
 * Long-form field types — the card's "description" in the design's card
 * anatomy, and the one part the drag ghost drops (frame `33534:30521` renders
 * the ghost as id pill + priority chip + title + meta + footer, *no
 * description*). Derived from the field TYPE rather than a column name, so it
 * holds for any blueprint: no module's description column is special-cased.
 */
const DESCRIPTION_FIELD_TYPES = new Set(['BigText', 'LongText'])

/** True when this cell's compiled field type is long-form prose (see above). */
export function isDescriptionCell(compiled: CompiledFieldSet | null, cell: Cell): boolean {
  const type = compiled?.byCol[cell.col]?.type
  return type !== undefined && DESCRIPTION_FIELD_TYPES.has(type)
}

/** A minimal avatar shape, structurally identical to ui-kit's `KanbanCardAvatar`. */
export interface CellAvatar {
  name: string
}

/**
 * Extract `{name}[]` avatar data from a single `Cell` whose resolved field
 * type is `Assignee`, OR whose placement/descriptor names the `PersonView`
 * component — lets `KanbanCardView` hand it to `KanbanCard`'s dedicated
 * `avatars` prop (the overlapping-ring-avatar-stack treatment) instead of a
 * generically-rendered node. Returns `null` when neither condition holds
 * (caller falls back to rendering it generically via `renderCellValue`).
 *
 * The `PersonView` branch (incidents hybrid-card footer parity, Figma
 * 29:41877's avatar-pair cluster) is a config seam, not a retype: a
 * `SingleSelect`/`SmallText` field the blueprint already renders as
 * `PersonView` elsewhere (avatar + name, e.g. "Assigned Team"/"Reported By")
 * can ALSO be placed in `kanbanCard.footer` to get the SAME dedicated
 * avatar-stack footer real `Assignee` fields get — no field is retyped, so a
 * `SingleSelect` field's edit widget (creation-form) is unaffected. The
 * placement's own `Cell.component` is checked first, falling back to the
 * descriptor's systemcolumn-level default (same precedence
 * `renderCardCell`/`renderCellValue` already use).
 *
 * Assignee/PersonView values follow the same shape `ReadAssignee`/
 * `ReadPersonView` already handle: `Array.isArray(value) ? value : value ? [value] : []`.
 *
 * The stored value can be a USER ID (`Assignee`) or an already-human-readable
 * name (a `PersonView`-rendered `SingleSelect`/`SmallText`), so `resolveName`
 * (the caller's `useDisplayName`) maps it to a display name before it reaches
 * `Avatar` — without it the footer stack derived its initials from
 * `u_dispatcher` (finding A7b-1). Omit it and the value is used verbatim, as
 * before; `useDisplayName`'s own resolver passes an already-resolved name
 * through unchanged (same behavior `ReadPersonView` documents).
 */
export function extractAssigneeAvatars(
  compiled: CompiledFieldSet | null,
  cell: Cell,
  resolveName?: (id: string) => string,
): CellAvatar[] | null {
  const descriptor = compiled?.byCol[cell.col]
  const isAssignee = descriptor?.type === 'Assignee'
  const componentName = cell.component?.name ?? descriptor?.component?.name
  const isPersonView = componentName === 'PersonView'
  if (!isAssignee && !isPersonView) return null
  const value = cell.value
  const ids = Array.isArray(value)
    ? (value as unknown[]).map(String)
    : value != null && value !== ''
      ? [String(value)]
      : []
  return ids.map((id) => ({ name: resolveName ? resolveName(id) : id }))
}
