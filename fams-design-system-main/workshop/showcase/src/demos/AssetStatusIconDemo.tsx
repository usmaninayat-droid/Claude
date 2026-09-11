import {
  AssetStatusIcon,
  MOBILITY_STATUS_LABELS,
  type MobilityStatus,
  type AssetStatusIconSize,
} from '@fams/ui-kit'
import { DocPage, DocSection, Prose, Gallery, Playground, PropsTable, Guidelines, A11yList, Code } from '../docs'

// Same asset-library glob MapStatusMarkerDemo uses for its swappable center
// art — the curated `assets/` folder the Asset Library showcase page also
// pulls from. Guarded the same way for the plain-Node route-smoke import.
const canGlob = typeof import.meta.env !== 'undefined'
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

// "list" variant asset icons (assets/icons.json `asset/*` family) — the same
// icons the Asset Library's "Asset Mobility Status" table's Example column
// resolves per row.
const CAR_ICON = illustrationUrl('/vehicle/car.svg')
const BIN_ICON = illustrationUrl('/vehicle/bin.svg')

const STATUSES: MobilityStatus[] = ['moving', 'idle', 'stopped', 'non-moving', 'non-reporting', 'immobilized']
const SIZES: AssetStatusIconSize[] = ['sm', 'md', 'lg']

type IconControls = {
  status: MobilityStatus
  size: AssetStatusIconSize
  asset: 'car' | 'bin'
}

const ASSET_ICON: Record<IconControls['asset'], string> = { car: CAR_ICON, bin: BIN_ICON }

/**
 * AssetStatusIconDemo — showcase for the live-monitoring LIST-row status
 * icon (the counterpart of `MapStatusMarker` for table/list contexts):
 * designer refinement of the Asset Library "Asset Mobility Status" table's
 * Example column, which originally shipped as 6 static per-status
 * illustrations (commit a4c8b6b) — replaced here by one dynamic component so
 * every row's badge floats at the identical anchor regardless of asset icon.
 */
export default function AssetStatusIconDemo() {
  return (
    <DocPage
      title="AssetStatusIcon"
      badge="stable"
      summary="The live-monitoring list/table status icon: a status badge coin floating at a fixed anchor over a swappable asset icon (vehicle/bin/workforce/generic). Shares its status → color/glyph mapping with MapStatusMarker via mobility-status.ts, so a listing's status badge never drifts from the map's."
    >
      <DocSection id="playground" title="Playground">
        <Playground<IconControls>
          controls={[
            { name: 'status', type: 'select', default: 'moving', options: STATUSES },
            { name: 'size', type: 'select', default: 'md', options: SIZES },
            { name: 'asset', type: 'select', default: 'car', options: ['car', 'bin'] },
          ]}
        >
          {(v) => <AssetStatusIcon status={v.status} size={v.size} icon={ASSET_ICON[v.asset]} />}
        </Playground>
      </DocSection>

      <DocSection id="status-matrix" title="Status matrix">
        <Prose>
          Every status renders the badge at the same fixed anchor (measured from the designer's
          reference composites) — regardless of which asset icon is inside, so a column of these in
          a list/table aligns pixel-for-pixel row to row.
        </Prose>
        <Gallery
          minColRem={6}
          items={STATUSES.map((status) => ({
            label: MOBILITY_STATUS_LABELS[status],
            node: <AssetStatusIcon status={status} icon={CAR_ICON} />,
          }))}
        />
      </DocSection>

      <DocSection id="swappable-icon" title="Swappable asset icon">
        <Prose>
          The badge anchor is fixed as a percentage of the icon box, not the icon's own artwork — so
          it holds identically whether the icon is a car, a bin, or any other asset "list" variant.
        </Prose>
        <Gallery
          minColRem={6}
          items={[
            { label: 'car', node: <AssetStatusIcon status="moving" icon={CAR_ICON} /> },
            { label: 'bin', node: <AssetStatusIcon status="non-moving" icon={BIN_ICON} /> },
          ]}
        />
      </DocSection>

      <DocSection id="sizes" title="Sizes">
        <Prose>
          <Code>sm</Code>/<Code>md</Code>/<Code>lg</Code> scale the icon box uniformly; the badge's
          percentage-based anchor keeps its relative position at every size.
        </Prose>
        <Gallery
          minColRem={6}
          items={SIZES.map((size) => ({
            label: size,
            node: <AssetStatusIcon status="moving" size={size} icon={CAR_ICON} />,
          }))}
        />
      </DocSection>

      <DocSection id="alignment" title="Row alignment">
        <Prose>
          Simulated list rows — different icons, same status coordinate every time. This is the
          exact alignment guarantee the Asset Library's "Asset Mobility Status" table Example column
          relies on.
        </Prose>
        <div className="mt-4 flex flex-col gap-2 rounded-md border border-border p-3">
          {STATUSES.map((status, i) => (
            <div key={status} className="flex items-center gap-3 border-b border-border py-2 last:border-b-0">
              <AssetStatusIcon status={status} icon={i % 2 === 0 ? CAR_ICON : BIN_ICON} />
              <span className="text-body-sm text-foreground">{MOBILITY_STATUS_LABELS[status]}</span>
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
              description: 'Mobility status — drives badge color and glyph via mobility-status.ts (shared with MapStatusMarker).',
            },
            {
              prop: 'icon',
              type: 'ReactNode | string',
              required: true,
              description: 'The asset list icon — a ReactNode (e.g. <img>/<svg>) or an image src string.',
            },
            { prop: 'size', type: "'sm' | 'md' | 'lg'", default: "'md'", description: 'Scales the icon box uniformly; the badge anchor is percentage-based so it holds at every size.' },
            {
              prop: 'statusStyles',
              type: 'Partial<Record<MobilityStatus, Partial<MobilityStatusStyle>>>',
              description: 'Override any status’s badge color or glyph — e.g. a tenant-specific badge set.',
            },
            { prop: 'label', type: 'string', description: 'Accessible name; defaults to the status label.' },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Use AssetStatusIcon for any status + asset-icon pairing in a list/table row (the Asset Library Example column, live-monitoring listings).',
            'Use MapStatusMarker for the same status vocabulary on the map — the two share mobility-status.ts so colors/glyphs never drift.',
            'Let the badge anchor be fixed — never override its position per row; alignment across rows is the entire point.',
          ]}
          donts={[
            "Don't hardcode a status color — always go through `status` (or `statusStyles` for a documented override).",
            "Don't hand-draw a per-status composite illustration for a new use case — compose status + icon here instead.",
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Renders with role="img" and an aria-label defaulting to the status label ("Moving", "Stopped", …).',
            'Status is carried by the badge glyph shape (square/play/pause/pin/x/lock) in addition to color, not color alone.',
            'Passes the automated axe sweep (packages/ui-kit/src/a11y.axe.test.tsx).',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
