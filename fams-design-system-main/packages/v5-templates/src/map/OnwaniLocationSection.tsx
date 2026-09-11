import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import type { FieldDescriptor } from '@fams/v5-composer'
import { OnwaniLocationPickerWidget } from '../creation-sheet/OnwaniLocationPickerWidget'
import { ONWANI_PART_RE, parseOnwaniPart } from '../creation-sheet/onwani-geo'
import type { SectionComponentProps } from '../lib/section-components'

/**
 * OnwaniLocationSection — the creation form's `OnwaniLocationPicker` (Onwani
 * Number / Add Location radio, text place field with two-way marker sync,
 * interactive map with search + Municipality/Area scope + the floating
 * "Incident Location" card) mounted as a PROFILE SECTION, so the detail
 * side sheet edits location through the exact same component the creation
 * sheet uses (MME/FRMS Figma cWjEbSNpZCC7tNhZc2CikU · 328-36271, product
 * ask 2026-09-03: "we want this updated map component everywhere").
 *
 * Adapter, not a fork: it seeds a LOCAL react-hook-form from the record,
 * renders the real `OnwaniLocationPickerWidget` against it, and pushes a
 * DEBOUNCED patch through the section `onSave` seam — never a per-keystroke
 * record write, which would remount the section mid-typing.
 *
 * `component.props` (blueprint JSON — pure field-key indirection, rule 10):
 *   - `locationField?`   — record col holding the free-text place (default `systemcol1`)
 *   - `onwaniField?`     — record col holding the dash-joined Onwani, e.g. "90-200-4" (default `systemcol12`)
 *   - `municipalityField?` / `areaField?` — sibling scope cols (defaults `municipality` / `area`)
 *   - `municipalityOptions?` / `municipalityLabel?` / `defaultCenter?` / `defaultZoom?` /
 *     `locationCardLabel?` — passed through to the widget unchanged
 *   - `editableStages?`  — record `status` values in which editing is allowed;
 *     omitted/empty = editable whenever the host wired `onSave` (who may edit
 *     stays business config in the blueprint, rule 8/10 — the DS only obeys).
 */
export interface OnwaniLocationSectionConfig {
  locationField?: string
  onwaniField?: string
  municipalityField?: string
  areaField?: string
  municipalityOptions?: string[]
  municipalityLabel?: string
  defaultCenter?: [number, number]
  defaultZoom?: number
  locationCardLabel?: string
  editableStages?: string[]
  /** Record field holding sibling pins (`{id, position:[lng,lat], label?}[]`,
   *  e.g. the boot-seeded `related_pins`) — shown at 50% opacity behind a
   *  checkbox toggle labelled `relatedPinsLabel`. Omit for no toggle. */
  relatedPinsField?: string
  relatedPinsLabel?: string
}

/** Record dash format ("90-200-4") ⇄ the widget's composed format ("Zone 90,
 *  Street 200, Bldg 4"). The composed→dash direction reuses the widget's own
 *  `ONWANI_PART_RE` patterns so the two halves can never drift apart. */
function dashToComposed(dash: string): string {
  if (!dash || dash === 'Pending') return ''
  const [z = '', s = '', b = ''] = dash.split('-')
  return [z && `Zone ${z}`, s && `Street ${s}`, b && `Bldg ${b}`].filter(Boolean).join(', ')
}
function composedToDash(composed: string): string {
  return [ONWANI_PART_RE.zone, ONWANI_PART_RE.street, ONWANI_PART_RE.bldg]
    .map((re) => parseOnwaniPart(composed, re))
    .filter(Boolean)
    .join('-')
}

const COMMIT_DELAY_MS = 700

export function OnwaniLocationSection({ record, props, onSave }: SectionComponentProps) {
  const cfg = (props ?? {}) as OnwaniLocationSectionConfig
  const locationField = cfg.locationField ?? 'systemcol1'
  const onwaniField = cfg.onwaniField ?? 'systemcol12'
  const municipalityField = cfg.municipalityField ?? 'municipality'
  const areaField = cfg.areaField ?? 'area'
  const status = String(record.status ?? '')
  const editable = Boolean(onSave) && (!cfg.editableStages?.length || cfg.editableStages.includes(status))

  const str = (key: string) => {
    const v = record[key]
    return typeof v === 'string' ? v : v == null ? '' : String(v)
  }
  const seededOnwani = dashToComposed(str(onwaniField))

  // Local editing surface, seeded ONCE from the record (the record updates we
  // cause ourselves must not clobber in-progress typing).
  const { control, watch } = useForm({
    defaultValues: {
      onwani: seededOnwani,
      [municipalityField === 'onwani' ? '_municipality' : municipalityField]: str(municipalityField),
      [areaField === 'onwani' ? '_area' : areaField]: str(areaField),
    } as Record<string, string>,
  })
  const [text, setText] = useState(() => (seededOnwani ? '' : str(locationField)))

  // Sibling pins (runtime record data, not config) ride into the widget on
  // the same props surface — valid `{id, position}` entries only.
  const relatedPins = useMemo(() => {
    if (!cfg.relatedPinsField) return undefined
    const raw = record[cfg.relatedPinsField]
    if (!Array.isArray(raw)) return undefined
    const pins = raw.filter(
      (p): p is { id: string; position: [number, number]; label?: string } =>
        !!p && typeof p === 'object' && Array.isArray((p as { position?: unknown }).position),
    )
    return pins.length ? pins : undefined
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg.relatedPinsField, record[cfg.relatedPinsField ?? '']])

  const descriptor = useMemo(
    () =>
      ({
        col: locationField,
        label: 'Location',
        type: 'SmallText',
        component: {
          name: 'OnwaniLocationPicker',
          props: {
            onwaniCol: 'onwani',
            municipalityCol: municipalityField,
            areaCol: areaField,
            municipalityOptions: cfg.municipalityOptions,
            municipalityLabel: cfg.municipalityLabel,
            defaultCenter: cfg.defaultCenter,
            defaultZoom: cfg.defaultZoom,
            locationCardLabel: cfg.locationCardLabel,
            relatedPins,
            relatedPinsLabel: cfg.relatedPinsLabel,
          },
        },
      }) as unknown as FieldDescriptor,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locationField, municipalityField, areaField, relatedPins],
  )

  // Debounced write-through: whichever branch is active wins, the other clears
  // — the same either/or the creation form enforces.
  const onwaniComposed = watch('onwani')
  const municipality = watch(municipalityField)
  const area = watch(areaField)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Snapshot of the last committed (or seeded) values — a mount/no-op render
  // must never write the record (it would rewrite the derived location line
  // and pollute the timeline with phantom "changed …" entries).
  const lastCommitted = useRef(
    JSON.stringify([seededOnwani, str(municipalityField), str(areaField), seededOnwani ? '' : str(locationField)]),
  )
  useEffect(() => {
    const key = JSON.stringify([onwaniComposed ?? '', municipality ?? '', area ?? '', text])
    if (key === lastCommitted.current) return
    if (!editable || !onSave) return
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      lastCommitted.current = key
      const dash = composedToDash(onwaniComposed ?? '')
      const patch: Record<string, unknown> = {
        [municipalityField]: municipality ?? '',
        [areaField]: area ?? '',
      }
      if (dash) {
        patch[onwaniField] = dash
        patch[locationField] = [municipality, onwaniComposed].filter(Boolean).join(' — ')
      } else {
        patch[onwaniField] = ''
        patch[locationField] = text.trim()
      }
      onSave(patch)
    }, COMMIT_DELAY_MS)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onwaniComposed, municipality, area, text, editable])

  return (
    <div data-slot="onwani-location-section" className="px-[1.125rem]">
      <OnwaniLocationPickerWidget
        descriptor={descriptor}
        value={text}
        onChange={(v) => setText(typeof v === 'string' ? v : '')}
        disabled={!editable}
        control={control}
      />
    </div>
  )
}

OnwaniLocationSection.displayName = 'OnwaniLocationSection'
