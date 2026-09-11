import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from 'react'
import { ListFilter, X } from '../icons'
import { cn } from '../lib/cn'
import { Popover, PopoverTrigger, PopoverContent } from '../primitives/Popover'
import { Button, type ButtonProps } from '../primitives/Button'
import { Badge } from '../primitives/Badge'

/**
 * FilterPopup — popover CHROME for a "Filters" entry point. [L3 composite]
 *
 * Owns exactly three things: the trigger (Filters button + active-count
 * Badge), the popover shell, and an optional Clear all / Apply footer. The
 * body is `children` — arbitrary filter content: a few checkboxes, a small
 * form, or the DS's own `FilterPanel` for the full faceted-filter experience.
 *
 * `FilterPanel` already ships its own header (title, Clear all, Save,
 * Settings, Close) for the "All Filters" mega-panel case. If you nest
 * `FilterPanel` inside `FilterPopup`, omit `onClearAll`/`onApply` here —
 * otherwise the two clear-all actions and two chrome bars duplicate.
 * `FilterPopup` earns its keep for the lighter case: a plain trigger that
 * needs a count badge wrapping content with no chrome of its own.
 *
 * State-agnostic (Rule 8): `activeCount` and every callback come in via
 * props; no filter logic, fetching, or state lives here.
 *
 * @usage-v5
 *   Retires the identical "outline button + floating q-badge count +
 *   q-popup-proxy" pattern copy-pasted across v5:
 *   - iwmp/components/maps/components/ZonesFilterPanel.vue (L45-78) — filter-
 *     funnel button, `activeFiltersCount` badge, popup with "Clear all
 *     filters" + tag/checkbox content, no Apply (filters live-apply)
 *   - iwmp/components/inspector/planning/EspPlansPanel.vue (L208-234) — byte-
 *     identical trigger/badge/clear-all shape, different filter content
 *   - shared/components/filters/TripFilters.vue (L459-462) — sibling case:
 *     full-width primary "Apply" footer button, no trigger badge shown
 *   Forms needed: trigger label + count badge, popover body slot, optional
 *   clear-all + apply footer (each independently optional, per the two shapes above).
 * @usage-index filter-popup
 */

export interface FilterPopupProps {
  /** Number of active filters, shown as a badge on the trigger. 0/undefined hides it. */
  activeCount?: number
  /** Trigger button label. */
  triggerLabel?: string
  /** Controlled open state. */
  open?: boolean
  /** Uncontrolled initial open state. */
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  /** Popover body — arbitrary filter content (checkboxes, a form, a `FilterPanel`). */
  children: ReactNode
  /** Shows a "Clear all" footer action when provided. */
  onClearAll?: () => void
  clearAllLabel?: string
  /** Shows an "Apply" footer action when provided. Omit for live-filtering UIs. */
  onApply?: () => void
  applyLabel?: string
  /** Trigger button size. */
  size?: 'sm' | 'md' | 'lg'
  /** Trigger button variant, forwarded to `Button`. */
  variant?: ButtonProps['variant']
  disabled?: boolean
  align?: ComponentPropsWithoutRef<typeof PopoverContent>['align']
  /** Class applied to the popover content shell. */
  className?: string
  /** Class applied to the trigger button. */
  triggerClassName?: string
}

export const FilterPopup = forwardRef<HTMLButtonElement, FilterPopupProps>(
  (
    {
      activeCount,
      triggerLabel = 'Filters',
      open,
      defaultOpen,
      onOpenChange,
      children,
      onClearAll,
      clearAllLabel = 'Clear all',
      onApply,
      applyLabel = 'Apply',
      size = 'md',
      variant = 'tertiary',
      disabled,
      align = 'start',
      className,
      triggerClassName,
    },
    ref,
  ) => {
    const hasFooter = Boolean(onClearAll || onApply)

    return (
      <Popover open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            type="button"
            variant={variant}
            size={size}
            disabled={disabled}
            data-slot="filter-popup-trigger"
            className={cn('gap-2', triggerClassName)}
          >
            <ListFilter className="size-4" aria-hidden="true" />
            {triggerLabel}
            {activeCount ? (
              <Badge
                variant="muted"
                size="xs"
                data-slot="filter-popup-count"
                aria-hidden="true"
              >
                {activeCount}
              </Badge>
            ) : null}
          </Button>
        </PopoverTrigger>

        <PopoverContent
          align={align}
          aria-label={triggerLabel}
          data-slot="filter-popup-content"
          className={cn('w-80 p-0', className)}
        >
          <div className="max-h-80 overflow-y-auto p-3">{children}</div>

          {hasFooter ? (
            <div
              className={cn(
                'flex items-center gap-2 border-t border-border p-3',
                onClearAll && onApply ? 'justify-between' : 'justify-end',
              )}
            >
              {onClearAll ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearAll}
                  data-slot="filter-popup-clear"
                >
                  <X className="size-3.5" />
                  {clearAllLabel}
                </Button>
              ) : null}
              {onApply ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={onApply}
                  data-slot="filter-popup-apply"
                >
                  {applyLabel}
                </Button>
              ) : null}
            </div>
          ) : null}
        </PopoverContent>
      </Popover>
    )
  },
)

FilterPopup.displayName = 'FilterPopup'
