import { categoryOf, dutyOf } from '../data/masters'
import type { DutyCode, RosterCell, Route, Shift } from '../data/types'
import { compactRoute } from './format'

/**
 * How a duty looks on the board — labels are always SPELLED OUT (no RT/WO/EX
 * codes on screen; those confuse a planner reading the grid), and every colour
 * is a semantic tone that resolves to an `@fams/tokens` variable via the
 * `.tone-*` classes in styles.css. One place owns this so the cell, the chip,
 * the popover and the legend never drift apart.
 */

export type Tone = 'route' | 'muted' | 'info' | 'warning' | 'destructive' | 'success' | 'secondary'

export interface DutyPresentation {
  /** Full-word name — never the code. */
  label: string
  tone: Tone
}

const DUTY: Record<Exclude<DutyCode, 'RT'>, DutyPresentation> = {
  RL: { label: 'Reliever', tone: 'info' },
  WO: { label: 'Weekly Off', tone: 'muted' },
  AV: { label: 'Annual Leave', tone: 'warning' },
  EL: { label: 'Emergency Leave', tone: 'destructive' },
  OC: { label: 'On Call', tone: 'info' },
  SB: { label: 'Standby / OJT', tone: 'success' },
  EX: { label: 'Extra Assignment', tone: 'secondary' },
}

/** Presentation for a non-route duty. Route cells carry their own layout (`DutyCard`). */
export function dutyPresentation(cell: RosterCell): DutyPresentation {
  if (cell.code === 'RT') return { label: cell.ref ? compactRoute(cell.ref) : 'Route', tone: 'route' }
  const base = DUTY[cell.code]
  // An extra assignment shows its TYPE (e.g. "Flag Man"), which is the point of it.
  if (cell.code === 'EX' && cell.ref) return { label: cell.ref, tone: 'secondary' }
  return base
}

/** A human string for a cell — used in toasts, drag ghosts and screen-reader text. */
export function cellLabel(cell: RosterCell | null): string {
  if (!cell) return 'no duty'
  if (cell.code === 'RT') return cell.ref ?? 'Route'
  if (cell.code === 'EX') return cell.ref ? `Extra — ${cell.ref}` : 'Extra assignment'
  return dutyOf(cell.code)?.name ?? DUTY[cell.code]?.label ?? cell.code
}

interface ShiftFace {
  label: string
  /** DS icon name — `sun` for daylight shifts, `moon-01` for night / mid. */
  icon: string
}

const SHIFT: Record<Shift, ShiftFace> = {
  DAY: { label: 'Day Shift', icon: 'sun' },
  AFN: { label: 'Afternoon Shift', icon: 'sun' },
  EVENING: { label: 'Evening Shift', icon: 'sun' },
  MID: { label: 'Mid Shift', icon: 'moon-01' },
  NIGHT: { label: 'Night Shift', icon: 'moon-01' },
}

export function shiftFace(shift: Shift): ShiftFace {
  return SHIFT[shift]
}

/** The vehicle line a route card shows — the category's full name, never the prefix code. */
export function routeVehicle(route: Route | undefined): string {
  if (!route) return ''
  return categoryOf(route.cat)?.name ?? route.cat
}
