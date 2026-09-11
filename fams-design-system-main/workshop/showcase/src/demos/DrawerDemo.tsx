import { Button } from '../../../../packages/ui-kit/src/primitives/Button'
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from '../../../../packages/ui-kit/src/primitives/Drawer'
import { DocPage, DocSection, Prose, Gallery, PropsTable, Guidelines, A11yList, Code } from '../docs'

/**
 * DrawerDemo — gesture-driven bottom sheet built on vaul, ported from
 * `FAMS-Design-System-By-Shaheer` (phase 1 §6). Sibling of Sheet: reach for
 * this when the panel should be swipeable (mobile quick actions), Sheet for
 * a standard (non-gesture) side panel.
 */
export default function DrawerDemo() {
  return (
    <DocPage
      title="Drawer"
      badge="stable"
      summary="Gesture-driven bottom sheet built on vaul — drag-to-dismiss, swipe-friendly quick-action panel. Ported from FAMS-Design-System-By-Shaheer's vaul-based drawer, restyled onto tokens."
    >
      <DocSection id="preview" title="Preview">
        <Prose>
          Defaults to <Code>direction=&quot;bottom&quot;</Code> with a drag handle — swipe down (or click the
          close button) to dismiss.
        </Prose>
        <div className="flex min-h-40 items-center justify-center rounded-md border border-border bg-card p-10">
          <Drawer>
            <DrawerTrigger asChild>
              <Button>Open quick actions</Button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Quick actions</DrawerTitle>
                <DrawerDescription>Choose what to do with the selected stops.</DrawerDescription>
              </DrawerHeader>
              <div className="p-6 text-body-sm text-muted-foreground">Body content goes here.</div>
              <DrawerFooter>
                <DrawerClose asChild>
                  <Button variant="tertiary">Cancel</Button>
                </DrawerClose>
                <Button>Confirm</Button>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        </div>
      </DocSection>

      <DocSection id="directions" title="Directions">
        <Prose>
          Scoped to <Code>bottom</Code> (default) and <Code>top</Code> — the directions vaul's underlying
          drag axis carries no RTL ambiguity for. Use <Code>Sheet</Code> for a logical, RTL-flipping
          left/right side panel.
        </Prose>
        <Gallery
          minColRem={12}
          items={[
            {
              label: 'bottom (default)',
              node: (
                <Drawer>
                  <DrawerTrigger asChild>
                    <Button variant="secondary">Open bottom</Button>
                  </DrawerTrigger>
                  <DrawerContent>
                    <DrawerHeader>
                      <DrawerTitle>Bulk action</DrawerTitle>
                      <DrawerDescription>3 stops selected.</DrawerDescription>
                    </DrawerHeader>
                    <DrawerFooter>
                      <DrawerClose asChild>
                        <Button variant="tertiary">Cancel</Button>
                      </DrawerClose>
                      <Button variant="destructive">Remove</Button>
                    </DrawerFooter>
                  </DrawerContent>
                </Drawer>
              ),
            },
            {
              label: 'top',
              node: (
                <Drawer>
                  <DrawerTrigger asChild>
                    <Button variant="secondary">Open top</Button>
                  </DrawerTrigger>
                  <DrawerContent direction="top">
                    <DrawerHeader>
                      <DrawerTitle>Announcement</DrawerTitle>
                      <DrawerDescription>Scheduled maintenance tonight 22:00–23:00.</DrawerDescription>
                    </DrawerHeader>
                  </DrawerContent>
                </Drawer>
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
              label: 'hideHandle + hideClose',
              caption: 'caller supplies its own dismissal action, no drag handle chrome',
              node: (
                <Drawer>
                  <DrawerTrigger asChild>
                    <Button variant="secondary">Open plain drawer</Button>
                  </DrawerTrigger>
                  <DrawerContent hideHandle hideClose>
                    <DrawerHeader>
                      <DrawerTitle>Confirm dispatch</DrawerTitle>
                      <DrawerDescription>Only dismissible via the footer actions.</DrawerDescription>
                    </DrawerHeader>
                    <DrawerFooter>
                      <DrawerClose asChild>
                        <Button variant="tertiary">Cancel</Button>
                      </DrawerClose>
                      <Button>Dispatch</Button>
                    </DrawerFooter>
                  </DrawerContent>
                </Drawer>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            { prop: 'open', type: 'boolean', description: 'Drawer (root). Controlled open state.' },
            { prop: 'defaultOpen', type: 'boolean', description: 'Drawer (root). Uncontrolled initial open state.' },
            {
              prop: 'onOpenChange',
              type: '(open: boolean) => void',
              description: 'Drawer (root). Fires when the drawer opens or closes.',
            },
            {
              prop: 'shouldScaleBackground',
              type: 'boolean',
              default: 'false',
              description: 'Drawer (root). vaul option to scale the page behind the drawer — off by default to avoid surprising layout shift.',
            },
            {
              prop: 'direction',
              type: "'bottom' | 'top'",
              default: "'bottom'",
              description: 'DrawerContent. Edge the panel anchors to and drags from — see Directions above for scope.',
            },
            {
              prop: 'hideHandle',
              type: 'boolean',
              default: 'false',
              description: 'DrawerContent. Hides the built-in drag handle.',
            },
            {
              prop: 'hideClose',
              type: 'boolean',
              default: 'false',
              description: 'DrawerContent. Hides the built-in close button.',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Use Drawer for mobile-first, swipe-to-dismiss quick actions and bottom-anchored pickers.',
            'Use DrawerHeader/DrawerTitle/DrawerDescription for the standard title + subtitle chrome.',
            'Wrap the dismiss/cancel action in DrawerClose asChild so it closes without extra state.',
          ]}
          donts={[
            'Don’t use Drawer for a standard desktop side panel — that’s Sheet (logical, RTL-flipping left/right).',
            'Don’t reach for direction="left"/"right" expecting RTL auto-flip — vaul’s direction is physical; Sheet is the RTL-safe choice for side panels.',
            'Don’t stack two Drawers open at once; close the first before opening a second.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Built on vaul, itself built on Radix Dialog underneath — traps focus inside the panel while open and restores it to the trigger on close.',
            'Escape closes the drawer; clicking the overlay closes it unless dismissible is set to false.',
            'DrawerTitle and DrawerDescription wire aria-labelledby / aria-describedby automatically.',
            'The close button and drag handle both carry accessible names/aria-hidden as appropriate.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
