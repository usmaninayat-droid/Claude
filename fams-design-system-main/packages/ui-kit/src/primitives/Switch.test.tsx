import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Switch } from './Switch'

describe('Switch', () => {
  it('exposes role=switch with aria-checked reflecting state', () => {
    render(<Switch checked aria-label="t" onCheckedChange={() => {}} />)
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
  })

  it('fires onCheckedChange with the next value', () => {
    const fn = vi.fn()
    render(<Switch checked={false} aria-label="t" onCheckedChange={fn} />)
    fireEvent.click(screen.getByRole('switch'))
    expect(fn).toHaveBeenCalledWith(true)
  })

  it('does not fire when disabled via the deprecated isDisabled alias', () => {
    const fn = vi.fn()
    render(<Switch checked={false} isDisabled aria-label="t" onCheckedChange={fn} />)
    fireEvent.click(screen.getByRole('switch'))
    expect(fn).not.toHaveBeenCalled()
  })

  it('does not fire when disabled via the native disabled prop', () => {
    const fn = vi.fn()
    render(<Switch checked={false} disabled aria-label="t" onCheckedChange={fn} />)
    fireEvent.click(screen.getByRole('switch'))
    expect(fn).not.toHaveBeenCalled()
  })

  it('prefers native disabled over the deprecated isDisabled alias when both are set', () => {
    render(<Switch checked={false} disabled={false} isDisabled aria-label="t" />)
    expect(screen.getByRole('switch')).not.toBeDisabled()
  })

  /* Round-4 UX finding N3 — WCAG 1.4.11: the OFF track measured 1.44:1 on a
     white surface, so nothing identified the control until you found it. */
  it('draws the OFF track a visible boundary at 3:1 or better', () => {
    render(<Switch checked={false} aria-label="t" />)
    const cls = screen.getByRole('switch').className
    // `muted-foreground` (#667085) = 4.05:1 on white, 4.4:1 on the dark card.
    expect(cls).toContain('data-[state=unchecked]:outline-muted-foreground')
    expect(cls).toContain('data-[state=unchecked]:-outline-offset-1')
    // `outline-solid` explicitly — a bare `outline` inherits the base
    // `outline-none`'s `--tw-outline-style: none` and paints nothing.
    expect(cls).toContain('data-[state=unchecked]:outline-solid')
    expect(cls).toContain('data-[state=unchecked]:outline-1')
    // `outline`, not `border` (would shift the thumb) or `ring` (would collide
    // with the focus ring).
    expect(cls).not.toContain('data-[state=unchecked]:border')
  })
})
