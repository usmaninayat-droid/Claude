import { useState } from 'react'
import { ToggleFieldGroup, Input, Label, Stack, FormGrid } from '@fams/ui-kit'
import { DocPage, DocSection, Prose, Gallery, PropsTable, Guidelines, A11yList, Code } from '../docs'

/** A tiny labelled input, standing in for a real bound edit-widget field. */
function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const id = `tfg-${label.toLowerCase().replace(/\s+/g, '-')}`
  return (
    <Stack gap="inline">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} />
    </Stack>
  )
}

export default function ToggleFieldGroupDemo() {
  // Trigger-panel-shaped consumer: a Switch gating an interval + reminder pair.
  const [odometerOn, setOdometerOn] = useState(true)
  const [interval, setInterval_] = useState('10,000 km')
  const [reminder, setReminder] = useState('500 km')

  // Reminders-row-shaped consumer: a Checkbox gating a recipient picker.
  const [smsOn, setSmsOn] = useState(false)
  const [recipient, setRecipient] = useState('+971501234567')

  return (
    <DocPage
      title="ToggleFieldGroup"
      badge="wip"
      summary="A labelled panel whose body only renders while a switch or checkbox gate is ON — the generic shape behind the create-rule wizard's switch-gated Trigger Rule cards and checkbox-gated Reminders rows. Fully controlled, no business vocabulary: the panel holds no field values of its own."
    >
      <DocSection id="preview" title="Preview">
        <Prose>
          The SAME component, two consumers: a <Code>Switch</Code>-gated card pairing an interval input
          with a reminder input (<Code>trailingLabel</Code> supplies the "Before Due" caption), and a{' '}
          <Code>Checkbox</Code>-gated row revealing a recipient field. Toggle either OFF, then back ON —
          the staged value is retained, never discarded (B3 UX ruling). OFF panels keep a one-line{' '}
          <Code>summary</Code> so hidden configuration stays discoverable.
        </Prose>
        <Gallery
          minColRem={22}
          maxCols={2}
          items={[
            {
              label: 'Switch-gated (Trigger Rule shape)',
              caption: 'controlKind="switch" (default) + trailingLabel',
              node: (
                <ToggleFieldGroup
                  checked={odometerOn}
                  onCheckedChange={setOdometerOn}
                  label="Odometer Interval"
                  trailingLabel="Before Due"
                  summary={`${interval} · ${reminder} before due`}
                  className="w-full"
                >
                  <FormGrid columns={2}>
                    <Field label="Distance Interval (km)" value={interval} onChange={setInterval_} />
                    <Field label="Send Reminder" value={reminder} onChange={setReminder} />
                  </FormGrid>
                </ToggleFieldGroup>
              ),
            },
            {
              label: 'Checkbox-gated (Reminders shape)',
              caption: 'controlKind="checkbox"',
              node: (
                <ToggleFieldGroup
                  checked={smsOn}
                  onCheckedChange={setSmsOn}
                  label="Send via SMS"
                  controlKind="checkbox"
                  summary={recipient}
                  className="w-full"
                >
                  <Field label="Select Recipients" value={recipient} onChange={setRecipient} />
                </ToggleFieldGroup>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            { prop: 'checked', type: 'boolean', required: true, description: "Whether the panel's gate is ON (content shown) or OFF (summary shown)." },
            { prop: 'onCheckedChange', type: '(checked: boolean) => void', required: true, description: 'Fires with the next gate value.' },
            { prop: 'label', type: 'ReactNode', required: true, description: "Panel title — also becomes the gate control's accessible name (aria-labelledby)." },
            { prop: 'children', type: 'ReactNode', description: 'Rendered only while checked is true.' },
            { prop: 'trailingLabel', type: 'ReactNode', description: 'Static caption at the trailing edge of the revealed content (e.g. a "Before Due" caption). Omitted entirely when not passed.' },
            {
              prop: 'summary',
              type: 'ReactNode',
              description: "One-line recap of the panel's current values, shown in place of children while OFF, so hidden configuration stays discoverable. Omitted entirely when not passed.",
            },
            {
              prop: 'controlKind',
              type: "'switch' | 'checkbox'",
              default: "'switch'",
              description: 'Which control gates the panel — a Switch (Trigger Rule cards) or a Checkbox (Reminders rows).',
            },
            { prop: 'disabled', type: 'boolean', description: 'Disables the gate control.' },
            { prop: 'className', type: 'string', description: 'Passed to the root Card element.' },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Keep the panel fully controlled — checked/onCheckedChange own the gate, children own their own values, in the CONSUMER\'s state.',
            'Pass summary so a switched-OFF panel still shows that it holds configuration, instead of vanishing without a trace.',
            'Use controlKind="checkbox" for a group of independent multi-select rows (Reminders); keep "switch" for a single on/off panel (Trigger Rule).',
          ]}
          donts={[
            "Don't bake business vocabulary into the props — label/children/summary/trailingLabel are generic slots; the wiring layer supplies domain content.",
            "Don't clear a consumer's staged value on toggle-off — retaining it across an OFF -> ON round trip is the B3 UX ruling, not optional.",
            "Don't rely on trailingLabel positioning for pixel-perfect field-level captions — it's one shared caption for the whole panel, not per-field.",
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'The gate control (Switch or Checkbox) is labelled by the panel title via aria-labelledby — never a second, redundant accessible name.',
            'The revealed/hidden content region carries aria-live="polite", announcing the transition — the ARIA-safe option since switch/checkbox roles do not support aria-expanded.',
            'Built on the existing Switch/Checkbox primitives (Radix, grandfathered) — focus ring, aria-checked and keyboard toggling come from them unchanged.',
            'Layout uses logical properties throughout, so it mirrors correctly under RTL.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
