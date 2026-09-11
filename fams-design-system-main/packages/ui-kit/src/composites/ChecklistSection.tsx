import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { Check, Inbox } from '../icons'
import type { LucideIcon } from '../icons'
import { cn } from '../lib/cn'
import { Progress } from '../primitives/Progress'
import { IconBadge, type IconBadgeTone } from '../primitives/IconBadge'

/**
 * ChecklistSection — a list of items, each carrying one state from a closed,
 * caller-supplied `states` set, with an aggregate completion header. [L3 composite]
 *
 * Generalizes two shapes the reference design system shipped as separate,
 * business-named components: a binary done/undone checklist and a 4-state
 * (pass/fail/n-a/pending) inspection list. Both are the SAME component here —
 * `states` is just longer. The component carries no business vocabulary of
 * its own: pass two states for a to-do list, or four for an inspection; it
 * only ever sees `states[]` (generic `{ id, label, icon, tone }`) and `value`
 * (item id → state id).
 *
 * `states[0]` is the neutral/default state applied to any item missing from
 * `value`. Header completion counts items whose current state is anything
 * OTHER than `states[0]` — the one definition of "resolved" that works
 * uniformly for a 2-state and an N-state config, without the component
 * knowing which state means "good".
 *
 * State visuals reuse `IconBadge` (tone → token, never a raw hex) rather than
 * re-deriving color-per-state, and the header reuses `Progress` rather than
 * hand-rolling a bar.
 *
 * State-agnostic (Rule 8): fully controlled via `value`/`onToggle`; holds no
 * checklist data of its own. The reference's note/photo affordances are NOT
 * reimplemented here — `renderItemExtra` is the extension point an app uses
 * to inject that (app-owned) content per row.
 *
 * @usage-v5
 *   - iwmp/components/pipeline/ChecklistInspectionSection.vue — binary
 *     pass/fail checklist driving a `q-linear-progress` bar, `positive`/
 *     `negative` icon+color per item (Quasar color names, no notes/photos).
 *   - iwmp/components/charts/BinInspectionChecklistLog.vue — 3-state
 *     (pass/fail/none) per-cell status via a hand-rolled `STATE_CFG` map with
 *     inline literal color values per state — direct evidence for the
 *     token-based `tone` generalization here.
 *   Forms needed: `states[]` (2..N), per-item `value`, completion header.
 * @usage-index checklist-section
 */
export interface ChecklistItemState {
  /** Stable identifier — stored in `value`, never displayed. */
  id: string
  /** Accessible label for this state (used as `aria-label` on its control). */
  label: string
  /** Icon shown when an item currently has this state. */
  icon?: LucideIcon
  /** Tint for this state's `IconBadge`, resolved through the token system. */
  tone?: IconBadgeTone
}

export interface ChecklistItemData {
  id: string
  label: ReactNode
  /** Optional secondary line under the label. */
  description?: ReactNode
  disabled?: boolean
  /** App-owned data, handed back untouched to `renderItemExtra`. */
  meta?: unknown
}

export interface ChecklistSectionProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'onToggle' | 'title'> {
  /** Heading shown above the completion bar. Omit for a bare list. */
  title?: ReactNode
  items: ChecklistItemData[]
  /**
   * Closed set of possible states, `states[0]` is the default/neutral one.
   * Default is a binary unchecked/checked pair. Pass a longer array (e.g.
   * pending/passed/failed/na) to get a multi-state toggle row per item.
   */
  states?: ChecklistItemState[]
  /** Controlled: item id → current state id. Items absent default to `states[0]`. */
  value: Record<string, string>
  /** Fired with the item id and the state id it should move to. */
  onToggle?: (itemId: string, stateId: string) => void
  /** Presentational only — no state can be changed. */
  readOnly?: boolean
  emptyIcon?: ReactNode
  emptyText?: ReactNode
  /**
   * Extension point for app-owned per-item content (a note field, a photo
   * thumbnail, …) — this component has no upload or note-editing logic of
   * its own.
   */
  renderItemExtra?: (item: ChecklistItemData, stateId: string) => ReactNode
}

const DEFAULT_STATES: ChecklistItemState[] = [
  { id: 'unchecked', label: 'Unchecked', tone: 'neutral' },
  { id: 'checked', label: 'Checked', icon: Check, tone: 'success' },
]

export const ChecklistSection = forwardRef<HTMLDivElement, ChecklistSectionProps>(
  (
    {
      className,
      title,
      items,
      states = DEFAULT_STATES,
      value,
      onToggle,
      readOnly = false,
      emptyIcon,
      emptyText = 'No checklist items',
      renderItemExtra,
      ...props
    },
    ref,
  ) => {
    const [defaultState, ...activeStates] = states
    const isBinary = states.length === 2
    const total = items.length

    const resolvedCount = items.filter((item) => {
      const stateId = value[item.id] ?? defaultState.id
      return stateId !== defaultState.id
    }).length
    const pct = total ? Math.round((resolvedCount / total) * 100) : 0

    const getState = (stateId: string) =>
      states.find((s) => s.id === stateId) ?? defaultState

    const setItemState = (itemId: string, itemDisabled: boolean | undefined, stateId: string) => {
      if (readOnly || itemDisabled) return
      onToggle?.(itemId, stateId)
    }

    return (
      <div
        ref={ref}
        data-slot="checklist-section"
        className={cn('flex flex-col gap-3', className)}
        {...props}
      >
        <div className="flex items-center gap-3">
          {title ? (
            <span className="flex-1 truncate text-body-sm font-semibold text-foreground">
              {title}
            </span>
          ) : null}
          <div className="flex flex-1 items-center gap-2">
            <Progress value={pct} size="sm" aria-label="Completion" className="flex-1" />
            <span
              data-slot="checklist-section-count"
              className="shrink-0 text-caption font-semibold text-muted-foreground"
            >
              {resolvedCount}/{total}
            </span>
          </div>
        </div>

        {total === 0 ? (
          <div
            data-slot="checklist-section-empty"
            className="flex flex-col items-center gap-2 py-6 text-center"
          >
            <div className="grid size-10 place-items-center rounded-full bg-muted text-muted-foreground">
              {emptyIcon ?? <Inbox className="size-5" />}
            </div>
            <p className="text-body-sm text-muted-foreground">{emptyText}</p>
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {items.map((item) => {
              const stateId = value[item.id] ?? defaultState.id
              const current = getState(stateId)
              const itemDisabled = readOnly || item.disabled
              const isResolved = stateId !== defaultState.id

              return (
                <li key={item.id} data-slot="checklist-item" className="flex flex-col gap-2 py-3">
                  <div className="flex items-start gap-3">
                    {isBinary ? (
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={isResolved}
                        disabled={itemDisabled}
                        onClick={() =>
                          setItemState(
                            item.id,
                            item.disabled,
                            isResolved ? defaultState.id : activeStates[0].id,
                          )
                        }
                        className={cn(
                          'flex flex-1 items-start gap-3 rounded-sm p-2 text-start outline-none transition-colors',
                          !itemDisabled && 'hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring',
                          itemDisabled && 'cursor-not-allowed opacity-60',
                        )}
                      >
                        <IconBadge
                          icon={current.icon}
                          tone={current.tone ?? 'neutral'}
                          shape="square"
                          size="sm"
                        />
                        <span className="flex min-w-0 flex-1 flex-col gap-1">
                          <span
                            className={cn(
                              'text-body-sm',
                              isResolved ? 'text-muted-foreground line-through' : 'text-foreground',
                            )}
                          >
                            {item.label}
                          </span>
                          {item.description ? (
                            <span className="text-body-xs text-muted-foreground">{item.description}</span>
                          ) : null}
                        </span>
                      </button>
                    ) : (
                      <>
                        <span className="flex min-w-0 flex-1 flex-col gap-1 py-2">
                          <span className="text-body-sm text-foreground">{item.label}</span>
                          {item.description ? (
                            <span className="text-body-xs text-muted-foreground">{item.description}</span>
                          ) : null}
                        </span>
                        <div
                          role="group"
                          aria-label={typeof item.label === 'string' ? item.label : undefined}
                          className="flex shrink-0 items-center gap-1"
                        >
                          {activeStates.map((s) => {
                            const isActive = stateId === s.id
                            return (
                              <button
                                key={s.id}
                                type="button"
                                aria-pressed={isActive}
                                aria-label={s.label}
                                disabled={itemDisabled}
                                onClick={() =>
                                  setItemState(item.id, item.disabled, isActive ? defaultState.id : s.id)
                                }
                                className={cn(
                                  'rounded-sm outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-ring',
                                  !isActive && 'opacity-40 hover:opacity-70',
                                  itemDisabled && 'pointer-events-none opacity-30',
                                )}
                              >
                                <IconBadge
                                  icon={s.icon}
                                  tone={s.tone ?? 'neutral'}
                                  shape="square"
                                  size="sm"
                                />
                              </button>
                            )
                          })}
                        </div>
                      </>
                    )}
                  </div>
                  {renderItemExtra ? <div>{renderItemExtra(item, stateId)}</div> : null}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    )
  },
)

ChecklistSection.displayName = 'ChecklistSection'
