import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RecordLayout, DetailSection, FieldGrid } from './RecordLayout'

describe('RecordLayout', () => {
  it('renders the title and main column children', () => {
    render(
      <RecordLayout title="WO-4821">
        <div>Section body</div>
      </RecordLayout>,
    )
    expect(screen.getByText('WO-4821')).toBeInTheDocument()
    expect(screen.getByText('Section body')).toBeInTheDocument()
  })

  it('renders the optional header slots', () => {
    render(
      <RecordLayout
        title="WO-4821"
        icon={<span>icon</span>}
        category="Work order"
        subtitle="Created 2 days ago"
        status={<span>Open</span>}
        meta={<span>Priority: High</span>}
        actions={<button>Edit</button>}
      >
        <div>Section body</div>
      </RecordLayout>,
    )
    expect(screen.getByText('icon')).toBeInTheDocument()
    expect(screen.getByText('Work order')).toBeInTheDocument()
    expect(screen.getByText('Created 2 days ago')).toBeInTheDocument()
    expect(screen.getByText('Open')).toBeInTheDocument()
    expect(screen.getByText('Priority: High')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
  })

  it('omits the header slots that are not provided', () => {
    render(
      <RecordLayout title="WO-4821">
        <div>Section body</div>
      </RecordLayout>,
    )
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('renders the aside slot when provided', () => {
    render(
      <RecordLayout title="WO-4821" aside={<div>Key facts</div>}>
        <div>Section body</div>
      </RecordLayout>,
    )
    expect(screen.getByText('Key facts')).toBeInTheDocument()
  })

  it('renders no aside column when the slot is omitted', () => {
    render(
      <RecordLayout title="WO-4821">
        <div>Section body</div>
      </RecordLayout>,
    )
    expect(screen.queryByText('Key facts')).not.toBeInTheDocument()
  })
})

describe('DetailSection', () => {
  it('renders a title and its body', () => {
    render(<DetailSection title="Overview">Body content</DetailSection>)
    expect(screen.getByRole('heading', { name: 'Overview' })).toBeInTheDocument()
    expect(screen.getByText('Body content')).toBeInTheDocument()
  })

  it('renders without a title (no header row)', () => {
    render(<DetailSection>Body content</DetailSection>)
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
    expect(screen.getByText('Body content')).toBeInTheDocument()
  })

  it('renders header actions alongside the title', () => {
    render(
      <DetailSection title="Overview" actions={<button>Expand</button>}>
        Body content
      </DetailSection>,
    )
    expect(screen.getByRole('button', { name: 'Expand' })).toBeInTheDocument()
  })
})

describe('FieldGrid', () => {
  const FIELDS = [
    { id: 'plate', label: 'Plate number', value: 'DXB-12345' },
    { id: 'lot', label: 'Lot', value: undefined },
  ]

  it('renders each label/value pair', () => {
    render(<FieldGrid fields={FIELDS} />)
    expect(screen.getByText('Plate number')).toBeInTheDocument()
    expect(screen.getByText('DXB-12345')).toBeInTheDocument()
  })

  it('renders an em dash for a missing value', () => {
    render(<FieldGrid fields={FIELDS} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('defaults to a 2-column grid and respects the columns prop', () => {
    const { rerender } = render(<FieldGrid data-testid="grid" fields={FIELDS} />)
    expect(screen.getByTestId('grid')).toHaveClass('sm:grid-cols-2')
    rerender(<FieldGrid data-testid="grid" fields={FIELDS} columns={3} />)
    expect(screen.getByTestId('grid')).toHaveClass('lg:grid-cols-3')
  })

  describe('layout="rows"', () => {
    it('renders each row with a bottom border except the last', () => {
      render(<FieldGrid layout="rows" fields={FIELDS} />)
      const plateRow = screen.getByText('Plate number').closest('div')
      const lotRow = screen.getByText('Lot').closest('div')
      expect(plateRow).toHaveClass('border-b')
      expect(lotRow).not.toHaveClass('border-b')
    })

    it('still renders an em dash for a missing value', () => {
      render(<FieldGrid layout="rows" fields={FIELDS} />)
      expect(screen.getByText('—')).toBeInTheDocument()
    })

    it('renders the label in the accessible field-label role, not gray-400 (fix7, A7 gate blocker)', () => {
      render(<FieldGrid layout="rows" fields={FIELDS} />)
      const label = screen.getByText('Plate number')
      expect(label).toHaveClass('text-muted-foreground-strong')
      expect(label).not.toHaveClass('text-gray-400')
    })
  })

  describe('layout="inline"', () => {
    it('renders label and value side by side with a fixed label width', () => {
      render(<FieldGrid layout="inline" fields={FIELDS} />)
      const label = screen.getByText('Plate number')
      expect(label).toHaveStyle({ width: '7.25rem' })
      expect(screen.getByText('DXB-12345')).toBeInTheDocument()
    })

    it('still renders an em dash for a missing value', () => {
      render(<FieldGrid layout="inline" fields={FIELDS} />)
      expect(screen.getByText('—')).toBeInTheDocument()
    })

    it('regular emphasis (default) keeps the muted-foreground label color', () => {
      render(<FieldGrid layout="inline" fields={FIELDS} />)
      expect(screen.getByText('Plate number')).toHaveClass('text-muted-foreground')
    })

    it('strong emphasis renders the accessible field-label role, not gray-400 (fix7, A7 gate blocker)', () => {
      render(<FieldGrid layout="inline" emphasis="strong" fields={FIELDS} />)
      const label = screen.getByText('Plate number')
      expect(label).toHaveClass('text-muted-foreground-strong')
      expect(label).not.toHaveClass('text-gray-400')
    })

    it('accepts a custom labelWidth (e.g. the Ticket Detail page\'s 145px column)', () => {
      render(<FieldGrid layout="inline" fields={FIELDS} labelWidth="9.0625rem" />)
      expect(screen.getByText('Plate number')).toHaveStyle({ width: '9.0625rem' })
    })
  })
})
