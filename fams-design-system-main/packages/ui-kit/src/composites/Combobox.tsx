import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react'
import { Command } from 'cmdk'
import { Check, ChevronDown, Loader2, Plus, SearchX, X } from '../icons'
import { cn } from '../lib/cn'
import { toArray } from '../lib/toArray'
import { Popover, PopoverAnchor, PopoverTrigger, PopoverContent } from '../primitives/Popover'
import { StatusDot } from './StatusDot'

/**
 * Combobox — the one searchable dropdown in the platform. [L3 composite]
 * Search is built in; there is nothing else to reach for (see `docs/BOUNDARIES.md` L3).
 * Retires the v5 codebase's ~20 forked entity-pickers (EntityLinkingDrawer,
 * VehicleSelector, LotSectorSelector, …) — each becomes this component +
 * a `useEntityPicker` app-layer hook feeding `options`/`loading`/`onSearchChange`.
 *
 * State-agnostic (Rule 8): filters `options` it was GIVEN. Fetching options
 * for an async picker is the caller's hook, never this component's concern.
 */
export interface ComboOption {
  value: string
  label: string
  disabled?: boolean
  group?: string
  meta?: unknown
  /**
   * The next three fields make `ComboOption` STRUCTURALLY IDENTICAL to
   * `FilterOption` in `@fams/v5-composer` (`types.ts`), deliberately
   * duplicated rather than imported: ui-kit (L3) must never depend on the
   * composer (L5) — the layer rule in `docs/BOUNDARIES.md`. A composer
   * `FilterOption[]` is assignable to `ComboOption[]` with no adapter.
   */
  /** Category caption for grouped/categorised filters (`kind: 'tags'`). */
  category?: string
  /** Raw runtime colour from metadata — renders a leading `StatusDot`. */
  color?: string
  /** Record count for this option — renders the trailing count pill. */
  count?: number
}

export interface ComboboxProps {
  /** DOM id for the trigger element — lets a caller's `<label htmlFor>` bind to the real focusable control. */
  id?: string
  /** Always provided by the caller — static list, or the current page from an async hook. */
  options: ComboOption[]
  /** Controlled selection. */
  value: string | string[] | null
  onChange: (value: string | string[] | null) => void
  /** Chips + checkmarks; single value/checkmark otherwise. */
  multiple?: boolean
  /** Controlled query. Omit to let the component manage its own (local-filter mode). */
  query?: string
  /** Presence of this callback means the CALLER owns filtering (async or custom). */
  onSearchChange?: (query: string) => void
  /** Filter `options` against the query locally. Default true; set false when `onSearchChange` refetches. */
  filterLocally?: boolean
  /** Gate results until this many characters are typed. Default 0 (open-list). */
  minChars?: number
  /** Shows a spinner row — set by the caller's async hook. */
  loading?: boolean
  hasError?: boolean
  errorText?: ReactNode
  placeholder?: string
  emptyText?: ReactNode
  disabled?: boolean
  /** Disables unpicked options once reached (multi mode). */
  maxSelected?: number
  /** Custom option row — falls back to `option.label`. */
  renderOption?: (option: ComboOption) => ReactNode
  size?: 'sm' | 'md' | 'lg'
  /** Floating label (Figma fields spec / FAMS portal searchable dropdown,
   *  node 33223:10031): 14px semibold centered while empty & closed, floats
   *  to a 12px caption when open or filled. Switches the trigger to the
   *  h-14 field anatomy. */
  label?: string
  /** Renders the required asterisk next to the floating label. */
  required?: boolean
  /** Hint text under the field — 12px, inset; destructive when `hasError`. */
  hint?: string
  /** Single mode: shows a clear (X) button in the trigger when a value is
   *  selected. Multi mode already clears via each chip's X. */
  clearable?: boolean
  /** Accessible name for the combobox trigger (same convention as DataTable). */
  ariaLabel?: string
  /**
   * Attributes merged onto the trigger element — `className` (merged, not
   * replaced) plus any `data-*` a host surface identifies its controls by.
   * The escape hatch that lets a searchable single-select take the shape of a
   * host's own control (a filter pill, a widget-header select) without forking
   * this component or re-implementing the listbox.
   */
  triggerProps?: HTMLAttributes<HTMLDivElement> & Record<string, unknown>

  /**
   * Grows the popover beyond the trigger to match an OUTER shell (e.g. the
   * `InsetField` box a bare trigger sits inside), so the dropdown menu spans
   * the full field and left-aligns to it (Design System V2 dropdown node
   * 4834:5573) instead of matching the narrower inner trigger. Pass a ref to
   * the shell element; the popover anchors to it and sizes to its width.
   */
  popoverAnchorRef?: RefObject<HTMLElement | null>

  /* ──────────────────────────────────────────────────────────────────────
   * FAMILY C — filter dropdown mode. Every prop below is ADDITIVE and
   * off by default; `sections: 'flat'` is byte-for-byte today's behaviour.
   * ────────────────────────────────────────────────────────────────────── */

  /**
   * `'flat'` (default) — one ungrouped option list, rendered by cmdk exactly
   * as it always has been.
   *
   * `'selected-available'` — the FAMILY C two-section listbox (UX verdicts
   * F.47–F.54): ONE `role="listbox"` containing two `role="group"`s captioned
   * `Selected` / `Available`, separated by exactly one divider. This mode
   * renders its own listbox instead of cmdk's, because the option row's
   * `aria-selected` must mean "is ticked" (C.15) whereas cmdk hard-wires it
   * to "is the active descendant" and does not let a caller override it.
   */
  sections?: 'flat' | 'selected-available'
  /**
   * OPEN-TIME snapshot of the selection — decides SECTION MEMBERSHIP only,
   * never the tick state. That split is what implements F.47: untick a row in
   * `Selected` and it stays exactly where it is, unticked, for the rest of the
   * session; it relocates to `Available` on the next open, when the consumer
   * takes a fresh snapshot. Omit to fall back to the live `value`.
   */
  selectedIds?: string[]
  /**
   * OPEN-TIME snapshot of the option ORDER, supplied by the consumer (the
   * view-session hook, D-2). Rows render in exactly this order; `Combobox`
   * never sorts on its own, so no row ever moves on toggle (F.49/DN-11).
   * Options missing from the snapshot are appended in `options` order; ids
   * with no matching option are ignored.
   */
  frozenOrder?: string[]
  /** Sticky caption of the Selected group. The live count is appended. Default `'Selected'`. */
  selectedCaption?: string
  /** Sticky caption of the Available group. The visible count is appended. Default `'Available'`. */
  availableCaption?: string
  /** Body of an Available group that has no rows left because everything is selected (F.53). */
  allSelectedText?: ReactNode
  /**
   * Enables the create-from-search empty state (G.57–59). Called with the raw
   * query. The CTA is a real `<button>`, is reachable by ArrowDown past the
   * empty list, and is HIDDEN — never disabled — when this prop is absent or
   * the query is whitespace-only.
   */
  onCreateFromSearch?: (query: string) => void
  /** Entity noun for the create CTA's label/accessible name. Default `'option'`. */
  createEntityLabel?: string
  /** Headline of the rich empty state. Default `'No results found!'`. */
  noResultsText?: ReactNode
  /** Accessible name of the option list itself. Default `'Options'`. */
  listAriaLabel?: string
}

const TRIGGER_SIZE: Record<NonNullable<ComboboxProps['size']>, string> = {
  sm: 'h-8 px-2 text-xs',
  md: 'h-9 px-3 text-sm',
  lg: 'h-10 px-4 text-base',
}

export function Combobox({
  id,
  options,
  value,
  onChange,
  multiple = false,
  query: controlledQuery,
  onSearchChange,
  filterLocally = true,
  minChars = 0,
  loading = false,
  hasError = false,
  errorText,
  placeholder = 'Search…',
  emptyText = 'No results',
  disabled = false,
  maxSelected,
  renderOption,
  size = 'md',
  label,
  required = false,
  hint,
  clearable = false,
  ariaLabel,
  triggerProps,
  popoverAnchorRef,
  sections = 'flat',
  selectedIds,
  frozenOrder,
  selectedCaption = 'Selected',
  availableCaption = 'Available',
  allSelectedText = 'All options selected',
  onCreateFromSearch,
  createEntityLabel = 'option',
  noResultsText = 'No results found!',
  listAriaLabel = 'Options',
}: ComboboxProps) {
  const [open, setOpenState] = useState(false)
  const listboxId = useId()
  const hintId = useId()
  const [localQuery, setLocalQuery] = useState('')
  const query = controlledQuery ?? localQuery
  const selected = toArray(value)
  const maxReached = multiple && typeof maxSelected === 'number' && selected.length >= maxSelected

  const setQuery = (q: string) => {
    if (onSearchChange) onSearchChange(q)
    else setLocalQuery(q)
  }

  // Closing always drops the transient filter text, so the next type-to-open
  // seeds a fresh query instead of appending to leftovers (fix3).
  const setOpen = (next: boolean) => {
    setOpenState(next)
    if (!next) setQuery('')
  }

  // `frozenOrder` is the consumer's ORDER SNAPSHOT (F.47/F.49). Applied before
  // filtering so the query never reorders anything either.
  const orderedOptions = useMemo(() => {
    if (!frozenOrder || frozenOrder.length === 0) return options
    const remaining = new Map(options.map((o) => [o.value, o]))
    const out: ComboOption[] = []
    for (const id of frozenOrder) {
      const option = remaining.get(id)
      if (option) {
        out.push(option)
        remaining.delete(id)
      }
    }
    for (const option of options) if (remaining.has(option.value)) out.push(option)
    return out
  }, [options, frozenOrder])

  const visibleOptions = useMemo(() => {
    if (!filterLocally || onSearchChange) return orderedOptions
    const q = query.trim().toLowerCase()
    if (!q) return orderedOptions
    return orderedOptions.filter((o) => o.label.toLowerCase().includes(q))
  }, [orderedOptions, query, filterLocally, onSearchChange])

  const belowMinChars = query.trim().length < minChars
  const selectedOptions = options.filter((o) => selected.includes(o.value))

  const commitSingle = (optValue: string) => {
    onChange(optValue === value ? null : optValue)
    setOpen(false)
  }

  const commitMultiple = (optValue: string) => {
    const next = selected.includes(optValue)
      ? selected.filter((v) => v !== optValue)
      : [...selected, optValue]
    onChange(next)
  }

  const removeChip = (optValue: string) => {
    onChange(selected.filter((v) => v !== optValue))
  }

  /* ── FAMILY C: two-section listbox ─────────────────────────────────── */

  const optionDomId = (value: string) => `${listboxId}-opt-${value}`
  const createDomId = `${listboxId}-create`
  const selectedCaptionId = `${listboxId}-cap-selected`
  const availableCaptionId = `${listboxId}-cap-available`

  // Section MEMBERSHIP comes from the open-time snapshot, tick state from the
  // live `value` — that split is F.47 ("the row does not move").
  const membership = useMemo(() => new Set(selectedIds ?? selected), [selectedIds, selected.join('\u0000')]) // eslint-disable-line react-hooks/exhaustive-deps

  const selectedRows = useMemo(
    () => (sections === 'flat' ? [] : visibleOptions.filter((o) => membership.has(o.value))),
    [sections, visibleOptions, membership],
  )
  const availableRows = useMemo(
    () => (sections === 'flat' ? visibleOptions : visibleOptions.filter((o) => !membership.has(o.value))),
    [sections, visibleOptions, membership],
  )
  // F.52 — an empty `Selected` section is not rendered at all (no caption, no
  // divider): the dropdown falls back to the flat single-section look.
  const showSelectedSection = sections === 'selected-available' && selectedRows.length > 0

  const trimmedQuery = query.trim()
  // G.59 — hidden, never disabled, when unconfigured or for a whitespace query.
  const showCreate =
    Boolean(onCreateFromSearch) && trimmedQuery.length > 0 && visibleOptions.length === 0 && !loading && !belowMinChars
  const createLabel = `Create a new ${createEntityLabel} as \u201c${trimmedQuery}\u201d`

  const navigableRows = showSelectedSection ? [...selectedRows, ...availableRows] : availableRows
  const navigableCount = navigableRows.length + (showCreate ? 1 : 0)

  const [activeIndex, setActiveIndex] = useState(0)
  const listRef = useRef<HTMLDivElement | null>(null)

  // C.20 — search resets the active option to the first match; there is no
  // second, first-letter type-ahead model layered on top of it.
  useEffect(() => {
    setActiveIndex(0)
  }, [query, open])

  const clampedActive = navigableCount === 0 ? -1 : Math.min(activeIndex, navigableCount - 1)
  const activeDescendant =
    clampedActive < 0
      ? undefined
      : clampedActive < navigableRows.length
        ? optionDomId(navigableRows[clampedActive].value)
        : createDomId

  useEffect(() => {
    if (!activeDescendant) return
    const el = listRef.current?.ownerDocument.getElementById(activeDescendant)
    // jsdom implements no layout, so `scrollIntoView` is absent there.
    if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'nearest' })
  }, [activeDescendant])

  const isRowDisabled = (option: ComboOption) =>
    Boolean(option.disabled) || (maxReached && !selected.includes(option.value))

  const activateIndex = (index: number) => {
    if (index < 0) return
    if (index >= navigableRows.length) {
      if (showCreate) onCreateFromSearch?.(query)
      setOpen(false)
      return
    }
    const option = navigableRows[index]
    if (isRowDisabled(option)) return
    if (multiple) commitMultiple(option.value)
    else commitSingle(option.value)
  }

  const move = (delta: number) => {
    if (navigableCount === 0) return
    // C.17 — movement WRAPS at both ends.
    setActiveIndex(((clampedActive < 0 ? 0 : clampedActive) + delta + navigableCount * 2) % navigableCount)
  }

  /** Visible row count, for PageUp/PageDown (C.17). 0 under jsdom → the fallback. */
  const pageSize = () => {
    const el = listRef.current
    const first = el?.querySelector('[role="option"]') as HTMLElement | null
    const rowHeight = first?.offsetHeight || 0
    const viewport = el?.clientHeight || 0
    return rowHeight > 0 && viewport > 0 ? Math.max(1, Math.floor(viewport / rowHeight)) : 5
  }

  const handleListKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
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
        setActiveIndex(Math.max(0, navigableCount - 1))
        return
      case 'PageDown':
        e.preventDefault()
        move(pageSize())
        return
      case 'PageUp':
        e.preventDefault()
        move(-pageSize())
        return
      case 'Enter':
        // C.18/C.19 — Enter ALWAYS toggles (multi) / selects and closes (single).
        e.preventDefault()
        activateIndex(clampedActive)
        return
      case ' ':
        // C.19 — the field doubles as the search input, so Space toggles ONLY
        // on an empty query; with text typed it must type a space.
        if (query.length > 0) return
        e.preventDefault()
        activateIndex(clampedActive)
        return
      default:
    }
  }

  /**
   * The default option row: leading `StatusDot` when the option carries a
   * runtime `color`, the label, then the count pill when it carries a `count`.
   * The dot is `aria-hidden` and the label always renders beside it (I.77).
   */
  const optionContent = (option: ComboOption): ReactNode => {
    if (renderOption) return renderOption(option)
    if (!option.color && typeof option.count !== 'number') return option.label
    return (
      <span className="flex min-w-0 flex-1 items-center gap-2">
        {option.color ? <StatusDot color={option.color} size={14} shape="squircle" /> : null}
        <span className="min-w-0 flex-1 truncate">{option.label}</span>
        {typeof option.count === 'number' ? (
          <span
            data-slot="combobox-count"
            className="shrink-0 rounded-full bg-muted px-1.5 text-caption font-semibold text-muted-foreground"
          >
            {option.count}
          </span>
        ) : null}
      </span>
    )
  }

  const renderRow = (option: ComboOption, index: number) => {
    const isSelected = selected.includes(option.value)
    const disabledRow = isRowDisabled(option)
    return (
      // The rows are a pure `aria-activedescendant` listbox (C.16): DOM focus
      // stays on the search input for the whole life of the layer and the rows
      // themselves are never tab stops or key targets. Both rules below assume
      // the roving-tabindex pattern instead, which this layer deliberately is
      // not — the keyboard contract lives on the input, in `handleListKeyDown`.
      // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/interactive-supports-focus
      <div
        key={option.value}
        id={optionDomId(option.value)}
        role="option"
        aria-selected={isSelected}
        aria-disabled={disabledRow || undefined}
        data-slot="combobox-option"
        data-active={index === clampedActive || undefined}
        onMouseMove={() => setActiveIndex(index)}
        onClick={() => activateIndex(index)}
        className={cn(
          'flex cursor-default select-none items-center gap-2 rounded-xs px-2 py-1.5 text-sm text-foreground outline-none',
          index === clampedActive && 'bg-muted',
          disabledRow && 'pointer-events-none opacity-50',
        )}
      >
        <span className="flex size-4 shrink-0 items-center justify-center">
          {isSelected ? <Check className="size-4" /> : null}
        </span>
        <span className="min-w-0 flex-1 truncate">{optionContent(option)}</span>
      </div>
    )
  }

  const captionClass =
    'sticky top-0 z-10 bg-popover px-2 py-1.5 text-caption font-semibold text-muted-foreground'

  const createCta = showCreate ? (
    <button
      type="button"
      id={createDomId}
      data-slot="combobox-create"
      // G.58 — a real button, in the arrow order past the (empty) list and in
      // tab order. I.80 — brand green as TEXT uses the `success-text` role
      // token, never the raw brand hex.
      onClick={() => activateIndex(navigableRows.length)}
      className={cn(
        'flex w-full items-center justify-center gap-2 rounded-xs px-2 py-2 text-sm font-semibold text-success-text outline-none',
        clampedActive === navigableRows.length && 'bg-muted',
        'focus-visible:ring-2 focus-visible:ring-ring',
      )}
    >
      <Plus className="size-4 shrink-0" aria-hidden />
      {createLabel}
    </button>
  ) : null

  /** G.57 — never a bare "no results" text row. */
  const richEmptyState = (
    <div data-slot="combobox-empty" data-state="empty" className="flex flex-col items-center gap-1 px-2 py-6 text-center">
      <SearchX className="size-8 text-muted-foreground" aria-hidden />
      <p className="text-sm font-semibold text-foreground">{noResultsText}</p>
      <p className="text-xs text-muted-foreground">Try a different search term.</p>
      {createCta}
    </div>
  )

  const sectionedList = (
    <div
      ref={listRef}
      id={listboxId}
      role="listbox"
      aria-label={listAriaLabel}
      aria-multiselectable={multiple || undefined}
      aria-busy={loading || undefined}
      data-slot="combobox-listbox"
      className="max-h-64 overflow-y-auto p-1"
    >
      {belowMinChars ? (
        <div className="px-2 py-4 text-center text-sm text-muted-foreground">
          Type {minChars - trimmedQuery.length} more character{minChars - trimmedQuery.length === 1 ? '' : 's'}…
        </div>
      ) : loading && visibleOptions.length === 0 ? (
        <div className="px-2 py-4 text-center text-sm text-muted-foreground">Loading…</div>
      ) : visibleOptions.length === 0 ? (
        onCreateFromSearch ? (
          richEmptyState
        ) : (
          <div data-slot="combobox-empty" data-state="empty" className="px-2 py-4 text-center text-sm text-muted-foreground">
            {emptyText}
          </div>
        )
      ) : (
        <>
          {showSelectedSection ? (
            <div role="group" aria-labelledby={selectedCaptionId} data-section="selected">
              {/* F.48 — N is the LIVE count even though rows never move. */}
              <div id={selectedCaptionId} className={captionClass}>
                {selectedCaption} ({selected.length})
              </div>
              {selectedRows.map((option, i) => renderRow(option, i))}
            </div>
          ) : null}
          {/* F.54 — exactly one divider, and only between two rendered sections. */}
          {showSelectedSection ? (
            <div data-slot="combobox-section-divider" role="presentation" className="my-1 border-t border-border" />
          ) : null}
          <div role="group" aria-labelledby={availableCaptionId} data-section="available">
            {sections === 'selected-available' ? (
              <div id={availableCaptionId} className={captionClass}>
                {availableCaption} ({availableRows.length})
              </div>
            ) : null}
            {availableRows.length === 0 ? (
              // F.53 — never a caption over nothing.
              <p className="px-2 py-3 text-center text-sm text-muted-foreground">{allSelectedText}</p>
            ) : (
              availableRows.map((option, i) => renderRow(option, showSelectedSection ? selectedRows.length + i : i))
            )}
          </div>
        </>
      )}
    </div>
  )

  const sectionedBody = (
    <div data-slot="combobox-sectioned">
      <div className="flex items-center border-b border-border px-3">
        <input
          type="text"
          role="combobox"
          // The field IS the search input (R-36/C.16): opening the layer must
          // put the caret in it, or the first keystroke is lost and there is
          // nothing for `aria-activedescendant` to hang off. This is the
          // documented exception the rule exists to protect — focus moving
          // INTO a just-opened overlay, not a page stealing focus on load.
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleListKeyDown}
          placeholder={placeholder}
          aria-expanded
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-activedescendant={activeDescendant}
          data-slot="combobox-search"
          className="h-9 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
        {loading ? (
          <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" data-motion="essential" />
        ) : null}
      </div>
      {sectionedList}
    </div>
  )

  // The trigger is a div, not a <button>: in multiple mode it contains one
  // real <button> per chip (to remove it), and a <button> cannot legally
  // contain another <button>. role="combobox" + explicit key handling keeps
  // it keyboard-operable without that invalid nesting.
  const handleTriggerKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      setOpen(true)
      return
    }
    // Searchable-by-itself (FAMS portal spec): typing on the closed field
    // opens the list and seeds the filter with the typed character — the
    // popover's search input takes focus and continues the query.
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault()
      setQuery(query + e.key)
      setOpen(true)
    }
  }

  const control = (
    <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
      {popoverAnchorRef ? (
        // Radix's `virtualRef` wants a non-null `RefObject<Measurable>`; a real
        // element ref (current: HTMLElement | null) satisfies it at runtime —
        // Radix guards the null internally — so cast past the nullability.
        // Keyed by `open` — same re-registration fix as IconSelect: a virtual
        // anchor only registers when its ref value CHANGES, so a stale anchor
        // from the trigger's own mount/unmount race would otherwise stick.
        <PopoverAnchor key={open ? 'open' : 'closed'} virtualRef={popoverAnchorRef as RefObject<HTMLElement>} />
      ) : null}
      <PopoverTrigger asChild>
        <div
          id={id}
          role="combobox"
          tabIndex={disabled ? -1 : 0}
          aria-label={ariaLabel}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-required={required || undefined}
          aria-describedby={hint ? hintId : undefined}
          aria-disabled={disabled || undefined}
          onKeyDown={handleTriggerKeyDown}
          data-slot="combobox-trigger"
          {...triggerProps}
          className={cn(
            'flex w-full min-w-0 items-center justify-between gap-2 rounded-sm border border-border bg-input-background text-start text-foreground outline-none',
            label
              ? cn(
                  'relative h-14 px-3 pb-1.5 pt-6 text-sm font-semibold',
                  open &&
                    (hasError
                      ? 'border-destructive ring-1 ring-inset ring-destructive'
                      : 'border-primary ring-1 ring-inset ring-primary'),
                )
              : TRIGGER_SIZE[size],
            // Keyboard ring is `:focus-visible` (fix3); mouse keeps border-primary.
            'focus:border-primary focus-visible:ring-2 focus-visible:ring-ring',
            disabled && 'pointer-events-none cursor-not-allowed opacity-50',
            hasError && 'border-destructive focus-visible:ring-destructive',
            triggerProps?.className as string | undefined,
          )}
        >
          {label ? (
            <span
              data-label
              className={cn(
                'pointer-events-none absolute start-3 flex items-center gap-1 font-semibold transition-all duration-fast',
                hasError ? 'text-destructive-emphasis' : 'text-muted-foreground',
                open || selected.length > 0
                  ? 'top-[9px] text-xs'
                  : 'top-1/2 -translate-y-1/2 text-sm',
              )}
            >
              {label}
              {required ? <span aria-hidden className="text-xs font-medium text-destructive-emphasis">*</span> : null}
            </span>
          ) : null}
          {multiple && selectedOptions.length > 0 ? (
            <span className="flex min-w-0 flex-1 flex-wrap items-center gap-inline">
              {selectedOptions.map((o) => (
                <span
                  key={o.value}
                  data-slot="combobox-chip"
                  className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground"
                >
                  {o.label}
                  <button
                    type="button"
                    aria-label={`Remove ${o.label}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      removeChip(o.value)
                    }}
                    className="grid place-items-center rounded-full text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </span>
          ) : (
            <span
              className={cn(
                'min-w-0 flex-1 truncate',
                selected.length === 0 && 'text-muted-foreground',
                label && !open && selected.length === 0 && 'opacity-0',
              )}
            >
              {!multiple && selectedOptions[0]
                ? selectedOptions[0].label
                : placeholder}
            </span>
          )}
          {clearable && !multiple && selected.length > 0 && !disabled ? (
            <button
              type="button"
              aria-label="Clear selection"
              onClick={(e) => {
                e.stopPropagation()
                onChange(null)
                setQuery('')
              }}
              className="grid shrink-0 place-items-center rounded-full text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-4" />
            </button>
          ) : null}
          {/* Single chevron-down that flips to chevron-up when open (Design
              System V2 dropdown node 4834:5573/5641) — one consistent dropdown
              affordance across every Combobox. */}
          <ChevronDown
            className={cn('size-4 shrink-0 opacity-50 transition-transform duration-fast', open && 'rotate-180')}
          />
        </div>
      </PopoverTrigger>

      <PopoverContent
        aria-label="Options"
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
        // C.25 — in filter-dropdown mode the FIRST Escape clears a non-empty
        // query and keeps the layer open; the second falls through to Radix,
        // which closes it and restores focus to the trigger (A.4/D-3). Handled
        // here rather than on the input because Radix's dismiss layer listens
        // for `keydown` on the document in the CAPTURE phase — it always runs
        // first, so it cannot be out-stopped from below.
        onEscapeKeyDown={(e) => {
          if (sections !== 'selected-available' && !onCreateFromSearch) return
          if (query.length === 0) return
          e.preventDefault()
          setQuery('')
        }}
      >
        {hasError && errorText ? (
          <div className="px-3 py-2 text-sm text-destructive-emphasis">{errorText}</div>
        ) : sections === 'selected-available' || onCreateFromSearch ? (
          sectionedBody
        ) : (
          <Command shouldFilter={false} data-slot="combobox-command">
            <div className="flex items-center border-b border-border px-3">
              <Command.Input
                value={query}
                onValueChange={setQuery}
                placeholder={placeholder}
                className="h-9 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
              {loading ? <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" data-motion="essential" /> : null}
            </div>
            <Command.List id={listboxId} className="max-h-64 overflow-y-auto p-1">
              {belowMinChars ? (
                <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                  Type {minChars - query.trim().length} more character{minChars - query.trim().length === 1 ? '' : 's'}…
                </div>
              ) : loading && visibleOptions.length === 0 ? (
                <div className="px-2 py-4 text-center text-sm text-muted-foreground">Loading…</div>
              ) : visibleOptions.length === 0 ? (
                <Command.Empty className="px-2 py-4 text-center text-sm text-muted-foreground">
                  {emptyText}
                </Command.Empty>
              ) : (
                visibleOptions.map((option) => {
                  const isSelected = selected.includes(option.value)
                  const isDisabled = option.disabled || (maxReached && !isSelected)
                  return (
                    <Command.Item
                      key={option.value}
                      value={option.value}
                      disabled={isDisabled}
                      onSelect={() => (multiple ? commitMultiple(option.value) : commitSingle(option.value))}
                      className={cn(
                        'flex cursor-default select-none items-center gap-2 rounded-xs px-2 py-1.5 text-sm text-foreground outline-none',
                        'data-[selected=true]:bg-muted',
                        isDisabled && 'pointer-events-none opacity-50',
                      )}
                    >
                      <span className="flex size-4 items-center justify-center">
                        {isSelected ? <Check className="size-4" /> : null}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{optionContent(option)}</span>
                    </Command.Item>
                  )
                })
              )}
            </Command.List>
          </Command>
        )}
      </PopoverContent>
    </Popover>
  )
  if (!hint) return control
  return (
    <div className="flex w-full flex-col gap-1">
      {control}
      <p
        id={hintId}
        role={hasError ? 'alert' : undefined}
        className={cn('ps-4 text-xs font-medium', hasError ? 'text-destructive-emphasis' : 'text-muted-foreground')}
      >
        {hint}
      </p>
    </div>
  )
}
