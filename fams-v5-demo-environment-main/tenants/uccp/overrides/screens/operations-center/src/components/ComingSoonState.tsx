import type { LucideIcon } from 'lucide-react'
import { cn } from '@fams/design-system'

/**
 * The shared "not built yet" empty state — one visual language for every
 * unbuilt surface on the platform: settings modules (`ComingSoonPanel`) and
 * application modules (`ModuleComingSoonPage`).
 *
 * Circular tinted icon chip, a "<name> is coming soon" line, and a muted
 * sub-line naming what kind of thing hasn't been built.
 */
export function ComingSoonState({
  label,
  icon: Icon,
  description,
  className,
}: {
  label: string
  icon: LucideIcon
  /** Sub-line under the headline. */
  description: string
  className?: string
}) {
  return (
    <div className={cn('flex flex-1 flex-col items-center justify-center gap-3 py-24 text-center', className)}>
      <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-primary">
        <Icon className="size-6" />
      </span>
      <div>
        <p className="text-sm font-semibold text-foreground">{label} is coming soon</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}
