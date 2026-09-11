import { useState } from 'react'
import type { EntityRecord, StatusDef } from '@fams/v5-composer'

/**
 * Stage tabs (SPEC Addendum "Stage tabs") — shared plumbing for the "All /
 * <stage> / <stage> / …" `CountTabs` strip both hybrid lenses render above
 * their list pane: `MapHybridView`'s record-map hybrid
 * (`uiConfig.map.records.toolbar.stageTabs`) and `HybridView`'s list+detail
 * hybrid (`uiConfig.hybrid.stageTabs`). Extracted here (root rule 12) so a
 * second consumer never re-derives the same sentinel / count / controlled-
 * state logic.
 */

/** Sentinel for "no stage narrowing" — never a real `statusList` key. */
export const ALL_STAGE = 'all'

export interface StageTabItem {
  id: string
  label: string
  count: number
}

/**
 * `CountTabs` items for one `statusList`, EXCLUDING the leading "All" tab
 * (each caller already knows its own "All" count over its own pre-stage
 * record set, e.g. `preStageRecords.length`) — a live count per stage over
 * the given records, keyed off the SAME `record.status` value the per-
 * record stage chip/pill and any Group-By-status header already read (root
 * rule: never a second stage vocabulary).
 */
export function buildStageTabItems(records: EntityRecord[], statusList: StatusDef[]): StageTabItem[] {
  const counts = new Map<string, number>()
  for (const record of records) {
    const key = String(record.status ?? '')
    if (!key) continue
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return statusList.map((stage) => ({ id: stage.key, label: stage.label, count: counts.get(stage.key) ?? 0 }))
}

/**
 * Controlled-if-supplied / internal-otherwise active-stage state — the SAME
 * pattern `MapHybridView`'s `groupBy`/`sort` etc. already use for every
 * other toolbar control. `ALL_STAGE` is the sentinel for "no narrowing,"
 * never a real `statusList` key, so it survives a `statusList` edit without
 * needing to match a stale key.
 */
export function useStageTabsState(
  activeStageProp: string | undefined,
  onActiveStageChange: ((stage: string) => void) | undefined,
): [string, (next: string) => void] {
  const [internalActiveStage, setInternalActiveStage] = useState(ALL_STAGE)
  const activeStage = activeStageProp ?? internalActiveStage
  const setActiveStage = (next: string) => {
    if (activeStageProp === undefined) setInternalActiveStage(next)
    onActiveStageChange?.(next)
  }
  return [activeStage, setActiveStage]
}
