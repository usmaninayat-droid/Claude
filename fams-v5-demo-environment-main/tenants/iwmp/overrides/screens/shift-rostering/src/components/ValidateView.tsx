import { useMemo, useState } from 'react'
import { Badge, Button, DataTable, KpiMetricCard, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, type DataTableColumn } from '@fams/ui-kit'
import { Icon } from '@fams/ui-kit/icons'
import type { BoardFilters, Employee, Finding, Severity } from '../data/types'
import { countBySeverity } from '../data/validate'
import { downloadCsv, toCsv } from '../lib/export'
import { fmtDay } from '../lib/format'
import { useRosterStore } from '../state/store'
import { useBoardActions } from '../state/useBoardActions'
import { useBoardModel } from '../state/useBoardModel'
import { EmployeeCard } from './EmployeeCard'

interface FindingRow extends Finding {
  id: string
  sap: number
  name: string
  desig: string
}

const SEVERITIES: readonly Severity[] = ['High', 'Medium', 'Low']
const TONE: Record<Severity, 'destructive' | 'warning' | 'muted'> = { High: 'destructive', Medium: 'warning', Low: 'muted' }
const RANK: Record<Severity, number> = { High: 0, Medium: 1, Low: 2 }

export interface ValidateViewProps {
  filters: BoardFilters
  onFiltersChange: (next: BoardFilters) => void
}

/** BLD-08 — validate week: every finding by severity, with click-through to the employee. */
export function ValidateView({ filters, onFiltersChange }: ValidateViewProps) {
  const store = useRosterStore()
  const model = useBoardModel(filters)
  const actions = useBoardActions(model)
  const [severity, setSeverity] = useState<Severity | 'All'>('All')
  const [card, setCard] = useState<Employee | null>(null)

  const counts = countBySeverity(model.findings)
  const rows = useMemo<FindingRow[]>(
    () =>
      model.findings
        .filter((f) => severity === 'All' || f.severity === severity)
        .map((f, i) => {
          const e = model.employeeById.get(f.employeeId)
          return { ...f, id: `${f.employeeId}-${f.day ?? ''}-${i}`, sap: e?.sap ?? 0, name: e?.name ?? f.employeeId, desig: e?.desig ?? '' }
        }),
    [model.findings, model.employeeById, severity],
  )

  const columns: DataTableColumn<FindingRow>[] = [
    {
      key: 'severity',
      label: 'Severity',
      isSortable: true,
      width: '7rem',
      sortAccessor: (r) => RANK[r.severity],
      render: (r) => (
        <Badge variant={TONE[r.severity]} size="sm">
          {r.severity}
        </Badge>
      ),
    },
    { key: 'sap', label: 'SAP ID', isSortable: true, width: '7rem', render: (r) => <span className="font-mono text-xs">{r.sap}</span> },
    { key: 'name', label: 'Employee', isSortable: true, render: (r) => <span className="text-xs font-medium text-foreground">{r.name}</span> },
    { key: 'desig', label: 'Designation', isSortable: true, width: '12rem' },
    { key: 'day', label: 'Day', isSortable: true, width: '7rem', render: (r) => (r.day ? <span className="font-mono text-xs">{fmtDay(r.day)}</span> : <span className="text-muted-foreground">week</span>) },
    { key: 'text', label: 'Finding' },
  ]

  const exportFindings = () => {
    downloadCsv(
      `Roster_Validation_W${model.week.w + 1}.csv`,
      toCsv(rows.map((r) => ({ Severity: r.severity, 'SAP ID': r.sap, Employee: r.name, Designation: r.desig, Day: r.day ?? '', Finding: r.text }))),
    )
  }

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="flex flex-wrap items-center gap-2 border-b border-border bg-card px-4 py-3">
        <h1 className="text-base font-semibold text-foreground">Validate week</h1>
        <Badge variant={model.week.status === 'Published' ? 'success' : model.week.status === 'Approved' ? 'info' : 'muted'} size="sm">
          {model.week.status}
        </Badge>
        <span className="text-caption text-muted-foreground">
          Week {model.week.w + 1} · {fmtDay(model.week.from)} – {fmtDay(model.week.to)} · High blocks approval · Medium needs supervisor acknowledgement · Low is advisory
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
          <Button size="sm" variant="secondary" onClick={exportFindings}>
            <Icon name="download-01" size={14} /> Export findings
          </Button>
          {model.week.status === 'Draft' && (
            <Button size="sm" variant="primary" onClick={actions.approve} aria-disabled={actions.highCount > 0 || undefined} title={actions.highCount > 0 ? `${actions.highCount} High findings block approval` : 'Submit for Operations Manager approval'}>
              <Icon name="check" size={14} /> Submit for approval
            </Button>
          )}
          {model.week.status === 'Approved' && (
            <Button size="sm" variant="primary" onClick={actions.publish}>
              <Icon name="send-01" size={14} /> Publish
            </Button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 px-4 py-3 md:grid-cols-4">
        <KpiMetricCard value={String(model.findings.length)} label="Findings" clickable onClick={() => setSeverity('All')} />
        {SEVERITIES.map((s) => (
          <KpiMetricCard key={s} value={String(counts[s])} label={`${s} · ${s === 'High' ? 'blocks approval' : s === 'Medium' ? 'acknowledge' : 'advisory'}`} clickable onClick={() => setSeverity(s)} />
        ))}
      </div>

      <div className="flex items-center gap-2 px-4 pb-2 text-xs">
        <span className="text-muted-foreground">Showing</span>
        <Badge variant={severity === 'All' ? 'info' : TONE[severity]} size="sm">
          {severity === 'All' ? 'All severities' : severity}
        </Badge>
        {severity !== 'All' && (
          <Button size="sm" variant="ghost" onClick={() => setSeverity('All')}>
            <Icon name="x-close" size={14} /> Reset
          </Button>
        )}
        <span className="ms-auto tabular-nums text-muted-foreground">{rows.length} rows</span>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-4 pb-4">
        <DataTable<FindingRow>
          columns={columns}
          data={rows}
          getRowId={(r) => r.id}
          isCustomizable={false}
          defaultSort={{ key: 'severity', direction: 'asc' }}
          onRowClick={(r) => {
            const e = model.employeeById.get(r.employeeId)
            if (e) setCard(e)
          }}
        />
      </div>

      <EmployeeCard employee={card} onOpenChange={(o) => !o && setCard(null)} today={model.today} routeById={model.routeById} eligibility={(e, routeId) => model.eligibility(e, routeId)} />
    </div>
  )
}
