import { StatBar } from '../../../../packages/ui-kit/src/composites/StatBar'
import type { SegmentedBarSegment } from '../../../../packages/ui-kit/src/composites/SegmentedBar'
import {
  DocPage,
  DocSection,
  Prose,
  Gallery,
  Playground,
  PropsTable,
  Guidelines,
  A11yList,
  Code,
} from '../docs'

/**
 * StatBarDemo — the labelled-bar shell covering the design board's "Battery
 * Widget" (segmented) and "Progress" (single filled bar) widgets, plus the
 * compact in-table form the ranked tables embed per row.
 */
const PACK_SEGMENTS: SegmentedBarSegment[] = [
  { id: 'pack-a', label: 'Pack A', value: 46, colorIndex: 1 },
  { id: 'pack-b', label: 'Pack B', value: 32, colorIndex: 2 },
  { id: 'pack-c', label: 'Pack C', value: 22, colorIndex: 3 },
]

const TONES = ['primary', 'success', 'warning', 'danger'] as const
const SIZES = ['sm', 'md', 'lg'] as const

type StatBarControls = {
  tone: (typeof TONES)[number]
  size: (typeof SIZES)[number]
  showPercent: boolean
  compact: boolean
  segmented: boolean
}

export default function StatBarDemo() {
  return (
    <DocPage
      title="StatBar"
      badge="stable"
      summary="A labelled bar: caption row (label + optional info tooltip, trailing value) above the bar, with an optional trailing figure beside it. Owns only the chrome — the bar itself is Progress (single fill) or SegmentedBar (categorical), never re-implemented here. compact collapses it to one line so the same component works as a table cell."
    >
      <DocSection id="playground" title="Playground">
        <Playground<StatBarControls>
          controls={[
            { name: 'tone', type: 'select', default: 'primary', options: TONES },
            { name: 'size', type: 'select', default: 'md', options: SIZES },
            { name: 'showPercent', type: 'boolean', default: true },
            { name: 'compact', type: 'boolean', default: false },
            { name: 'segmented', type: 'boolean', default: false },
          ]}
        >
          {(v) => (
            <div className="w-full max-w-md">
              <StatBar
                label="Fleet fuel reserve"
                info="Litres available across every tank in the fleet."
                value="3,500 L of 5,000 L"
                percent={70}
                tone={v.tone}
                size={v.size}
                showPercent={v.showPercent}
                compact={v.compact}
                segments={v.segmented ? PACK_SEGMENTS : undefined}
                aria-label="Fleet fuel reserve"
              />
            </div>
          )}
        </Playground>
      </DocSection>

      <DocSection id="forms" title="Forms">
        <Prose>
          Two bar shapes, one shell. <Code>percent</Code> renders a single filled bar;{' '}
          <Code>segments</Code> renders a categorical breakdown and takes precedence.
        </Prose>
        <Gallery
          layout="rows"
          items={[
            {
              label: 'Progress',
              caption: 'label + info, trailing value, trailing %',
              node: (
                <StatBar
                  label="Monthly target"
                  info="Share of this month's plan completed."
                  value="62 of 100"
                  percent={62}
                  showPercent
                />
              ),
            },
            {
              label: 'Battery',
              caption: 'segmented, no trailing figure',
              node: <StatBar label="Battery" value="78%" segments={PACK_SEGMENTS} aria-label="Battery" />,
            },
            {
              label: 'Compact (table cell)',
              caption: 'single line — bar + value',
              node: <StatBar percent={38} value="18.7" tone="danger" compact aria-label="Efficiency" />,
            },
          ]}
        />
      </DocSection>

      <DocSection id="tones" title="Tones">
        <Prose>
          Tone is threshold-driven by the <em>caller</em> — pass the tone your documented threshold
          produced. The bar never decides &ldquo;good vs bad&rdquo;.
        </Prose>
        <Gallery
          minColRem={14}
          items={TONES.map((tone) => ({
            label: tone,
            node: (
              <StatBar
                label={tone}
                percent={tone === 'danger' ? 22 : tone === 'warning' ? 48 : 76}
                tone={tone}
                showPercent
                className="w-full"
              />
            ),
          }))}
        />
      </DocSection>

      <DocSection id="sizes" title="Sizes">
        <Gallery
          minColRem={14}
          items={SIZES.map((size) => ({
            label: size,
            node: <StatBar label={`Track ${size}`} percent={64} size={size} className="w-full" />,
          }))}
        />
      </DocSection>

      <DocSection id="states" title="States">
        <Gallery
          minColRem={20}
          maxCols={2}
          items={[
            { label: 'Empty', caption: 'percent 0', node: <StatBar label="Not started" percent={0} showPercent className="w-full" /> },
            { label: 'Full', caption: 'percent 100', node: <StatBar label="Complete" percent={100} showPercent className="w-full" /> },
            {
              label: 'No data',
              caption: 'segments [] → muted track',
              node: <StatBar label="Battery" segments={[]} aria-label="Battery" className="w-full" />,
            },
            {
              label: 'Bar only',
              caption: 'no label, no value',
              node: <StatBar percent={44} aria-label="Utilisation" className="w-full" />,
            },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            { prop: 'label', type: 'ReactNode', description: 'Caption above the bar. Rendered inline when compact.' },
            { prop: 'info', type: 'ReactNode', description: 'Content of a tooltip behind an info glyph beside the label. Omit for no info affordance.' },
            { prop: 'value', type: 'ReactNode', description: 'Trailing text of the caption row, e.g. "3,500 L of 5,000 L".' },
            { prop: 'percent', type: 'number', default: '0', description: 'Single filled bar, 0–100 (clamped). Ignored when segments is given.' },
            { prop: 'segments', type: 'SegmentedBarSegment[]', description: 'Categorical breakdown — delegates to SegmentedBar. Takes precedence over percent.' },
            { prop: 'tone', type: "'primary' | 'success' | 'warning' | 'danger'", default: "'primary'", description: 'Fill tone of the single bar. Threshold-driven by the caller.' },
            { prop: 'size', type: "'sm' | 'md' | 'lg'", default: "'md'", description: 'Track height only.' },
            { prop: 'showPercent', type: 'boolean', default: 'false', description: 'Renders the rounded percent as a trailing figure after the bar.' },
            { prop: 'trailing', type: 'ReactNode', description: 'Arbitrary trailing content after the bar. Wins over showPercent.' },
            { prop: 'compact', type: 'boolean', default: 'false', description: 'Single-line table-cell form: no caption row, label/value inline with the bar.' },
            {
              prop: 'decorative',
              type: 'boolean',
              default: 'false',
              description:
                'Marks the BAR aria-hidden, for the case where value already states the reading AND its threshold band in words — so the band is never encoded by colour alone, and the bar does not repeat a number the text carries.',
            },
            { prop: 'aria-label', type: 'string', description: 'Accessible name for the bar.' },
            { prop: '…props', type: 'HTMLAttributes<HTMLDivElement>', description: 'className and any native div attribute pass through.' },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Always show the number beside the bar — the fill is reinforcement, the value carries the meaning.',
            'Derive tone from a documented threshold and pass it in; keep the threshold in the consuming app.',
            'Use compact inside table cells so a row stays one line tall.',
            'Use segments when the bar is a breakdown of one whole, percent when it is one value against a maximum.',
          ]}
          donts={[
            "Don't re-implement the bar — this shell delegates to Progress and SegmentedBar on purpose.",
            "Don't encode status with tone alone; pair it with the value or a label.",
            "Don't pass both percent and segments expecting a blend — segments wins.",
            "Don't put a sentence in value; it is a figure, not a description (use info for explanation).",
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'The single bar is a real progressbar with aria-valuenow/min/max; the segmented bar exposes one labelled button per segment.',
            'The info affordance is a button with a 44×44 transparent hit area, shown on hover AND focus, dismissed with Escape.',
            'Colour is never the only encoding — the value text and, optionally, the trailing percent state the number.',
            'Layout is flex + logical spacing only, so the caption row and bar mirror correctly under RTL.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
