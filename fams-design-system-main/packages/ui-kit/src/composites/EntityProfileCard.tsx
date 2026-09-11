import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { cn } from '../lib/cn'
import { Card } from './Card'
import { Avatar } from '../primitives/Avatar'
import { TagChipList, type TagOption } from './TagChipList'

/**
 * EntityProfileCard — generic identity card for any entity's profile left
 * rail. [L3 composite]
 *
 * Hero image bleeds to the card's edges with an optional top-inset badge
 * overlay (`heroBadges`) for status chips; omit `hero` and the card falls
 * back to a centered `Avatar` built from `avatarSrc`/`avatarFallback`.
 * `heroBadges` only renders over `hero` — an avatar-only card has no image
 * region to overlay, so status belongs in `tags` or `subtitle` instead.
 * Tags are display-only via `TagChipList` (never an ad-hoc badge loop);
 * `fields` is a simple key/value list; `actions` is a free-form button row.
 * Business-neutral throughout — no vehicle/driver/asset vocabulary. Built on
 * `Card` + `Avatar` + `TagChipList`, not re-implemented.
 *
 * State-agnostic (Rule 8): pure presenter — data and callbacks only, no
 * fetch, no store, no routing.
 *
 * @usage-v5
 *   Retires the v5 codebase's hand-rolled profile left rail, duplicated
 *   near-identically across iwmp/fams/ead templates (~31 files, e.g.
 *   `iwmp/templates/profile/AssetVehicleProfile.vue` lines 447-485,
 *   `WorkforceDriverProfile.vue` lines 497-508, plus DeviceTrackerProfile,
 *   DeviceSimProfile, PipelineCompanyProfile, AssetBinProfile and their
 *   fams/ead copies): a `q-img` hero in a tinted panel, an absolutely
 *   positioned top-right status label+icon, `text-h4` name, a plain-text
 *   subtitle line ("Plate # …"), `tag-chips` row, and an inline add-tag
 *   button — re-implemented per entity type with no shared component.
 *   Forms needed: hero-or-avatar, hero status overlay, name/subtitle,
 *   resolved tags, key/value fields, actions row.
 * @usage-index entity-profile-card
 */
export interface EntityProfileField {
  label: ReactNode
  value?: ReactNode
}

export interface EntityProfileCardProps extends HTMLAttributes<HTMLDivElement> {
  /** Hero image/graphic bled to the card's top edge. Omit to fall back to a centered `Avatar`. */
  hero?: ReactNode
  /** Status chips overlaid on the hero's top inset, spread start↔end (e.g. availability · condition). Renders only when `hero` is given. */
  heroBadges?: ReactNode
  /** Avatar image source, used only when `hero` is omitted. */
  avatarSrc?: string
  /** Avatar initials fallback (derived from this string), used only when `hero` is omitted. */
  avatarFallback?: string
  /** Entity display name — the card's primary heading. */
  name: ReactNode
  /** Short identifier rendered inline next to the name (ID, plate, serial…). */
  identifier?: ReactNode
  /** Supporting line under the name (role, category, contract…). */
  subtitle?: ReactNode
  /** Already-resolved tags — rendered via `TagChipList`, never an ad-hoc badge loop. */
  tags?: TagOption[]
  /** Key/value detail rows rendered below the tags. */
  fields?: EntityProfileField[]
  /** Buttons/menu rendered as the final row. */
  actions?: ReactNode
}

/**
 * EntityProfileCard — see module doc above.
 */
export const EntityProfileCard = forwardRef<HTMLDivElement, EntityProfileCardProps>(
  (
    {
      className,
      hero,
      heroBadges,
      avatarSrc,
      avatarFallback,
      name,
      identifier,
      subtitle,
      tags,
      fields,
      actions,
      ...props
    },
    ref,
  ) => (
    <Card
      ref={ref}
      data-slot="entity-profile-card"
      className={cn('flex flex-col gap-4 p-4 shadow-elevation', className)}
      {...props}
    >
      {hero ? (
        <div
          data-slot="entity-profile-card-hero"
          className="relative -mx-4 -mt-4 mb-1 overflow-hidden rounded-t-md bg-muted"
        >
          {hero}
          {heroBadges ? (
            <div
              data-slot="entity-profile-card-hero-badges"
              className="absolute inset-x-3 top-3 flex items-start justify-between gap-2"
            >
              {heroBadges}
            </div>
          ) : null}
        </div>
      ) : avatarSrc || avatarFallback ? (
        <Avatar size="xl" src={avatarSrc} name={avatarFallback} className="self-center" />
      ) : null}

      <div data-slot="entity-profile-card-heading" className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h3
            data-slot="entity-profile-card-name"
            className="truncate text-base font-semibold text-foreground"
          >
            {name}
          </h3>
          {identifier ? (
            <span
              data-slot="entity-profile-card-identifier"
              className="shrink-0 rounded-xs bg-muted px-1.5 py-0.5 text-caption font-medium text-muted-foreground"
            >
              {identifier}
            </span>
          ) : null}
        </div>
        {subtitle ? (
          <p data-slot="entity-profile-card-subtitle" className="text-xs text-muted-foreground">
            {subtitle}
          </p>
        ) : null}
      </div>

      {tags && tags.length > 0 ? <TagChipList tags={tags} /> : null}

      {fields && fields.length > 0 ? (
        <dl data-slot="entity-profile-card-fields" className="flex flex-col gap-2 text-xs">
          {fields.map((field, index) => (
            <div
              key={index}
              className="flex items-baseline justify-between gap-2 border-b border-border pb-1.5 last:border-0 last:pb-0"
            >
              <dt className="text-muted-foreground">{field.label}</dt>
              <dd className="text-end text-foreground">{field.value ?? '—'}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {actions ? (
        <div data-slot="entity-profile-card-actions" className="flex flex-wrap gap-2">
          {actions}
        </div>
      ) : null}
    </Card>
  ),
)

EntityProfileCard.displayName = 'EntityProfileCard'
