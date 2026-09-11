/**
 * Metadata compiler — `compileFieldSet()`.
 *
 * Turns blueprint field metadata into the three things a form/list needs:
 *   (a) a **Zod v4 schema** (required/optional, type mapping, listValues → enum,
 *       email format, numeric min/max, multi → array, reference → id string(s));
 *   (b) a **layout plan** (ordered groups/rows from the blueprint's profile
 *       placement metadata; v1 default = flat single column when no placement);
 *   (c) **field descriptors** (everything a renderer needs).
 *
 * Perf rule 4: compile ONCE, cache keyed by definition version. Cache key =
 * `<code>@<version>`; when the module config carries no `version` we fall back
 * to a content hash of the field defs plus the other descriptor inputs (see
 * `hashFields`). Bump `version` (or
 * change the fields, under the hash fallback) to invalidate. The cache is a
 * bounded LRU (see `CACHE_CAP` below) so a long-running session with many
 * distinct blueprint versions can't grow it unboundedly. `clearCompileCache`
 * / `getCompileCacheStats` are exported for tests.
 */
import { z } from 'zod'
import type { FieldType, ReferenceKind, SystemColumn, EntityConfig } from '../types'
import type {
  AuthoredSystemColumn,
  EntityModuleConfigBlueprint,
  PipelineModuleConfigBlueprint,
} from '../blueprint-schema'
import type { CompiledFieldSet, FieldDescriptor, LayoutGroup, LayoutPlan, LayoutRow } from './types'

type AnyColumn = AuthoredSystemColumn | SystemColumn

/**
 * Minimal structural view of a profile — satisfied by BOTH the authored profile
 * (`AuthoredUiConfig['profile']`, strict ids) and the runtime one
 * (`UiConfig['profile']`, optional ids). We only read placement `col`/`order`
 * and section `name`/`fields`, so this looser shape avoids a union mismatch.
 */
interface PlacementLike {
  col: string
  order?: number
}
interface SectionLike {
  id?: string
  name: string
  fields: PlacementLike[]
}
type ProfileConfig = { details?: PlacementLike[]; sections?: SectionLike[] } | undefined

/** A module config (authored or runtime) OR a bare field-def list. */
export type FieldSetInput =
  | (EntityModuleConfigBlueprint & { version?: string | number })
  | (PipelineModuleConfigBlueprint & { version?: string | number })
  | (EntityConfig & { version?: string | number; $schema?: string; kind?: string })
  | {
      code?: string
      version?: string | number
      fields: readonly AnyColumn[]
      profile?: ProfileConfig
    }

export interface CompileOptions {
  /** Force a flat single-column layout even when placement metadata exists. */
  flat?: boolean
  /** Cols to treat as repeating list fields (blueprint has no authoring yet). */
  repeating?: readonly string[]
  /** Per-col unit appended after a numeric read value (e.g. `{ arr: 'AED' }`). */
  units?: Record<string, string>
  /** Skip the cache (always recompile, do not store). */
  noCache?: boolean
}

const MULTI_TYPES = new Set<FieldType>(['MultiSelect', 'MultiReference', 'tags'])

/* ── Cache ──────────────────────────────────────────────────────────────────── */

// Bounded LRU keyed by `<code>@<version|hash>`. A `Map`'s iteration order is
// insertion order, so recency is tracked for free: a hit deletes + re-sets
// its entry (moves it to the end / most-recently-used), and once the cache
// is at capacity a miss evicts the first entry in iteration order (the
// least-recently-used one) before inserting. 64 is generously above the
// number of distinct blueprint code/version (or content-hash) pairs any one
// running session realistically compiles, so eviction should be rare in
// practice while still bounding worst-case memory.
const CACHE_CAP = 64
const cache = new Map<string, CompiledFieldSet>()
let hits = 0
let misses = 0

export function clearCompileCache(): void {
  cache.clear()
  hits = 0
  misses = 0
}

export function getCompileCacheStats(): { size: number; hits: number; misses: number } {
  return { size: cache.size, hits, misses }
}

/** Look up `key`, refreshing it to most-recently-used position on a hit. */
function cacheGet(key: string): CompiledFieldSet | undefined {
  const hit = cache.get(key)
  if (hit) {
    cache.delete(key)
    cache.set(key, hit)
  }
  return hit
}

/** Insert `key`/`value`, evicting the least-recently-used entry if at capacity. */
function cacheSet(key: string, value: CompiledFieldSet): void {
  if (!cache.has(key) && cache.size >= CACHE_CAP) {
    const oldest = cache.keys().next().value
    if (oldest !== undefined) cache.delete(oldest)
  }
  cache.set(key, value)
}

/**
 * FNV-1a 32-bit hash — deterministic content-hash fallback for a blueprint
 * that carries no `version`.
 *
 * Hashes the columns AND every other normalized input that reaches a
 * `FieldDescriptor`. `statusLabels` (fix8, 2026-09-06, review F5) is the case
 * that forced this: it is derived from `input.uiConfig.statusList`, a SIBLING
 * of `columns`, so a blueprint that renamed a stage label without bumping
 * `version` used to hash identically and serve a stale `ReadEnum` label off
 * the cache. Anything new that `normalize()` feeds into a descriptor must be
 * added here too, or it silently inherits the same staleness.
 */
function hashFields(cols: AnyColumn[], extra?: unknown): string {
  const json = JSON.stringify(cols) + (extra === undefined ? '' : `|${JSON.stringify(extra)}`)
  let h = 0x811c9dc5
  for (let i = 0; i < json.length; i++) {
    h ^= json.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(36)
}

/* ── Input normalization ────────────────────────────────────────────────────── */

interface Normalized {
  code: string
  version?: string | number
  columns: AnyColumn[]
  profile?: ProfileConfig
  /** `status` column key → authored label, from `uiConfig.statusList` — see `FieldDescriptor.statusLabels`. */
  statusLabels?: Record<string, string>
}

function normalize(input: FieldSetInput): Normalized {
  if ('fields' in input) {
    return { code: input.code ?? 'anon', version: input.version, columns: [...input.fields], profile: input.profile }
  }
  const families: (AnyColumn[] | undefined)[] = [
    input.systemcolumns,
    input.streamcolumns,
    input.datacolumns,
    input.usercolumns,
    input.validation_columns,
  ]
  const seen = new Set<string>()
  const columns: AnyColumn[] = []
  for (const fam of families) {
    for (const c of fam ?? []) {
      if (seen.has(c.col)) continue
      seen.add(c.col)
      columns.push(c)
    }
  }
  const statusList = input.uiConfig?.statusList
  const statusLabels = statusList?.length
    ? Object.fromEntries(statusList.map((s) => [s.key, s.label]))
    : undefined
  return { code: input.code, version: input.version, columns, profile: input.uiConfig?.profile, statusLabels }
}

/* ── Descriptor derivation ──────────────────────────────────────────────────── */

function colComponent(c: AnyColumn): { name: string; props?: Record<string, unknown> } | undefined {
  return 'component' in c ? c.component : undefined
}

function colCreation(c: AnyColumn): FieldDescriptor['creation'] {
  return 'creation' in c ? c.creation : undefined
}

function toDescriptor(c: AnyColumn, opts: CompileOptions, statusLabels?: Record<string, string>): FieldDescriptor {
  const component = colComponent(c)
  // Unit precedence, most specific first: an explicit `compileFieldSet({units})`
  // override, then the field's own component props (`unit`, then the legacy
  // `suffix` alias), then the COLUMN's authored `unit` (`SystemColumn.unit` —
  // the blueprint declaring `"unit": "km"` on the column itself, so every
  // surface reading that field prints the unit without restating it per
  // placement). Purely additive: a column with no `unit` resolves exactly as
  // before.
  const unit =
    opts.units?.[c.col] ??
    (typeof component?.props?.unit === 'string' ? component.props.unit : undefined) ??
    (typeof component?.props?.suffix === 'string' ? component.props.suffix : undefined) ??
    c.unit
  return {
    id: c.id ?? `fld_${c.col}`,
    col: c.col,
    label: c.name ?? c.col,
    type: c.type,
    required: c.required ?? false,
    multiple: MULTI_TYPES.has(c.type),
    options: c.listValues,
    refModule: c.refModule as ReferenceKind | undefined,
    entityType: c.entityType,
    unit,
    min: c.min,
    max: c.max,
    component,
    creation: colCreation(c),
    // Only the universal `status` storage slot ever gets a label map — see
    // `FieldDescriptor.statusLabels`'s docblock for why this is narrow by
    // column identity rather than by type/label heuristics.
    statusLabels: c.col === 'status' ? statusLabels : undefined,
    repeating: opts.repeating?.includes(c.col) ?? false,
    default: c.default,
  }
}

/* ── Zod schema per descriptor ──────────────────────────────────────────────── */

const REQUIRED = { message: 'Required' }
const emptyToUndef = (v: unknown): unknown => (v === '' || v == null ? undefined : v)
const toNumberOrUndef = (v: unknown): unknown =>
  v === '' || v == null ? undefined : typeof v === 'string' ? Number(v) : v

/** Base scalar schema for a single value of this descriptor's type. */
function scalarSchema(d: FieldDescriptor): z.ZodTypeAny {
  switch (d.type) {
    case 'Auto':
      return z.string()
    case 'Email':
      return z.email({ message: 'Enter a valid email' })
    case 'Numeric':
    case 'Number':
    case 'Currency': {
      let n = z.number({ message: 'Enter a number' })
      if (d.min != null) n = n.min(d.min, { message: `Must be ≥ ${d.min}` })
      if (d.max != null) n = n.max(d.max, { message: `Must be ≤ ${d.max}` })
      return n
    }
    case 'Boolean':
      return z.boolean()
    case 'SingleSelect':
    case 'MultiSelect':
      return d.options?.length ? z.enum(d.options as [string, ...string[]]) : z.string()
    default:
      // SmallText | BigText | LongText | Phone | Color | Date | DateTime |
      // SingleReference | MultiReference | Assignee | tags → id/string
      return z.string()
  }
}

function fieldSchema(d: FieldDescriptor): z.ZodTypeAny {
  // Auto columns are system-generated — never edited, never required.
  if (d.type === 'Auto') return z.string().optional()

  const isNumeric = d.type === 'Numeric' || d.type === 'Number' || d.type === 'Currency'
  const scalar = scalarSchema(d)

  // Native multi types (MultiSelect/MultiReference/tags): array of scalars.
  if (d.multiple) {
    const arr = z.array(scalar)
    return d.required ? arr.min(1, { message: 'Select at least one' }) : arr.optional()
  }
  // Repeating scalar list: react-hook-form `useFieldArray` needs OBJECT items
  // to attach a stable key, so each row is `{ value }` internally; SchemaForm
  // unwraps back to a scalar array on submit. TODO(blueprint): the schema has
  // no first-class repeating-group authoring — this shape is the interim model.
  if (d.repeating) {
    const arr = z.array(z.object({ value: scalar }))
    return d.required ? arr.min(1, { message: 'Add at least one' }) : arr.optional()
  }

  if (isNumeric) {
    return z.preprocess(toNumberOrUndef, d.required ? scalar : scalar.optional())
  }
  if (d.type === 'Boolean') {
    return d.required ? scalar : scalar.optional()
  }
  // String-like (incl. Email/enum/reference): required → min-1 / format; else
  // treat '' as "unset" so an empty optional email/select passes.
  if (d.required) {
    if (d.type === 'Email' || d.type === 'SingleSelect') return scalar
    return (scalar as z.ZodString).min(1, REQUIRED)
  }
  return z.preprocess(emptyToUndef, scalar.optional())
}

/* ── Layout plan ────────────────────────────────────────────────────────────── */

function rowsFrom(
  placements: { col: string; order?: number }[],
  has: (col: string) => boolean,
): LayoutRow[] {
  const usable = placements.filter((p) => has(p.col))
  const byOrder = new Map<number, string[]>()
  const loose: string[] = []
  for (const p of usable) {
    if (p.order == null) loose.push(p.col)
    else {
      const row = byOrder.get(p.order) ?? []
      row.push(p.col)
      byOrder.set(p.order, row)
    }
  }
  const rows: LayoutRow[] = [...byOrder.keys()].sort((a, b) => a - b).map((k) => ({ cols: byOrder.get(k)! }))
  for (const col of loose) rows.push({ cols: [col] })
  return rows
}

function buildLayout(descriptors: FieldDescriptor[], profile: ProfileConfig | undefined, flat: boolean): LayoutPlan {
  const has = (col: string) => descriptors.some((d) => d.col === col)
  if (flat || !profile) {
    return { groups: [{ id: 'default', rows: descriptors.map((d) => ({ cols: [d.col] })) }] }
  }
  const groups: LayoutGroup[] = []
  const detailRows = rowsFrom(profile.details ?? [], has)
  if (detailRows.length) groups.push({ id: 'details', name: 'Details', rows: detailRows })
  for (const section of profile.sections ?? []) {
    const rows = rowsFrom(section.fields ?? [], has)
    if (rows.length) groups.push({ id: section.id ?? `sec_${section.name}`, name: section.name, rows })
  }
  // Any descriptor not placed by the profile falls into a trailing "Other" group
  // so the form never silently drops a field.
  const placed = new Set(groups.flatMap((g) => g.rows.flatMap((r) => r.cols)))
  const rest = descriptors.filter((d) => !placed.has(d.col))
  if (rest.length) groups.push({ id: 'other', rows: rest.map((d) => ({ cols: [d.col] })) })
  return groups.length ? { groups } : { groups: [{ id: 'default', rows: descriptors.map((d) => ({ cols: [d.col] })) }] }
}

/* ── compileFieldSet ────────────────────────────────────────────────────────── */

export function compileFieldSet(input: FieldSetInput, opts: CompileOptions = {}): CompiledFieldSet {
  const { code, version, columns, profile, statusLabels } = normalize(input)
  const key = `${code}@${version ?? `h${hashFields(columns, statusLabels)}`}`

  if (!opts.noCache && !opts.flat && !opts.repeating && !opts.units) {
    const cached = cacheGet(key)
    if (cached) {
      hits++
      return cached
    }
    misses++
  }

  const descriptors = columns.map((c) => toDescriptor(c, opts, statusLabels))
  const byCol: Record<string, FieldDescriptor> = {}
  const shape: Record<string, z.ZodTypeAny> = {}
  for (const d of descriptors) {
    byCol[d.col] = d
    shape[d.col] = fieldSchema(d)
  }
  const compiled: CompiledFieldSet = {
    key,
    schema: z.object(shape) as unknown as CompiledFieldSet['schema'],
    descriptors,
    byCol,
    layout: buildLayout(descriptors, profile, opts.flat ?? false),
  }

  if (!opts.noCache && !opts.flat && !opts.repeating && !opts.units) cacheSet(key, compiled)
  return compiled
}
