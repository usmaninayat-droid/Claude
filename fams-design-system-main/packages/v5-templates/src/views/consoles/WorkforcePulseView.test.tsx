import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { EntityConfig, EntityRecord } from '@fams/v5-composer'
import { WorkforcePulseView } from './WorkforcePulseView'
import { coverageCol, personCol, presenceCol, pulseBreakdowns, pulseRoster } from './workforce-model'

/**
 * WorkforcePulseView.test.tsx — the `workforce-pulse` view kind's own test,
 * plus its `workforce-model` derivations. Same house style as
 * `cockpit/CockpitView.test.tsx`.
 *
 * The coverage `BarChart` renders for real (its container and accessible name
 * ARE part of the contract); only ECharts' canvas is inert, via the shared
 * `getContext` stub in `vitest.setup.ts`.
 */
/**
 * A people-bearing pipeline blueprint: a `workforce/*` linked column (the
 * first `personCol` tier), a mobility-flavoured `uiConfig.map.statusCol` (the
 * `presenceCol` axis), two more SingleSelect axes for the breakdown band, and
 * a repeating SmallText site column for the coverage chart.
 */
const pulseConfig: EntityConfig = {
  code: 'ops/shifts',
  name: 'Shift Assignments',
  uidPrefix: 'SHF',
  systemcolumns: [
    { col: 'title', name: 'Assignment', type: 'SmallText', required: true },
    { col: 'status', name: 'Status', type: 'SingleSelect', listValues: ['Open', 'Done'] },
    { col: 'worker', name: 'Worker', type: 'SmallText', entityType: 'workforce/staff' },
    { col: 'site', name: 'Site', type: 'SmallText' },
    { col: 'presence', name: 'Presence', type: 'SingleSelect', listValues: ['in-zone', 'late', 'off-shift'] },
    { col: 'shift', name: 'Shift', type: 'SingleSelect', listValues: ['Morning', 'Night'] },
    { col: 'reported', name: 'Reported', type: 'DateTime' },
  ],
  listcolumns: [
    { col: 'title' },
    { col: 'status' },
    { col: 'worker' },
    { col: 'site' },
    { col: 'presence' },
    { col: 'shift' },
    { col: 'reported' },
  ],
  uiConfig: {
    statusList: [
      { key: 'open', label: 'Open', color: 'var(--color-info)' },
      { key: 'done', label: 'Done', color: 'var(--color-success)' },
    ],
    map: { statusCol: 'presence' },
  },
}

const minutesAgo = (mins: number) => new Date(Date.now() - mins * 60_000).toISOString()

const pulseRecords: EntityRecord[] = [
  { id: 'r1', uniqueidentifier: 'SHF-1', title: 'Tower A sweep', status: 'open', worker: 'Amina Yusuf', site: 'Tower A', presence: 'in-zone', shift: 'Morning', reported: minutesAgo(10) },
  { id: 'r2', uniqueidentifier: 'SHF-2', title: 'Tower A night', status: 'open', worker: 'Amina Yusuf', site: 'Tower A', presence: 'in-zone', shift: 'Night', reported: minutesAgo(40) },
  { id: 'r3', uniqueidentifier: 'SHF-3', title: 'Depot check', status: 'open', worker: 'Karim Nasr', site: 'Depot', presence: 'late', shift: 'Morning', reported: minutesAgo(90) },
  { id: 'r4', uniqueidentifier: 'SHF-4', title: 'Depot close', status: 'done', worker: 'Lina Haddad', site: 'Depot', presence: 'off-shift', shift: 'Night', reported: minutesAgo(300) },
]

const tile = (label: string) =>
  screen.getAllByRole('button').find((el) => el.textContent?.includes(label))

describe('workforce-model derivations', () => {
  it('personCol prefers the workforce-typed linked column', () => {
    expect(personCol(pulseConfig)).toBe('worker')
  })

  it('personCol falls back to uiConfig.map.driverCol when nothing is typed', () => {
    const fleetish: EntityConfig = {
      ...pulseConfig,
      systemcolumns: pulseConfig.systemcolumns.filter((c) => c.col !== 'worker'),
      uiConfig: { ...pulseConfig.uiConfig, map: { statusCol: 'presence', driverCol: 'site' } },
    }
    expect(personCol(fleetish)).toBe('site')
  })

  it('personCol is undefined when the blueprint names no person at all', () => {
    const anonymous: EntityConfig = {
      ...pulseConfig,
      systemcolumns: pulseConfig.systemcolumns.filter((c) => c.col !== 'worker'),
      uiConfig: { ...pulseConfig.uiConfig, map: { statusCol: 'presence' } },
    }
    expect(personCol(anonymous)).toBeUndefined()
  })

  it('presenceCol reads the map status column', () => {
    expect(presenceCol(pulseConfig)).toBe('presence')
  })

  it('pulseRoster dedupes the module records by person', () => {
    const roster = pulseRoster(pulseConfig, pulseRecords)
    expect(roster.map((p) => p.name)).toEqual(['Amina Yusuf', 'Karim Nasr', 'Lina Haddad'])
    // Amina holds two assignments; the other two hold one each.
    expect(roster[0].records).toHaveLength(2)
    expect(roster[1].records).toHaveLength(1)
  })

  it('pulseRoster prefers a handed-in roster over the derived one', () => {
    const peopleConfig: EntityConfig = {
      code: 'workforce/staff',
      name: 'Staff',
      uidPrefix: 'STF',
      systemcolumns: [{ col: 'name', name: 'Name', type: 'SmallText' }],
      listcolumns: [{ col: 'name' }],
      uiConfig: { statusList: [] },
    }
    const roster = pulseRoster(pulseConfig, pulseRecords, [{ id: 'p1', name: 'Omar Said' }], peopleConfig)
    expect(roster).toEqual([{ id: 'p1', name: 'Omar Said', records: [{ id: 'p1', name: 'Omar Said' }] }])
  })

  it('pulseBreakdowns counts each axis, skipping empty ones', () => {
    const panels = pulseBreakdowns(pulseConfig, pulseRecords, ['presence', 'shift', 'nope'])
    expect(panels.map((p) => p.title)).toEqual(['Presence', 'Shift'])
    expect(panels[0].rows).toEqual([
      { id: 'in-zone', label: 'in-zone', count: 2 },
      { id: 'late', label: 'late', count: 1 },
      { id: 'off-shift', label: 'off-shift', count: 1 },
    ])
  })

  it('coverageCol picks a repeating SmallText column and never the stage axis', () => {
    // `title` is unique per record (4 of 4) so it fails the repeat test;
    // `worker` repeats but comes first — both are SmallText, so the guard
    // that matters here is that `status` is never chosen.
    expect(coverageCol(pulseConfig, pulseRecords)).not.toBe('status')
    expect(['worker', 'site']).toContain(coverageCol(pulseConfig, pulseRecords))
  })
})

describe('WorkforcePulseView', () => {
  it('renders the KPI band, the breakdown panels and the roster', () => {
    render(<WorkforcePulseView config={pulseConfig} records={pulseRecords} />)
    // Roster headcount — three distinct workers across four assignments.
    expect(tile('Worker')?.textContent).toContain('3')
    // Every record reports a presence value, so the reported tile is 4.
    expect(tile('Presence reported')?.textContent).toContain('4')
    // One panel per declared axis (status excluded). Scoped to the panel
    // band: "Presence"/"Shift" are ALSO the roster table's column headers,
    // so an unscoped getByText matches two elements.
    const panels = document.querySelector('[data-slot="pulse-panels"]')!
    expect(panels.textContent).toContain('Presence')
    expect(panels.textContent).toContain('Shift')
    // The roster table lists each person once. Scoped to the roster: a
    // person's name is ALSO the activity feed's entry author, so an
    // unscoped query matches twice.
    const roster = document.querySelector('[data-slot="pulse-roster"]')!
    expect(roster.textContent).toContain('Amina Yusuf')
    expect(roster.textContent).toContain('2 assignments')
  })

  it('the coverage chart renders, named for the axis it resolved', () => {
    render(<WorkforcePulseView config={pulseConfig} records={pulseRecords} />)
    expect(screen.getByText('Coverage')).toBeInTheDocument()
    expect(screen.getByLabelText(/^Headcount per /)).toBeInTheDocument()
  })

  it('renders the activity feed newest-first, each entry named for its person', () => {
    render(<WorkforcePulseView config={pulseConfig} records={pulseRecords} />)
    expect(screen.getByText('Recent activity')).toBeInTheDocument()
    // Scoped to the feed: an assignment title also renders in the roster's
    // own assignment column, so an unscoped query matches twice.
    const feed = screen.getByText('Recent activity').closest('div')!.parentElement!
    const text = feed.textContent ?? ''
    // Freshest first — the 8-minute record leads the 45-minute one.
    expect(text.indexOf('Tower A sweep')).toBeLessThan(text.indexOf('Depot close'))
    expect(text).toContain('Amina Yusuf')
  })

  it('a KPI tile opens the drill sheet over its OWN population', async () => {
    // The "Needs attention" tile only exists when attention states are
    // declared — that IS the contract, so the drill test declares them.
    render(
      <WorkforcePulseView config={pulseConfig} records={pulseRecords} attentionStates={['late']} />,
    )
    // The pulse's tiles are `KpiMetricCard`s — the WHOLE card is the drill
    // control (`clickable`), matching the reference surface where every KPI
    // opens its own raw-data sheet. (The stage-scope tile row the other
    // consoles use, `ConsoleKpiRow`, is the one with two affordances.)
    fireEvent.click(screen.getByRole('button', { name: /Needs attention/ }))
    const dialog = await waitFor(() => screen.getByRole('dialog'))
    expect(dialog).toHaveTextContent('Needs attention')
    // Its own population — the one `late` record, not all four.
    expect(dialog).toHaveTextContent('1 record')
    expect(dialog).toHaveTextContent('Depot check')
  })

  it('the attention KPI counts only the declared attention states', () => {
    render(
      <WorkforcePulseView config={pulseConfig} records={pulseRecords} attentionStates={['late']} />,
    )
    expect(tile('Needs attention')?.textContent).toContain('1')
  })

  it('a roster presence cell scopes the whole surface, and clears', () => {
    render(<WorkforcePulseView config={pulseConfig} records={pulseRecords} />)
    const cell = screen.getByRole('button', { name: 'in-zone', pressed: false })
    fireEvent.click(cell)
    // Scoped to the two in-zone assignments — both Amina's, so one person.
    expect(tile('Worker')?.textContent).toContain('1')
    expect(screen.getByRole('button', { name: /Clear presence: in-zone/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Clear presence: in-zone/ }))
    expect(tile('Worker')?.textContent).toContain('3')
  })

  it('degrades to a person-less shape when the blueprint names nobody', () => {
    const anonymous: EntityConfig = {
      ...pulseConfig,
      systemcolumns: pulseConfig.systemcolumns.filter((c) => c.col !== 'worker'),
      uiConfig: { ...pulseConfig.uiConfig, map: { statusCol: 'presence' } },
    }
    render(<WorkforcePulseView config={anonymous} records={pulseRecords} />)
    // No roster, but the record-count tile still answers for the module.
    expect(tile('People')?.textContent).toContain('0')
    expect(tile('Open records')?.textContent).toContain('4')
  })
})
