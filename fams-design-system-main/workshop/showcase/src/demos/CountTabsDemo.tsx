import { useState } from 'react'
import { CountTabs, type CountTabItem } from '@fams/ui-kit'
import { DocPage, DocSection, Prose, Gallery, Playground, PropsTable, Guidelines, A11yList, Code } from '../docs'

const ITEMS: CountTabItem[] = [
  { id: 'unread', label: 'Unread', count: 42 },
  { id: 'all', label: 'All', count: 42 },
  { id: 'reminders', label: 'Reminders', count: '05' },
  { id: 'assigned', label: 'Assigned to me', count: '05' },
  { id: 'mentions', label: '@Mentions', count: '03' },
  { id: 'critical', label: 'Critical', count: '03' },
]

type CountTabsControls = {
  showCounts: boolean
  disableCritical: boolean
}

function ControlledExample({ items }: { items: CountTabItem[] }) {
  const [value, setValue] = useState(items[0]?.id ?? '')
  return <CountTabs aria-label="Example filters" items={items} value={value} onValueChange={setValue} />
}

/**
 * CountTabsDemo — the underline tab strip whose tabs pair a label with a
 * count badge (the inbox filter row). A thin composition of the Tabs
 * primitive: keyboard behavior and ARIA come from the primitive; this adds
 * only the count-pill treatment and the horizontally-scrolling strip.
 */
export default function CountTabsDemo() {
  return (
    <DocPage
      title="CountTabs"
      badge="stable"
      summary="An underline tab strip whose tabs pair a label with a count badge — filter strips over a feed or list (e.g. Unread / All / Critical). Counts render verbatim; the strip owns its horizontal overflow so tabs scroll instead of wrapping."
    >
      <DocSection id="playground" title="Playground">
        <Playground<CountTabsControls>
          controls={[
            { name: 'showCounts', type: 'boolean', default: true },
            { name: 'disableCritical', type: 'boolean', default: false },
          ]}
        >
          {(v) => (
            <ControlledExample
              items={ITEMS.map((item) => ({
                ...item,
                count: v.showCounts ? item.count : undefined,
                disabled: v.disableCritical && item.id === 'critical',
              }))}
            />
          )}
        </Playground>
      </DocSection>

      <DocSection id="states" title="States">
        <Prose>
          Counts are rendered <Code>verbatim</Code> — pass <Code>&quot;05&quot;</Code> to keep a
          zero-padded badge, a number for plain rendering, or omit <Code>count</Code> for a badge-less
          tab. The active tab tints its badge with the primary treatment.
        </Prose>
        <Gallery
          minColRem={22}
          items={[
            {
              label: 'with counts',
              node: <ControlledExample items={ITEMS.slice(0, 3)} />,
            },
            {
              label: 'mixed (no badge without a count)',
              node: (
                <ControlledExample
                  items={[
                    { id: 'open', label: 'Open', count: 12 },
                    { id: 'archived', label: 'Archived' },
                  ]}
                />
              ),
            },
            {
              label: 'disabled tab',
              node: (
                <ControlledExample
                  items={[
                    { id: 'a', label: 'Active', count: 4 },
                    { id: 'b', label: 'Locked', count: '00', disabled: true },
                  ]}
                />
              ),
            },
            {
              label: 'overflow (strip scrolls, never wraps)',
              node: (
                <div className="max-w-xs">
                  <ControlledExample items={ITEMS} />
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
              prop: 'items',
              type: 'CountTabItem[]',
              description: 'The tabs, in order: { id, label, count?, disabled? }. Counts render verbatim.',
            },
            { prop: 'value', type: 'string', description: 'Controlled active tab id.' },
            {
              prop: 'onValueChange',
              type: '(id: string) => void',
              description: 'Fires with the clicked/keyboard-selected tab id.',
            },
            {
              prop: 'aria-label',
              type: 'string',
              description: 'Accessible name for the tablist — always pass one for a filter strip.',
            },
            {
              prop: '…props',
              type: "Omit<TabsProps, 'value' | 'onValueChange' | 'children'>",
              description: 'Root Tabs attributes pass through.',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Use as a FILTER strip over one collection (a feed, a list) where each tab is a facet with a live count.',
            'Format counts in the caller (zero-pad, clamp at 99+) — the strip renders them verbatim.',
            'Render the filtered content OUTSIDE the strip; tab choice is the only state this owns.',
            'Keep the strip full-width so its underline hairline spans the content column.',
          ]}
          donts={[
            'Don’t use it for peer content panels — that’s the plain Tabs primitive.',
            'Don’t wrap tabs to a second line; the strip scrolls horizontally by design.',
            'Don’t compute counts inside the component — they are caller data.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Built on the Tabs primitive (Radix) — WAI-ARIA tabs pattern, roving tabindex, arrow-key navigation.',
            'Force-mounted contentless panels give every trigger a valid aria-controls target.',
            'Count badges are part of each tab’s accessible name, so counts are announced.',
            'Visible focus ring via the ring token; disabled tabs are skipped by keyboard navigation.',
            'Logical properties only — the strip mirrors correctly under RTL.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
