import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@fams/ui-kit'

export interface DeleteConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** What is about to be deleted, already pluralized — e.g. `'12 tasks'` or `'IMS-12324'`. */
  subject: string
  onConfirm: () => void
}

/**
 * DeleteConfirmDialog — the one destructive confirmation for BOTH delete
 * paths. [tier-2 internal]
 *
 * UX notes G.43 (bulk) and the row menu's own requirement both demand the same
 * thing, so they share this dialog rather than growing two dialogs that drift:
 * it names the subject and the irreversibility, the destructive button is NOT
 * the default focus (`AlertDialogCancel` is rendered first and Radix focuses
 * it), and Escape/Cancel closes with focus returning to the trigger — which
 * Radix's `AlertDialog` does for free, and is exactly why this is not a
 * hand-rolled modal.
 *
 * Deliberately NOT an undo toast: G.43 rules that out for bulk deletes, and
 * `REFERENCE-MINING.md` §3.2's `RowMenu` reference confirms the row path uses
 * a confirm dialog too.
 */
export function DeleteConfirmDialog({ open, onOpenChange, subject, onConfirm }: DeleteConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-slot="delete-confirm-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {subject}?</AlertDialogTitle>
          <AlertDialogDescription>This can&rsquo;t be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              onConfirm()
              onOpenChange(false)
            }}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

DeleteConfirmDialog.displayName = 'DeleteConfirmDialog'
