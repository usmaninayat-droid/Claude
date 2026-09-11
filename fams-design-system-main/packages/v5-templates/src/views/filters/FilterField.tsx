import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { ChevronDown, FileSearch, Maximize2, X } from '@fams/ui-kit/icons'
import type { FilterFacet, FilterOption } from '@fams/v5-composer'
import {
  Button,
  Checkbox,
  computeOverflow,
  CustomScrollbar,
  DateRangePicker,
  InsetField,
  FilterOptionGroups,
  Popover,
  PopoverContent,
  PopoverTrigger,
  StatusDot,
  StatusView,
  type DateRangePickerTime,
  type DateRangePickerValue,
} from '@fams/ui-kit'
import { cn } from '../../lib/cn'
import { isDateRangeFilterValue, type DateRangeFilterValue } from '../saved-views'
import { resolveFilterFieldIcon } from './filter-icons'
import { FilterEntityRow, resolveRowTemplate } from './filter-row-template'
import type { FilterSession } from './use-filter-session'

/**
 * FilterField — ONE filter row inside the All Filters panel (FAMILY C, WAVE
 * C4). [v5-templates]
 *
 * Anatomy (`specs/filters/SPEC.md` §1.4, `filter-behaviour-overview/*.png`): a
 * 54px two-line trigger — label line `3 LOTs Selected`, value line
 * `Lot 1, Lot 2, +4` — that opens a PORTALLED, flipping dropdown. There is no
 * page-level chip row anywhere in this model (J.95): the `+N` lives INSIDE the
 * trigger and is computed by ui-kit's one `computeOverflow` helper (J.93).
 *
 * The dropdown body is chosen by `facet.kind` (D-1):
 * - `tags` → `FilterOptionGroups` (categorised chips, index-assigned palette)
 * - `date` → `DateRangePicker` (its own field trigger; no second layer)
 * - everything else → the Selected/Available option listbox below, with a
 *   `StatusDot` per row when `optionDot === 'status'` and a count pill when
 *   `showCounts`
 * - `entity` additionally renders the `⧉` expand affordance, which only calls
 *   `onExpand(facet)` — the side sheet itself is WAVE C5.
 *
 * Behaviour contracts implemented here (see `qa/UX-NOTES-filters.md`):
 * - LIVE-APPLY ONLY (G.63): every toggle calls `onChange` immediately. There
 *   is no Apply/Confirm/Done anywhere in this file, by design.
 * - F.47/F.49/F.50: section membership and row order come from the view
 *   session's OPEN-TIME snapshot, never from the live value, so no row ever
 *   moves on toggle.
 * - C.16–C.19: DOM focus stays on the dropdown's search input, which drives
 *   the listbox through `aria-activedescendant`; arrows wrap; `Space` toggles
 *   only on an empty query; `Enter` always toggles (multi) or selects and
 *   closes (single).
 * - C.23: the `Select all` / `Unselect all` meta actions are real buttons in
 *   the dropdown header, named per section so two of them are never
 *   indistinguishable to a screen reader.
 * - D-3: `Escape` closes ONLY the dropdown (first press clears a non-empty
 *   query) and restores focus to the field trigger — Radix's dismiss layer,
 *   the same mechanism the shipped `AlertDialog` restore uses.
 *
 * DEVIATION (documented for review): the plan sketches this dropdown as
 * ui-kit's sectioned `Combobox`. `Combobox` cannot be consumed as a dropdown
 * BODY — it owns its own trigger and its own Popover, and offers no header
 * slot for the C.23 meta actions or the `⧉` expand button. Rather than nest a
 * second trigger inside this one, `FilterField` owns the layer (which D-3/D-4
 * assign to it anyway) and reproduces `Combobox`'s exact sectioned contract:
 * one `role="listbox"`, two captioned `role="group"`s, one divider, live
 * `Selected (N)`. Extracting that list out of `Combobox` into a shared
 * `OptionListbox` is the right follow-up and would drop this file by ~120
 * lines.
 */

export interface FilterFieldProps {
  facet: FilterFacet
  /** The applied value: `string[]` for multi, `string | null` for single, a range for `date`. */
  value?: unknown
  /** LIVE-APPLY — called on every toggle, never batched behind an Apply button. */
  onChange: (next: unknown) => void
  /** The view-session state (D-2), owned by `ModuleView`. */
  session: FilterSession
  /** `kind: 'entity' && expandable` — the `⧉` affordance. WAVE C5 supplies the sheet. */
  onExpand?: (facet: FilterFacet) => void
  /** Reported so the host panel can scope its own Escape/outside-click to the innermost layer. */
  onOpenChange?: (open: boolean) => void
  /**
   * FIX WAVE C-2 / P0-2 + P1-1 — set while a DEEPER layer (this field's
   * Expandable Selector sheet) is open. The dropdown then stops dismissing
   * itself on the focus/pointer/Escape that belongs to that deeper layer, and
   * stops pulling focus back to its own trigger.
   *
   * Without it, opening the sheet moved focus into the sheet, Radix read that
   * as a focus-outside on this Popover, closed the dropdown, and `setOpen`
   * below yanked focus back onto the field trigger — which is both why the
   * sheet's search input never got focus (D2) and why the sheet's Escape then
   * landed on the PANEL and collapsed two layers at once (D15).
   */
  suspendDismiss?: boolean
  /**
   * R-37 / G.57–59 — the create-from-search CTA, shown in the empty state
   * when `facet.createFromSearch.enabled`. Same signature the sheet's own
   * empty state uses, so both CTAs are one path.
   */
  onCreateFromSearch?: (facet: FilterFacet, query: string) => string | void
  disabled?: boolean
  /**
   * Width budget (px) for the trigger's value line. Omit to measure the
   * rendered line; the fallback below is used where there is no layout
   * (jsdom, first paint).
   */
  valueWidth?: number
  className?: string
}

/** Floor on the dropdown width, so a narrow field never yields an unusable option list. */
const DROPDOWN_MIN_WIDTH = 280

/** Fallback value-line budget: the 448px panel's 400px field minus the label/`+N` furniture. */
const DEFAULT_VALUE_BUDGET = 300
/** Approximate px per character at the trigger's 14px type — only ever a budget heuristic. */
const CHAR_PX = 7
/** Width the `+N` token itself needs, charged only when it is actually drawn. */
const OVERFLOW_RESERVE = 34

/** `optionDefs` (v2, rich) with a fallback to the legacy flat `options: string[]`. */
export function facetOptions(facet: FilterFacet): FilterOption[] {
  if (facet.optionDefs?.length) return facet.optionDefs
  return (facet.options ?? []).map((value) => ({ value, label: value }))
}

/** Normalises whatever the host stored into the id list this layer renders from. */
export function selectedIdsOf(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string')
  if (typeof value === 'string' && value.length > 0) return [value]
  return []
}

const isMulti = (facet: FilterFacet) => facet.multiple !== false && facet.kind !== 'single-select' && facet.kind !== 'date'

/** `3 LOTs Selected` / the bare field name when nothing is picked (D-1). */
export function triggerLabelLine(facet: FilterFacet, count: number): string {
  if (count === 0) return facet.label
  if (!isMulti(facet)) return facet.label
  return `${count} ${facet.label}${count === 1 ? '' : 's'} Selected`
}

export function FilterField({
  facet,
  value,
  onChange,
  session,
  onExpand,
  onOpenChange,
  suspendDismiss = false,
  onCreateFromSearch,
  disabled = false,
  valueWidth,
  className,
}: FilterFieldProps) {
  const multiple = isMulti(facet)
  const options = useMemo(() => facetOptions(facet), [facet])
  const selected = useMemo(() => selectedIdsOf(value), [value])
  const [open, setOpenState] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  /**
   * H.71 — WHICH input device last moved the active option. A pure
   * `aria-activedescendant` listbox can never fire `:focus-visible` (the rows
   * are not tab stops, C.16), so the keyboard-active row draws the ring
   * itself; a mouse hover keeps the fill only, and the two states are then
   * visually distinct rather than pixel-identical.
   */
  const [navMode, setNavMode] = useState<'keyboard' | 'pointer'>('keyboard')
  const [snapshot, setSnapshot] = useState<{ order: string[]; membership: string[] } | null>(null)
  const [budget, setBudget] = useState(valueWidth ?? 0)

  const listboxId = useId()
  const captionSelectedId = `${listboxId}-cap-selected`
  const captionAvailableId = `${listboxId}-cap-available`
  const optionDomId = (id: string) => `${listboxId}-opt-${id}`
  /** G.58 — the create CTA is the listbox's FINAL item, so arrows can reach it. */
  const createDomId = `${listboxId}-create`
  const valueLineRef = useRef<HTMLSpanElement | null>(null)
  /** M4 — `{value,label}` for records created from the search text this session. */
  const [createdPairs, setCreatedPairs] = useState<FilterOption[]>([])
  const triggerRef = useRef<HTMLButtonElement | null>(null)

  useLayoutEffect(() => {
    if (typeof valueWidth === 'number') return
    const measured = valueLineRef.current?.clientWidth ?? 0
    if (measured > 0) setBudget(measured)
  }, [valueWidth, selected.length])

  const effectiveBudget = (typeof valueWidth === 'number' ? valueWidth : budget) || DEFAULT_VALUE_BUDGET

  const setOpen = useCallback(
    (next: boolean) => {
      setOpenState(next)
      onOpenChange?.(next)
      if (next) {
        // F.47/F.49 — the snapshot is taken ON OPEN and nothing re-sorts until
        // the next one.
        const order = session.snapshotOnOpen(facet.col, selected, options.map((o) => o.value))
        setSnapshot({ order, membership: selected })
        setQuery('')
        setActiveIndex(0)
      } else {
        // F.50 — "has been opened before" is set on the first CLOSE.
        session.markOpened(facet.col)
        // FIX WAVE C-2 / P1-1 — but NOT while a deeper layer (the sheet) owns
        // focus: restoring here is what stole the sheet's search focus.
        if (suspendDismiss) return
        // A.4 — focus returns to the field on the data-state flip. Radix does
        // this too, but only once its content actually unmounts; restoring on
        // the flip is the contract the shipped `AlertDialog` restore encodes
        // and the only one a test can observe synchronously.
        triggerRef.current?.focus()
      }
    },
    [facet.col, onOpenChange, options, selected, session, suspendDismiss],
  )

  /* ── the option list (order frozen, membership frozen) ─────────────── */

  const orderedOptions = useMemo(() => {
    const order = snapshot?.order
    if (!order || order.length === 0) return options
    const remaining = new Map(options.map((o) => [o.value, o]))
    const out: FilterOption[] = []
    for (const id of order) {
      const option = remaining.get(id)
      if (option) {
        out.push(option)
        remaining.delete(id)
      }
    }
    for (const option of options) if (remaining.has(option.value)) out.push(option)
    return out
  }, [options, snapshot])

  const visibleOptions = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return orderedOptions
    return orderedOptions.filter((o) => o.label.toLowerCase().includes(q))
  }, [orderedOptions, query])

  // F.50 — the split only appears once the field has been opened before; the
  // first-ever open is the flat list the designer draws in `43-*.png`.
  const splitEnabled = multiple && session.hasOpenedBefore(facet.col)
  const membership = useMemo(
    () => new Set(snapshot?.membership ?? selected),
    [snapshot, selected],
  )
  const selectedRows = splitEnabled ? visibleOptions.filter((o) => membership.has(o.value)) : []
  const availableRows = splitEnabled
    ? visibleOptions.filter((o) => !membership.has(o.value))
    : visibleOptions
  // F.52 — an empty Selected section renders nothing at all (no caption, no divider).
  const showSelectedSection = splitEnabled && selectedRows.length > 0
  const navigableRows = showSelectedSection ? [...selectedRows, ...availableRows] : availableRows
  const trimmedQuery = query.trim()
  /*
   * R-37 / G.57–59 — the create-from-search CTA. It is part of the
   * `aria-activedescendant` ring (G.58): with results it is the item AFTER the
   * last option, and with none it is the only item, so `ArrowDown` always
   * reaches it and `Enter` activates it.
   */
  const showCreate = Boolean(facet.createFromSearch?.enabled) && trimmedQuery.length > 0
  /** Ring length = options + (the CTA, when shown). */
  const ringLength = navigableRows.length + (showCreate ? 1 : 0)
  const clampedActive = ringLength === 0 ? -1 : Math.min(activeIndex, ringLength - 1)
  const createActive = showCreate && clampedActive === navigableRows.length
  const activeDescendant = createActive
    ? createDomId
    : clampedActive < 0 || clampedActive >= navigableRows.length
      ? undefined
      : optionDomId(navigableRows[clampedActive].value)

  /* ── live-apply commits (G.63 — no Apply button exists in this layer) ─ */

  const commit = (optValue: string) => {
    if (!multiple) {
      onChange(optValue === (typeof value === 'string' ? value : null) ? null : optValue)
      setOpen(false)
      return
    }
    onChange(selected.includes(optValue) ? selected.filter((v) => v !== optValue) : [...selected, optValue])
  }

  /**
   * G.58 — creating from the search text must also SELECT what it created.
   * The host may return the created record's id; when it returns nothing (its
   * create flow is asynchronous, e.g. a prefilled create drawer) the typed
   * text IS the value, which is exactly what the trigger must then show.
   */
  const runCreateFromSearch = () => {
    if (!trimmedQuery) return
    const created = onCreateFromSearch?.(facet, trimmedQuery)
    const createdId = typeof created === 'string' && created.length > 0 ? created : trimmedQuery
    // M4 — when the host DID return a real record id, that id is not in
    // `options` yet, so the trigger would otherwise render `rec_9f2c81`. The
    // label is right here: the text the user just typed.
    if (createdId !== trimmedQuery) {
      setCreatedPairs((prev) =>
        prev.some((p) => p.value === createdId) ? prev : [...prev, { value: createdId, label: trimmedQuery }],
      )
    }
    if (multiple) {
      if (!selected.includes(createdId)) onChange([...selected, createdId])
    } else {
      onChange(createdId)
    }
    setOpen(false)
  }

  const selectAllAvailable = () => {
    const next = new Set(selected)
    for (const option of availableRows) next.add(option.value)
    onChange([...next])
  }

  const unselectAllSelected = () => {
    const drop = new Set((showSelectedSection ? selectedRows : visibleOptions).map((o) => o.value))
    onChange(selected.filter((v) => !drop.has(v)))
  }

  const move = (delta: number) => {
    setNavMode('keyboard')
    if (ringLength === 0) return
    // C.17 — movement WRAPS at both ends and crosses the section divider.
    setActiveIndex(((clampedActive < 0 ? 0 : clampedActive) + delta + ringLength * 2) % ringLength)
  }

  const onSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'Escape':
        // The dropdown is the innermost layer: its Escape must never reach the
        // panel (D-3 — one layer per press). Radix's dismiss layer listens on
        // the document, so stopping React propagation here does not disarm it.
        e.stopPropagation()
        return
      case 'ArrowDown':
        e.preventDefault()
        move(1)
        return
      case 'ArrowUp':
        e.preventDefault()
        move(-1)
        return
      case 'Home':
        e.preventDefault()
        setActiveIndex(0)
        return
      case 'End':
        e.preventDefault()
        setActiveIndex(Math.max(0, ringLength - 1))
        return
      case 'Enter':
        e.preventDefault()
        if (createActive) {
          runCreateFromSearch()
          return
        }
        if (clampedActive >= 0 && clampedActive < navigableRows.length) commit(navigableRows[clampedActive].value)
        return
      case ' ':
        // C.19 — the field doubles as the search input, so Space types a space
        // whenever there is a query and only toggles on an empty one.
        if (query.length > 0) return
        e.preventDefault()
        if (clampedActive >= 0 && clampedActive < navigableRows.length) commit(navigableRows[clampedActive].value)
        return
      default:
    }
  }

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  /* ── date fields are their own control, not a two-layer field ───────── */

  if (facet.kind === 'date') {
    return <FilterDateField facet={facet} value={value} onChange={onChange} disabled={disabled} className={className} />
  }

  /*
   * ── ≤8-option facets render INLINE (UCCP pipeline-actions spec) ────────
   * The dynamic filter rule: an enum facet with 8 or fewer options is a flat
   * checklist group drawn directly in the panel body (label heading + a
   * two-column checkbox grid, counts when `showCounts`), never a dropdown
   * field. `deriveFilterKind` already stamps such facets `checkbox-group`.
   */
  if (facet.kind === 'checkbox-group') {
    return (
      <FilterChecklistGroup
        facet={facet}
        options={options}
        selected={selected}
        onChange={onChange}
        disabled={disabled}
        className={className}
      />
    )
  }

  /* ── trigger summary (E.41/E.42 — `+N` inside the trigger, never a chip row) ── */

  // G.58/M4 — a just-created value has no option yet; it still has to render.
  // Consult the locally remembered create pairs before falling back to the raw
  // id, so a host-returned record id shows the typed name, not the id.
  const selectedOptions = selected.map(
    (id) =>
      options.find((o) => o.value === id) ??
      createdPairs.find((p) => p.value === id) ?? { value: id, label: id },
  )
  const { visible, hiddenCount } = computeOverflow(selectedOptions, {
    maxWidth: effectiveBudget,
    measure: (option) => option.label.length * CHAR_PX,
    gap: 2 * CHAR_PX,
    reserve: OVERFLOW_RESERVE,
    minVisible: 1,
  })
  const labelLine = triggerLabelLine(facet, selected.length)
  const valueLine = selectedOptions.length === 0 ? '' : visible.map((o) => o.label).join(', ')
  const triggerName = selected.length === 0 ? `${facet.label}, no filter applied` : `${labelLine}: ${selectedOptions.map((o) => o.label).join(', ')}`

  const FieldIcon = resolveFilterFieldIcon(facet.icon)

  /** B.11/B.14 — clear THIS field, live (there is no Apply anywhere, G.63). */
  const clearField = () => {
    onChange(multiple ? [] : null)
  }

  /**
   * B.12/B.14 — the field trigger's own keyboard contract. `Enter`/`Space` are
   * the button's native activation (Radix opens on them); the combobox role
   * additionally owes `ArrowDown` and `Alt+ArrowDown`, and a filled field
   * clears on `Backspace`/`Delete`.
   */
  const onTriggerKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!open) setOpen(true)
      setNavMode('keyboard')
      setActiveIndex(0)
      return
    }
    if ((e.key === 'Backspace' || e.key === 'Delete') && selected.length > 0) {
      e.preventDefault()
      clearField()
    }
  }

  const rowDot = (option: FilterOption) =>
    facet.optionDot === 'status' && option.color ? (
      <StatusDot color={option.color} size={14} shape="squircle" />
    ) : null

  /*
   * R-38/DN-30 — an entity facet whose metadata authors a `rowTemplate` draws
   * the RICH row (avatar · name over a `#` id pill · status badge) instead of
   * a bare label, in the compact dropdown as well as in the sheet. The
   * dropdown has no record — only the option — so it reads the template's
   * columns off `option.meta`, which the host's entity adapter fills from the
   * SAME resolved row the sheet renders. Any column the host could not
   * resolve is simply absent, and its element is omitted (never blank).
   */
  const rowTemplate = facet.kind === 'entity' ? resolveRowTemplate(facet) : undefined

  const renderRow = (option: FilterOption, index: number) => {
    const isSelected = selected.includes(option.value)
    return (
      // A pure `aria-activedescendant` listbox (C.16): DOM focus never leaves
      // the search input, so the rows are not tab stops and carry no key
      // handlers of their own.
      // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/interactive-supports-focus
      <div
        key={option.value}
        id={optionDomId(option.value)}
        role="option"
        aria-selected={isSelected}
        data-slot="filter-option"
        data-active={index === clampedActive || undefined}
        data-active-mode={index === clampedActive ? navMode : undefined}
        onMouseMove={() => {
          setNavMode('pointer')
          setActiveIndex(index)
        }}
        onClick={() => commit(option.value)}
        className={cn(
          'flex cursor-default select-none items-center gap-2 rounded-xs px-2 text-sm text-foreground',
          rowTemplate ? 'min-h-14' : 'min-h-10',
          index === clampedActive && 'bg-muted',
          // H.71 — the keyboard ring, drawn only for keyboard navigation.
          index === clampedActive && navMode === 'keyboard' && 'ring-2 ring-inset ring-ring',
        )}
      >
        <span
          data-slot="filter-option-mark"
          aria-hidden
          className={cn(
            'grid size-4 shrink-0 place-items-center border border-border text-caption font-bold text-primary-foreground',
            multiple ? 'rounded-xs' : 'rounded-full',
            isSelected && 'border-primary bg-primary',
          )}
        >
          {isSelected ? '✓' : null}
        </span>
        {rowDot(option)}
        {rowTemplate ? (
          <FilterEntityRow
            template={rowTemplate}
            size="sm"
            fallbackTitle={option.label}
            read={(col) => (col === 'id' ? option.value : (option.meta?.[col] ?? ''))}
          />
        ) : (
          <span className="min-w-0 flex-1 truncate" title={option.label}>
            {option.label}
          </span>
        )}
        {facet.showCounts && typeof option.count === 'number' ? (
          <span
            data-slot="filter-option-count"
            className="shrink-0 rounded-full bg-muted px-1.5 text-caption font-semibold text-muted-foreground"
          >
            {option.count}
          </span>
        ) : null}
      </div>
    )
  }

  /**
   * R-37 / G.57–59 — `Create a new <Entity> as “<query>”`. Wording,
   * `data-slot` and gating mirror ui-kit `Combobox`'s own create branch so the
   * two never drift; the SHEET's empty state renders the same CTA through the
   * same `onCreateFromSearch` seam (FIX WAVE C-2 / P2).
   */
  const createCta = showCreate ? (
    // R-37 / FIX WAVE C-5 / P1 — the CTA is a FULL-WIDTH FILLED BUTTON, not
    // a text link (`filter-behaviour-overview/cta-in-filter-search.png`).
    // The fill is `bg-success`, not the tenant's brand primary: this is the
    // same cross-tenant semantic-success ruling the sheet's `Confirm` already
    // ships (and which round 4 recorded as a PASS), so the two green CTAs of
    // the filter system stay one decision.
    <Button
      type="button"
      variant="primary"
      size="lg"
      id={createDomId}
      // Stays a real <button> (its own role) — `aria-activedescendant` may
      // point at any element inside the controlled region, and G.58 only asks
      // that arrows REACH it and that activating it selects what it creates.
      data-slot="filter-create"
      data-active={createActive || undefined}
      onMouseMove={() => {
        setNavMode('pointer')
        setActiveIndex(navigableRows.length)
      }}
      onClick={runCreateFromSearch}
      className={cn(
        'mt-2 w-full bg-success text-primary-foreground hover:bg-success/90',
        createActive && navMode === 'keyboard' && 'ring-2 ring-inset ring-ring',
      )}
    >
      {`Create a new ${facet.label} as “${trimmedQuery}”`}
    </Button>
  ) : null

  const captionClass = 'sticky top-0 z-10 bg-popover px-2 py-1.5 text-caption font-semibold text-muted-foreground'

  const listBody = (
    <div
      id={listboxId}
      role="listbox"
      aria-label={`${facet.label} options`}
      aria-multiselectable={multiple || undefined}
      data-slot="filter-listbox"
      className="p-1"
    >
      {visibleOptions.length === 0 ? (
        /*
         * R-37 / FIX WAVE C-5 / P1 — the FULL empty state the Figma frame
         * draws: an illustration, `No results found!`, two lines of helper
         * copy, then the CTA. `StatusView kind="empty"` is the platform's one
         * empty-state primitive (icon-in-a-circle + title + description +
         * action) — the CTA sits BELOW it rather than in its `action` slot so
         * it can be full-bleed, which the slot's centred wrapper cannot be.
         */
        <div data-slot="filter-empty" className="px-2 pb-2">
          <StatusView
            kind="empty"
            className="py-6"
            icon={<FileSearch className="size-6" aria-hidden="true" />}
            title="No results found!"
            description={
              showCreate
                ? `Please verify the ${facet.label.toLowerCase()} name or add this as new.`
                : `No ${facet.label.toLowerCase()} matches this search. Try a different term.`
            }
          />
          {createCta}
        </div>
      ) : (
        <>
          {showSelectedSection ? (
            <div role="group" aria-labelledby={captionSelectedId} data-section="selected">
              {/* F.48 — N is the LIVE count even though rows never move. */}
              <div id={captionSelectedId} className={captionClass}>
                Selected ({selected.length})
              </div>
              {selectedRows.map((option, i) => renderRow(option, i))}
            </div>
          ) : null}
          {/* F.54 — exactly one divider, and only between two rendered sections. */}
          {showSelectedSection ? (
            <div data-slot="filter-section-divider" role="presentation" className="my-1 border-t border-border" />
          ) : null}
          {/* G.58 — with results the CTA is still the listbox's FINAL item. */}
          <div role="group" aria-labelledby={captionAvailableId} data-section="available">
            <div id={captionAvailableId} className={captionClass}>
              {showSelectedSection ? `Available (${availableRows.length})` : `Showing ${availableRows.length} items`}
            </div>
            {availableRows.length === 0 ? (
              // F.53 — never a caption over nothing.
              <p className="px-2 py-3 text-center text-sm text-muted-foreground">All options selected</p>
            ) : (
              availableRows.map((option, i) => renderRow(option, showSelectedSection ? selectedRows.length + i : i))
            )}
          </div>
          {createCta ? <div className="px-1 pb-1">{createCta}</div> : null}
        </>
      )}
    </div>
  )

  const tagsBody = (
    <div className="p-2">
      <FilterOptionGroups
        options={orderedOptions}
        value={selected}
        onChange={(next) => onChange(next)}
        sections={splitEnabled ? 'selected-available' : 'flat'}
        selectedIds={snapshot?.membership}
        frozenOrder={snapshot?.order}
      />
    </div>
  )

  return (
    <div role="group" aria-label={facet.label} data-slot="filter-field" data-kind={facet.kind ?? 'multi-select'} className={cn('w-full', className)}>
      <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
        <div className="relative w-full">
        {/*
          2026-09-01 HANDOFF — platform field-states shell: the trigger is an
          `InsetField` (leading type glyph · label-as-placeholder that floats
          to the small caption once something is selected · trailing chevron)
          wrapping a BARE combobox button, per the IconSelect/PhoneInput
          composition convention. The old bespoke two-line anatomy (FIX WAVE
          C-5 V10) is exactly the shell's own DEFAULT/FILLED switch, so the
          `+N` collapsed contract (E.41/E.42) and constant trigger height are
          unchanged. Open-state border colour + flipped chevron (N1/R-39) and
          the `×` clear reservation (B.11/M3, `pe-17`) survive as overrides.
        */}
        <InsetField
          // E.41 reconciled with the field-states shell: the floated caption
          // carries the selection summary ("20 Buckets Selected"); empty, the
          // facet label sits at placeholder position.
          label={selected.length > 0 ? labelLine : facet.label}
          hasValue={selected.length > 0}
          disabled={disabled}
          data-slot="filter-field-shell"
          data-open={open || undefined}
          leadingIcon={<FieldIcon data-slot="filter-field-icon" aria-hidden="true" className="size-5 shrink-0" />}
          trailingIcon={
            <ChevronDown
              aria-hidden="true"
              data-slot="filter-field-chevron"
              className={cn(
                'size-4 shrink-0 transition-transform duration-fast',
                open ? 'rotate-180 text-error-text' : 'text-gray-400',
              )}
            />
          }
          className={cn(
            'cursor-pointer',
            open && 'border-success',
            // B.11 / M3 — room for the absolutely-positioned `×`. INVARIANT:
            // padding >= the clear button's inline extent (`end-7` 28px +
            // `size-10` 40px = 68px = `pe-17`). Change both together.
            selected.length > 0 && 'pe-17',
            disabled && 'pointer-events-none opacity-50',
          )}
          onClick={(e) => {
            // The bare button is the Radix trigger — clicks on it already
            // toggle; only clicks on the rest of the shell are forwarded.
            if (disabled) return
            if ((e.target as HTMLElement).closest('[data-slot="filter-field-trigger"]')) return
            triggerRef.current?.click()
          }}
        >
          <PopoverTrigger asChild>
            <button
              ref={triggerRef}
              type="button"
              role="combobox"
              disabled={disabled}
              aria-expanded={open}
              aria-controls={open ? listboxId : undefined}
              aria-label={triggerName}
              onKeyDown={onTriggerKeyDown}
              data-slot="filter-field-trigger"
              data-open={open || undefined}
              className="w-full bg-transparent text-start outline-none"
            >
              <span
                ref={valueLineRef}
                data-slot="filter-field-value"
                className="flex w-full min-w-0 items-center gap-1 text-sm font-normal text-foreground"
              >
                <span className="min-w-0 flex-1 truncate">{selected.length > 0 ? valueLine : ''}</span>
                {hiddenCount > 0 ? (
                  <span data-slot="filter-field-overflow" className="shrink-0 rounded-full bg-muted px-1.5 text-xs font-semibold text-foreground">
                    +{hiddenCount}
                  </span>
                ) : null}
              </span>
            </button>
          </PopoverTrigger>
        </InsetField>
        {/*
          B.11 — the `×` clear affordance on a FILLED field. It is a sibling of
          the trigger, not a child: a button may not nest inside a button. The
          40px box is the P2 touch target; the paint stays a 16px glyph.
        */}
        {selected.length > 0 && !disabled ? (
          <button
            type="button"
            data-slot="filter-field-clear"
            aria-label={`Clear ${facet.label}`}
            onClick={(e) => {
              e.stopPropagation()
              clearField()
            }}
            // M3 — `end-7` + `size-10` = 68px of inline extent; the trigger
            // reserves exactly that as `pe-17`. Keep the two in step.
            className="absolute end-7 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-xs text-muted-foreground outline-none hover:text-error-text focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        ) : null}
        </div>

        <PopoverContent
          align="start"
          sideOffset={4}
          collisionPadding={16}
          data-slot="filter-dropdown"
          // FIX WAVE C-2 / P0-2 — marks this portalled node as a layer NESTED
          // inside the filter panel. The panel's own dismiss logic ignores any
          // Escape/pointerdown that originates inside a `[data-filter-layer]`,
          // which is what makes each gesture close exactly ONE layer no matter
          // where DOM focus happens to sit (a chip, a row, the search input).
          data-filter-layer="dropdown"
          aria-label={`${facet.label} filter`}
          style={{ minWidth: DROPDOWN_MIN_WIDTH }}
          // FIX WAVE C-2 / P0-1 — the token z-scale. The panel is `z-dropdown`
          // (1000) and this dropdown must paint OVER it; the Expandable
          // Selector sheet (`z-drawer`, 1300) must in turn paint over this.
          // `cn` now resolves `z-*` token conflicts, so this beats the
          // primitive's own `z-popover` default.
          className="z-overlay w-[var(--radix-popover-trigger-width)] p-0"
          onOpenAutoFocus={suspendDismiss ? (e) => e.preventDefault() : undefined}
          onFocusOutside={suspendDismiss ? (e) => e.preventDefault() : undefined}
          onPointerDownOutside={suspendDismiss ? (e) => e.preventDefault() : undefined}
          onInteractOutside={suspendDismiss ? (e) => e.preventDefault() : undefined}
          onEscapeKeyDown={(e) => {
            // While the sheet is up it owns Escape (D-3: innermost layer only).
            if (suspendDismiss) {
              e.preventDefault()
              return
            }
            // C.25 — the FIRST Escape clears a non-empty query and keeps the
            // dropdown open; the second closes it and Radix restores focus to
            // the trigger.
            if (query.length === 0) return
            e.preventDefault()
            setQuery('')
          }}
        >
          <div className="flex items-center gap-1 border-b border-border px-3">
            <input
              type="text"
              role="combobox"
              // The field doubles as the search input (R-36/C.16): focus must
              // move into it as the layer opens or the first keystroke is lost
              // and `aria-activedescendant` has nothing to hang off.
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onSearchKeyDown}
              placeholder={`Search ${facet.label}`}
              aria-label={`Search ${facet.label}`}
              aria-expanded
              aria-autocomplete="list"
              aria-controls={listboxId}
              aria-activedescendant={activeDescendant}
              data-slot="filter-dropdown-search"
              className="h-10 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
            {facet.kind === 'entity' && facet.expandable && onExpand ? (
              <button
                type="button"
                data-slot="filter-expand"
                aria-label={`Open expanded ${facet.label} selection`}
                onClick={() => onExpand(facet)}
                className="grid size-10 shrink-0 place-items-center rounded-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Maximize2 className="size-4" aria-hidden />
              </button>
            ) : null}
          </div>

          {/* C.23 — real buttons, before their section's options, named per
              section so two bare "Select All"s never collide. */}
          {multiple ? (
            <div data-slot="filter-meta-actions" className="flex items-center justify-between gap-2 border-b border-border px-3 py-1.5">
              <button
                type="button"
                data-slot="filter-select-all"
                onClick={selectAllAvailable}
                className="min-h-10 rounded-xs px-1 text-sm font-semibold text-success-text outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Select all available {facet.label}s
              </button>
              <button
                type="button"
                data-slot="filter-unselect-all"
                aria-disabled={selected.length === 0 || undefined}
                onClick={selected.length === 0 ? undefined : unselectAllSelected}
                className="min-h-10 rounded-xs px-1 text-sm font-semibold text-error-text outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Unselect all {selected.length} selected {facet.label}s
              </button>
            </div>
          ) : null}

          {/* E.36 — `min(320px, available)`; the list is the only scroller here. */}
          {/* H.69/H.70 — a real thumb+track node (visible on hover, on
              focus-within and permanently under `(hover: none)`) and a bottom
              fade while there is more list below. */}
          <CustomScrollbar
            className="max-h-80"
            viewportClassName="max-h-80 overscroll-contain"
            bottomFade
            // The rows are not tab stops (C.16), so neither hover NOR
            // focus-within is a signal a keyboard user can produce here.
            keepVisible
          >
            {facet.kind === 'tags' ? tagsBody : listBody}
          </CustomScrollbar>
        </PopoverContent>
      </Popover>
    </div>
  )
}

/* ── date facet — its own field + range/time popup (UCCP pipeline actions) ── */

/** `DateRangeFilterValue` (serializable ISO strings) → the picker's `Date` range. */
function toPickerRange(value: unknown): DateRangePickerValue | undefined {
  if (!isDateRangeFilterValue(value) || !value.from) return undefined
  const from = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value.from) ? `${value.from}T00:00:00` : value.from)
  const to = value.to ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(value.to) ? `${value.to}T00:00:00` : value.to) : undefined
  return { from, to }
}

function toPickerTime(value: unknown): DateRangePickerTime {
  if (!isDateRangeFilterValue(value)) return { start: '', end: '' }
  return { start: value.startTime ?? '', end: value.endTime ?? '' }
}

/** Local calendar day as `yyyy-MM-dd` — never `toISOString()`, which shifts the day across UTC. */
function toLocalDay(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${mm}-${dd}`
}

function serializeDateFilter(
  range: DateRangePickerValue | undefined,
  time: DateRangePickerTime,
): DateRangeFilterValue | null {
  if (!range?.from) return null
  const out: DateRangeFilterValue = { from: toLocalDay(range.from) }
  if (range.to) out.to = toLocalDay(range.to)
  if (time.start) out.startTime = time.start
  if (time.end) out.endTime = time.end
  return out
}

/**
 * FilterDateField — one DATE filter row (UCCP pipeline-actions spec: "each
 * date type gets ITS OWN filter field", opening the range picker WITH the
 * Start/End time inputs — Figma `4FS7S3tHKzZZpdFBA0aGkt` node `6649:24799`:
 * presets rail · dual month/year nav · range calendar · Start/End time ·
 * summary + Cancel/Apply footer, all of which `DateRangePicker` composes).
 *
 * The applied value is the serializable `DateRangeFilterValue` (ISO day
 * strings + `HH:mm` times) so it survives `ViewState`'s JSON round-trip;
 * `applyViewState` does the actual range matching. Apply fires the picker's
 * `onChange(range)` FIRST and `onTimeChange(time)` second (see
 * `DateRangePicker.handleApply`), so the range is staged in a ref and the
 * single upstream `onChange` commit carries both halves.
 */
function FilterDateField({
  facet,
  value,
  onChange,
  disabled,
  className,
}: {
  facet: FilterFacet
  value: unknown
  onChange: (next: unknown) => void
  disabled?: boolean
  className?: string
}) {
  const stagedRange = useRef<DateRangePickerValue | undefined>(undefined)
  const appliedTime = toPickerTime(value)
  return (
    <div
      role="group"
      aria-label={facet.label}
      data-slot="filter-field"
      data-kind="date"
      className={cn('w-full', className)}
    >
      <DateRangePicker
        triggerVariant="inset"
        fieldLabel={facet.label}
        placeholder={`Select ${facet.label}`}
        align="start"
        withTime
        disabled={disabled}
        value={toPickerRange(value)}
        time={appliedTime}
        onChange={(next) => {
          stagedRange.current = next
          onChange(serializeDateFilter(next, appliedTime))
        }}
        onTimeChange={(nextTime) =>
          onChange(serializeDateFilter(stagedRange.current ?? toPickerRange(value), nextTime))
        }
      />
    </div>
  )
}

/* ── ≤8-option facet — the inline checklist group (UCCP pipeline actions) ── */

/**
 * FilterChecklistGroup — an enum facet with 8 or fewer options, rendered flat
 * in the panel body per the reference recording's All Filters overlay: a small
 * muted heading (the facet label) over a two-column grid of checkbox rows,
 * each with an optional record-count pill (`showCounts`). LIVE-APPLY like
 * every other filter control (G.63) — toggling a box commits immediately.
 */
function FilterChecklistGroup({
  facet,
  options,
  selected,
  onChange,
  disabled,
  className,
}: {
  facet: FilterFacet
  options: FilterOption[]
  selected: string[]
  onChange: (next: unknown) => void
  disabled?: boolean
  className?: string
}) {
  const toggle = (optValue: string, checked: boolean) => {
    onChange(checked ? [...selected, optValue] : selected.filter((v) => v !== optValue))
  }
  return (
    <div
      role="group"
      aria-label={facet.label}
      data-slot="filter-field"
      data-kind="checkbox-group"
      data-col={facet.col}
      className={cn('flex w-full flex-col gap-2 py-1', className)}
    >
      <p data-slot="filter-checklist-label" className="text-caption font-semibold text-muted-foreground">
        {facet.label}
      </p>
      <div data-slot="filter-checklist" className="grid grid-cols-2 gap-x-6 gap-y-2.5">
        {options.map((option) => {
          const checked = selected.includes(option.value)
          return (
            <label
              key={option.value}
              data-slot="filter-checklist-option"
              data-value={option.value}
              className={cn(
                'flex cursor-pointer items-center gap-2 text-sm text-foreground',
                disabled && 'pointer-events-none opacity-50',
              )}
            >
              <Checkbox
                aria-label={option.label}
                checked={checked}
                disabled={disabled}
                onCheckedChange={(next) => toggle(option.value, next === true)}
              />
              <span className="min-w-0 flex-1 truncate" title={option.label}>
                {option.label}
              </span>
              {facet.showCounts && typeof option.count === 'number' ? (
                <span
                  data-slot="filter-option-count"
                  className="shrink-0 rounded-full bg-muted px-1.5 text-caption font-semibold text-muted-foreground"
                >
                  {option.count}
                </span>
              ) : null}
            </label>
          )
        })}
      </div>
    </div>
  )
}
