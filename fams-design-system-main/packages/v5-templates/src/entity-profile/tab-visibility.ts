import { evalCondition } from '@fams/v5-composer'
import type { EntityRecord, UserContext } from '@fams/v5-composer'
import type { EntityProfileTab } from './EntityProfile.types'

/**
 * Whether a profile tab is visible for the given user + record.
 *
 * Two independent gates, both must pass:
 *  - `requiredPrivileges` — every listed privilege must be in
 *    `userContext.privileges` (a missing user or privilege list denies a
 *    privilege-gated tab).
 *  - `visibleWhen` — a v5-composer rule-evaluator `Condition`, evaluated with
 *    the same `{ user, task }` scope the pipeline rules use (so `$.user.*` /
 *    `$.task.*` paths behave identically to production RBAC).
 *
 * A tab with neither gate is always visible.
 */
export function isProfileTabVisible(
  tab: EntityProfileTab,
  userContext?: UserContext,
  record?: EntityRecord,
): boolean {
  if (tab.requiredPrivileges?.length) {
    const held = new Set(userContext?.privileges ?? [])
    if (!tab.requiredPrivileges.every((p) => held.has(p))) return false
  }
  if (tab.visibleWhen) {
    if (!userContext) return false
    if (!evalCondition(tab.visibleWhen, { user: userContext, task: record })) return false
  }
  return true
}
