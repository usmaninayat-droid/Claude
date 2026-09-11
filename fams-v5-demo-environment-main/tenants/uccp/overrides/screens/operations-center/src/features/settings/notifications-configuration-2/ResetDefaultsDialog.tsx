import { useState } from 'react'
import { RotateCcw, Sliders, Users, Sparkles } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
  Button, Checkbox, cn,
} from '@fams/design-system'

export interface ResetOptions {
  preferences: boolean
  profiles: boolean
  customNotifications: boolean
}

interface ResetDefaultsDialogProps {
  open: boolean
  onClose: () => void
  onConfirmReset: (options: ResetOptions) => void
  showCustomNotifications?: boolean
}

export function ResetDefaultsDialog({
  open,
  onClose,
  onConfirmReset,
  showCustomNotifications = true,
}: ResetDefaultsDialogProps) {
  const [preferences, setPreferences] = useState(false)
  const [profiles, setProfiles] = useState(false)
  const [customNotifications, setCustomNotifications] = useState(false)

  const isAnySelected = preferences || profiles || customNotifications

  const handleReset = () => {
    if (!isAnySelected) return
    onConfirmReset({
      preferences,
      profiles,
      customNotifications,
    })
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent hideClose className="max-w-md gap-5">
        <DialogHeader className="gap-1.5">
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
            <div className="flex size-9 items-center justify-center rounded-full bg-rose-500/10 dark:bg-rose-500/20">
              <RotateCcw className="size-4.5 text-rose-600 dark:text-rose-400" />
            </div>
            <DialogTitle className="text-base font-semibold">Reset Settings to Defaults</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground pt-1">
            Choose which notification configuration areas you would like to restore to factory defaults.
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-1">
          {/* Option 1: Preferences */}
          <div
            onClick={() => setPreferences((v) => !v)}
            className={cn(
              'flex items-start gap-3 rounded-lg border p-3.5 cursor-pointer transition-all select-none',
              preferences
                ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/30'
                : 'border-border bg-card hover:bg-muted/30'
            )}
          >
            <Checkbox
              checked={preferences}
              onCheckedChange={(v) => setPreferences(!!v)}
              className="mt-0.5"
            />
            <div className="flex flex-col gap-0.5">
              <div className="font-semibold text-xs text-foreground">
                Notification Preferences & Channel Matrix
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Restores platform enablement, mandatory locks, criticality levels, and role-channel matrix delivery rules to initial defaults.
              </p>
            </div>
          </div>

          {/* Option 2: Profiles */}
          <div
            onClick={() => setProfiles((v) => !v)}
            className={cn(
              'flex items-start gap-3 rounded-lg border p-3.5 cursor-pointer transition-all select-none',
              profiles
                ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/30'
                : 'border-border bg-card hover:bg-muted/30'
            )}
          >
            <Checkbox
              checked={profiles}
              onCheckedChange={(v) => setProfiles(!!v)}
              className="mt-0.5"
            />
            <div className="flex flex-col gap-0.5">
              <div className="font-semibold text-xs text-foreground">
                Notification Profiles & Role Assignments
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Resets profiles to default groups (Frontline Staff, Operations & Planning, Admin & Compliance) and restores original role assignments.
              </p>
            </div>
          </div>

          {/* Option 3: Custom Notifications */}
          {showCustomNotifications && (
            <div
              onClick={() => setCustomNotifications((v) => !v)}
              className={cn(
                'flex items-start gap-3 rounded-lg border p-3.5 cursor-pointer transition-all select-none',
                customNotifications
                  ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/30'
                  : 'border-border bg-card hover:bg-muted/30'
              )}
            >
              <Checkbox
                checked={customNotifications}
                onCheckedChange={(v) => setCustomNotifications(!!v)}
                className="mt-0.5"
              />
              <div className="flex flex-col gap-0.5">
                <div className="font-semibold text-xs text-foreground">
                  Custom Notifications & Created Types
                </div>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Removes all user-created custom notification types, restoring the original 37 system notification definitions.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex w-full items-center justify-between sm:justify-between gap-0 sm:flex-row">
          <Button variant="ghost" size="sm" onClick={onClose} className="cursor-pointer">
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={!isAnySelected}
            onClick={handleReset}
            className="cursor-pointer gap-1.5"
          >
            <RotateCcw className="size-3.5" />
            Reset Selected Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
