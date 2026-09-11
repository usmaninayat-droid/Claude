import { describe, expect, it } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { EntityRecord } from '@fams/v5-composer'
import { SearchableRecordList } from './SearchableRecordList'

const record = {
  id: 'V1',
  plans: [
    { id: 'P1', ref: 'FPL-3004', name: 'Al Rayyan West Tunnel', zone: 'Al Rayyan', state: 'Completed' },
    { id: 'P2', ref: 'FPL-3005', name: 'Umm Salal Hospital Access', zone: 'Umm Salal', state: 'Completed' },
  ],
} as unknown as EntityRecord

const base = {
  record,
  itemsField: 'plans',
  idKey: 'id',
  leadKey: 'ref',
  titleKey: 'name',
  statusKey: 'state',
  meta: [{ key: 'zone', prefix: 'Zone ' }],
}

describe('SearchableRecordList', () => {
  it('renders one row per item, with lead id, title, meta and status pill', () => {
    render(<SearchableRecordList {...base} />)
    expect(document.querySelectorAll('[data-slot="searchable-record-row"]')).toHaveLength(2)
    expect(screen.getByText('FPL-3004')).toBeInTheDocument()
    expect(screen.getByText('Al Rayyan West Tunnel')).toBeInTheDocument()
    expect(screen.getByText('Zone Al Rayyan')).toBeInTheDocument()
    expect(screen.getAllByText('Completed')).toHaveLength(2)
  })

  it('filters rows client-side across lead/title/meta values', () => {
    render(<SearchableRecordList {...base} strings={{ searchPlaceholder: 'Search plans' }} />)
    fireEvent.change(screen.getByLabelText('Search plans'), { target: { value: 'umm salal' } })
    expect(document.querySelectorAll('[data-slot="searchable-record-row"]')).toHaveLength(1)
    expect(screen.getByText('Umm Salal Hospital Access')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Search plans'), { target: { value: 'FPL-3004' } })
    expect(screen.getByText('Al Rayyan West Tunnel')).toBeInTheDocument()
    expect(screen.queryByText('Umm Salal Hospital Access')).not.toBeInTheDocument()
  })

  it('shows the no-match text (not the empty text) when a query matches nothing', () => {
    render(<SearchableRecordList {...base} strings={{ searchPlaceholder: 'Search plans', emptyText: 'None yet.' }} />)
    fireEvent.change(screen.getByLabelText('Search plans'), { target: { value: 'zzz' } })
    expect(screen.getByText('No results match “zzz”.')).toBeInTheDocument()
    expect(screen.queryByText('None yet.')).not.toBeInTheDocument()
  })

  it('shows the empty text when the field holds no rows', () => {
    render(<SearchableRecordList {...base} itemsField="missing" strings={{ emptyText: 'None yet.' }} />)
    expect(screen.getByText('None yet.')).toBeInTheDocument()
  })
})
