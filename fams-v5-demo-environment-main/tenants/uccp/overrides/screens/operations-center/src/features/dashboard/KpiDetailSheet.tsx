import {
  Sheet, SheetContent, SheetClose, SheetTitle, SheetDescription,
  DataTable, Badge, Avatar,
  type DataTableColumn,
} from '@fams/design-system'
import { X, Hash, Truck, Trash2, Recycle, FileDown } from 'lucide-react'
import { rawRoutes, kpiCount, type RawRoute } from './kpiRawData'
import { CustomScrollbar } from '../../components/CustomScrollbar'

function initials(name: string) {
  const parts = name.replace(/[^A-Za-z ]/g, '').trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?'
}

const columns: DataTableColumn<RawRoute>[] = [
  {
    id: 'route',
    header: 'Route',
    width: '108px',
    cell: (r) => (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-[4px] bg-muted px-2 py-1 text-sm font-medium text-foreground">
        <Hash className="size-3.5 text-muted-foreground" />
        {r.route}
      </span>
    ),
  },
  {
    id: 'plan',
    header: 'Plan',
    cell: (r) => <span className="text-sm text-foreground">{r.plan}</span>,
  },
  {
    id: 'vehicle',
    header: 'Vehicle',
    cell: (r) => (
      <span className="inline-flex items-center gap-2 text-sm text-foreground">
        <span className="flex size-6 items-center justify-center rounded-[4px] bg-muted">
          <Truck className="size-3.5 text-muted-foreground" />
        </span>
        {r.vehicle}
      </span>
    ),
  },
  {
    id: 'driver',
    header: 'Driver',
    cell: (r) => (
      <span className="inline-flex items-center gap-2 text-sm text-foreground">
        <Avatar size="sm" fallback={initials(r.driver)} />
        {r.driver}
      </span>
    ),
  },
  {
    id: 'service',
    header: 'Service Type',
    cell: (r) => (
      <Badge variant="warning">
        <Trash2 />
        {r.service}
      </Badge>
    ),
  },
  {
    id: 'waste',
    header: 'Incident Type',
    cell: (r) => (
      <span className="inline-flex items-center gap-1.5 text-sm text-foreground">
        <Recycle className="size-4 text-[color:var(--status-success)]" />
        {r.waste}
      </span>
    ),
  },
  {
    id: 'time',
    header: 'Planned Time',
    width: '190px',
    cell: (r) => (
      <div className="text-sm leading-tight text-foreground">
        <div className="whitespace-nowrap">Start: {r.start}</div>
        <div className="whitespace-nowrap text-muted-foreground">End: {r.end}</div>
      </div>
    ),
  },
]

export type KpiDetailSheetProps = {
  /** KPI label + value; when non-null the sheet is open. */
  kpi: { label: string; value: string } | null
  onOpenChange: (open: boolean) => void
}

/**
 * KpiDetailSheet — NEW local component. Right-side "raw data" sheet opened by
 * clicking a KPI card, per Figma node 2227:79382. Built on the DS `Sheet`
 * primitive + `DataTable`; no DS equivalent packages this layout.
 */
export function KpiDetailSheet({ kpi, onOpenChange }: KpiDetailSheetProps) {
  return (
    <Sheet open={kpi != null} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        hideClose
        width="min(960px, 94vw)"
        className="p-0 flex flex-col h-full"
      >
        {/* Circular close floating in the scrim, with a gap to the sheet's left
            edge, vertically centered (matches Figma). */}
        <SheetClose className="absolute -left-14 top-1/2 z-10 flex size-8 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-md outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
          <X className="size-4" />
          <span className="sr-only">Close</span>
        </SheetClose>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 pt-6">
          <div>
            <SheetTitle className="text-2xl font-semibold text-foreground">
              {kpi?.label}{' '}
              <span className="font-normal text-muted-foreground">(Raw Data)</span>
            </SheetTitle>
            <SheetDescription className="mt-1.5">
              Showing {kpi ? kpiCount(kpi.value).toLocaleString() : 0} items
            </SheetDescription>
          </div>
          <button
            className="flex size-9 shrink-0 items-center justify-center rounded-[4px] bg-primary text-primary-foreground outline-none transition-[filter] hover:brightness-95"
            aria-label="Export"
          >
            <FileDown className="size-5" />
          </button>
        </div>

        {/* Table */}
        <CustomScrollbar className="min-h-0 flex-1" viewportClassName="px-6 pb-6 pt-4">
          <DataTable
            columns={columns}
            data={rawRoutes}
            className="h-full rounded-md"
          />
        </CustomScrollbar>
      </SheetContent>
    </Sheet>
  )
}
