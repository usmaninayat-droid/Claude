import { memo, type KeyboardEvent, type MouseEvent, type PointerEvent } from 'react'
import type { Eligibility, RosterCell as Cell, Route } from '../data/types'
import { cellLabel } from '../lib/duty-presentation'
import { DutyCard } from './DutyCard'

export interface RosterCellProps {
  employeeId: string
  day: string
  cell: Cell | null
  /** The route record when the cell is a route assignment — drives the card body. */
  route?: Route
  eligibility?: Eligibility
  isPast: boolean
  isToday: boolean
  isLocked: boolean
  isActive: boolean
  isSelected: boolean
  isSaving: boolean
  /** Drag feedback on THIS cell as a drop target. */
  dropState?: 'ok' | 'bad' | null
  isDragSource?: boolean
  tabIndex: number
  onClick: (ev: MouseEvent) => void
  onKeyDown: (ev: KeyboardEvent) => void
  onPointerDown: (ev: PointerEvent) => void
  onFocus: () => void
  /** Accessible slot description, e.g. "Ram Yadav, Mon 07 Sep". */
  slotLabel: string
}

/**
 * One `gridcell`. Owns nothing but presentation + event plumbing; the board
 * decides what a click, key or drop MEANS. Memoised because the virtualised
 * board renders 7 cells per visible row and only the touched cell should
 * re-render on a commit.
 */
export const RosterCell = memo(function RosterCell({
  employeeId,
  day,
  cell,
  route,
  eligibility,
  isPast,
  isToday,
  isLocked,
  isActive,
  isSelected,
  isSaving,
  dropState,
  isDragSource,
  tabIndex,
  onClick,
  onKeyDown,
  onPointerDown,
  onFocus,
  slotLabel,
}: RosterCellProps) {
  const verdict = cell?.code === 'RT' && eligibility ? (!eligibility.ok ? `blocked: ${eligibility.reasons[0]}` : eligibility.warns.length ? `warning: ${eligibility.warns[0]}` : 'eligible') : ''
  const describe = cell ? `${cellLabel(cell)}${verdict ? `, ${verdict}` : ''}` : 'no duty assigned'
  const draggable = Boolean(cell) && !isLocked && !isPast && cell?.code !== 'AV' && cell?.code !== 'EL'

  return (
    <div
      role="gridcell"
      data-cell={`${employeeId}|${day}`}
      tabIndex={tabIndex}
      aria-selected={isSelected || undefined}
      aria-readonly={isLocked || isPast || undefined}
      aria-label={`${slotLabel}: ${describe}${isLocked ? ', week is published and locked' : ''}`}
      onClick={onClick}
      onKeyDown={onKeyDown}
      onPointerDown={draggable ? onPointerDown : undefined}
      onFocus={onFocus}
      className={[
        'rg-cell group relative flex h-full select-none items-stretch border-e border-b border-border transition-colors duration-fast',
        isToday ? 'bg-primary/5' : '',
        isPast ? 'bg-muted/30' : '',
        !isLocked && !isPast ? 'cursor-pointer hover:bg-muted/60' : 'cursor-default',
        draggable ? 'touch-none' : '',
        isActive ? 'z-10' : '',
        dropState === 'ok' ? 'drop-ok' : dropState === 'bad' ? 'drop-bad' : '',
        isDragSource ? 'drag-source' : '',
      ].join(' ')}
    >
      <DutyCard cell={cell} {...(route ? { route } : {})} {...(eligibility ? { eligibility } : {})} saving={isSaving} isPast={isPast} />
    </div>
  )
})
