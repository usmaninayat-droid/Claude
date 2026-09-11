import { useMemo, useState } from 'react'
import { X, AlertTriangle, Truck, ShieldOff, Cable, KeyRound, ShieldCheck } from 'lucide-react'
import {
  Button, TooltipProvider, Toaster, toast, cn,
} from '@fams/design-system'
import { DeviceConfigTable } from './DeviceConfigTable'
import { VerifyIdentityDialog } from './VerifyIdentityDialog'
import { FEATURES, VEHICLES, type FeatureId, type Vehicle } from './deviceConfigData'

/** Where the step-up verification code is sent. Wire to the signed-in user once auth lands. */
const ADMIN_EMAIL = 'super.admin@fams.com'

function matchesSearch(v: Vehicle, query: string) {
  if (!query.trim()) return true
  const q = query.trim().toLowerCase()
  return (
    v.plate.toLowerCase().includes(q) ||
    v.vin.toLowerCase().includes(q) ||
    v.imei.toLowerCase().includes(q) ||
    v.model.toLowerCase().includes(q)
  )
}

type CardFilter = 'all' | FeatureId

export function DeviceConfigPage({
  query = '',
  vehicleTypeFilter = 'all',
}: {
  query?: string
  vehicleTypeFilter?: string
}) {
  // `saved` is the last committed state; `vehicles` is the working copy the
  // toggles write to. Nothing leaves this page until the user saves — and a
  // save is a critical action, so it goes through step-up verification first.
  const [saved, setSaved] = useState(VEHICLES)
  const [vehicles, setVehicles] = useState(VEHICLES)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [activeCardFilter, setActiveCardFilter] = useState<CardFilter>('all')
  const [verifyOpen, setVerifyOpen] = useState(false)

  /** Every (vehicle, feature) pair whose enabled state differs from the last save. */
  const pendingChanges = useMemo(() => {
    const savedById = new Map(saved.map((v) => [v.id, v]))
    let count = 0
    for (const v of vehicles) {
      const before = savedById.get(v.id)
      if (!before) continue
      for (const f of FEATURES) {
        if (before.features[f.id].enabled !== v.features[f.id].enabled) count += 1
      }
    }
    return count
  }, [saved, vehicles])

  const isDirty = pendingChanges > 0

  const discardChanges = () => {
    setVehicles(saved)
    setSelectedIds(new Set())
  }

  const commitChanges = () => {
    setSaved(vehicles)
    setVerifyOpen(false)
    setSelectedIds(new Set())
    toast.success(
      `${pendingChanges} ${pendingChanges === 1 ? 'change' : 'changes'} saved`,
      { description: 'Telematics feature access updated and audit-logged.' }
    )
  }

  const filtered = useMemo(
    () =>
      vehicles.filter((v) => {
        if (!matchesSearch(v, query)) return false
        if (vehicleTypeFilter !== 'all' && v.type !== vehicleTypeFilter) return false
        if (activeCardFilter !== 'all') {
          const fs = v.features[activeCardFilter]
          if (!(fs.status === 'fitted' && fs.enabled)) return false
        }
        return true
      }),
    [vehicles, query, vehicleTypeFilter, activeCardFilter]
  )

  const stats = useMemo(() => {
    const featureEnabled = (id: FeatureId) =>
      vehicles.filter((v) => v.features[id].status === 'fitted' && v.features[id].enabled).length
    return {
      total: vehicles.length,
      immobEnabled: featureEnabled('immobilizer'),
      canEnabled: featureEnabled('canBus'),
      ibEnabled: featureEnabled('iButton'),
    }
  }, [vehicles])

  const updateFeature = (id: string, feature: FeatureId, value: boolean) =>
    setVehicles((prev) =>
      prev.map((v) =>
        v.id === id
          ? { ...v, features: { ...v.features, [feature]: { ...v.features[feature], enabled: value } } }
          : v
      )
    )

  const toggleSelect = (id: string, value: boolean) =>
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (value) next.add(id)
      else next.delete(id)
      return next
    })

  const toggleAll = (value: boolean) => {
    setSelectedIds(() => {
      if (!value) return new Set()
      return new Set(
        filtered
          .filter((v) => FEATURES.some((f) => v.features[f.id].status === 'fitted'))
          .map((v) => v.id)
      )
    })
  }

  const bulkSet = (feature: FeatureId | 'all', value: boolean) => {
    setVehicles((prev) =>
      prev.map((v) => {
        if (!selectedIds.has(v.id)) return v
        if (feature === 'all') {
          const nextFeatures = { ...v.features }
          for (const f of FEATURES) {
            if (nextFeatures[f.id].status === 'fitted') {
              nextFeatures[f.id] = { ...nextFeatures[f.id], enabled: value }
            }
          }
          return { ...v, features: nextFeatures }
        }
        if (v.features[feature].status !== 'fitted') return v
        return {
          ...v,
          features: { ...v.features, [feature]: { ...v.features[feature], enabled: value } },
        }
      })
    )
    setSelectedIds(new Set())
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-5">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Telematics Features Config</h1>
          <p className="text-sm text-muted-foreground">
            Turn on the hardware-gated features Users can use per vehicle — Immobilizer, CAN Bus
            telemetry, and iButton driver ID. A feature can only be enabled where its module is
            physically fitted.
          </p>
        </div>

        <div className="flex items-start gap-3 rounded-md border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-800">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-semibold">Enabling a feature doesn't trigger it</p>
            <p className="text-xs text-warning-700">
              Turning Immobilizer on here only lets Users use it in Live Monitoring — every
              immobilization still needs a second confirmation and is audit-logged. CAN Bus and
              iButton control whether their signals feed into events, reports, and driver
              assignment.
            </p>
          </div>
        </div>

        {/* Summary cards — clickable filters, matches Notifications Configuration style */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
          {[
            {
              id: 'all' as CardFilter,
              label: 'Fleet total',
              value: stats.total,
              icon: Truck,
              iconColor: 'text-blue-600 dark:text-blue-400',
              bgColor: 'bg-blue-500/10 dark:bg-blue-500/20',
            },
            {
              id: 'immobilizer' as CardFilter,
              label: 'Immobilizer enabled',
              value: stats.immobEnabled,
              icon: ShieldOff,
              iconColor: 'text-rose-600 dark:text-rose-400',
              bgColor: 'bg-rose-500/10 dark:bg-rose-500/20',
            },
            {
              id: 'canBus' as CardFilter,
              label: 'CAN Bus enabled',
              value: stats.canEnabled,
              icon: Cable,
              iconColor: 'text-emerald-600 dark:text-emerald-400',
              bgColor: 'bg-emerald-500/10 dark:bg-emerald-500/20',
            },
            {
              id: 'iButton' as CardFilter,
              label: 'iButton enabled',
              value: stats.ibEnabled,
              icon: KeyRound,
              iconColor: 'text-amber-600 dark:text-amber-400',
              bgColor: 'bg-amber-500/10 dark:bg-amber-500/20',
            },
          ].map((c) => {
            const Icon = c.icon
            const isActive = c.id !== 'all' && activeCardFilter === c.id
            return (
              <div
                key={c.id}
                role="button"
                tabIndex={0}
                aria-pressed={isActive}
                onClick={() => {
                  if (c.id === 'all') setActiveCardFilter('all')
                  else setActiveCardFilter((prev) => (prev === c.id ? 'all' : c.id))
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    if (c.id === 'all') setActiveCardFilter('all')
                    else setActiveCardFilter((prev) => (prev === c.id ? 'all' : c.id))
                  }
                }}
                className={cn(
                  'flex items-center gap-3 rounded-md border p-4 cursor-pointer transition-all select-none outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  isActive
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-card hover:border-primary/50 hover:bg-muted/30'
                )}
              >
                <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-full', c.bgColor, c.iconColor)}>
                  <Icon className="size-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground font-medium">{c.label}</span>
                  <span className="text-xl font-semibold text-foreground tracking-tight mt-0.5">{c.value}</span>
                </div>
              </div>
            )
          })}
        </div>

        <DeviceConfigTable
          vehicles={filtered}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onToggleAll={toggleAll}
          onToggleFeature={updateFeature}
        />

        {selectedIds.size > 0 && (
          <div
            className={cn(
              'fixed left-1/2 z-[100] flex -translate-x-1/2 items-center gap-6 rounded-[6px] border border-gray-300 bg-card px-5 py-3 shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-200',
              // Stack above the save bar rather than under it when edits are pending.
              isDirty ? 'bottom-24' : 'bottom-6'
            )}
          >
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="flex size-5 items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                aria-label="Clear selection"
              >
                <X className="size-4" />
              </button>
              <span className="text-sm font-semibold text-primary">
                {selectedIds.size} {selectedIds.size === 1 ? 'vehicle' : 'vehicles'} selected
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Enable</span>
              {FEATURES.map((f) => (
                <Button
                  key={`en-${f.id}`}
                  variant="tertiary"
                  size="sm"
                  onClick={() => bulkSet(f.id, true)}
                  className="border-[color:var(--status-success)] text-[color:var(--status-success)] hover:bg-[color:var(--status-success)]/10 cursor-pointer h-8"
                >
                  {f.label}
                </Button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Disable</span>
              <Button
                variant="tertiary"
                size="sm"
                onClick={() => bulkSet('all', false)}
                className="border-[color:var(--status-error)] text-[color:var(--status-error)] hover:bg-[color:var(--status-error)]/10 cursor-pointer h-8"
              >
                All features
              </Button>
            </div>
          </div>
        )}

        {/* Save bar — the toggles are staged until they're explicitly committed,
            so a mis-tap can't hand a User immobilizer access on its own. */}
        {isDirty && (
          <div className="fixed bottom-6 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-5 rounded-[6px] border border-gray-300 bg-card px-5 py-3 shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">
                {pendingChanges} unsaved {pendingChanges === 1 ? 'change' : 'changes'}
              </span>
              <span className="hidden text-xs text-muted-foreground sm:inline">
                · verification required
              </span>
            </div>
            <div className="flex items-center gap-2">
              {/* `tertiary`, not `secondary` — the DS's secondary fill is a
                  brand-green tint in this theme, and discard must not read as
                  a second green action next to Save. */}
              <Button variant="tertiary" size="sm" onClick={discardChanges} className="h-8 cursor-pointer">
                Discard
              </Button>
              <Button size="sm" onClick={() => setVerifyOpen(true)} className="h-8 cursor-pointer">
                Save changes
              </Button>
            </div>
          </div>
        )}

        <VerifyIdentityDialog
          open={verifyOpen}
          onClose={() => setVerifyOpen(false)}
          onVerified={commitChanges}
          email={ADMIN_EMAIL}
        />
        <Toaster position="bottom-right" richColors />
      </div>
    </TooltipProvider>
  )
}

