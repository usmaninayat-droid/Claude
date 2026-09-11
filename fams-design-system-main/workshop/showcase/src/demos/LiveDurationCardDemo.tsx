import { useState } from 'react'
import { LiveDurationCard } from '../../../../packages/ui-kit/src/composites/LiveDurationCard'
import { DocPage, DocSection, Prose, Gallery, Playground, PropsTable, Guidelines, A11yList, DevNote, Code } from '../docs'

/**
 * LiveDurationCardDemo — reference-template conversion of the
 * LiveDurationCard composite showcase. RTL is proven by the global header
 * switcher, not a per-page block.
 */

type LiveDurationMode = 'completed' | 'tracking-under' | 'tracking-over' | 'open-ended'

type LiveDurationControls = {
  mode: LiveDurationMode
  size: 'sm' | 'md'
  label: string
}

export default function LiveDurationCardDemo() {
  const [now] = useState(() => Date.now())

  const timesFor = (mode: LiveDurationMode) => {
    switch (mode) {
      case 'completed':
        return { start: new Date(now - 8.5 * 60 * 60 * 1000), end: new Date(now - 30 * 60 * 1000) }
      case 'tracking-under':
        return { start: new Date(now - 20 * 60 * 1000), expectedEnd: new Date(now + 40 * 60 * 1000) }
      case 'tracking-over':
        return { start: new Date(now - 75 * 60 * 1000), expectedEnd: new Date(now - 15 * 60 * 1000) }
      case 'open-ended':
      default:
        return { start: new Date(now - 3 * 60 * 60 * 1000) }
    }
  }

  return (
    <DocPage
      title="LiveDurationCard"
      badge="stable"
      summary='A self-ticking duration display with three modes derived from which of expectedEnd/end are set — completed (static total), tracking-vs-expected (live + Progress bar, danger past the expected end), and open-ended (live counter only). size="sm" folds in the reference&apos;s separate compact badge as a denser presentation of the same three modes.'
    >
      <DocSection id="playground" title="Playground">
        <Playground<LiveDurationControls>
          controls={[
            {
              name: 'mode',
              type: 'select',
              default: 'tracking-under',
              options: ['completed', 'tracking-under', 'tracking-over', 'open-ended'],
            },
            { name: 'size', type: 'select', default: 'md', options: ['sm', 'md'] },
            { name: 'label', type: 'text', default: 'Maintenance window' },
          ]}
        >
          {(v) => {
            const { start, end, expectedEnd } = timesFor(v.mode)
            return (
              <div className={v.size === 'sm' ? 'w-64' : 'w-80'}>
                <LiveDurationCard
                  start={start}
                  end={end}
                  expectedEnd={expectedEnd}
                  size={v.size}
                  completedLabel={v.mode === 'completed' ? v.label : undefined}
                  trackingLabel={v.mode.startsWith('tracking') ? v.label : undefined}
                  openEndedLabel={v.mode === 'open-ended' ? v.label : undefined}
                />
              </div>
            )
          }}
        </Playground>
      </DocSection>

      <DocSection id="modes" title="Modes">
        <Prose>
          Mode is derived, not chosen: <Code>end</Code> set → completed; <Code>expectedEnd</Code>{' '}
          set (no <Code>end</Code>) → tracking, with the dot/label/overage line switching to danger
          once elapsed passes it; neither set → open-ended.
        </Prose>
        <Gallery
          minColRem={18}
          items={[
            {
              label: 'Completed',
              node: (
                <div className="w-72">
                  <LiveDurationCard {...timesFor('completed')} completedLabel="Shift duration" />
                </div>
              ),
            },
            {
              label: 'Tracking — under',
              node: (
                <div className="w-72">
                  <LiveDurationCard {...timesFor('tracking-under')} trackingLabel="Maintenance window" />
                </div>
              ),
            },
            {
              label: 'Tracking — over',
              node: (
                <div className="w-72">
                  <LiveDurationCard {...timesFor('tracking-over')} trackingLabel="Call duration" overLabel="Over target by" />
                </div>
              ),
            },
            {
              label: 'Open-ended',
              node: (
                <div className="w-72">
                  <LiveDurationCard {...timesFor('open-ended')} openEndedLabel="Asset offline" />
                </div>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="size" title="Size">
        <Prose>
          <Code>size="sm"</Code> is the reference's former separate compact badge — identical
          mode/tick logic, a denser single-line presentation with no <Code>Progress</Code> bar.
        </Prose>
        <Gallery
          minColRem={18}
          items={[
            {
              label: 'sm — tracking, under',
              node: <LiveDurationCard size="sm" {...timesFor('tracking-under')} trackingLabel="Call" />,
            },
            {
              label: 'sm — tracking, over',
              node: <LiveDurationCard size="sm" {...timesFor('tracking-over')} trackingLabel="Call" />,
            },
            {
              label: 'sm — completed',
              node: <LiveDurationCard size="sm" {...timesFor('completed')} completedLabel="Call" />,
            },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            { prop: 'start', type: 'Date | string', required: true, description: 'Duration start.' },
            {
              prop: 'expectedEnd',
              type: 'Date | string',
              description: 'Planned end — enables tracking mode (live counter + Progress bar vs. this). Ignored once end is set.',
            },
            {
              prop: 'end',
              type: 'Date | string',
              description: 'Actual end — enables completed mode (static total, no ticking). Takes priority over expectedEnd.',
            },
            { prop: 'size', type: "'sm' | 'md'", default: "'md'", description: 'sm is the dense single-line presentation with no Progress bar.' },
            { prop: 'completedLabel', type: 'ReactNode', default: "'Total duration'", description: 'Header label for the completed mode.' },
            { prop: 'trackingLabel', type: 'ReactNode', default: "'In progress'", description: 'Header label for the tracking mode.' },
            { prop: 'openEndedLabel', type: 'ReactNode', default: "'Elapsed'", description: 'Header label for the open-ended mode.' },
            { prop: 'expectedLabel', type: 'ReactNode', default: "'expected'", description: 'Inline label prefixing the expected total in tracking mode.' },
            { prop: 'overLabel', type: 'ReactNode', default: "'Over expected by'", description: 'Label prefixing the overage line once tracking mode passes expectedEnd.' },
            {
              prop: 'icon',
              type: 'ReactNode',
              description: 'Leading icon/dot slot, overriding the mode default. Pass null to omit it entirely.',
            },
            {
              prop: '…props',
              type: 'HTMLAttributes<HTMLDivElement>',
              description: 'className and any div attribute pass through.',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Let the mode fall out of which of end/expectedEnd you pass — don’t compute a mode yourself.',
            'Use size="sm" wherever it sits inline in a row or list; use "md" for a standalone card.',
            'Choose completedLabel/trackingLabel/openEndedLabel to match the domain (shift, call, maintenance window).',
            'Treat the danger tone as a signal, not a style — it only appears once elapsed truly passes expectedEnd.',
          ]}
          donts={[
            'Don’t pass both end and expectedEnd expecting tracking to win — end always takes priority.',
            'Don’t re-color the Progress bar for danger — the surrounding chrome carries that, not the bar fill.',
            'Don’t use LiveDurationCard for a static, non-ticking duration — a plain value/label pair is lighter.',
            'Don’t override icon unless the default clock/pulsing-dot genuinely doesn’t fit the context.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Renders role="status" with aria-live="polite" for tracking/open-ended modes, so assistive tech announces ticking updates; completed mode omits aria-live since nothing changes.',
            'The danger transition is conveyed by the text label and colour together, not colour alone.',
            'The pulsing dot and clock icon are aria-hidden — decorative, not informational.',
            'Meets WCAG 2.2 AA contrast in every tone (neutral/accent/danger) across all tenants.',
            'Layout uses logical properties, so it mirrors correctly under RTL (switch the header language).',
          ]}
        />
      </DocSection>

      <DocSection id="notes" title="Developer notes">
        <DevNote>
          The tracking mode's bar is a plain, single-tone <Code>Progress</Code> — the danger state
          comes from the surrounding chrome, not from re-coloring the primitive. Composes{' '}
          <Code>Progress</Code> rather than re-implementing a bar.
        </DevNote>
      </DocSection>
    </DocPage>
  )
}
