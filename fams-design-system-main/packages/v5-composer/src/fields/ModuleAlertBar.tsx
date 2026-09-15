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

// The DS's error/warning/success/info scales are the class-name prefixes;
// the `tone` prop name `danger` maps to the `error-*` classes by convention
// (same convention `Badge`/`StatusPill`/`KpiTile` use — the semantic tone
// name is `danger`, the CSS ramp name is `error`).
const TONE_CLASSES: Record<
  NonNullable<AlertBarConfig['tone']>,
  { bar: string; text: string; circle: string; cta: string }
> = {
  danger: {
    bar: 'border-error-200 bg-error-50',
    text: 'text-error-700',
    circle: 'bg-error-100 text-error-600',
    cta: 'text-error-700',
  },
  warning: {
    bar: 'border-warning-scale-200 bg-warning-scale-50',
    text: 'text-warning-text',
    circle: 'bg-warning-scale-100 text-warning',
    cta: 'text-warning-text',
  },
  info: {
    bar: 'border-info-scale-200 bg-info-scale-50',
    text: 'text-info-scale-700',
    circle: 'bg-info-scale-100 text-info',
    cta: 'text-info-scale-700',
  },
  success: {
    bar: 'border-success-scale-200 bg-success-scale-50',
    text: 'text-success-text',
    circle: 'bg-success-scale-100 text-success',
    cta: 'text-success-text',
  },
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
        className={`flex w-full items-center justify-between gap-3 rounded-sm border ${classes.bar} px-3 py-2 text-start outline-none transition-colors hover:brightness-95 focus-visible:ring-2 focus-visible:ring-ring`}
      >
        <div className="flex flex-1 items-center gap-3">
          <span
            aria-hidden="true"
            className={`grid size-8 shrink-0 place-items-center rounded-full ${classes.circle}`}
          >
            {IconGlyph ? <Icon name={iconName} className="size-4" /> : <Siren className="size-4" />}
          </span>
          <span className={`text-body-sm font-medium ${classes.text}`}>{message}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-body-sm font-semibold ${classes.cta}`}>{ctaLabel}</span>
          <ChevronRight className={`size-4 ${classes.cta}`} aria-hidden="true" />
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
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-caption font-semibold uppercase tracking-wide ${classes.circle} ${classes.cta}`}
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
