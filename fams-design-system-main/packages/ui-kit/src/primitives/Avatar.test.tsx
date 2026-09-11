import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { Avatar } from './Avatar'

describe('Avatar', () => {
  it('renders a single initial from a two-word name, not both initials', () => {
    render(<Avatar name="John Doe" />)
    expect(screen.getByText('J')).toBeInTheDocument()
    expect(screen.queryByText('JD')).not.toBeInTheDocument()
  })

  it('renders a single initial from a single-word name', () => {
    render(<Avatar name="Cher" />)
    expect(screen.getByText('C')).toBeInTheDocument()
    expect(screen.queryByText('CH')).not.toBeInTheDocument()
  })

  it('falls back to a single initial derived from alt when name is absent', () => {
    render(<Avatar alt="Jane Smith" />)
    expect(screen.getByText('J')).toBeInTheDocument()
    expect(screen.queryByText('JS')).not.toBeInTheDocument()
  })

  it('splits a raw snake_case/kebab-case id and takes its first token\'s initial, not its first literal character', () => {
    render(<Avatar name="u_admin" />)
    expect(screen.getByText('U')).toBeInTheDocument()
    expect(screen.queryByText('U_')).not.toBeInTheDocument()
  })

  it('applies the size class', () => {
    const { container } = render(<Avatar name="John Doe" size="lg" />)
    expect(container.querySelector('[data-slot="avatar"]')).toHaveClass('size-12')
  })

  it('defaults to the md size', () => {
    const { container } = render(<Avatar name="John Doe" />)
    expect(container.querySelector('[data-slot="avatar"]')).toHaveClass('size-10')
  })

  it('renders a status dot with the correct tone', () => {
    const { container } = render(<Avatar name="John Doe" status="busy" />)
    const dot = container.querySelector('[data-slot="avatar-status"]')
    expect(dot).toBeInTheDocument()
    expect(dot).toHaveClass('bg-destructive')
    expect(dot).toHaveClass('ring-card')
  })

  it('renders no status dot by default', () => {
    const { container } = render(<Avatar name="John Doe" />)
    expect(container.querySelector('[data-slot="avatar-status"]')).not.toBeInTheDocument()
  })

  it('renders the online status tone', () => {
    const { container } = render(<Avatar name="John Doe" status="online" />)
    expect(container.querySelector('[data-slot="avatar-status"]')).toHaveClass('bg-success')
  })

  it('renders the offline status tone', () => {
    const { container } = render(<Avatar name="John Doe" status="offline" />)
    expect(container.querySelector('[data-slot="avatar-status"]')).toHaveClass('bg-muted-foreground')
  })

  it('tints the initials fallback with a distinct palette class per distinct name', () => {
    // Locks in the fix for the "same flat tan/orange for everyone" defect:
    // two different people must resolve to two different fallback classes.
    // These two names are the exact live-demo pair (KanbanDemo.tsx) a vision
    // diff flagged as visually indistinguishable before the palette swap.
    // The leaf element holding the initials text IS the Fallback span itself
    // (its className carries the palette classes) — querying by exact text
    // avoids matching the Root span, whose textContent also includes the
    // descendant's text.
    const { container: c1 } = render(<Avatar name="Kashish Bindrani" />)
    const { container: c2 } = render(<Avatar name="Emmad Ahmad" />)
    const class1 = within(c1).getByText('K').className
    const class2 = within(c2).getByText('E').className
    expect(class1).not.toBe('')
    expect(class1).not.toBe(class2)
  })

  it('gives the same person the same fallback color every render (deterministic hash)', () => {
    const { container: a } = render(<Avatar name="Dana Reyes" />)
    const { container: b } = render(<Avatar name="Dana Reyes" />)
    expect(within(a).getByText('D').className).toBe(within(b).getByText('D').className)
  })

  it('fills the per-name hash fallback SOLID (a `-dark` accent stop) with white text, not a pastel wash', () => {
    // Locks in the 2026-08-31 platform fix: initials avatars must read as a
    // solid chip (`bg-accent-family-*-dark` + `text-white`), never the old
    // `-light` bg / `-dark` text tinted-wash pairing.
    const { container } = render(<Avatar name="Kashish Bindrani" />)
    const fallback = within(container).getByText('K')
    expect(fallback.className).toMatch(/bg-accent-family-\w+-dark/)
    expect(fallback).toHaveClass('text-white')
    expect(fallback.className).not.toMatch(/-light/)
  })

  it('overrides the hash palette with an explicit semantic tone when given', () => {
    const { container } = render(<Avatar name="Vikram Singh" tone="danger" />)
    const fallback = within(container).getByText('V')
    expect(fallback).toHaveClass('bg-destructive')
    expect(fallback.className).not.toMatch(/accent-family/)
  })

  it('picks a distinct tone class per role tone', () => {
    const { container: danger } = render(<Avatar name="Vikram Singh" tone="danger" />)
    const { container: success } = render(<Avatar name="Ali Ahmad" tone="success" />)
    const { container: info } = render(<Avatar name="Muhammad Yasir" tone="info" />)
    expect(within(danger).getByText('V')).toHaveClass('bg-destructive')
    expect(within(success).getByText('A')).toHaveClass('bg-success')
    expect(within(info).getByText('M')).toHaveClass('bg-info')
  })


  it('tone="neutral" renders the quiet grey identity fallback (logout-popup spec)', () => {
    const { container } = render(<Avatar name="Avery Stone" tone="neutral" />)
    const fallback = within(container).getByText('A')
    expect(fallback).toHaveClass('bg-gray-300')
    expect(fallback).toHaveClass('text-gray-600')
  })

  it('forwards a ref to the root element', () => {
    let node: HTMLSpanElement | null = null
    render(
      <Avatar
        name="John Doe"
        ref={(el) => {
          node = el
        }}
      />,
    )
    expect(node).not.toBeNull()
  })
})
