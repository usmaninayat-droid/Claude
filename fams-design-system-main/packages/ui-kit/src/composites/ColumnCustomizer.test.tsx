import { useState } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import {
  ColumnCustomizer,
  type ColumnCatalogItem,
} from './ColumnCustomizer'

const CATALOG: ColumnCatalogItem[] = [
  { key: 'name', label: 'Vehicle', group: 'Shown', required: true },
  { key: 'status', label: 'Status', group: 'Shown' },
  { key: 'speed', label: 'Speed', group: 'Shown' },
  { key: 'plate', label: 'Plate', group: 'Asset – Basic Info' },
  { key: 'make', label: 'Make', group: 'Asset – Basic Info' },
  { key: 'deviceName', label: 'Device Name', group: 'Device – Basic Info' },
]

/** Controlled harness so `value` reflects the component's onChange. */
function Harness({ initial }: { initial: string[] }) {
  const [value, setValue] = useState<string[]>(initial)
  return (
    <>
      <div data-testid="value">{value.join(',')}</div>
      <ColumnCustomizer catalog={CATALOG} value={value} onChange={setValue} />
    </>
  )
}

const value = () => screen.getByTestId('value').textContent

describe('ColumnCustomizer', () => {
  it('renders the "Shown" section with visible keys in order, and other groups', () => {
    render(<Harness initial={['name', 'status', 'speed']} />)

    // Shown section header + its rows.
    const shown = screen.getByRole('region', { name: 'Shown' })
    expect(within(shown).getByText('Vehicle')).toBeInTheDocument()
    expect(within(shown).getByText('Status')).toBeInTheDocument()

    // A non-visible group renders with its own header.
    expect(
      screen.getByRole('region', { name: 'Asset – Basic Info' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Plate')).toBeInTheDocument()
  })

  it('toggles a hidden column ON (appends to value)', () => {
    render(<Harness initial={['name', 'status']} />)
    expect(value()).toBe('name,status')

    fireEvent.click(screen.getByRole('switch', { name: 'Toggle Plate' }))
    expect(value()).toBe('name,status,plate')
  })

  it('toggles a shown column OFF (removes from value)', () => {
    render(<Harness initial={['name', 'status', 'speed']} />)

    fireEvent.click(screen.getByRole('switch', { name: 'Toggle Speed' }))
    expect(value()).toBe('name,status')
  })

  it('does not hide a required column (toggle disabled)', () => {
    render(<Harness initial={['name', 'status']} />)

    const toggle = screen.getByRole('switch', { name: 'Toggle Vehicle' })
    expect(toggle).toBeDisabled()
    fireEvent.click(toggle)
    expect(value()).toBe('name,status')
  })

  it('filters rows by search term (case-insensitive) and hides empty groups', () => {
    render(<Harness initial={['name', 'status', 'speed']} />)

    fireEvent.change(screen.getByRole('textbox', { name: 'Search Columns' }), {
      target: { value: 'plate' },
    })

    expect(screen.getByText('Plate')).toBeInTheDocument()
    // "Status" filtered out; the whole "Shown" group has no matches → hidden.
    expect(screen.queryByText('Status')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('region', { name: 'Shown' }),
    ).not.toBeInTheDocument()
  })

  it('reorders shown columns via keyboard (ArrowDown on the handle)', () => {
    render(<Harness initial={['name', 'status', 'speed']} />)

    const handle = screen.getByRole('button', { name: 'Reorder Status' })
    handle.focus()
    fireEvent.keyDown(handle, { key: 'ArrowDown' })
    // Status moves after Speed.
    expect(value()).toBe('name,speed,status')
  })

  it('does not reorder past the ends', () => {
    render(<Harness initial={['name', 'status']} />)
    const handle = screen.getByRole('button', { name: 'Reorder Vehicle' })
    handle.focus()
    fireEvent.keyDown(handle, { key: 'ArrowUp' })
    expect(value()).toBe('name,status')
  })

  it('renders under RTL (dir=rtl) without error', () => {
    const { container } = render(
      <div dir="rtl">
        <ColumnCustomizer
          catalog={CATALOG}
          value={['name', 'status']}
          onChange={() => {}}
        />
      </div>,
    )
    expect(container.querySelector('[dir="rtl"]')).toBeInTheDocument()
    expect(screen.getByText('Columns')).toBeInTheDocument()
  })

  it('fires onClose when the close button is clicked', () => {
    let closed = false
    render(
      <ColumnCustomizer
        catalog={CATALOG}
        value={['name']}
        onChange={() => {}}
        onClose={() => {
          closed = true
        }}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(closed).toBe(true)
  })

  /* Round-1 UX finding 16 — "cannot be turned off" must not be colour-only. */
  it('marks a required column with a lock glyph, a Required caption and aria-disabled', () => {
    const { container } = render(
      <ColumnCustomizer catalog={CATALOG} value={['name', 'speed']} onChange={vi.fn()} />,
    )
    const caption = container.querySelector<HTMLElement>('[data-slot="column-required"]')
    expect(caption).toBeTruthy()
    expect(caption).toHaveTextContent('Required')
    expect(caption!.querySelector('svg')).toBeTruthy()

    const toggle = screen.getByRole('switch', { name: 'Toggle Vehicle' })
    expect(toggle).toHaveAttribute('aria-disabled', 'true')
    expect(toggle).toHaveAttribute('title', 'Vehicle is required and cannot be hidden')
    // The caption is what describes the toggle — not a colour change.
    expect(toggle.getAttribute('aria-describedby')).toBe(caption!.id)

    // A non-required row carries none of it.
    const speed = screen.getByRole('switch', { name: 'Toggle Speed' })
    expect(speed).not.toHaveAttribute('aria-disabled')
  })

  /* Round-4 UX finding N1 — the row, not just the 32×18 switch, is the target. */
  it('toggles a column from a click anywhere on its row, and never double-counts', () => {
    const onChange = vi.fn()
    render(<ColumnCustomizer catalog={CATALOG} value={['name', 'speed']} onChange={onChange} />)

    // A click on the row's LABEL — 120px from the switch — used to be dead.
    fireEvent.click(screen.getByText('Speed'))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenLastCalledWith(['name'])

    // A click on the switch itself still fires exactly once (the row handler
    // stands down when the event started inside a real control).
    onChange.mockClear()
    fireEvent.click(screen.getByRole('switch', { name: 'Toggle Speed' }))
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('leaves a REQUIRED row inert — the row target cannot hide the last column', () => {
    const onChange = vi.fn()
    render(<ColumnCustomizer catalog={CATALOG} value={['name', 'speed']} onChange={onChange} />)
    fireEvent.click(screen.getByText('Vehicle'))
    expect(onChange).not.toHaveBeenCalled()
  })
})
