import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { UserPopover } from './UserPopover'

function renderPopover(overrides: Partial<Parameters<typeof UserPopover>[0]> = {}) {
  return render(
    <UserPopover
      name="Avery Stone"
      email="avery@fams.example"
      trigger={<button type="button">User</button>}
      {...overrides}
    />,
  )
}

describe('UserPopover', () => {
  it('is closed until the trigger is clicked, then shows name and email', () => {
    renderPopover()
    expect(screen.queryByText('Avery Stone')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'User' }))
    expect(screen.getByText('Avery Stone')).toBeInTheDocument()
    expect(screen.getByText('avery@fams.example')).toBeInTheDocument()
  })

  it('wires popover semantics onto the caller-supplied trigger (aria-haspopup/aria-expanded)', () => {
    renderPopover()
    const trigger = screen.getByRole('button', { name: 'User' })
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
  })

  it('moves focus to the logout button on open (the only interactive child)', async () => {
    renderPopover()
    fireEvent.click(screen.getByRole('button', { name: 'User' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Log out' })).toHaveFocus())
  })

  it('fires onLogout when the logout icon-button is pressed', () => {
    const onLogout = vi.fn()
    renderPopover({ onLogout, defaultOpen: true })
    fireEvent.click(screen.getByRole('button', { name: 'Log out' }))
    expect(onLogout).toHaveBeenCalledTimes(1)
  })

  it('closes on Escape and returns focus to the trigger, without logging out', async () => {
    const onLogout = vi.fn()
    renderPopover({ onLogout })
    const trigger = screen.getByRole('button', { name: 'User' })
    fireEvent.click(trigger)
    expect(screen.getByText('Avery Stone')).toBeInTheDocument()

    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByText('Avery Stone')).not.toBeInTheDocument())
    expect(trigger).toHaveFocus()
    expect(onLogout).not.toHaveBeenCalled()
  })

  it('closes when the trigger is re-clicked (toggle)', async () => {
    renderPopover()
    const trigger = screen.getByRole('button', { name: 'User' })
    fireEvent.click(trigger)
    expect(screen.getByText('Avery Stone')).toBeInTheDocument()
    fireEvent.click(trigger)
    await waitFor(() => expect(screen.queryByText('Avery Stone')).not.toBeInTheDocument())
  })

  it('reports open/close via onOpenChange (controlled-capable)', () => {
    const onOpenChange = vi.fn()
    renderPopover({ onOpenChange })
    fireEvent.click(screen.getByRole('button', { name: 'User' }))
    expect(onOpenChange).toHaveBeenCalledWith(true)
  })

  it('truncates name and email to one line and exposes the full values via title', () => {
    const longName = 'Benjamin Braun-Hohenberg von und zu Liechtenstein'
    const longEmail = 'benjamin.braun-hohenberg@very-long-subdomain.fams.example'
    renderPopover({ name: longName, email: longEmail, defaultOpen: true })

    const name = screen.getByText(longName)
    expect(name).toHaveClass('truncate')
    expect(name).toHaveAttribute('title', longName)
    const email = screen.getByText(longEmail)
    expect(email).toHaveClass('truncate')
    expect(email).toHaveAttribute('title', longEmail)
  })

  it('omits the email line when no email is given', () => {
    renderPopover({ email: undefined, defaultOpen: true })
    expect(screen.getByText('Avery Stone')).toBeInTheDocument()
    expect(screen.queryByText('avery@fams.example')).not.toBeInTheDocument()
  })

  it('is a non-modal dialog: role=dialog, no aria-modal', () => {
    renderPopover({ defaultOpen: true })
    const dialog = screen.getByRole('dialog', { name: 'Avery Stone — account' })
    expect(dialog).not.toHaveAttribute('aria-modal')
  })

  it('honors a custom logoutLabel as the icon-button accessible name and hover title', () => {
    renderPopover({ defaultOpen: true, logoutLabel: 'Sign out' })
    const logout = screen.getByRole('button', { name: 'Sign out' })
    expect(logout).toBeInTheDocument()
    expect(logout).toHaveAttribute('title', 'Sign out')
  })

  it('keeps the logout button a 40px hit area collapsed by negative margins (UX-NOTES §3/§7)', () => {
    // jsdom cannot measure boundingBox, so pin the classes that produce the
    // 40x40 target: size-10 box, -my-3 collapsing layout height to 16px so
    // the popover stays at Figma's ~55px hug. Guards against the round-2
    // regression where the button itself was shrunk to size-8 instead.
    renderPopover({ defaultOpen: true })
    const logout = screen.getByRole('button', { name: 'Log out' })
    expect(logout).toHaveClass('size-10', '-my-3')
    expect(logout).not.toHaveClass('size-8')
  })

  it('shows a pointer cursor and hover title on the logout button', () => {
    renderPopover({ defaultOpen: true })
    const logout = screen.getByRole('button', { name: 'Log out' })
    expect(logout).toHaveClass('cursor-pointer')
    expect(logout).toHaveAttribute('title', 'Log out')
  })
})
