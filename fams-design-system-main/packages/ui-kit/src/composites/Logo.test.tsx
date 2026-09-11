import { afterEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Logo } from './Logo'

afterEach(() => {
  delete document.documentElement.dataset.tenant
})

describe('Logo', () => {
  it('renders the FAMS wordmark by default', () => {
    render(<Logo />)
    expect(screen.getByText('FAMS')).toBeInTheDocument()
  })

  it('renders the explicit tenant wordmark', () => {
    render(<Logo tenant="ead" />)
    expect(screen.getByText('EAD')).toBeInTheDocument()
  })

  it('renders the Tadweer wordmark for the iwmp tenant', () => {
    render(<Logo tenant="iwmp" />)
    expect(screen.getByText('Tadweer')).toBeInTheDocument()
  })

  it('reads the tenant from the document when no prop is given', () => {
    document.documentElement.dataset.tenant = 'mm'
    render(<Logo />)
    expect(screen.getByText('MM')).toBeInTheDocument()
  })

  it('applies the brand token classes', () => {
    render(<Logo tenant="fams" />)
    expect(screen.getByText('FAMS')).toHaveClass('text-primary', 'font-bold')
  })

  it('renders a real asset image (natural aspect, wordmark as alt) when `src` is given', () => {
    render(<Logo tenant="fams" src="/branding/fams-login-logo.png" />)
    const img = screen.getByRole('img', { name: 'FAMS' })
    expect(img).toHaveAttribute('src', '/branding/fams-login-logo.png')
    expect(screen.queryByText('FAMS')).not.toBeInTheDocument()
  })

  it('renders the built-in horizontal mark for fams when `variant="horizontal"` and no `src` is given', () => {
    render(<Logo tenant="fams" variant="horizontal" />)
    expect(screen.getByRole('img', { name: 'FAMS' })).toBeInTheDocument()
    expect(screen.queryByText('FAMS')).not.toBeInTheDocument()
  })

  it('falls back to the text wordmark for a tenant with no horizontal mark', () => {
    render(<Logo tenant="ead" variant="horizontal" />)
    expect(screen.getByText('EAD')).toBeInTheDocument()
  })

  it('prefers an explicit `src` over the built-in horizontal mark', () => {
    render(<Logo tenant="fams" variant="horizontal" src="/branding/fams-login-logo.png" />)
    const img = screen.getByRole('img', { name: 'FAMS' })
    expect(img).toHaveAttribute('src', '/branding/fams-login-logo.png')
  })

  it('defaults variant to stacked and exposes it as data-variant', () => {
    const { container } = render(<Logo tenant="fams" />)
    expect(container.querySelector('[data-variant="stacked"]')).toBeInTheDocument()
  })
})
