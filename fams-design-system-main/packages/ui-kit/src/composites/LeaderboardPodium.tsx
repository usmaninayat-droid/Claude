import { type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '../lib/cn'
import { TrendIndicator } from '../primitives/TrendIndicator'
import type { LeaderboardItem } from './Leaderboard.types'

/**
 * LeaderboardPodium — the top-N highlight cards rendered above a
 * `Leaderboard`'s ranked table. Internal sub-part of `Leaderboard`
 * (`variant="podium"`); not exported from the package barrel.
 *
 * Rank tint is token-driven and never the only encoding (rule V12): every
 * card also states its rank in text ("Rank 1") and its movement through
 * `TrendIndicator`'s arrow glyph + value.
 *
 * WHY A DEDICATED `--color-medal-*` FAMILY, not the status ramps: third place
 * used to be painted in the ERROR tint, on pages that also spend red on "worst
 * heat bin" and "negative delta". A reserved status colour must not double as
 * ordinal decoration — the reader cannot tell which of the three meanings a
 * red card carries. Gold/silver/bronze are now their own three-stop token
 * family (`medal-*-surface` / `-accent` / `-border`), so ordinal rank has a
 * vocabulary of its own and bronze is an actual copper hue.
 */
const RANK_SURFACE_CLASSES = [
  'border-medal-gold-border/50 bg-medal-gold-surface',
  'border-medal-silver-border/50 bg-medal-silver-surface',
  'border-medal-bronze-border/50 bg-medal-bronze-surface',
] as const

const RANK_MEDALLION_CLASSES = [
  'bg-medal-gold-accent text-foreground',
  'bg-medal-silver-accent text-foreground',
  'bg-medal-bronze-accent text-foreground',
] as const

export interface LeaderboardPodiumProps {
  items: LeaderboardItem[]
  /** Caption above each card's `score` (e.g. "Behaviour score"). */
  scoreLabel?: ReactNode
  /** Caption above each card's `detail` block (e.g. "Critical events"). */
  detailLabel?: ReactNode
  /** Accessible-name prefix for the rank medallion, e.g. "Rank". */
  rankLabel?: string
  onItemClick?: (id: string) => void
  className?: string
}

export function LeaderboardPodium({
  items,
  scoreLabel,
  detailLabel,
  rankLabel = 'Rank',
  onItemClick,
  className,
}: LeaderboardPodiumProps) {
  if (items.length === 0) return null

  return (
    <div
      data-slot="leaderboard-podium"
      className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-3', className)}
    >
      {items.map((item, index) => {
        const rank = item.rank ?? index + 1
        const interactive = Boolean(onItemClick)
        const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
          if (!onItemClick) return
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onItemClick(item.id)
          }
        }

        return (
          <div
            key={item.id}
            data-slot="leaderboard-podium-card"
            data-rank={rank}
            role={interactive ? 'button' : undefined}
            tabIndex={interactive ? 0 : undefined}
            onClick={interactive ? () => onItemClick?.(item.id) : undefined}
            onKeyDown={interactive ? handleKeyDown : undefined}
            className={cn(
              'relative flex min-h-11 flex-col gap-3 overflow-hidden rounded-md border p-4',
              RANK_SURFACE_CLASSES[index] ?? 'border-border bg-card',
              interactive &&
                'cursor-pointer outline-none transition-colors hover:brightness-95 focus-visible:ring-2 focus-visible:ring-ring',
            )}
          >
            <div className="flex items-start gap-3">
              <span
                data-slot="leaderboard-podium-rank"
                className={cn(
                  'inline-flex size-8 shrink-0 items-center justify-center rounded-full text-body-sm font-semibold',
                  RANK_MEDALLION_CLASSES[index] ?? 'bg-muted text-foreground',
                )}
              >
                <span className="sr-only">{`${rankLabel} `}</span>
                {rank}
              </span>
              {item.media ? <div className="shrink-0">{item.media}</div> : null}
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-body-md font-semibold text-foreground">
                  {item.primary}
                </span>
                {item.secondary ? (
                  <span className="truncate text-caption text-muted-foreground">
                    {item.secondary}
                  </span>
                ) : null}
              </div>
              {item.movement ? <TrendIndicator size="sm" {...item.movement} /> : null}
            </div>

            {item.detail ? (
              <div data-slot="leaderboard-podium-detail" className="flex flex-col gap-1">
                {detailLabel ? (
                  <span className="text-caption font-medium uppercase tracking-wide text-muted-foreground">
                    {detailLabel}
                  </span>
                ) : null}
                {item.detail}
              </div>
            ) : null}

            {item.score !== undefined && item.score !== null ? (
              <div className="flex flex-col">
                {scoreLabel ? (
                  <span className="text-caption font-medium uppercase tracking-wide text-muted-foreground">
                    {scoreLabel}
                  </span>
                ) : null}
                {/* `<bdi>`: the score composes a numeral with a unit ("98 pts"),
                    which an RTL line would otherwise reorder. */}
                <bdi className="text-h4 font-bold leading-tight text-foreground">{item.score}</bdi>
              </div>
            ) : null}

            {item.emblem ? (
              <span
                data-slot="leaderboard-podium-emblem"
                aria-hidden="true"
                className="pointer-events-none absolute top-0 end-0 p-2 opacity-80"
              >
                {item.emblem}
              </span>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
