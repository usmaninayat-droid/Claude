import { describe, expect, it, vi } from 'vitest'
import { render, within } from '@testing-library/react'
import type { DashboardWidget } from '@fams/v5-composer'
import { DashboardWidgetView } from './dashboard-widgets'

/**
 * dashboard-fixes5 — the round-4 regression: the map widget's visually-hidden
 * data-table twin widened the PAGE.
 *
 * `sr-only` sets `width: 1px`, but auto table layout treats a specified width
 * as a MINIMUM — a `<table>` never shrinks below its min-content width. The
 * twin therefore laid out ~1165px wide and, being `position: absolute`,
 * escaped `[data-slot="dashboard-widget"]`'s `overflow-x: hidden` (that
 * element is not positioned, so it is not the twin's containing block). At
 * 1280px the document scrolled sideways in both LTR and RTL.
 *
 * The structural fix, asserted here for every visually-hidden table twin:
 * the twin is wrapped in a POSITIONED, overflow-hidden `sr-only` element, so
 * the wrapper is both its containing block and its clip — while the table
 * itself keeps its rows, its `sr-only`-ness and its place in the Tab order.
 *
 * (Layout itself is not observable in jsdom; what this test can and does lock
 * is the markup contract that makes the clip possible. The measured
 * `documentElement.scrollWidth <= innerWidth` check lives in the browser
 * pass of the parity run.)
 */

vi.mock('@fams/v5-templates/map', () => ({
  MapPanel: ({
    'aria-label': label,
    'aria-describedby': describedBy,
    markers,
  }: {
    'aria-label': string
    'aria-describedby'?: string
    markers?: Array<{ id: string }>
  }) => (
    <div role="region" aria-label={label} aria-describedby={describedBy} data-marker-count={markers?.length ?? 0} />
  ),
}))

const MAP: DashboardWidget = {
  id: 'safety-events-map',
  title: 'Safety Events',
  type: 'geospatial-heatmap',
  dataSource: {
    listRail: { searchPlaceholder: 'Search Events' },
    legend: [{ id: 'brake', label: 'Harsh Braking', colorIndex: 1 }],
    items: [
      {
        id: 'e1',
        title: 'Harsh Braking',
        description: 'Al Reem Island — a deliberately long location string, the kind that made the twin 1165px wide',
        category: 'brake',
        timestamp: '09:41',
        position: [54.4, 24.5],
      },
      {
        id: 'e2',
        title: 'Overspeeding',
        description: 'Musaffah Industrial Area — another long one',
        category: 'brake',
        timestamp: '11:02',
        position: [54.5, 24.4],
      },
    ],
  },
}

describe('visually-hidden map data table cannot widen the page (round-4 P0)', () => {
  it('wraps the twin in a positioned, overflow-hidden sr-only clip', () => {
    const { container } = render(<DashboardWidgetView widget={MAP} filters={{}} renderer="svg" />)
    const table = container.querySelector('[data-slot="dashboard-map-data-table"]') as HTMLElement
    expect(table).toBeInTheDocument()

    const clip = table.parentElement as HTMLElement
    expect(clip.getAttribute('data-slot')).toBe('dashboard-map-data-table-clip')
    // `sr-only` ⇒ position: absolute (containing block) + overflow: hidden
    // (the clip). Both halves are required: a non-positioned ancestor does
    // not clip an absolutely-positioned descendant.
    expect(clip).toHaveClass('sr-only')
    expect(clip).toHaveClass('overflow-hidden')
  })

  it('keeps the twin hidden, keyboard reachable and fully populated', () => {
    const { container } = render(<DashboardWidgetView widget={MAP} filters={{}} renderer="svg" />)
    const table = container.querySelector('[data-slot="dashboard-map-data-table"]') as HTMLElement
    expect(table).toHaveClass('sr-only')
    expect(table).toHaveAttribute('tabindex', '0')
    // Still in the a11y tree as a table, still carrying a row per item.
    expect(table.tagName).toBe('TABLE')
    expect(table.querySelectorAll('tbody tr')).toHaveLength(2)
    expect(within(table).getByText('Harsh Braking')).toBeInTheDocument()
    expect(within(table).getByText('Overspeeding')).toBeInTheDocument()
    // And still the map region's description target.
    const region = container.querySelector('[role="region"][aria-describedby]') as HTMLElement
    expect(region.getAttribute('aria-describedby')).toBe(table.id)
  })
})
