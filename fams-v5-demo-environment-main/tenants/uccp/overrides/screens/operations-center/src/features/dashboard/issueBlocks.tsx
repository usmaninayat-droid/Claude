import { Badge, Avatar } from '@fams/design-system'
import { MapPin } from 'lucide-react'
import type { Assignment, VehicleLine, DriverLine, MetaLine } from './currentShiftIssues'

/**
 * Shared presentational rows for a route's assignment block — used by both the
 * Current Shift Issues sheet and the Nearby Routes sheet (the failed route's
 * currently-assigned vehicle/driver + collection meta).
 */
export function initials(name: string) {
  const p = name.trim().split(/\s+/)
  return ((p[0]?.[0] ?? '') + (p[1]?.[0] ?? '')).toUpperCase() || '?'
}

export function MiniDonut({ pct }: { pct: number }) {
  return (
    <span
      className="relative inline-flex size-7 shrink-0 items-center justify-center rounded-full"
      style={{ background: `conic-gradient(var(--status-warning) ${pct * 3.6}deg, var(--gray-200) 0)` }}
    >
      <span className="flex size-5 items-center justify-center rounded-full bg-card text-[9px] font-semibold text-foreground">
        {pct}%
      </span>
    </span>
  )
}

export function VehicleRow({ v }: { v: VehicleLine }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {/* Realistic compactor render for every row (Figma); only the text is
          struck/greyed when the vehicle is unavailable — not the truck. */}
      <img src="/assets/truck-tanker.svg" alt="" className="h-7 w-10 shrink-0 object-contain" />
      <span className={v.struck ? 'text-muted-foreground line-through' : 'text-foreground'}>
        <span className="font-semibold">{v.plate}</span> • {v.model}
      </span>
      {v.badge ? <Badge variant={v.badge.tone}>{v.badge.label}</Badge> : null}
    </div>
  )
}

export function DriverRow({ d }: { d: DriverLine }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={d.struck ? 'opacity-50' : ''}>
        <Avatar size="sm" fallback={initials(d.name)} />
      </span>
      <span className={d.struck ? 'text-muted-foreground line-through' : 'text-foreground'}>
        <span className="font-semibold">{d.code}</span> • {d.name}
      </span>
      {d.badge ? <Badge variant={d.badge.tone}>{d.badge.label}</Badge> : null}
    </div>
  )
}

export function MetaRow({ m }: { m: MetaLine }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <MapPin className="size-4" />
        <span className="font-semibold text-foreground">{m.count}</span>
      </span>
      {m.pct != null ? <MiniDonut pct={m.pct} /> : null}
      {m.chips.map((c) => (
        <span key={c} className="inline-flex items-center gap-2">
          <span className="text-[color:var(--gray-300)]">•</span>
          {c}
        </span>
      ))}
    </div>
  )
}

export function Block({ a }: { a: Assignment }) {
  const dotColor = a.side.tone === 'error' ? 'var(--status-error)' : 'var(--status-info)'
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex flex-col gap-2.5">
        <VehicleRow v={a.vehicle} />
        {a.driver ? <DriverRow d={a.driver} /> : null}
        {a.meta ? <MetaRow m={a.meta} /> : null}
      </div>
      <div className="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-sm text-muted-foreground">
        <span className="size-2 rounded-full" style={{ background: dotColor }} />
        {a.side.label}
      </div>
    </div>
  )
}
