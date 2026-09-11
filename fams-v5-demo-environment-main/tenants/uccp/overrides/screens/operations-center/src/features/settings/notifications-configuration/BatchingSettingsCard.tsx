import { useState } from 'react'
import { Layers, ChevronDown } from 'lucide-react'
import { Switch, IconBadge, cn } from '@fams/design-system'
import { batchingSentence, type BatchingConfig } from './notificationsConfigData'

/**
 * BatchingSettingsCard — platform-wide default for the notification-batching
 * (queue + digest) feature. Per-module overrides live next to each module's
 * accordion header in ModuleSection; this is just the default they inherit.
 */
export function BatchingSettingsCard({
  config,
  onChange,
}: {
  config: BatchingConfig
  onChange: (next: BatchingConfig) => void
}) {
  const [showExample, setShowExample] = useState(false)

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <IconBadge icon={<Layers className="size-4" />} tone="primary" size={32} />
          <div>
            <p className="text-sm font-semibold text-foreground">Notification Batching</p>
            <p className="text-xs text-muted-foreground">
              Prevent notification floods — group a burst of alerts from the same module into one
              summary instead of sending each one separately. Any notification type can opt out
              from its own configuration sidesheet.
            </p>
          </div>
        </div>
        <Switch checked={config.enabled} onCheckedChange={(v) => onChange({ ...config, enabled: v })} />
      </div>

      {config.enabled ? (
        <div className="flex flex-col gap-1.5 border-t border-border pt-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Platform default — if a module sends</span>
            <label htmlFor="global-batch-threshold" className="sr-only">Batch threshold</label>
            <input
              id="global-batch-threshold"
              type="number"
              min={2}
              value={config.thresholdCount}
              onChange={(e) => onChange({ ...config, thresholdCount: Math.max(2, Number(e.target.value) || 0) })}
              className="h-8 w-14 rounded-md border border-border bg-input-background px-2 text-center text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary"
            />
            <span className="text-muted-foreground">or more notifications within</span>
            <label htmlFor="global-batch-window" className="sr-only">Time window in minutes</label>
            <input
              id="global-batch-window"
              type="number"
              min={1}
              value={config.windowMinutes}
              onChange={(e) => onChange({ ...config, windowMinutes: Math.max(1, Number(e.target.value) || 0) })}
              className="h-8 w-14 rounded-md border border-border bg-input-background px-2 text-center text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary"
            />
            <span className="text-muted-foreground">minutes, group them into one summary alert.</span>

            <button
              type="button"
              onClick={() => setShowExample((v) => !v)}
              className="ml-auto flex shrink-0 items-center gap-1 text-xs font-semibold text-primary outline-none hover:text-primary/80"
            >
              Learn more
              <ChevronDown className={cn('size-3.5 transition-transform', showExample && 'rotate-180')} />
            </button>
          </div>

          {showExample ? (
            <p className="text-xs text-muted-foreground">
              Example: {batchingSentence(config)} — instead of {config.thresholdCount} separate alerts. Each
              module below can use this default or set its own.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
