import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { Flag, Paperclip, Send } from 'lucide-react';
import { cn } from '@ds/components/utils/cn';
import { Textarea } from '@ds/components/primitives/textarea';
import { Button } from '@ds/components/primitives/button';
import { Badge } from '@ds/components/primitives/badge';
import { RecordAvatar } from './RecordAvatar';

/**
 * ActivityFeed — PORTED from the FAMS V5 design system's own composite
 * (`fams-design-system/packages/ui-kit/src/composites/ActivityFeed.tsx`),
 * plus the `@mention` / `**bold**` / severity-flag renderers from
 * `packages/v5-templates/src/views/task-detail/ActivityCommentFeed.tsx`
 * (the web record-detail Timeline tab's feed).
 *
 * Divergences from the web files, all forced by this app's vendored `@ds`:
 * - `Avatar` → this app's `RecordAvatar` (the DS here predates the web
 *   avatar-palette fix; see RecordAvatar's own note).
 * - `Badge` has no `solid`/`uppercase` props in this DS, so the solid tonal
 *   chip is composed with classes instead.
 * Everything else (markup, class strings, rail/date-pill/accent rules,
 * sticky composer, Enter-to-send) is verbatim.
 */

export type ActivityTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export interface ActivityAttachment {
  name: string;
  size?: string;
}

export interface ActivityEntry {
  id: string;
  kind: 'system' | 'comment';
  author?: string;
  text: ReactNode;
  timestamp?: ReactNode;
  tone?: ActivityTone;
  attachments?: ActivityAttachment[];
  dateGroup?: string;
  /** `comment` bubbles: whether the inline-start primary accent rule renders. */
  accented?: boolean;
  /** `system` rows: a leading glyph inside a 28px bordered circle. */
  icon?: ReactNode;
  /** Solid uppercase status chip after the author name. */
  badge?: { label: ReactNode; tone?: ActivityTone };
}

const TONE_DOT_CLASSES: Record<ActivityTone, string> = {
  neutral: 'bg-muted-foreground',
  info: 'bg-[color:var(--status-info)]',
  success: 'bg-[color:var(--status-success)]',
  warning: 'bg-[color:var(--status-warning)]',
  danger: 'bg-[color:var(--status-error)]',
};

const TONE_SOLID_CLASSES: Record<ActivityTone, string> = {
  neutral: 'bg-muted-foreground text-white',
  info: 'bg-[color:var(--status-info)] text-white',
  success: 'bg-[color:var(--status-success)] text-white',
  warning: 'bg-[color:var(--status-warning)] text-white',
  danger: 'bg-[color:var(--status-error)] text-white',
};

const TONE_TEXT_CLASSES: Record<ActivityTone, string> = {
  neutral: 'text-foreground',
  info: 'text-[color:var(--status-info)]',
  success: 'text-[color:var(--status-success)]',
  warning: 'text-[color:var(--status-warning)]',
  danger: 'text-[color:var(--status-error)]',
};

/* ── text renderers (ported from ActivityCommentFeed) ─────────────────── */

const MENTION_PATTERN = /(@[\w'-]+(?:\s?[A-Z][\w'-]+)?)/g;

/** Renders `@Name` tokens in primary semibold (the web SPEC §1.5 maroon mentions). */
export function renderMentions(text: string): ReactNode {
  const parts = text.split(MENTION_PATTERN);
  if (parts.length === 1) return text;
  return parts.map((part, index) =>
    part.startsWith('@') ? (
      <span key={index} data-slot="activity-mention" className="font-semibold text-primary">
        {part}
      </span>
    ) : (
      part
    ),
  );
}

/** Whether `text` @-mentions `user` ("Fahad Al-Marri" matches `@FahadAl-Marri` and `@Fahad`). */
export function mentionsUser(text: string, user: string | undefined): boolean {
  if (!user) return false;
  const collapsed = user.replace(/\s+/g, '').toLowerCase();
  const first = user.split(/\s+/)[0]?.toLowerCase();
  const found = text.match(MENTION_PATTERN) ?? [];
  return found.some((mention) => {
    const handle = mention.slice(1).replace(/\s+/g, '').toLowerCase();
    return handle === collapsed || handle === first;
  });
}

/** `**bold**` value emphasis + a trailing severity flag ("changed severity to ⚑ CRITICAL"). */
export function renderLogText(text: string, severity?: { label?: string; tone?: ActivityTone }): ReactNode {
  const parts = text.split(/\*\*([^*]+)\*\*/g);
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
        );
  if (!severity?.label) return body;
  return (
    <>
      {body}{' '}
      <span
        data-slot="activity-log-severity"
        className={cn(
          'inline-flex items-center gap-1 align-baseline font-semibold uppercase tracking-wide',
          TONE_TEXT_CLASSES[severity.tone ?? 'neutral'],
        )}
      >
        <Flag aria-hidden="true" className="size-3.5 shrink-0" />
        {severity.label}
      </span>
    </>
  );
}

/* ── the feed ─────────────────────────────────────────────────────────── */

export interface ActivityFeedProps {
  entries: ActivityEntry[];
  /** Omit to render read-only — no composer. */
  onSubmit?: (text: string) => void;
  placeholder?: string;
  emptyLabel?: string;
  /** Presence renders the paperclip inside the composer's end edge. */
  onAttach?: () => void;
  /** Bold uppercase author names (the web Timeline pane treatment). */
  uppercaseAuthors?: boolean;
  stagedAttachments?: ActivityAttachment[];
  onRemoveStagedAttachment?: (name: string) => void;
  /** Pins the composer to the pane's bottom while the list scrolls above it. */
  stickyComposer?: boolean;
  className?: string;
}

export function ActivityFeed({
  entries,
  onSubmit,
  onAttach,
  placeholder = 'Write a comment here…',
  emptyLabel = 'No activity yet — updates and comments will appear here.',
  uppercaseAuthors = false,
  stagedAttachments,
  onRemoveStagedAttachment,
  stickyComposer = false,
  className,
}: ActivityFeedProps) {
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!stickyComposer) return;
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [stickyComposer, entries.length]);

  const submit = () => {
    const trimmed = draft.trim();
    if (!trimmed && !stagedAttachments?.length) return;
    onSubmit?.(trimmed);
    setDraft('');
  };

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <div
      data-slot="activity-feed"
      className={cn('flex flex-col gap-3', stickyComposer && 'h-full min-h-0', className)}
    >
      <div
        ref={scrollRef}
        data-slot="activity-feed-scroll"
        className={cn('fams-hide-scrollbar', stickyComposer && 'min-h-0 flex-1 overflow-y-auto')}
      >
        {entries.length > 0 ? (
          <ol data-slot="activity-feed-list" className="flex flex-col gap-3">
            {entries.map((entry, index) => {
              const previous = entries[index - 1];
              const next = entries[index + 1];
              const showSeparator = Boolean(entry.dateGroup) && entry.dateGroup !== previous?.dateGroup;
              const railBelow =
                entry.kind === 'system' &&
                Boolean(entry.icon) &&
                next?.kind === 'system' &&
                Boolean(next.icon) &&
                (!next.dateGroup || next.dateGroup === entry.dateGroup);
              return (
                <li key={entry.id} data-slot="activity-feed-item" className="flex flex-col gap-3">
                  {showSeparator ? (
                    <div className="flex justify-center">
                      <span
                        data-slot="activity-feed-date-pill"
                        className="bg-muted px-2.5 py-0.5 text-caption font-medium text-muted-foreground"
                        style={{ borderRadius: 'var(--ins-radius-full)' }}
                      >
                        {entry.dateGroup}
                      </span>
                    </div>
                  ) : null}
                  {entry.kind === 'system' ? (
                    <div className="relative flex items-start gap-2.5">
                      {railBelow ? (
                        <span
                          aria-hidden="true"
                          data-slot="activity-feed-rail"
                          className="absolute -bottom-3 start-3.5 top-8 w-px -translate-x-1/2 bg-border"
                        />
                      ) : null}
                      {entry.icon ? (
                        <span
                          aria-hidden="true"
                          data-slot="activity-feed-icon"
                          className="grid size-7 shrink-0 place-items-center border border-border bg-muted/50 text-muted-foreground [&_svg]:size-3.5"
                          style={{ borderRadius: 'var(--ins-radius-full)' }}
                        >
                          {entry.icon}
                        </span>
                      ) : (
                        <span
                          aria-hidden="true"
                          data-slot="activity-feed-tone-dot"
                          className={cn('mt-1.5 size-2 shrink-0', TONE_DOT_CLASSES[entry.tone ?? 'neutral'])}
                          style={{ borderRadius: 'var(--ins-radius-full)' }}
                        />
                      )}
                      {/* Two columns so the timestamp keeps the row's FIRST
                          baseline at the inline end instead of drifting onto
                          whichever line the wrapped actor+action text ends on. */}
                      <div className="flex min-w-0 flex-1 items-baseline gap-x-3">
                        <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                          {entry.author ? (
                            <span
                              className={cn(
                                'text-body-sm font-semibold text-foreground',
                                uppercaseAuthors && 'uppercase tracking-wide',
                              )}
                            >
                              {entry.author}
                            </span>
                          ) : null}
                          {entry.badge ? (
                            <Badge
                              size="sm"
                              className={cn(
                                'border-transparent uppercase',
                                TONE_SOLID_CLASSES[entry.badge.tone ?? entry.tone ?? 'neutral'],
                              )}
                              style={{ borderRadius: 'var(--ins-radius-full)' }}
                            >
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
                  ) : (
                    <div className="flex gap-2.5">
                      <RecordAvatar name={entry.author ?? '?'} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                          <span
                            className={cn(
                              'text-body-sm font-semibold text-foreground',
                              uppercaseAuthors && 'uppercase tracking-wide',
                            )}
                          >
                            {entry.author}
                          </span>
                          {entry.timestamp ? (
                            <span className="text-caption text-muted-foreground">{entry.timestamp}</span>
                          ) : null}
                        </div>
                        <div
                          className={cn(
                            'mt-0.5 border border-border bg-card px-3 py-2 text-body-sm text-foreground',
                            (entry.accented ?? true) && 'border-s-2 border-s-primary',
                          )}
                          style={{ borderRadius: 'var(--ins-radius-md)' }}
                        >
                          {entry.text}
                        </div>
                        {entry.attachments && entry.attachments.length > 0 ? (
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {entry.attachments.map((attachment) => (
                              <span
                                key={attachment.name}
                                data-slot="activity-feed-attachment"
                                className="inline-flex max-w-full items-center gap-1 bg-muted px-2 py-0.5 text-caption text-muted-foreground"
                                style={{ borderRadius: 'var(--ins-radius-full)' }}
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
              );
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
              className="inline-flex max-w-full items-center gap-1 bg-muted px-2 py-0.5 text-caption text-muted-foreground"
              style={{ borderRadius: 'var(--ins-radius-full)' }}
            >
              <Paperclip className="size-3 shrink-0" aria-hidden="true" />
              <span className="truncate">{attachment.name}</span>
              {attachment.size ? <span className="shrink-0">· {attachment.size}</span> : null}
              {onRemoveStagedAttachment ? (
                <button
                  type="button"
                  aria-label={`Remove ${attachment.name}`}
                  className="grid size-4 shrink-0 place-items-center outline-none hover:bg-border"
                  style={{ borderRadius: 'var(--ins-radius-full)' }}
                  onClick={() => onRemoveStagedAttachment(attachment.name)}
                >
                  ×
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
              style={{ borderRadius: 'var(--ins-radius-sm)' }}
            />
            {onAttach ? (
              // Attach affordance lives INSIDE the input's end edge (web SPEC
              // §1.5) — only the send button is a separate external control.
              <button
                type="button"
                aria-label="Attach a file"
                onClick={onAttach}
                className="absolute bottom-1.5 end-1.5 grid size-6 shrink-0 place-items-center text-muted-foreground outline-none transition-colors before:absolute before:-inset-2.5 before:content-[''] hover:text-foreground"
                style={{ borderRadius: 'var(--ins-radius-sm)' }}
              >
                <Paperclip className="size-4" aria-hidden="true" />
              </button>
            ) : null}
          </div>
          {/* Always the solid primary send tile (the web §9 maroon square) — an
              empty draft simply no-ops in `submit`. */}
          <Button
            type="button"
            size="icon"
            aria-label="Send"
            onClick={submit}
            style={{ borderRadius: 'var(--ins-radius-sm)' }}
          >
            <Send className="size-4" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
