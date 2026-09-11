import { useState } from 'react'
import { RouteJobCard } from '../../../../packages/ui-kit/src/composites/RouteJobCard'
import { Avatar } from '../../../../packages/ui-kit/src/primitives/Avatar'
import { DocPage, DocSection, Prose, Gallery, Playground, PropsTable, Guidelines, A11yList, Code } from '../docs'

type RouteJobCardControls = {
  progressPct: '0' | '33' | '66' | '100'
  selected: boolean
  showBanner: boolean
  narrow: boolean
}

function SelectableQueue() {
  const [selectedId, setSelectedId] = useState('job-1')
  const jobs = [
    { id: 'job-1', title: 'JOB-1042', subtitle: 'AB-1234 · Jordan Reyes', pct: 66, status: { label: 'In Progress', variant: 'inProgress' as const } },
    { id: 'job-2', title: 'JOB-1043', subtitle: 'CD-5678 · Sam Ortiz', pct: 20, status: { label: 'Scheduled', variant: 'scheduled' as const } },
    { id: 'job-3', title: 'JOB-1044', subtitle: 'EF-9012 · Alex Kim', pct: 100, status: { label: 'Closed', variant: 'closed' as const } },
  ]
  return (
    <div className="flex w-full max-w-sm flex-col gap-2">
      {jobs.map((job) => (
        <RouteJobCard
          key={job.id}
          title={job.title}
          subtitle={job.subtitle}
          status={job.status}
          progressPct={job.pct}
          selected={selectedId === job.id}
          onSelect={() => setSelectedId(job.id)}
        />
      ))}
    </div>
  )
}

export default function RouteJobCardDemo() {
  return (
    <DocPage
      title="RouteJobCard"
      badge="stable"
      summary="Selectable queue card for job/route/work-item lists: title + subtitle + StatusPill, progress bar with planned/actual time labels, optional meta chips and a risk banner. Module-agnostic props, all pre-formatted by the caller. Its own @container: below the @sm container width the time labels stack instead of crushing."
    >
      <DocSection id="playground" title="Playground">
        <Playground<RouteJobCardControls>
          controls={[
            { name: 'progressPct', type: 'select', default: '66', options: ['0', '33', '66', '100'] },
            { name: 'selected', type: 'boolean', default: false },
            { name: 'showBanner', type: 'boolean', default: true },
            { name: 'narrow', type: 'boolean', default: false },
          ]}
        >
          {(v) => (
            <div className={v.narrow ? 'w-64' : 'w-full max-w-md'}>
              <RouteJobCard
                title="JOB-1042"
                subtitle="Plate AB-1234 · Jordan Reyes"
                leading={<Avatar name="Jordan Reyes" size="sm" />}
                status={{ label: 'In Progress', variant: 'inProgress' }}
                progressPct={Number(v.progressPct)}
                progressLabel={`${v.progressPct}%`}
                plannedLabel="Planned 06:00 – 14:00"
                actualLabel="Actual 06:12 · +12 min"
                meta={[{ id: 'plan', label: 'Downtown Service Plan' }, { id: 'zone', label: 'Zone 4' }]}
                banner={v.showBanner ? { tone: 'warning', text: 'SLA at risk — 2 stops behind plan' } : undefined}
                selected={v.selected}
                onSelect={() => {}}
              />
            </div>
          )}
        </Playground>
      </DocSection>

      <DocSection id="selection" title="Selectable queue">
        <Prose>
          Passing <Code>onSelect</Code> makes the whole card the click target (<Code>role="button"</Code>,{' '}
          <Code>aria-pressed</Code>); <Code>selected</Code> is border + tint, visually distinct from hover.
        </Prose>
        <SelectableQueue />
      </DocSection>

      <DocSection id="narrow" title="Narrow variant">
        <Prose>
          The card is its own size container. In a pane narrower than the <Code>@sm</Code> container
          breakpoint, the planned/actual labels stack under the progress bar instead of crushing on
          one line — resize the split pane, not the viewport.
        </Prose>
        <Gallery
          minColRem={16}
          maxCols={2}
          items={[
            {
              label: 'Wide pane',
              node: (
                <div className="w-full">
                  <RouteJobCard title="JOB-1042" progressPct={66} plannedLabel="Planned 06:00 – 14:00" actualLabel="Actual 06:12 · +12 min" />
                </div>
              ),
            },
            {
              label: 'Narrow pane (16rem)',
              caption: 'times stack, nothing overflows',
              node: (
                <div className="w-64">
                  <RouteJobCard title="JOB-1042" progressPct={66} plannedLabel="Planned 06:00 – 14:00" actualLabel="Actual 06:12 · +12 min" />
                </div>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="banners" title="Risk banner tones">
        <Gallery
          minColRem={18}
          items={(['warning', 'danger', 'info'] as const).map((tone) => ({
            label: tone,
            node: (
              <RouteJobCard
                title="JOB-1042"
                status={{ label: 'Overdue', variant: 'overdue' }}
                banner={{ tone, text: tone === 'danger' ? 'Action required — vehicle down' : 'SLA at risk' }}
                className="w-full"
              />
            ),
          }))}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            { prop: 'title', type: 'ReactNode', required: true, description: 'Primary identity line (job/route id or name).' },
            { prop: 'subtitle', type: 'ReactNode', description: 'Secondary identity line; truncates.' },
            { prop: 'leading', type: 'ReactNode', description: 'Leading slot beside the title block (e.g. an Avatar).' },
            { prop: 'status', type: '{ label: string; variant?: StatusPillVariant; color?: string }', description: 'Rendered as a StatusPill in the title row.' },
            { prop: 'progressPct', type: 'number', description: '0–100 (clamped). Omit for no progress row.' },
            { prop: 'progressLabel', type: 'ReactNode', default: '"<pct>%"', description: 'Text pairing for the bar — colour/length is never the sole carrier.' },
            { prop: 'plannedLabel / actualLabel', type: 'ReactNode', description: 'Pre-formatted time lines; stack below the @sm container width.' },
            { prop: 'meta', type: '{ id?: string; label: ReactNode }[]', description: 'Small muted chips (tags, plan names, zones).' },
            { prop: 'banner', type: "{ tone?: 'warning' | 'danger' | 'info'; text: ReactNode }", description: 'Risk/notice line at the bottom of the card.' },
            { prop: 'selected', type: 'boolean', default: 'false', description: 'Selected state (border + tint), reflected as aria-pressed.' },
            { prop: 'onSelect', type: '() => void', description: 'Makes the whole card a keyboard-operable button.' },
            { prop: '…props', type: 'HTMLAttributes<HTMLDivElement>', description: 'className and any native div attribute pass through.' },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Pre-format every string in the caller — times, delays, progress readings; the card does no time math.',
            'Keep selection exclusive in the consumer and scroll the selected card into view on external selection.',
            'Use the status color escape hatch only with blueprint-driven data values, never literals.',
          ]}
          donts={[
            'Do not put domain fetch logic or store wiring inside — data + callbacks via props only.',
            'Do not rely on the bar alone for progress — keep the text pairing.',
            'Do not force a fixed width; the card is container-driven by design.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'onSelect renders role="button" + tabIndex 0; Enter and Space activate; aria-pressed tracks selected.',
            'The progress bar is a real Radix progressbar with aria-valuenow and an accessible name.',
            'Selected state is border + tint plus aria-pressed — never colour alone.',
            'Visible focus ring via focus-visible tokens.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
