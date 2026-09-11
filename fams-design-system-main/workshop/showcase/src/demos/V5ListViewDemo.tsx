import { useState } from 'react'
import { ListView, type EntityRecord } from '@fams/v5-templates'
import { DocPage, DocSection, Prose, PropsTable, Guidelines, A11yList, Code } from '../docs'
import { dealsConfig, dealRecords } from './v5-views-blueprint'

/**
 * V5ListViewDemo — the blueprint-driven ListView TEMPLATE (tier-2), distinct
 * from ui-kit's ListView shell: columns from `deriveColumns`, cells via the
 * FieldRegistry read renderers, inline edit on double-click.
 */
export default function V5ListViewDemo() {
  const [records, setRecords] = useState<EntityRecord[]>(dealRecords)
  const [loading, setLoading] = useState(false)

  return (
    <DocPage
      title="ListView (template)"
      badge="wip"
      summary="The blueprint-driven list template — ui-kit DataTable (TanStack Table) underneath, columns + cells derived from the blueprint, inline edit via the FieldRegistry cell editors, plus skeleton / empty / lazy-load states. Presentational — no fetching."
    >
      <DocSection id="preview" title="Preview">
        <Prose>
          Columns come from <Code>deriveColumns(config)</Code>; each cell renders through the read
          renderer for its field type. Double-click a <Code>Priority</Code> or <Code>Company</Code> cell to
          edit inline — commit with Enter (fires <Code>onRecordChange</Code>).
        </Prose>
        <div className="h-[420px] overflow-hidden rounded-md border border-border">
          <ListView
            config={dealsConfig}
            records={records}
            editableCols={['systemcol2', 'systemcol3']}
            onRecordChange={(col, value, record) =>
              setRecords((cur) => cur.map((r) => (r.id === record.id ? { ...r, [col]: value } : r)))
            }
          />
        </div>
      </DocSection>

      <DocSection id="states" title="Loading & empty">
        <Prose>
          Toggle the loading skeleton; the tokenized <Code>ViewEmptyState</Code> shows when there are no
          records. <Code>hasMore</Code> + <Code>onLoadMore</Code> drive lazy pagination (never fetches).
        </Prose>
        <button
          type="button"
          className="self-start rounded-sm border border-border px-3 py-1.5 text-body-sm"
          onClick={() => setLoading((v) => !v)}
        >
          Toggle loading
        </button>
        <div className="h-[220px] overflow-hidden rounded-md border border-border">
          <ListView config={dealsConfig} records={[]} loading={loading} />
        </div>
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            { prop: 'config / records', type: 'EntityConfig / EntityRecord[]', description: 'Blueprint + the rows to render (already filtered/sorted by the caller).' },
            { prop: 'editableCols', type: 'string[]', description: 'Cols the user may inline-edit (double-click). Needs onRecordChange.' },
            { prop: 'onRecordChange', type: '(col, value, record) => void', description: 'Inline-edit commit.' },
            { prop: 'onRowClick', type: '(record) => void', description: 'Row click — the hook the hybrid split uses.' },
            { prop: 'loading', type: 'boolean', description: 'Renders skeleton rows.' },
            { prop: 'hasMore / onLoadMore', type: 'boolean / () => void', description: 'Lazy-load pagination affordance.' },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Drive columns + cells from the blueprint — never hand-author a column set here.',
            'Pass records already filtered/sorted (or let ModuleView do it).',
            'Gate inline edit to the cols that make sense via editableCols.',
          ]}
          donts={[
            'Don’t fetch or paginate inside the list — report intent via onLoadMore (Rule 8).',
            'Don’t re-skin cells with raw values — the FieldRegistry read renderers own presentation.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Built on the core DataTable — semantic table, sortable column headers with aria-sort.',
            'Inline editors are real form controls; Enter commits, Escape cancels.',
            'RTL-safe: logical properties throughout.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
