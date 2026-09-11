import { useEffect, useState } from 'react'
import {
  Sheet, SheetContent, SheetClose, SheetTitle, SheetDescription,
  Button, Input, Textarea,
} from '@fams/design-system'
import { AlertOctagon, Unlock, X } from 'lucide-react'
import { STATUS_META, type Truck } from './monitoringData'

/**
 * Remote immobilization flow — follows fleet-telematics market practice
 * (Geotab / Samsara / CalAmp-class platforms):
 *
 *  1. **Safety interlock** — the cut-off command never executes while the
 *     vehicle is in motion. If speed > 5 km/h the command is QUEUED on the
 *     telematics device and fires only once the vehicle is stationary
 *     (surfaced to the dispatcher in the consequences list + result toast).
 *  2. **Intent proof** — the dispatcher must type the plate to confirm.
 *  3. **Mandatory reason** — free-text, written to the audit log with the
 *     acting user + timestamp.
 *  4. **Authorization** — the action is only rendered for roles with the
 *     `fleet.immobilize` permission (this prototype's session user is a
 *     dispatcher, which holds it); the real backend re-checks server-side.
 *
 * Presented as a right-side sheet using the app's dashboard chrome (floating
 * circular ✕ in the scrim, same as `KpiDetailSheet`). Mobilization is the
 * inverse command — lighter (no typed confirmation, restoring drivability is
 * not destructive) but still audit-logged.
 */

/** Held-truck ref so the sheet doesn't blank while its close animation runs. */
function useLastTruck(truck: Truck | null) {
  const [held, setHeld] = useState<Truck | null>(truck)
  useEffect(() => { if (truck) setHeld(truck) }, [truck])
  return truck ?? held
}

/** Floating circular ✕ in the scrim at the sheet's left edge, vertically
 *  centered — the same close affordance used by the dashboard's detail sheets. */
function FloatingClose() {
  return (
    <SheetClose className="absolute -left-14 top-1/2 z-10 flex size-8 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-md outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
      <X className="size-4" />
      <span className="sr-only">Close</span>
    </SheetClose>
  )
}

export interface ImmobilizeSheetProps {
  truck: Truck | null
  onOpenChange: (open: boolean) => void
  onConfirm: (payload: { reason: string }) => void | Promise<void>
}

export function ImmobilizeSheet({ truck, onOpenChange, onConfirm }: ImmobilizeSheetProps) {
  const [typed, setTyped] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const open = truck != null

  // Reset the form each time the sheet closes.
  useEffect(() => { if (!open) { setTyped(''); setReason('') } }, [open])

  const t = useLastTruck(truck)
  if (!t) return null

  const inMotion = t.speed > 5
  const matches = typed.trim() === t.plate.trim()
  const canConfirm = matches && reason.trim().length > 0
  const confirmLabel = inMotion ? 'Queue immobilization' : 'Immobilize vehicle'

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        hideClose
        width="min(520px, 94vw)"
        className="p-0 flex flex-col h-full"
      >
        <FloatingClose />

        <div className="flex items-start gap-3 border-b border-border px-6 pt-6 pb-4">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--status-error)]/15 text-[color:var(--status-error)]">
            <AlertOctagon className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <SheetTitle className="text-lg font-bold text-foreground leading-tight">
              Immobilize {t.plate}?
            </SheetTitle>
            <SheetDescription className="mt-1 text-sm text-muted-foreground">
              This action cannot be undone.
            </SheetDescription>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6 space-y-5">
          <div className="rounded-lg border border-[color:var(--status-error)]/30 bg-[color:var(--status-error)]/8 p-3">
            <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[color:var(--status-error)]">
              Consequences
            </div>
            <ul className="space-y-1 text-xs text-foreground">
              <li className="flex gap-2">
                <span aria-hidden>·</span>
                <span>The engine cut-off command is sent to the vehicle's telematics unit (IMEI {t.imei}).</span>
              </li>
              <li className="flex gap-2">
                <span aria-hidden>·</span>
                <span>
                  {inMotion
                    ? `${t.plate} is currently moving at ${t.speed} km/h — for safety the command is queued and executes only once the vehicle is stationary.`
                    : `${t.plate} is stationary — the command executes immediately.`}
                </span>
              </li>
              <li className="flex gap-2">
                <span aria-hidden>·</span>
                <span>Driver {t.driver} will be unable to restart the vehicle until it is mobilized again.</span>
              </li>
              <li className="flex gap-2">
                <span aria-hidden>·</span>
                <span>This action is recorded in the audit log with your user, timestamp, and reason.</span>
              </li>
            </ul>
          </div>

          <Input
            label={`Type "${t.plate}" to confirm`}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            aria-invalid={typed.length > 0 && !matches}
          />

          <Textarea
            label="Reason"
            hint="This is recorded in the audit log."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
        </div>

        <div className="border-t border-border p-4 flex justify-end gap-3">
          <Button variant="tertiary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant="destructive"
            disabled={!canConfirm || submitting}
            loading={submitting}
            onClick={async () => {
              setSubmitting(true)
              try { await onConfirm({ reason }); onOpenChange(false) }
              finally { setSubmitting(false) }
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export interface MobilizeSheetProps {
  truck: Truck | null
  onOpenChange: (open: boolean) => void
  onConfirm: (payload: { reason: string }) => void | Promise<void>
}

export function MobilizeSheet({ truck, onOpenChange, onConfirm }: MobilizeSheetProps) {
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const open = truck != null

  useEffect(() => { if (!open) setReason('') }, [open])

  const t = useLastTruck(truck)
  if (!t) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        hideClose
        width="min(520px, 94vw)"
        className="p-0 flex flex-col h-full"
      >
        <FloatingClose />

        <div className="flex items-start gap-3 border-b border-border px-6 pt-6 pb-4">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--status-success)]/15 text-[color:var(--status-success)]">
            <Unlock className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <SheetTitle className="text-lg font-bold text-foreground leading-tight">
              Mobilize {t.plate}?
            </SheetTitle>
            <SheetDescription className="mt-1 text-sm text-muted-foreground">
              Restores engine start for driver {t.driver}. The release command is sent to
              the telematics unit (IMEI {t.imei}) and takes effect immediately.
            </SheetDescription>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6 space-y-5">
          <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-foreground">
            <span className="font-semibold" style={{ color: STATUS_META.immobilized.color }}>
              Currently immobilized
            </span>
            {' — '}last known location {t.location}. This action is recorded in the audit
            log with your user, timestamp, and reason.
          </div>

          <Textarea
            label="Reason"
            hint="This is recorded in the audit log."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
        </div>

        <div className="border-t border-border p-4 flex justify-end gap-3">
          <Button variant="tertiary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={reason.trim().length === 0 || submitting}
            loading={submitting}
            onClick={async () => {
              setSubmitting(true)
              try { await onConfirm({ reason }); onOpenChange(false) }
              finally { setSubmitting(false) }
            }}
          >
            Mobilize vehicle
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
