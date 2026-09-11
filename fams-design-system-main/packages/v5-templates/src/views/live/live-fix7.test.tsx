import { describe, expect, it } from 'vitest'
import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { liveMonitoringConfig, liveVehicleRecords } from '../live-fixtures'
import { LiveListPanel } from './LiveListPanel'
import { defaultLiveListColumns, liveListColumnCatalog } from './live-list-model'

/**
 * Round-6 UX gate, fix wave 7 — U1 (self-removing recovery controls drop
 * keyboard focus to `<body>`) and U3 ("Showing 0 items" announced into an
 * `aria-live` region while the loading skeleton is up).
 *
 * The `MapPanel`-side limbs of U1/U2 and the U4 camera behaviour live with
 * their own components (`map/MapPanel.test.tsx`, `map/camera-motion.test.ts`).
 */
const catalog = liveListColumnCatalog(liveMonitoringConfig)
const columns = defaultLiveListColumns(liveMonitoringConfig, 'collapsed')

function Panel({ search = '', records = liveVehicleRecords, totalCount = liveVehicleRecords.length, loading = false }) {
  const [q, setQ] = useState(search)
  const [cols, setCols] = useState(columns)
  const needle = q.toLowerCase()
  return (
    <LiveListPanel
      config={liveMonitoringConfig}
      records={records.filter((r) =>
        [r.title, r.uniqueidentifier].some((v) => String(v ?? '').toLowerCase().includes(needle)),
      )}
      totalCount={totalCount}
      search={q}
      onSearchChange={setQ}
      columns={cols}
      onColumnsChange={setCols}
      catalog={catalog}
      widthState="collapsed"
      loading={loading}
    />
  )
}

describe('U1 — a control that removes itself hands focus on', () => {
  it('returns focus to the search input when the in-field ✕ clears the query', () => {
    render(<Panel search="Z-77" />)
    const clear = document.querySelector<HTMLElement>('[data-slot="live-search-clear"]')!
    clear.focus()
    expect(document.activeElement).toBe(clear)
    fireEvent.click(clear)
    // The ✕ is painted only while the field is non-empty, so it has just
    // unmounted; without the hand-off this is <body>.
    expect(document.querySelector('[data-slot="live-search-clear"]')).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Search vehicles' }))
    expect(document.activeElement).not.toBe(document.body)
  })

  it("returns focus to the search input when the empty state's Clear search runs", () => {
    render(<Panel search="zzzqqq" />)
    const emptyClear = document.querySelector<HTMLElement>('[data-slot="live-list-empty-clear"]')!
    expect(emptyClear).toBeInTheDocument()
    emptyClear.focus()
    fireEvent.click(emptyClear)
    expect(document.querySelector('[data-slot="live-list-empty-clear"]')).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Search vehicles' }))
    expect(document.activeElement).not.toBe(document.body)
  })
})

describe('U3 — the count line never announces a count it does not have', () => {
  const countLine = () => document.querySelector('[data-slot="live-list-count"]')!

  it('renders a skeleton bar, not "Showing 0 items", while the list is loading', () => {
    render(<Panel loading />)
    expect(countLine()).toHaveAttribute('aria-live', 'polite')
    expect(countLine()).toHaveAttribute('aria-busy', 'true')
    expect(countLine().querySelector('[data-slot="live-list-count-skeleton"]')).not.toBeNull()
    expect(countLine().textContent).toBe('')
    expect(countLine().textContent).not.toContain('Showing 0 items')
  })

  it('states the real count, and drops aria-busy, once the records arrive', () => {
    render(<Panel />)
    expect(countLine()).toHaveTextContent(
      `Showing ${liveVehicleRecords.length} items`,
    )
    expect(countLine()).not.toHaveAttribute('aria-busy')
    expect(countLine().querySelector('[data-slot="live-list-count-skeleton"]')).toBeNull()
  })

  it('still shows a genuine zero for a search that legitimately matches nothing', () => {
    render(<Panel search="zzzqqq" />)
    expect(countLine()).toHaveTextContent(`Showing 0 items out of ${liveVehicleRecords.length}`)
  })
})
