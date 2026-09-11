import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LeafletMap, type LeafletMapHandle, type AssetMarkerState } from '@ds/components/map'
import { cn } from '@fams/design-system'
import { Plus, Minus, Maximize2, Layers, Lock, Unlock, Clock, XOctagon } from 'lucide-react'
import { TruckMarker, TelematicsCard, type TelematicsData } from '../dashboard/LiveGisMap'
import { FLEET_MAP_CENTER, FLEET_MAP_ZOOM, STATUS_META, type Truck, type TruckStatus } from './monitoringData'

const STATUS_TO_ASSET_STATE: Record<TruckStatus, AssetMarkerState> = {
  moving: 'moving',
  idling: 'excess-idling',
  stopped: 'stopped',
  immobilized: 'immobilized',
}

/** TelematicsCard's header state colouring branches on these route statuses;
 *  the footer itself is overridden via the `footer` prop below. */
const STATUS_TO_ROUTE: Record<TruckStatus, string> = {
  moving: 'Ongoing',
  idling: 'Delayed',
  stopped: 'Action Required',
  immobilized: 'Action Required',
}

function toTelematics(t: Truck): TelematicsData {
  return {
    title: `Compactor · ${t.plate}`,
    plate: t.plate,
    location: t.location,
    moving: t.status === 'moving',
    state: STATUS_META[t.status].label,
    since: t.lastSeen,
    driver: t.driver,
    phone: t.contact,
    helper1: 'Rehmat Khan',
    helper2: 'Mukaish Khan',
    plan: `TDW-${t.tags[0] ?? 'ROUTE'}-${t.id.slice(-3)}`,
    speed: `${t.speed} km/h`,
    coordinates: `${t.position[0].toFixed(3)} , ${t.position[1].toFixed(3)}`,
    sectors: t.tags.join(', ') || t.location,
    fuel: t.status === 'moving' ? '82%' : t.status === 'idling' ? '54%' : t.status === 'immobilized' ? '61%' : '93%',
    odometer: t.odometer ? `${t.odometer.toLocaleString()}` : '0',
    sos: '--',
  }
}

export interface FleetMapProps {
  trucks: Truck[]
  selectedId: string | null
  hoverId: string | null
  onSelect: (id: string | null) => void
  onHover: (id: string | null) => void
  /** Opens the immobilize confirmation flow for the truck (dispatcher-only). */
  onImmobilize: (truck: Truck) => void
  /** Opens the mobilize confirmation flow for an immobilized truck. */
  onMobilize: (truck: Truck) => void
  /** Cancels a queued (in-motion) immobilization command before it fires. */
  onCancelPending: (truck: Truck) => void
  className?: string
}

/**
 * Hybrid view's map half — reuses the dashboard's `TruckMarker` and
 * `TelematicsCard` so live monitoring reads as the same product surface
 * as the Live GIS Map on the operations dashboard.
 */
export function FleetMap({
  trucks, selectedId, hoverId, onSelect, onImmobilize, onMobilize, onCancelPending, className,
}: FleetMapProps) {
  const mapRef = useRef<LeafletMapHandle>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  // Container-space pixel projection per truck, refreshed on every pan/zoom.
  const [points, setPoints] = useState<Record<string, { x: number; y: number } | null>>({})

  const trucksRef = useRef(trucks)
  trucksRef.current = trucks

  const reproject = useCallback(() => {
    const h = mapRef.current
    if (!h) return
    const next: Record<string, { x: number; y: number } | null> = {}
    for (const t of trucksRef.current) next[t.id] = h.project(t.position)
    setPoints(next)
  }, [])

  useEffect(() => {
    let raf = 0
    let tries = 0
    const attempt = () => {
      if (trucksRef.current[0] && mapRef.current?.project(trucksRef.current[0].position)) reproject()
      else if (tries++ < 180) raf = requestAnimationFrame(attempt)
    }
    attempt()
    return () => cancelAnimationFrame(raf)
  }, [reproject])

  useEffect(() => { reproject() }, [trucks, reproject])

  // Fly to selection so its telematics card lands centred, biased north so the
  // tall card stays fully in view.
  useEffect(() => {
    if (!selectedId) return
    const t = trucksRef.current.find((x) => x.id === selectedId)
    if (!t) return
    mapRef.current?.flyTo([t.position[0] + 0.009, t.position[1]])
  }, [selectedId])

  const selected = useMemo(() => trucks.find((t) => t.id === selectedId) ?? null, [trucks, selectedId])
  const selectedTelematics = useMemo(() => (selected ? toTelematics(selected) : null), [selected])
  const selectedPoint = selected ? points[selected.id] : null

  return (
    <div
      ref={wrapRef}
      className={cn('relative isolate overflow-hidden rounded-[6px] border border-border bg-card', className)}
      onClick={() => onSelect(null)}
    >
      <LeafletMap
        ref={mapRef}
        center={FLEET_MAP_CENTER}
        zoom={FLEET_MAP_ZOOM}
        onViewportChange={reproject}
        className="h-full w-full"
      />

      {/* Truck overlay (positioned from the map's projection). z-[800] sits above
          Leaflet's marker/tooltip panes but below its controls. */}
      <div className="pointer-events-none absolute inset-0 z-[800] overflow-hidden">
        {trucks.map((t) => {
          const p = points[t.id]
          if (!p) return null
          return (
            <TruckMarker
              key={t.id}
              x={p.x}
              y={p.y}
              state={STATUS_TO_ASSET_STATE[t.status]}
              active={t.id === selectedId}
              dim={(selectedId != null && t.id !== selectedId) || (!selectedId && hoverId != null && t.id !== hoverId)}
              onClick={(e) => {
                e.stopPropagation()
                onSelect(t.id === selectedId ? null : t.id)
              }}
            />
          )
        })}
      </div>

      {/* Telematics popup for the selected vehicle (separate overlay so it isn't
          clipped by the marker overlay's overflow-hidden). */}
      {selected && selectedTelematics && selectedPoint ? (
        <div className="pointer-events-none absolute inset-0 z-[900]" onClick={(e) => e.stopPropagation()}>
          <TelematicsCard
            key={selected.id}
            x={selectedPoint.x}
            y={selectedPoint.y - 70}
            data={selectedTelematics}
            status={STATUS_TO_ROUTE[selected.status]}
            onClose={() => onSelect(null)}
            // Live Monitoring's action set: remote immobilization (and its
            // inverse) instead of the dashboard's dispatch CTAs. Rendering is
            // permission-gated in a real deployment (`fleet.immobilize`).
            footer={
              selected.pendingCommand === 'immobilize' ? (
                // Queued — a cut-off command was accepted by the telematics
                // unit but is holding until the vehicle is stationary. Show
                // status + a Cancel affordance until it fires or is aborted.
                <div className="flex w-full flex-col gap-3">
                  <div className="flex items-start gap-2 rounded border border-[#F79009]/30 bg-[#F79009]/8 p-2.5 text-xs text-[#B54708]">
                    <Clock className="mt-0.5 size-3.5 shrink-0" />
                    <div className="min-w-0">
                      <div className="font-semibold">Immobilization queued</div>
                      <div className="text-[11px] text-[#B54708]/85">
                        {selected.speed > 0
                          ? `Waiting for ${selected.plate} to stop (currently ${selected.speed} km/h).`
                          : `${selected.plate} has stopped — cut-off firing now…`}
                        {selected.pendingSince ? ` · queued at ${selected.pendingSince}` : ''}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onCancelPending(selected)}
                    className="flex items-center justify-center gap-2 rounded border border-border text-foreground px-3 py-2 text-sm font-semibold bg-card hover:bg-muted cursor-pointer"
                  >
                    <XOctagon className="size-4" />
                    Cancel Immobilization
                  </button>
                </div>
              ) : selected.status === 'immobilized' ? (
                <button
                  type="button"
                  onClick={() => onMobilize(selected)}
                  className="flex-1 flex items-center justify-center gap-2 rounded bg-primary text-white px-3 py-2 text-sm font-semibold hover:bg-primary/90 cursor-pointer"
                >
                  <Unlock className="size-4" />
                  Mobilize Vehicle
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onImmobilize(selected)}
                  className="flex-1 flex items-center justify-center gap-2 rounded border border-[color:var(--status-error,#f04438)] text-[color:var(--status-error,#f04438)] px-3 py-2 text-sm font-semibold bg-transparent hover:bg-[color:var(--status-error,#f04438)]/5 cursor-pointer"
                >
                  <Lock className="size-4" />
                  Immobilize Vehicle
                </button>
              )
            }
          />
        </div>
      ) : null}

      {/* Top-right — Layers (matches dashboard's Live GIS Map). */}
      <div
        className="absolute right-4 top-4 z-[900] flex flex-col gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Layers"
          className="flex size-10 items-center justify-center rounded bg-white shadow-md text-foreground hover:bg-muted border border-border cursor-pointer"
        >
          <Layers className="size-5" />
        </button>
      </div>

      {/* Bottom-right — zoom pair + maximize (matches dashboard's Live GIS Map). */}
      <div
        className="absolute right-4 bottom-4 z-[900] flex flex-col gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col rounded bg-white shadow-md border border-border overflow-hidden">
          <button
            type="button"
            aria-label="Zoom in"
            onClick={() => mapRef.current?.zoomIn()}
            className="flex size-10 items-center justify-center text-foreground hover:bg-muted cursor-pointer"
          >
            <Plus className="size-5" />
          </button>
          <div className="h-px bg-border w-full" />
          <button
            type="button"
            aria-label="Zoom out"
            onClick={() => mapRef.current?.zoomOut()}
            className="flex size-10 items-center justify-center text-foreground hover:bg-muted cursor-pointer"
          >
            <Minus className="size-5" />
          </button>
        </div>
        <button
          type="button"
          aria-label="Maximize"
          onClick={() => {
            const el = wrapRef.current
            if (!el) return
            if (document.fullscreenElement) void document.exitFullscreen()
            else void el.requestFullscreen?.()
          }}
          className="flex size-10 items-center justify-center rounded bg-white shadow-md text-foreground hover:bg-muted border border-border cursor-pointer"
        >
          <Maximize2 className="size-5" />
        </button>
      </div>
    </div>
  )
}
