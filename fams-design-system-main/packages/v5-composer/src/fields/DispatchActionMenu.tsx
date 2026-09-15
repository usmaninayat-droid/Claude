import { useMemo, useState } from 'react'
import { ArrowDown, ExternalLink, MoreVertical, X } from '@fams/ui-kit/icons'
import {
  Avatar,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  toast,
} from '@fams/ui-kit'
import type { EntityRecord } from '../types'
import { useDisplayName } from './display-names'

/**
 * DispatchActionMenu — the composer's row-actions kebab, home to the ONE
 * action `ReadDispatchAction` already owns ("Dispatch Reliever" on Absent
 * attendance rows). Renders on EVERY row so the ACTION column has a
 * consistent affordance; the dispatch item inside the menu is gated by
 * `props.gateCol === props.gateValue` (Absent), matching the previous
 * renderer's behaviour.
 *
 * Selecting the item opens a side sheet built after the shift-rostering
 * "Reassign Route" panel — a swap card that pairs the OUT (absent) row with
 * a suggested reliever row, plus a footer whose primary "Dispatch Reliever"
 * approves the suggestion and whose "Replace Manually" text button flips the
 * body into a searchable candidate list. Candidates default to a small
 * built-in demo set so the flow is always demonstrable; a blueprint can
 * override via `component.props.suggestions[]` / `manual[]`.
 *
 * State-agnostic (Rule 8): the sheet owns UI state (mode/query/selected)
 * but never the dispatch write — that surfaces as a confirmation toast,
 * the demo stand-in for the real store write + notify.
 */

export interface DispatchActionMenuProps {
  label?: string
  gateCol?: string
  gateValue?: string
  sheetTitle?: string
  /** Description under the sheet title; `{name}` is replaced with the resolved outbound name, `{reason}` with `outboundReason`. */
  sheetDescription?: string
  /** Column key for the outbound record's name (default `employee`); read via `useDisplayName` for id→name resolution. */
  outboundNameField?: string
  /** Column key for the outbound person's short id (default `employeeId`); shown as e.g. `D-1221` in the swap card. */
  outboundIdField?: string
  /** Column key for the context line under the record id (default `assignedRoute`). */
  outboundContextField?: string
  /** Column key for the record's own uid (default `uniqueidentifier`). */
  recordUidField?: string
  /** Reason label shown on the outbound row's pill (default "Absent"). */
  outboundReason?: string
  /** Chip in the top-right of the swap card header (default "Employee Absent"). */
  headerTag?: string
  suggestedTitle?: string
  manualTitle?: string
  searchPlaceholder?: string
  /** Ghost link at the footer start; hidden when omitted. */
  viewPlanLabel?: string
  toastTitle?: string
  toastDescription?: string
  suggestions?: DispatchCandidate[]
  manual?: DispatchCandidate[]
}

export interface DispatchCandidate {
  id: string
  name: string
  role?: string
  meta?: string
  /** Short id shown as a `D-####`-style chip in the swap card row. */
  shortId?: string
}

const DEFAULT_SUGGESTIONS: DispatchCandidate[] = [
  { id: 's1', shortId: 'D-1277', name: 'Omar Farouk', role: 'HD Driver', meta: 'Standby pool' },
  { id: 's2', shortId: 'D-1341', name: 'Anwar Farooq', role: 'HD Driver', meta: 'Cluster · MSW' },
  { id: 's3', shortId: 'D-1408', name: 'Yousuf Iqbal', role: 'HD Driver', meta: 'Cluster · MSW' },
]

const DEFAULT_MANUAL: DispatchCandidate[] = [
  { id: 'm1', shortId: 'D-1502', name: 'Ali Naseem', role: 'HD Driver', meta: 'Standby pool' },
  { id: 'm2', shortId: 'D-1517', name: 'Sami Rashid', role: 'HD Driver', meta: 'Standby pool' },
  { id: 'm3', shortId: 'D-1621', name: 'Bilal Khan', role: 'HD Driver', meta: 'Standby pool' },
  { id: 'm4', shortId: 'D-1707', name: 'Faisal Ahmed', role: 'HD Driver', meta: 'Reliever queue' },
  { id: 'm5', shortId: 'D-1802', name: 'Junaid Malik', role: 'HD Driver', meta: 'Reliever queue' },
  { id: 'm6', shortId: 'D-1904', name: 'Hamza Nazir', role: 'HD Driver', meta: 'Reliever queue' },
]

function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '')
}

/** One row in the swap card — avatar + short-id + name + tone pill, right side "Originally Assigned"/"Suggested Replacement". */
function SwapRow({
  candidate,
  pillLabel,
  pillTone,
  side,
  dimmed,
}: {
  candidate: { name: string; shortId?: string; role?: string }
  pillLabel: string
  pillTone: 'warning' | 'success'
  side: 'origin' | 'replacement'
  dimmed?: boolean
}) {
  const pillClasses =
    pillTone === 'warning'
      ? 'bg-warning-scale-50 text-warning-text'
      : 'bg-success-scale-100 text-success-text'
  return (
    <div className={dimmed ? 'flex items-center gap-3 opacity-70' : 'flex items-center gap-3'}>
      <Avatar name={candidate.name} size="sm" />
      <div className="flex flex-1 items-center gap-2">
        {candidate.shortId ? (
          <span className={dimmed ? 'text-body-sm font-medium text-muted-foreground line-through' : 'text-body-sm font-medium text-foreground'}>
            {candidate.shortId}
          </span>
        ) : null}
        {candidate.shortId ? <span className="text-muted-foreground">·</span> : null}
        <span className={dimmed ? 'text-body-sm text-muted-foreground line-through' : 'text-body-sm text-foreground'}>
          {candidate.name}
        </span>
        <span className={`inline-flex items-center rounded-sm px-2 py-0.5 text-caption font-semibold ${pillClasses}`}>
          {pillLabel}
        </span>
      </div>
      <div className="flex items-center gap-2 text-caption text-muted-foreground">
        <span
          aria-hidden="true"
          className={`size-1.5 rounded-full ${side === 'origin' ? 'bg-danger' : 'bg-primary'}`}
        />
        {side === 'origin' ? 'Originally Assigned' : 'Suggested Replacement'}
      </div>
    </div>
  )
}

/** One row in the Replace-Manually list — a selectable card. */
function ManualRow({
  candidate,
  selected,
  onSelect,
}: {
  candidate: DispatchCandidate
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={
        selected
          ? 'flex w-full items-center gap-3 rounded-sm border border-primary bg-primary/5 p-3 text-start'
          : 'flex w-full items-center gap-3 rounded-sm border border-border bg-card p-3 text-start hover:bg-muted/50'
      }
    >
      <Avatar name={candidate.name} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-body-sm font-semibold text-foreground">
          {candidate.shortId ? `${candidate.shortId} · ` : ''}
          {candidate.name}
        </p>
        <p className="truncate text-caption text-muted-foreground">
          {[candidate.role, candidate.meta].filter(Boolean).join(' · ')}
        </p>
      </div>
      <span
        aria-hidden="true"
        className={
          selected
            ? 'grid size-4 place-items-center rounded-full border-2 border-primary'
            : 'grid size-4 place-items-center rounded-full border-2 border-border'
        }
      >
        {selected ? <span className="size-2 rounded-full bg-primary" /> : null}
      </span>
    </button>
  )
}

export function DispatchActionMenu({
  props,
  record,
}: {
  props: DispatchActionMenuProps
  record?: EntityRecord
}) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'suggested' | 'manual'>('suggested')
  const [query, setQuery] = useState('')
  const [selectedManualId, setSelectedManualId] = useState<string | null>(null)
  const displayName = useDisplayName()

  const gated = props.gateCol ? record?.[props.gateCol] === props.gateValue : true
  // Hide the kebab entirely on rows where the gated action is not applicable
  // (attendance's Present/Late rows). An empty cell reads as "nothing to do
  // here" more clearly than a kebab that only ever opens a disabled item.
  const suggestions = props.suggestions ?? DEFAULT_SUGGESTIONS
  const manual = props.manual ?? DEFAULT_MANUAL
  const primarySuggestion = suggestions[0]

  const outboundName = useMemo(() => {
    const raw = record?.[props.outboundNameField ?? 'employee']
    if (typeof raw !== 'string' || !raw) return 'Employee'
    // `raw` may be an id (SingleReference) — `useDisplayName` gracefully falls
    // back to the raw text when there's no directory entry.
    return displayName(raw) ?? raw
  }, [record, props.outboundNameField, displayName])
  const outboundShortId = String(record?.[props.outboundIdField ?? 'employeeId'] ?? '') || undefined
  const outboundContext = String(record?.[props.outboundContextField ?? 'assignedRoute'] ?? '')
  const recordUid = String(
    record?.[props.recordUidField ?? 'uniqueidentifier'] ?? record?.id ?? '',
  )
  const outboundReason = props.outboundReason ?? 'Absent'
  const headerTag = props.headerTag ?? 'Employee Absent'
  const sheetTitle = props.sheetTitle ?? props.label ?? 'Dispatch Reliever'
  const sheetDescription = fill(
    props.sheetDescription ?? '{name} is {reason} — dispatch a reliever.',
    { name: outboundName, reason: outboundReason.toLowerCase() },
  )

  const filteredManual = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return manual
    return manual.filter((c) =>
      [c.name, c.role, c.meta, c.shortId].some((s) => (s ?? '').toLowerCase().includes(needle)),
    )
  }, [manual, query])

  const doDispatch = (candidate: DispatchCandidate | undefined) => {
    if (!candidate) return
    setOpen(false)
    // Reset the sheet to its default view for the next open.
    setMode('suggested')
    setSelectedManualId(null)
    setQuery('')
    toast(props.toastTitle ?? sheetTitle, {
      description:
        props.toastDescription ??
        `${candidate.name} has been dispatched to replace ${outboundName}.`,
    })
  }

  const selectedManualCandidate = manual.find((c) => c.id === selectedManualId)

  if (!gated) return null

  return (
    <span
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
    >
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Row actions"
          className="grid size-8 place-items-center rounded-xs text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-muted data-[state=open]:text-foreground"
        >
          <MoreVertical className="size-4" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault()
              setOpen(true)
            }}
          >
            {props.label ?? 'Dispatch Reliever'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Sheet
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) {
            setMode('suggested')
            setSelectedManualId(null)
            setQuery('')
          }
        }}
      >
        <SheetContent
          side="right"
          hideClose
          className="flex w-full flex-col gap-0 overflow-visible p-0 sm:max-w-[44rem]"
        >
          {/* External close: a 48px circle floating outside the sheet's start
              edge, matching the shift-rostering "Reassign Route" panel's own
              floating close affordance. Uses logical `-start-14` so RTL flips
              it to the sheet's other edge; the built-in top-end X is
              suppressed via `hideClose`. */}
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
            <SheetDescription className="text-body-sm text-muted-foreground">
              {sheetDescription}
            </SheetDescription>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            {mode === 'suggested' ? (
              <section className="flex flex-col gap-0 rounded-md border border-border bg-card">
                <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                  <div className="flex items-center gap-2 text-body-sm">
                    {recordUid ? (
                      <>
                        <span className="font-semibold text-foreground">{recordUid}</span>
                        <span className="text-muted-foreground">·</span>
                      </>
                    ) : null}
                    <span className="text-foreground">{outboundContext || 'Attendance record'}</span>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-danger/10 px-2.5 py-0.5 text-caption font-semibold uppercase tracking-wide text-danger">
                    {headerTag}
                  </span>
                </div>
                <div className="flex flex-col gap-2 p-4">
                  <SwapRow
                    candidate={{ name: outboundName, shortId: outboundShortId }}
                    pillLabel={outboundReason}
                    pillTone="warning"
                    side="origin"
                    dimmed
                  />
                  <div className="flex justify-center">
                    <span className="grid size-8 place-items-center rounded-full border border-border bg-card text-muted-foreground">
                      <ArrowDown className="size-4" aria-hidden="true" />
                    </span>
                  </div>
                  <SwapRow
                    candidate={{
                      name: primarySuggestion?.name ?? '—',
                      shortId: primarySuggestion?.shortId,
                    }}
                    pillLabel="Available for Shift"
                    pillTone="success"
                    side="replacement"
                  />
                </div>
              </section>
            ) : (
              <section className="flex flex-col gap-3">
                <Input
                  type="search"
                  placeholder={props.searchPlaceholder ?? 'Search workforce'}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <div className="flex flex-col gap-2">
                  {filteredManual.length === 0 ? (
                    <p className="p-3 text-body-sm text-muted-foreground">No matching workers.</p>
                  ) : (
                    filteredManual.map((c) => (
                      <ManualRow
                        key={c.id}
                        candidate={c}
                        selected={selectedManualId === c.id}
                        onSelect={() => setSelectedManualId(c.id)}
                      />
                    ))
                  )}
                </div>
              </section>
            )}
          </div>
          <div className="flex items-center gap-3 border-t border-border p-4">
            {props.viewPlanLabel ? (
              <Button variant="tertiary" size="md">
                {props.viewPlanLabel}
                <ExternalLink className="ms-1 size-4" aria-hidden="true" />
              </Button>
            ) : null}
            <div className="flex-1" />
            {mode === 'suggested' ? (
              <>
                <button
                  type="button"
                  onClick={() => setMode('manual')}
                  className="rounded-xs px-3 py-2 text-body-sm font-semibold text-foreground outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Replace Manually
                </button>
                <Button onClick={() => doDispatch(primarySuggestion)} disabled={!primarySuggestion}>
                  {props.label ?? 'Dispatch Reliever'}
                </Button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setMode('suggested')}
                  className="rounded-xs px-3 py-2 text-body-sm font-semibold text-foreground outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Back to Suggested
                </button>
                <Button
                  onClick={() => doDispatch(selectedManualCandidate)}
                  disabled={!selectedManualCandidate}
                >
                  {props.label ?? 'Dispatch Reliever'}
                </Button>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </span>
  )
}

DispatchActionMenu.displayName = 'DispatchActionMenu'
