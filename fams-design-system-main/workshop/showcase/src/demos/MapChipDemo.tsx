import { MapChip } from '@fams/ui-kit'
import { Gauge } from '@fams/ui-kit/icons'
import { DocPage, DocSection, Prose, Gallery, PropsTable, Guidelines, A11yList, Code } from '../docs'

/**
 * MapChipDemo — standalone showcase for the MapChip domain component (the
 * on-map badge/pill used by VehicleMarker's plate & timestamp pills).
 * Belongs under the "Map" showcase page (`showcase/MapKit.tsx`) once wired by the orchestrator.
 */
export default function MapChipDemo() {
  return (
    <DocPage
      title="MapChip"
      badge="stable"
      summary="Small on-map badge/pill — powers the VehicleMarker plate & timestamp pills and any other on-map label. light sits on card surfaces, glass is the dark-translucent treatment for over-tile placement."
    >
      <DocSection id="variants" title="Variants">
        <Prose>
          <Code>light</Code> sits on a card/panel surface (the plate pill); <Code>glass</Code> is
          the black-40% scrim (Figma marker chip, white 10px text) built for placement directly
          over the map tile.
        </Prose>
        <Gallery
          minColRem={9}
          items={[
            {
              label: 'light',
              caption: 'card surface',
              node: <MapChip variant="light">AUH 45213</MapChip>,
            },
            {
              label: 'glass',
              caption: 'over-tile',
              node: (
                <div className="rounded-md bg-foreground/80 px-4 py-3">
                  <MapChip variant="glass">12 mins</MapChip>
                </div>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="icon" title="With leading icon">
        <Prose>An optional icon slot precedes the label — same chip geometry either way.</Prose>
        <Gallery
          minColRem={9}
          items={[
            {
              label: 'light + icon',
              node: (
                <MapChip variant="light" icon={<Gauge />}>
                  38 km/h
                </MapChip>
              ),
            },
            {
              label: 'glass + icon',
              node: (
                <div className="rounded-md bg-foreground/80 px-4 py-3">
                  <MapChip variant="glass" icon={<Gauge />}>
                    38 km/h
                  </MapChip>
                </div>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            {
              prop: 'variant',
              type: "'light' | 'glass'",
              default: "'light'",
              description: 'light = card surface pill; glass = black-40% scrim (marker chips) for on-tile placement.',
            },
            {
              prop: 'icon',
              type: 'ReactNode',
              description: 'Optional leading icon in a 12px slot.',
            },
            {
              prop: 'children',
              type: 'ReactNode',
              required: true,
              description: 'The chip label — keep to one short value or timestamp.',
            },
            {
              prop: '…props',
              type: 'HTMLAttributes<HTMLSpanElement>',
              description: 'className and any span attribute pass through.',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Use light on card/panel surfaces (popup headers, list rows).',
            'Use glass only when the chip sits directly over the map tile.',
            'Keep content to a single value — a plate, a duration, a speed.',
            'Pair with an icon when the value alone is ambiguous, e.g. a bare number.',
          ]}
          donts={[
            'Don’t use glass on a card surface — the translucency reads as a bug, not a style.',
            'Don’t stack more than two chips on one marker — plate + timestamp is the max.',
            'Don’t use it as a clickable control — MapChip has no interactive states.',
            'Don’t hardcode a colour; both variants are token-only and re-theme per tenant.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Renders a non-interactive <span> — purely a label, not a control.',
            'glass text is white and light text is foreground; both hold WCAG 2.2 AA contrast against their intended surface.',
            'The optional icon is layout-only — the visible text label carries the meaning for assistive tech.',
            'Uses logical padding/gap, so it mirrors correctly under RTL (switch the header language).',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
