import { InteractiveReplay, type InteractiveReplaySeries } from '@fams/v5-templates'
import type { EntityRecord } from '@fams/v5-composer'
import { DocPage, DocSection, Prose, PropsTable, Guidelines, A11yList, Code } from '../docs'

/**
 * InteractiveReplayDemo — a played-back trip timeline: filter row, stat
 * chips, a route map, and a multi-series chart with play/pause, a checkbox
 * legend and a zoomable window.
 *
 * Every value below is field-key indirection into ONE record plus a
 * `series` config — the demo owns no per-widget React.
 */

const series: InteractiveReplaySeries[] = [
  { key: 'temperature', label: 'Temperature', colorIndex: 1 },
  { key: 'speed', label: 'Speed', colorIndex: 2 },
  { key: 'average', label: 'Average', colorIndex: 3, dashed: true },
]

const record: EntityRecord = {
  id: 'tk-2201',
  title: 'Tanker QA-2201',
  stats: [
    { icon: 'alert-triangle', label: 'Number of Events', value: 4 },
    { icon: 'route', label: 'Total Trip Distance', value: '43 km' },
    { icon: 'clock', label: 'Total Trip Duration', value: '2h 43m' },
  ],
  timeline: Array.from({ length: 12 }, (_, i) => ({
    time: `${String(8 + Math.floor(i / 2)).padStart(2, '0')}:${i % 2 === 0 ? '00' : '30'}`,
    temperature: 18 + ((i * 3) % 20),
    speed: 20 + ((i * 11) % 70),
    average: 45,
    lat: 25.28 + i * 0.01,
    lng: 51.53 + i * 0.008,
    address: i % 3 === 0 ? 'Al Wakrah, Qatar' : 'Doha, Qatar',
  })),
  bands: [
    { type: 'overspeeding', label: 'Overspeeding', startIndex: 2, endIndex: 4, tone: 'danger' },
    { type: 'idling', label: 'Idling', startIndex: 7, endIndex: 8, tone: 'info' },
  ],
  route: Array.from({ length: 12 }, (_, i) => [51.53 + i * 0.008, 25.28 + i * 0.01] as [number, number]),
  pins: [
    { id: 'e1', position: [51.55, 25.3], color: 'var(--color-destructive)', label: 'Overspeeding' },
    { id: 'e2', position: [51.59, 25.35], color: 'var(--color-info)', label: 'Idling' },
  ],
}

export default function InteractiveReplayDemo() {
  return (
    <DocPage
      title="InteractiveReplay"
      badge="wip"
      summary="A played-back trip/shift timeline for an entity profile tab: filter row, stat chips, a route map and a multi-series chart with play/pause, speed, a checkbox legend and a zoomable window — all field-key indirection into one record."
    >
      <DocSection id="preview" title="Preview">
        <Prose>
          Every plotted line, map pin, route and event band comes from ONE <Code>record</Code> plus a{' '}
          <Code>series</Code> config naming which row key each line reads. Try Play, the 1x/2x speed toggle,
          the checkbox legend, and the zoom ± buttons (they shrink/grow the visible window).
        </Prose>
        <div className="rounded-md border border-border bg-muted p-4">
          <InteractiveReplay
            record={record}
            statsField="stats"
            timelineField="timeline"
            series={series}
            bandsField="bands"
            routeField="route"
            pinsField="pins"
            filters={[
              { kind: 'dateRange', label: 'Select Date Range' },
              { kind: 'multiSelect', label: 'Select Events' },
              { kind: 'multiSelect', label: 'Select Workforce' },
              { kind: 'select', label: 'Select Sensor' },
            ]}
          />
        </div>
      </DocSection>

      <DocSection id="empty" title="Empty state">
        <Prose>An absent/empty <Code>timelineField</Code> is the designed empty state — chrome stays, the map shows "No Data in View".</Prose>
        <div className="rounded-md border border-border bg-muted p-4">
          <InteractiveReplay record={{ id: 'empty', title: 'x', timeline: [] }} timelineField="timeline" series={series} />
        </div>
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            { prop: 'timelineField', type: 'string', description: 'record[timelineField]: InteractiveReplayPoint[] — required; empty/absent is the EMPTY state.' },
            { prop: 'series', type: 'InteractiveReplaySeries[]', description: 'Which point keys to plot, in legend order.' },
            { prop: 'statsField / bandsField / routeField / pinsField', type: 'string', description: 'Field-key indirection for the stat chips, event bands, route polyline and map pins.' },
            { prop: 'filters', type: 'InteractiveReplayFilterField[]', description: 'Decorative filter-row fields (no wired behavior — same precedent RecordTable’s timeframeSelect documents).' },
            { prop: 'emptyTitle / emptyText', type: 'ReactNode', description: 'The empty-state heading/body.' },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Give every point a lat/lng when you want the hover/play state to locate it on the map.',
            'Author bands with a stable type so the legend below the chart de-duplicates by type, not by instance.',
            'Reach for the checkbox legend to compare series, not to hide noise permanently — it resets per session.',
          ]}
          donts={[
            'Don’t rely on the event bands’ colour alone — the strip always ships with a text legend underneath.',
            'Don’t expect per-series dashing yet — a dashed series still renders solid; colour still carries identity.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'The legend is a real input[type=checkbox] list, not a hand-rolled toggle button — native keyboard/AT support for free.',
            'Every timeline point has a focusable scrub button (aria-label names its time), so the hover tooltip is keyboard-reachable, not hover-only.',
            'Play/pause respects prefers-reduced-motion — it jumps straight to the end instead of animating the playhead.',
            'Icon-only controls (play/pause, zoom, speed, chart-type) all carry an aria-label and a ≥44px hit area.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
