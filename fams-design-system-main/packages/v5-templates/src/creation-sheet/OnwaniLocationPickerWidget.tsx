import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useController, type Control } from 'react-hook-form'
import { InsetField, Input, RadioGroup, RadioGroupItem } from '@fams/ui-kit'
import { registerEditWidget, type EditWidget } from '@fams/v5-composer'
import type { LngLat, LocationPickerRelatedPin } from '../map/MapPanel.types'
import { MapFallback, OnwaniMapOverlayRow, OnwaniPart } from './OnwaniLocationPickerParts'
import {
  composeOnwani,
  DEFAULT_AREAS,
  DEFAULT_CENTER,
  DEFAULT_MUNICIPALITIES,
  DEFAULT_POIS,
  deriveAreaCenter,
  deriveOnwaniPoint,
  describePoint,
  locatePlaceText,
  MUNICIPALITY_AREAS,
  MUNICIPALITY_CENTER,
  MUNICIPALITY_POIS,
  ONWANI_PART_RE,
  parseOnwaniPart,
} from './onwani-geo'

/**
 * OnwaniLocationPicker — the FAMS Requests & Complaints / Incidents "where is
 * the issue?" composite. [tier-2 create widget]
 *
 * A field opts in via `component: { name: 'OnwaniLocationPicker', props }` on a
 * `SmallText`-typed column (its OWN column stores the manual `"lat, lng"` pin,
 * same contract as `LocationPicker`). It renders, top to bottom:
 *   1. a mutually-exclusive mode toggle — "Onwani Number" OR "Add Location",
 *      never both (switching clears the other branch);
 *   2. in Onwani mode, the three-part Onwani entry (Zone / Street / Bldg No.)
 *      joined into the sibling `onwaniCol`; in Location mode, the manual
 *      lat/lng input;
 *   3. a map that reflects whichever is active — the manual pin, or a point
 *      derived from the entered Onwani (centred on the selected municipality).
 *      The map's TOP ROW (IWMP/IIMS Figma hnnuT9ycg7WjzAApHkAWTz · 4077-25042)
 *      carries the location search beside two compact selects — the
 *      Municipality (Zone) and the Area — so the geographic scope is chosen
 *      right on the map instead of in fields above it. Both keep writing the
 *      same sibling columns (`municipalityCol`, `areaCol`) they always did.
 *
 * MULTI-COLUMN: this widget writes SIBLING columns (`onwaniCol`,
 * `municipalityCol`, `areaCol`), not just its own value, so it needs the form
 * `control` (threaded through `EditWidgetProps.control`). `props` (blueprint
 * JSON, no business vocabulary):
 *   - `onwaniCol: string`             — column that stores the composed Onwani string
 *   - `municipalityCol?: string`      — column the on-map zone select reads/writes
 *   - `municipalityOptions?: string[]`— zone choices (default: the demo centres)
 *   - `municipalityLabel?: string`    — label for the zone select (default "Municipality (Zone)")
 *   - `areaCol?: string`, `areaOptions?: string[]`
 *   - `defaultCenter?: [lng,lat]`, `defaultZoom?: number`
 *
 * LAZY-WEIGHT BOUNDARY: identical to `LocationPickerWidget` — the `maplibre-gl`
 * chain is reached only through a package-specifier `import('@fams/v5-templates/
 * map')` inside `React.lazy`, so it stays out of the light `.` barrel's bytes.
 */
const LazyLocationPickerMap = lazy(() =>
  import('@fams/v5-templates/map').then((mod) => ({ default: mod.LocationPickerMap })),
)

type Mode = 'onwani' | 'location'

interface OnwaniProps {
  onwaniCol?: string
  municipalityCol?: string
  /** Zone choices for the on-map Municipality select. Default: the demo centres. */
  municipalityOptions?: string[]
  /** Floating label of the on-map zone select. Default "Municipality (Zone)". */
  municipalityLabel?: string
  /** Sibling column for the Area — narrows the map with municipality. */
  areaCol?: string
  /** Dropdown suggestions for the Area combobox. Default: a per-municipality demo list. */
  areaOptions?: string[]
  defaultCenter?: LngLat
  defaultZoom?: number
  /** Label of the floating on-map readout card. Default "Incident Location". */
  locationCardLabel?: string
  /**
   * Sibling records plotted at 50% opacity behind a labelled checkbox toggle
   * (RUNTIME data an edit surface injects — e.g. `OnwaniLocationSection`
   * reading a record's related-pins column; the creation flow passes none and
   * renders no toggle).
   */
  relatedPins?: LocationPickerRelatedPin[]
  relatedPinsLabel?: string
}

export const OnwaniLocationPickerWidget: EditWidget = ({ descriptor, value, onChange, disabled, control }) => {
  const props = (descriptor.component?.props ?? {}) as OnwaniProps
  const rhfControl = control as Control | undefined
  const onwaniCol = props.onwaniCol ?? 'onwani'

  // Sibling columns. `useController` with an explicit `control` needs no
  // FormProvider (react-hook-form reads the passed control directly). Guarded:
  // if a caller ever renders this without a control, fall back to a no-op so
  // the widget still mounts.
  const onwani = useController({ name: onwaniCol, control: rhfControl as Control })
  const area = useController({ name: props.areaCol ?? 'area', control: rhfControl as Control })
  const municipalityField = useController({ name: props.municipalityCol ?? 'municipality', control: rhfControl as Control })
  const municipality = typeof municipalityField.field.value === 'string' ? municipalityField.field.value : ''

  // The field's OWN column stores the human-readable place TEXT, not a
  // coordinate pair (MME/FRMS Figma `cWjEbSNpZCC7tNhZc2CikU` · 328-36271 —
  // "location in text format"); the pin is local state kept in two-way sync
  // with it through `onwani-geo`'s demo geocoder pair. `draft` is the
  // uncommitted keystroke buffer, so typing never geocodes per character.
  const committedText = typeof value === 'string' ? value : ''
  const [mode, setMode] = useState<Mode>(() => (committedText.trim() ? 'location' : 'onwani'))
  const [pin, setPin] = useState<LngLat | null>(() =>
    committedText.trim() ? locatePlaceText(committedText, props.defaultCenter ?? DEFAULT_CENTER) : null,
  )
  const [draft, setDraft] = useState(committedText)
  useEffect(() => {
    setDraft(committedText)
  }, [committedText])

  // Onwani parts are local UI state; the committed value is the composed
  // string in `onwaniCol`. Seed once from any existing composed value, so an
  // EDIT surface (the detail sheet's Location section) starts from the
  // record's stored Onwani instead of blank parts.
  const [zone, setZone] = useState(() => parseOnwaniPart(onwani.field.value, ONWANI_PART_RE.zone))
  const [street, setStreet] = useState(() => parseOnwaniPart(onwani.field.value, ONWANI_PART_RE.street))
  const [bldg, setBldg] = useState(() => parseOnwaniPart(onwani.field.value, ONWANI_PART_RE.bldg))

  const areaValue = typeof area.field.value === 'string' ? area.field.value : ''

  // Municipality picks the base centre; a typed Area narrows within it (and
  // the map zooms in a step to reflect the tighter scope).
  const center = useMemo<LngLat>(() => {
    const base = municipality
      ? (MUNICIPALITY_CENTER[municipality] ?? DEFAULT_CENTER)
      : (props.defaultCenter ?? DEFAULT_CENTER)
    return deriveAreaCenter(base, areaValue.trim())
  }, [municipality, props.defaultCenter, areaValue])
  const zoom = areaValue.trim() ? (props.defaultZoom ?? 12) + 1.5 : props.defaultZoom

  // Map-search suggestions follow the operator's context: scoped to the
  // selected municipality (all inside Qatar), and entries matching the chosen
  // Area float to the top. Sublabels name the area + municipality.
  const searchEntries = useMemo(() => {
    const scoped = municipality
      ? (MUNICIPALITY_POIS[municipality] ?? []).map((p) => ({ ...p, municipality }))
      : DEFAULT_POIS
    const areaKey = areaValue.trim().toLowerCase()
    const ranked = areaKey
      ? [...scoped].sort(
          (a, b) =>
            Number((b.area ?? '').toLowerCase().includes(areaKey)) -
            Number((a.area ?? '').toLowerCase().includes(areaKey)),
        )
      : scoped
    return ranked.map((p) => ({
      label: p.label,
      sublabel: `${p.area ? `${p.area}, ` : ''}${p.municipality} — Qatar`,
      icon: 'marker-pin-05',
    }))
  }, [municipality, areaValue])

  // Dropdown list: blueprint override → per-municipality demo list → all. A
  // committed free-text value joins the list so the trigger can display it.
  const areaOptions = useMemo(() => {
    const base = props.areaOptions ?? (municipality ? (MUNICIPALITY_AREAS[municipality] ?? DEFAULT_AREAS) : DEFAULT_AREAS)
    const withValue = areaValue && !base.includes(areaValue) ? [areaValue, ...base] : base
    return withValue.map((a) => ({ value: a, label: a }))
  }, [props.areaOptions, municipality, areaValue])

  // Zone choices: blueprint list → demo centres. A pre-set value outside the
  // list still displays.
  const municipalityOptions = useMemo(() => {
    const base = props.municipalityOptions ?? DEFAULT_MUNICIPALITIES
    return municipality && !base.includes(municipality) ? [municipality, ...base] : base
  }, [props.municipalityOptions, municipality])

  const commitOnwani = useCallback(
    (z: string, s: string, b: string) => {
      onwani.field.onChange(composeOnwani(z, s, b))
      // Mutual exclusivity: entering an Onwani clears any manual location.
      if (value) onChange('')
      setPin(null)
    },
    [onwani.field, onChange, value],
  )

  // Dropping or DRAGGING the pin reverse-describes it into the Location text
  // field (Figma 328-36271: a marker move auto-fills the field).
  const handlePick = useCallback(
    (lngLat: LngLat) => {
      setPin(lngLat)
      onChange(describePoint(lngLat))
      // Mutual exclusivity: dropping a pin clears the Onwani.
      onwani.field.onChange('')
    },
    [onChange, onwani.field],
  )

  // Committing typed text (Enter / blur) forward-geocodes it and drops the
  // marker there — the other half of the two-way sync.
  const commitDraft = useCallback(
    (text: string) => {
      onChange(text)
      setPin(text.trim() ? locatePlaceText(text, center) : null)
      if (text.trim()) onwani.field.onChange('')
    },
    [onChange, center, onwani.field],
  )

  const switchMode = useCallback(
    (next: Mode) => {
      setMode(next)
      if (next === 'onwani') {
        onChange('')
        setPin(null)
      } else {
        setZone('')
        setStreet('')
        setBldg('')
        onwani.field.onChange('')
      }
    },
    [onChange, onwani.field],
  )

  // A search pick behaves like dropping a pin: switch to Location mode, land
  // the pin on the picked point, and fill the Location field with its NAME.
  const handleSearchPick = useCallback(
    (lngLat: LngLat, label: string) => {
      setMode('location')
      setPin(lngLat)
      onChange(label)
      onwani.field.onChange('')
    },
    [onChange, onwani.field],
  )

  // Changing the zone re-scopes the Area suggestions; an Area outside the new
  // zone's list is kept only if it was free text (never silently dropped).
  const handleMunicipality = useCallback(
    (next: string) => {
      municipalityField.field.onChange(next)
      const list = props.areaOptions ?? MUNICIPALITY_AREAS[next] ?? []
      if (areaValue && DEFAULT_AREAS.includes(areaValue) && !list.includes(areaValue)) area.field.onChange('')
    },
    [municipalityField.field, area.field, areaValue, props.areaOptions],
  )

  // Map marker: the manual pin in Location mode, else the derived Onwani point.
  const mapPoint = mode === 'location' ? pin : deriveOnwaniPoint(center, zone, street)
  const municipalityLabel = props.municipalityLabel ?? 'Municipality (Zone)'

  // Floating on-map readout (Figma 330-36347): whichever branch is active.
  const onwaniText = typeof onwani.field.value === 'string' ? onwani.field.value : ''
  const cardValue = mode === 'location' ? committedText.trim() : onwaniText.trim()

  return (
    <div data-slot="onwani-location-picker" className="flex flex-col gap-4">
      <RadioGroup
        value={mode}
        onValueChange={(v) => switchMode(v as Mode)}
        aria-label="Location entry method"
        className="grid-flow-col justify-start gap-6"
      >
        {(
          [
            { value: 'onwani', label: 'Onwani Number' },
            { value: 'location', label: 'Add Location' },
          ] as const
        ).map((opt) => (
          <label
            key={opt.value}
            className="flex cursor-pointer items-center gap-2 text-body-sm font-semibold text-foreground"
          >
            <RadioGroupItem value={opt.value} disabled={disabled} />
            {opt.label}
          </label>
        ))}
      </RadioGroup>

      {mode === 'onwani' ? (
        <div className="grid grid-cols-3 gap-4">
          <OnwaniPart
            label="Zone"
            value={zone}
            disabled={disabled}
            onChange={(v) => {
              setZone(v)
              commitOnwani(v, street, bldg)
            }}
          />
          <OnwaniPart
            label="Street"
            value={street}
            disabled={disabled}
            onChange={(v) => {
              setStreet(v)
              commitOnwani(zone, v, bldg)
            }}
          />
          <OnwaniPart
            label="Bldg. No"
            value={bldg}
            disabled={disabled}
            onChange={(v) => {
              setBldg(v)
              commitOnwani(zone, street, v)
            }}
          />
        </div>
      ) : (
        <InsetField label="Location" hasValue={draft !== ''} disabled={disabled}>
          <Input
            bare
            value={draft}
            disabled={disabled}
            placeholder="e.g. West Bay, Doha — or drop a pin on the map"
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              if (draft !== committedText) commitDraft(draft)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                commitDraft(draft)
              }
            }}
            aria-label="Location"
          />
        </InsetField>
      )}

      <div className="relative h-[24rem] w-full overflow-hidden rounded-sm border border-border">
        <Suspense fallback={<MapFallback />}>
          <LazyLocationPickerMap
            value={mapPoint}
            onChange={handlePick}
            defaultCenter={center}
            defaultZoom={zoom}
            // In Onwani mode the pin is derived, not user-set — the map is a
            // read-only reflection of the typed Onwani.
            disabled={disabled || mode === 'onwani'}
            draggable
            locationCard={
              cardValue ? { label: props.locationCardLabel ?? 'Incident Location', value: cardValue } : undefined
            }
            relatedPins={props.relatedPins}
            relatedPinsLabel={props.relatedPinsLabel}
            aria-label={descriptor.label}
          />
        </Suspense>

        <OnwaniMapOverlayRow
          center={center}
          disabled={disabled}
          searchEntries={searchEntries}
          onSearchPick={handleSearchPick}
          municipality={municipality}
          municipalityLabel={municipalityLabel}
          municipalityOptions={municipalityOptions}
          onMunicipalityChange={handleMunicipality}
          area={areaValue}
          areaOptions={areaOptions}
          onAreaChange={(v) => area.field.onChange(v)}
        />
      </div>
    </div>
  )
}

/** Registers `OnwaniLocationPicker`. Called explicitly (never a bare side-effect import). */
export function registerOnwaniLocationPickerWidget(): void {
  registerEditWidget('OnwaniLocationPicker', OnwaniLocationPickerWidget)
}
