import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import type { EntityRecord } from '@fams/v5-composer'
import { RecordTable, type RecordTableColumn } from './RecordTable'

const record: EntityRecord = {
  id: 'cp1',
  title: 'Beige Bluffs',
  attendanceLog: [
    { id: 'a1', guard: 'Ali Sheikh', date: '01 May, 25', status: 'SCHEDULED' },
    { id: 'a2', guard: 'Sara Ahmed', date: '02 May, 25', status: 'COMPLETED' },
  ],
}

const columns: RecordTableColumn[] = [
  { key: 'guard', label: 'Guard Name', type: 'avatar' },
  { key: 'date', label: 'Date', type: 'datetime' },
  { key: 'status', label: 'Status', type: 'statusPill' },
]

describe('RecordTable', () => {
  it('renders rows from `record[field]`, one column per config entry', () => {
    render(<RecordTable field="attendanceLog" record={record} columns={columns} />)
    expect(screen.getByRole('columnheader', { name: 'Guard Name' })).toBeInTheDocument()
    expect(screen.getByText('Ali Sheikh')).toBeInTheDocument()
    expect(screen.getByText('Sara Ahmed')).toBeInTheDocument()
    expect(screen.getByText('01 May, 25')).toBeInTheDocument()
  })

  it('renders an empty table when `record[field]` is missing or not an array', () => {
    render(<RecordTable field="missingField" record={record} columns={columns} />)
    expect(screen.queryByText('Ali Sheikh')).not.toBeInTheDocument()
  })

  it('colors a statusPill column from `statusColors`, keyed by the raw value', () => {
    render(
      <RecordTable
        field="attendanceLog"
        record={record}
        columns={columns}
        statusColors={{ SCHEDULED: '#F17B2B', COMPLETED: '#2AAA48' }}
      />,
    )
    const scheduled = screen.getByText('SCHEDULED')
    expect(scheduled).toHaveStyle({ backgroundColor: '#F17B2B' })
    const completed = screen.getByText('COMPLETED')
    expect(completed).toHaveStyle({ backgroundColor: '#2AAA48' })
  })

  it('shows a search box that filters rows client-side across every configured column', () => {
    render(<RecordTable field="attendanceLog" record={record} columns={columns} search />)
    expect(screen.getByText('Ali Sheikh')).toBeInTheDocument()
    expect(screen.getByText('Sara Ahmed')).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('Search anything here'), { target: { value: 'sara' } })
    expect(screen.queryByText('Ali Sheikh')).not.toBeInTheDocument()
    expect(screen.getByText('Sara Ahmed')).toBeInTheDocument()
  })

  it('renders no toolbar when neither `search` nor `timeframeSelect` is set', () => {
    render(<RecordTable field="attendanceLog" record={record} columns={columns} />)
    expect(document.querySelector('[data-slot="record-table-toolbar"]')).not.toBeInTheDocument()
  })

  it('shows a "Select Time Frame" affordance when `timeframeSelect` is set', () => {
    render(<RecordTable field="attendanceLog" record={record} columns={columns} timeframeSelect />)
    expect(screen.getByText('Select Time Frame')).toBeInTheDocument()
  })

  it('renders a progress column via TableCell kind="progress" — caption, tone and empty state', () => {
    const progressColumns: RecordTableColumn[] = [
      {
        key: 'odometerReading',
        label: 'Odometer Reading',
        type: 'progress',
        targetKey: 'odometerTarget',
        unit: 'km',
        tone: 'warning',
      },
      { key: 'engineHours', label: 'Engine Hours', type: 'progress', targetKey: 'engineHoursTarget', unit: 'hrs' },
    ]
    const rec: EntityRecord = {
      id: 'r1',
      title: 'x',
      rules: [{ id: 'p1', odometerReading: 3800, odometerTarget: 5000, engineHours: undefined, engineHoursTarget: 5000 }],
    }
    const { container } = render(<RecordTable field="rules" record={rec} columns={progressColumns} />)

    // Odometer Reading: real reading -> caption + derived percentage.
    expect(screen.getByText('3,800 / 5,000 km')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '76')
    expect(container.querySelector('[data-slot="progress"]')).toHaveClass(
      '[&_[data-slot=progress-indicator]]:bg-warning',
    )

    // Engine Hours: no data on this rule -> grey empty track + dash, never a false 0%.
    expect(screen.getByText('–')).toBeInTheDocument()
    expect(container.querySelector('[data-slot="table-cell-progress-empty-track"]')).toBeInTheDocument()
  })

  // fix7 wave 6, P1: `RecordTable`'s progress column used to pass `column.tone`
  // straight through, so a placement authoring no explicit tone rendered every
  // bar with `TableCell`'s fixed `primary` fill — the same data that varies
  // green/orange/red through `ReadProgressMeter` (the standalone PM detail's
  // renderer) read as one flat blue here. Pins that this column now shares
  // `ReadProgressMeter`'s `computeThresholdTone` instead of a second copy.
  describe('progress column — threshold-computed tone (no explicit `tone`)', () => {
    const fillClassOf = (container: HTMLElement) =>
      Array.from(container.querySelector('[data-slot="progress"]')?.classList ?? []).find((c) =>
        c.startsWith('[&_[data-slot=progress-indicator]]:bg-'),
      )

    it('renders danger when the value is at or over its target', () => {
      const cols: RecordTableColumn[] = [
        { key: 'value', label: 'Odometer', type: 'progress', targetKey: 'target', unit: 'km' },
      ]
      const rec: EntityRecord = { id: 'r1', title: 'x', rows: [{ id: 'p1', value: 5200, target: 5000 }] }
      const { container } = render(<RecordTable field="rows" record={rec} columns={cols} />)
      expect(fillClassOf(container)).toBe('[&_[data-slot=progress-indicator]]:bg-destructive')
    })

    it('renders warning when the value is closing in on its target (>= 80%, < 100%)', () => {
      const cols: RecordTableColumn[] = [
        { key: 'value', label: 'Odometer', type: 'progress', targetKey: 'target', unit: 'km' },
      ]
      const rec: EntityRecord = { id: 'r1', title: 'x', rows: [{ id: 'p1', value: 4200, target: 5000 }] }
      const { container } = render(<RecordTable field="rows" record={rec} columns={cols} />)
      expect(fillClassOf(container)).toBe('[&_[data-slot=progress-indicator]]:bg-warning')
    })

    it('renders success when the value is well under its target', () => {
      const cols: RecordTableColumn[] = [
        { key: 'value', label: 'Odometer', type: 'progress', targetKey: 'target', unit: 'km' },
      ]
      const rec: EntityRecord = { id: 'r1', title: 'x', rows: [{ id: 'p1', value: 1000, target: 5000 }] }
      const { container } = render(<RecordTable field="rows" record={rec} columns={cols} />)
      expect(fillClassOf(container)).toBe('[&_[data-slot=progress-indicator]]:bg-success')
    })

    it('still honors an explicit `column.tone` over the computed one', () => {
      const cols: RecordTableColumn[] = [
        { key: 'value', label: 'Odometer', type: 'progress', targetKey: 'target', unit: 'km', tone: 'primary' },
      ]
      // Would compute `danger` (over target) — the explicit tone must still win.
      const rec: EntityRecord = { id: 'r1', title: 'x', rows: [{ id: 'p1', value: 5200, target: 5000 }] }
      const { container } = render(<RecordTable field="rows" record={rec} columns={cols} />)
      expect(fillClassOf(container)).toBe('[&_[data-slot=progress-indicator]]:bg-primary')
    })
  })

  it('renders idChip and photo column types', () => {
    const idPhotoColumns: RecordTableColumn[] = [
      { key: 'id', label: 'Incident ID', type: 'idChip' },
      { key: 'photo', label: 'Photos', type: 'photo' },
    ]
    const rec: EntityRecord = {
      id: 'i1',
      title: 'x',
      incidents: [{ id: 'IN-1', photo: 'https://example.com/p.jpg' }],
    }
    render(<RecordTable field="incidents" record={rec} columns={idPhotoColumns} />)
    expect(screen.getByText('IN-1')).toBeInTheDocument()
    expect(within(screen.getByRole('table')).getByRole('img')).toHaveAttribute('src', 'https://example.com/p.jpg')
  })

  it('renders `rows` directly, bypassing `record[field]`, and wins when both are given', () => {
    const rows = [{ id: 'x1', guard: 'Zara Khan', date: '03 May, 25', status: 'SCHEDULED' }]
    render(<RecordTable rows={rows} record={record} field="attendanceLog" columns={columns} />)
    expect(screen.getByText('Zara Khan')).toBeInTheDocument()
    // `record.attendanceLog`'s own rows must NOT also render — `rows` wins outright, not merges.
    expect(screen.queryByText('Ali Sheikh')).not.toBeInTheDocument()
  })

  it('renders no rows when neither `rows` nor `field`/`record` resolve to an array', () => {
    render(<RecordTable rows={undefined} columns={columns} />)
    expect(screen.queryByText('Ali Sheikh')).not.toBeInTheDocument()
  })

  it('`onRowClick` fires on row activation (click and keyboard Enter) with the row + index', () => {
    const onRowClick = vi.fn()
    render(<RecordTable field="attendanceLog" record={record} columns={columns} onRowClick={onRowClick} />)
    const row = screen.getByText('Ali Sheikh').closest('tr')!
    fireEvent.click(row)
    expect(onRowClick).toHaveBeenCalledWith({ id: 'a1', guard: 'Ali Sheikh', date: '01 May, 25', status: 'SCHEDULED' }, 0)

    fireEvent.keyDown(row, { key: 'Enter' })
    expect(onRowClick).toHaveBeenCalledTimes(2)
  })

  it('renders no `onRowClick` — rows stay inert with no cursor/keyboard affordance', () => {
    render(<RecordTable field="attendanceLog" record={record} columns={columns} />)
    const row = screen.getByText('Ali Sheikh').closest('tr')!
    expect(row).not.toHaveAttribute('tabindex')
  })

  it('`searchPlaceholder` overrides the default search input placeholder/label', () => {
    render(<RecordTable field="attendanceLog" record={record} columns={columns} search searchPlaceholder="Find a rule" />)
    expect(screen.getByPlaceholderText('Find a rule')).toBeInTheDocument()
    expect(screen.getByLabelText('Find a rule')).toBeInTheDocument()
  })
  // ── Round 5 visual-gate regressions ──────────────────────────────────────
  // A scoped tab rendered raw storage values next to the same data formatted
  // correctly elsewhere in the app. Each of these pins one of those.

  it('formats a `datetime` column instead of printing the stored ISO value', () => {
    render(
      <RecordTable
        rows={[{ due: '2026-08-28' }]}
        columns={[{ key: 'due', label: 'Due Date', type: 'datetime' }]}
      />,
    )
    expect(screen.getByText('28 Aug, 2026')).toBeInTheDocument()
    expect(screen.queryByText('2026-08-28')).not.toBeInTheDocument()
  })

  it('leaves an unparseable `datetime` value verbatim rather than rendering "Invalid Date"', () => {
    render(
      <RecordTable rows={[{ due: 'TBC' }]} columns={[{ key: 'due', label: 'Due Date', type: 'datetime' }]} />,
    )
    expect(screen.getByText('TBC')).toBeInTheDocument()
  })

  it('groups a `number` column and appends its unit', () => {
    render(
      <RecordTable
        rows={[{ odo: 113452 }]}
        columns={[{ key: 'odo', label: 'Odometer', type: 'number', unit: 'km' }]}
      />,
    )
    expect(screen.getByText('113,452')).toBeInTheDocument()
    expect(screen.getByText('km')).toBeInTheDocument()
  })

  it('humanizes a `statusPill` key when the caller supplies no `statusLabels`', () => {
    render(
      <RecordTable
        rows={[{ status: 'reported-issues' }]}
        columns={[{ key: 'status', label: 'Status', type: 'statusPill' }]}
      />,
    )
    expect(screen.getByText('Reported Issues')).toBeInTheDocument()
  })

  it('still prefers an explicit `statusLabels` entry over the humanized fallback', () => {
    render(
      <RecordTable
        rows={[{ status: 'jobOrderCreated' }]}
        columns={[{ key: 'status', label: 'Status', type: 'statusPill' }]}
        statusLabels={{ jobOrderCreated: 'Job Order Raised' }}
      />,
    )
    expect(screen.getByText('Job Order Raised')).toBeInTheDocument()
  })
})
