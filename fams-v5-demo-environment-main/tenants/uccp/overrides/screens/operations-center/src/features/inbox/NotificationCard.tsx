import { CheckCircle } from 'lucide-react'
import { Avatar, IconBadge, cn } from '@fams/design-system'
import type { NotificationItem, ChipKind } from './inboxData'

const CHIP_BASE = 'inline-flex min-h-[22px] shrink-0 items-center gap-1 px-2 py-1 text-xs font-semibold whitespace-nowrap [&>svg]:size-3.5'

const CHIP_STYLES: Record<ChipKind, string> = {
  tag: 'rounded-[2px] bg-gray-200 text-gray-600',
  critical: 'rounded-[2px] border border-error-500 bg-error-50 text-error-500',
  minor: 'rounded-[2px] border border-success-500 bg-success-50 text-success-500',
  today: 'rounded-[4px] bg-[color:var(--accent-flame-light)] text-[color:var(--accent-flame)]',
  plain: 'text-gray-500',
}

/**
 * NotificationCard — Inbox feed row. Four states of one component (Figma
 * node 31046:7925 = unread default `31046:7969` / unread hover `31046:7974`;
 * node 31046:8000 = read default `31046:8059` / read hover `31046:8062`):
 * read rows permanently sit on a `bg-surface-minimal` card with a muted
 * neutral icon + medium-weight gray title (no dot, no Clear action);
 * hovering either read or unread darkens the border — only unread rows
 * reveal a "Clear" action on hover.
 */
export function NotificationCard({
  item,
  unread,
  onClear,
}: {
  item: NotificationItem
  unread: boolean
  onClear: () => void
}) {
  const Icon = item.icon
  return (
    <div
      className={cn(
        'group relative flex w-full items-start gap-3 rounded-md border border-gray-300 p-3.5 transition-colors',
        'hover:border-[1.5px] hover:border-gray-400 hover:bg-surface-minimal',
        unread ? 'bg-card' : 'bg-surface-minimal',
      )}
    >
      {Icon ? (
        <IconBadge icon={<Icon className="size-4" />} tone={item.iconTone ?? (unread ? 'info' : 'neutral')} size={28} />
      ) : (
        <Avatar size="sm" fallback={item.avatarInitials} className="size-7 shrink-0" />
      )}

      <div className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
        <p className={cn('w-full truncate text-sm', unread ? 'font-semibold text-foreground' : 'font-medium text-gray-600')}>
          {item.title}
        </p>
        <p className={cn('w-full text-xs font-medium', unread ? 'text-gray-600' : 'text-gray-500')}>{item.message}</p>
        <div className="flex flex-wrap items-center gap-1.5">
          {item.chips.map((chip, i) => (
            <span key={i} className={cn(CHIP_BASE, CHIP_STYLES[chip.kind])}>
              <chip.icon />
              {chip.label}
            </span>
          ))}
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5 self-stretch">
        <div className="flex items-start justify-end gap-1.5">
          {unread ? <span aria-hidden className="mt-1.5 size-[7px] shrink-0 rounded-full bg-primary" /> : null}
          <p className="text-xs font-semibold whitespace-nowrap text-gray-500">{item.time}</p>
        </div>
        {unread ? (
          <button
            type="button"
            onClick={onClear}
            className="hidden items-center gap-1 text-sm font-semibold text-primary outline-none group-hover:flex hover:underline"
          >
            <CheckCircle className="size-4" />
            Clear
          </button>
        ) : null}
      </div>
    </div>
  )
}
