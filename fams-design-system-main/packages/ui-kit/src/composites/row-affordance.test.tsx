import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DataTable } from './DataTable'
import { KanbanBoard } from './Kanban'
import { KanbanCard } from './KanbanCard'
import { ROW_AFFORDANCE_GROUP, ROW_AFFORDANCE_SURFACE } from './row-affordance'

/**
 * The ONE row/card hover-affordance recipe, asserted on BOTH of its consumers —
 * `DataTable` rows (the list + hybrid lenses) and `KanbanCard` (the board).
 * Figma Dev Notes `33534:32266` and `33534:32263` are byte-identical, so a
 * divergence between these two is the defect this file exists to catch.
 */

type Row = { id: string; name: string }
const rows: Row[] = [
  { id: 'a', name: 'Alpha' },
  { id: 'b', name: 'Beta' },
]
const columns = [{ key: 'name', label: 'Name' }]

describe('DataTable — rowActions + the shared hover affordance', () => {
  it('renders the per-row control in a trailing cell and an sr-only header for it', () => {
    render(
      <DataTable
        columns={columns}
        data={rows}
        getRowId={(r) => r.id}
        rowActions={(row) => <button type="button">{`Actions ${row.name}`}</button>}
        // The default `isCustomizable` pencil claims this SAME trailing
        // header cell (see `DataTableColumnsMenu`'s doc comment) — disabled
        // here so the sr-only "Row actions" label this test checks for is
        // the one actually rendered, isolating `rowActions` from column
        // customization.
        isCustomizable={false}
      />,
    )
    expect(screen.getByRole('button', { name: 'Actions Alpha' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Actions Beta' })).toBeInTheDocument()
    // The trailing column is headed, not an unlabelled orphan.
    expect(screen.getByText('Row actions')).toBeInTheDocument()
  })

  it('applies the shared recipe to every row when rowActions is set', () => {
    render(
      <DataTable
        columns={columns}
        data={rows}
        getRowId={(r) => r.id}
        rowActions={() => <span>x</span>}
      />,
    )
    const row = screen.getByText('Alpha').closest('tr')!
    expect(row.className).toContain(ROW_AFFORDANCE_GROUP)
    for (const cls of ROW_AFFORDANCE_SURFACE.split(' ')) expect(row.className).toContain(cls)
  })

  it('leaves a plain table untouched, and can be opted out explicitly', () => {
    const { rerender } = render(<DataTable columns={columns} data={rows} getRowId={(r) => r.id} />)
    expect(screen.getByText('Alpha').closest('tr')!.className).not.toContain(ROW_AFFORDANCE_GROUP)
    rerender(
      <DataTable
        columns={columns}
        data={rows}
        getRowId={(r) => r.id}
        rowActions={() => <span>x</span>}
        hasRowHoverAffordance={false}
      />,
    )
    expect(screen.getByText('Alpha').closest('tr')!.className).not.toContain(ROW_AFFORDANCE_GROUP)
  })

  it('keeps the trailing column count right when rowActions and trailingAction are both set', () => {
    render(
      <DataTable
        columns={columns}
        data={rows}
        getRowId={(r) => r.id}
        rowActions={() => <span>x</span>}
        trailingAction={{ icon: <span>i</span>, ariaLabel: 'Edit columns' }}
      />,
    )
    // ONE trailing column, not two: the design has a single trailing cell.
    expect(screen.getAllByRole('columnheader')).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Edit columns' })).toBeInTheDocument()
  })
})

describe('KanbanCard — selectionControl + actions + the shared hover affordance', () => {
  const renderCard = (props: Partial<React.ComponentProps<typeof KanbanCard>> = {}) =>
    render(
      <KanbanBoard columns={[{ id: 'c1' }]}>
        <KanbanCard id="k1" index={0} title="Card one" {...props} />
      </KanbanBoard>,
    )

  it('renders a leading selection control in its own tagged slot', () => {
    renderCard({ selectionControl: <input type="checkbox" aria-label="Select Card one" /> })
    const box = screen.getByRole('checkbox', { name: 'Select Card one' })
    expect(box.closest('[data-slot="kanban-card-selection"]')).not.toBeNull()
  })

  it('renders the actions slot beside the title', () => {
    renderCard({ actions: <button type="button">More actions for k1</button> })
    expect(screen.getByRole('button', { name: 'More actions for k1' })).toBeInTheDocument()
  })

  it('applies the SAME recipe DataTable rows use — one rule, three lenses', () => {
    renderCard({ actions: <span>a</span> })
    const card = document.querySelector('[data-slot="kanban-card"]')!
    expect(card.className).toContain(ROW_AFFORDANCE_GROUP)
    for (const cls of ROW_AFFORDANCE_SURFACE.split(' ')) expect(card.className).toContain(cls)
  })

  it('leaves a card with no actions untouched', () => {
    renderCard()
    expect(document.querySelector('[data-slot="kanban-card"]')!.className).not.toContain(ROW_AFFORDANCE_GROUP)
  })
})

describe('the recipe itself', () => {
  it('changes background AND border colour and nothing that could reflow', () => {
    // UX note H.52: hover must not shift layout. Only colour utilities are
    // allowed in the recipe — no widths, no padding, no border widths.
    expect(ROW_AFFORDANCE_SURFACE).toContain('hover:bg-')
    expect(ROW_AFFORDANCE_SURFACE).toContain('hover:border-')
    expect(ROW_AFFORDANCE_SURFACE).not.toMatch(/hover:(border-\d|p[xy]?-|m[xy]?-|w-|h-)/)
  })

  it('mirrors hover on focus-within and holds while a child menu is open', () => {
    expect(ROW_AFFORDANCE_SURFACE).toContain('focus-within:bg-')
    expect(ROW_AFFORDANCE_SURFACE).toContain('has-[[data-state=open]]:bg-')
  })
})
