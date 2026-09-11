import { useCallback, useEffect, useState } from 'react'
import type { BoardFilters } from './data/types'
import { VIEW_MESSAGE_TYPE, isRosterView, type EmbedParams, type RosterView } from './lib/embed'
import { useRosterStore } from './state/store'
import { CrewView } from './components/CrewView'
import { RosterBoard } from './components/RosterBoard'
import { ValidateView } from './components/ValidateView'

const FILTERS_KEY = 'iwmp-roster:filters'

/**
 * The host's ModuleViewShell owns the tab strip; it tells this embed which
 * view to show either via `?view=` on load or a `postMessage` afterwards, so
 * one iframe survives tab switches and in-progress edits are never lost.
 */
export default function App({ params }: { params: EmbedParams }) {
  const [view, setView] = useState<RosterView>(params.view)
  const { data } = useRosterStore()

  useEffect(() => {
    const onMessage = (ev: MessageEvent) => {
      const d = ev.data as { type?: unknown; view?: unknown } | null
      if (d && d.type === VIEW_MESSAGE_TYPE && isRosterView(d.view)) setView(d.view)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  const [filters, setFiltersState] = useState<BoardFilters>(() => {
    // Land on the week a planner is actually working: the first still-editable
    // week that has not ended, falling back to the week containing today.
    const editable = data.weeks.find((w) => w.status !== 'Published' && w.to >= data.today)?.w
    const weekOfToday = data.weeks.find((w) => data.today >= w.from && data.today <= w.to)?.w ?? 0
    const defaults: BoardFilters = { week: editable ?? weekOfToday, category: 'Drivers', lot: 'All', shift: 'All', serviceLine: 'All', search: '' }
    try {
      const raw = sessionStorage.getItem(FILTERS_KEY)
      if (raw) return { ...defaults, ...(JSON.parse(raw) as Partial<BoardFilters>), search: '' }
    } catch {
      /* storage unavailable — defaults */
    }
    return defaults
  })

  const setFilters = useCallback((next: BoardFilters | ((prev: BoardFilters) => BoardFilters)) => {
    setFiltersState((prev) => {
      const value = typeof next === 'function' ? next(prev) : next
      try {
        sessionStorage.setItem(FILTERS_KEY, JSON.stringify(value))
      } catch {
        /* ignore */
      }
      return value
    })
  }, [])

  if (view === 'crew') return <CrewView filters={filters} onFiltersChange={setFilters} />
  if (view === 'validate') return <ValidateView filters={filters} onFiltersChange={setFilters} />
  return <RosterBoard filters={filters} onFiltersChange={setFilters} />
}
