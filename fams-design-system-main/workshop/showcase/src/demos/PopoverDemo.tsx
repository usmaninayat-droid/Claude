import { Button, Popover, PopoverTrigger, PopoverContent, PopoverAnchor } from '@fams/ui-kit'
import { DocPage, DocSection, Prose, Gallery, PropsTable, Guidelines, A11yList, Code } from '../docs'

export default function PopoverDemo() {
  return (
    <DocPage
      title="Popover"
      badge="stable"
      summary="Radix-backed floating panel anchored to a trigger — non-modal, dismissed by outside-click or Escape. For filters, inline pickers, and lightweight detail flyouts that don't need Dialog's focus trap."
    >
      <DocSection id="preview" title="Preview">
        <Prose>
          Click the trigger to open; dismiss with an outside click or <Code>Escape</Code>.
        </Prose>
        <div className="flex min-h-40 items-center justify-center rounded-md border border-border bg-card p-10">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="secondary">Show details</Button>
            </PopoverTrigger>
            <PopoverContent>
              <p className="text-body-sm font-semibold text-foreground">Last reported</p>
              <p className="mt-1 text-body-sm text-muted-foreground">2 minutes ago from Lot 1, Gate 3.</p>
            </PopoverContent>
          </Popover>
        </div>
      </DocSection>

      <DocSection id="align" title="Align">
        <Prose>
          <Code>align</Code>: <Code>start</Code> / <Code>center</Code> (default) / <Code>end</Code> —
          resolved against the trigger's logical edges. Rendered with <Code>defaultOpen</Code> here so
          the anatomy is visible without a click.
        </Prose>
        <Gallery
          minColRem={12}
          items={[
            {
              label: 'start',
              node: (
                <Popover defaultOpen>
                  <PopoverTrigger asChild>
                    <Button variant="secondary">align=&quot;start&quot;</Button>
                  </PopoverTrigger>
                  <PopoverContent align="start">
                    <p className="text-body-sm text-muted-foreground">Aligned to the trigger&apos;s start edge.</p>
                  </PopoverContent>
                </Popover>
              ),
            },
            {
              label: 'center',
              caption: 'default',
              node: (
                <Popover defaultOpen>
                  <PopoverTrigger asChild>
                    <Button variant="secondary">align=&quot;center&quot;</Button>
                  </PopoverTrigger>
                  <PopoverContent align="center">
                    <p className="text-body-sm text-muted-foreground">Centered on the trigger.</p>
                  </PopoverContent>
                </Popover>
              ),
            },
            {
              label: 'end',
              node: (
                <Popover defaultOpen>
                  <PopoverTrigger asChild>
                    <Button variant="secondary">align=&quot;end&quot;</Button>
                  </PopoverTrigger>
                  <PopoverContent align="end">
                    <p className="text-body-sm text-muted-foreground">Aligned to the trigger&apos;s end edge.</p>
                  </PopoverContent>
                </Popover>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="anchor" title="PopoverAnchor">
        <Prose>
          Anchor the panel to a different element than the trigger — e.g. a table row while the
          trigger is a kebab button.
        </Prose>
        <Popover defaultOpen>
          <PopoverAnchor asChild>
            <div className="flex w-64 items-center justify-between rounded-sm border border-border px-3 py-2 text-body-sm text-foreground">
              Truck 07 — Lot 1
              <PopoverTrigger asChild>
                <Button size="icon" variant="ghost" aria-label="Row actions">
                  ⋮
                </Button>
              </PopoverTrigger>
            </div>
          </PopoverAnchor>
          <PopoverContent align="end">
            <p className="text-body-sm text-muted-foreground">Panel anchored to the row, not the button.</p>
          </PopoverContent>
        </Popover>
      </DocSection>

      <DocSection id="props" title="Props">
        <Prose>
          <Code>Popover</Code>, <Code>PopoverTrigger</Code>, and <Code>PopoverAnchor</Code> are Radix
          primitives re-exported as-is (<Code>Root</Code>/<Code>Trigger</Code>/<Code>Anchor</Code>).
          <Code>PopoverContent</Code> is the one styled, portalled piece:
        </Prose>
        <PropsTable
          rows={[
            {
              prop: 'align',
              type: "'start' | 'center' | 'end'",
              default: "'center'",
              description: "Alignment against the trigger's logical edges.",
            },
            {
              prop: 'sideOffset',
              type: 'number',
              default: '4',
              description: 'Distance in px between the trigger and the panel.',
            },
            {
              prop: '…props',
              type: 'ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>',
              description: 'className, side, collisionPadding, and every Radix Popover Content prop pass through.',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Use for filters, inline pickers, and lightweight detail flyouts.',
            'Use PopoverAnchor when the visual anchor (a row) differs from the trigger (a kebab button).',
            'Keep content short — a Popover is a flyout, not a form wizard.',
            'Wrap the trigger element with asChild so Popover attaches to it directly.',
          ]}
          donts={[
            'Don’t use Popover where a focus trap is required — use Dialog instead.',
            'Don’t nest a Popover trigger inside another Popover’s content without a clear anchor.',
            'Don’t rely on Popover for critical confirmations — it dismisses on outside click.',
            'Don’t hardcode pixel offsets outside sideOffset; let Radix collision-detect placement.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Focus moves into the panel on open and returns to the trigger on close.',
            'Escape closes the panel; outside click dismisses without trapping focus (non-modal).',
            'PopoverContent is portalled and announced via Radix’s built-in ARIA (role="dialog", aria-*).',
            'Icon-only triggers (e.g. the kebab button) still need an explicit aria-label.',
            'Placement uses logical alignment, so it mirrors correctly under RTL (switch the header language).',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
