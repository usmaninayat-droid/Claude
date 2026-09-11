import { CustomScrollbar } from '@fams/ui-kit'
import { DocPage, DocSection, Prose, Gallery, PropsTable, Guidelines, A11yList, Code } from '../docs'

const LINES = Array.from({ length: 40 }, (_, i) => `Row ${i + 1} — overlay scrollbars never reserve gutter space.`)

/**
 * CustomScrollbarDemo — hover-revealed overlay scroll container (DS V2
 * "Scroll bar"): native bar hidden, absolutely-positioned thumbs driven from
 * scroll metrics, revealed on hover (desktop) or while scrolling (touch).
 */
export default function CustomScrollbarDemo() {
  return (
    <DocPage
      title="CustomScrollbar"
      badge="stable"
      summary="Overlay scroll container with hover-revealed, draggable thumbs. Never reserves gutter space, auto-hides when idle, and keeps wheel/trackpad/keyboard scrolling intact."
    >
      <DocSection id="examples" title="Examples">
        <Prose>
          Give the component a bounded height and hover it — the thumb fades in over the
          content. Pass <Code>thumbClassName</Code> to restyle (or hide) the thumb, and{' '}
          <Code>axis</Code> to limit which axes show an affordance.
        </Prose>
        <Gallery
          minColRem={18}
          items={[
            {
              label: 'vertical',
              caption: 'hover to reveal the thumb',
              node: (
                <CustomScrollbar className="h-48 w-full rounded-md border border-border bg-card">
                  <div className="flex flex-col gap-1 p-3 text-sm text-foreground">
                    {LINES.map((l) => (
                      <p key={l}>{l}</p>
                    ))}
                  </div>
                </CustomScrollbar>
              ),
            },
            {
              label: 'horizontal',
              caption: 'wide content, inner x-scroll',
              node: (
                <CustomScrollbar className="h-24 w-full rounded-md border border-border bg-card">
                  <div className="flex w-max gap-2 p-3">
                    {Array.from({ length: 20 }, (_, i) => (
                      <span key={i} className="rounded-md bg-muted px-4 py-2 text-sm whitespace-nowrap">
                        Chip {i + 1}
                      </span>
                    ))}
                  </div>
                </CustomScrollbar>
              ),
            },
            {
              label: 'styled thumb',
              caption: 'thumbClassName="bg-primary/40"',
              node: (
                <CustomScrollbar className="h-48 w-full rounded-md border border-border bg-card" thumbClassName="bg-primary/40">
                  <div className="flex flex-col gap-1 p-3 text-sm text-foreground">
                    {LINES.slice(0, 24).map((l) => (
                      <p key={l}>{l}</p>
                    ))}
                  </div>
                </CustomScrollbar>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            { prop: 'children', type: 'ReactNode', description: 'Scrollable content.' },
            { prop: 'className', type: 'string', description: 'Outer wrapper — put sizing, border and radius here. Must bound the height/width or nothing scrolls.' },
            { prop: 'viewportClassName', type: 'string', description: 'The scrolling viewport itself (e.g. inner padding, flex layout).' },
            { prop: 'thumbClassName', type: 'string', description: 'Thumb restyle/override (e.g. bg-white/30 on a dark rail, bg-transparent to hide the affordance while keeping scroll).' },
            { prop: 'axis', type: "'both' | 'vertical' | 'horizontal'", description: 'Which axes get a thumb affordance (default both). Content can still scroll on a hidden axis.' },
            { prop: 'ref', type: 'Ref<CustomScrollbarHandle>', description: 'Forwarded to the scrolling viewport element for programmatic scrollTo.' },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Use for dense surfaces where a permanent native bar adds noise (rails, palettes, launch pads, tables).',
            'Put sizing and borders on className; the component needs a bounded box to scroll.',
          ]}
          donts={[
            "Don't nest two CustomScrollbars on the same axis — one scroll container per region.",
            "Don't use it to hide real overflow problems — content that should fit should fit.",
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Wheel, trackpad and keyboard scrolling keep working — the overlay is pointer-events:none; only the thumbs opt back in.',
            'The thumb layer is aria-hidden: it is a redundant pointer affordance, not the scroll mechanism.',
            'On touch devices the thumb hit area widens to 16px and reveals while scrolling (no hover there).',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
