import { useState } from 'react'
import { Search, Truck, Eye } from '@fams/ui-kit/icons'
import { Input, Label } from '@fams/ui-kit'
import { DocPage, DocSection, Prose, Gallery, Playground, PropsTable, Guidelines, A11yList, Code } from '../docs'

type InputControls = {
  label: string
  hasError: boolean
  isDisabled: boolean
  readOnly: boolean
  leadingIcon: 'none' | 'search' | 'truck'
}

export default function InputDemo() {
  const [plate, setPlate] = useState('')

  return (
    <DocPage
      title="Input"
      badge="stable"
      summary="Text field with two modes: a plain input (label-above is the caller's job — inline filters, search bars) and a floating-label field (Quasar `outlined` q-input parity). Retires the ad-hoc q-input outlined styling scattered across module forms."
    >
      <DocSection id="playground" title="Playground">
        <Playground<InputControls>
          controls={[
            { name: 'label', type: 'text', default: 'Vehicle plate' },
            { name: 'hasError', type: 'boolean', default: false },
            { name: 'isDisabled', type: 'boolean', default: false },
            { name: 'readOnly', type: 'boolean', default: false },
            { name: 'leadingIcon', type: 'select', default: 'none', options: ['none', 'search', 'truck'] },
          ]}
        >
          {(v) => (
            <div className="w-72">
              <Input
                label={v.label || undefined}
                value={plate}
                onChange={(e) => setPlate(e.target.value)}
                hasError={v.hasError}
                isDisabled={v.isDisabled}
                readOnly={v.readOnly}
                leadingIcon={
                  v.leadingIcon === 'search' ? (
                    <Search className="size-4" />
                  ) : v.leadingIcon === 'truck' ? (
                    <Truck className="size-4" />
                  ) : undefined
                }
              />
            </div>
          )}
        </Playground>
      </DocSection>

      <DocSection id="variants" title="Variants — plain / floating label">
        <Prose>
          A plain input (<Code>h-11</Code>, no <Code>label</Code> prop — label-above is the caller's
          job) for inline filters and search bars, and a floating-label field (<Code>h-14</Code>,{' '}
          <Code>label</Code> set — placeholder floats up on focus/fill) for standard form fields.
        </Prose>
        <Gallery
          layout="rows"
          items={[
            {
              label: 'plain',
              caption: 'label-above is the caller’s job',
              node: (
                <div className="flex w-64 flex-col gap-1.5">
                  <Label htmlFor="variant-plain">Search assets</Label>
                  <Input id="variant-plain" placeholder="Search by plate, driver, lot…" />
                </div>
              ),
            },
            {
              label: 'floating label',
              caption: 'Quasar outlined parity',
              node: (
                <div className="w-64">
                  <Input label="Vehicle plate" />
                </div>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="states" title="States">
        <Prose>
          No dedicated size prop — height is fixed per variant; width is the wrapping element's job.
          <Code>readOnly</Code> falls back to the native attribute, with no dedicated visual treatment.
        </Prose>
        <Gallery
          layout="rows"
          items={[
            { label: 'default', node: <Input label="Vehicle plate" /> },
            { label: 'filled', node: <Input label="Vehicle plate" defaultValue="AUH 45213" /> },
            {
              label: 'error',
              node: <Input label="Email address" defaultValue="not-an-email" hasError />,
            },
            {
              label: 'disabled',
              node: <Input label="Contract ID" defaultValue="Locked" isDisabled />,
            },
            {
              label: 'read-only',
              node: <Input label="Contract ID" defaultValue="TDW-2026-0113" readOnly />,
            },
          ]}
        />
      </DocSection>

      <DocSection id="fields-spec" title="Fields spec (Figma V2)">
        <Prose>
          The Design System V2 fields spec additions: <Code>required</Code> renders the asterisk in the
          floating label, <Code>hint</Code> the helper row under the field (destructive when{' '}
          <Code>hasError</Code>), and <Code>suffix</Code> a unit at the logical end.
        </Prose>
        <Gallery
          layout="rows"
          items={[
            {
              label: 'required + hint',
              node: <Input label="Input Label Text" required hint="This is a hint text to help user." />,
            },
            {
              label: 'unit suffix + leading icon',
              node: (
                <Input
                  label="Input Label Text"
                  required
                  suffix="Unit"
                  leadingIcon={<Truck className="size-5" aria-hidden />}
                  hint="This is a hint text to help user."
                />
              ),
            },
            {
              label: 'error + hint',
              node: (
                <Input label="Input Label Text" required hasError hint="This is a hint text to help user." defaultValue="Input/Placeholder Text" />
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="content" title="Content variations">
        <Prose>Icon slots work in both plain and floating-label modes.</Prose>
        <Gallery
          layout="rows"
          items={[
            {
              label: 'leading icon',
              node: <Input placeholder="Search assets…" leadingIcon={<Search className="size-4" />} />,
            },
            {
              label: 'leading + floating',
              node: <Input label="Vehicle plate" leadingIcon={<Truck className="size-4" />} />,
            },
            {
              label: 'trailing icon',
              node: (
                <Input
                  label="Reference"
                  defaultValue="TDW-2026-0113"
                  trailingIcon={<Eye className="size-4" />}
                />
              ),
            },
            {
              label: 'icon-only',
              caption: 'aria-label, no visible label',
              node: (
                <Input aria-label="Search assets" placeholder="Search…" leadingIcon={<Search className="size-4" />} />
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="password" title="Password visibility">
        <Prose>
          <Code>revealable</Code> with <Code>type=&quot;password&quot;</Code> renders a trailing
          eye / eye-off toggle — a real button (&quot;Show password&quot; / &quot;Hide
          password&quot;, keyboard operable, full-height ≥40px hit area) that reveals or masks the
          value without stealing focus from the field. It works in both modes and alongside{' '}
          <Code>hasError</Code>.
        </Prose>
        <Gallery
          layout="rows"
          items={[
            {
              label: 'floating label',
              node: <Input label="Password" type="password" revealable defaultValue="hunter2" />,
            },
            {
              label: 'plain',
              node: <Input aria-label="Password" type="password" revealable defaultValue="hunter2" />,
            },
            {
              label: 'error state',
              caption: 'toggle still works while errored',
              node: <Input label="Password" type="password" revealable hasError defaultValue="hunter2" />,
            },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            {
              prop: 'label',
              type: 'string',
              description:
                'Floating label — sits centered as the placeholder, floats up to a small caption on focus/fill (Quasar outlined q-input parity). Omit for a plain input.',
            },
            {
              prop: 'hasError',
              type: 'boolean',
              default: 'false',
              description:
                'Error state: destructive (error.500) border/ring, destructive-emphasis (error.600) floating label, and aria-invalid. Pair with a FieldError row.',
            },
            {
              prop: 'isDisabled',
              type: 'boolean',
              description: '@deprecated alias of the native disabled, kept for back-compat.',
            },
            {
              prop: 'leadingIcon',
              type: 'ReactNode',
              description: 'Icon rendered inside the field at the logical start (before the text).',
            },
            {
              prop: 'trailingIcon',
              type: 'ReactNode',
              description: 'Icon rendered inside the field at the logical end (after the text).',
            },
            {
              prop: 'revealable',
              type: 'boolean',
              default: 'false',
              description:
                'With type="password": trailing eye/eye-off toggle to reveal or mask the value. Takes the trailing slot; ignored in bare mode.',
            },
            {
              prop: '…props',
              type: 'InputHTMLAttributes<HTMLInputElement>',
              description: 'value, onChange, placeholder, disabled, readOnly, type, and every native input attribute pass through.',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Use the floating-label variant for standalone form fields (contracts, master data).',
            'Use the plain variant with a caller-supplied Label for filter bars and search.',
            'Pair leadingIcon with a search or entity icon to reinforce the field’s intent.',
            'Set hasError alongside inline validation text near the field.',
          ]}
          donts={[
            'Don’t use isDisabled in new code — use the native disabled prop.',
            'Don’t rely on placeholder text as a substitute for a label.',
            'Don’t put more than one icon per side.',
            'Don’t hardcode field width in the component — control it from the wrapping element.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Renders a native <input> — full keyboard support and browser autofill for free.',
            'hasError sets aria-invalid so assistive tech announces the invalid state.',
            'The floating label stays associated via htmlFor/id even after it moves position.',
            'Icons are aria-hidden — they are decorative, not part of the accessible name.',
            'Layout uses logical properties (ps-/pe-), so it mirrors correctly under RTL (switch the header language).',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
