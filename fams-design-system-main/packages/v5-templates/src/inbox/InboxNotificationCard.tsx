import { memo, type ReactNode } from 'react'
import { Activity, Bell, Check, ClipboardCheck, Clock, Flag, Hash } from '@fams/ui-kit/icons'
import { Avatar } from '@fams/ui-kit'
import { cn } from '../lib/cn'
import type { InboxNotification, InboxNotificationKind } from './types'

/**
 * InboxNotificationCard — one inbox feed card (specs/inbox SPEC §Notification
 * card). [tier-2]
 *
 * Anatomy: 28px icon container (or avatar for mentions) · content block
 * (14px semibold title, 12px single-line snippet, chip row) · right-aligned
 * timestamp container (7px unread dot + time, hover/focus-revealed "Clear").
 *
 * Interaction (UX-NOTES §4): the WHOLE card is one click target opening the
 * record — implemented as a stretched title button (`after:inset-0`) so the
 * accessible control is a real button named by the title; "Clear" is a
 * nested, z-raised stop that never triggers the open. Clear is revealed on
 * hover AND on any focus inside the card (`group-focus-within`) — never
 * hover-only.
 */
export interface InboxNotificationCardProps {
  notification: InboxNotification
  /** Open the underlying record (also the caller's cue to mark it read). */
  onOpen?: (notification: InboxNotification) => void
  /** Clear (archive / mark handled) just this card. Omit → no Clear button. */
  onClear?: (notification: InboxNotification) => void
  /** True while the card animates out after a clear. */
  clearing?: boolean
  className?: string
}

const KIND_ICON: Record<Exclude<InboxNotificationKind, 'mention'>, ReactNode> = {
  notification: <Bell aria-hidden className="size-4" />,
  approval: <ClipboardCheck aria-hidden className="size-4" />,
  system: <Activity aria-hidden className="size-4" />,
}

/** Shared chip chrome — 22px badge, 6px radius, 14px leading icon (SPEC).
 *  Text is EXPLICITLY caption-sized (12px SemiBold — the platform's 12px
 *  minimum, decision #2, stands in for the spec's 10px) + `leading-none`, so
 *  a chip can never inherit the 16px base and balloon to title size. */
const CHIP =
  'inline-flex h-[1.375rem] items-center gap-1 rounded-sm px-1.5 text-caption font-semibold leading-none [&>svg]:size-3.5 [&>svg]:shrink-0'

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit', hour12: true })
}

export const InboxNotificationCard = memo(function InboxNotificationCard({
  notification: n,
  onOpen,
  onClear,
  clearing,
  className,
}: InboxNotificationCardProps) {
  const isMention = n.kind === 'mention'
  return (
    <article
      data-slot="notification-card"
      data-unread={!n.read || undefined}
      className={cn(
        'group relative flex items-start gap-3 rounded-md border border-border bg-card p-3.5',
        'transition-all duration-normal ease-standard',
        'hover:border-primary focus-within:border-primary hover:shadow-sm',
        clearing && 'pointer-events-none opacity-0',
        className,
      )}
    >
      {/* Leading 28px icon container / mention avatar. */}
      {isMention ? (
        <Avatar src={n.avatarSrc} name={n.title} className="size-7 shrink-0" />
      ) : (
        <span
          aria-hidden
          className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"
        >
          {KIND_ICON[(n.kind ?? 'notification') as Exclude<InboxNotificationKind, 'mention'>] ??
            KIND_ICON.notification}
        </span>
      )}

      {/* Content block. */}
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={onOpen ? () => onOpen(n) : undefined}
          className={cn(
            // 14px SemiBold / 20px line (SPEC §Notification card) — the
            // line-height is explicit because `text-body-sm` sets size only.
            'block w-full truncate text-start text-body-sm font-semibold leading-5 text-foreground outline-none',
            // Stretch this button over the whole card: one big open target.
            'after:absolute after:inset-0 after:rounded-md',
            'focus-visible:after:ring-2 focus-visible:after:ring-ring',
          )}
        >
          {n.title}
        </button>
        {n.snippet ? (
          <p className="mt-1.5 truncate text-caption font-medium text-muted-foreground">{n.snippet}</p>
        ) : null}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {n.reference ? (
            <span className={cn(CHIP, 'border border-border bg-muted/50 text-muted-foreground')}>
              <Hash aria-hidden />
              {n.reference.label}
            </span>
          ) : null}
          {n.severity ? (
            <span
              className={cn(
                CHIP,
                n.severity.tone === 'critical'
                  ? 'bg-error-50 text-error-500'
                  : 'bg-success-scale-50 text-success-scale-500',
              )}
            >
              <Flag aria-hidden />
              {n.severity.label}
            </span>
          ) : null}
          {n.due ? (
            <span className={cn(CHIP, 'bg-accent-family-flame-lightest text-accent-family-flame-normal')}>
              <Clock aria-hidden />
              {n.due}
            </span>
          ) : null}
          {n.module ? (
            // Borderless trailing module chip (SPEC: no bg fill).
            <span className={cn(CHIP, 'px-0.5 font-medium text-muted-foreground')}>{n.module.label}</span>
          ) : null}
        </div>
      </div>

      {/* Timestamp container: dot + time, then the revealed Clear. */}
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <span className="flex items-center gap-1.5 text-caption font-medium text-muted-foreground">
          {!n.read ? (
            <span aria-hidden data-slot="notification-unread-dot" className="size-[0.4375rem] rounded-full bg-primary" />
          ) : null}
          {timeLabel(n.timestamp)}
        </span>
        {onClear ? (
          <button
            type="button"
            onClick={() => onClear(n)}
            data-slot="notification-clear"
            className={cn(
              // z-raised above the stretched open button; revealed on card
              // hover AND any focus inside the card (never hover-only).
              'relative z-10 inline-flex items-center gap-1 rounded-sm px-1 py-0.5 text-caption font-medium text-primary outline-none',
              'opacity-0 transition-opacity duration-fast ease-standard',
              'group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring',
            )}
          >
            <Check aria-hidden className="size-3.5" />
            Clear
            <span className="sr-only"> notification “{n.title}”</span>
          </button>
        ) : null}
      </div>
    </article>
  )
})

InboxNotificationCard.displayName = 'InboxNotificationCard'
