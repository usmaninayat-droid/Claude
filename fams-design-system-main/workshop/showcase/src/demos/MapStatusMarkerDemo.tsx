import {
  MapStatusMarker,
  MOBILITY_STATUS_LABELS,
  type MapMarkerStatus,
  type MapMarkerVariant,
  type MapMarkerSize,
} from '@fams/ui-kit'
import { DocPage, DocSection, Prose, Gallery, Playground, PropsTable, Guidelines, A11yList, Code } from '../docs'

// Designer reference SVGs (Assets_on_Map Icons*.svg) — copied verbatim for the
// pixel-comparison section below. Not consumed by the component itself.
// Guarded: import.meta.glob exists only under Vite — the Playwright route-smoke
// suite imports this module through src/nav.ts in plain Node, where it must
// degrade to an empty map instead of crashing test collection.
// NOTE: detect Vite via import.meta.env, NOT `typeof import.meta.glob` — Vite
// statically replaces glob CALLS at compile time but never defines a runtime
// `import.meta.glob` function, so the typeof check is false in the browser too
// and silently picked the empty-map branch (every icon rendered src="").
const canGlob = typeof import.meta.env !== 'undefined'
const REFERENCE = (canGlob
  ? import.meta.glob('../assets/reference/live-monitoring-markers/*.svg', {
      query: '?url',
      import: 'default',
      eager: true,
    })
  : {}) as Record<string, string>

function referenceUrl(status: MapMarkerStatus, variant: MapMarkerVariant): string {
  const key = Object.keys(REFERENCE).find((k) => k.endsWith(`/${status}-${variant}.svg`))
  return key ? REFERENCE[key] : ''
}

// Swappable center art — vehicle / bin / workforce illustrations from the
// curated asset library (the same `assets/` folder the Asset Library showcase
// page pulls from).
const ILLUSTRATIONS = (canGlob
  ? import.meta.glob('../../../../assets/illustrations/**/*.svg', {
      query: '?url',
      import: 'default',
      eager: true,
    })
  : {}) as Record<string, string>

function illustrationUrl(suffix: string): string {
  const key = Object.keys(ILLUSTRATIONS).find((k) => k.endsWith(suffix))
  return key ? ILLUSTRATIONS[key] : ''
}

const VEHICLE_ICON = illustrationUrl('/vehicle/car-marker.svg')
const BIN_ICON = illustrationUrl('/bin/general-bin.svg')
const WORKFORCE_ICON = illustrationUrl('/workforce/default-workforce.svg')

const STATUSES: MapMarkerStatus[] = ['moving', 'idle', 'stopped', 'non-moving', 'non-reporting', 'immobilized']
const VARIANTS: MapMarkerVariant[] = ['plain', 'tinted']
const SIZES: MapMarkerSize[] = ['sm', 'md', 'lg']

type MarkerControls = {
  status: MapMarkerStatus
  variant: MapMarkerVariant
  size: MapMarkerSize
  selected: boolean
  centerArt: 'none' | 'vehicle' | 'bin' | 'workforce'
}

const CENTER_ART: Record<MarkerControls['centerArt'], string | undefined> = {
  none: undefined,
  vehicle: VEHICLE_ICON,
  bin: BIN_ICON,
  workforce: WORKFORCE_ICON,
}

/**
 * MapStatusMarkerDemo — showcase for the live-monitoring "asset on map"
 * marker family (designer reference: `Assets_on_Map Icons*.svg`, 14 files = 7
 * statuses × 2 ring treatments). Includes a pixel-comparison section, coded
 * marker vs. the original reference SVG, side by side.
 */
export default function MapStatusMarkerDemo() {
  return (
    <DocPage
      title="MapStatusMarker"
      badge="stable"
      summary="The live-monitoring asset marker: a status-colored ring with a swappable center icon (vehicle/asset/workforce/bin), a status badge coin, and a stem + anchor dot. Extends the VehicleMarker map-marker seam to any asset kind with pixel-exact geometry from the Live Monitoring Figma reference."
    >
      <DocSection id="playground" title="Playground">
        <Playground<MarkerControls>
          controls={[
            { name: 'status', type: 'select', default: 'moving', options: STATUSES },
            { name: 'variant', type: 'select', default: 'plain', options: VARIANTS },
            { name: 'size', type: 'select', default: 'md', options: SIZES },
            { name: 'selected', type: 'boolean', default: false },
            { name: 'centerArt', type: 'select', default: 'vehicle', options: ['none', 'vehicle', 'bin', 'workforce'] },
          ]}
        >
          {(v) => (
            <MapStatusMarker
              status={v.status}
              variant={v.variant}
              size={v.size}
              selected={v.selected}
              icon={CENTER_ART[v.centerArt] ? <img src={CENTER_ART[v.centerArt]} alt="" /> : undefined}
            />
          )}
        </Playground>
      </DocSection>

      <DocSection id="status-matrix" title="Status × variant matrix">
        <Prose>
          Every status ships in both ring treatments — <Code>plain</Code> (white ring, tinted-fill
          off) and <Code>tinted</Code> (status-tint fill, thicker ring). Colors are 100% token
          utility classes; the badge glyph also carries the meaning so status never relies on color
          alone.
        </Prose>
        {VARIANTS.map((variant) => (
          <div key={variant} className="mt-4">
            <p className="mb-2 text-body-sm font-medium text-muted-foreground">{variant}</p>
            <Gallery
              minColRem={7}
              items={STATUSES.map((status) => ({
                label: MOBILITY_STATUS_LABELS[status],
                node: <MapStatusMarker status={status} variant={variant} icon={<img src={VEHICLE_ICON} alt="" />} />,
              }))}
            />
          </div>
        ))}
      </DocSection>

      <DocSection id="center-art" title="Swappable center art">
        <Prose>
          The ring interior is an empty slot in the reference design — the caller swaps in any
          vehicle/asset/workforce/bin icon or illustration (or leaves it empty, matching the raw
          reference art).
        </Prose>
        <Gallery
          minColRem={8}
          items={[
            { label: 'vehicle', node: <MapStatusMarker status="moving" icon={<img src={VEHICLE_ICON} alt="" />} /> },
            { label: 'bin', node: <MapStatusMarker status="non-moving" icon={<img src={BIN_ICON} alt="" />} /> },
            { label: 'workforce', node: <MapStatusMarker status="idle" icon={<img src={WORKFORCE_ICON} alt="" />} /> },
            { label: 'empty (reference default)', node: <MapStatusMarker status="non-reporting" /> },
          ]}
        />
      </DocSection>

      <DocSection id="sizes" title="Sizes">
        <Prose>
          <Code>md</Code> is pixel-exact to the Figma reference; <Code>sm</Code>/<Code>lg</Code>{' '}
          uniformly scale the same geometry from the anchor dot (bottom-center transform origin),
          so the marker keeps pointing at the same map coordinate at every size.
        </Prose>
        <Gallery
          minColRem={8}
          items={SIZES.map((size) => ({
            label: size,
            node: <MapStatusMarker status="moving" size={size} icon={<img src={VEHICLE_ICON} alt="" />} />,
          }))}
        />
      </DocSection>

      <DocSection id="pixel-comparison" title="Pixel comparison — coded vs. reference SVG">
        <Prose>
          Coded <Code>MapStatusMarker</Code> (left) next to the designer's original reference SVG
          (right) for every status × variant combination — ring diameter, stroke width, badge
          size/position, stem length/width, and anchor-dot size were transcribed directly from the
          reference files' coordinates. The status vocabulary and colors were then realigned to the
          product's canonical 6-status mobility taxonomy (<Code>assets/icons/status/*.svg</Code>) —
          the <Code>idle</Code> row below uses that early Figma export's yellow ring for geometry
          only; the coded marker correctly renders it in the canonical warning-500 (#F79009).
        </Prose>
        <div className="mt-4 space-y-6">
          {VARIANTS.map((variant) => (
            <div key={variant}>
              <p className="mb-2 text-body-sm font-medium text-muted-foreground">{variant}</p>
              <div className="flex flex-wrap gap-6">
                {STATUSES.map((status) => (
                  <div key={status} className="flex flex-col items-center gap-2 rounded-md border border-border p-3">
                    <span className="text-caption text-muted-foreground">{MOBILITY_STATUS_LABELS[status]}</span>
                    <div className="flex items-end gap-4">
                      <div className="flex flex-col items-center gap-1">
                        <MapStatusMarker status={status} variant={variant} />
                        <span className="text-caption text-muted-foreground">coded</span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        {/* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- glob lookup can miss */}
                        {referenceUrl(status, variant) ? (
                          <img src={referenceUrl(status, variant)} alt={`${status} ${variant} reference`} />
                        ) : null}
                        <span className="text-caption text-muted-foreground">reference</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            {
              prop: 'status',
              type: "'moving' | 'idle' | 'stopped' | 'non-moving' | 'non-reporting' | 'immobilized'",
              required: true,
              description:
                'Mobility status — drives ring/badge color and badge glyph via the shared mobility-status.ts mapping (also used by the live-monitoring listing/table status chip and map-popup status line).',
            },
            {
              prop: 'variant',
              type: "'plain' | 'tinted'",
              default: "'plain'",
              description: 'plain = white ring, thin stroke. tinted = status-tint fill, thicker stroke, longer stem.',
            },
            { prop: 'size', type: "'sm' | 'md' | 'lg'", default: "'md'", description: 'md is pixel-exact to the Figma reference; sm/lg scale uniformly.' },
            {
              prop: 'icon',
              type: 'ReactNode',
              description: 'Center art — a vehicle/asset/workforce/bin icon or illustration. Omit for an empty ring (the reference default).',
            },
            {
              prop: 'statusStyles',
              type: 'Partial<Record<MapMarkerStatus, Partial<MapMarkerStatusStyle>>>',
              description: 'Override any status’s ring/fill classes or badge glyph — e.g. a tenant-specific badge set.',
            },
            { prop: 'selected', type: 'boolean', default: 'false', description: 'Adds a focus-style halo ring around the marker.' },
            { prop: 'label', type: 'string', description: 'Accessible name; defaults to the status label.' },
            { prop: 'onClick', type: '() => void', description: 'Click handler — the marker renders as a native button.' },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Use MapStatusMarker for any asset kind on the live-monitoring map — vehicle, workforce, bin, or generic asset — via the icon slot.',
            'Keep VehicleMarker for its existing photo-first, hover-pill vehicle call site; use MapStatusMarker for the 7-status ring-only marker.',
            'Pass a status even when the center art already implies one — the badge coin is the map\'s at-a-glance status signal.',
            'Use variant="tinted" when the marker needs to stand out against a busy basemap; plain for dense clusters of markers.',
          ]}
          donts={[
            "Don't hardcode a status color — always go through `status` (or `statusStyles` for a documented override).",
            "Don't rely on size to convey status; sizes exist for visual hierarchy, not state.",
            "Don't nest another interactive element inside the icon slot — the marker itself is the click target.",
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Renders a native <button> with an aria-label defaulting to the status label ("Moving", "Stopped", …).',
            'Status is carried by the badge glyph shape (square/play/pause/pin/x/lock) in addition to color, not color alone.',
            'selected renders a focus-style ring halo using the same token as keyboard focus, for a consistent emphasis affordance.',
            'Passes the automated axe sweep (packages/ui-kit/src/a11y.axe.test.tsx).',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
