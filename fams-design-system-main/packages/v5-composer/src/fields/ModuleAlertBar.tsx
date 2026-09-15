import { useMemo, useState } from 'react'
import { ArrowDown, ChevronRight, ExternalLink, Icon, Siren, X, getIcon } from '@fams/ui-kit/icons'
import {
  Avatar,
  Button,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  toast,
} from '@fams/ui-kit'
import type { EntityRecord, UiConfig } from '../types'

/**
 * ModuleAlertBar — the composer-side implementation of `uiConfig.alertBar`:
 * a soft-tinted strip pinned above a module's filters row (attendance's
 * "N employees are absent — dispatch a reliever now" bar, mirroring the
 * shift-rostering `.alert` pattern), plus the side sheet it opens on click.
 *
 * State-agnostic (Rule 8): the bar counts the records the caller hands in
 * and re-renders when they change; it never fetches. The sheet is
 * self-contained — the "resolve" action inside a per-record row is where
 * dispatching happens, and today we render the same DispatchAction menu
 * pattern via a "View record" affordance (the demo's stand-in for a real
 * side-by-side resolver). Everything else — copy, tone, filter — comes
 * from `uiConfig.alertBar`; nothing here is module-specific.
 */

type AlertBarConfig = NonNullable<UiConfig['alertBar']>

// Matches the shift-rostering `.alert` band exactly: soft-tinted bar with a
// WHITE-fill icon circle (the icon inside is tone-colored, not the circle
// itself), a dark-foreground message (Gray-900, not the error red — the tint
// is the bar itself, the copy stays legible in the platform's normal reading
// voice), and a muted-gray "Click to resolve" trailing label. Only the bar
// background/border + icon-in-circle color vary by `tone`; the message and
// CTA text tokens are shared across every tone (`.msg` = `#1d2939`,
// `.resolve span` = `#667085` in the shift-rostering CSS).
const TONE_CLASSES: Record<
  NonNullable<AlertBarConfig['tone']>,
  { bar: string; iconColor: string }
> = {
  danger: { bar: 'border-error-100 bg-error-50', iconColor: 'text-error-600' },
  warning: { bar: 'border-warning-scale-100 bg-warning-scale-50', iconColor: 'text-warning' },
  info: { bar: 'border-info-scale-100 bg-info-scale-50', iconColor: 'text-info' },
  success: { bar: 'border-success-scale-100 bg-success-scale-50', iconColor: 'text-success' },
}

function matches(record: EntityRecord, filter?: AlertBarConfig['filter']): boolean {
  if (!filter) return true
  const raw = record[filter.col]
  if (raw == null || raw === '') return false
  const text = String(raw)
  if (filter.equals !== undefined) return text === filter.equals
  if (filter.in && filter.in.length > 0) return filter.in.includes(text)
  return true
}

function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => (vars[key] != null ? String(vars[key]) : ''))
}

const DEFAULT_SUGGESTIONS: NonNullable<AlertBarConfig['suggestions']> = [
  { id: 's1', shortId: 'D-1277', name: 'Omar Farouk', role: 'HD Driver', meta: 'Standby pool' },
  { id: 's2', shortId: 'D-1341', name: 'Anwar Farooq', role: 'HD Driver', meta: 'Cluster · MSW' },
  { id: 's3', shortId: 'D-1408', name: 'Yousuf Iqbal', role: 'HD Driver', meta: 'Cluster · MSW' },
  { id: 's4', shortId: 'D-1502', name: 'Ali Naseem', role: 'HD Driver', meta: 'Reliever queue' },
  { id: 's5', shortId: 'D-1621', name: 'Bilal Khan', role: 'HD Driver', meta: 'Standby pool' },
]

/** One conflict card — mirrors shift-rostering's per-route swap card exactly. */
function ConflictCard({
  outbound,
  suggested,
  headerLine,
  headerTag,
  reasonLabel,
  viewLinkLabel,
  onApprove,
  onReplaceManually,
}: {
  outbound: { name: string; shortId?: string }
  suggested: { name: string; shortId?: string; role?: string; meta?: string }
  headerLine: string
  headerTag: string
  reasonLabel: string
  viewLinkLabel?: string
  onApprove: () => void
  onReplaceManually: () => void
}) {
  return (
    <article className="flex flex-col rounded-md border border-border bg-card">
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <p className="text-body-sm font-semibold text-foreground">{headerLine}</p>
        <span className="inline-flex items-center rounded-sm border border-error-300 bg-card px-2 py-1 text-caption font-semibold uppercase tracking-wide text-error-700">
          {headerTag}
        </span>
      </header>
      <div className="flex flex-col gap-2 p-4">
        <div className="flex items-center gap-3 opacity-70">
          <Avatar name={outbound.name} size="sm" />
          <div className="flex flex-1 items-center gap-2">
            {outbound.shortId ? (
              <>
                <span className="text-body-sm font-medium text-muted-foreground line-through">
                  {outbound.shortId}
                </span>
                <span className="text-muted-foreground">·</span>
              </>
            ) : null}
            <span className="text-body-sm text-muted-foreground line-through">{outbound.name}</span>
            <span className="inline-flex items-center rounded-sm bg-warning-scale-50 px-2 py-0.5 text-caption font-semibold text-warning-text">
              {reasonLabel}
            </span>
          </div>
          <div className="flex items-center gap-2 text-caption text-muted-foreground">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-error-500" />
            Originally Assigned
          </div>
        </div>
        <div className="flex justify-center">
          <span className="grid size-6 place-items-center rounded-full border border-border bg-card text-muted-foreground">
            <ArrowDown className="size-3.5" aria-hidden="true" />
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Avatar name={suggested.name} size="sm" />
          <div className="flex flex-1 items-center gap-2">
            {suggested.shortId ? (
              <>
                <span className="text-body-sm font-medium text-primary">{suggested.shortId}</span>
                <span className="text-muted-foreground">·</span>
              </>
            ) : null}
            <span className="text-body-sm text-foreground">{suggested.name}</span>
            <span className="inline-flex items-center rounded-sm bg-success-scale-100 px-2 py-0.5 text-caption font-semibold text-success-text">
              Available for Shift
            </span>
          </div>
          <div className="flex items-center gap-2 text-caption text-muted-foreground">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-primary" />
            Suggested Replacement
          </div>
        </div>
      </div>
      <footer className="flex items-center gap-3 border-t border-border px-4 py-3">
        {viewLinkLabel ? (
          <Button variant="tertiary" size="sm">
            {viewLinkLabel}
            <ExternalLink className="ms-1 size-4" aria-hidden="true" />
          </Button>
        ) : null}
        <div className="flex-1" />
        <button
          type="button"
          onClick={onReplaceManually}
          className="rounded-xs px-3 py-2 text-body-sm font-semibold text-foreground outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
        >
          Replace Manually
        </button>
        <Button onClick={onApprove}>Approve Replacement</Button>
      </footer>
    </article>
  )
}

export function ModuleAlertBar({
  config,
  records,
  displayName,
}: {
  config: AlertBarConfig
  records: EntityRecord[]
  /** Optional id→name resolver, so a row referencing an employee id shows the person's name. */
  displayName?: (id: string) => string
}) {
  const [open, setOpen] = useState(false)
  const matched = useMemo(
    () => records.filter((r) => matches(r, config.filter)),
    [records, config.filter],
  )
  const count = matched.length
  if (count === 0) return null

  const tone = config.tone ?? 'danger'
  const classes = TONE_CLASSES[tone]
  const iconName = config.icon ?? 'alarm'
  const IconGlyph = getIcon(iconName)
  const message = fill(config.message, { count })
  const ctaLabel = config.ctaLabel ?? 'View'
  const sheetTitle = config.sheetTitle ?? 'Conflicts'
  const sectionLabel = config.sectionLabel ?? 'Records Requiring Action'
  const suggestions = config.suggestions ?? DEFAULT_SUGGESTIONS
  const outboundConfig = config.outbound ?? {}
  const reasonLabel = outboundConfig.reasonLabel ?? 'Absent'
  const headerTag = outboundConfig.headerTag ?? 'Employee Absent'
  const nameField = outboundConfig.nameField ?? 'title'
  const idField = outboundConfig.idField
  const uidField = outboundConfig.uidField ?? 'uniqueidentifier'
  const contextField = outboundConfig.contextField ?? 'systemcol2'

  const dispatchOne = (record: EntityRecord, suggested: { name: string }) => {
    const outboundName = displayName
      ? displayName(String(record[nameField] ?? ''))
      : String(record[nameField] ?? '')
    toast(config.approveToastTitle ?? 'Replacement approved', {
      description:
        config.approveToastDescription
          ? fill(config.approveToastDescription, {
              suggested: suggested.name,
              outbound: outboundName,
            })
          : `${suggested.name} has been dispatched to replace ${outboundName}.`,
    })
  }
  const dispatchAll = () => {
    setOpen(false)
    toast(config.approveToastTitle ?? 'All replacements approved', {
      description: `${matched.length} suggested reliever${matched.length === 1 ? '' : 's'} dispatched.`,
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        // Padding is intentionally asymmetric (`ps-3 pe-2 py-2`) — matches
        // the shift-rostering `.alert`'s `8px 8px 8px 12px`.
        className={`flex w-full items-center justify-between gap-3 rounded-sm border ${classes.bar} py-2 ps-3 pe-2 text-start outline-none transition-colors hover:brightness-95 focus-visible:ring-2 focus-visible:ring-ring`}
      >
        <div className="flex flex-1 items-center gap-2.5">
          <span
            aria-hidden="true"
            className={`grid size-6 shrink-0 place-items-center rounded-full bg-card ${classes.iconColor}`}
          >
            {IconGlyph ? (
              <Icon name={iconName} className="size-3.5" />
            ) : (
              <Siren className="size-3.5" />
            )}
          </span>
          <span className="text-body-sm font-semibold text-foreground">{message}</span>
        </div>
        <div className="flex items-center gap-1 rounded-xs px-2 py-1">
          <span className="text-caption font-semibold text-muted-foreground">{ctaLabel}</span>
          <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
        </div>
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          hideClose
          className="flex w-full flex-col gap-0 overflow-visible p-0 sm:max-w-[44rem]"
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="absolute -start-14 top-1/2 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-card text-muted-foreground shadow-elevation outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-5" />
          </button>
          <div className="flex flex-col gap-1 border-b border-border p-6">
            <SheetTitle className="text-h3 font-semibold text-foreground">{sheetTitle}</SheetTitle>
            {config.sheetDescription ? (
              <SheetDescription className="text-body-sm text-muted-foreground">
                {fill(config.sheetDescription, { count })}
              </SheetDescription>
            ) : null}
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            {matched.length === 0 ? (
              <p className="text-body-sm text-muted-foreground">
                {config.emptyLabel ?? 'No conflicts right now.'}
              </p>
            ) : (
              <>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-body-sm text-muted-foreground">{sectionLabel}</p>
                  {config.approveAllLabel ? (
                    <button
                      type="button"
                      onClick={dispatchAll}
                      className="rounded-xs text-body-sm font-semibold text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {config.approveAllLabel}
                    </button>
                  ) : null}
                </div>
                <ul className="flex flex-col gap-3">
                  {matched.map((r, i) => {
                    const outboundName = displayName
                      ? displayName(String(r[nameField] ?? ''))
                      : String(r[nameField] ?? '')
                    const outboundShortId = idField ? String(r[idField] ?? '') || undefined : undefined
                    const uid = String(r[uidField] ?? r.id ?? '')
                    const context = String(r[contextField] ?? '')
                    const headerLine = [uid, context].filter(Boolean).join(' · ')
                    const suggested = suggestions[i % suggestions.length]
                    return (
                      <li key={String(r.id)}>
                        <ConflictCard
                          outbound={{ name: outboundName, shortId: outboundShortId }}
                          suggested={suggested}
                          headerLine={headerLine}
                          headerTag={headerTag}
                          reasonLabel={reasonLabel}
                          viewLinkLabel={config.viewLinkLabel}
                          onApprove={() => dispatchOne(r, suggested)}
                          onReplaceManually={() => dispatchOne(r, suggested)}
                        />
                      </li>
                    )
                  })}
                </ul>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

ModuleAlertBar.displayName = 'ModuleAlertBar'
