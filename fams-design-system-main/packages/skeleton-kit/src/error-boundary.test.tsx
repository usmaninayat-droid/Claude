import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RootErrorBoundary, type ErrorFallbackProps } from './error-boundary'

function Boom(): never {
  throw new Error('kaboom')
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('RootErrorBoundary', () => {
  it('renders the token-styled default fallback when a child throws', () => {
    // React logs caught errors to console.error — silence it for a clean gate.
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <RootErrorBoundary>
        <Boom />
      </RootErrorBoundary>,
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText('kaboom')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('renders a custom fallback and forwards the error', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    function Custom({ error }: ErrorFallbackProps) {
      return <div>custom: {error.message}</div>
    }
    render(
      <RootErrorBoundary fallback={Custom}>
        <Boom />
      </RootErrorBoundary>,
    )
    expect(screen.getByText('custom: kaboom')).toBeInTheDocument()
  })

  it('renders children unchanged when nothing throws', () => {
    render(
      <RootErrorBoundary>
        <span>all good</span>
      </RootErrorBoundary>,
    )
    expect(screen.getByText('all good')).toBeInTheDocument()
  })
})
