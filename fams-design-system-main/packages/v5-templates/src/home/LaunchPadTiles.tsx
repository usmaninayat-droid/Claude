import type { ReactNode } from 'react'
import type { LucideIcon } from '@fams/ui-kit/icons'
import { Star } from '@fams/ui-kit/icons'
import type { LaunchPadModule } from './HomeLaunchPad'

/**
 * LaunchPadTiles — the launch pad's section header, tile grid, teaching
 * empty state and module tile. Split out of `HomeLaunchPad.tsx` on touch to
 * keep that file inside the line budget. [v5 tier, launch-pad parts]
 */

/* ── Section header + grid + empty state ─────────────────────────────────── */

export function LaunchPadSection({
  title,
  count,
  icon: Icon,
  iconNode,
  children,
}: {
  title: string
  count: number
  icon?: LucideIcon
  iconNode?: ReactNode
  children: ReactNode
}) {
  return (
    <section aria-label={title}>
      <div className="mb-3 flex items-center gap-2">
        {Icon || iconNode ? (
          <span aria-hidden className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground [&_svg]:size-3.5">
            {Icon ? <Icon aria-hidden /> : iconNode}
          </span>
        ) : null}
        <h2 className="text-sm font-semibold tracking-tight text-foreground">{title}</h2>
        <span className="text-xs font-medium text-muted-foreground tabular-nums">{count}</span>
      </div>
      {children}
    </section>
  )
}

export function TileGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">{children}</div>
}

export function LaunchPadEmptyState({ icon: Icon, title, hint }: { icon: LucideIcon; title: string; hint: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-md border border-dashed border-border bg-card/60 px-6 py-10 text-center">
      <Icon aria-hidden className="size-4.5 text-muted-foreground" />
      <p className="mt-1 text-sm font-medium text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  )
}

/* ── Module tile (nav button + hover/focus-revealed star toggle) ─────────── */

export function ModuleTile({
  mod,
  groupLabel,
  index = 0,
  pinned,
  onTogglePin,
  onOpen,
}: {
  mod: LaunchPadModule
  groupLabel: string
  index?: number
  pinned: boolean
  onTogglePin: (id: string) => void
  onOpen: (id: string) => void
}) {
  const accent = mod.accentColor || 'var(--color-primary)'
  return (
    <div
      className="group animate-in fade-in slide-in-from-bottom-2 relative duration-normal motion-reduce:animate-none"
      style={{ animationDelay: `${Math.min(index * 30, 240)}ms`, animationFillMode: 'backwards' }}
    >
      <button
        type="button"
        onClick={() => onOpen(mod.id)}
        aria-label={`Open ${mod.label}`}
        className="relative flex w-full cursor-pointer items-center rounded-md border border-border bg-card p-4 pe-11 text-start outline-none transition-[border-color,box-shadow] duration-fast hover:border-muted-foreground/40 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden
            className="flex size-10 shrink-0 items-center justify-center rounded-md [&_svg]:size-4.75"
            style={{ background: `color-mix(in srgb, ${accent} 10%, transparent)`, color: accent }}
          >
            {mod.icon}
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-sm font-semibold text-foreground">{mod.label}</span>
            <span className="truncate text-xs font-medium text-muted-foreground">{groupLabel}</span>
          </span>
        </span>
      </button>

      <div className="absolute end-2 top-2 z-10">
        <button
          type="button"
          onClick={() => onTogglePin(mod.id)}
          aria-label={pinned ? `Remove ${mod.label} from favorites` : `Add ${mod.label} to favorites`}
          aria-pressed={pinned}
          className="peer flex size-8 cursor-pointer items-center justify-center rounded-md text-primary opacity-0 outline-none transition-[background-color,transform,opacity] duration-fast group-hover:opacity-100 hover:scale-110 hover:bg-muted active:scale-90 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Star aria-hidden className="size-4" fill={pinned ? 'currentColor' : 'none'} />
        </button>
        <span
          role="tooltip"
          className="pointer-events-none absolute end-0 top-full z-20 mt-1 rounded-md bg-foreground px-2 py-1 text-[0.6875rem] font-medium whitespace-nowrap text-background opacity-0 shadow-sm transition-opacity duration-fast peer-hover:opacity-100 peer-focus-visible:opacity-100"
        >
          {pinned ? 'Remove from favorites' : 'Add to favorites'}
        </span>
      </div>
    </div>
  )
}
