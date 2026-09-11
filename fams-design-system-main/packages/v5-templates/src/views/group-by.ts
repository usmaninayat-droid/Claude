import type { LucideIcon } from '@fams/ui-kit/icons'
import type { ViewKind } from '@fams/v5-composer'
import type { ModuleViewGroupByOption } from './ModuleViewFilters'
import { lookupFieldIcon } from './field-icons'

/**
 * A curated Group By entry as authored in `uiConfig.groupByOptions` — see
 * that key's doc in `@fams/v5-composer`'s `types.ts` for the contract.
 */
export interface CuratedGroupByEntry {
  col: string
  label?: string
  /**
   * Leading glyph for THIS grouping's group-header rows (Figma `29535:4487`:
   * the Preventive Maintenance list's vehicle groups carry an
   * `Asset Icons/List/Car` glyph before the name). A name from the shared
   * `field-icons` vocabulary; an unauthored or unknown name renders no glyph
   * — which is every existing consumer, so nothing changes for them.
   *
   * Authored per ENTRY, not per module: regrouping by Status must not keep a
   * car glyph on the status headers.
   */
  icon?: string
  /**
   * Marks this entry as the grouping a `grouped-list` view OPENS with.
   * Ignored by every other view kind — a `list` view still opens ungrouped,
   * unchanged (see `seedGroupBy`).
   */
  default?: boolean
}

/**
 * Which view kinds offer the toolbar's Group By control.
 *
 * `'list'` is the shipped behavior (figma-spec-list.md §1). `'grouped-list'`
 * is a REGISTERED `ViewKind` (`composition.ts`, the composer registry, the
 * view-type picker's preview) whose body has always been the same `ListView`
 * — it simply never got the control, so it rendered a permanently ungrouped
 * list with no way to group it. Both kinds share one lens and one control;
 * they differ only in whether grouping is seeded (`seedGroupBy`).
 */
export function kindHasGroupBy(kind: ViewKind | undefined): boolean {
  return kind === 'list' || kind === 'grouped-list'
}

/**
 * Resolves the Group By choices offered for a module.
 *
 * With NO curated set the auto-derived options are returned verbatim — every
 * SingleSelect-backed list column, exactly as before.
 *
 * A curated set narrows and re-labels them. An entry naming an auto-derived
 * column resolves to it; an entry naming any OTHER listed column resolves
 * against `listedOptions` — grouping only ever reads `row[col]`, so a
 * reference-typed column (a Vehicle, an Assignee) groups fine, and curating
 * one is an explicit authoring act rather than a silent widening of the
 * automatic set. An entry naming a column this module doesn't list is still
 * dropped rather than offered as a dead option.
 */
export function resolveGroupByOptions(
  curated: CuratedGroupByEntry[] | undefined,
  derivedOptions: ModuleViewGroupByOption[],
  listedOptions: ModuleViewGroupByOption[],
): ModuleViewGroupByOption[] {
  if (!curated?.length) return derivedOptions
  return curated
    .map((entry) => {
      const match = derivedOptions.find((o) => o.value === entry.col) ?? listedOptions.find((o) => o.value === entry.col)
      return match ? { value: match.value, label: entry.label ?? match.label } : undefined
    })
    .filter((o): o is ModuleViewGroupByOption => Boolean(o))
}

/**
 * The grouping a view OPENS with.
 *
 * Only `'grouped-list'` seeds one — a `grouped-list` view that opened
 * ungrouped would be indistinguishable from a `list`. Every other kind,
 * `'list'` included, returns `current` untouched, so no existing consumer's
 * default changes.
 *
 * `undefined` means "this view's grouping has never been set"; `null` means
 * the user (or a saved view) explicitly chose `None`. Only the former seeds,
 * so grouping stays fully user-changeable afterwards — picking `None` sticks.
 *
 * The seed is the curated entry flagged `default`, falling back to the first
 * offered option so the kind is never dead for want of a flag.
 */
export function seedGroupBy(
  kind: ViewKind | undefined,
  current: string | null | undefined,
  options: ModuleViewGroupByOption[],
  curated: CuratedGroupByEntry[] | undefined,
): string | null | undefined {
  if (current !== undefined) return current
  if (kind !== 'grouped-list') return current
  const flagged = curated?.find((entry) => entry.default)
  const preferred = flagged && options.some((o) => o.value === flagged.col) ? flagged.col : undefined
  if (!preferred && options[0] && typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
    console.warn(
      `[group-by] a grouped-list view opened grouped by "${options[0].value}" — the first offered option — because no groupByOptions[] entry is flagged \`default\`. This depends on systemcolumns order; flag one entry \`default: true\` to make the opening grouping explicit.`,
    )
  }
  return preferred ?? options[0]?.value ?? current
}

/**
 * The group-header glyph for the ACTIVE grouping — the curated entry's own
 * `icon`, resolved through the shared field-glyph vocabulary. `undefined`
 * whenever nothing is grouped, nothing is curated, the active grouping's
 * entry authored no icon, or the name is unknown: the group header then
 * renders exactly as it does today.
 */
export function resolveGroupHeaderIcon(
  curated: CuratedGroupByEntry[] | undefined,
  groupByCol: string | null | undefined,
): LucideIcon | undefined {
  if (!groupByCol) return undefined
  return lookupFieldIcon(curated?.find((entry) => entry.col === groupByCol)?.icon)
}
