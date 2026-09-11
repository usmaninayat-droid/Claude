import { MoreVertical } from '../icons'
import { Button } from '../primitives/Button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuItem } from '../primitives/DropdownMenu'
import { IconControl } from './IconControl'
import type { KanbanCardMoveTarget } from './use-kanban-card-move-targets'

export interface KanbanCardMoveMenuProps {
  /** See `KanbanCardProps.moveMenuLabel`. */
  moveMenuLabel: string
  /** The card's own label — named in the trigger's accessible name. */
  cardLabel: string
  targets: KanbanCardMoveTarget[]
}

/**
 * KanbanCardMoveMenu — `KanbanCard`'s own built-in "Move to…" trigger.
 * [ui-kit internal]
 *
 * Extracted verbatim out of `KanbanCard.tsx` (root CLAUDE.md rule 12,
 * decompose rather than inflate an already-over-budget file further) when
 * this fix wave added the whole-card open button plus the shared
 * `useKanbanCardMoveTargets` hook. Behavior is unchanged — a move, not a
 * rewrite.
 *
 * Renders unconditionally once mounted; the PARENT decides whether to mount
 * it at all — it renders only when the card has reachable targets AND the
 * caller supplied no `actions` of its own (see `KanbanCard`'s docblock on the
 * double-overflow-menu bug that guard exists for), so this component owns no
 * gating logic itself.
 */
export function KanbanCardMoveMenu({ moveMenuLabel, cardLabel, targets }: KanbanCardMoveMenuProps) {
  return (
    <DropdownMenu>
      {/* Icon-only ⇒ name AND a hover/focus tooltip, through the one helper
          that also keeps `DropdownMenuTrigger` outermost (UX K.67; see
          `IconControl`'s docblock). */}
      <IconControl tip={moveMenuLabel} name={`${moveMenuLabel}: ${cardLabel}`} menuTrigger>
        <Button variant="ghost" size="icon" className="-me-1 -mt-0.5 size-6 shrink-0">
          <MoreVertical className="size-4" aria-hidden="true" />
        </Button>
      </IconControl>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{moveMenuLabel}</DropdownMenuLabel>
        {targets.map((target) => (
          <DropdownMenuItem key={target.id} onSelect={target.onSelect}>
            {target.title}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
KanbanCardMoveMenu.displayName = 'KanbanCardMoveMenu'
