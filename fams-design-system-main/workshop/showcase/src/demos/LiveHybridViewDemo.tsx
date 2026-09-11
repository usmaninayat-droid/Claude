import { useState } from 'react'
import { LiveHybridView, liveMonitoringConfig, liveVehicleRecords, liveVehiclePopupData } from '@fams/v5-templates'
import { DocPage, DocSection, Prose, PropsTable, Guidelines, A11yList, Code } from '../docs'

/**
 * LiveHybridViewDemo — the live-monitoring list+map hybrid. The map half is
 * `MapView`, the lazy slot around `@fams/v5-templates/map`'s `LiveMapView`
 * (this demo itself imports only the light barrel — the map bytes load on
 * route entry, which is the whole point of the slot).
 */
export default function LiveHybridViewDemo() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  return (
    <DocPage
      title="LiveHybridView"
      badge="wip"
      summary="Live-monitoring list+MAP hybrid (DRAFT) — compact vehicle list panel beside the live map with two-way selection sync: row click selects the vehicle (marker emphasis, popup, camera pan); marker click tints the row. ModuleView renders this body for the 'hybrid' view kind whenever the blueprint binds coordinates (uiConfig.map.latCol/lngCol); unbound modules keep the classic list+detail HybridView."
    >
      <DocSection id="preview" title="Preview">
        <Prose>
          Click a row to select its vehicle on the map (the camera pans to it and the vehicle card
          opens); click a marker to select back into the list. WP7 panels: search with substring
          highlight + count line, the All-Filters funnel (tags, counts, saved filters) with applied
          chips, the Columns pencil (unsaved-changes toast), the divider’s ‹ › ✕ width grabbers,
          the map’s Zones/POI drawers and eye-off toggle. Compact columns come from the blueprint’s{' '}
          <Code>uiConfig.hybrid.listColumns</Code> (+ <Code>uiConfig.map.expandedColumns</Code> from
          Expanded up); zones/POIs/tags from <Code>uiConfig.map</Code>. Selected:{' '}
          <Code>{selectedId ?? 'none'}</Code>.
        </Prose>
        <div className="h-[32rem]">
          <LiveHybridView
            config={liveMonitoringConfig}
            records={liveVehicleRecords}
            selectedId={selectedId}
            onSelect={setSelectedId}
            getPopupData={() => liveVehiclePopupData}
          />
        </div>
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            { prop: 'config', type: 'EntityConfig', required: true, description: 'Module blueprint — uiConfig.map binds the vehicle facets; uiConfig.hybrid.listColumns picks the compact columns.' },
            { prop: 'records', type: 'EntityRecord[]', required: true, description: 'The records; those without a finite lat/lng are list-only.' },
            { prop: 'selectedId', type: 'string | null', description: 'Controlled selection; omit for uncontrolled.' },
            { prop: 'onSelect', type: '(id: string | null) => void', description: 'Selection intent from either side (row or marker).' },
            { prop: 'onOpenRecord', type: '(record: EntityRecord) => void', description: 'Popup open-in-new — navigate to the record profile.' },
            { prop: 'getPopupData', type: '(record) => LiveVehiclePopupData | undefined', description: 'Feeds the popup’s Critical Events / Trips / Devices tabs.' },
            { prop: 'listState / onListStateChange', type: "'collapsed' | 'expanded' | 'fully-expanded'", description: 'Controlled list width state — the divider grabbers and Customize View’s "List View State" write the same values.' },
            { prop: 'customizeOpen / onCustomizeOpenChange', type: 'boolean', description: 'Controlled Customize View drawer — ModuleView opens it from the active tab’s ⋮ menu.' },
            { prop: 'viewName / onDeleteView', type: 'string / () => void', description: 'Seeds the drawer’s name input; wires its Delete View footer row.' },
            { prop: 'listWidthClassName', type: 'string', default: "'md:w-md'", description: 'Legacy collapsed-width override (~448px per the spec).' },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Turn it on from metadata: bind uiConfig.map.latCol/lngCol in the blueprint and ModuleView picks this body for the hybrid kind.',
            'Keep the compact list to 3–4 columns via uiConfig.hybrid.listColumns — it is a picker, not the primary table.',
            'Pass onOpenRecord so the popup’s open-in-new lands on the record profile.',
          ]}
          donts={[
            'Don’t use it for modules whose hybrid means list+detail — leave uiConfig.map unbound and HybridView renders instead.',
            'Don’t fetch inside — records, popup data, and every mutation come in as props (rule 8).',
            'Don’t add margins around the panels — the shell owns the split.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Both panes are labeled regions (Vehicles / Map) via the HybridView shell.',
            'Row selection is a real row-click affordance with a visible selected tint; the same selection is announced on the map side by the popup.',
            'The map half inherits every LiveMapView guarantee (labeled marker buttons, sr vehicle table, Escape-to-close popup).',
            'Selection sync means keyboard users can drive everything from the list — the map is never the only path.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
