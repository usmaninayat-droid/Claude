/**
 * CSV export helper — the one canonical "rows → downloadable .csv" recipe.
 *
 * Products were each re-implementing the escape → Blob → object-URL → temp
 * anchor → revoke dance (ifm timesheets / projects / payroll / ops-center),
 * with subtly different revoke timing. This centralises it: `csvCell` for
 * RFC-4180 escaping, `toCsv` for the string, `downloadCsv` for the file.
 */

export interface CsvColumn<Row> {
  /** Header label for this column. */
  header: string;
  /** Cell value for a row (stringified via String(); null/undefined → ''). */
  value: (row: Row) => unknown;
}

/** RFC-4180 escape: wrap in quotes and double internal quotes when the value
 *  contains a comma, quote, or newline. */
export function csvCell(value: unknown): string {
  const s = value == null ? '' : String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Build a CSV string (header row + data rows) from columns. */
export function toCsv<Row>(rows: readonly Row[], columns: readonly CsvColumn<Row>[]): string {
  const head = columns.map((c) => csvCell(c.header)).join(',');
  const body = rows.map((r) => columns.map((c) => csvCell(c.value(r))).join(','));
  return [head, ...body].join('\r\n');
}

/**
 * Trigger a browser download of `rows` as a CSV file. No-op outside the browser
 * (SSR-safe). `filename` gets a `.csv` suffix if missing. A leading BOM is added
 * so Excel opens UTF-8 (e.g. Arabic names) correctly.
 */
export function downloadCsv<Row>(
  rows: readonly Row[],
  columns: readonly CsvColumn<Row>[],
  filename: string,
): void {
  if (typeof document === 'undefined' || typeof URL === 'undefined' || !URL.createObjectURL) return;
  const name = filename.toLowerCase().endsWith('.csv') ? filename : `${filename}.csv`;
  const blob = new Blob(['﻿' + toCsv(rows, columns)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Defer revoke a tick so the download commits before the URL is freed.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
