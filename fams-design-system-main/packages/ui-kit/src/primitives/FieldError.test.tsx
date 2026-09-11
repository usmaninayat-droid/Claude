import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FieldError, FieldErrorSlot } from './FieldError'

describe('FieldError', () => {
  it('renders the message in an alert role', () => {
    render(<FieldError>Email is required</FieldError>)
    expect(screen.getByRole('alert')).toHaveTextContent('Email is required')
  })

  // fix7 wave 6, P2 sweep: the bare `text-destructive` fill token measured
  // 3.76:1/3.91:1 as this readable message's text color, failing WCAG AA —
  // moved to the accessible `-emphasis` alias (error.600, 4.83:1 on white).
  it('uses the accessible error-text token (destructive-emphasis / error.600), not the bare fill', () => {
    render(<FieldError>Invalid Email or Password!</FieldError>)
    expect(screen.getByRole('alert')).toHaveClass('text-destructive-emphasis')
    expect(screen.getByRole('alert')).not.toHaveClass('text-destructive')
  })

  it('renders a decorative alert-circle icon', () => {
    const { container } = render(<FieldError>Bad value</FieldError>)
    const icon = container.querySelector('svg')
    expect(icon).not.toBeNull()
    expect(icon!.getAttribute('aria-hidden')).toBe('true')
  })

  it('exposes the given id for aria-describedby wiring', () => {
    render(
      <>
        <input aria-label="Email" aria-invalid="true" aria-describedby="login-error" />
        <FieldError id="login-error">Invalid Email or Password!</FieldError>
      </>,
    )
    const input = screen.getByLabelText('Email')
    const message = screen.getByRole('alert')
    expect(message).toHaveAttribute('id', 'login-error')
    expect(input).toHaveAttribute('aria-describedby', 'login-error')
  })

  it('truncates the message to a single line when truncate is set', () => {
    render(<FieldError truncate>A very long translated validation message</FieldError>)
    expect(screen.getByText('A very long translated validation message')).toHaveClass('truncate')
  })

  it('does not truncate by default', () => {
    render(<FieldError>Short message</FieldError>)
    expect(screen.getByText('Short message')).not.toHaveClass('truncate')
  })

  it('passes className through', () => {
    render(<FieldError className="mt-2">Msg</FieldError>)
    expect(screen.getByRole('alert')).toHaveClass('mt-2')
  })
})

describe('FieldErrorSlot', () => {
  it('reserves the error row block size even when empty', () => {
    const { container } = render(<FieldErrorSlot />)
    const slot = container.querySelector('[data-slot="field-error-slot"]')
    expect(slot).not.toBeNull()
    expect(slot).toHaveClass('min-h-[1.125rem]')
  })

  it('renders a conditional FieldError inside the stable slot', () => {
    render(
      <FieldErrorSlot>
        <FieldError id="login-error">Invalid Email or Password!</FieldError>
      </FieldErrorSlot>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid Email or Password!')
  })
})
