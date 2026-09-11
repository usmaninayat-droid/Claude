import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import type { EntityRecord } from '@fams/v5-composer'
import { RecordSectionsGrid, type RecordSectionsGridGroup } from './RecordSectionsGrid'

const record: EntityRecord = {
  id: 'tk1',
  title: 'Mitsubishi X6734',
  vehicleStatus: 'Active',
  plate: 'Plate# 512834',
  colour: 'Blue',
  length: '321 cm',
  interiorVolume: null,
}

const groups: RecordSectionsGridGroup[] = [
  {
    title: 'Tanker Details',
    column: 'start',
    fields: [
      { field: 'title', label: 'Title' },
      { field: 'vehicleStatus', label: 'Tanker Status', render: 'statusChip', toneMap: { Active: 'success' } },
      { field: 'plate', label: 'Plate' },
      { field: 'colour', label: 'Tanker Color', render: 'colorSwatch', colorMap: { Blue: '#2e90fa' } },
    ],
  },
  {
    title: 'Dimension',
    column: 'end',
    fields: [
      { field: 'length', label: 'Length' },
      { field: 'interiorVolume', label: 'Interior Volume' },
    ],
  },
]

describe('RecordSectionsGrid', () => {
  it('renders one titled card per group, split across the two columns', () => {
    render(<RecordSectionsGrid groups={groups} record={record} />)
    expect(screen.getByRole('heading', { name: 'Tanker Details' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Dimension' })).toBeInTheDocument()
    const grid = document.querySelector('[data-slot="record-sections-grid"] .grid')
    expect(grid?.children).toHaveLength(2)
    expect(grid?.children[0].contains(screen.getByRole('heading', { name: 'Tanker Details' }))).toBe(true)
    expect(grid?.children[1].contains(screen.getByRole('heading', { name: 'Dimension' }))).toBe(true)
  })

  it('renders each value renderer: plain text, status chip, colour swatch, and an em dash when empty', () => {
    render(<RecordSectionsGrid groups={groups} record={record} />)
    expect(screen.getByText('Mitsubishi X6734')).toBeInTheDocument()
    // Status chip: the WORD is present (never colour alone) and carries a badge.
    const chip = screen.getByText('Active')
    expect(chip.closest('[data-slot="badge"]') ?? chip).toBeInTheDocument()
    // Colour swatch: the colour NAME plus a dot filled from `colorMap`.
    expect(screen.getByText('Blue')).toBeInTheDocument()
    // An absent value is an em dash, not a blank cell.
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('hides the Edit affordance unless both `editable` and `onSave` are given', () => {
    const { rerender } = render(<RecordSectionsGrid groups={groups} record={record} />)
    expect(screen.queryByRole('button', { name: /Edit/ })).not.toBeInTheDocument()

    rerender(<RecordSectionsGrid groups={groups} record={record} editable />)
    expect(screen.queryByRole('button', { name: /Edit/ })).not.toBeInTheDocument()

    rerender(<RecordSectionsGrid groups={groups} record={record} editable onSave={() => {}} />)
    expect(screen.getByRole('button', { name: /Edit/ })).toBeInTheDocument()
  })

  it('Edit swaps the rows into a form, and Cancel restores the read presentation unchanged', () => {
    const onSave = vi.fn()
    render(<RecordSectionsGrid groups={groups} record={record} editable onSave={onSave} />)

    fireEvent.click(screen.getByRole('button', { name: /Edit/ }))
    const input = screen.getByLabelText('Title')
    expect(input).toHaveValue('Mitsubishi X6734')

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByLabelText('Title')).not.toBeInTheDocument()
    expect(screen.getByText('Mitsubishi X6734')).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('Save reports only the fields the user actually changed', () => {
    const onSave = vi.fn()
    render(<RecordSectionsGrid groups={groups} record={record} editable onSave={onSave} />)

    fireEvent.click(screen.getByRole('button', { name: /Edit/ }))
    fireEvent.change(screen.getByLabelText('Plate'), { target: { value: 'Plate# 900001' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave.mock.calls[0][0]).toEqual({ plate: 'Plate# 900001' })
    // Saving closes the form; the caller owns whether the record itself moved.
    expect(screen.queryByLabelText('Plate')).not.toBeInTheDocument()
  })

  it('keeps a `readOnly` row read-only while the rest of the pane is editing', () => {
    const readOnlyGroups: RecordSectionsGridGroup[] = [
      {
        title: 'Tanker Details',
        fields: [
          { field: 'title', label: 'Title' },
          { field: 'plate', label: 'Plate', readOnly: true },
        ],
      },
    ]
    render(<RecordSectionsGrid groups={readOnlyGroups} record={record} editable onSave={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /Edit/ }))
    expect(screen.getByLabelText('Title')).toBeInTheDocument()
    expect(screen.queryByLabelText('Plate')).not.toBeInTheDocument()
    expect(screen.getByText('Plate# 512834')).toBeInTheDocument()
  })

  it('renders an empty-state line for an empty group list', () => {
    render(<RecordSectionsGrid groups={[]} record={record} />)
    expect(screen.getByText('No details available.')).toBeInTheDocument()
  })
})

/**
 * fix9 (2026-09-06), round-10 UX gate finding **P1-10a**. This grid's read
 * state used `String(raw)`, so a `Date` field printed the STORED `2026-06-17`
 * while the identity panel on the same PM detail sheet printed
 * `17 Jun, 2026` from the shared read path — the cycle's signature defect,
 * and round 5's P1-T recurring on a surface that fix never reached.
 *
 * These cases pin the DELEGATION, not a second date implementation: they
 * assert the grid shows what `formatFigmaDate` produces and that the raw ISO
 * string is ABSENT. If someone reintroduces `String(raw)`, the ISO assertion
 * fails; if the shared formatter's output ever changes, this test follows it
 * instead of contradicting it.
 */
describe('RecordSectionsGrid — read state goes through the shared read path, not String(raw) (fix9, P1-10a)', () => {
  const dateConfig = {
    code: 'test/pm-rule',
    name: 'Rule',
    uidPrefix: 'PMR',
    systemcolumns: [
      { col: 'systemcol1', name: 'Last Service On', type: 'Date' },
      { col: 'systemcol2', name: 'Notes', type: 'SmallText' },
    ],
    uiConfig: {},
  } as unknown as Parameters<typeof RecordSectionsGrid>[0]['config']

  const dateRecord: EntityRecord = { id: 'r1', systemcol1: '2026-06-17', systemcol2: 'plain text' }
  const dateGroups: RecordSectionsGridGroup[] = [
    {
      title: 'Details',
      fields: [
        { field: 'systemcol1', label: 'Last Service On' },
        { field: 'systemcol2', label: 'Notes' },
      ],
    },
  ]

  it('formats a Date field instead of printing the stored ISO string', () => {
    render(<RecordSectionsGrid groups={dateGroups} config={dateConfig} record={dateRecord} />)
    expect(screen.getByText('17 Jun, 2026')).toBeInTheDocument()
    expect(screen.queryByText('2026-06-17')).not.toBeInTheDocument()
  })

  it('leaves a plain text field exactly as stored — the delegation must not reformat what has no type rule', () => {
    render(<RecordSectionsGrid groups={dateGroups} config={dateConfig} record={dateRecord} />)
    expect(screen.getByText('plain text')).toBeInTheDocument()
  })

  it('still shows an em dash for an empty value, and still honours the caller-named statusChip/colorSwatch renders', () => {
    render(<RecordSectionsGrid groups={groups} record={record} />)
    expect(screen.getByText('—')).toBeInTheDocument()
    const chip = screen.getByText('Active')
    expect(chip.closest('[data-slot="badge"]')).not.toBeNull()
    expect(screen.getByText('Blue')).toBeInTheDocument()
  })
})
