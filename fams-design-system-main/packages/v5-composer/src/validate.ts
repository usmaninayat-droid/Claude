import type { FieldType, ReferenceKind } from './types'
import { getModuleType } from './module-registry'
import {
  DASHBOARD_FILTER_PILL_TYPES,
  DASHBOARD_KPI_TYPES,
  DASHBOARD_WIDGET_TYPES,
} from './blueprint-schema.dashboard'

/**
 * Blueprint validator — a LIGHT, dependency-free structural validator with
 * precise error paths.
 *
 * VALIDATOR CHOICE: no `ajv`. ajv is MIT (license-clean) but pulls a
 * meaningful transitive tree (`fast-deep-equal`, `json-schema-traverse`,
 * `uri-js`, …) and a code-generation runtime for a package whose whole job is
 * to stay lean and framework-free. The blueprint contract is small and fully
 * known here, so a hand-written structural validator — one that also encodes
 * the semantic rules JSON Schema can't express cleanly (stable-ID presence on
 * every node; reference integrity) — is the better fit. The JSON Schema files
 * in `schemas/` remain the published, editor-facing contract; this validator is
 * the programmatic gate that mirrors them. If the contract grows enough to
 * justify ajv, revisit — the error shape below is ajv-compatible enough to swap.
 *
 * Enforces the tenant-model **stable-ID rule**: every node (module, column,
 * status, field placement, profile section, tab, filter) carries a non-empty
 * `id`.
 */

export interface ValidationError {
  /** JSON-pointer-ish path to the offending node, e.g. `modules[0].systemcolumns[2].id`. */
  path: string
  message: string
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  /**
   * Non-fatal notes. Populated when a document is structurally accepted but a
   * dimension of it is not (yet) validated — e.g. a standalone
   * dashboard/reports/settings module config, whose per-kind schema this
   * light validator does not yet mirror (§5 cleanup, task 2.7).
   */
  warnings?: string[]
}

const FIELD_TYPES: ReadonlySet<FieldType> = new Set<FieldType>([
  'Auto',
  'SmallText',
  'BigText',
  'LongText',
  'Email',
  'Phone',
  'Numeric',
  'Number',
  'Currency',
  'Boolean',
  'SingleSelect',
  'MultiSelect',
  'SingleReference',
  'MultiReference',
  'Date',
  'DateTime',
  'tags',
  'Color',
  'Assignee',
])

const REFERENCE_KINDS: ReadonlySet<ReferenceKind> = new Set<ReferenceKind>([
  'Entity',
  'Tag',
  'Users',
])

const REFERENCE_TYPES: ReadonlySet<FieldType> = new Set<FieldType>([
  'SingleReference',
  'MultiReference',
])

type Obj = Record<string, unknown>

function isObject(v: unknown): v is Obj {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

class Ctx {
  errors: ValidationError[] = []
  err(path: string, message: string): void {
    this.errors.push({ path, message })
  }
  /** Require a non-empty string at `obj[key]`. Returns true if present + valid. */
  reqString(obj: Obj, key: string, path: string): boolean {
    const v = obj[key]
    if (typeof v !== 'string' || v.length === 0) {
      this.err(`${path}.${key}`, `expected a non-empty string`)
      return false
    }
    return true
  }
  /** The stable-ID rule for one node. */
  reqId(obj: Obj, path: string): void {
    const v = obj['id']
    if (typeof v !== 'string' || v.length === 0) {
      this.err(`${path}.id`, `stable id is required (every node must carry a non-empty \`id\`)`)
    }
  }
}

/* ── Field-level checks ─────────────────────────────────────────────────────── */

function checkPlacement(ctx: Ctx, node: unknown, path: string): void {
  if (!isObject(node)) {
    ctx.err(path, 'expected a field-placement object')
    return
  }
  ctx.reqId(node, path)
  ctx.reqString(node, 'col', path)
}

function checkPlacements(ctx: Ctx, arr: unknown, path: string): void {
  if (arr === undefined) return
  if (!Array.isArray(arr)) {
    ctx.err(path, 'expected an array of field placements')
    return
  }
  arr.forEach((p, i) => checkPlacement(ctx, p, `${path}[${i}]`))
}

function checkSystemColumn(ctx: Ctx, node: unknown, path: string): void {
  if (!isObject(node)) {
    ctx.err(path, 'expected a column descriptor object')
    return
  }
  ctx.reqId(node, path)
  ctx.reqString(node, 'col', path)
  ctx.reqString(node, 'name', path)
  const type = node['type']
  if (typeof type !== 'string' || !FIELD_TYPES.has(type as FieldType)) {
    ctx.err(`${path}.type`, `unknown field type ${JSON.stringify(type)}`)
    return
  }
  // Reference integrity.
  if (REFERENCE_TYPES.has(type as FieldType)) {
    const refModule = node['refModule']
    if (typeof refModule !== 'string' || !REFERENCE_KINDS.has(refModule as ReferenceKind)) {
      ctx.err(
        `${path}.refModule`,
        `a ${type} field requires refModule ∈ {Entity, Tag, Users}, got ${JSON.stringify(refModule)}`,
      )
    } else if (refModule === 'Entity' && typeof node['entityType'] !== 'string') {
      ctx.err(`${path}.entityType`, `refModule 'Entity' requires an entityType (referenced entity code)`)
    }
  }
}

/* ── Module config docs ─────────────────────────────────────────────────────── */

function checkColumnFamilies(ctx: Ctx, config: Obj): void {
  const families = [
    'systemcolumns',
    'streamcolumns',
    'datacolumns',
    'usercolumns',
    'validation_columns',
  ] as const
  for (const fam of families) {
    const arr = config[fam]
    if (arr === undefined) continue
    if (!Array.isArray(arr)) {
      ctx.err(fam, `expected an array of column descriptors`)
      continue
    }
    arr.forEach((c, i) => checkSystemColumn(ctx, c, `${fam}[${i}]`))
  }
  if (config['systemcolumns'] === undefined) {
    ctx.err('systemcolumns', 'required (at least one system column)')
  } else if (Array.isArray(config['systemcolumns']) && config['systemcolumns'].length === 0) {
    ctx.err('systemcolumns', 'must contain at least one column')
  }
}

function checkUiConfig(ctx: Ctx, ui: unknown, path: string, opts: { pipeline: boolean }): void {
  if (!isObject(ui)) {
    ctx.err(path, 'uiConfig is required')
    return
  }
  const statusList = ui['statusList']
  if (!Array.isArray(statusList)) {
    ctx.err(`${path}.statusList`, 'required (an array of status defs)')
  } else {
    statusList.forEach((s, i) => {
      const sp = `${path}.statusList[${i}]`
      if (!isObject(s)) {
        ctx.err(sp, 'expected a status def object')
        return
      }
      ctx.reqId(s, sp)
      ctx.reqString(s, 'key', sp)
      ctx.reqString(s, 'label', sp)
      ctx.reqString(s, 'color', sp)
    })
    if (opts.pipeline && statusList.length < 2) {
      ctx.err(`${path}.statusList`, 'a pipeline needs at least two stages')
    }
  }

  const kanbanCard = ui['kanbanCard']
  if (opts.pipeline && !isObject(kanbanCard)) {
    ctx.err(`${path}.kanbanCard`, 'a pipeline requires a kanbanCard')
  }
  if (isObject(kanbanCard)) {
    checkPlacements(ctx, kanbanCard['header'], `${path}.kanbanCard.header`)
    checkPlacements(ctx, kanbanCard['body'], `${path}.kanbanCard.body`)
    checkPlacements(ctx, kanbanCard['footer'], `${path}.kanbanCard.footer`)
  }

  const profile = ui['profile']
  if (isObject(profile)) {
    checkPlacement(ctx, profile['title'], `${path}.profile.title`)
    checkPlacements(ctx, profile['details'], `${path}.profile.details`)
    const sections = profile['sections']
    if (sections !== undefined) {
      if (!Array.isArray(sections)) {
        ctx.err(`${path}.profile.sections`, 'expected an array')
      } else {
        sections.forEach((s, i) => {
          const spath = `${path}.profile.sections[${i}]`
          if (!isObject(s)) {
            ctx.err(spath, 'expected a section object')
            return
          }
          ctx.reqId(s, spath)
          ctx.reqString(s, 'name', spath)
          checkPlacements(ctx, s['fields'], `${spath}.fields`)
        })
      }
    }
    const rightPanel = profile['rightPanel']
    if (isObject(rightPanel) && Array.isArray(rightPanel['tabs'])) {
      ;(rightPanel['tabs'] as unknown[]).forEach((t, i) => {
        const tp = `${path}.profile.rightPanel.tabs[${i}]`
        if (!isObject(t)) {
          ctx.err(tp, 'expected a tab object')
          return
        }
        ctx.reqId(t, tp)
        ctx.reqString(t, 'key', tp)
        ctx.reqString(t, 'title', tp)
      })
    }
  }

  const filters = ui['filters']
  if (filters !== undefined) {
    if (!Array.isArray(filters)) {
      ctx.err(`${path}.filters`, 'expected an array')
    } else {
      filters.forEach((f, i) => {
        const fp = `${path}.filters[${i}]`
        if (!isObject(f)) {
          ctx.err(fp, 'expected a filter object')
          return
        }
        ctx.reqId(f, fp)
        ctx.reqString(f, 'col', fp)
      })
    }
  }
}

function checkModuleConfig(ctx: Ctx, config: Obj, pipeline: boolean): void {
  ctx.reqString(config, 'code', '')
  ctx.reqString(config, 'name', '')
  checkColumnFamilies(ctx, config)
  checkUiConfig(ctx, config['uiConfig'], 'uiConfig', { pipeline })
  checkPlacements(ctx, config['listcolumns'], 'listcolumns')
}

/** Validate a standalone entity module config document. */
export function validateEntityModuleConfig(json: unknown): ValidationResult {
  const ctx = new Ctx()
  if (!isObject(json)) {
    ctx.err('', 'expected an object')
  } else {
    checkModuleConfig(ctx, json, false)
  }
  return { valid: ctx.errors.length === 0, errors: ctx.errors }
}

/** Validate a standalone pipeline module config document. */
export function validatePipelineModuleConfig(json: unknown): ValidationResult {
  const ctx = new Ctx()
  if (!isObject(json)) {
    ctx.err('', 'expected an object')
  } else {
    checkModuleConfig(ctx, json, true)
  }
  return { valid: ctx.errors.length === 0, errors: ctx.errors }
}

/* ── Dashboard module config ────────────────────────────────────────────────── */

const DASHBOARD_WIDGET_TYPE_SET: ReadonlySet<string> = new Set(DASHBOARD_WIDGET_TYPES)
const DASHBOARD_KPI_TYPE_SET: ReadonlySet<string> = new Set(DASHBOARD_KPI_TYPES)
const DASHBOARD_PILL_TYPE_SET: ReadonlySet<string> = new Set(DASHBOARD_FILTER_PILL_TYPES)

const MODULE_ID_PATTERN = /^[a-z][a-z0-9-]*$/

/** Require a non-empty `id` that is unique within `seen`, reporting a precise duplicate. */
function checkUniqueId(ctx: Ctx, node: Obj, path: string, seen: Set<string>, noun: string): void {
  ctx.reqId(node, path)
  const id = node['id']
  if (typeof id !== 'string' || id.length === 0) return
  if (seen.has(id)) {
    ctx.err(`${path}.id`, `duplicate ${noun} id ${JSON.stringify(id)} (ids must be unique within the dashboard)`)
    return
  }
  seen.add(id)
}

/** Require an enum-valued string at `obj[key]`, naming every legal value on failure. */
function checkEnum(ctx: Ctx, obj: Obj, key: string, path: string, allowed: ReadonlySet<string>): void {
  const v = obj[key]
  if (typeof v !== 'string' || !allowed.has(v)) {
    ctx.err(
      `${path}.${key}`,
      `expected one of ${[...allowed].map((a) => JSON.stringify(a)).join(', ')}, got ${JSON.stringify(v)}`,
    )
  }
}

function checkDashboardWidget(
  ctx: Ctx,
  node: unknown,
  path: string,
  seen: Set<string>,
  depth = 0,
): void {
  if (!isObject(node)) {
    ctx.err(path, 'expected a widget object')
    return
  }
  checkUniqueId(ctx, node, path, seen, 'widget')
  checkEnum(ctx, node, 'type', path, DASHBOARD_WIDGET_TYPE_SET)

  // `stack` is a LAYOUT node, not a data widget: it owns `children` and
  // nothing else owns them. One level only — a stack of stacks is a second
  // grid, and the masonry column this exists for never needs one.
  const children = node['children']
  if (node['type'] === 'stack') {
    if (depth > 0) {
      ctx.err(path, 'a `stack` widget cannot be nested inside another `stack` (one level only)')
    }
    if (!Array.isArray(children) || children.length === 0) {
      ctx.err(`${path}.children`, 'a `stack` widget requires a non-empty `children` array (it has no data of its own)')
    } else {
      children.forEach((child, i) => checkDashboardWidget(ctx, child, `${path}.children[${i}]`, seen, depth + 1))
    }
  } else if (children !== undefined) {
    ctx.err(`${path}.children`, `\`children\` is only legal on a \`stack\` widget, not on ${JSON.stringify(node['type'])}`)
  }

  const span = node['span']
  if (span !== undefined) {
    if (typeof span !== 'number' || !Number.isInteger(span) || span < 1 || span > 12) {
      ctx.err(`${path}.span`, `span must be an integer between 1 and 12 (the grid is 12 columns), got ${JSON.stringify(span)}`)
    }
  }

  const dataSource = node['dataSource']
  if (dataSource !== undefined && !isObject(dataSource)) {
    ctx.err(`${path}.dataSource`, 'expected an object (the shared dashboard data-binding vocabulary)')
  } else if (isObject(dataSource)) {
    const kind = dataSource['kind']
    if (kind !== undefined && kind !== 'static' && kind !== 'module') {
      ctx.err(`${path}.dataSource.kind`, `expected "static" or "module", got ${JSON.stringify(kind)}`)
    }
    if (kind === 'module' && typeof dataSource['module'] !== 'string') {
      ctx.err(`${path}.dataSource.module`, `kind "module" requires a \`module\` id to derive the values from`)
    }
    const placement = dataSource['legendPlacement']
    if (placement !== undefined && placement !== 'top' && placement !== 'bottom') {
      ctx.err(`${path}.dataSource.legendPlacement`, `expected "top" or "bottom", got ${JSON.stringify(placement)}`)
    }
    const showRank = dataSource['showRank']
    if (showRank !== undefined && typeof showRank !== 'boolean') {
      ctx.err(`${path}.dataSource.showRank`, `expected a boolean, got ${JSON.stringify(showRank)}`)
    }
    checkDashboardAxis(ctx, dataSource['axis'], `${path}.dataSource.axis`)
    checkDashboardDimensionBindings(ctx, dataSource, `${path}.dataSource`)
  }
}

/**
 * The filter-dimension vocabulary — `dimensions` on every filterable datum,
 * `categoryDimensions` parallel to `categories`, and `variants[].when`.
 *
 * The parallel-array rule is the one worth enforcing loudly: a
 * `categoryDimensions` that is shorter than `categories` silently drops the
 * tail of every trend the moment a pill is used, which reads as data loss
 * rather than as an authoring mistake.
 */
function checkDashboardDimensionBindings(ctx: Ctx, source: Obj, path: string): void {
  const check = (value: unknown, at: string): void => {
    if (value === undefined) return
    if (!isObject(value)) {
      ctx.err(at, 'expected an object of dimension → id (or id array)')
      return
    }
    for (const [dimension, ids] of Object.entries(value)) {
      const ok =
        typeof ids === 'string' || (Array.isArray(ids) && ids.every((id) => typeof id === 'string'))
      if (!ok) {
        ctx.err(`${at}.${dimension}`, `expected a string or an array of strings, got ${JSON.stringify(ids)}`)
      }
    }
  }

  for (const key of ['series', 'slices', 'items', 'rows', 'cells'] as const) {
    const list = source[key]
    if (!Array.isArray(list)) continue
    list.forEach((entry, i) => {
      if (isObject(entry)) check(entry['dimensions'], `${path}.${key}[${i}].dimensions`)
    })
  }

  const categoryDimensions = source['categoryDimensions']
  if (categoryDimensions !== undefined) {
    if (!Array.isArray(categoryDimensions)) {
      ctx.err(`${path}.categoryDimensions`, 'expected an array parallel to `categories`')
    } else {
      const categories = source['categories']
      if (Array.isArray(categories) && categories.length !== categoryDimensions.length) {
        ctx.err(
          `${path}.categoryDimensions`,
          `must be exactly parallel to \`categories\` — ${categoryDimensions.length} entries for ${categories.length} categories`,
        )
      }
      categoryDimensions.forEach((entry, i) => check(entry, `${path}.categoryDimensions[${i}]`))
    }
  }

  const variants = source['variants']
  if (variants !== undefined) {
    if (!Array.isArray(variants)) {
      ctx.err(`${path}.variants`, 'expected an array of source variants')
    } else {
      variants.forEach((variant, i) => {
        const vp = `${path}.variants[${i}]`
        if (!isObject(variant)) {
          ctx.err(vp, 'expected a variant object')
          return
        }
        if (variant['when'] === undefined) {
          ctx.err(`${vp}.when`, 'required (the dimension values this variant applies under)')
        }
        check(variant['when'], `${vp}.when`)
      })
    }
  }
}

/** `axis.{x,y,yRight}` — pinned bounds must be finite numbers and `min` must precede `max`. */
function checkDashboardAxis(ctx: Ctx, axis: unknown, path: string): void {
  if (axis === undefined) return
  if (!isObject(axis)) {
    ctx.err(path, 'expected an object with `x` / `y` / `yRight` axis specs')
    return
  }
  for (const edge of ['x', 'y', 'yRight'] as const) {
    const spec = axis[edge]
    if (spec === undefined) continue
    if (!isObject(spec)) {
      ctx.err(`${path}.${edge}`, 'expected an axis spec object')
      continue
    }
    for (const bound of ['min', 'max'] as const) {
      const value = spec[bound]
      if (value !== undefined && (typeof value !== 'number' || !Number.isFinite(value))) {
        ctx.err(`${path}.${edge}.${bound}`, `expected a finite number, got ${JSON.stringify(value)}`)
      }
    }
    const { min, max } = spec as { min?: unknown; max?: unknown }
    if (typeof min === 'number' && typeof max === 'number' && min >= max) {
      ctx.err(`${path}.${edge}`, `min (${min}) must be less than max (${max})`)
    }
  }
}

/**
 * Validate a standalone dashboard module config document — the structural twin
 * of `schemas/DashboardModuleConfig.schema.json`, plus the semantic rules JSON
 * Schema cannot express (unique widget/tile/pill ids).
 */
export function validateDashboardModuleConfig(json: unknown): ValidationResult {
  const ctx = new Ctx()
  if (!isObject(json)) {
    return { valid: false, errors: [{ path: '', message: 'expected an object' }] }
  }

  if (ctx.reqString(json, 'id', '')) {
    const id = json['id'] as string
    if (!MODULE_ID_PATTERN.test(id)) {
      ctx.err('id', `module id must match ${MODULE_ID_PATTERN.source} (lowercase, digits and dashes), got ${JSON.stringify(id)}`)
    }
  }

  const kind = json['kind']
  if (kind !== undefined && kind !== 'dashboard') {
    ctx.err('kind', `expected "dashboard", got ${JSON.stringify(kind)}`)
  }

  const displayName = json['displayName']
  if (!isObject(displayName)) {
    ctx.err('displayName', 'required (an object with at least a `singular` name)')
  } else {
    ctx.reqString(displayName, 'singular', 'displayName')
  }

  const kpiStrip = json['kpiStrip']
  if (kpiStrip !== undefined) {
    if (!Array.isArray(kpiStrip)) {
      ctx.err('kpiStrip', 'expected an array of KPI tiles')
    } else {
      const seen = new Set<string>()
      kpiStrip.forEach((tile, i) => {
        const tp = `kpiStrip[${i}]`
        if (!isObject(tile)) {
          ctx.err(tp, 'expected a KPI tile object')
          return
        }
        checkUniqueId(ctx, tile, tp, seen, 'KPI tile')
        ctx.reqString(tile, 'label', tp)
        checkEnum(ctx, tile, 'type', tp, DASHBOARD_KPI_TYPE_SET)
      })
    }
  }

  const filterPills = json['filterPills']
  if (filterPills !== undefined) {
    if (!Array.isArray(filterPills)) {
      ctx.err('filterPills', 'expected an array of filter pills')
    } else {
      const seen = new Set<string>()
      filterPills.forEach((pill, i) => {
        const pp = `filterPills[${i}]`
        if (!isObject(pill)) {
          ctx.err(pp, 'expected a filter-pill object')
          return
        }
        checkUniqueId(ctx, pill, pp, seen, 'filter pill')
        ctx.reqString(pill, 'label', pp)
        checkEnum(ctx, pill, 'type', pp, DASHBOARD_PILL_TYPE_SET)
        const dimension = pill['dimension']
        if (dimension !== undefined && (typeof dimension !== 'string' || dimension.length === 0)) {
          ctx.err(`${pp}.dimension`, `expected a non-empty dimension name, got ${JSON.stringify(dimension)}`)
        }
      })
    }
  }

  const widgetGrid = json['widgetGrid']
  if (widgetGrid === undefined) {
    ctx.err('widgetGrid', 'required (a dashboard is its widget grid — supply at least one widget)')
  } else if (!Array.isArray(widgetGrid)) {
    ctx.err('widgetGrid', 'expected an array of widgets')
  } else if (widgetGrid.length === 0) {
    ctx.err('widgetGrid', 'must contain at least one widget')
  } else {
    const seen = new Set<string>()
    widgetGrid.forEach((w, i) => checkDashboardWidget(ctx, w, `widgetGrid[${i}]`, seen))
  }

  const views = json['views']
  if (views !== undefined) {
    if (!Array.isArray(views)) {
      ctx.err('views', 'expected an array of saved-view declarations')
    } else {
      const seen = new Set<string>()
      views.forEach((v, i) => {
        const vp = `views[${i}]`
        if (!isObject(v)) {
          ctx.err(vp, 'expected a view object')
          return
        }
        checkUniqueId(ctx, v, vp, seen, 'view')
        ctx.reqString(v, 'label', vp)
      })
    }
  }

  return { valid: ctx.errors.length === 0, errors: ctx.errors }
}

/* ── App blueprint doc ──────────────────────────────────────────────────────── */

function checkAppBlueprint(ctx: Ctx, doc: Obj): void {
  ctx.reqString(doc, 'id', '')
  ctx.reqString(doc, 'tenant', '')
  const brand = doc['brand']
  if (!isObject(brand)) {
    ctx.err('brand', 'required (must have a name)')
  } else {
    ctx.reqString(brand, 'name', 'brand')
  }

  const modules = doc['modules']
  if (!Array.isArray(modules) || modules.length === 0) {
    ctx.err('modules', 'required (a non-empty array of module nodes)')
    return
  }
  modules.forEach((m, i) => {
    const mp = `modules[${i}]`
    if (!isObject(m)) {
      ctx.err(mp, 'expected a module node object')
      return
    }
    ctx.reqId(m, mp)
    ctx.reqString(m, 'label', mp)
    const type = m['type']
    if (typeof type !== 'string' || type.length === 0) {
      ctx.err(`${mp}.type`, 'a module type is required')
    } else if (!getModuleType(type)) {
      ctx.err(`${mp}.type`, `unknown module type ${JSON.stringify(type)} (register it via registerModuleType)`)
    }
    const dataSource = m['dataSource']
    if (dataSource !== undefined) {
      if (!isObject(dataSource)) ctx.err(`${mp}.dataSource`, 'expected an object')
      else ctx.reqString(dataSource, 'code', `${mp}.dataSource`)
    }
    // Recurse into an inline (object) module config; path strings are resolved
    // by the bundle loader and validated separately as their own documents.
    const config = m['config']
    if (isObject(config)) {
      // Dispatch by kind, exactly as `validateBlueprint` does for a standalone
      // document — a dashboard config has no `systemcolumns`/`uiConfig`, so
      // force-feeding it the entity checker would fail it spuriously.
      const nestedErrors =
        type === 'dashboard' || config['kind'] === 'dashboard'
          ? validateDashboardModuleConfig(config).errors
          : (() => {
              const nested = new Ctx()
              checkModuleConfig(nested, config, type === 'pipeline')
              return nested.errors
            })()
      for (const e of nestedErrors) {
        ctx.err(e.path ? `${mp}.config.${e.path}` : `${mp}.config`, e.message)
      }
    }
  })
}

/**
 * Validate a blueprint document. Dispatches on shape:
 *  - a doc with `modules` → an app blueprint (recurses into inline configs);
 *  - a doc with `kind` → dispatch on the module-type `kind`:
 *      · `pipeline` → pipeline module-config validation;
 *      · `entity`   → entity module-config validation;
 *      · `dashboard` → dashboard module-config validation;
 *      · any OTHER registered module type (reports / settings / …)
 *        → accepted with a `not yet implemented` warning (these carry their own
 *        per-kind JSON Schema in `schemas/` but no structural checker here yet —
 *        they must NOT be force-fed to the entity validator, which was the
 *        parked 2.1-review bug: a Dashboard config has no `systemcolumns`/
 *        `uiConfig`, so entity validation failed it spuriously);
 *      · an UNKNOWN `kind` → an error naming it.
 *  - a doc with `systemcolumns` but no `kind` → an entity module config.
 */
export function validateBlueprint(json: unknown): ValidationResult {
  if (!isObject(json)) {
    return { valid: false, errors: [{ path: '', message: 'expected an object' }] }
  }
  if (Array.isArray(json['modules'])) {
    const ctx = new Ctx()
    checkAppBlueprint(ctx, json)
    return { valid: ctx.errors.length === 0, errors: ctx.errors }
  }
  const kind = json['kind']
  if (typeof kind === 'string') {
    if (kind === 'pipeline') return validatePipelineModuleConfig(json)
    if (kind === 'entity') return validateEntityModuleConfig(json)
    if (kind === 'dashboard') return validateDashboardModuleConfig(json)
    // A non-entity/pipeline module config: accept it structurally when it names
    // a REGISTERED module type, but flag that its per-kind validation is not
    // yet implemented here. Unknown kinds are a hard error.
    if (getModuleType(kind)) {
      return {
        valid: true,
        errors: [],
        warnings: [`\`${kind}\` module-config validation not yet implemented (structurally accepted)`],
      }
    }
    return {
      valid: false,
      errors: [
        { path: 'kind', message: `unknown module type ${JSON.stringify(kind)} (register it via registerModuleType)` },
      ],
    }
  }
  if ('systemcolumns' in json) {
    return validateEntityModuleConfig(json)
  }
  return {
    valid: false,
    errors: [
      {
        path: '',
        message:
          'unrecognized blueprint document — expected an app blueprint (with `modules`) or a module config (with `systemcolumns`/`kind`)',
      },
    ],
  }
}
