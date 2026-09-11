import {
  KpiMetricCard,
  type KpiMetricCardTone,
  type KpiMetricCardBadgeTone,
} from '../../../../packages/ui-kit/src/composites/KpiMetricCard'
import { DocPage, DocSection, Prose, Gallery, Playground, PropsTable, Guidelines, A11yList, Code } from '../docs'

const TONES: KpiMetricCardTone[] = ['primary', 'success', 'warning', 'danger', 'info', 'neutral']
const BADGE_TONES: KpiMetricCardBadgeTone[] = ['up', 'down', 'success', 'warning', 'link', 'neutral']

type KpiMetricCardControls = {
  value: string
  label: string
  accent: 'none' | KpiMetricCardTone
  badgeTone: 'none' | KpiMetricCardBadgeTone
  clickable: boolean
}

export default function KpiMetricCardDemo() {
  return (
    <DocPage
      title="KpiMetricCard"
      badge="stable"
      summary="Value-first KPI card: the big value leads, the label sits under it, with an optional semantic accent bar and a delta/badge chip. Complements KpiTile (label-first, icon-chip anatomy) for dashboards that read as a row of headline numbers. Width-fluid — consumers own the grid (6-up ≥1440, 3×2 below); the value never wraps, the badge truncates first."
    >
      <DocSection id="playground" title="Playground">
        <Playground<KpiMetricCardControls>
          controls={[
            { name: 'value', type: 'text', default: '1,204' },
            { name: 'label', type: 'text', default: 'Scheduled Jobs' },
            { name: 'accent', type: 'select', default: 'none', options: ['none', ...TONES] },
            { name: 'badgeTone', type: 'select', default: 'up', options: ['none', ...BADGE_TONES] },
            { name: 'clickable', type: 'boolean', default: false },
          ]}
        >
          {(v) => (
            <div className="w-full max-w-xs">
              <KpiMetricCard
                value={v.value}
                label={v.label}
                accent={v.accent === 'none' ? undefined : v.accent}
                badge={
                  v.badgeTone === 'none'
                    ? undefined
                    : { label: v.badgeTone === 'link' ? 'View Details' : '+12 vs Yest.', tone: v.badgeTone }
                }
                clickable={v.clickable}
                onClick={v.clickable ? () => {} : undefined}
              />
            </div>
          )}
        </Playground>
      </DocSection>

      <DocSection id="accents" title="Accents">
        <Prose>
          <Code>accent</Code> draws a start-edge semantic bar. Colour is never the only encoding —
          pair it with a badge or label wording that carries the same meaning in text.
        </Prose>
        <Gallery
          minColRem={14}
          items={TONES.map((tone) => ({
            label: tone,
            node: <KpiMetricCard value="42" label="Metric" accent={tone} className="w-full" />,
          }))}
        />
      </DocSection>

      <DocSection id="badges" title="Badge tones">
        <Gallery
          minColRem={16}
          items={[
            {
              label: 'up / down',
              caption: 'renders a real TrendIndicator',
              node: (
                <div className="flex w-full flex-col gap-2">
                  <KpiMetricCard value="96%" label="Fulfillment Rate" accent="success" badge={{ label: '+12 vs Yest.', tone: 'up' }} />
                  <KpiMetricCard value="88%" label="On-time Rate" badge={{ label: '-4 vs Yest.', tone: 'down' }} />
                </div>
              ),
            },
            {
              label: 'chips',
              caption: 'success / warning / neutral',
              node: (
                <div className="flex w-full flex-col gap-2">
                  <KpiMetricCard value="12" label="Completed" badge={{ label: 'On track', tone: 'success' }} />
                  <KpiMetricCard value="4" label="Delayed" accent="warning" badge={{ label: 'Watch', tone: 'warning' }} />
                </div>
              ),
            },
            {
              label: 'link',
              caption: 'the "View Details" affordance tone',
              node: (
                <KpiMetricCard
                  value="3"
                  label="Action Required"
                  accent="danger"
                  badge={{ label: 'View Details', tone: 'link' }}
                  clickable
                  onClick={() => {}}
                  className="w-full"
                />
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="grid" title="In a KPI row">
        <Prose>
          The card is container-friendly: the consumer owns the grid. A cockpit renders 6-up at
          ≥1440 and 3×2 below — the card itself only guarantees the value never wraps and the
          badge truncates first.
        </Prose>
        <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <KpiMetricCard value="128" label="Scheduled" />
          <KpiMetricCard value="86" label="Dispatched" />
          <KpiMetricCard value="42" label="Ongoing" accent="info" />
          <KpiMetricCard value="4" label="Delayed" accent="warning" />
          <KpiMetricCard value="96%" label="Fulfillment" accent="success" badge={{ label: '+2', tone: 'up' }} />
          <KpiMetricCard value="3" label="Action Required" accent="danger" badge={{ label: 'View Details', tone: 'link' }} clickable onClick={() => {}} />
        </div>
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            { prop: 'value', type: 'ReactNode', required: true, description: 'The big value, pre-formatted by the caller. Never wraps or truncates.' },
            { prop: 'label', type: 'ReactNode', required: true, description: 'Small label under the value; truncates.' },
            { prop: 'accent', type: "'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'", description: 'Start-edge semantic color bar. Omit for no bar.' },
            { prop: 'badge', type: '{ label: string; tone?: KpiMetricCardBadgeTone }', description: "End-of-value-row chip. Tones: 'up'/'down' (TrendIndicator), 'success'/'warning'/'neutral' (tinted chip), 'link' (primary-toned text)." },
            { prop: 'clickable', type: 'boolean', default: 'false', description: 'Makes the whole card a keyboard-operable button (role="button", Enter/Space).' },
            { prop: 'onClick', type: '() => void', description: 'Activation callback; only wired when clickable.' },
            { prop: '…props', type: 'HTMLAttributes<HTMLDivElement>', description: 'className and any native div attribute pass through.' },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Pre-format value, label, and badge text in the caller — the card does no numeric or business logic.',
            'Pair an accent with a badge or label wording that carries the same meaning in text.',
            'Keep all cards in a row prop-shaped alike so their uniform min-height renders one clean line.',
            'Own the grid in the consumer (6-up ≥1440, 3×2 below) — the card only guarantees graceful reflow.',
          ]}
          donts={[
            'Do not encode "good vs bad" in the component — a KPI where down is good is the caller\'s tone choice.',
            'Do not use this label-first anatomy — that is KpiTile.',
            'Do not pass long prose as the value; it never wraps by design.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'clickable renders role="button" with tabIndex 0; Enter and Space activate onClick.',
            'Visible focus ring via focus-visible (ring token), never outline: none without replacement.',
            'The accent bar and trend arrow are aria-hidden decoration — meaning is always in text.',
            'Trend badges include a visually hidden direction word ("up"/"down") via TrendIndicator.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
