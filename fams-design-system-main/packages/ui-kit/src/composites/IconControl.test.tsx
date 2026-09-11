import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '../primitives/Button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem } from '../primitives/DropdownMenu'
import { IconControl } from './IconControl'

/**
 * IconControl — the one application point for UX K.67 ("every icon-only control
 * carries a specific accessible name AND a tooltip on hover and on focus") and
 * for the load-bearing trigger nesting order (UX H.49/H.51).
 */
describe('IconControl', () => {
  it('turns one `tip` into both the accessible name and the tooltip copy', () => {
    render(
      <IconControl tip="Zoom in">
        <Button variant="ghost" size="icon">
          +
        </Button>
      </IconControl>,
    )
    const button = screen.getByRole('button', { name: 'Zoom in' })
    expect(button).not.toHaveAttribute('title')
    // Opens on FOCUS, not just hover — the whole reason this is a real tooltip
    // and not a `title` attribute.
    fireEvent.focus(button)
    expect(screen.getAllByText('Zoom in').length).toBeGreaterThan(0)
  })

  it('lets the name and the tooltip differ when the name must state its subject', () => {
    render(
      <IconControl name="More actions for IMS-12324" tip="More actions">
        <Button variant="ghost" size="icon">
          …
        </Button>
      </IconControl>,
    )
    expect(screen.getByRole('button', { name: 'More actions for IMS-12324' })).toBeInTheDocument()
  })

  it("never overwrites a child's own aria-label", () => {
    render(
      <IconControl tip="Filter">
        <Button variant="ghost" size="icon" aria-label="Filter (2 active)">
          ⛭
        </Button>
      </IconControl>,
    )
    expect(screen.getByRole('button', { name: 'Filter (2 active)' })).toBeInTheDocument()
  })

  it('keeps DropdownMenuTrigger OUTERMOST under menuTrigger, so data-state is the MENU’s', () => {
    const onSelect = vi.fn()
    render(
      <DropdownMenu>
        <IconControl tip="Sort" menuTrigger>
          <Button variant="ghost" size="icon" data-slot="sort-trigger">
            ↕
          </Button>
        </IconControl>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={onSelect}>Newest</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    )
    const trigger = screen.getByRole('button', { name: 'Sort' })
    // The menu's own wiring reached the button (a collapsed tooltip trigger
    // would have won these instead).
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    fireEvent.keyDown(trigger, { key: 'Enter' })
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(trigger).toHaveAttribute('data-state', 'open')
  })
})
