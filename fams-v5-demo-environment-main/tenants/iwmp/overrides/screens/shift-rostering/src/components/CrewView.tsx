import { useMemo, useState } from 'react'
import { Badge, DataTable, Input, KpiMetricCard, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, type DataTableColumn } from '@fams/ui-kit'
import { Icon } from '@fams/ui-kit/icons'
import { categoryOf, helperCountFor } from '../data/masters'
import type { BoardFilters, Employee, Shift } from '../data/types'
import { fmtDay } from '../lib/format'
import { useRosterStore } from '../state/store'
import { useBoardModel } from '../state/useBoardModel'
import { EmployeeCard } from './EmployeeCard'

interface CrewRow {
  id: string
  route: string
  vehicle: string
  shift: Shift
  freq: string
  district: string
  driver: string
  driverId: string | undefined
  verdict: 'OK' | 'Warning' | 'Blocked' | 'Unassigned'
  reason: string
  helpers: string
  have: number
  need: number
}

const SHIFTS: readonly (Shift | 'All')[] = ['All', 'DAY', 'NIGHT', 'AFN', 'EVENING', 'MID']
const VERDICT_TONE: Record<CrewRow['verdict'], 'success' | 'warning' | 'destructive' | 'muted'> = {
  OK: 'success',
  Warning: 'warning',
  Blocked: 'destructive',
  Unassigned: 'muted',
}

export interface CrewViewProps {
  filters: BoardFilters
  onFiltersChange: (next: BoardFilters) => void
}

/** BLD-04 — driver + helpers per route, with eligibility and crew completeness. */
export function CrewView({ filters, onFiltersChange }: CrewViewProps) {
  const store = useRosterStore()
  const model = useBoardModel(filters)
  const [q, setQ] = useState('')
  const [shift, setShift] = useState<Shift | 'All'>('All')
  const [card, setCard] = useState<Employee | null>(null)

  const rows = useMemo<CrewRow[]>(() => {
    const needle = q.trim().toLowerCase()
    return store.data.routes
      .filter((r) => store.data.routeCrew[r.id])
      .map((r): CrewRow => {
        const crew = store.data.routeCrew[r.id]!
        const driver = model.employeeById.get(crew.driver)
        const helpers = crew.helpers.map((h) => model.employeeById.get(h)).filter((h): h is Employee => Boolean(h))
        const el = driver ? model.eligibility(driver, r.id) : undefined
        const verdict: CrewRow['verdict'] = !driver ? 'Unassigned' : !el?.ok ? 'Blocked' : el.warns.length ? 'Warning' : 'OK'
        return {
          id: r.id,
          route: r.id,
          vehicle: categoryOf(r.cat)?.name ?? r.cat,
          shift: r.shift,
          freq: r.freq,
          district: r.district,
          driver: driver?.name ?? '—',
          driverId: driver?.id,
          verdict,
          reason: el ? [...el.reasons, ...el.warns][0] ?? '' : 'No driver assigned',
          helpers: helpers.map((h) => h.name).join(', ') || '—',
          have: helpers.length,
          need: helperCountFor(r.cat),
        }
      })
      .filter((row) => (shift === 'All' || row.shift === shift) && (!needle || `${row.route} ${row.vehicle} ${row.district} ${row.driver} ${row.helpers}`.toLowerCase().includes(needle)))
  }, [store.data.routes, store.data.routeCrew, model, q, shift])

  const complete = rows.filter((r) => r.have >= r.need && (r.verdict === 'OK' || r.verdict === 'Warning')).length
  const blocked = rows.filter((r) => r.verdict === 'Blocked' || r.verdict === 'Unassigned').length
  const short = rows.filter((r) => r.have < r.need).length

  const columns: DataTableColumn<CrewRow>[] = [
    { key: 'route', label: 'Route', isSortable: true, width: '13rem', render: (r) => <span className="font-mono text-xs font-semibold text-foreground">{r.route}</span> },
    { key: 'vehicle', label: 'Vehicle', isSortable: true, width: '12rem' },
    { key: 'shift', label: 'Shift', isSortable: true, width: '6rem', render: (r) => <Badge variant="muted" size="xs">{r.shift}</Badge> },
    { key: 'freq', label: 'Frequency', width: '7rem' },
    { key: 'district', label: 'District', isSortable: true },
    { key: 'driver', label: 'Driver', isSortable: true, render: (r) => <span className="text-xs font-medium text-foreground">{r.driver}</span> },
    {
      key: 'verdict',
      label: 'Eligibility',
      isSortable: true,
      width: '9rem',
      render: (r) => (
        <Badge variant={VERDICT_TONE[r.verdict]} size="sm" title={r.reason}>
          {r.verdict === 'Blocked' && <Icon name="alert-circle" size={12} />}
          {r.verdict === 'Warning' && <Icon name="alert-triangle" size={12} />}
          {r.verdict === 'OK' && <Icon name="check" size={12} />}
          {r.verdict}
        </Badge>
      ),
    },
    { key: 'helpers', label: 'Helpers' },
    {
      key: 'have',
      label: 'Crew',
      isSortable: true,
      width: '6rem',
      align: 'center',
      sortAccessor: (r) => r.have - r.need,
      render: (r) => (
        <Badge variant={r.have >= r.need ? 'success' : 'destructive'} size="sm" title={`${r.have} of ${r.need} helpers required for this vehicle category`}>
          {r.have}/{r.need}
        </Badge>
      ),
    },
  ]

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="flex flex-wrap items-center gap-2 border-b border-border bg-card px-4 py-3">
        <h1 className="text-base font-semibold text-foreground">Crew view</h1>
        <span className="text-caption text-muted-foreground">
          Week {model.week.w + 1} · {fmtDay(model.week.from)} – {fmtDay(model.week.to)} · one driver plus the helper count per vehicle category
        </span>
        <div className="ms-auto flex flex-wrap items-center gap-2">
          <Select value={String(filters.week)} onValueChange={(v) => onFiltersChange({ ...filters, week: Number(v) })}>
            <SelectTrigger className="h-8 w-56 text-xs" aria-label="Week">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {store.data.weeks.map((w) => (
                <SelectItem key={w.w} value={String(w.w)}>
                  Week {w.w + 1} · {fmtDay(w.from)} – {fmtDay(w.to)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={shift} onValueChange={(v) => setShift(v as Shift | 'All')}>
            <SelectTrigger className="h-8 w-32 text-xs" aria-label="Shift">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SHIFTS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s === 'All' ? 'All shifts' : s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="search" value={q} onChange={(ev) => setQ(ev.target.value)} placeholder="Search route, district, driver…" aria-label="Search crews" leadingIcon={<Icon name="search-md" size={16} />} className="h-8 w-64 text-xs" />
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 px-4 py-3 md:grid-cols-4">
        <KpiMetricCard value={String(rows.length)} label="Routes crewed" />
        <KpiMetricCard value={String(complete)} label="Complete crews" />
        <KpiMetricCard value={String(short)} label="Under-crewed routes" />
        <KpiMetricCard value={String(blocked)} label="Driver blocked / unassigned" />
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-4 pb-4">
        <DataTable<CrewRow>
          columns={columns}
          data={rows}
          getRowId={(r) => r.id}
          isCustomizable={false}
          defaultSort={{ key: 'route', direction: 'asc' }}
          onRowClick={(r) => {
            const d = r.driverId ? model.employeeById.get(r.driverId) : undefined
            if (d) setCard(d)
          }}
        />
      </div>

      <EmployeeCard employee={card} onOpenChange={(o) => !o && setCard(null)} today={model.today} routeById={model.routeById} eligibility={(e, routeId) => model.eligibility(e, routeId)} />
    </div>
  )
}
