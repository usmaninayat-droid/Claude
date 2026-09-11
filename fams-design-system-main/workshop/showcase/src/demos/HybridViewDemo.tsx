import { HybridView, MapPlaceholder, VehicleMarker, MapZoomControl } from '@fams/ui-kit'
import { Demo } from '../showcase/kit'
import { DocPage, DocSection, Gallery, PropsTable, Guidelines, A11yList } from '../docs'

/**
 * HybridViewDemo — standalone showcase for the HybridView shell. The
 * live-monitoring list+map split that collapses into tabs below md.
 */

const ROWS = [
  { plate: 'AUH 45213', driver: 'Rashid Al Mansoori', status: 'Moving', tone: 'text-success' },
  { plate: 'AUH 30188', driver: 'Kareem Haddad', status: 'Idle', tone: 'text-warning' },
  { plate: 'AUH 77104', driver: 'Omar Farouk', status: 'Stopped', tone: 'text-destructive' },
]

function FleetTable() {
  return (
    <table className="w-full text-body-sm">
      <thead className="sticky top-0 bg-muted/60 text-start text-muted-foreground">
        <tr>
          <th className="px-4 py-2.5 text-start font-semibold">Plate</th>
          <th className="px-4 py-2.5 text-start font-semibold">Driver</th>
          <th className="px-4 py-2.5 text-start font-semibold">Status</th>
        </tr>
      </thead>
      <tbody>
        {ROWS.map((r) => (
          <tr key={r.plate} className="border-t border-border">
            <td className="px-4 py-2.5 font-medium text-foreground">{r.plate}</td>
            <td className="px-4 py-2.5 text-foreground">{r.driver}</td>
            <td className={`px-4 py-2.5 font-medium ${r.tone}`}>{r.status}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** HybridView is h-full — give it a fixed viewport to split into. */
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-[420px] w-full overflow-hidden rounded-md border border-border shadow-sm">
      {children}
    </div>
  )
}

export default function HybridViewDemo() {
  return (
    <DocPage
      title="HybridView"
      badge="stable"
      summary="The live-monitoring list+map split. md+ renders the two panels side by side (list on the start edge); below md it collapses into a Radix Tabs strip (List / Map) since there isn't room for both. Both panels stay mounted via forceMount so map/list state survives tab switches — CSS toggles visibility."
    >
      <DocSection id="preview" title="Preview">
        <Demo
          title="Full split — list + map"
          hint="MapPlaceholder is the token-only empty map surface shipped for the prototype phase; VehicleMarker/MapZoomControl overlay it exactly as they would a real MapLibre map"
          code={`<HybridView
  list={<FleetTable />}
  map={
    <div className="relative h-full w-full">
      <MapPlaceholder />
      <VehicleMarker label="45213" meta="12 mins" tone="success" selected />
      <MapZoomControl onZoomIn={() => {}} onZoomOut={() => {}} />
    </div>
  }
/>`}
          bare
        >
          <Frame>
            <HybridView
              list={
                <div className="h-full overflow-auto bg-card">
                  <FleetTable />
                </div>
              }
              map={
                <div className="relative h-full w-full">
                  <MapPlaceholder />
                  <div className="absolute left-1/3 top-1/3">
                    <VehicleMarker label="45213" meta="12 mins" tone="success" selected />
                  </div>
                  <div className="absolute left-2/3 top-1/2">
                    <VehicleMarker label="77104" meta="stopped" tone="error" />
                  </div>
                  <div className="absolute bottom-4 right-4">
                    <MapZoomControl onZoomIn={() => {}} onZoomOut={() => {}} />
                  </div>
                </div>
              }
            />
          </Frame>
        </Demo>
      </DocSection>

      <DocSection id="options" title="Options">
        <Gallery
          minColRem={24}
          items={[
            {
              label: 'Default width',
              caption: 'md:w-[360px]',
              node: (
                <Frame>
                  <HybridView
                    list={
                      <div className="h-full overflow-auto bg-card">
                        <FleetTable />
                      </div>
                    }
                    map={<MapPlaceholder />}
                  />
                </Frame>
              ),
            },
            {
              label: 'Narrow list',
              caption: 'listWidthClassName="md:w-[240px]"',
              node: (
                <Frame>
                  <HybridView
                    list={
                      <div className="h-full overflow-auto bg-card">
                        <FleetTable />
                      </div>
                    }
                    map={<MapPlaceholder />}
                    listWidthClassName="md:w-[240px]"
                  />
                </Frame>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            {
              prop: 'list',
              type: 'ReactNode',
              required: true,
              description: 'Left region — the list/table panel.',
            },
            {
              prop: 'map',
              type: 'ReactNode',
              required: true,
              description: 'Right region — the map panel.',
            },
            {
              prop: 'listWidthClassName',
              type: 'string',
              default: "'md:w-[360px]'",
              description: 'Width of the list panel on md+ (Tailwind width class).',
            },
            {
              prop: 'listLabel',
              type: 'string',
              default: "'List'",
              description: 'Mobile tab label for the list panel.',
            },
            {
              prop: 'mapLabel',
              type: 'string',
              default: "'Map'",
              description: 'Mobile tab label for the map panel.',
            },
            {
              prop: '…props',
              type: 'HTMLAttributes<HTMLDivElement>',
              description: 'className and any native div attribute pass through to the outer frame.',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Use HybridView for any live-monitoring page that pairs a fleet/entity list with a map.',
            'Give HybridView a full-height ancestor (h-full) — it fills the container it is placed in.',
            'Override listWidthClassName only when the row content genuinely needs more or less room.',
            'Pass listLabel/mapLabel when "List"/"Map" isn’t the right term for the domain (e.g. "Routes"/"Map").',
          ]}
          donts={[
            'Don’t unmount list or map yourself based on the active tab — HybridView already forceMounts both so state survives.',
            'Don’t build a second mobile tab strip alongside HybridView — the Radix Tabs collapse below md is built in.',
            'Don’t hardcode a fixed map height inside the map slot; let it fill h-full from the parent panel.',
            'Don’t nest HybridView inside another scrollable container without giving it an explicit height first.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Mobile tab strip is built on Radix Tabs — arrow-key navigation between List/Map and correct aria-selected state come for free.',
            'The tab strip carries aria-label="Hybrid view panels" for assistive tech.',
            'Both panels use forceMount + CSS visibility rather than conditional rendering, so focus and scroll state aren’t lost switching tabs.',
            'The list/map split is a flex-row of siblings, so the list flips to the trailing edge automatically under RTL (switch the header language) with no direction-specific classes.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
