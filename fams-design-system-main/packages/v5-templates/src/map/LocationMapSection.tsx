import { useId, useState } from 'react'
import { Checkbox } from '@fams/ui-kit'
import type { EntityRecord } from '@fams/v5-composer'
import type { SectionComponentProps } from '../lib/section-components'
import { LocationMap, type LocationMapPin, type LocationMapPolygon } from './LocationMap'
import type { LngLat } from './MapPanel.types'

/**
 * `LocationMapSection` config — the blueprint section's `component.props`
 * shape (figma-spec-detail.md §4). Every key is a FIELD NAME on the record,
 * never a hardcoded business key — this is the same field-key-indirection
 * contract `IconTextView`'s `props.icon` already established, extended to a
 * whole section. See `packages/v5-templates/CLAUDE.md`/root `CLAUDE.md` rule
 * 10: business vocabulary lives in the blueprint, not in this component.
 */
export interface LocationMapSectionConfig {
  /** Section heading. Omit for no heading (the section's own `AccordionTrigger` title usually already says "Location"). */
  title?: string
  /** `record[centerField]` — `[lng, lat]`. Required; the section renders nothing without a valid center. */
  centerField: string
  /** `record[zoomField]` — a number. Falls back to `LocationMap`'s own default. */
  zoomField?: string
  /** `record[pinsField]` — `LocationMapPin[]`. */
  pinsField?: string
  /** `record[polygonsField]` — `LocationMapPolygon[]`. */
  polygonsField?: string
  /** `record[cornerLabelField]` — the corner card's small label (e.g. "Sector"). */
  cornerLabelField?: string
  /** `record[cornerValueField]` — the corner card's bold value (e.g. "Sector A"). */
  cornerValueField?: string
  /** Accessible label for the map region. Defaults to `title` or a generic label. */
  ariaLabel?: string
  /** Drop a full-strength pin at `centerField`'s position — THE record's own location marker. Default false (pins come only from `pinsField`). */
  markerCenter?: boolean
  /**
   * `record[relatedPinsField]` — `LocationMapPin[]` of RELATED records'
   * positions. When present and non-empty, a checkbox overlay (top-start
   * corner of the map, labeled `relatedToggleLabel`) lets the viewer overlay
   * them at 50% opacity, so the record's own full-strength marker always
   * stays the visually dominant pin.
   */
  relatedPinsField?: string
  /** The related-pins checkbox label. Default "Related records". */
  relatedToggleLabel?: string
}

function readLngLat(record: EntityRecord, field?: string): LngLat | undefined {
  if (!field) return undefined
  const value = record[field]
  if (Array.isArray(value) && value.length === 2 && value.every((n) => typeof n === 'number')) {
    return value as LngLat
  }
  return undefined
}

function readNumber(record: EntityRecord, field?: string): number | undefined {
  if (!field) return undefined
  const value = record[field]
  return typeof value === 'number' ? value : undefined
}

function readPins(record: EntityRecord, field?: string): LocationMapPin[] {
  if (!field) return []
  const value = record[field]
  return Array.isArray(value) ? (value as LocationMapPin[]) : []
}

function readPolygons(record: EntityRecord, field?: string): LocationMapPolygon[] {
  if (!field) return []
  const value = record[field]
  return Array.isArray(value) ? (value as LocationMapPolygon[]) : []
}

function readText(record: EntityRecord, field?: string): string | undefined {
  if (!field) return undefined
  const value = record[field]
  return value == null || value === '' ? undefined : String(value)
}

/**
 * LocationMapSection — the generic profile-section renderer wired to
 * `LocationMap`, registered under the name `LocationMapSection` (see
 * `LocationMapSectionSlot.tsx` for the lazy registration TaskDetail actually
 * uses). Reads every value off the record via the field keys in `props`;
 * renders nothing if the record has no valid center for the configured key.
 */
export function LocationMapSection({ record, props }: SectionComponentProps) {
  // Hooks first — this component early-returns for a record with no valid
  // center, so the related-pins toggle state must be declared above it
  // (react-hooks/rules-of-hooks).
  const [showRelated, setShowRelated] = useState(false)
  const relatedToggleId = useId()
  const cfg = (props ?? {}) as Partial<LocationMapSectionConfig>
  const center = readLngLat(record, cfg.centerField)
  if (!center) return null

  const cornerLabel = readText(record, cfg.cornerLabelField)
  const cornerValue = readText(record, cfg.cornerValueField)
  const hasCorner = Boolean(cornerLabel || cornerValue)

  const relatedPins = readPins(record, cfg.relatedPinsField)

  const pins: LocationMapPin[] = [
    ...readPins(record, cfg.pinsField),
    // The record's OWN marker — slightly larger than the default so it stays
    // the dominant pin even with the de-emphasized related overlay on.
    ...(cfg.markerCenter ? [{ id: '__center', position: center, radius: 8 }] : []),
    ...(showRelated ? relatedPins.map((pin) => ({ ...pin, opacity: pin.opacity ?? 0.5 })) : []),
  ]

  return (
    <div data-slot="location-map-section" className="flex flex-col gap-3">
      {cfg.title ? <h3 className="text-body-sm font-semibold text-foreground">{cfg.title}</h3> : null}
      <div className="relative h-[23.375rem] w-full overflow-hidden rounded-md">
        {relatedPins.length ? (
          <label
            htmlFor={relatedToggleId}
            data-slot="location-map-related-toggle"
            className="absolute start-4 top-4 z-10 flex cursor-pointer items-center gap-2 rounded-sm border border-border bg-card px-3 py-2 text-body-xs font-semibold text-foreground shadow-sm before:absolute before:-inset-2.5 before:content-['']"
          >
            <Checkbox
              id={relatedToggleId}
              checked={showRelated}
              onCheckedChange={(checked) => setShowRelated(checked === true)}
            />
            {cfg.relatedToggleLabel ?? 'Related records'}
          </label>
        ) : null}
        <LocationMap
          center={center}
          zoom={readNumber(record, cfg.zoomField)}
          pins={pins}
          polygons={readPolygons(record, cfg.polygonsField)}
          aria-label={cfg.ariaLabel ?? cfg.title ?? 'Location map'}
          // DS V2 "Map Location" card (node 5330:17647): 240px white card,
          // light border, the Shadow/Map token, SemiBold 12px lighter label
          // over SemiBold 14px darker value.
          cornerOverlay={
            hasCorner ? (
              <div className="w-60 rounded-sm border border-gray-300 bg-card ps-3 pe-2 py-2 shadow-map">
                {cornerLabel ? (
                  <div className="text-caption font-semibold text-muted-foreground">{cornerLabel}</div>
                ) : null}
                {cornerValue ? (
                  <div className="truncate text-body-sm font-semibold text-card-foreground">{cornerValue}</div>
                ) : null}
              </div>
            ) : undefined
          }
        />
      </div>
    </div>
  )
}

LocationMapSection.displayName = 'LocationMapSection'
