import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DestructiveActionModal, type DestructiveActionModalProps } from './DestructiveActionModal'

function Fixture(props: Partial<DestructiveActionModalProps> & { onConfirm?: DestructiveActionModalProps['onConfirm'] }) {
  const [open, setOpen] = useState(true)
  return (
    <DestructiveActionModal
      open={open}
      onOpenChange={setOpen}
      title="Delete this record?"
      description="This action cannot be undone."
      onConfirm={props.onConfirm ?? (() => {})}
      {...props}
    />
  )
}

describe('DestructiveActionModal', () => {
  it('renders nothing when closed', () => {
    render(<Fixture open={false} onOpenChange={() => {}} />)
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('shows title and description when open', () => {
    render(<Fixture />)
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(screen.getByText('Delete this record?')).toBeInTheDocument()
    expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument()
  })

  it('omits the consequences block when none are given', () => {
    render(<Fixture />)
    expect(screen.queryByText('Consequences')).not.toBeInTheDocument()
  })

  it('lists every consequence when given', () => {
    render(<Fixture consequences={['Removes all assignments', 'Revokes portal access']} />)
    expect(screen.getByText('Consequences')).toBeInTheDocument()
    expect(screen.getByText('Removes all assignments')).toBeInTheDocument()
    expect(screen.getByText('Revokes portal access')).toBeInTheDocument()
  })

  it('confirms immediately with no confirmKeyword or reason configured', () => {
    const onConfirm = vi.fn()
    render(<Fixture onConfirm={onConfirm} />)
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(onConfirm).toHaveBeenCalledWith(undefined)
  })

  it('disables Confirm until the typed keyword matches exactly', () => {
    render(<Fixture confirmKeyword="DELETE" />)
    const confirmButton = screen.getByRole('button', { name: 'Confirm' })
    expect(confirmButton).toBeDisabled()

    fireEvent.change(screen.getByRole('textbox', { name: /type delete to confirm/i }), {
      target: { value: 'delete' },
    })
    expect(confirmButton).toBeDisabled()

    fireEvent.change(screen.getByRole('textbox', { name: /type delete to confirm/i }), {
      target: { value: 'DELETE' },
    })
    expect(confirmButton).toBeEnabled()
  })

  it('disables Confirm until a required reason is filled, but not for an optional one', () => {
    const { unmount } = render(<Fixture reason="required" />)
    const confirmButton = screen.getByRole('button', { name: 'Confirm' })
    expect(confirmButton).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Duplicate entry' } })
    expect(confirmButton).toBeEnabled()
    unmount()

    render(<Fixture reason="optional" />)
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeEnabled()
  })

  it('passes the trimmed reason to onConfirm when a reason field is present', () => {
    const onConfirm = vi.fn()
    render(<Fixture reason="optional" onConfirm={onConfirm} />)
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: '  Duplicate entry  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(onConfirm).toHaveBeenCalledWith('Duplicate entry')
  })

  it('closes on Cancel without calling onConfirm', () => {
    const onConfirm = vi.fn()
    render(<Fixture onConfirm={onConfirm} />)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onConfirm).not.toHaveBeenCalled()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('disables Cancel and Confirm while loading, and marks Confirm busy', () => {
    render(<Fixture loading />)
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    const confirmButton = screen.getByRole('button', { name: 'Confirm' })
    expect(confirmButton).toBeDisabled()
    expect(confirmButton).toHaveAttribute('aria-busy', 'true')
  })

  it('does not close when Cancel is clicked while loading', () => {
    render(<Fixture loading />)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })
})
