import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { compileFieldSet, type CompiledFieldSet, type EntityRecord } from '@fams/v5-composer'
import { EditableCell, renderReadCell } from './field-cell'

/**
 * `MultiReference` fixture — real coverage gap per BACKLOG.md: no golden
 * blueprint (`blueprints/crm/*`, `blueprints/fleet/*`) authors a
 * `MultiReference` field, so no v5-templates test ever compiled or rendered
 * one. `compileFieldSet` accepts a bare `{ code, fields }` list (its
 * `FieldSetInput` union, see `@fams/v5-composer/src/fields/compiler.ts`), so
 * this fixture doesn't need a full blueprint JSON — one `MultiReference` col
 * (`stakeholders`) shaped exactly like the golden blueprints' authored
 * columns (`col`/`name`/`type`/`refModule`/`entityType`), run through the
 * SAME compiler every other fixture uses.
 */
const compiled: CompiledFieldSet = compileFieldSet({
  code: 'fixtures/multi-reference',
  fields: [
    { col: 'title', name: 'Title', type: 'SmallText', required: true },
    {
      col: 'stakeholders',
      name: 'Stakeholders',
      type: 'MultiReference',
      refModule: 'Entity',
      entityType: 'crm/contacts',
    },
  ],
})

function recordWith(stakeholders?: unknown): EntityRecord {
  return { id: 'r1', title: 'Fixture record', stakeholders }
}

describe('field-cell — MultiReference read rendering (v5-templates surface: renderReadCell → FieldRegistry)', () => {
  it('compiles a MultiReference column as a multi-value field descriptor', () => {
    const descriptor = compiled.byCol.stakeholders
    expect(descriptor.type).toBe('MultiReference')
    expect(descriptor.multiple).toBe(true)
  })

  it('renders multiple referenced values, one chip per id', () => {
    render(<>{renderReadCell(compiled, recordWith(['c1', 'c2', 'c3']), 'stakeholders', 'Stakeholders')}</>)
    expect(screen.getByText('c1')).toBeInTheDocument()
    expect(screen.getByText('c2')).toBeInTheDocument()
    expect(screen.getByText('c3')).toBeInTheDocument()
  })

  it('renders the muted empty placeholder for an empty list', () => {
    render(<>{renderReadCell(compiled, recordWith([]), 'stakeholders', 'Stakeholders')}</>)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('renders the muted empty placeholder when the value is entirely absent', () => {
    render(<>{renderReadCell(compiled, recordWith(undefined), 'stakeholders', 'Stakeholders')}</>)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('renders an unresolved reference id as-is — the read contract has no label-lookup step', () => {
    // `ReadReference` (the registered read renderer for MultiReference) takes
    // no option/lookup data — `ReadRendererProps` is only
    // `{ descriptor, value, record }`, no `FieldOptionContext` — so an id with
    // no corresponding record still renders verbatim rather than resolving to
    // a display name, or erroring. See the E1 report for the doc/behavior
    // mismatch this exposes in `ReadReference`'s own comment.
    render(<>{renderReadCell(compiled, recordWith(['does-not-exist']), 'stakeholders', 'Stakeholders')}</>)
    expect(screen.getByText('does-not-exist')).toBeInTheDocument()
  })
})

/**
 * Placement-vs-master `component` precedence — `renderReadCell`/`EditableCell`
 * used to only ever consult `descriptor.component` (the field's ONE master
 * override), silently ignoring a caller's own placement-level override (a
 * `listcolumns[].component`/`profile.details[].component`). This is the list/
 * detail-side half of the fix `render-cell-value.test.tsx` covers for the
 * entity-profile/kanban side — same resolution order: placement wins, then
 * master, then the field's type default.
 */
const placementFieldSet: CompiledFieldSet = compileFieldSet({
  code: 'fixtures/placement-precedence',
  fields: [
    { col: 'title', name: 'Title', type: 'SmallText', required: true },
    // No master component — a plain SmallText.
    { col: 'reportedBy', name: 'Reported By', type: 'SmallText' },
    // A master component the placement should be able to override.
    { col: 'role', name: 'Role', type: 'SmallText', component: { name: 'PriorityFlagView' } },
  ],
})

describe('renderReadCell — placement-vs-master component precedence', () => {
  it('a placement component wins when the field carries no master component', () => {
    render(
      <>
        {renderReadCell(placementFieldSet, { id: 'r1', reportedBy: 'Vikram Singh' }, 'reportedBy', 'Reported By', {
          name: 'PersonView',
          props: { tone: 'success' },
        })}
      </>,
    )
    expect(screen.getByText('Vikram Singh')).toBeInTheDocument()
    expect(screen.getByText('V')).toBeInTheDocument() // PersonView's Avatar initials fallback
  })

  it('a placement component wins over a DIFFERENT master component for the same field', () => {
    const { container } = render(
      <>
        {renderReadCell(placementFieldSet, { id: 'r1', role: 'Ahmad Ali' }, 'role', 'Role', { name: 'PersonView' })}
      </>,
    )
    expect(screen.getByText('Ahmad Ali')).toBeInTheDocument()
    // PersonView renders an avatar, not PriorityFlagView's bare flag icon.
    expect(container.querySelector('[data-slot="avatar"]')).toBeInTheDocument()
  })

  it('falls back to the master component when no placement override is given', () => {
    render(<>{renderReadCell(placementFieldSet, { id: 'r1', role: 'Critical' }, 'role', 'Role')}</>)
    expect(screen.getByText('Critical')).toBeInTheDocument()
  })
})

describe('EditableCell — placement-vs-master component precedence', () => {
  it('honors a `component` prop (listcolumns placement override) over the field type default', () => {
    render(
      <EditableCell
        compiled={placementFieldSet}
        record={{ id: 'r1', reportedBy: 'Vikram Singh' }}
        col="reportedBy"
        label="Reported By"
        component={{ name: 'PersonView', props: { tone: 'success' } }}
      />,
    )
    expect(screen.getByText('Vikram Singh')).toBeInTheDocument()
    expect(screen.getByText('V')).toBeInTheDocument()
  })

  it('renders the plain type default when no `component` prop is given', () => {
    render(<EditableCell compiled={placementFieldSet} record={{ id: 'r1', reportedBy: 'Plain value' }} col="reportedBy" label="Reported By" />)
    expect(screen.getByText('Plain value')).toBeInTheDocument()
  })
})
