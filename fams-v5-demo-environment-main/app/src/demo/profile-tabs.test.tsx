import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DisplayNameProvider, type EntityConfig, type EntityRecord } from '@fams/v5-composer'
import { makeProfileTabRenderers } from './profile-tabs'
import type { RelationalStore } from '@fams/demo-kit'

/**
 * Round-7 code review P2-2. `OverviewSummary` used to stringify the raw stored
 * value, so the Overview tab printed `VEH-01` and a lowercase `scheduled`
 * while the Details panel and Linked tab of the SAME record — which go through
 * v5-composer's read renderers — printed `Tanker 01` and a status pill.
 *
 * The fix routes the tab through the field-renderer registry. Without a test,
 * a future "simplification" back to `String(rec[col])` would be caught only by
 * another manual visual pass, which is exactly how the bug survived this long.
 */
const config = {
  code: 'pm',
  name: 'Preventive Maintenance',
  systemcolumns: [
    { col: 'vehicle', id: 'fld_vehicle', name: 'Vehicle', type: 'SingleReference', refModule: 'Entity', entityType: 'asset/vehicle' },
    { col: 'title', id: 'fld_title', name: 'Service', type: 'Text' },
  ],
  uiConfig: { profile: { details: [{ col: 'vehicle' }, { col: 'title' }] } },
} as unknown as EntityConfig

const record = { id: 'PMR-001', vehicle: 'VEH-01', title: 'Oil Change' } as unknown as EntityRecord

describe('OverviewSummary — values render through the field registry', () => {
  const renderers = makeProfileTabRenderers({} as RelationalStore, 'workforce', () => undefined)
  const Overview = renderers['OverviewSummary'] ?? Object.values(renderers)[0]

  it('resolves a SingleReference id to its display name instead of printing the raw id', () => {
    render(
      <DisplayNameProvider resolve={(id) => (id === 'VEH-01' ? 'Tanker 01' : undefined)}>
        <div>{Overview({ config, record })}</div>
      </DisplayNameProvider>,
    )

    // Plain assertions: this app's vitest setup does not register jest-dom.
    expect(screen.getByText('Tanker 01')).toBeTruthy()
    expect(screen.queryByText('VEH-01')).toBeNull()
  })
})
