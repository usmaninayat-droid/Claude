import { useEffect, useMemo, useState, Fragment } from 'react'
import {
  ChevronsDownUp, ChevronsUpDown, Settings, Flag, Lock, Check, Minus,
  ChevronDown, ChevronRight, Info, Plus, Bell, BellOff, Wand2, ListOrdered,
  RotateCcw, ShieldOff, ShieldAlert,
} from 'lucide-react'
import {
  Button, TooltipProvider, Badge,
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  cn, Tooltip, TooltipTrigger, TooltipContent, Switch,
} from '@fams/design-system'
import { ProfileManagementDialog } from './ProfileManagementDialog'
import { BatchingOverrideControl2 } from './BatchingOverrideControl2'
import { CustomNotificationComposerSheet } from './CustomNotificationComposerSheet'
import { CustomNotificationGuidedSheet } from './CustomNotificationGuidedSheet'
import { ResetDefaultsDialog, type ResetOptions } from './ResetDefaultsDialog'
import {
  DEFAULT_BATCHING, MODULE_BATCHING_OVERRIDES, BATCHING_SUPPORTED_MODULES,
  type BatchingConfig, type ModuleBatchingOverride,
} from '../notifications-configuration/notificationsConfigData'
import {
  NOTIFICATION_TYPES, MODULES, CRITICALITY_LEVELS, CRITICALITY_COLOR, CHANNELS,
  DEFAULT_PROFILES, getProfileChannelState, updateProfileChannelState,
  getProfileModuleAccess, getProfileChannelAccess,
  type NotificationType, type Channel, type Criticality, type NotificationProfile,
} from './notificationsConfigData2'

// Primary-tab channel getter that ignores the "mandatory forces every channel on"
// rule Page 2 bakes into getProfileChannelState — the primary tab lets the admin
// pick channels freely, so we read the real stored role-channel state.
function getRawProfileChannelState(
  type: NotificationType,
  profile: NotificationProfile | null,
  channel: Channel
): boolean {
  if (!profile || profile.roles.length === 0) return false
  const firstRole = profile.roles[0]
  if (firstRole && type.roleChannels[firstRole]) {
    return type.roleChannels[firstRole][channel] === true
  }
  return profile.roles.some((role) => type.roleChannels[role]?.[channel] === true)
}

function matchesSearch(t: NotificationType, query: string) {
  if (!query.trim()) return true
  const q = query.trim().toLowerCase()
  return t.name.toLowerCase().includes(q) || t.module.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
}

const HEADER_TOOLTIPS: Record<string, string> = {
  toast: 'In-app popups appearing on the active screen',
  push: 'Mobile push notifications sent to devices',
  email: 'Emails delivered to user addresses',
  sms: 'SMS text messages sent to mobile phones',
  whatsapp: 'Messages delivered via WhatsApp to user numbers',
  inbox: 'Alerts in the dispatcher portal notifications center',
  mandatory: 'Enforces delivery — individual users cannot opt out',
  exempt: 'Exempt from digest grouping — delivered individually, in real time',
}

function HeaderTriCheckbox({
  state,
  onClick,
  disabled = false,
  className = '',
  ariaLabel = 'Checkbox',
}: {
  state: boolean | 'indeterminate'
  onClick: () => void
  disabled?: boolean
  className?: string
  ariaLabel?: string
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(
        'flex size-4 shrink-0 items-center justify-center rounded-sm border transition-colors outline-none',
        state === true ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-input-background text-muted-foreground',
        disabled && 'opacity-50 cursor-not-allowed bg-muted border-border',
        className
      )}
    >
      {state === true ? (
        <Check className="size-3" strokeWidth={3} />
      ) : state === 'indeterminate' ? (
        <Minus className="size-3" strokeWidth={3} />
      ) : null}
    </button>
  )
}

function MatrixCheckbox2({
  state,
  onClick,
  disabled = false,
  className = '',
  ariaLabel = 'Checkbox',
}: {
  state: boolean
  onClick: () => void
  disabled?: boolean
  className?: string
  ariaLabel?: string
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(
        'flex size-4 shrink-0 items-center justify-center rounded-sm border transition-colors outline-none cursor-pointer',
        state ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-input-background text-muted-foreground',
        disabled && 'cursor-not-allowed opacity-60',
        className
      )}
    >
      {state ? (
        <Check className="size-3" strokeWidth={3} />
      ) : null}
    </button>
  )
}

export function NotificationsConfigurationPage2({
  query,
  moduleFilter = 'all',
  criticalityFilter = 'all',
  title = 'Notification Configuration 2',
  showNewNotification = true,
  channels = CHANNELS,
  onCorpusChange,
}: {
  query: string
  moduleFilter?: string
  criticalityFilter?: 'all' | Criticality
  title?: string
  showNewNotification?: boolean
  /** Channel columns to render, in order. Page 1 passes the Push-less set. */
  channels?: typeof CHANNELS
  /** Reports the rows this page can list (active profile, pre-filter) so the
   *  chrome's Module / Criticality dropdowns describe what's actually here. */
  onCorpusChange?: (types: NotificationType[]) => void
}) {
  const [types, setTypes] = useState<NotificationType[]>(() => {
    return NOTIFICATION_TYPES.map((t) => {
      let updatedType = { ...t }
      for (const prof of DEFAULT_PROFILES) {
        for (const ch of channels) {
          const state = getProfileChannelState(updatedType, prof, ch.id)
          updatedType = updateProfileChannelState(updatedType, prof, ch.id, state)
        }
      }
      return updatedType
    })
  })
  const [profiles, setProfiles] = useState<NotificationProfile[]>(DEFAULT_PROFILES)
  const [activeProfileId, setActiveProfileId] = useState<string>(DEFAULT_PROFILES[0].id)
  const [openModules, setOpenModules] = useState<string[]>(MODULES)
  const [manageDialogOpen, setManageDialogOpen] = useState(false)
  const [composerOpen, setComposerOpen] = useState(false)
  const [guidedOpen, setGuidedOpen] = useState(false)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const handlePublishNewType = (newType: NotificationType) => {
    setTypes((prev) => [newType, ...prev])
    if (!openModules.includes(newType.module)) {
      setOpenModules((prev) => [...prev, newType.module])
    }
  }

  const handleConfirmReset = (options: ResetOptions) => {
    if (options.preferences) {
      setTypes((prev) =>
        prev.map((t) => {
          const defaultType = NOTIFICATION_TYPES.find((d) => d.id === t.id)
          if (defaultType) {
            return {
              ...t,
              roleChannels: defaultType.roleChannels,
              platformEnabled: defaultType.platformEnabled,
              mandatory: defaultType.mandatory,
              criticality: defaultType.criticality,
              batchingExempt: defaultType.batchingExempt,
            }
          }
          return t
        })
      )
      setGlobalBatching(DEFAULT_BATCHING)
      setModuleBatching(MODULE_BATCHING_OVERRIDES)
    }

    if (options.profiles) {
      setProfiles(DEFAULT_PROFILES)
      setActiveProfileId(DEFAULT_PROFILES[0].id)
    }

    if (options.customNotifications) {
      const defaultIds = new Set(NOTIFICATION_TYPES.map((d) => d.id))
      setTypes((prev) => prev.filter((t) => defaultIds.has(t.id)))
    }

    setToastMessage('Notification configuration has been reset to defaults.')
    setTimeout(() => setToastMessage(null), 4000)
  }

  const [globalBatching, setGlobalBatching] = useState<BatchingConfig>(DEFAULT_BATCHING)
  const [moduleBatching, setModuleBatching] = useState<Record<string, ModuleBatchingOverride>>(MODULE_BATCHING_OVERRIDES)

  const [activeCardFilter, setActiveCardFilter] = useState<'all' | 'enabled' | 'critical' | 'mandatory' | 'exempted'>('all')

  const activeProfile = useMemo(
    () => profiles.find((p) => p.id === activeProfileId) || profiles[0] || null,
    [profiles, activeProfileId]
  )

  // A notification counts as "enabled" for the active profile when at least one
  // channel the profile can actually reach is switched on for it — mirroring what
  // the matrix rows show for this profile, not a global platform flag.
  const isEnabledForProfile = (t: NotificationType) => {
    const readState = (c: Channel) =>
      showNewNotification
        ? getProfileChannelState(t, activeProfile!, c)
        : getRawProfileChannelState(t, activeProfile, c)
    return channels.some(
      (ch) =>
        getProfileChannelAccess(activeProfile ?? undefined, ch.id).status !== 'none' &&
        readState(ch.id) === true
    )
  }

  // Notification types visible to the active profile (modules the profile can access).
  const profileTypes = useMemo(
    () => types.filter((t) => getProfileModuleAccess(activeProfile ?? undefined, t.module).status !== 'none'),
    [types, activeProfile]
  )

  // Tell the host what this page currently holds — the profile tab, custom
  // notifications and platform toggles all move it, and the filters follow.
  useEffect(() => {
    onCorpusChange?.(profileTypes)
  }, [profileTypes, onCorpusChange])

  const filtered = useMemo(
    () =>
      types.filter((t) => {
        if (!matchesSearch(t, query)) return false
        if (moduleFilter !== 'all' && t.module !== moduleFilter) return false
        if (criticalityFilter !== 'all' && t.criticality !== criticalityFilter) return false
        if (activeCardFilter === 'enabled' && !isEnabledForProfile(t)) return false
        if (activeCardFilter === 'critical' && (t.criticality !== 'critical' || !isEnabledForProfile(t))) return false
        if (activeCardFilter === 'mandatory' && !t.mandatory) return false
        if (activeCardFilter === 'exempted' && !t.batchingExempt) return false
        return true
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [types, query, moduleFilter, criticalityFilter, activeCardFilter, activeProfile, showNewNotification]
  )

  const grouped = useMemo(() => {
    const byModule = new Map<string, NotificationType[]>()
    for (const t of filtered) {
      if (!byModule.has(t.module)) byModule.set(t.module, [])
      byModule.get(t.module)!.push(t)
    }
    return MODULES.map((m) => ({ module: m, types: byModule.get(m) ?? [] }))
      .filter((g) => g.types.length > 0)
      .filter((g) => getProfileModuleAccess(activeProfile, g.module).status !== 'none')
  }, [filtered, activeProfile])

  const stats = useMemo(
    () => ({
      total: profileTypes.length,
      enabled: profileTypes.filter(isEnabledForProfile).length,
      critical: profileTypes.filter((t) => t.criticality === 'critical' && isEnabledForProfile(t)).length,
      mandatory: profileTypes.filter((t) => t.mandatory).length,
      exempted: profileTypes.filter((t) => t.batchingExempt).length,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profileTypes, activeProfile, showNewNotification]
  )

  // Handlers for individual row toggling
  const handleToggleChannel = (typeId: string, channel: Channel, newValue: boolean) => {
    if (!activeProfile) return
    setTypes((prev) =>
      prev.map((t) =>
        t.id === typeId
          ? updateProfileChannelState(t, activeProfile, channel, newValue)
          : t
      )
    )
  }

  const handleToggleMandatory = (typeId: string, value: boolean) => {
    setTypes((prev) =>
      prev.map((t) => {
        if (t.id !== typeId) return t
        let next: NotificationType = { ...t, mandatory: value }
        // Primary page: mandatory requires at least one delivery channel.
        // If none are enabled when turning it on, seed Inbox as a sensible default —
        // admin can still swap channels afterwards, as long as one stays on.
        if (value && !showNewNotification && activeProfile) {
          const anyOn = channels.some(
            (ch) =>
              getProfileChannelAccess(activeProfile, ch.id).status !== 'none' &&
              getRawProfileChannelState(next, activeProfile, ch.id) === true
          )
          if (!anyOn) {
            next = updateProfileChannelState(next, activeProfile, 'inbox', true)
          }
        }
        return next
      })
    )
  }

  const handleToggleBatchingExempt = (typeId: string, value: boolean) => {
    setTypes((prev) =>
      prev.map((t) =>
        t.id === typeId ? { ...t, batchingExempt: value } : t
      )
    )
  }

  // Handlers for column-level header toggling in a module section
  const handleToggleColumnChannel = (typeIds: string[], channel: Channel, newValue: boolean) => {
    if (!activeProfile) return
    const idSet = new Set(typeIds)
    setTypes((prev) =>
      prev.map((t) =>
        idSet.has(t.id)
          ? updateProfileChannelState(t, activeProfile, channel, newValue)
          : t
      )
    )
  }

  // Calculate consolidated column states for headers (select all for this column across all filtered types)
  const getColumnState = (channel: Channel) => {
    if (filtered.length === 0) return false
    const reader = showNewNotification ? getProfileChannelState : getRawProfileChannelState
    const states = filtered.map((t) => reader(t, activeProfile, channel))
    const allTrue = states.every((s) => s === true)
    const allFalse = states.every((s) => s === false)
    if (allTrue) return true
    if (allFalse) return false
    return 'indeterminate'
  }

  const handleToggleColumn = (channel: Channel) => {
    const currentState = getColumnState(channel)
    const newValue = currentState !== true
    const targetTypeIds = filtered.map((t) => t.id)
    handleToggleColumnChannel(targetTypeIds, channel, newValue)
  }

  const toggleModule = (moduleName: string) => {
    setOpenModules((prev) =>
      prev.includes(moduleName)
        ? prev.filter((m) => m !== moduleName)
        : [...prev, moduleName]
    )
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-5">
        <div className="flex items-start justify-between gap-4 flex-wrap pb-1">
          <div className="flex-1 min-w-[280px]">
            <h1 className="text-lg font-semibold text-foreground">{title}</h1>
            <p className="text-sm text-muted-foreground">
              Configure delivery rules at a profile level. Each profile aggregates multiple roles.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {showNewNotification && (
              <Button
                variant="tertiary"
                size="sm"
                onClick={() => setResetDialogOpen(true)}
                className="h-9 text-xs font-semibold gap-1.5 cursor-pointer border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground shrink-0"
              >
                <RotateCcw className="size-3.5" />
                Reset to Defaults
              </Button>
            )}
            {showNewNotification && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="gap-1.5 cursor-pointer shrink-0 shadow-sm h-9">
                    <Plus className="size-4" strokeWidth={2.5} />
                    New Notification
                    <ChevronDown className="size-3.5 opacity-80" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  <DropdownMenuItem onClick={() => setComposerOpen(true)} className="cursor-pointer gap-2.5">
                    <Wand2 className="size-4 text-muted-foreground" />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-foreground">Quick Composer</span>
                      <span className="text-xs text-muted-foreground">One screen, live preview</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setGuidedOpen(true)} className="cursor-pointer gap-2.5">
                    <ListOrdered className="size-4 text-muted-foreground" />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-foreground">Guided Setup</span>
                      <span className="text-xs text-muted-foreground">Step-by-step with review</span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Profile Switch Tabs & Actions Row */}
        <div className="sticky top-0 z-20 bg-background flex items-center justify-between border-b border-border h-14">
          {/* Left Side: Profile Selector Tabs */}
          <div className="flex gap-x-6 h-full items-center">
            {profiles.map((p) => {
              const isActive = p.id === activeProfileId
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActiveProfileId(p.id)}
                  className={cn(
                    'relative h-full flex items-center gap-2 text-sm font-semibold transition-colors outline-none cursor-pointer',
                    isActive ? 'text-primary font-bold' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {p.name}
                  <span
                    className={cn(
                      'inline-flex items-center justify-center rounded-full min-w-[20px] h-5 px-1.5 text-[11px] font-semibold transition-colors',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {p.roles.length}
                  </span>
                  {isActive && (
                    <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Right Side: Manage Profiles (Icon Only Button) */}
          <div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="tertiary"
                  size="icon"
                  onClick={() => setManageDialogOpen(true)}
                  aria-label="Manage Profiles"
                  className="size-8.5 cursor-pointer border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground shrink-0"
                >
                  <Settings className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs font-normal">
                Manage Profiles
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Summary strip (Matrix card) */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {[
            {
              id: 'all' as const,
              label: 'Notification types',
              value: stats.total,
              icon: Bell,
              iconColor: 'text-blue-600 dark:text-blue-400',
              bgColor: 'bg-blue-500/10 dark:bg-blue-500/20',
            },
            {
              id: 'enabled' as const,
              label: 'Enabled',
              value: stats.enabled,
              icon: Check,
              iconColor: 'text-emerald-600 dark:text-emerald-400',
              bgColor: 'bg-emerald-500/10 dark:bg-emerald-500/20',
            },
            {
              id: 'critical' as const,
              label: 'Critical',
              value: stats.critical,
              icon: Flag,
              iconColor: 'text-rose-600 dark:text-rose-400',
              bgColor: 'bg-rose-500/10 dark:bg-rose-500/20',
            },
            {
              id: 'mandatory' as const,
              label: 'Mandatory',
              value: stats.mandatory,
              icon: Lock,
              iconColor: 'text-amber-600 dark:text-amber-400',
              bgColor: 'bg-amber-500/10 dark:bg-amber-500/20',
            },
            {
              id: 'exempted' as const,
              label: 'Digest Exempted',
              value: stats.exempted,
              icon: BellOff,
              iconColor: 'text-purple-600 dark:text-purple-400',
              bgColor: 'bg-purple-500/10 dark:bg-purple-500/20',
            },
          ].map((c) => {
            const Icon = c.icon
            const isActive = c.id !== 'all' && activeCardFilter === c.id
            return (
              <div
                key={c.id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (c.id === 'all') {
                    setActiveCardFilter('all')
                  } else {
                    setActiveCardFilter((prev) => (prev === c.id ? 'all' : c.id))
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    if (c.id === 'all') {
                      setActiveCardFilter('all')
                    } else {
                      setActiveCardFilter((prev) => (prev === c.id ? 'all' : c.id))
                    }
                  }
                }}
                className={cn(
                  "flex items-center gap-3 rounded-md border p-4 cursor-pointer transition-all select-none outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  isActive
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-primary/50 hover:bg-muted/30"
                )}
              >
                <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-full", c.bgColor, c.iconColor)}>
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

        {/* Collapsible Single Table listing */}
        {grouped.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-1.5 py-24 text-center border border-border border-dashed rounded-lg bg-card">
            <p className="text-sm font-semibold text-foreground">No notification types match your filters</p>
            <p className="text-xs text-muted-foreground">Try adjusting your search query, module, or criticality filters.</p>
          </div>
        ) : (
          <div className="border border-border rounded-lg bg-card">
            <div>
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-border bg-muted/15">
                    <th className="sticky top-14 z-10 bg-card py-3 px-4 font-semibold text-xs text-muted-foreground border-b border-border rounded-tl-lg">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          className="flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer p-0.5 outline-none transition-colors rounded hover:bg-muted/80"
                          onClick={() => setOpenModules(openModules.length > 0 ? [] : MODULES)}
                          title={openModules.length > 0 ? 'Collapse all modules' : 'Expand all modules'}
                        >
                          {openModules.length > 0 ? (
                            <ChevronsDownUp className="size-3.5" />
                          ) : (
                            <ChevronsUpDown className="size-3.5" />
                          )}
                        </button>
                        <span>Notification Type</span>
                      </div>
                    </th>
                    {channels.map((ch) => {
                      const colState = getColumnState(ch.id)
                      const channelAccess = getProfileChannelAccess(activeProfile, ch.id)
                      const isChannelDisabled = channelAccess.status === 'none'
                      return (
                        <th key={ch.id} className="sticky top-14 z-10 bg-card py-3 px-1 text-center w-[72px] border-b border-border">
                          <div className="flex flex-col items-center gap-1">
                            <HeaderTriCheckbox
                              state={colState}
                              disabled={isChannelDisabled}
                              onClick={() => handleToggleColumn(ch.id)}
                              ariaLabel={`Toggle ${ch.label} for all visible notifications`}
                            />
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span
                                  className={cn(
                                    'text-[10px] font-medium tracking-wider uppercase cursor-help',
                                    channelAccess.status === 'none'
                                      ? 'text-rose-500 font-semibold'
                                      : channelAccess.status === 'partial'
                                      ? 'text-amber-600 dark:text-amber-400 font-semibold'
                                      : 'text-muted-foreground'
                                  )}
                                >
                                  {ch.label}
                                  {channelAccess.status === 'none' ? (
                                    ' (N/A)'
                                  ) : channelAccess.status === 'partial' ? (
                                    ` (${channelAccess.accessibleRoles.length}/${activeProfile?.roles.length})`
                                  ) : null}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-[220px] text-xs font-normal normal-case">
                                {channelAccess.status === 'none' ? (
                                  <span>No roles in <strong>{activeProfile?.name}</strong> support {ch.label} delivery.</span>
                                ) : channelAccess.status === 'partial' ? (
                                  <span>{ch.label} supported by: <strong>{channelAccess.accessibleRoles.join(', ')}</strong>.<br />Not supported by: <strong>{channelAccess.inaccessibleRoles.join(', ')}</strong>.</span>
                                ) : (
                                  HEADER_TOOLTIPS[ch.id] || ch.label
                                )}
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </th>
                      )
                    })}
                    <th className="sticky top-14 z-10 bg-card py-3 px-3 text-center w-[100px] border-b border-border border-l-2 border-border/80">
                      <div className="flex items-center justify-center h-[34px] pt-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider cursor-help">
                              Mandatory
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[200px] text-xs font-normal normal-case">
                            {HEADER_TOOLTIPS.mandatory}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </th>
                    <th className="sticky top-14 z-10 bg-card py-3 px-3 text-center min-w-[100px] border-b border-border rounded-tr-lg">
                      <div className="flex items-center justify-center h-[34px] pt-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider cursor-help">
                              Exempt Digest
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[200px] text-xs font-normal normal-case">
                            {HEADER_TOOLTIPS.exempt}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {grouped.map((g) => {
                    const isCollapsed = !openModules.includes(g.module)
                    const access = getProfileModuleAccess(activeProfile, g.module)
                    return (
                      <Fragment key={g.module}>
                        {/* Collapsible Module Section Divider Row */}
                        <tr
                          onClick={() => toggleModule(g.module)}
                          className="cursor-pointer bg-muted/20 hover:bg-muted/30 select-none font-semibold text-sm text-foreground border-y border-border"
                        >
                          <td colSpan={9} className="py-1.5 px-4">
                            <div className="flex items-center gap-2 flex-wrap">
                              {isCollapsed ? (
                                <ChevronRight className="size-3.5 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="size-3.5 text-muted-foreground" />
                              )}
                              <span>{g.module}</span>
                              <span className="text-xs font-normal text-muted-foreground mr-1">
                                ({g.types.length})
                              </span>

                              {/* Role Access Indicator for Profile */}
                              {access.status === 'none' ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge
                                      variant="outline"
                                      className="gap-1 border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-medium text-[11px] h-5 px-1.5 cursor-help"
                                    >
                                      <ShieldOff className="size-3 text-amber-600 dark:text-amber-400" />
                                      No Profile Access
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent side="right" className="max-w-[280px] text-xs">
                                    No roles in <strong>{activeProfile?.name}</strong> have system permissions for the <strong>{g.module}</strong> module. Notification delivery settings will not affect users in this profile.
                                  </TooltipContent>
                                </Tooltip>
                              ) : access.status === 'partial' ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400 cursor-help">
                                      <ShieldAlert className="size-3 text-amber-600 dark:text-amber-400" />
                                      {access.accessibleRoles.length}/{activeProfile?.roles.length} Roles Access
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="right" className="max-w-[280px] text-xs">
                                    Accessible by: <strong>{access.accessibleRoles.join(', ')}</strong>.<br />
                                    Not accessible by: <strong>{access.inaccessibleRoles.join(', ')}</strong>. Toggling notifications only affects roles with module access.
                                  </TooltipContent>
                                </Tooltip>
                              ) : null}

                              {BATCHING_SUPPORTED_MODULES.includes(g.module) && (
                                <BatchingOverrideControl2
                                  module={g.module}
                                  override={moduleBatching[g.module] ?? { mode: 'off', custom: DEFAULT_BATCHING }}
                                  onChange={(next) => setModuleBatching((prev) => ({ ...prev, [g.module]: next }))}
                                />
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* Notification type rows for this module */}
                        {!isCollapsed &&
                          g.types.map((type) => {
                            const isRowDisabled = access.status === 'none'
                            const moduleBatchingOn =
                              (moduleBatching[type.module]?.mode ?? 'off') === 'custom'
                            const exemptDisabledByBatchingOff = !showNewNotification && !moduleBatchingOn
                            return (
                              <tr
                                key={type.id}
                                className={cn(
                                  'hover:bg-muted/80 dark:hover:bg-muted/50 transition-colors',
                                  isRowDisabled && 'opacity-60 bg-muted/5'
                                )}
                              >
                                {/* 1. Notification Type Column with Tag BEFORE the Name */}
                                <td className="py-2.5 pr-4 pl-[38px]">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-[72px] shrink-0 flex items-center">
                                      <Badge
                                        variant={
                                          type.criticality === 'critical'
                                            ? 'destructive'
                                            : type.criticality === 'medium'
                                            ? 'warning'
                                            : 'info'
                                        }
                                        size="xs"
                                        className="w-full justify-center capitalize font-semibold h-4.5 rounded-[2px] px-0.5"
                                      >
                                        <Flag className="size-2.5 mr-0.5" />
                                        {type.criticality}
                                      </Badge>
                                    </div>
                                    <div className="flex items-center gap-1 min-w-0">
                                      <span className="font-medium text-sm text-foreground">
                                        {type.name}
                                      </span>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <button
                                            type="button"
                                            className="text-muted-foreground/40 hover:text-foreground cursor-pointer p-0.5 outline-none shrink-0 transition-colors"
                                          >
                                            <Info className="size-3.5" />
                                          </button>
                                        </TooltipTrigger>
                                        <TooltipContent side="right" className="max-w-[300px] text-xs">
                                          {type.description}
                                        </TooltipContent>
                                      </Tooltip>
                                    </div>
                                  </div>
                                </td>

                                {/* 3. Channel Matrix Checkboxes */}
                                {(() => {
                                  const readState = (c: Channel) =>
                                    showNewNotification
                                      ? getProfileChannelState(type, activeProfile, c)
                                      : getRawProfileChannelState(type, activeProfile, c)
                                  const enabledChannelCount = channels.filter(
                                    (c) =>
                                      getProfileChannelAccess(activeProfile, c.id).status !== 'none' &&
                                      readState(c.id) === true
                                  ).length
                                  return channels.map((ch) => {
                                    const cellState = readState(ch.id)
                                    const channelAccess = getProfileChannelAccess(activeProfile, ch.id)
                                    const isLastMandatoryChannel =
                                      !showNewNotification &&
                                      type.mandatory === true &&
                                      cellState === true &&
                                      enabledChannelCount <= 1
                                    const isCellDisabled = isRowDisabled || channelAccess.status === 'none' || isLastMandatoryChannel
                                    return (
                                      <td key={ch.id} className="py-2.5 px-1 text-center vertical-middle">
                                        <div className="flex justify-center items-center">
                                          {channelAccess.status === 'none' ? (
                                            <span className="text-xs text-muted-foreground/30 font-mono select-none" title={`No roles in ${activeProfile?.name} support ${ch.label}`}>—</span>
                                          ) : isLastMandatoryChannel ? (
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <span className="inline-flex">
                                                  <MatrixCheckbox2
                                                    state={cellState}
                                                    disabled
                                                    onClick={() => {}}
                                                    ariaLabel={`${ch.label} is the only channel enabled for ${type.name} — mandatory notifications need at least one`}
                                                  />
                                                </span>
                                              </TooltipTrigger>
                                              <TooltipContent side="top" className="max-w-[240px] text-xs font-normal normal-case">
                                                Mandatory notifications need at least one delivery channel. Enable another channel first, then you can turn this one off.
                                              </TooltipContent>
                                            </Tooltip>
                                          ) : (
                                            <MatrixCheckbox2
                                              state={cellState}
                                              disabled={isCellDisabled}
                                              onClick={() => {
                                                handleToggleChannel(type.id, ch.id, !cellState)
                                              }}
                                              ariaLabel={`Toggle ${ch.label} for ${type.name}`}
                                            />
                                          )}
                                        </div>
                                      </td>
                                    )
                                  })
                                })()}

                                {/* 4. Mandatory Lock */}
                                <td className="py-2.5 px-3 text-center vertical-middle border-l-2 border-border/80 bg-muted/5">
                                  <div className="flex justify-center items-center">
                                    <Switch
                                      checked={type.mandatory === true}
                                      disabled={isRowDisabled}
                                      onCheckedChange={(v) => handleToggleMandatory(type.id, v)}
                                      className="scale-75 origin-center"
                                    />
                                  </div>
                                </td>

                                {/* 5. Exempt Batching */}
                                <td className="py-2.5 px-3 text-center vertical-middle bg-muted/5">
                                  <div className="flex justify-center items-center">
                                    {BATCHING_SUPPORTED_MODULES.includes(type.module) ? (
                                      exemptDisabledByBatchingOff ? (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <span className="text-xs text-muted-foreground/40 font-mono cursor-help">—</span>
                                          </TooltipTrigger>
                                          <TooltipContent side="top" className="max-w-[220px] text-xs font-normal normal-case">
                                            Digest is off for {type.module}. Turn digest on to exempt individual notifications from grouping.
                                          </TooltipContent>
                                        </Tooltip>
                                      ) : (
                                        <Switch
                                          checked={type.batchingExempt === true}
                                          disabled={isRowDisabled}
                                          onCheckedChange={(v) => handleToggleBatchingExempt(type.id, v)}
                                          className="scale-75 origin-center"
                                        />
                                      )
                                    ) : (
                                      <span className="text-xs text-muted-foreground/40 font-mono">—</span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Profiles Management Modal */}
      {manageDialogOpen && (
        <ProfileManagementDialog
          open={manageDialogOpen}
          onClose={() => setManageDialogOpen(false)}
          profiles={profiles}
          onSaveProfiles={(updated) => {
            setProfiles(updated)
            // If the active profile was deleted, reset active ID to the first available
            if (!updated.some((p) => p.id === activeProfileId)) {
              setActiveProfileId(updated[0]?.id || '')
            }
          }}
        />
      )}
      {/* Custom Notification — Quick Composer (v2) */}
      {composerOpen && (
        <CustomNotificationComposerSheet
          open={composerOpen}
          onClose={() => setComposerOpen(false)}
          profiles={profiles}
          onPublish={handlePublishNewType}
        />
      )}
      {/* Custom Notification — Guided Setup (v3, improved wizard) */}
      {guidedOpen && (
        <CustomNotificationGuidedSheet
          open={guidedOpen}
          onClose={() => setGuidedOpen(false)}
          profiles={profiles}
          onPublish={handlePublishNewType}
        />
      )}
      {/* Reset Defaults Dialog */}
      {resetDialogOpen && (
        <ResetDefaultsDialog
          open={resetDialogOpen}
          onClose={() => setResetDialogOpen(false)}
          onConfirmReset={handleConfirmReset}
          showCustomNotifications={showNewNotification}
        />
      )}
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 shadow-md animate-in fade-in slide-in-from-bottom-2">
          <Check className="size-4 text-emerald-600 dark:text-emerald-400" />
          {toastMessage}
        </div>
      )}
    </TooltipProvider>
  )
}
