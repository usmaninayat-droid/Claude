import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StatusView } from './StatusView'

describe('StatusView', () => {
  it('renders the empty kind default icon, title, and description', () => {
    const { container } = render(<StatusView kind="empty" />)
    expect(container.querySelector('svg')).toBeInTheDocument()
    expect(screen.getByText('Nothing here yet')).toBeInTheDocument()
    expect(screen.getByText('Once records are created, they’ll show up here.')).toBeInTheDocument()
  })

  it('renders the error kind default icon/copy with the alert role', () => {
    const { container } = render(<StatusView kind="error" />)
    expect(container.querySelector('svg')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('renders the no-permission kind default icon/copy without an alert role', () => {
    const { container } = render(<StatusView kind="no-permission" />)
    expect(container.querySelector('svg')).toBeInTheDocument()
    expect(screen.getByText('Restricted')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('lets the caller override title/description and provide an action', () => {
    const onRetry = vi.fn()
    render(
      <StatusView
        kind="error"
        title="Could not reach Oracle GRN"
        description="Financial settlement data is stale until the next sync."
        action={<button onClick={onRetry}>Retry sync</button>}
      />,
    )
    expect(screen.getByText('Could not reach Oracle GRN')).toBeInTheDocument()
    expect(
      screen.getByText('Financial settlement data is stale until the next sync.'),
    ).toBeInTheDocument()
    const btn = screen.getByRole('button', { name: 'Retry sync' })
    fireEvent.click(btn)
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('lets the caller override the default icon', () => {
    render(<StatusView kind="empty" icon={<svg data-testid="custom-icon" />} />)
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument()
  })
  describe('coming-soon kind', () => {
    it('renders the brand-tinted chip and the generic default copy', () => {
      const { container } = render(<StatusView kind="coming-soon" />)
      expect(screen.getByText('Coming soon')).toBeInTheDocument()
      expect(screen.getByText('This surface hasn’t been built yet.')).toBeInTheDocument()
      expect(container.querySelector('[data-slot="status-view"] > div')).toHaveClass(
        'bg-secondary',
        'text-primary',
      )
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('folds `subject` into the default title', () => {
      render(<StatusView kind="coming-soon" subject="Zones Management" />)
      expect(screen.getByText('Zones Management is coming soon')).toBeInTheDocument()
    })

    it('an explicit title wins over `subject`', () => {
      render(<StatusView kind="coming-soon" subject="Zones Management" title="Not yet" />)
      expect(screen.getByText('Not yet')).toBeInTheDocument()
      expect(screen.queryByText('Zones Management is coming soon')).not.toBeInTheDocument()
    })

    it('`subject` does not alter the other kinds’ defaults', () => {
      render(<StatusView kind="empty" subject="Zones Management" />)
      expect(screen.getByText('Nothing here yet')).toBeInTheDocument()
    })
  })
})
