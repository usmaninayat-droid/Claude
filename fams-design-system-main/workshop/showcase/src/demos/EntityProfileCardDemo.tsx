import { Wrench, ShieldCheck } from '@fams/ui-kit/icons'
import { Badge, Button } from '@fams/ui-kit'
import { EntityProfileCard } from '../../../../packages/ui-kit/src/composites/EntityProfileCard'
import { DocPage, DocSection, Prose, Gallery, PropsTable, Guidelines, A11yList, Code } from '../docs'

// 1x1 teal PNG data URI — loads instantly, no network dependency, so the
// hero "image" state renders reliably in the showcase without an external asset.
const SAMPLE_HERO =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='

/**
 * EntityProfileCardDemo — generic identity card for any entity's profile
 * left rail: hero image or an Avatar fallback, an optional top-inset badge
 * overlay, name/identifier/subtitle, resolved tags, a key/value field list,
 * and an actions row.
 */
export default function EntityProfileCardDemo() {
  return (
    <DocPage
      title="EntityProfileCard"
      badge="stable"
      summary="Generic identity card for any entity's profile left rail — hero image or an Avatar fallback, an optional top-inset badge overlay, name/identifier/subtitle, resolved tags via TagChipList, a key/value field list, and an actions row. Business-neutral: any entity (asset, driver, contract, ESP…) supplies its own data through props."
    >
      <DocSection id="preview" title="Preview">
        <Prose>
          <Code>hero</Code> bleeds to the card edges; <Code>heroBadges</Code> overlays the top inset
          and only renders when a hero is given.
        </Prose>
        <div className="w-80">
          <EntityProfileCard
            hero={<img src={SAMPLE_HERO} alt="Compactor 4200" className="h-40 w-full object-cover" />}
            heroBadges={
              <Badge variant="success" dot>
                Active
              </Badge>
            }
            name="Compactor 4200"
            identifier="AB-1234"
            subtitle="Lot 1 · Municipal collection"
            tags={[
              { value: 'lot-1', label: 'Lot 1' },
              { value: 'lavajet', label: 'Lavajet' },
            ]}
            fields={[
              { label: 'Model', value: 'Compactor 4200' },
              { label: 'Odometer', value: '128,340 km' },
              { label: 'Fuel type', value: 'Diesel' },
            ]}
            actions={
              <>
                <Button size="sm" variant="secondary">
                  <Wrench /> Log maintenance
                </Button>
                <Button size="sm" variant="tertiary">
                  <ShieldCheck /> Compliance
                </Button>
              </>
            }
          />
        </div>
      </DocSection>

      <DocSection id="variants" title="Hero vs. avatar fallback">
        <Prose>
          Omit <Code>hero</Code> and the card falls back to a centered <Code>Avatar</Code> built from{' '}
          <Code>avatarFallback</Code> — used for entities with no image, such as a person.
        </Prose>
        <Gallery
          minColRem={20}
          items={[
            {
              label: 'Hero image',
              caption: 'heroBadges overlays the top inset',
              node: (
                <div className="w-64">
                  <EntityProfileCard
                    hero={
                      <img
                        src={SAMPLE_HERO}
                        alt="Compactor 4200"
                        className="h-28 w-full object-cover"
                      />
                    }
                    heroBadges={
                      <Badge variant="success" dot>
                        Active
                      </Badge>
                    }
                    name="Compactor 4200"
                    identifier="AB-1234"
                    subtitle="Lot 1 · Municipal collection"
                    tags={[{ value: 'lot-1', label: 'Lot 1' }]}
                  />
                </div>
              ),
            },
            {
              label: 'Avatar fallback',
              caption: 'no hero given — heroBadges is ignored in this mode',
              node: (
                <div className="w-64">
                  <EntityProfileCard
                    avatarFallback="Sara Ahmed"
                    name="Sara Ahmed"
                    subtitle="Inspector · Northern district"
                    tags={[{ value: 'inspector', label: 'Inspector' }]}
                    fields={[{ label: 'Emirates ID', value: '784-XXXX-XXXXXXX-X' }]}
                    actions={
                      <Button size="sm" variant="secondary">
                        View profile
                      </Button>
                    }
                  />
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
              prop: 'hero',
              type: 'ReactNode',
              description: 'Hero image/graphic bled to the card’s top edge. Omit to fall back to a centered Avatar.',
            },
            {
              prop: 'heroBadges',
              type: 'ReactNode',
              description:
                'Status chips overlaid on the hero’s top inset (availability, condition…). Renders only when hero is given.',
            },
            {
              prop: 'avatarSrc',
              type: 'string',
              description: 'Avatar image source, used only when hero is omitted.',
            },
            {
              prop: 'avatarFallback',
              type: 'string',
              description: 'Avatar initials fallback, derived from this string, used only when hero is omitted.',
            },
            {
              prop: 'name',
              type: 'ReactNode',
              required: true,
              description: 'Entity display name — the card’s primary heading.',
            },
            {
              prop: 'identifier',
              type: 'ReactNode',
              description: 'Short identifier rendered inline next to the name (ID, plate, serial…).',
            },
            {
              prop: 'subtitle',
              type: 'ReactNode',
              description: 'Supporting line under the name (role, category, contract…).',
            },
            {
              prop: 'tags',
              type: 'TagOption[]',
              description: 'Already-resolved tags, rendered via TagChipList — never an ad-hoc badge loop.',
            },
            {
              prop: 'fields',
              type: 'EntityProfileField[]',
              description: 'Key/value detail rows ({ label, value }) rendered below the tags.',
            },
            {
              prop: 'actions',
              type: 'ReactNode',
              description: 'Buttons/menu rendered as the final row.',
            },
            {
              prop: '…props',
              type: 'HTMLAttributes<HTMLDivElement>',
              description: 'Native div attributes (className, etc.) pass through to the underlying Card.',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Use hero for entities with a real image (vehicle, facility); fall back to avatarFallback for people or records without one.',
            'Resolve tags before passing them in — TagChipList only renders, it never fetches or maps.',
            'Keep fields to the handful of values that matter on a profile rail; link out to the full detail view for the rest.',
            'Put the primary action first in actions so it reads as the default choice.',
          ]}
          donts={[
            'Don’t pass heroBadges without hero — it only renders over the hero’s top inset.',
            'Don’t hardcode entity-specific vocabulary (vehicle, driver…) around the card; the component is business-neutral by design.',
            'Don’t fetch or mutate inside the card — it’s a pure presenter (state-agnostic, Rule 8).',
            'Don’t overload fields with more than ~4-5 rows; a longer list belongs in the profile body, not the rail.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'name renders as a heading (h3), so the entity’s identity is announced first.',
            'fields render as a definition list (dl/dt/dd), exposing label/value as a pair rather than disconnected text.',
            'Avatar fallback initials are derived from the name string via the underlying Avatar primitive.',
            'actions are ordinary buttons — full keyboard support inherited from Button.',
            'Layout uses logical properties, so it mirrors correctly under RTL (switch the header language).',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
