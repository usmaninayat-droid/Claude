import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { UserMenu, type UserMenuItem } from './UserMenu'

const ITEMS: UserMenuItem[] = [
  { key: 'profile', label: 'Profile' },
  { key: 'settings', label: 'Settings' },
  { key: 'logout', label: 'Log out', destructive: true },
]

describe('UserMenu', () => {
  it('renders an avatar-only trigger by default, labelled for a11y', () => {
    render(<UserMenu name="Kashish Bindrani" items={ITEMS} />)
    expect(screen.getByRole('button', { name: 'Kashish Bindrani — account menu' })).toBeInTheDocument()
  })

  it('shows the name beside the avatar when showName is set', () => {
    render(<UserMenu name="Kashish Bindrani" items={ITEMS} showName />)
    expect(screen.getByText('Kashish Bindrani')).toBeInTheDocument()
  })

  // Radix menus open via pointer-capture, which jsdom lacks, so we render
  // with `defaultOpen` to assert menu content (same pattern as DropdownMenu.test).
  it('lists the given items when open', () => {
    render(<UserMenu name="Kashish Bindrani" items={ITEMS} defaultOpen />)
    expect(screen.getByRole('menuitem', { name: 'Profile' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Settings' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Log out' })).toBeInTheDocument()
  })

  it('shows the identity header when name/email are given', () => {
    render(<UserMenu name="Kashish Bindrani" email="kashish@fams.com" items={ITEMS} defaultOpen />)
    expect(screen.getByText('kashish@fams.com')).toBeInTheDocument()
  })

  it('shows the job title as a third identity line when given', () => {
    render(
      <UserMenu name="Kashish Bindrani" email="kashish@fams.com" jobTitle="Product Manager" items={ITEMS} defaultOpen />,
    )
    expect(screen.getByText('Product Manager')).toBeInTheDocument()
  })

  it('omits the identity header entirely when neither name nor email are given', () => {
    render(<UserMenu items={ITEMS} defaultOpen />)
    expect(screen.queryByText('kashish@fams.com')).not.toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Profile' })).toBeInTheDocument()
  })

  it('calls the item onSelect callback when chosen', () => {
    const onSelect = vi.fn()
    const items: UserMenuItem[] = [{ key: 'profile', label: 'Profile', onSelect }]
    render(<UserMenu name="Kashish Bindrani" items={items} defaultOpen />)
    fireEvent.click(screen.getByRole('menuitem', { name: 'Profile' }))
    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  // fix7 wave 6, P2 sweep: `DropdownMenuItem`'s `destructive` prop used the
  // bare `text-destructive` fill token as the readable item label's color
  // (3.76:1/3.91:1, failing AA) — moved to the accessible `-emphasis` alias.
  it('applies the accessible destructive-emphasis tone to items flagged destructive', () => {
    render(<UserMenu name="Kashish Bindrani" items={ITEMS} defaultOpen />)
    const logOut = screen.getByRole('menuitem', { name: 'Log out' })
    expect(logOut).toHaveClass('text-destructive-emphasis')
    expect(logOut).not.toHaveClass('text-destructive')
  })

  it('does not call onSelect for a disabled item', () => {
    const onSelect = vi.fn()
    const items: UserMenuItem[] = [{ key: 'profile', label: 'Profile', onSelect, disabled: true }]
    render(<UserMenu items={items} defaultOpen />)
    fireEvent.click(screen.getByRole('menuitem', { name: 'Profile' }))
    expect(onSelect).not.toHaveBeenCalled()
  })
})
