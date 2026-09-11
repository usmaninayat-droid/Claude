import type { EntityConfig, EntityRecord } from '@fams/v5-composer'
import { dealsConfig, dealRecords } from '../fixtures'

/**
 * hybrid/fixtures.ts — record-geometry fixtures for the hybrid lens tests.
 *
 * Built by ADDING `uiConfig.map.records` to the crm golden blueprint, which
 * already carries a `High`/`Medium`/`Low` select (`systemcol2`, "Priority").
 * The parity fixture below then re-points the same lens at a COMPLETELY
 * different colour axis on a different column, to prove nothing about
 * priority, zones or colour lives in code.
 */

/** Priority palette as `var(--token)` refs — the DOM chrome takes them
 *  verbatim; only the GPU layer resolves them (`map/color.ts`). */
export const PRIORITY_COLORS = [
  { value: 'High', color: 'var(--color-destructive)' },
  { value: 'Medium', color: 'var(--color-warning)' },
  { value: 'Low', color: 'var(--color-success)' },
]

const ZONE_A: [number, number][] = [
  [55.26, 25.2],
  [55.28, 25.2],
  [55.28, 25.22],
  [55.26, 25.22],
]
const ZONE_B: [number, number][] = [
  [55.3, 25.24],
  [55.32, 25.24],
  [55.32, 25.26],
  [55.3, 25.26],
]

export const HYBRID_ZONES = [
  { id: 'zone-a', label: 'Zone A', points: ZONE_A },
  { id: 'zone-b', label: 'Zone B', points: ZONE_B },
]

/** The golden blueprint + record-geometry bindings. */
export function recordMapConfigFixture(overrides?: {
  colorBy?: Partial<NonNullable<NonNullable<EntityConfig['uiConfig']['map']>['records']>['colorBy']>
  filterable?: boolean
}): EntityConfig {
  return {
    ...dealsConfig,
    uiConfig: {
      ...dealsConfig.uiConfig,
      map: {
        latCol: 'lat',
        lngCol: 'lng',
        zoneCol: 'zone',
        zones: HYBRID_ZONES,
        records: {
          colorBy: {
            col: 'systemcol2',
            legendTitle: 'Priority',
            values: PRIORITY_COLORS,
            filterable: overrides?.filterable,
            ...overrides?.colorBy,
          },
        },
      },
    },
  } as EntityConfig
}

/**
 * Records carrying MIXED geometry, deliberately:
 *  - D-101 point only        (frame A's shape)
 *  - D-102 polygon only      (frame B's shape)
 *  - D-103 point AND polygon (the reference renders both at once)
 *  - D-104 point sharing D-103's coordinates (pin de-collision)
 *  - D-105/D-106 no geometry (must still appear in the list — UX J.61)
 */
export function recordMapRecords(): EntityRecord[] {
  const geo: Record<string, Record<string, unknown>> = {
    'D-101': { lat: 25.204, lng: 55.271 },
    'D-102': { zone: 'zone-a' },
    'D-103': { lat: 25.25, lng: 55.31, zone: 'zone-b' },
    'D-104': { lat: 25.25, lng: 55.31 },
  }
  return dealRecords.map((record) => ({ ...record, ...(geo[record.id] ?? {}) })) as EntityRecord[]
}

/**
 * `recordMapConfigFixture` with Stage tabs on (SPEC Addendum "Stage tabs" —
 * the Requests & Complaints hybrid's "All / Lead / Qualified / …" strip).
 * Reuses the SAME `dealsConfig` golden blueprint's real `statusList`
 * (Lead/Qualified/Proposal/Won/Lost) and each seed record's own `status`
 * (`recordMapRecords()`'s D-101/D-102 are `lead`, D-103 `qualified`, D-104/
 * D-105 `proposal`, D-106 `won`) — no invented stage vocabulary for the
 * test/demo, so a fixture bug here would also show up in the Kanban board
 * that shares the same blueprint.
 */
export function stageTabsConfigFixture(): EntityConfig {
  const base = recordMapConfigFixture()
  return {
    ...base,
    uiConfig: {
      ...base.uiConfig,
      map: {
        ...base.uiConfig.map!,
        records: {
          ...base.uiConfig.map!.records,
          card: { stageChip: true },
          toolbar: { groupBy: { cols: ['status'], defaultCol: 'status' }, stageTabs: true },
        },
      },
    },
  } as EntityConfig
}

/**
 * The SAME lens over a different module vocabulary: the colour axis moves to
 * `systemcol1` (`NEW`/`EXPANSION`/`RENEWAL`), the legend is retitled, and the
 * geometry columns are renamed. Any priority/zone name that leaked into code
 * rather than staying data fails this fixture.
 */
export function parityConfigFixture(): EntityConfig {
  return {
    ...dealsConfig,
    name: 'Inspections',
    uiConfig: {
      ...dealsConfig.uiConfig,
      map: {
        latCol: 'y',
        lngCol: 'x',
        zoneCol: 'sector',
        zones: [{ id: 'sector-1', label: 'Sector 1', points: ZONE_A }],
        records: {
          colorBy: {
            col: 'systemcol1',
            legendTitle: 'Deal type',
            values: [
              { value: 'NEW', color: 'var(--color-primary)' },
              { value: 'EXPANSION', color: 'var(--color-secondary)' },
              { value: 'RENEWAL', color: 'var(--color-info)' },
            ],
          },
          fillOpacity: 0.3,
          radius: 11,
        },
      },
    },
  } as EntityConfig
}

export function parityRecords(): EntityRecord[] {
  const geo: Record<string, Record<string, unknown>> = {
    'D-101': { y: 25.1, x: 55.1 },
    'D-102': { sector: 'sector-1' },
    'D-103': { y: 25.4, x: 55.4 },
  }
  return dealRecords.map((record) => ({ ...record, ...(geo[record.id] ?? {}) })) as EntityRecord[]
}
