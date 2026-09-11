import { useMemo, useState, type ReactNode } from 'react'
import { Badge, Button, DetailSection, FieldGrid, Label, type BadgeVariant } from '@fams/ui-kit'
import { SquarePen } from '@fams/ui-kit/icons'
import {
  compileFieldSet,
  getEditWidget,
  type CompiledFieldSet,
  type EntityConfig,
  type EntityRecord,
  type FieldOptionContext,
} from '@fams/v5-composer'
import { descriptorFor } from '../views/field-cell'
import { renderCellValue } from './render-cell-value'
import { cn } from '../lib/cn'

/**
 * RecordSectionsGrid — the profile "Details" tab: a responsive 2-column grid of
 * titled cards, each a list of key/value rows, with an `Edit` affordance that
 * flips the whole pane into a form. [tier-2 pattern]
 *
 * Sibling to `ProfileSectionsPanel`, not a replacement for it: that one renders
 * whatever `deriveDetail` produced from the blueprint's own section placements,
 * this one is driven by an EXPLICIT `groups` config so a blueprint can choose
 * which fields land in which card AND which of the two columns each card sits
 * in (the frame puts "Vehicle Details" + "Performance" in the start column and
 * "Dimension" + "Weight" in the end column — a layout `deriveDetail`'s flat
 * section list cannot express).
 *
 * Generic: `groups[].fields[].field` is a field-key indirection into the record,
 * and `render` names one of a closed set of value presentations (root
 * `CLAUDE.md` rule 10 — no business vocabulary, no per-use-case booleans).
 * State-agnostic (Rule 8): the edit draft is local UI state, but SAVING is the
 * caller's — `onSave` receives the changed values and this component neither
 * persists nor re-fetches anything.
 */

/** Tone vocabulary for a `statusChip` value, mapped onto `Badge`'s own variants. */
export type RecordSectionsGridTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

const TONE_BADGE: Record<RecordSectionsGridTone, BadgeVariant> = {
  success: 'success',
  warning: 'warning',
  danger: 'destructive',
  info: 'info',
  neutral: 'secondary',
}

/**
 * How one row's value is presented. The closed set the Details frame shows:
 *
 * - `'text'` (default) — the value verbatim, em dash when empty.
 * - `'statusChip'` — a solid `Badge`, tinted via `toneMap` (the frame's green
 *   `ACTIVE` chip on the "Vehicle Status" row).
 * - `'colorSwatch'` — the value's NAME followed by a round colour dot (the
 *   frame's "Vehicle Color — Blue ●"), the dot's fill resolved through
 *   `colorMap`; a value `colorMap` does not name gets a neutral dot, never a
 *   missing one.
 */
export type RecordSectionsGridRender = 'text' | 'statusChip' | 'colorSwatch'

export interface RecordSectionsGridField {
  /** Record key this row reads (and, in edit mode, writes). */
  field: string
  /** Row label. Defaults to the compiled field's own blueprint label, then the key. */
  label?: ReactNode
  /** See `RecordSectionsGridRender`. Default `'text'`. */
  render?: RecordSectionsGridRender
  /** `'statusChip'` only — value → tone. An unmapped value renders `'neutral'`. */
  toneMap?: Record<string, RecordSectionsGridTone>
  /** `'colorSwatch'` only — value → any CSS colour (a token `var(...)` or a blueprint-authored hex). */
  colorMap?: Record<string, string>
  /** Excludes this row from the edit form while still showing it read-only (derived/computed values). */
  readOnly?: boolean
}

export interface RecordSectionsGridGroup {
  title: ReactNode
  /** Which column this card sits in. Default `'start'`. */
  column?: 'start' | 'end'
  fields: RecordSectionsGridField[]
}

export interface RecordSectionsGridProps {
  groups: RecordSectionsGridGroup[]
  /** Module config — supplies each field's descriptor (label + type) for the edit widgets. */
  config?: EntityConfig
  record?: EntityRecord
  /**
   * Shows the top-end `Edit` affordance. Requires `onSave` to do anything: with
   * `editable` but no handler there is nothing a save could reach, so the
   * control stays hidden rather than opening a form that discards its own input.
   */
  editable?: boolean
  /** Receives the edited values (changed keys only) when the user saves. */
  onSave?: (values: Record<string, unknown>) => void
  /** Injected option data for reference/select editors (Rule 8). */
  fieldContext?: FieldOptionContext
  editLabel?: ReactNode
  saveLabel?: ReactNode
  cancelLabel?: ReactNode
  className?: string
}

/** A missing value is an em dash on every row — the frame's own empty presentation. */
const EMPTY = '—'

/**
 * `'text'` (the default) resolves through {@link renderCellValue} — the SAME
 * "placement wins, then master, then type default" read path `EntityProfile`,
 * `ProfileSectionsPanel` and `KanbanCardView` already share — NOT `String(raw)`.
 *
 * Why (2026-09-06, fix9, round-10 UX gate P1-10a): `String(raw)` prints the
 * STORED value, so this grid rendered `VEH-01` / `2026-06-17` / `113452` while
 * the identity panel three inches away on the SAME sheet rendered `Tanker 01` /
 * `17 Jun, 2026` / `113,452 km` — the cycle's signature defect (a value stored
 * for the machine reaching the user beside the same datum rendered correctly),
 * and round 5's P1-T recurring on a surface the earlier fix never reached.
 * Delegating means one date formatter (`formatFigmaDate`), one reference
 * display-name resolver and one number/unit path for the whole platform, rather
 * than this component owning a second, plainer copy of each.
 *
 * `statusChip` and `colorSwatch` stay local on purpose: those are presentations
 * the CALLER asked for by name for this grid specifically, not a field's own
 * type rendering, so there is nothing to share.
 */
function renderValue(
  field: RecordSectionsGridField,
  record: EntityRecord | undefined,
  compiled: CompiledFieldSet | null,
  label: string,
): ReactNode {
  const raw = record?.[field.field]
  if (raw == null || raw === '') return EMPTY
  const text = String(raw)

  switch (field.render) {
    case 'statusChip':
      return (
        <Badge variant={TONE_BADGE[field.toneMap?.[text] ?? 'neutral']} uppercase>
          {text}
        </Badge>
      )
    case 'colorSwatch':
      return (
        <span className="inline-flex items-center gap-2">
          {text}
          <span
            aria-hidden="true"
            className="size-2.5 shrink-0 rounded-full border border-border"
            // A runtime value threaded from config, not a literal in component
            // source — the same data-driven-colour precedent `StatusPill`'s
            // `color` escape hatch documents.
            style={{ backgroundColor: field.colorMap?.[text] ?? 'var(--color-muted-foreground)' }}
          />
        </span>
      )
    default:
      return renderCellValue(compiled, record, { col: field.field, label, value: raw })
  }
}

/** Both columns are the same vertical stack — only which cards land in them differs. */
const COLUMN_CLASS = 'flex min-w-0 flex-col gap-section'

export function RecordSectionsGrid({
  groups,
  config,
  record,
  editable = false,
  onSave,
  fieldContext,
  editLabel = 'Edit',
  saveLabel = 'Save',
  cancelLabel = 'Cancel',
  className,
}: RecordSectionsGridProps) {
  const compiled = useMemo(() => (config ? compileFieldSet(config) : null), [config])
  const [draft, setDraft] = useState<Record<string, unknown> | null>(null)
  const editing = draft !== null
  const canEdit = editable && Boolean(onSave)

  const labelFor = (field: RecordSectionsGridField): ReactNode =>
    field.label ?? compiled?.byCol[field.field]?.label ?? field.field

  const startEditing = () => {
    const next: Record<string, unknown> = {}
    for (const group of groups) {
      for (const field of group.fields) {
        if (field.readOnly) continue
        next[field.field] = record?.[field.field]
      }
    }
    setDraft(next)
  }

  const save = () => {
    if (!draft) return
    // Only the keys the user actually moved — a save that echoed every field
    // back would overwrite anything changed elsewhere since the form opened.
    const changed = Object.fromEntries(
      Object.entries(draft).filter(([col, value]) => value !== record?.[col]),
    )
    onSave?.(changed)
    setDraft(null)
  }

  const renderRow = (field: RecordSectionsGridField) => {
    if (!editing || field.readOnly) {
      const readLabel = field.label ?? compiled?.byCol[field.field]?.label ?? field.field
      return {
        id: field.field,
        label: labelFor(field),
        value: renderValue(field, record, compiled, String(readLabel)),
      }
    }
    const descriptor = descriptorFor(compiled, field.field, String(field.label ?? field.field))
    const Widget = getEditWidget(descriptor.type)
    const id = `record-sections-grid-${field.field}`
    return {
      id: field.field,
      label: <Label htmlFor={id}>{labelFor(field)}</Label>,
      value: (
        <Widget
          id={id}
          descriptor={descriptor}
          value={draft?.[field.field]}
          context={fieldContext}
          onChange={(value: unknown) => setDraft((prev) => ({ ...(prev ?? {}), [field.field]: value }))}
        />
      ),
    }
  }

  const columns: Record<'start' | 'end', RecordSectionsGridGroup[]> = { start: [], end: [] }
  for (const group of groups) columns[group.column ?? 'start'].push(group)

  const renderColumn = (which: 'start' | 'end') => (
    <div className={COLUMN_CLASS}>
      {columns[which].map((group, index) => (
        <DetailSection key={`${which}-${index}`} title={group.title}>
          {/* `layout="rows"` in read mode is the frame's bordered key/value list;
              in EDIT mode the same rows host the field type's own edit widget, so
              the pane keeps its shape instead of becoming an unrelated form. */}
          <FieldGrid layout="rows" fields={group.fields.map(renderRow)} />
        </DetailSection>
      ))}
    </div>
  )

  if (!groups.length) {
    return <p className="text-body-sm text-muted-foreground">No details available.</p>
  }

  return (
    <div data-slot="record-sections-grid" className={cn('flex flex-col gap-inline', className)}>
      {canEdit ? (
        <div className="flex justify-end gap-inline">
          {editing ? (
            <>
              <Button variant="tertiary" size="sm" onClick={() => setDraft(null)}>
                {cancelLabel}
              </Button>
              <Button variant="primary" size="sm" onClick={save}>
                {saveLabel}
              </Button>
            </>
          ) : (
            // `variant="link"` — the frame's affordance is a pencil + "Edit"
            // text link above the grid, not a filled button.
            <Button variant="link" size="sm" onClick={startEditing}>
              <SquarePen aria-hidden="true" className="size-3.5" />
              {editLabel}
            </Button>
          )}
        </div>
      ) : null}

      <div className="grid items-start gap-section lg:grid-cols-2">
        {renderColumn('start')}
        {renderColumn('end')}
      </div>
    </div>
  )
}

RecordSectionsGrid.displayName = 'RecordSectionsGrid'
