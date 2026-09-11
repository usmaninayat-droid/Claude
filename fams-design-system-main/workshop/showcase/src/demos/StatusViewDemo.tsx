import { StatusView, Button } from '@fams/ui-kit'
import { DocPage, DocSection, Prose, Gallery, Playground, PropsTable, Guidelines, A11yList, Code } from '../docs'

/**
 * StatusViewDemo — standard component-page template for the StatusView
 * composite. Consolidates what used to be three near-identical pages
 * (EmptyState, ErrorState, NoPermission's block variant) into one.
 */

type StatusViewControls = {
  kind: 'empty' | 'error' | 'no-permission' | 'coming-soon'
  title: string
  description: string
}

export default function StatusViewDemo() {
  return (
    <DocPage
      title="StatusView"
      badge="stable"
      summary="The one full-page/full-panel status shape besides 'loaded with data': empty, error, no-permission, or coming-soon. Consolidates the former EmptyState, ErrorState, and NoPermission's block variant — icon + title + description + optional action, differing only in the kind's default icon/copy and (for error) an alert role."
    >
      <DocSection id="playground" title="Playground">
        <Playground<StatusViewControls>
          controls={[
            {
              name: 'kind',
              type: 'select',
              default: 'empty',
              options: ['empty', 'error', 'no-permission', 'coming-soon'],
            },
            { name: 'title', type: 'text', default: '' },
            { name: 'description', type: 'text', default: '' },
          ]}
        >
          {(v) => (
            <div className="w-full max-w-sm rounded-md border border-border p-6">
              <StatusView
                kind={v.kind}
                title={v.title || undefined}
                description={v.description || undefined}
                action={
                  v.kind === 'no-permission' || v.kind === 'coming-soon' ? undefined : (
                    <Button variant={v.kind === 'error' ? 'secondary' : 'primary'} size="sm">
                      {v.kind === 'error' ? 'Retry' : 'Create vehicle'}
                    </Button>
                  )
                }
              />
            </div>
          )}
        </Playground>
      </DocSection>

      <DocSection id="kinds" title="Kinds">
        <Prose>
          Each kind swaps the default icon, title, and description, and — for <Code>error</Code> —
          adds <Code>role="alert"</Code>. Override any piece per call site.
        </Prose>
        <Gallery
          minColRem={16}
          items={[
            {
              label: 'empty',
              node: <StatusView kind="empty" action={<Button size="sm">Create vehicle</Button>} />,
            },
            {
              label: 'error',
              caption: 'role="alert"',
              node: (
                <StatusView
                  kind="error"
                  action={
                    <Button variant="secondary" size="sm">
                      Retry
                    </Button>
                  }
                />
              ),
            },
            {
              label: 'no-permission',
              node: <StatusView kind="no-permission" description="Ask your admin for the Finance role." />,
            },
            {
              label: 'coming-soon',
              caption: 'brand-tinted chip',
              node: (
                <StatusView
                  kind="coming-soon"
                  subject="Zones Management"
                  description="This module hasn’t been built yet."
                />
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="coming-soon" title="Coming soon (no module is a dead click)">
        <Prose>
          <Code>coming-soon</Code> is the platform's one "not built yet" surface. It is the only
          forward-looking kind, so its icon chip reads in the brand tint (<Code>bg-secondary</Code>{' '}
          + <Code>text-primary</Code>) rather than the neutral muted chip. Pass{' '}
          <Code>subject</Code> and the title composes itself as
          "&lt;subject&gt; is coming soon", so every unbuilt module and settings panel in a product
          reads identically without per-call-site copy.
        </Prose>
        <Gallery
          minColRem={16}
          items={[
            { label: 'no subject', node: <StatusView kind="coming-soon" /> },
            {
              label: 'subject="Zones Management"',
              node: (
                <StatusView
                  kind="coming-soon"
                  subject="Zones Management"
                  description="Draw, edit and assign collection zones."
                />
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            {
              prop: 'kind',
              type: "'empty' | 'error' | 'no-permission' | 'coming-soon'",
              required: true,
              description:
                'Drives the default icon, title, description and icon-chip tone, and the alert role for error.',
            },
            {
              prop: 'subject',
              type: 'string',
              description:
                'What the status is about. coming-soon folds it into its default title ("<subject> is coming soon"); ignored once title is set.',
            },
            {
              prop: 'icon',
              type: 'ReactNode',
              description: 'Overrides the kind default icon.',
            },
            {
              prop: 'title',
              type: 'ReactNode',
              description: 'Overrides the kind default title.',
            },
            {
              prop: 'description',
              type: 'ReactNode',
              description: 'Overrides the kind default description.',
            },
            {
              prop: 'action',
              type: 'ReactNode',
              description: 'e.g. a "Create" button (empty) or a "Retry" button (error).',
            },
            {
              prop: '…props',
              type: "Omit<HTMLAttributes<HTMLDivElement>, 'title'>",
              description: 'className and any div attribute pass through the root element.',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Render StatusView instead of a bare blank list/table/panel, a console-only fetch error, or a raw 403.',
            'Pick the kind that matches why the surface isn’t showing data — empty, error, no-permission, or coming-soon.',
            'Render coming-soon (with subject) for a licensed-but-unbuilt module or settings panel — no module is a dead click.',
            'Pair empty and error with an action that resolves the state (create, retry) when one exists.',
            'Override icon/title/description with domain-specific copy when the generic wording is unclear.',
          ]}
          donts={[
            'Don’t use StatusView to gate a single control — that’s NoPermission’s inline shape.',
            'Don’t render a spinner-and-nothing state here — StatusView is for a resolved zero-rows/error/gated case, not loading.',
            'Don’t invent a new empty/error/no-permission layout per composite; this is the one shape.',
            'Don’t hardcode colours in a custom icon; use a token-driven muted-foreground or destructive icon like the defaults.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'error renders role="alert", announcing the failure to assistive tech as soon as it mounts.',
            'empty, no-permission and coming-soon render no ARIA role — the text content alone carries the meaning.',
            'The icon is always decorative; title and description are what assistive tech reads.',
            'The action, when present, is a normal focusable Button — no special wiring required.',
            'Layout is a centered logical-property stack, so it mirrors correctly under RTL (switch the header language).',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
