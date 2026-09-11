import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { Paperclip, Send, X, Zap } from '../icons'
import { cn } from '../lib/cn'
import { Avatar } from '../primitives/Avatar'
import { Textarea } from '../primitives/Textarea'
import { Button } from '../primitives/Button'
import { Badge, type BadgeVariant } from '../primitives/Badge'

/**
 * ActivityFeed — a single feed interleaving system events and user comments,
 * grouped by day, with an optional composer. [L3 composite]
 *
 * Two entry `kind`s share one list: `system` renders a tone-colored dot +
 * inline text (audit-log style); `comment` renders an `Avatar` + bordered
 * bubble with a `border-primary` inline-start accent rule (figma-spec-
 * detail.md §5.3 — blue, not a per-entry tone), with optional attachment
 * chips underneath. A `dateGroup` change
 * between consecutive entries inserts a centered separator — the same
 * grouping idiom `Timeline` would use, kept consistent across composites.
 * `tone` resolves to the semantic status tokens only (`bg-info`, `bg-success`,
 * …) — never a raw hex or `color-mix()` (see `docs/history/PORT-LEDGER.md` § policy 1).
 *
 * `entry.author` is either a free-text human display name (unchanged, the
 * original shape) or a declared {@link ActivityFeedSystemActor} (fix7,
 * job-orders: `{ kind: 'system', label: 'Automation' }`) — a non-human actor,
 * e.g. a rule automation, that must never be presented as a person: it gets
 * a lightning-bolt glyph instead of the tone dot / a person's avatar, on
 * either entry `kind`.
 *
 * State-agnostic (Rule 8): renders the `entries` it is given — ordering,
 * pagination, persistence, and @-mention resolution stay with the caller.
 * The composer keeps only ephemeral draft-text UI state; submitting calls
 * `onSubmit` and clears the field, nothing is fetched or stored here. Omit
 * `onSubmit` to render a read-only feed with no composer.
 *
 * @usage-v5
 *   Consolidates the mixed audit-log + comment-thread pattern hand-rolled in:
 *   - `shared/components/timeline/PipelineTimeline.vue` (751 lines) — interleaves
 *     system entries (insert/update icon + diff text) with user comments
 *     (avatar + image attachments) inside `PipelineTaskProfile.vue`.
 *   - `shared/components/timeline/CommentInput.vue` (276 lines) — the composer,
 *     a bespoke autogrow textarea + counter, reused by `AuditTrailTimeline.vue`.
 *   Forms needed: tone per system entry, avatar+text per comment, optional
 *   attachment chips, day-group separators, read-only when no composer.
 * @usage-index activity-feed
 */
export type ActivityFeedTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

export interface ActivityFeedAttachment {
  name: string
  size?: string
}

/**
 * A declared NON-HUMAN actor — an automation/rule engine, never a person —
 * as opposed to the plain-string human-author case. Fix7 (job-orders):
 * introduced so a system-driven entry (a rule automation flipping a record's
 * status, say) can be attributed honestly instead of either (a) borrowing
 * the booted persona's name, which mis-attributes a system write to a human,
 * or (b) being left with no entry at all, which the run this shipped in
 * found was the status quo. `label` is the display text (e.g. `"Automation"`)
 * — free text, not a closed enum, so a caller can name its own rule engine.
 */
export interface ActivityFeedSystemActor {
  kind: 'system'
  label: string
}

/**
 * Author identity for an entry: a free-text human display name (the
 * original, unchanged shape — every existing caller passing a bare string
 * is unaffected), or a declared {@link ActivityFeedSystemActor}. A system
 * actor renders with a distinguishing glyph (defaults to a lightning-bolt
 * icon when the entry supplies no `icon` of its own) instead of a tone dot,
 * and — on a `comment`-kind entry — a small icon tile instead of an
 * `Avatar` initials/photo, specifically so a system entry never reads as "a
 * person named Automation".
 */
export type ActivityFeedActor = string | ActivityFeedSystemActor

export interface ActivityFeedEntry {
  id: string
  kind: 'system' | 'comment'
  /** Author identity — a human display name, or a declared {@link ActivityFeedSystemActor}. Also derives the `comment` avatar's initials fallback (human authors only). */
  author?: ActivityFeedActor
  /** Avatar image source for `comment` entries. Ignored for `system` entries and for a system actor (never shown as a person's photo). */
  avatar?: string
  text: ReactNode
  timestamp?: ReactNode
  /** Closed semantic tone for `system` entries, resolved to status tokens. Defaults to `neutral`. */
  tone?: ActivityFeedTone
  /** Attachment chips rendered under a `comment` entry's bubble. */
  attachments?: ActivityFeedAttachment[]
  /** Day-group label; a new value (vs. the previous entry) inserts a date separator above this entry. */
  dateGroup?: string
  /**
   * `comment` bubbles only: whether the inline-start `border-s-primary`
   * accent rule renders. Defaults to `true` (the original unconditional
   * accent, so every ported feed is unaffected); a caller implementing the
   * task-detail spec's "only the comment that @-mentions the current user is
   * accented" rule (SPEC 29-42895 §1.5) passes `false` on the rest.
   */
  accented?: boolean
  /**
   * `system` rows only: a custom leading glyph rendered inside a 28px
   * bordered circle (SPEC 29-42895 §1.5's icon-in-circle log rows) instead
   * of the default tone dot. Omit to keep the dot (unchanged).
   */
  icon?: ReactNode
  /**
   * A solid, uppercase status chip rendered after the author name — the
   * "VALIDATED"/"SCHEDULED" action chips on a `system` entry
   * (figma-spec-detail.md §9). Resolves through the same closed tone set as
   * `tone`/the dot, never a raw hex. Renders for either `kind` — after the
   * author name on `system` rows, and after the author name (before the
   * timestamp) in a `comment` row's header — but the spec only uses it on
   * `system` rows.
   */
  badge?: { label: ReactNode; tone?: ActivityFeedTone }
  /**
   * Rich content block rendered UNDER the entry's text line — e.g. the note
   * text and photo thumbnails an "uploaded photos" log row carries. On
   * `system` rows it indents to the text column (past the icon circle); on
   * `comment` rows it renders under the bubble. Omit → nothing extra renders.
   */
  body?: ReactNode
}

export interface ActivityFeedProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onSubmit'> {
  entries: ActivityFeedEntry[]
  /** Omit to render the feed read-only — no composer is rendered. */
  onSubmit?: (text: string) => void
  placeholder?: string
  /** Shown in place of the list when `entries` is empty. */
  emptyLabel?: string
  /**
   * Presence renders a paperclip "attach a file" button in the composer row
   * (figma-spec-detail.md §5.4). Fires on click — this composite has no
   * upload flow of its own (Rule 8: no fetching/storing here); the app owns
   * whatever picker/upload UI follows. Omit to render the composer with no
   * attach affordance at all.
   */
  onAttach?: () => void
  /**
   * Renders every entry's author name in bold uppercase caps — the Timeline
   * pane's "ACTOR NAME"/comment-author treatment (figma-spec-detail.md §9).
   * Default `false` keeps the original title-case name for feeds ported
   * before this variant existed.
   */
  uppercaseAuthors?: boolean
  /**
   * Staged (not yet sent) attachment chips rendered ABOVE the composer row —
   * the AC-5.6 "removable chip before sending" flow. Presence of
   * `onRemoveStagedAttachment` renders each chip with a remove button. This
   * composite still performs no upload of its own (Rule 8): the caller owns
   * the picker and the eventual post.
   */
  stagedAttachments?: ActivityFeedAttachment[]
  onRemoveStagedAttachment?: (name: string) => void
  /**
   * Pins the composer to the BOTTOM of the feed while the entry list scrolls
   * above it (the Timeline pane's fixed "Write a comment here…" row —
   * figma-spec-detail.md §9). The root becomes `h-full` (the host tab body
   * must provide a definite height), the list gets its own scroll region that
   * auto-follows the newest entry, and the composer never scrolls away.
   * Default `false` keeps the original in-flow composer for existing feeds.
   */
  stickyComposer?: boolean
}

const TONE_DOT_CLASSES: Record<ActivityFeedTone, string> = {
  neutral: 'bg-muted-foreground',
  info: 'bg-info',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-destructive',
}

/** Narrows an `ActivityFeedEntry['author']` to the declared system-actor shape. */
function isSystemActor(author: ActivityFeedActor | undefined): author is ActivityFeedSystemActor {
  return typeof author === 'object' && author !== null && author.kind === 'system'
}

/** The display label for either author shape — the human string verbatim, or the system actor's `label`. */
function actorLabel(author: ActivityFeedActor | undefined): string | undefined {
  return typeof author === 'string' ? author : author?.label
}

const TONE_BADGE_VARIANT: Record<ActivityFeedTone, BadgeVariant> = {
  neutral: 'muted',
  info: 'info',
  success: 'success',
  warning: 'warning',
  danger: 'destructive',
}

export const ActivityFeed = forwardRef<HTMLDivElement, ActivityFeedProps>(
  (
    {
      className,
      entries,
      onSubmit,
      onAttach,
      placeholder = 'Write a comment…',
      emptyLabel = 'No activity yet.',
      uppercaseAuthors = false,
      stagedAttachments,
      onRemoveStagedAttachment,
      stickyComposer = false,
      ...props
    },
    ref,
  ) => {
    const [draft, setDraft] = useState('')
    const scrollRef = useRef<HTMLDivElement | null>(null)

    // Sticky mode follows the conversation: the newest entry (a fresh post
    // lands at the bottom in oldest-first feeds) stays in view above the
    // pinned composer.
    useEffect(() => {
      if (!stickyComposer) return
      const node = scrollRef.current
      if (node) node.scrollTop = node.scrollHeight
    }, [stickyComposer, entries.length])

    const submit = () => {
      const trimmed = draft.trim()
      // An attachment-only post is legitimate (AC-5.6): the staged chips are
      // the payload, the text is optional once one is staged.
      if (!trimmed && !stagedAttachments?.length) return
      onSubmit?.(trimmed)
      setDraft('')
    }

    const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        submit()
      }
    }

    return (
      <div
        ref={ref}
        data-slot="activity-feed"
        className={cn('flex flex-col gap-3', stickyComposer && 'h-full min-h-0', className)}
        {...props}
      >
        <div
          ref={scrollRef}
          data-slot="activity-feed-scroll"
          // Scrollbar hidden, scrolling kept — the Timeline pane's own tab
          // body already uses the same treatment, so the feed doesn't paint a
          // second visible bar inside it.
          className={cn(
            stickyComposer && 'min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          )}
        >
          {entries.length > 0 ? (
            <ol data-slot="activity-feed-list" className="flex flex-col gap-3">
              {entries.map((entry, index) => {
                const previous = entries[index - 1]
                const next = entries[index + 1]
                const showSeparator = Boolean(entry.dateGroup) && entry.dateGroup !== previous?.dateGroup
                // A system-actor entry always gets the icon-in-circle
                // treatment (defaulting to a lightning-bolt glyph when the
                // entry supplies no `icon` of its own) — never the plain tone
                // dot, which alone reads no differently from any other
                // event and would let a system-authored row hide in plain
                // sight (fix7: the new `ActivityFeedSystemActor` case).
                const entryIcon = entry.icon ?? (isSystemActor(entry.author) ? <Zap /> : undefined)
                const nextIcon = next?.icon ?? (isSystemActor(next?.author) ? <Zap /> : undefined)
                // The connected vertical rail (SPEC §1.5's icon-in-circle log
                // rows): consecutive icon system rows within the same day group
                // are joined by a thin connector line under the circle.
                const railBelow =
                  entry.kind === 'system' &&
                  Boolean(entryIcon) &&
                  next?.kind === 'system' &&
                  Boolean(nextIcon) &&
                  (!next.dateGroup || next.dateGroup === entry.dateGroup)
                return (
                  <li key={entry.id} data-slot="activity-feed-item" className="flex flex-col gap-3">
                    {showSeparator ? (
                      <div className="flex justify-center">
                        <span
                          data-slot="activity-feed-date-pill"
                          className="rounded-full bg-muted px-2.5 py-0.5 text-caption font-medium text-muted-foreground"
                        >
                          {entry.dateGroup}
                        </span>
                      </div>
                    ) : null}
                    {entry.kind === 'system' ? (
                      <div className="relative flex flex-col gap-2">
                        <div className="flex items-start gap-2.5">
                        {railBelow ? (
                          <span
                            aria-hidden="true"
                            data-slot="activity-feed-rail"
                            className="absolute -bottom-3 start-3.5 top-8 w-px -translate-x-1/2 bg-border"
                          />
                        ) : null}
                        {entryIcon ? (
                          <span
                            aria-hidden="true"
                            data-slot="activity-feed-icon"
                            className="grid size-7 shrink-0 place-items-center rounded-full border border-border bg-muted/50 text-muted-foreground [&_svg]:size-3.5"
                          >
                            {entryIcon}
                          </span>
                        ) : (
                          <span
                            aria-hidden="true"
                            data-slot="activity-feed-tone-dot"
                            className={cn(
                              'mt-1.5 size-2 shrink-0 rounded-full',
                              TONE_DOT_CLASSES[entry.tone ?? 'neutral'],
                            )}
                          />
                        )}
                        {/* Two columns so the timestamp keeps the row's FIRST
                            baseline at the inline end (figma-spec-detail.md §9)
                            instead of drifting onto whichever line the wrapped
                            actor+action text happens to end on. */}
                        <div className="flex min-w-0 flex-1 items-baseline gap-x-3">
                          <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                            {entry.author ? (
                              <span
                                className={cn(
                                  'font-semibold text-body-sm text-foreground',
                                  uppercaseAuthors && 'uppercase tracking-wide',
                                )}
                              >
                                {actorLabel(entry.author)}
                              </span>
                            ) : null}
                            {entry.badge ? (
                              <Badge variant={TONE_BADGE_VARIANT[entry.badge.tone ?? entry.tone ?? 'neutral']} solid uppercase size="sm">
                                {entry.badge.label}
                              </Badge>
                            ) : null}
                            <span className="min-w-0 text-body-sm text-muted-foreground">{entry.text}</span>
                          </div>
                          {entry.timestamp ? (
                            <span className="shrink-0 text-caption text-muted-foreground">{entry.timestamp}</span>
                          ) : null}
                        </div>
                      </div>
                        {entry.body ? (
                          <div data-slot="activity-feed-body" className="ms-[2.375rem] min-w-0">
                            {entry.body}
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="flex gap-2.5">
                        {isSystemActor(entry.author) ? (
                          // A `comment`-kind entry is not the shape an automation
                          // uses today (it always posts `kind: 'system'` — see the
                          // system-row branch above), but the type permits it, so
                          // this branch stays honest too: never a person's photo
                          // or an initials monogram for a declared system actor.
                          <span
                            aria-hidden="true"
                            data-slot="activity-feed-system-avatar"
                            className="grid size-8 shrink-0 place-items-center rounded-full border border-border bg-muted text-muted-foreground"
                          >
                            <Zap className="size-4" />
                          </span>
                        ) : (
                          <Avatar src={entry.avatar} name={typeof entry.author === 'string' ? entry.author : undefined} size="sm" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                            <span
                              className={cn(
                                'text-body-sm font-semibold text-foreground',
                                uppercaseAuthors && 'uppercase tracking-wide',
                              )}
                            >
                              {actorLabel(entry.author)}
                            </span>
                            {entry.badge ? (
                              <Badge variant={TONE_BADGE_VARIANT[entry.badge.tone ?? entry.tone ?? 'neutral']} solid uppercase size="sm">
                                {entry.badge.label}
                              </Badge>
                            ) : null}
                            {entry.timestamp ? (
                              <span className="text-caption text-muted-foreground">{entry.timestamp}</span>
                            ) : null}
                          </div>
                          <div
                            className={cn(
                              'mt-0.5 rounded-md border border-border bg-card px-3 py-2 text-body-sm text-foreground',
                              (entry.accented ?? true) && 'border-s-2 border-s-primary',
                            )}
                          >
                            {entry.text}
                          </div>
                          {entry.attachments && entry.attachments.length > 0 ? (
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              {entry.attachments.map((attachment) => (
                                <span
                                  key={attachment.name}
                                  data-slot="activity-feed-attachment"
                                  className="inline-flex max-w-full items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-caption text-muted-foreground"
                                >
                                  <Paperclip className="size-3 shrink-0" aria-hidden="true" />
                                  <span className="truncate">{attachment.name}</span>
                                  {attachment.size ? <span className="shrink-0">· {attachment.size}</span> : null}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    )}
                  </li>
                )
              })}
            </ol>
          ) : (
            <p className="py-6 text-center text-body-sm text-muted-foreground">{emptyLabel}</p>
          )}
        </div>

        {onSubmit && stagedAttachments && stagedAttachments.length > 0 ? (
          <div data-slot="activity-feed-staged" className="flex flex-wrap gap-1.5">
            {stagedAttachments.map((attachment) => (
              <span
                key={attachment.name}
                data-slot="activity-feed-staged-attachment"
                className="inline-flex max-w-full items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-caption text-muted-foreground"
              >
                <Paperclip className="size-3 shrink-0" aria-hidden="true" />
                <span className="truncate">{attachment.name}</span>
                {attachment.size ? <span className="shrink-0">· {attachment.size}</span> : null}
                {onRemoveStagedAttachment ? (
                  <button
                    type="button"
                    aria-label={`Remove ${attachment.name}`}
                    className="grid size-4 shrink-0 place-items-center rounded-full outline-none hover:bg-border focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => onRemoveStagedAttachment(attachment.name)}
                  >
                    <X className="size-3" aria-hidden="true" />
                  </button>
                ) : null}
              </span>
            ))}
          </div>
        ) : null}
        {onSubmit ? (
          <div data-slot="activity-feed-composer" className={cn('flex items-end gap-2', stickyComposer && 'shrink-0')}>
            <div className="relative flex-1">
              <Textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={handleComposerKeyDown}
                placeholder={placeholder}
                aria-label={placeholder}
                rows={2}
                className={cn('min-h-0', onAttach && 'pe-9')}
              />
              {onAttach ? (
                // Attach affordance lives INSIDE the input's right edge (SPEC
                // §1.5) — only the send button is a separate external control.
                <button
                  type="button"
                  aria-label="Attach a file"
                  onClick={onAttach}
                  className="absolute bottom-1.5 end-1.5 grid size-6 shrink-0 place-items-center rounded-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Paperclip className="size-4" aria-hidden="true" />
                </button>
              ) : null}
            </div>
            {/* Always the solid primary send tile (figma-spec-detail.md §9's
                maroon square) — an empty draft simply no-ops in `submit`, the
                button never renders washed-out/disabled. */}
            <Button type="button" size="icon" aria-label="Send" onClick={submit}>
              <Send />
            </Button>
          </div>
        ) : null}
      </div>
    )
  },
)

ActivityFeed.displayName = 'ActivityFeed'
