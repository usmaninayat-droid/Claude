import { useState, type ReactNode } from 'react'
import { Gauge, MapPin, Radio, User } from '@fams/ui-kit/icons'
import {
  Calendar,
  VehiclePopupCard,
  VehicleEventsList,
  VehicleTripsPanel,
  VehicleDevicesTable,
  VehicleWorkforceCard,
  type VehicleWorkforceEntry,
  type VehiclePopupField,
  type VehiclePopupTabItem,
  type VehicleEventItem,
  type VehicleTripDateChip,
  type VehicleTripRow,
  type VehicleDeviceRow,
  type VehicleIcon3DArt,
} from '@fams/ui-kit'
import type { LiveVehicleDatum } from './live-types'
import { LIVE_STATUS_LABEL, LIVE_STATUS_TONE } from './live-types'

/**
 * LiveVehiclePopup — the live-monitoring vehicle card (Figma 495:2998/5977/
 * 8937/16050): `VehiclePopupCard` with the five spec tabs (board 16:22894) —
 * Overview (fields grid), Critical Events, Trips, Workforce, Devices. Tab bodies are the fleet-domain
 * ui-kit widgets; the ACTIVE tab is local state (pure view state — which tab
 * is open carries no business meaning, rule 8 untouched).
 *
 * All five tabs ALWAYS render (UX D28/UX-12): a tab whose data array is
 * absent/empty shows its in-card empty state at the card's stable height,
 * never disappears. The header tile renders the 3D vehicle art — the
 * deprecated `photoUrl` is never rendered (P0-1).
 */
export interface LiveVehiclePopupData {
  /** Overview grid override; omit for the default vehicle-derived fields. */
  fields?: VehiclePopupField[]
  events?: VehicleEventItem[]
  tripDates?: VehicleTripDateChip[]
  trips?: VehicleTripRow[]
  tripSummary?: { distance: string; trips: number; duration: string }
  devices?: VehicleDeviceRow[]
  /** Workforce tab (board 16:22182) — the assigned crew's info card. */
  workforce?: { photo?: ReactNode; entries?: VehicleWorkforceEntry[] }
  /** Tabs pinned to the visible bar (`uiConfig.map.popup.visibleTabs`). */
  visibleTabs?: string[]
  /** Segments before the bar's overflow slot. */
  maxVisibleTabs?: number
}

export interface LiveVehiclePopupProps {
  vehicle: LiveVehicleDatum
  data?: LiveVehiclePopupData
  /** Which `VehicleIcon3D` illustration the header tile renders (module
   *  config's `uiConfig.map.vehicleArt`). @default 'car' */
  art?: VehicleIcon3DArt
  onClose?: () => void
  /** Header open-in-new — navigate to the vehicle's profile. */
  onExpand?: () => void
  /** Header track/focus — recenter the map on the vehicle and follow it. */
  onLocate?: () => void
  /** Coordinates-field copy hook; defaults to `navigator.clipboard`. */
  onCopyCoordinates?: (text: string) => void
  /** Footer CTA row (`VehiclePopupCard.footer` passthrough). */
  footer?: ReactNode
  /** Header overflow-menu slot (`VehiclePopupCard.overflow` passthrough). */
  overflow?: ReactNode
  /** Card class override (e.g. a narrower cockpit width cap). */
  className?: string
  /** Tabs pinned to the visible bar (`uiConfig.map.popup.visibleTabs`). */
  visibleTabs?: string[]
  /** Segments before the bar's overflow slot (`…popup.maxVisibleTabs`). @default 3 */
  maxVisibleTabs?: number
  /**
   * Renders the card's OWN bottom-edge anchor triangle. @default true for a
   * standalone card. The map surface passes `false`: that triangle is pinned
   * to the card's bottom, so it aims at empty map the moment the popup layer
   * flips the card below or beside the marker — on the map the anchor pointer
   * is MapLibre's own tip (tinted to the card by `MapPanel`), which follows
   * the computed anchor.
   */
  pointer?: boolean
  /** Move focus into the card on mount (dialog open, UX-13). @default true */
  focusOnMount?: boolean
  /**
   * Close on a pointer-down outside the card. @default false — on the MAP the
   * outside-close belongs to `MapPanel`'s map-CLICK handler, which fires only
   * for a real click (MapLibre never fires `click` after a drag), so panning
   * and zooming do NOT close the card (UX-11). A pointer-down listener here
   * would close it the instant a pan started. Standalone hosts (no map layer
   * underneath) opt in.
   */
  closeOnOutsideClick?: boolean
}

/** SPEC P0-2 coordinate format: 3 decimals, spaced comma — "30.037 , 72.324". */
function formatCoordinates(lat: number, lng: number): string {
  return `${lat.toFixed(3)} , ${lng.toFixed(3)}`
}

function defaultFields(vehicle: LiveVehicleDatum, onCopy: (text: string) => void): VehiclePopupField[] {
  const coords = formatCoordinates(vehicle.position[1], vehicle.position[0])
  const fields: VehiclePopupField[] = []
  if (vehicle.driver) fields.push({ icon: <User aria-hidden="true" />, label: 'Driver', value: vehicle.driver })
  fields.push({
    icon: <Gauge aria-hidden="true" />,
    label: 'Vehicle Speed',
    value: vehicle.speedKmh != null ? `${vehicle.speedKmh} km/h` : '—',
  })
  fields.push({ icon: <MapPin aria-hidden="true" />, label: 'Coordinates', value: coords, onCopy: () => onCopy(coords) })
  if (vehicle.location) fields.push({ icon: <Radio aria-hidden="true" />, label: 'Location', value: vehicle.location })
  return fields
}

export function LiveVehiclePopup({
  vehicle,
  data,
  art = 'car',
  onClose,
  onExpand,
  onLocate,
  onCopyCoordinates,
  footer,
  overflow,
  className,
  visibleTabs,
  maxVisibleTabs,
  pointer = true,
  focusOnMount = true,
  closeOnOutsideClick = false,
}: LiveVehiclePopupProps) {
  const [activeTab, setActiveTab] = useState('overview')
  /**
   * Trips tab selection (round-1 visual #15 / interaction 16a + 16d).
   *
   * The picked-date CALENDAR chip is the selected one in Figma — the solid
   * blue chip with the calendar glyph and the white ✕; `Today` is outlined.
   * Round 1 seeded the selection from the `today` chip, which inverted the
   * pair. `null` means "the user has not touched the strip yet", so the
   * default keeps tracking the data; clearing selects nothing at all.
   */
  const defaultDateId =
    data?.tripDates?.find((d) => d.calendar)?.id ??
    data?.tripDates?.find((d) => d.today)?.id ??
    data?.tripDates?.[0]?.id
  const [dateSelection, setDateSelection] = useState<{ id?: string } | null>(null)
  const selectedDateId = dateSelection ? dateSelection.id : defaultDateId
  const [selectedTripIds, setSelectedTripIds] = useState<string[]>([])
  // Visual #44: the Figma ships this checkbox CHECKED.
  const [showLatest, setShowLatest] = useState(true)

  const copy = onCopyCoordinates ?? ((text: string) => void navigator.clipboard?.writeText(text))
  const tone = LIVE_STATUS_TONE[vehicle.status]

  // The five spec tabs, ALWAYS (UX D28): empty data → in-card empty states.
  const tabs: VehiclePopupTabItem[] = [
    { id: 'overview', label: 'Overview' },
    {
      id: 'events',
      label: 'Critical Events',
      content: <VehicleEventsList events={data?.events ?? []} emptyLabel="No critical events" />,
    },
    {
      id: 'trips',
      label: 'Trips',
      content: (
        <VehicleTripsPanel
          dates={data?.tripDates ?? []}
          selectedDateId={selectedDateId}
          onDateChange={(id) => setDateSelection({ id })}
          // The selected chip's white ✕ clears the day (interaction 16d).
          onClearDate={() => setDateSelection({ id: undefined })}
          // The calendar chip opens a real picker (16d). The DS panel ships no
          // calendar of its own, so the host passes ui-kit's grid and owns the
          // locale; picking a day selects the calendar chip.
          datePicker={
            <Calendar
              mode="single"
              onSelect={() => {
                const calendarId = data?.tripDates?.find((d) => d.calendar)?.id
                if (calendarId) setDateSelection({ id: calendarId })
              }}
            />
          }
          summary={data?.tripSummary}
          showLatest={showLatest}
          onShowLatestChange={setShowLatest}
          trips={data?.trips ?? []}
          // Per-row trip checkboxes are real selection (interaction 16b).
          selectedTripIds={selectedTripIds}
          onTripSelectionChange={setSelectedTripIds}
          emptyLabel="No trips for this date"
        />
      ),
    },
    {
      id: 'workforce',
      label: 'Workforce',
      content: (
        <VehicleWorkforceCard
          photo={data?.workforce?.photo}
          entries={data?.workforce?.entries ?? []}
          emptyLabel="No workforce assigned"
        />
      ),
    },
    {
      id: 'devices',
      label: 'Devices',
      content: <VehicleDevicesTable devices={data?.devices ?? []} emptyLabel="No devices linked" />,
    },
  ]

  return (
    <VehiclePopupCard
      // A22: title is the model (never the internal id); tag is the plate
      // (never the internal id) — one plate identity, everywhere.
      model={vehicle.model ?? vehicle.name ?? vehicle.plate ?? '—'}
      plate={vehicle.plate ?? '—'}
      driver={vehicle.driver ?? '—'}
      location={vehicle.location ?? '—'}
      status={LIVE_STATUS_LABEL[vehicle.status]}
      statusSince={vehicle.statusSince}
      statusTone={tone}
      art={art}
      fields={data?.fields ?? defaultFields(vehicle, copy)}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onClose={onClose}
      onExpand={onExpand}
      onLocate={onLocate}
      footer={footer}
      overflow={overflow}
      className={className}
      /* The designer's three: Overview · Critical Events · Workforce. Trips
         and Devices live in the bar's ⋯ menu until a blueprint says otherwise
         (`uiConfig.map.popup.visibleTabs`). */
      visibleTabs={visibleTabs ?? data?.visibleTabs ?? ['overview', 'events', 'workforce']}
      maxVisibleTabs={maxVisibleTabs ?? data?.maxVisibleTabs}
      pointer={pointer}
      focusOnMount={focusOnMount}
      closeOnOutsideClick={closeOnOutsideClick}
    />
  )
}

LiveVehiclePopup.displayName = 'LiveVehiclePopup'
