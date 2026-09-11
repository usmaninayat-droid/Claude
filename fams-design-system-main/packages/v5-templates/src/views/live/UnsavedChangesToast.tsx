import { Info } from '@fams/ui-kit/icons'
import { Button } from '@fams/ui-kit'

/**
 * UnsavedChangesToast — the top-end "You have unsaved changes" card raised
 * when a saved view's configuration (columns, filters…) is edited (figma
 * live-monitoring spec §1.8 / 495:62893): Revert restores the persisted
 * state, Save persists the edits, Enable Autosave flips the view's autosave
 * on (and saves). Presentational — the caller owns the dirty flag and every
 * action; rendered absolutely inside the view region.
 *
 * While the Customize View drawer is open (an earlier sibling in the same
 * region), the toast lifts ABOVE the drawer's `z-30` and shifts start-ward
 * past the drawer's `w-sm` (24rem + the `end-3` gap = 24.75rem) — so its
 * Revert/Save/Enable Autosave stay clickable (round-2 QA
 * `customize-toast-occlusion`) AND it never covers the drawer's header
 * actions (UX-NOTES §6). Pure-CSS sibling selector: no drawer-state prop.
 */
export interface UnsavedChangesToastProps {
  onRevert: () => void
  onSave: () => void
  onEnableAutosave: () => void
  title?: string
  className?: string
}

export function UnsavedChangesToast({
  onRevert,
  onSave,
  onEnableAutosave,
  title = 'You have unsaved changes',
  className,
}: UnsavedChangesToastProps) {
  return (
    <div
      role="status"
      data-slot="unsaved-changes-toast"
      className={
        className ??
        'absolute end-3 top-3 z-20 flex items-center gap-3 rounded-md border border-border bg-card px-4 py-3 shadow-lg [[data-slot=customize-view-drawer]~&]:end-[24.75rem] [[data-slot=customize-view-drawer]~&]:z-40'
      }
    >
      <Info className="size-5 shrink-0 text-primary" aria-hidden="true" />
      <p className="text-body-sm font-semibold text-foreground">{title}</p>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onRevert}>
          Revert
        </Button>
        <Button variant="tertiary" size="sm" onClick={onSave}>
          Save
        </Button>
        <Button size="sm" onClick={onEnableAutosave}>
          Enable Autosave
        </Button>
      </div>
    </div>
  )
}

UnsavedChangesToast.displayName = 'UnsavedChangesToast'
