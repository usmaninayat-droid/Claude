import { useMemo } from 'react'
import { Link2 } from '@fams/ui-kit/icons'
import { Button, StatusView } from '@fams/ui-kit'
import { compileFieldSet, deriveDetail, useLinkedRecordOpener, type EntityRecord } from '@fams/v5-composer'
import { useModuleRecords } from './module-records'
import { ProfileSectionsPanel } from './ProfileSectionsPanel'
import type { SectionComponentProps } from '../lib/section-components'

/**
 * LinkedRecordDetailSection — a TaskDetail SECTION whose body is ANOTHER
 * module's record, rendered through that record's own profile `Details`
 * layout, with a "view full profile" affordance that STACKS it on top.
 * [tier-2 pattern]
 *
 * The generic answer to "show a summary of the linked entity inline,
 * collapsed, with a way to open the full record" (job-orders SPEC §2.23's
 * "Asset Details" — the platform's designated cross-module linked-record
 * stacking probe, SPEC.md §2.23; PLATFORM-MODEL doctrine, `interaction-qa.md`
 * side-sheet contract item 3). Deliberately reuses the SAME rendering the
 * target module's own profile uses for its "Details" tab
 * (`deriveDetail` + `ProfileSectionsPanel`) rather than inventing a second,
 * parallel field-list shape here — whatever fields/sections the target
 * module's blueprint authors for ITS OWN profile are exactly what shows up
 * embedded, so adding a field to (say) the vehicle profile is reflected here
 * automatically, with nothing job-orders-specific in this file (rule 10: no
 * `vehicle`/`jobOrder` vocabulary — `refCol`/`entityType` are opaque
 * field-key indirection, the same discipline `ScopedLinkedRecords` follows).
 *
 * Reads through the SAME two seams every other cross-module surface on the
 * platform uses:
 * - `useModuleRecords()` (`module-records.tsx`) to fetch the target module's
 *   full config + record set (mounted around the whole module surface,
 *   including an already-open `ProfileStack` sheet, so this works whether
 *   the section renders in the record's OWN sheet or one already stacked).
 * - `useLinkedRecordOpener()` (`@fams/v5-composer`) to open the target
 *   record — this call is what STACKS a new sheet on top rather than
 *   replacing the current one (the side-sheet contract's mandatory
 *   behaviour). Absent either seam (no provider, or the target/record not
 *   found), this degrades to an explicit empty state — never a guess, never
 *   a crash (Rule 8).
 *
 * `component.props` contract (opaque, blueprint-authored):
 * - `refCol` (required) — the column on THIS record holding the linked
 *   record's id (e.g. a job order's `SingleReference` vehicle column).
 * - `entityType` (required) — the target module's blueprint `code`
 *   (e.g. `asset/vehicle`), resolved via `useModuleRecords()`.
 * - `emptyLabel` — empty-state title when the reference is unset or the
 *   target record isn't found. Default `'Nothing linked yet'`.
 * - `viewLabel` — the stack-affordance link text. Default `'View full profile'`.
 */
export function LinkedRecordDetailSection({ record, props }: SectionComponentProps) {
  const refCol = typeof props?.refCol === 'string' ? props.refCol : undefined
  const entityType = typeof props?.entityType === 'string' ? props.entityType : undefined
  const emptyLabel = typeof props?.emptyLabel === 'string' ? props.emptyLabel : 'Nothing linked yet'
  const viewLabel = typeof props?.viewLabel === 'string' ? props.viewLabel : 'View full profile'

  const resolveModuleRecords = useModuleRecords()
  const openLinkedRecord = useLinkedRecordOpener()

  const refId = refCol ? record[refCol] : undefined
  const resolved = entityType ? resolveModuleRecords?.(entityType) : undefined

  const target: EntityRecord | undefined = useMemo(() => {
    if (!resolved || refId == null || refId === '') return undefined
    return resolved.records.find((candidate) => String(candidate.id) === String(refId))
  }, [resolved, refId])

  const compiled = useMemo(() => (resolved ? compileFieldSet(resolved.config) : null), [resolved])
  const detail = useMemo(
    () => (resolved && target ? deriveDetail(resolved.config, target) : undefined),
    [resolved, target],
  )

  if (!resolved || !target || !detail) {
    return (
      <div className="flex min-h-32 items-center justify-center">
        <StatusView
          kind="empty"
          icon={<Link2 aria-hidden="true" className="size-8" />}
          title={emptyLabel}
        />
      </div>
    )
  }

  return (
    <div data-slot="linked-record-detail-section" className="flex flex-col gap-inline">
      {openLinkedRecord ? (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="link"
            size="sm"
            onClick={() => openLinkedRecord({ entityType: entityType!, recordId: String(target.id), col: refCol })}
          >
            {viewLabel}
          </Button>
        </div>
      ) : null}
      <ProfileSectionsPanel sections={detail.sections} compiled={compiled} record={target} />
    </div>
  )
}

LinkedRecordDetailSection.displayName = 'LinkedRecordDetailSection'
