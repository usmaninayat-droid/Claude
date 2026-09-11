import { useState } from 'react'
import { Label } from '@fams/ui-kit'
import { RadioGroup, RadioGroupItem } from '../../../../packages/ui-kit/src/primitives/RadioGroup'
import { DocPage, DocSection, Prose, Gallery, Playground, PropsTable, Guidelines, A11yList, Code } from '../docs'

/**
 * RadioGroupDemo — exclusive single-choice control, dot-in-circle treatment,
 * built on Radix RadioGroup. Consolidates ~11 raw `q-radio` / `q-option-group`
 * uses in v5 (ReportAssetList, RecurrenceInput, SelectVehicleStep,
 * AssetSelectorDrawer, DatePicker).
 */

type RadioGroupControls = {
  disabled: boolean
}

export default function RadioGroupDemo() {
  const [lot, setLot] = useState('lot-1')

  return (
    <DocPage
      title="RadioGroup"
      badge="stable"
      summary="Exclusive single-choice control — dot-in-circle treatment, built on Radix RadioGroup. Consolidates ~11 raw q-radio / q-option-group uses across v5 (ReportAssetList, RecurrenceInput, SelectVehicleStep, AssetSelectorDrawer, DatePicker)."
    >
      <DocSection id="playground" title="Playground">
        <Playground<RadioGroupControls>
          controls={[{ name: 'disabled', type: 'boolean', default: false }]}
        >
          {(v) => (
            <RadioGroup value={lot} onValueChange={setLot} disabled={v.disabled} className="gap-3">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="lot-1" id="pg-lot-1" />
                <Label htmlFor="pg-lot-1">Lot 1 — Lavajet</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="lot-2" id="pg-lot-2" />
                <Label htmlFor="pg-lot-2">Lot 2 — Lavajet</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="lot-7" id="pg-lot-7" />
                <Label htmlFor="pg-lot-7">Lot 7 — Alphamed</Label>
              </div>
            </RadioGroup>
          )}
        </Playground>
      </DocSection>

      <DocSection id="states" title="States">
        <Prose>
          Item-level <Code>disabled</Code> greys a single option; group-level <Code>disabled</Code> on{' '}
          <Code>RadioGroup</Code> locks the whole set — used when the contract stage forbids any change.
        </Prose>
        <Gallery
          minColRem={13}
          items={[
            {
              label: 'checked',
              node: (
                <RadioGroup defaultValue="lot-1" className="gap-3">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="lot-1" id="g-checked" />
                    <Label htmlFor="g-checked">Lot 1 — Lavajet</Label>
                  </div>
                </RadioGroup>
              ),
            },
            {
              label: 'unchecked',
              node: (
                <RadioGroup className="gap-3">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="lot-2" id="g-unchecked" />
                    <Label htmlFor="g-unchecked">Lot 2 — Lavajet</Label>
                  </div>
                </RadioGroup>
              ),
            },
            {
              label: 'disabled item',
              node: (
                <RadioGroup defaultValue="lot-1" className="gap-3">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="lot-7" id="g-disabled-item" disabled />
                    <Label htmlFor="g-disabled-item">Lot 7 — Alphamed (unavailable)</Label>
                  </div>
                </RadioGroup>
              ),
            },
            {
              label: 'disabled group',
              node: (
                <RadioGroup defaultValue="lot-1" disabled className="gap-3">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="lot-1" id="g-disabled-group" />
                    <Label htmlFor="g-disabled-group">Lot 1 (group disabled)</Label>
                  </div>
                </RadioGroup>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <Prose>
          <Code>RadioGroup</Code> (root) and <Code>RadioGroupItem</Code> both pass through their full Radix
          prop set — the table below covers the ones used in practice.
        </Prose>
        <PropsTable
          rows={[
            {
              prop: 'value',
              type: 'string',
              description: 'RadioGroup (root). Controlled selected value.',
            },
            {
              prop: 'defaultValue',
              type: 'string',
              description: 'RadioGroup (root). Uncontrolled initial value.',
            },
            {
              prop: 'onValueChange',
              type: '(value: string) => void',
              description: 'RadioGroup (root). Fires when the selection changes.',
            },
            {
              prop: 'disabled',
              type: 'boolean',
              default: 'false',
              description: 'RadioGroup (root) or RadioGroupItem. Locks the whole group or a single option.',
            },
            {
              prop: 'value',
              type: 'string',
              required: true,
              description: 'RadioGroupItem. The value this option represents.',
            },
            {
              prop: 'id',
              type: 'string',
              description: 'RadioGroupItem. Pair with an adjacent Label via htmlFor.',
            },
            {
              prop: '…props',
              type: 'ComponentPropsWithoutRef<typeof RadixRadioGroup.Root | Item>',
              description: 'Native Radix RadioGroup attributes (name, required, orientation…) pass through.',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Always pair each item with a Label via htmlFor for a clickable target.',
            'Use for exclusive single-choice sets of 2–6 options in view at once.',
            'Disable individual items to show an option exists but is currently unavailable.',
            'Reach for Select instead once the option list grows long enough to need scrolling.',
          ]}
          donts={[
            'Don’t use RadioGroup for multi-select — that’s Checkbox.',
            'Don’t omit a default selection when one option is clearly the common case.',
            'Don’t nest interactive controls inside the item label.',
            'Don’t rely on the dot color alone — the label text carries the selected state.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Built on Radix RadioGroup — implements the WAI-ARIA radio group pattern with roving tabindex.',
            'Arrow keys move selection between items; Tab moves focus in/out of the group as one stop.',
            'Visible focus ring via the ring token on the focused item.',
            'Disabled items are excluded from arrow-key navigation and keyboard activation.',
            'Layout uses logical properties, so it mirrors correctly under RTL (switch the header language).',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
