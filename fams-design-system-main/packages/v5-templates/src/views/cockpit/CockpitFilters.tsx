import { ChevronDown, Download, Megaphone, X, Zap, type LucideIcon } from '@fams/ui-kit/icons'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  toast,
} from '@fams/ui-kit'
import type { EntityConfig } from '@fams/v5-composer'
import { cn } from '../../lib/cn'
import type { CockpitFilterModel } from './cockpit-model'

/**
 * CockpitFilters — the cockpit's config-driven filter-pill row + icon-action
 * buttons (SPEC §1.1 filters row; §2 rows 2–7; UX-NOTES C.9–13). Pills open
 * real dropdowns (Enter/Space/Escape from the menu primitive for free); a
 * col-bound pill's selection filters the queue + map via the parent's
 * `selections` state, a col-less pill only swaps its label (scope pill). A
 * chosen value renders in `text-foreground` with an in-pill clear ✕ (C.12).
 * Actions are generic `{icon, kind}` metadata: `menu` opens a small item
 * menu, `toast` fires a success toast — every button observable, no dead
 * affordances (L.57). Generic engine vocabulary only.
 */

const ACTION_ICONS: Record<string, LucideIcon> = {
  broadcast: Megaphone,
  actions: Zap,
  export: Download,
}

type CockpitActionConfig = NonNullable<NonNullable<EntityConfig['uiConfig']['cockpit']>['actions']>[number]

export interface CockpitFiltersProps {
  filters: CockpitFilterModel[]
  selections: Record<string, string | undefined>
  onSelectionChange: (id: string, value: string | undefined) => void
  actions?: CockpitActionConfig[]
  className?: string
}

function FilterPill({
  filter,
  value,
  onChange,
}: {
  filter: CockpitFilterModel
  value: string | undefined
  onChange: (value: string | undefined) => void
}) {
  const muted = filter.placeholder && !value
  return (
    <div className="isolate flex items-center" data-slot="cockpit-filter-pill" data-filter-id={filter.id}>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            'flex h-9 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-body-sm outline-none transition-colors duration-fast hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring',
            value ? 'pe-1.5' : undefined,
            muted ? 'text-muted-foreground' : 'text-foreground',
          )}
        >
          <span className="max-w-40 truncate">{value ?? filter.label}</span>
          <ChevronDown className="size-4 flex-none text-muted-foreground" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {filter.options.length === 0 ? (
            <DropdownMenuItem disabled>No options</DropdownMenuItem>
          ) : (
            filter.options.map((option) => (
              <DropdownMenuItem key={option} onSelect={() => onChange(option)}>
                {option}
              </DropdownMenuItem>
            ))
          )}
          {value ? (
            <DropdownMenuItem onSelect={() => onChange(undefined)}>Clear {filter.label}</DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      {value ? (
        <button
          type="button"
          aria-label={`Clear ${filter.label} filter`}
          onClick={() => onChange(undefined)}
          className="-ms-8 z-dropdown flex size-6 items-center justify-center rounded-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  )
}

const ACTION_BUTTON =
  'flex size-9 items-center justify-center rounded-sm border outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-ring'

function ActionButton({ action }: { action: CockpitActionConfig }) {
  const Icon = ACTION_ICONS[action.icon ?? 'actions'] ?? Zap
  const button = (klass?: string) => (
    <span
      className={cn(
        ACTION_BUTTON,
        action.primary
          ? 'border-primary/45 bg-secondary text-primary hover:bg-primary/10'
          : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground',
        klass,
      )}
    >
      <Icon className="size-4" aria-hidden="true" />
    </span>
  )

  if (action.kind === 'menu' && action.items?.length) {
    return (
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger
              aria-label={action.label}
              data-action-id={action.id}
              className="rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {button()}
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>{action.label}</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end">
          {action.items.map((item) => (
            <DropdownMenuItem
              key={item.id}
              onSelect={() => toast.success(item.message ?? action.message ?? `${item.label} sent`)}
            >
              {item.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={action.label}
          data-action-id={action.id}
          onClick={() => toast.success(action.message ?? `${action.label} complete`)}
          className="rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {button()}
        </button>
      </TooltipTrigger>
      <TooltipContent>{action.label}</TooltipContent>
    </Tooltip>
  )
}

export function CockpitFilters({ filters, selections, onSelectionChange, actions, className }: CockpitFiltersProps) {
  if (!filters.length && !actions?.length) return null
  return (
    <div data-slot="cockpit-filters" className={cn('flex flex-none flex-wrap items-center gap-2', className)}>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        {filters.map((filter) => (
          <FilterPill
            key={filter.id}
            filter={filter}
            value={selections[filter.id]}
            onChange={(value) => onSelectionChange(filter.id, value)}
          />
        ))}
      </div>
      {actions?.length ? (
        <div className="flex flex-none items-center gap-2">
          {actions.map((action) => (
            <ActionButton key={action.id} action={action} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

CockpitFilters.displayName = 'CockpitFilters'
