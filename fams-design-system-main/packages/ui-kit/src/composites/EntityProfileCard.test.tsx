import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EntityProfileCard, type EntityProfileField } from './EntityProfileCard'
import type { TagOption } from './TagChipList'

const TAGS: TagOption[] = [
  { value: 'lot-1', label: 'Lot 1', color: '#12b76a' },
  { value: 'lot-7', label: 'Lot 7' },
]

const FIELDS: EntityProfileField[] = [
  { label: 'Model', value: 'Compactor 4200' },
  { label: 'Odometer', value: '128,340 km' },
  { label: 'VIN' },
]

describe('EntityProfileCard', () => {
  it('renders the name, identifier, and subtitle', () => {
    render(<EntityProfileCard name="Asset 42" identifier="AB-1234" subtitle="Lot 1 · Compactor" />)
    expect(screen.getByRole('heading', { level: 3, name: 'Asset 42' })).toBeInTheDocument()
    expect(screen.getByText('AB-1234')).toBeInTheDocument()
    expect(screen.getByText('Lot 1 · Compactor')).toBeInTheDocument()
  })

  it('renders a hero with an overlaid badges region when hero is given', () => {
    render(
      <EntityProfileCard
        name="Asset 42"
        hero={<img src="/asset-42.jpg" alt="Asset 42" />}
        heroBadges={<span>Active</span>}
      />,
    )
    expect(screen.getByAltText('Asset 42')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('falls back to an Avatar built from avatarFallback when hero is omitted', () => {
    render(<EntityProfileCard name="Sara Ahmed" avatarFallback="Sara Ahmed" />)
    expect(screen.getByText('S')).toBeInTheDocument()
  })

  it('does not render hero badges when hero is omitted, even if provided', () => {
    render(<EntityProfileCard name="Sara Ahmed" avatarFallback="Sara Ahmed" heroBadges={<span>Active</span>} />)
    expect(screen.queryByText('Active')).not.toBeInTheDocument()
  })

  it('renders no hero/avatar region when neither hero nor avatar props are given', () => {
    const { container } = render(<EntityProfileCard name="Asset 42" />)
    expect(container.querySelector('[data-slot="entity-profile-card-hero"]')).not.toBeInTheDocument()
    expect(container.querySelector('[data-slot="avatar"]')).not.toBeInTheDocument()
  })

  it('renders resolved tags via TagChipList', () => {
    render(<EntityProfileCard name="Asset 42" tags={TAGS} />)
    expect(screen.getByText('Lot 1')).toBeInTheDocument()
    expect(screen.getByText('Lot 7')).toBeInTheDocument()
  })

  it('omits the tag region when tags is empty or absent', () => {
    const { container } = render(<EntityProfileCard name="Asset 42" tags={[]} />)
    expect(container.querySelector('[data-slot="tag-chip-list"]')).not.toBeInTheDocument()
  })

  it('renders key/value fields, falling back to an em dash for a missing value', () => {
    render(<EntityProfileCard name="Asset 42" fields={FIELDS} />)
    expect(screen.getByText('Model')).toBeInTheDocument()
    expect(screen.getByText('Compactor 4200')).toBeInTheDocument()
    expect(screen.getByText('VIN')).toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('renders the actions row', () => {
    render(
      <EntityProfileCard name="Asset 42" actions={<button type="button">Edit</button>} />,
    )
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
  })

  it('forwards ref and merges className onto the card', () => {
    let node: HTMLDivElement | null = null
    render(
      <EntityProfileCard
        name="Asset 42"
        className="custom-class"
        ref={(el) => {
          node = el
        }}
      />,
    )
    expect(node).not.toBeNull()
    expect(node).toHaveClass('custom-class')
  })
})
