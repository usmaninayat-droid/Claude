import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { AlertOctagon, AlertTriangle, CheckCircle2, Info, type LucideIcon, X } from '../icons'
import { cn } from '../lib/cn'

/**
 * Alert — an inline severity banner surfaced at the top of a section, form,
 * or panel. [L3 composite]
 *
 * `severity` drives the default icon and tint (`bg-{severity}/10` +
 * `border-{severity}/30` + `text-{severity}`, or `text-destructive` for
 * `error`) — never a raw hex or inline `color-mix`. Icon is auto-picked per
 * severity and overridable via `icon`. Description content can be passed as
 * `description` or as `children` — both render in the same slot.
 *
 * @usage-v5
 *   Consolidates ad-hoc `q-banner` severity strips, each hand-rolled per
 *   screen with different Quasar color classes:
 *   - iwmp/components/tabs/panels/asset/vehicle/AssetOverview.vue — info banner,
 *     `q-banner rounded` + `fams:info-circle` icon + text + trailing actions
 *   - iwmp/components/tabs/panels/asset/vehicle/WorkforceActivity.vue — warning banner,
 *     `q-banner dense rounded class="bg-orange-1 text-orange-9"` (partial-failure notice)
 *   - iwmp/components/tabs/panels/asset/vehicle/WorkforceInspectorDetails.vue — error banner,
 *     `q-banner class="bg-negative text-white"` (fetch error, plain text only)
 *   Forms needed: severity {info|success|warning|error}, optional title, optional
 *   actions row, optional dismiss — none of the three v5 usages have all four,
 *   they each improvised a subset.
 * @usage-index alert
 */
export type AlertSeverity = 'info' | 'success' | 'warning' | 'error'

const SEVERITY_ICON: Record<AlertSeverity, LucideIcon> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertOctagon,
}

const alertVariants = cva(
  'relative flex items-start gap-inline rounded-md border p-4',
  {
    variants: {
      severity: {
        info: 'bg-info/10 border-info/30 [&_[data-slot=alert-icon]]:text-info',
        success: 'bg-success/10 border-success/30 [&_[data-slot=alert-icon]]:text-success',
        warning: 'bg-warning/10 border-warning/30 [&_[data-slot=alert-icon]]:text-warning',
        error: 'bg-destructive/10 border-destructive/30 [&_[data-slot=alert-icon]]:text-destructive',
      },
    },
    defaultVariants: { severity: 'info' },
  },
)

export interface AlertProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'title'>,
    VariantProps<typeof alertVariants> {
  /** Drives the default icon/tint. */
  severity?: AlertSeverity
  title?: ReactNode
  /** Body copy. `children` is used as a fallback description slot when `description` is omitted. */
  description?: ReactNode
  /** Leading icon element, overriding the severity default. Pass `null` to omit it entirely. */
  icon?: ReactNode
  /** Buttons/links rendered below the description. */
  actions?: ReactNode
  /** Shows a trailing dismiss (×) button when provided. */
  onDismiss?: () => void
  /** Accessible label for the dismiss button. */
  dismissLabel?: string
}

export const Alert = forwardRef<HTMLDivElement, AlertProps>(
  (
    {
      className,
      severity = 'info',
      title,
      description,
      icon,
      actions,
      onDismiss,
      dismissLabel = 'Dismiss',
      children,
      ...props
    },
    ref,
  ) => {
    const Icon = SEVERITY_ICON[severity]
    const body = description ?? children
    const role = severity === 'error' || severity === 'warning' ? 'alert' : 'status'

    return (
      <div
        ref={ref}
        role={role}
        data-slot="alert"
        className={cn(alertVariants({ severity }), className)}
        {...props}
      >
        {icon === null ? null : (
          <span data-slot="alert-icon" className="mt-0.5 shrink-0">
            {icon ?? <Icon className="size-5" />}
          </span>
        )}
        <div className="min-w-0 flex-1">
          {title ? <p className="text-sm font-semibold text-foreground">{title}</p> : null}
          {body ? (
            <div className={cn('text-sm text-muted-foreground', title ? 'mt-1' : undefined)}>
              {body}
            </div>
          ) : null}
          {actions ? <div className="mt-inline flex items-center gap-inline">{actions}</div> : null}
        </div>
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            aria-label={dismissLabel}
            data-slot="alert-dismiss"
            className="-me-1 -mt-1 shrink-0 rounded-xs p-1 text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>
    )
  },
)

Alert.displayName = 'Alert'

export { alertVariants }
