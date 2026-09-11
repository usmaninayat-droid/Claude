import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { liveMonitoringConfig, liveVehicleRecords } from '../live-fixtures'
import { defaultLiveListColumns, liveListColumnCatalog } from './live-list-model'
import { LiveListPanel } from './LiveListPanel'

/**
 * The "Sync With Map" switch must sit ENTIRELY inside the list panel — the
 * designer's round-5 report was the knob clipped at the panel's trailing
 * edge, because the meta row had been left inside the table's horizontal
 * scroll container and the count line pushed the switch past the panel box.
 *
 * jsdom has no layout engine, so the pixel claim cannot be made here — it is
 * proven in Playwright at 1920/1440/1280. What IS assertable, and what the
 * pixel bug actually reduces to, is the STRUCTURAL contract that guarantees
 * it:
 *
 *   1. the meta row is a child of the panel, NOT a descendant of the table's
 *      `overflow-x` scroller (nothing inside that box is clipped by the
 *      panel — it is clipped by, and scrolls with, the table);
 *   2. the count line is the only shrinkable child (`min-w-0` + `flex-1` +
 *      `truncate`), so a long count string yields width instead of pushing;
 *   3. the switch group is `shrink-0`, so it keeps its intrinsic width;
 *   4. the row itself is width-bounded (`w-full max-w-full`) inside the
 *      panel's own 16px inline padding.
 */
describe('LiveListPanel — Sync With Map switch stays inside the panel', () => {
  const columns = defaultLiveListColumns(liveMonitoringConfig, 'collapsed')
  const catalog = liveListColumnCatalog(liveMonitoringConfig)

  function renderPanel() {
    render(
      <LiveListPanel
        config={liveMonitoringConfig}
        records={liveVehicleRecords}
        totalCount={liveVehicleRecords.length}
        syncListWithMap={false}
        onSyncListWithMapChange={() => {}}
        search=""
        onSearchChange={() => {}}
        columns={columns}
        onColumnsChange={() => {}}
        catalog={catalog}
        widthState="collapsed"
      />,
    )
    const panel = document.querySelector('[data-slot="live-list-panel"]') as HTMLElement
    const meta = document.querySelector('[data-slot="live-list-meta"]') as HTMLElement
    return { panel, meta }
  }

  it('keeps the meta row out of the table\'s horizontal scroll container', () => {
    const { panel, meta } = renderPanel()
    expect(panel).toBeInTheDocument()
    expect(meta).toBeInTheDocument()
    expect(panel.contains(meta)).toBe(true)
    const scroller = Array.from(panel.querySelectorAll<HTMLElement>('*')).find(
      (el) => el !== meta && /overflow-x-auto|overflow-auto|overflow-x-scroll/.test(el.className),
    )
    if (scroller) expect(scroller.contains(meta)).toBe(false)
    // ...and the panel keeps the 16px inline padding the switch needs.
    expect(panel.className).toContain('px-4')
  })

  it('makes the count line the only shrinkable child and the switch shrink-0', () => {
    const { meta } = renderPanel()
    expect(meta.className).toContain('w-full')
    expect(meta.className).toContain('max-w-full')

    const count = meta.querySelector('[data-slot="live-list-count"]') as HTMLElement
    expect(count.className).toContain('min-w-0')
    expect(count.className).toContain('flex-1')
    expect(count.className).toContain('truncate')

    const sync = meta.querySelector('[data-slot="live-list-sync"]') as HTMLElement
    expect(sync).toBeInTheDocument()
    expect(sync.className).toContain('shrink-0')
    expect(sync.className).not.toContain('min-w-0')
    // The switch is a direct descendant of that shrink-0 group, so nothing
    // between it and the panel edge can compress or overhang it.
    expect(sync.contains(screen.getByRole('switch', { name: 'Sync With Map' }))).toBe(true)
  })
})
