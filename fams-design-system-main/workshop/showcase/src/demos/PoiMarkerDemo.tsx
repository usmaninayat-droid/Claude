import { PoiMarker, PoiCategoryChip, POI_CATEGORIES } from '@fams/ui-kit'
import { DocPage, DocSection, Prose, Gallery, PropsTable, Guidelines, A11yList, Code } from '../docs'

/**
 * PoiMarkerDemo — showcase for the DS POI category marker set (Figma
 * 555:69603/555:69751): `PoiMarker` (on-map teardrop pin) and
 * `PoiCategoryChip` (list-row glyph chip), both driven off the shared
 * `POI_CATEGORIES` registry sourced from `assets/icons/poi/*.svg`.
 */
export default function PoiMarkerDemo() {
  return (
    <DocPage
      title="PoiMarker"
      badge="stable"
      summary="Category-glyphed POI map markers — a colored squircle head + white glyph + teardrop dot foot per category, plus a cropped-head PoiCategoryChip for list rows (e.g. Live Monitoring's POI drawer)."
    >
      <DocSection id="categories" title="Category markers">
        <Prose>
          Every category in <Code>POI_CATEGORIES</Code>, rendered as an on-map <Code>PoiMarker</Code>.
        </Prose>
        <Gallery
          minColRem={7}
          items={POI_CATEGORIES.map((c) => ({
            label: c.label,
            caption: c.id,
            node: (
              <div className="flex h-20 items-end justify-center">
                <PoiMarker poi={{ id: c.id, name: c.label, category: c.id }} />
              </div>
            ),
          }))}
        />
      </DocSection>

      <DocSection id="tooltip" title="Hover tooltip">
        <Prose>Hover or focus a marker to reveal the name (and radius, when the POI has one).</Prose>
        <Gallery
          minColRem={9}
          items={[
            {
              label: 'with radius',
              node: (
                <div className="flex h-20 items-end justify-center">
                  <PoiMarker poi={{ id: 'p1', name: 'Doha Port', category: 'port', radiusMeters: 50 }} />
                </div>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="chips" title="PoiCategoryChip — list rows">
        <Prose>
          The same category set as a small circular chip — the marker&apos;s cropped glyph head, for
          list rows where the full pin shape would be noise.
        </Prose>
        <Gallery
          minColRem={6}
          items={POI_CATEGORIES.map((c) => ({
            label: c.label,
            caption: c.id,
            node: <PoiCategoryChip category={c.id} size={32} />,
          }))}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            { prop: 'poi', type: 'PoiMarkerDatum', required: true, description: 'id, name, category, radiusMeters.' },
            { prop: 'size', type: 'number', default: '32', description: 'Marker art width in px; height follows the 48:69 native aspect.' },
            { prop: 'onHoverChange', type: '(hovered: boolean) => void', description: 'Reports hover intent, e.g. to draw a radius circle.' },
            { prop: 'onClick', type: '() => void', description: 'Click handler.' },
          ]}
        />
        <PropsTable
          rows={[
            { prop: 'category', type: 'string', description: 'POI_CATEGORIES id — PoiCategoryChip.' },
            { prop: 'size', type: 'number', default: '28', description: 'Chip diameter in px — PoiCategoryChip.' },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Drive category off the POI record — never hardcode a category per module.',
            'Use PoiCategoryChip (not PoiMarker) inside list rows and drawers.',
            'Keep a valid category on every POI seed — an unrecognized category renders nothing from PoiMarker.',
          ]}
          donts={[
            "Don't recolor the marker art — the category color is baked into the asset, like a logo.",
            "Don't use the generic MapPin glyph once a POI's category is known.",
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'PoiMarker is a real <button> with an accessible name carrying the POI name and category label.',
            'The hover/focus tooltip is keyboard-reachable (focus-visible ring) and uses role="tooltip".',
            'PoiCategoryChip carries role="img" with the category label as its accessible name.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
