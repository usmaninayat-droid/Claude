import { useState } from 'react'
import { MapPin } from '@fams/ui-kit/icons'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
  SelectSeparator,
  Label,
} from '@fams/ui-kit'
import { DocPage, DocSection, Prose, Gallery, Playground, PropsTable, Guidelines, A11yList, Code } from '../docs'

type SelectControls = {
  size: 'w-32' | 'w-56' | 'w-full max-w-md'
  disabled: boolean
  placeholder: string
}

/**
 * SelectDemo — dropdown built on Radix Select. Trigger visually matches the
 * plain Input (h-9, bg-input-background, 4px radius) so inline filters line
 * up; content is an elevated card surface. No hasError prop — pair with
 * Label + a destructive-toned subtext row for validation.
 */
export default function SelectDemo() {
  const [grouped, setGrouped] = useState('lavajet')
  const [withIcon, setWithIcon] = useState('lot-1')

  return (
    <DocPage
      title="Select"
      badge="stable"
      summary="Dropdown built on Radix Select. Trigger visually matches the plain Input (h-9, bg-input-background, 4px radius) so inline filters line up; content is an elevated card surface. No hasError prop — pair with Label + a destructive-toned subtext row for validation."
    >
      <DocSection id="playground" title="Playground">
        <Playground<SelectControls>
          controls={[
            { name: 'size', type: 'select', default: 'w-56', options: ['w-32', 'w-56', 'w-full max-w-md'] },
            { name: 'disabled', type: 'boolean', default: false },
            { name: 'placeholder', type: 'text', default: 'Choose a service provider…' },
          ]}
        >
          {(v) => (
            <div className={v.size}>
              <Select disabled={v.disabled}>
                <SelectTrigger>
                  <SelectValue placeholder={v.placeholder} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lavajet">Lavajet — Lots 1–2</SelectItem>
                  <SelectItem value="alphamed">Alphamed — Lots 7–8</SelectItem>
                  <SelectItem value="tajmee">Tajmee'e — full</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </Playground>
      </DocSection>

      <DocSection id="grouping" title="Grouping">
        <Prose>
          <Code>SelectGroup</Code> + <Code>SelectLabel</Code> + <Code>SelectSeparator</Code> compose a
          categorized list — a flat list needs none of them.
        </Prose>
        <Gallery
          layout="rows"
          items={[
            {
              label: 'Flat list',
              node: (
                <div className="w-56">
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Lot…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lot-1">Lot 1</SelectItem>
                      <SelectItem value="lot-2">Lot 2</SelectItem>
                      <SelectItem value="lot-7">Lot 7</SelectItem>
                      <SelectItem value="lot-8">Lot 8</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ),
            },
            {
              label: 'Grouped with separator',
              node: (
                <div className="w-64">
                  <Select value={grouped} onValueChange={setGrouped}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a service provider…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Private contractors</SelectLabel>
                        <SelectItem value="lavajet">Lavajet — Lots 1–2</SelectItem>
                        <SelectItem value="alphamed">Alphamed — Lots 7–8</SelectItem>
                      </SelectGroup>
                      <SelectSeparator />
                      <SelectGroup>
                        <SelectLabel>In-house</SelectLabel>
                        <SelectItem value="tajmee">Tajmee'e — full</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="sizes" title="Sizes">
        <Prose>Trigger height is fixed (h-9) — width is the wrapping element's job.</Prose>
        <Gallery
          layout="rows"
          items={[
            {
              label: 'w-32',
              node: (
                <div className="w-32">
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Lot" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lot-1">Lot 1</SelectItem>
                      <SelectItem value="lot-2">Lot 2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ),
            },
            {
              label: 'w-64',
              node: (
                <div className="w-64">
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a service provider…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lavajet">Lavajet — Lots 1–2</SelectItem>
                      <SelectItem value="alphamed">Alphamed — Lots 7–8</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ),
            },
            {
              label: 'w-full max-w-md',
              node: (
                <div className="w-full max-w-md">
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a service provider…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lavajet">Lavajet — Lots 1–2</SelectItem>
                      <SelectItem value="alphamed">Alphamed — Lots 7–8</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="states" title="States">
        <Prose>
          No dedicated error state — pair with a destructive-toned subtext row, the same pattern as{' '}
          <Code>Textarea</Code>'s <Code>error</Code> prop.
        </Prose>
        <Gallery
          layout="rows"
          items={[
            {
              label: 'default',
              node: (
                <div className="w-56">
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a service provider…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lavajet">Lavajet — Lots 1–2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ),
            },
            {
              label: 'filled',
              node: (
                <div className="w-56">
                  <Select defaultValue="lavajet">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lavajet">Lavajet — Lots 1–2</SelectItem>
                      <SelectItem value="alphamed">Alphamed — Lots 7–8</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ),
            },
            {
              label: 'disabled',
              node: (
                <div className="w-56">
                  <Select disabled>
                    <SelectTrigger>
                      <SelectValue placeholder="Contract locked" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lavajet">Lavajet — Lots 1–2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ),
            },
            {
              label: 'disabled item',
              node: (
                <div className="w-56">
                  <Select defaultValue="lot-1">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lot-1">Lot 1</SelectItem>
                      <SelectItem value="lot-7" disabled>
                        Lot 7 — Alphamed (unavailable)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="content" title="Content variations">
        <Prose>
          The trigger's children render before the chevron — an icon before <Code>SelectValue</Code> reads
          as a leading icon.
        </Prose>
        <Gallery
          layout="rows"
          items={[
            {
              label: 'Label above',
              node: (
                <div className="flex w-56 flex-col gap-1.5">
                  <Label htmlFor="lot-select">Lot</Label>
                  <Select>
                    <SelectTrigger id="lot-select">
                      <SelectValue placeholder="Select a lot…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lot-1">Lot 1</SelectItem>
                      <SelectItem value="lot-2">Lot 2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ),
            },
            {
              label: 'Leading icon',
              node: (
                <div className="w-56">
                  <Select value={withIcon} onValueChange={setWithIcon}>
                    <SelectTrigger>
                      <MapPin className="size-4 text-muted-foreground" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lot-1">Lot 1 — Al Ain</SelectItem>
                      <SelectItem value="lot-2">Lot 2 — Al Ain</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ),
            },
            {
              label: 'Placeholder-only',
              node: (
                <div className="w-56">
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a service provider…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lavajet">Lavajet — Lots 1–2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="float-label" title="Floating label (fields spec)">
        <Prose>
          <Code>label</Code> on the trigger switches to the Figma V2 field anatomy — the label sits
          centered while empty and floats to a caption when open or filled; <Code>required</Code>,{' '}
          <Code>hint</Code> and <Code>hasError</Code> match the Input contract.
        </Prose>
        <Gallery
          layout="rows"
          items={[
            {
              label: 'empty',
              node: (
                <Select>
                  <SelectTrigger label="Input Label Text" required hint="This is a hint text to help user.">
                    <SelectValue placeholder="Select an option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Options List</SelectLabel>
                      <SelectItem value="one">Option Text</SelectItem>
                      <SelectItem value="two">Option Text 2</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              ),
            },
            {
              label: 'filled',
              node: (
                <Select defaultValue="one">
                  <SelectTrigger label="Input Label Text" required>
                    <SelectValue placeholder="Select an option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Options List</SelectLabel>
                      <SelectItem value="one">Option Text</SelectItem>
                      <SelectItem value="two">Option Text 2</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              ),
            },
            {
              label: 'error',
              node: (
                <Select>
                  <SelectTrigger label="Input Label Text" required hasError hint="This is a hint text to help user.">
                    <SelectValue placeholder="Select an option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one">Option Text</SelectItem>
                  </SelectContent>
                </Select>
              ),
            },
            {
              label: 'disabled',
              node: (
                <Select disabled defaultValue="one">
                  <SelectTrigger label="Input Label Text" required>
                    <SelectValue placeholder="Select an option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one">Option Text</SelectItem>
                  </SelectContent>
                </Select>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <Prose>
          <Code>Select</Code>, <Code>SelectValue</Code> and <Code>SelectGroup</Code> are re-exported
          straight from Radix; the table covers the props used in the examples above plus the styled
          sub-components (<Code>SelectTrigger</Code>, <Code>SelectContent</Code>, <Code>SelectItem</Code>).
        </Prose>
        <PropsTable
          rows={[
            {
              prop: 'value',
              type: 'string',
              description: 'Select (root). Controlled selected value.',
            },
            {
              prop: 'defaultValue',
              type: 'string',
              description: 'Select (root). Uncontrolled initial value.',
            },
            {
              prop: 'onValueChange',
              type: '(value: string) => void',
              description: 'Select (root). Fires when the selection changes.',
            },
            {
              prop: 'disabled',
              type: 'boolean',
              default: 'false',
              description: 'Select (root) or SelectItem. Locks the whole control or a single option.',
            },
            {
              prop: 'id',
              type: 'string',
              description: 'SelectTrigger. Pair with an adjacent Label via htmlFor.',
            },
            {
              prop: 'placeholder',
              type: 'ReactNode',
              description: 'SelectValue. Shown when no value is selected.',
            },
            {
              prop: 'position',
              type: "'popper' | 'item-aligned'",
              default: "'popper'",
              description: 'SelectContent. popper anchors to the trigger and matches its width.',
            },
            {
              prop: 'value',
              type: 'string',
              required: true,
              description: 'SelectItem. The value this option represents.',
            },
            {
              prop: '…props',
              type: 'ComponentPropsWithoutRef<typeof SelectPrimitive.*>',
              description: 'Native Radix Select attributes (name, required, dir…) pass through on every sub-component.',
            },
          ]}
        />
      </DocSection>

      <DocSection id="custom-trigger-content" title="Custom trigger content">
        <Prose>
          The trigger truncates its <Code>SelectValue</Code> slot only (matched by{' '}
          <Code>[data-slot=select-value]</Code>). A call site is therefore free to render its own
          icon + label wrapper as a direct child without the trigger&rsquo;s <Code>line-clamp</Code>{' '}
          hijacking it — <Code>line-clamp</Code> switches an element to{' '}
          <Code>display: -webkit-box</Code>, which used to beat a wrapper&rsquo;s own{' '}
          <Code>flex</Code> and stack the icon above the text.
        </Prose>
        <Gallery
          layout="rows"
          items={[
            {
              label: 'icon + label wrapper (stays horizontal)',
              node: (
                <Select value={withIcon} onValueChange={setWithIcon}>
                  <SelectTrigger className="w-56" aria-label="Zone">
                    <span className="flex min-w-0 items-center gap-2">
                      <MapPin aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">Zone {withIcon.replace('lot-', '')}</span>
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lot-1">Zone 1</SelectItem>
                    <SelectItem value="lot-2">Zone 2</SelectItem>
                  </SelectContent>
                </Select>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Pair with a Label (via htmlFor) or place inside a form field group.',
            'Use SelectGroup + SelectLabel when the list has more than one logical category.',
            'Keep width on the wrapping element, not the trigger — trigger height is fixed at h-9.',
            'Use for closed, known option sets — 3 to ~20 items comfortably fit the popover.',
          ]}
          donts={[
            'Don’t use it for free-text entry — that’s Input or Combobox.',
            'Don’t rely on a hasError prop; there isn’t one — add a destructive-toned subtext row instead.',
            'Don’t bury more than ~20 items ungrouped — group or add search once it grows.',
            'Don’t hardcode the trigger width; let the parent container size it.',
            'Don’t re-implement the value slot — use SelectValue so the trigger’s truncation applies to it (and only it).',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Built on Radix Select — implements the WAI-ARIA listbox pattern with full keyboard support.',
            'Arrow keys move through items, Enter/Space selects, Escape closes and returns focus to the trigger.',
            'Typeahead: typing a letter jumps to the next matching item.',
            'Disabled items are skipped by keyboard navigation and are non-interactive.',
            'Chevron and item checkmark use logical insets (end-2), so it mirrors correctly under RTL (switch the header language).',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
