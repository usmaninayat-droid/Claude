import type { ReactNode } from 'react'
import { cn } from '../lib/cn'

export interface WallPanelProps {
  /** Small all-caps caption. Omit for a chrome-less panel. */
  title?: ReactNode
  /** Right-aligned secondary caption on the header row (a unit, a count, a
   *  "last updated"). Only rendered when `title` is. */
  hint?: ReactNode
  children: ReactNode
  /** Set `false` when the body is edge-to-edge (a map, a full-bleed chart). */
  padded?: boolean
  className?: string
}

/**
 * WallPanel — the floating glass card every wall-display surface is built
 * from (Command Center).
 *
 * Wall-display surfaces are their own ALWAYS-DARK canvas, not a dark-mode
 * variant of a light screen: they hang on an operations-room wall and must
 * never flip with `data-theme`. That is why this reads the separate
 * `--color-wall-*` scope rather than `bg-card`/`border-border`, and why it
 * lives in its own folder instead of `composites/`.
 */
export function WallPanel({ title, hint, children, padded = true, className }: WallPanelProps) {
  return (
    <section
      data-slot="wall-panel"
      className={cn(
        'rounded-xl border border-wall-panel-border bg-wall-panel shadow-wall-panel backdrop-blur-md',
        className,
      )}
    >
      {title ? (
        <header className="flex items-center justify-between px-4 pb-2 pt-3">
          <span className="text-wall-label font-semibold uppercase tracking-[0.09em] text-wall-ink-dim">
            {title}
          </span>
          {hint ? <span className="text-wall-label text-wall-ink-faint">{hint}</span> : null}
        </header>
      ) : null}
      <div className={padded ? 'px-4 pb-4' : undefined}>{children}</div>
    </section>
  )
}
