import { useState } from 'react'
import { Trash2, X } from '@fams/ui-kit/icons'
import { Button, Tooltip, TooltipContent, TooltipTrigger } from '@fams/ui-kit'
import type { EntityRecord } from '@fams/v5-composer'
import { cn } from '../../lib/cn'
import { DeleteConfirmDialog } from './DeleteConfirmDialog'
import { ExportMenu } from './ExportMenu'
import { selectionSummary } from './bulk-selection'
import type { ExportColumn, ExportFormat } from './export-records'

export interface BulkActionBarProps {
  count: number
  /** True when the selection IS the whole filtered set — drives G.44's "(all matching filters)" suffix. */
  isEntireFilteredSet: boolean
  /** True when a search/filter is narrowing the records at all. */
  isFiltered: boolean
  /** How many records currently pass the filters — the explicit "select all N matching" second step. */
  filteredCount: number
  onSelectAll: () => void
  onClear: () => void
  /** Omit to drop the Delete action entirely (no privilege / no wired handler). */
  onDelete?: () => void
  /** Omit to drop the Export action. */
  exportProps?: { columns: ExportColumn[]; records: EntityRecord[]; label: string; onExport?: (format: ExportFormat, records: EntityRecord[]) => void }
  /** Noun for the confirm dialog — `'task'`/`'tasks'` come from the module, never hardcoded. */
  recordNoun: { one: string; many: string }
  className?: string
}

/**
 * BulkActionBar — the selection bar, sticky at the TOP of the lens body.
 * [tier-2 internal]
 *
 * Placement is the part that is easy to get wrong, and UX note G.41 is binding
 * about it: the bar is "anchored to the top of the lens body, directly under
 * the toolbar rows, and is sticky within that body's scroller". Concretely
 * `sticky top-0` as the FIRST child of `ModuleViewShell`'s own scrolling body,
 * which is why this component sets no `position: fixed` and no `bottom`.
 * The mined reference (`«IFMDS»/components/settings/subscriptions.tsx`) docks
 * its bar to the viewport bottom — we took its selection LOGIC and rejected its
 * placement, because bottom-docked it would cover kanban cards and fight the
 * hybrid map's chrome, and viewport-fixed it would escape the module entirely
 * and cover the left rail's flyouts.
 *
 * It renders only while `count >= 1`, so it reserves no space when empty (no
 * orphan strip — `UX-NOTES.md` B.7's closed ruling).
 *
 * Contents are exactly what Dev Note `33534:32267` specifies plus the dismissal
 * affordance UX note G.42 requires — `N selected`, `Delete`, `Export`, and a
 * `✕ Clear selection`. Nothing invented: `Archive` is NOT promoted here (it is
 * the row menu's acknowledged placeholder).
 *
 * `role="status"` + `aria-live="polite"` on the count means the selection size
 * is announced as it changes, once, from one region (G.42/G.48).
 */
export function BulkActionBar({
  count,
  isEntireFilteredSet,
  isFiltered,
  filteredCount,
  onSelectAll,
  onClear,
  onDelete,
  exportProps,
  recordNoun,
  className,
}: BulkActionBarProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  if (count < 1) return null

  const subject = `${count} ${count === 1 ? recordNoun.one : recordNoun.many}`

  return (
    <div
      data-slot="bulk-action-bar"
      className={cn(
        // `sticky top-0` INSIDE the lens body's scroller — see the docblock.
        // `z-dropdown` keeps it above scrolling content without competing with
        // popovers/tooltips (root rule 2's stacking tokens).
        'sticky top-0 z-dropdown flex flex-wrap items-center gap-3 rounded-md border border-border bg-card px-4 py-2 shadow-elevation',
        className,
      )}
    >
      <p data-slot="bulk-selection-count" role="status" aria-live="polite" className="text-body-sm font-medium text-foreground">
        {selectionSummary(count, isEntireFilteredSet, isFiltered)}
      </p>

      {/* G.44's explicit second step: never IMPLY that select-all reached
          beyond the loaded rows — offer it as its own labelled action. */}
      {count < filteredCount ? (
        <Button variant="link" size="sm" className="h-10 px-0" onClick={onSelectAll}>
          Select all {filteredCount} matching
        </Button>
      ) : null}

      <div className="ms-auto flex flex-wrap items-center gap-2">
        {onDelete ? (
          <Button
            variant="tertiary"
            size="md"
            className="h-10 text-destructive-emphasis"
            data-slot="bulk-delete"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 className="size-4" aria-hidden="true" />
            Delete
          </Button>
        ) : null}
        {exportProps ? <ExportMenu {...exportProps} variant="button" onExported={onClear} /> : null}
        {/* Icon-only, so it carries a name AND a tooltip (UX note K.67). */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-10"
              aria-label="Clear selection"
              data-slot="bulk-clear"
              onClick={onClear}
            >
              <X className="size-4" aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Clear selection</TooltipContent>
        </Tooltip>
      </div>

      {onDelete ? (
        <DeleteConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          subject={subject}
          onConfirm={() => {
            onDelete()
            // Every completed bulk action clears the selection (the reference's
            // `bulk()` does the same) — leaving deleted ids selected is how a
            // stale count starts lying.
            onClear()
          }}
        />
      ) : null}
    </div>
  )
}

BulkActionBar.displayName = 'BulkActionBar'
