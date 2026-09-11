import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { ChevronRight } from '../icons'
import { cn } from '../lib/cn'

/**
 * One step in the trail. `href` renders an `<a>`, `onClick` (with no `href`)
 * renders a `<button>`, neither renders a plain `<span>`. The last item in
 * `items` is always treated as the current page regardless of `href`/`onClick`
 * — see `Breadcrumbs`.
 */
export interface BreadcrumbItem {
  label: ReactNode
  href?: string
  onClick?: () => void
}

export interface BreadcrumbsProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  items: BreadcrumbItem[]
  /** Override the default chevron. Custom separators are rendered as-is (no auto RTL flip). */
  separator?: ReactNode
}

/**
 * Breadcrumbs — path trail for nested views (settings, entity drill-downs).
 * [L3 composite]
 *
 * The last item is always the current page: bold, `aria-current="page"`,
 * rendered as a non-interactive `span` even if it was given an `href`/`onClick`.
 * The separator is a directional chevron that flips under `dir="rtl"` via the
 * codebase's established `rtl:-scale-x-100` convention (see `Calendar.tsx`,
 * `DropdownMenu.tsx`) — no separate RTL prop needed.
 *
 * @usage-v5
 *   Only one real usage found: `shared/components/layouts/SettingsLayout.vue`
 *   uses `q-breadcrumbs` + `q-breadcrumbs-el` for a 2-level "Settings / <page>"
 *   trail with a `chevron_right` separator (`packages/shared/components/layouts/SettingsLayout.vue:55-62`).
 *   `pipeline/HierarchicalSelector.vue` has a "Breadcrumb" comment only, no
 *   real breadcrumb markup. Low usage today — flagged in `deviationsFlagged`.
 * @usage-index breadcrumbs
 */
export const Breadcrumbs = forwardRef<HTMLElement, BreadcrumbsProps>(
  ({ className, items, separator, ...props }, ref) => {
    const defaultSeparator = <ChevronRight className="size-3 rtl:-scale-x-100" aria-hidden="true" />
    const sep = separator ?? defaultSeparator

    return (
      <nav
        ref={ref}
        data-slot="breadcrumbs"
        aria-label="Breadcrumb"
        className={cn('flex items-center text-body-sm text-muted-foreground', className)}
        {...props}
      >
        <ol className="flex flex-wrap items-center gap-1.5">
          {items.map((item, index) => {
            const isLast = index === items.length - 1
            return (
              <li key={index} data-slot="breadcrumb-item" className="flex items-center gap-1.5">
                {isLast ? (
                  <span aria-current="page" className="font-semibold text-foreground">
                    {item.label}
                  </span>
                ) : item.href ? (
                  <a
                    href={item.href}
                    onClick={item.onClick}
                    className="rounded-xs outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                  >
                    {item.label}
                  </a>
                ) : item.onClick ? (
                  <button
                    type="button"
                    onClick={item.onClick}
                    className="rounded-xs outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                  >
                    {item.label}
                  </button>
                ) : (
                  <span>{item.label}</span>
                )}
                {!isLast ? (
                  <span data-slot="breadcrumb-separator" aria-hidden="true">
                    {sep}
                  </span>
                ) : null}
              </li>
            )
          })}
        </ol>
      </nav>
    )
  },
)

Breadcrumbs.displayName = 'Breadcrumbs'
