import { useMemo, useState } from 'react'
import { ChevronRight, Icon, Siren, X, getIcon } from '@fams/ui-kit/icons'
import {
  Avatar,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  Button,
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

function fill(template: string, count: number): string {
  return template.replace(/\{count\}/g, String(count))
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
  const message = fill(config.message, count)
  const ctaLabel = config.ctaLabel ?? 'View'
  const sheetTitle = config.sheetTitle ?? 'Conflicts'

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
                {fill(config.sheetDescription, count)}
              </SheetDescription>
            ) : null}
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            {matched.length === 0 ? (
              <p className="text-body-sm text-muted-foreground">
                {config.emptyLabel ?? 'No conflicts right now.'}
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {matched.map((r) => {
                  const name = displayName
                    ? displayName(String(r.title ?? r.id))
                    : String(r.title ?? r.id)
                  const uid = String(r.uniqueidentifier ?? r.id ?? '')
                  const context = String(r.systemcol2 ?? r.assignedRoute ?? '')
                  return (
                    <li
                      key={String(r.id)}
                      className="flex items-center gap-3 rounded-sm border border-border bg-card p-3"
                    >
                      <Avatar name={name} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-body-sm font-semibold text-foreground">
                          {name}
                        </p>
                        <p className="truncate text-caption text-muted-foreground">
                          {[uid, context].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full bg-error-100 px-2.5 py-0.5 text-caption font-semibold uppercase tracking-wide text-error-700`}
                      >
                        Needs dispatch
                      </span>
                      <Button size="sm" variant="tertiary">
                        Resolve
                      </Button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

ModuleAlertBar.displayName = 'ModuleAlertBar'
