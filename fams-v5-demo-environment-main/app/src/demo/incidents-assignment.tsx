import { useRef, useState, type ReactNode } from 'react'
import { Avatar, Button, IconSelect, InlineEditField, Input, InsetField, PickerList, RadioGroup, RadioGroupItem, toast } from '@fams/ui-kit'
import { AlertOctagon, Building2, Send } from '@fams/ui-kit/icons'
import type { EntityConfig, EntityRecord } from '@fams/v5-composer'

/**
 * Requests & Complaints stage-scoped INLINE field editing (2026-08-31
 * pipeline refinement, corrected same day per coordinator direction — a
 * prior header-button/popover design was replaced with this ClickUp-style
 * pattern): in the detail view's field grid, an EDITABLE field shows a
 * primary-colored pencil at the end of its value on hover; click opens a
 * small popup anchored to the field with the right control (person/vehicle
 * picker, dropdown, number input); picking a value saves immediately
 * (optimistic) and closes the popup. Non-editable fields never show a
 * pencil — editability still follows the stage×role matrix (FM-6271/
 * FM-6273):
 * - Assigned Inspector, the intake enum fields (Type/Category/Sub-type/
 *   Source/Priority) and the intake text fields (Source Reference/Customer
 *   Name/Customer Phone/Complaint Description) are editable in any
 *   NON-FINAL status (FM-6273, superseding the earlier INTAKE/TRIAGE-only
 *   scope for Assigned Inspector and the earlier view-only stance on
 *   Priority).
 * - Tanker assigned/Driver assigned/Number of Tankers are editable at
 *   ASSESSED/REOPENED.
 * - The Location group (Municipality/Zone·Area/Onwani-or-Location) is
 *   editable only through ACKNOWLEDGED — a wrong address is a data
 *   correction, not a pipeline action, but once an inspector has acted on a
 *   location it becomes their view-only record of where they went.
 *
 * Lives HERE, not in `@fams/v5-templates`, because it is `incidents/
 * incident` business vocabulary — field ids, stage keys, the inspector
 * roster, the tanker-allocation → Plan Monitoring hand-off. The DS package
 * only supplies the generic seam this plugs into
 * (`V5ModuleSurfaceProps.wrapFieldValue`, `TaskDetail`'s per-field value
 * wrapper) — see that fams-design-system commit. All popup chrome/controls
 * below compose `@fams/ui-kit` primitives/composites only (`InlineEditField`,
 * `PickerList`, `Input`, `Button`, `InsetField`, `IconSelect`,
 * `RadioGroup`) — no hand-rolled markup (root CLAUDE.md rule zero).
 *
 * OPERATING FLOW made first-class here (user's own words, task brief
 * 2026-08-31): complaint comes in → office staff inline-edits Assigned
 * Inspector (stage-appropriate) → once the inspector has verified onsite and
 * the ticket reaches ASSESSED (or REOPENED), office staff inline-edits
 * Tanker assigned (1+ tankers via Number of Tankers + Driver assigned) →
 * picking the tanker both moves the ticket to TANKER ASSIGNED and
 * auto-creates a same-day task in Plan Monitoring
 * (`plan-monitoring/daily-plan`, an FPL record), shared with the driver.
 *
 * APPROXIMATION (logged per the task brief's demo-grade note): there is no
 * declarative "on transition, create a record in another module" mechanism
 * anywhere in the composer/rules engine (`@fams/v5-composer/src/rules.ts` is
 * a pure permission evaluator, no side-effect executor). The auto-create
 * below is real (write-through to the SAME MSW/demo-kit store every other
 * mutation uses, via `createDailyPlan`), wired in app code (`boot.ts` → this
 * file), not expressed as blueprint metadata. A future platform iteration
 * that adds cross-module effects as metadata should replace this file's
 * `pickTanker` body, not the seam it plugs into. Multi-tanker allocation is
 * approximated as a primary Tanker reference + a "Number of Tankers" count
 * (no per-plate multi-picker) — matches the FM-6273 field catalogue
 * exactly (no "Additional Tankers" field exists in that catalogue).
 */

/**
 * FM-6273 field-editability matrix, office/dispatcher column:
 * - Intake data (Type/Category/Sub-type/Source/Source ref/Customer/
 *   Description) and inspector re-assignment: every NON-FINAL status.
 * - Location group (Onwani/location/municipality/zone): editable only
 *   through ACKNOWLEDGED — ASSESSED/REOPENED belong to the Inspector,
 *   later view-only.
 * - Priority (the flag field) is dispatcher-editable in any non-final
 *   status (product direction 2026-09-02, superseding the earlier
 *   Inspector-owned view-only stance) — edited via the same dropdown
 *   quick-edit as the other enum fields, options from `fld_inc_severity`'s
 *   own listValues.
 */
const OFFICE_EDIT_STAGES = new Set(['intake', 'triage', 'acknowledged', 'assessed', 'tanker-assigned', 'reopened'])
const OFFICE_LOCATION_STAGES = new Set(['intake', 'triage', 'acknowledged'])
const TANKER_STAGES = new Set(['assessed', 'reopened'])

/** Enum fields the office edits via the DS dropdown anatomy (options = the field's own blueprint listValues). */
const OFFICE_ENUM_FIELDS: Record<string, { fieldId: string; label: string }> = {
  systemcol14: { fieldId: 'fld_inc_type', label: 'Request Type' },
  systemcol15: { fieldId: 'fld_inc_category', label: 'Category' },
  subtype: { fieldId: 'fld_inc_subtype', label: 'Sub-type' },
  systemcol8: { fieldId: 'fld_inc_source', label: 'Source' },
  systemcol2: { fieldId: 'fld_inc_severity', label: 'Priority' },
}

/** Plain-text fields the office edits inline. */
const OFFICE_TEXT_FIELDS: Record<string, string> = {
  systemcol16: 'Source Reference / External ID',
  cust_name: 'Customer Name',
  cust_contact: 'Customer Phone',
  systemcol6: 'Complaint Description',
}

interface VehicleRecord {
  id: string
  title?: string
  plate?: string
  driver?: string
  vehicleType?: string
}

export interface IncidentsAssignmentDeps {
  /** Live tanker roster — `live-monitoring/vehicle` records (read-only, resolved once per popup open). */
  listVehicles: () => EntityRecord[]
  /** Creates the daily-plan task record in `plan-monitoring/daily-plan` — write-through, same optimistic-buffer contract every other create uses. */
  createDailyPlan: (record: Record<string, unknown>) => EntityRecord | undefined
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function fplId(): string {
  return `FPL-9${String(Date.now()).slice(-3)}`
}

/** Plain single-line text quick-edit (Source Ref/Customer/Zone·Area/Location) — the `Input` + `Button` composition of the inline-edit contract. */
function TextFieldEditor({ label, initial, onSave }: { label: string; initial: string; onSave: (text: string) => void }) {
  const [text, setText] = useState(initial)
  return (
    <div className="flex flex-col gap-2">
      <span className="text-body-xs font-semibold text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <Input value={text} onChange={(e) => setText(e.target.value)} className="min-w-0 flex-1" />
        <Button type="button" size="sm" onClick={() => onSave(text.trim())}>
          Save
        </Button>
      </div>
    </div>
  )
}

/** Real function component (own hook scope) — the "text input for text" case of the inline-edit contract, for the one numeric field in the catalogue. */
function TankerCountEditor({ initial, onSave }: { initial: number; onSave: (count: number) => void }) {
  const [count, setCount] = useState(initial)
  return (
    <div className="flex flex-col gap-2">
      <span className="text-body-xs font-semibold text-muted-foreground">Number of Tankers</span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={1}
          max={5}
          value={count}
          onChange={(e) => setCount(Math.max(1, Math.min(5, Number(e.target.value) || 1)))}
          className="w-16 rounded-sm border border-border bg-card px-2 py-1 text-body-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button
          type="button"
          onClick={() => onSave(count)}
          className="rounded-sm bg-primary px-2.5 py-1 text-body-xs font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Save
        </button>
      </div>
    </div>
  )
}

/**
 * Municipality as the creation form's exact field anatomy — `InsetField`
 * shell + building glyph + bare `IconSelect` whose dropdown is anchored to
 * (and as wide as) the field box. Saves immediately on pick.
 */
function MunicipalityField({
  value,
  options,
  onSave,
  readOnly = false,
}: {
  value: string
  options: string[]
  onSave: (name: string) => void
  /** FM-6273: location group is view-only past ACKNOWLEDGED — same field shell, no dropdown. */
  readOnly?: boolean
}) {
  const fieldRef = useRef<HTMLDivElement>(null)
  if (readOnly) {
    return (
      <InsetField label="Municipality (Zone)" hasValue={value !== ''} leadingIcon={<Building2 className="size-4" aria-hidden />}>
        <span className="text-sm font-semibold text-foreground">{value || '—'}</span>
      </InsetField>
    )
  }
  return (
    <InsetField
      ref={fieldRef}
      label="Municipality (Zone)"
      hasValue={value !== ''}
      leadingIcon={<Building2 className="size-4" aria-hidden />}
    >
      <IconSelect
        ariaLabel="Municipality (Zone)"
        value={value || null}
        options={options.map((name) => ({ value: name, label: name }))}
        sectionLabel="Municipality (Zone)"
        placeholder="Select Municipality"
        bare
        popoverAnchorRef={fieldRef}
        onChange={onSave}
      />
    </InsetField>
  )
}

/**
 * The creation form's `OnwaniLocationPicker` selection logic, mirrored for
 * IN-PLACE editing in the profile's Location section: a radio toggle between
 * "Select Onwani Number" (three Zone / Street / Bldg. No fields, stored
 * joined `zone-street-bldg`) and "Add Location" (one free-text field). A
 * record carries either/or, never both — committing Onwani derives the
 * display Location line from municipality + segments (what the list column
 * shows), and committing a free Location clears the Onwani number.
 * Commits on blur, only when the value actually changed. A seed value of
 * `Pending` counts as "no Onwani yet". Text segments render as `Input bare`
 * inside `InsetField` — the DS's own "value slot accepts a bare Input"
 * contract (see `InsetField`'s docstring), never a hand-rolled `<input>`.
 */
function OnwaniOrLocationFields({
  record,
  onSave,
  readOnly = false,
}: {
  record: EntityRecord
  onSave: (patch: Record<string, unknown>) => void
  /** FM-6273: location group is view-only past ACKNOWLEDGED — radio + inputs disabled, no commits. */
  readOnly?: boolean
}) {
  const rawOnwani = String(record.systemcol12 ?? '')
  const initialOnwani = rawOnwani === 'Pending' ? '' : rawOnwani
  const initialLocation = String(record.systemcol1 ?? '')
  const [mode, setMode] = useState<'onwani' | 'location'>(initialOnwani ? 'onwani' : 'location')
  const [zone = '', street = '', bldg = ''] = initialOnwani.split('-')
  const [segs, setSegs] = useState<[string, string, string]>([zone, street, bldg])
  const [location, setLocation] = useState(initialLocation)

  const commitOnwani = () => {
    if (readOnly) return
    const joined = segs.map((part) => part.trim()).filter(Boolean).join('-')
    if (joined === initialOnwani) return
    const [z = '', s = '', b = ''] = segs.map((part) => part.trim())
    const derivedLocation = joined
      ? [String(record.municipality ?? '').trim(), [z && `Zone ${z}`, s && `Street ${s}`, b && `Bldg ${b}`].filter(Boolean).join(', ')]
          .filter(Boolean)
          .join(' — ')
      : initialLocation
    onSave({ systemcol12: joined, addr_area: z, systemcol1: derivedLocation })
    toast.success(`Onwani Number updated · ${joined || '—'}`)
  }
  const commitLocation = () => {
    if (readOnly) return
    const text = location.trim()
    if (text === initialLocation) return
    onSave({ systemcol1: text, systemcol12: '' })
    toast.success('Location updated')
  }

  const LABELS = ['Zone', 'Street', 'Bldg. No'] as const
  return (
    <div data-slot="onwani-location-inline" className="flex flex-col gap-3">
      <RadioGroup
        value={mode}
        onValueChange={readOnly ? undefined : (v) => setMode(v as 'onwani' | 'location')}
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
            <RadioGroupItem value={opt.value} disabled={readOnly} />
            {opt.label}
          </label>
        ))}
      </RadioGroup>

      {mode === 'onwani' ? (
        <div data-slot="onwani-inline-fields" className="grid grid-cols-3 gap-3">
          {LABELS.map((label, index) => (
            <InsetField key={label} label={label} hasValue={segs[index] !== ''}>
              <Input
                bare
                type="text"
                inputMode="numeric"
                aria-label={`Onwani ${label}`}
                value={segs[index]}
                disabled={readOnly}
                onChange={(e) =>
                  setSegs((prev) => {
                    const next = [...prev] as [string, string, string]
                    next[index] = e.target.value
                    return next
                  })
                }
                onBlur={commitOnwani}
              />
            </InsetField>
          ))}
        </div>
      ) : (
        <InsetField label="Location" hasValue={location !== ''}>
          <Input
            bare
            type="text"
            aria-label="Location"
            value={location}
            disabled={readOnly}
            onChange={(e) => setLocation(e.target.value)}
            onBlur={commitLocation}
          />
        </InsetField>
      )}
    </div>
  )
}

/**
 * Factory for `V5ModuleSurfaceProps.wrapFieldValue` — only reacts to
 * `incidents/incident`; every other pipeline module in every other tenant
 * renders through this same registry entry with values unchanged (returns
 * `ctx.value` unmodified for everything it doesn't recognize as editable).
 */
export function createIncidentsWrapFieldValue(deps: IncidentsAssignmentDeps) {
  return ({
    config,
    record,
    col,
    value,
    onSave,
    onTransition,
  }: {
    config: EntityConfig
    record: EntityRecord
    col: string
    value: ReactNode
    onSave: (patch: Record<string, unknown>) => void
    onTransition: (to: string) => void
  }): ReactNode => {
    if (config.code !== 'incidents/incident') return value
    const status = record.status ?? ''

    // FM-6273: enum intake fields the office edits in any non-final status —
    // hover pencil, then the DS dropdown option list.
    const enumField = OFFICE_ENUM_FIELDS[col]
    if (enumField && OFFICE_EDIT_STAGES.has(status)) {
      const listValues =
        (config.systemcolumns?.find((c) => c.id === enumField.fieldId) as { listValues?: string[] } | undefined)
          ?.listValues ?? []
      if (listValues.length) {
        return (
          <InlineEditField value={value} label={enumField.label}>
            {(close) => (
              <div className="flex flex-col gap-1">
                <span className="text-caption font-medium text-muted-foreground">{enumField.label}</span>
                <PickerList
                  options={listValues.map((name) => ({ value: name, label: name }))}
                  selected={String(record[col] ?? '')}
                  ariaLabel={enumField.label}
                  onPick={(name) => {
                    onSave({ [col]: name })
                    toast.success(`${enumField.label} updated · ${name}`)
                    close()
                  }}
                />
              </div>
            )}
          </InlineEditField>
        )
      }
    }

    // FM-6273: plain-text intake fields the office edits in any non-final status.
    if (OFFICE_TEXT_FIELDS[col] && OFFICE_EDIT_STAGES.has(status)) {
      const label = OFFICE_TEXT_FIELDS[col]
      return (
        <InlineEditField value={value} label={label}>
          {(close) => (
            <TextFieldEditor
              label={label}
              initial={String(record[col] ?? '')}
              onSave={(text) => {
                onSave({ [col]: text })
                toast.success(`${label} updated`)
                close()
              }}
            />
          )}
        </InlineEditField>
      )
    }

    // Assigned Inspector — FM-6273: the office may re-assign in any non-final status.
    if (col === 'systemcol10' && OFFICE_EDIT_STAGES.has(status)) {
      const roster =
        (config.systemcolumns?.find((c) => c.id === 'fld_inc_inspector') as { listValues?: string[] } | undefined)
          ?.listValues ?? []
      return (
        <InlineEditField value={value} label="Assigned Inspector">
          {(close) => (
            <div className="flex flex-col gap-2">
              <span className="text-body-xs font-semibold text-muted-foreground">Assigned Inspector</span>
              <PickerList
                options={roster.map((name) => ({
                  value: name,
                  label: (
                    <span className="flex items-center gap-2">
                      <Avatar name={name} size="xs" />
                      {name}
                    </span>
                  ),
                }))}
                onPick={(name) => {
                  onSave({ systemcol10: name })
                  toast.success(`Inspector assigned · ${name}`)
                  close()
                }}
              />
            </div>
          )}
        </InlineEditField>
      )
    }

    // Tanker assigned — ASSESSED/REOPENED only. Picking a tanker allocates
    // it, auto-fills Driver assigned from the vehicle, moves the ticket to
    // TANKER ASSIGNED, and auto-creates the Plan Monitoring daily task.
    if (col === 'systemcol7' && TANKER_STAGES.has(status)) {
      return (
        <InlineEditField value={value} label="Tanker assigned">
          {(close) => {
            const vehicles = (deps.listVehicles() as VehicleRecord[]).filter(
              (v) => (v.vehicleType ?? 'Tanker') === 'Tanker',
            )
            return (
              <div className="flex flex-col gap-2">
                <span className="text-body-xs font-semibold text-muted-foreground">Tanker assigned</span>
                <PickerList
                  options={vehicles.map((v) => ({
                    value: v.id,
                    label: `${v.title ?? v.id} · ${v.plate ?? v.id}`,
                  }))}
                  onPick={(vehicleId) => {
                    const vehicle = vehicles.find((v) => v.id === vehicleId)
                    if (!vehicle) return
                    const inspector = String(record.systemcol10 ?? '') || undefined
                    const count = Number(record.tanker_count) || 1

                    onSave({ systemcol7: vehicle.id, veh_driver: vehicle.driver })
                    onTransition('tanker-assigned')

                    const plan = deps.createDailyPlan({
                      id: fplId(),
                      uniqueidentifier: fplId(),
                      title: `${record.title ?? record.uniqueidentifier ?? 'Request'} — TANKER RESPONSE`,
                      systemcol1: '',
                      systemcol2: String(record.systemcol1 ?? record.municipality ?? '—'),
                      systemcol3: record.municipality,
                      systemcol4: vehicle.plate ?? vehicle.title ?? vehicle.id,
                      systemcol5: vehicle.driver,
                      systemcol6: inspector,
                      systemcol7: 'Morning',
                      systemcol8: '08:00',
                      systemcol9: '16:00',
                      status: 'Scheduled',
                      systemcol10: 0,
                      systemcol11: 6,
                      systemcol12: 0,
                      systemcol13: 0,
                      lat: record.lat,
                      lng: record.lng,
                      plan_date: todayIso(),
                      source_request: record.id,
                    })

                    if (plan) {
                      onSave({ linked_daily_plan: plan.id })
                      toast.success(
                        `Tanker + driver allocated · Task ${plan.uniqueidentifier ?? plan.id} created in Plan Monitoring`,
                        { description: `${vehicle.plate ?? vehicle.id}${count > 1 ? ` · ${count} tankers` : ''} · Driver ${vehicle.driver ?? '—'}` },
                      )
                    } else {
                      toast.success(`Tanker allocated · ${vehicle.plate ?? vehicle.id}`)
                    }
                    close()
                  }}
                />
              </div>
            )
          }}
        </InlineEditField>
      )
    }

    // Driver assigned — ASSESSED/REOPENED only. Independently editable
    // (usually auto-filled by the Tanker pick above, but a dispatcher can
    // override — e.g. a relief driver on the same tanker).
    if (col === 'veh_driver' && TANKER_STAGES.has(status)) {
      return (
        <InlineEditField value={value} label="Driver assigned">
          {(close) => {
            const vehicles = deps.listVehicles() as VehicleRecord[]
            const drivers = Array.from(new Set(vehicles.map((v) => v.driver).filter((d): d is string => Boolean(d))))
            return (
              <div className="flex flex-col gap-2">
                <span className="text-body-xs font-semibold text-muted-foreground">Driver assigned</span>
                <PickerList
                  options={drivers.map((name) => ({
                    value: name,
                    label: (
                      <span className="flex items-center gap-2">
                        <Avatar name={name} size="xs" />
                        {name}
                      </span>
                    ),
                  }))}
                  onPick={(name) => {
                    onSave({ veh_driver: name })
                    toast.success(`Driver assigned · ${name}`)
                    close()
                  }}
                />
              </div>
            )
          }}
        </InlineEditField>
      )
    }

    // Number of Tankers — ASSESSED/REOPENED only. Plain numeric quick-edit
    // (the "text input for text" case of the inline-edit contract).
    if (col === 'tanker_count' && TANKER_STAGES.has(status)) {
      return (
        <InlineEditField value={value} label="Number of Tankers">
          {(close) => (
            <TankerCountEditor
              initial={Number(record.tanker_count) || 1}
              onSave={(count) => {
                onSave({ tanker_count: count })
                toast.success(`Number of Tankers updated · ${count}`)
                close()
              }}
            />
          )}
        </InlineEditField>
      )
    }

    // ── Location group (profile "Location" section tiles) — editable only
    // through ACKNOWLEDGED (FM-6273): a wrong address is a data correction,
    // but once an inspector has acted on a location it becomes their
    // view-only record of where they went.

    // Municipality — the creation form's own field anatomy (InsetField shell,
    // building glyph, full-width IconSelect dropdown), edited in place.
    if (col === 'municipality') {
      const municipalities =
        (config.systemcolumns?.find((c) => c.id === 'fld_inc_municipality') as { listValues?: string[] } | undefined)
          ?.listValues ?? []
      return (
        <MunicipalityField
          value={String(record.municipality ?? '')}
          options={municipalities}
          readOnly={!OFFICE_LOCATION_STAGES.has(status)}
          onSave={(name) => {
            onSave({ municipality: name })
            toast.success(`Municipality updated · ${name}`)
          }}
        />
      )
    }

    // Zone/Area and the free-text Location line — plain text quick-edits.
    if ((col === 'addr_area' || col === 'systemcol1') && OFFICE_LOCATION_STAGES.has(status)) {
      const label = col === 'addr_area' ? 'Zone/Area' : 'Location'
      return (
        <InlineEditField value={value} label={label}>
          {(close) => (
            <TextFieldEditor
              label={label}
              initial={String(record[col] ?? '')}
              onSave={(text) => {
                onSave({ [col]: text })
                toast.success(`${label} updated`)
                close()
              }}
            />
          )}
        </InlineEditField>
      )
    }

    // Onwani Number OR free Location — the creation form's full
    // `OnwaniLocationPicker` selection logic (radio between "Select Onwani
    // Number" and "Add Location"), mirrored in the profile's Location
    // section. A record carries EITHER an Onwani number OR a location, never
    // both — committing in one mode clears/derives the other accordingly.
    if (col === 'systemcol12') {
      return (
        <OnwaniOrLocationFields
          key={`${String(record.systemcol12 ?? '')}|${String(record.systemcol1 ?? '')}`}
          record={record}
          readOnly={!OFFICE_LOCATION_STAGES.has(status)}
          onSave={onSave}
        />
      )
    }

    return value
  }
}

/**
 * `V5ModuleSurfaceProps.recordTypeOf` implementation — the detail sheet's
 * id-adjacent type chip (2026-08-31 coordinator fix): the chip previously
 * always read the static, module-level entity noun ("INCIDENT") — this
 * makes it read the RECORD's own Type field instead (Request vs Complaint),
 * each with its own icon, so the at-a-glance chip actually distinguishes
 * the two intake kinds FM-6228 defines.
 */
export function createIncidentsRecordTypeOf() {
  return (record: EntityRecord, config: EntityConfig): { label: ReactNode; icon?: ReactNode } | undefined => {
    if (config.code !== 'incidents/incident') return undefined
    const type = String(record.systemcol14 ?? '')
    if (type === 'Request') return { label: 'REQUEST', icon: <Send aria-hidden className="size-4" /> }
    if (type === 'Complaint') return { label: 'COMPLAINT', icon: <AlertOctagon aria-hidden className="size-4" /> }
    return undefined
  }
}
