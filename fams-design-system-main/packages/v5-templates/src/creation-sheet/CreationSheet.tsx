import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  Stack,
  FormGrid,
  Stepper,
  Button,
} from '@fams/ui-kit'
import { FormSheet } from '@fams/ui-kit'
import { compileFieldSet, useSchemaForm, mapSchemaFormOut, SchemaFormField } from '@fams/v5-composer'
import { cn } from '../lib/cn'
import { computeCreationGroups, type CreationGroup } from './grouping'
import { registerCreationSheetFieldWidgets } from './widgets'
import { registerLocationPickerWidget } from './LocationPickerWidget'
import { registerOnwaniLocationPickerWidget } from './OnwaniLocationPickerWidget'
import { SheetHeaderClose, SheetFloatingClose } from './CreationSheetChrome'
import { CreationSheetSummary } from './CreationSheetSummary'
import { resolveStepIcon } from './resolveStepIcon'
import { useDiscardGuard } from './useDiscardGuard'
import type { CreationSheetProps } from './CreationSheet.types'

/**
 * Registers the `IconSelect`/`Dropzone`/`LocationPicker` named edit-widget
 * overrides the moment this module loads — a real CALL, not a bare
 * `import './widgets'` side-effect import, because `@fams/v5-templates`'s
 * `package.json` declares `"sideEffects": false`: a bare import with no
 * consumed binding is exactly what tsup/esbuild are licensed to drop
 * entirely from `dist/index.js` (verified against this same package — see
 * `widgets.tsx`'s file header). `CreationSheet.tsx` is never itself
 * droppable (its own export is what every consumer imports), so this
 * top-level call is guaranteed to run.
 */
registerCreationSheetFieldWidgets()
registerLocationPickerWidget()
registerOnwaniLocationPickerWidget()

/**
 * CreationSheet — the v5 create surface. [tier-2 pattern]
 *
 * Composition: ui-kit `FormSheet` / `Sheet` + `Stepper` + v5-composer's
 * `useSchemaForm` (headless rhf) and `mapSchemaFormOut` (store-contract mapping).
 * The field grouping follows decision #10 (see `computeCreationGroups`): a
 * single group renders in a plain `FormSheet`; more than one turns the surface
 * into a `Stepper`-guided wizard, with per-step validation (the compiled Zod
 * schema, via `form.trigger`) gating "Next".
 *
 * State-agnostic (Rule 8): `onSubmit` receives the mapped record; the consumer
 * owns the store write and closing the sheet.
 */

const WIDTH_CLASS = {
  md: 'sm:max-w-2xl',
  lg: 'sm:max-w-3xl',
  xl: 'sm:max-w-5xl',
} as const

/**
 * `layout="flat"` gets its OWN width scale, independent of `WIDTH_CLASS`
 * above — this branch is specifically modeled on figma-spec-create-sheet.md's
 * ticket-create sheet (762px fixed), not the generic wizard/`FormSheet`
 * paths the other two branches share, so widening it doesn't shift any other
 * module's creation sheet. `md`'s value is an exact pixel match (762px =
 * 47.625rem, same "arbitrary bracket value for a pixel-precise Figma width"
 * technique `ProfileStack`'s own `WIDTH_CLASS.xl` already uses) — was
 * `sm:max-w-2xl` (672px), measured ~130px narrower than spec (finding).
 */
const FLAT_WIDTH_CLASS = {
  md: 'sm:max-w-[47.625rem]',
  lg: 'sm:max-w-4xl',
  xl: 'sm:max-w-5xl',
} as const

const FORM_SHEET_WIDTH = { md: 'md', lg: 'lg', xl: 'lg' } as const

export function CreationSheet({
  open,
  onOpenChange,
  config,
  onSubmit,
  defaultValues,
  context,
  title,
  submitLabel = 'Create',
  width = 'md',
  layout = 'auto',
  fieldChrome = 'default',
  stepperVariant = 'numbered',
  stepIcons,
  showSummaryStep = false,
  className,
}: CreationSheetProps) {
  const compiled = useMemo(() => compileFieldSet(config), [config])
  const groups = useMemo(() => computeCreationGroups(compiled, config), [compiled, config])
  const { form } = useSchemaForm(compiled, { defaultValues, mode: 'onBlur' })

  const [stepIdx, setStepIdx] = useState(0)
  // Every open starts CLEAN: reset the wizard step AND the rhf form state.
  // Without the reset, a reopened sheet showed the PREVIOUS submission's
  // values (round-1 QA `sheet-reopen-clean`) — a user would silently create a
  // near-duplicate record. `form.reset()` restores the compiled defaults
  // (including `defaultValues`) captured by `useSchemaForm`.
  useEffect(() => {
    if (!open) return
    setStepIdx(0)
    form.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only on open
  }, [open])

  const { isDirty } = form.formState
  const { requestOpenChange, handleInteractOutside, dialog: discardDialog } = useDiscardGuard(
    isDirty,
    onOpenChange,
    open,
  )

  const flat = layout === 'flat' || (layout !== 'wizard' && groups.length <= 1)
  const sheetTitle = title ?? `Create ${config.name}`
  const submit = form.handleSubmit((values) => onSubmit(mapSchemaFormOut(compiled, values)))

  // Row-to-row gap uses `inline` (consumer parity report 2026-09-01): the
  // previous `field` gap here stacked on top of `FormGrid`'s own `field`
  // column gap and each `InsetField`'s p-3 internal padding, reading as
  // oversized rhythm next to the app's denser reference density (filter
  // panels). `inline` is the DS's next tier down and keeps this token-only.
  const renderGroupRows = (group: CreationGroup): ReactNode => (
    <Stack gap="inline" data-slot="creation-sheet-fields">
      {group.rows.map((row, i) => (
        <FormGrid key={i} columns={(Math.min(row.cols.length, 2) || 1) as 1 | 2}>
          {row.cols.map((col) => (
            <SchemaFormField key={col} compiled={compiled} col={col} control={form.control} context={context} fieldChrome={fieldChrome} />
          ))}
        </FormGrid>
      ))}
    </Stack>
  )

  /* ── layout="flat" → ONE scrollable sheet, every group in sequence ─────── */
  // figma-spec-create-sheet.md's ticket-create sheet: multiple blueprint
  // groups (Basic Info + a "Location Details" section) but rendered as a
  // single flowing form, not a Stepper wizard — the metadata/wiring layer
  // opts into this via `layout="flat"` (see CreationSheetProps). The
  // "basic" group (decision #10's unconditional first group) never shows
  // its own title — matching the spec, where fields flow unlabeled until
  // the first NAMED section. 40px padding + a single full-width primary
  // footer button (no Cancel text button — the floating `SheetFloatingClose`
  // covers abandoning) replace `FormSheet`'s fixed p-6/Cancel+Save chrome,
  // which has no slot for either.
  if (flat) {
    return (
      <>
      <Sheet open={open} onOpenChange={requestOpenChange}>
        <SheetContent
          side="right"
          hideClose
          data-slot="creation-sheet"
          className={cn('gap-0 p-0', FLAT_WIDTH_CLASS[width], className)}
        onInteractOutside={handleInteractOutside}
        >
          <SheetFloatingClose />
          <div data-slot="creation-sheet-header" className="flex flex-col gap-4 p-10 pb-0 text-start">
            <div className="min-w-0">
              <SheetTitle className="text-xl font-semibold">{sheetTitle}</SheetTitle>
              <SheetDescription className="sr-only">{sheetTitle}</SheetDescription>
            </div>
            <div className="h-px w-full bg-border" aria-hidden />
          </div>

          <div data-slot="creation-sheet-body" className="min-h-0 flex-1 overflow-y-auto p-10">
            <Stack gap="section" data-slot="creation-sheet-groups">
              {groups.map((group) => (
                <Stack key={group.id} gap="field" as="section">
                  {group.showLabel ? (
                    <h3 className="text-caption font-medium text-muted-foreground">{group.title}</h3>
                  ) : null}
                  {renderGroupRows(group)}
                </Stack>
              ))}
            </Stack>
          </div>

          <div data-slot="creation-sheet-footer" className="p-10 pt-0">
            <Button type="button" variant="primary" size="lg" className="w-full" onClick={() => void submit()}>
              {submitLabel}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
      {discardDialog}
      </>
    )
  }

  const multiStep = groups.length > 1

  /* ── Single group, layout="auto" → plain FormSheet ──────────────────────── */
  if (!multiStep) {
    return (
      <>
      <FormSheet
        open={open}
        onOpenChange={requestOpenChange}
        onInteractOutside={handleInteractOutside}
        title={sheetTitle}
        saveLabel={submitLabel}
        onSave={() => {
          void submit()
        }}
        width={FORM_SHEET_WIDTH[width]}
        className={className}
      >
        {renderGroupRows(groups[0]!)}
      </FormSheet>
      {discardDialog}
      </>
    )
  }

  /* ── Multiple groups → Stepper wizard ─────────────────────────────────── */
  // Bypasses `FormSheet` here — this branch composes the bare `Sheet`/
  // `SheetContent` directly instead. `FormSheet`'s contract is fixed (a single
  // title, one body slot, a static Cancel/Save footer); the wizard needs three
  // things `FormSheet` has no slot for: a `Stepper` progress header, a
  // step-count subtitle, and a footer whose first button alternates between
  // Cancel (step 0) and Back (later steps) while "Next"/`submitLabel` gates on
  // async per-step validation (`form.trigger`) rather than firing `onSave`
  // unconditionally. Hand-rolling the chrome (matching `FormSheet`/
  // `DetailSheet`'s own `hideClose` + header/body/footer convention) is the
  // only way to get that shape without forking `FormSheet` itself.
  // `showSummaryStep` (W3a) appends ONE extra step past the last real group —
  // a synthesized read-only recap, never a `profile.sections`/blueprint
  // entry (`computeCreationGroups` never sees it). `withSummary` gates that
  // append on `multiStep` too: the single-group `FormSheet` branch above
  // returns before this point, so a lone group has no rail to append to.
  const withSummary = showSummaryStep && multiStep
  const lastGroupIdx = groups.length - 1
  const isSummaryStep = withSummary && stepIdx === groups.length
  const step = isSummaryStep ? undefined : groups[stepIdx]!
  const isFinalStep = isSummaryStep || (!withSummary && stepIdx === lastGroupIdx)

  const goNext = async () => {
    if (isSummaryStep) {
      void submit()
      return
    }
    const valid = await form.trigger(step!.cols)
    if (!valid) {
      // Move focus to the FIRST invalid field on this step rather than leaving
      // it on Next. Without this the error text and `aria-invalid` are both
      // correct but a keyboard or screen-reader user is told "Required" while
      // still standing on the button, with no indication of which of the step's
      // fields to go back to — round 4 and round 5 both measured
      // `document.activeElement` still on Next. `step.cols` is in DOM order, so
      // the first erroring col is the topmost one.
      const firstInvalid = step!.cols.find((c) => form.getFieldState(c).invalid)
      if (firstInvalid) {
        // `form.setFocus` only works for fields registered with a real ref;
        // most of these render through `Controller`-based widgets, which do not
        // attach one, so it silently no-ops for exactly the field types most
        // likely to be required. Fall back to the `sf-<col>` id every
        // `SchemaFormField` already renders (it is what `aria-describedby` and
        // the label's `htmlFor` are built from), and focus whatever focusable
        // node that id resolves to.
        form.setFocus(firstInvalid)
        const el = document.getElementById(`sf-${firstInvalid}`)
        if (el && document.activeElement !== el) el.focus()
      }
      return
    }
    if (isFinalStep) void submit()
    else setStepIdx((i) => i + 1)
  }

  return (
    <>
    <Sheet open={open} onOpenChange={requestOpenChange}>
      <SheetContent
        side="right"
        hideClose
        data-slot="creation-sheet"
        className={cn('gap-0 p-0', WIDTH_CLASS[width], className)}
        onInteractOutside={handleInteractOutside}
      >
        <div data-slot="creation-sheet-header" className="flex flex-col gap-4 border-b border-border p-section text-start">
          {/* Visible X on the wizard too — past step 0 the footer swaps Cancel
              for Back, which would otherwise leave NO visible exit mid-wizard. */}
          <div className="flex items-center justify-between gap-4">
            <SheetTitle>{sheetTitle}</SheetTitle>
            <SheetHeaderClose />
          </div>
          <SheetDescription className="sr-only">
            Step {stepIdx + 1} of {withSummary ? groups.length + 1 : groups.length}: {isSummaryStep ? 'Summary' : step!.title}
          </SheetDescription>
          <Stepper
            steps={[
              ...groups.map((g) => ({ label: g.title, icon: resolveStepIcon(stepIcons?.[g.id]) })),
              ...(withSummary ? [{ label: 'Summary', icon: resolveStepIcon(stepIcons?.summary) }] : []),
            ]}
            current={stepIdx}
            variant={stepperVariant}
          />
        </div>

        <div data-slot="creation-sheet-body" className="min-h-0 flex-1 overflow-y-auto p-section">
          {isSummaryStep ? (
            <CreationSheetSummary
              groups={groups}
              compiled={compiled}
              values={form.getValues()}
              onEditGroup={(idx) => setStepIdx(idx)}
            />
          ) : (
            renderGroupRows(step!)
          )}
        </div>

        <SheetFooter data-slot="creation-sheet-footer">
          {stepIdx > 0 ? (
            <Button type="button" variant="tertiary" onClick={() => setStepIdx((i) => Math.max(0, i - 1))}>
              Back
            </Button>
          ) : (
            <Button type="button" variant="tertiary" onClick={() => requestOpenChange(false)}>
              Cancel
            </Button>
          )}
          <Button type="button" variant="primary" size="lg" onClick={() => void goNext()}>
            {isFinalStep ? submitLabel : 'Next'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
    {discardDialog}
    </>
  )
}

CreationSheet.displayName = 'CreationSheet'
