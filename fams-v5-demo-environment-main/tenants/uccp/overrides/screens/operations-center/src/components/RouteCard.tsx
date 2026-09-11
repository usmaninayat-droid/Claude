import { TriangleAlert, Workflow } from 'lucide-react'

/**
 * RouteCard — NEW local component (not in the design system).
 * A Live GIS Map route list card: status banner, id + status tag, vehicle/driver,
 * bins, progress bar, and plan row. Ported from the prototype + Figma.
 */
export type RouteStatus = 'Delayed' | 'Ongoing' | 'Action Required' | 'Completed'

export type RouteData = {
  id: string
  status: RouteStatus
  vehicle: string
  driver: { name: string; initial: string }
  bins: string
  progress: number
  pct: string
  plan?: string
  planStatus?: { label: string; tone: 'depot' | 'site' }
  alert?: boolean
  banner?: { tone: 'warn' | 'error'; text: string; actionable?: boolean }
  dim?: boolean
  sectors?: string[]
  plannedStartTime?: string
  actualStartTime?: string
  delayText?: string
  plannedEndTime?: string
  estEndTime?: string
}

const STATUS_VAR: Record<RouteStatus, string> = {
  Delayed: 'var(--status-warning)',
  Ongoing: 'var(--status-info)',
  'Action Required': 'var(--status-error)',
  Completed: 'var(--status-success)',
}

export function RouteCard({
  route,
  onClick,
  selected,
  dimmed,
}: {
  route: RouteData
  onClick?: () => void
  /** Emphasise this card (its vehicle is selected on the map). */
  selected?: boolean
  /** Fade this card (another vehicle is selected). */
  dimmed?: boolean
}) {
  return (
    <div
      className={`relative shrink-0 cursor-pointer rounded-md border bg-card transition-all ${
        selected
          ? 'border-[color:var(--gray-400)] shadow-[0_4px_12px_rgba(0,0,0,0.10)]'
          : 'border-border hover:shadow-sm'
      } ${dimmed ? 'opacity-50' : route.dim ? 'opacity-70' : ''}`}
      onClick={onClick}
    >
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">{route.id}</span>
          <span
            className="rounded-[3px] px-1.5 py-1 text-[11px] font-semibold uppercase leading-none text-white"
            style={{ background: STATUS_VAR[route.status] }}
          >
            {route.status}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <img src="/assets/truck-tanker.svg" alt="" className="h-4 w-5 object-contain" />
              <span className="text-sm font-semibold text-muted-foreground">{route.vehicle}</span>
              {route.alert ? <TriangleAlert className="size-3.5 text-[color:var(--status-error)]" /> : null}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="flex size-6 items-center justify-center rounded-full bg-[#00478a] text-[11px] font-semibold text-white">
                {route.driver.initial}
              </span>
              <span className="text-sm text-foreground">{route.driver.name}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <img src="/assets/icon-bin-12.png" alt="" className="size-3" />
            <span>{route.bins}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-border">
            <div className="h-full rounded-full bg-primary" style={{ width: `${route.progress}%` }} />
          </div>
          <span className="text-[10px] font-semibold text-muted-foreground">{route.pct}</span>
        </div>

        {route.plan ? (
          <div className="flex items-center justify-between border-t border-border pt-3">
            <div className="flex min-w-0 items-center gap-2 text-sm text-foreground">
              <Workflow className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{route.plan}</span>
            </div>
            {route.planStatus ? (
              <div className="flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground">
                <span
                  className="size-2 rounded-full"
                  style={{ background: route.planStatus.tone === 'depot' ? 'var(--status-info)' : '#f63d68' }}
                />
                <span>{route.planStatus.label}</span>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Selected Card Details Expanded Section */}
        {selected && (
          <div className="flex flex-col gap-2 border-t border-border pt-3 mt-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Sectors</span>
              <div className="flex gap-1.5">
                {(route.sectors || ['Sector A', 'Sector B']).map((sec) => (
                  <span
                    key={sec}
                    className="rounded-[2px] bg-[color:var(--gray-100,#eaecf0)] px-2 py-0.5 text-[11px] font-semibold text-[color:var(--gray-700,#344054)]"
                  >
                    {sec}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Planned Start Time</span>
              <span className="text-sm font-semibold text-foreground">{route.plannedStartTime || '20 JAN | 13:30'}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Actual Start Time</span>
              <div className="flex items-center gap-1">
                <span className="text-sm font-semibold text-foreground">{route.actualStartTime || '20 JAN | 14:00'}</span>
                {(route.delayText || route.status === 'Delayed' || route.status === 'Action Required') && (
                  <span
                    className="text-sm font-semibold text-[color:var(--status-warning,#f79009)]"
                  >
                    {route.delayText || '(30m delay)'}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Planned End Time</span>
              <span className="text-sm font-semibold text-foreground">{route.plannedEndTime || '20 JAN | 16:00'}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Est. End Time</span>
              <span className="text-sm font-semibold text-foreground">{route.estEndTime || '20 JAN | 16:30'}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
