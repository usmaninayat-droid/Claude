import { useState } from 'react'
import { DataTable, DataTablePagination } from '@fams/ui-kit'
import { DocPage, DocSection, Prose, Gallery, Playground, PropsTable, Guidelines, A11yList, DevNote, Code } from '../docs'
import {
  CONTENT_TYPE_COLUMNS,
  FLEET_COLUMNS,
  FLEET_COLUMN_ORDER,
  FLEET_GROUP_BY,
  FLEET_ROWS,
  LIVE_LIST_COLUMNS,
  PANE_COLUMNS,
  STACKED_COLUMNS,
  UNCLASSIFIED_COLUMNS,
  type FleetRow,
} from './data-table-fleet'

/**
 * Every table on this page renders the SAME 30-row fleet dataset through the
 * same `ui-kit` cell renderers the demo environment's list modules use — see
 * `data-table-fleet.tsx` for the dataset and the three column sets. The page
 * used to show plain-text `plate / driver / lot / fuel %` placeholder
 * columns, which taught a designer nothing about what the product's list
 * actually looks like.
 */
const rowId = (row: FleetRow) => row.id

/** A short slice for the sections that are about WIDTH, not row count. */
const FEW_ROWS = FLEET_ROWS.slice(0, 3)

type DataTableControls = {
  isSelectable: boolean
  isCustomizable: boolean
  groupBy: boolean
  loading: boolean
  density: 'default' | 'compact'
}

/**
 * DataTableDemo — standard component-page template for the DataTable
 * composite, the platform "base table". Ported from the team GH design-system
 * `data-table.tsx` and the real v5 q-table wrapper (Figma 504-27970 /
 * 495-25285). DataTable/DateRangePicker prioritize a full interactive
 * Preview and a thorough Props reference over many small galleries.
 */
export default function DataTableDemo() {
  const [columnOrder, setColumnOrder] = useState(FLEET_COLUMN_ORDER)
  const [selectedIds, setSelectedIds] = useState<string[]>(['VEH-02'])
  const [serverPage, setServerPage] = useState(1)
  const [standalonePage, setStandalonePage] = useState(2)
  const [expandedColumnKey, setExpandedColumnKey] = useState<string | null>(null)

  return (
    <DocPage
      title="DataTable"
      badge="stable"
      summary="The platform 'base table' — ported from the GH design-system data-table.tsx and the real v5 q-table wrapper (Figma 504-27970 / 495-25285). Sortable headers, checkbox selection, sticky header, optional groupBy, and the standard Columns customizer built in. Every table below renders the same 30-row fleet dataset through the same cell renderers the demo environment's list modules use."
    >
      <DocSection id="product-list" title="Product list rows">
        <Prose>
          This is the row anatomy every FAMS list module ships — the same dataset and the same{' '}
          <Code>TableCell</Code> kinds the demo environment renders, with nothing overridden:{' '}
          <Code>kind=&quot;entity&quot;</Code> puts the 39×29 vehicle thumb (a{' '}
          <Code>VehicleIcon3D</Code> with its status-dot badge on the bottom-start corner) beside the
          record name, <Code>kind=&quot;text&quot;</Code> carries the plate and type, and{' '}
          <Code>kind=&quot;icon-value&quot;</Code> puts the map-pin glyph in front of the location. 48px
          rows, a 40px uppercase header and bottom-only row dividers are <Code>DataTable</Code>{' '}
          defaults — this table passes no styling props at all.
        </Prose>
        <div className="w-full rounded-md border border-border bg-card">
          <DataTable
            columns={LIVE_LIST_COLUMNS}
            data={FLEET_ROWS.slice(0, 8)}
            getRowId={rowId}
            isCustomizable={false}
            ariaLabel="Live monitoring list"
          />
        </div>
        <Prose>
          The same rows in a narrow pane beside a map: three columns at{' '}
          <Code>density=&quot;compact&quot;</Code>, where the activity strip is{' '}
          <Code>kind=&quot;metrics&quot;</Code> — icon+count pairs, each named for screen readers and
          tinted from a closed tone enum, never a raw colour.
        </Prose>
        <Gallery
          minColRem={20}
          maxCols={1}
          items={[
            {
              label: 'Narrow pane (compact)',
              caption: '440px — VEHICLE · ACTIVITY OVERVIEW · SPEED, the hybrid view\'s list pane',
              node: (
                <div className="w-full max-w-[440px] rounded-md border border-border bg-card">
                  <DataTable
                    columns={PANE_COLUMNS}
                    data={FLEET_ROWS.slice(0, 8)}
                    getRowId={rowId}
                    density="compact"
                    isCustomizable={false}
                    ariaLabel="Live monitoring pane"
                  />
                </div>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="playground" title="Playground">
        <Prose>
          Click a sortable header to cycle asc → desc → none. The pencil pinned at the header row&apos;s
          trailing end opens the drag-reorder columns customizer — the same affordance every FAMS
          list/table screen shows (a small pencil, never a bordered &quot;Columns&quot; button).
        </Prose>
        <Playground<DataTableControls>
          className="items-start"
          controls={[
            { name: 'isSelectable', type: 'boolean', default: true },
            { name: 'isCustomizable', type: 'boolean', default: true },
            { name: 'groupBy', type: 'boolean', default: false },
            { name: 'loading', type: 'boolean', default: false },
            { name: 'density', type: 'select', options: ['default', 'compact'], default: 'default' },
          ]}
        >
          {(v) => (
            <div className="w-full rounded-md border border-border bg-card">
              <DataTable
                columns={FLEET_COLUMNS}
                data={FLEET_ROWS}
                getRowId={rowId}
                columnOrder={columnOrder}
                onColumnOrderChange={setColumnOrder}
                isSelectable={v.isSelectable}
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
                isCustomizable={v.isCustomizable}
                groupBy={v.groupBy ? FLEET_GROUP_BY : undefined}
                loading={v.loading}
                density={v.density}
              />
            </div>
          )}
        </Playground>
      </DocSection>

      <DocSection id="columns-menu" title="Columns customizer trigger">
        <Prose>
          <Code>isCustomizable</Code> (default true) always opens the same drag-reorder{' '}
          <Code>ColumnCustomizer</Code> panel — only the trigger&apos;s look changes with{' '}
          <Code>columnsMenuVariant</Code>. <Code>&quot;icon&quot;</Code> (default) is the product truth: a
          pencil pinned at the header row&apos;s trailing end, matching every FAMS Figma table/list screen
          (F1 hybrid list, F2 list view, F4 portal table all show a small pencil at the header&apos;s end —
          never a bordered, labelled button). <Code>&quot;labelled&quot;</Code> is a legacy escape hatch —
          the bordered gear-icon + text button in its own toolbar row above the table — kept for a
          standalone toolbar context with no header row to pin a pencil into; no shipped product surface
          uses it.
        </Prose>
        <Gallery
          minColRem={20}
          items={[
            {
              label: 'icon (default) — product affordance',
              caption: 'a pencil pinned at the header row\'s trailing end',
              node: (
                <div className="w-full rounded-md border border-border bg-card">
                  <DataTable columns={CONTENT_TYPE_COLUMNS} data={FEW_ROWS} />
                </div>
              ),
            },
            {
              label: 'labelled — legacy escape hatch',
              caption: 'bordered "Columns" button + gear icon, own toolbar row (not used by any product surface)',
              node: (
                <div className="w-full rounded-md border border-border bg-card">
                  <DataTable columns={CONTENT_TYPE_COLUMNS} data={FEW_ROWS} columnsMenuVariant="labelled" />
                </div>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="sorting" title="Sorting & grouping">
        <Gallery
          minColRem={24}
          items={[
            {
              label: 'defaultSort',
              caption: "seeds the initial arrow — odometer asc — user can still re-sort",
              node: (
                <div className="w-full rounded-md border border-border bg-card">
                  <DataTable
                    columns={FLEET_COLUMNS}
                    data={FLEET_ROWS}
                    defaultSort={{ key: 'odometer', direction: 'asc' }}
                    isCustomizable={false}
                  />
                </div>
              ),
            },
            {
              label: 'groupBy',
              caption: 'partitions rows into collapsible labeled sections, keyed by home depot',
              node: (
                <div className="w-full rounded-md border border-border bg-card">
                  <DataTable columns={FLEET_COLUMNS} data={FLEET_ROWS} groupBy={FLEET_GROUP_BY} isCustomizable={false} />
                </div>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="selection-modes" title="Selection modes">
        <Prose>
          <Code>isSelectable</Code> defaults to a checkbox column with a header select-all.{' '}
          <Code>selectionMode=&quot;radio&quot;</Code> switches to an exclusive single-choice list — a radio
          control per row and no select-all (there is nothing to select "all" of in a single-choice picker,
          e.g. figma 5332:21416&apos;s &quot;Link an Existing Workforce Profile&quot; table).
        </Prose>
        <Gallery
          minColRem={24}
          items={[
            {
              label: 'checkbox (default)',
              node: (
                <div className="w-full rounded-md border border-border bg-card">
                  <DataTable
                    columns={FLEET_COLUMNS}
                    data={FLEET_ROWS}
                    getRowId={rowId}
                    isSelectable
                    selectedIds={['VEH-01']}
                    onSelectionChange={() => {}}
                    isCustomizable={false}
                  />
                </div>
              ),
            },
            {
              label: 'selectionMode="radio"',
              node: (
                <div className="w-full rounded-md border border-border bg-card">
                  <DataTable
                    columns={FLEET_COLUMNS}
                    data={FLEET_ROWS}
                    getRowId={rowId}
                    isSelectable
                    selectionMode="radio"
                    selectedIds={['VEH-02']}
                    onSelectionChange={() => {}}
                    isCustomizable={false}
                  />
                </div>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="density" title="Density">
        <Prose>
          <Code>density=&quot;default&quot;</Code> (the unchanged default) is the padding every existing
          table already ships — <Code>px-3</Code> cells and a 40px header row. <Code>density=&quot;compact&quot;</Code>{' '}
          is the second, independent axis to <Code>rowHeight</Code>'s row rhythm: a 32px header row and
          tighter cell padding, threaded through to <Code>DataTableHeaderCell</Code> so the header and body
          rows can never disagree. It is a GENERIC knob — it states a density, never which surface asked for
          it — built for the ~440px hybrid list pane, where three real columns need to fit without crushing
          into truncation.
        </Prose>
        <Gallery
          minColRem={26}
          maxCols={1}
          items={[
            {
              label: 'default',
              caption: 'the full-width list view — 40px header row, px-3 cells, 48px rows',
              node: (
                <div className="w-full rounded-md border border-border bg-card">
                  <DataTable columns={LIVE_LIST_COLUMNS} data={FEW_ROWS} isCustomizable={false} />
                </div>
              ),
            },
            {
              label: 'compact',
              caption: 'the hybrid list pane at ~440px — 32px header row, tighter cell padding',
              node: (
                <div className="mx-auto w-full max-w-[440px] rounded-md border border-border bg-card">
                  <DataTable columns={PANE_COLUMNS} data={FEW_ROWS} density="compact" isCustomizable={false} />
                </div>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="content-types" title="Column content types (responsive overflow)">
        <Prose>
          <Code>column.contentType</Code> encodes the stakeholder-agreed truncation rules so a screen never
          has to make its own judgment call: <Code>fixed-id</Code> (plates, IMEI) never truncates — natural
          width, single line. <Code>variable-id</Code> (names, incl. a long "driver in vehicle" composite)
          wraps up to 2 lines, only falling back to a single MIDDLE-truncated line (never end-truncated) when
          the value is too long even for 2 lines — the differentiating tail stays visible either way.{' '}
          <Code>descriptive</Code> (addresses, notes) end-truncates to one line but always ships a
          one-gesture full-value tooltip — hover on desktop, tap to toggle on touch (try clicking the address
          below). <Code>fixed-content</Code> (status, speed, a timestamp) renders like{' '}
          <Code>fixed-id</Code> — short fixed-format values never need truncation either.
        </Prose>
        <div className="w-full rounded-md border border-border bg-card">
          <DataTable columns={CONTENT_TYPE_COLUMNS} data={FEW_ROWS} isCustomizable={false} />
        </div>
      </DocSection>

      <DocSection id="column-expansion" title="Column expansion">
        <Prose>
          Double-tap a column (header or cells) on touch to expand it to full width — every other visible
          column compresses to its <Code>contentType</Code> floor rather than the table falling back to its
          own horizontal scroll. Double-tap the expanded column again, or tap any OTHER column, to collapse
          it back. On web, hover a header to reveal the small expand-toggle button next to the label (click
          it, or click it again to collapse) — pointer users additionally get the standard drag-to-resize
          column border (also keyboard-operable: focus the divider and press <Code>←</Code>/<Code>→</Code>).
          Only one column expands at a time; the table is fully controlled via{' '}
          <Code>expandedColumnKey</Code>/<Code>onExpandedColumnChange</Code>, mirroring{' '}
          <Code>selectedIds</Code>/<Code>onSelectionChange</Code> on this same component.
        </Prose>
        <div className="w-full rounded-md border border-border bg-card">
          <DataTable
            columns={CONTENT_TYPE_COLUMNS}
            data={FEW_ROWS}
            expandedColumnKey={expandedColumnKey}
            onExpandedColumnChange={setExpandedColumnKey}
            isCustomizable={false}
          />
        </div>
      </DocSection>

      <DocSection id="responsive-columns" title="Responsive column behavior">
        <Prose>
          Below a defined viewport width, columns give way in the same priority order as{' '}
          <Code>contentType</Code>'s width allocation: <Code>descriptive</Code> hides first, then{' '}
          <Code>variable-id</Code>; <Code>fixed-content</Code>/<Code>fixed-id</Code> stay visible longest
          (hidden last, if ever). This is a DEFAULT layered on top of the existing explicit{' '}
          <Code>hiddenColumnKeys</Code>/<Code>ColumnCustomizer</Code> model — hiding another column via the
          customizer frees space, which can bring an auto-hidden column back. The two tables below render
          the exact same <Code>columns</Code>/<Code>data</Code> at different container widths — resize your
          browser (or this panel, if your browser supports resizing a container) to see columns give way and
          return live.
        </Prose>
        <Prose>
          The FIRST column is never auto-hidden, whatever its <Code>contentType</Code> — even an unclassified
          one. Before the 2026-09-07 fix, a column with no <Code>contentType</Code> landed in the same
          hide-first tier as <Code>descriptive</Code>, so an unclassified identity column sitting at index 0
          (exactly the narrow hybrid list pane's mixed column set) was the very first thing hidden, leaving a
          row with nothing naming it. Resize the &quot;Identity column protected&quot; table below — Name
          never disappears; ID/Type/Location give way first.
        </Prose>
        <Gallery
          minColRem={16}
          items={[
            {
              label: 'Full width',
              caption: 'every column fits — nothing auto-hidden',
              node: (
                <div className="w-full rounded-md border border-border bg-card">
                  <DataTable columns={CONTENT_TYPE_COLUMNS} data={FEW_ROWS} isCustomizable={false} />
                </div>
              ),
            },
            {
              label: 'Narrow container',
              caption: '"Address" (descriptive) gives way first, then "Driver / Vehicle" (variable-id) if still too narrow',
              node: (
                <div className="max-w-64 rounded-md border border-border bg-card">
                  <DataTable columns={CONTENT_TYPE_COLUMNS} data={FEW_ROWS} isCustomizable />
                </div>
              ),
            },
            {
              label: 'disableResponsiveHide',
              caption:
                'UX ruling A6 (run 2026-09-05): a table that must never silently drop a column — every column stays, and the table grows its own horizontal scroll instead',
              node: (
                <div className="max-w-64 rounded-md border border-border bg-card">
                  <DataTable
                    columns={CONTENT_TYPE_COLUMNS}
                    data={FEW_ROWS}
                    isCustomizable={false}
                    disableResponsiveHide
                  />
                </div>
              ),
            },
            {
              label: 'stickyFirstCol + stickyTrailingCol',
              caption:
                'the identity column pins to the inline-start edge, the per-row options control pins to the inline-end edge — both stay reachable while scrolling. Try scrolling this table horizontally.',
              node: (
                <div className="max-w-64 rounded-md border border-border bg-card">
                  <DataTable
                    columns={CONTENT_TYPE_COLUMNS}
                    data={FEW_ROWS}
                    isCustomizable={false}
                    disableResponsiveHide
                    stickyFirstCol
                    stickyTrailingCol
                    rowActions={() => (
                      <button
                        type="button"
                        aria-label="Row options"
                        className="inline-flex size-6 items-center justify-center rounded-xs text-muted-foreground outline-none hover:bg-muted/50 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        ⋮
                      </button>
                    )}
                  />
                </div>
              ),
            },
            {
              label: 'Identity column protected',
              caption:
                '"Name" carries no contentType and sits at index 0 — it used to be the FIRST column auto-hidden (tier || index sort); the first column is now never auto-hidden',
              node: (
                <div className="max-w-48 rounded-md border border-border bg-card">
                  <DataTable columns={UNCLASSIFIED_COLUMNS} data={FEW_ROWS} isCustomizable={false} />
                </div>
              ),
            },
            {
              label: 'stickyLeadingCols (no seam)',
              caption:
                'pins the checkbox AND identity column together — no vertical divider at the pin boundary (2026-09-07 Figma cross-check: no vertical column dividers anywhere, only bottom-only row dividers). The pin still reads: the cell stays opaque as columns scroll under it.',
              node: (
                <div className="max-w-64 rounded-md border border-border bg-card">
                  <DataTable
                    columns={CONTENT_TYPE_COLUMNS}
                    data={FEW_ROWS}
                    isCustomizable={false}
                    isSelectable
                    selectedIds={[]}
                    onSelectionChange={() => {}}
                    disableResponsiveHide
                    stickyLeadingCols
                  />
                </div>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="stacked-layout" title="Narrow layout (list beside a map)">
        <Prose>
          <Code>layout=&quot;stacked&quot;</Code> is the narrow-panel row shape for a list sitting beside a
          map: <Code>stackedIdentifierKey</Code>&apos;s column renders on its own line, every other visible
          column folds onto a wrapping "label value" line underneath, instead of one cell per column. Still
          under stakeholder debate — kept prop-driven and easy to flip back to <Code>&quot;table&quot;</Code>{' '}
          at any breakpoint (both layouts read the same <Code>columns</Code>/<Code>data</Code>).
        </Prose>
        <div className="max-w-xs rounded-md border border-border bg-card">
          <DataTable
            columns={STACKED_COLUMNS}
            data={FLEET_ROWS}
            layout="stacked"
            stackedIdentifierKey="plate"
            isCustomizable={false}
          />
        </div>
      </DocSection>

      <DocSection id="states" title="Loading & empty">
        <Gallery
          minColRem={24}
          items={[
            {
              label: 'Loading',
              caption: 'rows replaced with the loading placeholder; header + Columns stay interactive',
              node: (
                <div className="w-full rounded-md border border-border bg-card">
                  <DataTable columns={FLEET_COLUMNS} data={FLEET_ROWS} loading isCustomizable={false} />
                </div>
              ),
            },
            {
              label: 'Empty',
              caption: 'no rows — pair with a Skeleton for the initial-fetch loading placeholder',
              node: (
                <div className="w-full rounded-md border border-border bg-card">
                  <DataTable columns={FLEET_COLUMNS} data={[]} isCustomizable={false} />
                </div>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="pagination" title="Pagination">
        <Prose>
          Passing <Code>pageSize</Code> turns on the pager — <Code>DataTablePagination</Code>, the
          sub-component <Code>DataTable</Code> renders in its own footer. It is presentational only:
          it never fetches and never slices in server mode. Omit <Code>pageSize</Code> and no pager
          renders at all.
        </Prose>
        <Gallery
          minColRem={24}
          items={[
            {
              label: 'pageSize (client convenience)',
              caption: 'pageSize alone — DataTable slices its own sorted data and pages it',
              node: (
                <div className="w-full rounded-md border border-border bg-card">
                  <DataTable columns={FLEET_COLUMNS} data={FLEET_ROWS} getRowId={rowId} pageSize={5} isCustomizable={false} />
                </div>
              ),
            },
            {
              label: 'pageSize + rowCount (server mode)',
              caption:
                'data is exactly one page; onPaginationChange is the cue to refetch — nothing is sliced',
              node: (
                <div className="w-full rounded-md border border-border bg-card">
                  <DataTable
                    columns={FLEET_COLUMNS}
                    data={FLEET_ROWS.slice(0, 5)}
                    getRowId={rowId}
                    page={serverPage}
                    pageSize={5}
                    rowCount={48}
                    onPaginationChange={({ page }) => setServerPage(page)}
                    isCustomizable={false}
                  />
                </div>
              ),
            },
          ]}
        />
        <Prose>
          The pager is also exported on its own as <Code>DataTablePagination</Code> for list surfaces
          that are not tables — a card grid or a <Code>ListRow</Code> stack — so paging looks and
          announces identically everywhere. It renders the range label, a live-region page counter,
          and icon-only Previous/Next buttons that disable at the ends.
        </Prose>
        <Gallery
          minColRem={24}
          items={[
            {
              label: 'DataTablePagination (standalone)',
              caption: 'the same pager, driven directly — page/pageCount/pageSize/rowCount',
              node: (
                <div className="w-full rounded-md border border-border bg-card">
                  <DataTablePagination
                    page={standalonePage}
                    pageCount={5}
                    pageSize={10}
                    rowCount={48}
                    onPageChange={setStandalonePage}
                  />
                </div>
              ),
            },
            {
              label: 'rowCount omitted',
              caption: 'no range label — just the page counter and the two controls',
              node: (
                <div className="w-full rounded-md border border-border bg-card">
                  <DataTablePagination
                    page={standalonePage}
                    pageCount={5}
                    pageSize={10}
                    onPageChange={setStandalonePage}
                  />
                </div>
              ),
            },
          ]}
        />
        <Prose>
          <Code>DataTablePaginationProps</Code>:
        </Prose>
        <PropsTable
          rows={[
            { prop: 'page', type: 'number', required: true, description: 'Current 1-indexed page.' },
            { prop: 'pageCount', type: 'number', required: true, description: 'Total number of pages (≥ 1). Next is disabled on the last page.' },
            {
              prop: 'pageSize',
              type: 'number',
              required: true,
              description: 'Rows per page — used only to compute the "X–Y of Z" range label.',
            },
            {
              prop: 'rowCount',
              type: 'number',
              description: 'Total rows across all pages. Omit to hide the range label entirely.',
            },
            {
              prop: 'onPageChange',
              type: '(page: number) => void',
              required: true,
              description: 'Fires with the requested 1-indexed page when Previous/Next is clicked.',
            },
            { prop: 'className', type: 'string', description: 'Merged onto the pager root.' },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <Prose>Component props.</Prose>
        <PropsTable
          rows={[
            { prop: 'columns', type: 'DataTableColumn<T>[]', required: true, description: 'Column definitions — see below.' },
            { prop: 'data', type: 'T[]', required: true, description: 'Row data.' },
            {
              prop: 'getRowId',
              type: '(row: T, index: number) => string',
              default: 'String(index)',
              description: 'Stable row id used for selection and React keys.',
            },
            { prop: 'sort', type: 'SortState | null', description: 'Controlled sort state: { key, direction }.' },
            { prop: 'onSortChange', type: '(sort: SortState | null) => void', description: 'Fires on header-click sort cycling.' },
            { prop: 'defaultSort', type: 'SortState | null', description: 'Uncontrolled initial sort.' },
            { prop: 'isSelectable', type: 'boolean', default: 'false', description: 'Adds the checkbox column + header select-all.' },
            { prop: 'selectedIds', type: 'string[]', description: 'Controlled selection — required alongside onSelectionChange.' },
            { prop: 'onSelectionChange', type: '(ids: string[]) => void', description: 'Fires on row/select-all checkbox toggle.' },
            {
              prop: 'selectionMode',
              type: "'checkbox' | 'radio'",
              default: "'checkbox'",
              description: '"radio" swaps to an exclusive single-select list — a radio control per row, no select-all.',
            },
            { prop: 'onRowClick', type: '(row: T, index: number) => void', description: 'Row click handler; adds pointer/hover affordance.' },
            {
              prop: 'isCustomizable',
              type: 'boolean',
              default: 'true',
              description:
                'Shows the columns customizer trigger + panel — a pencil pinned at the header row\'s trailing end (product truth: every Figma table/list screen shows a small pencil there, never a bordered "Columns" button).',
            },
            {
              prop: 'columnsMenuVariant',
              type: "'icon' | 'labelled'",
              default: "'icon'",
              description:
                'icon: the pencil trigger above. labelled: the legacy bordered "Columns" button (gear icon + text) in its own toolbar row — an escape hatch for a standalone toolbar context, unused by any shipped product surface.',
            },
            {
              prop: 'columnOrder',
              type: 'string[]',
              description:
                'Ordered visible column keys. Combined with onColumnOrderChange, this is the single source of truth for both visibility and order.',
            },
            {
              prop: 'onColumnOrderChange',
              type: '(orderedVisibleKeys: string[]) => void',
              description: 'Controlled setter for the ordered-visible-keys model. Opts the table into that semantics.',
            },
            {
              prop: 'hiddenColumnKeys',
              type: 'string[]',
              description: 'Legacy mode only — hidden column keys, used together with the full columnOrder.',
            },
            {
              prop: 'onColumnConfigChange',
              type: '(config: { order: string[]; hidden: string[] }) => void',
              description: 'Legacy mode only — fires with the full order + hidden set.',
            },
            { prop: 'groupBy', type: 'DataTableGroupBy<T>', description: 'Partitions rows into collapsible labeled sections. Additive — omit for the flat table.' },
            { prop: 'defaultCollapsedGroupKeys', type: 'string[]', description: 'Group keys collapsed on first render; uncontrolled thereafter.' },
            { prop: 'loading', type: 'boolean', default: 'false', description: 'Shows the loading state in place of rows.' },
            { prop: 'isLoading', type: 'boolean', description: 'Deprecated alias of loading, kept for back-compat.' },
            { prop: 'emptyState', type: 'ReactNode', default: "'No rows'", description: 'Rendered when data is empty.' },
            { prop: 'loadingState', type: 'ReactNode', default: "'Loading…'", description: 'Rendered while loading is true.' },
            { prop: 'page', type: 'number', description: 'Controlled 1-indexed page — pair with onPaginationChange. See Pagination above.' },
            { prop: 'pageSize', type: 'number', description: 'Rows per page. Providing this is what turns the DataTablePagination footer on; omit it for no pager.' },
            { prop: 'rowCount', type: 'number', description: 'Total rows on the server. Supplying it puts the table in server mode — data is treated as exactly one page and never sliced.' },
            { prop: 'onPaginationChange', type: '(state: { page: number; pageSize: number }) => void', description: 'Fires with the requested page — the caller’s cue to refetch.' },
            { prop: 'hasStickyHeader', type: 'boolean', default: 'true', description: 'Sticks the header row to the top of the scroll container.' },
            {
              prop: 'stickyFirstCol',
              type: 'boolean',
              default: 'false',
              description: 'Pins the first rendered cell (checkbox column, or else the first data column) to the inline-start edge during the table\'s own horizontal scroll.',
            },
            {
              prop: 'stickyLeadingCols',
              type: 'boolean',
              default: 'false',
              description:
                'Pins BOTH leading columns (selection checkbox + first data column) to the inline-start edge during the table\'s own horizontal scroll, each in its own lane. Superset of stickyFirstCol. No vertical divider is drawn at the pin boundary — the design has no vertical column dividers anywhere (2026-09-07 cross-check); the pin reads via the cell staying opaque as other columns scroll underneath it.',
            },
            {
              prop: 'stickyTrailingCol',
              type: 'boolean',
              default: 'false',
              description:
                'Pins the trailing column (the trailingAction header cell / per-row rowActions cell) to the inline-end edge during the table\'s own horizontal scroll (UX ruling A6). Logical side — mirrors under dir="rtl". No-op with no trailing column.',
            },
            {
              prop: 'disableResponsiveHide',
              type: 'boolean',
              default: 'false',
              description:
                'Opts OUT of the viewport-driven column auto-hide entirely (UX ruling A6) — every column stays rendered as the container narrows, relying on the table\'s own contentType/minWidth floors plus its horizontal scroll instead of dropping a column silently. Note: the FIRST column is never auto-hidden regardless of this prop — it is the row\'s identity and is protected even with responsive hide left on.',
            },
            {
              prop: 'density',
              type: "'default' | 'compact'",
              default: "'default'",
              description:
                'Horizontal/vertical CELL density — the second, independent axis to rowHeight\'s row rhythm. \'compact\' is a 32px header row + tighter cell padding (vs. the default 40px header row + px-3 cells), built for the ~440px hybrid list pane. Threaded to DataTableHeaderCell so header and body never disagree. A generic knob — states a density, never which surface asked for it.',
            },
            { prop: 'ariaLabel', type: 'string', description: 'Accessible caption/label for the table element.' },
            {
              prop: 'layout',
              type: "'table' | 'stacked'",
              default: "'table'",
              description: '"stacked" is the narrow-panel row shape (list beside a map) — see the Narrow layout section above.',
            },
            {
              prop: 'stackedIdentifierKey',
              type: 'string',
              description: 'layout="stacked": which column renders on the row\'s own first line. Defaults to the first visible column.',
            },
            {
              prop: 'expandedColumnKey',
              type: 'string | null',
              description:
                'The single expanded column\'s key. Fully controlled, mirroring selectedIds/onSelectionChange — pair with onExpandedColumnChange, or expand is a no-op. See Column expansion above.',
            },
            {
              prop: 'onExpandedColumnChange',
              type: '(key: string | null) => void',
              description: 'Fires on double-tap (touch), the header expand-toggle button (web), or a tap/click on a different column while one is expanded.',
            },
            { prop: '…props', type: "Omit<HTMLAttributes<HTMLDivElement>, 'onSelect'>", description: 'className and any other div attribute pass through to the root.' },
          ]}
        />
        <Prose>
          Each entry in <Code>columns</Code> is a <Code>DataTableColumn&lt;T&gt;</Code>:
        </Prose>
        <PropsTable
          rows={[
            { prop: 'key', type: 'string', required: true, description: 'Stable identifier — also the sort key and visibility/order key.' },
            { prop: 'label', type: 'ReactNode', required: true, description: 'Header content.' },
            { prop: 'icon', type: 'ReactNode', description: '16px glyph shown beside the label in the column customizer.' },
            { prop: 'group', type: 'string', description: 'Section label for the column customizer, e.g. "Details". Ungrouped columns land under "Columns".' },
            { prop: 'render', type: '(row: T, rowIndex: number) => ReactNode', description: 'Cell renderer. Omit to show the raw row[key] value.' },
            { prop: 'sortAccessor', type: '(row: T) => unknown', description: 'Sort value when it differs from the displayed value. Defaults to row[key].' },
            { prop: 'width', type: 'string', description: 'Column width, e.g. "12rem" / "20%".' },
            { prop: 'align', type: "'start' | 'center' | 'end'", default: "'start'", description: 'Text alignment, mapped to logical properties.' },
            { prop: 'isSortable', type: 'boolean', default: 'false', description: 'Header is clickable to sort.' },
            { prop: 'isHideable', type: 'boolean', default: 'true', description: 'Column can be hidden via the customization panel.' },
            { prop: 'isHiddenByDefault', type: 'boolean', default: 'false', description: 'Hidden by default (still toggleable). Uncontrolled mode only.' },
            {
              prop: 'contentType',
              type: "'fixed-id' | 'variable-id' | 'descriptive' | 'fixed-content'",
              description:
                'Responsive/overflow truncation rule for this column\'s default cell (no-op text-wise when render is given; the width/whitespace class still applies). See Column content types above.',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Give every sortable column isSortable and a stable key that matches the underlying field.',
            'Use groupBy to partition long lists by a meaningful key (depot, ESP, status) instead of a separate collapsible-section build.',
            'Drive selectedIds/columnOrder as controlled state when the table sits in a larger workflow (bulk actions, saved views).',
            'Render cells through TableCell — kind="entity" for the media+name identity cell, kind="icon-value" for a glyph-prefixed value, kind="metrics" for an icon+count strip. That is how the product list rows above are built, and it is all core-tier: no v5 package needed.',
            'Pass ariaLabel when the table has no visible heading nearby.',
            'Reach for density="compact" for narrow list panes (e.g. a hybrid list-beside-a-map pane, ~440px) — it is a generic knob, not a one-off pane-specific style override.',
            'Trust that the identity column (the first one in columns) survives responsive auto-hide, whatever contentType it carries — don’t hand-roll your own "always keep column 0" workaround.',
            'Let horizontal overflow scroll inside the table’s own scroll region (the persistent overlay scrollbar is built in) — never shrink minWidth/contentType floors to force everything to fit; that crushes columns into unreadable truncation.',
          ]}
          donts={[
            'Don’t use DataTable for a long scannable feed of events — use CriticalEventsList instead.',
            'Don’t hide a required column via isHiddenByDefault; use isHideable={false} to keep it pinned.',
            'Don’t hand-roll a "Columns" popover — DataTable already ships ColumnCustomizer.',
            'Don’t hardcode status colours in render; map through a token-driven tone, as the fleet dataset’s STATUS_TONE/STATUS_BADGE maps do.',
            'Don’t hand-roll a thumbnail+name cell (a flex row, a fixed-size img, a truncating span) — kind="entity" is that anatomy, and its media slot takes any node.',
            'Don’t wire expandedColumnKey without onExpandedColumnChange (or vice versa) — like selectedIds, it’s a controlled pair; half-wiring it makes the double-tap/expand-toggle silently do nothing.',
            'Don’t add a vertical divider/border of your own at a stickyFirstCol/stickyLeadingCols pin seam — the design has no vertical column dividers anywhere; the pin already reads via the cell staying opaque as columns scroll underneath it.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Sortable headers expose aria-sort ("ascending" | "descending" | "none") and are real <button> elements.',
            'The select-all checkbox reflects a true tri-state (checked/indeterminate/unchecked) via aria-checked.',
            'Group headers are buttons with aria-expanded, so screen readers announce the collapsed/expanded state.',
            'Column headers use scope="col" for correct row/column association, plus an explicit aria-label matching the plain header text — so the expand-toggle/resize-handle controls nested inside never get concatenated into the column\'s own announced name.',
            'Layout uses logical properties (text-start/text-end, border-e), so it mirrors correctly under RTL (switch the header language). The resize handle is RTL-aware too: dragging toward the visual "wider" direction always widens the column, in either direction.',
            'The expand-toggle button is icon-only but carries an aria-label ("Expand/Collapse <Column> column") and aria-pressed reflecting its state; it is keyboard-reachable via Tab and, like every other icon-only DS control, shows on focus (not just hover) so keyboard users can find it.',
            'The resize handle follows the APG "Window Splitter" pattern: role="separator", aria-orientation="vertical", aria-valuenow/aria-valuemin, tabIndex=0, and ArrowLeft/ArrowRight resize by a fixed step — dragging is never the only way to resize.',
            'Double-tap-to-expand only ever fires for pointerType "touch"; mouse/pen users always land on the same dedicated, labelled button, so no interaction is discoverable-by-accident-only.',
          ]}
        />
      </DocSection>

      <DocSection id="notes" title="Developer notes">
        <DevNote>
          <Code>columnOrder</Code> has two modes: pass it together with <Code>onColumnOrderChange</Code> for
          the current ordered-visible-keys model (single source of truth for both visibility and order), or
          use the legacy <Code>columnOrder</Code> (full order) + <Code>hiddenColumnKeys</Code> +{' '}
          <Code>onColumnConfigChange</Code> combination for back-compat. <Code>isLoading</Code> is a
          deprecated alias of <Code>loading</Code> — prefer <Code>loading</Code> in new code.
        </DevNote>
      </DocSection>
    </DocPage>
  )
}
