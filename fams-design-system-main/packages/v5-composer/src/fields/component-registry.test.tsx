import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { FieldDescriptor } from './types'
import { getComponentRenderer, registerComponent } from './registry'
import { FIELD_ICON_NAMES, resolveFieldIcon } from './renderers'
import {
  ColorsIcon,
  MarkerPin05Icon,
  Pin01Icon,
  SearchRefractionIcon,
  Thermometer03Icon,
  TrafficLightsIcon,
  ZonesIcon,
} from '@fams/ui-kit'

/**
 * The named-component override registry (`FieldDescriptor.component.name`,
 * checked before the type-keyed registry — see `render-cell-value.tsx` in
 * `@fams/v5-templates`). Covers the ticket-detail-page pre-registrations
 * (figma-spec-detail.md §3/§8): `PersonView`, `TimeRemainingView`,
 * `AddAffordanceView`, alongside the pre-existing `IconTextView`.
 */
function descriptor(overrides: Partial<FieldDescriptor> = {}): FieldDescriptor {
  return {
    id: 'fld_x',
    col: 'x',
    label: 'X',
    type: 'SmallText',
    required: false,
    multiple: false,
    ...overrides,
  }
}

describe('component registry — pre-registered named components', () => {
  it('IconTextView, IconNumberView, FlagToneDateView, PersonView, TimeRemainingView, AddAffordanceView, PriorityFlagView, and Vehicle3DView all resolve', () => {
    for (const name of [
      'IconTextView',
      'IconNumberView',
      'FlagToneDateView',
      'PersonView',
      'TimeRemainingView',
      'AddAffordanceView',
      'PriorityFlagView',
      'Vehicle3DView',
    ]) {
      expect(typeof getComponentRenderer(name)).toBe('function')
    }
  })

  it('an unregistered name resolves to undefined (caller falls back to the type registry)', () => {
    expect(getComponentRenderer('TotallyMadeUpView')).toBeUndefined()
  })

  it('registerComponent adds a new named override at runtime', () => {
    const Custom = () => <span data-testid="custom">custom</span>
    registerComponent('CustomView', Custom)
    expect(getComponentRenderer('CustomView')).toBe(Custom)
  })
})

/**
 * The named-icon vocabulary gate. Figma (untitled-ui) names are authored
 * verbatim in blueprints, so a missing mapping shows up in the app as a
 * silently ICON-LESS cell — invisible to a type-checker and easy to ship.
 * These tables make it fail loudly instead: every SPEC v2 name must be in
 * the vocabulary, and every vocabulary entry must render a real glyph.
 */
const SPEC_V2_ICON_NAMES = [
  // popup card 495:4143 field grid (P0-2)
  'user-03',
  'phone',
  'speedometer-04',
  'marker-pin-02',
  'signal-01',
  'speedometer-02',
  'alert-square',
  'thermometer-03',
  'image-05',
  'colors',
  // popup header meta row + top-right actions (P0-2)
  'tag-03',
  'copy-02',
  'share-04',
  'x-close',
  'mark',
  // hybrid list "Activity Overview" triplet (§2.2)
  'alert-triangle',
  'route',
] as const

describe('named-icon vocabulary (SPEC v2 P0-2 popup + §2.2 activity overview)', () => {
  const IconText = getComponentRenderer('IconTextView')!

  it.each([...SPEC_V2_ICON_NAMES])('the SPEC v2 name %s is part of the shared vocabulary', (name) => {
    expect(FIELD_ICON_NAMES).toContain(name)
  })

  it.each([...FIELD_ICON_NAMES])('%s resolves to a component that renders a real glyph', (name) => {
    expect(resolveFieldIcon(name)).toBeTruthy()
    const { container } = render(
      <IconText descriptor={descriptor({ component: { name: 'IconTextView', props: { icon: name } } })} value="v" />,
    )
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('`colors` and `thermometer-03` are the REAL Figma glyphs, not lucide near-misses (#32)', () => {
    expect(resolveFieldIcon('colors')).toBe(ColorsIcon)
    expect(resolveFieldIcon('thermometer-03')).toBe(Thermometer03Icon)
    // The map-tool marks answer to the same vocabulary (SPEC §2.3).
    expect(resolveFieldIcon('traffic-lights')).toBe(TrafficLightsIcon)
    expect(resolveFieldIcon('zones')).toBe(ZonesIcon)
    expect(resolveFieldIcon('pin-01')).toBe(Pin01Icon)
    expect(resolveFieldIcon('marker-pin-05')).toBe(MarkerPin05Icon)
    expect(resolveFieldIcon('search-refraction')).toBe(SearchRefractionIcon)
  })

  it('an unknown icon name degrades to text with no icon rather than throwing', () => {
    const { container } = render(
      <IconText
        descriptor={descriptor({ component: { name: 'IconTextView', props: { icon: 'not-a-real-icon-99' } } })}
        value="Bay 12"
      />,
    )
    expect(screen.getByText('Bay 12')).toBeInTheDocument()
    expect(container.querySelector('svg')).toBeNull()
    expect(resolveFieldIcon('not-a-real-icon-99')).toBeUndefined()
    expect(resolveFieldIcon(undefined)).toBeUndefined()
  })
})

/**
 * `IconNumberView` (kanban card meta-row parity fix, run-2026-09-05 fix7,
 * P1-G) — the same icon+value contract as `IconTextView`, but for a numeric
 * field: the leading icon must not cost the field its own `ReadNumber`
 * formatting (thousands separator + `descriptor.unit`).
 */
describe('IconNumberView', () => {
  const Read = getComponentRenderer('IconNumberView')!
  const withIcon = (icon: string, unit?: string) => descriptor({ type: 'Numeric', unit, component: { name: 'IconNumberView', props: { icon } } })

  it('renders the leading icon and keeps thousands-separated formatting + unit', () => {
    const { container } = render(<Read descriptor={withIcon('speedometer-04', 'km')} value={45210} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
    expect(container.textContent).toBe('45,210km')
  })

  it('renders no icon for an unrecognized name, text still shown', () => {
    const { container } = render(<Read descriptor={withIcon('not-a-real-icon-99')} value={7} />)
    expect(container.querySelector('svg')).toBeNull()
    expect(screen.getByText('7')).toBeInTheDocument()
  })

  it('renders an em dash for an empty value', () => {
    render(<Read descriptor={withIcon('speedometer-04')} value={null} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('passes a non-numeric value through verbatim rather than "NaN"', () => {
    render(<Read descriptor={withIcon('speedometer-04')} value="n/a" />)
    expect(screen.getByText('n/a')).toBeInTheDocument()
  })
})

/**
 * `FlagToneDateView` (kanban card due-date colour parity fix, run-2026-09-05
 * fix7, P1-H) — the date's colour must come from a SIBLING flag column, not
 * from comparing the date to "now" (a completed record must never read as
 * overdue — UX-NOTES A8 — so this renderer must never invent its own
 * lateness answer).
 */
describe('FlagToneDateView', () => {
  const Read = getComponentRenderer('FlagToneDateView')!
  const placed = (props: Record<string, unknown>) => descriptor({ type: 'Date', component: { name: 'FlagToneDateView', props } })

  it('renders the date + icon in the tone colour when the sibling flag column matches', () => {
    const { container } = render(
      <Read
        descriptor={placed({ flagCol: 'overdueFlag', flagValue: 'Overdue' })}
        value="2026-09-20"
        record={{ id: 'r1', overdueFlag: 'Overdue' }}
      />,
    )
    // The AA-safe TEXT alias (error.600, 4.83:1 on white), not the fill-
    // calibrated `text-destructive` (error.500, 3.76:1 on white at this size)
    // — see the renderer's own docblock.
    expect(container.querySelector('span')!.className).toContain('text-destructive-emphasis')
    expect(container.querySelector('svg')).toBeInTheDocument()
    expect(screen.getByText('20 Sep, 2026')).toBeInTheDocument()
  })

  it('fix7: a `warning` tone also resolves through the AA-safe alias, not the fill-calibrated `text-warning` (2.35:1 on white)', () => {
    const { container } = render(
      <Read
        descriptor={placed({ flagCol: 'dueSoonFlag', flagValue: 'DueSoon', tone: 'warning' })}
        value="2026-09-20"
        record={{ id: 'r7', dueSoonFlag: 'DueSoon' }}
      />,
    )
    expect(container.querySelector('span')!.className).toContain('text-warning-text')
  })

  it('falls back to plain ReadDate (neutral colour) when the flag does not match', () => {
    const { container } = render(
      <Read
        descriptor={placed({ flagCol: 'overdueFlag', flagValue: 'Overdue' })}
        value="2026-09-20"
        record={{ id: 'r2', overdueFlag: '' }}
      />,
    )
    expect(container.querySelector('span')!.className).toContain('text-foreground')
    expect(container.querySelector('span')!.className).not.toContain('text-destructive')
  })

  it('a COMPLETED record with no overdue flag never reads red, even with a past due date (UX-NOTES A8)', () => {
    const { container } = render(
      <Read
        descriptor={placed({ flagCol: 'overdueFlag', flagValue: 'Overdue' })}
        value="2020-01-01"
        record={{ id: 'r3', status: 'completed', overdueFlag: '' }}
      />,
    )
    expect(container.querySelector('span')!.className).not.toContain('text-destructive')
  })

  it('a boolean-ish flagCol matches without an explicit flagValue', () => {
    const { container } = render(
      <Read descriptor={placed({ flagCol: 'isLate' })} value="2026-09-20" record={{ id: 'r4', isLate: true }} />,
    )
    expect(container.querySelector('span')!.className).toContain('text-destructive-emphasis')
  })

  it('an unset flagCol never flags (falls through to ReadDate)', () => {
    const { container } = render(<Read descriptor={placed({})} value="2026-09-20" record={{ id: 'r5' }} />)
    expect(container.querySelector('span')!.className).toContain('text-foreground')
  })

  it('renders an em dash for an empty value on a flagged record', () => {
    render(
      <Read
        descriptor={placed({ flagCol: 'overdueFlag', flagValue: 'Overdue' })}
        value={null}
        record={{ id: 'r6', overdueFlag: 'Overdue' }}
      />,
    )
    expect(screen.getByText('—')).toBeInTheDocument()
  })
})

describe('ActivityOverviewView', () => {
  const Read = getComponentRenderer('ActivityOverviewView')!

  it('renders the SPEC §2.2 triplet — alert-triangle + count, route + count, speedometer-04 + distance', () => {
    const { container } = render(
      <Read
        descriptor={descriptor({ component: { name: 'ActivityOverviewView' } })}
        value={[
          { icon: 'alert-triangle', count: 2, tone: 'danger' },
          { icon: 'route', count: 4 },
          { icon: 'speedometer-04', count: '48 km' },
        ]}
      />,
    )
    expect(container.querySelectorAll('[data-slot="activity-overview"] svg')).toHaveLength(3)
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByText('48 km')).toBeInTheDocument()
    expect(container.querySelector('.text-destructive')).toBeInTheDocument()
  })

  it('renders the em dash for an empty/non-array value', () => {
    render(<Read descriptor={descriptor({ component: { name: 'ActivityOverviewView' } })} value={[]} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })
})

describe('PersonView', () => {
  const Read = getComponentRenderer('PersonView')!

  it('renders an avatar + the name', () => {
    render(<Read descriptor={descriptor()} value="Vikram Singh" />)
    expect(screen.getByText('Vikram Singh')).toBeInTheDocument()
    expect(screen.getByText('V')).toBeInTheDocument() // Avatar initials fallback
  })

  it('applies an explicit role tone when the placement carries one', () => {
    const { container } = render(
      <Read descriptor={descriptor({ component: { name: 'PersonView', props: { tone: 'danger' } } })} value="Vikram Singh" />,
    )
    expect(container.querySelector('[data-slot="avatar"] span')).toHaveClass('bg-destructive')
  })

  it('ignores an unrecognized tone value rather than throwing', () => {
    expect(() =>
      render(<Read descriptor={descriptor({ component: { name: 'PersonView', props: { tone: 'not-a-tone' } } })} value="X" />),
    ).not.toThrow()
  })

  it('renders an em dash for an empty value', () => {
    render(<Read descriptor={descriptor()} value={null} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })
})

describe('TimeRemainingView', () => {
  const Read = getComponentRenderer('TimeRemainingView')!

  it('renders a pre-formatted string verbatim, with a clock icon', () => {
    const { container } = render(<Read descriptor={descriptor()} value="2d 5h 3m" />)
    expect(screen.getByText('2d 5h 3m')).toBeInTheDocument()
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('computes a countdown from an ISO deadline', () => {
    const inTwoHours = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
    const { container } = render(<Read descriptor={descriptor()} value={inTwoHours} />)
    // Delegates to `@fams/ui-kit`'s `TimeRemainingChip` (the DS's one
    // centralized "time remaining" visual) — "left" suffix, no overdue "+".
    expect(container.textContent).toMatch(/^[12]h \d{1,2}m left$/)
  })

  it('clamps a past deadline at zero rather than a negative duration', () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    render(<Read descriptor={descriptor()} value={yesterday} />)
    expect(screen.queryByText(/-/)).not.toBeInTheDocument()
  })

  it('renders an em dash for an empty value', () => {
    render(<Read descriptor={descriptor()} value="" />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })
})

describe('StatusPill', () => {
  const Read = getComponentRenderer('StatusPill')!

  it('renders the label text with a color override', () => {
    const { container } = render(
      <Read descriptor={descriptor({ component: { name: 'StatusPill', props: { color: '#f79009' } } })} value="Reopened" />,
    )
    expect(screen.getByText('Reopened')).toBeInTheDocument()
    expect(container.querySelector('[data-slot="status-pill"]')).toHaveStyle({ backgroundColor: '#f79009' })
  })

  it('resolves a named icon (e.g. the refresh/cycle glyph)', () => {
    const { container } = render(
      <Read
        descriptor={descriptor({ component: { name: 'StatusPill', props: { color: '#f79009', icon: 'refresh' } } })}
        value="Reopened"
      />,
    )
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders nothing for an empty value — an unflagged card shows no pill', () => {
    const { container } = render(<Read descriptor={descriptor({ component: { name: 'StatusPill' } })} value={null} />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('PriorityFlagView', () => {
  const Read = getComponentRenderer('PriorityFlagView')!

  it('renders a bare flag + plain Title-Case text (not a pill) for a known severity', () => {
    const { container } = render(<Read descriptor={descriptor({ label: 'Priority Level' })} value="Critical" />)
    expect(screen.getByText('Critical')).toBeInTheDocument()
    expect(container.querySelector('svg')).toBeInTheDocument()
    // No pill/chip container — unlike `PriorityChip`, this renderer never
    // applies a background fill.
    expect(container.querySelector('[data-slot="priority-chip"]')).not.toBeInTheDocument()
  })

  it('colors the flag per severity tier (critical -> error tone class)', () => {
    const { container } = render(<Read descriptor={descriptor({ label: 'Priority Level' })} value="Critical" />)
    expect(container.querySelector('svg')).toHaveClass('text-error-500')
  })

  it('falls back to a muted flag for an unrecognized value rather than guessing a color', () => {
    const { container } = render(<Read descriptor={descriptor({ label: 'Priority Level' })} value="Somewhat Urgent" />)
    expect(screen.getByText('Somewhat Urgent')).toBeInTheDocument()
    expect(container.querySelector('svg')).toHaveClass('text-muted-foreground')
  })

  it('renders an em dash for an empty value', () => {
    render(<Read descriptor={descriptor({ label: 'Priority Level' })} value={null} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })
})

describe('Vehicle3DView', () => {
  const Read = getComponentRenderer('Vehicle3DView')!
  const placed = (props: Record<string, unknown> = {}) =>
    descriptor({ component: { name: 'Vehicle3DView', props } })

  it('renders the 3D vehicle icon beside the text value (list-row anatomy: badge at bottom-start)', () => {
    const { container } = render(
      <Read descriptor={placed({ statusCol: 'status' })} value="Z-7764" record={{ id: 'r1', title: 'Z-7764', status: 'Moving' }} />,
    )
    expect(screen.getByText('Z-7764')).toBeInTheDocument()
    expect(container.querySelector('[data-slot="vehicle-3d-cell"] svg')).toBeInTheDocument()
  })

  it('derives the badge tone from the placement-named statusCol (moving→success, stopped→error)', () => {
    const { container, rerender } = render(
      <Read descriptor={placed({ statusCol: 'status' })} value="Z-1" record={{ id: 'r1', title: 'Z-1', status: 'Moving' }} />,
    )
    // The dot fills are sampled from the designer's own list-thumbnail
    // exports (13:18867): success-500 / warning-500 / error-600.
    expect(container.querySelector('.bg-success-scale-500')).toBeInTheDocument()
    rerender(
      <Read descriptor={placed({ statusCol: 'status' })} value="Z-1" record={{ id: 'r1', title: 'Z-1', status: 'Stopped' }} />,
    )
    expect(container.querySelector('.bg-error-600')).toBeInTheDocument()
  })

  it('falls back to the muted non-reporting tone when the status is unknown or unbound', () => {
    const { container } = render(<Read descriptor={placed()} value="Z-2" record={{ id: 'r2', title: 'Z-2' }} />)
    // Non-reporting is grey-400 across badges, rings and marker dots since the
    // 2026-08-24 parity run (visual #33) — it was `muted-foreground` (#667085).
    expect(container.querySelector('.bg-gray-400')).toBeInTheDocument()
  })

  it('renders an em dash text for an empty value (icon still shown)', () => {
    render(<Read descriptor={placed({ statusCol: 'status' })} value="" record={{ id: 'r3', title: '' }} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('textCol swaps the cell text to a sibling column (SPEC §2.2: uniqueidentifier "Z-7764", not the Make-Model title)', () => {
    render(
      <Read
        descriptor={placed({ statusCol: 'status', textCol: 'uniqueidentifier' })}
        value="Mitsubishi X6734"
        record={{ id: 'r4', title: 'Mitsubishi X6734', uniqueidentifier: 'Z-7764', status: 'Stopped' }}
      />,
    )
    expect(screen.getByText('Z-7764')).toBeInTheDocument()
    expect(screen.queryByText('Mitsubishi X6734')).not.toBeInTheDocument()
  })
})

describe('AddAffordanceView', () => {
  const Read = getComponentRenderer('AddAffordanceView')!

  it('renders a "+" affordance, not an em dash, when unassigned', () => {
    const { container } = render(<Read descriptor={descriptor()} value={null} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
    expect(screen.queryByText('—')).not.toBeInTheDocument()
  })

  it('renders the plain value once assigned', () => {
    render(<Read descriptor={descriptor()} value="Ahmad Ali" />)
    expect(screen.getByText('Ahmad Ali')).toBeInTheDocument()
  })
})

/**
 * `SignedNumberView` (fix D-4/F2) — a number presented by its own SIGN. A bare
 * signed integer conveys its meaning through one hyphen-minus glyph, so `-10`
 * and `172` render identically; this renderer restores a word AND a tone per
 * band, and never a tone alone.
 */
describe('SignedNumberView', () => {
  const Read = getComponentRenderer('SignedNumberView')!
  const signed = (props: Record<string, unknown>) =>
    descriptor({ type: 'Numeric', component: { name: 'SignedNumberView', props } })

  const DAYS = {
    unit: 'Days',
    absolute: true,
    negativeSuffix: 'Overdue',
    negativeTone: 'danger',
    zeroLabel: 'Due Today',
    zeroTone: 'warning',
  }

  it('a positive value renders number + unit in the default tone', () => {
    const { container } = render(<Read descriptor={signed(DAYS)} value={18} />)
    expect(container.textContent).toBe('18 Days')
    expect(container.querySelector('span')!.className).toContain('text-foreground')
  })

  it('a negative value renders its MAGNITUDE plus the suffix word, in the AA-safe error TEXT alias (fix7: `text-destructive` alone is a fill token, 3.76:1 on white — fails 4.5:1)', () => {
    const { container } = render(<Read descriptor={signed(DAYS)} value={-10} />)
    expect(container.textContent).toBe('10 Days Overdue')
    expect(container.querySelector('span')!.className).toContain('text-destructive-emphasis')
  })

  it('the two bands are distinguishable by TEXT alone, not only by colour', () => {
    const pos = render(<Read descriptor={signed(DAYS)} value={172} />).container.textContent
    const neg = render(<Read descriptor={signed(DAYS)} value={-10} />).container.textContent
    expect(pos).not.toBe(neg)
    expect(neg).toContain('Overdue')
  })

  it('a band label replaces the whole rendering, in the AA-safe warning TEXT alias (fix7: `text-warning` alone is 2.35:1 on white — fails 4.5:1)', () => {
    const { container } = render(<Read descriptor={signed(DAYS)} value={0} />)
    expect(container.textContent).toBe('Due Today')
    expect(container.querySelector('span')!.className).toContain('text-warning-text')
  })

  it('without `absolute` the sign is kept verbatim', () => {
    const { container } = render(<Read descriptor={signed({ unit: 'Days' })} value={-10} />)
    expect(container.textContent).toBe('-10 Days')
  })

  it('falls back to `descriptor.unit` when no prop unit is given, and thousands-separates', () => {
    const d = { ...signed({}), unit: 'km' }
    expect(render(<Read descriptor={d} value={113452} />).container.textContent).toBe('113,452 km')
  })

  it('an absent value renders the em dash and a non-numeric one passes through', () => {
    expect(render(<Read descriptor={signed(DAYS)} value={null} />).container.textContent).toBe('—')
    expect(render(<Read descriptor={signed(DAYS)} value="n/a" />).container.textContent).toBe('n/a')
  })

  it('an unrecognised tone name degrades to the default colour rather than throwing', () => {
    const { container } = render(<Read descriptor={signed({ positiveTone: 'chartreuse' })} value={3} />)
    expect(container.querySelector('span')!.className).toContain('text-foreground')
  })
})
