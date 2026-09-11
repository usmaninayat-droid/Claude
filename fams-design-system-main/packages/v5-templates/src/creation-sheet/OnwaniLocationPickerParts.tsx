import {
  InsetField,
  Input,
  Combobox,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  type ComboOption,
} from '@fams/ui-kit'
import { MapSearchOverlay, type MapSearchEntry } from './MapSearchOverlay'
import type { LngLat } from '../map/MapPanel.types'

/**
 * `OnwaniLocationPicker`'s chrome. [tier-2 internal]
 *
 * The presentational pieces of `OnwaniLocationPickerWidget.tsx` — the lazy
 * map's Suspense fallback, one Onwani number tile, and the floating on-map
 * toolbar row. Split out to keep the widget file (one interaction machine:
 * mode toggle + two-way text/pin sync + sibling-column writes) inside the
 * ~300-line budget (root CLAUDE.md rule 12). Every piece here is a pure
 * presenter — props in, JSX out, no state of its own.
 */

export function MapFallback() {
  return <div role="status" aria-label="Loading map" className="h-full w-full animate-pulse bg-muted" />
}

/** One Onwani part — a bare numeric Input inside the shared InsetField tile. */
export function OnwaniPart({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  disabled?: boolean
}) {
  return (
    <InsetField label={label} hasValue={value !== ''} disabled={disabled}>
      <Input
        bare
        inputMode="numeric"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ''))}
        aria-label={label}
      />
    </InsetField>
  )
}

/** The 46px on-map field chrome (Figma 4077-25065): white, #d0d5dd outline,
 *  4px radius, 10px floating label + 14px value, chevron at the end. Applied
 *  to the DS Select / Combobox triggers via their merged `className`. */
const MAP_FIELD_TRIGGER =
  'h-[2.875rem] rounded-[0.25rem] border-border bg-card px-3 pb-1 pt-4 text-sm font-semibold shadow-none [&_[data-label]]:text-[0.625rem]'


export interface OnwaniMapOverlayRowProps {
  center: LngLat
  disabled?: boolean
  searchEntries: MapSearchEntry[]
  onSearchPick: (point: LngLat, label: string) => void
  municipality: string
  municipalityLabel: string
  municipalityOptions: string[]
  onMunicipalityChange: (value: string) => void
  area: string
  areaOptions: ComboOption[]
  onAreaChange: (value: string) => void
}

/**
 * The floating toolbar across the map's top edge (Figma 4077-25059): search ·
 * zone select · area select — 24px gaps, each 46px tall, inset 12px from the
 * map's top/start, wrapping on narrow maps. `pointer-events-none` on the row
 * with `pointer-events-auto` per control keeps the map clickable BETWEEN them
 * (dropping a pin must still work through the gaps).
 */
export function OnwaniMapOverlayRow({
  center,
  disabled,
  searchEntries,
  onSearchPick,
  municipality,
  municipalityLabel,
  municipalityOptions,
  onMunicipalityChange,
  area,
  areaOptions,
  onAreaChange,
}: OnwaniMapOverlayRowProps) {
  return (
    <div
      data-slot="onwani-map-toolbar"
      className="pointer-events-none absolute inset-x-3 top-3 z-10 flex flex-wrap items-start gap-x-6 gap-y-2 pe-14"
    >
      <MapSearchOverlay
        inline
        className="pointer-events-auto w-[17.875rem] max-w-full shrink-0"
        center={center}
        onPick={onSearchPick}
        disabled={disabled}
        entries={searchEntries}
        entriesLabel="Suggested Locations"
      />
      <div className="pointer-events-auto min-w-[11.25rem] flex-1">
        <Select value={municipality || undefined} onValueChange={onMunicipalityChange} disabled={disabled}>
          <SelectTrigger
            label={municipalityLabel}
            aria-label={municipalityLabel}
            data-slot="onwani-map-municipality"
            className={MAP_FIELD_TRIGGER}
          >
            <SelectValue placeholder={municipalityLabel} />
          </SelectTrigger>
          <SelectContent>
            {municipalityOptions.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="pointer-events-auto min-w-[11.25rem] flex-1">
        <Combobox
          label="Area"
          ariaLabel="Area"
          size="sm"
          options={areaOptions}
          value={area || null}
          onChange={(v) => onAreaChange(typeof v === 'string' ? v : '')}
          // Free text stays first-class: an unlisted area commits via the
          // create-from-search CTA (the DS pattern for "type your own").
          onCreateFromSearch={(q) => onAreaChange(q.trim())}
          createEntityLabel="area"
          clearable
          disabled={disabled}
          placeholder="e.g. West Bay, Corniche"
          triggerProps={{ className: MAP_FIELD_TRIGGER, 'data-slot': 'onwani-map-area' }}
        />
      </div>
    </div>
  )
}
