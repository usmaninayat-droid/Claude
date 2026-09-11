import { DataTable, Badge, type DataTableColumn } from '@fams/design-system'
import { Wrench, Hash, Truck, MapPin, Flag, Pencil, Search, SlidersHorizontal } from 'lucide-react'
import { SectionCard } from '../../components/SectionCard'
import { binRepair, repairStats, type RepairRow, type Severity, type Technician } from './binRepair'
import { CustomScrollbar } from '../../components/CustomScrollbar'

const SEVERITY: Record<Severity, { variant: 'destructive' | 'warning' | 'muted'; label: string }> = {
  critical: { variant: 'destructive', label: 'Critical' },
  medium: { variant: 'warning', label: 'Medium' },
  minor: { variant: 'muted', label: 'Minor' },
}

function TechAvatar({ tech }: { tech: Technician }) {
  const bg = tech.tone === 'success' ? 'var(--status-success)' : 'var(--status-error)'
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
        style={{ background: bg }}
      >
        {tech.initial}
      </span>
      <span className="whitespace-nowrap">{tech.name}</span>
    </span>
  )
}

const columns: DataTableColumn<RepairRow>[] = [
  {
    id: 'wo',
    header: 'Work Order ID',
    width: '130px',
    cell: (r) => (
      <span className="inline-flex items-center gap-1 rounded-[4px] border border-border px-1.5 py-0.5 text-xs font-medium">
        <Hash className="size-3 text-muted-foreground" />
        {r.wo}
      </span>
    ),
  },
  {
    id: 'inspection',
    header: 'Linked Inspection',
    width: '240px',
    cell: (r) => <span className="line-clamp-2 text-muted-foreground">{r.inspection}</span>,
  },
  {
    id: 'bin',
    header: 'Tanker',
    width: '150px',
    cell: (r) => (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
        <Truck className="size-3.5 text-[color:var(--status-success)]" />
        {r.bin}
      </span>
    ),
  },
  { id: 'issue', header: 'Reported Issue', width: '130px', accessor: (r) => r.issue },
  {
    id: 'area',
    header: 'Zone',
    width: '110px',
    cell: (r) => (
      <span className="inline-flex items-center gap-1.5">
        <MapPin className="size-3.5 text-muted-foreground" />
        {r.area}
      </span>
    ),
  },
  {
    id: 'severity',
    header: 'Severity',
    width: '120px',
    cell: (r) => (
      <Badge variant={SEVERITY[r.severity].variant}>
        <Flag className="size-3" />
        {SEVERITY[r.severity].label}
      </Badge>
    ),
  },
  {
    id: 'tech',
    header: 'Assigned Technician',
    width: '170px',
    cell: (r) => (r.tech ? <TechAvatar tech={r.tech} /> : <span className="text-muted-foreground">-</span>),
  },
  { id: 'date', header: 'Date', width: '110px', accessor: (r) => r.date },
  {
    id: 'status',
    header: 'Status',
    width: '140px',
    cell: (r) => (
      <Badge variant={r.status.variant} color={r.status.color}>
        {r.status.label}
      </Badge>
    ),
  },
  {
    id: 'act',
    header: <Pencil className="size-3.5" />,
    width: '48px',
    align: 'center',
    cell: () => (
      <button className="text-muted-foreground hover:text-foreground" aria-label="Edit work order">
        <Pencil className="size-3.5" />
      </button>
    ),
  },
]

function StatChip({ value, total, label, accent }: (typeof repairStats)[number]) {
  const color = accent === 'success' ? 'var(--status-success)' : accent === 'warning' ? 'var(--status-warning)' : undefined
  return (
    <div className="relative overflow-hidden rounded-md border border-border px-3 py-2.5">
      {color ? <span className="absolute inset-y-0 left-0 w-1" style={{ background: color }} /> : null}
      <div className="text-xl font-bold tabular-nums text-foreground">
        {value}
        {total ? <span className="text-muted-foreground">/{total}</span> : null}
      </div>
      <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
    </div>
  )
}

export function BinRepairCard() {
  return (
    <SectionCard title="Tanker Fault & Repair" icon={<Wrench size={16} />} iconTone="warning" bodyPadding="none" className="h-[600px]">
      <div className="flex flex-col gap-3 p-4 flex-1 min-h-0">
        <div className="grid grid-cols-3 gap-2.5">
          {repairStats.map((s) => (
            <StatChip key={s.label} {...s} />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex h-9 flex-1 items-center gap-2 rounded-md border border-border px-3">
            <Search className="size-4 text-muted-foreground" />
            <input
              placeholder="Search"
              className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
          <button
            className="flex size-9 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted"
            aria-label="Filter"
          >
            <SlidersHorizontal className="size-4" />
          </button>
        </div>
        <CustomScrollbar className="flex-1 min-h-0">
          <div className="min-w-[1180px]">
            <DataTable columns={columns} data={binRepair} />
          </div>
        </CustomScrollbar>
      </div>
    </SectionCard>
  )
}
