import {
  CriticalEventsList,
  type CriticalEventsListItem,
  type CriticalEventSeverity,
} from '../../../../packages/ui-kit/src/composites/CriticalEventsList'
import { DocPage, DocSection, Prose, Gallery, Playground, PropsTable, Guidelines, A11yList, DevNote, Code } from '../docs'

/**
 * CriticalEventsListDemo — standard component-page template for the
 * CriticalEventsList composite. Consolidates the v5 `CriticalEvents.vue`
 * `q-virtual-scroll` pattern (8 asset-vehicle profile tabs across
 * iwmp/fams/ead + shared DriverSafetyOverview).
 */

const MIXED: CriticalEventsListItem[] = [
  {
    id: '1',
    title: 'GPS signal lost',
    description: 'Vehicle AUH-2201 — Al Ain Rd',
    severity: 'error',
    timestamp: '09:41',
  },
  {
    id: '2',
    title: 'Route deviation',
    description: 'Lot 2 — collection sequence skipped',
    severity: 'warning',
    timestamp: '09:12',
  },
  {
    id: '3',
    title: 'Shift started',
    description: 'Driver checked in — Vehicle AUH-4471',
    severity: 'info',
    timestamp: '08:00',
  },
]

const SEVERITIES: CriticalEventSeverity[] = ['info', 'warning', 'error']

type CriticalEventsControls = {
  severity: CriticalEventSeverity
  clickable: boolean
}

function logItemClick(id: string) {
  // eslint-disable-next-line no-console -- showcase-only demo affordance.
  console.log('CriticalEventsList item clicked', id)
}

export default function CriticalEventsListDemo() {
  return (
    <DocPage
      title="CriticalEventsList"
      badge="stable"
      summary="A bordered card listing critical/warning/info events as a scannable row list. Consolidates the v5 CriticalEvents.vue q-virtual-scroll pattern (8 asset-vehicle profile tabs across iwmp/fams/ead + shared DriverSafetyOverview) — icon + severity color, previously resolved ad-hoc per event rule, now a closed severity enum resolved through IconBadge's token map."
    >
      <DocSection id="playground" title="Playground">
        <Playground<CriticalEventsControls>
          controls={[
            { name: 'severity', type: 'select', default: 'error', options: SEVERITIES },
            { name: 'clickable', type: 'boolean', default: true },
          ]}
        >
          {(v) => (
            <CriticalEventsList
              className="w-full max-w-md"
              items={[
                {
                  id: '1',
                  title: 'GPS signal lost',
                  description: 'Vehicle AUH-2201 — Al Ain Rd',
                  severity: v.severity,
                  timestamp: '09:41',
                },
              ]}
              onItemClick={v.clickable ? logItemClick : undefined}
            />
          )}
        </Playground>
      </DocSection>

      <DocSection id="examples" title="Examples">
        <Prose>
          <Code>severity</Code> resolves to the leading <Code>IconBadge</Code> icon + tone —{' '}
          <Code>info</Code>, <Code>warning</Code>, <Code>error</Code>. An empty{' '}
          <Code>items</Code> array delegates to <Code>StatusView</Code> (override via the{' '}
          <Code>emptyState</Code> prop).
        </Prose>
        <Gallery
          minColRem={26}
          maxCols={2}
          items={[
            {
              label: 'Mixed severities',
              caption: 'onItemClick set — rows are interactive',
              node: <CriticalEventsList className="w-full" items={MIXED} onItemClick={logItemClick} />,
            },
            {
              label: 'Non-interactive',
              caption: 'onItemClick omitted — plain rows, no button semantics',
              node: <CriticalEventsList className="w-full" items={MIXED} />,
            },
            {
              label: 'Empty',
              caption: 'items=[] → StatusView',
              node: <CriticalEventsList className="w-full" items={[]} />,
            },
          ]}
        />
      </DocSection>

      <DocSection id="meta" title="Metadata columns">
        <Prose>
          An item's <Code>meta</Code> is handed to its <Code>ListRow</Code> and rendered as
          label-over-value columns between the title block and the timestamp — the event-log row
          layout used by dashboard event widgets.
        </Prose>
        <CriticalEventsList
          className="w-full"
          onItemClick={() => {}}
          items={[
            {
              id: 'm1',
              title: 'Harsh braking',
              severity: 'warning',
              meta: [
                { label: 'Asset', value: 'TME-298' },
                { label: 'Speed', value: '82 km/h' },
              ],
              timestamp: '09:41',
            },
            {
              id: 'm2',
              title: 'GPS signal lost',
              severity: 'error',
              meta: [
                { label: 'Asset', value: 'AUH-2201' },
                { label: 'Duration', value: '12 min' },
              ],
              timestamp: '09:12',
            },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            {
              prop: 'items',
              type: 'CriticalEventsListItem[]',
              required: true,
              description:
                '{ id, title, description?, severity: info|warning|error, severityLabel?, meta?: { label, value }[], timestamp? } per row. Every row renders a severity chip (icon + word); severityLabel overrides that word.',
            },
            {
              prop: 'onItemClick',
              type: '(id: string) => void',
              description: 'Called with the clicked item’s id. Omit to render a non-interactive list.',
            },
            {
              prop: 'emptyState',
              type: 'ReactNode',
              description: 'Rendered instead of the list when items is empty. Defaults to a StatusView.',
            },
            {
              prop: '…props',
              type: 'HTMLAttributes<HTMLDivElement>',
              description: 'className and any div attribute pass through to the root card.',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Use for a short, scannable feed of critical/warning/info events — GPS loss, overspeeding, SLA breach.',
            'Pre-format timestamp on the caller side ("09:41", "2h ago") before passing it in.',
            'Pass onItemClick to route into the event’s detail view; omit it for a read-only feed.',
            'Let the default EmptyState render for the zero-events case unless the copy needs to be domain-specific.',
          ]}
          donts={[
            'Don’t use it for a long, paginated table — it has no virtualization; use DataTable instead.',
            'Don’t invent a fourth severity; the tone map is closed to info/warning/error.',
            'Don’t fetch or poll inside the component — it renders exactly the items it is given.',
            'Don’t bake a formatted address/date into description and timestamp separately for the same fact — pick one.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Each row is a ListRow — interactive rows get role="button" and tabIndex={0} when onItemClick is provided.',
            'Enter and Space activate a clickable row via onKeyDown, matching native button behavior.',
            'The leading severity icon is decorative; the title/description text carries the meaning for assistive tech.',
            'Layout uses logical properties, so it mirrors correctly under RTL (switch the header language).',
          ]}
        />
      </DocSection>

      <DocSection id="notes" title="Developer notes">
        <DevNote>
          Thin composition over <Code>ListRow</Code> + <Code>StatusView</Code> + <Code>IconBadge</Code> —
          no new visual surface, just a <Code>severity → tone</Code> map and assembly. State-agnostic:
          fetching, polling, and dismissal are the caller’s responsibility; a single{' '}
          <Code>onItemClick(id)</Code> callback keeps prop identities stable across re-renders instead of a
          closure per item.
        </DevNote>
      </DocSection>
    </DocPage>
  )
}
