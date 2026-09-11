import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuCheckboxItem,
} from './DropdownMenu'
import { Switch } from './Switch'

describe('DropdownMenu', () => {
  it('is closed by default', () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Edit</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    )
    expect(screen.queryByText('Edit')).not.toBeInTheDocument()
  })

  it('renders items, a label, and a separator when open', () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>Vehicle</DropdownMenuLabel>
          <DropdownMenuItem>Edit</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem destructive>Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    )
    expect(screen.getByText('Vehicle')).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Edit' })).toBeInTheDocument()
    // fix7 wave 6, P2 sweep: `destructive` used the bare fill token as this
    // readable item's text color (3.76:1/3.91:1, failing AA) — now the
    // accessible `-emphasis` alias.
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toHaveClass('text-destructive-emphasis')
  })

  it('renders a shortcut hint pushed to the trailing edge with the logical ms-auto utility', () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>
            Edit
            <DropdownMenuShortcut>⌘E</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    )
    const shortcut = screen.getByText('⌘E')
    expect(shortcut).toBeInTheDocument()
    expect(shortcut).toHaveClass('ms-auto')
    expect(shortcut).not.toHaveClass('ml-auto')
  })
  /*
   * A settings-style menu row (figma live-monitoring 495:45132's Autosave /
   * Private / Protect) must read its state whether it is ON or OFF. With the
   * default checkmark indicator an unchecked row is pixel-identical to a plain
   * item, which is how those three shipped state-blind (round-2 UX finding 5).
   */
  describe('checkbox item — switch indicator', () => {
    const renderRow = (checked: boolean) =>
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuCheckboxItem indicator="switch" checked={checked}>
              Autosave for Me
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>,
      )

    it('paints a trailing toggle pill that tracks the checked state', () => {
      const { unmount } = renderRow(false)
      const off = screen
        .getByRole('menuitemcheckbox', { name: 'Autosave for Me' })
        .querySelector('[data-slot="dropdown-menu-checkbox-switch"]')!
      expect(off).not.toBeNull()
      expect(off.getAttribute('data-state')).toBe('unchecked')
      expect(off).toHaveClass('ms-auto')
      unmount()

      renderRow(true)
      const on = screen
        .getByRole('menuitemcheckbox', { name: 'Autosave for Me' })
        .querySelector('[data-slot="dropdown-menu-checkbox-switch"]')!
      expect(on.getAttribute('data-state')).toBe('checked')
      expect(on).toHaveClass('bg-primary')
    })

    it('carries its geometry INLINE and travels the knob on a LOGICAL inset', () => {
      // KNOWN PITFALL: a package-authored arbitrary Tailwind size is not
      // guaranteed to be emitted by the consuming app's build, and this pill
      // IS the row's only state cue. A transform would also need RTL
      // compensation; `inset-inline-start` mirrors on its own.
      renderRow(true)
      const pill = screen
        .getByRole('menuitemcheckbox', { name: 'Autosave for Me' })
        .querySelector<HTMLElement>('[data-slot="dropdown-menu-checkbox-switch"]')!
      expect(pill.style.width).not.toBe('')
      expect(pill.style.height).not.toBe('')
      const knob = pill.firstElementChild as HTMLElement
      expect(knob.style.insetInlineStart).not.toBe('')
      expect(knob.style.transform).toBe('')
    })

    /*
     * The CONTRACT test for round-5 UX gate S2. Two components render this
     * control — the `Switch` primitive and this pill (which cannot BE a
     * `Switch`: a `<button role="switch">` inside a `menuitemcheckbox` trips
     * axe `nested-interactive`) — so a Switch change applied to one and not
     * the other silently half-lands. That is exactly what happened with the
     * 1.4.11 outline: `Switch` got it, this pill stayed at 1.18:1.
     *
     * Asserting the token SET (not a pixel) is what a jsdom test can honestly
     * check, and it fails the moment the two drift again.
     */
    it('matches the Switch primitive OFF treatment token-for-token', () => {
      const { unmount } = render(<Switch checked={false} onCheckedChange={() => {}} aria-label="Reference" />)
      const reference = screen.getByRole('switch')
      const boundary = ['outline-solid', 'outline-1', '-outline-offset-1', 'outline-muted-foreground']
      for (const token of boundary) {
        expect(reference.className).toContain(`data-[state=unchecked]:${token}`)
      }
      expect(reference.className).toContain('data-[state=unchecked]:bg-gray-200')
      unmount()

      renderRow(false)
      const pill = screen
        .getByRole('menuitemcheckbox', { name: 'Autosave for Me' })
        .querySelector<HTMLElement>('[data-slot="dropdown-menu-checkbox-switch"]')!
      for (const token of boundary) expect(pill).toHaveClass(token)
      expect(pill).toHaveClass('bg-gray-200')
      expect(pill).not.toHaveClass('bg-muted')
    })

    it('drops the leading checkmark gutter it does not use', () => {
      renderRow(false)
      const row = screen.getByRole('menuitemcheckbox', { name: 'Autosave for Me' })
      expect(row).toHaveClass('px-2')
      expect(row).not.toHaveClass('ps-8')
    })
  })
})
