import type { CompiledFieldSet, EntityConfig, LayoutRow } from '@fams/v5-composer'

/**
 * One creation step/group: a title and its ordered rows. `rows` is the
 * column-span-capable shape — a row with 2+ `cols` renders those fields
 * side by side (figma-spec-create-sheet.md §2.9's Priority Level + Customer
 * Language half-width pair), via the SAME blueprint placement `order`
 * pairing `compileFieldSet`'s layout plan already derives for every other
 * blueprint-driven surface (task detail, etc.) — no new blueprint schema
 * needed, `computeCreationGroups` just consults it instead of re-deriving a
 * flat list. `cols` is kept as a flattened convenience view of `rows` for
 * existing/simple call sites that don't care about row-pairing.
 */
export interface CreationGroup {
  id: string
  title: string
  rows: LayoutRow[]
  cols: string[]
  /**
   * Whether `layout="flat"` (`CreationSheet.tsx`) should render `title` as a
   * heading above this group. figma-spec-create-sheet.md's field list has
   * exactly ONE section heading ("Location Details") — every other group
   * (the unconditional "basic" bucket, and any `profile.sections` entry that
   * doesn't opt in via `ProfileSection.showLabel`) flows its fields
   * unlabeled, so a plain field's own inline label isn't doubled by a
   * redundant section title above it (finding: "Note" rendered twice, a lone
   * "KPI" heading floated above just the Compliance Time field). The
   * trailing "details" catch-all keeps showing its title (unchanged,
   * pre-existing behavior) — it's a generic bucket, not a named section, so
   * there's no per-section opt-in to consult for it.
   */
  showLabel: boolean
}

function toRows(cols: string[]): LayoutRow[] {
  return cols.map((col) => ({ cols: [col] }))
}

function flatten(rows: LayoutRow[]): string[] {
  return rows.flatMap((r) => r.cols)
}

function group(id: string, title: string, rows: LayoutRow[], showLabel: boolean): CreationGroup {
  return { id, title, rows, cols: flatten(rows), showLabel }
}

/**
 * `computeCreationGroups` — the decision #10 (LOCKED) v1 grouping rule.
 *
 * v5's create dialogs put the first handful of fields under a "Basic Info"
 * heading; this replicates that literally: the first five editable blueprint
 * fields become the "Basic Info" group (one field per row — the "first N"
 * split itself carries no column-span metadata), and the remainder are
 * grouped by the blueprint's profile `sections` when it declares any (a
 * trailing "Details" group catches anything the sections don't place), else
 * a single "Details" group.
 *
 * `Auto` (system-generated) fields are never offered by either IMPLICIT
 * bucket — the "first N" Basic Info slice and the trailing catch-all
 * "Details" group — since neither is an authoring decision about that
 * specific field. An `Auto` field EXPLICITLY placed inside a blueprint
 * `profile.sections` entry IS included, read-only (figma-spec-create-
 * sheet.md §2.6's Compliance Time box: `AutoWidget`'s filled/non-interactive
 * presentation, resolved the same way every other field's edit widget is —
 * by `descriptor.type`, via `getEditWidget('Auto')` — no new plumbing). This
 * was previously an unconditional `d.type !== 'Auto'` filter applied before
 * ANY placement was consulted, so a section could never surface an Auto
 * field even by explicit placement (the root cause documented in
 * `qa/deviations.md`'s FIX-3 entry).
 *
 * Column-span within a section: `compiled.layout` (from `compileFieldSet`)
 * already groups a section's fields into rows using each placement's
 * authored `order` (two fields sharing an `order` land in one row) — this
 * function looks that row plan up by section id rather than re-flattening
 * `section.fields` itself, so pairing fields side by side is purely a
 * blueprint-authoring decision (give them the same `order`), with zero new
 * mechanism.
 *
 * TODO(decision #10): metadata-driven grouping — replace the fixed "first five"
 * split with blueprint-authored create-step metadata once the schema gains it
 * (a `createSteps` / per-field `step` placement). Until then this hardcoded
 * split IS the locked v1 behavior, kept in one place so the swap is local.
 *
 * **Hidden-in-create** — two independent, complementary mechanisms (pick
 * whichever fits the shape of what needs hiding; both may be used together):
 *
 * 1. **`descriptor.creation.hidden`** (per-FIELD, `SystemColumn.creation` in
 *    `types.ts`) — excludes ONE specific field from every bucket (Basic
 *    Info, every section, the trailing catch-all), regardless of where it's
 *    placed. The scalpel for "this field is load-bearing elsewhere (a
 *    `profile.sections` placement the DETAIL accordion needs) but must never
 *    surface in create" — e.g. an "Assigned Driver" section whose Name/Phone
 *    fields read as duplicates of the create form's own Customer Name/Phone
 *    Number fields (figma-spec-create-sheet.md's exact field list). Hiding
 *    EVERY field a section places is what removes that section from create
 *    entirely (an empty section renders nothing — see the `!rows.length`
 *    check below), with zero effect on the SAME section's detail rendering
 *    (`deriveDetail`/`TaskDetail.tsx` never reads this flag).
 * 2. **`uiConfig.creation.explicit`** (per-FORM, `types.ts`) — default
 *    (omitted/`false`) keeps the trailing catch-all "Details" group: every
 *    remaining editable field no section explicitly placed still shows
 *    there, unchanged pre-existing behavior. Set `true` to suppress that
 *    catch-all ENTIRELY, so the create form shows ONLY "Basic Info" +
 *    whatever `profile.sections` explicitly place. Use this for a blueprint
 *    whose ENTIRE trailing bucket is unwanted junk; a blueprint that still
 *    wants SOME of its unplaced fields in create (just not one specific
 *    section) should reach for `descriptor.creation.hidden` instead, since
 *    `explicit` is all-or-nothing for the whole catch-all.
 */
export function computeCreationGroups(compiled: CompiledFieldSet, config?: EntityConfig): CreationGroup[] {
  const editable = compiled.descriptors.filter((d) => d.type !== 'Auto' && !d.creation?.hidden)

  // The first-N "Basic Info" slice. `5` is the locked v1 default; a blueprint
  // may override it per-form via `uiConfig.creation.basicCount` (the
  // decision-#10 metadata-driven step sizing, scoped to the first group).
  const BASIC_COUNT = config?.uiConfig.creation?.basicCount ?? 5
  const basic = editable.slice(0, BASIC_COUNT)
  const groups: CreationGroup[] = [group('basic', 'Basic Info', toRows(basic.map((d) => d.col)), false)]

  const rest = editable.slice(BASIC_COUNT)
  const sections = config?.uiConfig.profile?.sections ?? []
  const explicit = config?.uiConfig.creation?.explicit === true

  // An `Auto` field is only ever eligible via an EXPLICIT section placement
  // (never the implicit "first N"/trailing-catch-all buckets above) — so it
  // only enters `restCols` when a `profile.sections` entry actually names it
  // AND isn't itself `creation.hidden`.
  const sectionAutoCols = new Set(
    sections.flatMap((s) =>
      s.fields
        .filter((f) => {
          const d = compiled.byCol[f.col]
          return d?.type === 'Auto' && !d.creation?.hidden
        })
        .map((f) => f.col),
    ),
  )
  if (!rest.length && !sectionAutoCols.size) return groups

  const restCols = new Set([...rest.map((d) => d.col), ...sectionAutoCols])
  const placed = new Set<string>()

  if (sections.length) {
    const layoutById = new Map(compiled.layout.groups.map((g) => [g.id, g]))
    for (const section of sections) {
      const sectionId = section.id ?? `sec_${section.name}`
      // Prefer the compiled layout's row plan (row-pairing via shared
      // `order`, computer.ts's `rowsFrom`); fall back to one-per-row when
      // this section has no compiled counterpart (e.g. `compiled` was built
      // with `flat: true`).
      const sourceRows = layoutById.get(sectionId)?.rows ?? toRows(section.fields.map((f) => f.col))
      const rows = sourceRows
        .map((row) => ({ cols: row.cols.filter((c) => restCols.has(c) && !placed.has(c)) }))
        .filter((row) => row.cols.length > 0)
      if (!rows.length) continue
      groups.push(group(sectionId, section.name, rows, section.showLabel === true))
      for (const row of rows) for (const c of row.cols) placed.add(c)
    }
    // `explicit` suppresses this trailing bucket unconditionally — an
    // unplaced field is hidden-in-create rather than dumped into "Details".
    const leftover = explicit ? [] : [...restCols].filter((c) => !placed.has(c) && !sectionAutoCols.has(c))
    if (leftover.length) groups.push(group('details', 'Details', toRows(leftover), true))
  } else if (!explicit) {
    // No sections declared at all → nothing could have explicitly placed an
    // Auto field, so the catch-all "Details" group is `rest` only (never
    // `sectionAutoCols`, which is empty here anyway).
    groups.push(group('details', 'Details', toRows([...rest.map((d) => d.col)]), true))
  }

  return groups
}
