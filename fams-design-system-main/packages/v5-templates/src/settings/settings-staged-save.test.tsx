import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { StagedSaveBar } from './StagedSaveBar'
import { StepUpVerifyDialog } from './StepUpVerifyDialog'
import { VerificationCodeInput } from './VerificationCodeInput'

describe('StagedSaveBar', () => {
  it('renders nothing while nothing is pending', () => {
    const { container } = render(
      <StagedSaveBar pendingCount={0} onDiscard={() => {}} onSave={() => {}} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('reports the pending count (singular / plural) and fires both actions', () => {
    const onDiscard = vi.fn()
    const onSave = vi.fn()
    const { rerender } = render(
      <StagedSaveBar pendingCount={1} onDiscard={onDiscard} onSave={onSave} />,
    )
    expect(screen.getByRole('status')).toHaveTextContent('1 change pending')
    rerender(<StagedSaveBar pendingCount={3} onDiscard={onDiscard} onSave={onSave} />)
    expect(screen.getByRole('status')).toHaveTextContent('3 changes pending')
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(onDiscard).toHaveBeenCalledOnce()
    expect(onSave).toHaveBeenCalledOnce()
  })

  it('saving disables Discard', () => {
    render(<StagedSaveBar pendingCount={2} saving onDiscard={() => {}} onSave={() => {}} />)
    expect(screen.getByRole('button', { name: 'Discard' })).toBeDisabled()
  })

  it('a custom message overrides the default line', () => {
    render(
      <StagedSaveBar pendingCount={2} message="2 features staged" onDiscard={() => {}} onSave={() => {}} />,
    )
    expect(screen.getByRole('status')).toHaveTextContent('2 features staged')
  })
})

describe('VerificationCodeInput', () => {
  function Harness({ length = 6, onComplete }: { length?: number; onComplete?: () => void }) {
    const [digits, setDigits] = useState<string[]>(() => Array<string>(length).fill(''))
    return (
      <VerificationCodeInput digits={digits} onChange={setDigits} onComplete={onComplete} />
    )
  }

  it('labels the group and every cell', () => {
    render(<Harness />)
    expect(screen.getByRole('group', { name: '6-digit verification code' })).toBeInTheDocument()
    expect(screen.getAllByRole('textbox')).toHaveLength(6)
    expect(screen.getByLabelText('Digit 1')).toHaveAttribute('autocomplete', 'one-time-code')
  })

  it('typing advances the caret and non-digits are rejected', () => {
    render(<Harness />)
    const cells = screen.getAllByRole('textbox')
    fireEvent.change(cells[0], { target: { value: '4' } })
    expect(cells[0]).toHaveValue('4')
    expect(cells[1]).toHaveFocus()
    fireEvent.change(cells[1], { target: { value: 'x' } })
    expect(cells[1]).toHaveValue('')
  })

  it('a pasted code spills across the row', () => {
    render(<Harness />)
    const cells = screen.getAllByRole('textbox')
    fireEvent.change(cells[0], { target: { value: '123456' } })
    expect(cells.map((c) => (c as HTMLInputElement).value)).toEqual(['1', '2', '3', '4', '5', '6'])
  })

  it('Backspace on an empty cell clears and focuses the previous one', () => {
    render(<Harness />)
    const cells = screen.getAllByRole('textbox')
    fireEvent.change(cells[0], { target: { value: '7' } })
    fireEvent.keyDown(cells[1], { key: 'Backspace' })
    expect(cells[0]).toHaveValue('')
    expect(cells[0]).toHaveFocus()
  })

  it('Enter on a complete code fires onComplete', () => {
    const onComplete = vi.fn()
    render(<Harness onComplete={onComplete} />)
    const cells = screen.getAllByRole('textbox')
    fireEvent.change(cells[0], { target: { value: '111111' } })
    fireEvent.keyDown(cells[5], { key: 'Enter' })
    expect(onComplete).toHaveBeenCalledOnce()
  })
})

describe('StepUpVerifyDialog', () => {
  const base = {
    open: true,
    onClose: () => {},
    onVerified: () => {},
    email: 'ops@tadweer.ae',
  }

  it('names the destination inbox and disables Verify until the code is complete', () => {
    render(<StepUpVerifyDialog {...base} />)
    expect(screen.getByText('ops@tadweer.ae')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Verify' })).toBeDisabled()
  })

  it('hands the completed code to onVerified', () => {
    const onVerified = vi.fn()
    render(<StepUpVerifyDialog {...base} onVerified={onVerified} />)
    fireEvent.change(screen.getByLabelText('Digit 1'), { target: { value: '246810' } })
    const verify = screen.getByRole('button', { name: 'Verify' })
    expect(verify).toBeEnabled()
    fireEvent.click(verify)
    expect(onVerified).toHaveBeenCalledWith('246810')
  })

  it('resend is on cooldown, then enabled', () => {
    vi.useFakeTimers()
    const onResend = vi.fn()
    render(<StepUpVerifyDialog {...base} onResend={onResend} resendSeconds={2} />)
    expect(screen.getByRole('button', { name: /Resend in/ })).toBeDisabled()
    // Each tick is a fresh setTimeout registered by an effect, so the timer
    // chain only advances one commit at a time.
    for (let i = 0; i < 3; i += 1) act(() => void vi.advanceTimersByTime(1000))
    const resend = screen.getByRole('button', { name: 'Resend code' })
    fireEvent.click(resend)
    expect(onResend).toHaveBeenCalledOnce()
    vi.useRealTimers()
  })

  it('a host error is announced and replaces the resend line', () => {
    render(<StepUpVerifyDialog {...base} onResend={() => {}} error="That code has expired." />)
    expect(screen.getByRole('alert')).toHaveTextContent('That code has expired.')
    expect(screen.queryByRole('button', { name: /Resend/ })).not.toBeInTheDocument()
    expect(screen.getByLabelText('Digit 1')).toHaveAttribute('aria-invalid', 'true')
  })

  it('Cancel closes', () => {
    const onClose = vi.fn()
    render(<StepUpVerifyDialog {...base} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
