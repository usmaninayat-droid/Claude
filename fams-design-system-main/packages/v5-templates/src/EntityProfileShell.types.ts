import type { ReactNode } from 'react'
import type { BadgeVariant } from '@fams/ui-kit'

/**
 * One section within an open record's body — becomes a `Tabs` value/panel
 * pair (Overview/Trips/Events, …). Content is a plain slot; the shell never
 * inspects or fetches it (Rule 8, state-agnostic).
 */
export interface EntityProfileRecordTab {
  /** Stable id — becomes the underlying `Tabs` value for this section. */
  id: string
  label: ReactNode
  /** The section body — owned entirely by the caller. */
  content: ReactNode
}

/**
 * One pinned/open record in the shell's browser-tab-style strip. The shell
 * renders exactly the records it's given, in order — opening, closing, and
 * reordering are the caller's concern (a data-fetching hook or a page-level
 * "open records" store), never this component's.
 */
export interface EntityProfileRecord {
  /**
   * Stable id — identifies this record across the pinned strip,
   * `activeRecordId`, and the shell's internal per-record tab memory (see
   * `EntityProfileShellProps.activeTabId`).
   */
  id: string
  /** Display name — shown on the pinned tab and as the record header title. */
  title: ReactNode
  /** Secondary line under the title in the record header (not shown on the pinned tab). */
  subtitle?: ReactNode
  /** Status chip — shown on the record header via `Badge`. `tone` maps directly onto `Badge`'s `variant`. */
  status?: { label: ReactNode; tone: BadgeVariant }
  /** Avatar image source. Falls back to initials derived from `title` (via `Avatar`) when omitted or when `title` isn't a plain string. */
  avatarSrc?: string
  /** This record's sections, rendered as `Tabs` in the record body. */
  tabs: EntityProfileRecordTab[]
}

export interface EntityProfileShellProps {
  open: boolean
  onOpenChange: (open: boolean) => void

  /** The set of open/pinned records, rendered as closeable tabs in the given order. */
  records: EntityProfileRecord[]
  /** Which record is currently shown in the body. Should match a `records[].id`; if it doesn't, the shell renders only the pinned strip. */
  activeRecordId: string
  /** Fires when a pinned tab is clicked, or activated via Enter/Space after arrow-key focus. The shell never reorders or removes `records` itself. */
  onActivateRecord: (id: string) => void
  /** Fires when a pinned tab's close control is clicked. The caller owns the `records` array and picks the next `activeRecordId` (e.g. the neighboring tab) — the shell only reports intent. */
  onCloseRecord: (id: string) => void

  /**
   * Controlled section-tab id for the active record only. Omit to let the
   * shell remember each record's own last-viewed section internally,
   * defaulting to that record's first tab — so flipping between pinned
   * records restores each one's own scroll/section position, the way
   * browser tabs do.
   */
  activeTabId?: string
  /** Fires when the active record's section tab changes (click or keyboard). */
  onTabChange?: (tabId: string) => void

  /**
   * Panel width preset. Wider spine than a plain `DetailSheet` (`md`/`lg`/`xl`
   * vs. `sm`/`md`/`lg`) since a multi-tab profile needs more room than a
   * single-record detail view.
   */
  width?: 'md' | 'lg' | 'xl'
  className?: string
}
