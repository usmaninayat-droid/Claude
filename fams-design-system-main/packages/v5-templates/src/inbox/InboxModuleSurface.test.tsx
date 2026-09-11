import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, act } from '@testing-library/react'
import type { DataAdapter, EntityRecord, ModuleRenderContext } from '@fams/v5-composer'
import { getModuleType } from '@fams/v5-composer'
import { InboxModuleSurface, toInboxNotification } from './InboxModuleSurface'

const records: EntityRecord[] = [
  {
    id: 'NTF-01',
    title: 'Approval needed: Fleet maintenance',
    snippet: 'Requires your approval.',
    timestamp: '2026-08-15T08:45:00',
    read: false,
    kind: 'approval',
    reference: 'TKT-01',
    severity: 'Critical',
    due: 'Today',
    module: 'Ticketing',
    assignedToMe: true,
  } as EntityRecord,
  {
    id: 'NTF-02',
    title: 'Weekly compliance report generated',
    timestamp: '2026-08-15T00:01:00',
    read: true,
    kind: 'system',
  } as EntityRecord,
]

function makeCtx(adapter: Partial<DataAdapter> = {}): ModuleRenderContext {
  return {
    module: {
      id: 'inbox',
      type: 'inbox',
      label: 'Inbox',
      views: ['list'],
      dataSource: { code: 'inbox/notification' },
      config: {},
    },
    data: { list: () => records, get: (id) => records.find((r) => r.id === id), ...adapter },
    typeDef: getModuleType('inbox')!,
    templateRef: 'InboxView',
  }
}

describe('toInboxNotification', () => {
  it('maps the well-known generic keys onto the presenter vocabulary', () => {
    const n = toInboxNotification(records[0])
    expect(n).toMatchObject({
      id: 'NTF-01',
      title: 'Approval needed: Fleet maintenance',
      read: false,
      kind: 'approval',
      reference: { id: 'TKT-01', label: 'TKT-01' },
      severity: { label: 'Critical', tone: 'critical' },
      due: 'Today',
      module: { label: 'Ticketing' },
      assignedToMe: true,
    })
  })

  it('tolerates missing/odd values (unknown kind dropped, string booleans accepted)', () => {
    const n = toInboxNotification({ id: 'x', kind: 'bogus', read: 'true' } as unknown as EntityRecord)
    expect(n.kind).toBeUndefined()
    expect(n.read).toBe(true)
    expect(n.title).toBe('x')
  })
})

describe('InboxModuleSurface', () => {
  it('renders the feed from the data adapter', () => {
    render(<InboxModuleSurface ctx={makeCtx()} now={new Date('2026-08-15T12:00:00')} />)
    expect(screen.getByText('Approval needed: Fleet maintenance')).toBeInTheDocument()
  })

  it('clears through the guarded update (mark read) and notifies the app', () => {
    vi.useFakeTimers()
    try {
      const update = vi.fn((id: string, patch: Partial<EntityRecord>) => {
        const rec = records.find((r) => r.id === id)
        if (rec) Object.assign(rec, patch)
        return rec
      })
      const onChanged = vi.fn()
      render(
        <InboxModuleSurface
          ctx={makeCtx({ update })}
          now={new Date('2026-08-15T12:00:00')}
          onNotificationsChanged={onChanged}
        />,
      )
      fireEvent.click(screen.getAllByRole('button', { name: /Clear notification/ })[0])
      act(() => {
        vi.runAllTimers()
      })
      expect(update).toHaveBeenCalledWith('NTF-01', { read: true })
      expect(onChanged).toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
      ;(records[0] as Record<string, unknown>).read = false
    }
  })

  it('renders no Clear affordances for a read-only adapter (no update)', () => {
    render(<InboxModuleSurface ctx={makeCtx()} now={new Date('2026-08-15T12:00:00')} />)
    expect(screen.queryByRole('button', { name: /Clear notification/ })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Clear All' })).toBeNull()
  })
})

describe('InboxModuleSurface — record deep-link seam (round-1 QA `card-click-opens-record`)', () => {
  function makeCtxWithReference(adapter: Partial<DataAdapter> = {}): ModuleRenderContext {
    const ctx = makeCtx(adapter)
    // Blueprint metadata: the `reference` column names its referenced module code.
    ctx.module.config = {
      systemcolumns: [{ col: 'reference', id: 'fld_ref', name: 'Reference', type: 'SingleReference', entityType: 'ticketing/ticket' }],
    }
    return ctx
  }

  it('card click marks read AND reports { entityType, recordId } from blueprint metadata', () => {
    const update = vi.fn()
    const onOpenRecord = vi.fn()
    render(<InboxModuleSurface ctx={makeCtxWithReference({ update })} onOpenRecord={onOpenRecord} />)

    fireEvent.click(screen.getByRole('button', { name: 'Approval needed: Fleet maintenance' }))
    expect(update).toHaveBeenCalledWith('NTF-01', expect.objectContaining({ read: true }))
    expect(onOpenRecord).toHaveBeenCalledTimes(1)
    expect(onOpenRecord.mock.calls[0][0]).toEqual({ entityType: 'ticketing/ticket', recordId: 'TKT-01' })
  })

  it('an unreferenced notification only marks read (no deep-link fired)', async () => {
    const update = vi.fn()
    const onOpenRecord = vi.fn()
    render(<InboxModuleSurface ctx={makeCtxWithReference({ update })} onOpenRecord={onOpenRecord} />)

    // NTF-02 carries no `reference` — switch to the All tab where it shows.
    fireEvent.mouseDown(screen.getByRole('tab', { name: /^All/ }))
    fireEvent.click(screen.getByRole('tab', { name: /^All/ }))
    fireEvent.click(await screen.findByRole('button', { name: 'Weekly compliance report generated' }))
    expect(onOpenRecord).not.toHaveBeenCalled()
  })
})
