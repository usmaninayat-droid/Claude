import { useMemo, useState } from 'react'
import { MoreVertical } from '@fams/ui-kit/icons'
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
  SheetHeader,
  SheetTitle,
  toast,
} from '@fams/ui-kit'
import type { EntityRecord } from '../types'

/**
 * DispatchActionMenu — the composer's "row-actions kebab" for entity list
 * rows, currently home to the ONE action `ReadDispatchAction` already
 * owned ("Dispatch Reliever" on Absent attendance rows).
 *
 * The kebab renders on EVERY row (not just gated ones) so the action
 * column has a consistent affordance in every cell — the empty em-dash
 * the old renderer showed on non-gated rows read as a broken button. The
 * dispatch menu-item itself is still gated: enabled only when the record's
 * `props.gateCol` equals `props.gateValue` (Absent), matching the previous
 * renderer's behaviour. This keeps the DS-tier renderer generic (rule 10):
 * label, gate and copy remain `component.props`, no attendance vocabulary
 * baked in.
 *
 * Selecting the item opens a side-sheet with two sections — Suggested
 * Replacement (a curated candidate list) and Replace Manually (search
 * over the wider workforce) — mirroring the shift-rostering "Suggest
 * Replacement"/"Replace Manually" pattern. The candidate lists are
 * demo-scope data authored on `component.props` (`suggestions[]` /
 * `manual[]`); a blueprint that ships no lists falls back to a small
 * default set so the flow is always demonstrable. Dispatching any
 * candidate fires the same confirmation toast the old renderer emitted —
 * the demo stand-in for the real write + notify (a JSON blueprint cannot
 * express the store write itself).
 */

export interface DispatchActionMenuProps {
  label?: string
  gateCol?: string
  gateValue?: string
  sheetTitle?: string
  sheetDescription?: string
  suggestedTitle?: string
  manualTitle?: string
  searchPlaceholder?: string
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
  /** 0-100 fit score, optional; rendered as a small tag beside the row. */
  fit?: number
}

const DEFAULT_SUGGESTIONS: DispatchCandidate[] = [
  { id: 's1', name: 'Anwar Farooq', role: 'HD Driver', meta: 'Cluster · MSW', fit: 96 },
  { id: 's2', name: 'Yousuf Iqbal', role: 'HD Driver', meta: 'Cluster · MSW', fit: 91 },
  { id: 's3', name: 'Mohammed Adnan', role: 'HD Driver', meta: 'Cluster · Commercial', fit: 84 },
]

const DEFAULT_MANUAL: DispatchCandidate[] = [
  { id: 'm1', name: 'Ali Naseem', role: 'HD Driver', meta: 'Standby pool' },
  { id: 'm2', name: 'Sami Rashid', role: 'HD Driver', meta: 'Standby pool' },
  { id: 'm3', name: 'Bilal Khan', role: 'HD Driver', meta: 'Standby pool' },
  { id: 'm4', name: 'Faisal Ahmed', role: 'HD Driver', meta: 'Reliever queue' },
  { id: 'm5', name: 'Junaid Malik', role: 'HD Driver', meta: 'Reliever queue' },
  { id: 'm6', name: 'Hamza Nazir', role: 'HD Driver', meta: 'Reliever queue' },
]

function CandidateRow({
  candidate,
  onDispatch,
  showFit,
}: {
  candidate: DispatchCandidate
  onDispatch: (candidate: DispatchCandidate) => void
  showFit?: boolean
}) {
  return (
    <div className="flex items-center gap-3 rounded-sm border border-border bg-card p-3">
      <Avatar name={candidate.name} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-body-sm font-semibold text-foreground">{candidate.name}</p>
        <p className="truncate text-caption text-muted-foreground">
          {[candidate.role, candidate.meta].filter(Boolean).join(' · ')}
        </p>
      </div>
      {showFit && typeof candidate.fit === 'number' ? (
        <span className="rounded-sm bg-success-scale-100 px-2 py-0.5 text-caption font-semibold text-success-text">
          {candidate.fit}% fit
        </span>
      ) : null}
      <Button size="sm" onClick={() => onDispatch(candidate)}>
        Dispatch
      </Button>
    </div>
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
  const [query, setQuery] = useState('')

  const gated = props.gateCol ? record?.[props.gateCol] === props.gateValue : true
  const suggestions = props.suggestions ?? DEFAULT_SUGGESTIONS
  const manual = props.manual ?? DEFAULT_MANUAL
  const filteredManual = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return manual
    return manual.filter((c) =>
      [c.name, c.role, c.meta].some((s) => (s ?? '').toLowerCase().includes(needle)),
    )
  }, [manual, query])

  const dispatchCandidate = (candidate: DispatchCandidate) => {
    setOpen(false)
    toast(props.toastTitle ?? `${props.label ?? 'Dispatched'}`, {
      description: props.toastDescription ?? `${candidate.name} has been dispatched.`,
    })
  }

  return (
    // Wrap in a click-swallowing span so nothing inside the ACTION cell
    // (kebab trigger, dropdown item, sheet button) ever reaches the
    // surrounding row's `onRowClick` — the row would otherwise open its
    // profile drawer alongside the menu action.
    <span
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
    >
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Row actions"
          className="grid size-8 place-items-center rounded-xs text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-muted data-[state=open]:text-foreground"
          // Stop propagation on BOTH pointerdown and click — the surrounding
          // `DataTable` row activates via a pointerdown+click sequence; a
          // single `onClick` stop lets the row's own drawer open first.
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="size-4" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            disabled={!gated}
            onSelect={(e) => {
              e.preventDefault()
              setOpen(true)
            }}
          >
            {props.label ?? 'Dispatch Reliever'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b border-border p-4">
            <SheetTitle>{props.sheetTitle ?? props.label ?? 'Dispatch Reliever'}</SheetTitle>
            <SheetDescription>
              {props.sheetDescription ??
                'Choose a suggested reliever or search the wider workforce manually.'}
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-4">
            <section className="flex flex-col gap-2">
              <h3 className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">
                {props.suggestedTitle ?? 'Suggested Replacement'}
              </h3>
              {suggestions.map((c) => (
                <CandidateRow key={c.id} candidate={c} onDispatch={dispatchCandidate} showFit />
              ))}
            </section>
            <section className="mt-6 flex flex-col gap-2">
              <h3 className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">
                {props.manualTitle ?? 'Replace Manually'}
              </h3>
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
                    <CandidateRow key={c.id} candidate={c} onDispatch={dispatchCandidate} />
                  ))
                )}
              </div>
            </section>
          </div>
        </SheetContent>
      </Sheet>
    </span>
  )
}

DispatchActionMenu.displayName = 'DispatchActionMenu'
