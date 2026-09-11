import { useState } from 'react'
import { Slider, type SliderValue } from '@fams/ui-kit'
import { DocPage, DocSection, Prose, Gallery, Playground, PropsTable, Guidelines, A11yList, Code } from '../docs'

type SliderControls = {
  mode: 'single' | 'range'
  showLabel: boolean
  disabled: boolean
}

/**
 * SliderDemo — standard component-page template for the Slider primitive.
 * Replaces q-slider (22 usages) — a single number renders one thumb (bin
 * fill level, load target); a [start, end] tuple switches to range mode
 * (two thumbs) with no other change to the API.
 */
export default function SliderDemo() {
  const [single, setSingle] = useState(40)
  const [range, setRange] = useState<[number, number]>([20, 70])

  return (
    <DocPage
      title="Slider"
      badge="stable"
      summary="Draggable/keyboard-operable value picker built on Radix Slider. A plain number renders a single thumb; a [start, end] tuple switches to range mode (two thumbs) — nothing else changes. Replaces q-slider (22 usages) across single numeric inputs (bin fill level, vehicle load target) and playback scrubbers."
    >
      <DocSection id="playground" title="Playground">
        <Playground<SliderControls>
          controls={[
            { name: 'mode', type: 'select', default: 'single', options: ['single', 'range'] },
            { name: 'showLabel', type: 'boolean', default: true },
            { name: 'disabled', type: 'boolean', default: false },
          ]}
        >
          {(v) => (
            <div className="w-72">
              {v.mode === 'single' ? (
                <Slider
                  value={single}
                  onValueChange={(val: SliderValue) => setSingle(val as number)}
                  disabled={v.disabled}
                  formatLabel={v.showLabel ? (n) => `${n}%` : undefined}
                  aria-label="Fill level"
                />
              ) : (
                <Slider
                  value={range}
                  onValueChange={(val: SliderValue) => setRange(val as [number, number])}
                  disabled={v.disabled}
                  formatLabel={v.showLabel ? (n) => `${n}%` : undefined}
                  aria-label="Capacity range"
                />
              )}
            </div>
          )}
        </Playground>
      </DocSection>

      <DocSection id="modes" title="Single vs. range">
        <Prose>
          A plain <Code>number</Code> value renders one thumb; a <Code>[start, end]</Code> tuple renders
          two. The same primitive covers both the v5 single numeric input (bin fill level, vehicle load
          target) and a range-style input — the caller just changes the shape of{' '}
          <Code>value</Code>/<Code>defaultValue</Code>.
        </Prose>
        <Gallery
          minColRem={16}
          items={[
            {
              label: 'Single value',
              node: (
                <div className="w-56">
                  <Slider defaultValue={35} aria-label="Bin fill level" />
                </div>
              ),
            },
            {
              label: 'Range (two thumbs)',
              node: (
                <div className="w-56">
                  <Slider defaultValue={[25, 75]} aria-label="Target load range" />
                </div>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="labels" title="Labels and helper text">
        <Prose>
          <Code>formatLabel</Code> renders an always-visible label above each thumb — omit it for a bare
          track + thumb with no label.
        </Prose>
        <Gallery
          minColRem={16}
          items={[
            {
              label: 'formatLabel',
              caption: 'label follows the thumb',
              node: (
                <div className="w-56">
                  <Slider defaultValue={62} formatLabel={(v) => `${v}%`} aria-label="Vehicle load target" />
                </div>
              ),
            },
            {
              label: 'With helper text',
              node: (
                <div className="flex w-56 flex-col gap-2">
                  <span className="text-body-sm text-foreground">Target load</span>
                  <Slider defaultValue={50} formatLabel={(v) => `${v}%`} aria-label="Target load" />
                  <span className="text-xs text-muted-foreground">Alerts fire above this threshold</span>
                </div>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="states" title="Sizes and states">
        <Gallery
          minColRem={11}
          items={[
            {
              label: 'sm',
              node: (
                <div className="w-40">
                  <Slider defaultValue={40} size="sm" aria-label="Small slider" />
                </div>
              ),
            },
            {
              label: 'md (default)',
              node: (
                <div className="w-40">
                  <Slider defaultValue={40} size="md" aria-label="Medium slider" />
                </div>
              ),
            },
            {
              label: 'lg',
              node: (
                <div className="w-40">
                  <Slider defaultValue={40} size="lg" aria-label="Large slider" />
                </div>
              ),
            },
            {
              label: 'disabled',
              node: (
                <div className="w-40">
                  <Slider defaultValue={40} disabled aria-label="Disabled slider" />
                </div>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            {
              prop: 'value',
              type: 'number | [number, number]',
              description: 'Controlled value. A number renders a single thumb; a tuple renders two (range mode).',
            },
            {
              prop: 'defaultValue',
              type: 'number | [number, number]',
              description: 'Initial value for uncontrolled use — same shape rules as value.',
            },
            {
              prop: 'onValueChange',
              type: '(value: number | [number, number]) => void',
              description: 'Fires on every thumb move. Payload shape mirrors value/defaultValue.',
            },
            { prop: 'min', type: 'number', default: '0', description: 'Lower bound.' },
            { prop: 'max', type: 'number', default: '100', description: 'Upper bound.' },
            { prop: 'step', type: 'number', default: '1', description: 'Increment per step.' },
            { prop: 'size', type: "'sm' | 'md' | 'lg'", default: "'md'", description: 'Track and thumb scale.' },
            { prop: 'disabled', type: 'boolean', default: 'false', description: 'Disables all thumbs.' },
            {
              prop: 'isDisabled',
              type: 'boolean',
              default: 'false',
              description: 'Deprecated alias of disabled, kept for back-compat.',
            },
            {
              prop: 'formatLabel',
              type: '(value: number) => string',
              description: 'Formats the always-visible label above each thumb. Omit for a bare track + thumb(s).',
            },
            {
              prop: '…props',
              type: 'ComponentPropsWithoutRef<typeof RadixSlider.Root>',
              description: 'Native Radix Slider Root attributes (name, aria-label…) pass through.',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Use a plain number for any single numeric input — fill level, load target, threshold.',
            'Switch to a [start, end] tuple only when the input is genuinely a range, not two independent sliders.',
            'Pass formatLabel whenever the raw 0-100 number needs a unit or format (%, km, timestamp).',
            'Always supply an aria-label or associate a visible Label — the thumb carries no text of its own.',
          ]}
          donts={[
            'Don\'t render two separate Slider instances to fake a range — use the tuple value/onValueChange shape instead.',
            'Don\'t rely on the thumb label being visible unless formatLabel is passed — it renders nothing otherwise.',
            'Don\'t use Slider for a small fixed set of discrete choices — use RadioGroup or a segmented control.',
            'Don\'t forget disabled has no separate "readonly" variant — it is the only non-interactive state.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Built on Radix Slider — role="slider", aria-valuenow/min/max, and keyboard (arrow/page/home/end) come from Radix itself.',
            'Fully keyboard-operable: Tab to focus a thumb, arrow keys to nudge by step, Page Up/Down for larger jumps, Home/End for the bounds.',
            'Visible focus ring via the ring token on the active thumb.',
            'Standalone usage (no visible Label) requires an explicit aria-label on each instance.',
            'Thumb positioning is RTL-aware — drag direction and layout mirror correctly under dir="rtl".',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
