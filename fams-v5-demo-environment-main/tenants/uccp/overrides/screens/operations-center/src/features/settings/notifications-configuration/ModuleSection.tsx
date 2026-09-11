import { useState, type SyntheticEvent } from 'react'
import { Lock, Settings2, Flag, Layers, BellOff, ChevronDown, Check, Minus } from 'lucide-react'
import {
  AccordionItem, AccordionTrigger, AccordionContent, Checkbox, Switch, Tooltip, TooltipTrigger, TooltipContent, Badge,
  Popover, PopoverTrigger, PopoverContent, cn,
} from '@fams/design-system'
import {
  CHANNELS, ROLES, resolveBatchingConfig, batchingSentence, BATCHING_SUPPORTED_MODULES,
  type NotificationType, type Channel, type BatchingConfig, type ModuleBatchingOverride, type ModuleBatchingMode,
} from './notificationsConfigData'

function ChannelDots({ type }: { type: NotificationType }) {
  const anyRoleHas = (channel: Channel) => ROLES.some((role) => type.roleChannels[role][channel])
  return (
    <div className="flex items-center gap-1">
      {CHANNELS.map((c) => (
        <Tooltip key={c.id}>
          <TooltipTrigger asChild>
            <span
              className={cn(
                'flex size-5 items-center justify-center rounded-[4px] text-[10px] font-semibold',
                anyRoleHas(c.id) ? 'bg-secondary text-secondary-foreground' : 'bg-muted text-muted-foreground'
              )}
            >
              {c.label[0]}
            </span>
          </TooltipTrigger>
          <TooltipContent side="top">{c.label}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  )
}

/** Module-level "select all in this module" control, rendered as a sibling of
 * `AccordionTrigger`'s children inside the trigger itself (same slot/reasoning as
 * `BatchingOverrideControl` below) — a real nested `<button>`/DS `Checkbox` (which
 * Radix renders as a `<button>`) is invalid HTML inside the trigger's own button, so
 * this is a `<span role="checkbox">` with `stopPropagation` instead. Tri-state: all
 * rows selected / none selected / some selected (dash), matching the same
 * indeterminate convention as `RoleChannelSheet`'s `HeaderTriToggle`. */
function ModuleSelectToggle({
  state,
  onClick,
  ariaLabel,
}: {
  state: boolean | 'indeterminate'
  onClick: () => void
  ariaLabel: string
}) {
  const activate = (e: SyntheticEvent) => {
    e.stopPropagation()
    onClick()
  }
  return (
    <span
      role="checkbox"
      aria-checked={state === 'indeterminate' ? 'mixed' : state}
      aria-label={ariaLabel}
      tabIndex={0}
      onClick={activate}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          activate(e)
        }
      }}
      className={cn(
        'flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-sm border outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
        state !== false ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-input-background text-muted-foreground'
      )}
    >
      {state === true ? <Check className="size-3" strokeWidth={3} /> : state === 'indeterminate' ? <Minus className="size-3" strokeWidth={3} /> : null}
    </span>
  )
}

function NotificationRow({
  type,
  selected,
  onToggleSelect,
  onTogglePlatformEnabled,
  onConfigure,
}: {
  type: NotificationType
  selected: boolean
  onToggleSelect: (value: boolean) => void
  onTogglePlatformEnabled: (value: boolean) => void
  onConfigure: () => void
}) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2.5">
      <Checkbox checked={selected} onCheckedChange={(v) => onToggleSelect(v === true)} aria-label={`Select ${type.name}`} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-medium text-foreground">{type.name}</span>
          {type.mandatory ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex shrink-0 items-center text-warning-600">
                  <Lock className="size-3.5" />
                </span>
              </TooltipTrigger>
              <TooltipContent side="top">Mandatory — users cannot opt out.</TooltipContent>
            </Tooltip>
          ) : null}
          {type.batchingExempt && BATCHING_SUPPORTED_MODULES.includes(type.module) ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex shrink-0 items-center text-muted-foreground">
                  <BellOff className="size-3.5" />
                </span>
              </TooltipTrigger>
              <TooltipContent side="top">Exempt from Notification Batching — always delivers individually.</TooltipContent>
            </Tooltip>
          ) : null}
          <Badge
            variant={
              type.criticality === 'critical'
                ? 'destructive'
                : type.criticality === 'medium'
                ? 'warning'
                : 'info'
            }
            size="xs"
            className="capitalize gap-1 px-1.5 h-5 rounded-[2px] font-semibold"
          >
            <Flag className="size-3" />
            {type.criticality}
          </Badge>
        </div>
        <p className="truncate text-xs text-muted-foreground">{type.description}</p>
      </div>

      <ChannelDots type={type} />

      <label className="flex shrink-0 items-center gap-2 text-xs font-medium text-muted-foreground">
        Enabled
        <Switch checked={type.platformEnabled} onCheckedChange={onTogglePlatformEnabled} />
      </label>

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onConfigure}
            aria-label={`Configure roles and channels for ${type.name}`}
            className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground"
          >
            <Settings2 className="size-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">Configure roles &amp; channels</TooltipContent>
      </Tooltip>
    </div>
  )
}

const BATCHING_MODES: { id: ModuleBatchingMode; label: string }[] = [
  { id: 'inherit', label: 'Use platform default' },
  { id: 'custom', label: 'Custom threshold — override just for this module' },
  { id: 'off', label: 'Never batch — always deliver individually' },
]

const MODE_SHORT_LABEL: Record<ModuleBatchingMode, string> = { inherit: 'Default', custom: 'Custom', off: 'Off' }

/** Per-module override for the Notification Batching (queue + digest) feature. Rendered as a
 * `<span role="button">` (not a real `<button>`) INSIDE AccordionTrigger's own children, so it can
 * sit right after the "N/M enabled" count while the DS AccordionTrigger's own auto-appended
 * chevron still lands at the true far right of the row (its `flex-1 justify-between` pushes
 * whatever single child block precedes the chevron to the left, chevron to the right — a real
 * nested `<button>` here would break that, hence the span + stopPropagation + Enter/Space→click()
 * pattern instead of PopoverTrigger's default button). */
export function BatchingOverrideControl({
  module,
  override,
  globalBatching,
  onChange,
  showInherit = true,
}: {
  module: string
  override: ModuleBatchingOverride
  globalBatching: BatchingConfig
  onChange: (next: ModuleBatchingOverride) => void
  showInherit?: boolean
}) {
  const [draft, setDraft] = useState<BatchingConfig>(override.custom)
  const [showExample, setShowExample] = useState(false)
  const effective = resolveBatchingConfig(globalBatching, override)

  const effectiveMode = (!showInherit && override.mode === 'inherit') ? 'off' : override.mode

  const tooltip =
    effectiveMode === 'off'
      ? 'Notification Batching: Off — every notification delivers individually, never grouped'
      : `Notification Batching: ${MODE_SHORT_LABEL[effectiveMode]} — ${batchingSentence(effective)}`

  const setMode = (mode: ModuleBatchingMode) => onChange({ mode, custom: mode === 'custom' ? draft : override.custom })
  const stop = (e: SyntheticEvent) => e.stopPropagation()

  const modes = showInherit
    ? BATCHING_MODES
    : BATCHING_MODES.filter((m) => m.id !== 'inherit')

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <span
              role="button"
              tabIndex={0}
              aria-label={`Configure notification batching for ${module} — currently ${MODE_SHORT_LABEL[effectiveMode]}`}
              onClick={stop}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  e.stopPropagation()
                  e.currentTarget.click()
                }
              }}
              className={cn(
                'flex shrink-0 cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs font-medium outline-none transition-colors hover:bg-muted',
                effectiveMode === 'custom'
                  ? 'bg-primary/10 text-primary hover:text-primary'
                  : effectiveMode === 'off'
                  ? 'text-muted-foreground/60 hover:text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Layers className="size-3.5" />
              {MODE_SHORT_LABEL[effectiveMode]}
            </span>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="top">{tooltip}</TooltipContent>
      </Tooltip>
      <PopoverContent align="start" className="w-[380px]" onClick={stop}>
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Notification Batching — {module}</p>
            <p className="text-xs text-muted-foreground">Group this module's notification bursts into one summary instead of sending each separately.</p>
          </div>

          <div className="flex flex-col gap-1.5">
            {modes.map((m) => {
              const isActive = effectiveMode === m.id
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMode(m.id)}
                  className={cn(
                    'flex items-center gap-2.5 rounded-md border px-2.5 py-2 text-left text-sm transition-colors',
                    isActive ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted'
                  )}
                >
                  <span
                    className={cn(
                      'flex size-4 shrink-0 items-center justify-center rounded-full border-2',
                      isActive ? 'border-primary' : 'border-gray-300'
                    )}
                  >
                    {isActive ? <span className="size-2 rounded-full bg-primary" /> : null}
                  </span>
                  <span className="flex-1 font-medium text-foreground">{m.label}</span>
                </button>
              )
            })}
          </div>

          {effectiveMode === 'custom' ? (
            <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3 text-sm">
              <span className="text-muted-foreground">Group</span>
              <label htmlFor={`${module}-threshold`} className="sr-only">Threshold for {module}</label>
              <input
                id={`${module}-threshold`}
                type="number"
                min={2}
                value={draft.thresholdCount}
                onChange={(e) => {
                  const next = { ...draft, thresholdCount: Math.max(2, Number(e.target.value) || 0) }
                  setDraft(next)
                  onChange({ mode: 'custom', custom: next })
                }}
                className="h-8 w-14 rounded-md border border-border bg-input-background px-2 text-center text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary"
              />
              <span className="text-muted-foreground">or more notifications sent within</span>
              <label htmlFor={`${module}-window`} className="sr-only">Time window for {module}</label>
              <input
                id={`${module}-window`}
                type="number"
                min={1}
                value={draft.windowMinutes}
                onChange={(e) => {
                  const next = { ...draft, windowMinutes: Math.max(1, Number(e.target.value) || 0) }
                  setDraft(next)
                  onChange({ mode: 'custom', custom: next })
                }}
                className="h-8 w-14 rounded-md border border-border bg-input-background px-2 text-center text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary"
              />
              <span className="text-muted-foreground">minutes.</span>
            </div>
          ) : null}

          <div className="border-t border-border pt-3 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setShowExample((v) => !v)}
              className="flex w-fit items-center gap-1 text-xs font-semibold text-primary outline-none hover:text-primary/80"
            >
              Learn more
              <ChevronDown className={cn('size-3.5 transition-transform', showExample && 'rotate-180')} />
            </button>

            {showExample ? (
              <p className="text-xs text-muted-foreground">
                {effectiveMode === 'off' ? 'Every notification from this module delivers on its own — nothing is grouped.' : `Example: ${batchingSentence(effectiveMode === 'custom' ? draft : globalBatching)}.`}
              </p>
            ) : null}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export function ModuleSection({
  module,
  types,
  selectedIds,
  onToggleSelect,
  onToggleModuleSelect,
  onTogglePlatformEnabled,
  onConfigure,
  batchingOverride,
  globalBatching,
  onBatchingOverrideChange,
}: {
  module: string
  types: NotificationType[]
  selectedIds: Set<string>
  onToggleSelect: (id: string, value: boolean) => void
  onToggleModuleSelect: (module: string, ids: string[], value: boolean) => void
  onTogglePlatformEnabled: (id: string, value: boolean) => void
  onConfigure: (id: string) => void
  batchingOverride: ModuleBatchingOverride
  globalBatching: BatchingConfig
  onBatchingOverrideChange: (next: ModuleBatchingOverride) => void
}) {
  const enabledCount = types.filter((t) => t.platformEnabled).length
  const selectedCount = types.filter((t) => selectedIds.has(t.id)).length
  const selectState: boolean | 'indeterminate' =
    selectedCount === 0 ? false : selectedCount === types.length ? true : 'indeterminate'

  return (
    <AccordionItem value={module} className="border-b border-border last:border-none">
      <AccordionTrigger className="rounded-md px-3 py-2.5 hover:bg-muted hover:no-underline">
        <div className="flex flex-1 items-center gap-2 text-left">
          <ModuleSelectToggle
            state={selectState}
            onClick={() => onToggleModuleSelect(module, types.map((t) => t.id), selectState !== true)}
            ariaLabel={`Select all notifications in ${module}`}
          />
          <span className="text-sm font-semibold text-foreground">{module}</span>
          <span className="text-xs text-muted-foreground">{enabledCount}/{types.length} enabled</span>
          {BATCHING_SUPPORTED_MODULES.includes(module) && (
            <BatchingOverrideControl
              module={module}
              override={batchingOverride}
              globalBatching={globalBatching}
              onChange={onBatchingOverrideChange}
            />
          )}
        </div>
      </AccordionTrigger>
      <AccordionContent className="!pb-0">
        <div className="flex flex-col gap-2 px-1 pb-3">
          {types.map((t) => (
            <NotificationRow
              key={t.id}
              type={t}
              selected={selectedIds.has(t.id)}
              onToggleSelect={(v) => onToggleSelect(t.id, v)}
              onTogglePlatformEnabled={(v) => onTogglePlatformEnabled(t.id, v)}
              onConfigure={() => onConfigure(t.id)}
            />
          ))}
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}
