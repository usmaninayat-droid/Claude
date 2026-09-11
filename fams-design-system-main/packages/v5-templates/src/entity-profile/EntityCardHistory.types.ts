import type { EntityRecord } from '@fams/v5-composer'
import type { RecordTableColumn } from './RecordTable'

/**
 * The `EntityCardHistory` CONFIG CONTRACT. [tier-2]
 *
 * A generic "linked-record info card + History table" tab — the tanker-detail
 * Devices tab (node 30267:65152, a "Tracker" device card) and Workforce tab
 * (node 30268:99947, a driver/person card) share this exact anatomy: a
 * section header (title + an end-aligned "link another record" action), a
 * photo/icon + two-column key/value info card, then a titled "History" table
 * of previously-linked records. Same FIELD-KEY INDIRECTION discipline as
 * every other entity-profile composite (root `CLAUDE.md` rule 10) — nothing
 * here says "device" or "driver", only the blueprint config that instantiates
 * it does, so a later Weather Stations detail sheet can reuse this component
 * for its own linked-sensor/linked-technician tabs.
 */

/** One key/value row in the info card. `column` places it in the card's start or end stack (omit for a single-column card, e.g. Devices). */
export interface EntityCardField {
  label: string
  /** `record[field]` — the row's value. */
  field: string
  column?: 'start' | 'end'
  /**
   * `'avatar'` renders the value as a small initials `Avatar` + the name — the
   * reference card's "Manager" row. Omit for the default plain-text value.
   */
  render?: 'text' | 'avatar'
}

export interface EntityCardHistoryStrings {
  actionLabel: string
  historyTitle: string
  searchPlaceholder: string
}

export interface EntityCardHistoryProps {
  record?: EntityRecord | undefined
  /** The section's own heading, e.g. "Device Info" / "Workforce Info". */
  sectionTitle: string
  /** End-aligned header action button, e.g. "+ Link Asset" (decorative — no `onClick` is expressible from JSON config, same convention as `RecordTable`'s `timeframeSelect` affordance). Omit for none. */
  actionLabel?: string
  /** `record[imageField]` — the card's photo. Falls back to `icon` when absent. */
  imageField?: string
  /** Named fallback glyph shown when no `imageField`/image value is present. */
  icon?: string
  /**
   * `record[artField]` — a WORKFORCE ART KEY (`'on-duty'`, `'in-transit'`,
   * `'clocked-in'`, `'on-break'`, `'not-clocked-in'`) rendering the same
   * vendored person illustration the Live map popup and the identity rail
   * already use, instead of the generic `icon` glyph. Loses to `imageField`
   * (a real photo always wins), wins over `icon`. A missing/unrecognised
   * value falls through to `icon` — same "degrade, never crash" contract as
   * every other named lookup here.
   */
  artField?: string
  /** Fixed card title (e.g. "Tracker") — wins over `titleField` when both are given. */
  title?: string
  /** `record[titleField]` — a record-driven card title (e.g. the linked driver's name). */
  titleField?: string
  /** Prefix rendered before the subtitle value, e.g. `"IMEI#"` / `"ID#"`. */
  subtitlePrefix?: string
  /** `record[subtitleField]` — the card's subtitle value. */
  subtitleField?: string
  fields: EntityCardField[]
  /** `record[historyField]` — the History table's row array. */
  historyField: string
  historyColumns: RecordTableColumn[]
  strings?: Partial<EntityCardHistoryStrings>
  className?: string
}
