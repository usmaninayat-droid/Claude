import { useEffect, useMemo, useState } from 'react'
import { ChevronsDownUp, ChevronsUpDown, X, CheckSquare } from 'lucide-react'
import {
  Button, TooltipProvider, Accordion,
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue, SelectSeparator,
  cn,
} from '@fams/design-system'
import { ModuleSection } from './ModuleSection'
import { RoleChannelSheet } from './RoleChannelSheet'
import { BatchingSettingsCard } from './BatchingSettingsCard'
import {
  NOTIFICATION_TYPES, MODULES, CRITICALITY_LEVELS, CRITICALITY_COLOR, CHANNELS, ROLES,
  DEFAULT_BATCHING, MODULE_BATCHING_OVERRIDES, applyRoleChannelRules,
  type NotificationType, type Role, type Channel, type Criticality, type BatchingConfig, type ModuleBatchingOverride,
} from './notificationsConfigData'

type StatusFilter = 'all' | 'enabled' | 'disabled' | 'mandatory' | 'exempted'

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'enabled', label: 'Enabled' },
  { id: 'disabled', label: 'Disabled' },
  { id: 'mandatory', label: 'Mandatory' },
]

const EXEMPTED_FILTER: { id: StatusFilter; label: string } = { id: 'exempted', label: 'Exempted' }

function matchesSearch(t: NotificationType, query: string) {
  if (!query.trim()) return true
  const q = query.trim().toLowerCase()
  return t.name.toLowerCase().includes(q) || t.module.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
}

export function NotificationsConfigurationPage({
  query,
  title = 'Notifications Configuration',
  moduleFilter = 'all',
  criticalityFilter = 'all',
}: {
  query: string
  title?: string
  moduleFilter?: string
  criticalityFilter?: 'all' | Criticality
}) {
  const [types, setTypes] = useState(NOTIFICATION_TYPES)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [openModules, setOpenModules] = useState<string[]>(() => [...MODULES])
  const [configuringId, setConfiguringId] = useState<string | null>(null)
  const [globalBatching, setGlobalBatching] = useState<BatchingConfig>(DEFAULT_BATCHING)
  const [moduleBatching, setModuleBatching] = useState<Record<string, ModuleBatchingOverride>>(MODULE_BATCHING_OVERRIDES)

  useEffect(() => {
    if (!globalBatching.enabled && statusFilter === 'exempted') setStatusFilter('all')
  }, [globalBatching.enabled, statusFilter])

  const filtered = useMemo(
    () =>
      types.filter((t) => {
        if (!matchesSearch(t, query)) return false
        if (moduleFilter !== 'all' && t.module !== moduleFilter) return false
        if (criticalityFilter !== 'all' && t.criticality !== criticalityFilter) return false
        if (statusFilter === 'enabled' && !t.platformEnabled) return false
        if (statusFilter === 'disabled' && t.platformEnabled) return false
        if (statusFilter === 'mandatory' && !t.mandatory) return false
        if (statusFilter === 'exempted' && !t.batchingExempt) return false
        return true
      }),
    [types, query, moduleFilter, criticalityFilter, statusFilter]
  )

  const grouped = useMemo(() => {
    const byModule = new Map<string, NotificationType[]>()
    for (const t of filtered) {
      if (!byModule.has(t.module)) byModule.set(t.module, [])
      byModule.get(t.module)!.push(t)
    }
    return MODULES.map((m) => ({ module: m, types: byModule.get(m) ?? [] })).filter((g) => g.types.length > 0)
  }, [filtered])

  const stats = useMemo(
    () => ({
      total: types.length,
      enabled: types.filter((t) => t.platformEnabled).length,
      critical: types.filter((t) => t.criticality === 'critical').length,
      mandatory: types.filter((t) => t.mandatory).length,
      modules: MODULES.length,
    }),
    [types]
  )

  const updateType = (id: string, patch: Partial<NotificationType>) =>
    setTypes((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))

  const toggleRoleChannel = (id: string, role: Role, channel: Channel, value: boolean) =>
    setTypes((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, roleChannels: applyRoleChannelRules(t.roleChannels, role, channel, value) }
          : t
      )
    )

  const toggleSelect = (id: string, value: boolean) =>
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (value) next.add(id)
      else next.delete(id)
      return next
    })

  const toggleModuleSelect = (module: string, ids: string[], value: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      ids.forEach((id) => (value ? next.add(id) : next.delete(id)))
      return next
    })
    if (value) setOpenModules((prev) => (prev.includes(module) ? prev : [...prev, module]))
  }

  const bulkSetEnabled = (value: boolean) => {
    setTypes((prev) => prev.map((t) => (selectedIds.has(t.id) ? { ...t, platformEnabled: value } : t)))
    setSelectedIds(new Set())
  }

  const allVisibleSelected = useMemo(() => {
    if (grouped.length === 0) return false
    const visibleTypes = grouped.flatMap((g) => g.types)
    return visibleTypes.every((t) => selectedIds.has(t.id))
  }, [grouped, selectedIds])

  const handleToggleSelectAll = () => {
    const visibleTypes = grouped.flatMap((g) => g.types)
    if (allVisibleSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        visibleTypes.forEach((t) => next.delete(t.id))
        return next
      })
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        visibleTypes.forEach((t) => next.add(t.id))
        return next
      })
      setOpenModules(grouped.map((g) => g.module))
    }
  }

  const bulkVirtualType = useMemo(() => {
    if (selectedIds.size === 0) return null

    const selectedTypes = types.filter((t) => selectedIds.has(t.id))
    const modules = Array.from(new Set(selectedTypes.map((t) => t.module)))
    const moduleName = modules.length === 1 ? modules[0] : 'Multiple Modules'

    const allEnabled = selectedTypes.every((t) => t.platformEnabled)
    const allDisabled = selectedTypes.every((t) => !t.platformEnabled)
    const platformEnabled = allEnabled ? true : allDisabled ? false : ('indeterminate' as any)

    const allMandatory = selectedTypes.every((t) => t.mandatory)
    const allOptional = selectedTypes.every((t) => !t.mandatory)
    const mandatory = allMandatory ? true : allOptional ? false : ('indeterminate' as any)

    const allExempt = selectedTypes.every((t) => t.batchingExempt)
    const allBatched = selectedTypes.every((t) => !t.batchingExempt)
    const batchingExempt = allExempt ? true : allBatched ? false : ('indeterminate' as any)

    const roleChannels = {} as any
    for (const role of ROLES) {
      roleChannels[role] = { toast: false, push: false, email: false, sms: false, whatsapp: false }
      for (const channel of CHANNELS) {
        const values = selectedTypes.map((t) => t.roleChannels[role][channel.id])
        const allTrue = values.every(Boolean)
        const allFalse = values.every((v) => !v)
        roleChannels[role][channel.id] = allTrue ? true : allFalse ? false : 'indeterminate'
      }
    }

    const criticalities = Array.from(new Set(selectedTypes.map((t) => t.criticality)))
    const criticality = criticalities.length === 1 ? criticalities[0] : ('mixed' as any)

    return {
      id: 'bulk',
      name: `Configure ${selectedTypes.length} Notifications`,
      module: moduleName,
      description: `Bulk editing settings for ${selectedTypes.length} selected notification types.`,
      platformEnabled,
      mandatory,
      batchingExempt,
      criticality,
      roleChannels,
    }
  }, [selectedIds, types])

  const configuringType = configuringId === 'bulk' ? bulkVirtualType : (types.find((t) => t.id === configuringId) ?? null)

  const handleTogglePlatformEnabled = (v: boolean) => {
    if (!configuringId) return
    if (configuringId === 'bulk') {
      setTypes((prev) => prev.map((t) => (selectedIds.has(t.id) ? { ...t, platformEnabled: v } : t)))
    } else {
      updateType(configuringId, { platformEnabled: v })
    }
  }

  const handleToggleMandatory = (v: boolean) => {
    if (!configuringId) return
    if (configuringId === 'bulk') {
      setTypes((prev) => prev.map((t) => (selectedIds.has(t.id) ? { ...t, mandatory: v } : t)))
    } else {
      updateType(configuringId, { mandatory: v })
    }
  }

  const handleToggleBatchingExempt = (v: boolean) => {
    if (!configuringId) return
    if (configuringId === 'bulk') {
      setTypes((prev) => prev.map((t) => (selectedIds.has(t.id) ? { ...t, batchingExempt: v } : t)))
    } else {
      updateType(configuringId, { batchingExempt: v })
    }
  }

  const handleToggleRoleChannel = (role: Role, channel: Channel, v: boolean) => {
    if (!configuringId) return
    if (configuringId === 'bulk') {
      setTypes((prev) =>
        prev.map((t) =>
          selectedIds.has(t.id)
            ? { ...t, roleChannels: applyRoleChannelRules(t.roleChannels, role, channel, v) }
            : t
        )
      )
    } else {
      toggleRoleChannel(configuringId, role, channel, v)
    }
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-5">
        <div>
          <h1 className="text-lg font-semibold text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground">
            Configure delivery — enablement, criticality, mandatory locking, and role/channel
            routing — across every module's notification types. Trigger logic stays owned by each
            module; this page never edits it.
          </p>
        </div>

        <BatchingSettingsCard config={globalBatching} onChange={setGlobalBatching} />

        {/* Summary strip */}
        <div className="flex items-center divide-x divide-border rounded-md border border-border bg-card">
          {[
            { label: 'Notification types', value: stats.total },
            { label: 'Enabled', value: stats.enabled },
            { label: 'Critical', value: stats.critical },
            { label: 'Mandatory', value: stats.mandatory },
            { label: 'Modules', value: stats.modules },
          ].map((s) => (
            <div key={s.label} className="flex-1 px-5 py-3">
              <p className="text-xl font-semibold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Toolbar & Switch Tabs Row */}
        <div className="flex flex-wrap items-center justify-between gap-y-2 border-b border-border">
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            {(globalBatching.enabled ? [...STATUS_FILTERS, EXEMPTED_FILTER] : STATUS_FILTERS).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id)}
                className={cn(
                  'relative py-3 text-sm font-semibold transition-colors outline-none cursor-pointer',
                  statusFilter === f.id ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {f.label}
                {statusFilter === f.id ? (
                  <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" />
                ) : null}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2.5 py-2">

            <Button
              variant="tertiary"
              size="sm"
              className="gap-1.5 h-9 cursor-pointer"
              onClick={handleToggleSelectAll}
            >
              <CheckSquare className="size-3.5" />
              {allVisibleSelected ? 'Deselect all' : 'Select all'}
            </Button>

            <Button
              variant="tertiary"
              size="sm"
              className="gap-1.5 h-9 cursor-pointer"
              onClick={() => setOpenModules(openModules.length > 0 ? [] : grouped.map((g) => g.module))}
            >
              {openModules.length > 0 ? <ChevronsDownUp className="size-3.5" /> : <ChevronsUpDown className="size-3.5" />}
              {openModules.length > 0 ? 'Collapse all' : 'Expand all'}
            </Button>
          </div>
        </div>

        {/* Bulk Action floating card */}
        {selectedIds.size > 0 && (
          <div className="fixed bottom-6 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-8 rounded-lg border border-gray-300 bg-card px-5 py-3 shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-200">
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
                {selectedIds.size} {selectedIds.size === 1 ? 'notification' : 'notifications'} selected
              </span>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="tertiary"
                size="sm"
                onClick={() => bulkSetEnabled(true)}
                className="border-[color:var(--status-success)] text-[color:var(--status-success)] hover:bg-[color:var(--status-success)]/10 cursor-pointer h-8"
              >
                Enable
              </Button>
              <Button
                variant="tertiary"
                size="sm"
                onClick={() => bulkSetEnabled(false)}
                className="border-[color:var(--status-error)] text-[color:var(--status-error)] hover:bg-[color:var(--status-error)]/10 cursor-pointer h-8"
              >
                Disable
              </Button>
              <Button
                variant="tertiary"
                size="sm"
                onClick={() => setConfiguringId('bulk')}
                className="border-gray-400 text-gray-700 hover:bg-gray-50 hover:text-gray-900 cursor-pointer h-8"
              >
                Configure
              </Button>
            </div>
          </div>
        )}

        {grouped.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-1.5 py-24 text-center">
            <p className="text-sm font-semibold text-foreground">No notification types match your filters</p>
            <p className="text-xs text-muted-foreground">Try a different search, module, criticality, or status.</p>
          </div>
        ) : (
          <Accordion
            type="multiple"
            value={openModules}
            onValueChange={setOpenModules}
            className="flex flex-col divide-y divide-border rounded-md border border-border bg-card px-2"
          >
            {grouped.map((g) => (
              <ModuleSection
                key={g.module}
                module={g.module}
                types={g.types}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                onToggleModuleSelect={toggleModuleSelect}
                onTogglePlatformEnabled={(id, v) => updateType(id, { platformEnabled: v })}
                onConfigure={setConfiguringId}
                batchingOverride={moduleBatching[g.module] ?? { mode: 'inherit', custom: DEFAULT_BATCHING }}
                globalBatching={globalBatching}
                onBatchingOverrideChange={(next) => setModuleBatching((prev) => ({ ...prev, [g.module]: next }))}
              />
            ))}
          </Accordion>
        )}
      </div>

      <RoleChannelSheet
        type={configuringType}
        open={configuringId != null}
        onOpenChange={(open) => !open && setConfiguringId(null)}
        onTogglePlatformEnabled={handleTogglePlatformEnabled}
        onToggleMandatory={handleToggleMandatory}
        onToggleBatchingExempt={handleToggleBatchingExempt}
        onToggleRoleChannel={handleToggleRoleChannel}
      />
    </TooltipProvider>
  )
}
