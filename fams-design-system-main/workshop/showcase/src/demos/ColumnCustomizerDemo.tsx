import { useState } from 'react'
import { ColumnCustomizer, type ColumnCatalogItem } from '@fams/ui-kit'
import { DocPage, DocSection, Prose, Gallery, PropsTable, Guidelines, A11yList, Code } from '../docs'

const CATALOG: ColumnCatalogItem[] = [
  { key: 'rfid', label: 'RFID', group: 'Identity', required: true },
  { key: 'sector', label: 'Sector', group: 'Location' },
  { key: 'lotZone', label: 'Lot Zone', group: 'Location' },
  { key: 'wasteType', label: 'Waste Type', group: 'Identity' },
  { key: 'fillLevel', label: 'Fill Level', group: 'Status' },
  { key: 'lastEmptied', label: 'Last Emptied', group: 'Status' },
  { key: 'installedOn', label: 'Installed On', group: 'Identity' },
]

/**
 * ColumnCustomizerDemo — ColumnCustomizer is a popover-style control (search,
 * drag-reorder, grouped toggles), so it follows the overlay/interaction
 * pattern: a live Preview instead of a generic prop Playground.
 */
export default function ColumnCustomizerDemo() {
  const [value, setValue] = useState(['rfid', 'sector', 'fillLevel'])
  const [minimal, setMinimal] = useState(['rfid'])

  return (
    <DocPage
      title="ColumnCustomizer"
      badge="stable"
      summary="The standard DS table 'Columns' chooser — search, drag-reorder of shown columns, grouped categories, and toggle switches. Reference design Figma node 495-25285 (FAMS V5 Launch Pad); reference behavior the v5 ColumnMenu.vue. value is the single source of truth: the ordered array of visible column keys."
    >
      <DocSection id="preview" title="Preview">
        <Prose>
          Drag the handle (or use arrow keys on it) to reorder <Code>Shown</Code> · toggle
          switches show/hide. <Code>value</Code> captures both visibility and order — this is also
          the exact popover content <Code>DataTable</Code>'s columns pencil (its default,
          product-matching trigger — see <Code>DataTable</Code>'s "Columns customizer trigger" section)
          opens.
        </Prose>
        <div className="w-[260px]">
          <ColumnCustomizer catalog={CATALOG} value={value} onChange={setValue} onClose={() => {}} />
        </div>
      </DocSection>

      <DocSection id="states" title="States">
        <Gallery
          minColRem={18}
          items={[
            {
              label: 'Required column',
              caption: "RFID's toggle is disabled",
              node: (
                <div className="w-[260px]">
                  <ColumnCustomizer catalog={CATALOG} value={minimal} onChange={setMinimal} />
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
              prop: 'catalog',
              type: 'ColumnCatalogItem[]',
              required: true,
              description: 'Every available column: { key, label, group, icon?, required? }.',
            },
            {
              prop: 'value',
              type: 'string[]',
              required: true,
              description: 'Ordered array of visible column keys — the single source of truth for visibility and order.',
            },
            {
              prop: 'onChange',
              type: '(orderedVisibleKeys: string[]) => void',
              required: true,
              description: 'Fires on toggle or reorder with the full next ordered array.',
            },
            {
              prop: 'onClose',
              type: '() => void',
              description: 'Renders a close (X) button in the header when supplied; omit to hide it.',
            },
          ]}
        />
        <Prose>
          Each <Code>ColumnCatalogItem</Code> is{' '}
          <Code>{'{ key, label, group, icon?, required? }'}</Code>. <Code>key</Code> matches{' '}
          <Code>DataTableColumn.key</Code>; <Code>group</Code> is the section label shown for
          hidden columns (ignored once a column is in <Code>Shown</Code>); <Code>required</Code>{' '}
          disables the toggle so the column can be reordered but never hidden.
        </Prose>
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Treat value as fully controlled — persist it (per-user table preference) and pass it back in on load.',
            'Mark identity columns required so a table can never be emptied of its primary key.',
            'Group remaining columns by a meaningful category (Identity, Location, Status), not by data source.',
            'Reuse this exact component as the DataTable columns-pencil popover content — don\'t re-implement a variant.',
          ]}
          donts={[
            "Don't mutate value in place — always pass a new array back through onChange.",
            "Don't rely on catalog order for display — Shown always renders value's order, not catalog's.",
            "Don't mark more than a couple of columns required — it removes the user's ability to declutter.",
            "Don't hide the search box for large catalogs; it's the only way to find a column in a long list.",
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'The search input carries an explicit aria-label ("Search Columns").',
            'Each drag handle is a real button with aria-label ("Reorder <column>") and Arrow Up/Down keyboard reordering — dragging is not the only path.',
            'Every toggle is a Switch with aria-label ("Toggle <column>") and a disabled state for required columns.',
            'Drag handle, search icon, and toggle thumb all mirror correctly via logical/[dir]-aware utilities under RTL.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
