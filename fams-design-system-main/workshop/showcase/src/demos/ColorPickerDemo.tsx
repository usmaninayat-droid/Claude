import { useState } from 'react'
import { ColorPicker } from '@fams/ui-kit'
import { DocPage, DocSection, Prose, Gallery, Playground, PropsTable, Guidelines, A11yList, Code } from '../docs'

const CATEGORY_PRESETS = ['#0072e0', '#12b76a', '#f79009', '#f04438', '#7a5af8']

type ColorPickerControls = {
  size: 'sm' | 'md' | 'lg'
  withPresets: boolean
  disabled: boolean
}

/**
 * ColorPickerDemo — standard component-page template for the ColorPicker
 * primitive. Consolidates the "avatar swatch + q-popup-proxy + q-color"
 * pattern re-implemented per feature (Appearance, Notifications, Tags
 * settings) with a different hardcoded palette each time.
 */
export default function ColorPickerDemo() {
  const [playgroundColor, setPlaygroundColor] = useState('#0072e0')
  const [categoryColor, setCategoryColor] = useState('#12b76a')
  const [freeColor, setFreeColor] = useState('#f79009')

  return (
    <DocPage
      title="ColorPicker"
      badge="stable"
      summary="Swatch trigger that opens a popover hosting a color canvas (react-colorful), a validated hex field, and an optional preset row. Fully controlled via value/onChange — no internal color state, no fetch, no persistence. Consolidates the avatar-swatch + q-popup-proxy + q-color pattern repeated across settings screens, each with its own hardcoded palette."
    >
      <DocSection id="playground" title="Playground">
        <Playground<ColorPickerControls>
          controls={[
            { name: 'size', type: 'select', default: 'md', options: ['sm', 'md', 'lg'] },
            { name: 'withPresets', type: 'boolean', default: true },
            { name: 'disabled', type: 'boolean', default: false },
          ]}
        >
          {(v) => (
            <ColorPicker
              value={playgroundColor}
              onChange={setPlaygroundColor}
              size={v.size}
              disabled={v.disabled}
              presets={v.withPresets ? CATEGORY_PRESETS : undefined}
              label="Pick a category color"
            />
          )}
        </Playground>
      </DocSection>

      <DocSection id="presets" title="With presets">
        <Prose>
          <Code>presets</Code> renders a quick-pick row above the canvas — there is no built-in default
          palette, so the caller always supplies one when a curated set makes sense (categories, tags, ESP
          colors). Omit it entirely for a bare canvas + hex field.
        </Prose>
        <Gallery
          minColRem={12}
          items={[
            {
              label: 'With presets',
              caption: 'quick-pick row above the canvas',
              node: (
                <ColorPicker
                  value={categoryColor}
                  onChange={setCategoryColor}
                  presets={CATEGORY_PRESETS}
                  label="Category color"
                />
              ),
            },
            {
              label: 'No presets',
              caption: 'canvas + hex field only',
              node: <ColorPicker value={freeColor} onChange={setFreeColor} label="Custom color" />,
            },
          ]}
        />
      </DocSection>

      <DocSection id="sizes-states" title="Sizes and states">
        <Gallery
          minColRem={9}
          items={[
            { label: 'sm', node: <ColorPicker value="#0072e0" onChange={() => {}} size="sm" label="Small swatch" /> },
            {
              label: 'md (default)',
              node: <ColorPicker value="#0072e0" onChange={() => {}} size="md" label="Medium swatch" />,
            },
            { label: 'lg', node: <ColorPicker value="#0072e0" onChange={() => {}} size="lg" label="Large swatch" /> },
            {
              label: 'disabled',
              node: <ColorPicker value="#0072e0" onChange={() => {}} disabled label="Disabled swatch" />,
            },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            { prop: 'value', type: 'string', required: true, description: 'Current color as a hex string.' },
            {
              prop: 'onChange',
              type: '(value: string) => void',
              required: true,
              description: "Fires with the new hex string — canvas drag, hex typing, or a preset click.",
            },
            {
              prop: 'presets',
              type: 'string[]',
              description: 'Quick-pick swatches rendered above the canvas. Omit to hide the row — no built-in default palette.',
            },
            { prop: 'disabled', type: 'boolean', description: 'Disables the trigger and prevents opening the popover.' },
            {
              prop: 'label',
              type: 'string',
              default: "'Pick a color'",
              description: 'Accessible name for the swatch trigger — it carries no visible text.',
            },
            { prop: 'size', type: "'sm' | 'md' | 'lg'", default: "'md'", description: 'Swatch trigger size.' },
            { prop: 'open', type: 'boolean', description: 'Controlled open state, forwarded to the underlying Popover.' },
            { prop: 'defaultOpen', type: 'boolean', description: 'Uncontrolled initial open state.' },
            { prop: 'onOpenChange', type: '(open: boolean) => void', description: 'Fires when the popover opens or closes.' },
            {
              prop: 'align',
              type: "'start' | 'center' | 'end'",
              default: "'start'",
              description: 'Popover content alignment relative to the trigger.',
            },
            { prop: 'className', type: 'string', description: 'Applied to the popover content shell.' },
            { prop: 'triggerClassName', type: 'string', description: 'Applied to the swatch trigger button.' },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Always pass an explicit label — the swatch has no visible text of its own.',
            'Supply presets whenever a curated palette exists (categories, ESP colors, tags) instead of a bare canvas.',
            'Treat value as owned by the caller — there is no internal color state or persistence.',
            'Validate/normalize a stored hex value before passing it in; the component renders exactly what it is given.',
          ]}
          donts={[
            "Don't invent a new hardcoded palette per screen — centralize a shared preset list where the same category set repeats.",
            "Don't use ColorPicker for a fixed, non-editable color swatch — render a plain colored element instead.",
            "Don't expect a default palette when presets is omitted — the row simply doesn't render.",
            "Don't couple ColorPicker to a specific color format elsewhere in the app — it is hex in, hex out.",
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'The trigger is a real button with an aria-label from the label prop — never an unlabeled color-only control.',
            'Preset swatches expose aria-pressed for the active match and an aria-label naming the color.',
            'The hex field is a real labelled input (react-colorful HexColorInput + Label), operable via keyboard.',
            'Popover open/close and focus trapping come from the underlying Popover/Radix primitives.',
            'Popover alignment and swatch layout use logical properties, so placement mirrors correctly under RTL.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
