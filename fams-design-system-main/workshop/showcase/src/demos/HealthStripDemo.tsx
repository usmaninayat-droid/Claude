import type { LucideIcon } from '@fams/ui-kit/icons'
import { Battery, Fuel, Gauge, Key, Signal, Thermometer } from '@fams/ui-kit/icons'
import {
  HealthStrip,
  type HealthStripItem,
  type HealthStripStatus,
} from '../../../../packages/ui-kit/src/composites/HealthStrip'
import { DocPage, DocSection, Prose, Gallery, PropsTable, Guidelines, A11yList, Code } from '../docs'

/**
 * HealthStripDemo — reference-template conversion of the HealthStrip
 * composite showcase. RTL is proven by the global header switcher, not a
 * per-page block.
 */

const VITALS: HealthStripItem[] = [
  { label: 'GPS Signal', value: '98%', status: 'success', icon: Signal },
  { label: 'Fuel', value: '24 L', status: 'warning', icon: Fuel },
  { label: 'Ignition', value: 'Offline', status: 'danger', icon: Key },
  { label: 'Coolant Temp', value: '92°C', status: 'info', icon: Thermometer },
  { label: 'Odometer', value: '128,430 km', status: 'neutral', icon: Gauge },
  { label: 'Battery', value: '12.6 V', status: 'success', icon: Battery },
]

const VITALS_DOTS_ONLY: HealthStripItem[] = [
  { label: 'GPS', value: '98%', status: 'success' },
  { label: 'Fuel', value: '24 L', status: 'warning' },
  { label: 'Ignition', value: 'Offline', status: 'danger' },
  { label: 'Uplink', value: 'Stale', status: 'neutral' },
]

const STATUS_SAMPLES: { status: HealthStripStatus; label: string; value: string; icon: LucideIcon }[] = [
  { status: 'success', label: 'GPS Signal', value: '98%', icon: Signal },
  { status: 'warning', label: 'Fuel', value: '24 L', icon: Fuel },
  { status: 'danger', label: 'Ignition', value: 'Offline', icon: Key },
  { status: 'info', label: 'Coolant Temp', value: '92°C', icon: Thermometer },
  { status: 'neutral', label: 'Odometer', value: '128,430 km', icon: Gauge },
]

export default function HealthStripDemo() {
  return (
    <DocPage
      title="HealthStrip"
      badge="stable"
      summary="A compact, fixed 2/4-col grid of vitals readouts. Consolidates the ~10 v5 description-item vitals grids (map overview panels) that carry no status concept today, plus ad-hoc hand-toggled warning classes in WorkforceActivity.vue."
    >
      <DocSection id="preview" title="Preview">
        <Prose>
          <Code>status</Code> drives a token-based tint — a leading dot by default, or the tone of
          the item's <Code>IconBadge</Code> when an <Code>icon</Code> is given.
        </Prose>
        <HealthStrip items={VITALS} className="w-full" />
      </DocSection>

      <DocSection id="status" title="Status">
        <Gallery
          layout="rows"
          items={STATUS_SAMPLES.map(({ status, label, value, icon }) => ({
            label: status,
            node: <HealthStrip items={[{ label, value, status, icon }]} className="w-full" />,
          }))}
        />
      </DocSection>

      <DocSection id="icon-vs-dot" title="Icon vs. dot">
        <Prose>Omit <Code>icon</Code> per item for a plain status dot — no icon slot reserved.</Prose>
        <Gallery
          layout="rows"
          items={[
            { label: 'With icons', node: <HealthStrip items={VITALS.slice(0, 4)} className="w-full" /> },
            { label: 'Dot only', node: <HealthStrip items={VITALS_DOTS_ONLY} className="w-full" /> },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            {
              prop: 'items',
              type: 'HealthStripItem[]',
              required: true,
              description: 'The vitals to render, left to right, wrapping into the 2/4-col grid.',
            },
            {
              prop: 'items[].label',
              type: 'ReactNode',
              description: 'Short label above the value, e.g. "GPS", "Fuel", "Ignition".',
            },
            {
              prop: 'items[].value',
              type: 'ReactNode',
              description: 'Pre-formatted value, e.g. "98%", "Offline", "24 L".',
            },
            {
              prop: 'items[].status',
              type: "'neutral' | 'success' | 'warning' | 'danger' | 'info'",
              default: "'neutral'",
              description: "Drives the status dot (or, with icon, the item's IconBadge tone).",
            },
            {
              prop: 'items[].icon',
              type: 'LucideIcon',
              description: 'Optional leading icon, rendered in a small IconBadge toned to status. Omit for a plain status dot.',
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
            'Use HealthStrip for at-a-glance vitals that should all be visible without interaction.',
            'Pick a status per item deliberately — neutral means "no judgement", not "unknown".',
            'Pair an icon with a status when the icon adds real identification value (fuel, battery).',
            'Keep values pre-formatted and short — the grid cell is not built for wrapping text.',
          ]}
          donts={[
            'Don’t use it as a scroller for an unbounded list — it is a fixed 2/4-col grid.',
            'Don’t hardcode a status colour; always drive tint through the status token.',
            'Don’t mix vitals from unrelated domains in one strip — one strip, one subject.',
            'Don’t omit the label to save space — colour/dot alone is not enough context.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Status is conveyed by the dot/icon tone plus the text label — never colour alone.',
            'Hairline dividers use a bg-border grid gutter, not directional per-cell borders.',
            'Meets WCAG 2.2 AA contrast in every status tone across all tenants.',
            'Layout uses a plain grid with no directional overrides, so it mirrors correctly under RTL (switch the header language).',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
