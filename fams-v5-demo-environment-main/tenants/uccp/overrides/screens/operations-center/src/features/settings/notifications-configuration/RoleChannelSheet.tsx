import { Lock, Unlock, Check, Minus, Flag, Layers, X } from 'lucide-react'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose,
  Badge, Switch, Button, cn,
} from '@fams/design-system'
import { CHANNELS, ROLES, BATCHING_SUPPORTED_MODULES, type NotificationType, type Channel, type Role } from './notificationsConfigData'

/**
 * Column-header tri-state toggle for "this channel, every role at once". The DS
 * `Checkbox`'s indeterminate state renders the same checkmark as fully-checked (no
 * visual distinction), which reads as a bug here — so this one control is local,
 * showing a dash for "some roles" vs a check for "every role".
 */
function HeaderTriToggle({ state, onClick }: { state: boolean | 'indeterminate'; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex size-4 shrink-0 items-center justify-center rounded-sm border transition-colors',
        state === true ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-input-background text-muted-foreground'
      )}
    >
      {state === true ? <Check className="size-3" strokeWidth={3} /> : state === 'indeterminate' ? <Minus className="size-3" strokeWidth={3} /> : null}
    </button>
  )
}

/**
 * The full editor for one notification type — Enabled/Mandatory + the Role × Channel
 * matrix. Opened from a row's "Configure" action rather than expanding inline, since
 * at 10+ roles × 4 channels an inline matrix per row doesn't scale to 20+ modules.
 */
export function RoleChannelSheet({
  type,
  open,
  onOpenChange,
  onTogglePlatformEnabled,
  onToggleMandatory,
  onToggleBatchingExempt,
  onToggleRoleChannel,
}: {
  type: NotificationType | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onTogglePlatformEnabled: (value: boolean) => void
  onToggleMandatory: (value: boolean) => void
  onToggleBatchingExempt: (value: boolean) => void
  onToggleRoleChannel: (role: Role, channel: Channel, value: boolean) => void
}) {
  if (!type) return null

  const channelState = (channel: Channel): boolean | 'indeterminate' => {
    const values = ROLES.map((role) => type.roleChannels[role][channel])
    if (values.every(Boolean)) return true
    if (values.every((v) => !v)) return false
    return 'indeterminate'
  }

  const toggleChannelForAllRoles = (channel: Channel) => {
    const next = channelState(channel) !== true
    for (const role of ROLES) onToggleRoleChannel(role, channel, next)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" width="760px" hideClose className="p-0">
        {/* Circular close floating in the scrim, with a gap to the sheet's left edge,
            vertically centered — matches the Dashboard sheets (e.g. KpiDetailSheet). */}
        <SheetClose className="absolute -left-14 top-1/2 z-10 flex size-8 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-md outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
          <X className="size-4" />
          <span className="sr-only">Close</span>
        </SheetClose>

        <SheetHeader>
          <div className="flex flex-wrap items-center gap-2">
            <SheetTitle>{type.name}</SheetTitle>
            <Badge variant="muted" size="xs">{type.module}</Badge>
            {(type.criticality as string) === 'mixed' ? (
              <Badge variant="muted" size="xs" className="font-semibold">Mixed Criticality</Badge>
            ) : (
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
            )}
          </div>
          <SheetDescription>{type.description}</SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-6">
          <div className="flex flex-col gap-3 rounded-md border border-border p-4">
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <span>
                <span className="text-sm font-medium text-foreground">Platform Enabled</span>
                <p className="text-xs text-muted-foreground">Staged rollout — whether this notification is delivered at all.</p>
              </span>
              <Switch
                checked={type.platformEnabled === true}
                onCheckedChange={(checked) => {
                  onTogglePlatformEnabled(checked)
                  if (!checked) {
                    onToggleMandatory(false)
                  }
                }}
              />
            </label>
            <div
              className={cn(
                "ml-6 border-l-2 border-border pl-4 flex items-center justify-between gap-3 transition-opacity duration-200",
                !type.platformEnabled ? "opacity-40 cursor-not-allowed select-none" : ""
              )}
            >
              <label className={cn("flex-1 cursor-pointer", !type.platformEnabled && "cursor-not-allowed pointer-events-none")}>
                <span className="text-sm font-medium text-foreground">Mandatory</span>
                <p className="text-xs text-muted-foreground">
                  {!type.platformEnabled
                    ? "Enable Platform delivery first to lock this notification on."
                    : "Locks this notification on — individual users cannot opt out."}
                </p>
              </label>
              <Switch
                checked={type.platformEnabled === true && type.mandatory === true}
                onCheckedChange={onToggleMandatory}
                disabled={!type.platformEnabled}
              />
            </div>
            {BATCHING_SUPPORTED_MODULES.includes(type.module) && (
              <div className="flex items-center justify-between gap-3">
                <span>
                  <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <Layers className="size-3.5 text-muted-foreground" />
                    Exempt from Batching
                  </span>
                  <p className="text-xs text-muted-foreground">
                    Always deliver this notification individually, even if its module groups
                    notifications into a summary digest.
                  </p>
                </span>
                <Switch checked={type.batchingExempt === true} onCheckedChange={onToggleBatchingExempt} />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Role × Channel routing</h3>
              <p className="text-xs text-muted-foreground">
                Choose which roles receive this notification, and on which channel(s). Click a
                channel's header checkbox to toggle it for every role at once.
              </p>
            </div>

            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full min-w-[560px] text-xs">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-2 text-left font-medium text-muted-foreground">Role</th>
                    {CHANNELS.map((c) => (
                      <th key={c.id} className="p-2 text-center font-medium text-muted-foreground">
                        <div className="flex flex-col items-center gap-1">
                          <HeaderTriToggle state={channelState(c.id)} onClick={() => toggleChannelForAllRoles(c.id)} />
                          {c.label}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ROLES.map((role) => (
                    <tr key={role} className="border-t border-border">
                      <td className="p-2 font-medium text-foreground">{role}</td>
                      {CHANNELS.map((c) => {
                        const cellState = type.roleChannels[role][c.id]
                        return (
                          <td key={c.id} className="p-2 text-center">
                            <div className="flex justify-center">
                              <HeaderTriToggle
                                state={cellState}
                                onClick={() => onToggleRoleChannel(role, c.id, cellState !== true)}
                              />
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <SheetFooter className="sm:justify-between">
          <div
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium',
              type.mandatory ? 'bg-warning-50 text-warning-700' : 'bg-muted text-muted-foreground'
            )}
          >
            {type.mandatory ? <Lock className="size-3.5 shrink-0" /> : <Unlock className="size-3.5 shrink-0" />}
            {type.mandatory
              ? 'Mandatory — individual users cannot opt out.'
              : 'Optional — users may turn this off for themselves.'}
          </div>
          <SheetClose asChild>
            <Button variant="primary">Done</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
