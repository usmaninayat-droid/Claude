import type { ReactNode } from 'react'
import { cn } from '../lib/cn'
import { Tooltip, TooltipTrigger, TooltipContent } from '../primitives/Tooltip'

export interface NoPermissionProps {
  /** Explanation shown in the tooltip on hover/focus. */
  reason?: ReactNode
  /** The control being gated — stays visible, rendered inert. */
  children?: ReactNode
  className?: string
}

/**
 * NoPermission — wraps a single control that should stay VISIBLE but
 * disabled, with a tooltip explaining why (the "shown-disabled-with-reason"
 * case). [L3 composite]
 *
 * For gating an entire surface (a whole tab/page) instead of one control,
 * render `StatusView(kind="no-permission")` — that full-page placeholder used
 * to be this component's `block` variant, now covered by `StatusView` since
 * it shared the same icon+title+description shape as `EmptyState`/`ErrorState`.
 * Which shape to use for a privilege gap is the app's manifest-driven
 * decision; this component never decides that for you.
 *
 * @usage-v5
 *   No dedicated "disabled control with reason" pattern exists in the v5
 *   codebase today — privilege gaps either hide the control silently or
 *   leave it enabled and fail server-side. `NoPermission` is the one
 *   shown-disabled-with-reason shape a privilege-gated action should use.
 * @usage-index no-permission
 */
export function NoPermission({
  reason = 'You don’t have permission to view this.',
  children,
  className,
}: NoPermissionProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          data-slot="no-permission-inline"
          aria-disabled="true"
          className={cn('inline-flex cursor-not-allowed opacity-50', className)}
        >
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent>{reason}</TooltipContent>
    </Tooltip>
  )
}
