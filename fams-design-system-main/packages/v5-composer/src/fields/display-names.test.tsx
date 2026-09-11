import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DisplayNameProvider } from './display-names'
import { getComponentRenderer, getReadRenderer } from './registry'
import type { FieldDescriptor } from './types'

/**
 * Finding A7b-1: an `Assignee` field stores a USER ID (`u_dispatcher`), and
 * every surface that renders one — a list column cell, a detail row, a kanban
 * card footer — goes through the SAME two registry renderers. So the
 * id→display-name seam has to live on the renderers, not on one template's
 * prop. These tests pin that: the resolver is injected once, and both
 * renderers honour it; without a provider the raw id still renders (the
 * pre-existing behaviour, which apps with no directory rely on).
 */
const descriptor = (over: Partial<FieldDescriptor> = {}): FieldDescriptor => ({
  id: 'fld_assignee',
  col: 'assignee',
  label: 'Assignee',
  type: 'Assignee',
  required: false,
  multiple: false,
  ...over,
})

const DIRECTORY: Record<string, string> = {
  u_dispatcher: 'Rania Al Nuaimi',
  u_admin: 'Omar Haddad',
}
const resolve = (id: string) => DIRECTORY[id]

describe('DisplayNameProvider — one identity seam for every record surface', () => {
  const ReadAssignee = getReadRenderer('Assignee')
  const ReadPersonView = getComponentRenderer('PersonView')!

  it('resolves an Assignee user id to a display name', () => {
    render(
      <DisplayNameProvider resolve={resolve}>
        <ReadAssignee descriptor={descriptor()} value="u_dispatcher" />
      </DisplayNameProvider>,
    )
    // `ReadAssignee` renders avatars only, so the resolved name shows up as
    // the single initial `Avatar` derives from it — "R", not the id's "U".
    expect(screen.getByText('R')).toBeInTheDocument()
    expect(screen.queryByText('U')).not.toBeInTheDocument()
  })

  it('resolves the same id in a PersonView cell (list column / detail row / kanban footer)', () => {
    render(
      <DisplayNameProvider resolve={resolve}>
        <ReadPersonView descriptor={descriptor({ component: { name: 'PersonView' } })} value="u_admin" />
      </DisplayNameProvider>,
    )
    expect(screen.getByText('Omar Haddad')).toBeInTheDocument()
    expect(screen.queryByText('u_admin')).not.toBeInTheDocument()
  })

  it('resolves every id of a multi-assignee value and keeps the overflow counter', () => {
    render(
      <DisplayNameProvider resolve={resolve}>
        <ReadPersonView
          descriptor={descriptor({ component: { name: 'PersonView' }, multiple: true })}
          value={['u_dispatcher', 'u_admin']}
        />
      </DisplayNameProvider>,
    )
    expect(screen.getByText('Rania Al Nuaimi')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('falls back to the raw id for an id the directory cannot resolve', () => {
    render(
      <DisplayNameProvider resolve={resolve}>
        <ReadPersonView descriptor={descriptor({ component: { name: 'PersonView' } })} value="u_unknown" />
      </DisplayNameProvider>,
    )
    expect(screen.getByText('u_unknown')).toBeInTheDocument()
  })

  it('renders raw ids with no provider at all (unchanged default)', () => {
    render(<ReadPersonView descriptor={descriptor({ component: { name: 'PersonView' } })} value="u_admin" />)
    expect(screen.getByText('u_admin')).toBeInTheDocument()
  })

  it('passes an already-resolved name through unchanged (template pre-resolution stays safe)', () => {
    render(
      <DisplayNameProvider resolve={resolve}>
        <ReadPersonView descriptor={descriptor({ component: { name: 'PersonView' } })} value="Rania Al Nuaimi" />
      </DisplayNameProvider>,
    )
    expect(screen.getByText('Rania Al Nuaimi')).toBeInTheDocument()
  })

  it('keeps the empty state an em dash rather than resolving the empty string', () => {
    render(
      <DisplayNameProvider resolve={resolve}>
        <ReadPersonView descriptor={descriptor({ component: { name: 'PersonView' } })} value="" />
      </DisplayNameProvider>,
    )
    expect(screen.getByText('—')).toBeInTheDocument()
  })
})

/**
 * Round 5, run 2026-09-05-preventive-maintenance: `SingleReference` /
 * `MultiReference` go through `ReadReference`, which was never wired to this
 * seam even after the provider existed — so the PM create wizard's Summary
 * step read `Vehicle: VEH-01` while `Service Type` beside it read `Oil
 * Change`. These pin the resolution AND the graceful degradation, since
 * `tags` shares the same renderer and its values are not directory ids.
 */
describe('ReadReference — reference ids resolve through the same seam', () => {
  const ReadReference = getReadRenderer('SingleReference')
  const refDescriptor = descriptor({
    id: 'fld_vehicle',
    col: 'vehicle',
    label: 'Vehicle',
    type: 'SingleReference',
  })
  const REFS: Record<string, string> = { 'VEH-01': 'Tanker 01', 'VEH-02': 'Tanker 03' }
  const resolveRef = (id: string) => REFS[id]

  it('resolves a SingleReference record id to its display title', () => {
    render(
      <DisplayNameProvider resolve={resolveRef}>
        <ReadReference descriptor={refDescriptor} value="VEH-01" />
      </DisplayNameProvider>,
    )
    expect(screen.getByText('Tanker 01')).toBeInTheDocument()
    expect(screen.queryByText('VEH-01')).not.toBeInTheDocument()
  })

  it('resolves every id of a MultiReference value', () => {
    render(
      <DisplayNameProvider resolve={resolveRef}>
        <ReadReference descriptor={{ ...refDescriptor, type: 'MultiReference', multiple: true }} value={['VEH-01', 'VEH-02']} />
      </DisplayNameProvider>,
    )
    expect(screen.getByText('Tanker 01')).toBeInTheDocument()
    expect(screen.getByText('Tanker 03')).toBeInTheDocument()
  })

  it('falls back to the raw id when the app cannot resolve it', () => {
    render(
      <DisplayNameProvider resolve={resolveRef}>
        <ReadReference descriptor={refDescriptor} value="VEH-99" />
      </DisplayNameProvider>,
    )
    expect(screen.getByText('VEH-99')).toBeInTheDocument()
  })

  it('renders the raw id verbatim with no provider at all', () => {
    render(<ReadReference descriptor={refDescriptor} value="VEH-01" />)
    expect(screen.getByText('VEH-01')).toBeInTheDocument()
  })
})
