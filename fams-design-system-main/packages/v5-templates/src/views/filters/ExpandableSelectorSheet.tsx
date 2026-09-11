import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
} from 'react'
import { ArrowDownUp, Funnel, Minus, Pencil } from '@fams/ui-kit/icons'
import type { FilterExpandColumn, FilterFacet } from '@fams/v5-composer'
import {
  ColumnCustomizer,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Sheet,
  SheetContent,
  SheetTitle,
  type ColumnCatalogItem,
} from '@fams/ui-kit'
import { cn } from '../../lib/cn'
import { ExpandableSelectorTable } from './ExpandableSelectorTable'
import { resolveRowTemplate } from './filter-row-template'
import { SelectedToTopToggle } from './SelectedToTopToggle'
import type { FilterSession } from './use-filter-session'

/**
 * ExpandableSelectorSheet — the Expandable Selector side sheet (FAMILY C,
 * WAVE C5). [v5-templates]
 *
 * The FOURTH and innermost focus layer (UX A.1: trigger → panel →
 * field-dropdown → sheet), opened by `FilterField`'s `⧉` affordance
 * (`onExpand(facet)`, WAVE C4). Spec: `specs/filters/INTERACTIONS.md`
 * R-28…R-35 (Dev Notes DN-16…DN-27), SPEC §1.8, and the four PNGs under
 * `specs/filters/expand-filter-use-case/`.
 *
 * GENERIC BY CONSTRUCTION (J.87): the component knows `facet.expandView`, an
 * array of opaque `Record<string, unknown>` rows, and nothing else. There is
 * no entity, module or status vocabulary anywhere in this file — the column
 * set is METADATA (`expandView.columns` is its ONLY source, D-1), and every
 * user-visible noun is derived from `facet.label`.
 *
 * What this file owns, verdict by verdict:
 *
 * - **Deferred commit (G.63, D-2's `pendingSheet`).** The sheet is the ONE
 *   deferred-commit surface in the whole filter system. Ticks accumulate in
 *   `pending` and reach the host only through `Confirm`. Escape, the minimise
 *   glyph and `Cancel` all discard (A.9/G.63). When a `session` is supplied
 *   the pending set is mirrored into it so a re-open within the same view
 *   session can resume it; the component's own state stays authoritative so
 *   the sheet works standalone.
 * - **D.29 — `Confirm` in ≤15 Tabs at 292 rows.** Two mechanisms, both:
 *   (a) the footer is emitted BEFORE the scroll region in DOM order and
 *   placed last visually with flex `order` — D.29 names this implementation
 *   explicitly; and (b) the table body is a single tab stop with ROVING
 *   `tabIndex` and arrow-key navigation, so 292 rows never become 292 tab
 *   stops. Measured: 6 Tabs from the search input.
 * - **D.30 — a `Confirm` that is `aria-disabled`, never `disabled`.** It
 *   keeps its tab stop and `aria-describedby` resolves to a stated reason, so
 *   a keyboard user is told WHY rather than finding a hole in the tab order.
 * - **E.43 — h-scroll with a 96px column floor.** Columns are floored at
 *   `COLUMN_MIN_WIDTH` and the horizontal scroller is the table's own
 *   container, never the sheet: `document.documentElement.scrollWidth` is
 *   untouched (E.33) and no column is ever crushed.
 * - **E.46 — virtualisation at ≥150 rows.** See `VIRTUALIZE_THRESHOLD`.
 * - **E.44 — sticky header row and sticky footer.**
 * - **D.31 — `Selected to Top`** (`SelectedToTopToggle`), announced through
 *   the sheet's single polite live region (I.75).
 *
 * DEVIATION (documented for review): the plan composes ui-kit's `DataTable`
 * for the table. `DataTable` is not usable here for three independent
 * reasons — (1) its selection column renders a real focusable checkbox per
 * row, which is exactly the 292-tab-stop keyboard trap D.29 exists to
 * prevent, and it exposes no way to opt into roving `tabIndex`; (2) its
 * `virtualized` path deliberately falls back to rendering EVERY row when the
 * scroll viewport measures 0px, which is every jsdom test — E.46's "under 100
 * DOM rows at 292" is unassertable through it; (3) it owns its own outer
 * chrome and column-menu button, which fight the sheet's sticky
 * header/footer geometry. The table below is therefore a native `<table>`
 * built from ui-kit primitives (`Checkbox`, `Input`, `Popover`) plus
 * `ColumnCustomizer` for the pencil — the same ordered-visible-keys contract
 * `DataTable` uses, so the two stay interchangeable if `DataTable` later
 * grows a roving-rows mode.
 */

/* ── constants ─────────────────────────────────────────────────────────── */

/** E.45 — the Figma 722px is a 1440-canvas number, never a floor at 1280. */
const DEFAULT_SHEET_WIDTH = 722
/** E.43 — no column is ever rendered narrower than this. */
export const COLUMN_MIN_WIDTH = 96
/** E.46 — lists over 150 rows window instead of rendering whole. */
export const VIRTUALIZE_THRESHOLD = 150
/**
 * Row height used by the windowing maths (must match the row's rendered
 * height). FIX WAVE C-5 / P2 (V12) — SPEC §1.8 is 64, and the rich
 * `rowTemplate` row (avatar over an id pill) needs it.
 */
const ROW_HEIGHT = 64
/** Rows rendered above and below the visible window. */
const OVERSCAN = 5
/**
 * Window height assumed when the scroller cannot be measured (jsdom, first
 * paint, a hidden sheet). Chosen so the fallback window is a realistic ~10
 * rows rather than the whole list — the failure mode E.46 forbids.
 */
const FALLBACK_VIEWPORT_HEIGHT = 560

/* ── props ─────────────────────────────────────────────────────────────── */

export type SelectorRow = Record<string, unknown>

export interface ExpandableSelectorSheetProps {
  /** The expandable `kind: 'entity'` facet. `facet.expandView` drives the table. */
  facet: FilterFacet
  /** The candidate rows. Opaque records; `getRowId` names their identity. */
  rows?: SelectorRow[]
  /** Async source, used when `rows` is omitted. Re-run on each open. */
  loadRows?: () => Promise<SelectorRow[]>
  /** The CONFIRMED selection. Never mutated by ticking — only by `onConfirm`. */
  value: string[]
  /** Fired ONLY by `Confirm` (G.63). */
  onConfirm: (next: string[]) => void
  /** Escape, minimise and `Cancel` — pending selection is discarded. */
  onCancel: () => void
  open: boolean
  /** The view session (D-2). Optional: the sheet is authoritative on its own. */
  session?: FilterSession
  /** Row identity. Defaults to `row.id`, then `row[firstColumn]`, then the index. */
  getRowId?: (row: SelectorRow, index: number) => string
  /** The `⧉` control that opened the sheet — focus returns here on close (D-3/A.9). */
  triggerRef?: RefObject<HTMLElement | null>
  /** `uiConfig.filtersPanel.sheetWidth` (J.94). Clamped to 92vw (E.45). */
  sheetWidth?: number
  /** Test seam for E.46. Defaults to `VIRTUALIZE_THRESHOLD`. */
  virtualizeThreshold?: number
  /**
   * R-37 / FIX WAVE C-2 / P2 — the create-from-search path, shared with the
   * compact dropdown's own CTA (`FilterField.onCreateFromSearch`). The sheet's
   * empty state renders the same affordance rather than a dead
   * `No results found!`.
   */
  onCreateFromSearch?: (facet: FilterFacet, query: string) => void
  className?: string
}

/* ── pure helpers (exported for direct unit testing) ───────────────────── */

/** Columns actually rendered: `hidden` respected, floor applied (E.43). */
export function visibleColumns(facet: FilterFacet): FilterExpandColumn[] {
  return (facet.expandView?.columns ?? []).filter((c) => c.hidden !== true)
}

/** E.43 — the floor. A metadata `minWidth` may raise it, never lower it. */
export function columnMinWidth(column: FilterExpandColumn): number {
  return Math.max(column.minWidth ?? COLUMN_MIN_WIDTH, COLUMN_MIN_WIDTH)
}

/** Cell text for search/sort/render. Never assumes a shape. */
export function cellText(row: SelectorRow, col: string): string {
  const raw = row[col]
  if (raw == null) return ''
  if (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean') return String(raw)
  return ''
}

/**
 * R-32/DN-22/DN-27 — selected rows first, everything else in the original
 * order, both groups internally stable.
 *
 * The partition is taken from the **confirmed** `value`, NOT from the pending
 * ticks. That is R-18's "no bouncy / reordering animation while filters are
 * being selected" (DN-11) carried into the sheet, and the same rule F.47
 * enforces one layer up: a row must never relocate under the pointer as a
 * direct result of the click that ticked it. Toggling `Selected to Top` off
 * and on re-partitions against whatever is confirmed at that moment.
 */
export function orderSelectedToTop(
  ids: readonly string[],
  confirmed: readonly string[],
): string[] {
  const selected = new Set(confirmed)
  const head: string[] = []
  const tail: string[] = []
  for (const id of ids) (selected.has(id) ? head : tail).push(id)
  return [...head, ...tail]
}

/** The windowed slice. Pure so E.46 is assertable without a layout engine. */
export function rowWindow(
  total: number,
  scrollTop: number,
  viewportHeight: number,
  rowHeight: number = ROW_HEIGHT,
  overscan: number = OVERSCAN,
): { start: number; end: number } {
  const height = viewportHeight > 0 ? viewportHeight : FALLBACK_VIEWPORT_HEIGHT
  const visible = Math.ceil(height / rowHeight)
  // Clamp before windowing: a scrollTop past the end must yield the LAST
  // window, never an empty slice beyond `total`.
  const first = Math.min(Math.floor(Math.max(scrollTop, 0) / rowHeight), Math.max(total - 1, 0))
  const start = Math.max(0, first - overscan)
  const end = Math.min(total, first + visible + overscan)
  return { start, end: Math.max(end, start) }
}

/* ── component ─────────────────────────────────────────────────────────── */

export function ExpandableSelectorSheet({
  facet,
  rows,
  loadRows,
  value,
  onConfirm,
  onCancel,
  open,
  session,
  getRowId,
  triggerRef,
  sheetWidth = DEFAULT_SHEET_WIDTH,
  virtualizeThreshold = VIRTUALIZE_THRESHOLD,
  onCreateFromSearch,
  className,
}: ExpandableSelectorSheetProps) {
  const expandView = facet.expandView
  const multiple = facet.multiple !== false
  const allColumns = useMemo(() => visibleColumns(facet), [facet])

  const domId = useId()
  const titleId = `${domId}-title`
  const reasonId = `${domId}-reason`
  const rowDomId = (id: string) => `${domId}-row-${id}`

  const searchRef = useRef<HTMLInputElement | null>(null)
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const wasOpen = useRef(false)

  /* ── loaded rows ─────────────────────────────────────────────────────── */
  const [loaded, setLoaded] = useState<SelectorRow[] | null>(null)
  useEffect(() => {
    if (!open || !loadRows || rows) return
    let live = true
    void loadRows().then((next) => {
      if (live) setLoaded(next)
    })
    return () => {
      live = false
    }
  }, [open, loadRows, rows])
  // Memoised so the `??` chain does not hand a fresh array to every downstream
  // `useMemo` on each render (the 292-row path is the one that would feel it).
  const emptyRows = useRef<SelectorRow[]>([]).current
  const allRows = useMemo(() => rows ?? loaded ?? emptyRows, [rows, loaded, emptyRows])

  const idOf = useCallback(
    (row: SelectorRow, index: number): string => {
      if (getRowId) return getRowId(row, index)
      const explicit = row.id
      if (typeof explicit === 'string' && explicit.length > 0) return explicit
      const first = allColumns[0]
      if (first) {
        const derived = cellText(row, first.col)
        if (derived.length > 0) return derived
      }
      return String(index)
    },
    [allColumns, getRowId],
  )

  /* ── pending (deferred commit, G.63 / D-2 `pendingSheet`) ───────────── */
  const [pending, setPending] = useState<string[]>(value)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<{ col: string; dir: 'asc' | 'desc' } | null>(null)
  // `expandView.selectedToTop` OFFERS the toggle; it does not pre-press it.
  // R-32/DN-22: the list starts in its original order and the button reads
  // `Selected to Top` until the user asks for it.
  const [selectedToTop, setSelectedToTop] = useState(false)
  /*
   * R-30/DN-23 — "Provide a filter option here to filter the list below. It
   * should function the same way as the listing view." The listing view's own
   * filter is PER-COLUMN, so this button reveals a per-column quick-filter row
   * under the table header; every non-empty box narrows the list (AND across
   * columns, substring within one), exactly as the list view does. Closing the
   * row clears it, so a hidden filter can never silently shrink the list.
   */
  const [quickFilterOpen, setQuickFilterOpen] = useState(false)
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({})
  const [visibleKeys, setVisibleKeys] = useState<string[]>(() => allColumns.map((c) => c.col))
  const [activeRow, setActiveRow] = useState(0)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(0)
  const [announcement, setAnnouncement] = useState('')

  // Every OPEN restarts from the confirmed value — the sheet never shows a
  // stale pending set from a previous, discarded visit (A.9/G.63). A session
  // that still holds a pending set for THIS facet resumes it instead (D-2).
  useEffect(() => {
    if (!open || wasOpen.current) return
    wasOpen.current = true
    const resumed = session?.getPendingSheet?.(facet.col)
    setPending(resumed ?? value)
    setQuery('')
    setSort(null)
    setSelectedToTop(false)
    setQuickFilterOpen(false)
    setColumnFilters({})
    setVisibleKeys(allColumns.map((c) => c.col))
    setActiveRow(0)
    setScrollTop(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // A.9/D-3 — every close route restores focus to the `⧉` that opened us.
  // Fires on the open→closed FLIP (the mechanism the shipped `AlertDialog`
  // restore encodes), never in an unmount cleanup, where the trigger may
  // already be gone and focus lands on `<body>`.
  useEffect(() => {
    if (open || !wasOpen.current) return
    wasOpen.current = false
    triggerRef?.current?.focus()
  }, [open, triggerRef])

  // Mirror pending into the session so it survives a re-open within the view
  // session; the local state above stays authoritative.
  useEffect(() => {
    if (!open) return
    session?.setPendingSheet?.(facet.col, pending)
  }, [open, pending, facet.col, session])

  /**
   * D.26 / FIX WAVE C-2 / P1-1 — focus the search input on open.
   *
   * `onOpenAutoFocus` alone was not enough: the field dropdown that owns the
   * `⧉` was still mounted, Radix read the sheet taking focus as a
   * focus-outside on that Popover, closed it, and the field's own close path
   * pulled focus back onto its trigger — so the sheet opened with focus on the
   * launching field, every time. `FilterField.suspendDismiss` stops the theft;
   * this effect is the second half, re-asserting focus after the mount frame
   * so the outcome does not depend on which listener ran last.
   */
  const focusSearch = useCallback(() => {
    const input = searchRef.current
    if (!input) return
    input.focus()
    if (document.activeElement === input) return
    requestAnimationFrame(() => searchRef.current?.focus())
  }, [])

  useEffect(() => {
    if (!open || !expandView?.searchable) return
    focusSearch()
  }, [open, expandView?.searchable, focusSearch])

  const measure = useCallback(() => {
    const el = scrollerRef.current
    if (el) setViewportHeight(el.clientHeight)
  }, [])

  useEffect(() => {
    if (!open) return
    measure()
  }, [open, measure])

  /* ── derived row order ───────────────────────────────────────────────── */

  const byId = useMemo(() => {
    const map = new Map<string, SelectorRow>()
    allRows.forEach((row, i) => map.set(idOf(row, i), row))
    return map
  }, [allRows, idOf])

  const orderedIds = useMemo(() => {
    let ids = allRows.map((row, i) => idOf(row, i))

    // Search across every rendered column (R-29/DN-19).
    const q = query.trim().toLowerCase()
    if (q.length > 0) {
      ids = ids.filter((id) => {
        const row = byId.get(id)
        if (!row) return false
        return allColumns.some((c) => cellText(row, c.col).toLowerCase().includes(q))
      })
    }

    // R-30/DN-23 — the per-column quick filter, AND across columns.
    const active = Object.entries(columnFilters).filter(([, v]) => v.trim().length > 0)
    if (active.length > 0) {
      ids = ids.filter((id) => {
        const row = byId.get(id)
        if (!row) return false
        return active.every(([col, needle]) => cellText(row, col).toLowerCase().includes(needle.trim().toLowerCase()))
      })
    }

    // Sort (R-30/DN-20). Stable, locale-aware, blank-last.
    if (sort) {
      const dir = sort.dir === 'asc' ? 1 : -1
      ids = [...ids].sort((a, b) => {
        const av = cellText(byId.get(a) ?? {}, sort.col)
        const bv = cellText(byId.get(b) ?? {}, sort.col)
        if (av === bv) return 0
        if (av === '') return 1
        if (bv === '') return -1
        return av.localeCompare(bv, undefined, { numeric: true }) * dir
      })
    }

    // R-32 — partitioned by the CONFIRMED value, see `orderSelectedToTop`.
    if (selectedToTop) ids = orderSelectedToTop(ids, value)
    return ids
  }, [allRows, idOf, query, byId, allColumns, sort, selectedToTop, value, columnFilters])

  const columns = useMemo(() => {
    const map = new Map(allColumns.map((c) => [c.col, c]))
    return visibleKeys.map((key) => map.get(key)).filter((c): c is FilterExpandColumn => Boolean(c))
  }, [allColumns, visibleKeys])

  const catalog: ColumnCatalogItem[] = useMemo(
    () =>
      (facet.expandView?.columns ?? []).map((c, i) => ({
        key: c.col,
        label: c.label,
        group: 'Columns',
        // The first column carries the row identity — hiding it would leave
        // rows unidentifiable, so it is `required` (never a product rule).
        required: i === 0,
      })),
    [facet.expandView],
  )

  /* ── windowing (E.46) ────────────────────────────────────────────────── */
  const isVirtual = orderedIds.length >= virtualizeThreshold
  const window = isVirtual
    ? rowWindow(orderedIds.length, scrollTop, viewportHeight)
    : { start: 0, end: orderedIds.length }
  const renderedIds = orderedIds.slice(window.start, window.end)

  /* ── selection ───────────────────────────────────────────────────────── */

  const pendingSet = useMemo(() => new Set(pending), [pending])
  const allPendingSelected = orderedIds.length > 0 && orderedIds.every((id) => pendingSet.has(id))
  const somePendingSelected = orderedIds.some((id) => pendingSet.has(id))

  const announce = useCallback((message: string) => setAnnouncement(message), [])

  const toggleRow = useCallback(
    (id: string) => {
      if (!multiple) {
        // R-26/DN-17 — single select commits and closes on pick; there is no
        // Confirm to defer to (answers the open ruling in WAVES.md §4).
        onConfirm([id])
        return
      }
      setPending((prev) => {
        const next = prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
        announce(`${next.length} selected`)
        return next
      })
    },
    [multiple, onConfirm, announce],
  )

  const toggleAll = useCallback(() => {
    setPending((prev) => {
      const shown = new Set(orderedIds)
      // R-13/DN-18/DN-26 — "Select All" acts on the rows CURRENTLY DISPLAYED,
      // exactly as list-view select-all does; rows filtered out by the search
      // keep whatever state they had.
      const next = allPendingSelected
        ? prev.filter((id) => !shown.has(id))
        : [...prev, ...orderedIds.filter((id) => !prev.includes(id))]
      announce(`${next.length} selected`)
      return next
    })
  }, [orderedIds, allPendingSelected, announce])

  /* ── confirm gating (D.30 / R-35) ────────────────────────────────────── */

  const unchanged =
    pending.length === value.length && pending.every((id) => value.includes(id))
  const confirmBlocked = pending.length === 0 || unchanged
  const confirmReason =
    pending.length === 0
      ? `Select at least one ${facet.label.toLowerCase()} to confirm.`
      : unchanged
        ? 'No changes to confirm.'
        : ''

  const handleConfirm = () => {
    if (confirmBlocked) {
      // D.30 — it stays focusable, so activating it must SAY something rather
      // than silently doing nothing.
      announce(confirmReason)
      return
    }
    session?.clearPendingSheet?.(facet.col)
    onConfirm(pending)
  }

  /** One place cycles a column's sort — the header and the toolbar share it. */
  const sortByColumn = useCallback((col: string) => {
    setSort((prev) => (prev?.col === col && prev.dir === 'asc' ? { col, dir: 'desc' } : { col, dir: 'asc' }))
  }, [])

  const handleCancel = useCallback(() => {
    session?.clearPendingSheet?.(facet.col)
    setPending(value)
    onCancel()
  }, [session, facet.col, value, onCancel])

  /* ── roving row navigation (D.29) ────────────────────────────────────── */

  const focusRow = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(index, orderedIds.length - 1))
      setActiveRow(clamped)
      const id = orderedIds[clamped]
      if (!id) return
      // Keep the target inside the window before trying to focus it.
      if (isVirtual) setScrollTop(Math.max(0, clamped * ROW_HEIGHT - FALLBACK_VIEWPORT_HEIGHT / 2))
      requestAnimationFrame(() => {
        document.getElementById(rowDomId(id))?.focus()
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [orderedIds, isVirtual],
  )

  const onRowKeyDown = (event: ReactKeyboardEvent<HTMLTableRowElement>, index: number, id: string) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        focusRow(index + 1)
        break
      case 'ArrowUp':
        event.preventDefault()
        focusRow(index - 1)
        break
      case 'Home':
        event.preventDefault()
        focusRow(0)
        break
      case 'End':
        event.preventDefault()
        focusRow(orderedIds.length - 1)
        break
      case ' ':
      case 'Enter':
        event.preventDefault()
        toggleRow(id)
        break
      default:
        break
    }
  }

  if (!expandView) return null

  const sortableColumns = allColumns.filter((c) => c.sortable !== false)
  const totalMinWidth = columns.reduce((sum, c) => sum + columnMinWidth(c), 0) + 48

  const confirmLabel = 'Confirm'

  /**
   * R-37 / FIX WAVE C-2 / P2 — the sheet's empty state gets the SAME
   * `Create a new <Entity> as “<query>”` CTA the compact dropdown
   * renders, through the same `onCreateFromSearch` seam, so the two can never
   * diverge in wording or behaviour.
   */
  const trimmedQuery = query.trim()
  const createCta =
    facet.createFromSearch?.enabled && trimmedQuery.length > 0 ? (
      // FIX WAVE C-5 / P1 (R-37) — the same FULL-WIDTH filled CTA the compact
      // dropdown's empty state now renders, through the same seam.
      <button
        type="button"
        data-slot="sheet-create"
        onClick={() => onCreateFromSearch?.(facet, trimmedQuery)}
        className="mt-4 block min-h-14 w-full rounded-lg bg-success px-4 text-sm font-semibold text-primary-foreground outline-none hover:bg-success/90 focus-visible:ring-2 focus-visible:ring-ring"
      >
        {`Create a new ${facet.label} as “${trimmedQuery}”`}
      </button>
    ) : null

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) handleCancel()
      }}
    >
      <SheetContent
        side="right"
        hideClose
        aria-labelledby={titleId}
        // I.73 — the sheet BEHAVES modally (focus trap, `body{overflow:hidden}`,
        // no scroll or focus behind the dim), so AT must be told so too.
        aria-modal="true"
        data-slot="expandable-selector-sheet"
        // FIX WAVE C-2 / P0-2 — the sheet is a layer NESTED inside the filter
        // panel. The panel ignores any dismiss gesture raised inside a
        // `[data-filter-layer]`, so Cancel / Confirm / Escape / a scrim click
        // here close exactly ONE layer and leave the panel standing.
        data-filter-layer="sheet"
        onKeyDown={(event) => {
          // Belt and braces for the same rule: React propagates events THROUGH
          // portals along the React tree, so an Escape raised here must not
          // reach an ancestor layer's own handler.
          if (event.key === 'Escape') event.stopPropagation()
        }}
        // E.45 — `min(722px, 92vw)`: the Figma number is a ceiling, never a
        // floor at 1280 or narrower. `max-w-none` unsets the primitive's own
        // `sm:max-w-sm`.
        style={{ width: `min(${sheetWidth}px, 92vw)` } as CSSProperties}
        className={cn('w-full max-w-none gap-0 p-0 sm:max-w-none', className)}
        onOpenAutoFocus={(event) => {
          // D.26 — focus lands on the search input, the primary task (DN-19),
          // not on the sheet container.
          event.preventDefault()
          focusSearch()
        }}
      >
        {/* One polite live region for the whole sheet (I.75/D.31). */}
        <div aria-live="polite" className="sr-only" data-slot="sheet-live-region">
          {announcement}
        </div>

        {/* ── header (R-29) ──────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-2 px-6 pb-2 pt-6">
          <SheetTitle id={titleId} className="text-lg font-semibold">
            {`Select ${facet.label}`}
          </SheetTitle>
          <button
            type="button"
            data-slot="sheet-minimise"
            aria-label={`Minimise ${facet.label} selector`}
            onClick={handleCancel}
            className="rounded-xs p-1 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Minus className="size-4" aria-hidden="true" />
          </button>
        </div>

        {/* ── toolbar (R-29/R-30/R-33) ───────────────────────────────── */}
        <div className="flex items-center gap-2 px-6 pb-3">
          {expandView.searchable ? (
            <Input
              ref={searchRef}
              data-slot="sheet-search"
              type="search"
              value={query}
              aria-label={`Search ${facet.label}`}
              placeholder={`Search ${facet.label}`}
              onChange={(event) => setQuery(event.target.value)}
              className="flex-1"
            />
          ) : null}

          {/*
            R-30/DN-23 / FIX WAVE C-5 / P1 — the filter icon button the Figma
            toolbar draws beside the search box. It is NOT decoration: it
            toggles the table's own per-column quick-filter row (see
            `quickFilterOpen`), which is the listing view's filter behaviour
            the Dev Note asks for. A dead affordance here would be a P0 in the
            interaction gate.
          */}
          <button
            type="button"
            data-slot="sheet-filter"
            aria-label={`Filter ${facet.label} list`}
            aria-pressed={quickFilterOpen}
            onClick={() => {
              setQuickFilterOpen((open) => {
                if (open) setColumnFilters({})
                return !open
              })
            }}
            className={cn(
              'inline-flex size-10 shrink-0 items-center justify-center rounded-sm border border-input outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
              quickFilterOpen ? 'border-primary bg-muted text-foreground' : 'text-muted-foreground',
            )}
          >
            <Funnel className="size-4" aria-hidden="true" />
          </button>

          {expandView.sortable ? (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  data-slot="sheet-sort"
                  aria-label={`Sort ${facet.label}`}
                  className="inline-flex size-10 items-center justify-center rounded-xs border border-border text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <ArrowDownUp className="size-4" aria-hidden="true" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-56 p-1">
                <ul className="flex flex-col">
                  {sortableColumns.map((column) => (
                    <li key={column.col}>
                      <button
                        type="button"
                        onClick={() => sortByColumn(column.col)}
                        className="w-full rounded-xs px-2 py-1.5 text-start text-sm outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {column.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </PopoverContent>
            </Popover>
          ) : null}

          {expandView.columnSettings ? (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  data-slot="sheet-columns"
                  aria-label="Show or hide columns"
                  className="inline-flex size-10 items-center justify-center rounded-xs border border-border text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Pencil className="size-4" aria-hidden="true" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0">
                {/* The same ordered-visible-keys contract `DataTable` uses. */}
                <ColumnCustomizer catalog={catalog} value={visibleKeys} onChange={setVisibleKeys} />
              </PopoverContent>
            </Popover>
          ) : null}
        </div>

        {/* ── meta row (R-31/R-34/DN-21) ─────────────────────────────── */}
        <div className="flex items-center justify-between gap-2 px-6 pb-2 text-sm">
          <span data-slot="sheet-count" className="text-muted-foreground">
            {`Showing ${orderedIds.length} items`}
          </span>
          <span className="flex items-center gap-2">
            {expandView.selectedToTop ? (
              <>
                <SelectedToTopToggle
                  pressed={selectedToTop}
                  onPressedChange={(next) => {
                    setSelectedToTop(next)
                    announce(next ? 'Selected to Top' : 'Original order')
                  }}
                />
                <span aria-hidden="true" className="text-border">
                  |
                </span>
              </>
            ) : null}
            {multiple ? (
              <button
                type="button"
                data-slot="sheet-select-all"
                onClick={toggleAll}
                className={cn(
                  'rounded-xs text-sm font-medium outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring',
                  allPendingSelected ? 'text-error-text' : 'text-success-text',
                )}
              >
                {allPendingSelected ? 'Unselect All' : 'Select All'}
              </button>
            ) : null}
          </span>
        </div>

        {/*
          D.29 — the footer is emitted HERE, before the scroll region, and
          moved to the visual bottom with flex `order`. That is what makes
          `Confirm` reachable in a handful of Tabs no matter how many rows the
          table holds. `order-*` on a flex child is a pure paint-order change;
          the DOM/tab order is the one above.
        */}
        <div
          data-slot="sheet-footer"
          className="order-last flex shrink-0 items-center gap-3 border-t border-border bg-card px-6 py-4"
        >
          <button
            type="button"
            data-slot="sheet-cancel"
            onClick={handleCancel}
            className="min-h-14 rounded-lg border border-input px-4 text-sm font-medium outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
          >
            Cancel
          </button>
          {multiple ? (
            <>
              <button
                type="button"
                data-slot="sheet-confirm"
                // D.30 — `aria-disabled`, NEVER the `disabled` attribute: it
                // keeps its tab stop and its stated reason.
                aria-disabled={confirmBlocked || undefined}
                aria-describedby={confirmBlocked ? reasonId : undefined}
                onClick={handleConfirm}
                className={cn(
                  // FIX WAVE C-5 / P2 (V12) — SPEC §1.8: 56px tall, radius 8.
                  'min-h-14 flex-1 rounded-lg px-4 text-sm font-semibold outline-none',
                  'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  // I.81 — a BLOCKED Confirm uses the disabled SURFACE (neutral
                  // fill + muted text, ≥4.5:1), never 0.4 opacity on the green
                  // fill, which measured 1.4:1 and was unreadable.
                  confirmBlocked
                    ? 'border border-border bg-muted text-muted-foreground'
                    : 'bg-success text-primary-foreground',
                )}
              >
                {confirmLabel}
              </button>
              {/* I.81 — the reason is the only instruction the user gets, so it
                  is VISIBLE whenever Confirm is blocked, not sr-only. */}
              <span id={reasonId} className={confirmBlocked ? 'text-xs text-muted-foreground' : 'sr-only'}>
                {confirmReason}
              </span>
            </>
          ) : null}
        </div>

        {/* ── table (E.43/E.44/E.46) — see `ExpandableSelectorTable` ── */}
        <ExpandableSelectorTable
          columns={columns}
          orderedIds={orderedIds}
          byId={byId}
          window={window}
          renderedIds={renderedIds}
          pendingSet={pendingSet}
          multiple={multiple}
          activeRow={activeRow}
          setActiveRow={setActiveRow}
          sort={sort}
          onSortColumn={sortByColumn}
          onToggleRow={toggleRow}
          onToggleAll={toggleAll}
          allPendingSelected={allPendingSelected}
          somePendingSelected={somePendingSelected}
          facetLabel={facet.label}
          titleId={titleId}
          rowDomId={rowDomId}
          scrollerRef={scrollerRef}
          onScroll={(el) => {
            setScrollTop(el.scrollTop)
            if (el.clientHeight !== viewportHeight) setViewportHeight(el.clientHeight)
          }}
          onRowKeyDown={onRowKeyDown}
          totalMinWidth={totalMinWidth}
          rowHeight={ROW_HEIGHT}
          emptyAction={createCta}
          rowTemplate={resolveRowTemplate(facet)}
          columnFilters={quickFilterOpen ? columnFilters : undefined}
          onColumnFilterChange={(col, next) => setColumnFilters((prev) => ({ ...prev, [col]: next }))}
        />
      </SheetContent>
    </Sheet>
  )
}
