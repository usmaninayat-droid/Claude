import { Badge } from '@fams/ui-kit'
import type { RosterCell } from '../data/types'
import { DutyChip } from './DutyChip'

export interface DragGhostProps {
  x: number
  y: number
  cell: RosterCell
  /** `null` while over nothing; otherwise whether the hovered cell accepts the drop. */
  overOk: boolean | null
}

/** The chip that follows the pointer during a drag, with the drop verdict beside it. */
export function DragGhost({ x, y, cell, overOk }: DragGhostProps) {
  return (
    <div className="drag-ghost flex w-32 flex-col items-center gap-1" style={{ left: x, top: y }} aria-hidden>
      <DutyChip cell={cell} />
      {overOk === false && (
        <Badge variant="destructive" size="xs">
          Not allowed here
        </Badge>
      )}
      {overOk === true && (
        <Badge variant="success" size="xs">
          Drop to move
        </Badge>
      )}
    </div>
  )
}
