import { useState } from 'react'
import { PhoneInput, InsetField } from '@fams/ui-kit'
import { DocPage, DocSection, Prose, Gallery, Playground, PropsTable, Guidelines, A11yList, Code } from '../docs'

type PhoneInputControls = {
  disabled: boolean
  hasError: boolean
}

/**
 * PhoneInputDemo — country-flag + dial-code prefix segment, then the
 * number. Emits ONE combined string, the same contract as a plain text
 * widget, so it round-trips through the same field as any other Phone-
 * typed field.
 */
export default function PhoneInputDemo() {
  const [playgroundValue, setPlaygroundValue] = useState('+971504200000')
  const [galleryValue, setGalleryValue] = useState('+14155550123')
  const [bareValue, setBareValue] = useState('+20105550123')

  return (
    <DocPage
      title="PhoneInput"
      badge="stable"
      summary="One bordered field containing a flag chip → dial code → country popover → divider → the number. Generic across any Phone-typed field — country roster is caller-suppliable, defaulting to a small GCC-first list. Emits a single combined string."
    >
      <DocSection id="playground" title="Playground">
        <Playground<PhoneInputControls>
          controls={[
            { name: 'disabled', type: 'boolean', default: false },
            { name: 'hasError', type: 'boolean', default: false },
          ]}
        >
          {(v) => (
            <PhoneInput
              value={playgroundValue}
              onChange={setPlaygroundValue}
              ariaLabel="Phone number"
              disabled={v.disabled}
              hasError={v.hasError}
            />
          )}
        </Playground>
      </DocSection>

      <DocSection id="examples" title="Examples">
        <Prose>
          Value is a single string, <Code>"${'{dialCode}'}${'{nationalNumber}'}"</Code> (e.g.{' '}
          <Code>"+971504200000"</Code>) — pass a custom <Code>countries</Code> list to extend or
          replace the builtin GCC-first roster, and <Code>defaultCountry</Code> to change the
          fallback when the value doesn't match any known dial code.
        </Prose>
        <Gallery
          layout="rows"
          items={[
            {
              label: 'Custom default country',
              caption: 'defaultCountry="US"',
              node: (
                <PhoneInput
                  value={galleryValue}
                  onChange={setGalleryValue}
                  defaultCountry="US"
                  ariaLabel="Phone number"
                />
              ),
            },
            {
              label: 'bare',
              caption: 'nested inside InsetField — no own border/height',
              node: (
                <InsetField label="Mobile number" htmlFor="demo-phone-bare">
                  <PhoneInput value={bareValue} onChange={setBareValue} ariaLabel="Mobile number" bare />
                </InsetField>
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
              type: 'string',
              required: true,
              description: 'Combined value, "${dialCode}${nationalNumber}" (e.g. "+971504200000").',
            },
            { prop: 'onChange', type: '(value: string) => void', required: true, description: 'Fires with the new combined string.' },
            { prop: 'onBlur', type: '() => void', description: 'Fires when the number field loses focus.' },
            { prop: 'countries', type: 'PhoneCountry[]', default: 'DEFAULT_PHONE_COUNTRIES', description: 'Country roster (iso, name, dialCode). Extend/replace the builtin GCC-first list.' },
            { prop: 'defaultCountry', type: 'string', default: "'AE'", description: "Fallback ISO code when value doesn't match any known dial code." },
            { prop: 'disabled', type: 'boolean', default: 'false', description: 'Disables both the country trigger and the number field.' },
            { prop: 'hasError', type: 'boolean', default: 'false', description: 'Destructive border on the (non-bare) field.' },
            { prop: 'placeholder', type: 'string', description: 'Placeholder for the number field.' },
            { prop: 'bare', type: 'boolean', default: 'false', description: 'Strips the outer border/background/height for nesting inside a shell (e.g. InsetField).' },
            { prop: 'ariaLabel', type: 'string', description: 'Accessible name, applied to the number field and echoed into the country popover labels.' },
            { prop: 'className', type: 'string', description: 'Applied to the outer container.' },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Pass a tenant-specific countries list when the GCC-first default roster doesn’t match the product’s audience.',
            'Store and round-trip the combined value string as-is — never split it into separate columns.',
            'Pair bare with InsetField (or another field shell) rather than leaving it borderless in open layout.',
          ]}
          donts={[
            "Don't reformat or mask the number beyond digit-stripping — the component already strips non-digits from the national number.",
            "Don't assume the longest dial-code match; the component already resolves ambiguous prefixes (e.g. +1 vs a longer code) for you.",
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'The country trigger is a real button with an aria-label ("<ariaLabel> country code") distinct from the number field’s own label.',
            'The country popover exposes role="listbox" with role="option" rows and aria-selected on the active match.',
            'The number field is a real labelled <input type="tel"> with aria-invalid wired to hasError.',
            'Layout uses logical properties, so it mirrors correctly under RTL.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
