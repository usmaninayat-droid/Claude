import type { ReactNode } from 'react'
import type { EntityConfig, FieldChrome, FieldOptionContext } from '@fams/v5-composer'

export interface CreationSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void

  /** The module config the create form is compiled from (blueprint-driven). */
  config: EntityConfig
  /**
   * Fired with the mapped record on final submit. The record follows the store
   * contract (`MultiReference` → CSV, repeating groups → scalar arrays), via
   * v5-composer's `mapSchemaFormOut`. State-agnostic: the consumer wires the
   * store and closes the sheet (Rule 8) — this component never persists.
   */
  onSubmit: (record: Record<string, unknown>) => void

  /** Prefill values, keyed by field `col`. */
  defaultValues?: Record<string, unknown>
  /** Injected option data for pickers/selects/assignees (Rule 8). */
  context?: FieldOptionContext
  /** Sheet title. Defaults to `Create ${config.name}`. */
  title?: string
  /** Final-step submit label. Defaults to `Create`. */
  submitLabel?: string
  /** Panel width preset. */
  width?: 'md' | 'lg' | 'xl'
  /**
   * Rendering shape for a multi-group field set:
   * - `'auto'` (default) — one group renders as a plain single sheet; more
   *   than one becomes a `Stepper`-guided wizard (today's decision #10
   *   behavior, unchanged).
   * - `'flat'` — ALWAYS a single scrollable sheet, regardless of group
   *   count: every group's fields flow in sequence, each non-"basic" group
   *   rendered under its own small section-label heading (figma-spec-
   *   create-sheet.md's "Location Details"), footed by one full-width
   *   primary button instead of the default Cancel+Save pair. The metadata/
   *   wiring layer opts a module's create sheet into this per figma parity.
   * - `'wizard'` — always the Stepper path, even for a single group.
   */
  layout?: 'auto' | 'flat' | 'wizard'
  /**
   * Field-chrome variant passed through to every field's edit widget — see
   * `FieldChrome` (`@fams/v5-composer`). Defaults to `'default'` (today's
   * external-label shape); pass `'inset-label'` to opt every inset-capable
   * field into figma-spec-create-sheet.md §2's shared-outline anatomy.
   */
  fieldChrome?: FieldChrome
  /**
   * Step-nav visual treatment for the wizard path (`layout: 'wizard'`, or
   * `'auto'` with 2+ groups) — passed straight through to `Stepper`'s own
   * `variant`. Defaults to `'numbered'` (today's icon/numbered-circle rail,
   * unchanged) — pass `'tabs'` for a horizontal text-tab strip (Job Orders'
   * create sheet, which needs the SAME wizard engine with different chrome).
   * Ignored by the `flat`/single-group paths, which never render a `Stepper`
   * at all.
   */
  stepperVariant?: 'numbered' | 'tabs'
  /**
   * Per-step icon for the wizard's `Stepper` rail, keyed by `CreationGroup.id`
   * (`'basic'`, a section's own id, or the trailing `'details'` bucket, or
   * `'summary'` for the `showSummaryStep` step) — resolved to
   * `StepperStep.icon`. A group with no entry falls back to `Stepper`'s own
   * numbered/check marker. Generic (rule 10): the keys are whatever
   * `computeCreationGroups` produces for THIS config, never business
   * vocabulary baked into the prop itself — the PM wizard's icon-bearing rail
   * is the first consumer.
   *
   * Each value is either a hand-authored `ReactNode` (a JSX icon element, the
   * only shape this prop accepted before W3e) OR a plain icon-name `string`
   * (W3e) — the latter is resolved through the platform's existing closed
   * vocabulary (`resolveFieldIcon`/`FIELD_ICON_VOCABULARY`, exported from
   * `@fams/v5-composer`), the SAME path `IconTextView` uses for a
   * blueprint-authored `props: { icon: "wrench" }`. This is what makes the
   * rail reachable from blueprint JSON at all — `ReactNode` cannot be
   * authored there. An unresolvable name degrades to the default
   * numbered/check marker rather than throwing (see `resolveStepIcon.tsx`).
   */
  stepIcons?: Record<string, ReactNode | string>
  /**
   * Opt-in trailing read-only recap step for the wizard path (`layout:
   * 'wizard'`, or `'auto'` with 2+ groups) — Figma's "FINAL STEP / Summary":
   * a SYNTHESIZED recap of every preceding group's already-entered values,
   * never an extra `profile.sections`/blueprint entry. Defaults to `false` so
   * every existing caller is byte-identical (W3a).
   *
   * Each recapped section's header carries a working "Edit" affordance that
   * jumps straight back to that step (`CreationSheetSummary`'s `onEditGroup`)
   * — Figma routes edits only through the stepper rail, which is a
   * discoverability gap the per-section link remedies for free (B3). Every
   * value renders through v5-composer's own `getReadRenderer(descriptor.
   * type)` — the SAME read-side presentation every other read surface in the
   * platform uses — so an empty/unset field shows that renderer's own em-dash
   * placeholder rather than a blank cell, with zero bespoke formatting logic
   * here.
   *
   * The summary step's own submit button still reads `submitLabel` (Figma:
   * "Create" for the create flow, "Update" for edit) — it is the terminal
   * commit action, same as today's last-group button, just one step later.
   *
   * No-op when there is only one group (the `FormSheet`/single-group branch
   * never renders a `Stepper` at all, so there is nothing to append a step
   * to).
   */
  showSummaryStep?: boolean
  className?: string
}
