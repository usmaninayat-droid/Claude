import { describe, expect, it } from 'vitest'
import type { EntityRecord } from '@fams/v5-composer'
import {
  exportFileName,
  serializeRecords,
  toCsv,
  toExcelXml,
  type ExportColumn,
} from './export-records'

const columns: ExportColumn[] = [
  { header: 'ID', get: (r) => r.uniqueidentifier },
  { header: 'Title', get: (r) => r.title },
  { header: 'Tags', get: (r) => r.tags },
]

const records: EntityRecord[] = [
  { id: 'r1', uniqueidentifier: 'IMS-1', title: 'Say "hello"', tags: ['a', 'b'] },
  { id: 'r2', uniqueidentifier: 'IMS-2', title: 'Comma, inside' },
]

describe('export-records — CSV', () => {
  it('writes a header row from the columns and one row per record', () => {
    const lines = toCsv(columns, records).split('\r\n')
    expect(lines[0]).toBe('"ID","Title","Tags"')
    expect(lines).toHaveLength(3)
  })

  it('doubles embedded quotes and keeps commas inside the quoted cell', () => {
    const csv = toCsv(columns, records)
    expect(csv).toContain('"Say ""hello"""')
    expect(csv).toContain('"Comma, inside"')
  })

  it('renders an array cell as a joined list and a missing cell as blank', () => {
    const csv = toCsv(columns, records)
    expect(csv).toContain('"a; b"')
    // r2 has no tags — a blank quoted cell, never the string "undefined".
    expect(csv).toContain('"Comma, inside",""')
  })
})

describe('export-records — Excel (SpreadsheetML 2003)', () => {
  it('emits one worksheet whose rows mirror the CSV content', () => {
    const xml = toExcelXml(columns, records, 'Pipeline Management')
    expect(xml).toContain('<?xml version="1.0"?>')
    expect(xml).toContain('ss:Name="Pipeline Management"')
    expect(xml.match(/<Row>/g)).toHaveLength(3)
  })

  it('escapes XML-significant characters instead of producing an unopenable file', () => {
    const xml = toExcelXml(columns, [{ id: 'x', title: 'a & b < c' }], 'S')
    expect(xml).toContain('a &amp; b &lt; c')
  })

  it('sanitizes a sheet name Excel would refuse and clamps it to 31 chars', () => {
    const xml = toExcelXml(columns, [], 'Tasks/[2026]: everything everywhere all at once')
    const name = /ss:Name="([^"]*)"/.exec(xml)?.[1] ?? ''
    expect(name).not.toMatch(/[[\]:*?/\\]/)
    expect(name.length).toBeLessThanOrEqual(31)
  })
})

describe('export-records — file naming + format dispatch', () => {
  it('slugifies the module label and stamps the date', () => {
    expect(exportFileName('Pipeline Management', 'csv', new Date('2026-08-26T10:00:00Z'))).toBe(
      'pipeline-management-2026-08-26.csv',
    )
    expect(exportFileName('Pipeline Management', 'excel', new Date('2026-08-26T10:00:00Z'))).toBe(
      'pipeline-management-2026-08-26.xls',
    )
  })

  it('dispatches to the right serializer and MIME per format', () => {
    expect(serializeRecords('csv', columns, records, 'Tasks').mimeType).toContain('text/csv')
    expect(serializeRecords('csv', columns, records, 'Tasks').content.startsWith('"ID"')).toBe(true)
    expect(serializeRecords('excel', columns, records, 'Tasks').mimeType).toContain('vnd.ms-excel')
    expect(serializeRecords('excel', columns, records, 'Tasks').content.startsWith('<?xml')).toBe(true)
  })

  it('exports exactly the records it is handed — the filtered set, never more', () => {
    // The defect deliberately NOT copied from the mined reference, which
    // serialized the module's raw record array and ignored the filters.
    const filtered = [records[0]]
    expect(toCsv(columns, filtered).split('\r\n')).toHaveLength(2)
  })
})
