import { useState } from 'react'
import { OverviewWidgets, type OverviewWidget } from '@fams/v5-templates'
import type { EntityRecord } from '@fams/v5-composer'
import { DocPage, DocSection, Prose, PropsTable, Guidelines, A11yList, Code } from '../docs'

/**
 * OverviewWidgetsDemo — the metadata-driven Overview mini-dashboard.
 *
 * Everything on this page comes from ONE `widgets` array plus ONE record: the
 * demo owns no per-widget React, which is the whole point of the contract.
 */

const record: EntityRecord = {
  id: 'tk-2201',
  title: 'Tanker QA-2201',
  tripRef: '# 231454',
  tripAt: '22 Jul, 2025 12:00pm',

  telematics: 'Reporting',
  telematicsState: 'reporting',
  telematicsSeen: '5 min ago',

  distance: '1,245',
  fillLevel: '68',

  tripsByMonth: [
    { label: 'Jan', value: 700 },
    { label: 'Feb', value: 690 },
    { label: 'Mar', value: 800 },
    { label: 'Apr', value: 560 },
    { label: 'May', value: 740 },
    { label: 'Jun', value: 700 },
    { label: 'Jul', value: 760 },
    { label: 'Aug', value: 720 },
    { label: 'Sep', value: 780 },
    { label: 'Oct', value: 820 },
    { label: 'Nov', value: 700 },
    { label: 'Dec', value: 690 },
  ],

  criticalEvents: [
    { id: 'e1', type: 'idling', label: 'Idling', time: '09:00 AM  13 Jan, 26', address: 'Al Sadd, Doha, Qatar' },
    { id: 'e2', type: 'blackspot', label: 'Blackspot', time: '09:40 AM  13 Jan, 26', address: 'Al Wakrah, Qatar' },
    { id: 'e3', type: 'overspeeding', label: 'Overspeeding', time: '10:15 AM  13 Jan, 26', address: 'Al Rayyan, Qatar' },
    { id: 'e4', type: 'harshBraking', label: 'Harsh Braking', time: '11:02 AM  13 Jan, 26', address: 'Umm Salal, Qatar' },
  ],

  liveStatus: 'Stopped',
  liveAddress: 'Al Rayyan, Doha, Qatar',
  livePins: [{ id: 'p1', position: [51.4, 25.28] as [number, number] }],
}

const timelineRecord: EntityRecord = {
  id: 'wf-01',
  tabletDailyActivity: [
    { date: '03 Sep', weekday: 'Thursday', isOff: false, plannedMinutes: 840, activeMinutes: 456, inactiveMinutes: 24, usagePct: 95 },
    { date: '04 Sep', weekday: 'Friday', isOff: true },
    { date: '05 Sep', weekday: 'Saturday', isOff: false, plannedMinutes: 840, activeMinutes: 525, inactiveMinutes: 73, usagePct: 90 },
    {
      date: '06 Sep',
      weekday: 'Sunday',
      isOff: false,
      plannedMinutes: 840,
      activeMinutes: 480,
      inactiveMinutes: 60,
      usagePct: 89,
      // The PREFERRED row shape — the real intra-day pattern rather than two
      // proportional blocks derived from the totals.
      segments: [
        { state: 'active', start: '06:00', end: '11:00' },
        { state: 'inactive', start: '11:00', end: '12:00' },
        { state: 'active', start: '12:00', end: '15:00' },
      ],
    },
  ],
}

const timelineWidget: OverviewWidget = {
  type: 'dailyTimeline',
  icon: 'bar-chart-01',
  title: 'Daily Activity Timeline',
  subtitle: 'Driver-app usage against the planned shift window · 03 Sep – 06 Sep',
  rowsField: 'tabletDailyActivity',
  windowStart: '05:00',
  windowEnd: '19:00',
}

const widgets: OverviewWidget[] = [
  {
    type: 'alertBanner',
    column: 'full',
    icon: 'bell',
    title: 'There is an upcoming trip for the tanker.',
    metaFields: ['tripRef', { field: 'tripAt', icon: 'calendar' }],
  },
  {
    type: 'statusCard',
    column: 'start',
    icon: 'telematics',
    label: 'Telematics',
    valueField: 'telematics',
    toneField: 'telematicsState',
    toneMap: { reporting: 'success', stale: 'warning', offline: 'danger' },
    metaField: 'telematicsSeen',
    metaLabel: 'Last Received',
  },
  {
    type: 'kpiTiles',
    column: 'start',
    columns: 2,
    tiles: [
      { label: 'Distance', valueField: 'distance', unit: 'km', icon: 'route' },
      { label: 'Fill Level', valueField: 'fillLevel', unit: '%', icon: 'drop', tone: 'success' },
    ],
  },
  {
    type: 'locationMap',
    column: 'start',
    title: 'Live Location',
    hideHeader: true,
    pinsField: 'livePins',
    statusField: 'liveStatus',
    statusToneMap: { Stopped: 'danger', Moving: 'success' },
    addressField: 'liveAddress',
  },
  {
    type: 'barChart',
    column: 'end',
    icon: 'bar-chart-01',
    title: 'Number of Trips',
    seriesField: 'tripsByMonth',
    yAxisTitle: 'Number Of Trips',
  },
  {
    type: 'eventList',
    column: 'end',
    icon: 'alert-triangle',
    title: 'Critical Events',
    itemsField: 'criticalEvents',
    iconMap: {
      idling: 'clock',
      blackspot: 'target',
      overspeeding: 'gauge',
      harshBraking: 'alert-triangle',
    },
    toneMap: {
      idling: 'info',
      blackspot: 'neutral',
      overspeeding: 'danger',
      harshBraking: 'warning',
    },
  },
]

export default function OverviewWidgetsDemo() {
  const [log, setLog] = useState<string | null>(null)

  return (
    <DocPage
      title="OverviewWidgets"
      badge="wip"
      summary="The metadata-driven Overview mini-dashboard for an entity profile: an alert banner, status cards, KPI tile grids, a bar chart, an event list, a day-by-day activity timeline and a live map slot — every one of them a config object with field-key indirection into the record, arranged in one or two columns."
    >
      <DocSection id="preview" title="Preview">
        <Prose>
          The whole board below is one <Code>widgets</Code> array over one record. Each widget names a{' '}
          <Code>column</Code> (<Code>start</Code> / <Code>end</Code> / <Code>full</Code>); the banner is{' '}
          <Code>full</Code> so it sits above the grid, and the two columns are independent vertical stacks
          rather than a row-wise grid flow. Values are read by FIELD KEY (<Code>valueField</Code>,{' '}
          <Code>seriesField</Code>, <Code>itemsField</Code>) — this demo contains no per-widget React.
        </Prose>
        <div className="rounded-md border border-border bg-muted p-4">
          <OverviewWidgets
            widgets={widgets}
            record={record}
            onEventSelect={(id) => setLog(`onEventSelect("${id}")`)}
            onOpenLocation={() => setLog('onOpenLocation()')}
            onZoomIn={() => setLog('onZoomIn()')}
            onZoomOut={() => setLog('onZoomOut()')}
            onFullscreen={() => setLog('onFullscreen()')}
          />
        </div>
        <Prose>
          Last callback: <Code>{log ?? 'none yet — click an event row or a map control'}</Code>
        </Prose>
      </DocSection>

      <DocSection id="daily-timeline" title="dailyTimeline">
        <Prose>
          One row per day over a FIXED clock window (<Code>windowStart</Code>/<Code>windowEnd</Code>, tick
          labelled): active stretches in the tenant&rsquo;s primary, inactive in a warning tint, and an off
          day as a muted &ldquo;No planned shift&rdquo; track. The widget is a real{' '}
          <Code>&lt;table&gt;</Code> — the bars are <Code>aria-hidden</Code> decoration over a per-row text
          summary plus the active/inactive/usage figures stated in words, so nothing here is encoded in
          colour alone. A row MAY carry <Code>segments[]</Code> (<Code>{'{state, start, end}'}</Code>) and
          that is the preferred shape; the fourth row below does. Without it — the shape most seeds carry
          today — the row degrades to one active plus one inactive PROPORTIONAL block off the minute totals:
          exact totals, indicative placement. Because the geometry uses logical inline offsets, the window
          mirrors under RTL, earliest hour at the start edge.
        </Prose>
        <div className="rounded-md border border-border bg-muted p-4">
          <OverviewWidgets widgets={[timelineWidget]} record={timelineRecord} />
        </div>
      </DocSection>

      <DocSection id="charts" title="Chart choices">
        <Prose>
          "Number of Trips" is magnitude across an ordered set of categories, so it is a zero-based vertical
          bar chart. It has ONE series, so there is deliberately no legend — the card title names it — and no
          per-bar labels, since the value axis plus the hover tooltip already carry the numbers. The bar fill
          defaults to <Code>var(--color-primary)</Code>: a single-series chart has no identities to
          distinguish, and binding it to the brand token is what keeps a tenant&rsquo;s own hue (Qatar MME
          maroon, for instance) on the plot instead of a categorical swatch.
        </Prose>
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            { prop: 'widgets', type: 'OverviewWidget[]', description: 'The board. Union of alertBanner | planBanner | statusCard | kpiTiles | barChart | eventList | dailyTimeline | trendChart | locationMap.' },
            { prop: 'record', type: 'EntityRecord', description: 'The record every widget’s field-key config reads from.' },
            { prop: 'onEventSelect', type: '(eventId, widget) => void', description: 'Activation seam for eventList rows. Omit and the rows render as non-interactive text, never as dead buttons.' },
            { prop: 'onOpenLocation', type: '(widget) => void', description: 'locationMap open-in-new action. Omit to hide the control.' },
            { prop: 'onZoomIn / onZoomOut / onFullscreen', type: '(widget) => void', description: 'locationMap control stack. Each control renders only when its handler is supplied.' },
            { prop: 'widget.column', type: "'start' | 'end' | 'full'", description: 'Two-column arrangement. A list where nobody names a column renders as one stack (the original layout).' },
            { prop: 'widget.icon / iconMap', type: 'string', description: 'Icon NAMES, resolved through @fams/ui-kit/icons’ getIcon (aliases included). Unknown names degrade, never crash.' },
            { prop: 'dailyTimeline.rowsField', type: 'string', description: 'record[rowsField] → one row per day: {date, weekday, isOff, activeMinutes, inactiveMinutes, usagePct, segments?}. Every key overridable (dateKey/weekdayKey/offKey/…).' },
            { prop: 'dailyTimeline.windowStart / windowEnd', type: 'string', description: 'The fixed clock window every track is laid over, "HH:MM". Defaults "05:00"/"19:00"; tickStepHours (default 2) spaces the axis labels.' },
            { prop: 'dailyTimeline.segmentsKey', type: 'string', description: "Row key holding the OPTIONAL, PREFERRED segments[] ({state,start,end} clock times). Absent → one proportional active + inactive block from the minute totals." },
            { prop: 'widget.toneMap', type: 'Record<string, OverviewTone>', description: 'Data value → semantic tint. Tone is config, never a hardcoded hue in the component.' },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Author the whole Overview tab as one widgets array in the blueprint — no bespoke React per module.',
            'Put the tone in the data and map it with toneMap, so one widget config serves every status value.',
            'Give a bar chart a yAxisTitle when the number is not self-evident from the card title.',
            'Pass onEventSelect only when you really have somewhere to send the user.',
            'Seed dailyTimeline rows with segments[] when the source system has them — the derived two-block fallback is a summary, not the day’s real pattern.',
          ]}
          donts={[
            'Don’t format values here — pre-format them in the data layer; every widget renders what it is given (Rule 8).',
            'Don’t reach for a second y-axis. Two measures of different scale are two charts.',
            'Don’t encode meaning in colour alone — every toned value on this board is also stated in words.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Every event row is a real <button> when onEventSelect is wired, and plain text when it is not — no role="button" divs and no dead controls.',
            'Map overlay controls (zoom ±, fullscreen, open-in-new) each carry an aria-label; the map itself gets an aria-label from the widget title.',
            'Charts render through the ui-kit ECharts wrappers, which ship a data-table twin so values are readable without seeing the plot.',
            'Toned values state their meaning in words as well as hue; the value inks use the dark ramp steps that clear 4.5:1 on the card surface.',
            'dailyTimeline is a <table> with a caption, a column header row and a rowheader per day; its bars are aria-hidden over a per-row text summary ("Thursday 03 Sep: Active 7h 36m, Inactive 24m, 95%"), and the off-day track says "No planned shift" in words.',
            'RTL-safe: logical properties throughout (start-*/end-*, ps/pe) — the dailyTimeline track is positioned with inset-inline-start/inline-size, so the clock window mirrors.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
