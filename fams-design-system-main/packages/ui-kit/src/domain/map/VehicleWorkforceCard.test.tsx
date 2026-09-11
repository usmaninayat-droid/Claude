import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { VehicleWorkforceCard } from './VehicleWorkforceCard'

/**
 * VehicleWorkforceCard — the popup's Workforce tab body (Figma 16:22182).
 * Generic by contract: the component knows only title / photo / entries, so
 * these cases assert the anatomy and the empty state, never a domain word.
 */
describe('VehicleWorkforceCard', () => {
  const ENTRIES = [
    { label: 'Workforce', value: 'Khalid Al-Marri' },
    { label: 'Contact', value: '+974 5512 8890' },
    { label: 'Email', value: 'k.almarri@uccp.qa' },
    { label: 'Assigned On', value: '12 Feb, 2025' },
  ]

  it('heads the panel and pairs every label with its value in one accessible name', () => {
    render(<VehicleWorkforceCard entries={ENTRIES} />)
    expect(screen.getByText('Workforce Info')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Contact: +974 5512 8890' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Assigned On: 12 Feb, 2025' })).toBeInTheDocument()
  })

  it('lays the entries out in two columns beside the 120px photo tile', () => {
    const { container } = render(
      <VehicleWorkforceCard entries={ENTRIES} photo={<img src="/w.png" alt="" />} />,
    )
    const grid = container.querySelector('[data-slot="vehicle-workforce-card"] .grid-cols-2') as HTMLElement
    expect(grid.className).toContain('grid-cols-2')
    expect(container.querySelector('img')).not.toBeNull()
  })

  it('renders its empty state at the same box rather than disappearing (UX D28)', () => {
    const { container } = render(<VehicleWorkforceCard entries={[]} emptyLabel="No workforce assigned" />)
    expect(screen.getByText('No workforce assigned')).toBeInTheDocument()
    expect(container.querySelector('[data-slot="vehicle-workforce-card"]')).not.toBeNull()
  })

  it('takes a caller-supplied title — no domain vocabulary is baked in', () => {
    render(<VehicleWorkforceCard title="Crew" entries={ENTRIES} />)
    expect(screen.getByText('Crew')).toBeInTheDocument()
  })
})

describe('VehicleWorkforceCard — the default illustration', () => {
  it('draws the designer art when no photo is given, and namespaces its ids per instance', () => {
    const { container } = render(
      <>
        <VehicleWorkforceCard entries={[{ label: 'Workforce', value: 'A' }]} />
        <VehicleWorkforceCard entries={[{ label: 'Workforce', value: 'B' }]} />
      </>,
    )
    const svgs = container.querySelectorAll('[data-slot="vehicle-workforce-card"] svg')
    expect(svgs.length).toBe(2)
    // Fixed width/height stripped, viewBox kept — the caller sizes it.
    expect(svgs[0].getAttribute('viewBox')).toBe('0 0 100 100')
    expect(svgs[0].getAttribute('width')).toBeNull()
    // Two instances on one page must not share gradient/clip ids.
    const ids = (root: Element) => [...root.querySelectorAll('[id]')].map((n) => n.id)
    const [a, b] = [ids(svgs[0]), ids(svgs[1])]
    expect(a.length).toBeGreaterThan(0)
    expect(a.some((id) => b.includes(id))).toBe(false)
  })

  it('prefers a caller-supplied photo over the illustration', () => {
    const { container } = render(
      <VehicleWorkforceCard entries={[]} photo={<img src="/w.png" alt="" />} />,
    )
    expect(container.querySelector('img')).not.toBeNull()
    expect(container.querySelector('[data-slot="vehicle-workforce-card"] svg')).toBeNull()
  })
})
