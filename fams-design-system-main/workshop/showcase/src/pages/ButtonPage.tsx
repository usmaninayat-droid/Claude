import { Button } from '@fams/ui-kit'
import { Plus, Search, Download } from '@fams/ui-kit/icons'
import { Demo } from '../showcase/kit'
import { DocPage, DocSection, Prose, Gallery, Playground, PropsTable, Guidelines, A11yList, DevNote, Code } from '../docs'

const VARIANTS = ['primary', 'secondary', 'tertiary', 'ghost', 'destructive', 'link'] as const

type ButtonControls = {
  variant: (typeof VARIANTS)[number]
  size: 'sm' | 'md' | 'lg'
  loading: boolean
  disabled: boolean
  label: string
}

export function ButtonPage() {
  return (
    <DocPage
      title="Button"
      badge="stable"
      summary="Triggers an action or event. The primary interactive control across every FAMS product — six semantic variants, four sizes, all token-driven."
    >
      {/* 1 — Playground */}
      <DocSection id="playground" title="Playground">
        <Playground<ButtonControls>
          controls={[
            { name: 'variant', type: 'select', default: 'primary', options: VARIANTS },
            { name: 'size', type: 'select', default: 'md', options: ['sm', 'md', 'lg'] },
            { name: 'loading', type: 'boolean', default: false },
            { name: 'disabled', type: 'boolean', default: false },
            { name: 'label', type: 'text', default: 'Save plan' },
          ]}
        >
          {(v) => (
            <Button variant={v.variant} size={v.size} loading={v.loading} disabled={v.disabled}>
              {v.label}
            </Button>
          )}
        </Playground>
      </DocSection>

      {/* 2 — Usage */}
      <DocSection id="usage" title="Usage">
        <Prose>
          Import from <Code>@fams/ui-kit</Code>. The variant and size map to semantic tokens, so the
          button re-themes per tenant with no code change.
        </Prose>
        <Demo
          title="Basic"
          code={`import { Button } from '@fams/ui-kit'

export function SaveBar() {
  return <Button onClick={save}>Save plan</Button>
}`}
        >
          <Button>Save plan</Button>
        </Demo>
      </DocSection>

      {/* 2b — asChild */}
      <DocSection id="as-child" title="asChild">
        <Prose>
          <Code>asChild</Code> merges Button's classes/props onto its single child instead of
          rendering a <Code>{'<button>'}</Code> — the correct shape for a link-styled button that
          needs to actually be an anchor, e.g. a table-row link. The child must be exactly one
          element.
        </Prose>
        <Demo
          title="Row link"
          code={`import { Button } from '@fams/ui-kit'

<Button asChild variant="link" size="sm">
  <a href={\`/records/\${id}\`}>View record</a>
</Button>`}
        >
          <Button asChild variant="link" size="sm">
            <a href="#view-record">View record</a>
          </Button>
        </Demo>
        <Prose>
          <Code>loading</Code>/<Code>isLoading</Code> are not supported together with{' '}
          <Code>asChild</Code>: the spinner would be a second child, and a slotted child can only
          ever be one element. That combination logs a dev warning and drops the spinner, while
          still applying <Code>aria-busy</Code>/<Code>aria-disabled</Code> to the child.
        </Prose>
      </DocSection>

      {/* 3 — Variants */}
      <DocSection id="variants" title="Variants">
        <Prose>Six semantic variants, each mapped to tokens so they re-theme per tenant.</Prose>
        <Gallery
          minColRem={9}
          items={VARIANTS.map((v) => ({
            label: v,
            node: (
              <Button variant={v} className="capitalize">
                {v}
              </Button>
            ),
          }))}
        />
      </DocSection>

      {/* 4 — Sizes & states */}
      <DocSection id="sizes" title="Sizes & states">
        <Gallery
          minColRem={9}
          items={[
            { label: 'sm', node: <Button size="sm">Small</Button> },
            { label: 'md', caption: 'default', node: <Button size="md">Medium</Button> },
            { label: 'lg', node: <Button size="lg">Large</Button> },
            {
              label: 'icon',
              node: (
                <Button size="icon" aria-label="Add asset">
                  <Plus />
                </Button>
              ),
            },
            { label: 'loading', node: <Button loading>Saving…</Button> },
            { label: 'disabled', node: <Button disabled>Disabled</Button> },
            {
              label: 'with icon',
              node: (
                <Button>
                  <Search /> Search
                </Button>
              ),
            },
            {
              label: 'tertiary + icon',
              node: (
                <Button variant="tertiary">
                  <Download /> Export
                </Button>
              ),
            },
          ]}
        />
      </DocSection>

      {/* 4 — Props / API */}
      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            {
              prop: 'variant',
              type: "'primary' | 'secondary' | 'tertiary' | 'ghost' | 'destructive' | 'link'",
              default: "'primary'",
              description: 'Visual style, mapped to semantic tokens.',
            },
            {
              prop: 'size',
              type: "'sm' | 'md' | 'lg' | 'icon'",
              default: "'md'",
              description: 'Control height and padding. Use icon for square icon-only buttons.',
            },
            {
              prop: 'loading',
              type: 'boolean',
              default: 'false',
              description: 'Shows a spinner and disables interaction while an async action runs.',
            },
            {
              prop: 'disabled',
              type: 'boolean',
              default: 'false',
              description: 'Native disabled state — non-interactive, dimmed.',
            },
            {
              prop: 'asChild',
              type: 'boolean',
              default: 'false',
              description: 'Render as the child element (e.g. a link) via Base UI useRender, keeping button styling.',
            },
            {
              prop: '…props',
              type: 'ButtonHTMLAttributes',
              description: 'All native button attributes (onClick, type, aria-*, form…) pass through.',
            },
          ]}
        />
        <Prose>
          <Code>isLoading</Code> and <Code>isDisabled</Code> exist as deprecated aliases for
          back-compat — prefer <Code>loading</Code> and native <Code>disabled</Code> in new code.
        </Prose>
      </DocSection>

      {/* 5 — Guidelines */}
      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Use one primary button per view for the main action.',
            'Lead with a verb — “Save plan”, “Export CSV”, “Delete route”.',
            'Use destructive only for irreversible actions.',
            'Give icon-only buttons an aria-label.',
          ]}
          donts={[
            'Don’t stack multiple primary buttons competing for attention.',
            'Don’t use a button for navigation — use a link (or asChild with an anchor).',
            'Don’t hardcode colours; the variant already carries the token.',
            'Don’t disable a button without making the reason obvious nearby.',
          ]}
        />
      </DocSection>

      {/* 6 — Accessibility */}
      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Renders a native <button> — full keyboard support (Enter / Space) for free.',
            'Visible focus ring via the ring token; never removed.',
            'loading sets aria-busy so assistive tech announces the pending state.',
            'Icon-only buttons require an aria-label; the label is the action, not the icon name.',
            'Meets WCAG 2.2 AA contrast in every variant across all tenants.',
          ]}
        />
      </DocSection>

      {/* 7 — Developer notes */}
      <DocSection id="notes" title="Developer notes">
        <DevNote>
          Built on a native button with <Code>class-variance-authority</Code> for variants and{' '}
          <Code>cn()</Code> for class merging. Supports <Code>asChild</Code> via Base UI's{' '}
          <Code>useRender</Code>. Colours come only from tokens (<Code>bg-primary</Code>,{' '}
          <Code>text-primary-foreground</Code>, …) — that is why it re-themes per tenant with zero
          overrides. Related: <Code>Label</Code>, and any form control that pairs with a submit action.
        </DevNote>
      </DocSection>
    </DocPage>
  )
}
