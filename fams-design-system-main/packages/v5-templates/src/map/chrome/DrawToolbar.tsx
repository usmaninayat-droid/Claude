import { MousePointer2, Pentagon, Circle as CircleIcon } from '@fams/ui-kit/icons'
import { cn } from '../../lib/cn'
import type { DrawMode } from '../draw'

/**
 * DrawToolbar — the geofence draw-mode switcher (top-start chrome, only
 * rendered when `MapPanel`'s `editable` prop is on). `select` doubles as
 * "stop drawing / edit the last shape" (TerraDraw's select mode handles both
 * click-to-select and drag-to-edit).
 */
export interface DrawToolbarProps {
  mode: DrawMode
  onModeChange: (mode: DrawMode) => void
  className?: string
}

const TOOLS: { mode: DrawMode; label: string; icon: typeof Pentagon }[] = [
  { mode: 'select', label: 'Select / edit', icon: MousePointer2 },
  { mode: 'polygon', label: 'Draw polygon', icon: Pentagon },
  { mode: 'circle', label: 'Draw circle', icon: CircleIcon },
]

export function DrawToolbar({ mode, onModeChange, className }: DrawToolbarProps) {
  return (
    <div className={cn('absolute start-4 top-4 z-10 flex flex-col gap-1 rounded-md border border-border bg-card p-1 shadow-sm', className)}>
      {TOOLS.map((tool) => {
        const Icon = tool.icon
        const active = mode === tool.mode
        return (
          <button
            key={tool.mode}
            type="button"
            aria-label={tool.label}
            title={tool.label}
            aria-pressed={active}
            onClick={() => onModeChange(tool.mode)}
            className={cn(
              'grid size-9 place-items-center rounded-sm transition-colors',
              active ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted',
            )}
          >
            <Icon size={15} aria-hidden />
          </button>
        )
      })}
    </div>
  )
}
