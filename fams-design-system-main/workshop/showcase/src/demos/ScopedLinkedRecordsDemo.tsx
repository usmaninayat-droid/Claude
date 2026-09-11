import { useState } from 'react'
import {
  ScopedLinkedRecords,
  ModuleRecordsProvider,
  type EntityConfig,
  type EntityRecord,
  type RecordTableColumn,
} from '@fams/v5-templates'
import { LinkedRecordProvider, type LinkedRecordTarget } from '@fams/v5-composer'
import { DocPage, DocSection, Prose, Gallery, PropsTable, Guidelines, A11yList, Code } from '../docs'

/**
 * ScopedLinkedRecordsDemo — a detail-sheet tab over ANOTHER module's records,
 * scoped to the ones referencing the profiled record (a vehicle's "Job
 * Orders" tab, here). All rendering is derived from the `entityType`/
 * `matchField`/`columns` config; the demo supplies the cross-module data
 * through `ModuleRecordsProvider` exactly as the app would.
 */

const vehicle: EntityRecord = { id: 'vh-1', uniqueidentifier: 'VH-4021', title: 'Truck AUH-4021' }
const otherVehicle: EntityRecord = { id: 'vh-2', uniqueidentifier: 'VH-4102', title: 'Van DXB-2299' }

const jobOrderConfig: EntityConfig = {
  code: 'maintenance/job-order',
  name: 'Job Order',
  uidPrefix: 'JO',
  systemcolumns: [],
  uiConfig: { statusList: [] },
  listcolumns: [],
}

const jobOrders: EntityRecord[] = [
  { id: 'jo-1', uniqueidentifier: 'JO-1001', title: 'Brake service', status: 'Scheduled', vehicle: 'vh-1' },
  { id: 'jo-2', uniqueidentifier: 'JO-1002', title: 'Oil change', status: 'Completed', vehicle: 'vh-1' },
  { id: 'jo-3', uniqueidentifier: 'JO-1003', title: 'Tire rotation', status: 'Ongoing', vehicle: 'vh-2' },
]

const columns: RecordTableColumn[] = [
  { key: 'uniqueidentifier', label: 'Job Order', type: 'idChip' },
  { key: 'title', label: 'Title', type: 'text' },
  { key: 'status', label: 'Status', type: 'statusPill' },
]

const statusColors = { Scheduled: '#F17B2B', Completed: '#2AAA48', Ongoing: '#2E90FA' }

function resolveModuleRecords(code: string) {
  return code === 'maintenance/job-order' ? { config: jobOrderConfig, records: jobOrders } : undefined
}

export default function ScopedLinkedRecordsDemo() {
  const [lastOpened, setLastOpened] = useState<LinkedRecordTarget | null>(null)

  return (
    <DocPage
      title="ScopedLinkedRecords"
      badge="wip"
      summary="A detail-sheet tab over another module's records, scoped to the ones that reference the profiled record (e.g. a vehicle's Job Orders / Preventive Maintenance tabs). Reads through useModuleRecords(), opens through useLinkedRecordOpener() so a row STACKS a new sheet. Presentation delegates entirely to RecordTable."
    >
      <DocSection id="preview" title="Preview">
        <Prose>
          Profiled record: <Code>{vehicle.uniqueidentifier}</Code>. Only job orders whose <Code>vehicle</Code>{' '}
          column equals this record's <Code>id</Code> are shown — <Code>{otherVehicle.uniqueidentifier}</Code>'s job
          order is excluded. Click a row to see it resolve through <Code>useLinkedRecordOpener()</Code>.
        </Prose>
        <ModuleRecordsProvider resolveModuleRecords={resolveModuleRecords}>
          <LinkedRecordProvider onOpenLinkedRecord={setLastOpened}>
            <div className="h-80 overflow-hidden rounded-md border border-border p-4">
              <ScopedLinkedRecords
                record={vehicle}
                entityType="maintenance/job-order"
                matchField="vehicle"
                columns={columns}
                statusColors={statusColors}
                search
              />
            </div>
          </LinkedRecordProvider>
        </ModuleRecordsProvider>
        <p className="text-body-sm text-muted-foreground" role="status" aria-live="polite">
          {lastOpened
            ? `Opened linked record: ${lastOpened.entityType} / ${lastOpened.recordId} (this is where the app would stack a new sheet).`
            : 'Click a row above to open it.'}
        </p>
      </DocSection>

      <DocSection id="gallery" title="Gallery">
        <Gallery
          layout="rows"
          items={[
            {
              label: 'Scoped rows',
              caption: 'Two job orders reference this vehicle',
              node: (
                <ModuleRecordsProvider resolveModuleRecords={resolveModuleRecords}>
                  <div className="h-56 w-full overflow-hidden rounded-md border border-border p-3">
                    <ScopedLinkedRecords
                      record={vehicle}
                      entityType="maintenance/job-order"
                      matchField="vehicle"
                      columns={columns}
                      statusColors={statusColors}
                    />
                  </div>
                </ModuleRecordsProvider>
              ),
            },
            {
              label: 'Empty state',
              caption: 'No provider mounted — degrades, never crashes',
              node: (
                <div className="h-56 w-full overflow-hidden rounded-md border border-border p-3">
                  <ScopedLinkedRecords
                    record={vehicle}
                    entityType="maintenance/job-order"
                    matchField="vehicle"
                    columns={columns}
                    emptyLabel="No job orders yet"
                  />
                </div>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            { prop: 'record', type: 'EntityRecord', description: 'The profiled record — rows are scoped against its `matchAgainst` value.' },
            { prop: 'entityType', type: 'string', description: 'The target module code, resolved via useModuleRecords().' },
            { prop: 'matchField', type: 'string', description: 'Column on a target record holding the back-reference (scalar or array, stringified).' },
            { prop: 'matchAgainst', type: "string (default 'id')", description: 'Column on the profiled record to match against.' },
            { prop: 'columns', type: 'RecordTableColumn[]', description: 'Same column config RecordTable takes.' },
            { prop: 'search / searchPlaceholder', type: 'boolean / string', description: 'Client-side filter over the already-scoped rows.' },
            { prop: 'emptyLabel', type: 'string', description: 'Empty-state title when nothing scopes to this record.' },
            { prop: 'statusColors / limit', type: 'Record<string,string> / number', description: 'Same escape hatches RecordTable documents.' },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Register it via registerTabComponent("ScopedLinkedRecords", …) — already done for every EntityProfile.',
            'Mount ModuleRecordsProvider once around the whole module surface (V5ModuleSurface does this from resolveModuleRecords).',
            'Let it degrade to the empty state with no provider/resolver — never guess at another module’s records.',
          ]}
          donts={[
            'Don’t hand-roll table markup — presentation always delegates to RecordTable.',
            'Don’t bake a business relationship in here — entityType/matchField/matchAgainst are always blueprint-authored.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Row activation reuses DataTable’s onRowClick contract: cursor, hover, and keyboard Enter/Space all come from there — no bespoke click handling.',
            'The empty state uses StatusView (icon + title + description) — never a blank panel.',
            'RTL-safe: logical properties throughout (delegated entirely to RecordTable/DataTable).',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
