import { VehicleIcon3D, type VehicleStatusTone } from '@fams/ui-kit'
import { DocPage, DocSection, Prose, Gallery, Playground, PropsTable, Guidelines, A11yList, Code } from '../docs'

const TONES: VehicleStatusTone[] = ['success', 'warning', 'error', 'muted']
const TONE_CAPTION: Record<VehicleStatusTone, string> = {
  success: 'moving',
  warning: 'idling',
  error: 'stopped',
  muted: 'non-reporting',
}
/** Tinted-tile ground per tone — the infowindow-header treatment. */
const TONE_TILE: Record<VehicleStatusTone, string> = {
  success: 'bg-success/10',
  warning: 'bg-warning/10',
  error: 'bg-destructive/10',
  muted: 'bg-muted',
}

const SIZES = ['sm', 'md', '26', '80'] as const
const BADGES = ['none', 'start', 'end'] as const

type VehicleIcon3DControls = {
  size: (typeof SIZES)[number]
  tone: VehicleStatusTone
  badge: (typeof BADGES)[number]
  label: string
}

export default function VehicleIcon3DDemo() {
  return (
    <DocPage
      title="VehicleIcon3D"
      badge="stable"
      summary="The 3D isometric vehicle illustration from Live Monitoring — an embedded brand asset that replaces photographic vehicle depictions in list rows, map markers, and the infowindow card header. Presets for the list thumb and card art, plus a free numeric width; optional status badge dot at either corner."
    >
      <DocSection id="playground" title="Playground">
        <Playground<VehicleIcon3DControls>
          controls={[
            { name: 'size', type: 'select', default: 'md', options: SIZES },
            { name: 'tone', type: 'select', default: 'success', options: TONES },
            { name: 'badge', type: 'select', default: 'start', options: BADGES },
            { name: 'label', type: 'text', default: 'Vehicle 45213' },
          ]}
        >
          {(v) => (
            <VehicleIcon3D
              size={v.size === 'sm' || v.size === 'md' ? v.size : Number(v.size)}
              tone={v.tone}
              badge={v.badge === 'none' ? false : v.badge}
              label={v.label || undefined}
            />
          )}
        </Playground>
      </DocSection>

      <DocSection id="sizes" title="Sizes">
        <Prose>
          <Code>sm</Code> is the 39×29 list-row thumb (art centered in the box);{' '}
          <Code>md</Code> is the master 57×32.33 card art. A numeric <Code>size</Code> sets the art
          width in px and keeps the master aspect — markers use ~26.
        </Prose>
        <Gallery
          minColRem={10}
          items={[
            { label: 'sm', caption: '39×29 list thumb', node: <VehicleIcon3D size="sm" /> },
            { label: 'md', caption: '57×32.33 card art', node: <VehicleIcon3D size="md" /> },
            { label: '26', caption: 'numeric — marker scale', node: <VehicleIcon3D size={26} /> },
          ]}
        />
      </DocSection>

      <DocSection id="tones" title="Status tones — badge='start' (list anatomy)">
        <Prose>
          The 15px status dot overlaps the box&rsquo;s bottom-start corner in list rows. The glyph
          shape changes with the tone (arrow = moving · pause = idling · square = stopped /
          non-reporting), so status is never color-alone.
        </Prose>
        <Gallery
          minColRem={10}
          items={TONES.map((tone) => ({
            label: tone,
            caption: TONE_CAPTION[tone],
            node: <VehicleIcon3D size="sm" tone={tone} badge="start" />,
          }))}
        />
      </DocSection>

      <DocSection id="badge-end" title="badge='end' (tile anatomy)">
        <Prose>
          On the infowindow-card header tile the 16px dot sits at the bottom-end corner instead.
        </Prose>
        <Gallery
          minColRem={10}
          items={[
            { label: 'end', node: <VehicleIcon3D size="md" tone="success" badge="end" /> },
            { label: 'no badge', node: <VehicleIcon3D size="md" /> },
          ]}
        />
      </DocSection>

      <DocSection id="tinted-tile" title="On a status-tinted tile">
        <Prose>
          The infowindow header seats the <Code>md</Code> art on a tone-tinted tile (the consuming
          card owns the tile — the icon stays transparent).
        </Prose>
        <Gallery
          minColRem={10}
          items={TONES.map((tone) => ({
            label: tone,
            node: (
              <span className={`inline-flex items-center justify-center rounded-lg p-3 ${TONE_TILE[tone]}`}>
                <VehicleIcon3D size="md" tone={tone} badge="end" />
              </span>
            ),
          }))}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            {
              prop: 'size',
              type: "'sm' | 'md' | number",
              default: "'md'",
              description:
                "Preset box — 'sm' = 39×29 list thumb, 'md' = 57×32.33 card art — or a numeric art width in px (height follows the master aspect ratio).",
            },
            {
              prop: 'tone',
              type: "'success' | 'warning' | 'error' | 'muted'",
              default: "'muted'",
              description: 'Status tone for the badge dot (fill + glyph).',
            },
            {
              prop: 'badge',
              type: "'start' | 'end' | false",
              default: 'false',
              description:
                "Status badge dot position: 'start' overlaps bottom-start (list rows), 'end' overlaps bottom-end (card tile). Omitted/false = no badge.",
            },
            {
              prop: 'label',
              type: 'string',
              description:
                'Accessible label (e.g. the vehicle id) — sets role="img". Omitted, the icon is decorative (aria-hidden).',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Use the presets: sm in list rows, md on the infowindow-card header, a numeric ~26 inside map markers.',
            'Pass a label when the icon is the only visual identifying the vehicle (e.g. a bare list thumb).',
            "Let the consuming surface own the tinted tile behind the md art — the icon's ground stays transparent.",
            'Pair the badge tone with the same tone used by the row/card status text.',
          ]}
          donts={[
            'Don’t reintroduce photographic vehicle images where this illustration is the standard (P0-1).',
            'Don’t recolor or restyle the art — it is an embedded brand asset, like a logo.',
            'Don’t add a badge when the surrounding row/card already shows the same status dot — one indicator per anatomy.',
            'Don’t stretch the art to a non-master aspect; pass one numeric width and let the height follow.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'With label: role="img" + aria-label names the vehicle for screen readers.',
            'Without label: aria-hidden — purely decorative, invisible to assistive tech.',
            'The badge glyph shape (arrow / pause / square) carries the status alongside color, never color alone.',
            'Badge offsets use logical -start-/-end- utilities, so the dot swaps corners correctly under RTL (switch the header language).',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
