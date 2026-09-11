import { forwardRef, useEffect, useMemo, useRef, useState } from 'react'
import {
  Input, TooltipProvider, Tooltip, TooltipTrigger, TooltipContent, cn,
  Toaster, toast,
} from '@fams/design-system'
import {
  Search, Filter, FileDown, X, ChevronRight, ChevronsRight,
} from 'lucide-react'
import { FleetTable } from './FleetTable'
import { FleetMap } from './FleetMap'
import { ImmobilizeSheet, MobilizeSheet } from './ImmobilizeFlow'
import { FLEET, type Truck } from './monitoringData'

/** Default list/map split, as a % of the content column — matches Zones. */
const DEFAULT_SPLIT = 40
const MIN_SPLIT = 26
const MAX_SPLIT = 70

/**
 * Live Monitoring — hybrid list + map, structured to match Zones Management
 * (toolbar, count row, table, splitter, map with control stack + popup).
 */
export function LiveMonitoringPage() {
  // Fleet lives in state so immobilize/mobilize commands mutate vehicle status.
  const [fleet, setFleet] = useState<Truck[]>(FLEET)
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [split, setSplit] = useState(DEFAULT_SPLIT)
  // Trucks with a pending immobilize/mobilize confirmation dialog.
  const [immobilizeTarget, setImmobilizeTarget] = useState<Truck | null>(null)
  const [mobilizeTarget, setMobilizeTarget] = useState<Truck | null>(null)
  const splitRef = useRef<HTMLDivElement>(null)
  // Live timers for queued immobilization commands. Keyed by truck id so a
  // cancel/re-issue clears the previous timer instead of double-firing.
  const queueTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  useEffect(() => () => {
    // Purge outstanding queue timers on unmount so a nav-away doesn't fire a
    // ghost immobilization after the surface is gone.
    Object.values(queueTimers.current).forEach((id) => clearTimeout(id))
  }, [])

  const listed = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return fleet
    return fleet.filter((t) => (
      t.plate.toLowerCase().includes(q) ||
      t.driver.toLowerCase().includes(q) ||
      t.activity.toLowerCase().includes(q) ||
      t.location.toLowerCase().includes(q) ||
      t.tags.some((tag) => tag.toLowerCase().includes(q))
    ))
  }, [fleet, query])

  useEffect(() => {
    if (selectedId && !fleet.some((t) => t.id === selectedId)) setSelectedId(null)
  }, [fleet, selectedId])

  const auditLine = (reason: string) =>
    `Audit log: dispatcher · ${new Date().toLocaleTimeString()} · "${reason}"`

  /** Immediate immobilization — used both for stationary vehicles and for the
   *  delayed fire of a queued command once the truck comes to a stop.
   *  Idempotent: a truck that is already immobilized is left unchanged, so a
   *  double-invoke of the updater (React strict mode) doesn't double-fire. */
  const fireImmobilize = (id: string) => {
    setFleet((f) =>
      f.map((t) =>
        t.id === id && t.status !== 'immobilized'
          ? {
              ...t,
              status: 'immobilized',
              speed: 0,
              heading: 0,
              lastSeen: 'just now',
              activity: 'Immobilized by dispatcher',
              pendingCommand: null,
              pendingSince: undefined,
            }
          : t
      )
    )
    delete queueTimers.current[id]
  }

  /**
   * Execute the (simulated) telematics command. The real integration POSTs to
   * the fleet API — which re-validates the dispatcher's `fleet.immobilize`
   * permission server-side and writes the audit entry — then updates on ACK
   * from the device. Here the ACK latency is simulated before state flips.
   *
   * Moving vehicle → the command is HELD on the device (safety interlock),
   * the truck is marked `pendingCommand: 'immobilize'`, its speed decays over
   * a few seconds, and the cut-off fires once speed hits zero.
   */
  const sendCommand = async (truck: Truck, command: 'immobilize' | 'mobilize', reason: string) => {
    await new Promise((r) => setTimeout(r, 1200)) // device ACK round-trip
    const now = new Date().toLocaleTimeString()

    if (command === 'mobilize') {
      setFleet((f) =>
        f.map((t) =>
          t.id === truck.id
            ? {
                ...t,
                status: 'stopped',
                speed: 0,
                heading: 0,
                lastSeen: 'just now',
                activity: 'Mobilized — awaiting driver',
                pendingCommand: null,
                pendingSince: undefined,
              }
            : t
        )
      )
      toast.success(`${truck.plate} mobilized`, { description: auditLine(reason) })
      return
    }

    // Immobilize — branch on the safety interlock.
    if (truck.speed <= 5) {
      fireImmobilize(truck.id)
      toast.success(`${truck.plate} immobilized`, { description: auditLine(reason) })
      return
    }

    // Queued: mark the truck, decay its speed over ~5s, then fire.
    setFleet((f) =>
      f.map((t) =>
        t.id === truck.id
          ? {
              ...t,
              pendingCommand: 'immobilize',
              pendingSince: now,
              activity: 'Immobilization queued — safe stop pending',
            }
          : t
      )
    )
    toast.warning(`Immobilization queued for ${truck.plate}`, {
      description: `Executes when stationary · ${auditLine(reason)}`,
    })

    // Simulate the driver slowing down. Each tick decrements speed; when it
    // hits 0 we fire the cut-off, unless the dispatcher cancelled in between.
    // We inspect the *result* of the state update via flags flipped inside the
    // updater — the updater stays pure (no side effects there), the follow-up
    // scheduling happens after setFleet returns, so a strict-mode double-invoke
    // of the updater has no lasting effect (the second run just re-derives the
    // same state and the same flags).
    const tick = () => {
      let cancelled = false
      let reachedZero = false
      setFleet((f) =>
        f.map((t) => {
          if (t.id !== truck.id) return t
          if (t.pendingCommand !== 'immobilize') { cancelled = true; return t }
          const next = Math.max(0, t.speed - 12)
          if (next === 0) reachedZero = true
          return { ...t, speed: next, heading: next === 0 ? 0 : t.heading }
        })
      )
      if (cancelled) return
      if (reachedZero) {
        // Fire on the next tick so the speed-0 render commits before the
        // immobilized state — the popup then reads "stopped — cut-off firing".
        queueTimers.current[truck.id] = setTimeout(() => {
          fireImmobilize(truck.id)
          toast.success(`${truck.plate} immobilized`, {
            description: `Queued command executed · ${auditLine(reason)}`,
          })
        }, 600)
        return
      }
      queueTimers.current[truck.id] = setTimeout(tick, 1000)
    }
    // Kick off the first tick after the ACK returns.
    queueTimers.current[truck.id] = setTimeout(tick, 1000)
  }

  const cancelPendingImmobilization = (truck: Truck) => {
    const timer = queueTimers.current[truck.id]
    if (timer) { clearTimeout(timer); delete queueTimers.current[truck.id] }
    setFleet((f) =>
      f.map((t) =>
        t.id === truck.id && t.pendingCommand === 'immobilize'
          ? {
              ...t,
              pendingCommand: null,
              pendingSince: undefined,
              activity: 'Immobilization cancelled by dispatcher',
            }
          : t
      )
    )
    toast.info(`Immobilization cancelled for ${truck.plate}`, {
      description: `Audit log: dispatcher · ${new Date().toLocaleTimeString()} · cancelled queued command`,
    })
  }

  const onSplitDrag = (e: React.MouseEvent) => {
    e.preventDefault()
    const rect = splitRef.current?.getBoundingClientRect()
    if (!rect) return
    const move = (ev: MouseEvent) => {
      const pct = ((ev.clientX - rect.left) / rect.width) * 100
      setSplit(Math.min(MAX_SPLIT, Math.max(MIN_SPLIT, pct)))
    }
    const up = () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
  }

  return (
    <TooltipProvider delayDuration={200}>
      {/* `isolate` traps the map/splitter overlays' z-indexes (needed to beat
          Leaflet's panes) in this stacking context, so portalled dialogs and
          toasts always render above them. */}
      <div ref={splitRef} className="isolate flex min-h-0 flex-1 overflow-hidden bg-background">
        {/* ── List half ─────────────────────────────────────────────────── */}
        <div
          className="flex min-h-0 min-w-0 flex-col gap-4 py-6 pl-6 pr-3"
          style={{ width: `${split}%` }}
        >
          {/* Toolbar */}
          <div className="flex shrink-0 items-center gap-3.5">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search vehicles, drivers, locations"
                aria-label="Search vehicles"
                className="h-12 rounded-[6px] pl-12 text-sm"
              />
              {query ? (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-[4px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              ) : null}
            </div>

            <ToolbarButton label="Filter">
              <Filter className="size-5" />
            </ToolbarButton>
            <ToolbarButton label="Export">
              <FileDown className="size-5" />
            </ToolbarButton>
          </div>

          {/* Count row matching Zones management pattern */}
          <div className="flex shrink-0 items-center">
            <span className="text-sm text-muted-foreground">
              Total <span className="font-medium text-foreground">{listed.length} items</span> out of <span className="font-medium text-foreground">1000</span>
            </span>
          </div>

          <div className="relative flex min-h-0 flex-1 flex-col">
            <FleetTable
              trucks={listed}
              selectedId={selectedId}
              hoverId={hoverId}
              onSelect={setSelectedId}
              onHover={setHoverId}
            />
          </div>
        </div>

        {/* ── Map half ──────────────────────────────────────────────────── */}
        <div className="relative min-w-0 flex-1">
          <FleetMap
            trucks={fleet}
            selectedId={selectedId}
            hoverId={hoverId}
            onSelect={setSelectedId}
            onHover={setHoverId}
            onImmobilize={setImmobilizeTarget}
            onMobilize={setMobilizeTarget}
            onCancelPending={cancelPendingImmobilization}
            className="h-full w-full rounded-l-[6px] border-l border-border"
          />

          {/* Splitter control (matches Zones). */}
          <div className="absolute left-0 top-1/2 z-[820] flex -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[6px] border border-border bg-card shadow-md">
            <SplitButton label="Close map">
              <X className="size-4" />
            </SplitButton>
            <SplitButton
              label="Drag to resize"
              onMouseDown={onSplitDrag}
              onDoubleClick={() => setSplit(DEFAULT_SPLIT)}
              className="cursor-col-resize"
            >
              <ChevronRight className="size-4" />
            </SplitButton>
            <SplitButton label="Expand map" last>
              <ChevronsRight className="size-4" />
            </SplitButton>
          </div>
        </div>
      </div>

      {/* Remote immobilization / mobilization side sheets (see ImmobilizeFlow). */}
      <ImmobilizeSheet
        truck={immobilizeTarget}
        onOpenChange={(open) => { if (!open) setImmobilizeTarget(null) }}
        onConfirm={async ({ reason }) => {
          if (immobilizeTarget) await sendCommand(immobilizeTarget, 'immobilize', reason)
        }}
      />
      <MobilizeSheet
        truck={mobilizeTarget}
        onOpenChange={(open) => { if (!open) setMobilizeTarget(null) }}
        onConfirm={async ({ reason }) => {
          if (mobilizeTarget) await sendCommand(mobilizeTarget, 'mobilize', reason)
        }}
      />
      <Toaster position="bottom-right" richColors />
    </TooltipProvider>
  )
}

const ToolbarButton = forwardRef<
  HTMLButtonElement,
  {
    label: string
    children: React.ReactNode
    active?: boolean
  } & React.ButtonHTMLAttributes<HTMLButtonElement>
>(function ToolbarButton({ label, children, active, ...rest }, ref) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          ref={ref}
          type="button"
          aria-label={label}
          aria-pressed={active}
          className={cn(
            'relative flex size-12 shrink-0 items-center justify-center rounded-[6px] border transition-colors',
            active
              ? 'border-[color:var(--primary)]/30 bg-[color:var(--primary)]/12 text-primary'
              : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
          {...rest}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
})

function SplitButton({
  label, children, last, className, ...rest
}: {
  label: string
  children: React.ReactNode
  last?: boolean
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className={cn(
            'flex size-8 items-center justify-center text-foreground transition-colors hover:bg-muted',
            !last && 'border-b border-border',
            className
          )}
          {...rest}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  )
}
