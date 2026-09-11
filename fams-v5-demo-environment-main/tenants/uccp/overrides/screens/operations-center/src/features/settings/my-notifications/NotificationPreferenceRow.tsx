import { Lock, Check } from 'lucide-react'
import { Badge, Checkbox, Tooltip, TooltipTrigger, TooltipContent, cn } from '@fams/design-system'
import { CHANNELS, type NotificationType, type Role, type Channel } from '../notifications-configuration/notificationsConfigData'
import { eligibleChannels, CHANNEL_DESCRIPTIONS } from './myNotificationsData'

/** Wrapped in a Tooltip (mirrored onto `aria-label`, so it's not mouse-only) stating what the
 * channel actually is before the effect a click has — same pattern as the bulk-selection
 * `SelectionChannelButton` in MyNotificationsPage.tsx, so every channel toggle on this page
 * explains itself the same way. */
function ChannelChip({
  channel,
  on,
  locked,
  onClick,
}: {
  channel: Channel
  on: boolean
  locked: boolean
  onClick: () => void
}) {
  const label = CHANNELS.find((c) => c.id === channel)?.label ?? channel
  const effect = locked ? 'Required by your organization — can’t be turned off.' : on ? 'Turn off for this notification.' : 'Turn on for this notification.'
  const tooltip = `${label} — ${CHANNEL_DESCRIPTIONS[channel]}. ${effect}`
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          disabled={locked}
          onClick={onClick}
          aria-pressed={on}
          aria-label={tooltip}
          className={cn(
            'flex h-7 shrink-0 items-center gap-1 rounded-md border px-2.5 text-xs font-semibold outline-none transition-colors',
            on
              ? 'border-success-500 bg-success-50 text-success-600'
              : 'border-border bg-input-background text-muted-foreground',
            locked ? 'cursor-default' : 'cursor-pointer hover:bg-muted'
          )}
        >
          {on ? <Check className="size-3" aria-hidden="true" /> : null}
          {label}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">{tooltip}</TooltipContent>
    </Tooltip>
  )
}

/**
 * One notification type in the end-user's personal preference list — a simplified sibling of the
 * admin `ModuleSection.tsx`'s `NotificationRow` (same card shell, no criticality flag / module
 * label, since those are admin triage concerns, not "what do I get notified about"). Channel chips
 * only render for channels this role is actually eligible for (never shown-and-disabled) and are
 * interactive UNLESS the type is mandatory, in which case every eligible chip renders locked-on
 * with no click handler at all — the "Required" badge, not a greyed switch, communicates why.
 * Mandatory rows never render the select checkbox either — nothing a bulk action could do to a
 * row that can't be changed — so a same-size invisible spacer keeps every row's text aligned to
 * the same left edge regardless of whether that row happens to be selectable.
 */
export function NotificationPreferenceRow({
  type,
  role,
  enabledChannels,
  onToggleChannel,
  selected,
  onToggleSelect,
}: {
  type: NotificationType
  role: Role
  enabledChannels: Set<Channel>
  onToggleChannel: (channel: Channel) => void
  selected: boolean
  onToggleSelect: (value: boolean) => void
}) {
  const channels = eligibleChannels(type, role)

  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2.5">
      {type.mandatory ? (
        <span className="size-4 shrink-0" aria-hidden="true" />
      ) : (
        <Checkbox checked={selected} onCheckedChange={(v) => onToggleSelect(v === true)} aria-label={`Select ${type.name}`} />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-medium text-foreground">{type.name}</span>
          {type.mandatory ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="warning" size="xs" className="gap-1 px-1.5 h-5 rounded-[4px] font-semibold">
                  <Lock className="size-3" aria-hidden="true" />
                  Required
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="top">Required by your organization — you&apos;ll always get this.</TooltipContent>
            </Tooltip>
          ) : null}
        </div>
        <p className="truncate text-xs text-muted-foreground">{type.description}</p>
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
        {channels.map((c) => (
          <ChannelChip
            key={c}
            channel={c}
            on={type.mandatory || enabledChannels.has(c)}
            locked={type.mandatory}
            onClick={() => onToggleChannel(c)}
          />
        ))}
      </div>
    </div>
  )
}
