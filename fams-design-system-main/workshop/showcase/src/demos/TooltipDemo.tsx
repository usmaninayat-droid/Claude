import {
  Button,
  IconControl,
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
  TooltipSupport,
} from '@fams/ui-kit'
import { Demo } from '../showcase/kit'
import { DocPage, DocSection, Prose, Gallery, PropsTable, Guidelines, A11yList, Code } from '../docs'

/**
 * TooltipDemo — Radix-backed hover/focus hint. Wraps its own TooltipProvider
 * so callers don't have to mount one per usage — nest under one app-level
 * TooltipProvider to share a single delayDuration when many tooltips sit on
 * one screen.
 */
export default function TooltipDemo() {
  return (
    <DocPage
      title="Tooltip"
      badge="stable"
      summary="Radix-backed hover/focus hint. Wraps its own TooltipProvider so callers don't have to mount one per usage — nest under one app-level TooltipProvider to share a single delayDuration when many tooltips sit on one screen."
    >
      <DocSection id="preview" title="Preview">
        <Prose>Normal usage: hover or focus the trigger to reveal, 200ms delayDuration.</Prose>
        <Demo
          title="Icon trigger"
          hint="hover or focus the ? button"
          code={`<Tooltip>
  <TooltipTrigger asChild><Button variant="ghost" size="icon" aria-label="Info">?</Button></TooltipTrigger>
  <TooltipContent>Requires the Admin role</TooltipContent>
</Tooltip>`}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Info">
                ?
              </Button>
            </TooltipTrigger>
            <TooltipContent>Requires the Admin role</TooltipContent>
          </Tooltip>
        </Demo>
      </DocSection>

      <DocSection id="content" title="Content variations">
        <Prose>
          Rendered with <Code>open</Code> below so the anatomy is visible without a hover.
        </Prose>
        <Gallery
          minColRem={12}
          items={[
            {
              label: 'basic',
              node: (
                <TooltipProvider>
                  <Tooltip open>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label="Info">
                        ?
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Requires the Admin role</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ),
            },
            {
              label: 'with TooltipSupport',
              caption: 'secondary line',
              node: (
                <TooltipProvider>
                  <Tooltip open>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label="Info">
                        ?
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      Requires the Admin role
                      <TooltipSupport>Ask your project owner to grant access.</TooltipSupport>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ),
            },
            {
              label: 'showArrow={false}',
              caption: 'opt out of the default arrow',
              node: (
                <TooltipProvider>
                  <Tooltip open>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label="Info">
                        ?
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent showArrow={false}>Requires the Admin role</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="states" title="States">
        <Prose>
          Wrap a disabled control in a focusable <Code>span</Code> so pointer/focus events still reach
          the trigger — see <Code>NoPermission</Code>.
        </Prose>
        <Gallery
          minColRem={12}
          items={[
            {
              label: 'disabled trigger',
              caption: 'shown with reason',
              node: (
                <TooltipProvider>
                  <Tooltip open>
                    <TooltipTrigger asChild>
                      <span tabIndex={0} className="inline-flex">
                        <Button disabled>Approve</Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>Requires the Admin role</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="icon-control" title="IconControl — the icon-only recipe">
        <Prose>
          Every icon-only control owes the user two things: a specific accessible name and a
          tooltip that opens on hover <strong>and</strong> on keyboard focus. <Code>IconControl</Code>{' '}
          is the one place that pairing is applied — pass <Code>tip</Code> and it becomes both the
          tooltip copy and (unless <Code>name</Code> overrides it) the button&apos;s{' '}
          <Code>aria-label</Code>, so the two can never drift apart. Set <Code>menuTrigger</Code>{' '}
          when the control also opens a <Code>DropdownMenu</Code>: it keeps{' '}
          <Code>DropdownMenuTrigger</Code> outermost, which is what leaves{' '}
          <Code>data-state</Code> and the Escape/focus-restore path belonging to the menu rather
          than to the tooltip layer.
        </Prose>
        <Demo
          title="Named + tooltipped in one wrapper"
          hint="hover, then Tab to it — the tooltip opens both ways"
          code={`<IconControl tip="Filter">
  <Button variant="ghost" size="icon"><ListFilter /></Button>
</IconControl>`}
        >
          <IconControl tip="Filter">
            <Button variant="ghost" size="icon">
              ⛭
            </Button>
          </IconControl>
        </Demo>
        <Demo
          title="Name and tooltip deliberately differ"
          hint="the name states its subject, the tip explains the state"
          code={`<IconControl name="Fit all tasks in view" tip="No mapped tasks to frame">
  <Button variant="secondary" size="icon"><Maximize2 /></Button>
</IconControl>`}
        >
          <IconControl name="Fit all tasks in view" tip="No mapped tasks to frame">
            <Button variant="secondary" size="icon">
              ⤢
            </Button>
          </IconControl>
        </Demo>
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            {
              prop: 'delayDuration',
              type: 'number',
              default: '200',
              description: 'Tooltip wraps its own Provider set to 200ms hover/focus delay before showing.',
            },
            {
              prop: 'open / defaultOpen',
              type: 'boolean',
              description: 'Controlled or uncontrolled open state of the root.',
            },
            {
              prop: 'onOpenChange',
              type: '(open: boolean) => void',
              description: 'Fires when the tooltip opens or closes.',
            },
            {
              prop: 'TooltipTrigger asChild',
              type: 'boolean',
              description: 'Render the trigger as its child element via Radix Slot, keeping the child’s own styling.',
            },
            {
              prop: 'side',
              type: "'top' | 'right' | 'bottom' | 'left'",
              default: "'top'",
              description: 'TooltipContent. Preferred edge relative to the trigger.',
            },
            {
              prop: 'sideOffset',
              type: 'number',
              default: '6',
              description: 'TooltipContent. Distance in px between the trigger and the panel.',
            },
            {
              prop: 'showArrow',
              type: 'boolean',
              default: 'true',
              description:
                'TooltipContent. Renders a token-filled pointing arrow toward the trigger, on the side facing it — follows the computed placement automatically. Pass false to opt out.',
            },
            {
              prop: 'TooltipSupport',
              type: 'HTMLAttributes<HTMLParagraphElement>',
              description: 'Optional secondary muted line inside TooltipContent for a short reason plus extra context.',
            },
            {
              prop: '…props',
              type: 'ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>',
              description: 'Native Radix Tooltip Content attributes pass through.',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Wrap the trigger with asChild so the tooltip attaches to the real interactive element.',
            'Give icon-only triggers both an aria-label and a tooltip — the tooltip is a bonus, not a replacement.',
            'Use TooltipSupport for a short secondary reason, not a paragraph of content.',
            'Wrap a disabled trigger in a focusable span so the tooltip still reaches keyboard/pointer users.',
          ]}
          donts={[
            'Don’t put essential information only in a tooltip — hover/focus-only content isn’t discoverable on touch.',
            'Don’t nest interactive controls (buttons, links) inside TooltipContent.',
            'Don’t use Tooltip for anything requiring a click to dismiss — that’s Popover.',
            'Don’t override delayDuration per-tooltip when many sit on one screen; share one app-level TooltipProvider.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Built on Radix Tooltip — role="tooltip" and the aria-describedby link are wired automatically.',
            'Shows on both hover and keyboard focus, not just mouse hover.',
            'Escape dismisses an open tooltip without moving focus.',
            'Disabled native triggers block pointer/focus events — wrap them in a focusable span so the tooltip still fires.',
            'Positioning uses logical side offsets, so it mirrors correctly under RTL (switch the header language).',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
