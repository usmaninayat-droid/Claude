import { forwardRef, type HTMLAttributes, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '../lib/cn'

/**
 * ListRow — compact horizontal row for list views (inbox lists, search
 * results, the list rail of a HybridView). Slot-based; the DataTable's
 * lightweight sibling for non-tabular lists.
 *
 * Ported from the GH reference DS `list-row.tsx`, made RTL-safe (logical
 * utilities) and token-only.
 */
/**
 * One label-over-value metadata column, rendered between the title block and
 * the trailing slot. Generic by design (rule 10) — the caller decides what a
 * column means.
 */
export interface ListRowMetaItem {
  /** Stable key; falls back to the item's index. */
  id?: string
  /** Small muted caption above the value. */
  label: ReactNode
  /** Pre-formatted display value (rule 8 — never parsed or formatted here). */
  value: ReactNode
}

export interface ListRowProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Leading slot — avatar, icon, status dot. */
  leading?: ReactNode
  /** Primary line. */
  title?: ReactNode
  /** Secondary line. */
  subtitle?: ReactNode
  /**
   * Chip rendered inside the title block on its own line under `title`
   * (above `subtitle`) — e.g. a severity `Badge`. Kept out of the `title`
   * node itself so the title stays truncatable while the chip never is.
   * Omit for the original title/subtitle block.
   */
  titleBadge?: ReactNode
  /**
   * Metadata columns rendered between the title block and `trailing`, each a
   * small caption over its value, separated from the title block by a
   * vertical rule. Omit for the original two-slot row.
   *
   * The row template is chosen by the CONTAINER's width, not by content
   * length, so every row of one list resolves to the same template:
   *
   * - **≥ 42rem of row width** — the columnar template: leading · title block
   *   (12rem preferred) · meta columns behind a vertical rule · trailing, on
   *   one line, no wrapping.
   * - **narrower** — the stacked template: leading · a block of title, chip,
   *   subtitle, one `LABEL value` line per meta column, then `trailing`. Line
   *   count is `meta.length`, identical for every row, and each value gets the
   *   full row width instead of a ~110px column.
   *
   * Two earlier attempts are why it is a container query. `flex-wrap` on the
   * ROW gave one data shape two layouts (round-2 visual QA #9); moving the
   * wrap INSIDE the meta block fixed the orphaned `trailing` but still let a
   * long address wrap one row and not the next (round-3: measured row heights
   * 150/150/107/107/107/149), and in a ~400px map rail it crushed the title to
   * "Fuel Re…" and the labels to "VE…"/"D…". Neither the chip nor the columns
   * are optional — both are specified — so the fix is to give the row a
   * template that fits the width it actually has.
   */
  meta?: ListRowMetaItem[]
  /** Trailing slot — timestamp, badge, chevron. */
  trailing?: ReactNode
  /** Highlights the row as the current selection. */
  selected?: boolean
  /** @deprecated Use `selected` instead. */
  isSelected?: boolean
  /** Renders the title in a heavier weight to signal an unread item. */
  unread?: boolean
  /** @deprecated Use `unread` instead. */
  isUnread?: boolean
}

export const ListRow = forwardRef<HTMLDivElement, ListRowProps>(
  (
    {
      className,
      leading,
      title,
      subtitle,
      titleBadge,
      meta,
      trailing,
      selected,
      isSelected,
      unread,
      isUnread,
      onClick,
      role,
      tabIndex,
      onKeyDown,
      ...props
    },
    ref,
  ) => {
    // Canonical prop wins when given; the `is`-prefixed alias (deprecated)
    // still works for existing callers — never break, never remove.
    const rowSelected = selected ?? isSelected
    const rowUnread = unread ?? isUnread
    // Interactive rows (onClick, or an explicit role="button") get a visible
    // keyboard-focus ring AND full keyboard operability (Enter/Space → click,
    // role=button + tabIndex). Non-interactive rows are untouched.
    const interactive = Boolean(onClick) || role === 'button'
    const handleKeyDown = interactive
      ? (e: KeyboardEvent<HTMLDivElement>) => {
          onKeyDown?.(e)
          if (!e.defaultPrevented && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault()
            e.currentTarget.click()
          }
        }
      : onKeyDown

    // Only a row that CARRIES meta columns needs the two templates; a plain
    // two-slot row keeps the exact markup it always had, so no existing caller
    // changes shape at any width.
    const columnar = Boolean(meta?.length)

    const titleBlock = (
      <div className={cn('min-w-0 flex-1', columnar && '@2xl/list-row:basis-48')}>
        <div
          className={cn(
            'truncate text-sm text-foreground',
            rowUnread ? 'font-semibold' : 'font-medium',
          )}
        >
          {title}
        </div>
        {titleBadge ? (
          <div data-slot="list-row-title-badge" className="mt-1 flex flex-wrap items-center gap-1">
            {titleBadge}
          </div>
        ) : null}
        {subtitle ? (
          <div className={cn('text-xs text-muted-foreground', columnar ? '@2xl/list-row:truncate' : 'truncate')}>
            {subtitle}
          </div>
        ) : null}
      </div>
    )

    const trailingBlock = trailing ? <div className="shrink-0">{trailing}</div> : null

    return (
      <div
        ref={ref}
        data-slot="list-row"
        data-selected={rowSelected || undefined}
        role={role ?? (onClick ? 'button' : undefined)}
        tabIndex={interactive ? (tabIndex ?? 0) : tabIndex}
        onClick={onClick}
        onKeyDown={handleKeyDown}
        className={cn(
          'group flex items-center gap-3 border-b border-border px-4 py-3 transition-colors last:border-b-0 hover:bg-muted/40',
          // The row is its own query container, so the template below reacts to
          // the width the ROW actually got — a 400px map rail and a 12-column
          // card get different templates from the same component, and every row
          // of one list gets the same one (see `meta`).
          columnar && '@container/list-row items-start @2xl/list-row:items-center',
          // `cursor: pointer` is a promise. A row with no `onClick` and no
          // `role="button"` must not make it (verdict V11 — no affordance
          // without a behaviour behind it).
          interactive && 'cursor-pointer',
          rowSelected && 'bg-secondary/40',
          interactive && 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          className,
        )}
        {...props}
      >
        {leading ? <div className="shrink-0">{leading}</div> : null}
        {columnar ? (
          // `contents` at ≥42rem dissolves this wrapper, so title block, meta
          // and trailing become direct children of the row again — one markup
          // tree, both templates, no duplicated slots.
          <div className="flex min-w-0 flex-1 flex-col gap-1 @2xl/list-row:contents">
            {titleBlock}
            <div
              data-slot="list-row-meta"
              // Narrow: one `LABEL value` line per column, full row width, no
              // truncation. Wide: real columns behind a vertical rule, `min-w-0`
              // (never `shrink-0` — a wider-than-the-row meta block was sliced
              // by the card's `overflow: hidden`) and no wrapping, so the line
              // count cannot depend on the content (verdict V6).
              className={cn(
                'flex min-w-0 flex-col gap-y-0.5',
                '@2xl/list-row:flex-row @2xl/list-row:items-center @2xl/list-row:gap-x-6',
                '@2xl/list-row:border-s @2xl/list-row:border-border @2xl/list-row:ps-4',
              )}
            >
              {meta?.map((item, index) => (
                <div
                  key={item.id ?? index}
                  className="flex min-w-0 items-baseline gap-2 @2xl/list-row:flex-col @2xl/list-row:items-start @2xl/list-row:gap-0"
                >
                  <span className="shrink-0 text-caption font-medium uppercase tracking-wide text-muted-foreground @2xl/list-row:truncate">
                    {item.label}
                  </span>
                  <span className="min-w-0 text-body-sm text-foreground @2xl/list-row:truncate">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
            {trailingBlock}
          </div>
        ) : (
          <>
            {titleBlock}
            {trailingBlock}
          </>
        )}
      </div>
    )
  },
)

ListRow.displayName = 'ListRow'
