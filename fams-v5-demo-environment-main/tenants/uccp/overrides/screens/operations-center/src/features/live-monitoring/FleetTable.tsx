import { useEffect, useRef, useState } from 'react'
import { cn } from '@fams/design-system'
import { Pencil, Navigation, Pause, Square, Lock } from 'lucide-react'
import { CustomScrollbar, type CustomScrollbarHandle } from '../../components/CustomScrollbar'
import type { Truck, TruckStatus } from './monitoringData'

export interface FleetTableProps {
  trucks: Truck[]
  selectedId: string | null
  hoverId: string | null
  onSelect: (id: string | null) => void
  onHover: (id: string | null) => void
}

/**
 * Live Monitoring Fleet Table — aligned with ZoneTable typography and Design System specs:
 * - Uses HeadCell component with text-[11px] font-semibold uppercase tracking-wide text-muted-foreground
 * - Container: rounded-[6px] border border-border bg-card
 * - Row text: text-sm font-medium text-foreground matching ZoneTable
 * - Actual vehicle image with status badge overlay
 */
export function FleetTable({
  trucks,
  selectedId,
  hoverId,
  onSelect,
  onHover,
}: FleetTableProps) {
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({})
  const viewportRef = useRef<CustomScrollbarHandle>(null)

  useEffect(() => {
    if (!selectedId) return
    rowRefs.current[selectedId]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [selectedId])

  const [atRightEnd, setAtRightEnd] = useState(true)
  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const update = () => {
      const max = el.scrollWidth - el.clientWidth
      setAtRightEnd(max <= 1 || el.scrollLeft >= max - 1)
    }
    update()
    el.addEventListener('scroll', update, { passive: true })
    const ro = new ResizeObserver(update)
    ro.observe(el)
    if (el.firstElementChild) ro.observe(el.firstElementChild)
    return () => {
      el.removeEventListener('scroll', update)
      ro.disconnect()
    }
  }, [])

  const edgeShade = cn(
    'pointer-events-none absolute inset-y-0 left-0 w-4 -translate-x-full',
    'bg-gradient-to-l from-[rgba(16,24,40,0.06)] to-transparent',
    'transition-opacity duration-200',
    atRightEnd ? 'opacity-0' : 'opacity-100'
  )

  return (
    <CustomScrollbar ref={viewportRef} className="min-h-0 flex-1 rounded-[6px] border border-border bg-card">
      <table className="w-full min-w-[540px] border-collapse text-left">
        <thead className="sticky top-0 z-10 bg-card">
          <tr className="h-12 border-b border-border">
            <HeadCell className="pl-6 w-[230px]">VEHICLE</HeadCell>
            <HeadCell className="w-[180px]">SPEED</HeadCell>
            <HeadCell>IMEI</HeadCell>
            <th scope="col" className="pr-4 pl-2 text-right w-10">
              <button
                type="button"
                aria-label="Edit columns"
                className="inline-flex size-7 items-center justify-center rounded-[4px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <Pencil className="size-4" />
              </button>
            </th>
          </tr>
        </thead>

        <tbody>
          {trucks.map((truck, i) => {
            const isSelected = truck.id === selectedId
            const divider = i < trucks.length - 1

            return (
              <tr
                key={truck.id}
                ref={(el) => { rowRefs.current[truck.id] = el }}
                onClick={() => onSelect(isSelected ? null : truck.id)}
                onMouseEnter={() => onHover(truck.id)}
                onMouseLeave={() => onHover(null)}
                className={cn(
                  'h-16 cursor-pointer border-border transition-colors',
                  divider && 'border-b',
                  isSelected ? 'bg-muted/90 font-medium' : truck.id === hoverId ? 'bg-muted/60' : 'hover:bg-muted/40'
                )}
              >
                {/* Vehicle: Image + Status badge overlay + Vehicle code */}
                <td className="pl-6 pr-3">
                  <div className="flex items-center gap-3">
                    <VehicleImageWithBadge
                      status={truck.status}
                      pending={truck.pendingCommand === 'immobilize'}
                    />
                    <div className="min-w-0">
                      {/* Fixed-length identifier (DS text-truncation guideline
                          §1): plates never truncate — no ellipsis, no
                          exceptions. `whitespace-nowrap` replaces `truncate`
                          so the full value always renders. */}
                      <span className="block whitespace-nowrap text-sm font-medium text-foreground">
                        {truck.plate}
                      </span>
                      {truck.pendingCommand === 'immobilize' ? (
                        <span className="inline-flex items-center gap-1 rounded-[4px] bg-[#F79009]/12 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#B54708]">
                          <span aria-hidden className="size-1 rounded-full bg-[#F79009] animate-pulse" />
                          Queued
                        </span>
                      ) : null}
                    </div>
                  </div>
                </td>

                {/* Speed */}
                <td className="px-3">
                  <span className="truncate text-sm text-foreground font-medium">
                    {truck.speed} km/h
                  </span>
                </td>

                {/* IMEI — fixed-length identifier (§1): never truncate. */}
                <td className="px-3">
                  <span className="whitespace-nowrap text-sm text-muted-foreground">
                    {truck.imei}
                  </span>
                </td>

                {/* Header pencil alignment cell */}
                <td className="pr-4 pl-2 text-right relative">
                  <span aria-hidden className={edgeShade} />
                </td>
              </tr>
            )
          })}

          {trucks.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-4 py-16 text-center text-sm text-muted-foreground">
                No vehicles match your search or filters.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </CustomScrollbar>
  )
}

function HeadCell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      scope="col"
      className={cn('truncate px-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground', className)}
    >
      {children}
    </th>
  )
}

function VehicleImageWithBadge({ status, pending }: { status: TruckStatus; pending?: boolean }) {
  return (
    <div className="relative flex shrink-0 items-center justify-center w-14 h-10">
      <img
        src="/assets/vehicle-car.jpg"
        alt="Vehicle"
        className="w-14 h-10 object-contain mix-blend-multiply"
      />
      <div className="absolute -bottom-0.5 left-0 flex size-[21px] items-center justify-center rounded-full border-2 border-white bg-card shadow-sm z-10">
        {status === 'stopped' && (
          <div className="flex size-full items-center justify-center rounded-full bg-[#D92D20]">
            <Square className="size-2 fill-white text-white" />
          </div>
        )}
        {status === 'moving' && (
          <div className="flex size-full items-center justify-center rounded-full bg-[#12B76A]">
            <Navigation className="size-2.5 fill-white text-white rotate-45" />
          </div>
        )}
        {status === 'idling' && (
          <div className="flex size-full items-center justify-center rounded-full bg-[#F79009]">
            <Pause className="size-2.5 fill-white text-white" />
          </div>
        )}
        {status === 'immobilized' && (
          <div className="flex size-full items-center justify-center rounded-full bg-[#B42318]">
            <Lock className="size-2.5 text-white" />
          </div>
        )}
      </div>
      {/* Pending immobilization — amber pulsing lock in the top-right corner,
          overlaid on the vehicle image, distinct from the status badge below. */}
      {pending ? (
        <div className="absolute -top-0.5 right-0 flex size-[18px] items-center justify-center rounded-full border-2 border-white bg-[#F79009] shadow-sm z-10 animate-pulse">
          <Lock className="size-2 text-white" />
        </div>
      ) : null}
    </div>
  )
}

