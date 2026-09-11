import {
  AlertOctagonIcon,
  CloudRaining06Icon,
  Globe05Icon,
  LayersThree02Icon,
  MapIconButton,
  MapControlGroup,
  MapZoomControl,
  MapBasemapPreview,
  MapLayersControl,
  MapLayersSwitcher,
  MapSearchControl,
  MarkerPin05Icon,
  MarkerPin06Icon,
  Pin01Icon,
  SearchRefractionIcon,
  TrafficLightsIcon,
  ZonesIcon,
} from '@fams/ui-kit'
import { Layers } from '@fams/ui-kit/icons'
import { DocPage, DocSection, Prose, Gallery, PropsTable, Guidelines, A11yList, Code } from '../docs'

/**
 * MapControlsDemo — standalone showcase for the MapIconButton / MapControlGroup /
 * MapZoomControl domain components (the floating map chrome tiles).
 * Belongs under the "Map" showcase page (`showcase/MapKit.tsx`) once wired by the orchestrator.
 */
export default function MapControlsDemo() {
  return (
    <DocPage
      title="MapControls"
      badge="stable"
      summary="Floating white icon-button tiles overlaid on the map — search, pin, layers, traffic, geofence — grouped into stacked clusters, plus the connected zoom pill and a fullscreen button. Pure chrome, framework-agnostic of the map engine."
    >
      <DocSection id="icon-button" title="MapIconButton">
        <Prose>
          A single 40×40 white rounded tile. <Code>active</Code> tints the icon primary — e.g. an
          enabled layer toggle.
        </Prose>
        <Gallery
          minColRem={8}
          items={[
            {
              label: 'default',
              node: (
                <MapIconButton label="Search on map">
                  <SearchRefractionIcon />
                </MapIconButton>
              ),
            },
            {
              label: 'active',
              node: (
                <MapIconButton label="Layers" active>
                  <Layers />
                </MapIconButton>
              ),
            },
            {
              label: 'preview',
              caption: 'basemap thumbnail',
              node: (
                <MapIconButton label="Map layers" active preview={<MapBasemapPreview />}>
                  <Layers />
                </MapIconButton>
              ),
            },
            {
              label: 'unavailable',
              caption: 'reports, never toggles',
              node: (
                <MapIconButton
                  label="Traffic"
                  unavailableMessage="Traffic data is not connected in this environment."
                  onUnavailable={() => {}}
                >
                  <TrafficLightsIcon />
                </MapIconButton>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="tool-glyphs" title="Tool glyphs">
        <Prose>
          The Figma names an Untitled-UI vocabulary that lucide has no faithful equivalent for, so
          these ship with the map domain. Use them instead of a lucide near-miss — a traffic cone,
          a bank or a pin-with-person are all visible parity diffs.
        </Prose>
        <Gallery
          minColRem={8}
          items={[
            { label: 'search-refraction', node: <SearchRefractionIcon className="size-6" /> },
            { label: 'pin-01', node: <Pin01Icon className="size-6" /> },
            { label: 'traffic-lights', node: <TrafficLightsIcon className="size-6" /> },
            { label: 'marker-pin-05', node: <MarkerPin05Icon className="size-6" /> },
            { label: 'zones', node: <ZonesIcon className="size-6" /> },
            { label: 'layers-three-02', node: <LayersThree02Icon className="size-6" /> },
            { label: 'cloud-raining-06', node: <CloudRaining06Icon className="size-6" /> },
            { label: 'alert-octagon', node: <AlertOctagonIcon className="size-6" /> },
            { label: 'marker-pin-06', node: <MarkerPin06Icon className="size-6" /> },
            { label: 'globe-05', node: <Globe05Icon className="size-6" /> },
          ]}
        />
        <Prose>
          The last five are the 2026-08-30 design refresh (Figma 19:23006 for the control stack,
          19:22896 for the nav rail): the layers trigger, the weather layer, the incidents layer,
          the re-specified POI pin, and the Live Monitoring module&rsquo;s rail glyph. They are
          aliases onto the canonical library&rsquo;s own marks — nothing here is redrawn.
        </Prose>
      </DocSection>

      <DocSection id="layers-control" title="MapLayersControl">
        <Prose>
          The basemap <strong>style switcher</strong>. It owns no style vocabulary —{' '}
          <Code>styles</Code> comes from the caller, and the selected tile paints that style&rsquo;s
          preview instead of a plain white button.
        </Prose>
        <Gallery
          minColRem={10}
          items={[
            {
              label: 'style switcher',
              node: (
                <MapLayersControl
                  styles={[
                    { id: 'muted', label: 'Muted' },
                    { id: 'bright', label: 'Bright' },
                    { id: 'satellite', label: 'Satellite' },
                  ]}
                  activeStyleId="muted"
                  onStyleChange={() => {}}
                />
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="layers-switcher" title="MapLayersSwitcher">
        <Prose>
          The <strong>hover-row</strong> variant of the style switcher (Live Monitoring). Collapsed,
          it is one tile painting the selected style&rsquo;s thumbnail under a white layers glyph —
          same size, radius and elevation as every other map control tile, with no border ring of
          its own; hovering or focusing it expands a row of same-size style cards,
          each named by a <Code>Tooltip</Code>. Click selects, mouse-leave / Escape collapses. It is
          a pure controlled presenter — apps that need every map to agree wire{' '}
          <Code>activeStyleId</Code>/<Code>onStyleChange</Code> to a shared store (v5-templates&rsquo;{' '}
          <Code>useGlobalBasemapId</Code>).
        </Prose>
        <Gallery
          minColRem={10}
          items={[
            {
              label: 'collapsed',
              caption: 'hover or focus to expand',
              node: (
                <MapLayersSwitcher
                  styles={[
                    { id: 'muted', label: 'Muted' },
                    { id: 'bright', label: 'Bright' },
                    { id: 'dark', label: 'Dark' },
                  ]}
                  activeStyleId="muted"
                  onStyleChange={() => {}}
                />
              ),
            },
            {
              label: 'expanded',
              caption: 'defaultOpen',
              node: (
                <MapLayersSwitcher
                  defaultOpen
                  styles={[
                    { id: 'muted', label: 'Muted' },
                    { id: 'bright', label: 'Bright' },
                    { id: 'dark', label: 'Dark' },
                  ]}
                  activeStyleId="bright"
                  onStyleChange={() => {}}
                />
              ),
            },
          ]}
        />
        <PropsTable
          rows={[
            { prop: 'styles', type: 'MapBasemapStyle[]', required: true, description: 'Caller-supplied style list; each card paints its preview (or MapBasemapPreview).' },
            { prop: 'activeStyleId', type: 'string', description: 'Selected style id — paints the collapsed tile\u2019s thumbnail and carries the primary border on its card in the expanded row.' },
            { prop: 'onStyleChange', type: '(id: string) => void', description: 'A card was picked (click, or Enter/Space on the focused card).' },
            { prop: 'defaultOpen', type: 'boolean', default: 'false', description: 'Start expanded — docs and a11y fixtures.' },
            { prop: 'label', type: 'string', default: "'Map layers'", description: 'Accessible name of the collapsed control and the listbox.' },
          ]}
        />
      </DocSection>

      <DocSection id="search-control" title="MapSearchControl">
        <Prose>
          Place search over a <strong>caller-supplied</strong> list. The design system ships no
          gazetteer and performs no geocoding, so no place names live in it — pass{' '}
          <Code>places</Code> and handle <Code>onPlaceSelect</Code> with your own fly-to.
        </Prose>
        <Gallery
          minColRem={20}
          items={[
            {
              label: 'expanded',
              node: (
                <MapSearchControl
                  defaultOpen
                  places={[
                    { id: 'p1', name: 'North Depot', position: [55.1, 25.1], category: 'Depot' },
                    { id: 'p2', name: 'South Yard', position: [55.2, 25.2], category: 'Yard' },
                  ]}
                  onPlaceSelect={() => {}}
                />
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="control-group" title="MapControlGroup">
        <Prose>
          Stacks <Code>MapIconButton</Code> tiles with the standard inter-button gap;{' '}
          <Code>orientation</Code> flips the axis.
        </Prose>
        <Gallery
          minColRem={12}
          items={[
            {
              label: 'vertical',
              caption: 'default',
              node: (
                <MapControlGroup>
                  <MapIconButton label="Search on map">
                    <SearchRefractionIcon />
                  </MapIconButton>
                  <MapIconButton label="Drop pin" active>
                    <Pin01Icon />
                  </MapIconButton>
                  <MapIconButton label="Points of interest">
                    <MarkerPin05Icon />
                  </MapIconButton>
                  <MapIconButton label="Zones">
                    <ZonesIcon />
                  </MapIconButton>
                </MapControlGroup>
              ),
            },
            {
              label: 'horizontal',
              node: (
                <MapControlGroup orientation="horizontal">
                  <MapIconButton label="Layers">
                    <Layers />
                  </MapIconButton>
                  <MapIconButton label="Traffic" active>
                    <TrafficLightsIcon />
                  </MapIconButton>
                </MapControlGroup>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="zoom-control" title="MapZoomControl">
        <Prose>
          Connected +/− pill with a hairline divider; the fullscreen tile renders only when{' '}
          <Code>onFullscreen</Code> is passed.
        </Prose>
        <Gallery
          minColRem={9}
          items={[
            {
              label: 'with fullscreen',
              node: (
                <MapZoomControl onZoomIn={() => {}} onZoomOut={() => {}} onFullscreen={() => {}} />
              ),
            },
            {
              label: 'zoom only',
              node: <MapZoomControl onZoomIn={() => {}} onZoomOut={() => {}} />,
            },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <div className="text-body-sm font-semibold text-foreground">MapIconButton</div>
        <PropsTable
          rows={[
            {
              prop: 'label',
              type: 'string',
              required: true,
              description: 'Accessible label — required since the button is icon-only (used as aria-label).',
            },
            {
              prop: 'active',
              type: 'boolean',
              default: 'false',
              description: 'Figma ACTIVE treatment — primary tile, white glyph. Also sets aria-pressed.',
            },
            {
              prop: 'preview',
              type: 'ReactNode',
              description:
                'Painted behind the glyph — the layers tile’s mini basemap thumbnail. Falls back to MapBasemapPreview in MapLayersControl.',
            },
            {
              prop: 'unavailableMessage',
              type: 'string',
              description:
                'Marks the tool unavailable in THIS deployment: clicking reports the message and never calls onClick, so nothing toggles. Always caller-supplied copy.',
            },
            {
              prop: 'onUnavailable',
              type: '(message: string) => void',
              description: 'Receives unavailableMessage on activation — raise your own toast from it.',
            },
            {
              prop: '…props',
              type: 'ButtonHTMLAttributes<HTMLButtonElement>',
              description: 'onClick, type, and any native button attribute pass through.',
            },
          ]}
        />

        <div className="text-body-sm font-semibold text-foreground">MapControlGroup</div>
        <PropsTable
          rows={[
            {
              prop: 'orientation',
              type: "'vertical' | 'horizontal'",
              default: "'vertical'",
              description: 'Stack direction for the child MapIconButton tiles.',
            },
            {
              prop: '…props',
              type: 'HTMLAttributes<HTMLDivElement>',
              description: 'className, children, and any div attribute pass through.',
            },
          ]}
        />

        <div className="text-body-sm font-semibold text-foreground">MapZoomControl</div>
        <PropsTable
          rows={[
            {
              prop: 'onZoomIn',
              type: '() => void',
              description: 'Zoom-in handler for the top half of the connected pill.',
            },
            {
              prop: 'onZoomOut',
              type: '() => void',
              description: 'Zoom-out handler for the bottom half of the connected pill.',
            },
            {
              prop: 'onFullscreen',
              type: '() => void',
              description: 'Renders a detached fullscreen MapIconButton below the pill when supplied.',
            },
            {
              prop: 'className',
              type: 'string',
              description: 'Extra classes on the outer wrapper.',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Group related toggles into one MapControlGroup rather than scattering loose tiles.',
            'Always pass a descriptive label — it is the only accessible name the button has.',
            'Reserve active for state the user toggled (layers, traffic, geofence), not for hover.',
            'Compose MapZoomControl for zoom rather than rebuilding the +/− pill per map page.',
          ]}
          donts={[
            'Don’t render more than the four documented corner clusters — new controls belong in an existing group.',
            'Don’t omit onFullscreen and expect the tile to still render — it is conditional on the handler.',
            'Don’t hardcode the tile size or shadow; both come from the shared map-shadow token.',
            'Don’t use MapIconButton off the map surface — use Button for in-page actions.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'MapIconButton renders a native <button> with aria-label and aria-pressed — full keyboard support for free.',
            'Visible focus ring via the ring token on every tile in the group.',
            'MapControlGroup and MapZoomControl are plain flex containers — no directional offsets to flip, so they mirror as a no-op under RTL.',
            'Meets WCAG 2.2 AA contrast for both the default and active icon tint.',
            'Every tile paints 40×40 but extends its target to 44×44 with an inert ::before overlay (WCAG 2.5.8 Target Size).',
            'MapSearchControl is a real combobox: aria-expanded / aria-controls / aria-activedescendant, arrow keys to move, Enter to pick, Escape to collapse.',
            'MapLayersControl opens a labelled listbox of styles rather than cycling silently, so the current basemap is always announced.',
            'MapLayersSwitcher expands on focus as well as hover; Left/Right (or Up/Down) move between cards, Enter/Space selects, Escape collapses; the expand transition is disabled under prefers-reduced-motion.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
