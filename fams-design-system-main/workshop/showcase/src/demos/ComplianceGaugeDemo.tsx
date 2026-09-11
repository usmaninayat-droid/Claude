import { ComplianceGauge } from '@fams/ui-kit'
import { Demo } from '../showcase/kit'
import { DocPage, DocSection, Prose, Gallery, PropsTable, Guidelines, A11yList, Code } from '../docs'

/**
 * ComplianceGaugeDemo — the canonical "how compliant / how healthy" reading:
 * a segmented semi-circular arc, one continuous red→amber→green gradient,
 * and a triangular needle marker. Colors always come from semantic status
 * tokens; only the threshold split points (and, rarely, the segment count)
 * are caller-tunable.
 */
export default function ComplianceGaugeDemo() {
  return (
    <DocPage
      title="ComplianceGauge"
      badge="stable"
      summary="Semi-circular gauge: 3 gapped, rounded-cap arc segments sharing one continuous red→amber→green gradient, with a small triangular needle marking the current value. Callers tune only where the bands split — never the colors — keeping every compliance/health reading visually consistent."
    >
      <DocSection id="usage" title="Usage">
        <Prose>
          The value renders large and bold under the arc, with a smaller <Code>%</Code> suffix and — when{' '}
          <Code>label</Code> is given — a muted caption underneath it (e.g. "Overall Compliance").
        </Prose>
        <Demo
          title="Default thresholds"
          code={`import { ComplianceGauge } from '@fams/ui-kit'

<ComplianceGauge value={54} label="Overall Compliance" aria-label="Overall compliance: 54 percent, at-risk" />`}
        >
          <ComplianceGauge value={54} label="Overall Compliance" aria-label="Overall compliance: 54 percent, at-risk" />
        </Demo>
      </DocSection>

      <DocSection id="variants" title="Across the status ramp">
        <Gallery
          minColRem={16}
          items={[
            {
              label: 'On-track',
              caption: 'value=92, green end of the sweep',
              node: <ComplianceGauge value={92} label="Score" aria-label="Score: 92 percent, on-track" />,
            },
            {
              label: 'At-risk',
              caption: 'value=65, amber band',
              node: <ComplianceGauge value={65} label="Score" aria-label="Score: 65 percent, at-risk" />,
            },
            {
              label: 'Critical',
              caption: 'value=30, red end of the sweep',
              node: <ComplianceGauge value={30} label="Score" aria-label="Score: 30 percent, critical" />,
            },
            {
              label: 'Custom thresholds',
              caption: 'critical<=40, warning<=70',
              node: (
                <ComplianceGauge
                  value={55}
                  criticalThreshold={40}
                  warningThreshold={70}
                  label="Score"
                  aria-label="Score: 55 percent, at-risk with custom thresholds"
                />
              ),
            },
            {
              label: 'No needle',
              caption: 'showNeedle={false}',
              node: <ComplianceGauge value={78} showNeedle={false} label="Score" aria-label="Score: 78 percent, on-track" />,
            },
            {
              label: 'Finer ramp',
              caption: 'segments={5}, evenly spaced',
              node: <ComplianceGauge value={54} segments={5} label="Score" aria-label="Score: 54 percent, at-risk" />,
            },
          ]}
        />
      </DocSection>

      <DocSection id="sizes" title="Sizes">
        <Gallery
          minColRem={14}
          items={[
            { label: 'sm', node: <ComplianceGauge value={54} size="sm" aria-label="Score: 54 percent" /> },
            { label: 'md', node: <ComplianceGauge value={54} size="md" aria-label="Score: 54 percent" /> },
            { label: 'lg', node: <ComplianceGauge value={54} size="lg" aria-label="Score: 54 percent" /> },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            { prop: 'value', type: 'number', description: 'Current reading. Clamped to [min, max].' },
            { prop: 'min', type: 'number', default: '0', description: 'Range minimum.' },
            { prop: 'max', type: 'number', default: '100', description: 'Range maximum.' },
            { prop: 'unit', type: 'string', default: "'%'", description: 'Suffix rendered smaller beside the value.' },
            { prop: 'label', type: 'ReactNode', description: 'Muted caption directly under the value, e.g. "Overall Compliance".' },
            {
              prop: 'criticalThreshold',
              type: 'number',
              default: '50',
              description: 'Percent of [min, max] at or below which the reading renders in the critical (red) band.',
            },
            {
              prop: 'warningThreshold',
              type: 'number',
              default: '80',
              description: 'Percent at or below which the reading renders at-risk (amber), above criticalThreshold. Above this is on-track (green).',
            },
            {
              prop: 'segments',
              type: 'number',
              default: '3',
              description: 'Number of gap-separated arc segments. At 3 (the default) the boundaries are criticalThreshold/warningThreshold; any other count evenly spaces the bands. All segments share one continuous gradient regardless of count.',
            },
            { prop: 'showNeedle', type: 'boolean', default: 'true', description: 'Shows the triangular needle marker riding the arc at the current value.' },
            { prop: 'size', type: "'sm' | 'md' | 'lg'", default: "'md'", description: 'Visual scale.' },
            { prop: 'loading', type: 'boolean', default: 'false', description: 'Shows a skeleton placeholder instead of the arc.' },
            { prop: 'height', type: 'number | string', description: 'Fixed total container height, overriding the natural size-driven layout.' },
            { prop: 'centerContent', type: 'ReactNode', description: 'Replaces the built-in value/unit/label stack under the arc.' },
            { prop: 'caption', type: 'ReactNode', description: 'Rendered below everything else — state band thresholds in words here, so a band is never encoded by colour alone.' },
            { prop: 'aria-label', type: 'string', description: 'Required. Applied as the accessible name of the role="img" wrapper.' },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Use ComplianceGauge for any "how compliant / how healthy" reading — it keeps the red/amber/green vocabulary and the segmented-arc anatomy consistent app-wide.',
            'Tune only criticalThreshold/warningThreshold (and, rarely, segments) — never override the band colors.',
          ]}
          donts={[
            "Don't hand-draw an arc or reach for a raw radial-progress primitive for a compliance/health percentage — that's exactly what this component exists to standardize.",
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Required aria-label should state both the value and its status band in words, e.g. "Score: 65 percent, at-risk".',
            'Band colors come from semantic status tokens tuned for contrast across every tenant.',
            'The needle rotation transition is skipped when the OS reduced-motion preference is set.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
