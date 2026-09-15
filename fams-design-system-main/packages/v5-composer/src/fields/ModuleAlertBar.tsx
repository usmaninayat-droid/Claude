import { useMemo, useState } from 'react'
import { ArrowDown, ChevronRight, ExternalLink, Icon, Search, Siren, X, getIcon } from '@fams/ui-kit/icons'
import {
  Avatar,
  Button,
  Input,
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

const DEFAULT_SUGGESTIONS: Candidate[] = [
  { id: 's1', shortId: 'D-1277', name: 'Omar Farouk', role: 'HD Driver', meta: 'Standby pool' },
  { id: 's2', shortId: 'D-1341', name: 'Anwar Farooq', role: 'HD Driver', meta: 'Cluster · MSW' },
  { id: 's3', shortId: 'D-1408', name: 'Yousuf Iqbal', role: 'HD Driver', meta: 'Cluster · MSW' },
  { id: 's4', shortId: 'D-1502', name: 'Ali Naseem', role: 'HD Driver', meta: 'Reliever queue' },
  { id: 's5', shortId: 'D-1621', name: 'Bilal Khan', role: 'HD Driver', meta: 'Standby pool' },
  { id: 's6', shortId: 'D-1707', name: 'Faisal Ahmed', role: 'HD Driver', meta: 'Reliever queue' },
  { id: 's7', shortId: 'D-1802', name: 'Junaid Malik', role: 'HD Driver', meta: 'Reliever queue' },
  { id: 's8', shortId: 'D-1396', name: 'Salim Haddad', role: 'HD Driver', meta: 'Cluster · MSW', status: 'overtime' },
]

type Candidate = {
  id: string
  name: string
  role?: string
  meta?: string
  shortId?: string
  /** Trailing status pill in the manual-replace list (default `available`). */
  status?: 'available' | 'overtime'
}

/**
 * One conflict card — same as shift-rostering's per-route swap card.
 *
 * Approve triggers `onApprove(suggested)`; the parent then animates the card
 * out via the `resolving` flag (max-height + opacity + translate transition)
 * and removes the record from the list once the animation settles — mirrors
 * the shift-rostering issue-list card-leave animation exactly.
 *
 * Replace Manually fires `onReplaceManually` — the parent opens a SEPARATE
 * side sheet on top of this one (the shift-rostering `.mpanel`) rather than
 * flipping the card body inline.
 */
function ConflictCard({
  outbound,
  suggested,
  headerLine,
  headerTag,
  reasonLabel,
  viewLinkLabel,
  onApprove,
  onReplaceManually,
  resolving,
}: {
  outbound: { name: string; shortId?: string }
  suggested: Candidate
  headerLine: string
  headerTag: string
  reasonLabel: string
  viewLinkLabel?: string
  onApprove: (candidate: Candidate) => void
  onReplaceManually: () => void
  resolving: boolean
}) {
  return (
    <article
      style={
        resolving
          ? { maxHeight: 0, opacity: 0, transform: 'translateX(28px)', marginBottom: '-12px' }
          : { maxHeight: 480 }
      }
      className="flex flex-col overflow-hidden rounded-md border border-border bg-card transition-[max-height,opacity,transform,margin] duration-[270ms] ease-out"
    >
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
        <Button onClick={() => onApprove(suggested)} disabled={resolving}>
          Approve Replacement
        </Button>
      </footer>
    </article>
  )
}

/**
 * ManualReplacePanel — the shift-rostering `.mpanel` side sheet. Layout:
 *   - Header: "Replace Manually" title.
 *   - Outbound record card (route uid + plan · red DRIVER UNAVAILABLE tag,
 *     then the outbound driver row inside with strikethrough + reason pill
 *     and red-dot "Originally Assigned").
 *   - Search input (with a leading search glyph inside a soft circle).
 *   - Two-column table (DRIVER / STATUS) with a radio dot per row. The
 *     first row of the pool carries a blue "Suggested" chip next to the
 *     name; every row carries a status pill (green "Available" or amber
 *     "Overtime" — an authoring hint carried on the candidate itself).
 *   - Footer: ghost "View Plan" on the left, green "Assign Replacement"
 *     primary on the right (disabled until a driver is selected).
 */
function ManualReplacePanel({
  open,
  onOpenChange,
  outboundName,
  outboundShortId,
  headerLine,
  reasonLabel,
  headerTag,
  suggested,
  pool,
  viewLinkLabel,
  onDispatch,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  outboundName: string
  outboundShortId?: string
  headerLine: string
  reasonLabel: string
  headerTag: string
  suggested: Candidate
  pool: Candidate[]
  viewLinkLabel?: string
  onDispatch: (candidate: Candidate) => void
}) {
  const [query, setQuery] = useState('')
  const [pickedId, setPickedId] = useState<string | null>(null)
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return pool
    return pool.filter((c) =>
      [c.name, c.shortId, c.role, c.meta].some((s) => (s ?? '').toLowerCase().includes(needle)),
    )
  }, [pool, query])
  const picked = pool.find((c) => c.id === pickedId) ?? null

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) {
          setQuery('')
          setPickedId(null)
        }
      }}
    >
      <SheetContent
        side="right"
        hideClose
        className="flex w-full flex-col gap-0 overflow-visible p-0 sm:max-w-[44rem]"
      >
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          aria-label="Close"
          className="absolute -start-14 top-1/2 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-card text-muted-foreground shadow-elevation outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-5" />
        </button>
        <div className="border-b border-border p-6">
          <SheetTitle className="text-h3 font-semibold text-foreground">Replace Manually</SheetTitle>
          <SheetDescription className="sr-only">
            Choose a reliever for {outboundName}
          </SheetDescription>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {/* Outbound record card — same visual chrome as a conflict card in
              the resolve sheet: header line + red-outlined tag, then the
              outbound driver row inside. */}
          <div className="mb-4 rounded-md border border-border bg-card">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <p className="text-body-sm font-semibold text-foreground">{headerLine}</p>
              <span className="inline-flex items-center rounded-sm border border-error-300 bg-card px-2 py-1 text-caption font-semibold uppercase tracking-wide text-error-700">
                {headerTag}
              </span>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 opacity-70">
              <Avatar name={outboundName} size="sm" />
              <div className="flex flex-1 items-center gap-2">
                {outboundShortId ? (
                  <>
                    <span className="text-body-sm font-medium text-muted-foreground line-through">
                      {outboundShortId}
                    </span>
                    <span className="text-muted-foreground">·</span>
                  </>
                ) : null}
                <span className="text-body-sm text-muted-foreground line-through">
                  {outboundName}
                </span>
                <span className="inline-flex items-center rounded-sm bg-warning-scale-50 px-2 py-0.5 text-caption font-semibold text-warning-text">
                  {reasonLabel}
                </span>
              </div>
              <div className="flex items-center gap-2 text-caption text-muted-foreground">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-error-500" />
                Originally Assigned
              </div>
            </div>
          </div>

          {/* Search — matches shift-rostering's rounded pill search with an
              inline glyph. */}
          <div className="relative mb-4">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute start-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="search"
              placeholder="Search driver"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-11 rounded-sm ps-10"
              aria-label="Search driver"
            />
          </div>

          {/* Driver / Status table — column headers + a radio-selectable row
              per candidate. The first pool entry gets the blue "Suggested"
              chip; each candidate carries an authoring `status` field
              (default "Available") that maps to the trailing pill's tone. */}
          <div className="overflow-hidden rounded-md border border-border">
            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4 border-b border-border bg-muted/30 px-4 py-2 text-caption font-semibold uppercase tracking-wide text-muted-foreground">
              <span className="w-6" aria-hidden="true" />
              <span>Driver</span>
              <span>Status</span>
            </div>
            {filtered.length === 0 ? (
              <p className="p-4 text-body-sm text-muted-foreground">No matching drivers.</p>
            ) : (
              <ul className="flex flex-col">
                {filtered.map((c, i) => {
                  const isSuggested = c.id === suggested.id
                  const status = (c as Candidate & { status?: 'available' | 'overtime' }).status ?? 'available'
                  const isPicked = pickedId === c.id
                  return (
                    <li key={c.id} className={i > 0 ? 'border-t border-border' : ''}>
                      <button
                        type="button"
                        onClick={() => setPickedId(c.id)}
                        aria-pressed={isPicked}
                        className={`grid w-full grid-cols-[auto_1fr_auto] items-center gap-4 px-4 py-3 text-start transition-colors ${isPicked ? 'bg-primary/5' : 'hover:bg-muted/40'}`}
                      >
                        <span
                          aria-hidden="true"
                          className={`grid size-5 place-items-center rounded-full border-2 ${isPicked ? 'border-primary' : 'border-border'}`}
                        >
                          {isPicked ? <span className="size-2.5 rounded-full bg-primary" /> : null}
                        </span>
                        <div className="flex items-center gap-3">
                          <Avatar name={c.name} size="sm" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-body-sm font-semibold text-foreground">
                                {c.name}
                              </span>
                              {isSuggested ? (
                                <span className="inline-flex items-center rounded-sm bg-info-scale-50 px-2 py-0.5 text-caption font-semibold text-info-scale-700">
                                  Suggested
                                </span>
                              ) : null}
                            </div>
                            {c.shortId ? (
                              <p className="mt-0.5 inline-flex items-center rounded-xs bg-muted px-1.5 py-0.5 text-caption text-muted-foreground">
                                # {c.shortId}
                              </p>
                            ) : null}
                          </div>
                        </div>
                        <span
                          className={
                            status === 'overtime'
                              ? 'inline-flex items-center rounded-sm bg-warning-scale-50 px-2 py-1 text-caption font-semibold text-warning-text'
                              : 'inline-flex items-center rounded-sm bg-success-scale-100 px-2 py-1 text-caption font-semibold text-success-text'
                          }
                        >
                          {status === 'overtime' ? 'Overtime' : 'Available'}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 border-t border-border p-4">
          {viewLinkLabel ? (
            <Button variant="tertiary" size="md">
              {viewLinkLabel}
              <ExternalLink className="ms-1 size-4" aria-hidden="true" />
            </Button>
          ) : null}
          <div className="flex-1" />
          <Button onClick={() => picked && onDispatch(picked)} disabled={!picked}>
            Assign Replacement
          </Button>
        </div>
      </SheetContent>
    </Sheet>
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
  // In-flight resolve state — a card id in `resolvingIds` is running its
  // slide-out animation; a card id in `resolvedIds` has finished and is
  // filtered out of the render. Both reset when the sheet closes so a
  // reopen starts fresh (a real backend would remove the record from the
  // list itself; the demo keeps it local so the animation is repeatable).
  const [resolvingIds, setResolvingIds] = useState<Set<string>>(new Set())
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set())
  // The manual-replace panel opens as a separate side sheet on top of the
  // main resolve sheet; `manualForId` names which record it's picking a
  // reliever for.
  const [manualForId, setManualForId] = useState<string | null>(null)
  const allMatched = useMemo(
    () => records.filter((r) => matches(r, config.filter)),
    [records, config.filter],
  )
  const matched = useMemo(
    () => allMatched.filter((r) => !resolvedIds.has(String(r.id))),
    [allMatched, resolvedIds],
  )
  const count = allMatched.length
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

  const CARD_LEAVE_MS = 270

  const beginResolve = (record: EntityRecord, chosen: Candidate) => {
    const id = String(record.id)
    if (resolvingIds.has(id) || resolvedIds.has(id)) return
    // Kick off the slide-out animation; commit + toast fire after the
    // transition settles (matches shift-rostering's 270ms leave).
    setResolvingIds((prev) => {
      const next = new Set(prev)
      next.add(id)
      return next
    })
    const outboundName = displayName
      ? displayName(String(record[nameField] ?? ''))
      : String(record[nameField] ?? '')
    window.setTimeout(() => {
      setResolvingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      setResolvedIds((prev) => {
        const next = new Set(prev)
        next.add(id)
        return next
      })
      toast(config.approveToastTitle ?? 'Replacement approved', {
        description: config.approveToastDescription
          ? fill(config.approveToastDescription, {
              suggested: chosen.name,
              outbound: outboundName,
            })
          : `${chosen.name} has been dispatched to replace ${outboundName}.`,
      })
    }, CARD_LEAVE_MS)
  }
  const approveAll = () => {
    // Fire slide-out for every currently-pending card (same 270ms leave);
    // once they've all settled, close the sheet and show one summary toast.
    // This is the composer-side equivalent of shift-rostering's `approveAll`.
    const remaining = matched.filter((r) => !resolvingIds.has(String(r.id)))
    if (remaining.length === 0) return
    setResolvingIds((prev) => {
      const next = new Set(prev)
      for (const r of remaining) next.add(String(r.id))
      return next
    })
    window.setTimeout(() => {
      setResolvingIds(new Set())
      setResolvedIds((prev) => {
        const next = new Set(prev)
        for (const r of remaining) next.add(String(r.id))
        return next
      })
      setOpen(false)
      toast(config.approveToastTitle ?? 'All replacements approved', {
        description: `${remaining.length} suggested reliever${remaining.length === 1 ? '' : 's'} dispatched.`,
      })
    }, CARD_LEAVE_MS)
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

      <Sheet
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) {
            setResolvingIds(new Set())
            setResolvedIds(new Set())
            setManualForId(null)
          }
        }}
      >
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
                      onClick={approveAll}
                      disabled={matched.length === 0 || resolvingIds.size > 0}
                      className="rounded-xs text-body-sm font-semibold text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default disabled:text-muted-foreground disabled:no-underline"
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
                    // Present each conflict as a route (matches shift-rostering's
                    // `R#9876541 · Dubai Mall Bin Collection Plan`) — strip the
                    // record-uid prefix (`ATT-2012` → `2012`) and format as
                    // `R#<digits>` so the sheet reads as "resolve THIS route"
                    // rather than "resolve THIS attendance record".
                    const routeIdPrefix = outboundConfig.routeIdPrefix ?? 'R#'
                    const routeIdDigits = uid.replace(/^[^0-9]+/, '') || uid
                    const routeId = routeIdDigits ? `${routeIdPrefix}${routeIdDigits}` : uid
                    const headerLine = [routeId, context].filter(Boolean).join(' · ')
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
                          onApprove={(chosen) => beginResolve(r, chosen)}
                          onReplaceManually={() => setManualForId(String(r.id))}
                          resolving={resolvingIds.has(String(r.id))}
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

      {(() => {
        const record = matched.find((r) => String(r.id) === manualForId)
        if (!record) return null
        const outboundName = displayName
          ? displayName(String(record[nameField] ?? ''))
          : String(record[nameField] ?? '')
        const outboundShortId = idField ? String(record[idField] ?? '') || undefined : undefined
        const uid = String(record[uidField] ?? record.id ?? '')
        const context = String(record[contextField] ?? '')
        const routeIdPrefix = outboundConfig.routeIdPrefix ?? 'R#'
        const routeIdDigits = uid.replace(/^[^0-9]+/, '') || uid
        const routeId = routeIdDigits ? `${routeIdPrefix}${routeIdDigits}` : uid
        const headerLine = [routeId, context].filter(Boolean).join(' · ')
        const idx = matched.indexOf(record)
        const cardSuggested = suggestions[idx % suggestions.length]
        // Manual pool leads with the record's own suggestion (marked with the
        // blue "Suggested" chip), then the rest of the reliever pool. The
        // whole set is offered for hand-picking; the trailing status pill on
        // each row (Available / Overtime) is authored on the candidate.
        const manualPool = [
          cardSuggested,
          ...suggestions.filter((c) => c.id !== cardSuggested.id),
        ]
        return (
          <ManualReplacePanel
            open={manualForId === String(record.id)}
            onOpenChange={(next) => setManualForId(next ? String(record.id) : null)}
            outboundName={outboundName}
            outboundShortId={outboundShortId}
            headerLine={headerLine}
            reasonLabel={reasonLabel}
            headerTag={headerTag}
            suggested={cardSuggested}
            pool={manualPool}
            viewLinkLabel={config.viewLinkLabel}
            onDispatch={(candidate) => {
              setManualForId(null)
              beginResolve(record, candidate)
            }}
          />
        )
      })()}
    </>
  )
}

ModuleAlertBar.displayName = 'ModuleAlertBar'
