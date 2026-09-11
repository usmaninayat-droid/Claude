import {
  forwardRef,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { cn } from '../lib/cn'
import { Avatar } from '../primitives/Avatar'
import { Badge, type BadgeVariant } from '../primitives/Badge'

/**
 * NotificationCard — one notification in a feed, drawer, or dropdown list.
 * [L3 composite]
 *
 * Merges the reference design system's two competing notification shapes
 * (a plain list-row card and a Figma "bell + meta chips" variant) into one
 * self-contained, borderable card — no enclosing list owns its border
 * (Rule 9: the caller's `Stack gap="field"` supplies spacing between cards,
 * this component supplies its own box). `severity` renders a small status
 * dot only (the Figma variant's leading Bell icon was dropped — severity and
 * "is this from the system" are orthogonal, and a dot keeps the leading
 * slot free for the more common case, an actor `Avatar`). `unread` drives a
 * tint, a bold title, and a small dot beside the timestamp — never color
 * alone (an `sr-only` "Unread" label backs it for assistive tech). `meta`
 * folds in the Figma variant's chip row (ticket key / priority / module tags)
 * as badges rendered next to `source`, sharing the same `Badge` primitive.
 *
 * State-agnostic (Rule 8): pass a pre-formatted `timestamp` — no relative-time
 * computation or read/unread persistence lives here. `onClick` opens the
 * notification; when provided the whole card becomes a keyboard-operable
 * button (Enter/Space), matching `KpiTile`'s clickable pattern.
 *
 * @usage-v5
 *   No dedicated notification-list/card UI exists in the v5 codebase today —
 *   the only "notification" hits are `shared/components/notification/Notification.js`,
 *   a `Quasar Notify.create` toast helper (ephemeral, not a persisted feed item),
 *   and unrelated Quasar `$q.notify` calls scattered across profile tabs.
 *   Zero real usage to consolidate; this ports ahead of demand per the
 *   reference design system + upcoming notification-center work.
 *   Forms needed: severity dot, unread state, optional avatar, optional
 *   source badge + meta-chip row, actions row.
 * @usage-index notification-card
 */
export type NotificationSeverity = 'info' | 'success' | 'warning' | 'error'
export type NotificationMetaTone = 'neutral' | 'info' | 'success' | 'warning' | 'error'

export interface NotificationMetaChip {
  label: ReactNode
  tone?: NotificationMetaTone
  icon?: ReactNode
}

const SEVERITY_DOT_CLASSES: Record<NotificationSeverity, string> = {
  info: 'bg-info',
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-destructive',
}

const META_TONE_VARIANT: Record<NotificationMetaTone, BadgeVariant> = {
  neutral: 'muted',
  info: 'info',
  success: 'success',
  warning: 'warning',
  error: 'destructive',
}

export interface NotificationCardProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'title' | 'onClick'> {
  /** Primary line. */
  title: ReactNode
  /** Secondary line below the title. */
  description?: ReactNode
  /** Pre-formatted by the caller (e.g. `"2h ago"`, `"Jun 3, 14:05"`). */
  timestamp?: ReactNode
  /** Drives a small leading status dot only — no icon swap. */
  severity?: NotificationSeverity
  /** Bold title + tinted surface + a small dot beside the timestamp. */
  unread?: boolean
  /** Leading `Avatar` image source. Omit for no avatar. */
  avatarSrc?: string
  /** Leading `Avatar` display name — also derives the initials fallback. */
  avatarName?: string
  /** Single badge identifying where the notification came from (module, sender). */
  source?: ReactNode
  /** Optional row of tagged chips (ticket key, priority, module…), folded in from the Figma variant. */
  meta?: NotificationMetaChip[]
  /** Buttons/links rendered below `meta`. */
  actions?: ReactNode
  /** Makes the whole card a keyboard-operable button (role="button", Enter/Space). */
  onClick?: () => void
}

export const NotificationCard = forwardRef<HTMLDivElement, NotificationCardProps>(
  (
    {
      className,
      title,
      description,
      timestamp,
      severity,
      unread = false,
      avatarSrc,
      avatarName,
      source,
      meta,
      actions,
      onClick,
      ...props
    },
    ref,
  ) => {
    const clickable = Boolean(onClick)

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
      if (!onClick) return
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        onClick()
      }
    }

    return (
      <div
        ref={ref}
        data-slot="notification-card"
        data-unread={unread || undefined}
        role={clickable ? 'button' : undefined}
        tabIndex={clickable ? 0 : undefined}
        onClick={clickable ? onClick : undefined}
        onKeyDown={clickable ? handleKeyDown : undefined}
        className={cn(
          'flex gap-3 rounded-md border p-4 transition-colors',
          unread ? 'border-primary/20 bg-secondary/40' : 'border-border bg-card',
          clickable &&
            'cursor-pointer outline-none hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring',
          !clickable && 'hover:bg-muted/40',
          className,
        )}
        {...props}
      >
        {severity ? (
          <span
            aria-hidden="true"
            data-slot="notification-severity-dot"
            className={cn('mt-1.5 size-2 shrink-0 rounded-full', SEVERITY_DOT_CLASSES[severity])}
          />
        ) : null}
        {avatarSrc || avatarName ? (
          <Avatar size="sm" src={avatarSrc} name={avatarName} />
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              {unread ? <span className="sr-only">Unread. </span> : null}
              <span
                className={cn(
                  'truncate text-body-sm text-foreground',
                  unread ? 'font-semibold' : 'font-medium',
                )}
              >
                {title}
              </span>
              {source ? (
                <Badge variant="muted" size="xs">
                  {source}
                </Badge>
              ) : null}
            </div>
            {timestamp || unread ? (
              <div className="flex shrink-0 items-center gap-1.5">
                {unread ? (
                  <span
                    aria-hidden="true"
                    data-slot="notification-unread-dot"
                    className="size-1.5 rounded-full bg-primary"
                  />
                ) : null}
                {timestamp ? (
                  <span className="text-caption tabular-nums text-muted-foreground">
                    {timestamp}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
          {description ? (
            <p className="mt-0.5 text-body-sm text-muted-foreground">{description}</p>
          ) : null}
          {meta && meta.length > 0 ? (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {meta.map((chip, index) => (
                <Badge
                  // eslint-disable-next-line react/no-array-index-key -- chips are a static presentational list re-derived from props each render, never reordered by the user.
                  key={index}
                  variant={META_TONE_VARIANT[chip.tone ?? 'neutral']}
                  size="sm"
                >
                  {chip.icon}
                  {chip.label}
                </Badge>
              ))}
            </div>
          ) : null}
          {actions ? (
            <div className="mt-2 flex items-center gap-1.5">{actions}</div>
          ) : null}
        </div>
      </div>
    )
  },
)

NotificationCard.displayName = 'NotificationCard'
