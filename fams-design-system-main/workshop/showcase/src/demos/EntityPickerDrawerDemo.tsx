import { useState } from 'react'
import { Button } from '../../../../packages/ui-kit/src/primitives/Button'
import {
  EntityPickerDrawer,
  LinkedEntityChip,
  type EntityPickerItem,
} from '../../../../packages/ui-kit/src/composites/EntityPickerDrawer'
import { DocPage, DocSection, Prose, Gallery, PropsTable, Guidelines, A11yList, Code } from '../docs'

/**
 * EntityPickerDrawerDemo — full-drawer bulk-select pair (EntityPickerDrawer +
 * LinkedEntityChip), the sibling to Combobox for longer, reviewable candidate
 * lists.
 */

const CONTACTS: EntityPickerItem[] = [
  { id: 'c1', label: 'Acme Waste Solutions', secondary: 'ops@acme.example', tags: ['Company'] },
  { id: 'c2', label: 'Bilal Traders', secondary: 'bilal@traders.example', tags: ['Company'] },
  { id: 'c3', label: 'Cedar Logistics', secondary: 'cedar@logistics.example', tags: ['Company'] },
  { id: 'c4', label: 'Dana Al Mansoori', secondary: 'dana.almansoori@example.com', tags: ['Contact'] },
  { id: 'c5', label: 'Ehsan Malik', secondary: 'ehsan.malik@example.com', tags: ['Contact'] },
]

export default function EntityPickerDrawerDemo() {
  const [multiOpen, setMultiOpen] = useState(false)
  const [multiValue, setMultiValue] = useState<string[]>(['c1'])

  const [singleOpen, setSingleOpen] = useState(false)
  const [singleValue, setSingleValue] = useState<string[]>([])

  const [emptyOpen, setEmptyOpen] = useState(false)

  const selectedContacts = CONTACTS.filter((c) => multiValue.includes(c.id))

  return (
    <DocPage
      title="EntityPickerDrawer"
      badge="stable"
      summary="Full-drawer bulk review-and-select — the sibling to Combobox for longer candidate lists. Retires the v5 codebase's *EntityLinkingDrawer.vue fork family (byte-identical copies across iwmp/ead/fams) plus PlansEntityLinking.vue and EntitySelectDrawer.vue. LinkedEntityChip renders each confirmed pick above the field that opened the drawer."
    >
      <DocSection id="preview" title="Preview">
        <Prose>
          Selection is staged inside the drawer and only reported via <Code>onChange</Code> when the
          user clicks Confirm. Click the trigger below to open it.
        </Prose>
        <div className="flex w-full flex-wrap items-center gap-2 rounded-md border border-border bg-card p-10">
          {selectedContacts.map((c) => (
            <LinkedEntityChip
              key={c.id}
              label={c.label}
              onRemove={() => setMultiValue((prev) => prev.filter((id) => id !== c.id))}
            />
          ))}
          <Button variant="tertiary" size="sm" onClick={() => setMultiOpen(true)}>
            + Link contact
          </Button>
        </div>

        <EntityPickerDrawer
          open={multiOpen}
          onOpenChange={setMultiOpen}
          items={CONTACTS}
          value={multiValue}
          onChange={setMultiValue}
          entityLabel="contact"
          title="Link contacts"
          description="Pick one or more contacts to link to this service location."
        />
      </DocSection>

      <DocSection id="options" title="Selection modes & empty state">
        <Gallery
          minColRem={14}
          items={[
            {
              label: 'Single-select',
              caption: 'multiple={false} — radio-style rows',
              node: (
                <>
                  <Button variant="secondary" onClick={() => setSingleOpen(true)}>
                    {singleValue.length
                      ? CONTACTS.find((c) => c.id === singleValue[0])?.label
                      : 'Select company'}
                  </Button>
                  <EntityPickerDrawer
                    open={singleOpen}
                    onOpenChange={setSingleOpen}
                    items={CONTACTS.filter((c) => c.tags?.includes('Company'))}
                    value={singleValue}
                    onChange={setSingleValue}
                    multiple={false}
                    entityLabel="company"
                    title="Select company"
                    description="Choose a company to link to this contact."
                  />
                </>
              ),
            },
            {
              label: 'Empty state',
              caption: 'items=[] — distinct from a no-match search',
              node: (
                <>
                  <Button variant="secondary" onClick={() => setEmptyOpen(true)}>
                    + Link asset
                  </Button>
                  <EntityPickerDrawer
                    open={emptyOpen}
                    onOpenChange={setEmptyOpen}
                    items={[]}
                    value={[]}
                    onChange={() => {}}
                    entityLabel="asset"
                    title="Link assets"
                    emptyText="No unassigned assets available to link yet."
                  />
                </>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            {
              prop: 'open',
              type: 'boolean',
              required: true,
              description: 'Controlled open state.',
            },
            {
              prop: 'onOpenChange',
              type: '(open: boolean) => void',
              required: true,
              description: 'Fires when the drawer requests to open or close.',
            },
            {
              prop: 'items',
              type: 'EntityPickerItem[]',
              required: true,
              description: 'Always caller-supplied — state-agnostic, no fetching inside.',
            },
            {
              prop: 'value',
              type: 'string[]',
              required: true,
              description: 'Selection at open time. Further edits stay staged inside the drawer.',
            },
            {
              prop: 'onChange',
              type: '(value: string[]) => void',
              required: true,
              description: 'Fires once, with the full staged id list, when the user confirms.',
            },
            {
              prop: 'multiple',
              type: 'boolean',
              default: 'true',
              description: 'Checkbox multi-select vs single radio-style pick.',
            },
            {
              prop: 'title',
              type: 'ReactNode',
              default: "'Select entities'",
              description: 'Drawer header title.',
            },
            {
              prop: 'description',
              type: 'ReactNode',
              description: 'Drawer header subtitle.',
            },
            {
              prop: 'searchPlaceholder',
              type: 'string',
              default: "'Search…'",
              description: 'Placeholder for the search input.',
            },
            {
              prop: 'emptyText',
              type: 'ReactNode',
              default: "'Nothing available to link yet.'",
              description: 'Shown when items itself is empty (no candidates at all).',
            },
            {
              prop: 'entityLabel',
              type: 'string',
              default: "'item'",
              description:
                'Singular noun used to pluralize the confirm CTA, e.g. "contact" → "Add 3 contacts".',
            },
            {
              prop: 'confirmLabelPrefix',
              type: 'string',
              default: "'Add'",
              description: 'Verb prefixed to the confirm CTA.',
            },
            {
              prop: 'side',
              type: "'left' | 'right'",
              default: "'right'",
              description: 'Edge the drawer anchors to.',
            },
            {
              prop: 'disabled',
              type: 'boolean',
              default: 'false',
              description: 'Locks search and row selection; Confirm stays disabled.',
            },
            {
              prop: 'className',
              type: 'string',
              description: 'Applied to the underlying SheetContent.',
            },
            {
              prop: 'label',
              type: 'string',
              required: true,
              description: 'LinkedEntityChip. The chip text.',
            },
            {
              prop: 'avatarSrc',
              type: 'string',
              description: 'LinkedEntityChip. Avatar image source for the chip.',
            },
            {
              prop: 'onRemove',
              type: '() => void',
              description: 'LinkedEntityChip. Omit to render a read-only chip with no remove affordance.',
            },
            {
              prop: '…props',
              type: 'HTMLAttributes<HTMLSpanElement>',
              description: 'LinkedEntityChip. className and other span attributes pass through.',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Use EntityPickerDrawer for longer candidate lists that benefit from search and review before confirming.',
            'Render LinkedEntityChip above the field that opened the drawer, one per confirmed selection.',
            'Set multiple={false} for a single-value picker like "select company".',
            'Give emptyText a specific message — distinguish "nothing to link" from a no-match search.',
          ]}
          donts={[
            'Don’t expect onChange on every row toggle — it fires once, on Confirm.',
            'Don’t reach for this on short lists (under ~7 items); use Combobox instead.',
            'Don’t fetch inside the drawer — items must be caller-supplied (state-agnostic, Rule 8).',
            'Don’t leave entityLabel at the generic "item" default when a real noun reads better in the CTA.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Multi-select rows use native checkboxes with a per-row aria-label; single-select rows expose role="radio" inside a radiogroup.',
            'The search input carries aria-controls pointing at the list and an explicit aria-label.',
            'Built on Sheet (Radix Dialog) — traps focus while open and restores it to the trigger on close.',
            'LinkedEntityChip’s remove button carries an explicit aria-label ("Remove {label}").',
            'side="left"/"right" use logical start/end, so the drawer’s anchor edge mirrors correctly under RTL (switch the header language).',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
