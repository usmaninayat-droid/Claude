import { Skeleton, Tooltip, TooltipContent, TooltipTrigger } from '@fams/ui-kit'
import { Rows3 } from '@fams/ui-kit/icons'
import { cn } from '../../lib/cn'
import type { ConsoleKpi } from './console-model'

export interface ConsoleKpiRowProps {
  kpis: ConsoleKpi[]
  /** The tile currently scoping the surface (its id), if any. */
  activeId?: string | null
  /** A tile was activated — the host scopes the queue/table to its records. */
  onSelect?: (kpi: ConsoleKpi) => void
  /**
   * Opens the tile's raw rows (`ConsoleDrillSheet`). Rendered as a SECOND,
   * explicitly-labelled affordance on the tile rather than replacing the
   * scope gesture — the two answer different questions ("show me only these"
   * vs "show me the rows behind this number") and the reference consoles
   * shipped both. Omit for a scope-only tile row.
   */
  onDrill?: (kpi: ConsoleKpi) => void
  loading?: boolean
  className?: string
}

const SKELETON_TILES = 4

/**
 * ConsoleKpiRow — the count-per-stage tile row shared by the operations
 * consoles. [tier-2 internal]
 *
 * Deliberately NOT `KpiTile`: these tiles are FILTER CONTROLS (clicking one
 * scopes the surface below to that stage's records and the active one reads
 * as pressed), and `KpiTile`'s `clickable` affordance is a navigation
 * gesture with no selected state to express. The stage's own blueprint color
 * paints the leading rail, which is the same per-stage color the kanban lanes
 * and the list's STATUS pill already use — one color vocabulary per module.
 */
export function ConsoleKpiRow({ kpis, activeId, onSelect, onDrill, loading, className }: ConsoleKpiRowProps) {
  if (loading) {
    return (
      <div data-slot="console-kpis" className={cn('grid grid-cols-2 gap-field @3xl:grid-cols-4', className)}>
        {Array.from({ length: SKELETON_TILES }, (_, i) => (
          <Skeleton key={i} variant="custom" className="h-[4.5rem] rounded-md border border-border" />
        ))}
      </div>
    )
  }
  if (!kpis.length) return null
  return (
    <div
      data-slot="console-kpis"
      className={cn('grid grid-cols-2 gap-field @3xl:grid-cols-4 @[72rem]:grid-cols-6', className)}
    >
      {kpis.map((kpi) => {
        const active = kpi.id === activeId
        const interactive = Boolean(onSelect)
        return (
          <div
            key={kpi.id}
            data-slot="console-kpi"
            className={cn(
              'flex items-center gap-inline rounded-md border border-border bg-card ps-field pe-2 transition-colors duration-fast',
              active && 'border-primary bg-muted',
            )}
          >
            <button
              type="button"
              // `data-kpi-id` rides the SCOPE button, not the wrapper: the
              // pressed state and the click both live here, so a probe (or a
              // test) that finds the tile by id gets the element that
              // actually carries them.
              data-kpi-id={kpi.id}
              aria-pressed={interactive ? active : undefined}
              disabled={!interactive}
              onClick={interactive ? () => onSelect?.(kpi) : undefined}
              className={cn(
                'flex min-w-0 flex-1 items-center gap-inline py-field text-start',
                interactive && 'hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
              )}
            >
              <span
                aria-hidden="true"
                data-slot="console-kpi-rail"
                className="h-8 w-1 shrink-0 rounded-full bg-primary"
                style={kpi.color ? { backgroundColor: kpi.color } : undefined}
              />
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-caption font-semibold uppercase tracking-wide text-muted-foreground">
                  {kpi.label}
                </span>
                <span className="text-heading-sm font-semibold text-foreground">{kpi.value}</span>
              </span>
            </button>
            {onDrill && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label={`View rows behind ${kpi.label}`}
                    onClick={() => onDrill(kpi)}
                    className="grid size-7 shrink-0 place-items-center rounded-sm text-muted-foreground transition-colors duration-fast hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <Rows3 className="size-4" aria-hidden="true" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>View rows</TooltipContent>
              </Tooltip>
            )}
          </div>
        )
      })}
    </div>
  )
}

ConsoleKpiRow.displayName = 'ConsoleKpiRow'
