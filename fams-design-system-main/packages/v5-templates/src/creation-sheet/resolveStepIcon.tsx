import type { ReactNode } from 'react'
import { resolveFieldIcon } from '@fams/v5-composer'

/**
 * Resolves one `CreationSheetProps.stepIcons` entry to the `ReactNode`
 * `StepperStep.icon` actually wants (W3e).
 *
 * `stepIcons` was typed `Record<string, ReactNode>` (14ed077) — but
 * `ReactNode` cannot be authored in blueprint JSON, so a metadata-driven
 * icon-bearing rail (the whole reason `StepperStep.icon` exists — W3b) was
 * unreachable from a blueprint. Widened to also accept a STRING icon name,
 * resolved through the platform's existing closed vocabulary
 * (`resolveFieldIcon`/`FIELD_ICON_VOCABULARY`, `@fams/v5-composer`) — the
 * SAME path `IconTextView` uses for a JSON `props: { icon: "wrench" }`
 * placement. An unknown name resolves to `undefined` — `Stepper`'s own
 * default numbered/check marker — never throws.
 *
 * A non-string entry (a hand-authored JSX icon, the only shape the prop
 * accepted before this wave) passes through completely unchanged — additive,
 * not a reinterpretation of existing callers.
 */
export function resolveStepIcon(icon: ReactNode | string | undefined): ReactNode | undefined {
  if (typeof icon !== 'string') return icon
  const Icon = resolveFieldIcon(icon)
  return Icon ? <Icon className="size-4" aria-hidden="true" /> : undefined
}
