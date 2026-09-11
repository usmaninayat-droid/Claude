import { useEffect } from 'react'
import type maplibregl from 'maplibre-gl'

/**
 * label-overrides.ts — renaming a basemap label, generically.
 *
 * The vector tiles FAMS renders are OpenStreetMap-derived, and some of their
 * names are contested or simply not the name a given deployment's users
 * expect. A tenant must be able to say "this feature is called X here"
 * WITHOUT a component fork, a patched tile set, or a per-tenant style file:
 * that is `uiConfig.map.labelOverrides`, a plain list of
 * `{ match: { name }, text }` rules the design system applies to whatever
 * style happens to be loaded.
 *
 * MECHANISM — the water/marine label layers' `text-field` layout expression
 * is REWRITTEN, not the data, and it is rewritten SURGICALLY: every
 * name-field getter inside the expression (`["get","name:latin"]`, `name`,
 * `name:en`, `name_en`) is swapped for a `case` that returns the override
 * text when the feature's name matches, and the original getter otherwise.
 * The expression's own shape survives intact.
 *
 * That matters. Positron labels water as
 * `["case", ["has","name:nonlatin"],
 *           ["concat", ["get","name:latin"], "\n", ["get","name:nonlatin"]],
 *           …]` — replacing the WHOLE expression with the new string would
 * throw the second, local-script line away. Substituting only the latin
 * getter keeps the concat, the localisation and the line break, so the
 * Arabic label is never touched (it already reads correctly) and every
 * unmatched feature keeps the style's own label verbatim.
 *
 * RE-APPLICATION IS MANDATORY: a basemap switch calls `setStyle`, which
 * throws every layer away. The hook below re-applies on `style.load` and
 * `styledata`, so all six basemap variants carry the override.
 *
 * Idempotent: an already-substituted node is recognised and left alone, so
 * repeated `styledata` events can never nest the expression.
 */

export interface MapLabelOverride {
  /** Which feature to rename. Matched against the label name fields below. */
  match: { name: string }
  /** The replacement label text. */
  text: string
}

/**
 * The name fields a rule is tested against. OpenMapTiles-family styles label
 * water through `name:latin` (+ `name:nonlatin` for the local script);
 * others read `name`, `name:en`, or a flattened `name_en`. All are covered
 * rather than guessing which the tile build and style happen to use.
 *
 * `name:nonlatin` is DELIBERATELY absent: the point of an override is to
 * change the latin label a deployment disagrees with, and the local-script
 * name must survive untouched.
 */
export const LABEL_NAME_FIELDS = ['name:latin', 'name', 'name:en', 'name_en'] as const

/**
 * Symbol layers a rule may touch: the WATER/marine label layers. Restricted
 * on purpose — wrapping every symbol layer in a style would rewrite hundreds
 * of expressions to rename one sea.
 */
export function isWaterLabelLayer(layer: { id?: unknown; type?: unknown; 'source-layer'?: unknown }): boolean {
  if (layer.type !== 'symbol') return false
  const sourceLayer = String(layer['source-layer'] ?? '').toLowerCase()
  const id = String(layer.id ?? '').toLowerCase()
  return (
    sourceLayer.includes('water_name') ||
    sourceLayer.includes('waterway') ||
    sourceLayer.includes('marine') ||
    /water|marine|sea|ocean|bay|gulf/.test(id)
  )
}

/** `["get", <a name field>]` — the node a rule substitutes. */
function nameGetter(node: unknown): string | null {
  if (!Array.isArray(node) || node.length !== 2 || node[0] !== 'get') return null
  const field = node[1]
  return typeof field === 'string' && (LABEL_NAME_FIELDS as readonly string[]).includes(field) ? field : null
}

/** True for a node this module already produced (so it is never re-wrapped). */
function isSubstitution(node: unknown): boolean {
  return (
    Array.isArray(node) &&
    node[0] === 'case' &&
    node.length === 4 &&
    Array.isArray(node[1]) &&
    node[1][0] === '==' &&
    nameGetter(node[1][1]) !== null &&
    nameGetter(node[3]) !== null
  )
}

/**
 * Rewrites a `text-field` expression by substituting each NAME GETTER inside
 * it, leaving the expression's shape alone.
 *
 * This is the whole trick, and it is why the override is safe: Positron's
 * water labels are `["case", ["has","name:nonlatin"], ["concat",
 * ["get","name:latin"], "\n", ["get","name:nonlatin"]], …]`. Replacing the
 * WHOLE expression with the new text would throw the second, local-script
 * line away. Replacing only the latin getter keeps the concat, the
 * localisation, and the line break — the Arabic label is never touched,
 * which is exactly the contract (it already reads correctly).
 *
 * Pure and idempotent: an already-substituted node is returned as-is.
 */
export function rewriteNameGetters(node: unknown, overrides: readonly MapLabelOverride[]): unknown {
  if (isSubstitution(node)) return node
  const field = nameGetter(node)
  if (field !== null) {
    // Rules nest: each one tests the ORIGINAL getter and falls back to what
    // the previous rules built, so N rules become N `case` arms over the
    // same field and order does not change the result.
    return overrides.reduce<unknown>(
      (fallback, override) => ['case', ['==', ['get', field], override.match.name], override.text, fallback],
      ['get', field],
    )
  }
  if (Array.isArray(node)) return node.map((child) => rewriteNameGetters(child, overrides))
  return node
}

/**
 * Builds the replacement `text-field`. Falls back to a plain substitution on
 * `name` when the layer declares no expression at all.
 */
export function buildTextFieldExpression(original: unknown, overrides: readonly MapLabelOverride[]): unknown {
  if (overrides.length === 0) return original
  const base = original ?? ['get', 'name']
  return rewriteNameGetters(base, overrides)
}

type AnyMap = maplibregl.Map & {
  getStyle?: () => maplibregl.StyleSpecification
  getLayoutProperty?: (layerId: string, name: string) => unknown
  setLayoutProperty?: (layerId: string, name: string, value: unknown) => void
  isStyleLoaded?: () => boolean
}

/** Applies every rule to the map's current style. Safe to call repeatedly. */
export function applyLabelOverrides(map: AnyMap, overrides: readonly MapLabelOverride[]): number {
  if (overrides.length === 0) return 0
  let style: maplibregl.StyleSpecification | undefined
  try {
    style = map.getStyle?.()
  } catch {
    return 0
  }
  const layers = style?.layers
  if (!Array.isArray(layers)) return 0
  let applied = 0
  for (const layer of layers) {
    if (!isWaterLabelLayer(layer as never)) continue
    const id = (layer as { id?: unknown }).id
    if (typeof id !== 'string') continue
    try {
      const original = map.getLayoutProperty?.(id, 'text-field')
      const next = buildTextFieldExpression(original, overrides)
      if (JSON.stringify(next) === JSON.stringify(original)) continue
      map.setLayoutProperty?.(id, 'text-field', next)
      applied++
    } catch {
      /* a layer whose text-field cannot be set is skipped, never fatal */
    }
  }
  return applied
}

/**
 * useMapLabelOverrides — keeps the rules applied across style loads and
 * basemap switches. Inert with no rules, and inert under jsdom (the map is a
 * stub there, and every call is optional-chained).
 */
export function useMapLabelOverrides(map: maplibregl.Map | null, overrides: readonly MapLabelOverride[] | undefined): void {
  // Serialised so a caller passing a fresh array literal each render does not
  // re-subscribe on every render (rule 8 — stable prop identity is the
  // caller's job, but this hook must not punish them for it).
  const key = JSON.stringify(overrides ?? [])
  useEffect(() => {
    if (!map) return undefined
    const rules = JSON.parse(key) as MapLabelOverride[]
    if (rules.length === 0) return undefined
    const m = map as AnyMap
    const apply = () => applyLabelOverrides(m, rules)
    apply()
    // `style.load` fires for the initial style AND for every `setStyle` a
    // basemap switch performs; `styledata` catches the case where layers
    // arrive after that event (a diffed style update).
    m.on?.('style.load', apply)
    m.on?.('styledata', apply)
    return () => {
      m.off?.('style.load', apply)
      m.off?.('styledata', apply)
    }
  }, [map, key])
}
