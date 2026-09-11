import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LinkedRecordProvider } from '@fams/v5-composer'
import type { EntityConfig, EntityRecord } from '@fams/v5-composer'
import { ScopedLinkedRecords } from './ScopedLinkedRecords'
import type { ScopedLinkedRecordsProps } from './ScopedLinkedRecords.types'
import { ModuleRecordsProvider } from './module-records'
import { companyRecord, dealsConfig, dealRecord } from './fixtures'

const otherCompanyDeal: EntityRecord = {
  id: 'd2',
  uniqueidentifier: 'D-5002',
  title: 'Initech Renewal',
  status: 'qualified',
  systemcol3: 'c2', // a DIFFERENT company id — must be excluded when scoping against `companyRecord` (id "c1").
}

const arrayLinkedDeal: EntityRecord = {
  id: 'd3',
  uniqueidentifier: 'D-5003',
  title: 'Multi-stakeholder deal',
  status: 'qualified',
  systemcol3: ['c1', 'c9'], // array-valued match — c1 is a member, so this must be INCLUDED.
}

const columns: ScopedLinkedRecordsProps['columns'] = [
  { key: 'uniqueidentifier', label: 'Deal', type: 'idChip' },
  { key: 'title', label: 'Title', type: 'text' },
  { key: 'status', label: 'Status', type: 'statusPill' },
]

function renderScoped(
  ui: Partial<ScopedLinkedRecordsProps> & Pick<ScopedLinkedRecordsProps, 'entityType' | 'matchField'>,
  opts: {
    resolveModuleRecords?: (code: string) => { config: EntityConfig; records: EntityRecord[] } | undefined
    onOpenLinkedRecord?: (target: { entityType: string; recordId: string }) => void
  } = {},
) {
  return render(
    <ModuleRecordsProvider resolveModuleRecords={opts.resolveModuleRecords}>
      <LinkedRecordProvider onOpenLinkedRecord={opts.onOpenLinkedRecord}>
        <ScopedLinkedRecords record={companyRecord} columns={columns} {...ui} />
      </LinkedRecordProvider>
    </ModuleRecordsProvider>,
  )
}

describe('ScopedLinkedRecords', () => {
  it('renders only the rows scoped to the profiled record (a non-matching record excluded)', () => {
    renderScoped(
      { entityType: 'crm/deal', matchField: 'systemcol3' },
      {
        resolveModuleRecords: (code) =>
          code === 'crm/deal' ? { config: dealsConfig, records: [dealRecord, otherCompanyDeal] } : undefined,
      },
    )
    expect(screen.getByText('Globex Expansion')).toBeInTheDocument()
    expect(screen.queryByText('Initech Renewal')).not.toBeInTheDocument()
  })

  it('matches an array-valued matchField when the profiled id is a member', () => {
    renderScoped(
      { entityType: 'crm/deal', matchField: 'systemcol3' },
      {
        resolveModuleRecords: (code) =>
          code === 'crm/deal' ? { config: dealsConfig, records: [arrayLinkedDeal, otherCompanyDeal] } : undefined,
      },
    )
    expect(screen.getByText('Multi-stakeholder deal')).toBeInTheDocument()
    expect(screen.queryByText('Initech Renewal')).not.toBeInTheDocument()
  })

  it('shows the empty state when no target-module record scopes to this one', () => {
    renderScoped(
      { entityType: 'crm/deal', matchField: 'systemcol3', emptyLabel: 'No linked deals' },
      { resolveModuleRecords: (code) => (code === 'crm/deal' ? { config: dealsConfig, records: [otherCompanyDeal] } : undefined) },
    )
    expect(screen.getByText('No linked deals')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('shows the empty state (never a blank panel) with no ModuleRecordsProvider resolver mounted', () => {
    renderScoped({ entityType: 'crm/deal', matchField: 'systemcol3' })
    expect(screen.getByText('Nothing linked yet')).toBeInTheDocument()
  })

  it('row click resolves entityType + recordId through useLinkedRecordOpener, stacking a new sheet', () => {
    const onOpenLinkedRecord = vi.fn()
    renderScoped(
      { entityType: 'crm/deal', matchField: 'systemcol3' },
      {
        resolveModuleRecords: (code) =>
          code === 'crm/deal' ? { config: dealsConfig, records: [dealRecord, otherCompanyDeal] } : undefined,
        onOpenLinkedRecord,
      },
    )
    fireEvent.click(screen.getByText('Globex Expansion'))
    expect(onOpenLinkedRecord).toHaveBeenCalledWith({ entityType: 'crm/deal', recordId: 'd1' })
  })

  it('search filters the already-scoped rows client-side', () => {
    renderScoped(
      { entityType: 'crm/deal', matchField: 'systemcol3', search: true },
      {
        resolveModuleRecords: (code) =>
          code === 'crm/deal' ? { config: dealsConfig, records: [dealRecord, arrayLinkedDeal] } : undefined,
      },
    )
    expect(screen.getByText('Globex Expansion')).toBeInTheDocument()
    expect(screen.getByText('Multi-stakeholder deal')).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('Search anything here'), { target: { value: 'multi-stakeholder' } })
    expect(screen.queryByText('Globex Expansion')).not.toBeInTheDocument()
    expect(screen.getByText('Multi-stakeholder deal')).toBeInTheDocument()
  })

  it('respects `limit`, applied to the scoped set', () => {
    const many: EntityRecord[] = Array.from({ length: 5 }, (_, i) => ({
      id: `d${i}`,
      uniqueidentifier: `D-${i}`,
      title: `Deal ${i}`,
      systemcol3: 'c1',
    }))
    renderScoped(
      { entityType: 'crm/deal', matchField: 'systemcol3', limit: 2 },
      { resolveModuleRecords: (code) => (code === 'crm/deal' ? { config: dealsConfig, records: many } : undefined) },
    )
    expect(screen.getByText('Deal 0')).toBeInTheDocument()
    expect(screen.getByText('Deal 1')).toBeInTheDocument()
    expect(screen.queryByText('Deal 2')).not.toBeInTheDocument()
  })
})
