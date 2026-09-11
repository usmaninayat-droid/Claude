import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LinkedRecordProvider } from '@fams/v5-composer'
import type { EntityConfig, EntityRecord } from '@fams/v5-composer'
import { LinkedRecordDetailSection } from './LinkedRecordDetailSection'
import { ModuleRecordsProvider } from './module-records'
import { dealsConfig, dealRecord } from './fixtures'

/**
 * P1-K (run-2026-09-05-job-orders, fix7): the job-order detail sheet had no
 * "Asset Details" section at all — SPEC §2.23 designates it the platform's
 * cross-module linked-record STACKING probe (`interaction-qa.md`'s
 * side-sheet contract item 3). This pins the generic section renderer that
 * fills that role: it must render the TARGET record's own Details fields
 * (not a job-orders-specific shape) and its "view full profile" affordance
 * must go through `useLinkedRecordOpener()` — the stacking seam — not a
 * local navigation.
 */
const vehicleConfig: EntityConfig = {
  ...dealsConfig,
  code: 'asset/vehicle',
  uiConfig: {
    ...dealsConfig.uiConfig,
    profile: dealsConfig.uiConfig.profile
      ? {
          ...dealsConfig.uiConfig.profile,
          sections: [
            {
              id: 'sec_vehicle_details',
              name: 'Vehicle Details',
              order: 1,
              fields: [
                { col: 'systemcol1', order: 1, name: 'Brand' },
                { col: 'systemcol2', order: 2, name: 'Priority' },
              ],
            },
          ],
        }
      : undefined,
  },
}

const vehicleRecord: EntityRecord = {
  id: 'v1',
  uniqueidentifier: 'VEH-01',
  title: 'Fleet Truck 01',
  status: 'active',
  systemcol1: 'Toyota',
  systemcol2: 'High',
}

const otherVehicle: EntityRecord = { ...vehicleRecord, id: 'v9', title: 'Fleet Truck 09' }

function renderSection(
  jobOrderRecord: EntityRecord,
  opts: {
    resolveModuleRecords?: (code: string) => { config: EntityConfig; records: EntityRecord[] } | undefined
    onOpenLinkedRecord?: (target: { entityType: string; recordId: string }) => void
    props?: Record<string, unknown>
  } = {},
) {
  return render(
    <ModuleRecordsProvider resolveModuleRecords={opts.resolveModuleRecords}>
      <LinkedRecordProvider onOpenLinkedRecord={opts.onOpenLinkedRecord}>
        <LinkedRecordDetailSection
          config={dealsConfig}
          record={jobOrderRecord}
          props={{ refCol: 'systemcol4', entityType: 'asset/vehicle', ...opts.props }}
        />
      </LinkedRecordProvider>
    </ModuleRecordsProvider>,
  )
}

describe('LinkedRecordDetailSection', () => {
  it('renders the LINKED record through its own module Details layout, not the profiled record', () => {
    renderSection(
      { ...dealRecord, systemcol4: 'v1' },
      {
        resolveModuleRecords: (code) =>
          code === 'asset/vehicle' ? { config: vehicleConfig, records: [vehicleRecord, otherVehicle] } : undefined,
      },
    )
    expect(screen.getByText('Vehicle Details')).toBeInTheDocument()
    expect(screen.getByText('Toyota')).toBeInTheDocument()
    // Scoped to the ONE referenced vehicle — the other vehicle's data never renders.
    expect(screen.queryByText('Fleet Truck 09')).not.toBeInTheDocument()
  })

  it('the "view full profile" affordance STACKS via useLinkedRecordOpener, never a local nav', () => {
    const onOpenLinkedRecord = vi.fn()
    renderSection(
      { ...dealRecord, systemcol4: 'v1' },
      {
        resolveModuleRecords: (code) =>
          code === 'asset/vehicle' ? { config: vehicleConfig, records: [vehicleRecord] } : undefined,
        onOpenLinkedRecord,
      },
    )
    fireEvent.click(screen.getByRole('button', { name: 'View full profile' }))
    expect(onOpenLinkedRecord).toHaveBeenCalledWith({ entityType: 'asset/vehicle', recordId: 'v1', col: 'systemcol4' })
  })

  it('shows the empty state (never a blank panel) when the reference is unset', () => {
    renderSection(
      { ...dealRecord, systemcol4: undefined },
      {
        resolveModuleRecords: (code) =>
          code === 'asset/vehicle' ? { config: vehicleConfig, records: [vehicleRecord] } : undefined,
      },
    )
    expect(screen.getByText('Nothing linked yet')).toBeInTheDocument()
    expect(screen.queryByText('Vehicle Details')).not.toBeInTheDocument()
  })

  it('shows the empty state when the referenced id resolves to no record (stale/dangling ref)', () => {
    renderSection(
      { ...dealRecord, systemcol4: 'v-missing' },
      {
        resolveModuleRecords: (code) =>
          code === 'asset/vehicle' ? { config: vehicleConfig, records: [vehicleRecord] } : undefined,
      },
    )
    expect(screen.getByText('Nothing linked yet')).toBeInTheDocument()
  })

  it('shows the empty state (never a crash) with no ModuleRecordsProvider resolver mounted', () => {
    renderSection({ ...dealRecord, systemcol4: 'v1' })
    expect(screen.getByText('Nothing linked yet')).toBeInTheDocument()
  })

  it('honors a custom emptyLabel/viewLabel', () => {
    renderSection(
      { ...dealRecord, systemcol4: 'v1' },
      {
        resolveModuleRecords: (code) =>
          code === 'asset/vehicle' ? { config: vehicleConfig, records: [vehicleRecord] } : undefined,
        onOpenLinkedRecord: vi.fn(),
        props: { viewLabel: 'Open vehicle' },
      },
    )
    expect(screen.getByRole('button', { name: 'Open vehicle' })).toBeInTheDocument()
  })
})
