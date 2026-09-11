import { Download } from '@fams/ui-kit/icons'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  IconControl,
} from '@fams/ui-kit'
import type { EntityRecord } from '@fams/v5-composer'
import { EXPORT_FORMAT_LABEL, downloadRecords, type ExportColumn, type ExportFormat } from './export-records'

export interface ExportMenuProps {
  /** Columns to write, in order — normally `exportColumnsFor(config)`. */
  columns: ExportColumn[]
  /**
   * The records to write. ALWAYS the filtered set the user is looking at
   * (UX note G.44 / `REFERENCE-MINING.md` §3.5's first rejected defect), or
   * the current selection when the menu is rendered inside the bulk bar.
   */
  records: EntityRecord[]
  /** Names the sheet and the downloaded file (e.g. the module label). */
  label: string
  /**
   * Overrides what an option DOES — e.g. an app that exports server-side.
   * Omit and the file is produced in the browser by `downloadRecords`.
   */
  onExport?: (format: ExportFormat, records: EntityRecord[]) => void
  /** `'icon'` (default) is the toolbar's outlined glyph button; `'button'` is the labelled form the bulk bar uses. */
  variant?: 'icon' | 'button'
  /** Fires after an option is chosen and handled — the bulk bar clears its selection here. */
  onExported?: () => void
}

/**
 * ExportMenu — `Export` as a MENU, not a download button. [tier-2 internal]
 *
 * `INTERACTIONS.md` corrects SPEC row 12 explicitly: the control "must open a
 * two-option menu first; each option then produces the file" (overlay
 * `33534:32261`). Both options are wired — a menu option that produces nothing
 * is the P0 this component exists to avoid.
 *
 * The trigger is icon-only in the toolbar, so it carries both an accessible
 * name and a tooltip on hover AND focus (UX note K.67, whose binding name for
 * this control is the literal `Export`), plus `aria-haspopup="menu"` from
 * `DropdownMenuTrigger`.
 */
export function ExportMenu({
  columns,
  records,
  label,
  onExport,
  variant = 'icon',
  onExported,
}: ExportMenuProps) {
  const run = (format: ExportFormat) => {
    if (onExport) onExport(format, records)
    else downloadRecords(format, columns, records, label)
    onExported?.()
  }

  const trigger =
    variant === 'icon' ? (
      // Icon-only ⇒ the one helper, which also keeps `DropdownMenuTrigger`
      // outermost (see `IconControl`'s docblock on why that order matters).
      <IconControl tip="Export" menuTrigger>
        <Button variant="tertiary" size="icon" className="size-10">
          <Download className="size-5" aria-hidden="true" />
        </Button>
      </IconControl>
    ) : (
      <DropdownMenuTrigger asChild>
        <Button variant="tertiary" size="md" className="h-10" data-slot="bulk-export">
          <Download className="size-4" aria-hidden="true" />
          Export
        </Button>
      </DropdownMenuTrigger>
    )

  return (
    <DropdownMenu>
      {trigger}
      <DropdownMenuContent align="end">
        {(['csv', 'excel'] as const).map((format) => (
          <DropdownMenuItem key={format} onSelect={() => run(format)}>
            {EXPORT_FORMAT_LABEL[format]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

ExportMenu.displayName = 'ExportMenu'
