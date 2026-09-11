import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { EntityConfig } from '@fams/v5-composer'
import { HybridView } from './HybridView'
import { companiesConfig, companyRecords } from './fixtures'

/**
 * `companiesConfig` with Stage tabs on (SPEC Addendum "Stage tabs" — the
 * SAME lens `MapHybridView`'s record-map hybrid stage tabs already carry).
 * Reuses the golden crm blueprint's real `statusList`
 * (Customer/Prospect/Churned) and each seed record's own `status`
 * (`companyRecords()`'s C-01/C-03/C-05 are `Customer`, C-02/C-04
 * `Prospect`, C-06 `Churned`) — no invented stage vocabulary for the test.
 */
function stageTabsConfigFixture(): EntityConfig {
  return {
    ...companiesConfig,
    uiConfig: { ...companiesConfig.uiConfig, hybrid: { ...companiesConfig.uiConfig.hybrid, stageTabs: true } },
  }
}

describe('HybridView — list + detail split (crm golden: companies)', () => {
  it('shows an empty detail panel until a record is selected', () => {
    render(<HybridView config={companiesConfig} records={companyRecords} />)
    expect(screen.getByText('No selection')).toBeInTheDocument()
  })

  it('selecting a list row renders that record’s EntityProfile', () => {
    const onSelect = vi.fn()
    render(<HybridView config={companiesConfig} records={companyRecords} onSelect={onSelect} />)
    fireEvent.click(screen.getByText('Northwind Traders'))
    expect(onSelect).toHaveBeenCalledWith('C-01')
    // The detail panel's EntityProfile renders the record title as a heading.
    expect(screen.getByRole('heading', { name: 'Northwind Traders' })).toBeInTheDocument()
  })

  it('honors a controlled selectedId', () => {
    render(<HybridView config={companiesConfig} records={companyRecords} selectedId="C-03" />)
    expect(screen.getByRole('heading', { name: 'Initech' })).toBeInTheDocument()
  })

  it('accepts a custom detail renderer', () => {
    render(
      <HybridView
        config={companiesConfig}
        records={companyRecords}
        selectedId="C-01"
        renderDetail={(record) => <p>custom {String(record.title)}</p>}
      />,
    )
    expect(screen.getByText('custom Northwind Traders')).toBeInTheDocument()
  })

  it('shows every derived list column by default (no `uiConfig.hybrid.listColumns`)', () => {
    render(<HybridView config={companiesConfig} records={companyRecords} />)
    expect(screen.getByRole('columnheader', { name: 'Company' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Industry' })).toBeInTheDocument()
  })

  it('restricts the compact left-list to `uiConfig.hybrid.listColumns` when the blueprint sets it', () => {
    const compactConfig = {
      ...companiesConfig,
      uiConfig: { ...companiesConfig.uiConfig, hybrid: { listColumns: ['title', 'status'] } },
    }
    render(<HybridView config={compactConfig} records={companyRecords} />)
    expect(screen.getByRole('columnheader', { name: 'Company' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Status' })).toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Industry' })).not.toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Owner' })).not.toBeInTheDocument()
    // The restriction is presentational only — full records are still selectable.
    fireEvent.click(screen.getByText('Northwind Traders'))
    expect(screen.getByRole('heading', { name: 'Northwind Traders' })).toBeInTheDocument()
  })
})

/**
 * Stage tabs (SPEC Addendum "Stage tabs"): the list+detail hybrid's "All /
 * Customer / Prospect / Churned" strip — a `CountTabs` row above the
 * compact list built from `uiConfig.statusList`. On "All" the per-row
 * STATUS pill is unchanged from today; picking a specific stage narrows the
 * list to it AND suppresses the now-redundant per-row STATUS pill (both
 * return on "All").
 */
describe('HybridView — stage tabs', () => {
  const stageConfig = stageTabsConfigFixture()

  function statusPills(): HTMLElement[] {
    return Array.from(document.querySelectorAll<HTMLElement>('[data-slot="status-pill"]'))
  }

  /** Radix `Tabs` needs the pointer-down that precedes a real click (same idiom `MapHybridView`'s own stage-tabs tests use). */
  function clickTab(name: RegExp) {
    fireEvent.mouseDown(screen.getByRole('tab', { name }))
    fireEvent.click(screen.getByRole('tab', { name }))
  }

  it('on "All": renders a tab per stage plus a leading "All" tab, and keeps the per-row STATUS pill', () => {
    render(<HybridView config={stageConfig} records={companyRecords} />)
    expect(screen.getByRole('tab', { name: /^All/ })).toHaveAttribute('aria-selected', 'true')
    for (const label of ['Customer', 'Prospect', 'Churned']) {
      expect(screen.getByRole('tab', { name: new RegExp(`^${label}`) })).toBeInTheDocument()
    }
    expect(screen.getByRole('columnheader', { name: 'Status' })).toBeInTheDocument()
    expect(statusPills().length).toBe(companyRecords.length)
  })

  it('picking a specific stage narrows the list and hides the per-row STATUS pill', () => {
    render(<HybridView config={stageConfig} records={companyRecords} />)
    clickTab(/^Customer/)
    expect(screen.getByRole('tab', { name: /^Customer/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: /^All/ })).toHaveAttribute('aria-selected', 'false')
    // C-01/C-03/C-05 are the fixture's three `Customer` records — everything else drops out.
    expect(screen.getByText('Northwind Traders')).toBeInTheDocument()
    expect(screen.getByText('Initech')).toBeInTheDocument()
    expect(screen.getByText('Hooli')).toBeInTheDocument()
    expect(screen.queryByText('Globex Corp')).not.toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Status' })).not.toBeInTheDocument()
    expect(statusPills()).toHaveLength(0)
  })

  it('returning to "All" restores the full list and the STATUS pill', () => {
    render(<HybridView config={stageConfig} records={companyRecords} />)
    clickTab(/^Prospect/)
    expect(statusPills()).toHaveLength(0)
    clickTab(/^All/)
    expect(screen.getByText('Globex Corp')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Status' })).toBeInTheDocument()
    expect(statusPills().length).toBe(companyRecords.length)
  })
})
