import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import type { EntityConfig, EntityRecord } from '@fams/v5-composer'
// MUST be the first import — see `test/map-mocks.ts`'s header.
import './test/map-mocks'
import { OnwaniLocationSection } from './OnwaniLocationSection'

const config = { code: 'incidents/incident', name: 'Incidents' } as unknown as EntityConfig

function renderSection(
  record: Partial<EntityRecord>,
  props: Record<string, unknown> = {},
  onSave?: (patch: Record<string, unknown>) => void,
) {
  return render(
    <OnwaniLocationSection
      config={config}
      record={{ id: 'i1', ...record } as EntityRecord}
      props={props}
      onSave={onSave}
    />,
  )
}

describe('OnwaniLocationSection', () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }))
  afterEach(() => vi.useRealTimers())

  it('seeds the Onwani branch from the record’s dash-joined value', () => {
    renderSection({ systemcol12: '90-200-4', municipality: 'Doha' })
    expect((screen.getByLabelText('Zone') as HTMLInputElement).value).toBe('90')
    expect((screen.getByLabelText('Street') as HTMLInputElement).value).toBe('200')
    expect((screen.getByLabelText('Bldg. No') as HTMLInputElement).value).toBe('4')
  })

  it('seeds the free-text branch when the record has a place but no Onwani', () => {
    renderSection({ systemcol1: 'West Bay, Doha', systemcol12: '', municipality: 'Doha' })
    expect(screen.getByLabelText('Location')).toHaveValue('West Bay, Doha')
  })

  it('is read-only when the host wired no onSave', () => {
    renderSection({ systemcol12: '90-200-4' })
    expect(screen.getByLabelText('Zone')).toBeDisabled()
  })

  it('is read-only outside the blueprint’s editableStages', () => {
    renderSection({ systemcol12: '90-200-4', status: 'closed' }, { editableStages: ['new'] }, vi.fn())
    expect(screen.getByLabelText('Zone')).toBeDisabled()
  })

  it('never writes on mount — only a real edit reaches onSave, debounced and dash-joined', () => {
    const onSave = vi.fn()
    renderSection({ systemcol12: '90-200-4', municipality: 'Doha', area: 'West Bay' }, {}, onSave)
    // A mount/no-op render must not pollute the record (or its timeline).
    act(() => void vi.advanceTimersByTime(1500))
    expect(onSave).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('Bldg. No'), { target: { value: '7' } })
    expect(onSave).not.toHaveBeenCalled() // debounced, not per-keystroke
    act(() => void vi.advanceTimersByTime(1000))
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave.mock.calls[0][0]).toEqual(
      expect.objectContaining({ systemcol12: '90-200-7', municipality: 'Doha', area: 'West Bay' }),
    )
  })

  it('honours field-key indirection from component.props', () => {
    renderSection(
      { onwani_no: '12-34-5', muni: 'Al Rayyan' },
      { onwaniField: 'onwani_no', municipalityField: 'muni', locationField: 'place' },
    )
    expect((screen.getByLabelText('Zone') as HTMLInputElement).value).toBe('12')
  })
})
