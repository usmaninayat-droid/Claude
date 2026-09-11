import { ScrollArea } from '../../../../packages/ui-kit/src/primitives/ScrollArea'
import { DocPage, DocSection, Prose, Gallery, PropsTable, Guidelines, A11yList, Code } from '../docs'

const ROWS = Array.from({ length: 40 }, (_, i) => `Row ${i + 1} — bin inspection entry`)
const COLUMNS = Array.from({ length: 24 }, (_, i) => `Column ${i + 1}`)

/**
 * ScrollAreaDemo — themed thin scrollbar over native overflow. Replaces two
 * parallel mechanisms across v5: `q-scroll-area` (51 files) and hand-rolled
 * `::-webkit-scrollbar` CSS (19 files, Webkit-only).
 */
export default function ScrollAreaDemo() {
  return (
    <DocPage
      title="ScrollArea"
      badge="stable"
      summary="Themed thin scrollbar over native overflow. Renders both a vertical and a horizontal track — whichever axis actually overflows is the one Radix shows — so one component covers tall lists, wide strips, and both at once. Replaces 51 files' q-scroll-area usage plus 19 files of hand-rolled Webkit-only scrollbar CSS."
    >
      <DocSection id="axes" title="Axes">
        <Prose>
          A fixed <Code>height</Code> overflows vertically; a fixed <Code>width</Code> overflows
          horizontally. Radix auto-hides whichever track has no overflow.
        </Prose>
        <Gallery
          minColRem={20}
          items={[
            {
              label: 'Vertical — tall list',
              caption: 'h-64 w-72',
              node: (
                <ScrollArea className="h-64 w-72 rounded-sm border border-border">
                  <div className="flex flex-col gap-2 p-4">
                    {ROWS.map((row) => (
                      <div key={row} className="text-body-sm text-foreground">
                        {row}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ),
            },
            {
              label: 'Horizontal — wide strip',
              caption: 'h-24 w-full max-w-xl',
              node: (
                <ScrollArea className="h-24 w-full max-w-xl rounded-sm border border-border">
                  <div className="flex gap-3 p-4">
                    {COLUMNS.map((col) => (
                      <div
                        key={col}
                        className="flex h-12 w-32 shrink-0 items-center justify-center rounded-xs bg-muted text-body-sm text-foreground"
                      >
                        {col}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            {
              prop: 'className',
              type: 'string',
              description: 'Sets the viewport bounds (height/width) that trigger overflow.',
            },
            {
              prop: 'dir',
              type: "'ltr' | 'rtl'",
              description: 'Direction hint passed through to Radix so the vertical track stays on the logical end edge.',
            },
            {
              prop: 'children',
              type: 'ReactNode',
              required: true,
              description: 'Content rendered inside the scrollable viewport.',
            },
            {
              prop: '…props',
              type: 'ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>',
              description: 'Native Radix ScrollArea root attributes (type, scrollHideDelay…) pass through.',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Constrain with a fixed height (vertical) or width (horizontal) via className.',
            'Use for tall lists, wide strips, menus, tab panels, and chart legends.',
            'Let both scrollbars coexist when content overflows in both directions.',
            'Pair with a border/rounded wrapper to keep the scroll region visually contained.',
          ]}
          donts={[
            'Don’t nest a ScrollArea inside another ScrollArea for the same axis.',
            'Don’t use it for the page-level scroll — reserve it for a bounded region.',
            'Don’t hardcode scrollbar colours; the thumb/track already use border tokens.',
            'Don’t rely on it for virtualization — it’s a styled overflow, not a windowing library.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Wraps native overflow scrolling — keyboard (arrow keys, Page Up/Down) and mouse-wheel scrolling both work unmodified.',
            'The custom thumb is presentational; the underlying viewport remains the real scroll container for assistive tech.',
            'Focusable content inside the viewport keeps normal tab order.',
            'Layout uses logical properties, so it mirrors correctly under RTL (switch the header language) — the vertical track tracks the logical end edge.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
