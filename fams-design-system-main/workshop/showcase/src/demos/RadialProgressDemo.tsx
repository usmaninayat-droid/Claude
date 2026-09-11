import { RadialProgress } from '@fams/ui-kit'
import { DocPage, DocSection, Prose, Gallery, Playground, PropsTable, Guidelines, A11yList, Code } from '../docs'

const TONES = ['primary', 'success', 'warning', 'danger', 'neutral'] as const

type RadialProgressControls = {
  value: string
  tone: (typeof TONES)[number] | 'auto'
  hideLabel: boolean
}

export default function RadialProgressDemo() {
  return (
    <DocPage
      title="Radial Progress"
      badge="stable"
      summary="Single-value circular progress ring. Inline SVG, no charting engine — for scores, coverage %, and completion states. Retires the byte-similar SemiPieChart.vue ApexCharts radialBar hand-built per-package (driver safety score, fuel level ring)."
    >
      <DocSection id="playground" title="Playground">
        <Playground<RadialProgressControls>
          controls={[
            { name: 'value', type: 'text', default: '72' },
            { name: 'tone', type: 'select', default: 'auto', options: ['auto', ...TONES] },
            { name: 'hideLabel', type: 'boolean', default: false },
          ]}
        >
          {(v) => (
            <RadialProgress
              value={Number(v.value) || 0}
              tone={v.tone === 'auto' ? undefined : v.tone}
              hideLabel={v.hideLabel}
              size={64}
              strokeWidth={6}
            />
          )}
        </Playground>
      </DocSection>

      <DocSection id="sizes" title="Sizes">
        <Prose>
          <Code>size</Code> in px (default 40); pair a larger <Code>strokeWidth</Code> with a larger ring.
        </Prose>
        <Gallery
          minColRem={9}
          items={[
            { label: 'size 24', node: <RadialProgress value={72} size={24} strokeWidth={3} /> },
            { label: 'size 40', caption: 'default', node: <RadialProgress value={72} size={40} strokeWidth={4} /> },
            { label: 'size 64', node: <RadialProgress value={72} size={64} strokeWidth={6} /> },
          ]}
        />
      </DocSection>

      <DocSection id="tones" title="Tones">
        <Prose>An explicit tone overrides the auto threshold.</Prose>
        <Gallery
          minColRem={9}
          items={TONES.map((tone) => ({
            label: tone,
            node: <RadialProgress value={72} tone={tone} />,
          }))}
        />
      </DocSection>

      <DocSection id="auto-threshold" title="Auto threshold">
        <Prose>
          <Code>tone</Code> omitted → resolved from <Code>value</Code>: <Code>&lt;40</Code> danger,{' '}
          <Code>40-79</Code> warning, <Code>&gt;=80</Code> success.
        </Prose>
        <Gallery
          minColRem={9}
          items={[
            { label: '18%', caption: 'danger', node: <RadialProgress value={18} /> },
            { label: '55%', caption: 'warning', node: <RadialProgress value={55} /> },
            { label: '94%', caption: 'success', node: <RadialProgress value={94} /> },
          ]}
        />
      </DocSection>

      <DocSection id="states" title="States">
        <Prose>0%, mid, 100%, and a bare ring (hideLabel) for dense table cells.</Prose>
        <Gallery
          minColRem={9}
          items={[
            { label: 'empty', node: <RadialProgress value={0} /> },
            { label: 'mid', node: <RadialProgress value={50} /> },
            { label: 'complete', node: <RadialProgress value={100} tone="success" /> },
            {
              label: 'hideLabel',
              caption: 'table cell',
              node: <RadialProgress value={64} size={28} strokeWidth={3} hideLabel />,
            },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            {
              prop: 'value',
              type: 'number',
              required: true,
              description: 'Progress value, 0-100. Out-of-range values are clamped.',
            },
            {
              prop: 'size',
              type: 'number',
              default: '40',
              description: 'Ring diameter in px (square).',
            },
            {
              prop: 'strokeWidth',
              type: 'number',
              default: '4',
              description: 'Ring stroke width in px.',
            },
            {
              prop: 'tone',
              type: "'primary' | 'success' | 'warning' | 'danger' | 'neutral'",
              description:
                'Status color. Omit to auto-resolve from value (<40 danger, 40-79 warning, >=80 success). An explicit tone always wins.',
            },
            {
              prop: 'hideLabel',
              type: 'boolean',
              default: 'false',
              description: 'Hide the centered percentage label; the ring itself still renders.',
            },
            {
              prop: '…props',
              type: "Omit<HTMLAttributes<HTMLDivElement>, 'color' | 'children'>",
              description: 'className and every native div attribute (except color/children) pass through.',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Use for a single score or coverage % — safety score, fuel level, contract compliance.',
            'Let tone auto-resolve from value unless the domain has its own thresholds.',
            'Use hideLabel + a small size inside dense table cells; keep the label everywhere else.',
            'Scale strokeWidth with size so the ring doesn’t look too thin or too heavy.',
          ]}
          donts={[
            'Don’t use this as a multi-series donut chart — it is single-value only, use a charting engine instead.',
            'Don’t override the arc colour with raw hex; use tone.',
            'Don’t place text over the ring beyond the built-in centered label.',
            'Don’t animate value with unclamped or out-of-order updates — clamping only applies per render.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Wrapped in Radix Progress.Root — exposes role="progressbar" plus aria-valuemin/max/now/text.',
            'The SVG is aria-hidden; the accessible value comes from the Radix wrapper, not the visual arc.',
            'Centered label is aria-hidden text (decorative reinforcement) — pass aria-label on the root for a custom accessible name.',
            'Meets WCAG 2.2 AA contrast for every tone against the track in all tenant themes.',
            'Ring geometry is direction-agnostic — it renders identically under RTL (switch the header language).',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
