import { useEffect, useMemo, useState, Fragment } from 'react'
import {
  BellOff, ChevronsDownUp, ChevronsUpDown, Check, Minus,
  ChevronDown, ChevronRight, Lock, Flag, Info, RotateCcw, Bell,
} from 'lucide-react'
import {
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue, TooltipProvider,
  Tooltip, TooltipTrigger, TooltipContent,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
  Button, Badge, cn,
} from '@fams/design-system'
import {
  CHANNELS_NO_PUSH as CHANNELS, MODULES,
  type Channel, type Role, type NotificationType, type Criticality,
} from '../notifications-configuration/notificationsConfigData'
import {
  VIEWER_ROLES, VIEWER_ROLE_COUNTS, getUserNotifications,
  eligibleChannels,
} from './myNotificationsData'

const HEADER_TOOLTIPS: Record<string, string> = {
  toast: 'In-app pop-up notification banner while active in the dashboard.',
  push: 'Push notification sent to mobile / tablet devices.',
  email: 'Email notification delivered to user email address.',
  sms: 'SMS text message sent to registered mobile phone number.',
  whatsapp: 'WhatsApp message sent to the registered mobile number.',
  inbox: 'Persistent record added to the user Inbox feed.',
}

/** Tri-state Header Checkbox matching Notification Config Page 2 */
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
        'flex size-4 shrink-0 items-center justify-center rounded-sm border transition-colors outline-none cursor-pointer',
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

/** Single Matrix Checkbox component matching Notification Config Page 2 */
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

function RolePreferences({
  role,
  query,
  moduleFilter,
  criticalityFilter,
  onReset,
  onCorpusChange,
}: {
  role: Role
  query: string
  moduleFilter: string
  criticalityFilter: 'all' | Criticality
  onReset: () => void
  onCorpusChange?: (types: NotificationType[]) => void
}) {
  const allTypes = useMemo(() => getUserNotifications(role), [role])

  // The visible set is role-scoped, so the chrome's filters follow the role.
  useEffect(() => {
    onCorpusChange?.(allTypes)
  }, [allTypes, onCorpusChange])
  const [openModules, setOpenModules] = useState<string[]>(() =>
    Array.from(new Set(allTypes.map((t) => t.module)))
  )

  const defaultPrefs = useMemo(() => {
    return Object.fromEntries(allTypes.map((t) => [t.id, new Set(eligibleChannels(t, role))]))
  }, [allTypes, role])

  const [prefs, setPrefs] = useState<Record<string, Set<Channel>>>(defaultPrefs)
  const [activeCardFilter, setActiveCardFilter] = useState<'all' | 'enabled' | 'critical' | 'mandatory' | 'exempted'>('all')

  // Reset preferences when role changes or reset triggered
  useEffect(() => {
    setPrefs(defaultPrefs)
    setActiveCardFilter('all')
  }, [defaultPrefs])

  const typeChannelMap = useMemo(
    () => Object.fromEntries(allTypes.map((t) => [t.id, eligibleChannels(t, role)])) as Record<string, Channel[]>,
    [allTypes, role]
  )

  // Filter out channels NOT available to this role across any of their notification types
  const roleChannels = useMemo(() => {
    return CHANNELS.filter((ch) =>
      allTypes.some((t) => typeChannelMap[t.id]?.includes(ch.id))
    )
  }, [allTypes, typeChannelMap])

  const toggleChannel = (typeId: string, channel: Channel) =>
    setPrefs((prev) => {
      const next = new Set(prev[typeId])
      if (next.has(channel)) next.delete(channel)
      else next.add(channel)
      return { ...prev, [typeId]: next }
    })

  const isTypeEnabledForUser = (t: NotificationType) =>
    t.mandatory || (prefs[t.id]?.size ?? 0) > 0

  const filtered = useMemo(() => {
    return allTypes.filter((t) => {
      if (query.trim()) {
        const q = query.trim().toLowerCase()
        const matches = t.name.toLowerCase().includes(q) || t.module.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
        if (!matches) return false
      }
      if (moduleFilter !== 'all' && t.module !== moduleFilter) return false
      if (criticalityFilter !== 'all' && t.criticality !== criticalityFilter) return false
      if (activeCardFilter === 'enabled' && !isTypeEnabledForUser(t)) return false
      if (activeCardFilter === 'critical' && t.criticality !== 'critical') return false
      if (activeCardFilter === 'mandatory' && !t.mandatory) return false
      if (activeCardFilter === 'exempted' && !t.batchingExempt) return false
      return true
    })
  }, [allTypes, query, moduleFilter, criticalityFilter, activeCardFilter, prefs])

  const stats = useMemo(
    () => ({
      total: allTypes.length,
      enabled: allTypes.filter(isTypeEnabledForUser).length,
      critical: allTypes.filter((t) => t.criticality === 'critical').length,
      mandatory: allTypes.filter((t) => t.mandatory).length,
      exempted: allTypes.filter((t) => t.batchingExempt).length,
    }),
    [allTypes, prefs]
  )

  const grouped = useMemo(() => {
    const byModule = new Map<string, NotificationType[]>()
    for (const t of filtered) {
      if (!byModule.has(t.module)) byModule.set(t.module, [])
      byModule.get(t.module)!.push(t)
    }
    return MODULES.map((m) => ({ module: m, types: byModule.get(m) ?? [] })).filter((g) => g.types.length > 0)
  }, [filtered])

  useEffect(() => {
    if (!query.trim() && moduleFilter === 'all' && criticalityFilter === 'all') return
    const matched = grouped.map((g) => g.module)
    setOpenModules((prev) => {
      const merged = new Set([...prev, ...matched])
      return merged.size === prev.length ? prev : Array.from(merged)
    })
  }, [grouped, query, moduleFilter, criticalityFilter])

  const visibleTypes = useMemo(() => grouped.flatMap((g) => g.types), [grouped])

  const toggleModule = (module: string) => {
    setOpenModules((prev) =>
      prev.includes(module) ? prev.filter((m) => m !== module) : [...prev, module]
    )
  }

  const toggleAllModules = () => {
    if (openModules.length === grouped.length) {
      setOpenModules([])
    } else {
      setOpenModules(grouped.map((g) => g.module))
    }
  }

  const getColumnState = (channelId: Channel): boolean | 'indeterminate' => {
    if (visibleTypes.length === 0) return false
    const eligibleTypes = visibleTypes.filter((t) => typeChannelMap[t.id]?.includes(channelId))
    if (eligibleTypes.length === 0) return false

    const activeCount = eligibleTypes.filter((t) => t.mandatory || prefs[t.id]?.has(channelId)).length
    if (activeCount === eligibleTypes.length) return true
    if (activeCount === 0) return false
    return 'indeterminate'
  }

  const handleToggleColumn = (channelId: Channel) => {
    const currentState = getColumnState(channelId)
    const targetState = currentState !== true

    setPrefs((prev) => {
      const next = { ...prev }
      visibleTypes.forEach((t) => {
        if (t.mandatory) return
        if (!typeChannelMap[t.id]?.includes(channelId)) return
        const set = new Set(next[t.id])
        if (targetState) {
          set.add(channelId)
        } else {
          set.delete(channelId)
        }
        next[t.id] = set
      })
      return next
    })
  }

  if (allTypes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-1.5 py-24 text-center border border-border border-dashed rounded-lg bg-card">
        <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-primary mb-2">
          <BellOff className="size-6" />
        </span>
        <p className="text-sm font-semibold text-foreground">You&apos;re not subscribed to anything yet</p>
        <p className="text-xs text-muted-foreground">Your organization hasn&apos;t turned on any notifications for this role yet.</p>
      </div>
    )
  }

  const totalCols = 1 + roleChannels.length

  return (
    <div className="flex flex-col gap-4">
      {/* Summary strip (matches Notification Configuration stats cards) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
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
                'flex items-center gap-3 rounded-md border p-4 cursor-pointer transition-all select-none outline-none focus-visible:ring-2 focus-visible:ring-primary',
                isActive
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
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

      {/* Main Table Matrix Shell - EXACT match with Notification Configuration 2 */}
      {grouped.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-1.5 py-24 text-center border border-border border-dashed rounded-lg bg-card">
          <p className="text-sm font-semibold text-foreground">
            {query.trim() || moduleFilter !== 'all' || criticalityFilter !== 'all'
              ? 'No notification types match your search or filters'
              : 'Nothing required for you right now'}
          </p>
          <p className="text-xs text-muted-foreground">
            Try adjusting your search query, module, or criticality filters.
          </p>
        </div>
      ) : (
        <div className="border border-border rounded-lg bg-card overflow-hidden">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-border bg-muted/15">
                <th className="bg-card py-3 px-4 font-semibold text-xs text-muted-foreground border-b border-border rounded-tl-lg">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      className="flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer p-0.5 outline-none transition-colors rounded hover:bg-muted/80"
                      onClick={toggleAllModules}
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
                {/* Dynamically render ONLY channels accessible to this user's role */}
                {roleChannels.map((ch, idx) => {
                  const colState = getColumnState(ch.id)
                  const isLast = idx === roleChannels.length - 1
                  return (
                    <th
                      key={ch.id}
                      className={cn(
                        'bg-card py-3 px-1 text-center w-[72px] border-b border-border',
                        isLast && 'rounded-tr-lg'
                      )}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <HeaderTriCheckbox
                          state={colState}
                          onClick={() => handleToggleColumn(ch.id)}
                          ariaLabel={`Toggle ${ch.label} for all visible notifications`}
                        />
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider cursor-help">
                              {ch.label}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[200px] text-xs font-normal normal-case">
                            {HEADER_TOOLTIPS[ch.id] || ch.label}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {grouped.map((g) => {
                const isCollapsed = !openModules.includes(g.module)
                return (
                  <Fragment key={g.module}>
                    {/* Collapsible Module Section Divider Row */}
                    <tr
                      onClick={() => toggleModule(g.module)}
                      className="cursor-pointer bg-muted/20 hover:bg-muted/30 select-none font-semibold text-sm text-foreground border-y border-border"
                    >
                      <td colSpan={totalCols} className="py-1.5 px-4">
                        <div className="flex items-center gap-2">
                          {isCollapsed ? (
                            <ChevronRight className="size-3.5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="size-3.5 text-muted-foreground" />
                          )}
                          <span>{g.module}</span>
                          <span className="text-xs font-normal text-muted-foreground mr-1">
                            ({g.types.length})
                          </span>
                        </div>
                      </td>
                    </tr>

                    {/* Notification type rows for this module */}
                    {!isCollapsed &&
                      g.types.map((type) => {
                        const eligible = typeChannelMap[type.id] ?? []
                        return (
                          <tr
                            key={type.id}
                            className="hover:bg-muted/80 dark:hover:bg-muted/50 transition-colors"
                          >
                            {/* 1. Notification Type Column with Tag BEFORE Name and Lock AFTER Info Icon */}
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
                                  {/* Lock Icon placed right after Info icon for mandatory notifications */}
                                  {type.mandatory && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="flex items-center justify-center text-amber-600 dark:text-amber-400 cursor-help shrink-0">
                                          <Lock className="size-3.5" />
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="text-xs">
                                        Mandatory — required by your organization
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* 2. Dynamic Role Channel Matrix Checkboxes (Exact MatrixCheckbox2 from Config Page 2) */}
                            {roleChannels.map((ch) => {
                              const isEligible = eligible.includes(ch.id)
                              const isOn = type.mandatory || prefs[type.id]?.has(ch.id)
                              return (
                                <td key={ch.id} className="py-2.5 px-1 text-center vertical-middle">
                                  <div className="flex justify-center items-center">
                                    {!isEligible ? (
                                      <span className="text-xs text-muted-foreground/30 font-mono select-none" title="Not available for your role">—</span>
                                    ) : (
                                      <MatrixCheckbox2
                                        state={isOn}
                                        disabled={type.mandatory}
                                        onClick={() => toggleChannel(type.id, ch.id)}
                                        ariaLabel={`Toggle ${ch.label} for ${type.name}`}
                                      />
                                    )}
                                  </div>
                                </td>
                              )
                            })}
                          </tr>
                        )
                      })}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export function MyNotificationsPage({
  query = '',
  moduleFilter = 'all',
  criticalityFilter = 'all',
  onCorpusChange,
}: {
  query?: string
  moduleFilter?: string
  criticalityFilter?: 'all' | Criticality
  /** Reports the rows this page can list (selected role, pre-filter). */
  onCorpusChange?: (types: NotificationType[]) => void
}) {
  const [role, setRole] = useState<Role>(VIEWER_ROLES[0])
  const [resetKey, setResetKey] = useState(0)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)

  const handleReset = () => {
    setResetKey((k) => k + 1)
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-5">
        {/* Header Title & Top-Right Action Controls */}
        <div className="flex items-start justify-between gap-4 flex-wrap pb-1">
          <div className="flex-1 min-w-[280px]">
            <h1 className="text-lg font-semibold text-foreground">My Notification Preferences</h1>
            <p className="text-sm text-muted-foreground">
              Manage your personal delivery preferences for notifications assigned to your role.
            </p>
          </div>

          {/* Top Right Action Toolbar Group (Reset Button with Tooltip) */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="tertiary"
                  size="sm"
                  onClick={() => setResetDialogOpen(true)}
                  className="h-9 text-xs font-semibold gap-1.5 cursor-pointer border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground shrink-0"
                >
                  <RotateCcw className="size-3.5" />
                  Reset to Defaults
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[260px] text-xs font-normal">
                Reset your personal notification channel preferences back to organization defaults.
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        <RolePreferences
          key={`${role}-${resetKey}`}
          role={role}
          query={query}
          moduleFilter={moduleFilter}
          criticalityFilter={criticalityFilter}
          onReset={handleReset}
          onCorpusChange={onCorpusChange}
        />

        {/* Reset Confirmation Dialog Modal */}
        <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
          <DialogContent hideClose className="max-w-md gap-4">
            <DialogHeader className="gap-1.5">
              <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400">
                <div className="flex size-9 items-center justify-center rounded-full bg-rose-500/10 dark:bg-rose-500/20">
                  <RotateCcw className="size-4.5 text-rose-600 dark:text-rose-400" />
                </div>
                <DialogTitle className="text-base font-semibold text-foreground">Reset Preferences to Defaults?</DialogTitle>
              </div>
              <DialogDescription className="text-xs text-muted-foreground pt-1 leading-relaxed">
                This will restore all your personal delivery preferences for the current role back to your organization&apos;s standard default configurations. Mandatory notifications will remain enabled.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="sm:justify-between pt-2">
              <Button
                type="button"
                variant="tertiary"
                size="sm"
                onClick={() => setResetDialogOpen(false)}
                className="cursor-pointer border border-border bg-card hover:bg-muted text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => {
                  handleReset()
                  setResetDialogOpen(false)
                }}
                className="cursor-pointer gap-1.5 text-xs font-semibold"
              >
                <RotateCcw className="size-3.5" />
                Reset Preferences
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Floating Bottom Center Role Switcher Pill (Demo) */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-3.5 py-2 rounded-full border border-border bg-card/95 backdrop-blur-md shadow-2xl ring-1 ring-black/5 dark:ring-white/10">
          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 pl-0.5">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            <span>Simulated Role</span>
            <Badge variant="secondary" size="xs" className="h-4 px-1.5 text-[10px] font-bold uppercase tracking-wider rounded-[2px] bg-primary/10 text-primary border-none">
              Demo
            </Badge>
          </span>

          <Select value={role} onValueChange={(v) => setRole(v as Role)}>
            <SelectTrigger className="h-7.5 w-[190px] bg-background text-xs font-semibold border-border rounded-full shadow-none hover:bg-muted/80 transition-colors">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="center" className="z-[60]">
              {VIEWER_ROLES.map((r) => (
                <SelectItem key={r} value={r} className="text-xs font-medium">
                  {r} ({VIEWER_ROLE_COUNTS[r]})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </TooltipProvider>
  )
}
