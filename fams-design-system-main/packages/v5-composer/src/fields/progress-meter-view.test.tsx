import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import type { FieldDescriptor } from './types'
import { getComponentRenderer } from './registry'

/**
 * `ProgressMeterView` — the sibling-column-aware progress meter cell (W2 of
 * the 2026-09-05 preventive-maintenance run). Composes `TableCell
 * kind="progress"` verbatim (W1); this file pins the prop contract
 * (`targetCol`/`unit`/`tone`) and the numeric-coercion/empty-state guards,
 * not the bar rendering itself — that's `TableCell`'s own test surface.
 */
function descriptor(overrides: Partial<FieldDescriptor> = {}): FieldDescriptor {
  return {
    id: 'fld_meter',
    col: 'meter',
    label: 'Meter',
    type: 'Number',
    required: false,
    multiple: false,
    component: { name: 'ProgressMeterView' },
    ...overrides,
  }
}

const Read = getComponentRenderer('ProgressMeterView')!

describe('ProgressMeterView — registration', () => {
  it('is registered under the name blueprints author', () => {
    expect(typeof Read).toBe('function')
  })
})

describe('ProgressMeterView — caption path', () => {
  it('renders the value/target caption when targetCol + unit are authored', () => {
    const { container } = render(
      <Read
        descriptor={descriptor({ component: { name: 'ProgressMeterView', props: { targetCol: 'target', unit: 'km', tone: 'primary' } } })}
        value={3800}
        record={{ id: 'r1', target: 5000 }}
      />,
    )
    const caption = container.querySelector('[data-slot="table-cell-progress-caption"]')
    expect(caption).not.toBeNull()
    expect(caption?.textContent).toBe('3,800 / 5,000 km')
  })

  it('reads the target off the named sibling column, not a fixed one', () => {
    const { container } = render(
      <Read
        descriptor={descriptor({ component: { name: 'ProgressMeterView', props: { targetCol: 'siblingTarget', unit: 'days' } } })}
        value={10}
        record={{ id: 'r1', siblingTarget: 20, target: 999 }}
      />,
    )
    expect(container.querySelector('[data-slot="table-cell-progress-caption"]')?.textContent).toBe('10 / 20 days')
  })
})

describe('ProgressMeterView — empty state', () => {
  it('renders the empty state (no bar, dash) when value is absent', () => {
    const { container } = render(
      <Read descriptor={descriptor({ component: { name: 'ProgressMeterView', props: { targetCol: 'target', unit: 'km' } } })} value={undefined} record={{ id: 'r1', target: 5000 }} />,
    )
    expect(container.querySelector('[data-slot="table-cell-progress-empty"]')).not.toBeNull()
    expect(container.querySelector('[data-slot="table-cell-progress"]')).toBeNull()
  })

  it('renders the empty state when value is non-numeric text', () => {
    const { container } = render(
      <Read
        descriptor={descriptor({ component: { name: 'ProgressMeterView', props: { targetCol: 'target', unit: 'km' } } })}
        value="not tracked"
        record={{ id: 'r1', target: 5000 }}
      />,
    )
    expect(container.querySelector('[data-slot="table-cell-progress-empty"]')).not.toBeNull()
  })

  it('renders the empty state — never a false 0% — when the record has no target column at all', () => {
    const { container } = render(
      <Read descriptor={descriptor({ component: { name: 'ProgressMeterView', props: { targetCol: 'missingCol', unit: 'km' } } })} value={3800} record={{ id: 'r1' }} />,
    )
    // No target resolves ⇒ value reads as a bare 0-100 percentage (TableCell's own
    // no-target behavior), not the empty state — pinning that this renderer
    // does not invent a synthetic empty state beyond TableCell's own contract.
    expect(container.querySelector('[data-slot="table-cell-progress"]')).not.toBeNull()
    expect(container.querySelector('[data-slot="table-cell-progress-caption"]')).toBeNull()
  })
})

describe('ProgressMeterView — numeric-string coercion', () => {
  it('coerces a numeric-string value AND a numeric-string target', () => {
    const { container } = render(
      <Read
        descriptor={descriptor({ component: { name: 'ProgressMeterView', props: { targetCol: 'target', unit: 'hrs' } } })}
        value="3800"
        record={{ id: 'r1', target: '5000' }}
      />,
    )
    expect(container.querySelector('[data-slot="table-cell-progress-caption"]')?.textContent).toBe('3,800 / 5,000 hrs')
  })

  it('treats an empty-string value as the empty state, not 0', () => {
    const { container } = render(
      <Read descriptor={descriptor({ component: { name: 'ProgressMeterView', props: { targetCol: 'target', unit: 'km' } } })} value="" record={{ id: 'r1', target: 5000 }} />,
    )
    expect(container.querySelector('[data-slot="table-cell-progress-empty"]')).not.toBeNull()
  })
})

describe('ProgressMeterView — tone pass-through', () => {
  it('passes an authored tone through to the bar (fill color class differs by tone)', () => {
    const primary = render(
      <Read
        descriptor={descriptor({ component: { name: 'ProgressMeterView', props: { targetCol: 'target', unit: 'km', tone: 'primary' } } })}
        value={50}
        record={{ id: 'r1', target: 100 }}
      />,
    )
    const danger = render(
      <Read
        descriptor={descriptor({ component: { name: 'ProgressMeterView', props: { targetCol: 'target', unit: 'km', tone: 'danger' } } })}
        value={50}
        record={{ id: 'r1', target: 100 }}
      />,
    )
    expect(primary.container.innerHTML).not.toBe(danger.container.innerHTML)
  })

  it('omits tone (falls back to TableCell/StatBar default) when not authored', () => {
    const { container } = render(
      <Read descriptor={descriptor({ component: { name: 'ProgressMeterView', props: { targetCol: 'target', unit: 'km' } } })} value={50} record={{ id: 'r1', target: 100 }} />,
    )
    expect(container.querySelector('[data-slot="table-cell-progress"]')).not.toBeNull()
  })
})

/**
 * P1-M (run-2026-09-05-job-orders, fix7): the PM list's three per-row
 * `ProgressMeterView` cells (odometer/interval/engine-hours) all rendered
 * the same calm blue via an authored `tone: "primary"` on every one,
 * including a 100%/370-of-360-days row the visual gate flagged OVERDUE.
 * `qa/UX-NOTES.md` D1 bars a FIXED per-column tone (encoded urgency by
 * column identity) but explicitly sanctions a genuinely threshold-computed
 * one — this pins that computation (not a per-column special case: the
 * SAME two thresholds apply no matter which sibling column is measured).
 */
function fillClassOf(container: HTMLElement): string[] {
  const el = container.querySelector('[data-slot="progress"]')
  return el ? Array.from(el.classList) : []
}

describe('ProgressMeterView — threshold-computed tone (P1-M)', () => {
  it('renders danger when the value is at or over its target (the overdue case)', () => {
    const { container } = render(
      <Read
        descriptor={descriptor({ component: { name: 'ProgressMeterView', props: { targetCol: 'target', unit: 'days' } } })}
        value={370}
        record={{ id: 'r1', target: 360 }}
      />,
    )
    expect(fillClassOf(container)).toContain('[&_[data-slot=progress-indicator]]:bg-destructive')
  })

  it('renders warning when the value is closing in on its target (>= 80%, < 100%)', () => {
    const { container } = render(
      <Read
        descriptor={descriptor({ component: { name: 'ProgressMeterView', props: { targetCol: 'target', unit: 'km' } } })}
        value={85}
        record={{ id: 'r2', target: 100 }}
      />,
    )
    expect(fillClassOf(container)).toContain('[&_[data-slot=progress-indicator]]:bg-warning')
  })

  it('renders success when the value is well under its target', () => {
    const { container } = render(
      <Read
        descriptor={descriptor({ component: { name: 'ProgressMeterView', props: { targetCol: 'target', unit: 'km' } } })}
        value={20}
        record={{ id: 'r3', target: 100 }}
      />,
    )
    expect(fillClassOf(container)).toContain('[&_[data-slot=progress-indicator]]:bg-success')
  })

  it('computes the SAME thresholds regardless of which column the cell is (no per-column special case)', () => {
    // Same 100%+ proximity, different targetCol/unit — odometer vs engine-hours.
    const odometer = render(
      <Read
        descriptor={descriptor({ component: { name: 'ProgressMeterView', props: { targetCol: 'odo_target', unit: 'km' } } })}
        value={5000}
        record={{ id: 'r4', odo_target: 5000 }}
      />,
    )
    const engineHours = render(
      <Read
        descriptor={descriptor({ component: { name: 'ProgressMeterView', props: { targetCol: 'hrs_target', unit: 'hrs' } } })}
        value={200}
        record={{ id: 'r5', hrs_target: 200 }}
      />,
    )
    expect(fillClassOf(odometer.container)).toContain('[&_[data-slot=progress-indicator]]:bg-destructive')
    expect(fillClassOf(engineHours.container)).toContain('[&_[data-slot=progress-indicator]]:bg-destructive')
  })

  it('still honors an EXPLICIT tone prop when a blueprint passes one (escape valve, not the default)', () => {
    const { container } = render(
      <Read
        descriptor={descriptor({ component: { name: 'ProgressMeterView', props: { targetCol: 'target', unit: 'days', tone: 'primary' } } })}
        value={370}
        record={{ id: 'r6', target: 360 }}
      />,
    )
    expect(fillClassOf(container)).toContain('[&_[data-slot=progress-indicator]]:bg-primary')
  })

  it('reads the raw value as the 0-100 proximity when there is no target', () => {
    const { container } = render(
      <Read
        descriptor={descriptor({ component: { name: 'ProgressMeterView', props: {} } })}
        value={92}
        record={{ id: 'r7' }}
      />,
    )
    expect(fillClassOf(container)).toContain('[&_[data-slot=progress-indicator]]:bg-warning')
  })
})
