import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LoginPage } from './LoginPage'

const setup = (props: Partial<Parameters<typeof LoginPage>[0]> = {}) => {
  const onSubmit = vi.fn()
  const utils = render(
    <LoginPage
      logo={<span data-testid="logo">FAMS</span>}
      supportingText="Log in to FAMS for real-time visibility and operational control."
      brand={{ quote: 'Your Fleet, Our Technology, Total Control', subtext: 'Subtext' }}
      forgotPasswordHref="/forgot"
      onSubmit={onSubmit}
      {...props}
    />,
  )
  return { onSubmit, ...utils }
}

const email = () => screen.getByLabelText('Email') as HTMLInputElement
const password = () => screen.getByLabelText('Password') as HTMLInputElement
const submit = () => screen.getByRole('button', { name: 'Login' })

describe('LoginPage', () => {
  it('renders logo slot, heading, fields, brand quote and footer', () => {
    setup()
    expect(screen.getByTestId('logo')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Welcome' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Your Fleet, Our Technology, Total Control' })).toBeInTheDocument()
    expect(email()).toHaveAttribute('type', 'email')
    expect(password()).toHaveAttribute('type', 'password')
    expect(screen.getByRole('link', { name: 'Forgot password?' })).toHaveAttribute('href', '/forgot')
    expect(screen.getByRole('link', { name: 'www.fams.com' })).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })

  it('blocks submit on empty fields with per-field errors and focuses the first errored field', () => {
    const { onSubmit } = setup()
    fireEvent.click(submit())
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText('Email is required')).toBeInTheDocument()
    expect(screen.getByText('Password is required')).toBeInTheDocument()
    expect(email()).toHaveFocus()
    expect(email()).toHaveAttribute('aria-invalid', 'true')
    expect(email()).toHaveAttribute('aria-describedby', 'login-email-error')
  })

  it('rejects a malformed email on submit', () => {
    const { onSubmit } = setup()
    fireEvent.change(email(), { target: { value: 'not-an-email' } })
    fireEvent.change(password(), { target: { value: 'secret' } })
    fireEvent.click(submit())
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument()
  })

  it('clears a client error on input (not blur)', () => {
    setup()
    fireEvent.click(submit())
    expect(screen.getByText('Email is required')).toBeInTheDocument()
    fireEvent.change(email(), { target: { value: 'a' } })
    expect(screen.queryByText('Email is required')).toBeNull()
    // The password error remains until that field is edited.
    expect(screen.getByText('Password is required')).toBeInTheDocument()
  })

  it('submits trimmed credentials when valid (Enter path = form submit)', () => {
    const { onSubmit } = setup()
    fireEvent.change(email(), { target: { value: '  avery@fams.example ' } })
    fireEvent.change(password(), { target: { value: 'hunter2' } })
    fireEvent.submit(email().closest('form') as HTMLFormElement)
    expect(onSubmit).toHaveBeenCalledWith('avery@fams.example', 'hunter2')
  })

  it('reveals and re-masks the password via the eye toggle', () => {
    setup()
    fireEvent.change(password(), { target: { value: 'secret' } })
    fireEvent.click(screen.getByRole('button', { name: 'Show password' }))
    expect(password()).toHaveAttribute('type', 'text')
    fireEvent.click(screen.getByRole('button', { name: 'Hide password' }))
    expect(password()).toHaveAttribute('type', 'password')
  })

  it('shows the loading submit state and prevents double-submit', () => {
    const { onSubmit } = setup({ submitting: true })
    expect(submit()).toBeDisabled()
    fireEvent.submit(email().closest('form') as HTMLFormElement)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('renders a server error against both fields with shared aria-describedby, then dismisses on edit', () => {
    setup({ error: 'Invalid Email or Password!', errorNonce: 1 })
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Invalid Email or Password!')
    expect(alert).toHaveAttribute('id', 'login-error')
    expect(alert).toHaveFocus()
    expect(email()).toHaveAttribute('aria-invalid', 'true')
    expect(password()).toHaveAttribute('aria-invalid', 'true')
    expect(email()).toHaveAttribute('aria-describedby', 'login-error')
    expect(password()).toHaveAttribute('aria-describedby', 'login-error')
    // "Forgot password?" shares the row and stays visible.
    expect(screen.getByRole('link', { name: 'Forgot password?' })).toBeInTheDocument()
    // First keystroke clears the server error state.
    fireEvent.change(email(), { target: { value: 'x' } })
    expect(screen.queryByRole('alert')).toBeNull()
    expect(email()).not.toHaveAttribute('aria-invalid')
  })

  it('re-arms an identical server error when errorNonce bumps', () => {
    const { rerender } = setup({ error: 'Invalid Email or Password!', errorNonce: 1 })
    fireEvent.change(email(), { target: { value: 'x' } })
    expect(screen.queryByRole('alert')).toBeNull()
    rerender(
      <LoginPage onSubmit={vi.fn()} error="Invalid Email or Password!" errorNonce={2} forgotPasswordHref="/forgot" />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid Email or Password!')
  })

  it('reserves the remember-me slot behind the flag', () => {
    setup({ showRememberMe: true })
    expect(screen.getByLabelText('Remember me')).toBeInTheDocument()
  })

  // --- mobile composition (below `lg`) -------------------------------------

  it('renders the mobile brand header with the white logo and the brand backdrop', () => {
    setup({ brand: { background: 'linear-gradient(to bottom, #6E112D, #4B091D)', mobileLogo: <img data-testid="mobile-logo" alt="" src="/w.svg" /> } })
    const header = document.querySelector('[data-slot="login-mobile-brand"]')
    expect(header).not.toBeNull()
    expect(header).toContainElement(screen.getByTestId('mobile-logo'))
    // The desktop logo asset is dark-on-white — hidden below lg.
    expect(screen.getByTestId('logo').parentElement?.className).toContain('lg:flex')
    const backdrop = document.querySelector('[data-slot="login-mobile-backdrop"]') as HTMLElement
    expect(backdrop.style.background).toContain('linear-gradient')
  })

  it('omits the mobile brand header when no white logo asset is supplied', () => {
    setup()
    expect(document.querySelector('[data-slot="login-mobile-brand"]')).toBeNull()
  })

  it('gives the auth pane the mobile sheet treatment (large top corners, squared at lg)', () => {
    setup()
    const sheet = document.querySelector('[data-slot="login-sheet"]') as HTMLElement
    expect(sheet.className).toContain('rounded-t-sheet')
    expect(sheet.className).toContain('lg:rounded-none')
  })

  it('renders one heading by default and a separate mobile title only when it differs', () => {
    const { unmount } = setup()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Welcome')
    unmount()
    setup({ heading: 'Welcome', mobileHeading: 'Login via Credentials' })
    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1.querySelector('.lg\\:hidden')).toHaveTextContent('Login via Credentials')
    expect(h1.querySelector('.lg\\:inline')).toHaveTextContent('Welcome')
  })

  it('focuses the forgot-password link on click so it is the focus-restore target', () => {
    // Not all browsers focus links on mouse click; the link must still end up
    // as document.activeElement so a dialog opened from it returns focus here
    // on close (login round-2 P1 dialog-focus-not-returned).
    const onForgotPassword = vi.fn((e: { preventDefault: () => void }) => e.preventDefault())
    setup({ onForgotPassword })
    const link = screen.getByRole('link', { name: 'Forgot password?' })
    fireEvent.click(link)
    expect(onForgotPassword).toHaveBeenCalledTimes(1)
    expect(link).toHaveFocus()
  })
})
