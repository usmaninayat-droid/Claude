import type { SectionComponentProps } from '../lib/section-components'

/**
 * FieldTilesSection — this section's resolved `fields` as a row of bordered
 * input-look tiles (SPEC `task-detail-29-42895` §1.4.3's Area/Street/
 * Building triple: small grey label above a plain value, one bordered box
 * per field). Generic over ANY field list — the blueprint picks the fields,
 * this renders however many arrive; wraps at narrow widths instead of
 * crushing (UX AC-5.3's degrade rule).
 *
 * Label/value type is pixel-matched to a fresh `get_design_context`
 * extraction against `PAk7skcUc0OeD8FcQyDVe7` (`Frame1261154575`, node
 * `32:4745`): the tile label is `Gilroy:SemiBold` `10px` (one size down from
 * the field-row label's `12px` elsewhere in this same sheet, and neither the
 * DS `text-caption`/`text-body-xs` step — both are `12px` — so an
 * arbitrary-value utility is the correct match, not a token; `rem`, not `px`
 * — `pnpm lint:tokens` hard rule 2 allows arbitrary `rem` but not raw `px`),
 * and the value is `Gilroy:SemiBold` `14px` black. The label renders
 * `text-muted-foreground-strong`, not the Figma-drawn `#98a2b3`
 * (`text-gray-400`, 2.46:1 — a WCAG AA blocker, fix7/A7 gate blocker): see
 * `FieldGrid`'s `emphasis` doc comment (`RecordLayout.tsx`) for the full
 * reasoning — same label role, same fix. This component has
 * no other consumer, so the exact weight/size are hardcoded rather than
 * threaded as an opt-in prop (contrast `FieldGrid`'s `emphasis`, which
 * guards a SHARED primitive's other confirmed consumer).
 *
 * Split out of `section-renderers.tsx` (root `CLAUDE.md` rule 12's ~300-line
 * budget) — re-exported from there so existing imports keep working.
 */
/** `FieldTilesSection` / `FieldTilesMapSection` layout config — `ProfileSection.component.props` shape (all keys optional; omitted = the original single wrapping row). */
export interface FieldTilesSectionConfig {
  /**
   * Groups tiles into explicit rows by field col (`fields[].id` IS the col —
   * see `TaskDetail.toFields`). E.g. `[["municipality"],["systemcol12"]]`
   * puts Municipality alone on its own full-width line and the Onwani tile
   * on the next. Cols not named in any row flow into a trailing row.
   */
  tileRows?: string[][]
  /**
   * Mutually-exclusive cols, first-non-empty wins: of the listed cols, only
   * the FIRST whose record value is non-empty renders its tile (an incident
   * carries EITHER an Onwani number OR a free location, never both — the
   * same either/or the creation form's radio enforces). Cols not listed are
   * unaffected.
   */
  exclusiveCols?: string[]
  /**
   * Cols whose (already wrapped) value renders BARE — no tile box, no tiny
   * tile label — because the value brings its own field chrome (e.g. a host
   * `wrapFieldValue` rendering the creation form's `InsetField` control for
   * in-place editing). Layout (`tileRows`) still applies.
   */
  bareCols?: string[]
}

export function FieldTilesSection({ record, props, fields }: SectionComponentProps) {
  const cfg = (props ?? {}) as Partial<FieldTilesSectionConfig>
  if (!fields?.length) return null

  const isEmpty = (col: string): boolean => {
    const value = record[col]
    return value == null || value === '' || (Array.isArray(value) && value.length === 0)
  }
  const exclusive = cfg.exclusiveCols ?? []
  const winner = exclusive.find((col) => !isEmpty(col))
  const visible = fields.filter((field) => !exclusive.includes(field.id) || field.id === winner)
  if (!visible.length) return null

  const tile = (field: NonNullable<SectionComponentProps['fields']>[number]) =>
    cfg.bareCols?.includes(field.id) ? (
      <div key={field.id} data-slot="field-tile-bare" className="min-w-40 flex-1">
        {field.value}
      </div>
    ) : (
      <div
        key={field.id}
        data-slot="field-tile"
        className="flex min-w-40 flex-1 flex-col gap-0.5 rounded-md border border-border bg-card px-3 py-2"
      >
        <span className="text-[0.625rem] font-semibold text-muted-foreground-strong">{field.label}</span>
        <span className="text-body-sm font-semibold text-foreground">{field.value}</span>
      </div>
    )

  if (cfg.tileRows?.length) {
    const placed = new Set(cfg.tileRows.flat())
    const rows = cfg.tileRows
      .map((row) => visible.filter((field) => row.includes(field.id)))
      .filter((row) => row.length > 0)
    const rest = visible.filter((field) => !placed.has(field.id))
    if (rest.length) rows.push(rest)
    return (
      <div data-slot="field-tiles-section" className="flex flex-col gap-3 px-[1.125rem]">
        {rows.map((row, index) => (
          <div key={index} className="flex flex-wrap gap-3">
            {row.map(tile)}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div data-slot="field-tiles-section" className="flex flex-wrap gap-3 px-[1.125rem]">
      {visible.map(tile)}
    </div>
  )
}
