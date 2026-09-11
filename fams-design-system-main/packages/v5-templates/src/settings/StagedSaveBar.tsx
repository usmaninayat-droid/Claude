import type { ReactNode } from 'react'
import { Button } from '@fams/ui-kit'
import { Info } from '@fams/ui-kit/icons'
import { cn } from '../lib/cn'

/**
 * StagedSaveBar — the pending-changes bar of a STAGED settings save.
 * [v5 tier]
 *
 * Ported from the designer-approved dispatcher prototype (Telematics
 * Features Config). A setting that grants or revokes a physically
 * consequential capability never writes through on toggle: the page edits a
 * working copy, this bar reports how many changes are pending, and Save
 * hands off to `StepUpVerifyDialog` before anything is committed. Apply the
 * same pattern to every future setting of that class.
 *
 * Distinct from `UnsavedChangesToast`, deliberately: that one is a
 * saved-VIEW-configuration toast (Revert / Save / Enable Autosave) floated
 * inside a view region and positioned around the Customize View drawer. This
 * one is a settings-FORM bar — a pending COUNT plus Discard / Save changes —
 * and it is the visible half of the staged-save + step-up contract. Merging
 * them would force one component to carry two unrelated action sets.
 *
 * Presentational (rule 8): the host owns the working copy, the count, and
 * both actions. Renders nothing while `pendingCount` is 0, so a host can
 * mount it unconditionally.
 *
 * @usage-index staged-save-bar
 */
export interface StagedSaveBarProps {
  /** How many staged edits are waiting. `0` renders nothing. */
  pendingCount: number
  onDiscard: () => void
  onSave: () => void
  /** True while the save is in flight — disables Discard, spins Save. */
  saving?: boolean
  /**
   * Overrides the pending line. Default: "N change(s) pending" — the
   * prototype's wording.
   */
  message?: ReactNode
  discardLabel?: string
  saveLabel?: string
  className?: string
}

export function StagedSaveBar({
  pendingCount,
  onDiscard,
  onSave,
  saving = false,
  message,
  discardLabel = 'Discard',
  saveLabel = 'Save changes',
  className,
}: StagedSaveBarProps) {
  if (pendingCount <= 0) return null

  return (
    <div
      role="status"
      data-slot="staged-save-bar"
      className={cn(
        'flex flex-wrap items-center gap-3 rounded-md border border-border bg-card px-4 py-3 shadow-sm',
        className,
      )}
    >
      <Info aria-hidden className="size-5 shrink-0 text-primary" />
      <p className="min-w-0 flex-1 text-sm font-semibold text-foreground">
        {message ?? `${pendingCount} change${pendingCount === 1 ? '' : 's'} pending`}
      </p>
      <div className="flex shrink-0 items-center gap-2">
        <Button variant="tertiary" size="sm" onClick={onDiscard} disabled={saving}>
          {discardLabel}
        </Button>
        <Button size="sm" onClick={onSave} loading={saving}>
          {saveLabel}
        </Button>
      </div>
    </div>
  )
}

StagedSaveBar.displayName = 'StagedSaveBar'
