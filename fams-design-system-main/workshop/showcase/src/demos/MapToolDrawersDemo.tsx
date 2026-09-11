import { useState } from 'react'
import { Button } from '@fams/ui-kit'
import {
  PoiDrawer,
  ZonesDrawer,
  deriveLivePois,
  deriveLiveZones,
  liveMonitoringConfig,
} from '@fams/v5-templates'
import { DocPage, DocSection, Prose, PropsTable, Guidelines, A11yList, Code } from '../docs'

const zones = deriveLiveZones(liveMonitoringConfig)
const pois = deriveLivePois(liveMonitoringConfig)

/** MapToolDrawersDemo — the Zones + POI right drawers over the map area (WP7). */
export default function ZonesDrawerDemo() {
  const [open, setOpen] = useState<'zones' | 'poi' | null>('zones')
  const [zoneIds, setZoneIds] = useState<string[]>(['Z-1234'])
  const [poiIds, setPoiIds] = useState<string[]>([])

  return (
    <DocPage
      title="ZonesDrawer / PoiDrawer"
      badge="wip"
      summary="The map's Zones and POI tool drawers (DRAFT): non-modal right panels with their own search and an inner-scroll checkbox table (COLOR/NAME/PARENT for zones, NAME/COORDINATES for POIs). Checked zones draw their polygons on the map; checked POIs plot pins with a hover tooltip + translucent radius circle (via LiveMapView's zones/pois props)."
    >
      <DocSection id="preview" title="Preview">
        <Prose>
          One drawer at a time — the checked ids feed <Code>MapView zones/pois</Code> in the live
          hybrid. Checked zones: <Code>{zoneIds.join(', ') || 'none'}</Code> · checked POIs:{' '}
          <Code>{poiIds.join(', ') || 'none'}</Code>.
        </Prose>
        <div className="relative h-[28rem] overflow-hidden rounded-md border border-border bg-muted/30">
          <div className="flex items-center gap-2 p-4">
            <Button size="sm" onClick={() => setOpen('zones')}>
              Open Zones
            </Button>
            <Button size="sm" variant="tertiary" onClick={() => setOpen('poi')}>
              Open POI
            </Button>
          </div>
          <ZonesDrawer
            open={open === 'zones'}
            onClose={() => setOpen(null)}
            zones={zones}
            checkedIds={zoneIds}
            onCheckedIdsChange={setZoneIds}
          />
          <PoiDrawer
            open={open === 'poi'}
            onClose={() => setOpen(null)}
            pois={pois}
            checkedIds={poiIds}
            onCheckedIdsChange={setPoiIds}
          />
        </div>
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            { prop: 'open / onClose', type: 'boolean / () => void', required: true, description: 'Controlled visibility; Escape and ✕ close and restore focus.' },
            { prop: 'zones | pois', type: 'LiveZoneDatum[] | LivePoiDatum[]', required: true, description: 'Rows — deriveLiveZones/deriveLivePois read uiConfig.map.zones/pois.' },
            { prop: 'checkedIds / onCheckedIdsChange', type: 'string[] / (ids) => void', required: true, description: 'Checked = drawn on the map (polygons / pins).' },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Anchor inside the map area’s relatively-positioned container — the drawer is absolute to its end edge.',
            'Keep zone/POI data in the blueprint (uiConfig.map.zones/pois) so tenants differ by metadata only.',
          ]}
          donts={[
            'Don’t open both drawers at once — one anchored surface at a time.',
            'Don’t cluster POI pins with vehicle markers — they ride MapPanel’s separate pins channel.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'role="dialog" with an accessible name per drawer; focus moves in on open, back on close.',
            'Checkbox rows are ≥40px tall with per-row accessible names (“Show Z-1234 on map”).',
            'The table scrolls inside the drawer — the page never scrolls behind it.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
