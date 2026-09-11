import type { ReactNode } from 'react'
import { Eye, EyeOff } from '@fams/ui-kit/icons'
import { IconControl, StatusPill } from '@fams/ui-kit'
import { deriveCard, type CompiledFieldSet, type EntityConfig, type EntityRecord } from '@fams/v5-composer'
import { cn } from '../../lib/cn'
import { KanbanCardView } from '../kanban/KanbanCardView'

export interface RecordMapCardLeadingControls {
  /** Whether THIS record's pin/polygon is currently hidden from the map. */
  hidden: boolean
  onToggleHidden: (id: string) => void
  /** A5's flat multi-select — bulk checkbox renders only when this is present. */
  selected?: boolean
  onSelectedChange?: (id: string, next: boolean) => void
}

export interface RecordMapCardProps {
  config: EntityConfig
  compiled: CompiledFieldSet | null
  record: EntityRecord
  id: string
  label: string
  index: number
  highlighted?: boolean
  onSelect: (id: string) => void
  /** Per-card pipeline-stage chip — `{label, color}` from `uiConfig.statusList`. */
  stageChip?: { label: string; color?: string }
  /**
   * The leading slot's map/bulk affordances (SPEC §1.3, row 20: the eye
   * toggle + A5's bulk-select checkbox). Omit entirely for a related-record
   * panel with no map/bulk context (e.g. the incident detail sheet's Related
   * Incidents tab) — the SAME card shell renders, just without this slot's
   * controls, rather than a second bespoke card being authored.
   */
  leading?: RecordMapCardLeadingControls
  actions?: ReactNode
}

/**
 * RecordMapCard — the hybrid lens's card shell, extracted out of
 * `RecordMapListPane` so a related-record panel outside the map (e.g. the
 * incident detail sheet's Related Incidents tab) can reuse the identical
 * `KanbanCardView`-based card + stage chip WITHOUT the map-only leading
 * controls (eye toggle, bulk checkbox) that only make sense with a map/bulk
 * context. One card renderer, two leading-slot configurations.
 */
export function RecordMapCard({
  config,
  compiled,
  record,
  id,
  label,
  index,
  highlighted,
  onSelect,
  stageChip,
  leading,
  // A5's shared hover-revealed "…" row-actions slot (`MapHybridView`'s
  // `renderRowActions`) — forwarded straight through to `KanbanCardView`'s
  // own `actions` slot so this card reuses THAT menu instead of a second,
  // bespoke one (Dev Note 32270 / TaskDetail.test.tsx-style contract-slot
  // pattern). Omit the prop entirely for a caller with no per-record menu
  // (e.g. a related-record panel) — `KanbanCardView` renders nothing then.
  actions,
}: RecordMapCardProps) {
  return (
    <div
      data-slot="record-map-card"
      data-highlighted={highlighted ? 'true' : undefined}
      className={cn('rounded-lg', highlighted && 'ring-2 ring-ring ring-offset-2 ring-offset-background')}
    >
      <KanbanCardView
        card={deriveCard(config, record)}
        compiled={compiled}
        index={index}
        displayMode="data"
        onClick={() => onSelect(id)}
        // SPEC §1.3: the hybrid list-panel card carries NO bulk-select
        // checkbox — the eye toggle sits where the checkbox used to. Bulk
        // select stays kanban-only (`KanbanCardView`'s own `selectionControl`
        // slot), so it is never forwarded here even when a caller still
        // threads bulk-select props through (e.g. a future toolbar-driven
        // bulk mode elsewhere on the page). The "…" row-actions slot DOES
        // forward — see `actions` above.
        selected={undefined}
        onSelectedChange={undefined}
        actions={actions}
        // Row 1: the eye toggle leads (before the id chip) — SPEC's reference
        // layout puts the map/bulk affordance FIRST, ahead of every id/type
        // badge, not stacked above them (finding: eye rendered on its own
        // line before this fix).
        leading={
          leading ? (
            // Icon-only ⇒ `IconControl` supplies the name AND a tooltip
            // that opens on focus (UX K.67).
            <IconControl tip={`${leading.hidden ? 'Show' : 'Hide'} ${label} on map`}>
              <button
                type="button"
                aria-pressed={leading.hidden}
                data-slot="record-map-visibility"
                // 24px visual box, 40×40 hit area (UX K.65) — the padding
                // is the target, the tinted square is the resting look. The
                // hit area is pulled back OUT of the flow with -m-2 (same
                // UX-7 pattern as VehiclePopupFields' copy affordance), so
                // the row's layout box is the 24px square and the eye sits
                // on the SAME center line as the id chip / type badge
                // instead of stretching the row (finding: 40px in-flow box
                // pushed the chips off-axis).
                className={cn(
                  'grid size-10 -m-2 shrink-0 place-items-center rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  leading.hidden ? 'text-muted-foreground' : 'text-primary',
                )}
                onClick={(event) => {
                  event.stopPropagation()
                  leading.onToggleHidden(id)
                }}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'grid size-6 place-items-center rounded-xs',
                    leading.hidden ? 'bg-muted' : 'bg-primary/10',
                  )}
                >
                  {leading.hidden ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </span>
              </button>
            </IconControl>
          ) : undefined
        }
        // Row 2 (own line, below row 1): the pipeline-stage/status pill —
        // NEVER shares the id row (reference layout; finding: stage pill used
        // to render inside the leading slot, ahead of the id chip).
        secondaryBadge={
          stageChip ? (
            <StatusPill data-slot="record-map-stage-chip" color={stageChip.color}>
              {stageChip.label}
            </StatusPill>
          ) : undefined
        }
      />
    </div>
  )
}

RecordMapCard.displayName = 'RecordMapCard'
