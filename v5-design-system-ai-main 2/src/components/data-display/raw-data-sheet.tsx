import * as React from 'react';
import * as Icons from '../../icons';
import { cn } from '../utils/cn';
import { Sheet, SheetContent, SheetHeader, SheetTitle, Button, Popover, PopoverTrigger, PopoverContent } from '../primitives';
import { FileTypeIcon } from '../basics/file-type-icon';
import { DataTable, type DataTableColumn } from './data-table';
import { downloadCsv, exportNodeToPdf, type CsvColumn } from '../utils';

/**
 * RawDataSheet — the "view the underlying rows, then download them" drawer that
 * any KPI / chart / widget can open (FAMS Design-System-V2 + Tadweer raw-data
 * sheets, e.g. "Scheduled Routes (Raw Data)"). A wide right `Sheet`: title +
 * muted "(Raw Data)" + a CSV download button, an "Showing N items" line, then a
 * lazy `DataTable` of the source rows. The CSV export is EXACTLY the shown rows
 * (the download basis). Reuses Sheet + DataTable + `downloadCsv`; token-only.
 *
 * Resolves the long-standing KpiDrillSheet gap (T-103) generically.
 */

export interface RawDataSheetProps<T = any> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Metric/chart/widget name — rendered before the muted "(Raw Data)". */
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  rows: T[];
  columns: DataTableColumn<T>[];
  /** CSV columns; defaults to `columns` (header text + accessor). */
  csvColumns?: CsvColumn<T>[];
  getRowId?: (row: T, index: number) => string;
  /** Download filename (`.csv` appended if missing). Defaults to the title. */
  fileName?: string;
  /** One-line note on what the rows/download represent (the basis). */
  basisNote?: React.ReactNode;
  side?: 'right' | 'left';
  width?: string;
  className?: string;
}

const asText = (node: React.ReactNode): string =>
  typeof node === 'string' || typeof node === 'number' ? String(node) : '';

export function RawDataSheet<T = any>({
  open, onOpenChange, title, subtitle, rows, columns, csvColumns,
  getRowId, fileName, basisNote, side = 'right', width = 'min(920px, 92vw)', className,
}: RawDataSheetProps<T>) {
  const cols: CsvColumn<T>[] = React.useMemo(
    () => csvColumns ?? columns
      .filter((c) => c.accessor)
      .map((c) => ({ header: asText(c.header) || c.id, value: (r: T) => c.accessor!(r) })),
    [csvColumns, columns],
  );
  const name = (typeof fileName === 'string' && fileName) || asText(title) || 'raw-data';
  const [dlOpen, setDlOpen] = React.useState(false);
  const printRef = React.useRef<HTMLDivElement>(null);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={side} width={width} hideClose className={className}>
        {/* Floating seam close (design ref): a circular button straddling the
            drawer's outer edge, half over the backdrop — not the in-corner ×. */}
        <button
          type="button"
          aria-label="Close"
          onClick={() => onOpenChange(false)}
          className={cn(
            'absolute top-1/2 z-20 grid size-9 -translate-y-1/2 place-items-center rounded-full border border-border bg-card text-muted-foreground shadow-md transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
            side === 'left' ? 'right-0 translate-x-1/2' : 'left-0 -translate-x-1/2',
          )}
        >
          <Icons.XClose size={18} />
        </button>

        <div className="flex min-h-0 flex-1 flex-col p-6">
        <SheetHeader className="flex-row items-center justify-between gap-4 space-y-0 border-b border-border pb-4">
          <div className="min-w-0">
            <SheetTitle className="text-h6 font-semibold text-foreground">
              {title} <span className="font-normal text-muted-foreground">(Raw Data)</span>
            </SheetTitle>
            {subtitle ? <p className="mt-0.5 text-body-sm text-muted-foreground">{subtitle}</p> : null}
          </div>
          <Popover open={dlOpen} onOpenChange={setDlOpen}>
            <PopoverTrigger asChild>
              <Button size="sm" disabled={!rows.length} className="shrink-0">
                <Icons.FileDownload03 size={15} /> Download
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-52 p-1">
              <div className="px-2.5 py-1.5 text-caption font-medium uppercase tracking-wide text-muted-foreground">Download as</div>
              <button
                type="button"
                onClick={() => { downloadCsv(rows, cols, name); setDlOpen(false); }}
                className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-body-sm text-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
              >
                <FileTypeIcon ext="CSV" size={24} /> CSV
              </button>
              <button
                type="button"
                onClick={() => { exportNodeToPdf(printRef.current, { title: `${name} (Raw Data)` }); setDlOpen(false); }}
                className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-body-sm text-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
              >
                <FileTypeIcon ext="PDF" size={24} /> PDF
              </button>
            </PopoverContent>
          </Popover>
        </SheetHeader>

        <div ref={printRef} className="flex min-h-0 flex-1 flex-col gap-3 pt-4">
          <div className="flex items-center justify-between gap-3 text-body-sm text-muted-foreground">
            <span>Showing {rows.length} item{rows.length === 1 ? '' : 's'}</span>
            {basisNote ? <span className="truncate">{basisNote}</span> : null}
          </div>
          <div className="min-h-0 flex-1">
            <DataTable columns={columns} data={rows} getRowId={getRowId} scrollMode="lazy" stickyHeader />
          </div>
        </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
