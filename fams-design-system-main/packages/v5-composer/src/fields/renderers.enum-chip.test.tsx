import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { FieldDescriptor } from './types'
import { getReadRenderer } from './registry'

/**
 * `ReadEnum`'s generic fallback branch (any `SingleSelect` whose label
 * matches neither `PRIORITY_LABEL_RE` nor `STATUS_LABEL_RE`) — the code path
 * P1-14 confirmed a job order's "Maintenance Type"/"Issue Type" chip and an
 * asset's "Vehicle Type" chip share verbatim (fix7, UX round 6 P1-2/P1-14
 * gate blocker).
 *
 * Pinned here: the chip's TEXT color role, not its variant/fill/border —
 * `Badge`'s `secondary` variant is otherwise unchanged (Button's secondary
 * variant, tabs, and every other `variant="secondary"` consumer keep
 * `text-secondary-foreground`).
 */
function descriptor(overrides: Partial<FieldDescriptor> = {}): FieldDescriptor {
  return {
    id: 'fld_type',
    col: 'type',
    label: 'Maintenance Type',
    type: 'SingleSelect',
    required: false,
    multiple: false,
    options: ['corrective', 'preventive'],
    ...overrides,
  }
}

const Read = getReadRenderer('SingleSelect')

describe('ReadEnum — generic fallback dot chip (fix7, P1-2/P1-14)', () => {
  it('renders text-secondary-foreground-strong, not the failing text-secondary-foreground (4.22:1)', () => {
    render(<Read descriptor={descriptor()} value="corrective" />)
    // `humanizeEnumValue` only reshapes multi-segment machine tokens
    // (kebab/snake/camelCase) — a plain already-lowercase word like
    // "corrective" passes through unchanged, so the rendered text stays
    // lowercase.
    const chip = screen.getByText('corrective')
    expect(chip).toHaveClass('text-secondary-foreground-strong')
    expect(chip).not.toHaveClass('text-secondary-foreground')
    // Fill/border untouched — same `secondary` variant as before.
    expect(chip).toHaveClass('bg-secondary', 'border-transparent')
  })

  it('applies the same fix to an unrelated SingleSelect label (vehicle type) — one shared code path', () => {
    render(<Read descriptor={descriptor({ label: 'Vehicle Type', options: ['tanker', 'pickup'] })} value="tanker" />)
    const chip = screen.getByText('tanker')
    expect(chip).toHaveClass('text-secondary-foreground-strong')
  })

  it('does not affect the status-labeled branch (solid badge, untouched by this fix)', () => {
    render(
      <Read
        descriptor={descriptor({ label: 'Status', options: ['active', 'inactive'] })}
        value="active"
      />,
    )
    const chip = screen.getByText('active')
    expect(chip).not.toHaveClass('text-secondary-foreground-strong')
  })
})

/**
 * fix7 (run-2026-09-05, P1-d): the PM detail sheet's Details panel and
 * Overview tab printed the raw `scheduled` storage key on the same sheet as
 * the header pill's correctly-labelled "Scheduled" badge. `humanizeEnumValue`
 * (fix4) cannot repair this — a single lowercase word carries no separator
 * and no camelCase hump, so it is indistinguishable from a legitimately
 * lowercase value like `hazmat`/`fired` and must be left alone. The fix
 * instead threads the module's own `uiConfig.statusList` through the
 * compiler onto the `status` column's descriptor (`statusLabels`), and
 * `ReadEnum` consults that FIRST — the same data the header badge already
 * reads, so the two can never disagree.
 */
describe('ReadEnum — status column resolves through statusLabels first (fix7, P1-d)', () => {
  it('renders the authored label for a single-lowercase-word status key, not the raw storage value', () => {
    render(
      <Read
        descriptor={descriptor({
          col: 'status',
          label: 'Status',
          options: ['scheduled', 'completed'],
          statusLabels: { scheduled: 'Scheduled', completed: 'Completed' },
        })}
        value="scheduled"
      />,
    )
    expect(screen.getByText('Scheduled')).toBeInTheDocument()
    expect(screen.queryByText('scheduled')).not.toBeInTheDocument()
  })

  it('falls back to humanizeEnumValue when the key has no statusLabels entry', () => {
    render(
      <Read
        descriptor={descriptor({
          col: 'status',
          label: 'Status',
          options: ['reported-issues'],
          statusLabels: { scheduled: 'Scheduled' },
        })}
        value="reported-issues"
      />,
    )
    expect(screen.getByText('Reported Issues')).toBeInTheDocument()
  })

  it('never rewrites a non-status column even when it shares the exact same stored value', () => {
    render(
      <Read
        descriptor={descriptor({ col: 'systemcol6', label: 'Fuel Type', options: ['CNG'], statusLabels: undefined })}
        value="CNG"
      />,
    )
    expect(screen.getByText('CNG')).toBeInTheDocument()
  })
})
