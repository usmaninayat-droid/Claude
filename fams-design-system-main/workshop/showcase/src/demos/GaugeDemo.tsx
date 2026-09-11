import { Gauge, type GaugeSector } from '@fams/ui-kit'
import { Demo } from '../showcase/kit'
import { DocPage, DocSection, Prose, Gallery, PropsTable, Guidelines, A11yList, Code } from '../docs'

const CUSTOM_SECTORS: GaugeSector[] = [
  { to: 40, color: '#f04438' },
  { to: 75, color: '#f79009' },
  { to: 100, color: '#12b76a' },
]

/**
 * GaugeDemo — semi-circular radial gauge with colored range bands. Always
 * renders bands (a default four-band ramp when none are supplied).
 */
export default function GaugeDemo() {
  return (
    <DocPage
      title="Gauge"
      badge="stable"
      summary="Semi-circular radial gauge with colored range bands and a needle, on ECharts. Bands ramp from a default four-color scale unless sectors is supplied."
    >
      <DocSection id="usage" title="Usage">
        <Prose>
          <Code>value</Code> is clamped to <Code>[min, max]</Code>. Bands (<Code>sectors</Code>)
          are magnitude ramps — pass a literal color per band, not a categorical{' '}
          <Code>colorIndex</Code>.
        </Prose>
        <Demo
          title="Default bands"
          code={`import { Gauge } from '@fams/ui-kit'

<Gauge value={72} unit="%" label="Utilization" aria-label="Utilization: 72 percent" />`}
        >
          <Gauge value={72} unit="%" label="Utilization" aria-label="Utilization: 72 percent" />
        </Demo>
      </DocSection>

      <DocSection id="variants" title="Sizes, custom bands & no needle">
        <Gallery
          minColRem={14}
          items={[
            { label: 'sm', node: <Gauge value={54} size="sm" unit="%" aria-label="Reading: 54 percent, small" /> },
            {
              label: 'md',
              caption: 'default',
              node: <Gauge value={54} size="md" unit="%" aria-label="Reading: 54 percent, medium" />,
            },
            { label: 'lg', node: <Gauge value={54} size="lg" unit="%" aria-label="Reading: 54 percent, large" /> },
            {
              label: 'Custom sectors',
              caption: '3-band ramp',
              node: (
                <Gauge
                  value={82}
                  unit="%"
                  sectors={CUSTOM_SECTORS}
                  label="Score"
                  aria-label="Score: 82 percent, on-track"
                />
              ),
            },
            {
              label: 'No needle',
              caption: 'showNeedle={false}',
              node: (
                <Gauge value={45} unit="%" showNeedle={false} label="Fuel" aria-label="Fuel: 45 percent" />
              ),
            },
            {
              label: 'Custom range',
              caption: 'min=0 max=200',
              node: <Gauge value={140} min={0} max={200} unit=" km/h" aria-label="Speed: 140 km/h" />,
            },
          ]}
        />
      </DocSection>

      <DocSection id="center-caption" title="Centre slot & caption">
        <Prose>
          ECharts&apos; own gauge value/label are plain canvas text.{' '}
          <Code>centerContent</Code> replaces them with real React — a composed KPI stack, a unit on
          its own line, a trend chip — and suppresses the canvas text so the two cannot overlap.{' '}
          <Code>caption</Code> renders under the arc: the place to state the band thresholds in
          words, so a band is never encoded by colour alone.
        </Prose>
        <Gallery
          minColRem={16}
          items={[
            {
              label: 'Composed centre',
              caption: 'centerContent',
              node: (
                <Gauge
                  value={81}
                  sectors={CUSTOM_SECTORS}
                  aria-label="Fleet safety score 81 out of 100 — good"
                  centerContent={
                    <>
                      <span className="text-heading-lg font-semibold text-foreground">81</span>
                      <span className="text-caption text-muted-foreground">pts</span>
                    </>
                  }
                />
              ),
            },
            {
              label: 'Caption under the arc',
              caption: 'caption',
              node: (
                <Gauge
                  value={81}
                  unit="%"
                  sectors={CUSTOM_SECTORS}
                  caption="0–40 critical · 41–75 at risk · 76–100 good"
                  aria-label="Fuel efficiency score 81 out of 100 — good"
                />
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            { prop: 'value', type: 'number', required: true, description: 'Current reading. Clamped to [min, max].' },
            { prop: 'min', type: 'number', default: '0', description: 'Range minimum.' },
            { prop: 'max', type: 'number', default: '100', description: 'Range maximum.' },
            { prop: 'unit', type: 'string', default: "''", description: "Suffix appended to the rounded value, e.g. '%'." },
            { prop: 'label', type: 'string', description: 'Sub-label rendered under the value. Plain text only.' },
            {
              prop: 'sectors',
              type: 'GaugeSector[]',
              description: 'Color bands: { to, color }. Defaults to a four-band token ramp.',
            },
            { prop: 'showNeedle', type: 'boolean', default: 'true', description: 'Shows the needle and its pivot anchor.' },
            { prop: 'size', type: "'sm' | 'md' | 'lg'", default: "'md'", description: 'Visual scale — also drives the default container height.' },
            { prop: 'loading', type: 'boolean', default: 'false', description: 'Shows the ChartContainer loading overlay.' },
            {
              prop: 'centerContent',
              type: 'ReactNode',
              description:
                "Replaces the built-in value/label stack drawn in the arc's centre. Suppresses ECharts' own detail/title text so the two never overlap.",
            },
            {
              prop: 'caption',
              type: 'ReactNode',
              description:
                'Caption rendered below the arc — the place to state the band thresholds in text.',
            },
            {
              prop: 'aria-label',
              type: 'string',
              required: true,
              description: 'Required accessible description, e.g. "Fuel level: 81 percent".',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Use the default four-band ramp for a generic "how good is this reading" gauge.',
            'Supply custom sectors when the domain has meaningful, non-default thresholds.',
            'Reach for ComplianceGauge instead when the reading is specifically a red/amber/green status.',
          ]}
          donts={[
            "Don't pass a categorical colorIndex here — sectors take literal colors, a different vocabulary.",
            "Don't omit label when the gauge appears without other surrounding context.",
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Required aria-label should describe the metric and its current value in words, not just a number.',
            'Needle, anchor, and value text auto-color to match whichever band currently contains the value.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
