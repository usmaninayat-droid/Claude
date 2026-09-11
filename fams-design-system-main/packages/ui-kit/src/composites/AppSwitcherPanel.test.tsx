import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TooltipProvider } from '../primitives/Tooltip'
import { AppSwitcherPanel, type AppSwitcherApp } from './AppSwitcherPanel'

const APPS: AppSwitcherApp[] = [
  { id: 'ccms', label: 'CCMS', active: true },
  { id: 'telematics', label: 'Telematics' },
  { id: 'workforce', label: 'Workforce' },
]

function renderPanel(props: Partial<React.ComponentProps<typeof AppSwitcherPanel>> = {}) {
  return render(
    <TooltipProvider>
      <AppSwitcherPanel apps={APPS} {...props} />
    </TooltipProvider>,
  )
}

describe('AppSwitcherPanel', () => {
  it('renders the header and one tile per app', () => {
    renderPanel()
    expect(screen.getByText('Switch Application')).toBeInTheDocument()
    for (const app of APPS) expect(screen.getByRole('button', { name: app.label })).toBeInTheDocument()
  })

  it('marks the active app with aria-current', () => {
    renderPanel()
    expect(screen.getByRole('button', { name: 'CCMS' })).toHaveAttribute('aria-current', 'true')
    expect(screen.getByRole('button', { name: 'Telematics' })).not.toHaveAttribute('aria-current')
  })

  it('picking a tile reports its id', () => {
    const onSelect = vi.fn()
    renderPanel({ onSelect })
    fireEvent.click(screen.getByRole('button', { name: 'Telematics' }))
    expect(onSelect).toHaveBeenCalledWith('telematics')
  })

  it('the expand control is the one route to the launch pad, and is optional', () => {
    const onGoHome = vi.fn()
    const { unmount } = renderPanel({ onGoHome })
    fireEvent.click(screen.getByRole('button', { name: 'Expand to Launch Pad' }))
    expect(onGoHome).toHaveBeenCalledOnce()
    unmount()
    renderPanel()
    expect(screen.queryByRole('button', { name: 'Expand to Launch Pad' })).not.toBeInTheDocument()
  })

  it('a custom title overrides the header label', () => {
    renderPanel({ title: 'Your applications' })
    expect(screen.getByText('Your applications')).toBeInTheDocument()
  })
})
