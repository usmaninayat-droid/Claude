import { useState } from 'react'
import { Button } from '../../../../packages/ui-kit/src/primitives/Button'
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from '../../../../packages/ui-kit/src/primitives/Sheet'
import { DockedPanel, DockedPanelHeader } from '../../../../packages/ui-kit/src/primitives/DockedPanel'
import { DocPage, DocSection, Prose, Gallery, PropsTable, Guidelines, A11yList, Code } from '../docs'

/** Live toggle for the "Docked (no-scrim)" section below — `DockedPanel` has no trigger/portal of its own (Rule 8: state-agnostic), so the demo owns `open`/`expanded` itself, same as any real caller would. */
function DockedPanelPreview() {
  const [open, setOpen] = useState(true)
  const [expanded, setExpanded] = useState(true)
  return (
    <div className="relative flex h-80 items-stretch overflow-hidden rounded-md border border-border bg-muted/40">
      <div className="flex flex-1 items-center justify-center p-4 text-body-sm text-muted-foreground">
        Page content stays live — pan/scroll/click all still work beside the panel.
        {!open ? (
          <Button className="absolute bottom-4 start-4" variant="secondary" onClick={() => setOpen(true)}>
            Reopen
          </Button>
        ) : null}
      </div>
      <DockedPanel open={open} onClose={() => setOpen(false)} expanded={expanded} width="18.75rem">
        <DockedPanelHeader
          expanded={expanded}
          onExpandedChange={setExpanded}
          onClose={() => setOpen(false)}
        >
          <span className="truncate text-body-sm font-semibold text-foreground">Qatar University</span>
        </DockedPanelHeader>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 text-body-sm text-muted-foreground">
          No scrim, no focus trap, no portal — a real flex sibling of the page it docks beside.
        </div>
      </DockedPanel>
    </div>
  )
}

/**
 * SheetDemo — side-anchored overlay panel, the generic replacement for v5's
 * ~25 forked entity/creation drawers. Same Radix Dialog primitive as Dialog,
 * anchored to an edge instead of centered.
 */
export default function SheetDemo() {
  return (
    <DocPage
      title="Sheet"
      badge="stable"
      summary="Side-anchored overlay panel — the generic replacement for v5's ~25 forked entity/creation drawers (EntityLinkingDrawer, ConfigDrawer, ApiSelectDrawer, TicketCreateDrawer, and more). Same Radix Dialog primitive as Dialog, anchored to an edge instead of centered."
    >
      <DocSection id="preview" title="Preview">
        <Prose>
          <Code>side="right"</Code> (default) is the common case — entity detail / edit panel.
        </Prose>
        <div className="flex min-h-40 items-center justify-center rounded-md border border-border bg-card p-10">
          <Sheet>
            <SheetTrigger asChild>
              <Button>Open entity</Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Truck 04-12</SheetTitle>
                <SheetDescription>Update linked asset details.</SheetDescription>
              </SheetHeader>
              <div className="p-6 text-body-sm text-muted-foreground">Body content goes here.</div>
              <SheetFooter>
                <SheetClose asChild>
                  <Button variant="tertiary">Cancel</Button>
                </SheetClose>
                <Button>Save</Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      </DocSection>

      <DocSection id="sides" title="Sides">
        <Prose>
          <Code>left</Code>/<Code>right</Code> are expressed as logical start/end positions, so the panel
          — and its slide direction — flips automatically under RTL. <Code>top</Code>/<Code>bottom</Code>{' '}
          are direction-neutral.
        </Prose>
        <Gallery
          minColRem={12}
          items={[
            {
              label: 'left',
              node: (
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="secondary">Open filters</Button>
                  </SheetTrigger>
                  <SheetContent side="left">
                    <SheetHeader>
                      <SheetTitle>Filters</SheetTitle>
                      <SheetDescription>Narrow the route list.</SheetDescription>
                    </SheetHeader>
                    <div className="p-6 text-body-sm text-muted-foreground">Filter fields go here.</div>
                    <SheetFooter>
                      <SheetClose asChild>
                        <Button variant="tertiary">Close</Button>
                      </SheetClose>
                      <Button>Apply</Button>
                    </SheetFooter>
                  </SheetContent>
                </Sheet>
              ),
            },
            {
              label: 'top',
              node: (
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="secondary">Open top</Button>
                  </SheetTrigger>
                  <SheetContent side="top">
                    <SheetHeader>
                      <SheetTitle>Announcement</SheetTitle>
                      <SheetDescription>Scheduled maintenance tonight 22:00–23:00.</SheetDescription>
                    </SheetHeader>
                  </SheetContent>
                </Sheet>
              ),
            },
            {
              label: 'bottom',
              node: (
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="secondary">Open bottom</Button>
                  </SheetTrigger>
                  <SheetContent side="bottom">
                    <SheetHeader>
                      <SheetTitle>Bulk action</SheetTitle>
                      <SheetDescription>3 stops selected.</SheetDescription>
                    </SheetHeader>
                    <SheetFooter>
                      <SheetClose asChild>
                        <Button variant="tertiary">Cancel</Button>
                      </SheetClose>
                      <Button variant="destructive">Remove</Button>
                    </SheetFooter>
                  </SheetContent>
                </Sheet>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="options" title="Options">
        <Gallery
          minColRem={14}
          items={[
            {
              label: 'hideClose',
              caption: 'caller supplies its own dismissal action',
              node: (
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="secondary">Open without close button</Button>
                  </SheetTrigger>
                  <SheetContent hideClose>
                    <SheetHeader>
                      <SheetTitle>Confirm dispatch</SheetTitle>
                      <SheetDescription>Only dismissible via the footer actions.</SheetDescription>
                    </SheetHeader>
                    <SheetFooter>
                      <SheetClose asChild>
                        <Button variant="tertiary">Cancel</Button>
                      </SheetClose>
                      <Button>Dispatch</Button>
                    </SheetFooter>
                  </SheetContent>
                </Sheet>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="docked" title="Docked (no-scrim)">
        <Prose>
          <Code>DockedPanel</Code> is the non-modal counterpart to <Code>Sheet</Code> — no portal, no scrim, no
          focus trap. It renders as a real layout sibling for record-detail surfaces that dock beside a still-live
          page (a map that keeps panning, a list that keeps scrolling) instead of covering it, e.g. the weather
          station drawer and the incident Task Detail sheet when opened from a hybrid map view. Escape still
          closes it; <Code>expanded</Code> toggles the "grow from the bottom" ↔ full-height states via{' '}
          <Code>DockedPanelHeader</Code>'s optional expand button.
        </Prose>
        <DockedPanelPreview />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            {
              prop: 'open',
              type: 'boolean',
              description: 'Sheet (root). Controlled open state.',
            },
            {
              prop: 'defaultOpen',
              type: 'boolean',
              description: 'Sheet (root). Uncontrolled initial open state.',
            },
            {
              prop: 'onOpenChange',
              type: '(open: boolean) => void',
              description: 'Sheet (root). Fires when the sheet opens or closes.',
            },
            {
              prop: 'side',
              type: "'top' | 'bottom' | 'left' | 'right'",
              default: "'right'",
              description: 'SheetContent. Edge the panel anchors to; left/right use logical start/end so they flip under RTL.',
            },
            {
              prop: 'hideClose',
              type: 'boolean',
              default: 'false',
              description: 'SheetContent. Hides the built-in close button when the caller supplies its own dismissal action.',
            },
            {
              prop: '…props',
              type: 'ComponentPropsWithoutRef<typeof DialogPrimitive.Content>',
              description: 'Native Radix Dialog Content attributes (onEscapeKeyDown, onPointerDownOutside…) pass through.',
            },
            {
              prop: 'open',
              type: 'boolean',
              description: 'DockedPanel. Controlled open state — no trigger/portal, so the caller owns this (Rule 8).',
            },
            {
              prop: 'onClose',
              type: '() => void',
              description: 'DockedPanel. Fires on Escape or the header close button.',
            },
            {
              prop: 'width',
              type: 'string',
              default: "'34.375rem'",
              description: 'DockedPanel. Panel inline-size (CSS length) — the design\'s 550px default.',
            },
            {
              prop: 'expanded',
              type: 'boolean',
              default: 'true',
              description: 'DockedPanel. Full block height (true) vs. bottom-anchored partial height (false).',
            },
            {
              prop: 'onExpandedChange',
              type: '(expanded: boolean) => void',
              description: "DockedPanelHeader. Presence alone shows the expand/restore toggle button.",
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Use SheetHeader/SheetTitle/SheetDescription for the standard title + subtitle chrome.',
            'Use side="right" for entity detail/edit panels — the default and most common case.',
            'Wrap the dismiss/cancel action in SheetClose asChild so it closes without extra state.',
            'Use hideClose only when the footer already offers an unambiguous way out.',
          ]}
          donts={[
            'Don’t use Sheet for a centered confirmation — that’s Dialog or AlertDialog.',
            'Don’t stack two Sheets open at once; close the first before opening a second.',
            'Don’t hardcode a fixed left/right side when the layout needs to support RTL — the logical side does it for you.',
            'Don’t omit SheetDescription when the title alone doesn’t explain the panel’s purpose.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Built on Radix Dialog — traps focus inside the panel while open and restores it to the trigger on close.',
            'Escape closes the sheet; clicking the overlay closes it unless a footer action requires an explicit choice.',
            'SheetTitle and SheetDescription wire aria-labelledby / aria-describedby automatically.',
            'The close button carries an explicit aria-label ("Close") since it is icon-only.',
            'side="left"/"right" use logical start/end, so the panel and its slide direction mirror correctly under RTL (switch the header language); top/bottom are direction-neutral.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
