import { useState, type SyntheticEvent } from 'react'
import { Layers, Info } from 'lucide-react'
import {
  Popover, PopoverTrigger, PopoverContent, Tooltip, TooltipTrigger, TooltipContent, Switch, cn,
} from '@fams/design-system'
import {
  DEFAULT_BATCHING, type BatchingConfig, type ModuleBatchingOverride,
  resolveBatchingConfig, batchingSentence,
} from '../notifications-configuration/notificationsConfigData'

export function BatchingOverrideControl2({
  module,
  override,
  onChange,
  simple = false,
  simpleDefaultThreshold = 40,
  simpleDefaultWindow = 15,
}: {
  module: string
  override: ModuleBatchingOverride
  onChange: (next: ModuleBatchingOverride) => void
  simple?: boolean
  simpleDefaultThreshold?: number
  simpleDefaultWindow?: number
}) {
  const isBatchingEnabled = override.mode === 'custom'
  const [draft, setDraft] = useState<BatchingConfig>({
    enabled: override.custom.enabled,
    thresholdCount: override.custom.thresholdCount || 5,
    windowMinutes: override.custom.windowMinutes || 2,
  })

  const effectiveThreshold = simple ? simpleDefaultThreshold : draft.thresholdCount
  const effectiveWindow = simple ? simpleDefaultWindow : draft.windowMinutes

  const toggleSimple = () => {
    if (isBatchingEnabled) {
      onChange({
        mode: 'off',
        custom: { enabled: false, thresholdCount: simpleDefaultThreshold, windowMinutes: simpleDefaultWindow },
      })
    } else {
      onChange({
        mode: 'custom',
        custom: { enabled: true, thresholdCount: simpleDefaultThreshold, windowMinutes: simpleDefaultWindow },
      })
    }
  }

  const handleToggle = (checked: boolean) => {
    if (checked) {
      onChange({
        mode: 'custom',
        custom: { enabled: true, thresholdCount: draft.thresholdCount, windowMinutes: draft.windowMinutes },
      })
    } else {
      onChange({
        mode: 'off',
        custom: { ...draft, enabled: false },
      })
    }
  }

  const handleThresholdChange = (val: number) => {
    const next = { ...draft, thresholdCount: Math.max(2, val) }
    setDraft(next)
    if (isBatchingEnabled) {
      onChange({ mode: 'custom', custom: next })
    }
  }

  const handleWindowChange = (val: number) => {
    const next = { ...draft, windowMinutes: Math.max(1, val) }
    setDraft(next)
    if (isBatchingEnabled) {
      onChange({ mode: 'custom', custom: next })
    }
  }

  const stop = (e: SyntheticEvent) => e.stopPropagation()

  // Tooltip & status label text
  const tooltipText = isBatchingEnabled
    ? `Notification Digest: Enabled — Groups ${effectiveThreshold} notifications within ${effectiveWindow}m`
    : simple
      ? `Notification Digest: Disabled — Enable to group ${simpleDefaultThreshold} notifications within ${simpleDefaultWindow}m`
      : 'Notification Digest: Disabled — Deliver notifications individually immediately'

  if (simple) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            role="button"
            tabIndex={0}
            aria-label={`Toggle notification batching for ${module}`}
            onClick={(e) => {
              e.stopPropagation()
              toggleSimple()
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                e.stopPropagation()
                toggleSimple()
              }
            }}
            className={cn(
              'flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold outline-none transition-colors border hover:bg-muted',
              isBatchingEnabled
                ? 'border-primary/30 bg-primary/5 text-primary'
                : 'border-border bg-card text-muted-foreground'
            )}
          >
            <Layers className="size-3.5" />
            {isBatchingEnabled ? 'Digest On' : 'Digest Off'}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[240px] text-xs font-normal normal-case leading-snug p-2">
          {isBatchingEnabled
            ? `On — groups up to ${effectiveThreshold} notifications every ${effectiveWindow}m. Click to turn off.`
            : `Off — sent individually. Click to group ${simpleDefaultThreshold} within ${simpleDefaultWindow}m.`}
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <span
              role="button"
              tabIndex={0}
              aria-label={`Configure notification batching for ${module}`}
              onClick={stop}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  e.stopPropagation()
                  e.currentTarget.click()
                }
              }}
              className={cn(
                'flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold outline-none transition-colors border hover:bg-muted',
                isBatchingEnabled
                  ? 'border-primary/30 bg-primary/5 text-primary'
                  : 'border-border bg-card text-muted-foreground'
              )}
            >
              <Layers className="size-3.5" />
              {isBatchingEnabled ? 'Digest On' : 'Digest Off'}
            </span>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs font-normal">
          {tooltipText}
        </TooltipContent>
      </Tooltip>
      <PopoverContent align="start" className="w-[300px] p-4 bg-card border border-border shadow-md rounded-lg" onClick={stop}>
        <div className="flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-center gap-1.5 pb-2 border-b border-border/60">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Digest Configuration
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-muted-foreground hover:text-foreground cursor-help p-0.5 outline-none">
                  <Info className="size-3.5" />
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[280px] text-xs font-normal normal-case leading-normal p-2.5">
                Convert notification bursts into one summary instead of sending each separately. The summary is sent as soon as either condition is met first: the minimum number of notifications is reached OR the time window expires.
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Toggle Switch Row */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold text-foreground">Digest notifications</span>
              <span className="text-[10px] text-muted-foreground leading-normal">
                Convert notification bursts into a summary
              </span>
            </div>
            <Switch
              checked={isBatchingEnabled}
              onCheckedChange={handleToggle}
              className="scale-90 origin-right"
            />
          </div>

          {/* Settings Grid (only visible if enabled) */}
          {isBatchingEnabled && (
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/60">
              <div className="flex flex-col gap-1">
                <label htmlFor={`${module}-threshold-input`} className="text-[10px] font-medium text-muted-foreground">
                  Min. notifications
                </label>
                <input
                  id={`${module}-threshold-input`}
                  type="number"
                  min={2}
                  value={draft.thresholdCount}
                  onChange={(e) => handleThresholdChange(Number(e.target.value) || 2)}
                  className="h-8.5 rounded-md border border-border bg-input-background px-2.5 text-xs text-foreground outline-none focus-visible:ring-1.5 focus-visible:ring-primary focus-visible:border-primary font-medium"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor={`${module}-window-input`} className="text-[10px] font-medium text-muted-foreground">
                  Time window (mins)
                </label>
                <input
                  id={`${module}-window-input`}
                  type="number"
                  min={1}
                  value={draft.windowMinutes}
                  onChange={(e) => handleWindowChange(Number(e.target.value) || 1)}
                  className="h-8.5 rounded-md border border-border bg-input-background px-2.5 text-xs text-foreground outline-none focus-visible:ring-1.5 focus-visible:ring-primary focus-visible:border-primary font-medium"
                />
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
