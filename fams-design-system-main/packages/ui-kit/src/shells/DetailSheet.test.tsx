import { useState, type ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DetailSheet, FormSheet } from './DetailSheet'

function DetailSheetFixture({
  onOpenChange,
  footer,
  width,
}: {
  onOpenChange?: (open: boolean) => void
  footer?: ReactNode
  width?: 'sm' | 'md' | 'lg'
}) {
  const [open, setOpen] = useState(true)
  return (
    <DetailSheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        onOpenChange?.(next)
      }}
      title="Truck AUH-4021"
      subtitle="Lot 1 · Lavajet"
      actions={<button type="button">Edit</button>}
      footer={footer}
      width={width}
    >
      <p>Record body content.</p>
    </DetailSheet>
  )
}

describe('DetailSheet', () => {
  it('renders the title, subtitle, actions, and body when open', () => {
    render(<DetailSheetFixture />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Truck AUH-4021')).toBeInTheDocument()
    expect(screen.getByText('Lot 1 · Lavajet')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    expect(screen.getByText('Record body content.')).toBeInTheDocument()
  })

  it('is absent from the document when closed', () => {
    render(
      <DetailSheet open={false} onOpenChange={() => {}} title="Truck AUH-4021">
        <p>Record body content.</p>
      </DetailSheet>,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('omits the footer entirely when not provided', () => {
    render(<DetailSheetFixture />)
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()
  })

  it('renders the footer when provided', () => {
    render(<DetailSheetFixture footer={<button type="button">Save</button>} />)
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
  })

  it('closes via the header close control', () => {
    const onOpenChange = vi.fn()
    render(<DetailSheetFixture onOpenChange={onOpenChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('applies the requested width preset to the panel', () => {
    render(<DetailSheetFixture width="lg" />)
    expect(screen.getByRole('dialog')).toHaveClass('sm:max-w-7xl')
  })

  it('defaults to the md width preset', () => {
    render(<DetailSheetFixture />)
    expect(screen.getByRole('dialog')).toHaveClass('sm:max-w-5xl')
  })
})

function FormSheetFixture({
  onCancel,
  onSave = vi.fn(),
  loading = false,
  saveDisabled = false,
}: {
  onCancel?: () => void
  onSave?: () => void
  loading?: boolean
  saveDisabled?: boolean
}) {
  const [open, setOpen] = useState(true)
  return (
    <FormSheet
      open={open}
      onOpenChange={setOpen}
      title="New bin"
      onCancel={onCancel}
      onSave={onSave}
      loading={loading}
      saveDisabled={saveDisabled}
    >
      <label htmlFor="bin-code">Bin code</label>
      <input id="bin-code" />
    </FormSheet>
  )
}

describe('FormSheet', () => {
  it('renders the title and the field body', () => {
    render(<FormSheetFixture />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('New bin')).toBeInTheDocument()
    expect(screen.getByLabelText('Bin code')).toBeInTheDocument()
  })

  it('calls onSave without closing itself', () => {
    const onSave = vi.fn()
    render(<FormSheetFixture onSave={onSave} />)
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('calls onCancel and closes when Cancel is clicked', () => {
    const onCancel = vi.fn()
    render(<FormSheetFixture onCancel={onCancel} />)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('closes on Cancel without an onCancel handler', () => {
    render(<FormSheetFixture />)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('disables Save when saveDisabled is set', () => {
    render(<FormSheetFixture saveDisabled />)
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })

  it('disables Cancel, Save, and the close control while loading', () => {
    render(<FormSheetFixture loading />)
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Close' })).toBeDisabled()
  })

  it('suppresses dismiss while loading', () => {
    const onSave = vi.fn()
    render(<FormSheetFixture loading onSave={onSave} />)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
