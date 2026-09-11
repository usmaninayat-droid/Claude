import { useMemo, useRef, useState, type ReactNode } from 'react'
import { ActivityFeed, ImageGallery, Input, type ActivityFeedAttachment, type ActivityFeedEntry, type ImageGalleryImage } from '@fams/ui-kit'
import { Filter, Flag, Pencil, Plus, Search } from '@fams/ui-kit/icons'
import type { EntityRecord } from '@fams/v5-composer'
import { cn } from '../../lib/cn'

/**
 * ActivityCommentFeed — the generalized mixed system-log + @mention-comment
 * timeline with a composer (SPEC `task-detail-29-42895` §1.5/§2.14,
 * qa/UX-NOTES.md AC-5.4..5.6). [tier-2 pattern]
 *
 * A thin, metadata-driven wrapper over `@fams/ui-kit`'s `ActivityFeed`
 * composite (reuse, never a second feed implementation): this layer owns
 * exactly the parts the composite deliberately leaves to its caller —
 * ordering (newest-first, AC-5.4), day grouping (`Today` vs `28 Dec, 2024`),
 * @mention highlighting (primary-token semibold, SPEC §1.5), the
 * "accent only the comment that @-mentions the current user" rule, the
 * icon-in-circle system rows, and the optimistic composer + staged-attachment
 * flow (AC-5.6). No module vocabulary lives here (root rule 10): the feed
 * entries come from a RECORD FIELD the blueprint names, and the current
 * user's mention handle comes from `component.props` — both authored
 * metadata.
 *
 * Seed entry shape (the `field` array's rows — application data, validated
 * loosely so a partial row degrades instead of crashing):
 *   { id?, kind: 'log' | 'comment', actor, text, at (ISO datetime),
 *     icon?: 'added' | 'updated', attachments?: [{ name, size? }] }
 *
 * Composer posts are OPTIMISTIC and local (Rule 8 — no fetching/storing):
 * the demo's in-memory store never round-trips them; a real app wanting
 * persistence swaps in its own tab renderer.
 *
 * CANONICAL — this component was consolidated (round 2026-08-31, §3a) from
 * two copies that existed side by side while `parity/tanker-detail-sheet`
 * and `cycle/2026-08-31-frms-parity-batch` were separate branches: this
 * file (originally task-detail's own, SPEC-driven) is the one that
 * survived; the tanker-detail-sheet branch's mirror
 * (`entity-profile/ActivityCommentFeed.tsx`, built before this branch's
 * WP5 commit was visible to it) added the `search` toolbar below — folded
 * in here, mirror deleted, tanker-detail's Timeline tab now imports this
 * file directly.
 */
export interface ActivityCommentFeedProps {
  record?: EntityRecord
  /** The record field carrying the feed entries array. */
  field: string
  /** The current user's display name — drives the "@mentions you" accent rule and authors optimistic posts. */
  currentUser?: string
  placeholder?: string
  emptyLabel?: string
  /**
   * Shows a "Search timeline" toolbar above the feed (the tanker-detail
   * Timeline frame's search+filter row) that filters entries client-side by
   * author/text substring — the same local-UI-state convention
   * `RecordTable`'s own `search` prop already uses. Default `false`.
   */
  search?: boolean
  searchPlaceholder?: string
  className?: string
  /**
   * Feed ordering. Defaults to `'newest-first'` (AC-5.4) — other consumers
   * (e.g. the tanker-detail Timeline tab) depend on that default and keep it
   * unchanged. Pass `'oldest-first'` for a Figma-specified reverse-
   * chronological read (e.g. Incident Task Detail's Timeline): the oldest
   * entry (and date group) reads first, and a newly-posted comment appends
   * at the bottom instead of inserting at the top.
   */
  order?: 'newest-first' | 'oldest-first'
  /**
   * Persistence seam for the composer: called with the seed-shaped entry a
   * post produces. When wired, the post is NOT kept as local state — the
   * caller is expected to write it into the record's feed field, and the feed
   * re-derives from that field (single source of truth). Omitted → posts stay
   * optimistic local state, exactly as before this seam existed.
   */
  onPost?: (entry: {
    id: string
    kind: 'comment'
    actor: string
    text: string
    at: string
    attachments?: { name: string; size?: string }[]
  }) => void
}

interface SeedEntry {
  id?: string
  kind?: string
  actor?: string
  /** Log rows may carry `**bold**` value emphasis (e.g. `"added due date **24 May, 2025**"`). */
  text?: string
  at?: string
  icon?: string
  /** Comment rows only: the author's photo avatar; omitted rows fall back to the composite's initials avatar. */
  avatar?: string
  attachments?: { name?: string; size?: string }[]
  /** The note text this entry recorded (e.g. the assessment notes) — rendered in a card under the row. */
  note?: string
  /** The photos this entry uploaded — rendered as thumbnails under the row (click opens the shared lightbox). */
  images?: { src?: string; alt?: string; takenAt?: string; location?: string }[]
  /**
   * Log rows only: a trailing severity token — flag glyph + bold tonal label
   * (the reference's "changed severity to ⚑ CRITICAL"). `tone` resolves
   * through the closed semantic set below, never a raw hex.
   */
  severity?: { label?: string; tone?: string }
}

/**
 * Closed tone → text token map for the severity flag (root policy 1: tokens
 * only). `danger`/`warning` deliberately do NOT use the bare `text-destructive`
 * (error.500, 3.76:1 on white) / `text-warning` (#f79009, 2.35:1) — both are
 * FILL/icon tokens, and this map colours READABLE bold-uppercase text (the
 * flag glyph AND the label share one class, exactly `FlagToneDateView`'s
 * icon+text pattern in `@fams/v5-composer`) — WCAG AA needs 4.5:1. Fix7
 * (job-orders contrast sweep): overridden to the same accessible TEXT aliases
 * that fix uses — `text-destructive-emphasis` (error.600, 4.83:1 on white)
 * and `@fams/tokens`' new `text-warning-text` (warning-scale.700 light /
 * warning-scale.400 dark, 5.43:1 / 7.99:1). `success`/`info`/`neutral` are
 * unchanged — out of this sweep's named scope (`text-destructive`/
 * `text-warning` only) and not currently exercised by any seeded severity row.
 */
const SEVERITY_TONE_TEXT: Record<string, string> = {
  danger: 'text-destructive-emphasis',
  warning: 'text-warning-text',
  success: 'text-success',
  info: 'text-info',
  neutral: 'text-foreground',
}

const MENTION_PATTERN = /(@[\w'-]+(?:\s?[A-Z][\w'-]+)?)/g

/**
 * Rich body for a log row that carries content (the reference's "note text +
 * photo thumbnails under the entry" card): the note in a bordered card, the
 * photos as a thumbnail strip. Renders nothing when the entry has neither.
 */
function renderLogBody(note?: string, images?: SeedEntry['images']): ReactNode {
  const thumbs: ImageGalleryImage[] = (images ?? [])
    .filter((img) => Boolean(img?.src))
    .map((img) => ({ src: img.src as string, alt: img.alt ?? 'Uploaded photo', takenAt: img.takenAt, location: img.location }))
  if (!note && !thumbs.length) return undefined
  return (
    <div
      data-slot="activity-log-media"
      className="flex flex-col gap-2 rounded-md border border-border bg-card p-2.5"
    >
      {note ? <p className="text-body-sm text-foreground">{note}</p> : null}
      {/* The SAME lightbox every gallery in the product opens — click a
          thumbnail to enlarge, with the date/location stamp overlay. */}
      {thumbs.length ? <ImageGallery images={thumbs} size="sm" /> : null}
    </div>
  )
}

/** Renders `@Name` tokens in primary semibold (SPEC §1.5's maroon mentions — always the token, never a hex). */
export function renderMentions(text: string): ReactNode {
  const parts = text.split(MENTION_PATTERN)
  if (parts.length === 1) return text
  return parts.map((part, index) =>
    part.startsWith('@') ? (
      <span key={index} data-slot="activity-mention" className="font-semibold text-primary">
        {part}
      </span>
    ) : (
      part
    ),
  )
}

/** Whether `text` @-mentions `user` ("Zayd Al-Farsi" matches `@ZaydAl-Farsi` and `@Zayd`). */
export function mentionsUser(text: string, user: string | undefined): boolean {
  if (!user) return false
  const collapsed = user.replace(/\s+/g, '').toLowerCase()
  const first = user.split(/\s+/)[0]?.toLowerCase()
  const found = text.match(MENTION_PATTERN) ?? []
  return found.some((mention) => {
    const handle = mention.slice(1).replace(/\s+/g, '').toLowerCase()
    return handle === collapsed || handle === first
  })
}

/**
 * Renders a system-log row's text: `**bold**` spans become semibold
 * foreground value emphasis, and a trailing `severity` token renders as a
 * flag glyph + bold tonal label ("changed severity to ⚑ CRITICAL").
 */
export function renderLogText(text: string, severity?: SeedEntry['severity']): ReactNode {
  const parts = text.split(/\*\*([^*]+)\*\*/g)
  const body =
    parts.length === 1
      ? text
      : parts.map((part, index) =>
          index % 2 === 1 ? (
            <span key={index} data-slot="activity-log-value" className="font-semibold text-foreground">
              {part}
            </span>
          ) : (
            part
          ),
        )
  if (!severity?.label) return body
  return (
    <>
      {body}{' '}
      <span
        data-slot="activity-log-severity"
        className={cn(
          'inline-flex items-center gap-1 align-baseline font-semibold uppercase tracking-wide',
          SEVERITY_TONE_TEXT[severity.tone ?? 'neutral'] ?? SEVERITY_TONE_TEXT.neutral,
        )}
      >
        <Flag aria-hidden="true" className="size-3.5 shrink-0" />
        {severity.label}
      </span>
    </>
  )
}

// "18 May, 2025" (comma after the month — the reference separator chips) and
// "9:49 am" timestamps.
const DATE_GROUP_FORMAT = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' })
const YEAR_FORMAT = new Intl.DateTimeFormat('en-GB', { year: 'numeric' })
const TIME_FORMAT = new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true })

/** One combined feed row: the renderable `ActivityFeedEntry` plus the raw plaintext used for search matching (mentions are already resolved to JSX in `entry.text` by the time it reaches here). */
interface SearchableEntry {
  entry: ActivityFeedEntry
  raw: string
}

function dateGroupOf(at: string | undefined, now: Date): string {
  if (!at) return 'Earlier'
  const date = new Date(at)
  if (Number.isNaN(date.getTime())) return 'Earlier'
  return date.toDateString() === now.toDateString()
    ? 'Today'
    : `${DATE_GROUP_FORMAT.format(date)}, ${YEAR_FORMAT.format(date)}`
}

export function ActivityCommentFeed({
  record,
  field,
  currentUser,
  placeholder = 'Write a comment here…',
  emptyLabel = 'No activity yet — updates and comments will appear here.',
  search = false,
  searchPlaceholder = 'Search timeline',
  className,
  order = 'newest-first',
  onPost,
}: ActivityCommentFeedProps) {
  const [posted, setPosted] = useState<SearchableEntry[]>([])
  const [staged, setStaged] = useState<ActivityFeedAttachment[]>([])
  const [query, setQuery] = useState('')
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const now = useMemo(() => new Date(), [])
  const oldestFirst = order === 'oldest-first'

  // Keyed off the FIELD VALUE, not the record object: `onPost` persistence
  // replaces the array on a record the host mutates in place, so the record's
  // identity is stable while the feed's backing array is new.
  const rawField = record?.[field]
  const seeded = useMemo<SearchableEntry[]>(() => {
    const raw = rawField
    if (!Array.isArray(raw)) return []
    const rows = (raw as SeedEntry[]).filter((row) => row && (row.text || row.actor))
    // Newest-first by default (AC-5.4): Today's group above older dates,
    // newest row first within each group. `oldestFirst` reverses the same
    // comparator rather than sorting-then-reversing, so date-group boundaries
    // stay put and only the intra-group order flips.
    const sorted = [...rows].sort((a, b) =>
      oldestFirst ? String(a.at ?? '').localeCompare(String(b.at ?? '')) : String(b.at ?? '').localeCompare(String(a.at ?? '')),
    )
    return sorted.map((row, index) => {
      const isComment = row.kind === 'comment'
      const text = row.text ?? ''
      return {
        raw: `${row.actor ?? ''} ${text}`,
        entry: {
          id: row.id ?? `seed-${index}`,
          kind: isComment ? 'comment' : 'system',
          author: row.actor,
          avatar: isComment ? row.avatar : undefined,
          text: isComment ? renderMentions(text) : renderLogText(text, row.severity),
          timestamp:
            row.at && !Number.isNaN(new Date(row.at).getTime()) ? TIME_FORMAT.format(new Date(row.at)) : undefined,
          dateGroup: dateGroupOf(row.at, now),
          // Accent ONLY the comment that @-mentions the current user (AC
          // ruling on SPEC §1.5's single accented card).
          accented: isComment ? mentionsUser(text, currentUser) : undefined,
          icon: isComment ? undefined : row.icon === 'added' ? <Plus /> : <Pencil />,
          attachments: row.attachments?.filter((a): a is ActivityFeedAttachment => Boolean(a?.name)),
          body: isComment ? undefined : renderLogBody(row.note, row.images),
        },
      }
    })
  }, [rawField, currentUser, now, oldestFirst])

  // Optimistic posts insert at the very top of `Today` in the default
  // newest-first order (AC-5.4); in `oldest-first` mode a new post is the
  // most recent thing that happened, so it appends at the very bottom instead.
  const combined = useMemo(
    () => (oldestFirst ? [...seeded, ...posted] : [...posted, ...seeded]),
    [posted, seeded, oldestFirst],
  )
  const visible = useMemo(() => {
    if (!search) return combined
    const needle = query.trim().toLowerCase()
    if (!needle) return combined
    return combined.filter((row) => row.raw.toLowerCase().includes(needle))
  }, [combined, query, search])
  const entries = useMemo(() => visible.map((row) => row.entry), [visible])

  const post = (text: string) => {
    // Persistence-first: with a wired `onPost` the entry is written into the
    // record's feed field and re-derived from there — no shadow local copy,
    // so it survives reopening the detail and shows on every consumer.
    if (onPost) {
      onPost({
        id: `posted-${Date.now()}`,
        kind: 'comment',
        actor: currentUser ?? 'You',
        text,
        at: new Date().toISOString(),
        attachments: staged.length ? staged.map((a) => ({ name: a.name, size: a.size })) : undefined,
      })
      setStaged([])
      return
    }
    setPosted((prev) => {
      const row = {
        raw: `${currentUser ?? 'You'} ${text}`,
        entry: {
          id: `posted-${Date.now()}-${prev.length}`,
          kind: 'comment' as const,
          author: currentUser ?? 'You',
          text: renderMentions(text),
          timestamp: TIME_FORMAT.format(new Date()),
          dateGroup: 'Today',
          accented: mentionsUser(text, currentUser),
          attachments: staged.length ? staged : undefined,
        },
      }
      // Keep the posted block in the SAME direction as the feed: newest-first
      // prepends (AC-5.4), oldest-first appends so successive posts read
      // downwards instead of stacking backwards above the composer.
      return oldestFirst ? [...prev, row] : [row, ...prev]
    })
    setStaged([])
  }

  return (
    <div data-slot="activity-comment-feed" className={cn('flex h-full min-h-0 flex-col gap-3', className)}>
      {search ? (
        <div data-slot="activity-feed-toolbar" className="flex items-center gap-3">
          <div className="relative max-w-sm flex-1">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="search"
              placeholder={searchPlaceholder}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="ps-9"
              aria-label={searchPlaceholder}
            />
          </div>
          <button
            type="button"
            aria-label="Filter"
            className="grid size-10 shrink-0 place-items-center rounded-sm border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Filter className="size-4" aria-hidden="true" />
          </button>
        </div>
      ) : null}

      <ActivityFeed
        className="min-h-0 flex-1"
        entries={entries}
        emptyLabel={emptyLabel}
        placeholder={placeholder}
        // Timeline-pane treatment (figma-spec-detail.md §9): bold uppercase
        // actor/author names, and the composer pinned to the pane's bottom
        // edge while the feed scrolls above it.
        uppercaseAuthors
        stickyComposer
        onSubmit={post}
        onAttach={() => fileInputRef.current?.click()}
        stagedAttachments={staged}
        onRemoveStagedAttachment={(name) => setStaged((prev) => prev.filter((a) => a.name !== name))}
      />
      {/* The picker itself — the staged chips above the composer are the
          AC-5.6 "removable before sending" preview. */}
      <input
        ref={fileInputRef}
        type="file"
        className="sr-only"
        aria-label="Attach a file"
        tabIndex={-1}
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) {
            setStaged((prev) =>
              prev.some((a) => a.name === file.name)
                ? prev
                : [...prev, { name: file.name, size: `${Math.max(1, Math.round(file.size / 1024))} KB` }],
            )
          }
          event.target.value = ''
        }}
      />
    </div>
  )
}

ActivityCommentFeed.displayName = 'ActivityCommentFeed'
