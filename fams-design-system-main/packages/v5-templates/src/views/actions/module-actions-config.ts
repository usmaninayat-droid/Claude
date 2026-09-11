import type { EntityConfig, UserContext } from '@fams/v5-composer'

/**
 * module-actions-config.ts — the gating layer for the shared row/bulk chrome.
 *
 * Everything A5 adds is SHARED module-view chrome, so nothing may be turned on
 * by a lens or by a module name: it is turned on by `uiConfig` plus the
 * existing privilege model, exactly as `INTERACTIONS.md`'s doctrine section
 * requires ("gated by config (`uiConfig.toolbar`, `uiConfig.rowActions`,
 * `uiConfig.bulkActions`) and by the existing `<id>.view` / delete
 * privileges — not as pipeline-specific components"). That is also what makes
 * the already-shipped Tickets list gain the bulk bar from this same code path
 * rather than from a pipelines-only fork (UX note L.75).
 */

/** Whether the user holds a privilege. Absent user or absent privilege denies — the same ruling `isProfileTabVisible` applies. */
export function holdsPrivilege(userContext: UserContext | undefined, privilege: string | undefined): boolean {
  if (!privilege) return true
  return Boolean(userContext?.privileges?.includes(privilege))
}

export interface ResolvedRecordActions {
  /** Render the `Delete` item. */
  delete: boolean
  /** Render the (always disabled) `Archive` placeholder item. */
  archive: boolean
  /** Paint the `…` control at rest rather than on hover (`uiConfig.rowActions.alwaysVisible`). */
  alwaysVisible: boolean
}

/**
 * A blueprint asking for `Delete` while the app wired no handler is a WIRING
 * BUG, and round 1 proved it is an invisible one: `Delete` was configured on
 * the pipelines blueprint, nothing supplied `ModuleView.onDeleteRecords`, and
 * the item simply never rendered — on every lens, silently, for a whole wave.
 * Gating on the handler is still right (a menu item that cannot act is exactly
 * the defect `Archive` is labelled as), but the gate must be AUDIBLE. This
 * warns once per module+surface in dev; production is untouched.
 */
const warned = new Set<string>()
function warnMissingDeleteHandler(configName: string, surface: string): void {
  if (process.env.NODE_ENV === 'production') return
  const key = `${configName}:${surface}`
  if (warned.has(key)) return
  warned.add(key)
  console.warn(
    `[v5-templates] "${configName}": uiConfig asks for a ${surface} Delete action but no ` +
      `\`ModuleView.onDeleteRecords\` handler is wired, so Delete is not being rendered. ` +
      `Wire the app's delete seam (or set the uiConfig flag to false) — a configured-but-` +
      `unwired Delete is silently absent, not merely inert.`,
  )
}

/**
 * The row/card `…` menu's resolved contents.
 *
 * `Delete` additionally requires a wired handler: `uiConfig` is metadata and
 * cannot carry a callback, so a blueprint asking for a Delete the app never
 * wired would otherwise render a menu item that does nothing — which is the
 * class of defect the `Archive` placeholder is *explicitly labelled* as, and
 * must not be created accidentally. The absence is WARNED, not swallowed.
 */
export function resolveRecordActions(
  config: EntityConfig,
  userContext: UserContext | undefined,
  hasDeleteHandler: boolean,
): ResolvedRecordActions | undefined {
  const block = config.uiConfig.rowActions
  if (!block) return undefined
  if (!holdsPrivilege(userContext, block.requiredPrivilege)) return undefined
  if (block.delete !== false && !hasDeleteHandler) warnMissingDeleteHandler(config.name, 'row')
  const resolved: ResolvedRecordActions = {
    delete: block.delete !== false && hasDeleteHandler,
    archive: block.archive !== false,
    // Opt-IN (`=== true`), unlike the two action flags above, which are opt-OUT:
    // an absent key must leave the shared hover default exactly where it is.
    alwaysVisible: block.alwaysVisible === true,
  }
  return resolved.delete || resolved.archive ? resolved : undefined
}

export interface ResolvedBulkActions {
  delete: boolean
  export: boolean
}

/**
 * The bulk bar's resolved actions, or `undefined` for no bar at all.
 *
 * The GATE is `uiConfig.listSelectable` — a module that renders no selection
 * column can have no bulk selection, and a module that renders one should not
 * be left with checkboxes that do nothing. `uiConfig.bulkActions` then refines
 * it: omitted means "Export always (it is client-side and needs no wiring),
 * Delete when the app wired one", `{}` means "selection column, no bar", and
 * either key set to `false` drops that action.
 */
export function resolveBulkActions(
  config: EntityConfig,
  userContext: UserContext | undefined,
  selectable: boolean,
  hasDeleteHandler: boolean,
): ResolvedBulkActions | undefined {
  if (!selectable) return undefined
  const block = config.uiConfig.bulkActions
  if (block && !holdsPrivilege(userContext, block.requiredPrivilege)) return undefined
  // An ABSENT block accepts the defaults; a PRESENT one is authoritative, so
  // `{}` really does mean "selection column, no bar" rather than silently
  // inheriting both actions.
  const wantsDelete = block ? block.delete === true : true
  if (wantsDelete && !hasDeleteHandler) warnMissingDeleteHandler(config.name, 'bulk')
  const resolved: ResolvedBulkActions = {
    delete: wantsDelete && hasDeleteHandler,
    export: block ? block.export === true : true,
  }
  return resolved.delete || resolved.export ? resolved : undefined
}

/**
 * A stable string describing WHAT the user is currently looking at — search
 * text, every active filter, and the active lens. The bulk selection is cleared
 * whenever this changes (UX note G.45/G.47: "changing filters clears the
 * selection rather than silently keeping hidden records selected — a hidden
 * selected record is how users delete things they cannot see").
 *
 * Deliberately NOT derived from the resulting record ids: a record edit or a
 * re-sort changes those without changing what the user asked for, and must not
 * throw a selection away. Filter keys are sorted so key ORDER can never make
 * two identical filter states look different.
 */
export function selectionResetKey(
  viewId: string | undefined,
  search: string | undefined,
  filters: Record<string, unknown> | undefined,
): string {
  const entries = Object.entries(filters ?? {})
    .filter(([, value]) => (Array.isArray(value) ? value.length > 0 : value != null && value !== ''))
    .map(([key, value]) => `${key}=${Array.isArray(value) ? [...value].sort().join('|') : String(value)}`)
    .sort()
  return JSON.stringify([viewId ?? '', search ?? '', entries])
}

/**
 * Singular/plural noun for every generated copy string that talks ABOUT
 * records — the delete confirmation ("Delete 12 tasks?"), the hybrid lens's
 * count row ("Showing 175 of 175 mapped tasks"), the map's fit control.
 *
 * `uiConfig.recordNoun` wins when the blueprint states it. Without it the noun
 * is derived by the same naive singularizer convention `ModuleView` already
 * applies to the search placeholder: module names are plural by convention.
 * A module whose name is NOT a plural of its records — "Pipeline Management",
 * which used to read "…mapped pipeline management" (finding A7b-4) — is
 * exactly the case `recordNoun` exists for. Still never a hardcoded domain
 * noun here: the override is config, the fallback is lexical.
 */
export function recordNounFor(config: EntityConfig): { one: string; many: string } {
  const authored = config.uiConfig?.recordNoun
  if (authored?.one?.trim() && authored?.many?.trim()) {
    return { one: authored.one.trim().toLowerCase(), many: authored.many.trim().toLowerCase() }
  }
  const many = config.name.trim().toLowerCase() || 'records'
  const one = many.endsWith('ies')
    ? `${many.slice(0, -3)}y`
    : many.endsWith('s') && !many.endsWith('ss')
      ? many.slice(0, -1)
      : many
  return { one, many }
}
