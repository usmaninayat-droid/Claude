import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import type { EntityConfig, EntityRecord } from '@fams/v5-composer'
import { TriageConsoleView } from './TriageConsoleView'

/**
 * TriageConsoleView.test.tsx — the `triage-console` view kind's own test.
 * Same house style as `cockpit/CockpitView.test.tsx`. `ageMinutes`/`formatAge`
 * (`console-model.ts`) read off `Date.now()`, so this file pins the clock to
 * a fixed instant and builds record timestamps as fixed OFFSETS from it —
 * deterministic ages regardless of when the suite actually runs.
 */

const NOW = new Date('2026-01-01T12:00:00.000Z')
const isoMinutesAgo = (mins: number) => new Date(NOW.getTime() - mins * 60_000).toISOString()

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

/**
 * A bare pipeline blueprint — `statusList` with 3 stages, an identity
 * (SmallText), a classification axis (SingleSelect, not `status`) and a
 * DateTime age column, per the task brief. Its first stage (`new`) is the
 * triage backlog when `triageStages` is omitted.
 */
const pipelineConfig: EntityConfig = {
  code: 'ops/triage',
  name: 'Triage Queue',
  uidPrefix: 'TRQ',
  systemcolumns: [
    { col: 'title', name: 'Title', type: 'SmallText', required: true },
    { col: 'status', name: 'Status', type: 'SingleSelect', listValues: ['New', 'In Progress', 'Resolved'] },
    { col: 'systemcol1', name: 'Priority', type: 'SingleSelect', listValues: ['Critical', 'High', 'Medium', 'Low'] },
    { col: 'systemcol2', name: 'Reported', type: 'DateTime' },
    { col: 'systemcol3', name: 'Location', type: 'SmallText' },
  ],
  listcolumns: [
    { col: 'title' },
    { col: 'status' },
    { col: 'systemcol1' },
    { col: 'systemcol2' },
    { col: 'systemcol3' },
  ],
  uiConfig: {
    statusList: [
      { key: 'new', label: 'New', color: 'var(--color-info)' },
      { key: 'in_progress', label: 'In Progress', color: 'var(--color-warning)' },
      { key: 'resolved', label: 'Resolved', color: 'var(--color-success)' },
    ],
  },
}

const pipelineRecords: EntityRecord[] = [
  { id: 'rec-1', uniqueidentifier: 'TRQ-1001', title: 'Leaking valve', status: 'new', systemcol1: 'Critical', systemcol2: isoMinutesAgo(5), systemcol3: 'Zone A' },
  { id: 'rec-2', uniqueidentifier: 'TRQ-1002', title: 'Broken pump', status: 'new', systemcol1: 'High', systemcol2: isoMinutesAgo(180), systemcol3: 'Zone B' },
  { id: 'rec-3', uniqueidentifier: 'TRQ-1003', title: 'Valve inspection', status: 'in_progress', systemcol1: 'Medium', systemcol2: isoMinutesAgo(1440), systemcol3: 'Zone C' },
  { id: 'rec-4', uniqueidentifier: 'TRQ-1004', title: 'Filter replaced', status: 'resolved', systemcol1: 'Low', systemcol2: isoMinutesAgo(2880), systemcol3: 'Zone A' },
  { id: 'rec-5', uniqueidentifier: 'TRQ-1005', title: 'Generator check', status: 'in_progress', systemcol1: 'High', systemcol2: isoMinutesAgo(30), systemcol3: 'Zone D' },
]

describe('TriageConsoleView', () => {
  it('renders the KPI strip: in-queue count, avg age, and a priority breakdown', () => {
    render(<TriageConsoleView config={pipelineConfig} records={pipelineRecords} />)
    // Backlog = the FIRST stage ('new'): rec-1 (5m old) + rec-2 (180m old).
    const inQueue = screen.getByText('In queue').parentElement!
    expect(inQueue).toHaveTextContent('2')

    // avg = round((5 + 180) / 2) = 93m = "1h 33m".
    const avgAge = screen.getByText('Avg. reported age').parentElement!
    expect(avgAge).toHaveTextContent('1h 33m')

    // The KPI strip header row — scoped because the default-selected record's
    // panel below ALSO shows a "Priority" field label (ConsoleRecordSummary).
    const kpiStrip = inQueue.parentElement!
    expect(within(kpiStrip).getByText('Priority')).toBeInTheDocument()
    // Breakdown order follows the QUEUE's own (oldest-first) order: rec-2
    // (High) is seen before rec-1 (Critical).
    expect(within(kpiStrip).getByText('High · 1')).toBeInTheDocument()
    expect(within(kpiStrip).getByText('Critical · 1')).toBeInTheDocument()
  })

  it('defaults the panel to the oldest backlog record, and a queue click selects a different one', () => {
    render(<TriageConsoleView config={pipelineConfig} records={pipelineRecords} />)
    const panel = () => document.querySelector('[data-slot="triage-panel"]')!

    // Default selection = queue[0] = the oldest ('new') record (rec-2).
    expect(panel()).toHaveTextContent('Zone B')
    expect(screen.getByText('TRQ-1002').closest('button')).toHaveAttribute('aria-current', 'true')
    expect(screen.getByText('TRQ-1001').closest('button')).not.toHaveAttribute('aria-current')

    fireEvent.click(screen.getByText('TRQ-1001'))

    expect(screen.getByText('TRQ-1001').closest('button')).toHaveAttribute('aria-current', 'true')
    expect(screen.getByText('TRQ-1002').closest('button')).not.toHaveAttribute('aria-current')
    expect(panel()).toHaveTextContent('Zone A')
    expect(panel()).not.toHaveTextContent('Zone B')
  })

  it('renders the three-cause empty state when the backlog has no records', () => {
    render(<TriageConsoleView config={pipelineConfig} records={[]} />)
    expect(document.querySelector('[data-slot="triage-console"]')).toBeInTheDocument()
    expect(document.querySelector('[data-slot="triage-queue"]')).not.toBeInTheDocument()
    expect(screen.getByText('No records yet')).toBeInTheDocument()
  })
})
