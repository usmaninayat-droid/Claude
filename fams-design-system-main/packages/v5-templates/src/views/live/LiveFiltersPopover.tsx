import { useId, useState } from 'react'
import { Filter, Settings, Tag, X } from '@fams/ui-kit/icons'
import { Badge, Button, Checkbox, Input, Popover, PopoverContent, PopoverTrigger, Switch } from '@fams/ui-kit'
import { cn } from '../../lib/cn'
import {
  countActiveLiveFilters,
  orderLiveFilterGroups,
  toggleLiveFilter,
  type LiveFilterGroup,
  type LiveFilterValue,
  type LiveTagGroup,
  type SavedLiveFilter,
} from './live-filter-model'
import { SavedLiveFilters } from './SavedLiveFilters'

/**
 * LiveFiltersPopover — the live-monitoring list panel's "All Filters"
 * popover (figma live-monitoring spec §1.7): funnel trigger with a red
 * active-count badge, Tags multiselect with grouped suggestions, checkbox
 * groups with per-option counts (a group with selections gains a primary
 * count badge and jumps to the top), a saved-filters bookmark dropdown, and
 * Clear all. Fully controlled — `value`/`onChange` round-trip through the
 * hybrid view's state; saved filters persist wherever the caller keeps them
 * (in-memory by default upstream).
 */
export interface LiveFiltersPopoverProps {
  groups: LiveFilterGroup[]
  value: LiveFilterValue
  onChange: (value: LiveFilterValue) => void
  /** Tag suggestion vocabulary; omit to hide the Tags field. */
  tagGroups?: LiveTagGroup[]
  /**
   * Render the header's PRESET actions — the saved-filters bookmark split
   * button and the settings gear. Off by default (designer, round 5): the
   * popover's only header action is `Clear all`. A host that wants presets
   * back opts in; the seams (`onSaveFilter`/`onRenameFilter`/`onDeleteFilter`,
   * `showCounts`) are untouched either way.
   * @default false
   */
  showPresetActions?: boolean
  saved?: SavedLiveFilter[]
  onSaveFilter?: (name: string) => void
  onRenameFilter?: (id: string, name: string) => void
  onDeleteFilter?: (id: string) => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

/**
 * Two-column fill order inside one filter group.
 *
 * 517:8640 is internally INCONSISTENT and this reproduces it rather than
 * imposing a house rule:
 *   - Mobility Status (4): Moving, Idling | Stopped, Non-Reporting - COLUMN-major
 *   - Asset Type (10): five down the left, five down the right - COLUMN-major
 *   - Asset Status (3): Active | In-active, then Disabled - ROW-major
 *   - Fuel Type (3): Petrol | Diesel, then Hybrid - ROW-major
 * SPEC 2.5 lists the options flat and marks a `|` break only for Asset Type,
 * so it cannot settle the odd case; the frame is the only evidence and it
 * splits cleanly on parity.
 */
export function liveFilterColumnMajor(optionCount: number): boolean {
  return optionCount % 2 === 0
}

function TagField({
  tagGroups,
  value,
  onChange,
}: {
  tagGroups: LiveTagGroup[]
  value: LiveFilterValue
  onChange: (value: LiveFilterValue) => void
}) {
  const [query, setQuery] = useState('')
  const inputId = useId()
  const q = query.trim().toLowerCase()
  const suggestions = tagGroups
    .map((group) => ({
      ...group,
      options: group.options.filter((o) => !value.tags.includes(o) && (!q || o.toLowerCase().includes(q))),
    }))
    .filter((group) => group.options.length > 0)
  return (
    <div data-slot="live-filter-tags" className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-caption font-medium text-muted-foreground">
        Tags
      </label>
      {value.tags.length ? (
        <div className="flex flex-wrap gap-1">
          {value.tags.map((tag) => (
            <span
              key={tag}
              title={`Tag: ${tag}`}
              className="inline-flex h-6 items-center gap-1 rounded-xs border border-warning-scale-200 bg-warning-scale-50 ps-2 pe-1 text-caption font-medium text-warning-scale-700"
            >
              {tag}
              <button
                type="button"
                aria-label={`Remove tag ${tag}`}
                onClick={() => onChange({ ...value, tags: value.tags.filter((t) => t !== tag) })}
                className="flex size-5 items-center justify-center rounded-xs outline-none hover:bg-warning-scale-100 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      ) : null}
      <div className="relative">
        <Tag
          aria-hidden="true"
          className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          id={inputId}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Select Tags"
          className="h-8 ps-8"
        />
      </div>
      {q && suggestions.length ? (
        <div className="flex flex-col gap-1 rounded-sm border border-border p-2">
          {suggestions.map((group) => (
            <div key={group.label}>
              <p className="px-1 pb-1 text-caption font-medium uppercase text-muted-foreground">{group.label}</p>
              <div className="flex flex-wrap gap-1">
                {group.options.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      onChange({ ...value, tags: [...value.tags, option] })
                      setQuery('')
                    }}
                    className={
                      group.tone === 'warning'
                        ? 'h-6 rounded-xs border border-warning-scale-200 bg-warning-scale-50 px-2 text-caption font-medium text-warning-scale-700 outline-none hover:bg-warning-scale-100 focus-visible:ring-2 focus-visible:ring-ring'
                        : 'h-6 rounded-xs bg-muted px-2 text-caption font-medium text-muted-foreground outline-none hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring'
                    }
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function LiveFiltersPopover({
  groups,
  value,
  onChange,
  tagGroups = [],
  showPresetActions = false,
  saved = [],
  onSaveFilter,
  onRenameFilter,
  onDeleteFilter,
  open,
  onOpenChange,
}: LiveFiltersPopoverProps) {
  const activeCount = countActiveLiveFilters(value)
  const ordered = orderLiveFilterGroups(groups, value)
  const hasSavedSeam = Boolean(onSaveFilter && onRenameFilter && onDeleteFilter)
  // Header gear → the popover's own display setting (per-option result counts).
  const [showCounts, setShowCounts] = useState(true)

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="tertiary"
          size="icon"
          // 32×32 per Figma, not 38 (visual #35).
          className="relative size-8 shrink-0"
          aria-label={activeCount ? `All filters (${activeCount} active)` : 'All filters'}
        >
          {/* A funnel OUTLINE, not `filter-lines`' three stacked bars (visual #24). */}
          <Filter className="size-4" aria-hidden="true" />
          {activeCount ? (
            <Badge
              variant="destructive"
              solid
              size="xs"
              data-slot="live-filter-count"
              // Negative LOGICAL inset as an inline style, never `-end-1`:
              // negative logical inset utilities are not reliably emitted by
              // a consuming app's Tailwind build and silently fall back to
              // the physical-left default (lane-A root cause, 2026-08-24).
              style={{ insetInlineEnd: '-0.25rem' }}
              className="absolute -top-1 justify-center"
            >
              {activeCount}
            </Badge>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        // SPEC 2.5 / 517:8640 hang the popup off the funnel's inline-end at
        // the list panel's edge (Figma top-left 583,64) so it covers the MAP,
        // not the list it is filtering. Round 3 measured it at 546,96 —
        // bottom-aligned under the funnel, overlaying the rows (visual #6).
        // `side` is physical in Radix; in RTL the collision handler flips it
        // back over the panel edge, which is the mirrored intent.
        side="right"
        align="start"
        sideOffset={6}
        alignOffset={4}
        collisionPadding={16}
        aria-label="All Filters"
        // UX-11 clamping applied to the filter surface: the popover never
        // grows past the space Radix measured, and its BODY takes the
        // overflow as its own scroll (Figma's 449×660–712 popup scrolls
        // internally) — so the last option is always reachable.
        className="flex max-h-[var(--radix-popover-content-available-height)] max-w-[calc(100vw-2rem)] flex-col p-0"
        // SPEC 2.5's 449px popup, inline because load-bearing geometry must
        // not depend on the consuming app emitting an arbitrary width class.
        style={{ width: 449 }}
        data-slot="live-filters-popover"
      >
        {/* Header: title · `Clear all` (red). The bookmark (saved-filter
            presets) and gear (settings) controls SPEC §2.5 drew are opt-in
            behind `showPresetActions` and off by default — the designer's
            round-5 call: the popover's job is filtering, not preset
            management. */}
        <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-3">
          <h2 className="flex-1 text-body-sm font-semibold text-foreground">All Filters</h2>
          {/*
           * `Clear all` (round-3 UX #4). The native `disabled` attribute dimmed
           * the destructive red to #F7A09A = 2.01:1 and gave NO non-colour cue,
           * so the state was unreadable either way. It is now marked inactive
           * with `aria-disabled` + a `cursor-not-allowed` pointer + the reason
           * in `title` — non-colour channels — and keeps the full destructive
           * red so the label stays legible. The click is guarded rather than
           * blocked, so the control still takes focus and can say why it does
           * nothing.
           */}
          <Button
            variant="ghost"
            size="sm"
            // ~20px header controls, not 36 (visual #46).
            className={cn(
              'h-5 px-1 text-caption text-destructive-emphasis hover:text-destructive-emphasis',
              activeCount === 0 && 'cursor-not-allowed',
            )}
            data-slot="live-filters-clear-all"
            aria-disabled={activeCount === 0 || undefined}
            title={activeCount === 0 ? 'No filters to clear' : undefined}
            onClick={() => {
              if (activeCount === 0) return
              onChange({ filters: {}, tags: [] })
            }}
          >
            Clear all
          </Button>
          {showPresetActions && hasSavedSeam ? (
            <SavedLiveFilters
              saved={saved}
              current={value}
              onSave={onSaveFilter!}
              onRename={onRenameFilter!}
              onDelete={onDeleteFilter!}
              onApply={(filter) => onChange(filter.value)}
            />
          ) : null}
          {showPresetActions ? (
            <Popover>
              <PopoverTrigger asChild>
                {/*
                 * A BORDERED radius-8 square button carrying a GEAR — round-4
                 * visual N1. 517:8640 draws two bordered buttons right of
                 * `Clear all` (a save-with-caret and a gear); this one shipped
                 * as a bare `sliders` glyph with no box at all, and SPEC §2.5
                 * and §3.9 both call it "gear button". `Settings2` is lucide's
                 * sliders mark; `Settings` is the cog.
                 */}
                <Button
                  variant="tertiary"
                  size="icon"
                  aria-label="Filter settings"
                  /*
                   * radius-8 per 517:8640 — `rounded-lg` is the 8px step.
                   *
                   * INK WEIGHT (round-5 visual gate V4): the glyph inherited the
                   * button's grey-900 foreground and bottomed out at (16,24,40),
                   * where 517:8640 draws the same two header glyphs at
                   * (150,157,171) / (178,185,198) — two tone steps lighter, and
                   * not downscale blur (genuinely dark text in the same render
                   * reaches (52,64,84)). Figma's own tone is grey-400, which is
                   * 2.58:1 on white and under 1.4.11's 3:1 floor for a control's
                   * glyph, so this lands on `muted-foreground` (grey-500,
                   * 4.05:1) — the lightest token in the ramp that conforms, and
                   * the same call the round-5 UX gate made for the Switch track.
                   */
                  className="size-8 shrink-0 rounded-lg text-muted-foreground"
                >
                  <Settings className="size-4" aria-hidden="true" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" data-slot="live-filter-settings" className="w-56 p-3">
                <div className="flex items-center justify-between gap-2 text-body-sm text-foreground">
                  <span id="live-filter-counts-label">Show result counts</span>
                  <Switch checked={showCounts} onCheckedChange={setShowCounts} aria-labelledby="live-filter-counts-label" />
                </div>
              </PopoverContent>
            </Popover>
          ) : null}
        </div>
        <div
          data-slot="live-filters-body"
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4"
        >
          {tagGroups.length ? <TagField tagGroups={tagGroups} value={value} onChange={onChange} /> : null}
          {/*
           * Figma 517:8640 stacks the GROUPS one per row and splits each
           * group's OPTIONS into two columns (Moving│Stopped, Idling│
           * Non-Reporting) — visual #3. The previous group-per-column layout
           * is what produced the 892px popover with ~340px of dead space in
           * its short column (UX finding 11); balancing inside each group
           * returns it to Figma's 651–712px.
           */}
          <div className="flex flex-col gap-4">
          {ordered.map((group) => {
            const selected = value.filters[group.col] ?? []
            return (
              <fieldset key={group.col} data-slot="live-filter-group" className="flex flex-col gap-1">
                {/* Title Case, never all-caps (visual #4) — the label is the
                    blueprint facet's own wording. */}
                {/* grey-400 `#98A2B3`, not grey-900: the Title-Case fix in the
                    previous round also recoloured the titles to `#101828`
                    (round-2 visual #11 — glyph runs matched to 0.5px, only
                    the colour moved). Figma 517:8640 samples (159,168,183). */}
                <legend className="flex w-full cursor-move items-center gap-2 pb-1 text-caption font-semibold text-gray-400">
                  {group.label}
                  {selected.length ? (
                    <Badge size="xs" className="justify-center">{selected.length}</Badge>
                  ) : null}
                </legend>
                {/*
                 * Fill order comes from `liveFilterColumnMajor` — column-major
                 * for even-count groups, row-major for odd-count ones, which
                 * is what 517:8640 actually draws (round-3 visual #5). Round 2
                 * filled everything row-major; round 3 over-corrected to
                 * column-major everywhere.
                 *
                 * `gridTemplateRows` + `gridAutoFlow: column` is the fill
                 * order, and it is INLINE: a package-authored
                 * `grid-rows-[repeat(5,minmax(0,auto))]` is an arbitrary
                 * value the consuming app's Tailwind build is not guaranteed
                 * to emit, and if it no-ops the whole group collapses into one
                 * row of ten columns.
                 */}
                <div
                  className="grid gap-x-4"
                  style={
                    liveFilterColumnMajor(group.options.length)
                      ? {
                          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                          gridTemplateRows: `repeat(${Math.ceil(group.options.length / 2)}, minmax(0, auto))`,
                          gridAutoFlow: 'column',
                        }
                      : { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }
                  }
                >
                {group.options.map((option) => {
                  const checked = selected.includes(option.value)
                  return (
                    <label
                      key={option.value}
                      title={option.value}
                      className="flex min-h-8 cursor-pointer items-center gap-2 rounded-sm px-1 py-1 text-body-sm text-foreground hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(next) => onChange(toggleLiveFilter(value, group.col, option.value, next === true))}
                      />
                      {/* Count sits INLINE right after the label, not
                          right-aligned at the column edge (visual #46).
                          The label WRAPS rather than truncating: round 1
                          rendered "Inspection Officer Bike" / "Delivery
                          Manager Bike" in full inside the same 441px popover
                          and round 2 clipped them mid-word, which makes two
                          sibling options indistinguishable (visual #12, UX
                          finding 3). `min-h-8` keeps the 32px row floor and
                          the row grows for the wrapped line. */}
                      <span className="min-w-0 break-words">{option.value}</span>
                      {showCounts ? (
                        <span className="shrink-0 text-caption text-muted-foreground">{option.count}</span>
                      ) : null}
                    </label>
                  )
                })}
                </div>
              </fieldset>
            )
          })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

LiveFiltersPopover.displayName = 'LiveFiltersPopover'
