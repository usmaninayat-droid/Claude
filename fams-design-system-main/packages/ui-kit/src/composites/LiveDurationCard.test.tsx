import { createRef } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { LiveDurationCard } from './LiveDurationCard'

const NOW = new Date('2026-01-01T12:00:00.000Z').getTime()

describe('LiveDurationCard', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: NOW })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('completed mode (`end` set)', () => {
    it('renders the static total and the default label', () => {
      render(
        <LiveDurationCard
          start={new Date(NOW - 2 * 60 * 60 * 1000)}
          end={new Date(NOW - 30 * 60 * 1000)}
        />,
      )
      expect(screen.getByText('Total duration')).toBeInTheDocument()
      expect(screen.getByText('1h 30m')).toBeInTheDocument()
    })

    it('does not tick — value stays the same as fake time advances', () => {
      render(
        <LiveDurationCard
          start={new Date(NOW - 2 * 60 * 60 * 1000)}
          end={new Date(NOW - 30 * 60 * 1000)}
        />,
      )
      act(() => {
        vi.advanceTimersByTime(5000)
      })
      expect(screen.getByText('1h 30m')).toBeInTheDocument()
    })

    it('has no progressbar', () => {
      render(<LiveDurationCard start={new Date(NOW - 60000)} end={new Date(NOW)} />)
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    })

    it('accepts a custom completedLabel, replacing the default', () => {
      render(
        <LiveDurationCard
          start={new Date(NOW - 60000)}
          end={new Date(NOW)}
          completedLabel="Contract duration"
        />,
      )
      expect(screen.getByText('Contract duration')).toBeInTheDocument()
      expect(screen.queryByText('Total duration')).not.toBeInTheDocument()
    })
  })

  describe('tracking mode (`expectedEnd` set, no `end`)', () => {
    it('renders the live elapsed value, the expected total, and a progressbar', () => {
      render(
        <LiveDurationCard
          start={new Date(NOW - 30 * 60 * 1000)}
          expectedEnd={new Date(NOW + 30 * 60 * 1000)}
        />,
      )
      expect(screen.getByText('In progress')).toBeInTheDocument()
      expect(screen.getByText('30m 0s')).toBeInTheDocument()
      expect(screen.getByText('expected 1h 0m')).toBeInTheDocument()
      const bar = screen.getByRole('progressbar')
      expect(bar).toHaveAttribute('aria-valuenow', '50')
      expect(screen.queryByText(/Over expected by/)).not.toBeInTheDocument()
    })

    it('ticks live every second', () => {
      render(
        <LiveDurationCard
          start={new Date(NOW - 30 * 60 * 1000)}
          expectedEnd={new Date(NOW + 30 * 60 * 1000)}
        />,
      )
      expect(screen.getByText('30m 0s')).toBeInTheDocument()
      act(() => {
        vi.advanceTimersByTime(1000)
      })
      expect(screen.getByText('30m 1s')).toBeInTheDocument()
    })

    it('switches to the danger tone and shows the overage once elapsed passes expected', () => {
      render(
        <LiveDurationCard
          start={new Date(NOW - 90 * 60 * 1000)}
          expectedEnd={new Date(NOW - 30 * 60 * 1000)}
        />,
      )
      expect(screen.getByText('Over expected by 30m')).toBeInTheDocument()
      const bar = screen.getByRole('progressbar')
      expect(bar).toHaveAttribute('aria-valuenow', '100')
    })

    it('accepts custom tracking/expected/over labels', () => {
      render(
        <LiveDurationCard
          start={new Date(NOW - 90 * 60 * 1000)}
          expectedEnd={new Date(NOW - 30 * 60 * 1000)}
          trackingLabel="SLA active"
          expectedLabel="target"
          overLabel="Breached by"
        />,
      )
      expect(screen.getByText('SLA active')).toBeInTheDocument()
      expect(screen.getByText(/target/)).toBeInTheDocument()
      expect(screen.getByText(/Breached by/)).toBeInTheDocument()
    })

    it('ignores `expectedEnd` once `end` is also set (completed wins)', () => {
      render(
        <LiveDurationCard
          start={new Date(NOW - 90 * 60 * 1000)}
          expectedEnd={new Date(NOW - 30 * 60 * 1000)}
          end={new Date(NOW)}
        />,
      )
      expect(screen.getByText('Total duration')).toBeInTheDocument()
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    })
  })

  describe('open-ended mode (neither `expectedEnd` nor `end`)', () => {
    it('renders a live elapsed counter with no progressbar', () => {
      render(<LiveDurationCard start={new Date(NOW - 5 * 60 * 1000)} />)
      expect(screen.getByText('Elapsed')).toBeInTheDocument()
      expect(screen.getByText('5m 0s')).toBeInTheDocument()
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    })

    it('ticks live every second', () => {
      render(<LiveDurationCard start={new Date(NOW - 5 * 60 * 1000)} />)
      act(() => {
        vi.advanceTimersByTime(2000)
      })
      expect(screen.getByText('5m 2s')).toBeInTheDocument()
    })
  })

  describe('size="sm" (compact/badge)', () => {
    it('renders a single-line status with no progressbar in tracking mode', () => {
      render(
        <LiveDurationCard
          size="sm"
          start={new Date(NOW - 30 * 60 * 1000)}
          expectedEnd={new Date(NOW + 30 * 60 * 1000)}
        />,
      )
      const status = screen.getByRole('status')
      expect(status.textContent).toContain('In progress')
      expect(status.textContent).toContain('30m 0s')
      expect(status.textContent).toContain('1h 0m')
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    })
  })

  describe('cleanup and refs', () => {
    it('clears the interval on unmount', () => {
      const clearSpy = vi.spyOn(globalThis, 'clearInterval')
      const { unmount } = render(<LiveDurationCard start={new Date(NOW - 60000)} />)
      unmount()
      expect(clearSpy).toHaveBeenCalled()
    })

    it('forwards the ref to the root element', () => {
      const ref = createRef<HTMLDivElement>()
      render(<LiveDurationCard ref={ref} start={new Date(NOW - 60000)} end={new Date(NOW)} />)
      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })

    it('supports icon={null} to omit the leading icon/dot entirely', () => {
      render(<LiveDurationCard start={new Date(NOW - 60000)} end={new Date(NOW)} icon={null} />)
      const status = screen.getByRole('status')
      expect(status.querySelector('svg')).not.toBeInTheDocument()
    })
  })
})
