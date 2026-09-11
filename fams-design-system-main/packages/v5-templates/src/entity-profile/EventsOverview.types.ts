import type { EntityRecord } from '@fams/v5-composer'
import type { LocationMapPin } from '../map/LocationMap'
import type { OverviewTone } from './OverviewWidgets.types'

/**
 * The `EventsOverview` CONFIG CONTRACT. [tier-2]
 *
 * A tanker-detail "Events" tab: a functional search box + filter popover +
 * "Select Time Frame" control over an icon-row event list, and a map end pane
 * with colour-coded pins matching the list plus a hide-pins toggle. Same
 * FIELD-KEY INDIRECTION discipline as the rest of `entity-profile` — no
 * "tanker" vocabulary lives here, only in the blueprint config + seed data.
 *
 * Internally composes `EventListWidget`'s new `layout: 'icons'` variant for
 * the list body (see `overview-widget-parts.tsx`), rather than forking a
 * parallel list renderer, per the existing widget-extension convention W2
 * established.
 */
export interface EventsOverviewRow {
  id: string
  /** Event TYPE key — looks up `iconMap`/`toneMap` and doubles as the pin `category`. */
  type: string
  label: string
  time: string
  address: string
  lat: number
  lng: number
}

export interface EventsOverviewStrings {
  searchPlaceholder: string
  filterLabel: string
  timeFrameLabel: string
  hidePinsLabel: string
  emptyText: string
}

export interface EventsOverviewProps {
  record: EntityRecord | undefined
  /** `record[itemsField]` — `EventsOverviewRow[]`. */
  itemsField: string
  /** Event type → named glyph. */
  iconMap?: Record<string, string>
  /** Event type → tone (tints the circular icon badge + matching map pin). */
  toneMap?: Record<string, OverviewTone>
  strings?: Partial<EventsOverviewStrings>
  mapAriaLabel?: string
  className?: string
}

export type { LocationMapPin }
