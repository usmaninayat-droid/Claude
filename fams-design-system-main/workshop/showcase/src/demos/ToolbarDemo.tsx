import { Toolbar, Button, type LayoutGap } from '@fams/ui-kit'
import {
  DocPage,
  DocSection,
  Prose,
  Gallery,
  Playground,
  PropsTable,
  Guidelines,
  A11yList,
  DevNote,
  Code,
} from '../docs'

const GAPS: LayoutGap[] = ['inline', 'field', 'section']
const JUSTIFY = ['start', 'center', 'end', 'between'] as const

type ToolbarControls = {
  justify: (typeof JUSTIFY)[number]
  gap: LayoutGap
}

/**
 * ToolbarDemo — a horizontal row of actions: dialog footers, card headers,
 * table row actions.
 */
export default function ToolbarDemo() {
  return (
    <DocPage
      title="Toolbar"
      badge="stable"
      summary="A horizontal row of actions — dialog footers, card headers, table row actions. Preset alignment and gap so a button row is never hand-spaced with space-x-* utilities or margins on individual buttons."
    >
      <DocSection id="playground" title="Playground">
        <Playground<ToolbarControls>
          controls={[
            { name: 'justify', type: 'select', default: 'end', options: JUSTIFY },
            { name: 'gap', type: 'select', default: 'inline', options: GAPS },
          ]}
        >
          {(v) => (
            <Toolbar
              justify={v.justify}
              gap={v.gap}
              className="w-full max-w-sm rounded-md border border-dashed border-border p-3"
            >
              <Button variant="secondary">Cancel</Button>
              <Button>Save</Button>
            </Toolbar>
          )}
        </Playground>
      </DocSection>

      <DocSection id="justify" title="Justify">
        <Prose>
          <Code>justify</Code> defaults to <Code>end</Code> — the common dialog/card-footer case.
        </Prose>
        <Gallery
          minColRem={14}
          items={JUSTIFY.map((justify) => ({
            label: `justify="${justify}"`,
            caption: justify === 'end' ? 'default' : undefined,
            node: (
              <Toolbar
                justify={justify}
                className="w-full max-w-52 rounded-md border border-dashed border-border p-3"
              >
                <Button variant="secondary">Cancel</Button>
                <Button>Save</Button>
              </Toolbar>
            ),
          }))}
        />
      </DocSection>

      <DocSection id="gap" title="Gap presets">
        <Prose>
          <Code>inline</Code> (8px, default — buttons sit close together), <Code>field</Code>{' '}
          (16px), and <Code>section</Code> (24px).
        </Prose>
        <Gallery
          minColRem={16}
          items={GAPS.map((gap) => ({
            label: `gap="${gap}"`,
            caption: gap === 'inline' ? 'default' : undefined,
            node: (
              <Toolbar
                justify="end"
                gap={gap}
                className="w-full max-w-60 rounded-md border border-dashed border-border p-3"
              >
                <Button variant="secondary">Cancel</Button>
                <Button variant="secondary">Save draft</Button>
                <Button>Save</Button>
              </Toolbar>
            ),
          }))}
        />
      </DocSection>

      <DocSection id="composition" title="Composition">
        <Prose>
          The <Code>border-t</Code> and <Code>pt-field</Code> come from the surrounding layout, not
          the Toolbar itself.
        </Prose>
        <Gallery
          minColRem={20}
          items={[
            {
              label: 'Card/dialog footer',
              node: (
                <Toolbar justify="end" className="w-full max-w-sm border-t border-border pt-field">
                  <Button variant="secondary">Cancel</Button>
                  <Button>Save</Button>
                </Toolbar>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            {
              prop: 'justify',
              type: "'start' | 'center' | 'end' | 'between'",
              default: "'end'",
              description: 'Main-axis alignment. end is the common dialog/card-footer case.',
            },
            {
              prop: 'gap',
              type: "'inline' | 'field' | 'section'",
              default: "'inline'",
              description: 'Semantic gap preset — inline keeps buttons sitting close together.',
            },
            {
              prop: '…props',
              type: 'HTMLAttributes<HTMLDivElement>',
              description: 'className, children, and any div attribute pass through.',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Use Toolbar for any row of action buttons — dialog footers, card headers, table rows.',
            'Keep the primary action last with justify="end" so it lands closest to reading direction end.',
            'Add border-t + pt-field on the wrapper when separating a footer from body content.',
            'Use gap="field" or "section" when the row mixes buttons with more breathing room (e.g. a card header).',
          ]}
          donts={[
            "Don't space buttons with space-x-* or margin on individual buttons — that's what gap is for.",
            "Don't put more than one primary-variant button in the same Toolbar.",
            "Don't use Toolbar for vertical stacks of actions — use Stack directly.",
            "Don't hardcode justify-end on a div; use the justify prop so it re-themes with the token.",
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Renders a plain <div> — no implicit role; each Button inside carries its own semantics.',
            'Tab order follows DOM order, matching the visual left-to-right (or mirrored RTL) reading order.',
            'Purely presentational alignment; never traps or reorders focus.',
            'justify="end" resolves to the visual left in RTL — logical alignment, no direction-specific overrides.',
          ]}
        />
      </DocSection>

      <DocSection id="notes" title="Developer notes">
        <DevNote>
          Toolbar is a thin, opinionated wrapper over <Code>Stack</Code> (
          <Code>direction="row"</Code> plus a <Code>justify</Code> prop) — reach for it whenever the
          content is specifically an action row, and drop to <Code>Stack</Code> directly for
          anything more general.
        </DevNote>
      </DocSection>
    </DocPage>
  )
}
