import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { Input } from './Input'

describe('Input', () => {
  it('renders an input', () => {
    render(<Input placeholder="name" />)
    expect(screen.getByPlaceholderText('name')).toBeInTheDocument()
  })

  it('fires onChange while typing', () => {
    const onChange = vi.fn()
    render(<Input placeholder="name" onChange={onChange} />)
    fireEvent.change(screen.getByPlaceholderText('name'), {
      target: { value: 'abc' },
    })
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('applies the error border class when hasError', () => {
    render(<Input hasError placeholder="name" />)
    expect(screen.getByPlaceholderText('name')).toHaveClass('border-destructive')
  })

  it('renders a leading icon and pads the input to avoid overlap', () => {
    render(<Input placeholder="name" leadingIcon={<span data-testid="lead-icon">*</span>} />)
    expect(screen.getByTestId('lead-icon')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('name')).toHaveClass('ps-9')
  })

  it('renders a trailing icon and pads the input to avoid overlap', () => {
    render(<Input placeholder="name" trailingIcon={<span data-testid="trail-icon">*</span>} />)
    expect(screen.getByTestId('trail-icon')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('name')).toHaveClass('pe-9')
  })

  it('renders both icon slots together without disturbing the default padding side', () => {
    render(
      <Input
        placeholder="name"
        leadingIcon={<span data-testid="lead-icon">*</span>}
        trailingIcon={<span data-testid="trail-icon">*</span>}
      />,
    )
    const inputEl = screen.getByPlaceholderText('name')
    expect(screen.getByTestId('lead-icon')).toBeInTheDocument()
    expect(screen.getByTestId('trail-icon')).toBeInTheDocument()
    expect(inputEl).toHaveClass('ps-9')
    expect(inputEl).toHaveClass('pe-9')
  })

  it('marks icon slots as decorative for screen readers', () => {
    render(<Input placeholder="name" leadingIcon={<span data-testid="lead-icon">*</span>} />)
    expect(screen.getByTestId('lead-icon').parentElement).toHaveAttribute('aria-hidden')
  })

  it('does not render an icon wrapper when no icon slots are provided', () => {
    render(<Input placeholder="name" />)
    expect(screen.getByPlaceholderText('name').parentElement).not.toHaveClass('relative')
  })

  it('supports icon slots alongside the floating label', () => {
    render(<Input label="Name" leadingIcon={<span data-testid="lead-icon">*</span>} />)
    expect(screen.getByTestId('lead-icon')).toBeInTheDocument()
    expect(screen.getByText('Name')).toBeInTheDocument()
  })

  it('is disabled when the native disabled prop is set', () => {
    render(<Input placeholder="name" disabled />)
    expect(screen.getByPlaceholderText('name')).toBeDisabled()
  })

  it('is disabled when the deprecated isDisabled alias is set', () => {
    render(<Input placeholder="name" isDisabled />)
    expect(screen.getByPlaceholderText('name')).toBeDisabled()
  })

  it('prefers native disabled over the deprecated isDisabled alias when both are set', () => {
    render(<Input placeholder="name" disabled={false} isDisabled />)
    expect(screen.getByPlaceholderText('name')).not.toBeDisabled()
  })

  it('is disabled when the native disabled prop is set on the floating-label variant', () => {
    render(<Input label="Name" disabled />)
    expect(screen.getByLabelText('Name')).toBeDisabled()
  })

  describe('password visibility toggle (revealable)', () => {
    it('renders a "Show password" toggle for a revealable password field', () => {
      render(<Input label="Password" type="password" revealable />)
      expect(screen.getByRole('button', { name: 'Show password' })).toBeInTheDocument()
      expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password')
    })

    it('reveals and re-masks the value on toggle, swapping the accessible name', () => {
      render(<Input label="Password" type="password" revealable defaultValue="hunter2" />)
      const input = screen.getByLabelText('Password')
      fireEvent.click(screen.getByRole('button', { name: 'Show password' }))
      expect(input).toHaveAttribute('type', 'text')
      fireEvent.click(screen.getByRole('button', { name: 'Hide password' }))
      expect(input).toHaveAttribute('type', 'password')
    })

    it('preserves the value across toggling', () => {
      render(<Input label="Password" type="password" revealable defaultValue="hunter2" />)
      fireEvent.click(screen.getByRole('button', { name: 'Show password' }))
      expect(screen.getByLabelText('Password')).toHaveValue('hunter2')
    })

    it('works on the plain (label-less) variant too', () => {
      render(<Input aria-label="Password" type="password" revealable />)
      expect(screen.getByRole('button', { name: 'Show password' })).toBeInTheDocument()
    })

    it('renders no toggle for non-password types', () => {
      render(<Input label="Name" revealable />)
      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })

    it('renders no toggle in bare mode (the shell owns chrome)', () => {
      render(<Input aria-label="Password" type="password" revealable bare />)
      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })

    it('the toggle takes the trailing slot over a passed trailingIcon', () => {
      render(
        <Input
          label="Password"
          type="password"
          revealable
          trailingIcon={<span data-testid="trail-icon">*</span>}
        />,
      )
      expect(screen.queryByTestId('trail-icon')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Show password' })).toBeInTheDocument()
    })

    it('toggle is disabled alongside the input', () => {
      render(<Input label="Password" type="password" revealable disabled />)
      expect(screen.getByRole('button', { name: 'Show password' })).toBeDisabled()
    })

    it('still works with hasError and keeps the error state', () => {
      render(<Input label="Password" type="password" revealable hasError defaultValue="x" />)
      const input = screen.getByLabelText('Password')
      expect(input).toHaveAttribute('aria-invalid', 'true')
      fireEvent.click(screen.getByRole('button', { name: 'Show password' }))
      expect(input).toHaveAttribute('type', 'text')
      expect(input).toHaveAttribute('aria-invalid', 'true')
    })
  })

  it('uses the emphasis label token on the errored floating label', () => {
    render(<Input label="Email" hasError />)
    expect(screen.getByText('Email')).toHaveClass('text-destructive-emphasis')
  })

  describe('fields-spec additions (Figma 4802:2485)', () => {
    it('renders hint text tied to the input via aria-describedby', () => {
      render(<Input label="Email" hint="This is a hint text to help user." />)
      const input = screen.getByLabelText('Email')
      const hint = screen.getByText('This is a hint text to help user.')
      expect(input.getAttribute('aria-describedby')).toBe(hint.id)
    })

    // fix7 wave 6, P2 sweep: the hint used the bare `text-destructive` fill
    // token (3.76:1/3.91:1, failing AA) while the label right above it
    // already used the accessible `-emphasis` alias — now consistent.
    it('hint turns the accessible destructive-emphasis tone and becomes an alert on error', () => {
      render(<Input label="Email" hint="Bad" hasError />)
      const hint = screen.getByRole('alert')
      expect(hint).toHaveTextContent('Bad')
      expect(hint).toHaveClass('text-destructive-emphasis')
      expect(hint).not.toHaveClass('text-destructive')
    })

    it('renders a required asterisk in the floating label', () => {
      render(<Input label="Email" required />)
      expect(screen.getByText('*')).toBeInTheDocument()
    })

    it('renders suffix (unit) text', () => {
      render(<Input label="Weight" suffix="kg" />)
      expect(screen.getByText('kg')).toBeInTheDocument()
    })

    it('renders hint under a plain (unlabeled) input too', () => {
      render(<Input placeholder="Search" hint="Plain hint" />)
      expect(screen.getByText('Plain hint')).toBeInTheDocument()
    })
  })
})
