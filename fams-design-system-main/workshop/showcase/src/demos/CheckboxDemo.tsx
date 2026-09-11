import { Checkbox, Label } from '@fams/ui-kit'
import { DocPage, DocSection, Prose, Gallery, Playground, PropsTable, Guidelines, A11yList, Code } from '../docs'

type CheckboxControls = {
  checked: 'unchecked' | 'checked' | 'indeterminate'
  disabled: boolean
  label: string
}

/**
 * CheckboxDemo — reference implementation of the standard component-page
 * template (DocPage → Playground → Gallery per dimension → PropsTable →
 * Guidelines → Accessibility). RTL is proven by the global header switcher,
 * not a per-page block.
 */
export default function CheckboxDemo() {
  return (
    <DocPage
      title="Checkbox"
      badge="stable"
      summary="Built on Radix Checkbox. Fill is bg-input-background, checked is bg-primary, indicator is a lucide Check (strokeWidth 3, size-3.5) — identical to the Vue package. Single fixed size (size-4), no variant prop."
    >
      <DocSection id="playground" title="Playground">
        <Playground<CheckboxControls>
          controls={[
            { name: 'checked', type: 'select', default: 'checked', options: ['unchecked', 'checked', 'indeterminate'] },
            { name: 'disabled', type: 'boolean', default: false },
            { name: 'label', type: 'text', default: 'Email me route deviation alerts' },
          ]}
        >
          {(v) => (
            <label className="flex items-center gap-2 text-body-sm text-foreground">
              <Checkbox
                checked={v.checked === 'indeterminate' ? 'indeterminate' : v.checked === 'checked'}
                onCheckedChange={() => {}}
                isDisabled={v.disabled}
              />
              <Label>{v.label}</Label>
            </label>
          )}
        </Playground>
      </DocSection>

      <DocSection id="states" title="States">
        <Prose>
          <Code>indeterminate</Code> is a real Radix state (<Code>checked=&quot;indeterminate&quot;</Code>
          ), used for a partial select-all.
        </Prose>
        <Gallery
          minColRem={8}
          items={[
            { label: 'unchecked', node: <Checkbox checked={false} onCheckedChange={() => {}} /> },
            { label: 'checked', node: <Checkbox checked onCheckedChange={() => {}} /> },
            { label: 'indeterminate', node: <Checkbox checked="indeterminate" onCheckedChange={() => {}} /> },
            { label: 'disabled', node: <Checkbox isDisabled /> },
            { label: 'disabled + checked', node: <Checkbox isDisabled checked /> },
          ]}
        />
      </DocSection>

      <DocSection id="content-variations" title="Content variations">
        <Prose>
          No built-in label prop — compose with <Code>Label</Code>. Standalone use requires an{' '}
          <Code>aria-label</Code> for accessibility.
        </Prose>
        <Gallery
          minColRem={14}
          items={[
            {
              label: 'label trailing',
              node: (
                <label className="flex items-center gap-2 text-body-sm text-foreground">
                  <Checkbox checked onCheckedChange={() => {}} />
                  <Label>Email me route deviation alerts</Label>
                </label>
              ),
            },
            {
              label: 'label leading',
              node: (
                <label className="flex flex-row-reverse items-center justify-end gap-2 text-body-sm text-foreground">
                  <Checkbox checked={false} onCheckedChange={() => {}} />
                  <Label>Enable overspeeding priority alert</Label>
                </label>
              ),
            },
            {
              label: 'standalone',
              caption: 'icon-only, aria-label',
              node: <Checkbox aria-label="Select row" />,
            },
            {
              label: 'list',
              node: (
                <div className="flex flex-col gap-2 text-start">
                  <label className="flex items-center gap-2 text-body-sm text-foreground">
                    <Checkbox checked onCheckedChange={() => {}} />
                    <Label>Lavajet — Lots 1–2</Label>
                  </label>
                  <label className="flex items-center gap-2 text-body-sm text-foreground">
                    <Checkbox checked={false} onCheckedChange={() => {}} />
                    <Label>Alphamed — Lots 7–8</Label>
                  </label>
                  <label className="flex items-center gap-2 text-body-sm text-muted-foreground">
                    <Checkbox isDisabled checked />
                    <Label>Tajmee'e — full (required)</Label>
                  </label>
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
              prop: 'checked',
              type: "boolean | 'indeterminate'",
              description: 'Controlled checked state — indeterminate is a real, distinct third state.',
            },
            {
              prop: 'defaultChecked',
              type: "boolean | 'indeterminate'",
              description: 'Uncontrolled initial state.',
            },
            {
              prop: 'onCheckedChange',
              type: "(checked: boolean | 'indeterminate') => void",
              description: 'Fires on every toggle.',
            },
            {
              prop: 'disabled',
              type: 'boolean',
              default: 'false',
              description: 'Native disabled state — non-interactive, dimmed, cursor-not-allowed.',
            },
            {
              prop: 'isDisabled',
              type: 'boolean',
              default: 'false',
              description: 'Deprecated alias of disabled, kept for back-compat. Prefer disabled in new code.',
            },
            {
              prop: 'required',
              type: 'boolean',
              default: 'false',
              description: 'Marks the checkbox required in a native form submission.',
            },
            {
              prop: 'name / value',
              type: 'string',
              description: 'Native form field name and value when submitted inside a <form>.',
            },
            {
              prop: '…props',
              type: 'ButtonHTMLAttributes<HTMLButtonElement>',
              description: 'aria-label and any native button attribute pass through — Radix renders a button role="checkbox".',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Always pair with Label — click target and accessible name both depend on it.',
            'Use indeterminate for a select-all control when only some children are checked.',
            'Give a standalone (icon-only) checkbox an explicit aria-label.',
            "Use disabled to lock a required item, e.g. Tajmee'e's mandatory full-scope row.",
          ]}
          donts={[
            "Don't use Checkbox for a single on/off setting with immediate effect — use Switch instead.",
            "Don't rely on indeterminate as a third user-selectable value — it's a display state, not user-set.",
            "Don't wrap Checkbox in a div with an onClick instead of a real <label> — breaks click-to-toggle and a11y.",
            "Don't vary the size — it is intentionally fixed (size-4) to match the Vue package.",
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Renders role="checkbox" on a native <button> — Space toggles, Tab moves focus.',
            'aria-checked reflects true / false / "mixed" for the indeterminate state automatically.',
            'Wrapping in a <label> (or passing aria-label standalone) gives every checkbox an accessible name.',
            'Visible focus ring via the ring token; never removed.',
            'Layout uses logical properties (gap-based label pairing), so it mirrors correctly under RTL (switch the header language).',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
