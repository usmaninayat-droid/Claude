import { useState } from 'react'
import { Fuel, Gauge, ShieldAlert, Truck } from '@fams/ui-kit/icons'
import { KpiTile } from '../../../../packages/ui-kit/src/composites/KpiTile'
import { Badge } from '../../../../packages/ui-kit/src/primitives/Badge'
import type { IconBadgeTone } from '../../../../packages/ui-kit/src/primitives/IconBadge'
import { DocPage, DocSection, Prose, Gallery, Playground, PropsTable, Guidelines, A11yList, Code } from '../docs'

/**
 * KpiTileDemo — reference-template conversion of the KpiTile composite
 * showcase. RTL is proven by the global header switcher, not a per-page
 * block.
 */

const TONES: { tone: IconBadgeTone; label: string; value: string; unit?: string }[] = [
  { tone: 'primary', label: 'Active vehicles', value: '142' },
  { tone: 'info', label: 'Fuel consumed', value: '2,430', unit: 'L' },
  { tone: 'success', label: 'Avg. speed', value: '61', unit: 'km/h' },
  { tone: 'danger', label: 'Overspeeding events', value: '18' },
]

const TONE_ICONS: Record<IconBadgeTone, typeof Truck> = {
  primary: Truck,
  info: Fuel,
  success: Gauge,
  warning: Gauge,
  danger: ShieldAlert,
  neutral: Gauge,
}

type KpiTileControls = {
  tone: IconBadgeTone
  label: string
  value: string
  unit: string
  description: string
  clickable: boolean
  showTrend: boolean
}

function ClickableTile() {
  const [clicks, setClicks] = useState(0)
  return (
    <KpiTile
      label="Overspeeding events"
      value={clicks === 0 ? '18' : String(18 + clicks)}
      icon={ShieldAlert}
      tone="danger"
      description="tap to drill into the violations list"
      clickable
      onClick={() => setClicks((c) => c + 1)}
      className="w-56"
    />
  )
}

export default function KpiTileDemo() {
  return (
    <DocPage
      title="KpiTile"
      badge="stable"
      summary="Label + big value stat tile, the canonical 'number that matters' building block for dashboards and profile headers. Consolidates three forked v5 icon-tile/kpi-card shapes (iwmp/components/charts/StatisticCard.vue, DetailsCard.vue, shared/components/cards/TileCard.vue) that each hand-rolled icon color and trend styling via inline hex."
    >
      <DocSection id="playground" title="Playground">
        <Playground<KpiTileControls>
          controls={[
            { name: 'tone', type: 'select', default: 'primary', options: ['primary', 'success', 'warning', 'danger', 'info', 'neutral'] },
            { name: 'label', type: 'text', default: 'Fleet utilization' },
            { name: 'value', type: 'text', default: '76' },
            { name: 'unit', type: 'text', default: '%' },
            { name: 'description', type: 'text', default: '' },
            { name: 'showTrend', type: 'boolean', default: true },
            { name: 'clickable', type: 'boolean', default: false },
          ]}
        >
          {(v) => (
            <KpiTile
              label={v.label}
              value={v.value}
              unit={v.unit || undefined}
              icon={TONE_ICONS[v.tone]}
              tone={v.tone}
              description={v.description || undefined}
              clickable={v.clickable}
              onClick={v.clickable ? () => {} : undefined}
              trend={v.showTrend ? { direction: 'up', value: '4%', note: 'vs last week' } : undefined}
              className="w-64"
            />
          )}
        </Playground>
      </DocSection>

      <DocSection id="tone" title="Icon & tone">
        <Prose>
          <Code>icon</Code> renders through <Code>IconBadge</Code>; <Code>tone</Code> tints the
          icon disc. Omit <Code>icon</Code> for a plain label/value tile.
        </Prose>
        <Gallery
          minColRem={17}
          items={TONES.map(({ tone, label, value, unit }) => ({
            label: tone,
            // w-64 (not the original w-56) — "Overspeeding events" needs the
            // extra width to avoid clipping against the tile's own edge.
            node: <KpiTile label={label} value={value} unit={unit} icon={TONE_ICONS[tone]} tone={tone} className="w-64" />,
          }))}
        />
      </DocSection>

      <DocSection id="content" title="Trend, description & no icon">
        <Prose>
          <Code>trend</Code> renders via <Code>TrendIndicator</Code> (direction/value/note);{' '}
          <Code>description</Code> is a plain helper line — both are optional and independent.
        </Prose>
        <Gallery
          minColRem={16}
          items={[
            {
              label: 'With trend',
              node: (
                <KpiTile
                  label="Fleet utilization"
                  value="76"
                  unit="%"
                  icon={Truck}
                  tone="primary"
                  trend={{ direction: 'up', value: '4%', note: 'vs last week' }}
                  className="w-64"
                />
              ),
            },
            {
              label: 'Trend + description',
              node: (
                <KpiTile
                  label="GPS signal loss"
                  value="34"
                  icon={ShieldAlert}
                  tone="warning"
                  trend={{ direction: 'down', value: '2%', note: 'vs last week' }}
                  description="AMC provider vs hardware — root cause pending"
                  className="w-72"
                />
              ),
            },
            {
              label: 'No icon',
              node: <KpiTile label="Open incidents" value="6" className="w-56" />,
            },
          ]}
        />
      </DocSection>

      <DocSection id="clickable" title="Clickable">
        <Prose>
          <Code>clickable</Code> makes the tile a keyboard-operable button (<Code>role="button"</Code>,
          Enter/Space activates <Code>onClick</Code>).
        </Prose>
        <ClickableTile />
      </DocSection>

      <DocSection id="badge-suffix" title="Badge, value suffix & target">
        <Prose>
          <Code>badge</Code> is a generic trailing chip at the end of the <em>value</em> row (a
          "Real Time" pill, a status <Code>Badge</Code>) — deliberately not on the label row, where
          it competed with the label for width and truncated real KPI names in a narrow column.{' '}
          <Code>valueSuffix</Code> is muted text after the value, and{' '}
          <Code>target</Code> expresses the <Code>stat-with-target</Code> shape — the actual read
          against the target it is measured by.
        </Prose>
        <Gallery
          minColRem={20}
          maxCols={3}
          items={[
            {
              label: 'badge',
              caption: 'trailing chip on the value row — the label keeps its full width',
              node: (
                <KpiTile
                  layout="stat"
                  label="Moving Assets"
                  value="52"
                  icon={Truck}
                  badge={<Badge variant="secondary">Real Time</Badge>}
                  className="w-full"
                />
              ),
            },
            {
              label: 'valueSuffix',
              caption: 'muted text after the value',
              node: (
                <KpiTile
                  label="Fleet Runway"
                  value="6.2 days"
                  icon={Truck}
                  valueSuffix="until critical at current consumption"
                  className="w-full"
                />
              ),
            },
            {
              label: 'target',
              caption: 'stat-with-target — "of 5,000 L"',
              node: (
                <KpiTile
                  label="Fleet Fuel Reserve"
                  value="3,500"
                  unit="L"
                  icon={Truck}
                  target="5,000 L"
                  className="w-full"
                />
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="tone-value" title="Tone tints the value, not just the badge">
        <Prose>
          A tile whose <Code>tone</Code> says &ldquo;this number is the bad one&rdquo; while the
          number renders in the same near-black as every other tile has moved the meaning into a
          20px chip the eye never reaches. Each tone inks the value from the DARK step of its ramp
          (<Code>--color-error-700</Code>, <Code>--color-success-scale-700</Code>, …), which clears
          4.5:1 on the card surface where the mid step does not. Leave <Code>tone</Code> off for a
          neutral tile.
        </Prose>
        <Gallery
          minColRem={14}
          items={(['primary', 'success', 'warning', 'danger', 'info', 'neutral'] as const).map((tone) => ({
            label: tone,
            caption: `tone="${tone}"`,
            node: <KpiTile label="Overspeeding events" value="219" tone={tone} icon={Truck} />,
          }))}
        />
        <Gallery
          minColRem={14}
          items={[
            {
              label: 'No tone',
              caption: 'value stays neutral',
              node: <KpiTile label="Total assets" value="156" icon={Truck} />,
            },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            { prop: 'label', type: 'ReactNode', required: true, description: 'Label above the value.' },
            {
              prop: 'value',
              type: 'ReactNode',
              required: true,
              description: 'The big value. Pre-formatted by the caller (e.g. "1,204", "7:45 hrs").',
            },
            { prop: 'unit', type: 'ReactNode', description: 'Optional unit suffix beside the value (e.g. "AED", "km").' },
            {
              prop: 'icon',
              type: 'LucideIcon',
              description: 'Leading icon, rendered in an IconBadge. Omit for a tile with no icon.',
            },
            {
              prop: 'tone',
              type: "'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'",
              description:
                'Semantic tint of the tile — drives BOTH the IconBadge and the VALUE ink (the dark ramp step per family, ≥4.5:1 on the card surface). OMIT it and the value stays neutral and the badge falls back to primary: an untinted tile must not acquire a hue just by having an icon.',
            },
            {
              prop: 'trend',
              type: '{ direction: "up" | "down" | "flat"; value: string; note?: string }',
              description: 'Directional delta, rendered via TrendIndicator. Omit for no trend row.',
            },
            { prop: 'description', type: 'ReactNode', description: 'Optional helper line below the value/trend row.' },
            {
              prop: 'badge',
              type: 'ReactNode',
              description: 'Trailing chip on the label row — a "Real Time" pill, a status Badge. A generic slot, never a per-use-case boolean.',
            },
            {
              prop: 'valueSuffix',
              type: 'ReactNode',
              description: 'Muted text after the value/unit, e.g. "peak Fri (6)". Pre-formatted by the caller.',
            },
            {
              prop: 'target',
              type: 'ReactNode',
              description: 'Target the value is measured against (the stat-with-target shape). Rendered muted after the value as "<targetLabel> <target>".',
            },
            {
              prop: 'targetLabel',
              type: 'ReactNode',
              default: "'of'",
              description: 'Word joining the value and target. Ignored without target.',
            },
            {
              prop: 'clickable',
              type: 'boolean',
              default: 'false',
              description: 'Makes the tile a keyboard-operable button (role="button", Enter/Space activates onClick).',
            },
            { prop: 'onClick', type: '() => void', description: 'Click handler. Only wired up when clickable is true.' },
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
            'Pre-format value and unit exactly as they should read — KpiTile does no numeric formatting.',
            'Choose trend.direction based on domain meaning, not the raw sign — a "down" GPS-loss count is still bad news.',
            'Use clickable only when the tile actually navigates or opens a drill-down.',
            'Keep description to one short helper line, not a second data point.',
          ]}
          donts={[
            'Don’t hardcode an icon colour — tone already carries the token.',
            'Don’t stack more than a label, value, unit, trend, and description in one tile.',
            'Don’t make a tile clickable without giving it an onClick — the affordance would lie.',
            'Don’t use KpiTile for a list of many small numbers — that is a table or a HealthStrip.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'clickable renders role="button" with a tabIndex and Enter/Space keyboard activation.',
            'Non-clickable tiles are plain, non-interactive containers — no implicit button semantics.',
            'Visible focus ring (focus-visible:ring) appears only when clickable is true.',
            'Meets WCAG 2.2 AA contrast in every tone across all tenants.',
            'Composes IconBadge and TrendIndicator, so their accessibility guarantees (decorative icon, colour-plus-text trend) carry through unchanged.',
            'Layout uses logical properties, so it mirrors correctly under RTL (switch the header language).',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
