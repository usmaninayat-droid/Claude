import type { ReactNode } from 'react'
import { Check } from '../icons'
import { cn } from '../lib/cn'

/**
 * StepperParts — internal, non-exported pieces shared by `Stepper.tsx`'s two
 * render branches (`numbered` incl. both orientations, and `tabs`). Split out
 * to keep `Stepper.tsx` under the repo's ~300-line soft budget (rule 12)
 * while both branches gained full nav-button semantics (B3). Nothing here is
 * re-exported from `src/index.ts` — `Stepper.tsx` is still the component's
 * only public surface.
 */

export type StepperStepState = 'default' | 'current' | 'completed'

export function getStepState(index: number, current: number): StepperStepState {
  if (index < current) return 'completed'
  if (index === current) return 'current'
  return 'default'
}

/**
 * Whether step `index` may be activated via `onStepSelect` — completed steps
 * and the current step itself are selectable (re-selecting `current` is a
 * caller-side no-op, per the job-orders tab-strip contract); an upcoming/
 * unvalidated step never is. With no `onStepSelect` at all the rail is
 * display-only and every step is unselectable (B3: still rendered as a real,
 * named, `disabled` button — never silently inert).
 */
export function isStepSelectable(index: number, current: number, hasHandler: boolean): boolean {
  return hasHandler && index <= current
}

/**
 * Accessible name for one step's button — carries position + label + state
 * (B3: "Step 3 of 6, Trigger Rule, current"). `label` only contributes when
 * it's a plain string; a rich-node label still yields a position+state name
 * rather than an empty one. `completed`/`current` are stated explicitly;
 * `default` (upcoming) states nothing extra — its `disabled`/`aria-disabled`
 * pair already carries that.
 */
export function stepAccessibleName(label: ReactNode, index: number, total: number, state: StepperStepState): string {
  const parts = [`Step ${index + 1} of ${total}`]
  if (typeof label === 'string') parts.push(label)
  if (state === 'current') parts.push('current')
  else if (state === 'completed') parts.push('completed')
  return parts.join(', ')
}

/**
 * StepButton — the real `<button>` every step renders as (B3: "Stepper is
 * navigation" — `nav` + ordered list + each step a button). Visually inert
 * (no button chrome of its own — callers style the children, same as before
 * this existed); `disabled` + `aria-disabled` together whenever the step
 * isn't `selectable`, matching B3's literal wording rather than relying on
 * `disabled` alone. `aria-current="step"` lands here (the focusable node),
 * not on the `<li>`.
 */
export function StepButton({
  ariaLabel,
  current,
  selectable,
  onSelect,
  className,
  children,
}: {
  ariaLabel: string
  current: boolean
  selectable: boolean
  onSelect: () => void
  className?: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      disabled={!selectable}
      aria-disabled={!selectable}
      aria-current={current ? 'step' : undefined}
      aria-label={ariaLabel}
      onClick={onSelect}
      className={cn(
        'appearance-none rounded-sm border-0 bg-transparent p-0 text-start outline-none disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
    >
      {children}
    </button>
  )
}

/**
 * StepMarker — the per-step glyph. `completed` ALWAYS shows the checkmark
 * regardless of `icon` (B3, non-negotiable): the checkmark is the only
 * per-state signal that isn't colour, so a custom icon replaces the index
 * digit on `current`/`default` only — see `StepperStep.icon`'s docblock in
 * `Stepper.tsx`.
 */
export function StepMarker({
  state,
  index,
  icon,
}: {
  state: StepperStepState
  index: number
  icon?: ReactNode
}) {
  if (state === 'completed') {
    return (
      <span
        data-slot="stepper-marker"
        className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"
      >
        <Check className="size-4" aria-hidden="true" />
      </span>
    )
  }
  const content =
    icon != null ? (
      <span aria-hidden="true" className="grid size-4 place-items-center [&_svg]:size-4">
        {icon}
      </span>
    ) : (
      index + 1
    )
  if (state === 'current') {
    return (
      <span
        data-slot="stepper-marker"
        className="grid size-8 shrink-0 place-items-center rounded-full border-2 border-primary bg-background text-body-xs font-semibold text-primary ring-4 ring-primary/15"
      >
        {content}
      </span>
    )
  }
  return (
    <span
      data-slot="stepper-marker"
      className="grid size-8 shrink-0 place-items-center rounded-full border-2 border-border bg-card text-body-xs font-semibold text-muted-foreground"
    >
      {content}
    </span>
  )
}
