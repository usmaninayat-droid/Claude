import { deriveColumns, type EntityConfig, type EntityRecord } from '@fams/v5-composer'

/**
 * export-records.ts — the two file formats behind the toolbar's `Export` menu
 * (Figma overlay `33534:32261`: `Export CSV` / `Export Excel`).
 *
 * Two rules from the mined reference (`REFERENCE-MINING.md` §3.5) are inverted
 * here on purpose, because the reference gets them wrong:
 *
 *  1. **The rows exported are the rows on screen.** The reference serializer
 *     (`«IFMDS»/components/app-shell/AppShell.tsx` L476-496) exports the
 *     module's RAW record array, ignoring search/filters/sort, so the file
 *     never matches what the user is looking at. Every caller here hands in
 *     the already-filtered records (`ModuleView` passes its `filtered` set, the
 *     bulk bar passes the selection), consistent with select-all's own
 *     filtered-set semantics (UX note G.44).
 *  2. **`Export` is a menu, not a download button.** The reference wires one
 *     icon button straight to a CSV download. The format choice is the user's
 *     — see `ExportMenu`. A silent no-op on either option is a P0, which is
 *     why {@link downloadRecords} always produces a file (or throws for the
 *     caller to surface) and never returns quietly.
 *
 * No new dependency: CSV is trivial, and "Excel" is emitted as SpreadsheetML
 * 2003 — Microsoft's documented plain-XML workbook format, which Excel opens
 * natively. A real `.xlsx` would mean a zip writer, i.e. a dependency, for no
 * user-visible gain over a format Excel itself defines.
 */

export type ExportFormat = 'csv' | 'excel'

/** One exported column: the header text and how to read a record's cell. */
export interface ExportColumn {
  header: string
  get: (record: EntityRecord) => unknown
}

/** File extension + MIME per format — the only place the two differ downstream. */
const FILE_META: Record<ExportFormat, { extension: string; mimeType: string }> = {
  csv: { extension: 'csv', mimeType: 'text/csv;charset=utf-8' },
  excel: { extension: 'xls', mimeType: 'application/vnd.ms-excel;charset=utf-8' },
}

/** Human label per format — the menu's own option text (`INTERACTIONS.md` L142). */
export const EXPORT_FORMAT_LABEL: Record<ExportFormat, string> = {
  csv: 'Export CSV',
  excel: 'Export Excel',
}

/**
 * The exported columns for a module — its own list columns, in blueprint
 * order, so the file matches the table the user is looking at. Generic: no
 * column is named here, they all come from `deriveColumns(config)`.
 */
export function exportColumnsFor(config: EntityConfig): ExportColumn[] {
  return deriveColumns(config).map((col) => ({
    header: col.header,
    get: (record: EntityRecord) => record[col.accessorKey],
  }))
}

/** A cell rendered for a text file: arrays joined, objects JSON'd, nullish blank. */
function toText(value: unknown): string {
  if (value == null) return ''
  if (Array.isArray(value)) return value.map((v) => toText(v)).join('; ')
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

/** RFC-4180 quoting: always quote, and double any embedded quote. */
function csvCell(value: unknown): string {
  return `"${toText(value).replace(/"/g, '""')}"`
}

export function toCsv(columns: ExportColumn[], records: EntityRecord[]): string {
  const head = columns.map((c) => csvCell(c.header)).join(',')
  const body = records.map((r) => columns.map((c) => csvCell(c.get(r))).join(','))
  return [head, ...body].join('\r\n')
}

const XML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
}

function xmlText(value: unknown): string {
  return toText(value).replace(/[&<>"']/g, (c) => XML_ESCAPES[c])
}

/** SpreadsheetML 2003 — a single worksheet named after the module. */
export function toExcelXml(columns: ExportColumn[], records: EntityRecord[], sheetName: string): string {
  const cells = (values: unknown[]) =>
    values.map((v) => `<Cell><Data ss:Type="String">${xmlText(v)}</Data></Cell>`).join('')
  const rows = [
    `<Row>${cells(columns.map((c) => c.header))}</Row>`,
    ...records.map((r) => `<Row>${cells(columns.map((c) => c.get(r)))}</Row>`),
  ].join('')
  // Worksheet names may not exceed 31 chars nor contain []:*?/\ — Excel
  // refuses to open the file otherwise, so a module label is sanitized here
  // rather than trusted.
  const safeSheet = xmlText(sheetName.replace(/[[\]:*?/\\]/g, ' ')).slice(0, 31) || 'Sheet1'
  return [
    '<?xml version="1.0"?>',
    '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">',
    `<Worksheet ss:Name="${safeSheet}"><Table>${rows}</Table></Worksheet>`,
    '</Workbook>',
  ].join('')
}

/** `Pipeline Management` + `csv` → `pipeline-management-2026-08-26.csv`. */
export function exportFileName(label: string, format: ExportFormat, now: Date = new Date()): string {
  const slug = label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'export'
  return `${slug}-${now.toISOString().slice(0, 10)}.${FILE_META[format].extension}`
}

/** Serializes without touching the DOM — the unit-testable half. */
export function serializeRecords(
  format: ExportFormat,
  columns: ExportColumn[],
  records: EntityRecord[],
  label: string,
): { content: string; fileName: string; mimeType: string } {
  return {
    content: format === 'csv' ? toCsv(columns, records) : toExcelXml(columns, records, label),
    fileName: exportFileName(label, format),
    mimeType: FILE_META[format].mimeType,
  }
}

/**
 * Serializes AND hands the file to the browser. Kept separate from
 * {@link serializeRecords} so the format logic is testable without a DOM, and
 * so an app that would rather stream from its own backend can pass its own
 * `onExport` to `ExportMenu` and never reach this function.
 *
 * Returns `false` when the environment has no object-URL support (SSR, a
 * locked-down test runner) so a caller can fall back; it never fails silently
 * in a real browser.
 */
export function downloadRecords(
  format: ExportFormat,
  columns: ExportColumn[],
  records: EntityRecord[],
  label: string,
): boolean {
  if (typeof document === 'undefined' || typeof URL?.createObjectURL !== 'function') return false
  const { content, fileName, mimeType } = serializeRecords(format, columns, records, label)
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
  return true
}
