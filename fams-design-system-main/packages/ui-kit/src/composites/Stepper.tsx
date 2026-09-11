import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { cn } from '../lib/cn'
import { StepButton, StepMarker, getStepState, isStepSelectable, stepAccessibleName, type StepperStepState } from './StepperParts'

export type { StepperStepState }

export interface StepperStep {
  label: ReactNode
  description?: ReactNode
  /**
   * Icon rendered by `StepMarker` in place of the index digit on `current`/
   * `default` (upcoming) steps only. Justified by this component's own prior
   * art (see `@usage-v5` below): v5 consumers each carried a `steps[]` shaped
   * `{name,label,icon,done}` and "re-implemented per consumer" — `icon` is a
   * form this file already knew it was missing.
   *
   * **Never replaces the `completed` checkmark** — per the Phase 3 UX pass
   * (B3), the checkmark is the only per-state signal that isn't colour;
   * swapping it for a custom icon would make step state colour-only, an
   * accessibility regression. `StepMarker` enforces this: `completed` always
   * renders `Check`, full stop.
   */
  icon?: ReactNode
}

export interface StepperProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  steps: StepperStep[]
  /** Zero-based index of the active step. Steps before it render completed, this one current, after it default. */
  current: number
  /** Default `horizontal`. */
  orientation?: 'horizontal' | 'vertical'
  /**
   * Visual treatment. `numbered` (default) is the classic numbered-circle
   * progress trail. `tabs` is the text-tab header (figma-spec FAMS Settings
   * node 366:1994): a row of labels with the active one in `primary`, its own
   * short primary underline sitting on a full-width bottom divider — inactive
   * labels muted. `tabs` is horizontal-only; `orientation` is ignored for it.
   */
  variant?: 'numbered' | 'tabs'
  /**
   * When provided, a completed step (and the current step itself, as a
   * caller-side no-op) becomes selectable and calls this with the clicked
   * step index — the caller decides which moves are allowed (e.g.
   * back-navigation only). Applies to BOTH variants. With no handler the
   * rail is presentational only: every step still renders as a real,
   * accessibly-named `button`, just `disabled` (B3 — not silently inert).
   * State stays with the caller (Rule 8): the Stepper never mutates
   * `current`.
   */
  onStepSelect?: (index: number) => void
}

/**
 * Stepper — numbered progress trail for multi-step flows (wizards, create
 * dialogs). [L3 composite]
 *
 * State-agnostic (Rule 8): a single `current` index derives every step's
 * `default | current | completed` state — the caller never computes or
 * passes per-step state, and never fetches/routes here.
 *
 * Navigation semantics (Phase 3 UX pass, B3), true of both variants: the rail
 * is a `nav` around an ordered list; every step is a real `button` whose
 * accessible name carries its state ("Step 3 of 6, Trigger Rule, current");
 * `aria-current="step"` lands on the current step's button; a completed step
 * is activatable to go back; an upcoming/unvalidated step is `disabled` +
 * `aria-disabled` rather than a plain, non-interactive node.
 *
 * @usage-v5
 *   Every v5 wizard hand-rolls this header from scratch, each with its own
 *   done/active/icon bookkeeping:
 *   - `iwmp/components/layouts/WizardLayout.vue` — `isStepDone`/`isStepActive`
 *     computeds + a `steps[]` prop shaped almost exactly like ours
 *     (`{name,label,icon,done}`), re-implemented per consumer.
 *   - `iwmp/components/dialog/ContractCreateStepper.vue` — `currentStepIndex`
 *     derived from a step key, drives a tab-set stepper header.
 *   - `iwmp/components/inspector/reportIncidentStepper.vue` — bespoke
 *     `stepper-wrapper`/`stepper-card` markup for the incident report flow.
 *   Forms needed: `steps[]` (label/description/icon), `current` index,
 *   horizontal (dialog headers) vs vertical (side-panel flows) orientation.
 * @usage-index stepper
 */
export const Stepper = forwardRef<HTMLElement, StepperProps>(
  ({ steps, current, orientation = 'horizontal', variant = 'numbered', onStepSelect, className, ...props }, ref) => {
    const isVertical = orientation === 'vertical'
    const hasHandler = onStepSelect != null

    /* ── tabs variant — text-tab header (figma FAMS Settings 366:1994) ─────── */
    if (variant === 'tabs') {
      return (
        <nav
          ref={ref}
          data-slot="stepper"
          data-variant="tabs"
          aria-label="Progress"
          className={cn('w-full border-b border-border', className)}
          {...props}
        >
          <ol className="flex items-end gap-14">
            {steps.map((step, index) => {
              const state = getStepState(index, current)
              const active = state === 'current'
              const selectable = isStepSelectable(index, current, hasHandler)
              // figma FAMS Settings 366:1996/1998 — active tab 16px SemiBold in
              // `primary`, inactive 14px Medium muted.
              const label = (
                <span
                  className={cn(
                    'whitespace-nowrap',
                    active
                      ? 'text-body-md font-semibold text-primary'
                      : 'text-body-sm font-medium text-muted-foreground',
                  )}
                >
                  {step.label}
                </span>
              )
              return (
                <li key={index} data-slot="stepper-step" className="flex flex-col items-center">
                  <StepButton
                    ariaLabel={stepAccessibleName(step.label, index, steps.length, state)}
                    current={active}
                    selectable={selectable}
                    onSelect={() => onStepSelect?.(index)}
                    className={cn(
                      'relative pb-2',
                      "before:absolute before:-inset-2.5 before:content-['']",
                    )}
                  >
                    {label}
                  </StepButton>
                  <span
                    aria-hidden="true"
                    data-slot="stepper-connector"
                    className={cn('-mb-px h-0.5 w-full rounded-full', active ? 'bg-primary' : 'bg-transparent')}
                  />
                </li>
              )
            })}
          </ol>
        </nav>
      )
    }

    return (
      <nav ref={ref} data-slot="stepper" aria-label="Progress" className={className} {...props}>
        <ol className={cn('flex', isVertical ? 'flex-col' : 'w-full items-start')}>
          {steps.map((step, index) => {
            const state = getStepState(index, current)
            const isLast = index === steps.length - 1
            const active = state === 'current'
            const selectable = isStepSelectable(index, current, hasHandler)
            const labelClass = cn(
              'text-body-sm font-semibold',
              state === 'default' ? 'text-muted-foreground' : 'text-foreground',
            )
            const ariaLabel = stepAccessibleName(step.label, index, steps.length, state)

            const markerAndLabel = isVertical ? (
              <>
                <div className="flex flex-col items-center">
                  <StepMarker state={state} index={index} icon={step.icon} />
                  {!isLast ? (
                    <span
                      aria-hidden="true"
                      data-slot="stepper-connector"
                      className={cn('my-1 min-h-6 w-px flex-1', state === 'completed' ? 'bg-primary' : 'bg-border')}
                    />
                  ) : null}
                </div>
                <div className={cn('min-w-0', !isLast && 'pb-6')}>
                  <p className={labelClass}>{step.label}</p>
                  {step.description ? (
                    <p className="mt-0.5 text-caption text-muted-foreground">{step.description}</p>
                  ) : null}
                </div>
              </>
            ) : (
              <>
                <div className="flex w-full items-center">
                  <StepMarker state={state} index={index} icon={step.icon} />
                  {!isLast ? (
                    <span
                      aria-hidden="true"
                      data-slot="stepper-connector"
                      className={cn('mx-2 h-px flex-1', state === 'completed' ? 'bg-primary' : 'bg-border')}
                    />
                  ) : null}
                </div>
                <div className="mt-2 max-w-28 text-center">
                  <p className={labelClass}>{step.label}</p>
                  {step.description ? (
                    <p className="mt-0.5 text-caption text-muted-foreground">{step.description}</p>
                  ) : null}
                </div>
              </>
            )

            return (
              <li key={index} data-slot="stepper-step" className={isVertical ? undefined : 'flex-1'}>
                <StepButton
                  ariaLabel={ariaLabel}
                  current={active}
                  selectable={selectable}
                  onSelect={() => onStepSelect?.(index)}
                  className={cn('flex', isVertical ? 'w-full gap-3' : 'w-full flex-col items-center')}
                >
                  {markerAndLabel}
                </StepButton>
              </li>
            )
          })}
        </ol>
      </nav>
    )
  },
)

Stepper.displayName = 'Stepper'
