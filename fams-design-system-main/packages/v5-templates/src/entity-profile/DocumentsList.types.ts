import type { EntityRecord } from '@fams/v5-composer'

/**
 * The `DocumentsList` CONFIG CONTRACT. [tier-2]
 *
 * The tanker-detail Documents tab (node 31707:21825): a titled "Uploaded
 * Documents" list of bordered rows (file-type glyph, document type name,
 * expiry-date caption) with an end-aligned "Upload Document" action link.
 * FIELD-KEY INDIRECTED (root `CLAUDE.md` rule 10) — no module vocabulary
 * lives here.
 */
export interface DocumentsListRow {
  id?: string
  /** Document type / display name, e.g. "Registration Certificate". */
  name: string
  /** Pre-formatted expiry date, e.g. "12 Apr, 2026". */
  expiryDate?: string
  /** File extension driving the glyph tint (e.g. `"pdf"`, `"doc"`, `"jpg"`). Unrecognized/omitted falls back to a generic file glyph. */
  fileType?: string
}

export interface DocumentsListStrings {
  title: string
  uploadLabel: string
  emptyLabel: string
  expiryPrefix: string
}

export interface DocumentsListProps {
  record?: EntityRecord | undefined
  /** `record[field]` — `DocumentsListRow[]`. */
  field: string
  strings?: Partial<DocumentsListStrings>
  className?: string
}
