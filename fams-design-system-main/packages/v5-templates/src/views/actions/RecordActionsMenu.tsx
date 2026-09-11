import { useState } from 'react'
import { Archive, MoreHorizontal, Trash2 } from '@fams/ui-kit/icons'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  IconControl,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  useKanbanCardMoveTargets,
} from '@fams/ui-kit'
import { cn } from '../../lib/cn'
import { DeleteConfirmDialog } from './DeleteConfirmDialog'
import { ROW_ACTION_PERSISTENT, ROW_ACTION_REVEAL } from './row-affordance'

/**
 * Why `Archive` is disabled. Dev Note `33534:32265` reads "right now we have
 * only delete option... other is just placeholder", so the designer has
 * acknowledged it does nothing. `INTERACTIONS.md` L250-251 turns that into the
 * implementation rule: render it disabled with a tooltip, rather than wiring a
 * fake action or inventing an archive engine.
 */
export const ARCHIVE_PLACEHOLDER_REASON = 'Archiving isn’t available yet.'

export interface RecordActionsMenuProps {
  /**
   * The record's own id. Used ONLY to look up its kanban keyboard move
   * targets (see `useKanbanCardMoveTargets` below) — irrelevant, and safe to
   * omit, for a List/Hybrid row (there is no enclosing kanban board, so the
   * lookup resolves to no targets either way).
   */
  recordId: string
  /** The record's human id (`IMS-12324`) — the accessible name names its subject (UX note H.51). */
  recordLabel: string
  /** Renders the `Delete` item. Omit/false and the menu shows only `Archive`. */
  canDelete?: boolean
  /** Renders the (always disabled) `Archive` item. */
  canArchive?: boolean
  /** Fires only after the confirmation dialog is accepted. */
  onDelete?: () => void
  /**
   * Paint the control at rest instead of hover-revealing it — the resolved
   * `uiConfig.rowActions.alwaysVisible` flag. Default `false` keeps the shared
   * hover default every existing consumer already has.
   */
  persistent?: boolean
  className?: string
}

/**
 * RecordActionsMenu — the hover-revealed `…` row/card options menu.
 * [tier-2 internal]
 *
 * ONE component for all three lenses: `DataTable`'s `rowActions` renders it for
 * List rows and Hybrid cards, `KanbanCardView` renders it for board cards. The
 * designer wrote a single rule (`INTERACTIONS.md`: Dev Notes `33534:32266` and
 * `33534:32263` are byte-identical), so there is a single implementation.
 *
 * Contents are exactly the designer's two items and nothing else — overlay
 * `33534:32262` is `Delete` (trash glyph, `accent/error` red) + `Archive`
 * (archive glyph, neutral). `INTERACTIONS.md`'s corrections table explicitly
 * strikes SPEC §2 row 21's guessed `open`/`edit` items, so they are absent.
 *
 * - `Delete` is destructive and always confirms (`DeleteConfirmDialog`).
 * - `Archive` is disabled with an explanatory tooltip — see
 *   {@link ARCHIVE_PLACEHOLDER_REASON}. `aria-disabled`, not `disabled`, so the
 *   item stays focusable and the explanation is actually reachable (the same
 *   ruling `KanbanColumnView` applies to a refused pin).
 *
 * Reveal + accessible-name behaviour comes from `row-affordance.ts` and UX note
 * H.51: hover AND focus AND touch reveal it, it never leaves the tab order, it
 * stays visible while its own menu is open, and its name states its subject
 * ("More actions for IMS-12324", never a bare "More").
 *
 * Move-to group (fix7, run-2026-09-05): `KanbanCard` renders exactly ONE
 * overflow trigger per card — this menu when the caller supplies it, else its
 * own built-in "Move to…" (see that component's docblock on the
 * double-overflow-menu bug that guard exists for). That means whenever THIS
 * menu is the one rendered on a kanban card, it is the only place left that
 * can expose a keyboard move path for that card — so it asks
 * `useKanbanCardMoveTargets` for the same reachable-column list `KanbanCard`
 * itself would use and, when there are any, prepends a labelled "Move to"
 * group. The hook returns `[]` outside a kanban board (this same component
 * also renders for List/Hybrid rows), so nothing changes there.
 */
export function RecordActionsMenu({
  recordId,
  recordLabel,
  canDelete = false,
  canArchive = false,
  onDelete,
  persistent = false,
  className,
}: RecordActionsMenuProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const moveTargets = useKanbanCardMoveTargets(recordId, recordLabel)
  const showDelete = canDelete && Boolean(onDelete)
  if (!showDelete && !canArchive && moveTargets.length === 0) return null

  return (
    <>
      <DropdownMenu>
        {/* UX note K.67 (name + hover/focus tooltip) and the load-bearing
            trigger nesting order (H.49/H.51) are BOTH `IconControl`'s job now
            — `menuTrigger` is what keeps `DropdownMenuTrigger` outermost, so
            `data-state` and the Escape/focus-restore path stay the menu's. The
            reasoning this call site paid for is in that component's docblock. */}
        <IconControl tip={`More actions for ${recordLabel}`} menuTrigger>
          <Button
            variant="ghost"
            size="icon"
            data-slot="row-actions"
            className={cn('size-8 shrink-0', persistent ? ROW_ACTION_PERSISTENT : ROW_ACTION_REVEAL, className)}
          >
            <MoreHorizontal className="size-4" aria-hidden="true" />
          </Button>
        </IconControl>
        <DropdownMenuContent align="end" className="min-w-[10rem]">
          {moveTargets.length > 0 ? (
            <>
              <DropdownMenuLabel>Move to</DropdownMenuLabel>
              {moveTargets.map((target) => (
                <DropdownMenuItem key={target.id} data-slot="row-action-move" onSelect={target.onSelect}>
                  {target.title}
                </DropdownMenuItem>
              ))}
              {showDelete || canArchive ? <DropdownMenuSeparator /> : null}
            </>
          ) : null}
          {showDelete ? (
            <DropdownMenuItem
              data-slot="row-action-delete"
              // Destructive rows read in the error token, per overlay
              // `33534:32262`'s red `Delete` label.
              className="text-destructive-emphasis focus:text-destructive-emphasis"
              onSelect={() => setConfirmOpen(true)}
            >
              <Trash2 className="size-4" aria-hidden="true" />
              Delete
            </DropdownMenuItem>
          ) : null}
          {/* Not an icon-only control (it has a visible "Archive" label), so this
              stays the plain tooltip trio — `IconControl` would make the
              explanation the accessible NAME and hide the real one. */}
          {canArchive ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuItem
                  data-slot="row-action-archive"
                  aria-disabled
                  // Never closes the menu and never acts — the designer's
                  // acknowledged placeholder.
                  onSelect={(event) => event.preventDefault()}
                  className="cursor-not-allowed text-muted-foreground data-highlighted:bg-transparent"
                >
                  <Archive className="size-4" aria-hidden="true" />
                  Archive
                </DropdownMenuItem>
              </TooltipTrigger>
              <TooltipContent>{ARCHIVE_PLACEHOLDER_REASON}</TooltipContent>
            </Tooltip>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      {showDelete ? (
        <DeleteConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          subject={recordLabel}
          onConfirm={() => onDelete?.()}
        />
      ) : null}
    </>
  )
}

RecordActionsMenu.displayName = 'RecordActionsMenu'
