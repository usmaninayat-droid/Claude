import { File, FileImage, FileSpreadsheet, FileText, Link2, type LucideIcon } from '@fams/ui-kit/icons'
import type { EntityRecord } from '@fams/v5-composer'
import { ViewEmptyState } from '../ViewEmptyState'

/**
 * RecordListTab — ONE generic, metadata-driven body for a right-panel tab
 * that lists a record's own array field: its attachments, its linked
 * records, or anything else a blueprint points it at. [tier-2 internal]
 *
 * There is deliberately no `Attachments` component and no `Linked` component
 * — they are the SAME list of rows with a different icon and different empty
 * copy, and shipping two near-identical files is how the third and fourth
 * copies get written. A blueprint picks a flavour through
 * `component.props`, never through a component name that hardcodes a
 * module's vocabulary (root rule 10):
 *
 * ```json
 * { "key": "attachments", "title": "Attachments", "order": 4,
 *   "component": { "name": "RecordList",
 *                  "props": { "field": "attachments", "variant": "file" } } }
 * ```
 *
 * NOTHING here is pipeline-specific. `field` is the record key to read,
 * `variant` picks the row glyph, and the empty state's copy comes from the
 * blueprint (or a neutral default). A module that has no such field yet
 * still gets a REAL empty state rather than a dead tab — the tab is a
 * contract slot whose data seam arrives later, and saying so out loud is the
 * honest rendering of that.
 */

/** How a row is illustrated. `file` derives its glyph per MIME type; `link` is a flat link glyph. */
export type RecordListVariant = 'file' | 'link'

/**
 * One row. Every key is optional so the SAME renderer reads a file entry
 * (`name`/`mimeType`) and a linked-record entry (`label`/`type`) without the
 * blueprint having to reshape its data to suit the component.
 */
interface RecordListEntry {
  id?: string
  name?: string
  label?: string
  title?: string
  mimeType?: string
  type?: string
  description?: string
  href?: string
}

export interface RecordListTabProps {
  /** Record key holding the array to list — e.g. `'attachments'`, `'linked'`. */
  field: string
  record?: EntityRecord
  variant?: RecordListVariant
  /** Empty-state heading when the field is absent or empty. */
  emptyTitle?: string
  /** Empty-state body copy. */
  emptyDescription?: string
}

/**
 * MIME → glyph. Kept to broad families (image / spreadsheet / document)
 * because a per-extension table is a maintenance sink that adds nothing a
 * user can act on — the file NAME already carries the specific type.
 */
function glyphFor(variant: RecordListVariant, mimeType?: string): LucideIcon {
  if (variant === 'link') return Link2
  if (!mimeType) return File
  if (mimeType.startsWith('image/')) return FileImage
  if (mimeType.includes('sheet') || mimeType.includes('csv') || mimeType.includes('excel')) return FileSpreadsheet
  if (mimeType.startsWith('text/') || mimeType.includes('pdf') || mimeType.includes('word')) return FileText
  return File
}

/** The row's primary text, in the order a caller's data is most likely to carry it. */
function primaryText(entry: RecordListEntry, index: number): string {
  return entry.name ?? entry.label ?? entry.title ?? entry.id ?? `Item ${index + 1}`
}

/** The row's muted secondary line — the entry's own type/description, never invented. */
function secondaryText(entry: RecordListEntry): string | undefined {
  return entry.description ?? entry.type ?? entry.mimeType ?? undefined
}

export function RecordListTab({
  field,
  record,
  variant = 'link',
  emptyTitle,
  emptyDescription,
}: RecordListTabProps) {
  const raw = record?.[field]
  const entries: RecordListEntry[] = Array.isArray(raw) ? (raw as RecordListEntry[]) : []

  if (entries.length === 0) {
    return (
      <ViewEmptyState
        title={emptyTitle ?? 'Nothing here yet'}
        description={
          emptyDescription ??
          (variant === 'file'
            ? 'No files have been added to this record.'
            : 'Nothing has been linked to this record.')
        }
      />
    )
  }

  return (
    <ul data-slot="record-list" className="flex flex-col gap-2">
      {entries.map((entry, index) => {
        const Glyph = glyphFor(variant, entry.mimeType)
        const primary = primaryText(entry, index)
        const secondary = secondaryText(entry)
        return (
          <li
            key={entry.id ?? `${field}-${index}`}
            data-slot="record-list-item"
            className="flex min-w-0 items-center gap-3 rounded-sm border border-border bg-card px-3 py-2"
          >
            <Glyph className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="flex min-w-0 flex-col">
              {/* The row is a link only when the DATA carries one — a row
                  rendered as a link that navigates nowhere is worse than a
                  row that is plainly not clickable. */}
              {entry.href ? (
                <a
                  href={entry.href}
                  className="truncate text-body-sm font-medium text-foreground underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {primary}
                </a>
              ) : (
                <span className="truncate text-body-sm font-medium text-foreground">{primary}</span>
              )}
              {secondary ? (
                <span className="truncate text-caption text-muted-foreground">{secondary}</span>
              ) : null}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

RecordListTab.displayName = 'RecordListTab'
