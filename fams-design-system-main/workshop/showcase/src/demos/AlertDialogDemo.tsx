import { Demo } from '../showcase/kit'
import { Button } from '../../../../packages/ui-kit/src/primitives/Button'
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '../../../../packages/ui-kit/src/primitives/AlertDialog'
import { DocPage, DocSection, Prose, PropsTable, Guidelines, A11yList, Code } from '../docs'

/**
 * AlertDialogDemo — reference implementation of the standard component-page
 * template for an overlay/interaction primitive: DocPage → Preview (live
 * trigger, no Playground) → PropsTable → Guidelines → Accessibility. RTL is
 * proven by the global header switcher, not a per-page block.
 */
export default function AlertDialogDemo() {
  return (
    <DocPage
      title="AlertDialog"
      badge="stable"
      summary="Mandatory confirmation for destructive or otherwise irreversible actions. Unlike Dialog, it cannot be dismissed by clicking outside — the user must choose Cancel or the destructive action. Retires ~90 files' worth of hand-rolled q-dialog confirmation blocks and three near-duplicate shared ConfirmDialog components."
    >
      <DocSection id="preview" title="Preview">
        <Prose>
          Composes <Code>AlertDialogAction</Code> as a <Code>destructive</Code> button and{' '}
          <Code>AlertDialogCancel</Code> as a <Code>tertiary</Code> button, so confirm/cancel styling
          can never drift from <Code>Button</Code>.
        </Prose>
        <Demo
          title="Delete confirmation"
          hint="no outside-click dismiss — Cancel or Delete only"
          code={`<AlertDialog>
  <AlertDialogTrigger asChild><Button variant="destructive">Delete route</Button></AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete this route?</AlertDialogTitle>
      <AlertDialogDescription>
        This removes the route and all its assigned stops. This action cannot be undone.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={() => console.log('deleted')}>Delete</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>`}
        >
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Delete route</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this route?</AlertDialogTitle>
                <AlertDialogDescription>
                  This removes the route and all its assigned stops. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => console.log('deleted')}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </Demo>
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            {
              prop: 'open / defaultOpen',
              type: 'boolean',
              description: 'Controlled or uncontrolled open state of the root.',
            },
            {
              prop: 'onOpenChange',
              type: '(open: boolean) => void',
              description: 'Fires when the dialog opens or closes (including via Action/Cancel).',
            },
            {
              prop: 'AlertDialogTrigger asChild',
              type: 'boolean',
              description: 'Render the trigger as its child element (e.g. a Button) instead of a wrapping span.',
            },
            {
              prop: 'AlertDialogAction',
              type: 'ButtonHTMLAttributes<HTMLButtonElement>',
              description:
                "Confirms the action and closes the dialog. Styled with buttonVariants({ variant: 'destructive' }).",
            },
            {
              prop: 'AlertDialogCancel',
              type: 'ButtonHTMLAttributes<HTMLButtonElement>',
              description:
                "Dismisses without confirming. Styled with buttonVariants({ variant: 'tertiary' }).",
            },
            {
              prop: '…props',
              type: 'HTMLAttributes<HTMLDivElement>',
              description:
                'AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, and AlertDialogDescription all pass through native attributes (className, children, …).',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Reserve AlertDialog for destructive or irreversible actions — deleting, unlinking, overwriting.',
            'State exactly what will happen in the description, not just "are you sure?".',
            'Lead the action label with the verb — "Delete", not "OK" or "Yes".',
            'Keep Cancel as the default-focused, less prominent action.',
          ]}
          donts={[
            "Don't use AlertDialog for routine confirmations — use Dialog or an inline undo instead.",
            "Don't allow outside-click or Escape to silently confirm — only Dialog supports lightweight dismissal.",
            "Don't stack a second AlertDialog on top of one that's already open.",
            "Don't hardcode danger colours — AlertDialogAction already carries the destructive token via Button.",
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Renders with role="alertdialog" and traps focus inside the content while open.',
            'No onPointerDownOutside / onInteractOutside — outside clicks never dismiss it, matching its "must choose" contract.',
            'AlertDialogTitle and AlertDialogDescription are linked via aria-labelledby / aria-describedby automatically.',
            'Escape still closes it (equivalent to Cancel), so keyboard users always have an exit.',
            'Logical positioning (start-1/2, translate) means it mirrors correctly under RTL (switch the header language).',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
