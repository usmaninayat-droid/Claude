import { useEffect, useRef } from 'react'
import { ColumnCustomizer, type ColumnCatalogItem } from '@fams/ui-kit'
import { cn } from '../../lib/cn'

/**
 * LiveColumnsPopover — the Columns surface behind the list header's
 * `pencil-02` (SPEC v2 §2.6, Figma 495:19004 / component 504:27970): a
 * **290px** white popover with the "Search Columns" input pinned at its top
 * (`ColumnCustomizer`), the `Shown` group, then the grouped off-by-default
 * blueprint fields.
 *
 * The trigger lives INSIDE the table header row (`DataTable.trailingAction`),
 * which renders its own `<button>` — so this is an anchored panel with its
 * own dismissal contract rather than a Radix trigger/content pair: outside
 * pointer-down and Escape close it, focus moves in on open and returns to the
 * trigger on close (UX-13/§3.29), and it clamps to the available height with
 * its own inner scroll (UX-14/E35). Shared by BOTH live list surfaces so the
 * hybrid panel and the list-only view behave identically.
 */
export interface LiveColumnsPopoverProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  catalog: ColumnCatalogItem[]
  /** Ordered visible keys — `ColumnCustomizer.value`. */
  value: string[]
  onChange: (next: string[]) => void
  /**
   * The trigger's accessible name. A pointer-down that lands on the trigger
   * is ignored here so the trigger's own onClick does the toggling (without
   * this the popover would close and immediately reopen).
   */
  triggerLabel?: string
  /** Placement override — the default anchors under the table header. */
  className?: string
}

export function LiveColumnsPopover({
  open,
  onOpenChange,
  catalog,
  value,
  onChange,
  triggerLabel = 'Customize columns',
  className,
}: LiveColumnsPopoverProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    returnFocusRef.current = document.activeElement as HTMLElement | null
    // Focus into the panel (dialog semantics) — the pinned "Search Columns"
    // input when there is one, else the panel itself.
    const first = panelRef.current?.querySelector<HTMLElement>('input, button, [tabindex]:not([tabindex="-1"])')
    ;(first ?? panelRef.current)?.focus()

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null
      if (panelRef.current?.contains(target)) return
      if (target?.closest(`[aria-label="${triggerLabel}"]`)) return
      onOpenChange(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      onOpenChange(false)
      returnFocusRef.current?.focus()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onOpenChange, triggerLabel])

  if (!open) return null
  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Columns"
      tabIndex={-1}
      data-slot="live-columns-popover"
      className={cn(
        // 290px per SPEC §2.6; clamped height with the CUSTOMIZER's own inner
        // scroll (UX-14) so the bottom fade below can stay pinned.
        'absolute z-30 w-[18.125rem] overflow-hidden rounded-md border border-border bg-card shadow-popover outline-none',
        // `ColumnCustomizer` ships a fixed 260px box; Figma's popover is 290
        // (visual #7), and UX finding 15 asks for bottom padding inside the
        // scroll region plus a scrollable-content cue.
        '[&_[data-slot=column-customizer]]:max-h-full [&_[data-slot=column-customizer]]:w-full',
        '[&_[data-slot=column-customizer]]:rounded-none [&_[data-slot=column-customizer]]:border-0',
        '[&_[data-slot=column-customizer]]:pb-3 [&_[data-slot=column-customizer]]:shadow-none',
        // Anchored to the inline-END of the list panel — i.e. right of the
        // divider, OVER the map (visual #7), not on top of the list.
        className ?? 'start-full ms-2 top-24 max-h-[calc(100%-7rem)]',
      )}
    >
      {/* `onClose` renders the header's `x-close` (SPEC §2.6: `Columns` + ✕). */}
      <ColumnCustomizer catalog={catalog} value={value} onChange={onChange} onClose={() => onOpenChange(false)} />
      <span
        aria-hidden="true"
        data-slot="live-columns-fade"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-card to-transparent"
      />
    </div>
  )
}

LiveColumnsPopover.displayName = 'LiveColumnsPopover'
