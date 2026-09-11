import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PageHeader } from './PageHeader'

describe('PageHeader', () => {
  it('renders title as an h1, with subtitle and actions', () => {
    render(
      <PageHeader
        title="Bins"
        subtitle="3 bins"
        actions={<button type="button">New</button>}
      />,
    )
    expect(screen.getByRole('heading', { level: 1, name: 'Bins' })).toBeInTheDocument()
    expect(screen.getByText('3 bins')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New' })).toBeInTheDocument()
  })

  it('omits subtitle and actions when not provided', () => {
    render(<PageHeader title="Dashboards" />)
    expect(screen.getByRole('heading', { level: 1, name: 'Dashboards' })).toBeInTheDocument()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('stacks on mobile and goes row from sm up (responsive classes)', () => {
    const { container } = render(<PageHeader title="Bins" />)
    const root = container.firstElementChild as HTMLElement
    expect(root.className).toContain('flex-col')
    expect(root.className).toContain('sm:flex-row')
    expect(root.className).toContain('sm:justify-between')
  })
})
