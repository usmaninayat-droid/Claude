import { Maximize, Minimize } from '../icons'
import { cn } from '../lib/cn'

/**
 * DataTableColumnControls — the two small header-edge controls
 * text-truncation.md §7 adds for pointer/keyboard users: a click-to-expand
 * toggle and a drag/keyboard-resize handle. [internal to DataTable — not
 * part of the public component surface, same convention as
 * `DataTableGroupHeaderRow`]
 */

interface ExpandColumnToggleProps {
  isExpanded: boolean
  onToggle: () => void
  label: string
}

/**
 * §7's web "small expand affordance at the column header edge" — the
 * one-click shortcut alongside drag-resize. Icon-only, so it carries an
 * accessible name AND a hover/focus tooltip (UX K.67, same convention as
 * the trailing `IconControl` gear button); revealed on hover/focus via the
 * SAME recipe as the header's own sort-hint arrow (`opacity-0` at rest,
 * `group-hover/group-focus-visible` reveal, `hover:none` fallback for
 * coarse pointers) so it adds zero visual weight at rest — the styling
 * constraint this task is scoped to. The `-m-1.5`/`p-1.5` pair is a hit-
 * slop that keeps the header row's own layout byte-identical (negative
 * margin cancels the padding it needs to size the button); the `::before`
 * pushes the actual tap target further, to the ~44px touch-target minimum,
 * via an INVISIBLE, absolutely-positioned box that (like `position:
 * absolute` generally) never affects surrounding layout or the button's
 * own visible footprint — the same "hit area, not visual size" technique
 * `ColumnResizeHandle` uses, and the one exception the task calls out
 * ("e.g. a resize handle hit area").
 */
export function ExpandColumnToggle({ isExpanded, onToggle, label }: ExpandColumnToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={label}
      aria-label={label}
      aria-pressed={isExpanded}
      className={cn(
        '-m-1.5 relative inline-flex shrink-0 items-center justify-center rounded-xs p-1.5 text-muted-foreground opacity-0 outline-none transition-opacity',
        'before:absolute before:-inset-2.5 before:content-[""]',
        'hover:bg-muted/50 hover:text-foreground hover:opacity-100',
        'focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring',
        'group-hover/col-header:opacity-100 group-focus-visible/col-header:opacity-100',
        '[@media(hover:none)]:opacity-50',
        isExpanded && 'opacity-100 text-foreground',
      )}
    >
      {isExpanded ? <Minimize className="size-3" /> : <Maximize className="size-3" />}
    </button>
  )
}

interface ColumnResizeHandleProps {
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void
  onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void
  label: string
  valueNow: number
  valueMin: number
}

/**
 * The standard drag-to-resize column border (§7's "fine-grained" pointer
 * interaction, `useDataTableColumnResize`'s `beginResize`/`stepResize`).
 * APG "Window Splitter" pattern: a focusable `role="separator"` exposing
 * its current width via `aria-valuenow`, keyboard-operable via
 * ArrowLeft/ArrowRight (wired by the caller's `onKeyDown`) — drag is never
 * the only way to resize.
 *
 * The visual divider stays a hairline (`w-px`, unchanged) — only the HIT
 * AREA widens, via an invisible `::before` extending `-1.5` on each side,
 * the same "resize handle hit area" exception the task names explicitly.
 */
export function ColumnResizeHandle({
  onPointerDown,
  onKeyDown,
  label,
  valueNow,
  valueMin,
}: ColumnResizeHandleProps) {
  /* `role="separator"` is APG's own "Window Splitter" pattern — a focusable,
     keyboard-resizable separator is the SPEC, not a misuse of a
     non-interactive role (same exception `DataTableStackedRow.tsx`'s
     `role="listitem"` documents for its own onKeyDown/tabIndex). */
  /* eslint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */
  return (
    <div
      role="separator"
      aria-label={label}
      aria-orientation="vertical"
      aria-valuenow={Math.round(valueNow)}
      aria-valuemin={valueMin}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      className={cn(
        'absolute inset-y-0 end-0 z-10 w-px cursor-col-resize touch-none select-none outline-none',
        'before:absolute before:-inset-x-1.5 before:inset-y-0 before:content-[""]',
        'hover:bg-ring focus-visible:bg-ring focus-visible:ring-2 focus-visible:ring-ring',
      )}
    />
  )
  /* eslint-enable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */
}
