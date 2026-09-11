import { useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Check } from '../icons'
import { cn } from '../lib/cn'

/**
 * FilterOptionGroups — categorised, toggleable chip groups for `kind:'tags'`
 * filters (FAMILY C, D-1). [L3 composite]
 *
 * Renders `options` as toggle-button chips, grouped by `category` when any
 * option carries one (R-22) — each group captioned and exposed as
 * `role="group"` (I.78) — or as one flat, uncategorised chip row when none
 * do (the flat variant never renders a caption; colour never stands in for
 * one, R-22/§2#55). Category colour is assigned by the INDEX a category
 * first appears at in the (frozen-ordered) option list, never by category
 * name (J.87) — two modules whose categories share no names still render
 * consistently, and the same name in two modules may legitimately differ.
 *
 * `sections`/`selectedIds`/`frozenOrder` are the same open-time-snapshot
 * contract `Combobox` ships (F.47–F.54): membership into Selected/Available
 * is decided once, at open time, never by the live `value` — untick a chip
 * in Selected and it stays put, unticked, until the consumer takes a fresh
 * snapshot on the next open. Chip/category order is frozen the same way, so
 * nothing ever reflows mid-session (DN-11).
 *
 * Deliberately vocabulary-free: it knows nothing about tags, private/general
 * categories, or any tenant's category list — `category` is opaque caller
 * data (J.87). `color`/`count` on `FilterOptionGroupOption` exist only for
 * SHAPE parity with `ComboOption`/the composer's `FilterOption` (a `tags`
 * `FilterFacet.options[]` is assignable here with no adapter) — this
 * component never reads either: the chip's colour is always the palette
 * assigned to its category, and there is no count affordance on a chip
 * (Combobox's row already renders `count` for non-chip filter kinds).
 *
 * Keyboard: one roving tabindex across every rendered chip, in visual order
 * (Tab enters/leaves the whole group in one stop). Arrow Left/Up and
 * Right/Down move and wrap; Home/End jump to the first/last chip; Space and
 * Enter toggle the focused chip.
 *
 * @usage-index filter-option-groups
 */
export interface FilterOptionGroupOption {
  value: string
  label: string
  /** Category caption. Options sharing a category render together under one
   *  captioned `role="group"` (I.78/R-22). Leave every option's `category`
   *  undefined to render one flat, uncategorised chip row. */
  category?: string
  /** Accepted for shape parity with `ComboOption`/`FilterOption` (D-1) —
   *  NOT read by this component. A chip's colour always comes from the
   *  index-assigned category palette (J.87), never per-option data. */
  color?: string
  /** Accepted for shape parity — NOT rendered. Chips carry no count pill;
   *  `Combobox`'s option row is where `count` renders. */
  count?: number
}

export interface FilterOptionGroupsProps {
  options: FilterOptionGroupOption[]
  /** Controlled selection. */
  value: string[]
  onChange: (value: string[]) => void
  /**
   * `'flat'` (default) — one section, byte-for-byte "just the chips" (grouped
   * by category if any option carries one).
   *
   * `'selected-available'` — the FAMILY C two-section split (F.47–F.54):
   * chips render under a `Selected`/`Available` caption pair, each internally
   * grouped by category the same way. An empty Selected section renders
   * nothing at all (no caption) — F.52 parity.
   */
  sections?: 'flat' | 'selected-available'
  /**
   * OPEN-TIME snapshot of the selection — decides SECTION MEMBERSHIP only,
   * never the tick state (the ✓). Omit to fall back to the live `value`.
   */
  selectedIds?: string[]
  /**
   * OPEN-TIME snapshot of the option ORDER, supplied by the consumer (the
   * view-session hook, D-2). Chips render in exactly this order — this
   * component never sorts on its own, so nothing moves on toggle (F.49/
   * DN-11). Options missing from the snapshot are appended in `options`
   * order; ids with no matching option are ignored.
   */
  frozenOrder?: string[]
  /**
   * Index-assigned category colour palette — an ordered list of
   * `@fams/tokens` `color.accent-family.*` hue names. Categories are
   * coloured by the order they first appear in the frozen option list
   * (J.87), cycling if there are more categories than palette entries.
   * Default: the full accent-family hue set, in token declaration order.
   */
  palette?: string[]
  /** Sticky caption of the Selected section. The live count is appended. Default 'Selected'. */
  selectedCaption?: string
  /** Sticky caption of the Available section. The count is appended. Default 'Available'. */
  availableCaption?: string
  /** Body shown when every option is selected (Available is empty). */
  allSelectedText?: string
  className?: string
}

/** Token order of `color.accent-family.*` (`packages/tokens/tokens/core.tokens.json`). */
const DEFAULT_PALETTE = [
  'cyan',
  'gray-blue',
  'azure',
  'lavender',
  'plum',
  'pink',
  'rose',
  'lime',
  'aqua-green',
  'flame',
  'yellow',
  'bronze',
]

/**
 * Chip geometry: `TagChipList`'s `md` chip SIZE (24px tall, `px-2.5`,
 * `text-xs`, per `qa/UX-NOTES-filters.md` #90/#67 — the platform's one chip
 * system) with ONE deliberate divergence.
 *
 * FIX WAVE C-5 / P2 (V11) — **Figma's filter chips differ from `TagChipList`
 * by design.** SPEC §1.1 draws them as radius-4 rounded RECTANGLES (a small
 * badge), not `TagChipList`'s radius-999 capsule: a filter chip is a
 * selectable control in a grid of controls, a tag chip is a free-floating
 * label. This OVERRIDES FIX WAVE C-3's "byte-equal classes with `TagChipList`"
 * ruling for filter chips only — the shared constant remains the single
 * source of the chip's SIZE, and `FilterOptionGroups.test.tsx` now asserts
 * that intended geometry (size shared, radius intentionally `rounded-sm`)
 * rather than byte-equality with a capsule.
 */
export const FILTER_CHIP_GEOMETRY = 'inline-flex items-center gap-1.5 rounded-sm h-6 px-2.5 text-xs font-medium'

/**
 * H.67 — a 40px POINTER TARGET around a chip that still PAINTS 24px tall.
 * The slop is a `::before` overlay on the chip itself, so the drawn box, the
 * text baseline and the row rhythm are all unchanged while `elementFromPoint`
 * ±20px vertically still lands on the chip. (A padded or `min-h-10` chip would
 * have grown the paint, which V11/§1.1 pins at 24px.) The chip rows carry
 * `gap-y-4` so two stacked hit areas meet rather than overlap.
 */
export const FILTER_CHIP_HIT_AREA =
  "relative before:absolute before:inset-x-0 before:top-1/2 before:h-10 before:-translate-y-1/2 before:content-['']"

function categoryColorVars(hue: string): { backgroundColor: string; color: string } {
  return {
    backgroundColor: `var(--color-accent-family-${hue}-light)`,
    color: `var(--color-accent-family-${hue}-dark)`,
  }
}

function applyFrozenOrder<T extends { value: string }>(options: T[], frozenOrder?: string[]): T[] {
  if (!frozenOrder || frozenOrder.length === 0) return options
  const remaining = new Map(options.map((o) => [o.value, o]))
  const out: T[] = []
  for (const id of frozenOrder) {
    const option = remaining.get(id)
    if (option) {
      out.push(option)
      remaining.delete(id)
    }
  }
  for (const option of options) if (remaining.has(option.value)) out.push(option)
  return out
}

interface CategoryGroup {
  /** `''` for the flat (uncategorised) bucket. */
  key: string
  /** `null` ⇒ no caption/role=group rendered (the flat variant). */
  caption: string | null
  hueIndex: number
  options: FilterOptionGroupOption[]
}

function groupByCategory(
  rows: FilterOptionGroupOption[],
  categoryIndex: Map<string, number>,
  categorized: boolean,
): CategoryGroup[] {
  if (!categorized) {
    return rows.length > 0 ? [{ key: '', caption: null, hueIndex: 0, options: rows }] : []
  }
  const order: string[] = []
  const byKey = new Map<string, FilterOptionGroupOption[]>()
  for (const row of rows) {
    const key = row.category ?? ''
    if (!byKey.has(key)) {
      byKey.set(key, [])
      order.push(key)
    }
    byKey.get(key)!.push(row)
  }
  // R-22/§2#55 — a category with zero members in this section is simply
  // absent from `rows`, so it never reaches this map; nothing to filter.
  return order.map((key) => ({
    key,
    caption: key,
    hueIndex: categoryIndex.get(key) ?? 0,
    options: byKey.get(key)!,
  }))
}

export function FilterOptionGroups({
  options,
  value,
  onChange,
  sections = 'flat',
  selectedIds,
  frozenOrder,
  palette = DEFAULT_PALETTE,
  selectedCaption = 'Selected',
  availableCaption = 'Available',
  allSelectedText = 'All options selected',
  className,
}: FilterOptionGroupsProps) {
  const categorized = options.some((o) => Boolean(o.category))

  const orderedOptions = useMemo(() => applyFrozenOrder(options, frozenOrder), [options, frozenOrder])

  // J.87 — palette assigned by INDEX of first appearance, never by name;
  // computed once off the frozen order so a category's colour never differs
  // between the Selected and Available sections.
  const categoryIndex = useMemo(() => {
    const map = new Map<string, number>()
    let i = 0
    for (const o of orderedOptions) {
      const key = o.category ?? ''
      if (!map.has(key)) {
        map.set(key, i % palette.length)
        i += 1
      }
    }
    return map
  }, [orderedOptions, palette.length])

  // Section MEMBERSHIP comes from the open-time snapshot, tick state from the
  // live `value` — the split that implements F.47 ("the chip does not move").
  const membershipKey = (selectedIds ?? value).join(' ')
  const membership = useMemo(() => new Set(selectedIds ?? value), [membershipKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const selectedRows = sections === 'selected-available' ? orderedOptions.filter((o) => membership.has(o.value)) : []
  const availableRows =
    sections === 'selected-available' ? orderedOptions.filter((o) => !membership.has(o.value)) : orderedOptions

  const selectedGroups = useMemo(
    () => groupByCategory(selectedRows, categoryIndex, categorized),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedRows.map((r) => r.value).join(' '), categoryIndex, categorized],
  )
  const availableGroups = useMemo(
    () => groupByCategory(availableRows, categoryIndex, categorized),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [availableRows.map((r) => r.value).join(' '), categoryIndex, categorized],
  )

  // F.52 — an empty Selected section renders nothing: no caption, no chips.
  const showSelectedSection = sections === 'selected-available' && selectedRows.length > 0
  const showAvailableCaption = sections === 'selected-available'

  // Flattened chip order for roving tabindex — MUST match visual order.
  const flatChips = useMemo(() => {
    const chips: FilterOptionGroupOption[] = []
    if (showSelectedSection) for (const g of selectedGroups) chips.push(...g.options)
    for (const g of availableGroups) chips.push(...g.options)
    return chips
  }, [showSelectedSection, selectedGroups, availableGroups])

  const [activeValue, setActiveValue] = useState<string | null>(null)
  const chipRefs = useRef<Map<string, HTMLButtonElement>>(new Map())

  const activeIndex = useMemo(() => {
    if (flatChips.length === 0) return -1
    const found = activeValue ? flatChips.findIndex((c) => c.value === activeValue) : -1
    return found >= 0 ? found : 0
  }, [flatChips, activeValue])

  const focusChipAt = (index: number) => {
    const chip = flatChips[index]
    if (!chip) return
    setActiveValue(chip.value)
    chipRefs.current.get(chip.value)?.focus()
  }

  const toggle = (optValue: string) => {
    const next = value.includes(optValue) ? value.filter((v) => v !== optValue) : [...value, optValue]
    onChange(next)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (flatChips.length === 0) return
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault()
        focusChipAt((index + 1) % flatChips.length)
        return
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault()
        focusChipAt((index - 1 + flatChips.length) % flatChips.length)
        return
      case 'Home':
        e.preventDefault()
        focusChipAt(0)
        return
      case 'End':
        e.preventDefault()
        focusChipAt(flatChips.length - 1)
        return
      case ' ':
      case 'Enter':
        e.preventDefault()
        setActiveValue(flatChips[index].value)
        toggle(flatChips[index].value)
        return
      default:
    }
  }

  const renderChip = (option: FilterOptionGroupOption, hueIndex: number) => {
    const index = flatChips.findIndex((c) => c.value === option.value)
    const isSelected = value.includes(option.value)
    const hue = palette[hueIndex] ?? palette[0]
    return (
      <button
        key={option.value}
        ref={(el) => {
          if (el) chipRefs.current.set(option.value, el)
          else chipRefs.current.delete(option.value)
        }}
        type="button"
        aria-pressed={isSelected}
        data-slot="filter-chip"
        data-selected={isSelected || undefined}
        tabIndex={index === activeIndex ? 0 : -1}
        onKeyDown={(e) => handleKeyDown(e, index)}
        onClick={() => {
          setActiveValue(option.value)
          toggle(option.value)
        }}
        style={categoryColorVars(hue)}
        className={cn(
          FILTER_CHIP_GEOMETRY,
          FILTER_CHIP_HIT_AREA,
          'outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        )}
      >
        <span className="truncate">{option.label}</span>
        {isSelected ? <Check data-check="" aria-hidden="true" className="size-3 shrink-0" /> : null}
      </button>
    )
  }

  const renderGroup = (group: CategoryGroup, sectionKey: string, groupIndex: number) => {
    const chips = group.options.map((o) => renderChip(o, group.hueIndex))
    if (!group.caption) {
      return (
        <div key={`${sectionKey}-flat`} className="flex flex-wrap gap-x-2 gap-y-4">
          {chips}
        </div>
      )
    }
    const captionId = `filter-option-groups-${sectionKey}-cap-${groupIndex}`
    return (
      <div key={`${sectionKey}-${group.key}`} className="flex flex-col gap-2">
        <p id={captionId} className="text-caption font-semibold text-muted-foreground">
          {group.caption}
        </p>
        <div role="group" aria-labelledby={captionId} className="flex flex-wrap gap-x-2 gap-y-4">
          {chips}
        </div>
      </div>
    )
  }

  return (
    <div data-slot="filter-option-groups" className={cn('flex flex-col gap-3', className)}>
      {showSelectedSection ? (
        <div data-section="selected" className="flex flex-col gap-3">
          <p className="text-caption font-semibold text-muted-foreground">
            {selectedCaption} ({selectedRows.length})
          </p>
          {selectedGroups.map((g, i) => renderGroup(g, 'selected', i))}
        </div>
      ) : null}
      {/* Exactly one divider, only between two rendered sections (F.54 parity). */}
      {showSelectedSection ? (
        <div data-slot="filter-option-groups-divider" role="presentation" className="border-t border-border" />
      ) : null}
      <div data-section="available" className="flex flex-col gap-3">
        {showAvailableCaption ? (
          <p className="text-caption font-semibold text-muted-foreground">
            {availableCaption} ({availableRows.length})
          </p>
        ) : null}
        {showAvailableCaption && availableRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{allSelectedText}</p>
        ) : (
          availableGroups.map((g, i) => renderGroup(g, 'available', i))
        )}
      </div>
    </div>
  )
}
