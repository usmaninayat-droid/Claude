import { useState } from 'react'
import { Switch, Label } from '@fams/ui-kit'
import { DocPage, DocSection, Prose, Gallery, Playground, PropsTable, Guidelines, A11yList, Code } from '../docs'

type SwitchControls = {
  disabled: boolean
  label: string
}

export default function SwitchDemo() {
  const [checked, setChecked] = useState(true)

  return (
    <DocPage
      title="Switch"
      badge="stable"
      summary="Accessible toggle built on Radix Switch (Root + Thumb). ON uses the tenant primary brand fill, OFF a muted track. ~32×18 knob track, focus ring, RTL-safe — the thumb travels toward the logical end via rtl: transforms. Single fixed size, no variant prop."
    >
      <DocSection id="playground" title="Playground">
        <Playground<SwitchControls>
          controls={[
            { name: 'disabled', type: 'boolean', default: false },
            { name: 'label', type: 'text', default: 'Auto-assign dispatcher' },
          ]}
        >
          {(v) => (
            <label className="flex items-center gap-2 text-body-sm text-foreground">
              <Switch checked={checked} onCheckedChange={setChecked} disabled={v.disabled} />
              <Label>{v.label}</Label>
            </label>
          )}
        </Playground>
      </DocSection>

      <DocSection id="states" title="States">
        <Prose>
          No readonly concept for a toggle — <Code>disabled</Code> is the only non-interactive state.
        </Prose>
        <Gallery
          minColRem={9}
          items={[
            { label: 'off', node: <Switch aria-label="GPS alerts off" /> },
            { label: 'on', node: <Switch defaultChecked aria-label="GPS alerts on" /> },
            { label: 'disabled off', node: <Switch disabled aria-label="Disabled off" /> },
            { label: 'disabled on', node: <Switch disabled defaultChecked aria-label="Disabled on" /> },
          ]}
        />
      </DocSection>

      <DocSection id="content" title="Content variations">
        <Prose>
          No built-in label prop — compose with <Code>Label</Code>. Standalone use requires{' '}
          <Code>aria-label</Code>.
        </Prose>
        <Gallery
          minColRem={14}
          items={[
            {
              label: 'label trailing',
              node: (
                <label className="flex items-center gap-2 text-body-sm text-foreground">
                  <Switch defaultChecked />
                  <Label>Auto-assign dispatcher</Label>
                </label>
              ),
            },
            {
              label: 'label leading',
              node: (
                <label className="flex flex-row-reverse items-center justify-end gap-2 text-body-sm text-foreground">
                  <Switch />
                  <Label>Enable GPS deviation alerts</Label>
                </label>
              ),
            },
            {
              label: 'standalone',
              caption: 'aria-label only',
              node: <Switch aria-label="Quiet hours" />,
            },
            {
              label: 'with helper text',
              node: (
                <div className="flex flex-col gap-1">
                  <label className="flex items-center gap-2 text-body-sm text-foreground">
                    <Switch />
                    <Label>Fuel theft priority alert</Label>
                  </label>
                  <span className="text-xs text-muted-foreground">Requires AMC contract confirmation</span>
                </div>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            { prop: 'checked', type: 'boolean', description: 'Controlled checked state.' },
            { prop: 'defaultChecked', type: 'boolean', description: 'Uncontrolled initial state.' },
            {
              prop: 'onCheckedChange',
              type: '(checked: boolean) => void',
              description: 'Fires with the new state on every toggle.',
            },
            {
              prop: 'disabled',
              type: 'boolean',
              default: 'false',
              description: 'Native disabled state — non-interactive, dimmed track and thumb.',
            },
            {
              prop: 'isDisabled',
              type: 'boolean',
              default: 'false',
              description: 'Deprecated alias of disabled, kept for back-compat.',
            },
            {
              prop: 'required',
              type: 'boolean',
              default: 'false',
              description: 'Marks the switch required when submitted inside a native form.',
            },
            {
              prop: '…props',
              type: 'ComponentPropsWithoutRef<typeof RadixSwitch.Root>',
              description: 'Native Radix Switch Root attributes (name, value, aria-label…) pass through.',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Use Switch for a setting that takes effect immediately — no separate Save step.',
            'Always pair with a visible Label, or an aria-label for standalone use.',
            'Reserve disabled for settings genuinely unavailable right now, not just less important.',
            'Default to label-trailing; only reverse the order when content direction calls for it.',
          ]}
          donts={[
            'Don’t use Switch where a confirm/save step is required — use a Checkbox in a form instead.',
            'Don’t rely on the fill colour alone — the thumb position also carries the state.',
            'Don’t model a three-state toggle with Switch — it is strictly binary.',
            'Don’t leave a disabled Switch unexplained — surface the reason nearby (or in a Tooltip).',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Built on Radix Switch — role="switch" and aria-checked come from Radix itself.',
            'Fully keyboard-operable: Tab to focus, Space to toggle.',
            'Visible focus ring via the ring token, offset so it doesn’t collide with the thumb.',
            'Standalone usage (no visible Label) requires an explicit aria-label.',
            'Layout uses logical properties, so it mirrors correctly under RTL (switch the header language).',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
