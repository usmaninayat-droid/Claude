import { VehicleMarker, type VehicleStatusTone } from '@fams/ui-kit'
import { DocPage, DocSection, Prose, Gallery, Playground, PropsTable, Guidelines, A11yList, Code } from '../docs'

const TONES: VehicleStatusTone[] = ['success', 'warning', 'error', 'muted']
const TONE_LABEL: Record<VehicleStatusTone, string> = {
  success: 'Y 31022',
  warning: 'X 1234',
  error: 'V 71939',
  muted: 'Z 61209',
}
const TONE_META: Record<VehicleStatusTone, string> = {
  success: '100 km/h',
  warning: '11 mins',
  error: '37 mins',
  muted: 'offline',
}
const TONE_STATUS: Record<VehicleStatusTone, string> = {
  success: 'Moving',
  warning: 'Idling',
  error: 'Stopped',
  muted: 'Non-Reporting',
}
const HEADINGS = ['0', '45', '90', '135', '180', '225', '270', '315'] as const

type VehicleMarkerControls = {
  tone: VehicleStatusTone
  label: string
  meta: string
  showPill: boolean
  selected: boolean
  moving: boolean
  heading: (typeof HEADINGS)[number]
}

/**
 * VehicleMarkerDemo — standalone showcase for the VehicleMarker domain component.
 * Belongs under the "Map" showcase page (`showcase/MapKit.tsx`) once wired by the orchestrator.
 */
export default function VehicleMarkerDemo() {
  return (
    <DocPage
      title="VehicleMarker"
      badge="stable"
      summary="Live Monitoring map marker (Figma SPEC §2.3): white circle + 2px status ring holding the 3D vehicle art, status badge coin on top (arrow / pause / square), a status-colored leader line down to the coordinate dot, and black-40% plate + speed/dwell chips tucked under the circle. Figma shows the chips on every marker, so showPill defaults to true; showPill={false} is the dense (hover-reveal) treatment."
    >
      <DocSection id="playground" title="Playground">
        <Playground<VehicleMarkerControls>
          controls={[
            { name: 'tone', type: 'select', default: 'success', options: TONES },
            { name: 'label', type: 'text', default: 'Y 31022' },
            { name: 'meta', type: 'text', default: '100 km/h' },
            { name: 'showPill', type: 'boolean', default: true },
            { name: 'selected', type: 'boolean', default: false },
            { name: 'moving', type: 'boolean', default: true },
            { name: 'heading', type: 'select', default: '45', options: HEADINGS },
          ]}
        >
          {(v) => (
            <VehicleMarker
              label={v.label}
              meta={v.meta}
              statusLabel={TONE_STATUS[v.tone]}
              tone={v.tone}
              moving={v.moving}
              heading={Number(v.heading)}
              selected={v.selected}
              showPill={v.showPill}
            />
          )}
        </Playground>
      </DocSection>

      <DocSection id="status" title="Status tones">
        <Prose>
          The 2px ring, badge coin, and leader line all read the same status tone. Idling reads
          warning-600 (darker than the cluster ring&apos;s warning-500 orange — both are
          pixel-verified Figma values, don&apos;t unify them).
        </Prose>
        <Gallery
          minColRem={10}
          items={TONES.map((tone) => ({
            label: tone,
            node: (
              <VehicleMarker
                label={TONE_LABEL[tone]}
                meta={TONE_META[tone]}
                statusLabel={TONE_STATUS[tone]}
                tone={tone}
                moving={tone === 'success'}
                heading={45}
                showPill
              />
            ),
          }))}
        />
      </DocSection>

      <DocSection id="density" title="Default vs dense vs selected">
        <Prose>
          The default carries both chips (the Figma anatomy).{' '}
          <Code>{'showPill={false}'}</Code> is the dense treatment — circle + badge only, chips
          revealed on hover. <Code>selected</Code> keeps the chips either way and flips ring,
          badge, and leader line to red, regardless of the vehicle&apos;s status tone.
        </Prose>
        <Gallery
          minColRem={10}
          items={[
            {
              label: 'default',
              caption: 'both chips',
              node: (
                <VehicleMarker
                  label="Y 31022"
                  meta="100 km/h"
                  statusLabel="Moving"
                  tone="success"
                  moving
                />
              ),
            },
            {
              label: 'dense',
              caption: 'showPill={false}',
              node: (
                <VehicleMarker
                  label="Y 31022"
                  meta="100 km/h"
                  statusLabel="Moving"
                  tone="success"
                  showPill={false}
                />
              ),
            },
            {
              label: 'selected',
              caption: 'red emphasis',
              node: (
                <VehicleMarker
                  label="V 71939"
                  meta="37 mins"
                  statusLabel="Stopped"
                  tone="error"
                  selected
                />
              ),
            },
            {
              label: 'selected (moving)',
              caption: 'red wins over tone',
              node: (
                <VehicleMarker
                  label="Y 31022"
                  meta="100 km/h"
                  statusLabel="Moving"
                  tone="success"
                  moving
                  heading={45}
                  selected
                />
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="heading" title="Moving — badge arrow heading">
        <Prose>
          The moving badge glyph is the navigation arrow; with <Code>moving</Code> set it rotates
          to <Code>heading</Code> (0 = north, clockwise).
        </Prose>
        <Gallery
          minColRem={10}
          items={[0, 45, 135, 225].map((heading) => ({
            label: `${heading}°`,
            node: (
              <VehicleMarker
                label="Y 31022"
                meta="38 km/h"
                statusLabel="Moving"
                tone="success"
                moving
                heading={heading}
                showPill
              />
            ),
          }))}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            {
              prop: 'label',
              type: 'string',
              required: true,
              description: 'Plate / short id shown on the start-side chip.',
            },
            {
              prop: 'meta',
              type: 'string',
              description: 'Trailing chip text, e.g. "37 mins" / "100 km/h" / "0 km/h".',
            },
            {
              prop: 'statusLabel',
              type: 'string',
              description: 'Status word for the accessible name — the marker announces "label · status · meta".',
            },
            {
              prop: 'icon',
              type: 'ReactNode',
              description: 'Overrides the 3D vehicle art inside the circle (rarely needed).',
            },
            {
              prop: 'photoUrl',
              type: 'string',
              description: 'DEPRECATED — accepted for API compatibility but never rendered; the 3D vehicle art (VehicleIcon3D) is the rendered truth.',
            },
            {
              prop: 'tone',
              type: "'success' | 'warning' | 'error' | 'muted'",
              default: "'muted'",
              description: 'Status tone → ring, badge, and leader-line color (idling = warning-600).',
            },
            {
              prop: 'moving',
              type: 'boolean',
              default: 'false',
              description: 'Whether the vehicle is moving — rotates the badge arrow to heading.',
            },
            {
              prop: 'heading',
              type: 'number',
              default: '0',
              description: 'Heading in degrees (0 = north, clockwise). Only used when moving.',
            },
            {
              prop: 'selected',
              type: 'boolean',
              default: 'false',
              description: 'Selected treatment — red ring/badge/leader; keeps both chips visible even in the dense treatment.',
            },
            {
              prop: 'showPill',
              type: 'boolean',
              default: 'true',
              description: 'Chip visibility. Default true = the Figma anatomy (plate + speed/dwell chips on every marker). Pass false for the dense treatment — circle + badge only, chips revealed on hover or while selected.',
            },
            {
              prop: 'onClick',
              type: '() => void',
              description: 'Click handler — the marker renders as a native button.',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Leave showPill alone — both chips are the Figma default; reach for showPill={false} only at far-out zooms where the pills would collide.',
            'Set selected for the one marker the user has focused (from a list, search, or click) — it is the red emphasis, one at a time.',
            'Pass statusLabel so the accessible name carries plate + status + speed/dwell — the chips fail AA on light basemaps and must stay redundant.',
            'Only pass moving + heading for vehicles actively reporting GPS movement.',
          ]}
          donts={[
            'Don’t gate showPill on zoom in a way that hides the chips at the view’s own default zoom — that reads as “the chips are missing”.',
            'Don’t pass photoUrl expecting a photo — it is deprecated and never rendered (P0-1: zero vehicle photos).',
            'Don’t restyle the idle ring to warning-500 to “match” the cluster donut — the two oranges are different by design.',
            'Don’t rely on tone alone for meaning; the badge glyph and statusLabel carry it without color.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Renders a native <button> with a combined aria-label ("label · status · meta") — keyboard and screen-reader reachable.',
            'The hit area spans the full visual footprint (≥44px wide, circle + badge + leader tall), not just the 40px circle.',
            'Status is carried by the badge glyph shape (arrow/pause/square) and statusLabel, never color alone.',
            'Plate/meta chips use logical start/end offsets, so they swap sides correctly under RTL (switch the header language).',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
