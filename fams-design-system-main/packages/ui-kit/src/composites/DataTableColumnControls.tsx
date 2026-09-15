import { cn } from '../lib/cn'

/**
 * DataTableColumnControls — the small header-edge control text-truncation.md
 * §7 adds for pointer/keyboard users: a drag/keyboard-resize handle. [internal
 * to DataTable — not part of the public component surface, same convention as
 * `DataTableGroupHeaderRow`]
 *
 * Historical note: this file also used to export `ExpandColumnToggle`, a
 * hover-revealed Maximize/Minimize icon-button that let a pointer user
 * expand a truncated column in-place. That affordance was removed globally
 * (it added visual noise on every column header and duplicated what the
 * resize handle below already provides). The double-tap-to-expand touch
 * gesture on the header still works via `useDataTableColumnExpansion`.
 */

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
