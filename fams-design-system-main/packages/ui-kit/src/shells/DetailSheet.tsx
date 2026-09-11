import { forwardRef, useCallback, useEffect, useRef, type ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { X } from '../icons'
import { cn } from '../lib/cn'
import { Sheet, SheetContent, SheetTitle, SheetDescription, SheetClose, SheetFooter } from '../primitives/Sheet'
import { Button } from '../primitives/Button'
import { Toolbar } from '../layout/Toolbar'

/**
 * DetailSheet + FormSheet — the right-slide surface pair for record work.
 * [L4 shell]
 *
 * DetailSheet is chrome for viewing/editing an existing record: a header
 * (title/subtitle/action toolbar/close) over a scrollable body slot, with an
 * optional footer for a save bar. FormSheet is its narrower sibling for a
 * focused create/edit form: header title, a body slot for the fields, and a
 * sticky Cancel/Save footer. Both are built on the DS `Sheet` (Radix Dialog
 * anchored `side="right"`) — overlay, focus trap, Esc-to-close, and the
 * RTL-correct slide direction all come from there for free.
 *
 * State-agnostic (Rule 8): neither component holds form state or closes
 * itself on submit. FormSheet's Save only fires `onSave` — same contract as
 * `DestructiveActionModal`'s `onConfirm` — the caller runs its mutation,
 * drives `loading`, and sets `open={false}` once it resolves.
 *
 * @usage-v5
 *   Consolidates the v5 "content + footer, optional external close" drawer
 *   shape repeated across ~20 forks of `shared/components/drawers/ConfigDrawer.vue`
 *   chrome (title/subtitle/content/footer slots, 13 consumers) and the
 *   record-view drawers built on it: `shared/components/drawers/{ProfileDrawer,
 *   EntityDrawer,AssetListDrawer,OdometerDrawer}.vue`,
 *   `iwmp/components/drawers/{ApiSelectDrawer,DispatchDrawer,EditScopeDrawer,
 *   EntitySelectDrawer,KpiSelectDrawer}.vue` → DetailSheet.
 *   Create/edit form drawers — `shared/components/dialog/AddLeadDrawer.vue`,
 *   `iwmp/components/ticketing/TicketCreateDrawer.vue`,
 *   `iwmp/components/drawers/DocumentUploadDrawer.vue` — each hand-rolls its
 *   own fixed-footer Cancel/Save row around a Quasar `q-dialog` positioned
 *   `right` → FormSheet. Forms needed: title/subtitle/actions/close header,
 *   scrollable body slot, optional footer (DetailSheet); title + sticky
 *   cancel/save footer with a caller-driven `loading` state (FormSheet).
 * @usage-index detail-sheet
 */

/**
 * Focus return-to-opener (UX MUST J.49): with a controlled `open` and no Radix
 * `SheetTrigger`, Radix has no trigger to restore focus to on close — focus
 * fell to `<body>`. Capture whatever was focused when `open` flips true and
 * hand back an `onCloseAutoFocus` that restores it.
 */
function useReturnFocus(open: boolean) {
  const openerRef = useRef<HTMLElement | null>(null)
  useEffect(() => {
    if (open && document.activeElement instanceof HTMLElement && document.activeElement !== document.body) {
      openerRef.current = document.activeElement
    }
  }, [open])
  return useCallback((event: Event) => {
    const opener = openerRef.current
    if (opener && opener.isConnected) {
      event.preventDefault()
      opener.focus()
    }
  }, [])
}

const detailSheetWidths = cva('', {
  variants: {
    width: {
      sm: 'sm:max-w-3xl',
      md: 'sm:max-w-5xl',
      lg: 'sm:max-w-7xl',
    },
  },
  defaultVariants: { width: 'md' },
})

export interface DetailSheetProps extends VariantProps<typeof detailSheetWidths> {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  /** Secondary line under the title (record subtype, id, status summary, …). */
  subtitle?: ReactNode
  /** Header action buttons (edit, link, unlink, …) — rendered start of the close control. */
  actions?: ReactNode
  /** Optional sticky footer (e.g. a save bar for an inline-editable detail). Omit for a plain scrollable body. */
  footer?: ReactNode
  /** The record body — owned entirely by the caller. */
  children: ReactNode
  className?: string
}

/**
 * DetailSheet — right-slide record-detail surface. Chrome only: header,
 * scroll container, and optional footer. The body content is a slot.
 */
export const DetailSheet = forwardRef<HTMLDivElement, DetailSheetProps>(
  ({ open, onOpenChange, title, subtitle, actions, footer, children, width, className }, ref) => {
    const onCloseAutoFocus = useReturnFocus(open)
    return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        ref={ref}
        side="right"
        hideClose
        onCloseAutoFocus={onCloseAutoFocus}
        data-slot="detail-sheet"
        className={cn('gap-0 p-0', detailSheetWidths({ width }), className)}
      >
        <div
          data-slot="detail-sheet-header"
          className="flex shrink-0 items-start justify-between gap-4 border-b border-border p-6 text-start"
        >
          <div className="min-w-0 flex-1">
            <SheetTitle>{title}</SheetTitle>
            {subtitle ? <SheetDescription>{subtitle}</SheetDescription> : null}
          </div>
          <Toolbar gap="inline" className="shrink-0">
            {actions}
            <SheetClose asChild>
              <Button type="button" variant="tertiary" size="icon" aria-label="Close">
                <X className="size-4" />
              </Button>
            </SheetClose>
          </Toolbar>
        </div>

        <div data-slot="detail-sheet-body" className="min-h-0 flex-1 overflow-y-auto p-6">
          {children}
        </div>

        {footer ? <SheetFooter data-slot="detail-sheet-footer">{footer}</SheetFooter> : null}
      </SheetContent>
    </Sheet>
    )
  },
)

DetailSheet.displayName = 'DetailSheet'

const formSheetWidths = cva('', {
  variants: {
    width: {
      sm: 'sm:max-w-md',
      md: 'sm:max-w-2xl',
      lg: 'sm:max-w-3xl',
    },
  },
  defaultVariants: { width: 'md' },
})

export interface FormSheetProps extends VariantProps<typeof formSheetWidths> {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  /** The form fields — the caller owns all form state and validation. */
  children: ReactNode
  /** Fired on Cancel. Omit to just close the sheet. */
  onCancel?: () => void
  /**
   * Fired on Save. The component never submits or closes itself — run the
   * mutation, drive `loading`, and set `open={false}` once it resolves
   * (same contract as `DestructiveActionModal.onConfirm`).
   */
  onSave: () => void
  cancelLabel?: string
  saveLabel?: string
  /** Disables Save (e.g. the form is invalid or untouched). */
  saveDisabled?: boolean
  /** Caller-driven async state: disables Cancel/Save, spins Save, and suppresses Esc/overlay-dismiss. */
  loading?: boolean
  /**
   * Outside-interaction (pointer-down or focus) dismissal hook, forwarded to
   * the underlying dismissible layer. Call `event.preventDefault()` to keep the
   * sheet open — how a caller guards unsaved input, or keeps a confirmation
   * that portals outside this sheet's DOM from being treated as an "outside"
   * interaction on it.
   */
  onInteractOutside?: (event: { target: EventTarget | null; preventDefault: () => void }) => void
  className?: string
}

/**
 * FormSheet — narrower create/edit surface. Header title, a scrollable body
 * slot for the fields, and a sticky Cancel/Save footer.
 */
export const FormSheet = forwardRef<HTMLDivElement, FormSheetProps>(
  (
    {
      open,
      onOpenChange,
      title,
      children,
      onCancel,
      onSave,
      cancelLabel = 'Cancel',
      saveLabel = 'Save',
      saveDisabled = false,
      loading = false,
      width,
      onInteractOutside,
      className,
    },
    ref,
  ) => {
    const onCloseAutoFocus = useReturnFocus(open)
    const handleOpenChange = (next: boolean) => {
      if (loading) return
      onOpenChange(next)
    }

    const handleCancel = () => {
      if (loading) return
      onCancel?.()
      onOpenChange(false)
    }

    return (
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent
          ref={ref}
          side="right"
          hideClose
          onCloseAutoFocus={onCloseAutoFocus}
          onInteractOutside={onInteractOutside}
          data-slot="form-sheet"
          className={cn('gap-0 p-0', formSheetWidths({ width }), className)}
        >
          <div data-slot="form-sheet-header" className="flex shrink-0 items-start justify-between gap-4 border-b border-border p-6 text-start">
            <SheetTitle className="min-w-0 flex-1">{title}</SheetTitle>
            <SheetClose asChild>
              <Button type="button" variant="tertiary" size="icon" aria-label="Close" disabled={loading}>
                <X className="size-4" />
              </Button>
            </SheetClose>
          </div>

          <div data-slot="form-sheet-body" className="min-h-0 flex-1 overflow-y-auto p-6">
            {children}
          </div>

          <SheetFooter data-slot="form-sheet-footer">
            <Button type="button" variant="tertiary" disabled={loading} onClick={handleCancel}>
              {cancelLabel}
            </Button>
            <Button type="button" variant="primary" disabled={saveDisabled || loading} loading={loading} onClick={onSave}>
              {saveLabel}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    )
  },
)

FormSheet.displayName = 'FormSheet'
