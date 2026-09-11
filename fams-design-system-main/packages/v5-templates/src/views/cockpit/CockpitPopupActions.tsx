import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Copy, MoreVertical, Phone, X } from '@fams/ui-kit/icons'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  toast,
} from '@fams/ui-kit'
import type { EntityRecord } from '@fams/v5-composer'
import { copyText } from '../../lib/copy-text'
import type { CockpitConfig } from './cockpit-model'
import type { CockpitFlowKind } from './CockpitFlows'

/**
 * CockpitPopupActions — everything the cockpit puts INSIDE a map popup: the
 * status-driven CTA footer (SPEC §2 #21–23), the call CTA's auto-dismissing
 * contact tooltip (UX H.41), and the header overflow menu of config-driven
 * remote commands (SPEC §2 #36). Extracted from `CockpitView` (rule 12), where
 * it was the single largest block.
 *
 * Shipped as a hook rather than a component because `MapView` takes RENDER
 * PROPS (`renderPopupFooter` / `renderPopupOverflow`) — the popup is owned by
 * the map layer, so these are functions handed down, not children.
 */

type CockpitFlowsConfig = NonNullable<CockpitConfig['flows']>
type CockpitPopupCommands = NonNullable<NonNullable<CockpitConfig['popup']>['commands']>

export interface UseCockpitPopupActionsOptions {
  /** The module's flows block — no flows means no CTA footer at all. */
  flows: CockpitFlowsConfig | undefined
  /** Column holding the record's contact number, for the call CTA. */
  contactCol?: string
  commands?: CockpitPopupCommands
  /** Open a flow sheet for a record (the view owns the sheet state). */
  onOpenFlow: (kind: CockpitFlowKind, recordId: string) => void
}

export interface CockpitPopupActions {
  renderPopupFooter: (record: EntityRecord) => ReactNode
  renderPopupOverflow: () => ReactNode
}

export function useCockpitPopupActions({
  flows,
  contactCol,
  commands,
  onOpenFlow,
}: UseCockpitPopupActionsOptions): CockpitPopupActions {
  /* Call CTA's contact tooltip — auto-dismisses (paused on hover, H.41). */
  const [callFor, setCallFor] = useState<string | null>(null)
  const callTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const armCallDismiss = useCallback(() => {
    if (callTimer.current) clearTimeout(callTimer.current)
    callTimer.current = setTimeout(() => setCallFor(null), 5000)
  }, [])
  useEffect(
    () => () => {
      if (callTimer.current) clearTimeout(callTimer.current)
    },
    [],
  )

  const renderPopupFooter = useCallback(
    (record: EntityRecord): ReactNode => {
      if (!flows) return undefined
      const isIssue = flows.issues ? String(record.status ?? '') === flows.issues.status : false
      const contact = contactCol ? record[contactCol] : undefined
      const callButton =
        flows.callLabel && contact != null && contact !== '' ? (
          <div className="relative min-w-0 flex-1">
            <Button
              variant="secondary"
              size="sm"
              // 36px like every other cockpit control — `size="sm"` is 32px,
              // which made the popup CTAs the only sub-36px primary actions
              // on the screen (UX H.40a). Height only: `sm`'s tighter padding
              // is what keeps both labels on one line inside the 360px cap.
              className="h-9 w-full"
              onClick={() => {
                setCallFor((prev) => (prev === record.id ? null : record.id))
                armCallDismiss()
              }}
            >
              <Phone className="size-4" aria-hidden="true" />
              {flows.callLabel}
            </Button>
            {callFor === record.id ? (
              <div
                data-slot="cockpit-call-tooltip"
                role="status"
                onMouseEnter={() => {
                  if (callTimer.current) clearTimeout(callTimer.current)
                }}
                onMouseLeave={armCallDismiss}
                className="absolute bottom-full start-0 z-tooltip mb-2 flex items-center gap-2 rounded-md bg-foreground px-3 py-2 text-body-xs font-medium text-background shadow-elevation"
              >
                <span className="whitespace-nowrap">{String(contact)}</span>
                <button
                  type="button"
                  aria-label="Copy contact"
                  data-slot="cockpit-call-tooltip-copy"
                  // 24px hit target, not the 14px icon box: this control
                  // auto-dismisses, so it must be easy to hit first time
                  // (UX H.41 finding 7). Copy and Dismiss are deliberately the
                  // SAME `size-6` box and both carry a data-slot, so the two
                  // QA harnesses stop disagreeing about which node they read
                  // (round-3 finding 7).
                  className="grid size-6 flex-none place-items-center rounded-xs outline-none hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring"
                  // The write is AWAITED and the success toast is conditional
                  // (round-4 UX finding 1): `void writeText(...)` + an
                  // unconditional `toast.success` told the dispatcher the
                  // number was on their clipboard when the write had rejected,
                  // and leaked an unhandled rejection to the console. On
                  // failure the number goes INTO the error toast so it can
                  // still be read and dialled.
                  onClick={() => {
                    const value = String(contact)
                    void copyText(value).then((ok) => {
                      if (ok) toast.success('Copied')
                      else
                        // ASSERTIVE ANNOUNCE (fix5 #2). The Toaster's live
                        // region is a fixed `aria-live="polite"` (sonner
                        // itself does not vary it per toast type) — an
                        // element carrying `role="alert"` is its own
                        // assertive live region regardless of the ancestor's
                        // politeness, so an error toast wrapping its message
                        // in one gets announced immediately. The phone
                        // number (fix5 #3) sits in a non-breaking span so it
                        // can never wrap mid-number.
                        toast.error(
                          <span role="alert">
                            Could not copy — the number is{' '}
                            <span className="whitespace-nowrap">{value}</span>
                          </span>,
                        )
                    })
                  }}
                >
                  <Copy className="size-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label="Dismiss contact"
                  data-slot="cockpit-call-tooltip-dismiss"
                  className="grid size-6 flex-none place-items-center rounded-xs outline-none hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => setCallFor(null)}
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              </div>
            ) : null}
          </div>
        ) : null

      if (isIssue && flows.replace) {
        return (
          <>
            {callButton}
            <Button
              variant="primary"
              size="sm"
              className="h-9 min-w-0 flex-1"
              onClick={() => onOpenFlow('replace', record.id)}
            >
              {flows.replace.label}
            </Button>
          </>
        )
      }
      if (!flows.report) return callButton ?? undefined
      return (
        <>
          <Button
            variant="secondary"
            size="sm"
            className="h-9 min-w-0 flex-1"
            onClick={() => onOpenFlow('report', record.id)}
          >
            {flows.report.label}
          </Button>
          {callButton}
        </>
      )
    },
    [flows, contactCol, callFor, armCallDismiss, onOpenFlow],
  )

  /* Popup header overflow menu — config-driven remote commands (SPEC §2 #36).
     Every command is observable: it fires a toast whose tone states whether
     the command took effect now or was queued. */
  const renderPopupOverflow = useCallback((): ReactNode => {
    if (!commands?.length) return undefined
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="More commands"
          data-slot="cockpit-popup-commands"
          className="grid size-4 place-items-center rounded-xs outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <MoreVertical className="size-4" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {commands.map((command) => (
            <DropdownMenuItem
              key={command.id}
              onSelect={() => {
                const message = command.message ?? `${command.label} sent`
                if (command.tone === 'warning') toast.warning(message)
                else if (command.tone === 'danger') toast.error(message)
                else toast.success(message)
              }}
            >
              {command.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }, [commands])

  return { renderPopupFooter, renderPopupOverflow }
}
