import { Icon } from '@fams/ui-kit/icons'
import { dutyPresentation, routeVehicle, shiftFace } from '../lib/duty-presentation'
import type { Eligibility, RosterCell, Route } from '../data/types'
import { compactRoute } from '../lib/format'

export interface DutyCardProps {
  cell: RosterCell | null
  route?: Route
  eligibility?: Eligibility
  saving?: boolean
  isPast?: boolean
}

/**
 * The board cell's content. A ROUTE renders as a full card — route number,
 * shift (icon + spelled-out name), vehicle and zone — the way a planner reads
 * a real assignment; every other duty renders as a centred, full-word chip
 * ("Weekly Off", "Annual Leave", …). No RT/WO/EX codes appear anywhere, and
 * every colour resolves to an `@fams/tokens` variable through `.tone-*`.
 */
export function DutyCard({ cell, route, eligibility, saving, isPast }: DutyCardProps) {
  if (!cell) {
    return (
      <span className="flex h-full w-full items-center justify-center rounded-md border border-dashed border-border text-caption font-medium text-muted-foreground transition-colors duration-fast group-hover:border-primary group-hover:text-primary">
        <Icon name="plus" size={13} className="me-1" aria-hidden />
        Assign
      </span>
    )
  }

  if (cell.code === 'RT') {
    const verdict = eligibility ? (!eligibility.ok ? 'block' : eligibility.warns.length ? 'warn' : 'ok') : 'ok'
    const face = route ? shiftFace(route.shift) : null
    const vehicle = routeVehicle(route)
    return (
      <div
        className="tone-route relative flex h-full w-full flex-col gap-1.5 rounded-md border bg-card p-2 text-start shadow-xs"
        style={{ borderColor: verdict === 'block' ? 'var(--color-error-500)' : verdict === 'warn' ? 'var(--color-warning-scale-500)' : 'var(--color-border)', borderInlineStartWidth: '3px', borderInlineStartColor: 'var(--color-primary)' }}
      >
        <div className="flex items-center justify-between gap-1">
          <span className="truncate text-xs font-semibold text-foreground" title={route?.id ?? cell.ref}>
            {cell.ref ? compactRoute(cell.ref) : 'Route'}
          </span>
          {verdict === 'block' && (
            <span className="inline-flex shrink-0 items-center gap-0.5 rounded-sm bg-error-50 px-1 py-0.5 text-caption font-bold uppercase tracking-wide text-error-700">
              <Icon name="alert-circle" size={11} /> Action req
            </span>
          )}
          {verdict === 'warn' && (
            <span className="inline-flex shrink-0 items-center gap-0.5 rounded-sm bg-warning-scale-50 px-1 py-0.5 text-caption font-bold uppercase tracking-wide text-warning-scale-700">
              <Icon name="alert-triangle" size={11} /> Check
            </span>
          )}
          {saving && verdict === 'ok' && <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-primary opacity-70" aria-hidden />}
        </div>
        {face && (
          <span className="flex items-center gap-1.5 text-caption font-medium text-muted-foreground-strong">
            <Icon name={face.icon} size={13} className="shrink-0 text-primary" aria-hidden />
            <span className="truncate">{face.label}</span>
          </span>
        )}
        {vehicle && (
          <span className="flex items-center gap-1.5 text-caption text-muted-foreground">
            <Icon name="truck-01" size={13} className="shrink-0" aria-hidden />
            <span className="truncate">{vehicle}</span>
          </span>
        )}
        {route?.plan && (
          <span className="flex items-center gap-1.5 text-caption text-muted-foreground">
            <Icon name="calendar-check-01" size={13} className="shrink-0" aria-hidden />
            <span className="truncate" title={`Approved Smart Plan ${route.plan}`}>
              {route.plan}
            </span>
          </span>
        )}
      </div>
    )
  }

  // Off / leave / standby / reliever / extra — a centred, full-word chip.
  const { label, tone } = dutyPresentation(cell)
  return (
    <span
      className={`tone-${tone} flex h-full w-full flex-col items-center justify-center gap-0.5 rounded-md border ${isPast ? 'opacity-70' : ''}`}
      style={{ color: 'var(--tone-fg)', background: 'var(--tone-bg)', borderColor: 'var(--tone-bd)', borderStyle: cell.code === 'WO' ? 'dashed' : 'solid' }}
    >
      <span className="text-xs font-semibold">{label}</span>
      {saving && <span className="size-1.5 animate-pulse rounded-full bg-current opacity-70" aria-hidden />}
    </span>
  )
}
