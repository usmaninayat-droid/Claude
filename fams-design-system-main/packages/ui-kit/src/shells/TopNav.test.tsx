import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TopNav } from './TopNav'

describe('TopNav', () => {
  it('renders brand and actions slots', () => {
    render(
      <TopNav
        brand={<span>Brand</span>}
        actions={<button type="button">Action</button>}
      />,
    )
    expect(screen.getByText('Brand')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument()
  })

  it('pins actions to the trailing edge via logical ms-auto', () => {
    render(<TopNav actions={<span data-testid="acts">x</span>} />)
    // The actions wrapper carries the ms-auto push (RTL-safe).
    const wrapper = screen.getByTestId('acts').parentElement!
    expect(wrapper.className).toContain('ms-auto')
  })

  it('shows the mobile hamburger (md:hidden) only when onMenuClick is given', () => {
    const onMenuClick = vi.fn()
    const { rerender } = render(<TopNav />)
    expect(screen.queryByRole('button', { name: /menu/i })).toBeNull()

    rerender(<TopNav onMenuClick={onMenuClick} />)
    const burger = screen.getByRole('button', { name: /Open navigation menu/i })
    expect(burger.className).toContain('md:hidden')
    fireEvent.click(burger)
    expect(onMenuClick).toHaveBeenCalledOnce()
  })

  /* Round-1 visual #39 / #48 — title inset + weight. */
  it('insets the title 32px from the rails and renders it BOLD', () => {
    const { container } = render(<TopNav brand={<h1>Live Monitoring</h1>} />)
    const title = container.querySelector<HTMLElement>('[data-slot="top-nav-title"]')!
    expect(title.className).toContain('ps-8')
    expect(title.className).toContain('font-bold')
    expect(title.className).not.toContain('font-semibold')
  })
})

/**
 * The bold title + wider gutters (live-monitoring SPEC v2 §2.1) are a
 * SHELL-WIDE restyle: they reach every module of every tenant and FAMS Desk.
 * They are deliberately not gated per module — the title sits between the two
 * rails whose gutters moved in the same wave, so a per-module gate would leave
 * one product with two different headers — but a consumer needs a one-line way
 * out that is not forking the shell (Phase 7 code review, finding 3).
 */
describe('TopNav — title typography escape hatch', () => {
  it('defaults to the SPEC v2 gutters and weight', () => {
    const { container } = render(<TopNav brand={<h1>Live Monitoring</h1>} />)
    const title = container.querySelector('[data-slot="top-nav-title"]')!
    expect(title.className).toContain('ps-8')
    expect(title.className).toContain('pe-9')
    expect(title.className).toContain('font-bold')
  })

  it('lets a consumer restore its own gutters and weight in one prop', () => {
    const { container } = render(
      <TopNav brand={<h1>Live Monitoring</h1>} titleClassName="ps-6 pe-6 font-semibold" />,
    )
    const title = container.querySelector('[data-slot="top-nav-title"]')!
    // `cn` merges on the Tailwind conflict groups, so the caller's classes
    // REPLACE the defaults rather than stacking with them.
    expect(title.className).toContain('ps-6')
    expect(title.className).toContain('font-semibold')
    expect(title.className).not.toContain('ps-8')
    expect(title.className).not.toContain('font-bold')
  })
})
