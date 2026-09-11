import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CreationSheet } from './CreationSheet'
import type { EntityConfig } from '@fams/v5-composer'

/**
 * A synthetic config exercising figma-spec-create-sheet.md's shape: >5
 * fields (so decision #10 would normally trigger the Stepper wizard), a
 * named "Location Details" section with two fields sharing an `order`
 * (column-span), an `IconSelect`-overridden `SingleSelect`, and a
 * `LocationPicker`-overridden field.
 */
// `component` overrides + section `order` are AUTHORED-blueprint fields
// (`AuthoredSystemColumn`/`AuthoredProfileSection`) — they survive on the
// plain object at runtime (this is exactly what `toEntityConfig` does with
// a real blueprint JSON, see `blueprint-loader.ts`) even though the
// runtime `EntityConfig`/`SystemColumn` TS types don't statically declare
// them, so this fixture is cast the same way other JSON-sourced fixtures
// are (`contactsModule as unknown as FieldSetInput`, etc.).
const config = {
  code: 'x/flat-sheet',
  name: 'Ticket',
  systemcolumns: [
    { col: 'title', name: 'Title', type: 'SmallText' },
    { col: 'source', name: 'Ticket Source', type: 'SmallText' },
    { col: 'ticketType', name: 'Ticket Type', type: 'SmallText' },
    { col: 'serviceType', name: 'Service Type', type: 'SmallText' },
    { col: 'kpi', name: 'KPI', type: 'SmallText' },
    {
      col: 'priority',
      name: 'Priority Level',
      type: 'SingleSelect',
      listValues: ['Critical', 'Medium', 'Minor'],
      component: { name: 'IconSelect', props: { icon: 'flag', optionTone: { Critical: 'error' } } },
    },
    { col: 'language', name: 'Customer Language', type: 'SmallText' },
    { col: 'coords', name: 'Latitude/Longitude', type: 'SmallText', component: { name: 'LocationPicker' } },
  ],
  uiConfig: {
    statusList: [],
    profile: {
      title: { col: 'title' },
      details: [],
      sections: [
        {
          id: 'loc',
          name: 'Location Details',
          // Figma's create sheet shows exactly ONE section heading
          // ("Location Details") — every other group (basic info, KPI,
          // Note, …) flows unlabeled. This fixture models the ONE section
          // that DOES want its label, so it opts in explicitly.
          showLabel: true,
          fields: [
            { col: 'priority', order: 1 },
            { col: 'language', order: 1 },
            { col: 'coords', order: 2 },
          ],
        },
      ],
    },
  },
  listcolumns: [],
} as unknown as EntityConfig

describe('CreationSheet — layout="flat" (figma parity)', () => {
  it('renders one flowing sheet (no stepper) even with >5 fields across 2 groups', () => {
    render(<CreationSheet open onOpenChange={() => {}} config={config} onSubmit={vi.fn()} layout="flat" />)
    expect(screen.queryByRole('navigation', { name: 'Progress' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument()
  })

  it('shows the named section label but never "Basic Info"', () => {
    render(<CreationSheet open onOpenChange={() => {}} config={config} onSubmit={vi.fn()} layout="flat" />)
    expect(screen.getByText('Location Details')).toBeInTheDocument()
    expect(screen.queryByText('Basic Info')).not.toBeInTheDocument()
  })

  it('footer has a single full-width Create button, no Cancel', () => {
    render(<CreationSheet open onOpenChange={() => {}} config={config} onSubmit={vi.fn()} layout="flat" />)
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument()
  })

  it('header shows a visible, 40px, labeled close X that closes the sheet (round-2 UX P1)', () => {
    const onOpenChange = vi.fn()
    render(<CreationSheet open onOpenChange={onOpenChange} config={config} onSubmit={vi.fn()} layout="flat" />)
    const close = screen.getByRole('button', { name: 'Close' })
    // 40x40 hit area (UX-NOTES touch minimum) — `size-10` must win over the
    // icon-button default `size-9` (36px).
    expect(close.className).toContain('size-10')
    expect(close.className).not.toContain('size-9')
    fireEvent.click(close)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('pairs same-order fields into one row (column-span) via the IconSelect + plain-text widgets', () => {
    render(<CreationSheet open onOpenChange={() => {}} config={config} onSubmit={vi.fn()} layout="flat" />)
    // Priority Level (IconSelect override) and Customer Language render side by side —
    // both present, and the IconSelect trigger is a real accessible button.
    expect(screen.getByRole('button', { name: 'Priority Level' })).toBeInTheDocument()
    expect(screen.getByLabelText('Customer Language')).toBeInTheDocument()
  })

  it('renders the LocationPicker field behind Suspense without crashing, and it lazy-resolves the map', async () => {
    render(<CreationSheet open onOpenChange={() => {}} config={config} onSubmit={vi.fn()} layout="flat" />)
    expect(document.querySelector('[data-slot="location-picker-field"]')).toBeInTheDocument()
    // The lazy `import('@fams/v5-templates/map')` resolves and the real map
    // region mounts (proves the self-package dynamic import actually works
    // at runtime, not just at the type/build level). Generous timeout: under
    // full-monorepo-suite concurrency (dozens of jsdom environments at once)
    // the dynamic import + maplibre-gl module init can outrun RTL's 1000ms
    // default, which flaked here despite the import always resolving.
    await waitFor(() => expect(document.querySelector('[data-slot="location-picker-map"]')).toBeInTheDocument(), {
      timeout: 5000,
    })
  })

  it('submits a mapped record from the flat sheet', async () => {
    const onSubmit = vi.fn()
    render(<CreationSheet open onOpenChange={() => {}} config={config} onSubmit={onSubmit} layout="flat" />)
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'TAMM issue' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toEqual(expect.objectContaining({ title: 'TAMM issue' }))
  })
})

describe('CreationSheet — fieldChrome="inset-label"', () => {
  it('moves inset-capable field labels inside the field box (no external sibling label)', () => {
    render(
      <CreationSheet open onOpenChange={() => {}} config={config} onSubmit={vi.fn()} layout="flat" fieldChrome="inset-label" />,
    )
    // FieldControl's external <Label> is suppressed for SmallText under inset-label
    // chrome; the label text still exists (rendered by InsetField) exactly once.
    expect(document.querySelectorAll('label[for="sf-title"]')).toHaveLength(1)
    expect(screen.getByText('Title')).toBeInTheDocument()
  })
})
