import { useState } from 'react'
import {
  LinkedRecordDetailSection,
  ModuleRecordsProvider,
  type EntityConfig,
  type EntityRecord,
} from '@fams/v5-templates'
import { LinkedRecordProvider, type LinkedRecordTarget } from '@fams/v5-composer'
import { DocPage, DocSection, Prose, Gallery, PropsTable, Guidelines, A11yList, Code } from '../docs'

/**
 * LinkedRecordDetailSectionDemo — a TaskDetail SECTION whose body is ANOTHER
 * module's record, rendered through that record's own profile Details
 * layout, with a "view full profile" affordance that STACKS a new sheet on
 * top. The platform's designated cross-module linked-record stacking probe
 * (job-orders SPEC §2.23's "Asset Details"). Reads through
 * useModuleRecords()/useLinkedRecordOpener() exactly like its sibling
 * ScopedLinkedRecords — the demo mirrors that one's provider wiring.
 */

const jobOrder: EntityRecord = { id: 'jo-1', uniqueidentifier: 'JO-1003', title: 'Tire rotation', vehicle: 'vh-1' }
const otherJobOrder: EntityRecord = { id: 'jo-2', uniqueidentifier: 'JO-1004', title: 'Brake service' }

const vehicleConfig: EntityConfig = {
  code: 'asset/vehicle',
  name: 'Vehicle',
  uidPrefix: 'VH',
  systemcolumns: [
    { col: 'systemcol1', name: 'Make / Model', type: 'SmallText' },
    { col: 'systemcol2', name: 'Plate', type: 'SmallText' },
  ],
  uiConfig: {
    statusList: [],
    profile: {
      title: { col: 'title' },
      details: [],
      sections: [
        {
          id: 'sec_vehicle_details',
          name: 'Vehicle Details',
          order: 1,
          fields: [
            { col: 'systemcol1', order: 1, name: 'Make / Model' },
            { col: 'systemcol2', order: 2, name: 'Plate' },
          ],
        },
      ],
    },
  },
  listcolumns: [],
}

const vehicles: EntityRecord[] = [
  { id: 'vh-1', uniqueidentifier: 'VH-4021', title: 'Truck AUH-4021', systemcol1: 'Isuzu NPR', systemcol2: 'DXB-C-1014' },
]

function resolveModuleRecords(code: string) {
  return code === 'asset/vehicle' ? { config: vehicleConfig, records: vehicles } : undefined
}

export default function LinkedRecordDetailSectionDemo() {
  const [lastOpened, setLastOpened] = useState<LinkedRecordTarget | null>(null)

  return (
    <DocPage
      title="LinkedRecordDetailSection"
      badge="wip"
      summary="A TaskDetail section that embeds ANOTHER module's record inline, rendered through that record's own profile Details layout — never a parallel field-list shape — with a 'view full profile' affordance that STACKS a new sheet via useLinkedRecordOpener()."
    >
      <DocSection id="preview" title="Preview">
        <Prose>
          Profiled record: <Code>{jobOrder.uniqueidentifier}</Code>, referencing vehicle{' '}
          <Code>{vehicles[0].uniqueidentifier}</Code> via its <Code>vehicle</Code> column. The section renders the
          vehicle's OWN "Vehicle Details" profile section — not job-order vocabulary. Click "View full profile" to
          see it resolve through <Code>useLinkedRecordOpener()</Code>.
        </Prose>
        <ModuleRecordsProvider resolveModuleRecords={resolveModuleRecords}>
          <LinkedRecordProvider onOpenLinkedRecord={setLastOpened}>
            <div className="w-full max-w-md overflow-hidden rounded-md border border-border p-4">
              <LinkedRecordDetailSection
                config={vehicleConfig}
                record={jobOrder}
                props={{ refCol: 'vehicle', entityType: 'asset/vehicle' }}
              />
            </div>
          </LinkedRecordProvider>
        </ModuleRecordsProvider>
        <p className="text-body-sm text-muted-foreground" role="status" aria-live="polite">
          {lastOpened
            ? `Opened linked record: ${lastOpened.entityType} / ${lastOpened.recordId} (this is where the app would stack a new sheet).`
            : 'Click "View full profile" above to open it.'}
        </p>
      </DocSection>

      <DocSection id="gallery" title="Gallery">
        <Gallery
          layout="rows"
          items={[
            {
              label: 'Linked record found',
              caption: 'Renders the target record’s own Details section',
              node: (
                <ModuleRecordsProvider resolveModuleRecords={resolveModuleRecords}>
                  <div className="w-full max-w-md overflow-hidden rounded-md border border-border p-3">
                    <LinkedRecordDetailSection
                      config={vehicleConfig}
                      record={jobOrder}
                      props={{ refCol: 'vehicle', entityType: 'asset/vehicle' }}
                    />
                  </div>
                </ModuleRecordsProvider>
              ),
            },
            {
              label: 'Empty state',
              caption: 'Reference unset, or no provider mounted — degrades, never crashes',
              node: (
                <div className="w-full max-w-md overflow-hidden rounded-md border border-border p-3">
                  <LinkedRecordDetailSection
                    config={vehicleConfig}
                    record={otherJobOrder}
                    props={{ refCol: 'vehicle', entityType: 'asset/vehicle', emptyLabel: 'No vehicle linked yet' }}
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
            { prop: 'config', type: 'EntityConfig', description: 'The PROFILED record’s own config (used only to satisfy SectionComponentProps—the rendered content comes from the TARGET module’s config).' },
            { prop: 'record', type: 'EntityRecord', description: 'The profiled record — refCol is read off it to find the linked id.' },
            { prop: 'props.refCol', type: 'string (required)', description: 'Column on the profiled record holding the linked record’s id.' },
            { prop: 'props.entityType', type: 'string (required)', description: 'The target module’s blueprint code, resolved via useModuleRecords().' },
            { prop: 'props.emptyLabel', type: 'string', description: 'Empty-state title when the reference is unset or unresolved. Default ‘Nothing linked yet’.' },
            { prop: 'props.viewLabel', type: 'string', description: 'The stack-affordance link text. Default ‘View full profile’.' },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Register it via registerSectionComponent("LinkedRecordDetailSection", …) — already done in TaskDetail.tsx.',
            'Mount ModuleRecordsProvider once around the whole module surface — the same provider ScopedLinkedRecords reads.',
            'Let it degrade to the empty state with no provider/resolver, an unset reference, or a dangling id — never guess at another module’s record.',
          ]}
          donts={[
            'Don’t invent a parallel field-list shape here — presentation always delegates to the target module’s own deriveDetail + ProfileSectionsPanel.',
            'Don’t bake a business relationship in here — refCol/entityType are always blueprint-authored, opaque field-key indirection.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            '"View full profile" is a real Button (variant="link") — keyboard-focusable and activatable, no bespoke click handling.',
            'The empty state uses StatusView (icon + title), never a blank panel.',
            'RTL-safe: logical properties throughout, delegated entirely to ProfileSectionsPanel.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
