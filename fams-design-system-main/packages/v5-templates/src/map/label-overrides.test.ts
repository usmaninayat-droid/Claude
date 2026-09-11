import { describe, expect, it, vi } from 'vitest'
import {
  LABEL_NAME_FIELDS,
  applyLabelOverrides,
  buildTextFieldExpression,
  isWaterLabelLayer,
  rewriteNameGetters,
  type MapLabelOverride,
} from './label-overrides'

const RULES: MapLabelOverride[] = [{ match: { name: 'Persian Gulf' }, text: 'Arabian Gulf' }]

/** Positron's real water label expression — the shape that must survive. */
const POSITRON_WATER_LABEL = [
  'case',
  ['has', 'name:nonlatin'],
  ['concat', ['get', 'name:latin'], '\n', ['get', 'name:nonlatin']],
  ['coalesce', ['get', 'name:latin'], ['get', 'name']],
]

describe('isWaterLabelLayer', () => {
  it('matches the water/marine symbol layers', () => {
    expect(isWaterLabelLayer({ id: 'water_name_point_label', type: 'symbol', 'source-layer': 'water_name' })).toBe(true)
    expect(isWaterLabelLayer({ id: 'waterway_line_label', type: 'symbol', 'source-layer': 'waterway' })).toBe(true)
  })

  it('leaves place/road labels and non-symbol layers alone', () => {
    expect(isWaterLabelLayer({ id: 'place-city', type: 'symbol', 'source-layer': 'place' })).toBe(false)
    expect(isWaterLabelLayer({ id: 'water', type: 'fill', 'source-layer': 'water' })).toBe(false)
  })
})

describe('rewriteNameGetters', () => {
  it('substitutes every latin name getter and leaves the shape intact', () => {
    const out = buildTextFieldExpression(POSITRON_WATER_LABEL, RULES) as unknown[]
    expect(out[0]).toBe('case')
    expect(out[1]).toEqual(['has', 'name:nonlatin'])
    const concat = out[2] as unknown[]
    expect(concat[0]).toBe('concat')
    // The concat still has three parts: substituted latin, separator, nonlatin.
    expect(concat).toHaveLength(4)
    expect(concat[2]).toBe('\n')
  })

  it('NEVER touches name:nonlatin — the Arabic label is left alone', () => {
    const out = JSON.stringify(buildTextFieldExpression(POSITRON_WATER_LABEL, RULES))
    // the only nonlatin node is still a bare getter
    expect(out).toContain('["get","name:nonlatin"]')
    expect(out).not.toContain('"name:nonlatin"],"Arabian Gulf"')
  })

  it('renames only the matching feature', () => {
    const arm = (buildTextFieldExpression(['get', 'name:latin'], RULES) as unknown[])
    expect(arm).toEqual(['case', ['==', ['get', 'name:latin'], 'Persian Gulf'], 'Arabian Gulf', ['get', 'name:latin']])
  })

  it('covers every name field a style might use', () => {
    for (const field of LABEL_NAME_FIELDS) {
      const out = buildTextFieldExpression(['get', field], RULES) as unknown[]
      expect(out[1]).toEqual(['==', ['get', field], 'Persian Gulf'])
    }
  })

  it('is idempotent — re-applying never nests', () => {
    const once = buildTextFieldExpression(POSITRON_WATER_LABEL, RULES)
    expect(buildTextFieldExpression(once, RULES)).toEqual(once)
    expect(rewriteNameGetters(once, RULES)).toEqual(once)
  })

  it('returns the original untouched with no rules', () => {
    expect(buildTextFieldExpression(POSITRON_WATER_LABEL, [])).toEqual(POSITRON_WATER_LABEL)
  })
})

describe('applyLabelOverrides', () => {
  const makeMap = () => {
    const layout = new Map<string, unknown>([
      ['water_name_point_label', POSITRON_WATER_LABEL],
      ['place-city', ['get', 'name:latin']],
    ])
    return {
      getStyle: () => ({
        layers: [
          { id: 'water_name_point_label', type: 'symbol', 'source-layer': 'water_name' },
          { id: 'place-city', type: 'symbol', 'source-layer': 'place' },
        ],
      }),
      getLayoutProperty: (id: string) => layout.get(id),
      setLayoutProperty: vi.fn((id: string, _name: string, value: unknown) => layout.set(id, value)),
      layout,
    }
  }

  it('rewrites only the water label layer', () => {
    const map = makeMap()
    expect(applyLabelOverrides(map as never, RULES)).toBe(1)
    expect(JSON.stringify(map.layout.get('water_name_point_label'))).toContain('Arabian Gulf')
    expect(map.layout.get('place-city')).toEqual(['get', 'name:latin'])
  })

  it('is a no-op the second time (no nesting, no extra writes)', () => {
    const map = makeMap()
    applyLabelOverrides(map as never, RULES)
    const after = JSON.stringify(map.layout.get('water_name_point_label'))
    expect(applyLabelOverrides(map as never, RULES)).toBe(0)
    expect(JSON.stringify(map.layout.get('water_name_point_label'))).toBe(after)
  })

  it('is inert with no rules and on a style-less map', () => {
    expect(applyLabelOverrides(makeMap() as never, [])).toBe(0)
    expect(applyLabelOverrides({} as never, RULES)).toBe(0)
  })
})
