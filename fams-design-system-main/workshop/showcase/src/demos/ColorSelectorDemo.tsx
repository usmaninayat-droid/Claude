import { useState } from 'react'
import { ColorSelector } from '@fams/ui-kit'
import { DocPage, DocSection, Prose, Gallery, Playground, PropsTable, Guidelines, A11yList, Code } from '../docs'

/** Figma 5580:3108 palette — supplied by the caller, no built-in default. */
const PRESETS = [
  '#0072d6',
  '#f04438',
  '#12b76a',
  '#f79009',
  '#06b6d4',
  '#4e5ba6',
  '#9e77ed',
  '#3b82f6',
  '#d946ef',
  '#f63d68',
  '#f5bb2a',
  '#8b6439',
]

type ColorSelectorControls = {
  label: string
  required: boolean
  disabled: boolean
  withPresets: boolean
}

/**
 * ColorSelectorDemo — standard component-page template for the ColorSelector
 * composite (Figma Design System V2, node 5580:3108): inline color field with
 * a preset swatch row and a custom react-colorful picker behind a toggle.
 */
export default function ColorSelectorDemo() {
  const [color, setColor] = useState('#0072d6')
  const [galleryColor, setGalleryColor] = useState('#f04438')

  return (
    <DocPage
      title="ColorSelector"
      badge="beta"
      summary="Inline color field: an outlined card with a label header and a mode-toggle link, hosting either a preset swatch row (selected swatch carries a check) or a custom picker — saturation canvas + hue slider, color lump, validated hex field. Fully controlled via value/onChange; presets always come from the caller."
    >
      <DocSection id="playground" title="Playground">
        <Playground<ColorSelectorControls>
          controls={[
            { name: 'label', type: 'text', default: 'Color' },
            { name: 'required', type: 'boolean', default: true },
            { name: 'disabled', type: 'boolean', default: false },
            { name: 'withPresets', type: 'boolean', default: true },
          ]}
        >
          {(v) => (
            <div className="w-full max-w-md">
              <ColorSelector
                label={v.label}
                required={v.required}
                disabled={v.disabled}
                value={color}
                onChange={setColor}
                presets={v.withPresets ? PRESETS : undefined}
              />
            </div>
          )}
        </Playground>
      </DocSection>

      <DocSection id="modes" title="Modes">
        <Prose>
          With <Code>presets</Code> the field opens on the swatch row and offers "Pick Custom Color";
          without them it renders the custom picker directly and hides the toggle.
        </Prose>
        <Gallery
          layout="rows"
          items={[
            {
              label: 'predefined',
              node: (
                <div className="w-full max-w-md">
                  <ColorSelector label="Color" required value={galleryColor} onChange={setGalleryColor} presets={PRESETS} />
                </div>
              ),
            },
            {
              label: 'custom only',
              node: (
                <div className="w-full max-w-md">
                  <ColorSelector label="Color" required value={galleryColor} onChange={setGalleryColor} />
                </div>
              ),
            },
            {
              label: 'disabled',
              node: (
                <div className="w-full max-w-md">
                  <ColorSelector label="Color" value="#0072d6" onChange={() => {}} presets={PRESETS} disabled />
                </div>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            { prop: 'value', type: 'string', required: true, description: 'Current color as a hex string.' },
            { prop: 'onChange', type: '(value: string) => void', required: true, description: 'Fires with the new hex — preset click, canvas drag, or hex typing.' },
            { prop: 'presets', type: 'string[]', description: 'Preset swatch row; enables the mode toggle. No built-in palette.' },
            { prop: 'label', type: 'string', description: 'Field label caption.' },
            { prop: 'required', type: 'boolean', default: 'false', description: 'Renders the required asterisk.' },
            { prop: 'disabled', type: 'boolean', default: 'false', description: 'Inert, 50% opacity.' },
            { prop: 'customModeLabel / presetModeLabel', type: 'string', description: 'Toggle-link copy overrides (i18n).' },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Supply a curated preset palette wherever the product has one (tags, categories) — custom is the escape hatch.',
            'Keep the component controlled; persist the hex string.',
          ]}
          donts={[
            'Don’t hardcode a palette inside a feature — pass it in.',
            'Don’t use for theme tokens — those are design-time decisions.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Preset swatches are a radiogroup: each swatch is a radio with its hex as accessible name; the selected one carries aria-checked and a visible check — never color alone.',
            'The mode toggle and every swatch are keyboard focusable with a visible ring.',
            'The hex field is a labelled text input; invalid text never fires onChange.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
