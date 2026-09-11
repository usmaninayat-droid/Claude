import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { compileFieldSet, type Cell, type CompiledFieldSet } from '@fams/v5-composer'
import { renderCellValue } from './render-cell-value'

/**
 * `renderCellValue` resolution-order coverage: PLACEMENT (`cell.component`)
 * wins over MASTER (`descriptor.component`) wins over the type default. This
 * is the fix for the bug documented in `qa/deviations.md`'s FIX-3 entry — the
 * placement's own `component` override (`profile.details[]`/section-field/
 * `kanbanCard.*[]`) used to be silently dropped, so a field could only ever
 * render with its ONE master-level look everywhere it appeared, even when a
 * different surface's placement named a different renderer.
 */
const compiled: CompiledFieldSet = compileFieldSet({
  code: 'fixtures/placement-override',
  fields: [
    { col: 'title', name: 'Title', type: 'SmallText', required: true },
    // A master field with NO component of its own — a plain SmallText.
    { col: 'reportedBy', name: 'Reported By', type: 'SmallText' },
    // A master field that DOES carry its own default component — Kanban/List
    // want this look; a specific placement (below) wants a different one.
    {
      col: 'priorityLevel',
      name: 'Priority Level',
      type: 'SingleSelect',
      component: { name: 'PersonView' },
    },
  ],
})

function cellFor(col: string, value: unknown, component?: Cell['component'], label = col): Cell {
  return { col, label, value, component }
}

describe('renderCellValue — placement-vs-master component precedence', () => {
  it('uses the PLACEMENT override when the master field has no component of its own', () => {
    render(
      <>
        {renderCellValue(compiled, undefined, cellFor('reportedBy', 'Vikram Singh', { name: 'PersonView', props: { tone: 'success' } }))}
      </>,
    )
    expect(screen.getByText('Vikram Singh')).toBeInTheDocument()
    expect(screen.getByText('V')).toBeInTheDocument() // PersonView's Avatar initials fallback
  })

  it('a PLACEMENT override wins over a DIFFERENT master-level component for the same field', () => {
    const { container } = render(
      <>{renderCellValue(compiled, undefined, cellFor('priorityLevel', 'Critical', { name: 'PriorityFlagView' }))}</>,
    )
    // PriorityFlagView renders a bare flag + text, not PersonView's avatar+name.
    expect(screen.getByText('Critical')).toBeInTheDocument()
    expect(container.querySelector('[data-slot="avatar"]')).not.toBeInTheDocument()
  })

  it('falls back to the MASTER component when the cell carries no placement override', () => {
    render(<>{renderCellValue(compiled, undefined, cellFor('priorityLevel', 'Ahmad Ali'))}</>)
    // No `component` on the cell → resolves the master's `PersonView`.
    expect(screen.getByText('Ahmad Ali')).toBeInTheDocument()
    expect(screen.getByText('A')).toBeInTheDocument()
  })

  it('falls back to the type default when neither placement nor master carry a component', () => {
    render(<>{renderCellValue(compiled, undefined, cellFor('reportedBy', 'Plain text value'))}</>)
    expect(screen.getByText('Plain text value')).toBeInTheDocument()
  })

  it('an unrecognized placement component name degrades to the master/type default rather than rendering nothing', () => {
    render(<>{renderCellValue(compiled, undefined, cellFor('reportedBy', 'Fallback value', { name: 'NotRegisteredView' }))}</>)
    expect(screen.getByText('Fallback value')).toBeInTheDocument()
  })
})
