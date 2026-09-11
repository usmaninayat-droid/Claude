import { Stack } from '@fams/ui-kit'
import { getReadRenderer, type CompiledFieldSet } from '@fams/v5-composer'
import type { CreationGroup } from './grouping'

/**
 * CreationSheetSummary — the read-only recap body for `CreationSheet`'s
 * opt-in `showSummaryStep` (W3a). Split out on touch to keep
 * `CreationSheet.tsx` under the repo's ~300-line soft budget (rule 12) — this
 * is CreationSheet's summary-step BODY only, not an independently exported
 * component (same "sub-part of a compound component" status as
 * `DataTablePagination`/`CreationSheetChrome` — covered by `CreationSheet`'s
 * own tests/demo, never its own registry family member).
 *
 * Reuses v5-composer's own `getReadRenderer(descriptor.type)` for every
 * value — the SAME read-side presentation the rest of the platform uses for
 * a stored value (including each renderer's own em-dash placeholder for an
 * empty/unset value) — rather than re-deriving formatting/empty-state logic
 * here.
 */
export interface CreationSheetSummaryProps {
  /** Every step group being recapped (all of them — the summary step itself is never one of these). */
  groups: CreationGroup[]
  compiled: CompiledFieldSet
  /** Current form values, keyed by `col` — a snapshot (`form.getValues()`), not itself reactive. */
  values: Record<string, unknown>
  /** Jump back to the given group's step index (its "Edit" affordance, B3). */
  onEditGroup: (stepIdx: number) => void
}

export function CreationSheetSummary({ groups, compiled, values, onEditGroup }: CreationSheetSummaryProps) {
  return (
    <Stack gap="section" data-slot="creation-sheet-summary">
      {groups.map((group, idx) => (
        <Stack key={group.id} gap="field" as="section" data-slot="creation-sheet-summary-section">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-caption font-medium text-muted-foreground">{group.title}</h3>
            <button
              type="button"
              aria-label={`Edit ${group.title}`}
              onClick={() => onEditGroup(idx)}
              className="rounded-xs text-caption font-medium text-primary outline-none underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-ring"
            >
              Edit
            </button>
          </div>
          <Stack gap="inline">
            {group.cols.map((col) => {
              const descriptor = compiled.byCol[col]
              if (!descriptor) return null
              const Read = getReadRenderer(descriptor.type)
              return (
                <div
                  key={col}
                  data-slot="creation-sheet-summary-row"
                  className="flex items-center justify-between gap-4 border-b border-border pb-2 last:border-b-0 last:pb-0"
                >
                  <span className="text-body-sm text-muted-foreground">{descriptor.label}</span>
                  <Read descriptor={descriptor} value={values[descriptor.col]} />
                </div>
              )
            })}
          </Stack>
        </Stack>
      ))}
    </Stack>
  )
}

CreationSheetSummary.displayName = 'CreationSheetSummary'
