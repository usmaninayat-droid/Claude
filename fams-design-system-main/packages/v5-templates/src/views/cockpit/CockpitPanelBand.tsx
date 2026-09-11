import { useState } from 'react'
import { BarChart3, Boxes, ChevronDown, Users, type LucideIcon } from '@fams/ui-kit/icons'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Skeleton,
  StatusBreakdownCard,
} from '@fams/ui-kit'
import type { CockpitPanelModel } from './cockpit-model'

/**
 * CockpitPanelBand — the cockpit's bottom status-panel band (UX I.43): 1-up,
 * 2-up from `@4xl`, derived from the module's own `uiConfig.cockpit.panels`.
 * Extracted from `CockpitView` (rule 12), together with the presentational
 * scope chip each panel can carry.
 */

/** Skeleton count before any config has resolved — the spec's 2-up band. */
const PANEL_SKELETON_COUNT = 2

const PANEL_ICONS: Record<string, LucideIcon> = {
  group: Boxes,
  people: Users,
  chart: BarChart3,
}

/** Presentational scope chip on a status panel ("All Vehicles" ▾). */
function PanelFilterChip({ label, options }: { label: string; options?: string[] }) {
  const [value, setValue] = useState<string | null>(null)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        data-slot="cockpit-panel-filter"
        className="flex h-7 items-center gap-1 rounded-md border border-border bg-card px-2 text-body-xs text-foreground outline-none transition-colors duration-fast hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="max-w-32 truncate">{value ?? label}</span>
        <ChevronDown className="size-3.5 flex-none text-muted-foreground" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => setValue(null)}>{label}</DropdownMenuItem>
        {(options ?? []).map((option) => (
          <DropdownMenuItem key={option} onSelect={() => setValue(option)}>
            {option}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export interface CockpitPanelBandProps {
  panels: CockpitPanelModel[]
  loading?: boolean
}

export function CockpitPanelBand({ panels, loading = false }: CockpitPanelBandProps) {
  if (!loading && panels.length === 0) return null
  return (
    <div data-slot="cockpit-panels" className="grid flex-none grid-cols-1 gap-4 @4xl/cockpit:grid-cols-2">
      {loading
        ? Array.from({ length: panels.length || PANEL_SKELETON_COUNT }, (_, i) => (
            <Skeleton
              key={i}
              variant="custom"
              data-slot="cockpit-panel-skeleton"
              className="h-32 rounded-md border border-border"
            />
          ))
        : panels.map((panel) => (
            <StatusBreakdownCard
              key={panel.id}
              data-panel-id={panel.id}
              title={panel.title}
              icon={panel.icon ? PANEL_ICONS[panel.icon] : undefined}
              action={
                panel.filter ? (
                  <PanelFilterChip label={panel.filter.label} options={panel.filter.options} />
                ) : undefined
              }
              stats={panel.stats}
              rows={panel.rows}
              emptyLabel={panel.emptyLabel}
            />
          ))}
    </div>
  )
}

CockpitPanelBand.displayName = 'CockpitPanelBand'
