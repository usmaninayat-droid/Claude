import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ArrowRight } from '../icons'
import { TableCell } from './TableCell'

describe('TableCell', () => {
  describe('kind="text"', () => {
    it('renders the value', () => {
      render(<TableCell kind="text" value="TAJ-1042" />)
      expect(screen.getByText('TAJ-1042')).toBeInTheDocument()
    })

    it('renders an em dash placeholder when the value is empty', () => {
      render(<TableCell kind="text" value="" />)
      expect(screen.getByText('—')).toBeInTheDocument()
    })

    it('renders an em dash placeholder when the value is omitted', () => {
      render(<TableCell kind="text" />)
      expect(screen.getByText('—')).toBeInTheDocument()
    })
  })

  it('kind="empty" always renders the em dash placeholder', () => {
    render(<TableCell kind="empty" />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  describe('kind="checkbox"', () => {
    it('renders a checkbox reflecting `checked`', () => {
      render(<TableCell kind="checkbox" checked ariaLabel="Select row a" />)
      expect(screen.getByRole('checkbox', { name: 'Select row a' })).toHaveAttribute('aria-checked', 'true')
    })

    it('falls back to a generic aria-label when none is given', () => {
      render(<TableCell kind="checkbox" checked={false} />)
      expect(screen.getByRole('checkbox', { name: 'Select row' })).toBeInTheDocument()
    })

    it('fires onCheckedChange(true) when toggled on', () => {
      const onCheckedChange = vi.fn()
      render(<TableCell kind="checkbox" checked={false} onCheckedChange={onCheckedChange} />)
      fireEvent.click(screen.getByRole('checkbox'))
      expect(onCheckedChange).toHaveBeenCalledWith(true)
    })

    it('supports the indeterminate display state', () => {
      render(<TableCell kind="checkbox" checked="indeterminate" />)
      expect(screen.getByRole('checkbox')).toHaveAttribute('data-state', 'indeterminate')
    })
  })

  describe('kind="badge"', () => {
    it('renders the label with the given variant', () => {
      render(<TableCell kind="badge" label="Compliant" variant="success" />)
      expect(screen.getByText('Compliant')).toBeInTheDocument()
    })
  })

  describe('kind="badges"', () => {
    it('renders every badge label', () => {
      render(
        <TableCell
          kind="badges"
          badges={[
            { id: 'a', label: 'Lot 1', variant: 'info' },
            { id: 'b', label: 'Overdue', variant: 'destructive' },
          ]}
        />,
      )
      expect(screen.getByText('Lot 1')).toBeInTheDocument()
      expect(screen.getByText('Overdue')).toBeInTheDocument()
    })
  })

  describe('kind="toggle"', () => {
    it('renders a switch reflecting `checked`', () => {
      render(<TableCell kind="toggle" checked ariaLabel="Active" />)
      expect(screen.getByRole('switch', { name: 'Active' })).toHaveAttribute('aria-checked', 'true')
    })

    it('fires onCheckedChange with the next value', () => {
      const onCheckedChange = vi.fn()
      render(<TableCell kind="toggle" checked={false} onCheckedChange={onCheckedChange} />)
      fireEvent.click(screen.getByRole('switch'))
      expect(onCheckedChange).toHaveBeenCalledWith(true)
    })
  })

  describe('kind="gauge"', () => {
    it('renders a progressbar with the rounded percentage label', () => {
      render(<TableCell kind="gauge" value={72.4} />)
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
      expect(screen.getByText('72%')).toBeInTheDocument()
    })

    it('hides the label when hideLabel is set', () => {
      render(<TableCell kind="gauge" value={50} hideLabel />)
      expect(screen.queryByText('50%')).not.toBeInTheDocument()
    })
  })

  describe('kind="progress"', () => {
    it('renders a progressbar and the clamped percentage text', () => {
      render(<TableCell kind="progress" value={140} />)
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
      expect(screen.getByText('100%')).toBeInTheDocument()
    })

    it('hides the value text when showValue is false', () => {
      render(<TableCell kind="progress" value={40} showValue={false} />)
      expect(screen.queryByText('40%')).not.toBeInTheDocument()
    })

    it('renders no caption when target/unit are omitted (original contract, unchanged)', () => {
      render(<TableCell kind="progress" value={40} />)
      expect(document.querySelector('[data-slot="table-cell-progress-caption"]')).not.toBeInTheDocument()
    })

    it('derives the fill percentage from value/target and renders the "value / target unit" caption', () => {
      render(<TableCell kind="progress" value={3800} target={5000} unit="km" />)
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '76')
      expect(screen.getByText('76%')).toBeInTheDocument()
      expect(screen.getByText('3,800 / 5,000 km')).toBeInTheDocument()
    })

    it('omits the unit suffix when unit is not given', () => {
      render(<TableCell kind="progress" value={81} target={90} />)
      expect(screen.getByText('81 / 90')).toBeInTheDocument()
    })

    it('renders a grey empty track and a dash for an absent value — never a false "0%"', () => {
      render(<TableCell kind="progress" target={5000} unit="km" />)
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
      expect(screen.queryByText('0%')).not.toBeInTheDocument()
      expect(screen.getByText('–')).toBeInTheDocument()
      expect(document.querySelector('[data-slot="table-cell-progress-empty-track"]')).toBeInTheDocument()
    })

    it('renders the same empty state for a non-numeric value', () => {
      render(<TableCell kind="progress" value={Number.NaN} target={5000} unit="km" />)
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
      expect(screen.getByText('–')).toBeInTheDocument()
    })

    it('clamps a derived percentage above 100 (value exceeding target)', () => {
      render(<TableCell kind="progress" value={7000} target={5000} unit="km" />)
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
      expect(screen.getByText('100%')).toBeInTheDocument()
    })

    it.each([
      ['warning', 'bg-warning'],
      ['danger', 'bg-destructive'],
      ['success', 'bg-success'],
    ] as const)('applies the %s tone to the bar fill via a token utility class', (tone, expectedClass) => {
      const { container } = render(<TableCell kind="progress" value={70} target={100} tone={tone} />)
      const bar = container.querySelector('[data-slot="progress"]')
      expect(bar).toHaveClass(`[&_[data-slot=progress-indicator]]:${expectedClass}`)
    })

    it('defaults to the primary tone', () => {
      const { container } = render(<TableCell kind="progress" value={70} target={100} />)
      expect(container.querySelector('[data-slot="progress"]')).toHaveClass(
        '[&_[data-slot=progress-indicator]]:bg-primary',
      )
    })
  })

  describe('kind="trend"', () => {
    it('renders the direction, value, and optional note', () => {
      render(<TableCell kind="trend" direction="up" value="12%" note="vs last month" />)
      expect(screen.getByText('12%')).toBeInTheDocument()
      expect(screen.getByText('vs last month')).toBeInTheDocument()
    })
  })

  describe('kind="avatar"', () => {
    it('renders initials fallback and the label', () => {
      render(<TableCell kind="avatar" name="Kashish Bindrani" label="Kashish Bindrani" />)
      expect(screen.getByText('K')).toBeInTheDocument()
      expect(screen.getByText('Kashish Bindrani')).toBeInTheDocument()
    })

    it('stacks a secondary line under the label when given (figma 4864:9366 "User Info")', () => {
      render(<TableCell kind="avatar" name="Jane Doe" label="Jane Doe" secondary="jane.doe@example.com" />)
      expect(screen.getByText('Jane Doe')).toBeInTheDocument()
      expect(screen.getByText('jane.doe@example.com')).toBeInTheDocument()
    })

    it('omits the secondary line by default — unchanged single-line cell', () => {
      const { container } = render(<TableCell kind="avatar" name="Jane Doe" label="Jane Doe" />)
      expect(container.querySelectorAll('span').length).toBeGreaterThan(0)
      expect(screen.queryByText('jane.doe@example.com')).not.toBeInTheDocument()
    })

    it('renders an optional leading icon before the avatar', () => {
      render(<TableCell kind="avatar" name="Jane Doe" label="Jane Doe" icon={<span data-testid="lead-icon" />} />)
      expect(screen.getByTestId('lead-icon')).toBeInTheDocument()
    })
  })

  describe('kind="tags"', () => {
    it('renders every tag label', () => {
      render(
        <TableCell
          kind="tags"
          tags={[
            { value: 'a', label: 'Recurring' },
            { value: 'b', label: 'Priority' },
          ]}
        />,
      )
      expect(screen.getByText('Recurring')).toBeInTheDocument()
      expect(screen.getByText('Priority')).toBeInTheDocument()
    })

    it('collapses overflow into a "+N" chip beyond `max` (figma 4868:2062 Tags column)', () => {
      render(
        <TableCell
          kind="tags"
          max={2}
          tags={[
            { value: 'a', label: 'A' },
            { value: 'b', label: 'B' },
            { value: 'c', label: 'C' },
            { value: 'd', label: 'D' },
          ]}
        />,
      )
      expect(screen.getByText('+2')).toBeInTheDocument()
    })

    it('renders an em dash placeholder when tags is empty', () => {
      render(<TableCell kind="tags" tags={[]} />)
      expect(screen.getByText('—')).toBeInTheDocument()
    })
  })

  describe('kind="avatar-stack"', () => {
    it('renders an overflow badge beyond `max`', () => {
      render(
        <TableCell
          kind="avatar-stack"
          max={2}
          avatars={[
            { id: '1', name: 'Ali Rizwan' },
            { id: '2', name: 'Usama Ejaz' },
            { id: '3', name: 'Emmad Ahmad' },
          ]}
        />,
      )
      expect(screen.getByText('+1')).toBeInTheDocument()
    })

    it('renders no overflow badge when avatars fit within `max`', () => {
      render(<TableCell kind="avatar-stack" avatars={[{ id: '1', name: 'Ali Rizwan' }]} />)
      expect(screen.queryByText(/^\+/)).not.toBeInTheDocument()
    })
  })

  describe('kind="actions"', () => {
    it('renders one labelled button per action and fires onClick', () => {
      const onClick = vi.fn()
      render(
        <TableCell
          kind="actions"
          actions={[{ id: 'open', icon: <ArrowRight />, label: 'Open', onClick }]}
        />,
      )
      fireEvent.click(screen.getByRole('button', { name: 'Open' }))
      expect(onClick).toHaveBeenCalledTimes(1)
    })

    it('defaults alignment to `end`', () => {
      render(<TableCell kind="actions" actions={[{ id: 'open', icon: <ArrowRight />, label: 'Open' }]} />)
      expect(screen.getByRole('button', { name: 'Open' }).closest('[data-slot="table-cell"]')).toHaveClass(
        'justify-end',
      )
    })

    it('disables the action via the canonical `disabled` prop (and via the deprecated `isDisabled` alias)', () => {
      render(
        <TableCell
          kind="actions"
          actions={[
            { id: 'a', icon: <ArrowRight />, label: 'A', disabled: true },
            { id: 'b', icon: <ArrowRight />, label: 'B', isDisabled: true },
          ]}
        />,
      )
      expect(screen.getByRole('button', { name: 'A' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'B' })).toBeDisabled()
    })

    it('tints the action destructive via the canonical `destructive` prop (and via the deprecated `isDestructive` alias)', () => {
      render(
        <TableCell
          kind="actions"
          actions={[
            { id: 'a', icon: <ArrowRight />, label: 'A', destructive: true },
            { id: 'b', icon: <ArrowRight />, label: 'B', isDestructive: true },
          ]}
        />,
      )
      expect(screen.getByRole('button', { name: 'A' })).toHaveClass('text-destructive')
      expect(screen.getByRole('button', { name: 'B' })).toHaveClass('text-destructive')
    })

    it('prefers the canonical `disabled`/`destructive` props over the deprecated aliases when both are given', () => {
      render(
        <TableCell
          kind="actions"
          actions={[{ id: 'a', icon: <ArrowRight />, label: 'A', disabled: false, isDisabled: true, destructive: false, isDestructive: true }]}
        />,
      )
      const button = screen.getByRole('button', { name: 'A' })
      expect(button).not.toBeDisabled()
      expect(button).not.toHaveClass('text-destructive')
    })

    it('renders circular bordered buttons tinted per action `tone` under appearance="outline" (figma 4868:2062)', () => {
      render(
        <TableCell
          kind="actions"
          appearance="outline"
          actions={[
            { id: 'reject', icon: <ArrowRight />, label: 'Reject', tone: 'destructive' },
            { id: 'accept', icon: <ArrowRight />, label: 'Accept', tone: 'primary' },
          ]}
        />,
      )
      const reject = screen.getByRole('button', { name: 'Reject' })
      const accept = screen.getByRole('button', { name: 'Accept' })
      expect(reject.className).toContain('rounded-full')
      expect(reject).toHaveClass('border-destructive', 'text-destructive')
      expect(accept).toHaveClass('border-primary', 'text-primary')
    })

    it('defaults appearance to "ghost" — unchanged borderless icon buttons', () => {
      render(<TableCell kind="actions" actions={[{ id: 'open', icon: <ArrowRight />, label: 'Open' }]} />)
      const button = screen.getByRole('button', { name: 'Open' })
      expect(button.className).not.toContain('rounded-full')
    })
  })

  it('kind="group-title" renders the label', () => {
    render(<TableCell kind="group-title" label="Lot 1 — Lavajet" />)
    expect(screen.getByText('Lot 1 — Lavajet')).toBeInTheDocument()
  })

  it('kind="group-divider" renders a decorative separator', () => {
    const { container } = render(<TableCell kind="group-divider" />)
    expect(container.querySelector('[data-slot="separator"]')).toBeInTheDocument()
  })

  describe('kind="activity"', () => {
    it('renders the label with a status dot', () => {
      const { container } = render(<TableCell kind="activity" label="Online" tone="success" />)
      expect(screen.getByText('Online')).toBeInTheDocument()
      expect(container.querySelector('.bg-success')).toBeInTheDocument()
    })

    it('pulses by default and can opt out via pulse={false}', () => {
      const { container, rerender } = render(<TableCell kind="activity" label="Online" tone="success" />)
      expect(container.querySelector('.animate-pulse')).toBeInTheDocument()

      rerender(<TableCell kind="activity" label="Idle" tone="neutral" pulse={false} />)
      expect(container.querySelector('.animate-pulse')).not.toBeInTheDocument()
    })

    it('defaults to the neutral tone when none is given', () => {
      const { container } = render(<TableCell kind="activity" label="Unknown" />)
      expect(container.querySelector('.bg-muted-foreground\\/50')).toBeInTheDocument()
    })
  })

  describe('kind="start-end-time"', () => {
    it('renders start and end values stacked', () => {
      render(<TableCell kind="start-end-time" start="08:00" end="16:00" />)
      expect(screen.getByText('08:00')).toBeInTheDocument()
      expect(screen.getByText('16:00')).toBeInTheDocument()
    })

    it('renders an em dash placeholder for a missing end value', () => {
      render(<TableCell kind="start-end-time" start="08:00" />)
      expect(screen.getByText('—')).toBeInTheDocument()
    })
  })

  describe('kind="tab-actions"', () => {
    it('renders one button per tab and fires onClick', () => {
      const onClick = vi.fn()
      render(
        <TableCell
          kind="tab-actions"
          tabs={[
            { id: 'overview', label: 'Overview', isActive: true },
            { id: 'history', label: 'History', onClick },
          ]}
        />,
      )
      fireEvent.click(screen.getByRole('button', { name: 'History' }))
      expect(onClick).toHaveBeenCalledTimes(1)
    })

    it('disables a tab when isDisabled is set', () => {
      render(<TableCell kind="tab-actions" tabs={[{ id: 'x', label: 'X', isDisabled: true }]} />)
      expect(screen.getByRole('button', { name: 'X' })).toBeDisabled()
    })

    it('marks a tab active via the canonical `active` prop', () => {
      render(<TableCell kind="tab-actions" tabs={[{ id: 'overview', label: 'Overview', active: true }]} />)
      expect(screen.getByRole('button', { name: 'Overview' })).toHaveClass('text-primary')
    })

    it('prefers the canonical `active` prop over the deprecated `isActive` alias when both are given', () => {
      render(<TableCell kind="tab-actions" tabs={[{ id: 'overview', label: 'Overview', active: false, isActive: true }]} />)
      expect(screen.getByRole('button', { name: 'Overview' })).not.toHaveClass('text-primary')
    })
  })

  describe('kind="entity"', () => {
    it('renders the media slot, the label and the secondary line', () => {
      const { container } = render(
        <TableCell
          kind="entity"
          media={<span data-testid="thumb" />}
          label="Tanker 01"
          secondary="VEH-01"
        />,
      )
      expect(screen.getByTestId('thumb')).toBeInTheDocument()
      expect(screen.getByText('Tanker 01')).toBeInTheDocument()
      expect(screen.getByText('VEH-01')).toBeInTheDocument()
      expect(container.querySelector('[data-slot="table-cell-media"]')).toBeInTheDocument()
    })

    it('renders label-only with no media wrapper', () => {
      const { container } = render(<TableCell kind="entity" label="Tanker 01" />)
      expect(screen.getByText('Tanker 01')).toBeInTheDocument()
      expect(container.querySelector('[data-slot="table-cell-media"]')).toBeNull()
    })

    it('renders an em dash placeholder when it has nothing to show', () => {
      render(<TableCell kind="entity" />)
      expect(screen.getByText('—')).toBeInTheDocument()
    })
  })

  describe('kind="icon-value"', () => {
    it('renders the value with a decorative leading glyph', () => {
      const { container } = render(
        <TableCell kind="icon-value" icon={<ArrowRight />} value="Al Wakrah, Qatar" />,
      )
      expect(screen.getByText('Al Wakrah, Qatar')).toBeInTheDocument()
      expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument()
    })

    it('names the glyph for assistive tech via iconLabel', () => {
      render(<TableCell kind="icon-value" icon={<ArrowRight />} value="Lusail, Qatar" iconLabel="Address" />)
      expect(screen.getByText('Address:')).toBeInTheDocument()
    })

    it('renders an em dash placeholder for an empty value', () => {
      render(<TableCell kind="icon-value" icon={<ArrowRight />} value="" />)
      expect(screen.getByText('—')).toBeInTheDocument()
    })
  })

  describe('kind="metrics"', () => {
    it('renders one labelled group per metric', () => {
      render(
        <TableCell
          kind="metrics"
          metrics={[
            { id: 'events', icon: <ArrowRight />, value: 4, label: 'Critical events', tone: 'danger' },
            { id: 'trips', icon: <ArrowRight />, value: 1, label: 'Trips today' },
          ]}
        />,
      )
      expect(screen.getByText('Critical events:')).toBeInTheDocument()
      expect(screen.getByText('Trips today:')).toBeInTheDocument()
      expect(screen.getByText('4')).toBeInTheDocument()
      expect(screen.getByText('1')).toBeInTheDocument()
    })

    it('renders an en dash for a metric with no value', () => {
      render(<TableCell kind="metrics" metrics={[{ id: 'events', label: 'Critical events' }]} />)
      expect(screen.getByText('–')).toBeInTheDocument()
    })

    it('renders an em dash placeholder for an empty metric list', () => {
      render(<TableCell kind="metrics" metrics={[]} />)
      expect(screen.getByText('—')).toBeInTheDocument()
    })
  })

  it('defaults alignment to `start` for non-action kinds', () => {
    const { container } = render(<TableCell kind="text" value="x" />)
    expect(container.querySelector('[data-slot="table-cell"]')).toHaveClass('justify-start')
  })

  it('respects an explicit `align` override', () => {
    const { container } = render(<TableCell kind="text" value="x" align="center" />)
    expect(container.querySelector('[data-slot="table-cell"]')).toHaveClass('justify-center')
  })

  it('forwards the ref to the root element', () => {
    const ref = createRef<HTMLDivElement>()
    render(<TableCell kind="text" value="x" ref={ref} />)
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
    expect(ref.current).toHaveAttribute('data-slot', 'table-cell')
  })

  it('merges a consumer className with the wrapper classes', () => {
    const { container } = render(<TableCell kind="text" value="x" className="ms-2" />)
    expect(container.querySelector('[data-slot="table-cell"]')).toHaveClass('ms-2', 'flex')
  })
})
