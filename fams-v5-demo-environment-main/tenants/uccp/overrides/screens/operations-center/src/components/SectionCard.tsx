import { type ReactNode } from 'react'
import { IconBadge, type IconBadgeTone } from '@fams/design-system'

/**
 * SectionCard — NEW local component. A titled card whose header carries a
 * bottom divider, matching the Figma dashboard cards (+ our `StatusBreakdownCard`).
 * The DS `ChartCard` is otherwise identical but has NO header border, so we clone
 * it here. Uses the DS `IconBadge` for the leading icon.
 */
const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(' ')

const PADDING = { none: 'p-0', sm: 'p-2', md: 'p-4', lg: 'p-6' } as const

export interface SectionCardProps {
  title: ReactNode
  icon?: ReactNode
  iconTone?: IconBadgeTone
  iconColor?: string
  /** Right-aligned header content (filter dropdown, actions…). */
  actions?: ReactNode
  bodyPadding?: keyof typeof PADDING
  className?: string
  children: ReactNode
}

export function SectionCard({
  title,
  icon,
  iconTone,
  iconColor,
  actions,
  bodyPadding = 'md',
  className,
  children,
}: SectionCardProps) {
  return (
    <section className={cx('flex w-full flex-col rounded-md border border-border bg-card overflow-hidden', className)}>
      <header className="flex items-center gap-2.5 border-b border-border px-4 py-3">
        {icon ? <IconBadge icon={icon} tone={iconTone} color={iconColor} size={32} /> : null}
        <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{title}</h3>
        {actions ? <div className="flex shrink-0 items-center gap-1">{actions}</div> : null}
      </header>
      <div className={cx('flex w-full flex-1 flex-col min-h-0', PADDING[bodyPadding])}>{children}</div>
    </section>
  )
}
