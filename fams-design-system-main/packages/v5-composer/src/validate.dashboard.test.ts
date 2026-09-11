import { describe, it, expect } from 'vitest'
import { validateBlueprint, validateDashboardModuleConfig } from './validate'
import type { DashboardModuleConfigBlueprint } from './blueprint-schema.dashboard'

/**
 * validate.dashboard.test.ts — the dashboard arm of the blueprint validator
 * (`DashboardModuleConfig.schema.json`'s structural twin). Mirrors
 * `validate.test.ts`'s shape: one golden accept, then one focused case per
 * error the author can actually make.
 */

const valid: DashboardModuleConfigBlueprint = {
  id: 'telematics-dashboard',
  kind: 'dashboard',
  displayName: { singular: 'Telematics Dashboard', plural: 'Telematics Dashboards' },
  icon: 'layout-grid',
  kpiStrip: [
    { id: 'kpi-total-assets', label: 'Total Assets', type: 'stat', dataSource: { kind: 'static', value: 156 } },
    { id: 'kpi-reserve', label: 'Fleet Fuel Reserve', type: 'stat-with-target', dataSource: { value: 3500, target: 5000 } },
  ],
  filterPills: [{ id: 'pill-time', label: 'Select Time Frame', type: 'time-range', defaultValue: 'last-7-days' }],
  widgetGrid: [
    {
      id: 'w-trips',
      title: 'Number of Trips',
      type: 'bar',
      span: 6,
      dataSource: { kind: 'static', categories: ['22 Oct'], series: [{ id: 's', label: 'Trips', data: [710] }] },
    },
    { id: 'w-events', title: 'Critical Events', type: 'list', span: 4, dataSource: { items: [] } },
  ],
  views: [{ id: 'view-default', label: 'Overview', isDefault: true }],
}

const clone = (): Record<string, unknown> => structuredClone(valid) as unknown as Record<string, unknown>

describe('validateDashboardModuleConfig — accepts a complete dashboard', () => {
  it('accepts the golden document through both entry points', () => {
    expect(validateDashboardModuleConfig(valid).errors).toEqual([])
    expect(validateDashboardModuleConfig(valid).valid).toBe(true)
    const viaDispatch = validateBlueprint(valid)
    expect(viaDispatch.valid).toBe(true)
    expect(viaDispatch.errors).toEqual([])
  })

  it('accepts a minimal document (id + displayName + one widget)', () => {
    const res = validateDashboardModuleConfig({
      id: 'd',
      kind: 'dashboard',
      displayName: { singular: 'D' },
      widgetGrid: [{ id: 'w', type: 'donut' }],
    })
    expect(res.valid).toBe(true)
  })
})

describe('validateDashboardModuleConfig — error cases', () => {
  it('rejects a non-object', () => {
    expect(validateDashboardModuleConfig('nope').valid).toBe(false)
  })

  it('flags a missing widgetGrid', () => {
    const bad = clone()
    delete bad.widgetGrid
    const res = validateDashboardModuleConfig(bad)
    expect(res.valid).toBe(false)
    expect(res.errors.some((e) => e.path === 'widgetGrid' && /required/.test(e.message))).toBe(true)
  })

  it('flags an empty widgetGrid', () => {
    const bad = clone()
    bad.widgetGrid = []
    expect(validateDashboardModuleConfig(bad).errors.some((e) => e.path === 'widgetGrid')).toBe(true)
  })

  it('flags an unknown widget type and names the legal values', () => {
    const bad = clone()
    ;(bad.widgetGrid as Record<string, unknown>[])[0].type = 'pie-of-pie'
    const res = validateDashboardModuleConfig(bad)
    expect(res.valid).toBe(false)
    const err = res.errors.find((e) => e.path === 'widgetGrid[0].type')
    expect(err).toBeDefined()
    expect(err?.message).toContain('"donut"')
    expect(err?.message).toContain('"pie-of-pie"')
  })

  it('flags a span outside 1..12', () => {
    for (const span of [0, 13, 6.5, 'six']) {
      const bad = clone()
      ;(bad.widgetGrid as Record<string, unknown>[])[0].span = span
      const res = validateDashboardModuleConfig(bad)
      expect(res.valid).toBe(false)
      expect(res.errors.some((e) => e.path === 'widgetGrid[0].span' && /between 1 and 12/.test(e.message))).toBe(true)
    }
  })

  it('flags duplicate widget ids', () => {
    const bad = clone()
    ;(bad.widgetGrid as Record<string, unknown>[])[1].id = 'w-trips'
    const res = validateDashboardModuleConfig(bad)
    expect(res.valid).toBe(false)
    expect(res.errors.some((e) => e.path === 'widgetGrid[1].id' && /duplicate widget id/.test(e.message))).toBe(true)
  })

  it('flags a widget with no stable id', () => {
    const bad = clone()
    delete (bad.widgetGrid as Record<string, unknown>[])[0].id
    expect(validateDashboardModuleConfig(bad).errors.some((e) => e.path === 'widgetGrid[0].id')).toBe(true)
  })

  it('flags a missing displayName', () => {
    const bad = clone()
    delete bad.displayName
    expect(validateDashboardModuleConfig(bad).errors.some((e) => e.path === 'displayName')).toBe(true)
  })

  it('flags a module id that breaks the slug pattern', () => {
    const bad = clone()
    bad.id = 'Telematics_Dashboard'
    expect(validateDashboardModuleConfig(bad).errors.some((e) => e.path === 'id')).toBe(true)
  })

  it('flags a wrong `kind`', () => {
    const bad = clone()
    bad.kind = 'entity'
    expect(validateDashboardModuleConfig(bad).errors.some((e) => e.path === 'kind')).toBe(true)
  })

  it('flags an unknown KPI tile type and a duplicate tile id', () => {
    const bad = clone()
    ;(bad.kpiStrip as Record<string, unknown>[])[0].type = 'sparkline'
    ;(bad.kpiStrip as Record<string, unknown>[])[1].id = 'kpi-total-assets'
    const res = validateDashboardModuleConfig(bad)
    expect(res.errors.some((e) => e.path === 'kpiStrip[0].type')).toBe(true)
    expect(res.errors.some((e) => e.path === 'kpiStrip[1].id' && /duplicate KPI tile id/.test(e.message))).toBe(true)
  })

  it('flags an unknown filter-pill type', () => {
    const bad = clone()
    ;(bad.filterPills as Record<string, unknown>[])[0].type = 'slider'
    expect(validateDashboardModuleConfig(bad).errors.some((e) => e.path === 'filterPills[0].type')).toBe(true)
  })

  it('flags a dataSource that is not an object, and a module binding with no module', () => {
    const bad = clone()
    ;(bad.widgetGrid as Record<string, unknown>[])[0].dataSource = 'asset'
    expect(validateDashboardModuleConfig(bad).errors.some((e) => e.path === 'widgetGrid[0].dataSource')).toBe(true)

    const bad2 = clone()
    ;(bad2.widgetGrid as Record<string, unknown>[])[0].dataSource = { kind: 'module' }
    expect(
      validateDashboardModuleConfig(bad2).errors.some((e) => e.path === 'widgetGrid[0].dataSource.module'),
    ).toBe(true)
  })

  it('flags a view with no label', () => {
    const bad = clone()
    delete (bad.views as Record<string, unknown>[])[0].label
    expect(validateDashboardModuleConfig(bad).errors.some((e) => e.path === 'views[0].label')).toBe(true)
  })
})

describe('validateBlueprint — dashboard dispatch', () => {
  it('no longer emits the "not yet implemented" warning for a dashboard config', () => {
    const res = validateBlueprint(valid)
    expect(res.warnings ?? []).toEqual([])
  })

  it('validates an INLINE dashboard config inside an app blueprint under the module path', () => {
    const bad = structuredClone(valid) as unknown as Record<string, unknown>
    ;(bad.widgetGrid as Record<string, unknown>[])[0].span = 99
    const res = validateBlueprint({
      id: 'app',
      tenant: 'fams',
      brand: { name: 'FAMS' },
      modules: [{ id: 'telematics-dashboard', type: 'dashboard', label: 'Telematics', config: bad }],
    })
    expect(res.valid).toBe(false)
    expect(res.errors.some((e) => e.path === 'modules[0].config.widgetGrid[0].span')).toBe(true)
  })

  it('accepts a valid inline dashboard config inside an app blueprint', () => {
    const res = validateBlueprint({
      id: 'app',
      tenant: 'fams',
      brand: { name: 'FAMS' },
      modules: [{ id: 'telematics-dashboard', type: 'dashboard', label: 'Telematics', config: valid }],
    })
    expect(res.errors).toEqual([])
    expect(res.valid).toBe(true)
  })
})

describe('validateDashboardModuleConfig — fix2c authoring keys', () => {
  function withWidget(widget: Record<string, unknown>) {
    const config = structuredClone(valid) as unknown as Record<string, unknown>
    ;(config.widgetGrid as unknown[]).push(widget)
    return validateDashboardModuleConfig(config)
  }

  it('accepts a stack widget with children, and validates the children as widgets', () => {
    const res = withWidget({
      id: 'w-stack',
      type: 'stack',
      span: 4,
      children: [
        { id: 'w-stack-gauge', type: 'compliance-gauge', dataSource: { value: 81 } },
        { id: 'w-stack-kpi', type: 'kpi-card', dataSource: { value: 12 } },
      ],
    })
    expect(res.errors).toEqual([])
    expect(res.valid).toBe(true)
  })

  it('rejects a stack with no children — a layout node with nothing to lay out', () => {
    const res = withWidget({ id: 'w-stack', type: 'stack', span: 4 })
    expect(res.valid).toBe(false)
    expect(res.errors.some((e) => e.path === 'widgetGrid[2].children')).toBe(true)
  })

  it('rejects a stack nested inside a stack — one level only', () => {
    const res = withWidget({
      id: 'w-stack',
      type: 'stack',
      children: [{ id: 'w-inner', type: 'stack', children: [{ id: 'w-leaf', type: 'kpi-card' }] }],
    })
    expect(res.valid).toBe(false)
    expect(res.errors.some((e) => e.path === 'widgetGrid[2].children[0]')).toBe(true)
  })

  it('rejects `children` on a non-stack widget', () => {
    const res = withWidget({ id: 'w-bar2', type: 'bar', children: [{ id: 'x', type: 'kpi-card' }] })
    expect(res.valid).toBe(false)
    expect(res.errors.some((e) => e.path === 'widgetGrid[2].children')).toBe(true)
  })

  it('reports a duplicate id between a stacked child and a top-level widget', () => {
    const res = withWidget({
      id: 'w-stack',
      type: 'stack',
      children: [{ id: 'w-trips', type: 'kpi-card', dataSource: { value: 1 } }],
    })
    expect(res.valid).toBe(false)
    expect(res.errors.some((e) => e.path === 'widgetGrid[2].children[0].id')).toBe(true)
  })

  it('accepts pinned axis bounds on the leading and trailing value axes', () => {
    const res = withWidget({
      id: 'w-dual',
      type: 'line',
      dataSource: { axis: { y: { title: 'L', min: 0, max: 100 }, yRight: { title: 'km', min: 0, max: 1500 } } },
    })
    expect(res.errors).toEqual([])
  })

  it('rejects a non-numeric axis bound', () => {
    const res = withWidget({ id: 'w-dual', type: 'line', dataSource: { axis: { y: { max: '1,500' } } } })
    expect(res.valid).toBe(false)
    expect(res.errors.some((e) => e.path === 'widgetGrid[2].dataSource.axis.y.max')).toBe(true)
  })

  it('rejects an inverted axis range', () => {
    const res = withWidget({ id: 'w-dual', type: 'line', dataSource: { axis: { y: { min: 100, max: 10 } } } })
    expect(res.valid).toBe(false)
    expect(res.errors.some((e) => e.path === 'widgetGrid[2].dataSource.axis.y')).toBe(true)
  })

  it('rejects an unknown legendPlacement and a non-boolean showRank', () => {
    const res = withWidget({
      id: 'w-board',
      type: 'leaderboard',
      dataSource: { legendPlacement: 'beside', showRank: 'no' },
    })
    expect(res.valid).toBe(false)
    expect(res.errors.some((e) => e.path === 'widgetGrid[2].dataSource.legendPlacement')).toBe(true)
    expect(res.errors.some((e) => e.path === 'widgetGrid[2].dataSource.showRank')).toBe(true)
  })

  it('accepts colorToken / entityLabel / media / axis groups (permissive vocabulary)', () => {
    const res = withWidget({
      id: 'w-board',
      type: 'leaderboard',
      dataSource: {
        entityLabel: 'Vehicle',
        showRank: false,
        rows: [{ id: 'r1', primary: 'Truck 1', media: { icon: 'truck', tone: 'primary' } }],
        columns: [{ key: 'events', label: 'Critical events', render: 'counters', counters: [{ label: 'Braking', icon: 'alert-triangle', colorToken: 'var(--color-primary)' }] }],
      },
    })
    expect(res.errors).toEqual([])
  })

  it('accepts a column entity glyph', () => {
    // fix4 P1 #4: a code-shaped column (a plate, a site reference) reads as an
    // anonymous string without its glyph, and a blueprint cannot carry a React
    // node — so it names the lucide icon and the renderer resolves it.
    const res = withWidget({
      id: 'w-board',
      type: 'leaderboard',
      dataSource: {
        rows: [{ id: 'r1', primary: 'Omar Darwish', cells: { vehicle: 'DXB-B-1007' } }],
        columns: [{ key: 'vehicle', label: 'Assigned Vehicle', icon: 'truck' }],
      },
    })
    expect(res.errors).toEqual([])
    expect(res.valid).toBe(true)
  })
})


describe('validateDashboardModuleConfig — filter dimensions', () => {
  it('accepts a fully annotated filter binding', () => {
    const doc = clone()
    ;(doc['filterPills'] as Record<string, unknown>[])[0]!['dimension'] = 'timeframe'
    ;(doc['widgetGrid'] as Record<string, unknown>[])[0]!['dataSource'] = {
      categories: ['22 Oct', '23 Oct'],
      categoryDimensions: [{ timeframe: ['last-30-days'] }, { timeframe: 'today' }],
      series: [{ id: 's', label: 'Trips', data: [1, 2], dimensions: { vehicle: ['v1'] } }],
      variants: [{ when: { timeframe: 'today' }, ariaLabel: 'Trips today' }],
    }
    expect(validateDashboardModuleConfig(doc).errors).toEqual([])
  })

  it('rejects a `categoryDimensions` that is not parallel to `categories`', () => {
    const doc = clone()
    ;(doc['widgetGrid'] as Record<string, unknown>[])[0]!['dataSource'] = {
      categories: ['a', 'b', 'c'],
      categoryDimensions: [{ timeframe: 'today' }],
    }
    const { errors } = validateDashboardModuleConfig(doc)
    expect(errors.map((e) => e.path)).toContain('widgetGrid[0].dataSource.categoryDimensions')
    expect(errors[0]!.message).toMatch(/parallel/)
  })

  it('rejects a dimension value that is neither a string nor a string array', () => {
    const doc = clone()
    ;(doc['widgetGrid'] as Record<string, unknown>[])[0]!['dataSource'] = {
      rows: [{ id: 'r', primary: 'R', dimensions: { vehicle: 7 } }],
    }
    expect(validateDashboardModuleConfig(doc).errors.map((e) => e.path)).toContain(
      'widgetGrid[0].dataSource.rows[0].dimensions.vehicle',
    )
  })

  it('rejects a variant with no `when`', () => {
    const doc = clone()
    ;(doc['widgetGrid'] as Record<string, unknown>[])[0]!['dataSource'] = { variants: [{ value: 3 }] }
    expect(validateDashboardModuleConfig(doc).errors.map((e) => e.path)).toContain(
      'widgetGrid[0].dataSource.variants[0].when',
    )
  })

  it('rejects an empty pill `dimension`', () => {
    const doc = clone()
    ;(doc['filterPills'] as Record<string, unknown>[])[0]!['dimension'] = ''
    expect(validateDashboardModuleConfig(doc).errors.map((e) => e.path)).toContain('filterPills[0].dimension')
  })
})
