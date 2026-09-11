import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Breadcrumbs, type BreadcrumbItem } from './Breadcrumbs'

const ITEMS: BreadcrumbItem[] = [
  { label: 'Settings', href: '/settings' },
  { label: 'Users', onClick: vi.fn() },
  { label: 'Edit user' },
]

describe('Breadcrumbs', () => {
  it('renders every item label', () => {
    render(<Breadcrumbs items={ITEMS} />)
    expect(screen.getByText('Settings')).toBeInTheDocument()
    expect(screen.getByText('Users')).toBeInTheDocument()
    expect(screen.getByText('Edit user')).toBeInTheDocument()
  })

  it('renders a link for an item with href', () => {
    render(<Breadcrumbs items={ITEMS} />)
    const link = screen.getByRole('link', { name: 'Settings' })
    expect(link).toHaveAttribute('href', '/settings')
  })

  it('renders a button for an item with onClick and no href, and fires it', () => {
    const onClick = vi.fn()
    render(<Breadcrumbs items={[{ label: 'Users', onClick }, { label: 'Edit user' }]} />)
    fireEvent.click(screen.getByRole('button', { name: 'Users' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('renders a plain, non-interactive span for an item with neither href nor onClick', () => {
    render(<Breadcrumbs items={[{ label: 'Fleet' }, { label: 'Current' }]} />)
    expect(screen.queryByRole('link', { name: 'Fleet' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Fleet' })).not.toBeInTheDocument()
    expect(screen.getByText('Fleet')).toBeInTheDocument()
  })

  it('always renders the last item as the current, non-interactive page — even with href/onClick', () => {
    const onClick = vi.fn()
    render(<Breadcrumbs items={[{ label: 'Settings', href: '/settings' }, { label: 'Users', href: '/users', onClick }]} />)
    const current = screen.getByText('Users')
    expect(current.tagName).toBe('SPAN')
    expect(current).toHaveAttribute('aria-current', 'page')
    expect(screen.queryByRole('link', { name: 'Users' })).not.toBeInTheDocument()
  })

  it('renders a separator between items but not after the last one', () => {
    const { container } = render(<Breadcrumbs items={ITEMS} />)
    expect(container.querySelectorAll('[data-slot="breadcrumb-separator"]')).toHaveLength(2)
  })

  it('lets the caller override the separator', () => {
    render(<Breadcrumbs items={ITEMS} separator={<span>/</span>} />)
    expect(screen.getAllByText('/')).toHaveLength(2)
  })

  it('uses nav > ol semantics with an accessible label', () => {
    render(<Breadcrumbs items={ITEMS} />)
    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(nav.querySelector('ol')).toBeInTheDocument()
  })

  it('forwards the ref to the nav element', () => {
    const ref = createRef<HTMLElement>()
    render(<Breadcrumbs ref={ref} items={ITEMS} />)
    expect(ref.current?.tagName).toBe('NAV')
  })
})
