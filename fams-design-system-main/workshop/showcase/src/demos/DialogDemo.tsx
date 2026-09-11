import {
  Button,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@fams/ui-kit'
import { DocPage, DocSection, Prose, Gallery, PropsTable, Guidelines, A11yList, Code } from '../docs'

/**
 * DialogDemo — modal overlay built on Radix Dialog. See
 * docs/COMPONENT-GUIDE.md for the standard component-page template.
 */
export default function DialogDemo() {
  return (
    <DocPage
      title="Dialog"
      badge="stable"
      summary="Centered modal overlay built on Radix Dialog. Traps focus, dismissible via outside-click, Escape, or the close button — for confirmations, forms, and detail views that don't need AlertDialog's stricter no-outside-click guarantee."
    >
      <DocSection id="preview" title="Preview">
        <Prose>
          Click the trigger to open. Dismiss via the close button, Escape, or an outside click —
          focus is trapped inside while open and returns to the trigger on close.
        </Prose>
        <Dialog>
          <DialogTrigger asChild>
            <Button>Unlink device</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Unlink this device?</DialogTitle>
              <DialogDescription>
                The device will stop reporting to this vehicle immediately. This can be undone by
                relinking it.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="secondary">Cancel</Button>
              </DialogClose>
              <Button variant="destructive">Unlink</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DocSection>

      <DocSection id="variants" title="Variants">
        <Prose>
          <Code>hideClose</Code> omits the top-right close button when the footer already supplies
          dismissal; a header-only dialog works for read-only detail views that need no action.
        </Prose>
        <Gallery
          minColRem={14}
          items={[
            {
              label: 'hideClose',
              caption: 'footer supplies dismissal',
              node: (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="secondary">Confirm dispatch</Button>
                  </DialogTrigger>
                  <DialogContent hideClose>
                    <DialogHeader>
                      <DialogTitle>Confirm dispatch</DialogTitle>
                      <DialogDescription>Only dismissible via the footer actions.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button variant="secondary">Cancel</Button>
                      </DialogClose>
                      <Button>Dispatch</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              ),
            },
            {
              label: 'No footer',
              caption: 'read-only detail view',
              node: (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="secondary">View route summary</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Route summary</DialogTitle>
                      <DialogDescription>Lot 2 · Tuesday collection</DialogDescription>
                    </DialogHeader>
                    <p className="text-body-sm text-muted-foreground">
                      14 stops · 3 bins flagged for missed collection · ETA 11:40.
                    </p>
                  </DialogContent>
                </Dialog>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            {
              prop: 'Dialog',
              type: 'Radix Dialog.Root props',
              description: 'open, defaultOpen, onOpenChange, modal — the root controls open state.',
            },
            {
              prop: 'DialogTrigger',
              type: 'Radix Dialog.Trigger props',
              description: 'asChild renders the trigger as its child element instead of a wrapping button.',
            },
            {
              prop: 'DialogContent',
              type: 'ComponentPropsWithoutRef<typeof DialogPrimitive.Content>',
              description: 'The centered, focus-trapped panel. Includes the overlay and portal automatically.',
            },
            {
              prop: 'hideClose',
              type: 'boolean',
              default: 'false',
              description:
                'Omits the top-right close button — caller supplies its own dismissal action in the footer.',
            },
            {
              prop: 'DialogHeader',
              type: 'HTMLAttributes<HTMLDivElement>',
              description: 'Title + description wrapper, start-aligned text.',
            },
            {
              prop: 'DialogFooter',
              type: 'HTMLAttributes<HTMLDivElement>',
              description: 'Action row — stacks on mobile, right-aligned on larger screens.',
            },
            {
              prop: 'DialogTitle',
              type: 'Radix Dialog.Title props',
              description: 'Required — supplies the dialog’s accessible name.',
            },
            {
              prop: 'DialogDescription',
              type: 'Radix Dialog.Description props',
              description: 'Optional — supplies the dialog’s accessible description.',
            },
            {
              prop: 'DialogClose',
              type: 'Radix Dialog.Close props',
              description: 'asChild renders any element as a dismiss trigger (e.g. the Cancel button).',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Always give a Dialog a DialogTitle — it is the accessible name, even if visually de-emphasized.',
            'Use for confirmations, forms, and detail views that allow outside-click to dismiss.',
            'Put the primary action on the right/end of the footer, Cancel on the left/start.',
            'Use hideClose only when the footer already offers an unambiguous way out.',
          ]}
          donts={[
            'Don’t use Dialog for destructive actions that must never be dismissed accidentally — use AlertDialog.',
            'Don’t stack a Dialog inside another Dialog.',
            'Don’t omit DialogDescription when the title alone doesn’t explain the consequence.',
            'Don’t put more than one primary action in the footer.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Focus is trapped inside the content while open and returns to the trigger on close.',
            'Escape and outside-click both dismiss, in addition to the close button.',
            'DialogTitle and DialogDescription wire aria-labelledby / aria-describedby automatically.',
            'The close button carries an explicit aria-label ("Close") since it is icon-only.',
            'Layout uses logical properties, so it mirrors correctly under RTL (switch the header language).',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
