import { forwardRef, useEffect, type HTMLAttributes, type ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { ChevronDown, ChevronUp, X } from '../icons'
import { cn } from '../lib/cn'

/**
 * DockedPanel — the non-modal counterpart to `Sheet`. [L1 primitive]
 *
 * `Sheet` (Radix `Dialog`, `side="right"`) is a MODAL surface: scrim, focus
 * trap, click-outside-to-close. Several FAMS record-detail surfaces DOCK
 * beside a still-live page instead of covering it — a map that keeps
 * panning/zooming, a list that keeps scrolling — with the detail panel
 * sitting flush against the viewport's edge (figma specs for the station
 * sidesheet and the docked live-monitoring sheet both measure this: "the
 * sidesheet DOCKS; it does not COVER" — no scrim, no gap, page content
 * beside it stays fully interactive). A modal `Sheet` forbids exactly that:
 * its scrim dims the page, its focus trap blocks the map, and Radix's
 * overlay-click-to-close steals the "click a different marker to swap the
 * panel's content" gesture every docked spec requires. So `DockedPanel` is a
 * plain layout element — no portal, no overlay, no focus trap — that a
 * caller renders as a real flex/grid sibling (or a non-blocking `fixed`
 * panel, since nothing here blocks pointer events outside its own bounds).
 * Escape still closes it — hand-wired here since there is no Radix `Dialog`
 * underneath to give that for free.
 *
 * `expanded` is the generic "grow from the bottom to full height" affordance
 * the FAMS side-sheet contract describes: left unset (or `true`), the panel
 * runs the full block height — the docked default every current caller
 * needs (weather station drawer, entity/task profile). Passing `false`
 * anchors it to the bottom of its containing block at a reduced height with
 * rounded top corners, so a caller that wants a partial-height ↔
 * full-height toggle (e.g. a header "expand" control) has real CSS states
 * to switch between via `onExpandedChange` rather than inventing its own —
 * see `DockedPanelHeader`'s optional expand button.
 *
 * Stacking (multiple docked panels, browser-tab style) is NOT this
 * component's concern — it renders exactly one panel. A caller that stacks
 * linked records (`ProfileStack`) keeps its own tab-strip chrome and swaps
 * which record's content this panel wraps; `DockedPanel` only owns the
 * dock/no-scrim/Escape/expand mechanics shared by every docked surface.
 *
 * State-agnostic (Rule 8): open/close, width, and expanded/collapsed are the
 * caller's state — this renders what it's handed and reports intent via
 * `onClose` / `onExpandedChange`. No record/module-specific logic lives
 * here; content is entirely the `children` slot.
 * @usage-index docked-panel
 */
export interface DockedPanelProps
  extends Omit<HTMLAttributes<HTMLElement>, 'children'>,
    VariantProps<typeof dockedPanelVariants> {
  open: boolean
  onClose: () => void
  /** Panel width (CSS length). Defaults to the design's 550px. */
  width?: string
  children?: ReactNode
}

const dockedPanelVariants = cva(
  'flex min-h-0 shrink-0 flex-col border-border bg-card text-card-foreground shadow-elevation outline-none',
  {
    variants: {
      expanded: {
        // Full block height — a real layout sibling, flush against the edge
        // it docks to (the default every current docked surface uses).
        true: 'h-full border-s',
        // Bottom-anchored partial height, rounded top corners — the
        // "not-yet-expanded" half of the expand-from-bottom affordance.
        // `absolute` so it doesn't force its containing block to grow to
        // its own reduced height; the caller's container should be
        // `position: relative` (or already establishes one, e.g. the map
        // viewport) for this to anchor correctly.
        false: 'absolute inset-x-0 bottom-0 z-drawer h-[70%] rounded-t-lg border shadow-elevation',
      },
    },
    defaultVariants: { expanded: true },
  },
)

export const DockedPanel = forwardRef<HTMLElement, DockedPanelProps>(
  ({ open, onClose, width = '34.375rem', expanded, className, children, ...props }, ref) => {
    // Escape closes, matching every other dismissible surface in the app.
    // Bound on the document rather than trapped to this panel: nothing here
    // steals focus/keyboard handling from the page it docks beside, so that
    // page keeps its own Escape handling (e.g. a map's own overlay/tool
    // state) working exactly as it would with the panel closed.
    useEffect(() => {
      if (!open) return undefined
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') onClose()
      }
      document.addEventListener('keydown', onKeyDown)
      return () => document.removeEventListener('keydown', onKeyDown)
    }, [open, onClose])

    if (!open) return null

    return (
      <aside
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- `aside` vs. the generic `HTMLElement` ref forwarded by callers
        ref={ref as any}
        data-slot="docked-panel"
        data-expanded={expanded === false ? 'false' : 'true'}
        style={{ inlineSize: width }}
        className={cn(dockedPanelVariants({ expanded }), className)}
        {...props}
      >
        {children}
      </aside>
    )
  },
)
DockedPanel.displayName = 'DockedPanel'

export interface DockedPanelHeaderProps extends HTMLAttributes<HTMLDivElement> {
  onClose: () => void
  closeLabel?: string
  /** Presence of `onExpandedChange` is what shows the expand/restore toggle. */
  expanded?: boolean
  onExpandedChange?: (expanded: boolean) => void
  expandLabel?: string
  collapseLabel?: string
}

/**
 * DockedPanelHeader — the shared close (+ optional expand/restore) row for a
 * `DockedPanel`. Generic chrome only; any title/identity content is the
 * `children` slot so no record-shape assumption lives here.
 */
export function DockedPanelHeader({
  onClose,
  closeLabel = 'Close',
  expanded,
  onExpandedChange,
  expandLabel = 'Expand to full height',
  collapseLabel = 'Restore',
  className,
  children,
  ...props
}: DockedPanelHeaderProps) {
  return (
    <div
      data-slot="docked-panel-header"
      className={cn('flex shrink-0 items-center justify-between gap-2 bg-muted px-4 py-2', className)}
      {...props}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">{children}</div>
      <div className="flex shrink-0 items-center gap-1">
        {onExpandedChange ? (
          <button
            type="button"
            aria-label={expanded === false ? expandLabel : collapseLabel}
            onClick={() => onExpandedChange(expanded === false)}
            className="grid size-8 place-items-center rounded-xs text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            {expanded === false ? <ChevronUp aria-hidden="true" className="size-4" /> : <ChevronDown aria-hidden="true" className="size-4" />}
          </button>
        ) : null}
        <button
          type="button"
          aria-label={closeLabel}
          onClick={onClose}
          className="grid size-8 place-items-center rounded-xs text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>
    </div>
  )
}
DockedPanelHeader.displayName = 'DockedPanelHeader'

export { dockedPanelVariants }
