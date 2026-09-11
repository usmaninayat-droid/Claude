import { describe, expect, it } from 'vitest'
import type { CardModel, Cell, CompiledFieldSet, PipelineStage } from '@fams/v5-composer'
import { extractAssigneeAvatars, groupCardsByStage, groupCellRows, isMoveDenied, resolveMove } from './kanban-model'

const stages: PipelineStage[] = [
  { id: 'lead', label: 'Lead' },
  { id: 'qualified', label: 'Qualified' },
  { id: 'won', label: 'Won' },
]

const card = (id: string, stageId: string): CardModel => ({
  id,
  stageId,
  header: [],
  body: [],
  footer: [],
  record: { id },
})

describe('kanban-model — groupCardsByStage', () => {
  it('buckets cards into their stage, preserving stage order', () => {
    const grouped = groupCardsByStage(stages, [card('a', 'won'), card('b', 'lead'), card('c', 'lead')])
    expect(grouped.map((g) => g.stage.id)).toEqual(['lead', 'qualified', 'won'])
    expect(grouped[0].cards.map((c) => c.id)).toEqual(['b', 'c'])
    expect(grouped[1].cards).toHaveLength(0)
    expect(grouped[2].cards.map((c) => c.id)).toEqual(['a'])
  })
})

describe('kanban-model — resolveMove', () => {
  const known = new Set(['lead', 'qualified', 'won'])

  it('resolves a legal move', () => {
    expect(resolveMove('a', 'lead', 'qualified', known)).toEqual({
      cardId: 'a',
      fromStage: 'lead',
      toStage: 'qualified',
    })
  })

  it('ignores an unknown destination', () => {
    expect(resolveMove('a', 'lead', 'archived', known)).toBeNull()
  })

  it('ignores a same-stage no-op', () => {
    expect(resolveMove('a', 'lead', 'lead', known)).toBeNull()
  })

  it('refuses a canMove-denied move before onMove', () => {
    const canMove = () => false
    expect(resolveMove('a', 'lead', 'won', known, canMove)).toBeNull()
  })
})

describe('kanban-model — isMoveDenied', () => {
  const known = new Set(['lead', 'qualified', 'won'])

  it('is true for a canMove denial on an otherwise-legal move', () => {
    const canMove = () => false
    expect(isMoveDenied('a', 'lead', 'won', known, canMove)).toBe(true)
  })

  it('is false for a legal move canMove allows', () => {
    const canMove = () => true
    expect(isMoveDenied('a', 'lead', 'won', known, canMove)).toBe(false)
  })

  it('is false with no canMove guard at all (nothing to deny)', () => {
    expect(isMoveDenied('a', 'lead', 'won', known)).toBe(false)
  })

  it('is false for an unknown destination — a silent ignore, not a denial', () => {
    const canMove = () => false
    expect(isMoveDenied('a', 'lead', 'archived', known, canMove)).toBe(false)
  })

  it('is false for a same-stage no-op — a silent ignore, not a denial', () => {
    const canMove = () => false
    expect(isMoveDenied('a', 'lead', 'lead', known, canMove)).toBe(false)
  })
})

const cell = (col: string, value: unknown, pos?: 'left' | 'right', order?: number): Cell => ({
  col,
  label: col,
  value,
  pos,
  order,
})

describe('kanban-model — groupCellRows (port of the v5 Vue reference groupRows)', () => {
  it('buckets cells sharing an order into one row, split by pos', () => {
    const rows = groupCellRows([
      cell('priority', 'High', 'left', 1),
      cell('ticketId', 'WO-1042', 'right', 1),
      cell('title', 'Fix GPS drift', 'left', 2),
    ])
    expect(rows).toEqual([
      { order: 1, left: [cell('priority', 'High', 'left', 1)], right: [cell('ticketId', 'WO-1042', 'right', 1)] },
      { order: 2, left: [cell('title', 'Fix GPS drift', 'left', 2)], right: [] },
    ])
  })

  it('sorts rows by order regardless of input order', () => {
    const rows = groupCellRows([cell('b', 2, 'left', 2), cell('a', 1, 'left', 1)])
    expect(rows.map((r) => r.order)).toEqual([1, 2])
  })

  it('defaults a missing order to 0 and a missing pos to left', () => {
    const rows = groupCellRows([cell('a', 1)])
    expect(rows).toEqual([{ order: 0, left: [cell('a', 1)], right: [] }])
  })

  it('returns no rows for an empty cell list', () => {
    expect(groupCellRows([])).toEqual([])
  })
})

describe('kanban-model — extractAssigneeAvatars', () => {
  const compiledWithAssignee = {
    byCol: {
      owner: { id: 'fld_owner', col: 'owner', label: 'Owner', type: 'Assignee', required: false, multiple: false },
      category: { id: 'fld_category', col: 'category', label: 'Category', type: 'SingleSelect', required: false, multiple: false },
    },
  } as unknown as CompiledFieldSet

  it('returns null when the cell does not resolve to an Assignee-typed field', () => {
    expect(extractAssigneeAvatars(compiledWithAssignee, cell('category', 'Mechanical'))).toBeNull()
  })

  it('returns null with no compiled field set at all (falls back to descriptor-less text)', () => {
    expect(extractAssigneeAvatars(null, cell('owner', 'Zain Uddin'))).toBeNull()
  })

  it('extracts a single-name avatar array for a scalar Assignee value', () => {
    expect(extractAssigneeAvatars(compiledWithAssignee, cell('owner', 'Zain Uddin'))).toEqual([
      { name: 'Zain Uddin' },
    ])
  })

  // Finding A7b-1: the stored value is a user id, so the footer stack has to
  // resolve it exactly like `ReadAssignee` does.
  it('resolves each stored user id through the injected resolver', () => {
    const directory: Record<string, string> = { u_dispatcher: 'Rania Al Nuaimi', u_admin: 'Omar Haddad' }
    const resolve = (id: string) => directory[id] ?? id
    expect(extractAssigneeAvatars(compiledWithAssignee, cell('owner', 'u_dispatcher'), resolve)).toEqual([
      { name: 'Rania Al Nuaimi' },
    ])
    expect(extractAssigneeAvatars(compiledWithAssignee, cell('owner', ['u_admin', 'u_ghost']), resolve)).toEqual([
      { name: 'Omar Haddad' },
      { name: 'u_ghost' },
    ])
  })

  it('extracts a multi-name avatar array for an array Assignee value', () => {
    expect(extractAssigneeAvatars(compiledWithAssignee, cell('owner', ['Zain Uddin', 'Kashish Bindrani']))).toEqual([
      { name: 'Zain Uddin' },
      { name: 'Kashish Bindrani' },
    ])
  })

  it('extracts an empty array (not null) for an empty Assignee value', () => {
    expect(extractAssigneeAvatars(compiledWithAssignee, cell('owner', ''))).toEqual([])
  })
})
