import { MapPin } from '@fams/ui-kit/icons'
import { Label, Input, Checkbox } from '@fams/ui-kit'
import { DocPage, DocSection, Prose, Gallery, PropsTable, Guidelines, A11yList, Code } from '../docs'

export default function LabelDemo() {
  return (
    <DocPage
      title="Label"
      badge="stable"
      summary="Form field label built on Radix Label. Pairs with any control via native htmlFor; dims automatically when the associated control carries peer-disabled. No variant or size prop — a single token-driven treatment (text-sm, font-medium)."
    >
      <DocSection id="preview" title="Preview">
        <Prose>
          Paired via <Code>htmlFor</Code> / <Code>id</Code>.
        </Prose>
        <div className="flex w-64 flex-col gap-1.5 rounded-md border border-border bg-card p-6">
          <Label htmlFor="preview-lot">Lot</Label>
          <Input id="preview-lot" placeholder="Lot 1" />
        </div>
      </DocSection>

      <DocSection id="states" title="States">
        <Prose>
          Label has no <Code>disabled</Code> prop of its own — it dims when the paired control is
          disabled and marked <Code>peer</Code>.
        </Prose>
        <Gallery
          minColRem={11}
          items={[
            {
              label: 'default',
              node: (
                <div className="flex w-48 flex-col gap-1.5">
                  <Label htmlFor="label-active">Contract ID</Label>
                  <Input id="label-active" className="peer" defaultValue="TDW-2026-0113" />
                </div>
              ),
            },
            {
              label: 'via peer-disabled',
              node: (
                <div className="flex w-48 flex-col gap-1.5">
                  <Label htmlFor="label-locked" className="peer-disabled:cursor-not-allowed peer-disabled:opacity-50">
                    Contract ID
                  </Label>
                  <Input id="label-locked" className="peer" defaultValue="Locked" disabled />
                </div>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="content" title="Content variations">
        <Prose>
          The flex layout (<Code>gap-2</Code>) accepts any inline content, not just text.
        </Prose>
        <Gallery
          minColRem={11}
          items={[
            {
              label: 'plain',
              node: (
                <div className="flex w-40 flex-col gap-1.5">
                  <Label htmlFor="label-plain">District</Label>
                  <Input id="label-plain" placeholder="Al Ain" />
                </div>
              ),
            },
            {
              label: 'required',
              node: (
                <div className="flex w-48 flex-col gap-1.5">
                  <Label htmlFor="label-required">
                    Vehicle plate <span className="text-destructive">*</span>
                  </Label>
                  <Input id="label-required" placeholder="AUH 45213" />
                </div>
              ),
            },
            {
              label: 'with icon',
              node: (
                <div className="flex w-40 flex-col gap-1.5">
                  <Label htmlFor="label-with-icon">
                    <MapPin className="size-3.5" />
                    Geozone
                  </Label>
                  <Input id="label-with-icon" placeholder="Lot 1 boundary" />
                </div>
              ),
            },
            {
              label: 'paired with Checkbox',
              node: (
                <label className="flex items-center gap-2">
                  <Checkbox checked />
                  <Label>Enable overspeeding priority alert</Label>
                </label>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            {
              prop: 'htmlFor',
              type: 'string',
              description: 'Native association to the paired control’s id.',
            },
            {
              prop: '…props',
              type: 'ComponentPropsWithoutRef<typeof RadixLabel.Root>',
              description:
                'className, children, and every Radix Label / native label attribute pass through — no bespoke variant or size prop.',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Always pair via htmlFor/id, even when the control sits right next to it visually.',
            'Add className="peer" on the control so peer-disabled dimming works.',
            'Mark required fields with an inline destructive asterisk, not a separate prop.',
            'Compose icons inline (gap-2 flex) rather than absolutely positioning them.',
          ]}
          donts={[
            'Don’t use Label without an associated control — it exists to be paired.',
            'Don’t invent a size/variant override; the single treatment is intentional.',
            'Don’t wrap Label in its own click handler — clicking it already focuses the paired control.',
            'Don’t use a plain <span> where Label’s Radix behaviour (double-click text selection guard) is needed.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Renders a native <label> via Radix — clicking it focuses/activates the paired control.',
            'Dims via peer-disabled when the paired control is disabled, giving a visual cue that matches its actual state.',
            'select-none prevents accidental text selection on double-click without affecting the paired control.',
            'Layout uses logical properties (gap-2 flex), so icon + text mirror correctly under RTL (switch the header language).',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
